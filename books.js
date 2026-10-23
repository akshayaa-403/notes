/* =========================================================================
   Books — a shelf of PDFs, read as books.

   Where the books live
   --------------------
   The PDFs never enter the browser's storage. They stay in a folder on this
   machine (books/ in the repo, git-ignored) that the user hands to the app
   once through the File System Access API; the handle is kept in IndexedDB
   and the browser asks again, with one click, at the start of a session.
   Only small things go into state.books, keyed by "name|size" so they find
   their file again: title, author, page count, a cover thumbnail, bookmarks
   and highlights.

   Reading
   -------
   pdf.js (vendor/pdfjs, pinned and checked — see vendor/pdfjs/VERSION) draws
   each page exactly as it is. Two pages face each other like an open book,
   or one at a time. A page turns as a leaf hinged on the spine: grab its
   outer edge and drag, click the edge, use the arrow keys or swipe. The book
   opens at its furthest bookmark, or at the cover.

   Loaded before app.js, which is why nothing here runs at load time against
   app.js's globals (state, save, el, board, render…) — only when called.
   ========================================================================= */

'use strict';

window.Books = (() => {
  const MAX_BYTES = 10 * 1024 * 1024;
  const VENDOR = 'vendor/pdfjs/';
  const abs = (p) => new URL(p, location.href).href;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  const lib = () => (state.books ||= {});
  const prefs = () => (state.reader ||= { spread: true, muted: false, side: true, tab: 'contents' });
  // Zoom is a factor on the fitted size: 1 is "the whole spread on screen".
  const ZOOMS = [0.5, 0.67, 0.8, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
  const zoom = () => prefs().zoom || 1;
  const keyOf = (name, size) => `${name}|${size}`;

  /* "Blue Sisters-Coco Mellors-2024.pdf" → title, author, year. Anything
     that does not look like that keeps its file name as the title. */
  function parseName(name) {
    const base = name.replace(/\.pdf$/i, '').trim();
    const m = base.match(/^(.+?)\s*-\s*(.+?)\s*-\s*(\d{4})$/);
    return m ? { title: m[1], author: m[2], year: m[3] } : { title: base.replace(/_+/g, ' '), author: '' };
  }

  let toastTimer;
  function toast(msg) {
    let t = document.querySelector('.book-toast');
    if (!t) { t = el('div', { class: 'book-toast', role: 'status' }); document.body.append(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ------------------------------------------------------------- folder */

  const idb = () => new Promise((res, rej) => {
    const r = indexedDB.open('notes-books', 2);
    r.onupgradeneeded = () => {
      for (const n of ['kv', 'files']) if (!r.result.objectStoreNames.contains(n)) r.result.createObjectStore(n);
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  const kv = async (mode, fn, store = 'kv') => {
    const db = await idb();
    return new Promise((res, rej) => {
      const tx = db.transaction(store, mode);
      const req = fn(tx.objectStore(store));
      tx.oncomplete = () => res(req.result);
      tx.onerror = () => rej(tx.error);
    });
  };

  let dir = null;  // the folder, once permission is granted this session

  // Opened from disk (file://) there is no folder access and no module loading.
  const supported = () => location.protocol !== 'file:';
  // Browsers with no folder access (phones, Firefox, Safari) keep the PDFs in
  // IndexedDB instead — on that device only, and they count against its quota.
  const folderMode = () => typeof window.showDirectoryPicker === 'function';
  const fileStore = (mode, fn) => kv(mode, fn, 'files');

  async function permitted(h, ask) {
    if (!h.queryPermission) return true;  // a handle with no permission model
    const opts = { mode: 'readwrite' };
    if ((await h.queryPermission(opts)) === 'granted') return true;
    return ask && (await h.requestPermission(opts)) === 'granted';
  }

  // 'ready' | 'locked' (known folder, needs a click) | 'none'
  async function folderState() {
    if (!folderMode()) return 'ready';
    if (dir) return 'ready';
    const h = await kv('readonly', (s) => s.get('dir')).catch(() => null);
    if (!h) return 'none';
    if (await permitted(h, false)) { dir = h; return 'ready'; }
    return 'locked';
  }

  // The folder with permission, asking for it if allowed (needs a user click).
  async function folder(ask) {
    if (dir) return dir;
    const h = await kv('readonly', (s) => s.get('dir')).catch(() => null);
    if (h && (await permitted(h, ask))) dir = h;
    return dir;
  }

  async function chooseFolder() {
    try {
      const h = await window.showDirectoryPicker({ id: 'notes-books', mode: 'readwrite', startIn: 'documents' });
      await kv('readwrite', (s) => s.put(h, 'dir'));
      dir = h;
      await scan();
      return true;
    } catch (err) {
      if (err.name !== 'AbortError') toast('Could not open that folder.');
      return false;
    }
  }

  // Bring state.books in line with the folder: new files get an entry, and
  // entries whose file has gone are kept (with their notes) but not shown.
  async function scan() {
    if (!folderMode()) {
      const seen = new Set(await fileStore('readonly', (s) => s.getAllKeys()).catch(() => []));
      Object.entries(lib()).forEach(([k, b]) => { b.present = seen.has(k); });
      save();
      return true;
    }
    const d = await folder(false);
    if (!d) return false;
    const seen = new Set();
    for await (const [name, h] of d.entries()) {
      if (h.kind !== 'file' || !/\.pdf$/i.test(name)) continue;
      const f = await h.getFile();
      const key = keyOf(name, f.size);
      seen.add(key);
      lib()[key] ||= { name, size: f.size, ...parseName(name), bookmarks: [], highlights: [], added: Date.now() };
    }
    Object.entries(lib()).forEach(([k, b]) => { b.present = seen.has(k); });
    save();
    return true;
  }

  const shelfBooks = () => Object.entries(lib())
    .filter(([, b]) => b.present)
    .sort(([, a], [, b]) => (b.opened || b.added) - (a.opened || a.added));

  async function upload(files) {
    const d = folderMode() ? (await folder(true)) || ((await chooseFolder()) && dir) : null;
    if (folderMode() && !d) return;
    let added = 0;
    for (const f of files) {
      if (f.size > MAX_BYTES) { toast(`${f.name} is over 10 MB.`); continue; }
      const head = new Uint8Array(await f.slice(0, 5).arrayBuffer());
      if (String.fromCharCode(...head) !== '%PDF-') { toast(`${f.name} is not a PDF.`); continue; }
      const name = f.name.replace(/[\\/:*?"<>|]/g, '_');
      if (!d) {
        const key = keyOf(name, f.size);
        if (lib()[key]?.present) { toast(`${name} is already on the shelf.`); continue; }
        try {
          await fileStore('readwrite', (s) => s.put(f, key));
        } catch { toast('Not enough storage on this device.'); continue; }
        lib()[key] ||= { name, size: f.size, ...parseName(name), bookmarks: [], highlights: [], added: Date.now() };
        added++;
        continue;
      }
      try {
        await d.getFileHandle(name);
        toast(`${name} is already on the shelf.`);
        continue;
      } catch { /* not there yet — good */ }
      const w = await (await d.getFileHandle(name, { create: true })).createWritable();
      await w.write(f);
      await w.close();
      added++;
    }
    await scan();
    if (added) toast(added === 1 ? 'Added to the shelf.' : `${added} books added.`);
    refresh();
  }

  async function remove(key) {
    const b = lib()[key];
    if (!confirm(`Remove "${b.title}" from the shelf?\n\nThis deletes the PDF from the books folder, with its bookmarks and notes.`)) return;
    if (folderMode()) {
      const d = await folder(true);
      if (!d) return;
      await d.removeEntry(b.name).catch(() => {});
    } else {
      await fileStore('readwrite', (s) => s.delete(key));
    }
    delete lib()[key];
    save();
    refresh();
  }

  /* ------------------------------------------------------------- pdf.js */

  let pdfjsP;
  const pdfjs = () => (pdfjsP ||= import(abs(VENDOR + 'pdf.min.mjs')).then((m) => {
    m.GlobalWorkerOptions.workerSrc = abs(VENDOR + 'pdf.worker.min.mjs');
    return m;
  }));

  async function openPdf(b) {
    let file;
    if (folderMode()) {
      const d = await folder(true);
      if (!d) throw new Error('No access to the books folder.');
      file = await (await d.getFileHandle(b.name)).getFile();
    } else {
      file = await fileStore('readonly', (s) => s.get(keyOf(b.name, b.size)));
      if (!file) throw new Error('Book not found on this device.');
    }
    const m = await pdfjs();
    return m.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
      wasmUrl: abs(VENDOR + 'wasm/'),
      standardFontDataUrl: abs(VENDOR + 'standard_fonts/'),
      iccUrl: abs(VENDOR + 'iccs/'),
      enableXfa: false,
    }).promise;
  }

  // Page count, a cover thumbnail and — when the file name did not carry
  // them — the title and author the PDF declares.
  async function describe(b, pdf) {
    b.pages = pdf.numPages;
    if (!b.author) {
      const info = (await pdf.getMetadata().catch(() => null))?.info || {};
      if (info.Title && !/^(untitled|microsoft word)/i.test(info.Title)) b.title = info.Title;
      if (info.Author) b.author = info.Author;
    }
    if (!b.cover) {
      const page = await pdf.getPage(1);
      const vp = page.getViewport({ scale: 240 / page.getViewport({ scale: 1 }).width });
      const c = document.createElement('canvas');
      c.width = vp.width; c.height = vp.height;
      await page.render({ canvas: c, viewport: vp }).promise;
      b.cover = c.toDataURL('image/jpeg', 0.72);
    }
    save();
  }

  let covering = false;
  async function fillCovers() {
    if (covering) return;
    covering = true;
    for (const [, b] of shelfBooks()) {
      if (b.cover && b.pages) continue;
      try {
        const pdf = await openPdf(b);
        await describe(b, pdf);
        await pdf.loadingTask.destroy();
        refresh();
      } catch (err) {
        // An unreadable PDF keeps its cloth cover.
        console.warn(`No cover for ${b.name}:`, err);
      }
    }
    covering = false;
  }

  /* ------------------------------------------------------- book objects */

  // A book's face for the shelf and the card: its own cover when known,
  // otherwise cloth in a colour fixed by its name, with the title on it.
  function bookFace(b, cls) {
    const hue = [...b.name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7);
    const face = el('span', { class: cls });
    face.style.setProperty('--cloth', `hsl(${hue} 38% 34%)`);
    if (b.cover) face.append(el('img', { src: b.cover, alt: '' }));
    else face.append(el('span', { class: 'cloth-title', text: b.title }));
    return face;
  }

  const progressOf = (b) => {
    const at = Math.max(0, ...(b.bookmarks || []));
    return at ? `p. ${at}${b.pages ? ` of ${b.pages}` : ''}` : (b.pages ? `${b.pages} pages` : 'Not opened yet');
  };

  /* --------------------------------------------------------------- card */

  // The board card: the shelf's books in one sideways-scrolling row, four to
  // the card's width. Hovering a book lifts it and dims the rest.
  function renderCard(body) {
    const books = shelfBooks();
    if (!books.length) {
      body.append(
        el('p', { class: 'shelf-empty', text: Object.keys(lib()).length ? 'Reconnect the books folder to see your books.' : 'No books yet.' }),
        el('button', { class: 'add-row', text: 'Open the shelf', onclick: openShelf }),
      );
      return;
    }
    const row = el('div', { class: 'shelf-row', role: 'list' });
    books.forEach(([key, b]) => {
      row.append(el('button', {
        class: 'shelf-book', role: 'listitem', title: `${b.title}${b.author ? ' — ' + b.author : ''}`,
        onclick: () => openBook(key),
      }, [bookFace(b, 'shelf-face'), el('span', { class: 'shelf-name', text: b.title })]));
    });
    body.append(row);
  }

  function refresh() {
    if (typeof refreshLive === 'function') refreshLive();
    if (shelfEl && !shelfEl.hidden) paintShelf();
  }

  /* -------------------------------------------------------------- shelf */

  let shelfEl = null;

  function openShelf() {
    if (!shelfEl) {
      shelfEl = el('section', { class: 'bookshelf', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Bookshelf', hidden: true });
      document.body.append(shelfEl);
      shelfEl.addEventListener('dragover', (e) => { e.preventDefault(); shelfEl.classList.add('dropping'); });
      shelfEl.addEventListener('dragleave', (e) => { if (e.target === shelfEl) shelfEl.classList.remove('dropping'); });
      shelfEl.addEventListener('drop', (e) => {
        e.preventDefault();
        shelfEl.classList.remove('dropping');
        upload([...e.dataTransfer.files].filter((f) => /\.pdf$/i.test(f.name)));
      });
      shelfEl.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !readerEl) closeShelf(); });
    }
    shelfEl.hidden = false;
    syncButton();
    paintShelf();
    shelfEl.focus();
  }

  function closeShelf() {
    if (shelfEl) shelfEl.hidden = true;
    syncButton();
  }

  function syncButton() {
    const btn = document.getElementById('booksBtn');
    if (!btn) return;
    const open = !!shelfEl && !shelfEl.hidden;
    btn.classList.toggle('active', open);
    btn.setAttribute('aria-pressed', open);
  }

  async function paintShelf() {
    const fs = supported() ? await folderState() : 'unsupported';
    if (fs === 'ready') await scan();
    const upInput = el('input', { type: 'file', accept: 'application/pdf,.pdf', multiple: true, hidden: true,
      onchange: (e) => upload([...e.target.files]) });

    const bar = el('header', { class: 'bs-bar' }, [
      el('h2', { class: 'bs-title', text: 'Bookshelf' }),
      fs === 'ready' && folderMode() ? el('span', { class: 'bs-folder', text: `Folder: ${dir.name}` }) : null,
      fs === 'ready' && folderMode() ? el('button', { class: 'btn sm', text: 'Change folder', onclick: async () => { await chooseFolder(); paintShelf(); refresh(); } }) : null,
      el('span', { class: 'bs-spacer' }),
      fs === 'ready' ? el('button', { class: 'btn primary', text: 'Add book', title: 'PDF, up to 10 MB', onclick: () => upInput.click() }) : null,
      upInput,
      el('button', { class: 'icon-btn', html: '&times;', title: 'Close (Esc)', 'aria-label': 'Close shelf', onclick: closeShelf }),
    ]);

    let main;
    if (fs === 'unsupported') {
      main = el('div', { class: 'bs-msg' }, [
        el('h3', { text: 'The reader cannot open here' }),
        el('p', { text: 'It needs the app served over http(s). Open it from GitHub Pages, or run "python -m http.server" in this folder and open http://localhost:8000.' }),
      ]);
    } else if (fs !== 'ready') {
      main = el('div', { class: 'bs-msg' }, [
        el('h3', { text: fs === 'locked' ? 'Welcome back' : 'Where do your books live?' }),
        el('p', { text: fs === 'locked'
          ? 'The browser asks once per session before the app may read the books folder again.'
          : 'Pick the folder that holds your PDFs — books/ in this project. The books stay there, on this machine; the app keeps only bookmarks and notes.' }),
        el('button', { class: 'btn primary', text: fs === 'locked' ? 'Open the books folder' : 'Choose books folder',
          onclick: async () => {
            const ok = fs === 'locked' ? !!(await folder(true)) : await chooseFolder();
            if (ok) { await scan(); refresh(); paintShelf(); }
          } }),
      ]);
    } else {
      const books = shelfBooks();
      main = books.length ? el('div', { class: 'bs-shelves' }, books.map(([key, b]) =>
        el('div', { class: 'bs-slot' }, [
          el('button', { class: 'bs-book', onclick: () => openBook(key), 'aria-label': `Read ${b.title}` }, [
            bookFace(b, 'bs-face'),
          ]),
          el('div', { class: 'bs-meta' }, [
            el('div', { class: 'bs-name', text: b.title }),
            b.author ? el('div', { class: 'bs-author', text: b.author }) : null,
            el('div', { class: 'bs-progress', text: progressOf(b) + (b.highlights?.length ? ` · ${b.highlights.length} note${b.highlights.length > 1 ? 's' : ''}` : '') }),
          ]),
          el('button', { class: 'icon-btn sm bs-remove', html: '&times;', title: 'Remove from shelf', 'aria-label': `Remove ${b.title}`, onclick: () => remove(key) }),
        ]))) : el('div', { class: 'bs-msg' }, [
        el('h3', { text: 'An empty shelf' }),
        el('p', { text: folderMode() ? 'Add a PDF (up to 10 MB), or drop one anywhere here.' : 'Add a PDF (up to 10 MB). It is kept on this device only.' }),
      ]);
    }
    shelfEl.replaceChildren(bar, main, el('p', { class: 'bs-drop', text: 'Drop PDFs to add them' }));
    shelfEl.tabIndex = -1;
    if (fs === 'ready') fillCovers();
  }

  /* ------------------------------------------------------------- sound */

  // A page turning: a burst of paper noise swept down through a band-pass,
  // then a soft low flap as the leaf lands. Made here, so no audio file.
  let ac;
  function rustle() {
    if (prefs().muted) return;
    try {
      ac ||= new AudioContext();
      const t0 = ac.currentTime, dur = 0.38;
      const burst = (start, len, from, to, peak, type = 'bandpass') => {
        const n = Math.floor(ac.sampleRate * len);
        const buf = ac.createBuffer(1, n, ac.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (0.55 + 0.45 * Math.sin(i / 37 + Math.random()));
        const src = ac.createBufferSource();
        src.buffer = buf;
        const f = ac.createBiquadFilter();
        f.type = type; f.Q.value = 0.8;
        f.frequency.setValueAtTime(from, start);
        f.frequency.exponentialRampToValueAtTime(to, start + len);
        const g = ac.createGain();
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(peak, start + 0.025);
        g.gain.exponentialRampToValueAtTime(0.0001, start + len);
        src.connect(f).connect(g).connect(ac.destination);
        src.start(start);
      };
      burst(t0, dur, 4200, 900, 0.16);
      burst(t0 + dur * 0.78, 0.12, 700, 240, 0.12, 'lowpass');
    } catch { /* no audio — silence is fine */ }
  }

  /* ------------------------------------------------------------ reader */

  let readerEl = null;
  let R = null;  // the open book's session state

  const dpr = () => Math.min(2, window.devicePixelRatio || 1);
  const N = () => R.pdf.numPages;
  // A phone shows one page at a time whatever the toggle says.
  const spread = () => prefs().spread && innerWidth > 700;

  // Pages on view at a position. Two-page: spread s holds pages 2s and 2s+1,
  // so the cover (page 1) stands alone on the right like a closed book.
  function view(pos = R.pos) {
    if (!spread()) return { left: null, right: pos, pages: [pos] };
    const s = Math.floor(pos / 2);
    const left = s > 0 ? 2 * s : null;
    const right = 2 * s + 1 <= N() ? 2 * s + 1 : null;
    return { left, right, pages: [left, right].filter(Boolean), s };
  }

  function stepFrom(pos, dir) {
    if (!spread()) { const p = pos + dir; return p >= 1 && p <= N() ? p : null; }
    const s = Math.floor(pos / 2) + dir;
    if (s < 0 || 2 * s > N()) return null;
    return Math.max(1, 2 * s);
  }

  // Each page is drawn once per size, at the screen's pixel density.
  function renderPage(n) {
    if (!R.cache.has(n)) {
      const gen = R.gen;
      R.cache.set(n, (async () => {
        const page = await R.pdf.getPage(n);
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(R.pw / base.width, R.ph / base.height);
        // Very large zooms would make canvases the browser refuses to draw;
        // above ~16 megapixels the page is drawn a little softer instead.
        const density = Math.min(dpr(), Math.sqrt(16e6 / (base.width * base.height * scale * scale)));
        const vp = page.getViewport({ scale: scale * density });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(vp.width);
        canvas.height = Math.floor(vp.height);
        await page.render({ canvas, viewport: vp }).promise;
        return { gen, page, scale, canvas, w: vp.width / density, h: vp.height / density };
      })());
      // Keep the pages around the reader; let the far ones go.
      if (R.cache.size > 24) {
        const near = new Set(view().pages);
        for (const k of R.cache.keys()) {
          if (R.cache.size <= 16) break;
          if (!near.has(k) && Math.abs(k - R.pos) > 6) R.cache.delete(k);
        }
      }
    }
    return R.cache.get(n);
  }

  const copyCanvas = (src) => {
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    c.getContext('2d').drawImage(src, 0, 0);
    return c;
  };

  // A sheet of paper with the page drawn on it. `live` pages also get the
  // text layer (selection, search) and the highlights, ribbons and notes.
  function pageEl(n, { live = false, side = 'r' } = {}) {
    const paper = el('div', { class: `paper side-${side}${n === 1 ? ' cover' : ''}`, 'data-page': n || '' });
    if (!n) { paper.classList.add('blank'); return paper; }
    renderPage(n).then(async (r) => {
      if (!R || r.gen !== R.gen) return;
      const sheet = el('div', { class: 'sheet' });
      sheet.style.width = r.w + 'px';
      sheet.style.height = r.h + 'px';
      const canvas = live ? r.canvas : copyCanvas(r.canvas);
      canvas.className = 'page-canvas';
      sheet.append(canvas);
      paper.append(sheet);
      if (!live) return;
      sheet.append(el('div', { class: 'hl-layer' }));
      paintMarks(paper);
      const m = await pdfjs();
      const tl = el('div', { class: 'textLayer' });
      const vp = r.page.getViewport({ scale: r.scale });
      tl.style.setProperty('--total-scale-factor', r.scale);
      tl.style.setProperty('--scale-factor', r.scale);
      sheet.append(tl);
      await new m.TextLayer({ textContentSource: r.page.streamTextContent(), container: tl, viewport: vp }).render().catch(() => {});
      if (R?.query) markMatches(tl, R.query);
    });
    return paper;
  }

  // Ribbons, highlights and note pins for one page on view.
  function paintMarks(paper) {
    const n = +paper.dataset.page;
    const b = R.book;
    paper.querySelectorAll('.ribbon, .note-pin').forEach((x) => x.remove());
    if (b.bookmarks.includes(n)) paper.append(el('div', { class: 'ribbon', 'aria-hidden': 'true' }));
    const layer = paper.querySelector('.hl-layer');
    if (!layer) return;
    layer.replaceChildren();
    b.highlights.filter((h) => h.page === n).forEach((h) => {
      h.rects.forEach(([x, y, w, hh]) => {
        const d = el('div', { class: `hl hl-${h.color}`, 'data-id': h.id });
        Object.assign(d.style, { left: x * 100 + '%', top: y * 100 + '%', width: w * 100 + '%', height: hh * 100 + '%' });
        layer.append(d);
      });
      if (h.note) {
        const pin = el('button', { class: 'note-pin', title: h.note, 'aria-label': 'Note: ' + h.note,
          onclick: (e) => { e.stopPropagation(); hlPopover(h, pin.getBoundingClientRect()); } });
        pin.style.top = `calc(${h.rects[0][1] * 100}% )`;
        paper.querySelector('.sheet').append(pin);
      }
    });
  }

  // Lay the book out for the stage: the largest pages that fit, keeping the
  // first page's proportions, with room at the sides to grab the edges.
  async function layout() {
    const stage = R.dom.stage;
    const first = (await R.pdf.getPage(1)).getViewport({ scale: 1 });
    const aspect = first.width / first.height;
    const cols = spread() ? 2 : 1;
    // The fit leaves room at the sides for the edges you grab.
    const availW = stage.clientWidth - 140;
    const availH = stage.clientHeight - 72;
    let ph = availH, pw = ph * aspect;
    if (pw * cols > availW) { pw = availW / cols; ph = pw / aspect; }
    const size = [Math.floor(pw * zoom()), Math.floor(ph * zoom())];
    if (size[0] !== R.pw || size[1] !== R.ph) {
      [R.pw, R.ph] = size;
      R.gen++;
      R.cache.clear();
    }
    R.dom.book.style.setProperty('--pw', R.pw + 'px');
    R.dom.book.style.setProperty('--ph', R.ph + 'px');
    R.dom.book.classList.toggle('single', !spread());
    R.dom.zoomLevel.textContent = Math.round(zoom() * 100) + '%';
    R.dom.zoomOut.disabled = zoom() <= ZOOMS[0];
    R.dom.zoomIn.disabled = zoom() >= ZOOMS[ZOOMS.length - 1];
  }

  /* Zooming keeps the point under the pointer (or the middle of the view)
     where it was, and redraws the pages at the new size so the type stays
     sharp rather than being stretched. */
  async function setZoom(z, at) {
    if (!R || R.turn) return;
    z = clamp(z, ZOOMS[0], ZOOMS[ZOOMS.length - 1]);
    if (z === zoom()) return;
    const { stage, book } = R.dom;
    const sr = stage.getBoundingClientRect();
    const x = at?.x ?? sr.left + sr.width / 2, y = at?.y ?? sr.top + sr.height / 2;
    const b0 = book.getBoundingClientRect();
    const fx = (x - b0.left) / b0.width, fy = (y - b0.top) / b0.height;
    prefs().zoom = z;
    save();
    await layout();
    paint();
    const b1 = book.getBoundingClientRect();
    stage.scrollLeft += b1.left + fx * b1.width - x;
    stage.scrollTop += b1.top + fy * b1.height - y;
  }
  const stepZoom = (dir, at) => {
    const z = zoom();
    setZoom(dir > 0 ? ZOOMS.find((s) => s > z + 0.001) ?? z : [...ZOOMS].reverse().find((s) => s < z - 0.001) ?? z, at);
  };
  // Bigger than the stage: the wheel scrolls the page instead of turning it.
  const overflowing = () => {
    const s = R.dom.stage;
    return s.scrollWidth > s.clientWidth + 1 || s.scrollHeight > s.clientHeight + 1;
  };

  // Draw the current position, without animation.
  function paint() {
    const v = view();
    const { book } = R.dom;
    book.classList.toggle('closed', spread() && v.s === 0);
    book.classList.toggle('at-end', spread() && !v.right);
    R.dom.slotL.replaceChildren(spread() ? pageEl(v.left, { live: true, side: 'l' }) : '');
    R.dom.slotR.replaceChildren(pageEl(v.right, { live: true, side: 'r' }));
    R.dom.slotL.hidden = !spread();

    // The page edges: what is read stacks up on the left, what is left on the right.
    const last = v.pages[v.pages.length - 1] || 1;
    const read = (last - 1) / Math.max(1, N() - 1);
    book.style.setProperty('--read', read.toFixed(3));

    R.dom.pageIn.value = v.pages.join('–');
    R.dom.progress.style.width = (last / N()) * 100 + '%';
    const marked = v.pages.some((p) => R.book.bookmarks.includes(p));
    R.dom.markBtn.classList.toggle('active', marked);
    R.dom.markBtn.setAttribute('aria-pressed', marked);
    R.dom.markBtn.title = marked ? 'Remove bookmark (B)' : 'Bookmark this page (B)';
    R.dom.prev.disabled = stepFrom(R.pos, -1) === null;
    R.dom.next.disabled = stepFrom(R.pos, 1) === null;
    R.dom.live.textContent = `Page ${v.pages.join(' and ')} of ${N()}`;

    // Warm the next and previous views so a turn never waits.
    [1, -1, 2].forEach((d) => {
      const p = stepFrom(R.pos, d);
      if (p !== null) view(p).pages.forEach(renderPage);
    });
    paintSide();
  }

  /* -------------------------------------------------------- page turns */

  /* A turn is one leaf hinged on the spine (on a single page, its left
     edge). Its front is the page being turned, its back the page that lands.
     Under it the destination is already laid out, so when the leaf has gone
     over, only the far half of the destination is left to swap in. */
  function beginTurn(dir) {
    const to = stepFrom(R.pos, dir);
    if (to === null || R.turn) return null;
    const from = view();
    const dest = view(to);
    const fwd = dir > 0;
    const { book, slotL, slotR } = R.dom;

    let front, back, origin, slot;
    if (spread()) {
      slot = fwd ? slotR : slotL;
      front = fwd ? from.right : from.left;
      back = fwd ? dest.left : dest.right;
      origin = fwd ? 'left' : 'right';
      (fwd ? slotR : slotL).replaceChildren(pageEl(fwd ? dest.right : dest.left, { side: fwd ? 'r' : 'l' }));
    } else {
      slot = slotR;
      origin = 'left';
      // Forward, the page lifts off the next one; back, the previous page
      // comes down over this one.
      front = fwd ? from.right : dest.right;
      back = null;
      if (fwd) slotR.replaceChildren(pageEl(dest.right, { side: 'r' }));
    }

    const leaf = el('div', { class: `leaf origin-${origin}`, 'aria-hidden': 'true' }, [
      el('div', { class: 'leaf-face front' }, [pageEl(front, { side: origin === 'left' ? 'r' : 'l' }), el('div', { class: 'leaf-light' })]),
      el('div', { class: 'leaf-face back' }, [pageEl(back, { side: origin === 'left' ? 'l' : 'r' }), el('div', { class: 'leaf-light' })]),
    ]);
    leaf.style.left = slot.offsetLeft + 'px';
    book.append(leaf);
    book.classList.add('turning');

    // Forward angles run 0 → -180; back 0 → 180 (single page: -180 → 0).
    const sign = origin === 'left' ? -1 : 1;
    const start = !spread() && !fwd ? -180 : 0;
    const end = !spread() && !fwd ? 0 : 180 * sign;
    const t = { dir, to, leaf, start, end, angle: start, fwd };
    R.turn = t;
    setAngle(t, start);
    return t;
  }

  function setAngle(t, a) {
    t.angle = a;
    const p = clamp((a - t.start) / (t.end - t.start), 0, 1);  // 0 → 1 along the turn
    const lift = Math.sin(Math.PI * p);
    t.leaf.style.transform = `rotateY(${a}deg)`;
    t.leaf.style.setProperty('--p', p.toFixed(3));
    t.leaf.style.setProperty('--lift', lift.toFixed(3));
    R.dom.book.style.setProperty('--turn', lift.toFixed(3));
    // The leaf's shadow falls on whichever side it is over.
    R.dom.book.dataset.shadow = (Math.abs(a) < 90) === (t.leaf.classList.contains('origin-left')) ? 'r' : 'l';
    // One page: the leaf fades as it goes over (or arrives). Set on the faces,
    // never the leaf — opacity on a preserve-3d element flattens it, and a flat
    // leaf shows its front through, mirrored.
    if (!spread()) t.leaf.style.setProperty('--fade', t.fwd ? clamp(2.2 - p * 1.6, 0, 1).toFixed(3) : clamp(p * 1.6, 0, 1).toFixed(3));
    // Opening or closing the cover slides the book to the centre as it turns.
    if (spread()) {
      const fromClosed = view().s === 0, toClosed = view(t.to).s === 0;
      if (fromClosed !== toClosed) R.dom.book.style.setProperty('--open', (fromClosed ? p : 1 - p).toFixed(3));
    }
  }

  function animateTo(t, target, ms) {
    return new Promise((res) => {
      if (reduced()) ms = 0;
      const a0 = t.angle, t0 = performance.now();
      const ease = (x) => 1 - Math.pow(1 - x, 3);
      const step = (now) => {
        const k = ms ? clamp((now - t0) / ms, 0, 1) : 1;
        setAngle(t, a0 + (target - a0) * ease(k));
        if (k < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
  }

  async function finishTurn(t, commit) {
    if (commit) rustle();
    const left = Math.abs(t.end - t.angle) / 180;
    await animateTo(t, commit ? t.end : t.start, commit ? 260 + 420 * left : 260);
    t.leaf.remove();
    R.dom.book.classList.remove('turning');
    R.dom.book.style.removeProperty('--open');
    R.turn = null;
    if (commit) R.pos = t.to;
    paint();
  }

  async function turn(dir) {
    if (!R || R.turn) return;
    const t = beginTurn(dir);
    if (t) await finishTurn(t, true);
  }

  function goTo(page) {
    if (!R) return;
    page = clamp(Math.round(page) || 1, 1, N());
    if (R.turn) return;
    const target = spread() ? Math.max(1, 2 * Math.floor(page / 2)) : page;
    const near = stepFrom(R.pos, 1) === target ? 1 : stepFrom(R.pos, -1) === target ? -1 : 0;
    if (near) { turn(near); return; }
    if (target === R.pos) return;
    // A jump riffles: a quick fade and the sound of pages going by.
    rustle();
    R.pos = target;
    R.dom.book.classList.add('riffle');
    setTimeout(() => R?.dom.book.classList.remove('riffle'), 260);
    paint();
  }

  /* Grabbing an edge: the leaf's free edge follows the pointer — its angle
     is the one that puts the edge under it — and on release it goes over if
     it is past the spine or was flicked, and falls back if not. */
  function edgeDrag(e, dir) {
    if (R.turn || e.button !== 0) return;
    const t = beginTurn(dir);
    if (!t) return;
    e.preventDefault();
    const spine = () => {
      const r = R.dom.book.getBoundingClientRect();
      return spread() ? r.left + r.width / 2 : r.left;
    };
    let lastX = e.clientX, lastT = performance.now(), vx = 0, moved = false;
    const angleAt = (x) => {
      const c = clamp((x - spine()) / R.pw, -1, 1);
      const deg = Math.acos(c) * 180 / Math.PI;  // 0 at the right edge, 180 at the left
      return t.leaf.classList.contains('origin-left') ? -deg : 180 - deg;
    };
    // A little lift straight away, so the corner visibly comes up.
    animateTo(t, t.start + (t.end - t.start) * 0.08, 140);
    const move = (ev) => {
      const now = performance.now();
      vx = (ev.clientX - lastX) / Math.max(1, now - lastT);
      lastX = ev.clientX; lastT = now;
      if (Math.abs(ev.clientX - e.clientX) > 4) moved = true;
      if (moved) setAngle(t, clamp(angleAt(ev.clientX), Math.min(t.start, t.end), Math.max(t.start, t.end)));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const p = (t.angle - t.start) / (t.end - t.start);
      // A flick is speed at the moment of letting go; a pause first is not one.
      if (performance.now() - lastT > 80) vx = 0;
      const flick = dir > 0 ? vx < -0.5 : vx > 0.5;
      finishTurn(t, !moved || p > 0.5 || flick);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  /* --------------------------------------------------------- bookmarks */

  function toggleBookmark() {
    const v = view();
    const b = R.book;
    const on = v.pages.filter((p) => b.bookmarks.includes(p));
    if (on.length) {
      const ribbons = R.dom.book.querySelectorAll('.slot > .paper .ribbon');
      ribbons.forEach((r) => r.classList.add('leaving'));
      b.bookmarks = b.bookmarks.filter((p) => !on.includes(p));
      setTimeout(() => R && paintMarksAll(), reduced() ? 0 : 320);
    } else {
      b.bookmarks = [...b.bookmarks, v.pages[0]].sort((x, y) => x - y);
      paintMarksAll();
      R.dom.book.querySelector(`.paper[data-page="${v.pages[0]}"] .ribbon`)?.classList.add('arriving');
    }
    save();
    paint2();
  }
  // Marks and controls only — the pages themselves stay as they are.
  const paintMarksAll = () => R.dom.book.querySelectorAll('.slot > .paper[data-page]').forEach((p) => p.dataset.page && paintMarks(p));
  function paint2() {
    const v = view();
    const marked = v.pages.some((p) => R.book.bookmarks.includes(p));
    R.dom.markBtn.classList.toggle('active', marked);
    R.dom.markBtn.setAttribute('aria-pressed', marked);
    paintSide();
  }

  /* -------------------------------------------------------- highlights */

  const COLORS = ['yellow', 'green', 'pink', 'blue'];
  let pop = null;
  const closePop = () => { pop?.remove(); pop = null; };

  function placePop(box, anchor) {
    readerEl.append(box);
    const r = box.getBoundingClientRect();
    box.style.left = clamp(anchor.left + anchor.width / 2 - r.width / 2, 8, innerWidth - r.width - 8) + 'px';
    box.style.top = (anchor.top - r.height - 10 < 56 ? anchor.bottom + 10 : anchor.top - r.height - 10) + 'px';
    pop = box;
  }

  // The selection, as rects on one page's sheet in 0–1 units, merged by line.
  function selectionOnPage() {
    const sel = getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    const range = sel.getRangeAt(0);
    const node = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
    const paper = node?.closest('.slot > .paper');
    if (!paper) return null;
    const sheet = paper.querySelector('.sheet').getBoundingClientRect();
    const lines = [];
    [...range.getClientRects()].forEach((r) => {
      if (r.width < 1 || r.bottom < sheet.top || r.top > sheet.bottom || r.right < sheet.left || r.left > sheet.right) return;
      const line = lines.find((l) => Math.abs(l.top - r.top) < r.height * 0.5);
      if (line) { line.left = Math.min(line.left, r.left); line.right = Math.max(line.right, r.right); line.bottom = Math.max(line.bottom, r.bottom); }
      else lines.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
    });
    if (!lines.length) return null;
    const rects = lines.map((l) => [
      (l.left - sheet.left) / sheet.width, (l.top - sheet.top) / sheet.height,
      (l.right - l.left) / sheet.width, (l.bottom - l.top) / sheet.height,
    ].map((v) => +v.toFixed(4)));
    return { page: +paper.dataset.page, rects, text: sel.toString().replace(/\s+/g, ' ').trim(), anchor: range.getBoundingClientRect() };
  }

  function selectionPopover() {
    const s = selectionOnPage();
    if (!s || !s.text) return;
    closePop();
    const make = (color, note) => {
      const h = { id: uid(), page: s.page, rects: s.rects, text: s.text, color, note: '', at: Date.now() };
      R.book.highlights.push(h);
      save();
      getSelection().removeAllRanges();
      paintMarksAll(); paintSide();
      closePop();
      if (note) noteEditor(h, s.anchor);
      return h;
    };
    const box = el('div', { class: 'rd-pop', role: 'toolbar', 'aria-label': 'Highlight' }, [
      ...COLORS.map((c) => el('button', { class: `swatch-dot hl-${c}`, title: `Highlight ${c}`, 'aria-label': `Highlight ${c}`, onclick: () => make(c) })),
      el('span', { class: 'rd-pop-sep' }),
      el('button', { class: 'rd-pop-btn', text: 'Note', onclick: () => make('yellow', true) }),
      el('button', { class: 'rd-pop-btn', text: 'To board', onclick: () => sendToBoard(make('yellow')) }),
    ]);
    placePop(box, s.anchor);
  }

  function hlPopover(h, anchor) {
    closePop();
    const box = el('div', { class: 'rd-pop', role: 'toolbar', 'aria-label': 'Highlight' }, [
      ...COLORS.map((c) => el('button', {
        class: `swatch-dot hl-${c}${h.color === c ? ' on' : ''}`, 'aria-label': `Make ${c}`,
        onclick: () => { h.color = c; save(); paintMarksAll(); paintSide(); closePop(); },
      })),
      el('span', { class: 'rd-pop-sep' }),
      el('button', { class: 'rd-pop-btn', text: h.note ? 'Edit note' : 'Note', onclick: () => noteEditor(h, anchor) }),
      el('button', { class: 'rd-pop-btn', text: 'To board', onclick: () => { sendToBoard(h); closePop(); } }),
      h.note ? el('button', { class: 'rd-pop-btn danger', text: 'Remove note', onclick: () => removeNote(h) }) : null,
      el('button', { class: 'rd-pop-btn danger', text: 'Remove highlight', onclick: () => removeHighlight(h) }),
    ]);
    placePop(box, anchor);
  }

  // Taking a note off keeps its highlight; taking a highlight off takes its note too.
  function removeNote(h) {
    h.note = '';
    save(); paintMarksAll(); paintSide(); closePop();
  }
  function removeHighlight(h) {
    R.book.highlights = R.book.highlights.filter((x) => x !== h);
    save(); paintMarksAll(); paintSide(); closePop();
  }

  function noteEditor(h, anchor) {
    closePop();
    const ta = el('textarea', { class: 'rd-note-input', rows: 4, placeholder: 'A note in the margin…', value: h.note || '' });
    const done = () => { h.note = ta.value.trim(); save(); paintMarksAll(); paintSide(); closePop(); };
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) done();
      if (e.key === 'Escape') { e.stopPropagation(); closePop(); }
    });
    const box = el('div', { class: 'rd-pop note', role: 'dialog', 'aria-label': 'Note' }, [
      el('blockquote', { class: 'rd-note-quote', text: h.text.length > 160 ? h.text.slice(0, 160) + '…' : h.text }),
      ta,
      el('div', { class: 'rd-note-actions' }, [
        el('span', { class: 'rd-note-hint', text: 'Ctrl+Enter to save' }),
        el('button', { class: 'btn sm primary', text: 'Save', onclick: done }),
      ]),
    ]);
    placePop(box, anchor);
    ta.focus();
  }

  // A highlight becomes a quote card on the board that is open behind the reader.
  function sendToBoard(h) {
    const b = board();
    b.cards.push({
      id: uid(), type: 'quote', title: '', color: 'default',
      data: { text: h.text + (h.note ? `\n\n— ${h.note}` : ''), by: `${R.book.title}${R.book.author ? ', ' + R.book.author : ''} · p. ${h.page}` },
      x: 40 + (b.cards.length % 6) * 40, y: 40 + (b.cards.length % 5) * 36, w: null,
      order: b.cards.length, columnId: b.columns[0]?.id,
    });
    save();
    render();
    toast(`Sent to "${b.name}".`);
  }

  function hlAt(e) {
    const paper = e.target.closest('.slot > .paper');
    const sheet = paper?.querySelector('.sheet');
    if (!sheet) return null;
    const r = sheet.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    return R.book.highlights.find((h) => h.page === +paper.dataset.page
      && h.rects.some(([hx, hy, hw, hh]) => x >= hx && x <= hx + hw && y >= hy && y <= hy + hh));
  }

  /* ------------------------------------------------------------ search */

  function markMatches(tl, q) {
    const ql = q.toLowerCase();
    tl.querySelectorAll('span').forEach((s) => s.classList.toggle('match', !!ql && s.textContent.toLowerCase().includes(ql)));
  }

  async function pageText(n) {
    if (!R.text.has(n)) {
      R.text.set(n, R.pdf.getPage(n).then((p) => p.getTextContent()).then((tc) => tc.items.map((i) => i.str).join(' ').replace(/\s+/g, ' ')));
    }
    return R.text.get(n);
  }

  async function runSearch(q, list) {
    const token = (R.searchToken = {});
    R.query = q;
    R.dom.book.querySelectorAll('.textLayer').forEach((tl) => markMatches(tl, q));
    list.replaceChildren();
    if (q.length < 2) return;
    const status = el('li', { class: 'rd-muted', text: 'Searching…' });
    list.append(status);
    let hits = 0;
    const ql = q.toLowerCase();
    for (let n = 1; n <= N(); n++) {
      const text = await pageText(n);
      if (token !== R?.searchToken) return;
      let i = text.toLowerCase().indexOf(ql);
      while (i !== -1 && hits < 300) {
        const snip = text.slice(Math.max(0, i - 40), i + q.length + 50);
        const at = snip.toLowerCase().indexOf(ql);
        list.insertBefore(el('li', {}, [el('button', { class: 'rd-item', onclick: () => goTo(n) }, [
          el('span', { class: 'rd-item-page', text: `p. ${n}` }),
          el('span', { class: 'rd-item-text' }, [
            document.createTextNode((i > 40 ? '…' : '') + snip.slice(0, at)),
            el('mark', { text: snip.slice(at, at + q.length) }),
            document.createTextNode(snip.slice(at + q.length) + '…'),
          ]),
        ])]), status);
        hits++;
        i = text.toLowerCase().indexOf(ql, i + ql.length);
      }
    }
    status.textContent = hits ? `${hits}${hits >= 300 ? '+' : ''} found` : 'Nothing found';
  }

  /* ----------------------------------------------------------- sidebar */

  async function outlineList(items) {
    const ul = el('ul', { class: 'rd-toc' });
    for (const it of items) {
      const btn = el('button', { class: 'rd-item', text: it.title, onclick: async () => {
        try {
          const dest = typeof it.dest === 'string' ? await R.pdf.getDestination(it.dest) : it.dest;
          if (dest) goTo((await R.pdf.getPageIndex(dest[0])) + 1);
        } catch { /* a dead link in the outline */ }
      } });
      if (it.items?.length) {
        ul.append(el('li', {}, [el('details', { open: false }, [el('summary', {}, [btn]), await outlineList(it.items)])]));
      } else ul.append(el('li', {}, [btn]));
    }
    return ul;
  }

  function paintSide() {
    if (!R) return;
    const p = prefs();
    const { side } = R.dom;
    side.hidden = !p.side;
    R.dom.sideBtn.classList.toggle('active', p.side);
    R.dom.sideBtn.setAttribute('aria-expanded', p.side);
    if (!p.side) return;
    side.querySelectorAll('[role=tab]').forEach((t) => t.setAttribute('aria-selected', t.dataset.tab === p.tab));
    const panel = side.querySelector('.rd-panel');
    const b = R.book;

    if (p.tab === 'contents') {
      if (panel.dataset.tab === 'contents') return;  // built once per book
      panel.dataset.tab = 'contents';
      panel.replaceChildren(el('p', { class: 'rd-muted', text: 'Reading the contents…' }));
      R.pdf.getOutline().then(async (o) => {
        if (prefs().tab !== 'contents') return;
        panel.replaceChildren(o?.length ? await outlineList(o) : el('p', { class: 'rd-muted', text: 'This PDF has no table of contents.' }));
      });
    } else if (p.tab === 'marks') {
      panel.dataset.tab = 'marks';
      panel.replaceChildren(b.bookmarks.length ? el('ul', { class: 'rd-list' }, b.bookmarks.map((pg) => el('li', { class: 'rd-row' }, [
        el('button', { class: 'rd-item', onclick: () => goTo(pg) }, [el('span', { class: 'rd-ribbon-dot' }), el('span', { text: `Page ${pg}` })]),
        el('button', { class: 'icon-btn sm', html: '&times;', 'aria-label': `Remove bookmark on page ${pg}`, onclick: () => {
          b.bookmarks = b.bookmarks.filter((x) => x !== pg); save(); paintMarksAll(); paint2();
        } }),
      ]))) : el('p', { class: 'rd-muted', text: 'No bookmarks yet. Press the ribbon (or B) to mark a page — the book opens at the furthest one.' }));
    } else if (p.tab === 'notes') {
      panel.dataset.tab = 'notes';
      const hs = [...b.highlights].sort((x, y) => x.page - y.page || x.rects[0][1] - y.rects[0][1]);
      const removeAll = () => {
        const notes = hs.filter((h) => h.note).length;
        if (!confirm(`Remove all ${hs.length} highlight${hs.length > 1 ? 's' : ''}${notes ? ` and ${notes} note${notes > 1 ? 's' : ''}` : ''} from this book?`)) return;
        b.highlights = [];
        save(); paintMarksAll(); paintSide();
      };
      panel.replaceChildren(hs.length ? el('ul', { class: 'rd-list' }, [...hs.map((h) => el('li', { class: 'rd-row rd-note-row' }, [
        el('button', { class: 'rd-item rd-note', onclick: () => goTo(h.page) }, [
          el('span', { class: `rd-note-bar hl-${h.color}` }),
          el('span', { class: 'rd-item-body' }, [
            el('span', { class: 'rd-item-page', text: `p. ${h.page}` }),
            el('span', { class: 'rd-item-text', text: h.text.length > 180 ? h.text.slice(0, 180) + '…' : h.text }),
            h.note ? el('span', { class: 'rd-item-note', text: h.note }) : null,
          ]),
        ]),
        el('span', { class: 'rd-row-actions' }, [
          h.note ? el('button', { class: 'rd-pop-btn danger', text: 'Remove note', title: 'Keeps the highlight',
            'aria-label': `Remove note on page ${h.page}`, onclick: () => removeNote(h) }) : null,
          el('button', { class: 'rd-pop-btn danger', text: 'Remove', title: h.note ? 'Removes the highlight and its note' : 'Removes the highlight',
            'aria-label': `Remove highlight on page ${h.page}`, onclick: () => removeHighlight(h) }),
        ]),
      ])), el('li', {}, [el('button', { class: 'rd-pop-btn danger rd-remove-all', text: 'Remove all highlights and notes', onclick: removeAll })])])
        : el('p', { class: 'rd-muted', text: 'Select text on a page to highlight it or add a note.' }));
    } else if (p.tab === 'search') {
      if (panel.dataset.tab === 'search') return;
      panel.dataset.tab = 'search';
      const list = el('ul', { class: 'rd-list' });
      let timer;
      const input = el('input', { class: 'rd-search', type: 'search', placeholder: 'Search this book', value: R.query || '',
        oninput: (e) => { clearTimeout(timer); timer = setTimeout(() => runSearch(e.target.value.trim(), list), 250); } });
      panel.replaceChildren(input, list);
      if (R.query) runSearch(R.query, list);
      requestAnimationFrame(() => input.focus());
    }
  }

  /* --------------------------------------------------------- open/close */

  function buildReader() {
    const icon = (path) => `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">${path}</svg>`;
    const btn = (cls, label, svg, onclick, extra = {}) => el('button', { class: `icon-btn rd-btn ${cls}`, title: label, 'aria-label': label, html: icon(svg), onclick, ...extra });
    const dom = {};
    dom.sideBtn = btn('', 'Contents and notes (T)', '<path d="M4 6h16M4 12h10M4 18h16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>', () => { prefs().side = !prefs().side; save(); paintSide(); relayout(); });
    dom.markBtn = btn('rd-mark', 'Bookmark this page (B)', '<path d="M7 3h10v18l-5-4-5 4z" fill="currentColor"/>', toggleBookmark, { 'aria-pressed': 'false' });
    dom.spreadBtn = btn('', 'One page / two pages', '', () => { prefs().spread = !prefs().spread; save(); syncSpreadBtn(); relayout(); });
    dom.muteBtn = btn('', '', '', () => { prefs().muted = !prefs().muted; save(); syncMuteBtn(); });
    dom.themeBtn = btn('', 'Light / dark', '<path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z" fill="currentColor"/>', () => document.getElementById('themeBtn').click());
    dom.zoomOut = el('button', { class: 'icon-btn sm', html: '&minus;', title: 'Zoom out (Ctrl −)', 'aria-label': 'Zoom out', onclick: () => stepZoom(-1) });
    dom.zoomIn = el('button', { class: 'icon-btn sm', text: '+', title: 'Zoom in (Ctrl +)', 'aria-label': 'Zoom in', onclick: () => stepZoom(1) });
    dom.zoomLevel = el('button', { class: 'rd-zoom-level', title: 'Fit to screen (Ctrl 0)', 'aria-label': 'Fit to screen', onclick: () => setZoom(1) });
    dom.pageIn = el('input', { class: 'rd-page-in', 'aria-label': 'Page', inputmode: 'numeric',
      onkeydown: (e) => { if (e.key === 'Enter') { goTo(parseInt(e.target.value, 10)); readerEl.focus(); } },
      onfocus: (e) => e.target.select() });
    dom.total = el('span', { class: 'rd-total' });
    dom.title = el('div', { class: 'rd-title' });

    const bar = el('header', { class: 'rd-bar' }, [
      el('button', { class: 'btn sm rd-back', text: '‹ Shelf', title: 'Back to the shelf (Esc)', onclick: closeReader }),
      dom.sideBtn,
      dom.title,
      el('div', { class: 'rd-pager' }, [dom.pageIn, dom.total]),
      el('div', { class: 'rd-zoom', role: 'group', 'aria-label': 'Zoom' }, [dom.zoomOut, dom.zoomLevel, dom.zoomIn]),
      dom.markBtn, dom.spreadBtn, dom.muteBtn, dom.themeBtn,
    ]);

    const tabs = [['contents', 'Contents'], ['marks', 'Bookmarks'], ['notes', 'Notes'], ['search', 'Search']];
    dom.side = el('aside', { class: 'rd-side', 'aria-label': 'Contents, bookmarks, notes and search' }, [
      el('div', { class: 'rd-tabs', role: 'tablist' }, tabs.map(([k, label]) => el('button', {
        role: 'tab', 'data-tab': k, text: label, onclick: () => {
          prefs().tab = k;
          save();
          // Leaving search takes its marks off the pages.
          if (k !== 'search' && R.query) {
            R.query = '';
            R.dom.book.querySelectorAll('.textLayer').forEach((tl) => markMatches(tl, ''));
          }
          paintSide();
        },
      }))),
      el('div', { class: 'rd-panel', role: 'tabpanel' }),
    ]);

    dom.slotL = el('div', { class: 'slot slot-l' });
    dom.slotR = el('div', { class: 'slot slot-r' });
    dom.book = el('div', { class: 'book' }, [
      el('div', { class: 'edges edges-l' }), dom.slotL, dom.slotR, el('div', { class: 'edges edges-r' }),
    ]);
    dom.prev = el('button', { class: 'turn-zone prev', 'aria-label': 'Previous page' });
    dom.next = el('button', { class: 'turn-zone next', 'aria-label': 'Next page' });
    dom.prev.addEventListener('pointerdown', (e) => edgeDrag(e, -1));
    dom.next.addEventListener('pointerdown', (e) => edgeDrag(e, 1));
    // Keyboard and assistive tech press these as buttons: no pointerdown, so turn here.
    dom.prev.addEventListener('click', (e) => { if (e.detail === 0) turn(-1); });
    dom.next.addEventListener('click', (e) => { if (e.detail === 0) turn(1); });
    dom.book.append(dom.prev, dom.next);

    dom.stage = el('main', { class: 'rd-stage' }, [dom.book]);
    dom.progress = el('div', { class: 'rd-progress-fill' });
    dom.live = el('div', { class: 'sr-only', 'aria-live': 'polite' });

    readerEl = el('section', { class: 'reader', role: 'dialog', 'aria-modal': 'true', tabindex: '-1' }, [
      bar, el('div', { class: 'rd-body' }, [dom.side, dom.stage]),
      el('div', { class: 'rd-progress' }, [dom.progress]), dom.live,
    ]);

    // Selecting text offers a highlight; clicking one offers its options.
    dom.stage.addEventListener('mouseup', () => setTimeout(selectionPopover, 0));
    dom.stage.addEventListener('click', (e) => {
      if (getSelection()?.isCollapsed === false) return;
      const h = hlAt(e);
      if (h) hlPopover(h, { left: e.clientX, width: 0, top: e.clientY - 8, bottom: e.clientY + 8 });
    });
    readerEl.addEventListener('pointerdown', (e) => { if (pop && !pop.contains(e.target)) closePop(); }, true);

    // Ctrl+wheel (and a trackpad pinch, which arrives as one) zooms. Otherwise
    // the wheel scrolls a book zoomed past the screen, and turns pages if not.
    let acc = 0, lock = 0, zoomLock = 0;
    dom.stage.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const now = performance.now();
        if (now < zoomLock || !e.deltaY) return;
        zoomLock = now + 140;
        stepZoom(e.deltaY < 0 ? 1 : -1, { x: e.clientX, y: e.clientY });
        return;
      }
      if (overflowing()) return;
      e.preventDefault();
      const now = performance.now();
      if (now < lock) return;
      acc += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(acc) > 80) { turn(Math.sign(acc)); acc = 0; lock = now + 550; }
    }, { passive: false });

    // The bar steps back while you read, and comes back on any movement.
    let idle;
    readerEl.addEventListener('pointermove', () => {
      readerEl.classList.remove('idle');
      clearTimeout(idle);
      idle = setTimeout(() => readerEl?.classList.add('idle'), 2800);
    });

    R.dom = dom;
    syncSpreadBtn();
    syncMuteBtn();
  }

  function syncSpreadBtn() {
    const two = prefs().spread;
    R.dom.spreadBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">${two
      ? '<path d="M3 5h8v14H3zM13 5h8v14h-8z" fill="none" stroke="currentColor" stroke-width="1.8"/>'
      : '<path d="M7 4h10v16H7z" fill="none" stroke="currentColor" stroke-width="1.8"/>'}</svg>`;
    R.dom.spreadBtn.title = two ? 'Show one page at a time' : 'Show two pages';
    R.dom.spreadBtn.setAttribute('aria-label', R.dom.spreadBtn.title);
    R.dom.spreadBtn.setAttribute('aria-pressed', String(two));
  }

  function syncMuteBtn() {
    const m = prefs().muted;
    R.dom.muteBtn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>${m
      ? '<path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="1.8"/>'
      : '<path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8"/>'}</svg>`;
    R.dom.muteBtn.title = m ? 'Turn page sound on' : 'Mute page sound';
    R.dom.muteBtn.setAttribute('aria-label', R.dom.muteBtn.title);
  }

  let relayoutTimer;
  async function relayout() {
    if (!R) return;
    if (R.turn) return;
    R.pos = spread() ? Math.max(1, 2 * Math.floor(R.pos / 2)) : view().pages[0] || R.pos;
    await layout();
    paint();
  }
  const onResize = () => { clearTimeout(relayoutTimer); relayoutTimer = setTimeout(relayout, 150); };

  function onKey(e) {
    if (!readerEl) return;
    const typing = /^(INPUT|TEXTAREA)$/.test(e.target.tagName);
    // Listened for on the reader itself, after its inputs have had the key,
    // and stopped here so the board behind the book hears nothing.
    e.stopPropagation();
    if (e.key === 'Escape') {
      if (pop) { closePop(); return; }
      if (typing) { readerEl.focus(); return; }
      closeReader();
      return;
    }
    if (typing) return;
    const keys = {
      ArrowRight: () => turn(1), ArrowLeft: () => turn(-1), PageDown: () => turn(1), PageUp: () => turn(-1),
      ' ': () => turn(e.shiftKey ? -1 : 1), Home: () => goTo(1), End: () => goTo(N()),
      b: toggleBookmark, B: toggleBookmark,
      t: () => R.dom.sideBtn.click(), T: () => R.dom.sideBtn.click(),
    };
    if (e.ctrlKey || e.metaKey) {
      const z = { '=': 1, '+': 1, '-': -1, '_': -1 }[e.key];
      if (z) { e.preventDefault(); stepZoom(z); return; }
      if (e.key === '0') { e.preventDefault(); setZoom(1); return; }
    }
    if (keys[e.key] && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); keys[e.key](); }
  }

  // A key pressed while focus has slipped out of the reader (to the page
  // body) still belongs to the book, not to the board behind it.
  function strayKey(e) {
    if (readerEl && !readerEl.contains(e.target) && !pop?.contains(e.target)) onKey(e);
  }

  async function openBook(key) {
    const b = lib()[key];
    if (!b || readerEl) return;
    if (!supported()) { openShelf(); return; }
    let pdf;
    try {
      pdf = await openPdf(b);
    } catch (err) {
      toast(err.message.includes('access') ? 'Open the books folder from the shelf first.' : `Could not open "${b.title}".`);
      openShelf();
      return;
    }
    b.bookmarks ||= [];
    b.highlights ||= [];
    b.opened = Date.now();
    describe(b, pdf).then(refresh);

    R = { book: b, key, pdf, cache: new Map(), text: new Map(), gen: 0, pw: 0, ph: 0, turn: null,
      // The furthest bookmark, else the cover.
      pos: Math.max(1, ...b.bookmarks) };
    buildReader();
    R.dom.title.replaceChildren(el('span', { class: 'rd-book', text: b.title }), b.author ? el('span', { class: 'rd-author', text: b.author }) : '');
    R.dom.total.textContent = `/ ${pdf.numPages}`;
    readerEl.setAttribute('aria-label', b.title);
    document.body.append(readerEl);
    document.body.classList.add('reading');
    if (shelfEl) shelfEl.hidden = true;
    readerEl.addEventListener('keydown', onKey);
    document.addEventListener('keydown', strayKey, true);
    addEventListener('resize', onResize);
    history.pushState({ reading: key }, '', '#reading');
    await layout();
    paint();
    readerEl.focus();
  }

  function closeReader(fromHistory) {
    if (!readerEl) return;
    closePop();
    removeEventListener('resize', onResize);
    R.pdf.loadingTask.destroy();
    document.removeEventListener('keydown', strayKey, true);
    readerEl.remove();
    readerEl = null;
    R = null;
    document.body.classList.remove('reading');
    if (fromHistory !== true && history.state?.reading) history.back();
    openShelf();
  }
  addEventListener('popstate', () => { if (readerEl) closeReader(true); });

  /* ------------------------------------------------------------- wiring */

  document.getElementById('booksBtn')?.addEventListener('click', () => {
    if (shelfEl && !shelfEl.hidden) closeShelf(); else openShelf();
  });

  // Folder permission sometimes survives a reload; then the card can show
  // books that arrived in the folder since last time without a click.
  // After DOMContentLoaded, because scan() writes to app.js's state.
  addEventListener('DOMContentLoaded', () => {
    if (supported()) folderState().then((s) => { if (s === 'ready') scan().then(refresh); });
  });

  return { renderCard, openShelf, openBook, closeReader };
})();
