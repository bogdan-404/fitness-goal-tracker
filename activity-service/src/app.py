import grpc
from concurrent import futures
import time
from flask import Flask, jsonify
import threading
import activity_service_pb2_grpc as pb2_grpc
import activity_service_pb2 as pb2
import user_service_pb2_grpc as user_pb2_grpc
import user_service_pb2 as user_pb2
from pymongo import MongoClient

# MongoDB setup
client = MongoClient('mongodb://localhost:27017/')
db = client['activity_db']
workout_collection = db['workouts']

# Flask app for status check
app = Flask(__name__)

@app.route('/status', methods=['GET'])
def status():
    return jsonify({"status": "Activity Service Running"})

class ActivityService(pb2_grpc.ActivityServiceServicer):
    def __init__(self):
        # Set up gRPC channel to User Service
        self.user_channel = grpc.insecure_channel('localhost:50051')
        self.user_stub = user_pb2_grpc.UserServiceStub(self.user_channel)
    
    def StartWorkoutSession(self, request, context):
        # Get user goal from User Service
        user_goal_response = self.user_stub.GetUserGoal(user_pb2.GoalRequest(user_id=request.user_id))
        user_goal = user_goal_response.goal_type

        # Insert session into MongoDB
        session_id = workout_collection.insert_one({
            'user_id': request.user_id,
            'workout_type': 'Running',  # For simplicity
            'start_time': time.time()
        }).inserted_id

        return pb2.WorkoutResponse(session_id=str(session_id), start_time="now")

    def EndWorkoutSession(self, request, context):
        workout_collection.update_one(
            {'_id': request.session_id}, 
            {'$set': {'active': False}}
        )
        return pb2.WorkoutResponse(session_id=request.session_id, start_time="ended")

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
