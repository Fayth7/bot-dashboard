# Start from official Python 3.11 slim image
# 'slim' means minimal OS — smaller and more secure than full image
FROM python:3.11-slim

# Set working directory inside the container
WORKDIR /app

# Copy requirements first (Docker caches this layer)
# If requirements don't change, Docker skips reinstalling packages
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Tell Docker this container listens on port 8001
EXPOSE 8001

# Command to run when container starts
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
