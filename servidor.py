# =============================================================
# SERVIDOR.PY · Servidor para probar la app en tu PC
# -------------------------------------------------------------
# Uso:  python servidor.py      y abre  http://localhost:8080
# Es como el servidor normal de Python, pero le dice al navegador
# que no guarde copias viejas: así ves al momento tus cambios.
# (En Netlify no se usa: allí la app se sirve sola.)
# =============================================================
import http.server

PUERTO = 8080


class SinCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


http.server.SimpleHTTPRequestHandler.extensions_map[".json"] = "application/json"
# "Threading" = atiende varias peticiones a la vez (el navegador pide muchos archivos juntos)
with http.server.ThreadingHTTPServer(("127.0.0.1", PUERTO), SinCache) as servidor:
    print(f"App del C.D. El Tranvía en http://localhost:{PUERTO}  (Ctrl+C para parar)")
    servidor.serve_forever()
