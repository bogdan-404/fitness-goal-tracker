# Base image
FROM node:18

# Install Filebeat
RUN apt-get update && apt-get install -y curl
RUN curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-7.17.6-amd64.deb
RUN dpkg -i filebeat-7.17.6-amd64.deb

# Copy Filebeat configuration
COPY filebeat.yml /etc/filebeat/filebeat.yml

# Create app directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy the application code
COPY src/ ./src/

# Copy the proto files
COPY proto/ ./proto/

# Expose the ports
EXPOSE 8080 8081

# Start the application and Filebeat
CMD ["sh", "-c", "filebeat -e & node src/server.js"]
