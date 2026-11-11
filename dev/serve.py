"""Local dev server with correct MIME types for .mjs and .wasm (same as GitHub Pages)."""
import http.server, socketserver, os, sys
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
H.extensions_map = dict(http.server.SimpleHTTPRequestHandler.extensions_map)
H.extensions_map.update({'.mjs': 'text/javascript', '.js': 'text/javascript', '.wasm': 'application/wasm', '.svg': 'image/svg+xml'})
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8791
socketserver.ThreadingTCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(('127.0.0.1', port), H) as s:
    s.serve_forever()
