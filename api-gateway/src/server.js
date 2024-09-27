const express = require('express');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const redis = require('redis');
const path = require('path');

// Load Protobuf definitions
const PROTO_PATH = path.join(__dirname, '../proto/user_service.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const userProto = grpc.loadPackageDefinition(packageDefinition).UserService;

const app = express();
app.use(express.json());

// gRPC client for User Service
const userClient = new userProto('localhost:50051', grpc.credentials.createInsecure());

// Example API route to register user
app.post('/users/register', (req, res) => {
  const { username, email, password } = req.body;

  userClient.RegisterUser({ username, email, password }, (err, response) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.json(response);
    }
  });
});

app.listen(8080, () => {
  console.log('API Gateway running on port 8080');
});
