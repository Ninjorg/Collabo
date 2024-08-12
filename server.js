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
const { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, arrayUnion, collection, query, where, getDocs } = require('firebase/firestore');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const multer = require('multer');

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
app.use(bodyParser.urlencoded({ extended: true }));

// Rate limiter to prevent abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // Limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Session management
app.use(session({
    secret: 'your_session_secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// File upload setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

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

// Create a new chat room
const createChatRoom = (chatName) => {
    const chatFilePath = path.join(CHATS_DIR, `${chatName}.json`);
    if (!fs.existsSync(chatFilePath)) {
        fs.writeFileSync(chatFilePath, JSON.stringify([]));
        console.log(`Chat room ${chatName} created.`);
    }
};

// Initialize chats and update users
initializeDefaultChats();

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
            isActive: true,
            avatar: null
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

        req.session.user = { email: user.email, username: user.username };
        res.json({ message: 'Login successful', username: user.username });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Middleware to check authentication
const authenticateToken = (req, res, next) => {
    if (!req.session.user) return res.sendStatus(401);
    next();
};

// File upload route
app.post('/upload', authenticateToken, upload.single('avatar'), (req, res) => {
    const { filename } = req.file;
    updateUserAvatar(req.session.user.username, filename);
    res.json({ message: 'File uploaded successfully', filename });
});

// Update user avatar in Firestore
const updateUserAvatar = async (username, avatar) => {
    try {
        const userRef = doc(db, "users", username);
        await updateDoc(userRef, { avatar });
        console.log(`User ${username}'s avatar updated to ${avatar}`);
    } catch (error) {
        console.error("Error updating user avatar:", error);
    }
};

// Create a new chat room
app.post('/createChat', authenticateToken, (req, res) => {
    const { chatName } = req.body;
    if (!chatName) return res.status(400).json({ message: 'Chat name is required' });

    createChatRoom(chatName);
    res.json({ message: `Chat room ${chatName} created` });
});

// Fetch user chats
app.get('/userChats', authenticateToken, async (req, res) => {
    try {
        const q = query(collection(db, "users"), where("email", "==", req.session.user.email));
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
    if (!token) return next(new Error('Authentication error'));

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return next(new Error('Authentication error'));
        socket.user = decoded;
        next();
    });
});

// Socket.io events
io.on('connection', (socket) => {
    console.log('User connected:', socket.user.username);

    socket.on('joinChat', async (chatId) => {
        try {
            socket.join(chatId);
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

    socket.on('deleteMessage', async (chatId, messageId) => {
        try {
            const chatFilePath = path.join(CHATS_DIR, `${chatId}.json`);
            const chatMessages = JSON.parse(fs.readFileSync(chatFilePath));
            const updatedMessages = chatMessages.filter(msg => msg.id !== messageId);
            fs.writeFileSync(chatFilePath, JSON.stringify(updatedMessages, null, 2));

            // Update Firestore
            await updateChatDocument(chatId, updatedMessages);
            io.to(chatId).emit('messageDeleted', messageId);
        } catch (error) {
            console.error("Error deleting message:", error);
        }
    });
});

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
