# Base image
FROM python:3.9-slim

# Install Filebeat
RUN apt-get update && apt-get install -y curl
RUN curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-7.17.6-amd64.deb
RUN dpkg -i filebeat-7.17.6-amd64.deb

# Copy Filebeat configuration
COPY filebeat.yml /etc/filebeat/filebeat.yml

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
EXPOSE 5001 50052

# Set the environment variables
ENV PYTHONUNBUFFERED=1

# Start the application and Filebeat
CMD ["sh", "-c", "filebeat -e & python src/app.py"]
