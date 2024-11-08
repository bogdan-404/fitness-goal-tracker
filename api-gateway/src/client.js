const readline = require('readline');
const axios = require('axios');
const WebSocket = require('ws');

// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let user = {};
let session_id = null;
let ws = null;

// Function to prompt the user
function prompt(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

// Function to register the user
async function registerUser() {
    user.username = await prompt('Enter username: ');
    user.email = await prompt('Enter email: ');
    user.password = await prompt('Enter password: ');
    user.goal = await prompt('Enter goal: ');

    try {
        const response = await axios.post('http://localhost:8080/users/register', user);
        user.user_id = response.data.user_id;
        console.log('User registered successfully. Your user ID is:', user.user_id);
    } catch (error) {
        console.error('Error registering user:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

// Function to display the menu
async function displayMenu() {
    console.log('\nSelect an option:');
    console.log('1. Start local workout');
    console.log('2. End local workout');
    console.log('3. Start group workout');
    console.log('4. End group workout');
    console.log('5. Join group workout');

    const choice = await prompt('Enter your choice: ');

    switch (choice) {
        case '1':
            await startLocalWorkout();
            break;
        case '2':
            await endLocalWorkout();
            break;
        case '3':
            await startGroupWorkout();
            break;
        case '4':
            await endGroupWorkout();
            break;
        case '5':
            await joinGroupWorkout();
            break;
        default:
            console.log('Invalid choice. Please try again.');
    }

    // After handling the choice, display the menu again if not in chat
    if (choice !== '5') {
        await displayMenu();
    }
}

// Function to start local workout
async function startLocalWorkout() {
    try {
        const response = await axios.post('http://localhost:8080/workouts/start', { user_id: user.user_id });
        session_id = response.data.session_id;
        console.log('Local workout started. Session ID:', session_id);
    } catch (error) {
        console.error('Error starting local workout:', error.response ? error.response.data : error.message);
    }
}

// Function to end local workout
async function endLocalWorkout() {
    if (!session_id) {
        console.log('No active session to end.');
        return;
    }
    try {
        const response = await axios.post('http://localhost:8080/workouts/end', { session_id });
        console.log('Local workout ended.');
        session_id = null;
    } catch (error) {
        console.error('Error ending local workout:', error.response ? error.response.data : error.message);
    }
}

// Function to start group workout
async function startGroupWorkout() {
    try {
        const response = await axios.post('http://localhost:8080/workouts/group/start', { user_id: user.user_id });
        session_id = response.data.session_id;
        console.log('Group workout started. Session ID:', session_id);
    } catch (error) {
        console.error('Error starting group workout:', error.response ? error.response.data : error.message);
    }
}

// Function to end group workout
async function endGroupWorkout() {
    if (!session_id) {
        console.log('No active group session to end.');
        return;
    }
    try {
        const response = await axios.post('http://localhost:8080/workouts/end', { session_id });
        console.log('Group workout ended.');
        session_id = null;
    } catch (error) {
        console.error('Error ending group workout:', error.response ? error.response.data : error.message);
    }
}

// Function to join group workout
async function joinGroupWorkout() {
    const inputSessionId = await prompt('Enter session ID to join: ');
    session_id = inputSessionId;

    // Connect to WebSocket server
    ws = new WebSocket('ws://localhost:8081');

    ws.on('open', () => {
        console.log('Connected to WebSocket server.');

        // Send join_session message
        ws.send(JSON.stringify({
            type: 'join_session',
            session_id: session_id,
            user_id: user.user_id
        }));

        console.log(`Joined session ${session_id} as user ${user.user_id}`);

        // Start listening for user input for chat messages
        listenForChatMessages();
    });

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            if (message.type === 'chat_message') {
                console.log(`${message.user_id}: ${message.message}`);
            } else if (message.type === 'user_joined') {
                console.log(`User joined: ${message.user_id}`);
            }
        } catch (err) {
            console.error('Error parsing message:', err);
        }
    });

    ws.on('close', () => {
        console.log('Disconnected from WebSocket server.');
        ws = null;
        session_id = null;
        // Return to menu after disconnecting
        displayMenu();
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error.message);
    });
}

// Function to listen for user input for chat messages
function listenForChatMessages() {
    console.log('You can now send messages. Type "/exit" to leave the chat.');
    rl.on('line', (input) => {
        if (input.trim().toLowerCase() === '/exit') {
            // User wants to exit the chat
            ws.close();
            // Remove the 'line' event listener to prevent duplicate listeners
            rl.removeAllListeners('line');
        } else {
            // Send chat message
            ws.send(JSON.stringify({
                type: 'chat_message',
                session_id: session_id,
                user_id: user.user_id,
                message: input
            }));
        }
    });
}

// Main function to run the client
async function main() {
    await registerUser();
    await displayMenu();
}

// Start the client
main();
