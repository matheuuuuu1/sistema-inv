#!/usr/bin/env python3
"""Servidor de la panaderia: sirve la app (carpeta app/) y guarda los datos
compartidos en database.json junto a este script.
Uso:  python server.py  -> corre en http://0.0.0.0:8000
"""
import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

SERVER_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(SERVER_DIR, "..", "app"))
DB = os.path.join(SERVER_DIR, "database.json")

DEFAULT_DB = {
    "orders": [],
    "customers": {},
    "categories": None,   # None = usar el catalogo por defecto de data.js
    "rate": None,
    "rateDate": None,
    "rateMode": "bcv",
    "customRate": None,
}


def load_db():
    if os.path.exists(DB):
        try:
            with open(DB, "r", encoding="utf-8") as f:
                data = json.load(f)
            return {**DEFAULT_DB, **data}
        except Exception:
            pass
    return dict(DEFAULT_DB)


def save_db(db):
    with open(DB, "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=2)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def _json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/api/db"):
            self._json(load_db())
            return
        if self.path.startswith("/api/export.sql"):
            self._serve_sql()
            return
        return super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/db"):
            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length)
            try:
                incoming = json.loads(raw.decode("utf-8"))
            except Exception:
                self._json({"error": "JSON invalido"}, 400)
                return
            db = load_db()
            keys = ["orders", "customers", "categories", "rate", "rateDate", "rateMode", "customRate"]
            for k in keys:
                if k in incoming:
                    db[k] = incoming[k]
            save_db(db)
            self._json({"ok": True})
            return
        self._json({"error": "Not found"}, 404)

    def _serve_sql(self):
        db = load_db()
        sql = build_sql(db)
        body = sql.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/sql; charset=utf-8")
        self.send_header("Content-Disposition", 'attachment; filename="panaderia_export.sql"')
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def esc(s):
    if s is None:
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"


def build_sql(db):
    lines = []
    lines.append("BEGIN TRANSACTION;")
    lines.append("CREATE TABLE IF NOT EXISTS orders (")
    lines.append("  id TEXT PRIMARY KEY, items TEXT, total_usd REAL, total_bs REAL,")
    lines.append("  client TEXT, phone TEXT, method TEXT, reference TEXT,")
    lines.append("  paid INTEGER, date TEXT);")
    lines.append("CREATE TABLE IF NOT EXISTS customers (")
    lines.append("  name TEXT PRIMARY KEY, display_name TEXT, total_orders INTEGER, phone TEXT);")

    for o in db["orders"] or []:
        lines.append("INSERT OR REPLACE INTO orders VALUES ({}, {}, {}, {}, {}, {}, {}, {}, {}, {});".format(
            esc(o.get("id")),
            esc(json.dumps(o.get("items", []), ensure_ascii=False)),
            o.get("totalUsd") if o.get("totalUsd") is not None else "NULL",
            o.get("totalBs") if o.get("totalBs") is not None else "NULL",
            esc(o.get("client")),
            esc(o.get("phone")),
            esc(o.get("method")),
            esc(o.get("reference")),
            1 if o.get("paid") else 0,
            esc(o.get("date")),
        ))

    for k, v in (db["customers"] or {}).items():
        lines.append("INSERT OR REPLACE INTO customers VALUES ({}, {}, {}, {});".format(
            esc(k), esc(v.get("displayName")), v.get("totalOrders", 0), esc(v.get("phone")),
        ))

    lines.append("COMMIT;")
    return "\n".join(lines)


if __name__ == "__main__":
    print("Panaderia server en http://0.0.0.0:8000 (datos en database.json)")
    server = ThreadingHTTPServer(("0.0.0.0", 8000), Handler)
    server.serve_forever()
