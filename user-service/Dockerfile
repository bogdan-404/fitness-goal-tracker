# Dockerfile

# Base image
FROM python:3.9-slim

# Set the working directory
WORKDIR /app

# Upgrade pip (optional)
RUN pip install --upgrade pip

# Copy requirements and install them
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code and generated gRPC code
COPY src/ ./src/
COPY proto/ ./proto/

# Expose the ports
EXPOSE 5000 50051

# Set the environment variables
ENV PYTHONUNBUFFERED=1

# Start the application
CMD ["python", "src/app.py"]
