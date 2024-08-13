// Initialize socket.io client
const socket = io({ 
    transports: ['websocket'],
    auth: {
        token: localStorage.getItem('token') // Ensure this token is correct and present
    }
});


const fetchAndDisplayUserStreak = async () => {
    const username = localStorage.getItem('username');
    if (username) {
        try {
            const userRef = doc(db, 'users', username);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                const streak = userData.streak ? userData.streak[0] : 0; // Adjust based on your data structure
                document.getElementById('streakValue').textContent = streak;
            } else {
                console.error('User document not found.');
                document.getElementById('streakValue').textContent = 'Error';
            }
        } catch (error) {
            console.error('Error fetching streak:', error);
            document.getElementById('streakValue').textContent = 'Error';
        }
    } else {
        document.getElementById('streakValue').textContent = 'Not logged in';
    }
};

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

document.getElementById('sendMessage').addEventListener('click', (e) => {
    e.preventDefault();
    const currentTime = new Date().getTime();
    
    if (currentTime - lastMessageTime < MESSAGE_COOLDOWN) {
        // If the cooldown period has not passed, do not send the message
        showNewCooldownNotification();
        return;
    }

    const chatId = document.getElementById('chatId').value;
    const message = document.getElementById('message').value;
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');

    if (chatId && message && token && username) {
        const timestamp = new Date().toISOString();
        socket.emit('sendMessage', { chatId, message, username, timestamp });
        document.getElementById('message').value = '';

        // Update last message time
        lastMessageTime = currentTime;
        
    }
    
});

const checkLogin = () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'home.html'; // Redirect to home.html if not logged in
    }
};

// Call the login check function at the start
checkLogin();

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
    const chatNameElement = document.getElementById('chatName');
    
    if (chatNameElement) {  // Ensure the chatName element exists
        chatNameElement.innerText = chatId; // Update chatName text to chatId
    }
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
let newMessageCount = 0;

function updateTitle() {
    if (newMessageCount > 0) {
        document.title = `Collabo (${newMessageCount} New Message${newMessageCount > 1 ? 's' : ''})`;
    } else {
        document.title = 'Collabo';
    }
}

socket.on('receiveMessage', (message) => {
    if (message.username !== currentUser) {
        showNewMessageNotification(message);
    }

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

//themes
document.addEventListener('DOMContentLoaded', async () => {
    const themeLink = document.getElementById('theme-link');
    const modeButtons = document.querySelectorAll('.mode-btn');
    const streakRequirements = {
        'default': 1,
        'ninja': 1, // Example: Requires a streak of 5 to unlock 'ninja' theme
        'moon': 10, // Example: Requires a streak of 10 to unlock 'moon' theme
        'daisy': 15, // Example: Requires a streak of 15 to unlock 'daisy' theme
        'ocean': 20, // Example: Requires a streak of 20 to unlock 'ocean' theme
    };

    const username = localStorage.getItem('username'); // Assuming you store username in localStorage

    if (username) {
        try {
            const response = await fetch(`/userStreak?username=${username}`);
            const data = await response.json();
            
            if (response.ok) {
                const currentStreak = data.streak || 0;
                updateThemeButtons(currentStreak);
            } else {
                console.error(data.error);
            }
        } catch (error) {
            console.error('Error fetching streak:', error);
        }
    } else {
        console.log('User not logged in');
        disableAllButtons();
    }

    function updateThemeButtons(currentStreak) {
        modeButtons.forEach(button => {
            const theme = button.getAttribute('data-theme');
            const requiredStreak = streakRequirements[theme];


        });
    }

    modeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const theme = button.getAttribute('data-theme');
            handleThemeSelection(theme);
        });
    });

    function handleThemeSelection(theme) {
        const requiredStreak = streakRequirements[theme];

        if (requiredStreak !== undefined) {
            fetch(`/userStreak?username=${localStorage.getItem('username')}`)
                .then(response => response.json())
                .then(data => {
                    const currentStreak = data.streak || 0;

                    if (currentStreak >= requiredStreak) {
                        switchTheme(theme);
                    } else if (currentStreak < requiredStreak) {
                        alert(`Your streak is not big enough to access this theme. ${requiredStreak} days needed!`);
                    }
                    
                })
                .catch(error => {
                    console.error('Error checking streak:', error);
                });
        }
    }

    function switchTheme(theme) {
        switch (theme) {
            case 'default':
                themeLink.href = 'styles.css';
                break;
            case 'ninja':
                themeLink.href = 'ninja-mode.css';
                break;
            case 'moon':
                themeLink.href = 'moon.css';
                break;
            case 'daisy':
                themeLink.href = 'flower.css';
                break;
            case 'ocean':
                themeLink.href = 'ocean.css';
                break;
            default:
                themeLink.href = 'styles.css';
        }
    }

    function showNewStreakNotification(requiredStreak) {
        let notification = document.getElementById('streakNotification');
        
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'streakNotification';
            notification.classList.add('streak-notification');
            document.body.appendChild(notification);
        }
        
        notification.innerHTML = '';
        
        const imageElement = document.createElement('img');
        imageElement.src = 'notification.png';
        imageElement.alt = 'Notification Icon';
        imageElement.style.width = '30px';
        imageElement.style.height = '30px';
        imageElement.style.marginRight = '5px';
        
        const textContent = `Your streak is too small to access this. You need ${requiredStreak} streak points.`;
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
});


// Handle user list updates
socket.on('updateUsers', (users) => {
    console.log('Received updateUsers event:', users);
    const userList = document.getElementById('userList');
    if (!userList) {
        console.error('User list element not found');
        return;
    }
    userList.innerHTML = '<h2>USERS</h2>';
    
    if (users && Array.isArray(users)) {
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
    } else {
        console.error('Invalid users data:', users);
    }
});
