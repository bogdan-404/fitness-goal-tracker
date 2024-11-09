import os
import grpc
from concurrent import futures
from flask import Flask, jsonify, request
from pymongo import MongoClient
import redis
from grpc_health.v1 import health, health_pb2_grpc

# Import the generated classes
import activity_service_pb2
import activity_service_pb2_grpc
import user_service_pb2
import user_service_pb2_grpc

# Read environment variables
MONGO_HOST = os.environ.get('MONGO_HOST', 'localhost')
REDIS_HOST = os.environ.get('REDIS_HOST', 'localhost')
USER_SERVICE_HOST = os.environ.get('USER_SERVICE_HOST', 'localhost')

# MongoDB setup
mongo_client = MongoClient(f'mongodb://{MONGO_HOST}:27017/')
db = mongo_client['activity_db']
sessions_collection = db['sessions']

# Redis setup
redis_client = redis.Redis(host=REDIS_HOST, port=6379, db=0)

# User Service gRPC client
user_channel = grpc.insecure_channel(f'{USER_SERVICE_HOST}:50051')
user_stub = user_service_pb2_grpc.UserServiceStub(user_channel)

# gRPC service implementation
class ActivityService(activity_service_pb2_grpc.ActivityServiceServicer):
    def StartWorkoutSession(self, request, context):
        # Implement logic to start a workout session
        # For example, create a new session in MongoDB
        session_id = "session123"  # Replace with actual logic
        start_time = "2023-11-08T12:00:00Z"  # Replace with actual start time
        return activity_service_pb2.WorkoutResponse(
            session_id=session_id,
            start_time=start_time
        )

    def EndWorkoutSession(self, request, context):
        # Implement logic to end a workout session
        # For now, return a response with session_id and start_time
        return activity_service_pb2.WorkoutResponse(
            session_id=request.session_id,
            start_time=""
        )

    def StartGroupWorkoutSession(self, request, context):
        # Implement logic to start a group workout session
        session_id = "group_session123"  # Replace with actual logic
        start_time = "2023-11-08T12:00:00Z"  # Replace with actual start time
        return activity_service_pb2.WorkoutResponse(
            session_id=session_id,
            start_time=start_time
        )

    # Implement other methods as needed

# Start gRPC server
def serve_grpc():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    activity_service_pb2_grpc.add_ActivityServiceServicer_to_server(ActivityService(), server)
    health_pb2_grpc.add_HealthServicer_to_server(health.HealthServicer(), server)
    server.add_insecure_port('[::]:50052')
    server.start()
    print('Starting Activity Service on port 50052...')
    server.wait_for_termination()

# Start Flask app (for health checks)
app = Flask(__name__)

@app.route('/status')
def status():
    return jsonify({'status': 'Activity Service Running'})

if __name__ == '__main__':
    from threading import Thread
    # Start Flask app in a separate thread
    Thread(target=lambda: app.run(host='0.0.0.0', port=5001)).start()
    # Start gRPC server
    serve_grpc()
