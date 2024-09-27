const express = require('express');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Load gRPC Proto files
const userProtoPath = path.join(__dirname, './proto/user_service.proto');
const activityProtoPath = path.join(__dirname, './proto/activity_service.proto');
const userProto = grpc.loadPackageDefinition(protoLoader.loadSync(userProtoPath)).UserService;
const activityProto = grpc.loadPackageDefinition(protoLoader.loadSync(activityProtoPath)).ActivityService;

// gRPC Clients
const userClient = new userProto('localhost:50051', grpc.credentials.createInsecure());
const activityClient = new activityProto('localhost:50052', grpc.credentials.createInsecure());

// Express setup
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json()); // Middleware to parse JSON

// WebSocket for group workout sessions
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_session', (data) => {
    const { session_id, user_id } = data;
    socket.join(session_id);
    io.to(session_id).emit('session_joined', { message: `User ${user_id} joined session ${session_id}` });
  });

  socket.on('leave_session', (data) => {
    const { session_id, user_id } = data;
    socket.leave(session_id);
    io.to(session_id).emit('session_left', { message: `User ${user_id} left session ${session_id}` });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// API Gateway HTTP Endpoints

// Register User
app.post('/users/register', (req, res) => {
  const { username, email, password, goal } = req.body;
  userClient.RegisterUser({ username, email, password, goal }, (err, response) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(response);
  });
});

// Get User Goal
app.get('/users/:userId/goal', (req, res) => {
  userClient.GetUserGoal({ user_id: req.params.userId }, (err, response) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(response);
  });
});

// Start Workout Session
app.post('/workouts/start', (req, res) => {
  activityClient.StartWorkoutSession({ user_id: req.body.user_id }, (err, response) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(response);
  });
});

// End Workout Session
app.post('/workouts/end', (req, res) => {
  activityClient.EndWorkoutSession({ session_id: req.body.session_id }, (err, response) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(response);
  });
});

// Vote for Workout
app.post('/workouts/vote', (req, res) => {
  const { session_id, user_id, workout_type, duration } = req.body;
  activityClient.VoteWorkout({ session_id, user_id, workout_type, duration }, (err, response) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(response);
  });
});

// Count Votes
app.get('/workouts/:session_id/votes', (req, res) => {
  activityClient.CountVotes({ session_id: req.params.session_id }, (err, response) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(response);
  });
});

// Start the server
server.listen(8080, () => {
  console.log('API Gateway running on port 8080');
});
