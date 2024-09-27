from concurrent import futures
import grpc
from flask import Flask, jsonify, request
from pymongo import MongoClient
from bson.objectid import ObjectId  # Import ObjectId to handle MongoDB IDs
import threading
import activity_service_pb2_grpc, activity_service_pb2

app = Flask(__name__)

# MongoDB setup
client = MongoClient('mongodb://localhost:27017/')
db = client['activity_db']
workout_collection = db['workouts']

# Semaphore to limit concurrent group workout sessions
concurrent_session_limit = threading.Semaphore(5)

# gRPC Activity Service
class ActivityService(activity_service_pb2_grpc.ActivityServiceServicer):
    def StartWorkoutSession(self, request, context):
        try:
            session_id = workout_collection.insert_one({
                'user_id': request.user_id,
                'workout_type': request.workout_type,
                'calories_burned': 0,
                'active': True
            }).inserted_id
            return activity_service_pb2.WorkoutResponse(session_id=str(session_id), start_time="now")
        except Exception as e:
            context.set_details(str(e))
            context.set_code(grpc.StatusCode.UNKNOWN)
            return activity_service_pb2.WorkoutResponse()

    def EndWorkoutSession(self, request, context):
        try:
            # Convert session_id to ObjectId to match MongoDB's internal ID format
            session_id = ObjectId(request.session_id)
            
            # Find and update the session (mark it as inactive)
            session = workout_collection.find_one_and_update(
                {'_id': session_id},
                {'$set': {'active': False}},
                return_document=True
            )
            
            if session:
                return activity_service_pb2.WorkoutResponse(session_id=request.session_id, start_time=session['start_time'])
            else:
                context.set_details('Session not found')
                context.set_code(grpc.StatusCode.NOT_FOUND)
                return activity_service_pb2.WorkoutResponse()

        except Exception as e:
            # Handle any unknown errors and send back the error details
            context.set_details(str(e))
            context.set_code(grpc.StatusCode.UNKNOWN)
            return activity_service_pb2.WorkoutResponse()

# gRPC server setup function
def grpc_server():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    activity_service_pb2_grpc.add_ActivityServiceServicer_to_server(ActivityService(), server)
    server.add_insecure_port('[::]:50052')
    server.start()
    print("gRPC server for Activity Service is running on port 50052...")
    server.wait_for_termination()

# REST Endpoints for testing purposes (if needed)
@app.route('/status', methods=['GET'])
def status():
    return jsonify({"status": "Activity Tracking Service Running"})

# Function to run Flask server (for additional REST API endpoints)
def flask_server():
    app.run(host='0.0.0.0', port=5001)

if __name__ == '__main__':
    # Start both gRPC and Flask servers in separate threads
    threading.Thread(target=grpc_server).start()  # gRPC server in a separate thread
    flask_server()  # Flask server
