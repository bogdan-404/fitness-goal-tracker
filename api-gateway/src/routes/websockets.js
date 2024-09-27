module.exports = (io, redisClient) => {
    let workoutSessions = {};
  
    io.on('connection', (socket) => {
      console.log('User connected:', socket.id);
  
      // User joins a workout session
      socket.on('join_session', (sessionId) => {
        socket.join(sessionId);
        console.log(`User ${socket.id} joined session ${sessionId}`);
  
        // Fetch session from Redis cache or create new
        redisClient.get(sessionId, (err, session) => {
          if (!session) {
            workoutSessions[sessionId] = { votes: {}, participants: [] };
            redisClient.set(sessionId, JSON.stringify(workoutSessions[sessionId]));
          }
        });
      });
  
      // Voting system for the next exercise
      socket.on('vote_exercise', ({ sessionId, userId, exercise }) => {
        workoutSessions[sessionId].votes[userId] = exercise;
  
        // Broadcast the current vote status to all participants
        io.in(sessionId).emit('vote_update', workoutSessions[sessionId].votes);
  
        // Store votes in Redis cache
        redisClient.set(sessionId, JSON.stringify(workoutSessions[sessionId]));
      });
  
      // Notify users when an exercise is chosen
      socket.on('exercise_chosen', (sessionId, exercise) => {
        io.in(sessionId).emit('exercise_notification', { exercise });
      });
  
      // Disconnect user
      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });
  };
  