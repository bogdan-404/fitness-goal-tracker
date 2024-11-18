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

// Read environment variables for hostnames
const redisHost = process.env.REDIS_HOST || 'localhost';

// Redis client
const redisClient = createClient({
    url: `redis://${redisHost}:6379`,
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

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
    oneofs: true,
});
const userPackageDefinition = protoLoader.loadSync(userProtoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

// Load gRPC service definitions
const activityProto = grpc.loadPackageDefinition(activityPackageDefinition).activity_service;
const userProto = grpc.loadPackageDefinition(userPackageDefinition).user_service;

// List of User Service instances
const userServiceInstances = [
    { host: 'user-service-1', port: 50051 },
    { host: 'user-service-2', port: 50051 },
    { host: 'user-service-3', port: 50051 },
];

// List of Activity Service instances
const activityServiceInstances = [
    { host: 'activity-service-1', port: 50052 },
    { host: 'activity-service-2', port: 50052 },
    { host: 'activity-service-3', port: 50052 },
];

// Keep track of failed instances
let failedUserInstances = {};
let failedActivityInstances = {};

// Function to get next available instance
function getNextAvailableInstance(instances, failedInstances) {
    return instances.find(instance => !failedInstances[instance.host]);
}

// Function to create gRPC client dynamically
function createActivityClient(instance) {
    return new activityProto.ActivityService(
        `${instance.host}:${instance.port}`,
        grpc.credentials.createInsecure()
    );
}

function createUserClient(instance) {
    return new userProto.UserService(
        `${instance.host}:${instance.port}`,
        grpc.credentials.createInsecure()
    );
}

// Create logs directory
const logsDir = path.join('/app', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'api-gateway' },
    transports: [
        new winston.transports.File({ filename: '/app/logs/api-gateway.log' }),
    ],
});

// Express app
const app = express();
app.use(express.json());

// Simple status endpoint for API Gateway
app.get('/status', (req, res) => {
    res.json({ status: 'API Gateway Running' });
});

// Function to wrap gRPC call for Circuit Breaker with reroute logic
function startWorkoutSessionGrpcCall(request) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        let maxAttempts = 3;
        let instancesTried = 0;
        const maxInstancesToTry = 3;

        const tryInstance = (instance) => {
            const client = createActivityClient(instance);
            client.StartWorkoutSession(request, (err, response) => {
                if (err) {
                    attempts++;
                    if (attempts < maxAttempts) {
                        logger.info(`Retrying instance ${instance.host}, attempt ${attempts}`);
                        tryInstance(instance);
                    } else {
                        failedActivityInstances[instance.host] = true;
                        logger.error(`Instance ${instance.host} marked as failed`);
                        instancesTried++;
                        if (instancesTried < maxInstancesToTry) {
                            const nextInstance = getNextAvailableInstance(activityServiceInstances, failedActivityInstances);
                            if (nextInstance) {
                                attempts = 0;
                                tryInstance(nextInstance);
                            } else {
                                reject(new Error('All instances failed'));
                            }
                        } else {
                            reject(new Error('All instances failed'));
                        }
                    }
                } else {
                    failedActivityInstances = {};
                    resolve(response);
                }
            });
        };

        const initialInstance = getNextAvailableInstance(activityServiceInstances, failedActivityInstances);
        if (initialInstance) {
            tryInstance(initialInstance);
        } else {
            reject(new Error('No available instances'));
        }
    });
}

// Circuit breaker options
const options = {
    timeout: 5000, // Time before a request is considered failed
    errorThresholdPercentage: 50, // Percentage of failed requests before opening the circuit
    resetTimeout: 10000, // Time before attempting to close the circuit
};

// Create the circuit breaker
const breaker = new CircuitBreaker(startWorkoutSessionGrpcCall, options);

// Handle circuit breaker events
breaker.on('open', () => logger.warn('Circuit breaker opened'));
breaker.on('halfOpen', () => logger.info('Circuit breaker half-open'));
breaker.on('close', () => logger.info('Circuit breaker closed'));

