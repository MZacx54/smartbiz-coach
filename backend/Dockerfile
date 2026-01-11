# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set the working directory in the container
WORKDIR /app

# Install dependencies (ensure requirements.txt is in the same directory as Dockerfile in the build context)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Ensure start.sh is executable and has correct line endings (for Windows uploads)
RUN chmod +x start.sh && sed -i 's/\r$//' start.sh

# Expose the port the app runs on
EXPOSE 8000

# Run the application using the startup script
CMD ["bash", "start.sh"]
