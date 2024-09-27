from concurrent import futures
import grpc
from flask import Flask, jsonify, request
from pymongo import MongoClient
import threading
import activity_service_pb2_grpc, activity_service_pb2

app = Flask(__name__)

client = MongoClient('mongodb://localhost:27017/')
db = client['activity_db']
workout_collection = db['workouts']

# Semaphore to limit concurrent group workout sessions
concurrent_session_limit = threading.Semaphore(5)

# gRPC Activity Service
class ActivityService(activity_service_pb2_grpc.ActivityServiceServicer):
    def StartWorkoutSession(self, request, context):
        with concurrent_session_limit:
            session_id = workout_collection.insert_one({
                'user_id': request.user_id,
                'workout_type': request.workout_type,
                'calories_burned': 0,
                'active': True
            }).inserted_id
            return activity_service_pb2.WorkoutResponse(session_id=str(session_id), start_time="now")

    def EndWorkoutSession(self, request, context):
        session = workout_collection.find_one_and_update(
            {'_id': request.session_id}, {'$set': {'active': False}})
        return activity_service_pb2.WorkoutResponse(session_id=request.session_id, start_time=session['start_time'])

# gRPC server setup function
def grpc_server():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    activity_service_pb2_grpc.add_ActivityServiceServicer_to_server(ActivityService(), server)
    server.add_insecure_port('[::]:50052')
    server.start()
    print("gRPC server for Activity Service is running on port 50052...")
    server.wait_for_termination()

# REST Endpoints for Activity Service
@app.route('/workouts/start', methods=['POST'])
def start_workout():
    data = request.json
    user_id = data['user_id']
    workout_type = data['workout_type']

    grpc_request = activity_service_pb2.WorkoutRequest(user_id=user_id, workout_type=workout_type)
    response = activity_service_pb2.WorkoutResponse(session_id="123", start_time="now")
    return jsonify({"session_id": response.session_id, "start_time": response.start_time})

@app.route('/workouts/end', methods=['POST'])
def end_workout():
    data = request.json
    session_id = data['session_id']

    grpc_request = activity_service_pb2.WorkoutRequest(session_id=session_id)
    response = activity_service_pb2.WorkoutResponse(session_id=session_id, start_time="start_time")
    return jsonify({"session_id": response.session_id, "end_time": "now"})

@app.route('/status', methods=['GET'])
def status():
    return jsonify({"status": "Activity Tracking Service Running"})

# Function to run Flask server
def flask_server():
    app.run(host='0.0.0.0', port=5001)

if __name__ == '__main__':
    # Start both gRPC and Flask servers in separate threads
    threading.Thread(target=grpc_server).start()  # gRPC server in a separate thread
    flask_server()  # Flask server