// Register User with reroute logic
app.post('/users/register', (req, res) => {
    const { username, email, password, goal } = req.body;

    let attempts = 0;
    let maxAttempts = 3;
    let instancesTried = 0;
    const maxInstancesToTry = 3;

    const tryInstance = (instance) => {
        const client = createUserClient(instance);
        client.RegisterUser({ username, email, password, goal }, (err, response) => {
            if (err) {
                attempts++;
                if (attempts < maxAttempts) {
                    logger.info(`Retrying instance ${instance.host}, attempt ${attempts}`);
                    tryInstance(instance);
                } else {
                    failedUserInstances[instance.host] = true;
                    logger.error(`Instance ${instance.host} marked as failed`);
                    instancesTried++;
                    if (instancesTried < maxInstancesToTry) {
                        const nextInstance = getNextAvailableInstance(userServiceInstances, failedUserInstances);
                        if (nextInstance) {
                            attempts = 0;
                            tryInstance(nextInstance);
                        } else {
                            res.status(500).json({ error: 'All instances failed' });
                        }
                    } else {
                        res.status(500).json({ error: 'All instances failed' });
                    }
                }
            } else {
                failedUserInstances = {};
                res.json(response);
            }
        });
    };

    const initialInstance = getNextAvailableInstance(userServiceInstances, failedUserInstances);
    if (initialInstance) {
        tryInstance(initialInstance);
    } else {
        res.status(500).json({ error: 'No available instances' });
    }
});

// Get User Goal with reroute logic
app.get('/users/:id/goal', (req, res) => {
    const user_id = req.params.id;

    let attempts = 0;
    let maxAttempts = 3;
    let instancesTried = 0;
    const maxInstancesToTry = 3;

    const tryInstance = (instance) => {
        const client = createUserClient(instance);
        client.GetUserGoal({ user_id }, (err, response) => {
            if (err) {
                attempts++;
                if (attempts < maxAttempts) {
                    logger.info(`Retrying instance ${instance.host}, attempt ${attempts}`);
                    tryInstance(instance);
                } else {
                    failedUserInstances[instance.host] = true;
                    logger.error(`Instance ${instance.host} marked as failed`);
                    instancesTried++;
                    if (instancesTried < maxInstancesToTry) {
                        const nextInstance = getNextAvailableInstance(userServiceInstances, failedUserInstances);
                        if (nextInstance) {
                            attempts = 0;
                            tryInstance(nextInstance);
                        } else {
                            res.status(500).json({ error: 'All instances failed' });
                        }
                    } else {
                        res.status(500).json({ error: 'All instances failed' });
                    }
                }
            } else {
                failedUserInstances = {};
                res.json(response);
            }
        });
    };

    const initialInstance = getNextAvailableInstance(userServiceInstances, failedUserInstances);
    if (initialInstance) {
        tryInstance(initialInstance);
    } else {
        res.status(500).json({ error: 'No available instances' });
    }
});

// Start Workout Session with Circuit Breaker
app.post('/workouts/start', (req, res) => {
    const { user_id } = req.body;
    breaker
        .fire({ user_id })
        .then((response) => res.json(response))
        .catch((err) => {
            if (breaker.opened) {
                res.status(503).json({ error: 'Service unavailable due to circuit breaker' });
            } else {
                res.status(500).json({ error: err.message });
            }
        });
});

