#!/usr/bin/env python3
"""Levanta el servidor y te dice la IP para otros dispositivos de la red.
Uso:  python run.py
"""
import socket
from http.server import ThreadingHTTPServer
from server import Handler


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    finally:
        s.close()


ip = lan_ip()
print(f"Panel:    http://{ip}:8000")
print(f"  > esa IP la pones en la tablet u otro dispositivo de la MISMA red")
print(f"Local:    http://localhost:8000")
print("Ctrl+C para detener.")
print("=" * 52)
ThreadingHTTPServer(("0.0.0.0", 8000), Handler).serve_forever()
