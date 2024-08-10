const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, doc, setDoc, query, where, getDoc } = require("firebase/firestore");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const SECRET_KEY = 'your_secret_key'; // Use a secure key in production

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// Firebase setup
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

// Directories and files
const USERS_FILE = path.join(__dirname, 'users.json');
const CHATS_DIR = path.join(__dirname, 'chats');

// Ensure the chats directory exists
if (!fs.existsSync(CHATS_DIR)) {
    fs.mkdirSync(CHATS_DIR);
}

// Default chats
const DEFAULT_CHATS = ['general', 'homework', 'counting'];

// Utility function to read user data
const readUsers = async () => {
    const usersCollection = collection(db, "users");
    const userDocs = await getDocs(usersCollection);
    return userDocs.docs.map(doc => doc.data());
};

// Write user data to Firestore
const writeUser = async (username, userData) => {
    const userDoc = doc(db, "users", username);
    await setDoc(userDoc, userData);
};

// Update isActive status of a user
const updateUserStatus = async (username, status) => {
    const userDoc = doc(db, "users", username);
    await setDoc(userDoc, { isActive: status }, { merge: true });
};

// Initialize default chats
const initializeDefaultChats = () => {
    DEFAULT_CHATS.forEach(chatName => {
        const chatFilePath = path.join(CHATS_DIR, `${chatName}.json`);
        if (!fs.existsSync(chatFilePath)) {
            fs.writeFileSync(chatFilePath, JSON.stringify([]));
        }
    });
};

// Initialize default chats for a specific user
const initializeDefaultChatsForUser = async (username) => {
    const defaultChats = ['general', 'homework', 'counting'];
    const users = await readUsers();
    const user = users.find(u => u.username === username);

    if (user) {
        // Ensure the user has the default chats
        const missingChats = defaultChats.filter(chat => !user.chats.includes(chat));
        user.chats = [...new Set([...user.chats, ...missingChats])];
        await writeUser(user.username, user);
        console.log(`Default chats assigned to user ${username}`);
    }
};

// Update users with default chats
const updateUsersWithDefaultChats = async () => {
    const users = await readUsers();
    users.forEach(async user => {
        if (!user.chats) {
            user.chats = [];
        }

        const missingChats = DEFAULT_CHATS.filter(chat => !user.chats.includes(chat));
        if (missingChats.length > 0) {
            user.chats = [...new Set([...user.chats, ...DEFAULT_CHATS])];

            if (user.username) {
                await writeUser(user.username, user);
            } else {
                console.error("User has no username:", user);
            }
        }
    });
    console.log("Users updated with default chats");
};

// Initialize default chats and update existing users at startup
initializeDefaultChats();
updateUsersWithDefaultChats();