// Start Group Workout Session with reroute logic
app.post('/workouts/group/start', (req, res) => {
    const { user_id } = req.body;

    let attempts = 0;
    let maxAttempts = 3;
    let instancesTried = 0;
    const maxInstancesToTry = 3;

    const tryInstance = (instance) => {
        const client = createActivityClient(instance);
        client.StartGroupWorkoutSession({ user_id }, (err, response) => {
            if (err) {
                attempts++;
                if (attempts < maxAttempts) {
                    logger.info(`Retrying instance ${instance.host}, attempt ${attempts}`);
                    tryInstance(instance);
                } else {
                    failedActivityInstances[instance.host] = true;
                    logger.error(`Instance ${instance.host} marked as failed`);
                    instancesTried++;
                    if (instancesTried < maxInstancesToTry) {
                        const nextInstance = getNextAvailableInstance(activityServiceInstances, failedActivityInstances);
                        if (nextInstance) {
                            attempts = 0;
                            tryInstance(nextInstance);
                        } else {
                            res.status(500).json({ error: 'All instances failed' });
                        }
                    } else {
                        res.status(500).json({ error: 'All instances failed' });
                    }
                }
            } else {
                failedActivityInstances = {};
                res.json(response);
            }
        });
    };

    const initialInstance = getNextAvailableInstance(activityServiceInstances, failedActivityInstances);
    if (initialInstance) {
        tryInstance(initialInstance);
    } else {
        res.status(500).json({ error: 'No available instances' });
    }
});

// End Workout Session with reroute logic
app.post('/workouts/end', (req, res) => {
    const { session_id } = req.body;

    let attempts = 0;
    let maxAttempts = 3;
    let instancesTried = 0;
    const maxInstancesToTry = 3;

    const tryInstance = (instance) => {
        const client = createActivityClient(instance);
        client.EndWorkoutSession({ session_id }, (err, response) => {
            if (err) {
                attempts++;
                if (attempts < maxAttempts) {
                    logger.info(`Retrying instance ${instance.host}, attempt ${attempts}`);
                    tryInstance(instance);
                } else {
                    failedActivityInstances[instance.host] = true;
                    logger.error(`Instance ${instance.host} marked as failed`);
                    instancesTried++;
                    if (instancesTried < maxInstancesToTry) {
                        const nextInstance = getNextAvailableInstance(activityServiceInstances, failedActivityInstances);
                        if (nextInstance) {
                            attempts = 0;
                            tryInstance(nextInstance);
                        } else {
                            res.status(500).json({ error: 'All instances failed' });
                        }
                    } else {
                        res.status(500).json({ error: 'All instances failed' });
                    }
                }
            } else {
                failedActivityInstances = {};
                res.json(response);
            }
        });
    };

    const initialInstance = getNextAvailableInstance(activityServiceInstances, failedActivityInstances);
    if (initialInstance) {
        tryInstance(initialInstance);
    } else {
        res.status(500).json({ error: 'No available instances' });
    }
});

// Start the HTTP server
const HTTP_PORT = 8080;
app.listen(HTTP_PORT, () => {
    logger.info(`API Gateway HTTP server running on port ${HTTP_PORT}`);
});

// Start the WebSocket server on port 8081
const WS_PORT = 8081;
const wsServer = new WebSocket.Server({ port: WS_PORT }, () => {
    logger.info(`WebSocket server running on port ${WS_PORT}`);
});

// WebSocket connection for group sessions
wsServer.on('connection', (ws) => {
    logger.info('User connected via WebSocket');

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

                logger.info(`User ${user_id} joined session ${session_id}`);

                // Initialize session in Redis if not exists
                try {
                    const sessionData = await redisClient.hGetAll(`session:${session_id}`);

                    if (Object.keys(sessionData).length === 0) {
                        // Initialize session data
                        const sessionInfo = {
                            participants: JSON.stringify([user_id]),
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
                    logger.error('Redis error:', err);
                }

                // Notify others in the session
                wsServer.clients.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN && client.session_id === session_id) {
                        client.send(
                            JSON.stringify({
                                type: 'user_joined',
                                user_id: user_id,
                            })
                        );
                    }
                });
            } else if (data.type === 'chat_message') {
                // Broadcast the message to all participants in the session
                wsServer.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN && client.session_id === session_id) {
                        client.send(
                            JSON.stringify({
                                type: 'chat_message',
                                user_id: user_id,
                                message: data.message,
                            })
                        );
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
