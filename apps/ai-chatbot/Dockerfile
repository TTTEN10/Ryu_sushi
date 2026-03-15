# GPU-enabled Dockerfile for AI Chatbot Service
# Base image with CUDA runtime
FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.10 \
    python3.10-dev \
    python3-pip \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 aiuser && \
    mkdir -p /app /models && \
    chown -R aiuser:aiuser /app /models

# Set working directory
WORKDIR /app

# Build arguments for version tracking
ARG GIT_SHA=unknown
ARG IMAGE_TAG=unknown

# Set as environment variables
ENV GIT_SHA=${GIT_SHA}
ENV IMAGE_TAG=${IMAGE_TAG}

# Copy requirements first for better caching
COPY requirements.txt /app/

# Install Python dependencies
# Note: vLLM requires CUDA and will be installed here for production builds
RUN pip3 install --no-cache-dir --upgrade pip && \
    pip3 install --no-cache-dir -r requirements.txt && \
    pip3 install --no-cache-dir vllm || echo "vLLM installation may have failed (expected if building on non-CUDA host)"

# Copy application code
COPY main.py /app/
COPY entrypoint.sh /app/

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh

# Switch to non-root user
USER aiuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/healthz || exit 1

# Entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["python3", "main.py"]

