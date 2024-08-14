const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc, updateDoc, getDoc, collection, query, where, getDocs, arrayUnion } = require('firebase/firestore'); 

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const SECRET_KEY = 'your_secret_key'; // Use a secure key in production

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

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

// Utility functions
const USERS_FILE = path.join(__dirname, 'users.json');
const CHATS_DIR = path.join(__dirname, 'chats');
const DEFAULT_CHATS = ['general', 'homework', 'counting'];

const readUsers = () => {
    if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([]));
    return JSON.parse(fs.readFileSync(USERS_FILE));
};

const writeUsers = (users) => fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

if (!fs.existsSync(CHATS_DIR)) fs.mkdirSync(CHATS_DIR);
DEFAULT_CHATS.forEach(chat => {
    if (!fs.existsSync(path.join(CHATS_DIR, `${chat}.json`))) fs.writeFileSync(path.join(CHATS_DIR, `${chat}.json`), JSON.stringify([]));
});

// Real-time chat logic
io.on('connection', socket => {
    console.log('A user connected');
    socket.on('joinChat', async ({ chatId, username }) => {
        socket.join(chatId);
        await updateChatFile(chatId, [username]);
        io.to(chatId).emit('message', `${username} has joined the chat`);
    });

    socket.on('sendMessage', async ({ chatId, username, message }) => {
        const timestamp = new Date().toISOString();
        const chatFilePath = path.join(CHATS_DIR, `${chatId}.json`);
        const chatData = JSON.parse(fs.readFileSync(chatFilePath));

        chatData.push({ username, message, timestamp });
        fs.writeFileSync(chatFilePath, JSON.stringify(chatData, null, 2));

        io.to(chatId).emit('message', { username, message, timestamp });
        await updateChatDocument(chatId, [{ username, message, timestamp }]);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Token-based authentication
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.sendStatus(403);
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Update Firestore chat document with new messages
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

// Update user status in Firestore
const updateUserStatus = async (username, status) => {
    try {
        const userRef = doc(db, "users", username);
        await updateDoc(userRef, { isActive: status });
        console.log(`User ${username} status updated to ${status}`);
    } catch (error) {
        console.error("Error updating user status: ", error);
    }
};

// Add chat to user in Firestore
const addChatToUser = async (userEmail, chatId) => {
    try {
        const usersSnapshot = await getDocs(query(collection(db, "users"), where("email", "==", userEmail)));
        if (usersSnapshot.empty) return console.log("User not found");

        const userDoc = usersSnapshot.docs[0];
        const userRef = doc(db, "users", userDoc.id);

        await updateDoc(userRef, { chats: arrayUnion(chatId) });

        const chatRef = doc(db, "chats", chatId);
        await updateDoc(chatRef, { users: arrayUnion(userDoc.data().username) });

        console.log(`Chat ID ${chatId} added to user ${userDoc.data().username}'s chats`);
    } catch (error) {
        console.error("Error adding chat to user: ", error);
    }
};

// User routes
app.post('/signup', async (req, res) => {
    const { fullname, schoolmail, username, email, password } = req.body;

    if (!fullname || !schoolmail || !username || !email || !password) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const users = readUsers();
    if (users.find(user => user.email === email)) return res.status(400).json({ message: 'User already exists' });

    const namePrefix = fullname.slice(0, 3).toLowerCase();
    const emailPrefix = schoolmail.slice(0, 3).toLowerCase();
    const emailSuffix = schoolmail.slice(-12).toLowerCase();

    if (emailSuffix !== "@fusdk12.net" || namePrefix !== emailPrefix) {
        return res.status(400).json({ message: 'Invalid email or fullname' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await setDoc(doc(db, "users", username), {
            fullname, schoolmail, username, email,
            password: hashedPassword, chats: DEFAULT_CHATS,
            isActive: true, streak: [0, new Date().toISOString()], verify: true
        });

        const token = jwt.sign({ username, email }, SECRET_KEY, { expiresIn: '1h' });
        res.status(201).json({ message: 'User created successfully', token });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const q = query(collection(db, "users"), where("email", "==", email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) return res.status(400).json({ message: 'Invalid email or password' });

        const user = querySnapshot.docs[0].data();
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' });

        const token = jwt.sign({ username: user.username, email }, SECRET_KEY, { expiresIn: '1h' });
        res.status(200).json({ message: 'Login successful', token });

        await updateUserStatus(user.username, true);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/logout', authenticateToken, async (req, res) => {
    const username = req.user.username;
    try {
        await updateUserStatus(username, false);
        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Chat routes
app.post('/createChat', authenticateToken, async (req, res) => {
    const { chatId } = req.body;
    const username = req.user.username;

    if (!chatId) return res.status(400).json({ message: 'Chat ID is required' });

    try {
        await setDoc(doc(db, "chats", chatId), { messages: [], users: [username] });
        await addChatToUser(req.user.email, chatId);
        res.status(201).json({ message: `Chat ${chatId} created successfully` });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/userChats', authenticateToken, async (req, res) => {
    const username = req.user.username;

    try {
        const userRef = doc(db, "users", username);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) return res.status(404).json({ message: 'User not found' });

        res.json({ chats: userDoc.data().chats });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Server listen
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
