# Notes

A local dashboard for boards of cards. Plain HTML, CSS and vanilla JavaScript with no dependencies and no build step. It installs as a PWA and works offline through a service worker.

Live: https://akshayaa-403.github.io/notes/

## What it does

- **Boards of typed cards**: text, Markdown, checklists, bulleted, numbered and step lists, links and link lists, images, tables, quotes, stats, bar and spider charts.
- **Three layouts per board**: Canvas (free placement), Grid and Columns.
- **Picture calendar**: a month view where each day can hold a note and a picture.
- **Pomodoro**: a floating timer you can drag around the screen.
- **Bookshelf reader**: reads PDFs with a bundled copy of pdf.js (`vendor/pdfjs`). In browsers with the File System Access API it opens a folder on your computer. Other browsers (phones, Firefox, Safari) keep the PDFs in IndexedDB on that device.

## Run it locally

```bash
python tools/serve.py        # http://localhost:8000/
```

This is `python -m http.server` with `Cache-Control: no-cache` added. Any static server works. Opening `index.html` straight from disk (`file://`) does not work for the bookshelf. Stick to one port: each origin keeps its own boards and books folder.

## Privacy

Boards, the calendar and settings live in your browser's `localStorage`, and the bookshelf uses IndexedDB. Nothing is uploaded. One exception: link cards load their icons from `https://www.google.com/s2/favicons`, so Google sees the domain of each link you save.

## Before you open it in a browser you already use

`resources.js` bundles the owner's notebook boards as a pack marked `reset: true`. The first time a browser loads that pack, it **replaces everything saved there**: boards, calendar pictures, pomodoro and theme. After that it is remembered and not imported again. Books in the bookshelf are not affected. A later addition in the same file (`notebook-restore-1`) also replaces any board named "Notebook" once.
