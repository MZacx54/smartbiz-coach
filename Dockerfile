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

# Copy frontend build from stage 1 to the location Django expects
# settings.py looks for STATICFILES_DIRS = [BASE_DIR / '../dist']
# So if we put backend in /app, BASE_DIR is /app.
# We need dist to be at /dist (one level above /app)
COPY --from=frontend-builder /app-frontend/dist /dist

# Ensure start.sh is executable
RUN chmod +x start.sh && sed -i 's/\r$//' start.sh

# Expose port
EXPOSE 8000

# Set environment variables for production
ENV DEBUG=False
ENV PYTHONUNBUFFERED=1

CMD ["bash", "start.sh"]
