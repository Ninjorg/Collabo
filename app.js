// Initialize socket.io client
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
    window.location.href = 'login.html';
});

document.getElementById('sendMessage').addEventListener('click', (e) => {
    e.preventDefault();
    const chatId = document.getElementById('chatId').value;
    const message = document.getElementById('message').value;
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');

    if (chatId && message && token && username) {
        const timestamp = new Date().toISOString();
        socket.emit('sendMessage', { chatId, message, username, timestamp });
        document.getElementById('message').value = '';
    }
});

// Fetch and display user's chats
const fetchUserChats = () => {
    fetch('/userChats', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => updateChatList(data.chats))
    .catch(error => console.error('Error fetching user chats:', error));
};

// Update chat list on page load
const updateChatList = (chats) => {
    const chatListElement = document.getElementById('chatList');
    chatListElement.innerHTML = '<h2>My Chats</h2>';
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
document.getElementById('chatId').addEventListener('change', () => {
    const chatId = document.getElementById('chatId').value;
    const token = localStorage.getItem('token');
    if (chatId && token) {
        socket.emit('joinChat', chatId);
    }
});

// Handle receiving and displaying messages
socket.on('loadMessages', (messages) => {
    const chat = document.getElementById('chat');
    chat.innerHTML = ''; // Clear chat
    messages.forEach((message) => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.textContent = `[${message.timestamp || 'No timestamp'}] ${message.username || 'Unknown'}: ${message.message}`;
        chat.appendChild(messageElement);
    });
    chat.scrollTop = chat.scrollHeight;
});

// Handle receiving new messages
socket.on('receiveMessage', (message) => {
    const chat = document.getElementById('chat');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.textContent = `[${message.timestamp || 'No timestamp'}] ${message.username || 'Unknown'}: ${message.message}`;
    chat.appendChild(messageElement);
    chat.scrollTop = chat.scrollHeight;
});

// Handle user list updates
socket.on('updateUsers', (users) => {
    console.log('Users in the current chat:', users);
    const userList = document.getElementById('userList');
    userList.innerHTML = '<h2>Users in Chat</h2>';
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