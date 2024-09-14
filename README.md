# Fitness Goal Tracker

Zlatovcen Bogdan, FAF 212

## Table of Contents

1. [Application Suitability](#application-suitability)
2. [Service Boundaries and Architecture](#service-boundaries-and-architecture)
3. [Diagram](#system-architecture-diagram)
4. [Technology Stack](#technology-stack)
5. [Data Management](#data-management)

## Application Suitability

The Fitness Goal Tracker is well-suited for a microservices architecture due to the following reasons:

1. **Modular Functionality**: The application has distinct functionalities (user management, activity tracking and managing group workout sessions) that can be developed independently.

2. **Scalability**: Different components may experience varying loads and thus requiring independent scaling.

3. **Technology Diversity**: Using different technologies : Python (Django framework) and NodeJs (NestJS framework) allows for choosing the best tool for each service.

4. **Future Extensibility**: It is easier to add new features and integrate external services like nutrition APIs.

Examples of similar applications:

- **Goals.Fit**: This mobile app adds ranking and leaderboards based on the fitness goals chieved.

- **Muscle Monster Workout Planner**: Shows statistics and future trends based on the fitness activity.

## Service Boundaries and Architecture

I intend to use two microservices and an API Gateway:

1. **User Service**: Manages user accounts, goals, and profiles.
2. **Activity Tracking Service**: Handles workout sessions, calorie calculations, and statistics.
3. **API Gateway**: Routes requests, manages WebSocket connections, and handles load balancing.

## System Architecture Diagram

![](fitness-goal-tracker/scheme.png)

## Technology Stack

1. **User Service**

   - Language: Python
   - Framework: Django
   - Database: PostgreSQL

     We use PostgreSQL as it is a relational database, suitable for structured user data. We will use for authentification, and profile management.

2. **Activity Tracking Service**

   - Language: Python
   - Framework: Django
   - Database: MongoDB

     We use Mongo as it is no SQL database, ideal for storing varied workout data. Flexible schema allows for easy addition of new types of activities/metrics.

3. **API Gateway**

   - Language: Node.js
   - Framework: NestJS

     We will use load balancer in the API gateway to distribute incoming requests to multiple instances of each service.

4. **Shared Cache**

   - Technology: Redis.

     In this project Redis will be used as a shared cached between services. When a user logs in, their profile information can be cached in Redis, and all the following requests for this user's data can be served from Redis instead of querying the database, resulting in faster response times.

5. **Communication Patterns**

   - gRPC for inter-service communication
   - WebSockets for real-time: live chat and group sessions, and sending immediate allerts when a goal is acheived
   - RESTful APIs for client-server communication

6. **Containerization**
   - Docker for containerizing all services and components
   - Docker Compose for local development and testing

## Data Management

### User Service Endpoints

1. **Register User**

   - Endpoint: `POST /users/register`
   - Payload:
     ```json
     {
       "username": "string",
       "email": "string",
       "password": "string"
     }
     ```
   - Response:
     ```json
     {
       "user_id": "string",
       "username": "string",
       "email": "string"
     }
     ```

2. **User Login**

   - Endpoint: `POST /users/login`
   - Payload:
     ```json
     {
       "email": "string",
       "password": "string"
     }
     ```
   - Response:
     ```json
     {
       "token": "string",
       "user_id": "string"
     }
     ```

3. **Set Goal**
   - Endpoint: `POST /users/{user_id}/goals`
   - Payload:
     ```json
     {
       "goal_type": "string",
       "target_value": "number",
       "target_date": "string"
     }
     ```
   - Response:
     ```json
     {
       "goal_id": "string",
       "goal_type": "string",
       "target_value": "number",
       "target_date": "string",
       "current_progress": "number"
     }
     ```

### Activity Tracking Service Endpoints

1. **Start Workout Session**

   - Endpoint: `POST /workouts/start`
   - Payload:
     ```json
     {
       "user_id": "string",
       "workout_type": "string"
     }
     ```
   - Response:
     ```json
     {
       "session_id": "string",
       "start_time": "string"
     }
     ```

2. **End Workout Session**

   - Endpoint: `POST /workouts/{session_id}/end`
   - Payload:
     ```json
     {
       "end_time": "string"
     }
     ```
   - Response:
     ```json
     {
       "session_id": "string",
       "duration": "number",
       "calories_burned": "number"
     }
     ```

3. **Get User Statistics**
   - Endpoint: `GET /users/{user_id}/statistics`
   - Response:
     ```json
     {
       "total_workouts": "number",
       "total_duration": "number",
       "total_calories_burned": "number",
       "average_session_duration": "number"
     }
     ```

### WebSocket Events

Group sessions will use WebSockets for real-time interaction:

- Session Creation: A user creates a session, which is stored in Redis with a unique session ID.
- Joining: Other users join the session using this ID, creating WebSocket connections.
- Real-time Updates: All session activities (user joins, leaves, exercise updates) are broadcasted to all participants.
- Data Persistence: At the end of the session, data is saved to the Activity Tracking Service's MongoDB database.

1. **Join Group Session**

   - Event: `join_group_session`
   - Payload:
     ```json
     {
       "user_id": "string",
       "session_id": "string"
     }
     ```

2. **Send Chat Message**

   - Event: `send_message`
   - Payload:
     ```json
     {
       "user_id": "string",
       "session_id": "string",
       "message": "string"
     }
     ```

3. **Receive Group Update**
   - Event: `group_update`
   - Payload:
     ```json
     {
       "session_id": "string",
       "update_type": "string",
       "data": "object"
     }
     ```
