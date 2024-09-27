from concurrent import futures
import grpc
from flask import Flask, jsonify, request
import sqlite3
import threading
import time
import user_service_pb2_grpc, user_service_pb2

app = Flask(__name__)

DATABASE = 'users.db'

# Lock for limiting concurrent tasks
concurrent_goal_limit = threading.Semaphore(3)

# gRPC User Service
class UserService(user_service_pb2_grpc.UserServiceServicer):
    def RegisterUser(self, request, context):
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        c.execute("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", 
                  (request.username, request.email, request.password))
        conn.commit()
        user_id = c.lastrowid
        conn.close()
        return user_service_pb2.UserResponse(user_id=str(user_id), username=request.username, email=request.email)

    def SetGoal(self, request, context):
        with concurrent_goal_limit:
            conn = sqlite3.connect(DATABASE)
            c = conn.cursor()
            c.execute("INSERT INTO goals (user_id, goal_type, target_value, target_date) VALUES (?, ?, ?, ?)", 
                      (request.user_id, request.goal_type, request.target_value, request.target_date))
            conn.commit()
            goal_id = c.lastrowid
            conn.close()
            return user_service_pb2.GoalResponse(goal_id=str(goal_id))

# gRPC client setup for communicating with Activity Service (if needed)
def activity_service_client():
    channel = grpc.insecure_channel('localhost:50052')
    stub = activity_service_pb2_grpc.ActivityServiceStub(channel)
    return stub

# gRPC server setup function
def grpc_server():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    user_service_pb2_grpc.add_UserServiceServicer_to_server(UserService(), server)
    server.add_insecure_port('[::]:50051')
    server.start()
    print("gRPC server for User Service is running on port 50051...")
    server.wait_for_termination()

# REST Endpoints for User Service
@app.route('/users/register', methods=['POST'])
def register_user():
    data = request.json
    username = data['username']
    email = data['email']
    password = data['password']

    grpc_request = user_service_pb2.UserRequest(username=username, email=email, password=password)
    response = user_service_pb2.UserResponse(user_id="123", username=username, email=email)
    return jsonify({"user_id": response.user_id, "username": response.username, "email": response.email})

@app.route('/users/set_goal', methods=['POST'])
def set_goal():
    data = request.json
    user_id = data['user_id']
    goal_type = data['goal_type']
    target_value = data['target_value']
    target_date = data['target_date']

    grpc_request = user_service_pb2.GoalRequest(user_id=user_id, goal_type=goal_type, target_value=target_value, target_date=target_date)
    response = user_service_pb2.GoalResponse(goal_id="goal123")
    return jsonify({"goal_id": response.goal_id})

@app.route('/status', methods=['GET'])
def status():
    return jsonify({"status": "User Service Running"})

# SQLite initialization
def init_db():
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT, email TEXT, password TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS goals (id INTEGER PRIMARY KEY, user_id INTEGER, goal_type TEXT, target_value INTEGER, target_date TEXT)''')
    conn.commit()
    conn.close()

# Function to run Flask server
def flask_server():
    app.run(host='0.0.0.0', port=5000)

if __name__ == '__main__':
    init_db()
    # Start both gRPC and Flask servers in separate threads
    threading.Thread(target=grpc_server).start()  # gRPC server in a separate thread
    flask_server()  # Flask server
