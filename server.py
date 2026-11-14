#!/usr/bin/env python3
"""
VoxCAD — Local Development Web Server
Serves ES modules with proper MIME types and CORS headers.
"""

import http.server
import socketserver
import os
import sys

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class VoxCADHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Enable CORS and disable caching during development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def guess_type(self, path):
        # Ensure ES modules are served with valid JavaScript MIME type
        if path.endswith('.js') or path.endswith('.mjs'):
            return 'application/javascript'
        return super().guess_type(path)

def run():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), VoxCADHandler) as httpd:
        print(f"============================================================")
        print(f"  VoxCAD — Voice-Controlled 3D & CAD Modeler")
        print(f"  Local Server Running: http://localhost:{PORT}")
        print(f"============================================================")
        print(f"Press Ctrl+C to stop the server.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down VoxCAD server.")
            sys.exit(0)

if __name__ == '__main__':
    run()