// Update the chat file with new users
const updateChatFile = (chatId, users) => {
    const chatFilePath = path.join(CHATS_DIR, `${chatId}.json`);

    fs.readFile(chatFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Error reading chat file ${chatId}.json:`, err);
            return;
        }

        try {
            let cleanData = data.replace(/[\u0000-\u0019]+/g, "");
            let chatData = JSON.parse(cleanData);

            if (!Array.isArray(chatData)) {
                chatData = [chatData];
            }

            let usersSection = chatData.find(section => section.users !== undefined);

            if (!usersSection) {
                usersSection = { users: [] };
                chatData.push(usersSection);
            }

            users.forEach(username => {
                if (!usersSection.users.includes(username)) {
                    usersSection.users.push(username);
                }
            });

            fs.writeFile(chatFilePath, JSON.stringify(chatData, null, 2), 'utf8', err => {
                if (err) {
                    console.error(`Error writing to chat file ${chatId}.json:`, err);
                } else {
                    console.log(`Users added to chat ${chatId}.json:`, users);
                }
            });
        } catch (parseErr) {
            console.error(`Error parsing chat file ${chatId}.json:`, parseErr);
            console.error(`Problematic content:\n${data}`);
        }
    });
};

// Add chat to user's chats
const addChatToUser = async (userEmail, chatId) => {
    const usersCollection = collection(db, "users");
    const userQuery = query(usersCollection, where("email", "==", userEmail));
    const querySnapshot = await getDocs(userQuery);
    
    if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        
        const userChats = new Set(userData.chats || []);
        userChats.add(chatId);
        
        await setDoc(userDoc.ref, { chats: Array.from(userChats) }, { merge: true });
        
        // Update the chat file with the new user
        updateChatFile(chatId, [userData.username]);
    }
};

// Sign-up route
app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
    const users = await readUsers();

    if (users.find(user => user.email === email)) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { username, email, password: hashedPassword, chats: [] };

    await addChatToUser(email, DEFAULT_CHATS[0]); // Add user to the default 'general' chat
    await writeUser(username, newUser);

    res.status(201).json({ message: 'User created' });
});

// Login route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const users = await readUsers();
    const user = users.find(user => user.email === email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ email: user.email, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token, username: user.username });
});

// Middleware to check authentication
const authenticateToken = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, async (err, decodedUser) => {
        if (err) return res.sendStatus(403);

        const userDoc = await getDoc(doc(db, "users", decodedUser.username));
        if (!userDoc.exists()) return res.sendStatus(403);

        req.user = userDoc.data();
        next();
    });
};

// Fetch user chats
app.get('/userChats', authenticateToken, async (req, res) => {
    const users = await readUsers();
    const user = users.find(user => user.email === req.user.email);

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
        console.log('Authenticated user:', user);
        socket.user = user;
        next();
    });
});

// On user connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Update user status to active
    updateUserStatus(socket.user.username, true);

    // Notify all clients about the user list update
    socket.on('updateUserList', async (chatId) => {
        const chatFilePath = path.join(CHATS_DIR, `${chatId}.json`);
        fs.readFile(chatFilePath, 'utf8', (err, data) => {
            if (err) {
                console.error(`Error reading chat file ${chatId}.json:`, err);
                return;
            }

            let chatData;
            try {
                chatData = JSON.parse(data);
                if (!Array.isArray(chatData)) {
                    chatData = [chatData];
                }
            } catch (parseErr) {
                console.error(`Error parsing chat file ${chatId}.json:`, parseErr);
                console.error(`Problematic content:\n${data}`);
                return;
            }

            const usersSection = chatData.find(section => section.users !== undefined);
            if (usersSection) {
                io.to(socket.id).emit('updateUserList', usersSection.users);
            }
        });
    });

    // Handle new messages
    socket.on('newMessage', async ({ chatId, message }) => {
        const chatFilePath = path.join(CHATS_DIR, `${chatId}.json`);
        fs.readFile(chatFilePath, 'utf8', (err, data) => {
            if (err) {
                console.error(`Error reading chat file ${chatId}.json:`, err);
                return;
            }

            let chatData;
            try {
                chatData = JSON.parse(data);
                if (!Array.isArray(chatData)) {
                    chatData = [chatData];
                }
            } catch (parseErr) {
                console.error(`Error parsing chat file ${chatId}.json:`, parseErr);
                console.error(`Problematic content:\n${data}`);
                return;
            }

            const messagesSection = chatData.find(section => section.messages !== undefined);
            if (!messagesSection) {
                messagesSection = { messages: [] };
                chatData.push(messagesSection);
            }

            messagesSection.messages.push({ user: socket.user.username, message });
            fs.writeFile(chatFilePath, JSON.stringify(chatData, null, 2), 'utf8', err => {
                if (err) {
                    console.error(`Error writing to chat file ${chatId}.json:`, err);
                } else {
                    io.to(chatId).emit('newMessage', { user: socket.user.username, message });
                }
            });
        });
    });

    // On user disconnect
    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
        updateUserStatus(socket.user.username, false);
    });
});

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
