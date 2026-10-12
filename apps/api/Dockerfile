# EnerMod Africa API (FastAPI). Build context: repository root.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 ENERMOD_ENV=production \
    DATA_DIR=/app/data SEED_SQLITE=/app/data/enermod.db

WORKDIR /app
COPY apps/api/pyproject.toml apps/api/README.md ./apps/api/
COPY apps/api/enermod_api ./apps/api/enermod_api
RUN pip install --upgrade pip && pip install "./apps/api[ai]"

# Seed data: the SQLite build of the master workbook, loaded the first time the database is empty.
# The package is installed in site-packages, so the path is given explicitly (SEED_SQLITE above).
COPY data/enermod.db ./data/enermod.db

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["sh", "-c", "uvicorn enermod_api.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
