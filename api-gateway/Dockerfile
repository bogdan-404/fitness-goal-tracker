# Base image
FROM node:18

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

# Start the application
CMD ["node", "src/server.js"]
