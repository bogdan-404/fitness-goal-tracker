const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { createClient } = require('redis');
const CircuitBreaker = require('opossum');
const fs = require('fs');
const winston = require('winston');

// Environment variables
const redisHost = process.env.REDIS_HOST || 'localhost';
const userServiceHost = process.env.USER_SERVICE_HOST || 'nginx-user';
const activityServiceHost = process.env.ACTIVITY_SERVICE_HOST || 'nginx-activity';

// Redis client setup
const redisClient = createClient({ url: `redis://${redisHost}:6379` });
redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.connect().catch(console.error);

// Load proto files
const activityProtoPath = path.join(__dirname, '../proto/activity_service.proto');
const userProtoPath = path.join(__dirname, '../proto/user_service.proto');
const activityPackageDefinition = protoLoader.loadSync(activityProtoPath, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
const userPackageDefinition = protoLoader.loadSync(userProtoPath, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
const activityProto = grpc.loadPackageDefinition(activityPackageDefinition).activity_service;
const userProto = grpc.loadPackageDefinition(userPackageDefinition).user_service;

// Logger setup
const logsDir = path.join('/app', 'logs');
if (!fs.existsSync(logsDir)) { fs.mkdirSync(logsDir); }
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'api-gateway' },
    transports: [ new winston.transports.File({ filename: '/app/logs/api-gateway.log' }) ],
});

// Express app setup
const app = express();
app.use(express.json());

// Health check endpoint
app.get('/status', (req, res) => res.json({ status: 'API Gateway Running' }));

// Create gRPC clients
function createUserClient() {
    return new userProto.UserService(`${userServiceHost}:50051`, grpc.credentials.createInsecure());
}

function createActivityClient() {
    return new activityProto.ActivityService(`${activityServiceHost}:50052`, grpc.credentials.createInsecure());
}

// Circuit breaker for Activity Service
function startWorkoutSessionGrpcCall(request) {
    return new Promise((resolve, reject) => {
        const client = createActivityClient();
        client.StartWorkoutSession(request, (err, response) => {
            if (err) {
                logger.error('Error calling StartWorkoutSession:', err.message);
                reject(err);
            } else {
                resolve(response);
            }
        });
    });
}

const circuitBreakerOptions = {
    timeout: 5000,
    errorThresholdPercentage: 50,
    resetTimeout: 10000,
};

const breaker = new CircuitBreaker(startWorkoutSessionGrpcCall, circuitBreakerOptions);
breaker.on('open', () => logger.warn('Circuit breaker opened'));
breaker.on('halfOpen', () => logger.info('Circuit breaker half-open'));
breaker.on('close', () => logger.info('Circuit breaker closed'));

// API routes
app.post('/users/register', (req, res) => {
    const { username, email, password, goal } = req.body;
    const client = createUserClient();
    client.RegisterUser({ username, email, password, goal }, (err, response) => {
        if (err) {
            logger.error('Error calling RegisterUser:', err.message);
            res.status(500).json({ error: err.message });
        } else {
            res.json(response);
        }
    });
});

app.get('/users/:id/goal', (req, res) => {
    const user_id = req.params.id;
    const client = createUserClient();
    client.GetUserGoal({ user_id }, (err, response) => {
        if (err) {
            logger.error('Error calling GetUserGoal:', err.message);
            res.status(500).json({ error: err.message });
        } else {
            res.json(response);
        }
    });
});

app.post('/workouts/start', (req, res) => {
    const { user_id } = req.body;
    breaker.fire({ user_id })
        .then((response) => res.json(response))
        .catch((err) => {
            if (breaker.opened) {
                res.status(503).json({ error: 'Service unavailable due to circuit breaker' });
            } else {
                res.status(500).json({ error: err.message });
            }
        });
});

app.post('/workouts/group/start', (req, res) => {
    const { user_id } = req.body;
    const client = createActivityClient();
    client.StartGroupWorkoutSession({ user_id }, (err, response) => {
        if (err) {
            logger.error('Error calling StartGroupWorkoutSession:', err.message);
            res.status(500).json({ error: err.message });
        } else {
            res.json(response);
        }
    });
});

app.post('/workouts/end', (req, res) => {
    const { session_id } = req.body;
    const client = createActivityClient();
    client.EndWorkoutSession({ session_id }, (err, response) => {
        if (err) {
            logger.error('Error calling EndWorkoutSession:', err.message);
            res.status(500).json({ error: err.message });
        } else {
            res.json(response);
        }
    });
});

// Start HTTP server
const HTTP_PORT = 8080;
app.listen(HTTP_PORT, () => {
    logger.info(`API Gateway HTTP server running on port ${HTTP_PORT}`);
});

// WebSocket server setup
const WS_PORT = 8081;
const wsServer = new WebSocket.Server({ port: WS_PORT }, () => {
    logger.info(`WebSocket server running on port ${WS_PORT}`);
});

wsServer.on('connection', (ws) => {
    logger.info('User connected via WebSocket');
    let session_id = null;
    let user_id = null;

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'join_session') {
                session_id = data.session_id;
                user_id = data.user_id;
                ws.session_id = session_id;
                ws.user_id = user_id;
                logger.info(`User ${user_id} joined session ${session_id}`);

                try {
                    const sessionData = await redisClient.hGetAll(`session:${session_id}`);
                    if (Object.keys(sessionData).length === 0) {
                        const sessionInfo = { participants: JSON.stringify([user_id]) };
                        await redisClient.hSet(`session:${session_id}`, sessionInfo);
                    } else {
                        let participants = JSON.parse(sessionData.participants);
                        if (!participants.includes(user_id)) {
                            participants.push(user_id);
                            await redisClient.hSet(`session:${session_id}`, 'participants', JSON.stringify(participants));
                        }
                    }
                } catch (err) {
                    logger.error('Redis error:', err);
                }

                wsServer.clients.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN && client.session_id === session_id) {
                        client.send(JSON.stringify({ type: 'user_joined', user_id: user_id }));
                    }
                });
            } else if (data.type === 'chat_message') {
                wsServer.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN && client.session_id === session_id) {
                        client.send(JSON.stringify({ type: 'chat_message', user_id: user_id, message: data.message }));
                    }
                });
            }
        } catch (err) {
            logger.error('Error processing message:', err);
        }
    });

    ws.on('close', () => {
        logger.info(`User ${user_id} disconnected`);
    });
});
