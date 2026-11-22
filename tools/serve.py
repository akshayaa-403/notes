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
import json
import os
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SYNC_FILE = ROOT / 'sync' / 'backup.enc.json'
SYNC_MAX = 20 * 1024 * 1024


def valid_sync(body):
    """Only the app's encrypted envelope is accepted, never plain state."""
    try:
        f = json.loads(body)
    except ValueError:
        return False
    return (isinstance(f, dict) and f.get('v') == 1 and isinstance(f.get('stamp'), int)
            and all(isinstance(f.get(k), str) and f[k] for k in ('salt', 'iv', 'data')))


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    # The app POSTs its encrypted state here; tools/sync-push.ps1 pushes it nightly.
    def do_POST(self):
        if self.path.split('?')[0] != '/sync':
            return self.send_error(404)
        size = int(self.headers.get('Content-Length') or 0)
        if not 0 < size <= SYNC_MAX:
            return self.send_error(413)
        body = self.rfile.read(size)
        if not valid_sync(body):
            return self.send_error(400, 'Not an encrypted sync file')
        SYNC_FILE.parent.mkdir(exist_ok=True)
        tmp = SYNC_FILE.with_suffix('.tmp')
        tmp.write_bytes(body)
        os.replace(tmp, SYNC_FILE)  # atomic: the nightly push never sees half a file
        self.send_response(204)
        self.end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    handler = functools.partial(NoCache, directory=str(ROOT))
    with http.server.ThreadingHTTPServer(('127.0.0.1', port), handler) as httpd:
        print(f'Notes on http://localhost:{port}/  (Ctrl+C to stop)')
        httpd.serve_forever()
