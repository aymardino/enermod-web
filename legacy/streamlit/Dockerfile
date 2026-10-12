# The original Streamlit edition of the observatory, served from the shared seed database.
# Build context: repository root.   docker build -f legacy/streamlit/Dockerfile -t enermod-streamlit .
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 STREAMLIT_SERVER_HEADLESS=true STREAMLIT_BROWSER_GATHER_USAGE_STATS=false
WORKDIR /app/legacy/streamlit
COPY legacy/streamlit/requirements.txt .
RUN pip install -r requirements.txt
COPY legacy/streamlit ./
COPY data/enermod.db /app/data/enermod.db
EXPOSE 8501
CMD streamlit run Home.py --server.port=${PORT:-8501} --server.address=0.0.0.0
