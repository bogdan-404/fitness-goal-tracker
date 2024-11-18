import os
import grpc
from concurrent import futures
from flask import Flask, jsonify
import sqlite3
import redis
from grpc_health.v1 import health, health_pb2_grpc
import logging

# Import the generated classes
import user_service_pb2
import user_service_pb2_grpc

# Read environment variables
REDIS_HOST = os.environ.get('REDIS_HOST', 'localhost')

# Initialize Redis client
redis_client = redis.Redis(host=REDIS_HOST, port=6379, db=0)

# SQLite setup
DATABASE = 'users.db'

def init_db():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            goal TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# Create logs directory
os.makedirs('/app/logs', exist_ok=True)

# Configure logging
logging.basicConfig(
    filename='/app/logs/user-service.log',
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s'
)

# gRPC service implementation
class UserService(user_service_pb2_grpc.UserServiceServicer):
    def RegisterUser(self, request, context):
        try:
            conn = sqlite3.connect(DATABASE)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO users (username, email, password, goal)
                VALUES (?, ?, ?, ?)
            ''', (request.username, request.email, request.password, request.goal))
            conn.commit()
            user_id = cursor.lastrowid
            conn.close()
            logging.info(f"Registered user {request.username} with ID {user_id}")
            return user_service_pb2.UserResponse(
                user_id=str(user_id),
                username=request.username,
                email=request.email
            )
        except sqlite3.IntegrityError as e:
            context.set_details(str(e))
            context.set_code(grpc.StatusCode.ALREADY_EXISTS)
            logging.error(f"Failed to register user {request.username}: {str(e)}")
            return user_service_pb2.UserResponse()

    def GetUserGoal(self, request, context):
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute('SELECT goal FROM users WHERE user_id = ?', (request.user_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            logging.info(f"Retrieved goal for user ID {request.user_id}")
            return user_service_pb2.GoalResponse(goal_type=row[0])
        else:
            context.set_details('User not found')
            context.set_code(grpc.StatusCode.NOT_FOUND)
            logging.error(f"User ID {request.user_id} not found")
            return user_service_pb2.GoalResponse()

# Start gRPC server
def serve_grpc():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    user_service_pb2_grpc.add_UserServiceServicer_to_server(UserService(), server)
    health_pb2_grpc.add_HealthServicer_to_server(health.HealthServicer(), server)
    server.add_insecure_port('[::]:50051')
    server.start()
    logging.info('Starting User Service on port 50051...')
    server.wait_for_termination()

# Start Flask app (for health checks)
app = Flask(__name__)

@app.route('/status')
def status():
    return jsonify({'status': 'User Service Running'})

if __name__ == '__main__':
    from threading import Thread
    Thread(target=lambda: app.run(host='0.0.0.0', port=5000)).start()
    serve_grpc()
