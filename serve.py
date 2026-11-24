"""Cloudera AI application entry for the diagnostic UI.

Set the application Script field to serve.py.
Set PROCESS_AGENT_API_URL to the backend application origin, with no trailing slash.
Example: https://process-agent.<workspace-domain>
An empty value keeps chat requests on this same origin.
"""

from __future__ import annotations

import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


def _root() -> Path:
    file_name = globals().get("__file__")
    if file_name:
        return Path(file_name).resolve().parent
    return Path.cwd().resolve()


ROOT = _root()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self) -> None:
        path = self.path.split("?", 1)[0]
        if path != "/config.js":
            super().do_GET()
            return
        api = os.environ.get("PROCESS_AGENT_API_URL", "").strip().rstrip("/")
        body = f"export const API_BASE = {json.dumps(api)};\n".encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/javascript; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    """Bind the UI on 127.0.0.1 and CDSW_APP_PORT (default 8080)."""
    host = "127.0.0.1"
    port = int(os.getenv("CDSW_APP_PORT", "8080"))
    server = ThreadingHTTPServer((host, port), Handler)
    print(f"Serving UI on http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__" and globals().get("__file__"):
    main()
