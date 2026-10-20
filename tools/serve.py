"""Serve the app locally: `python tools/serve.py` (port 8000; or pass a port).

The same as `python -m http.server`, plus one header. A plain static server
sends no Cache-Control, so the browser guesses how long a file stays fresh —
often hours — and goes on running last version's app.js beside this version's
index.html. `no-cache` makes it check every file (an unchanged one costs a 304).

Keep using the same port: the browser keeps each origin's boards and books
folder separately, so localhost:8000 and localhost:8001 are different apps.
"""
import functools
import http.server
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    handler = functools.partial(NoCache, directory=str(ROOT))
    with http.server.ThreadingHTTPServer(('127.0.0.1', port), handler) as httpd:
        print(f'Notes on http://localhost:{port}/  (Ctrl+C to stop)')
        httpd.serve_forever()
