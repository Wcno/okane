"""A real HTTP server that stands in for api-service in gateway tests."""

import threading
from dataclasses import dataclass, field
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


@dataclass
class ReceivedRequest:
    method: str
    path: str
    headers: dict
    body: bytes


@dataclass
class StubApiService:
    status: int = 200
    body: bytes = b"{}"
    content_type: str = "application/json"
    received: list = field(default_factory=list)

    def start(self):
        stub = self

        class Handler(BaseHTTPRequestHandler):
            def answer(self):
                length = int(self.headers.get("Content-Length") or 0)
                stub.received.append(
                    ReceivedRequest(
                        method=self.command,
                        path=self.path,
                        headers={name.lower(): value for name, value in self.headers.items()},
                        body=self.rfile.read(length),
                    )
                )
                self.send_response(stub.status)
                self.send_header("Content-Type", stub.content_type)
                self.send_header("Content-Length", str(len(stub.body)))
                self.end_headers()
                self.wfile.write(stub.body)

            do_GET = do_POST = do_PUT = do_PATCH = do_DELETE = answer

            def log_message(self, *args):
                pass

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        threading.Thread(
            target=self.server.serve_forever, kwargs={"poll_interval": 0.01}, daemon=True
        ).start()
        return self

    @property
    def url(self):
        host, port = self.server.server_address
        return f"http://{host}:{port}"

    def stop(self):
        self.server.shutdown()
        self.server.server_close()
