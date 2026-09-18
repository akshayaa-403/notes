/* =========================================================================
   Notes — a local dashboard for sticky notes, lists and other card types.
   Vanilla JS, no dependencies, persisted to localStorage.

   Data shape
   ----------
   state = {
     boards: [{ id, name, layout, columns:[{id,name}], cards:[Card] }],
     activeBoard: id,
     theme: 'light' | 'dark',
     pomodoro: { visible, mode, remaining, running, completed, x, y }
   }

   Card = {
     id, type, title, color, data,       // data shape is per-type
     x, y, w,                            // canvas layout
     order,                              // grid layout
     columnId                            // columns layout
   }

   Every card carries all three layouts at once, so switching modes never
   destroys an arrangement you made in another mode.

   Adding a card type
   ------------------
   Add one entry to TYPES below: a label, a glyph, an empty() for its initial
   data, and a render(card, body, save) that paints into the card body. That
   is the whole contract — the board, persistence and all three layouts come
   for free.
   ========================================================================= */

'use strict';

const STORAGE_KEY = 'notes.dashboard.v1';
const uid = () => Math.random().toString(36).slice(2, 10);

/* ---------------------------------------------------------------- helpers */

const el = (tag, props = {}, children = []) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'value') n.value = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v !== null && v !== false && v !== undefined) n.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c) n.append(c);
  return n;
};

// Textareas that grow with their content instead of scrolling.
const fit = (ta) => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };

const autosize = (ta) => {
  ta.addEventListener('input', () => fit(ta));
  requestAnimationFrame(() => fit(ta));
  return ta;
};

const field = (value, placeholder, oninput, cls = 'field') => autosize(
  el('textarea', { class: cls, rows: 1, placeholder, value: value || '', oninput: (e) => oninput(e.target.value) })
);

/* ------------------------------------------------------------------ state */

const blankBoard = (name) => ({
  id: uid(),
  name,
  layout: 'grid',
  columns: [
    { id: uid(), name: 'To do' },
    { id: uid(), name: 'Doing' },
    { id: uid(), name: 'Done' },
  ],
  cards: [],
});

const defaultState = () => {
  const b = blankBoard('My board');
  return {
    boards: [b],
    activeBoard: b.id,
    theme: 'light',
    calendarOpen: false,
    calendarDays: {},
    pomodoro: { visible: false, mode: 'focus', remaining: 25 * 60, running: false, completed: 0, x: null, y: null },
  };
};

let state;
try {
  state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultState();
} catch {
  state = defaultState();
}

const save = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    // Most likely the quota: base64 images are the usual culprit.
    console.warn('Could not save — storage may be full.', err);
  }
};

const board = () => state.boards.find((b) => b.id === state.activeBoard) || state.boards[0];
const findCard = (id) => board().cards.find((c) => c.id === id);

/* ------------------------------------------------------------ card types */

const SWATCHES = ['default', 'gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'];

