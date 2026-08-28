#!/usr/bin/env python3
import http.server
import urllib.request
import urllib.parse
import os

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class StudioHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        # Local high-speed proxy endpoint
        if self.path.startswith('/api/proxy?'):
            parsed = urllib.parse.urlparse(self.path)
            params = urllib.parse.parse_qs(parsed.query)
            target_url = params.get('url', [None])[0]

            if not target_url or not (target_url.startswith('https://technocore.chat/') or target_url.startswith('http://technocore.chat/')):
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b"Invalid target URL")
                return

            try:
                req = urllib.request.Request(
                    target_url,
                    headers={
                        'User-Agent': 'TechnocoreStudio/1.0',
                        'Accept': '*/*'
                    }
                )
                with urllib.request.urlopen(req, timeout=5) as resp:
                    data = resp.read()
                    status = resp.status
                    content_type = resp.headers.get('Content-Type', 'text/plain; charset=utf-8')

                    self.send_response(status)
                    self.send_header('Content-Type', content_type)
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
                    self.send_header('Access-Control-Allow-Headers', '*')
                    self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
                    self.end_headers()
                    self.wfile.write(data)
            except Exception as e:
                self.send_response(502)
                self.send_header('Content-Type', 'text/plain')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(f"Proxy Error: {e}".encode('utf-8'))
            return

        super().do_GET()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()

if __name__ == '__main__':
    # Use ThreadingHTTPServer for concurrent non-blocking request handling
    server_address = ("", PORT)
    httpd = http.server.ThreadingHTTPServer(server_address, StudioHandler)
    print(f"Technocore Studio multithreaded server running on http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
