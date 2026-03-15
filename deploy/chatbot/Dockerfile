# SafePsy Chatbot — CPU/mock image for PRO2-XXS (no GPU)
# For GPU use apps/ai-chatbot/Dockerfile. Tag: safepsy-chatbot:2.0.0
ARG CHATBOT_VERSION=2.0.0
FROM python:3.10-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 aiuser && mkdir -p /app && chown -R aiuser:aiuser /app
WORKDIR /app

COPY apps/ai-chatbot/requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/ai-chatbot/main.py /app/
COPY apps/ai-chatbot/entrypoint.sh /app/
RUN chmod +x /app/entrypoint.sh

USER aiuser
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/healthz || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["python3", "main.py"]
