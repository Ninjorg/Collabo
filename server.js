

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
const { collection, query, where, getDocs, getDoc, updateDoc, arrayUnion, arrayRemove } = require('firebase/firestore');   // For Firestore

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
const handleMessageSend = async (chatId, senderUsername, message, timestamp) => {
    try {
        const chatRef = doc(db, 'chats', chatId);
        const chatDoc = await getDoc(chatRef);

        if (chatDoc.exists()) {
            await updateDoc(chatRef, {
                messages: arrayUnion({ sender: senderUsername, text: message })
            });

            // Notify all users in the chat except the sender
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
                users: [username]  // Add the current user as part of the chat
            });
        }

        const updatedChatDoc = await getDoc(chatRef);
        const users = updatedChatDoc.data().users;

        // Add the chatId to each user's document only if it's not already present
        for (const user of users) {
            await addChatToUser(user, chatId);
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

function sanitizeMessage(msg) {
    const offensivePattern = /\b(n[\s'_\-]*i[\s'_\-]*g[\s'_\-]*g[\s'_\-]*a|n[\s'_\-]*i[\s'_\-]*g[\s'_\-]*g[\s'_\-]*r|n[\s'_\-]*i[\s'_\-]*g[\s'_\-]*g[\s'_\-]*e[\s'_\-]*r)\b/gi;
    return msg.replace(offensivePattern, 'ninja');
}

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

async function addChatToUser(user, chatId) {
    try {
        const userRef = doc(db, 'users', user);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            const userChats = userDoc.data().chats || [];

            // Check if chatId already exists in the user's chat list
            const chatExists = userChats.some(chat => chat.id === chatId);

            if (!chatExists) {
                // Add the chat with the chatId and notifications set to 0
                userChats.push({ id: chatId, notification: 0 });

                // Update the user's chats in Firestore
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
}



app.post('/checkDM', async (req, res) => {
    try {
        const { users } = req.body;

        if (!users || !Array.isArray(users) || users.length !== 2) {
            return res.status(400).json({ message: 'Invalid request data' });
        }

        const [user1, user2] = users;

        // Query to find a chat with these two users
        const chatsRef = collection(db, 'chats');
        const q = query(chatsRef, where('users', 'array-contains-any', [user1, user2]));
        const querySnapshot = await getDocs(q);

        let chatId = null;

        querySnapshot.forEach(doc => {
            const data = doc.data();
            // Check if this chat contains exactly the two users
            if (data.users.length === 2 && data.users.includes(user1) && data.users.includes(user2)) {
                chatId = data.chatId;
            }
        });

        if (chatId) {
            return res.status(200).json({ chatId });
        } else {
            return res.status(404).json({ message: 'No DM found' });
        }
    } catch (error) {
        console.error('Error checking DM existence:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});


// Function to create a DM chat

app.post('/createDM', async (req, res) => {
    try {
        const { chatId, users } = req.body;

        if (!chatId || !users || !Array.isArray(users) || users.length !== 2) {
            return res.status(400).json({ message: 'Invalid request data' });
        }

        // Destructure users
        const [user1, user2] = users;

        // Check if the DM chat already exists
        const chatRef = doc(db, 'chats', chatId);
        const chatDoc = await getDoc(chatRef);

        if (chatDoc.exists()) {
            console.log(`DM chat ${chatId} already exists.`);
            
            // Delete other DM chats between these two users
            await deleteOtherChats(user1, user2, chatId);

            return res.status(200).json({ message: `DM chat ${chatId} already exists.` });
        } else {
            // Create a new DM chat document
            await setDoc(chatRef, {
                chatId,
                users,
                messages: [],  // Start with an empty messages array
                isDM: true
            });
            console.log(`DM chat ${chatId} created successfully.`);
            
            // Optionally, update the user documents to include the new chat
            for (const user of users) {
                await addChatToUser(user, chatId);
            }

            return res.status(201).json({ message: `DM chat ${chatId} created successfully.` });
        }
    } catch (error) {
        console.error('Error creating DM chat:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

// Helper function to delete old DM chats between two users, keeping only the latest one
async function deleteOtherChats(user1, user2, keepChatId) {
    try {
        // Query for existing DM chats between user1 and user2
        const q = query(
            collection(db, 'chats'),
            where('isDM', '==', true),
            where('users', 'array-contains-any', [user1, user2])
        );

        const querySnapshot = await getDocs(q);

        querySnapshot.forEach(async (doc) => {
            const chatData = doc.data();
            const chatId = chatData.chatId;

            // Delete chats that are not the one to keep
            if (chatId !== keepChatId) {
                console.log(`Deleting old DM chat ${chatId}`);
                await deleteDoc(doc.ref);

                // Optionally, remove the chat ID from the user documents
                await removeChatFromUser(user1, chatId);
                await removeChatFromUser(user2, chatId);
            }
        });
    } catch (error) {
        console.error('Error deleting old DM chats:', error);
    }
}


async function removeChatFromUser(username, chatId) {
    try {
        // Reference to the user's document
        const userRef = doc(db, 'users', username);

        // Update the user's document to remove the chat ID
        await updateDoc(userRef, {
            chats: arrayRemove(chatId) // Remove the chatId from the chats array
        });

        console.log(`Removed chat ${chatId} from user ${username}`);
    } catch (error) {
        console.error(`Error removing chat ${chatId} from user ${username}:`, error);
    }
}




// Sign-up route
app.post('/signup', async (req, res) => {
    const { fullname, schoolmail, username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password || !fullname || !schoolmail) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const users = readUsers();

    if (users.find(user => user.email === email)) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const namePrefix = fullname.slice(0, 3).toLowerCase();
    const emailPrefix = schoolmail.slice(0, 3).toLowerCase();
    const emailSufix = schoolmail.slice(-12).toLowerCase();

    console.log(emailSufix);

    if (emailSufix !== "@fusdk12.net") {
        return res.status(400).json({ message: 'Student email not valid!' });
    }
    
    if (namePrefix !== emailPrefix) {
        return res.status(400).json({ message: 'Student email and fullname should match!' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const userRef = doc(db, "users", username);
        const timestamp = new Date().toISOString();
        await setDoc(userRef, {
            username,
            email,
            password: hashedPassword,
            chats: DEFAULT_CHATS,
            isActive: true,
            streak: [0, "2024-08-10T23:30:41.107Z"],
            fullname,
            schoolmail,
            verify: true,
        });

        console.log("Document successfully written with username:", username);
        res.status(201).json({ message: 'User created successfully' });
    } catch (e) {
        console.error("Error adding document:", e);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/userStreak', async (req, res) => {
    
    const username = req.query.username; // Get the username from query parameters

    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    try {
        const userRef = doc(db, 'users', username);
        const userSnapshot = await getDoc(userRef);

        if (userSnapshot.exists()) {
            const userData = userSnapshot.data();
            const streak = userData.streak ? userData.streak[0] : 0; // Adjust based on your data structure
            res.json({ streak });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Error fetching user streak:', error);
        res.status(500).json({ error: 'Internal Server Error' });
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
            // Emit a logout event to the client
            socket.emit('logout');
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
        try {
            // Join the specified chat room
            socket.join(chatId);
            console.log(`User ${socket.user.username} joined chat ${chatId}`);
            await resetChatNotification(socket.user.username, chatId);
    
            // Add chat to the user's list
            await addChatToUser(socket.user.email, chatId);
    
            // Fetch and emit recent chat messages from Firestore
            const chatRef = doc(db, "chats", chatId);
            const chatDoc = await getDoc(chatRef);
    
            if (chatDoc.exists()) {
                const chatData = chatDoc.data();
                const messages = chatData.messages || [];
    
                // Define the cutoff time: 10 hours ago from the current time
                const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString();
    
                // Filter messages to include only those from the last 10 hours
                const recentMessages = messages.filter(message => message.timestamp >= tenHoursAgo);
    
                // Emit recent messages to the client
                socket.emit('loadMessages', recentMessages);
            } else {
                console.log(`Chat ${chatId} does not exist`);
                socket.emit('loadMessages', []);
            }
    
            // Update the list of users in the chat room
            updateUsers(chatId);
            for (const user of users) {
                await addChatToUser(user, chatId);
            }
        } catch (error) {
            console.error(`Error joining chat ${chatId}:`, error);
        }
        
    });
    
    

    // Handle sending a message
    socket.on('sendMessage', async ({ chatId, message }) => {
        const timestamp = new Date().toISOString();
        const messageObject = { chatId, username: socket.user.username, message, timestamp };
    
        try {
            // Save message to Firestore
            const chatRef = doc(db, "chats", chatId);
            await updateChatDocument(chatId, [messageObject], messageObject.username);
    
            // Emit message to chat
            await handleMessageSend(chatId, messageObject.username, message, timestamp);
            io.to(chatId).emit('receiveMessage', messageObject);
            console.log(messageObject);
    
            // Retrieve user's current streak from Firestore
            const userRef = doc(db, "users", socket.user.username);
            const userSnapshot = await getDoc(userRef);
    
            if (userSnapshot.exists()) {
                const userData = userSnapshot.data();
                const lastStreakTimestamp = userData.streak[1];
                const currentTimestamp = new Date(timestamp).getTime();
                const lastTimestamp = new Date(lastStreakTimestamp).getTime();
                const timeDifference = currentTimestamp - lastTimestamp;
    
                // Check if 24 hours or more have passed
                if (timeDifference >= 24 * 60 * 60 * 1000) { // 24 hours in milliseconds
                    const newStreak = userData.streak[0] + 1;
                    await updateDoc(userRef, {
                        streak: [newStreak, timestamp]
                    });
                }
            } else {
                console.error(`User not found: ${socket.user.username}`);
            }
            
            updateUsers();
        } catch (error) {
            console.error(`Error sending message to chat ${chatId}:`, error);
        }
    });    
});


// Start the server
const PORT = 4000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});