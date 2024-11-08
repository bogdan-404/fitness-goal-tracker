import grpc
from concurrent import futures
import time
from flask import Flask, jsonify, g
import threading
import activity_service_pb2_grpc as pb2_grpc
import activity_service_pb2 as pb2
import user_service_pb2_grpc as user_pb2_grpc
import user_service_pb2 as user_pb2
from pymongo import MongoClient
import redis
from pybreaker import CircuitBreaker, CircuitBreakerError
from bson.objectid import ObjectId

# MongoDB setup
client = MongoClient('mongodb://localhost:27017/')
db = client['activity_db']
workout_collection = db['workouts']

# Redis client
redis_client = redis.StrictRedis(host='localhost', port=6379, db=0)

# Circuit Breaker setup
circuit_breaker = CircuitBreaker(fail_max=3, reset_timeout=17.5)  # 5 * 3.5 = 17.5 seconds

# Flask app for status check and timeouts
app = Flask(__name__)

@app.before_request
def before_request():
    g.start_time = time.time()

@app.after_request
def after_request(response):
    total_time = time.time() - g.start_time
    if total_time > 5:  
        response.status_code = 504
        response.data = "Request Timeout"
    return response

@app.route('/status', methods=['GET'])
def status():
    return jsonify({"status": "Activity Service Running"})

class ActivityService(pb2_grpc.ActivityServiceServicer):
    def __init__(self):
        # Set up gRPC channel to User Service
        self.user_channel = grpc.insecure_channel('localhost:50051')
        self.user_stub = user_pb2_grpc.UserServiceStub(self.user_channel)
    
    @circuit_breaker
    def StartWorkoutSession(self, request, context):
        user_id = request.user_id

        # Check Redis cache first
        cached_goal = redis_client.get(f"user_goal:{user_id}")
        if cached_goal:
            print("Cache hit for user goal in Activity Service")
            user_goal = cached_goal.decode('utf-8')
        else:
            print("Cache miss in Activity Service. Making gRPC call to User Service.")
            try:
                # Get user goal from User Service
                user_goal_response = self.user_stub.GetUserGoal(
                    user_pb2.GoalRequest(user_id=user_id), timeout=5.0
                )
                user_goal = user_goal_response.goal_type

                # Cache the goal in Redis
                redis_client.set(f"user_goal:{user_id}", user_goal)
            except grpc.RpcError as e:
                # Handle exceptions
                raise e  # This will be caught by the circuit breaker

        # Proceed with starting the workout session
        session_id = str(workout_collection.insert_one({
            'user_id': user_id,
            'workout_type': user_goal,
            'start_time': time.time(),
            'active': True
        }).inserted_id)

        return pb2.WorkoutResponse(session_id=session_id, start_time="now")

    @circuit_breaker
    def StartGroupWorkoutSession(self, request, context):
        user_id = request.user_id

        # Proceed with starting the group workout session
        session_id = str(workout_collection.insert_one({
            'user_id': user_id,
            'workout_type': 'group',
            'start_time': time.time(),
            'participants': [user_id],
            'active': True
        }).inserted_id)

        return pb2.WorkoutResponse(session_id=session_id, start_time="now")

    @circuit_breaker
    def EndWorkoutSession(self, request, context):
        session_id = request.session_id
        try:
            workout_collection.update_one(
                {'_id': ObjectId(session_id)}, 
                {'$set': {'active': False}}
            )
            return pb2.WorkoutResponse(session_id=session_id, start_time="ended")
        except Exception as e:
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return pb2.WorkoutResponse()

    # Implement other methods as needed...

def grpc_server():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    pb2_grpc.add_ActivityServiceServicer_to_server(ActivityService(), server)
    print("Starting Activity Service on port 50052...")
    server.add_insecure_port('[::]:50052')
    server.start()
    try:
        while True:
            time.sleep(86400)
    except KeyboardInterrupt:
        server.stop(0)

def flask_server():
    app.run(host='0.0.0.0', port=5001)

if __name__ == '__main__':
    grpc_thread = threading.Thread(target=grpc_server)
    flask_thread = threading.Thread(target=flask_server)

    grpc_thread.start()
    flask_thread.start()

    grpc_thread.join()
    flask_thread.join()
