// Initialize socket.io client
const socket = io({ 
    transports: ['websocket'],
    auth: {
        token: localStorage.getItem('token')
    }
});

const username = localStorage.getItem('username');
const token = localStorage.getItem('token');

if (!username || !token) {
    window.location.href = 'home.html'; // Redirect if not logged in
}

// Cache DOM elements
const chatIdElement = document.getElementById('chatId');
const chatElement = document.getElementById('chat');
const messageElement = document.getElementById('message');
const chatListElement = document.getElementById('chatList');
const streakValueElement = document.getElementById('streakValue');
const usernameElement = document.getElementById('username');
const emojiPicker = document.getElementById('emojiPicker');
const modeButtons = document.querySelectorAll('.mode-btn');
const newMessageNotification = document.createElement('div');
document.body.appendChild(newMessageNotification);

let lastMessageTime = 0;
const MESSAGE_COOLDOWN = 4000; // 4 seconds in milliseconds
let newMessageCount = 0;

// Debounce Function
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Display the logged-in username
usernameElement.textContent = `Logged in as: ${username}`;

// Handle logout
document.getElementById('logout').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'home.html';
});

// Fetch and Display User Streak
const fetchAndDisplayUserStreak = async () => {
    if (username) {
        try {
            const userRef = doc(db, 'users', username);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                const streak = userDoc.data().streak || 0;
                streakValueElement.textContent = streak;
            } else {
                streakValueElement.textContent = 'Error';
            }
        } catch (error) {
            streakValueElement.textContent = 'Error';
            console.error('Error fetching streak:', error);
        }
    } else {
        streakValueElement.textContent = 'Not logged in';
    }
};

fetchAndDisplayUserStreak();

const sendMessage = debounce((e) => {
    e.preventDefault();
    const currentTime = Date.now();

    if (currentTime - lastMessageTime < MESSAGE_COOLDOWN) {
        showNotification('You are in cooldown, please wait.');
        return;
    }

    const chatId = chatIdElement.value;
    const message = messageElement.value;

    if (chatId && message) {
        const timestamp = new Date().toISOString();
        socket.emit('sendMessage', { chatId, message, username, timestamp });
        messageElement.value = '';
        lastMessageTime = currentTime;
    }
}, MESSAGE_COOLDOWN);

document.getElementById('sendMessage').addEventListener('click', sendMessage);

const fetchUserChats = async () => {
    try {
        const response = await fetch('/userChats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        updateChatList(data.chats);
    } catch (error) {
        console.error('Error fetching user chats:', error);
    }
};

const updateChatList = (chats) => {
    chatListElement.innerHTML = '<h2>NOTEPAD</h2>';
    const fragment = document.createDocumentFragment();

    chats.forEach(({ id, notification }) => {
        if (id.startsWith('DM')) return;

        const chatItem = document.createElement('div');
        chatItem.classList.add('chat-item');
        chatItem.textContent = `#${id}`;

        if (notification > 0) {
            const notificationBadge = document.createElement('span');
            notificationBadge.classList.add('notification-badge');
            notificationBadge.textContent = notification > 9 ? '9+' : notification;
            chatItem.appendChild(notificationBadge);
        }

        chatItem.addEventListener('click', () => {
            chatIdElement.value = id;
            socket.emit('joinChat', id);
        });

        fragment.appendChild(chatItem);
    });

    chatListElement.appendChild(fragment);
};

fetchUserChats();

const loadMessages = (messages) => {
    chatElement.innerHTML = '';
    const fragment = document.createDocumentFragment();

    messages.forEach((message) => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', message.username === username ? 'current-user' : '');

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

        fragment.appendChild(messageElement);
    });

    chatElement.appendChild(fragment);
    chatElement.scrollTop = chatElement.scrollHeight;
};

socket.on('loadMessages', loadMessages);

socket.on('receiveMessage', (message) => {
    loadMessages([message]); // Append only the new message
    if (message.username !== username) {
        showNotification(`New message from ${message.username}: ${message.message}`);
    }
});

const showNotification = (textContent) => {
    newMessageNotification.innerHTML = '';
    newMessageNotification.classList.add('new-message-notification');
    newMessageNotification.textContent = textContent;

    newMessageNotification.classList.add('show');
    setTimeout(() => {
        newMessageNotification.classList.remove('show');
    }, 3000);
};

document.addEventListener('click', () => {
    newMessageCount = 0;
    updateTitle();
});

emojiPicker.addEventListener('emoji-click', (event) => {
    messageElement.value += event.detail.unicode;
});

document.addEventListener('DOMContentLoaded', async () => {
    const themeLink = document.getElementById('theme-link');
    const streakRequirements = {
        'default': 1,
        'ninja': 5,
        'moon': 10,
        'daisy': 15,
        'ocean': 20
    };

    if (username) {
        try {
            const response = await fetch(`/userStreak?username=${username}`);
            const data = await response.json();
            if (response.ok) {
                updateThemeButtons(data.streak || 0);
            } else {
                disableAllButtons();
                console.error(data.error);
            }
        } catch (error) {
            disableAllButtons();
            console.error('Error fetching streak:', error);
        }
    } else {
        disableAllButtons();
        console.log('User not logged in');
    }

    function updateThemeButtons(currentStreak) {
        modeButtons.forEach(button => {
            const theme = button.getAttribute('data-theme');
            const requiredStreak = streakRequirements[theme];
            button.disabled = currentStreak < requiredStreak;
        });
    }

    function disableAllButtons() {
        modeButtons.forEach(button => button.disabled = true);
    }

    modeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const theme = button.getAttribute('data-theme');
            handleThemeSelection(theme);
        });
    });

    function handleThemeSelection(theme) {
        const requiredStreak = streakRequirements[theme];
        fetch(`/userStreak?username=${username}`)
            .then(response => response.json())
            .then(data => {
                if (data.streak >= requiredStreak) {
                    themeLink.href = `${theme}.css`;
                } else {
                    alert('Streak not high enough to unlock this theme.');
                }
            })
            .catch(error => console.error('Error selecting theme:', error));
    }
});
