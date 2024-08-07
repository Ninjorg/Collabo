const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const SECRET_KEY = 'your_secret_key'; // Use a secure key in production

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// User data file
const USERS_FILE = path.join(__dirname, 'users.json');
const CHATS_DIR = path.join(__dirname, 'chats');

// Ensure the chats directory exists
if (!fs.existsSync(CHATS_DIR)) {
    fs.mkdirSync(CHATS_DIR);
}

// Utility function to read user data
const readUsers = () => {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify([]));
    }
    const users = JSON.parse(fs.readFileSync(USERS_FILE));
    // Ensure every user has isActive field
    return users.map(user => ({ ...user, isActive: user.isActive || false }));
};


// Sign-up route
app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
    const users = readUsers();

    if (users.find(user => user.email === email)) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ username, email, password: hashedPassword, chats: [] });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users));

    res.status(201).json({ message: 'User created' });
});

// Login route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const users = readUsers();
    const user = users.find(user => user.email === email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    user.isActive = true; // Set user as active
    fs.writeFileSync(USERS_FILE, JSON.stringify(users));

    const token = jwt.sign({ email: user.email, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token, username: user.username }); // Send the username
});


// Middleware to check authentication
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Add chat to user's chats
const addChatToUser = (userEmail, chatId) => {
    const users = readUsers();
    const user = users.find(user => user.email === userEmail);
    if (user) {
        // Use Set to ensure unique chat IDs
        const userChatsSet = new Set(user.chats);
        userChatsSet.add(chatId);
        user.chats = Array.from(userChatsSet);
        fs.writeFileSync(USERS_FILE, JSON.stringify(users));
    }
};

// Add user to the chat's users list
const addUserToChat = (chatId, userEmail) => {
    const chatFilePath = path.join(CHATS_DIR, `${chatId}.json`);
    let chatData = { messages: [], users: [] };

    if (fs.existsSync(chatFilePath)) {
        try {
            chatData = JSON.parse(fs.readFileSync(chatFilePath));
            // Ensure `users` field exists
            if (!Array.isArray(chatData.users)) {
                chatData.users = [];
            }
        } catch (error) {
            console.error('Error reading chat file:', error);
            chatData = { messages: [], users: [] };
        }
    }

    // Use Set to ensure unique user emails
    const usersSet = new Set(chatData.users);
    usersSet.add(userEmail);
    chatData.users = Array.from(usersSet);

    fs.writeFileSync(chatFilePath, JSON.stringify(chatData));
};



// Fetch user chats
app.get('/userChats', authenticateToken, (req, res) => {
    const user = readUsers().find(user => user.email === req.user.email);
    if (user) {
        res.json({ chats: user.chats });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        console.error('Authentication error: Token is missing');
        return next(new Error('Authentication error'));
    }

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            console.error('Authentication error:', err.message);
            return next(new Error('Authentication error'));
        }
        console.log('Authenticated user:', user); // Debug: Check the decoded user object
        socket.user = user;
        next();
    });
});

// On user connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    console.log('User details:', socket.user); // Debug: Check user details on connection

    // Set user as active on connection
    const users = readUsers();
    const user = users.find(user => user.email === socket.user.email);
    if (user) {
        user.isActive = true;
        fs.writeFileSync(USERS_FILE, JSON.stringify(users));
    }

    // Handle joining a chat
    socket.on('joinChat', (chatId) => {
        socket.join(chatId);
        console.log(`User ${socket.user.email} joined chat ${chatId}`);
    
        // Add chatId to user's chats
        addChatToUser(socket.user.email, chatId);
    
        // Add user to chat's users list
        addUserToChat(chatId, socket.user.email);
    
        // Read messages from file and send to client
        const chatFilePath = path.join(CHATS_DIR, `${chatId}.json`);
        if (fs.existsSync(chatFilePath)) {
            const messages = JSON.parse(fs.readFileSync(chatFilePath));
            socket.emit('loadMessages', messages);
        }
    });
    

    // Handle sending a message
    socket.on('sendMessage', ({ chatId, message }) => {
        const timestamp = new Date().toISOString();
        const messageObject = { username: socket.user.username, message, timestamp };

        // Save message to file
        const chatFilePath = path.join(CHATS_DIR, `${chatId}.json`);
        if (!fs.existsSync(chatFilePath)) {
            fs.writeFileSync(chatFilePath, JSON.stringify([]));
        }
        const messages = JSON.parse(fs.readFileSync(chatFilePath));
        messages.push(messageObject);
        fs.writeFileSync(chatFilePath, JSON.stringify(messages));

        // Emit message to chat
        io.to(chatId).emit('receiveMessage', messageObject);
    });

    // Handle user disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    
        // Set user as inactive on disconnection
        const users = readUsers();
        const user = users.find(user => user.email === socket.user.email);
        if (user) {
            user.isActive = false;
            fs.writeFileSync(USERS_FILE, JSON.stringify(users));
        }
    
        // Optionally: Remove user from all chats they were in
        const userChats = user.chats || [];
        userChats.forEach(chatId => {
            const chatFilePath = path.join(CHATS_DIR, `${chatId}.json`);
            if (fs.existsSync(chatFilePath)) {
                const chatData = JSON.parse(fs.readFileSync(chatFilePath));
                chatData.users = chatData.users.filter(email => email !== socket.user.email);
                fs.writeFileSync(chatFilePath, JSON.stringify(chatData));
            }
        });
    });
});


// Start the server
const PORT = 4000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});