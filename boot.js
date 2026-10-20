/* Theme before first paint. app.js runs at the end of the body, so without
   this a dark-theme user gets a white flash on every launch. A file rather
   than an inline script so the Content-Security-Policy can refuse all
   inline scripts. */
try {
  var s = JSON.parse(localStorage.getItem('notes.dashboard.v1'));
  if (s && s.theme) document.documentElement.dataset.theme = s.theme;
} catch (e) {}
