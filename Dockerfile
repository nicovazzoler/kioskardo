# Una sola imagen con todo: el backend sirve la API y también el frontend ya compilado.

# Paso 1: compilar el frontend. De esta imagen solo se lleva la carpeta dist/.
FROM node:22-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Paso 2: la imagen que corre en el servidor. Python, el backend y el frontend compilado.
FROM python:3.12-slim
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
COPY --from=frontend /app/frontend/dist /app/frontend/dist
ENV FRONTEND_DIST=/app/frontend/dist

# En cada arranque: migraciones pendientes, el kiosko inicial si no existe, y el servidor.
# Railway avisa en qué puerto escuchar con la variable PORT.
CMD ["sh", "-c", "alembic upgrade head && python -m app.semilla && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
