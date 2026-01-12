# --- Stage 1: Frontend Build ---
FROM node:20-slim AS frontend-builder
WORKDIR /app-frontend
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- Stage 2: Backend & Final Image ---
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    binutils \
    libproj-dev \
    gdal-bin \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Copy frontend build from stage 1 to /dist
COPY --from=frontend-builder /app-frontend/dist /dist

# Run collectstatic during build to avoid runtime delays
# We use a dummy SECRET_KEY and DATABASE_URL for the build step
RUN DJANGO_SECRET_KEY=build-time-only-key \
    DJANGO_DEBUG=False \
    python manage.py collectstatic --noinput

# Ensure start.sh is executable
RUN chmod +x start.sh && sed -i 's/\r$//' start.sh

# Expose port
EXPOSE 8000

# Set environment variables for production
ENV DEBUG=False
ENV PYTHONUNBUFFERED=1

CMD ["bash", "start.sh"]
