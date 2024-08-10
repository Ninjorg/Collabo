// Initialize socket.io client

// Import and configure Firebase
import firebase from 'firebase/app';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import { getFirestore, collection, getDocs, addDoc, query, where } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';

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
firebase.initializeApp(firebaseConfig);

// Get a reference to the database
const db = firebase.firestore(); // For Firestore
// const db = firebase.database(); // For Realtime Database

const socket = io({
    transports: ['websocket'],
    auth: {
        token: localStorage.getItem('token') // Ensure this token is correct and present
    }
});

// Display the logged-in username
const username = localStorage.getItem('username');
if (username) {
    document.getElementById('username').textContent = `Logged in as: ${username}`;
} else {
    document.getElementById('username').textContent = 'Not logged in';
}

// Handle logout
document.getElementById('logout').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = 'home.html';
});

// Message cooldown logic
let lastMessageTime = 0;
const MESSAGE_COOLDOWN = 4000; // 3 seconds in milliseconds

document.getElementById('sendMessage').addEventListener('click', async (e) => {
    e.preventDefault();

    const currentTime = new Date().getTime();
    if (currentTime - lastMessageTime < MESSAGE_COOLDOWN) {
        showNewCooldownNotification();
        return;
    }

    const chatId = document.getElementById('chatId').value;
    const message = document.getElementById('message').value;
    const username = localStorage.getItem('username');

    if (chatId && message && username) {
        const timestamp = new Date().toISOString();
        await db.collection('chats').doc(chatId).collection('messages').add({
            message,
            username,
            timestamp
        });
        document.getElementById('message').value = '';
        lastMessageTime = currentTime;
    }
});





const fetchUserChats = async () => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found');
            return;
        }

        const userDoc = await db.collection('users').doc(token).get();
        if (!userDoc.exists) {
            console.error('No such user!');
            return;
        }

        const userData = userDoc.data();
        const chats = userData.chats || [];

        updateChatList(chats);
    } catch (error) {
        console.error('Error fetching user chats:', error);
    }
};


// Update chat list on page load
const updateChatList = (chats) => {
    const chatListElement = document.getElementById('chatList');
    chatListElement.innerHTML = '<h2>NOTEPAD</h2>';
    const uniqueChats = new Set(chats);
    uniqueChats.forEach((chatId) => {
        const chatItem = document.createElement('div');
        chatItem.classList.add('chat-item');
        chatItem.textContent = `#${chatId}`;
        chatItem.addEventListener('click', () => {
            document.getElementById('chatId').value = chatId;
            socket.emit('joinChat', chatId);
        });
        chatListElement.appendChild(chatItem);
    });
};

// Call fetchUserChats on page load
fetchUserChats();

// Handle chat change
const chatId = document.getElementById('chatId').value;

db.collection('chats').doc(chatId).collection('messages').orderBy('timestamp').onSnapshot((snapshot) => {
    const chat = document.getElementById('chat');
    chat.innerHTML = '';
    snapshot.forEach(doc => {
        const message = doc.data();
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');

        if (message.username === currentUser) {
            messageElement.classList.add('current-user');
        }

        const userElement = document.createElement('div');
        userElement.classList.add('username');
        userElement.textContent = message.username || 'Unknown';

        const textElement = document.createElement('div');
        textElement.classList.add('text');
        textElement.textContent = `${message.username}: ${message.message}`;

        const timestampElement = document.createElement('div');
        timestampElement.classList.add('timestamp');
        timestampElement.textContent = message.timestamp || 'No timestamp';

        messageElement.appendChild(userElement);
        messageElement.appendChild(textElement);
        messageElement.appendChild(timestampElement);

        chat.appendChild(messageElement);
    });
    chat.scrollTop = chat.scrollHeight;
});



// Handle receiving and displaying messages
const currentUser = localStorage.getItem('username'); // Replace with the actual logic to get the current username

// Handle loading messages
socket.on('loadMessages', (messages) => {
    const chat = document.getElementById('chat');
    chat.innerHTML = ''; // Clear chat
    messages.forEach((message) => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');

        // Apply special class if the message is from the current user
        if (message.username === currentUser) {
            messageElement.classList.add('current-user');
        }

        const userElement = document.createElement('div');
        userElement.classList.add('username');
        userElement.textContent = message.username || 'Unknown';

        const textElement = document.createElement('div');
        textElement.classList.add('text');
        textElement.textContent = `${message.username}: ${message.message}`;

        const timestampElement = document.createElement('div');
        timestampElement.classList.add('timestamp');
        timestampElement.textContent = message.timestamp || 'No timestamp';

        messageElement.appendChild(userElement);
        messageElement.appendChild(textElement);
        messageElement.appendChild(timestampElement);

        chat.appendChild(messageElement);
    });
    chat.scrollTop = chat.scrollHeight;
});

