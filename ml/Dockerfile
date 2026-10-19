FROM python:3.12-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*
COPY requirements.txt requirements-docker.txt ./
RUN pip install --no-cache-dir -r requirements-docker.txt
COPY configs ./configs
COPY src ./src
RUN mkdir -p data/uploads saved_models/ml
EXPOSE 8000
# Progress and cancellation state is process-local: keep one worker.
CMD ["sh", "-c", "python -m src.database.init_db && exec uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --workers 1"]
