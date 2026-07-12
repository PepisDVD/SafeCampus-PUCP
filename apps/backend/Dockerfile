# 📁 apps/backend/Dockerfile
# 🎯 Imagen Docker del backend para despliegue en producción.
# 📦 Capa: Infraestructura / Docker

FROM python:3.12-slim

WORKDIR /app

# Instalar dependencias del sistema para asyncpg y PostGIS
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
RUN pip install --no-cache-dir .

COPY . .

EXPOSE 8000
# --proxy-headers: el TLS lo termina el proxy del PaaS (Railway), que reenvia
# x-forwarded-proto. Sin esto uvicorn asume http y genera los `Location` de los
# redirects (p. ej. el 307 de trailing slash) apuntando a http://, forzando un
# 301 extra del edge que rompe el paso de cookies a traves del proxy del front.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
