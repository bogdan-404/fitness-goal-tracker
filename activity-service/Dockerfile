# Base image
FROM python:3.9-slim

# Set the working directory
WORKDIR /app

# Copy requirements and install them
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code
COPY src/ ./src/

# Expose the ports
EXPOSE 5001 50052

# Set the environment variables
ENV PYTHONUNBUFFERED=1

# Start the application
CMD ["python", "src/app.py"]
