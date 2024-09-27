const express = require('express');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const redis = require('redis');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Redis client for caching
const redisClient = redis.createClient();

// Load Protobuf definitions for User and Activity services
const userProtoPath = path.join(__dirname, '../proto/user_service.proto');
const activityProtoPath = path.join(__dirname, '../proto/activity_service.proto');

const userPackageDefinition = protoLoader.loadSync(userProtoPath, { keepCase: true });
const activityPackageDefinition = protoLoader.loadSync(activityProtoPath, { keepCase: true });

const userProto = grpc.loadPackageDefinition(userPackageDefinition).UserService;
const activityProto = grpc.loadPackageDefinition(activityPackageDefinition).ActivityService;

// Create gRPC clients for User and Activity services
const userClient = new userProto('localhost:50051', grpc.credentials.createInsecure());
const activityClient = new activityProto('localhost:50052', grpc.credentials.createInsecure());

// Express and WebSocket setup
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Setup routes
require('./routes/gateway')(app, userClient, activityClient, redisClient);
require('./routes/websockets')(io, redisClient);

// Status route to check if API Gateway is running
app.get('/status', (req, res) => {
  res.status(200).json({ status: 'API Gateway is running' });
});

// Start the HTTP server (API Gateway) on port 8080
server.listen(8080, () => {
  console.log('API Gateway running on port 8080');
});