const TYPES = {
  text: {
    label: 'Text',
    glyph: '✎',
    empty: () => ({ body: '' }),
    render(card, body, commit) {
      body.append(field(card.data.body, 'Start writing…', (v) => { card.data.body = v; commit(); }, 'field text-body'));
    },
  },

  checklist: {
    label: 'Checklist',
    glyph: '☑',
    empty: () => ({ items: [{ id: uid(), text: '', done: false }] }),
    render: (card, body, commit, rerender) => renderList(card, body, commit, rerender, 'check'),
  },

  bulleted: {
    label: 'Bulleted list',
    glyph: '•',
    empty: () => ({ items: [{ id: uid(), text: '' }] }),
    render: (card, body, commit, rerender) => renderList(card, body, commit, rerender, 'bullet'),
  },

  numbered: {
    label: 'Numbered list',
    glyph: '1.',
    empty: () => ({ items: [{ id: uid(), text: '' }] }),
    render: (card, body, commit, rerender) => renderList(card, body, commit, rerender, 'number'),
  },

  link: {
    label: 'Link',
    glyph: '\u{1F517}',
    empty: () => ({ url: '', name: '' }),
    render(card, body, commit, rerender) {
      const { url, name } = card.data;
      if (url) {
        let host = url;
        try { host = new URL(url).hostname; } catch { /* keep raw text */ }
        body.append(
          el('a', { class: 'link-preview', href: url, target: '_blank', rel: 'noopener noreferrer' }, [
            el('img', {
              class: 'link-favicon',
              alt: '',
              src: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`,
              onerror: (e) => { e.target.style.visibility = 'hidden'; },
            }),
            el('span', { class: 'link-meta' }, [
              el('div', { class: 'link-name', text: name || host }),
              el('div', { class: 'link-url', text: url }),
            ]),
          ])
        );
        body.append(el('button', {
          class: 'add-row', text: 'Edit link',
          onclick: () => { card.data.url = ''; commit(); rerender(); },
        }));
      } else {
        const nameInput = field(name, 'Label (optional)', (v) => { card.data.name = v; commit(); });
        const urlInput = field('', 'https://…', () => {});
        urlInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { e.preventDefault(); apply(); }
        });
        const apply = () => {
          let v = urlInput.value.trim();
          if (!v) return;
          if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
          card.data.url = v;
          commit(); rerender();
        };
        body.append(nameInput, urlInput, el('button', { class: 'add-row', text: 'Save link', onclick: apply }));
      }
    },
  },

  image: {
    label: 'Image',
    glyph: '\u{1F5BC}',
    empty: () => ({ src: '', caption: '' }),
    render(card, body, commit, rerender) {
      if (card.data.src) {
        body.append(el('img', { class: 'card-image', src: card.data.src, alt: card.data.caption || '' }));
        body.append(field(card.data.caption, 'Add a caption…', (v) => { card.data.caption = v; commit(); }, 'field image-caption'));
        body.append(el('button', {
          class: 'add-row', text: 'Replace image',
          onclick: () => { card.data.src = ''; commit(); rerender(); },
        }));
        return;
      }

      const readFile = (file) => {
        if (!file || !file.type.startsWith('image/')) return;
        const fr = new FileReader();
        fr.onload = () => { card.data.src = fr.result; commit(); rerender(); };
        fr.readAsDataURL(file);
      };

      const drop = el('div', { class: 'image-drop', text: 'Click, drop or paste an image' });
      drop.addEventListener('click', () => {
        const inp = el('input', { type: 'file', accept: 'image/*' });
        inp.addEventListener('change', () => readFile(inp.files[0]));
        inp.click();
      });
      drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
      drop.addEventListener('dragleave', () => drop.classList.remove('over'));
      drop.addEventListener('drop', (e) => {
        e.preventDefault(); drop.classList.remove('over');
        readFile(e.dataTransfer.files[0]);
      });
      // Paste works while the drop zone has focus.
      drop.tabIndex = 0;
      drop.addEventListener('paste', (e) => {
        const item = [...e.clipboardData.items].find((i) => i.type.startsWith('image/'));
        if (item) readFile(item.getAsFile());
      });
      body.append(drop);
    },
  },

  table: {
    label: 'Table',
    glyph: '▦',
    empty: () => ({ rows: [['Column', 'Column'], ['', '']] }),
    render(card, body, commit, rerender) {
      const rows = card.data.rows;
      const table = el('table', { class: 'grid-table' });
      rows.forEach((row, r) => {
        const tr = el('tr');
        row.forEach((cell, c) => {
          tr.append(el('td', {}, [field(cell, '', (v) => { rows[r][c] = v; commit(); })]));
        });
        table.append(tr);
      });
      body.append(el('div', { class: 'table-wrap' }, [table]));
      body.append(el('div', { class: 'table-tools' }, [
        el('button', {
          text: '+ Row',
          onclick: () => { rows.push(new Array(rows[0].length).fill('')); commit(); rerender(); },
        }),
        el('button', {
          text: '+ Column',
          onclick: () => { rows.forEach((r) => r.push('')); commit(); rerender(); },
        }),
        el('button', {
          text: '− Row',
          onclick: () => { if (rows.length > 1) { rows.pop(); commit(); rerender(); } },
        }),
        el('button', {
          text: '− Column',
          onclick: () => { if (rows[0].length > 1) { rows.forEach((r) => r.pop()); commit(); rerender(); } },
        }),
      ]));
    },
  },

};

/* Shared renderer for the three list-ish types. */
function renderList(card, body, commit, rerender, kind) {
  const items = card.data.items;
  const list = el('div', { class: 'list' });

  items.forEach((item, i) => {
    const row = el('div', { class: 'list-row' + (item.done ? ' done' : '') });

    if (kind === 'check') {
      const cb = el('input', { type: 'checkbox' });
      cb.checked = !!item.done;
      cb.addEventListener('change', () => {
        item.done = cb.checked;
        row.classList.toggle('done', cb.checked);
        commit();
      });
      row.append(cb);
    } else {
      row.append(el('span', { class: 'bullet', text: kind === 'number' ? `${i + 1}.` : '•' }));
    }

    const input = field(item.text, 'List item', (v) => { item.text = v; commit(); });
    input.addEventListener('keydown', (e) => {
      // Enter adds the next item; Backspace on an empty row removes it.
      if (e.key === 'Enter') {
        e.preventDefault();
        items.splice(i + 1, 0, kind === 'check' ? { id: uid(), text: '', done: false } : { id: uid(), text: '' });
        commit(); rerender(i + 1);
      } else if (e.key === 'Backspace' && item.text === '' && items.length > 1) {
        e.preventDefault();
        items.splice(i, 1);
        commit(); rerender(Math.max(0, i - 1));
      }
    });
    row.append(input);

    row.append(el('button', {
      class: 'del', text: '×', title: 'Delete item',
      onclick: () => {
        items.splice(i, 1);
        if (!items.length) items.push(kind === 'check' ? { id: uid(), text: '', done: false } : { id: uid(), text: '' });
        commit(); rerender();
      },
    }));

    list.append(row);
  });

  body.append(list);
  body.append(el('button', {
    class: 'add-row', text: '+ Add item',
    onclick: () => {
      items.push(kind === 'check' ? { id: uid(), text: '', done: false } : { id: uid(), text: '' });
      commit(); rerender(items.length - 1);
    },
  }));
}

/* ------------------------------------------------------------ card render */

function renderCard(card) {
  const node = el('div', { class: 'card', 'data-id': card.id });
  node.style.setProperty('--card-bg', `var(--c-${card.color || 'default'})`);

  const paint = (focusIndex) => {
    node.innerHTML = '';

    const head = el('div', { class: 'card-head' }, [
      el('span', { class: 'card-grip', title: 'Drag', text: '⁙' }),
      el('input', {
        class: 'card-title',
        placeholder: TYPES[card.type].label,
        value: card.title || '',
        oninput: (e) => { card.title = e.target.value; save(); },
      }),
      el('button', {
        class: 'icon-btn sm card-menu-btn', text: '⋯', title: 'Options',
        onclick: (e) => { e.stopPropagation(); openCardMenu(card, e.currentTarget); },
      }),
    ]);

    const body = el('div', { class: 'card-body' });
    TYPES[card.type].render(card, body, save, paint);

    node.append(head, body);

    if (board().layout === 'canvas') {
      const handle = el('div', { class: 'resize-handle', title: 'Resize' });
      handle.addEventListener('pointerdown', (e) => startResize(e, card, node));
      node.append(handle);
    }

    if (typeof focusIndex === 'number') {
      const inputs = body.querySelectorAll('.list-row .field');
      if (inputs[focusIndex]) inputs[focusIndex].focus();
    }
  };

  paint();
  attachDrag(node, card);
  return node;
}

/* ------------------------------------------------------------- card menu */

let openMenu = null;
const closeMenu = () => { if (openMenu) { openMenu.remove(); openMenu = null; } };
document.addEventListener('click', closeMenu);

function openCardMenu(card, anchor) {
  closeMenu();
  const menu = el('div', { class: 'menu anchored', onclick: (e) => e.stopPropagation() });

  menu.append(el('div', { class: 'menu-label', text: 'Colour' }));
  const sw = el('div', { class: 'swatches' });
  SWATCHES.forEach((c) => {
    const b = el('button', {
      class: 'swatch' + ((card.color || 'default') === c ? ' active' : ''),
      title: c,
      onclick: () => { card.color = c; save(); render(); },
    });
    b.style.background = `var(--c-${c})`;
    sw.append(b);
  });
  menu.append(sw, el('hr'));

  menu.append(el('div', { class: 'menu-label', text: 'Move to' }));
  if (board().layout === 'columns') {
    board().columns.forEach((col) => {
      menu.append(el('button', {
        onclick: () => { card.columnId = col.id; save(); render(); },
      }, [el('span', { class: 'glyph', text: card.columnId === col.id ? '✓' : '' }), el('span', { text: col.name })]));
    });
    menu.append(el('hr'));
  }

  menu.append(el('button', {
    onclick: () => {
      const b = board();
      const copy = { ...structuredClone(card), id: uid(), order: b.cards.length };
      copy.x = (card.x || 40) + 24;
      copy.y = (card.y || 40) + 24;
      b.cards.push(copy);
      save(); render();
    },
  }, [el('span', { class: 'glyph', text: '⧉' }), el('span', { text: 'Duplicate' })]));

  menu.append(el('button', {
    onclick: () => {
      const b = board();
      b.cards = b.cards.filter((c) => c.id !== card.id);
      save(); render();
    },
  }, [el('span', { class: 'glyph', text: '⌦' }), el('span', { text: 'Delete' })]));

  document.body.append(menu);
  const r = anchor.getBoundingClientRect();
  menu.style.left = Math.min(r.left, window.innerWidth - menu.offsetWidth - 10) + 'px';
  menu.style.top = r.bottom + 6 + 'px';
  openMenu = menu;
}

/* ------------------------------------------------------------ drag & drop */

let dragCard = null;

function attachDrag(node, card) {
  // Canvas mode: free positioning via pointer events.
  node.addEventListener('pointerdown', (e) => {
    if (board().layout !== 'canvas') return;
    if (!e.target.closest('.card-grip')) return;
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const origX = card.x || 0, origY = card.y || 0;
    node.style.zIndex = 50;

    const move = (ev) => {
      // The plane is scaled, so a pointer that travelled 100 screen px has
      // travelled 100/zoom plane px. Without this the card lags the cursor.
      const z = zoomFactor();
      card.x = Math.max(0, origX + (ev.clientX - startX) / z);
      card.y = Math.max(0, origY + (ev.clientY - startY) / z);
      node.style.left = card.x + 'px';
      node.style.top = card.y + 'px';
    };
    const up = () => {
      node.style.zIndex = '';
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      save();
      // A card dragged past the edge grows the plane, or re-fits the view.
      applyZoom();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });

  // Grid + columns: HTML5 drag and drop for reordering / moving between columns.
  node.querySelector('.card-grip').addEventListener('mousedown', () => {
    if (board().layout !== 'canvas') node.draggable = true;
  });
  node.addEventListener('dragstart', (e) => {
    dragCard = card;
    node.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.id);
  });
  node.addEventListener('dragend', () => {
    dragCard = null;
    node.draggable = false;
    node.classList.remove('dragging');
    document.querySelectorAll('.drop-before,.drop-after').forEach((n) => n.classList.remove('drop-before', 'drop-after'));
    document.querySelectorAll('.drop-hint').forEach((n) => n.classList.remove('drop-hint'));
  });

  node.addEventListener('dragover', (e) => {
    if (!dragCard || dragCard.id === card.id) return;
    e.preventDefault();
    const r = node.getBoundingClientRect();
    const after = e.clientY > r.top + r.height / 2;
    node.classList.toggle('drop-after', after);
    node.classList.toggle('drop-before', !after);
  });
  node.addEventListener('dragleave', () => node.classList.remove('drop-before', 'drop-after'));
  node.addEventListener('drop', (e) => {
    if (!dragCard || dragCard.id === card.id) return;
    e.preventDefault();
    e.stopPropagation();
    const r = node.getBoundingClientRect();
    const after = e.clientY > r.top + r.height / 2;
    const b = board();

    if (b.layout === 'columns') dragCard.columnId = card.columnId;

    const list = b.cards.filter((c) => c.id !== dragCard.id);
    const idx = list.indexOf(card);
    list.splice(after ? idx + 1 : idx, 0, dragCard);
    list.forEach((c, i) => { c.order = i; });
    b.cards = list;
    save(); render();
  });
}

function startResize(e, card, node) {
  e.preventDefault();
  e.stopPropagation();
  const startX = e.clientX;
  const origW = node.offsetWidth;
  const move = (ev) => {
    // offsetWidth is the pre-transform width, so only the delta needs scaling.
    card.w = Math.max(180, origW + (ev.clientX - startX) / zoomFactor());
    node.style.width = card.w + 'px';
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    save();
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

/* ---------------------------------------------------------------- render */

const boardEl = document.getElementById('board');
const emptyEl = document.getElementById('emptyState');

// Shown only on a blank board, and never behind the calendar view.
function renderEmpty() {
  emptyEl.hidden = board().cards.length > 0 || !!state.calendarOpen;
}

function render() {
  const b = board();
  boardEl.className = 'board ' + b.layout;
  boardEl.innerHTML = '';

  const sorted = [...b.cards].sort((x, y) => (x.order ?? 0) - (y.order ?? 0));
  renderEmpty();

  if (b.layout === 'canvas') {
    const plane = el('div', { class: 'canvas-plane zoom-plane' });
    sorted.forEach((card) => {
      const node = renderCard(card);
      node.style.left = (card.x ?? 40) + 'px';
      node.style.top = (card.y ?? 40) + 'px';
      if (card.w) node.style.width = card.w + 'px';
      plane.append(node);
    });
    boardEl.append(plane);

  } else if (b.layout === 'grid') {
    const plane = el('div', { class: 'grid-plane zoom-plane' });
    sorted.forEach((card) => plane.append(renderCard(card)));
    boardEl.append(plane);

  } else {
    // columns
    b.columns.forEach((col) => {
      const body = el('div', { class: 'column-body' });
      const inCol = sorted.filter((c) => c.columnId === col.id);
      inCol.forEach((card) => body.append(renderCard(card)));

      // Dropping onto empty space in a column moves the card to its end.
      body.addEventListener('dragover', (e) => {
        if (!dragCard) return;
        e.preventDefault();
        body.classList.add('drop-hint');
      });
      body.addEventListener('dragleave', () => body.classList.remove('drop-hint'));
      body.addEventListener('drop', (e) => {
        if (!dragCard) return;
        e.preventDefault();
        body.classList.remove('drop-hint');
        dragCard.columnId = col.id;
        const list = b.cards.filter((c) => c.id !== dragCard.id);
        list.push(dragCard);
        list.forEach((c, i) => { c.order = i; });
        b.cards = list;
        save(); render();
      });

      const title = el('input', {
        class: 'column-title',
        value: col.name,
        oninput: () => { col.name = title.value; save(); },
      });

      const head = el('div', { class: 'column-head' }, [
        title,
        el('span', { class: 'column-count', text: String(inCol.length) }),
        el('button', {
          class: 'icon-btn sm', text: '×', title: 'Delete column',
          onclick: () => {
            if (b.columns.length <= 1) return;
            const fallback = b.columns.find((c) => c.id !== col.id).id;
            b.cards.forEach((c) => { if (c.columnId === col.id) c.columnId = fallback; });
            b.columns = b.columns.filter((c) => c.id !== col.id);
            save(); render();
          },
        }),
      ]);

      boardEl.append(el('div', { class: 'column' }, [head, body]));
    });

    boardEl.append(el('button', {
      class: 'add-column', text: '+ Add column',
      onclick: () => { b.columns.push({ id: uid(), name: 'New column' }); save(); render(); },
    }));
  }

  renderTabs();
  syncModeButtons();
  applyZoom();
}

/* Calendar is a view alongside the three card layouts, but it is not a board
   layout — it lives on state, so switching to it and back leaves the board's
   own arrangement exactly as it was. */
function syncModeButtons() {
  const current = state.calendarOpen ? 'calendar' : board().layout;
  document.querySelectorAll('#layoutToggle button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.layout === current);
  });
}

function setMode(mode) {
  if (mode === 'calendar') {
    if (!state.calendarOpen) calView = new Date();
    state.calendarOpen = true;
  } else {
    state.calendarOpen = false;
    board().layout = mode;
  }
  save();
  // calPaint first: it un-hides the board, and applyZoom inside render()
  // cannot measure a hidden element.
  calPaint();
  render();
}

function renderTabs() {
  const wrap = document.getElementById('boardTabs');
  wrap.innerHTML = '';
  state.boards.forEach((b) => {
    const tab = el('button', {
      class: 'board-tab' + (b.id === state.activeBoard ? ' active' : ''),
      text: b.name,
      title: 'Click to open, double-click to rename',
      onclick: () => { state.activeBoard = b.id; save(); render(); },
      ondblclick: () => {
        const name = prompt('Rename board', b.name);
        if (name && name.trim()) { b.name = name.trim(); save(); render(); }
      },
      oncontextmenu: (e) => {
        e.preventDefault();
        if (state.boards.length <= 1) return;
        if (confirm(`Delete board "${b.name}" and all its cards?`)) {
          state.boards = state.boards.filter((x) => x.id !== b.id);
          if (state.activeBoard === b.id) state.activeBoard = state.boards[0].id;
          save(); render();
        }
      },
    });
    wrap.append(tab);
  });
}

/* ------------------------------------------------------------- add cards */

function addCard(type) {
  const b = board();
  // Adding a card means you want the board, not the calendar, in front of you.
  if (state.calendarOpen) { state.calendarOpen = false; calPaint(); }
  const card = {
    id: uid(),
    type,
    title: '',
    color: 'default',
    data: TYPES[type].empty(),
    // Stagger new canvas cards so they don't stack exactly on top of each other.
    x: 40 + (b.cards.length % 6) * 40,
    y: 40 + (b.cards.length % 5) * 36,
    w: null,
    order: b.cards.length,
    columnId: b.columns[0]?.id,
  };
  b.cards.push(card);
  save(); render();

  const node = boardEl.querySelector(`[data-id="${card.id}"]`);
  if (node) {
    node.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    node.querySelector('.card-title')?.focus();
  }
}

const addBtn = document.getElementById('addCardBtn');
const addMenu = document.getElementById('addCardMenu');

addBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  closeMenu();
  if (!addMenu.hidden) { addMenu.hidden = true; return; }
  addMenu.innerHTML = '';
  addMenu.append(el('div', { class: 'menu-label', text: 'Add a card' }));
  Object.entries(TYPES).forEach(([key, def]) => {
    addMenu.append(el('button', {
      onclick: () => { addMenu.hidden = true; addCard(key); },
    }, [el('span', { class: 'glyph', text: def.glyph }), el('span', { text: def.label })]));
  });
  addMenu.hidden = false;
});
document.addEventListener('click', () => { addMenu.hidden = true; });

/* ------------------------------------------------------------------ zoom */

/* Canvas and grid are scaled to fit instead of scrolled, so a whole board is
   on screen at once and neither view needs a scrollbar.

   b.zoom === null means "work the scale out for me": it is the default, and
   it recomputes on every render and every window resize. Pressing + or -
   pins an explicit scale, and the percentage button lets go of it again. */

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2;
const ZOOM_STEPS = [ZOOM_MIN, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.25, 1.5, 1.75, ZOOM_MAX];
// Searched high to low, so a fit is the largest scale that still fits. A fit
// never enlarges, so the steps above 100% are not candidates.
const FIT_STEPS = ZOOM_STEPS.filter((s) => s <= 1).reverse();

const zoomCtl = document.getElementById('zoomCtl');
const zoomLevelBtn = document.getElementById('zoomLevel');

const zoomable = () => !state.calendarOpen && board().layout !== 'columns';
const zoomFactor = () => parseFloat(boardEl.style.getPropertyValue('--zoom')) || 1;
const clampZoom = (z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

// The board's content box. The plane is laid out at this size divided by the
// scale, so that once scaled it lands exactly on the visible area.
function boardBox() {
  const cs = getComputedStyle(boardEl);
  return {
    w: boardEl.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
    h: boardEl.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom),
  };
}

function setPlane(plane, z, box, minW = 0, minH = 0) {
  boardEl.style.setProperty('--zoom', z);
  plane.style.width = Math.max(minW, box.w / z) + 'px';
  plane.style.height = Math.max(minH, box.h / z) + 'px';
}

/* autosize() grows the card textareas on a requestAnimationFrame, so at the
   moment render() finishes they are all still one row tall. Measuring then
   under-reads the content by a wide margin and the fit comes back far too
   confident. Force the heights now, synchronously, before measuring.

   This has to run per candidate scale in the grid, not once: zooming out
   makes more, narrower columns, and a narrower card wraps to a taller one. */
const settleHeights = (plane) => plane.querySelectorAll('textarea').forEach((ta) => fit(ta));

// Absolutely positioned cards do not reflow when scaled, so the canvas fit is
// closed-form: measure the furthest edges once and divide.
function canvasExtent(plane) {
  let right = 0, bottom = 0;
  plane.querySelectorAll('.card').forEach((n) => {
    right = Math.max(right, n.offsetLeft + n.offsetWidth);
    bottom = Math.max(bottom, n.offsetTop + n.offsetHeight);
  });
  return { right, bottom };
}

function applyZoom() {
  zoomCtl.hidden = !zoomable();
  const plane = boardEl.querySelector('.zoom-plane');
  if (!plane || !zoomable()) return;

  const b = board();
  const box = boardBox();
  if (box.w <= 0 || box.h <= 0) return;  // measured while hidden — nothing to do

  let z;
  if (b.layout === 'canvas') {
    const pad = 32;
    settleHeights(plane);
    const ext = canvasExtent(plane);
    z = b.zoom || (ext.right && ext.bottom
      ? clampZoom(Math.min(1, box.w / (ext.right + pad), box.h / (ext.bottom + pad)))
      : 1);
    // Never smaller than a screenful, so there is always somewhere to drag to.
    setPlane(plane, z, box, ext.right + pad, ext.bottom + pad);

  } else if (b.zoom) {
    setPlane(plane, b.zoom, box);
    z = b.zoom;

  } else {
    // Multicol reflows at every scale — zooming out buys more columns, not
    // just smaller cards — so the fit has to be measured rather than solved.
    z = ZOOM_MIN;
    for (const step of FIT_STEPS) {
      setPlane(plane, step, box);
      settleHeights(plane);
      if (plane.scrollWidth <= plane.clientWidth + 1) { z = step; break; }
    }
  }

  // Auto-fit guarantees the content fits, so there is nothing to scroll. A
  // pinned scale can overflow, and then the view has to be reachable — by
  // wheel and trackpad, still without a scrollbar drawn across the board.
  boardEl.classList.toggle('pannable', !!b.zoom);

  zoomLevelBtn.textContent = Math.round(z * 100) + '%';
  zoomLevelBtn.classList.toggle('auto', !b.zoom);
}

function nudgeZoom(dir) {
  const current = zoomFactor();
  const next = dir > 0
    ? ZOOM_STEPS.find((s) => s > current + 0.001)
    : [...ZOOM_STEPS].reverse().find((s) => s < current - 0.001);
  // ZOOM_STEPS is already bounded by ZOOM_MIN/ZOOM_MAX, so no clamp is needed.
  board().zoom = next ?? current;
  save(); applyZoom();
}

function resetZoom() {
  board().zoom = null;
  save(); applyZoom();
}

document.getElementById('zoomIn').addEventListener('click', () => nudgeZoom(1));
document.getElementById('zoomOut').addEventListener('click', () => nudgeZoom(-1));
zoomLevelBtn.addEventListener('click', resetZoom);

// Ctrl/Cmd + wheel, the gesture every other canvas app already uses.
boardEl.addEventListener('wheel', (e) => {
  if (!(e.ctrlKey || e.metaKey) || !zoomable()) return;
  e.preventDefault();
  nudgeZoom(e.deltaY < 0 ? 1 : -1);
}, { passive: false });

document.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey) || !zoomable()) return;
  if (e.key === '=' || e.key === '+') { e.preventDefault(); nudgeZoom(1); }
  else if (e.key === '-') { e.preventDefault(); nudgeZoom(-1); }
  else if (e.key === '0') { e.preventDefault(); resetZoom(); }
});

// An auto-fitted board has to re-fit when the window changes shape.
let fitTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(fitTimer);
  fitTimer = setTimeout(applyZoom, 120);
});

/* ------------------------------------------------------------ topbar wiring */

document.getElementById('layoutToggle').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  setMode(btn.dataset.layout);
});

document.getElementById('addBoardBtn').addEventListener('click', () => {
  const b = blankBoard(`Board ${state.boards.length + 1}`);
  state.boards.push(b);
  state.activeBoard = b.id;
  save(); render();
});

/* The theme is the app's own toggle, not the OS's, so the browser chrome
   cannot follow a prefers-color-scheme media query on the <meta> tag — this
   is the one place the theme changes, so it sets the tag too. */
const THEME_COLOR = { light: '#ffffff', dark: '#191919' };

const applyTheme = () => {
  document.documentElement.dataset.theme = state.theme;
  document.querySelector('meta[name="theme-color"]').content = THEME_COLOR[state.theme];
  document.getElementById('themeBtn').innerHTML = state.theme === 'dark' ? '&#9788;' : '&#9789;';
};
document.getElementById('themeBtn').addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme(); save();
});

/* ---------------------------------------------------------------- pomodoro */

const POMO_LENGTHS = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };

const pomoEl = document.getElementById('pomodoro');
const pomoTime = document.getElementById('pomoTime');
const pomoStart = document.getElementById('pomoStart');
const pomoCount = document.getElementById('pomoCount');

let pomoTimer = null;

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

function pomoPaint() {
  const p = state.pomodoro;
  pomoEl.hidden = !p.visible;
  pomoTime.textContent = fmt(Math.max(0, p.remaining));
  pomoTime.classList.toggle('running', p.running);
  pomoStart.textContent = p.running ? 'Pause' : 'Start';
  pomoCount.textContent = `${p.completed} completed`;
  document.querySelectorAll('#pomoModes button').forEach((b) => {
    b.classList.toggle('active', b.dataset.mode === p.mode);
  });
  document.title = p.running ? `${fmt(Math.max(0, p.remaining))} · Notes` : 'Notes';
  if (p.x !== null && p.y !== null) {
    pomoEl.style.left = p.x + 'px';
    pomoEl.style.top = p.y + 'px';
    pomoEl.style.right = 'auto';
    pomoEl.style.bottom = 'auto';
  }
}

function pomoTick() {
  const p = state.pomodoro;
  p.remaining -= 1;
  if (p.remaining <= 0) {
    p.remaining = 0;
    pomoStop();
    if (p.mode === 'focus') p.completed += 1;
    beep();
    // Sit at 00:00 until the next mode is chosen, so a finished session is visible.
  }
  pomoPaint();
  save();
}

function pomoStop() {
  clearInterval(pomoTimer);
  pomoTimer = null;
  state.pomodoro.running = false;
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.1);
    osc.start(); osc.stop(ctx.currentTime + 1.1);
  } catch { /* audio is a nicety, never a failure */ }
}

document.getElementById('pomodoroBtn').addEventListener('click', () => {
  state.pomodoro.visible = !state.pomodoro.visible;
  pomoPaint(); save();
});
document.getElementById('pomoClose').addEventListener('click', () => {
  state.pomodoro.visible = false;
  pomoPaint(); save();
});

pomoStart.addEventListener('click', () => {
  const p = state.pomodoro;
  if (p.running) {
    pomoStop();
  } else {
    if (p.remaining <= 0) p.remaining = POMO_LENGTHS[p.mode];
    p.running = true;
    pomoTimer = setInterval(pomoTick, 1000);
  }
  pomoPaint(); save();
});

document.getElementById('pomoReset').addEventListener('click', () => {
  const p = state.pomodoro;
  pomoStop();
  p.remaining = POMO_LENGTHS[p.mode];
  pomoPaint(); save();
});

document.getElementById('pomoModes').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const p = state.pomodoro;
  pomoStop();
  p.mode = btn.dataset.mode;
  p.remaining = POMO_LENGTHS[p.mode];
  pomoPaint(); save();
});

// Drag the pomodoro panel around by its header.
document.getElementById('pomoDrag').addEventListener('pointerdown', (e) => {
  if (e.target.closest('button')) return;
  e.preventDefault();
  const r = pomoEl.getBoundingClientRect();
  const offX = e.clientX - r.left, offY = e.clientY - r.top;
  const move = (ev) => {
    const p = state.pomodoro;
    p.x = Math.min(Math.max(0, ev.clientX - offX), window.innerWidth - r.width);
    p.y = Math.min(Math.max(0, ev.clientY - offY), window.innerHeight - r.height);
    pomoEl.style.left = p.x + 'px';
    pomoEl.style.top = p.y + 'px';
    pomoEl.style.right = 'auto';
    pomoEl.style.bottom = 'auto';
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    save();
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
});

/* ---------------------------------------------------------------- calendar */

/* The calendar is a view, not a card: it takes over the whole canvas area and
   the board steps aside while it is open. */

const calEl = document.getElementById('calendarView');
const calGrid = document.getElementById('calGrid');
const calMonth = document.getElementById('calMonth');

// Which month is on screen. Not persisted — reopening lands on today.
let calView = new Date();

const DAY_TEXT_MAX = 75;

// Adjacent-month days are shown for alignment only, so entries key off real
// dates and a padding cell gets no key at all.
const dayKey = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const dayEntry = (key) => (state.calendarDays[key] ||= {});

function calWarn(msg) {
  const bar = document.getElementById('calWarn');
  bar.textContent = msg;
  bar.hidden = false;
  clearTimeout(calWarn.timer);
  calWarn.timer = setTimeout(() => { bar.hidden = true; }, 2600);
}

/* Day pictures are stored inline in localStorage, so they are scaled down to
   a cell-sized thumbnail first: a few dozen full-resolution photos would blow
   the storage quota. */
function calReadImage(file, done) {
  if (!file || !file.type.startsWith('image/')) return;
  const fr = new FileReader();
  fr.onload = () => {
    const img = new Image();
    img.onload = () => {
      const max = 320;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = el('canvas');
      c.width = Math.max(1, Math.round(img.width * scale));
      c.height = Math.max(1, Math.round(img.height * scale));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      done(c.toDataURL('image/jpeg', 0.82));
    };
    // A file the browser cannot decode is kept as-is rather than dropped.
    img.onerror = () => done(fr.result);
    img.src = fr.result;
  };
  fr.readAsDataURL(file);
}

function pickImage(key) {
  const inp = el('input', { type: 'file', accept: 'image/*' });
  inp.addEventListener('change', () => calReadImage(inp.files[0], (src) => {
    dayEntry(key).src = src;
    save(); calPaint();
  }));
  inp.click();
}

/* Swaps the day's note for an input. The character cap is enforced here
   rather than with maxlength so that overtyping can be explained instead of
   silently ignored. */
function editText(key, cellNode) {
  const entry = dayEntry(key);
  cellNode.querySelector('.cal-text')?.remove();

  const inp = el('input', {
    class: 'cal-text-input',
    type: 'text',
    placeholder: 'Add a note...',
    value: entry.text || '',
  });

  const overflow = () => {
    inp.classList.add('at-limit');
    calWarn('That is the ' + DAY_TEXT_MAX + '-character limit for a day note.');
  };

  // Catches paste and drag-drop, which arrive as a value change, not keystrokes.
  inp.addEventListener('input', () => {
    if (inp.value.length > DAY_TEXT_MAX) {
      inp.value = inp.value.slice(0, DAY_TEXT_MAX);
      overflow();
    } else {
      inp.classList.remove('at-limit');
    }
  });
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); inp.blur(); return; }
    if (e.key === 'Escape') { e.preventDefault(); inp.value = entry.text || ''; inp.blur(); return; }
    const typing = e.key.length === 1 && !e.ctrlKey && !e.metaKey;
    const replacing = inp.selectionStart !== inp.selectionEnd;
    if (typing && !replacing && inp.value.length >= DAY_TEXT_MAX) {
      e.preventDefault();
      overflow();
    }
  });
  const before = entry.text || '';
  inp.addEventListener('blur', () => {
    const v = inp.value.trim().slice(0, DAY_TEXT_MAX);

    // Repainting on an unchanged note would rebuild the grid mid-click and
    // swallow a click aimed at another day, so put the cell back by hand.
    if (v === before) {
      inp.remove();
      if (!entry.text && !entry.src) delete state.calendarDays[key];
      if (v) cellNode.append(el('span', { class: 'cal-text', text: v }));
      return;
    }

    if (v) entry.text = v; else delete entry.text;
    if (!entry.text && !entry.src) delete state.calendarDays[key];
    save(); calPaint();
  });

  cellNode.append(inp);
  inp.focus();
  inp.select();
}

function calCell(n, key, isToday = false) {
  const entry = key ? state.calendarDays[key] : null;
  const cellNode = el('div', {
    class: 'cal-day' + (key ? '' : ' pad') + (isToday ? ' today' : ''),
    'data-date': key,
    title: key ? 'Click to add a picture, double-click to add a note' : null,
  }, [el('span', { class: 'cal-num', text: String(n) })]);

  if (entry && entry.src) {
    cellNode.append(el('img', { class: 'cal-img', src: entry.src, alt: entry.text || '' }));
    cellNode.append(el('button', {
      class: 'cal-img-x', text: '\u00d7', title: 'Remove picture',
      onclick: (e) => {
        e.stopPropagation();
        delete entry.src;
        if (!entry.text) delete state.calendarDays[key];
        save(); calPaint();
      },
    }));
  }
  if (entry && entry.text) {
    cellNode.append(el('span', { class: 'cal-text', text: entry.text }));
  }

  if (!key) return cellNode;

  // A single click must wait out the double-click window, or picking a day to
  // type on would also pop the file dialog.
  let clickTimer = null;
  cellNode.addEventListener('click', (e) => {
    if (e.target.closest('.cal-img-x, .cal-text-input')) return;
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => pickImage(key), 260);
  });
  cellNode.addEventListener('dblclick', (e) => {
    if (e.target.closest('.cal-img-x')) return;
    clearTimeout(clickTimer);
    editText(key, cellNode);
  });

  return cellNode;
}

function calPaint() {
  const open = !!state.calendarOpen;
  calEl.hidden = !open;
  boardEl.hidden = open;
  if (!open) { renderEmpty(); return; }

  // The board's empty prompt has no business showing behind the calendar.
  emptyEl.hidden = true;

  const year = calView.getFullYear();
  const month = calView.getMonth();
  calMonth.textContent = calView.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  calGrid.innerHTML = '';
  ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    .forEach((n) => calGrid.append(el('div', { class: 'cal-dow', text: n })));

  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const today = new Date();

  // Lead-in from the previous month so weeks line up under their day names.
  for (let i = first - 1; i >= 0; i--) calGrid.append(calCell(prevDays - i, null));
  for (let n = 1; n <= days; n++) {
    const isToday = n === today.getDate()
      && month === today.getMonth()
      && year === today.getFullYear();
    calGrid.append(calCell(n, dayKey(year, month, n), isToday));
  }
  // Trail-out to fill the final week.
  const trail = (7 - ((first + days) % 7)) % 7;
  for (let n = 1; n <= trail; n++) calGrid.append(calCell(n, null));

  // Weeks share the leftover height, so the grid always fills the canvas.
  const weeks = (first + days + trail) / 7;
  calGrid.style.gridTemplateRows = `auto repeat(${weeks}, minmax(0, 1fr))`;
}

const calGo = (delta) => {
  calView = new Date(calView.getFullYear(), calView.getMonth() + delta, 1);
  calPaint();
};


document.getElementById('calPrev').addEventListener('click', () => calGo(-1));
document.getElementById('calNext').addEventListener('click', () => calGo(1));
document.getElementById('calToday').addEventListener('click', () => {
  calView = new Date();
  calPaint();
});
document.getElementById('calClose').addEventListener('click', () => {
  setMode(board().layout);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.calendarOpen) {
    setMode(board().layout);
  }
});

/* ------------------------------------------------------------------- boot */

// A timer that was running when the tab closed comes back paused, not lying
// about elapsed time.
if (state.pomodoro.running) state.pomodoro.running = false;

// State saved before day entries existed has no store to read from.
state.calendarDays ||= {};

applyTheme();
pomoPaint();
calPaint();
render();

/* Manifest shortcuts land here as query params (see manifest.webmanifest).
   The URL is scrubbed once handled, so a reload of an installed window does
   not silently add a second card. */
{
  const params = new URLSearchParams(location.search);
  const wanted = params.get('new');
  const view = params.get('view');

  if (wanted && TYPES[wanted]) addCard(wanted);
  if (view === 'calendar') setMode('calendar');
  if (wanted || view) history.replaceState(null, '', location.pathname);
}
