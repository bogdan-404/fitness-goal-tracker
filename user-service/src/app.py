import grpc
from concurrent import futures
import time
from flask import Flask, jsonify, request, g
import threading
import user_service_pb2_grpc as pb2_grpc
import user_service_pb2 as pb2

# Simulated in-memory storage for users and goals
users_db = {}
goals_db = {
    'lose weight': ['Running', 'Calisthenics'],
    'muscle gain': ['Weightlifting', 'Strength Training'],
    'after trauma sport': ['Physical Therapy', 'Yoga'],
    'maintain physical form': ['Jogging', 'Stretching']
}

# Flask app for status check and timeouts
app = Flask(__name__)

@app.before_request
def before_request():
    g.start_time = time.time()

@app.after_request
def after_request(response):
    total_time = time.time() - g.start_time
    if total_time > 5:  # Simulate timeout
        response.status_code = 504
        response.data = "Request Timeout"
    return response

@app.route('/status', methods=['GET'])
def status():
    return jsonify({"status": "User Service Running"})

class UserService(pb2_grpc.UserServiceServicer):
    def RegisterUser(self, request, context):
        user_id = str(len(users_db) + 1)  # Generate a new user ID
        users_db[user_id] = {
            'username': request.username,
            'email': request.email,
            'password': request.password,
            'goal': request.goal
        }
        return pb2.UserResponse(user_id=user_id, username=request.username, email=request.email)

    def GetUserGoal(self, request, context):
        user_id = request.user_id
        if user_id not in users_db:
            context.set_details('User not found')
            context.set_code(grpc.StatusCode.NOT_FOUND)
            return pb2.GoalResponse()
        
        goal = users_db[user_id]['goal']
        return pb2.GoalResponse(goal_type=goal)

def grpc_server():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    pb2_grpc.add_UserServiceServicer_to_server(UserService(), server)
    print("Starting User Service on port 50051...")
    server.add_insecure_port('[::]:50051')
    server.start()
    try:
        while True:
            time.sleep(86400)
    except KeyboardInterrupt:
        server.stop(0)

def flask_server():
    app.run(host='0.0.0.0', port=5000)

if __name__ == '__main__':
    grpc_thread = threading.Thread(target=grpc_server)
    flask_thread = threading.Thread(target=flask_server)

    grpc_thread.start()
    flask_thread.start()

    grpc_thread.join()
    flask_thread.join()
