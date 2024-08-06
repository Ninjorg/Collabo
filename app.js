const socket = io({
    transports: ['websocket'],
    auth: {
        token: localStorage.getItem('token')
    }
});

document.getElementById('sendMessage').addEventListener('click', () => {
    const chatId = document.getElementById('chatId').value;
    const message = document.getElementById('message').value;
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username'); // Get the username from local storage

    if (chatId && message && token && username) {
        socket.emit('sendMessage', { chatId, message, username }); // Include username in the emitted message
        document.getElementById('message').value = '';
    }
});

document.getElementById('chatId').addEventListener('change', () => {
    const chatId = document.getElementById('chatId').value;
    const token = localStorage.getItem('token');
    if (chatId && token) {
        socket.emit('joinChat', chatId);
    }
});

socket.on('loadMessages', (messages) => {
    const chat = document.getElementById('chat');
    chat.innerHTML = ''; // Clear chat
    messages.forEach((message) => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.textContent = `[${message.timestamp}] ${message.username}: ${message.message}`;
        chat.appendChild(messageElement);
    });
    chat.scrollTop = chat.scrollHeight;
});

socket.on('receiveMessage', (message) => {
    const chat = document.getElementById('chat');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.textContent = `[${message.timestamp}] ${message.username}: ${message.message}`;
    chat.appendChild(messageElement);
    chat.scrollTop = chat.scrollHeight;
});

// Display the logged-in username
document.getElementById('username').textContent = localStorage.getItem('username');

// Handle logout
document.getElementById('logout').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = 'login.html';
});
