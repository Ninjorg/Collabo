const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, deleteDoc, collection, query, where, getDocs } = require("firebase/firestore");

// Initialize Express and Server
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Firebase Configuration
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

// Secret Key for JWT
const SECRET_KEY = 'your_secret_key'; // Use a secure key in production

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// Constants
const USERS_FILE = path.join(__dirname, 'users.json');
const CHATS_DIR = path.join(__dirname, 'chats');
const DEFAULT_CHATS = ['general', 'homework', 'counting'];

// Ensure the chats directory exists
if (!fs.existsSync(CHATS_DIR)) {
    fs.mkdirSync(CHATS_DIR);
}

// Utility Functions
const readUsers = () => {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify([]));
    }
    return JSON.parse(fs.readFileSync(USERS_FILE));
};

const writeUsers = (users) => {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

const sanitizeMessage = (msg) => {
    const offensivePattern = /\b(n[\s'_\-]*i[\s'_\-]*g[\s'_\-]*g[\s'_\-]*a|n[\s'_\-]*i[\s'_\-]*g[\s'_\-]*g[\s'_\-]*r|n[\s'_\-]*i[\s'_\-]*g[\s'_\-]*g[\s'_\-]*e[\s'_\-]*r)\b/gi;
    return msg.replace(offensivePattern, 'ninja');
};

// Firestore Functions
const updateChatNotification = async (username, chatId, increment = 1) => {
    try {
        const userRef = doc(db, 'users', username);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            let userChats = userDoc.data().chats || [];
            const chatIndex = userChats.findIndex(chat => chat.id === chatId);

            if (chatIndex > -1) {
                userChats[chatIndex].notification += increment;
            } else {
                userChats.push({ id: chatId, notification: increment });
            }

            await updateDoc(userRef, { chats: userChats });
            console.log(`Notification updated for user ${username} in chat ${chatId}`);
        } else {
            console.error(`User ${username} not found`);
        }
    } catch (error) {
        console.error('Error updating chat notifications:', error);
    }
};

const resetChatNotification = async (username, chatId) => {
    try {
        const userRef = doc(db, 'users', username);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            let userChats = userDoc.data().chats || [];
            const chatIndex = userChats.findIndex(chat => chat.id === chatId);

            if (chatIndex > -1) {
                userChats[chatIndex].notification = 0;
                await updateDoc(userRef, { chats: userChats });
                console.log(`Notification reset for user ${username} in chat ${chatId}`);
            }
        } else {
            console.error(`User ${username} not found`);
        }
    } catch (error) {
        console.error('Error resetting chat notifications:', error);
    }
};

const handleMessageSend = async (chatId, senderUsername, message) => {
    try {
        const chatRef = doc(db, 'chats', chatId);
        const chatDoc = await getDoc(chatRef);

        if (chatDoc.exists()) {
            const sanitizedMessage = sanitizeMessage(message);
            await updateDoc(chatRef, {
                messages: arrayUnion({ sender: senderUsername, text: sanitizedMessage })
            });

            const users = chatDoc.data().users || [];
            for (const user of users) {
                if (user !== senderUsername) {
                    await updateChatNotification(user, chatId);
                }
            }

            console.log(`Message sent in chat ${chatId} by ${senderUsername}`);
        } else {
            console.error(`Chat ${chatId} not found`);
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }
};

const updateChatDocument = async (chatId, messages, username) => {
    try {
        const chatRef = doc(db, "chats", chatId);
        const chatDoc = await getDoc(chatRef);

        if (chatDoc.exists()) {
            await updateDoc(chatRef, {
                messages: arrayUnion(...messages)
            });
        } else {
            await setDoc(chatRef, {
                admin: username,
                name: chatId,
                messages: messages,
                users: [username]
            });
        }

        const updatedChatDoc = await getDoc(chatRef);
        const users = updatedChatDoc.data().users;

        for (const user of users) {
            await addChatToUser(user, chatId);
        }

        console.log(`Chat document ${chatId} updated successfully`);
    } catch (error) {
        console.error(`Error updating chat document ${chatId}:`, error);
    }
};

const updateUserStatus = async (username, status) => {
    try {
        const userRef = doc(db, "users", username);
        await updateDoc(userRef, { isActive: status });
        console.log(`User ${username} status updated to ${status}`);
    } catch (error) {
        console.error("Error updating user status: ", error);
    }
};

const addChatToUser = async (user, chatId) => {
    try {
        const userRef = doc(db, 'users', user);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            const userChats = userDoc.data().chats || [];
            const chatExists = userChats.some(chat => chat.id === chatId);

            if (!chatExists) {
                userChats.push({ id: chatId, notification: 0 });
                await updateDoc(userRef, { chats: userChats });
                console.log(`Chat ID ${chatId} added to user ${user} with notifications set to 0`);
            } else {
                console.log(`Chat ID ${chatId} already exists for user ${user}`);
            }
        } else {
            console.error(`User ${user} not found`);
        }
    } catch (error) {
        console.error('Error updating user chats:', error);
    }
};

const deleteOldDMChats = async (user1, user2, keepChatId) => {
    try {
        const q = query(
            collection(db, 'chats'),
            where('isDM', '==', true),
            where('users', 'array-contains-any', [user1, user2])
        );

        const querySnapshot = await getDocs(q);

        querySnapshot.forEach(async (doc) => {
            const chatData = doc.data();
            const chatId = chatData.chatId;

            if (chatId !== keepChatId) {
                console.log(`Deleting old DM chat ${chatId}`);
                await deleteDoc(doc.ref);
                await removeChatFromUser(user1, chatId);
                await removeChatFromUser(user2, chatId);
            }
        });
    } catch (error) {
        console.error('Error deleting old DM chats:', error);
    }
};

const removeChatFromUser = async (username, chatId) => {
    try {
        const userRef = doc(db, 'users', username);
        await updateDoc(userRef, { chats: arrayRemove({ id: chatId }) });
        console.log(`Removed chat ${chatId} from user ${username}`);
    } catch (error) {
        console.error(`Error removing chat ${chatId} from user ${username}:`, error);
    }
};

// Route Handlers
app.post('/checkDM', async (req, res) => {
    try {
        const { users } = req.body;

        if (!users || !Array.isArray(users) || users.length !== 2) {
            return res.status(400).json({ message: 'Invalid request data' });
        }

        const [user1, user2] = users;

        const q = query(
            collection(db, 'chats'),
            where('isDM', '==', true),
            where('users', 'array-contains-any', [user1, user2])
        );

        const querySnapshot = await getDocs(q);
        const chatIds = [];

        querySnapshot.forEach(doc => {
            const chatData = doc.data();
            chatIds.push(chatData.chatId);
        });

        if (chatIds.length === 0) {
            return res.status(404).json({ message: 'No DM chat found' });
        }

        res.status(200).json({ chatIds });
    } catch (error) {
        console.error('Error checking DM chat:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.post('/createChat', async (req, res) => {
    try {
        const { chatId, messages, username } = req.body;

        if (!chatId || !messages || !Array.isArray(messages) || !username) {
            return res.status(400).json({ message: 'Invalid request data' });
        }

        await updateChatDocument(chatId, messages, username);
        res.status(200).json({ message: 'Chat created/updated successfully' });
    } catch (error) {
        console.error('Error creating chat:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.post('/deleteChat', async (req, res) => {
    try {
        const { chatId } = req.body;

        if (!chatId) {
            return res.status(400).json({ message: 'Chat ID is required' });
        }

        const chatRef = doc(db, 'chats', chatId);
        const chatDoc = await getDoc(chatRef);

        if (chatDoc.exists()) {
            const chatData = chatDoc.data();
            const users = chatData.users || [];

            for (const user of users) {
                await removeChatFromUser(user, chatId);
            }

            await deleteDoc(chatRef);
            res.status(200).json({ message: 'Chat deleted successfully' });
        } else {
            res.status(404).json({ message: 'Chat not found' });
        }
    } catch (error) {
        console.error('Error deleting chat:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.post('/sendMessage', async (req, res) => {
    try {
        const { chatId, senderUsername, message } = req.body;

        if (!chatId || !senderUsername || !message) {
            return res.status(400).json({ message: 'Invalid request data' });
        }

        await handleMessageSend(chatId, senderUsername, message);
        res.status(200).json({ message: 'Message sent successfully' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const users = readUsers();
        const user = users.find(u => u.username === username);

        if (user && await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '1h' });
            res.status(200).json({ token });
        } else {
            res.status(401).json({ message: 'Invalid username or password' });
        }
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const users = readUsers();
        const existingUser = users.find(u => u.username === username);

        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        users.push({ username, password: hashedPassword });
        writeUsers(users);

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.post('/updateUserStatus', async (req, res) => {
    try {
        const { username, status } = req.body;

        if (!username || typeof status !== 'boolean') {
            return res.status(400).json({ message: 'Invalid request data' });
        }

        await updateUserStatus(username, status);
        res.status(200).json({ message: 'User status updated successfully' });
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.post('/addChatToUser', async (req, res) => {
    try {
        const { user, chatId } = req.body;

        if (!user || !chatId) {
            return res.status(400).json({ message: 'Invalid request data' });
        }

        await addChatToUser(user, chatId);
        res.status(200).json({ message: 'Chat added to user successfully' });
    } catch (error) {
        console.error('Error adding chat to user:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.post('/deleteOldDMChats', async (req, res) => {
    try {
        const { user1, user2, keepChatId } = req.body;

        if (!user1 || !user2 || !keepChatId) {
            return res.status(400).json({ message: 'Invalid request data' });
        }

        await deleteOldDMChats(user1, user2, keepChatId);
        res.status(200).json({ message: 'Old DM chats deleted successfully' });
    } catch (error) {
        console.error('Error deleting old DM chats:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Socket.io Events
io.on('connection', (socket) => {
    console.log('New user connected');

    socket.on('joinChat', async (chatId) => {
        socket.join(chatId);
        console.log(`User joined chat ${chatId}`);
    });

    socket.on('leaveChat', async (chatId) => {
        socket.leave(chatId);
        console.log(`User left chat ${chatId}`);
    });

    socket.on('sendMessage', async (chatId, senderUsername, message) => {
        await handleMessageSend(chatId, senderUsername, message);
        io.to(chatId).emit('newMessage', { sender: senderUsername, text: message });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Start Server
server.listen(4000, () => {
    console.log('Server running on port 4000');
});
