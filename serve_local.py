import http.server
import socketserver
import os
import sys

PORT = 3000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class CareerGoalsHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def translate_path(self, path):
        # Clean path of query parameters / anchors
        clean_path = path.split('?', 1)[0].split('#', 1)[0].rstrip('/')
        if not clean_path or clean_path in ('', '/index.html', '/preview', '/matches', '/countries', '/tracker', '/letter-helper', '/planner', '/roadmap', '/onboarding'):
            return os.path.join(DIRECTORY, 'careergoals-fox-university.html')
        translated = super().translate_path(path)
        if not os.path.exists(translated):
            return os.path.join(DIRECTORY, 'careergoals-fox-university.html')
        return translated

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("", PORT), CareerGoalsHandler) as httpd:
            print(f"CareerGoals European Editorial server active at: http://localhost:{PORT}/")
            sys.stdout.flush()
            httpd.serve_forever()
    except Exception as e:
        print(f"Server error: {e}", file=sys.stderr)
        sys.exit(1)
