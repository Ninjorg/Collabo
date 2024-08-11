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

const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc} = require("firebase/firestore");
const { collection, query, where, getDocs, getDoc, updateDoc, arrayUnion } = require('firebase/firestore');   // For Firestore

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

// User data file
const USERS_FILE = path.join(__dirname, 'users.json');
const CHATS_DIR = path.join(__dirname, 'chats');

// Ensure the chats directory exists
if (!fs.existsSync(CHATS_DIR)) {
    fs.mkdirSync(CHATS_DIR);
}

// Default chats
const DEFAULT_CHATS = ['general', 'homework', 'counting'];

// Utility function to read user data
const readUsers = () => {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify([]));
    }
    return JSON.parse(fs.readFileSync(USERS_FILE));
};

async function getUserChats(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            throw new Error('User not found');
        }
        const userData = userDoc.data();
        return userData.chats || [];
    } catch (error) {
        console.error('Error fetching user chats:', error);
        return [];
    }
}



const writeUsers = (users) => {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

// Function to update Firestore with chat messages
const updateChatDocument = async (chatId, messages) => {
    try {
        const chatRef = doc(db, "chats", chatId);

        // Get the current chat document
        const chatDoc = await getDoc(chatRef);
        
        if (chatDoc.exists()) {
            // If the document exists, update it with new messages
            await updateDoc(chatRef, {
                messages: arrayUnion(...messages)
            });
        } else {
            // If the document does not exist, create a new one
            await setDoc(chatRef, {
                messages: messages,
                users: []
            });
        }

        console.log(`Chat document ${chatId} updated successfully`);
    } catch (error) {
        console.error(`Error updating chat document ${chatId}:`, error);
    }
};

// Update isActive status of a user
const updateUserStatus = async (username, status) => {
    try {
        // Reference to the user document in Firestore by username
        const userRef = doc(db, "users", username);

        // Update the isActive status of the user
        await updateDoc(userRef, {
            isActive: status
        });

        console.log(`User ${username} status updated to ${status}`);
    } catch (error) {
        console.error("Error updating user status: ", error);
    }
};

// Initialize default chats and update existing users
const initializeDefaultChats = () => {
    DEFAULT_CHATS.forEach(chatName => {
        const chatFilePath = path.join(CHATS_DIR, `${chatName}.json`);
        if (!fs.existsSync(chatFilePath)) {
            fs.writeFileSync(chatFilePath, JSON.stringify([]));
        }
    });
};

const initializeDefaultChatsForUser = (username) => {
    const defaultChats = ['general', 'homework', 'counting'];
    const users = readUsers();
    const user = users.find(u => u.username === username);

    if (user) {
        // Ensure the user has the default chats
        const missingChats = defaultChats.filter(chat => !user.chats.includes(chat));
        user.chats = [...new Set([...user.chats, ...missingChats])];
        writeUsers(users);
        console.log(`Default chats assigned to user ${username}`);
    }
};

// Add default chats to users who don't already have them
const updateUsersWithDefaultChats = () => {
    const users = readUsers();
    users.forEach(user => {
        const missingChats = DEFAULT_CHATS.filter(chat => !user.chats.includes(chat));
        if (missingChats.length > 0) {
            user.chats = [...new Set([...user.chats, ...DEFAULT_CHATS])];
        }
    });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

// Initialize default chats and update existing users at startup
initializeDefaultChats();
updateUsersWithDefaultChats();

// Function to update the chat file
const updateChatFile = (chatId, users) => {
    const chatFilePath = path.join(CHATS_DIR, `${chatId}.json`);

    fs.readFile(chatFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Error reading chat file ${chatId}.json:`, err);
            return;
        }

        try {
            // Clean the JSON data by removing unexpected characters if possible
            let cleanData = data.replace(/[\u0000-\u0019]+/g, ""); // Remove control characters

            // Parse the chat JSON data
            let chatData = JSON.parse(cleanData);

            // Ensure chatData is an array
            if (!Array.isArray(chatData)) {
                chatData = [chatData];
            }

            // Find the users section
            let usersSection = chatData.find(section => section.users !== undefined);

            if (!usersSection) {
                usersSection = { users: [] };
                chatData.push(usersSection);
            }

            // Add new users to the users section
            users.forEach(username => {
                if (!usersSection.users.includes(username)) {
                    usersSection.users.push(username);
                }
            });

            // Write the updated data back to the file
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
    try {
        // Find the user document by searching through all users in the "users" collection
        const usersSnapshot = await getDocs(collection(db, "users"));
        let userDocRef = null;
        let userData = null;

        usersSnapshot.forEach(doc => {
            if (doc.data().email === userEmail) {
                userDocRef = doc.ref;
                userData = doc.data();
            }
        });

        if (userDocRef && userData) {
            // Add the chat ID to the user's chats array using arrayUnion to ensure it's unique
            await updateDoc(userDocRef, {
                chats: arrayUnion(chatId)
            });

            console.log(`Chat ID ${chatId} added to user ${userData.username}'s chats`);

            // Optionally update the chat document with the new user
            const chatRef = doc(db, "chats", chatId);
            await updateDoc(chatRef, {
                users: arrayUnion(userData.username)
            });
        } else {
            console.log("User not found");
        }
    } catch (error) {
        console.error("Error adding chat to user: ", error);
    }
};



// Sign-up route
app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const users = readUsers();

    if (users.find(user => user.email === email)) {
        return res.status(400).json({ message: 'User already exists' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const userRef = doc(db, "users", username);

        await setDoc(userRef, {
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


const updateChatsWithUsers = async () => {
    try {
        // Retrieve all users from Firestore
        const usersSnapshot = await getDocs(collection(db, "users"));
        
        // Iterate over each user
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const username = userData.username;
            const chats = userData.chats || [];
            
            // Iterate over each chat ID for the user
            for (const chatId of chats) {
                const chatRef = doc(db, "chats", chatId);

                // Retrieve the current chat document
                const chatDoc = await getDoc(chatRef);

                if (chatDoc.exists()) {
                    // If the document exists, update it with the new user
                    await updateDoc(chatRef, {
                        users: arrayUnion(username)
                    });

                    console.log(`Added user ${username} to chat ${chatId}`);
                } else {
                    // If the document does not exist, create it
                    await setDoc(chatRef, {
                        messages: [],
                        users: [username]
                    });

                    console.log(`Created new chat ${chatId} with user ${username}`);
                }
            }
        }
    } catch (error) {
        console.error("Error updating chats with users:", error);
    }
};

// Call the function to update the chats with users
updateChatsWithUsers();


// Login route


app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const userDoc = querySnapshot.docs[0];
        const user = userDoc.data();

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ email: user.email, username: user.username }, SECRET_KEY, { expiresIn: '1h' });

        res.json({ token, username: user.username });
    } catch (error) {
        console.error("Error during login: ", error);
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
        // Query Firestore to find the user document by email
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("email", "==", req.user.email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Assuming email is unique, get the first matching user document
        const userDoc = querySnapshot.docs[0];
        const user = userDoc.data();

        // Respond with the user's chat data
        res.json({ chats: user.chats });
    } catch (error) {
        console.error("Error fetching user chats: ", error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/chat/:chatId', async (req, res) => {
    const chatId = req.params.chatId;

    try {
        const chatDoc = await getDoc(doc(db, "chats", chatId));

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
    console.log('A user connected');
    updateUserStatus(socket.user.username, true);

    // Function to get and emit users
    const updateUsers = async () => {
    try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const users = usersSnapshot.docs.map(doc => {
            const data = doc.data();
            console.log(`User data for ${doc.id}:`, data); // Debugging line
            return {
                username: data.username,
                isActive: data.isActive ?? false, // Default to false if isActive is undefined
            };
        });

        // Emit users to the client
        socket.emit('updateUsers', users);
        console.log(updateUsers, users);
    } catch (error) {
        console.error("Error fetching users: ", error);
    }
};

    // Call updateUsers when a new user connects
    updateUsers();


    // Handle user disconnection
    socket.on('disconnect', function () {
        console.log('User disconnected:', socket.id);

        // Update user status to inactive
        updateUserStatus(socket.user.username, false);

        // Notify all clients about the user list update
        const users = readUsers();
        updateUsers();
    });

    // Handle joining a chat
    socket.on('joinChat', async (chatId) => {
        socket.join(chatId);
        await addChatToUser(socket.user.email, chatId);
        console.log(`User ${socket.user.username} joined chat ${chatId}`);
        
        // Fetch and emit chat messages from Firestore
        try {
            const chatRef = doc(db, "chats", chatId);
            const chatDoc = await getDoc(chatRef);
            
            if (chatDoc.exists()) {
                const chatData = chatDoc.data();
                socket.emit('loadMessages', chatData.messages || []);
            } else {
                console.log(`Chat ${chatId} does not exist`);
                socket.emit('loadMessages', []);
            }
        } catch (error) {
            console.error(`Error loading messages for chat ${chatId}:`, error);
        }
        updateUsers();
    });

    // Handle sending a message
    socket.on('sendMessage', async ({ chatId, message }) => {
        const timestamp = new Date().toISOString();
        const messageObject = { chatId, username: socket.user.username, message, timestamp };
    
        try {
            // Save message to Firestore
            const chatRef = doc(db, "chats", chatId);
            await updateChatDocument(chatId, [messageObject]);
    
            // Emit message to chat
            io.emit('receiveMessage', messageObject);
            console.log(messageObject);
            // io.emit('receiveMessage', message);
    
        } catch (error) {
            console.error(`Error sending message to chat ${chatId}:`, error);
        }
        updateUsers();
    });
    
});


// Start the server
const PORT = 4000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});