// Handle receiving new messages
let newMessageCount = 0;

function updateTitle() {
    if (newMessageCount > 0) {
        document.title = `Collabo (${newMessageCount} New Message${newMessageCount > 1 ? 's' : ''})`;
    } else {
        document.title = 'Collabo';
    }
}

socket.on('receiveMessage', (message) => {
    const chat = document.getElementById('chat');

    const messageElement = document.createElement('div');
    messageElement.classList.add('message');

    // Apply special class if the message is from the current user
    if (message.username === currentUser) {
        messageElement.classList.add('current-user');
    }

    const timestampElement = document.createElement('div');
    timestampElement.classList.add('timestamp');
    timestampElement.textContent = message.timestamp || 'No timestamp';

    const userElement = document.createElement('div');
    userElement.classList.add('username');
    userElement.textContent = message.username || 'Unknown';

    const textElement = document.createElement('div');
    textElement.classList.add('text');
    textElement.textContent = `${message.username}: ${message.message}`;

    messageElement.appendChild(timestampElement);
    messageElement.appendChild(userElement);
    messageElement.appendChild(textElement);

    chat.appendChild(messageElement);
    chat.scrollTop = chat.scrollHeight;

    // Show notification and update title
    showNewMessageNotification(message, chatId);
});

// Function to show the new message notification
function showNewMessageNotification(message, chatId) {
    let notification = document.getElementById('newMessageNotification');

    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'newMessageNotification';
        notification.classList.add('new-message-notification');
        document.body.appendChild(notification);
    }

    notification.innerHTML = '';

    const imageElement = document.createElement('img');
    imageElement.src = 'notification.png';
    imageElement.alt = 'Notification Icon';
    imageElement.style.width = '30px';
    imageElement.style.height = '30px';
    imageElement.style.marginRight = '5px';

    const textContent = `New message in ${message.chatId}: ${message.username}: ${message.message}`;
    notification.appendChild(imageElement);
    notification.appendChild(document.createTextNode(textContent));

    notification.classList.add('show');

    // Hide the notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);

    // Increment the new message count and update the title
    newMessageCount++;
    updateTitle();
}

function showNewCooldownNotification() {
    let notification = document.getElementById('newMessageNotification');

    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'newMessageNotification';
        notification.classList.add('new-message-notification');
        document.body.appendChild(notification);
    }

    notification.innerHTML = '';

    const imageElement = document.createElement('img');
    imageElement.src = 'notification.png';
    imageElement.alt = 'Notification Icon';
    imageElement.style.width = '30px';
    imageElement.style.height = '30px';
    imageElement.style.marginRight = '5px';

    const textContent = `You are in cooldown, please wait for 2 seconds.`;
    notification.appendChild(imageElement);
    notification.appendChild(document.createTextNode(textContent));

    notification.classList.add('show');

    // Hide the notification after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);

    // Increment the new message count and update the title
    newMessageCount++;
    updateTitle();
}

db.collection('chats').doc(chatId).collection('users').onSnapshot((snapshot) => {
    const users = [];
    snapshot.forEach(doc => users.push(doc.data()));

    updateUserList(users);
});



document.addEventListener('click', () => {
    resetNewMessageCount();
});

// Reset the new message count and title when the user views the chat
function resetNewMessageCount() {
    newMessageCount = 0;
    updateTitle();
}

// Handle emoji selection
const emojiPicker = document.getElementById('emojiPicker');
const messageInput = document.getElementById('message');

emojiPicker.addEventListener('emoji-click', (event) => {
    const emoji = event.detail.unicode;
    messageInput.value += emoji; // Append the selected emoji to the input field
});

// Handle user list updates
socket.on('updateUsers', (users) => {
    console.log('Users in the current chat:', users);
    const userList = document.getElementById('userList');
    userList.innerHTML = '<h2>USERS</h2>';
    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.classList.add('user');
        userElement.textContent = user.username;
        
        // Add a green dot if the user is active
        if (user.isActive) {
            const activeDot = document.createElement('span');
            activeDot.classList.add('active-dot');
            userElement.appendChild(activeDot);
        }

        userList.appendChild(userElement);
    });
});