/* =========================================================================
   PWA glue: service-worker registration and the update prompt.

   Deliberately separate from app.js and free of any dependency on it — it
   only ever touches the DOM and the service worker, so the app keeps working
   untouched in a browser that has neither.
   ========================================================================= */

'use strict';

(() => {
  /* -------------------------------------------------------------- toasts */

  const toast = (message, actionLabel, onAction) => {
    const box = document.createElement('div');
    box.className = 'pwa-toast';
    box.setAttribute('role', 'status');

    const text = document.createElement('span');
    text.textContent = message;
    box.append(text);

    if (actionLabel) {
      const btn = document.createElement('button');
      btn.className = 'btn primary sm';
      btn.textContent = actionLabel;
      btn.addEventListener('click', () => { box.remove(); onAction(); });
      box.append(btn);
    }

    const dismiss = document.createElement('button');
    dismiss.className = 'icon-btn sm';
    dismiss.title = 'Dismiss';
    dismiss.innerHTML = '&times;';
    dismiss.addEventListener('click', () => box.remove());
    box.append(dismiss);

    document.body.append(box);
    return box;
  };

  /* ----------------------------------------------------- service worker */

  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    let reg;
    try {
      // Relative on purpose: the scope then follows wherever the app is
      // hosted, rather than assuming it owns the domain root.
      reg = await navigator.serviceWorker.register('sw.js');
    } catch (err) {
      // A failed registration costs nothing — the app still runs online.
      console.warn('Service worker did not register.', err);
      return;
    }

    // Reload exactly once, when the worker we asked for actually takes over.
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      location.reload();
    });

    const offerUpdate = (worker) => {
      toast('A new version is ready.', 'Reload', () => worker.postMessage('SKIP_WAITING'));
    };

    // Already waiting from a previous visit.
    if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);

    reg.addEventListener('updatefound', () => {
      const next = reg.installing;
      if (!next) return;
      next.addEventListener('statechange', () => {
        // A controller already exists ⇒ this is an update, not a first install.
        if (next.state === 'installed' && navigator.serviceWorker.controller) {
          offerUpdate(next);
        }
      });
    });
  });
})();
