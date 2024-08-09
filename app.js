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
document.getElementById('chatId').addEventListener('change', () => {
    const chatId = document.getElementById('chatId').value;
    const token = localStorage.getItem('token');
    if (chatId && token) {
        socket.emit('joinChat', chatId);
    }
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
// Handle receiving new messages
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

    const textContent = `New message in #${message.chatId}: ${message.username}: ${message.message}`;
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

document.addEventListener('click', () => {
    resetNewMessageCount();
});

// Reset the new message count and title when the user views the chat
function resetNewMessageCount() {
    newMessageCount = 0;
    updateTitle();
}



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