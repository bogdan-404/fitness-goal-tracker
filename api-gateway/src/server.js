const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { createClient } = require('redis');
const CircuitBreaker = require('opossum');

// Redis client
const redisClient = createClient(); 

// Connect to Redis
redisClient.connect().catch(console.error); 

// Paths to your proto files
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

// Express app
const app = express();
app.use(express.json());


app.get('/status', (req, res) => {
    res.json({ status: 'API Gateway Running' });
});

function startWorkoutSessionGrpcCall(request) {
    return new Promise((resolve, reject) => {
        activityClient.StartWorkoutSession(request, (err, response) => {
            if (err) {
                return reject(err);
            }
            resolve(response);
        });
    });
}

// Circuit breaker options
const options = {
    timeout: 5000, // 5 seconds
    errorThresholdPercentage: 50, // When 50% of requests fail
    resetTimeout: 17500 // 17.5 seconds
};

// Create the circuit breaker
const breaker = new CircuitBreaker(startWorkoutSessionGrpcCall, options);

// Handle circuit breaker events
breaker.on('open', () => console.log('Circuit breaker opened'));
breaker.on('halfOpen', () => console.log('Circuit breaker half-open'));
breaker.on('close', () => console.log('Circuit breaker closed'));

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
app.get('/users/:id/goal', (req, res) => {
    const user_id = req.params.id;
    userClient.GetUserGoal({ user_id }, (err, response) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(response);
    });
});

// Start Workout Session with Circuit Breaker
app.post('/workouts/start', (req, res) => {
    const { user_id } = req.body;
    breaker.fire({ user_id })
        .then(response => res.json(response))
        .catch(err => {
            if (breaker.opened) {
                res.status(503).json({ error: 'Service unavailable due to circuit breaker' });
            } else {
                res.status(500).json({ error: err.message });
            }
        });
});

// Start Group Workout Session
app.post('/workouts/group/start', (req, res) => {
    const { user_id } = req.body;
    activityClient.StartGroupWorkoutSession({ user_id }, (err, response) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(response);
    });
});

// End Workout Session
app.post('/workouts/end', (req, res) => {
    const { session_id } = req.body;
    activityClient.EndWorkoutSession({ session_id }, (err, response) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(response);
    });
});

// Start the HTTP server
const HTTP_PORT = 8080;
app.listen(HTTP_PORT, () => {
    console.log(`API Gateway HTTP server running on port ${HTTP_PORT}`);
});

// Start the WebSocket server on a different port
const WS_PORT = 8081;
const wsServer = new WebSocket.Server({ port: WS_PORT }, () => {
    console.log(`WebSocket server running on port ${WS_PORT}`);
});

// WebSocket connection for group sessions
wsServer.on('connection', (ws) => {
    console.log('User connected via WebSocket');

    // Store user session data
    let session_id = null;
    let user_id = null;

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'join_session') {
                session_id = data.session_id;
                user_id = data.user_id;

                // Store the connection in the session room
                ws.session_id = session_id;
                ws.user_id = user_id;

                console.log(`User ${user_id} joined session ${session_id}`);

                // Initialize session in Redis if not exists
                try {
                    // Use the new hGetAll method, which returns a Promise
                    const sessionData = await redisClient.hGetAll(`session:${session_id}`);

                    if (Object.keys(sessionData).length === 0) {
                        // Initialize session data
                        const sessionInfo = {
                            participants: JSON.stringify([user_id])
                        };
                        await redisClient.hSet(`session:${session_id}`, sessionInfo);
                    } else {
                        // Add user to participants
                        let participants = JSON.parse(sessionData.participants);
                        if (!participants.includes(user_id)) {
                            participants.push(user_id);
                            await redisClient.hSet(`session:${session_id}`, 'participants', JSON.stringify(participants));
                        }
                    }
                } catch (err) {
                    console.error('Redis error:', err);
                }

                // Notify others in the session
                wsServer.clients.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN && client.session_id === session_id) {
                        client.send(JSON.stringify({
                            type: 'user_joined',
                            user_id: user_id
                        }));
                    }
                });
            } else if (data.type === 'chat_message') {
                // Broadcast the message to all participants in the session
                wsServer.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN && client.session_id === session_id) {
                        client.send(JSON.stringify({
                            type: 'chat_message',
                            user_id: user_id,
                            message: data.message
                        }));
                    }
                });
            }
        } catch (err) {
            console.error('Error processing message:', err);
        }
    });

    ws.on('close', () => {
        console.log(`User ${user_id} disconnected`);
    });
});
