FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Prevent Python from writing pyc files to disc and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Create required runtime directories
RUN mkdir -p bin/model bin/data

# Hugging Face Spaces exposes port 7860 by default
EXPOSE 7860

# Run database migrations and start Django server on port 7860
CMD ["sh", "-c", "python manage.py migrate && python manage.py runserver 0.0.0.0:7860"]
