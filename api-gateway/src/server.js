const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Path to your proto files
const activityProtoPath = path.join(__dirname, '../proto/activity_service.proto');
const userProtoPath = path.join(__dirname, '../proto/user_service.proto');

// Load the proto files using protoLoader
const activityPackageDefinition = protoLoader.loadSync(activityProtoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const userPackageDefinition = protoLoader.loadSync(userProtoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

// Load gRPC service definitions
const activityProto = grpc.loadPackageDefinition(activityPackageDefinition).activity_service;
const userProto = grpc.loadPackageDefinition(userPackageDefinition).user_service;

// Create gRPC clients
const activityClient = new activityProto.ActivityService('localhost:50052', grpc.credentials.createInsecure());
const userClient = new userProto.UserService('localhost:50051', grpc.credentials.createInsecure());

// Create an Express app for handling HTTP requests
const app = express();
app.use(express.json());

// WebSocket Setup
const server = http.createServer(app);
const io = socketIo(server);

// Simple status endpoint for API Gateway
app.get('/status', (req, res) => {
    res.json({ status: 'API Gateway Running' });
});

// Forward register user request to the User Service via gRPC
app.post('/users/register', (req, res) => {
    const { username, email, password, goal } = req.body;
    userClient.RegisterUser({ username, email, password, goal }, (err, response) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(response);
    });
});

// Forward get user goal request to the User Service via gRPC
app.get('/users/:id/goal', (req, res) => {
    const user_id = req.params.id;
    userClient.GetUserGoal({ user_id }, (err, response) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(response);
    });
});

// Forward start workout session request to the Activity Service via gRPC
app.post('/workouts/start', (req, res) => {
    const { user_id } = req.body;
    activityClient.StartWorkoutSession({ user_id }, (err, response) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(response);
    });
});

// Forward end workout session request to the Activity Service via gRPC
app.post('/workouts/end', (req, res) => {
    const { session_id } = req.body;
    activityClient.EndWorkoutSession({ session_id }, (err, response) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(response);
    });
});

// WebSocket connection for group sessions
let workoutSessions = {};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // User joins a workout session
    socket.on('join_session', (data) => {
        const { session_id, user_id } = data;
        socket.join(session_id);
        console.log(`User ${user_id} joined session ${session_id}`);
        if (!workoutSessions[session_id]) {
            workoutSessions[session_id] = { votes: {}, participants: [] };
        }
        workoutSessions[session_id].participants.push(user_id);
        io.to(session_id).emit('user_joined', { user_id });
    });

    // Handle voting for next exercise
    socket.on('vote_exercise', (data) => {
        const { session_id, user_id, exercise, duration } = data;
        if (!workoutSessions[session_id].votes[user_id]) {
            workoutSessions[session_id].votes[user_id] = { exercise, duration };
        }
        io.to(session_id).emit('vote_update', workoutSessions[session_id].votes);
    });

    // Notify all users of the chosen exercise
    socket.on('exercise_chosen', (data) => {
        const { session_id, exercise, duration } = data;
        io.to(session_id).emit('exercise_start', { exercise, duration });
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

// Start the API Gateway (HTTP and WebSocket)
server.listen(8080, () => {
    console.log('API Gateway running on port 8080');
});
