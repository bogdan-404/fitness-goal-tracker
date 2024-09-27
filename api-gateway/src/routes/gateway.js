module.exports = (app, userClient, activityClient, redisClient) => {
    // User registration (gRPC)
    app.post('/users/register', (req, res) => {
      const { username, email, password } = req.body;
      userClient.RegisterUser({ username, email, password }, (err, response) => {
        if (err) return res.status(500).send(err);
        res.json(response);
      });
    });
  
    // Set user goal (gRPC)
    app.post('/users/set_goal', (req, res) => {
      const { user_id, goal_type, target_value, target_date } = req.body;
      userClient.SetGoal({ user_id, goal_type, target_value, target_date }, (err, response) => {
        if (err) return res.status(500).send(err);
        res.json(response);
      });
    });
  
    // Start workout session (gRPC)
    app.post('/workouts/start', (req, res) => {
      const { user_id, workout_type } = req.body;
      activityClient.StartWorkoutSession({ user_id, workout_type }, (err, response) => {
        if (err) return res.status(500).send(err);
        res.json(response);
      });
    });
  
    // End workout session (gRPC)
    app.post('/workouts/end', (req, res) => {
      const { session_id } = req.body;
      activityClient.EndWorkoutSession({ session_id }, (err, response) => {
        if (err) return res.status(500).send(err);
        res.json(response);
      });
    });
  
    // Status check endpoints
    app.get('/status/user', (req, res) => res.json({ status: 'User Service Running' }));
    app.get('/status/activity', (req, res) => res.json({ status: 'Activity Service Running' }));
  
    // Redis cache route example (caching workout sessions)
    app.get('/cache/sessions', (req, res) => {
      redisClient.get('workout_sessions', (err, sessions) => {
        if (err) return res.status(500).send(err);
        res.json(JSON.parse(sessions));
      });
    });
  };
  