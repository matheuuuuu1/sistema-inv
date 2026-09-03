# sistema-yoender - Panaderia PWA (servidor Python + app estática)
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Servidor sin dependencias externas (biblioteca estándar)
COPY server/ server/
COPY app/ app/

# database.json se persiste en volumen
VOLUME /app/server

EXPOSE 8000

CMD ["python", "server/server.py"]
