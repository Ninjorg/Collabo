// Import required modules
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs } = require('firebase/firestore');

// Initialize Express and server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDKiSo9RJpJoycuvqqlCfY2wI8m8Ijgl-c",
    authDomain: "collabo-fbdb7.firebaseapp.com",
    projectId: "collabo-fbdb7",
    storageBucket: "collabo-fbdb7.appspot.com",
    messagingSenderId: "937554501908",
    appId: "1:937554501908:web:5819b29dd7b73d5eefa201",
    measurementId: "G-JP2F2E3275"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Constants
const SECRET_KEY = 'your_secret_key'; // Use a secure key in production
const USERS_FILE = path.join(__dirname, 'users.json');
const CHATS_DIR = path.join(__dirname, 'chats');
const DEFAULT_CHATS = ['general', 'homework', 'counting'];

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// Ensure chats directory and default chats files exist
const initializeDefaultChats = () => {
    if (!fs.existsSync(CHATS_DIR)) fs.mkdirSync(CHATS_DIR);
    DEFAULT_CHATS.forEach(chatName => {
        const chatFilePath = path.join(CHATS_DIR, `${chatName}.json`);
        if (!fs.existsSync(chatFilePath)) fs.writeFileSync(chatFilePath, JSON.stringify([]));
    });
};

// Read and write user data
const readUsers = () => {
    if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([]));
    return JSON.parse(fs.readFileSync(USERS_FILE));
};

const writeUsers = (users) => {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

// Update chat document in Firestore
const updateChatDocument = async (chatId, messages) => {
    try {
        const chatRef = doc(db, "chats", chatId);
        const chatDoc = await getDoc(chatRef);
        if (chatDoc.exists()) {
            await updateDoc(chatRef, { messages: arrayUnion(...messages) });
        } else {
            await setDoc(chatRef, { messages, users: [] });
        }
        console.log(`Chat document ${chatId} updated successfully`);
    } catch (error) {
        console.error(`Error updating chat document ${chatId}:`, error);
    }
};

// Update user status
const updateUserStatus = async (username, status) => {
    try {
        const userRef = doc(db, "users", username);
        await updateDoc(userRef, { isActive: status });
        console.log(`User ${username} status updated to ${status}`);
    } catch (error) {
        console.error("Error updating user status:", error);
    }
};

// Add default chats to users
const updateUsersWithDefaultChats = () => {
    const users = readUsers();
    users.forEach(user => {
        const missingChats = DEFAULT_CHATS.filter(chat => !user.chats.includes(chat));
        if (missingChats.length > 0) {
            user.chats = [...new Set([...user.chats, ...DEFAULT_CHATS])];
        }
    });
    writeUsers(users);
};

// Initialize chats and update users
initializeDefaultChats();
updateUsersWithDefaultChats();

// Sign-up route
app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ message: 'Missing required fields' });

    const users = readUsers();
    if (users.find(user => user.email === email)) return res.status(400).json({ message: 'User already exists' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await setDoc(doc(db, "users", username), {
            username,
            email,
            password: hashedPassword,
            chats: DEFAULT_CHATS,
            isActive: true
        });
        console.log("Document successfully written with username:", username);
        res.status(201).json({ message: 'User created successfully' });
    } catch (e) {
        console.error("Error adding document:", e);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Login route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) return res.status(400).json({ message: 'Invalid credentials' });

        const user = querySnapshot.docs[0].data();
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ email: user.email, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ token, username: user.username });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
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

// Fetch user chats
app.get('/userChats', authenticateToken, async (req, res) => {
    try {
        const q = query(collection(db, "users"), where("email", "==", req.user.email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) return res.status(404).json({ message: 'User not found' });

        res.json({ chats: querySnapshot.docs[0].data().chats });
    } catch (error) {
        console.error("Error fetching user chats:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get chat details
app.get('/chat/:chatId', async (req, res) => {
    try {
        const chatDoc = await getDoc(doc(db, "chats", req.params.chatId));
        if (chatDoc.exists()) {
            res.json(chatDoc.data());
        } else {
            res.status(404).json({ message: 'Chat not found' });
        }
    } catch (error) {
        console.error("Error fetching chat data:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Socket.io authentication
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
        socket.user = user;
        next();
    });
});

// Socket.io events
io.on('connection', (socket) => {
    console.log('A user connected');
    updateUserStatus(socket.user.username, true);

    const updateUsers = async () => {
        try {
            const usersSnapshot = await getDocs(collection(db, "users"));
            const users = usersSnapshot.docs.map(doc => ({
                username: doc.data().username,
                isActive: doc.data().isActive ?? false
            }));
            socket.emit('updateUsers', users);
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    updateUsers();

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        updateUserStatus(socket.user.username, false);
        updateUsers();
    });

    socket.on('joinChat', async (chatId) => {
        socket.join(chatId);
        try {
            const chatFilePath = path.join(CHATS_DIR, `${chatId}.json`);
            if (!fs.existsSync(chatFilePath)) fs.writeFileSync(chatFilePath, JSON.stringify([]));

            const chatMessages = JSON.parse(fs.readFileSync(chatFilePath));
            socket.emit('chatMessages', chatMessages);
        } catch (error) {
            console.error("Error joining chat:", error);
        }
    });

    socket.on('sendMessage', async (chatId, message) => {
        try {
            const chatFilePath = path.join(CHATS_DIR, `${chatId}.json`);
            const chatMessages = JSON.parse(fs.readFileSync(chatFilePath));
            chatMessages.push(message);
            fs.writeFileSync(chatFilePath, JSON.stringify(chatMessages, null, 2));

            // Update Firestore
            await updateChatDocument(chatId, [message]);
            io.to(chatId).emit('newMessage', message);
        } catch (error) {
            console.error("Error sending message:", error);
        }
    });
});

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
