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
const MESSAGE_COOLDOWN = 0; // 3 seconds in milliseconds

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
    .then(data => {
        console.log('Fetched user chats:', data); // Debugging
        updateChatList(data.chats);
    })
    .catch(error => console.error('Error fetching user chats:', error));
};


// Update chat list
const updateChatList = (chats) => {
    if (!Array.isArray(chats)) {
        console.error('Chats data is not an array:', chats);
        return;
    }

    const chatListElement = document.getElementById('chatList');
    chatListElement.innerHTML = '<h2>NOTEPAD</h2>';

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
            document.getElementById('chatId').value = id;
            socket.emit('joinChat', id);
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
        document.getElementById('chatId').value = existingChatId;
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
        } else {
            // Add avatar image for other users
            const imageElement = document.createElement('img');
            imageElement.classList.add('avatar');
            imageElement.src = message.picture;
            imageElement.alt = 'User Avatar';
            messageElement.appendChild(imageElement);
        }

        const userElement = document.createElement('div');
        userElement.classList.add('username');
        userElement.textContent = message.username || 'Unknown';

        const imageElement = document.createElement('img'); // Create an img element
        imageElement.classList.add('avatar'); // Add a class for styling
        imageElement.src = message.picture; // Set the source of the image to AVATAR.png
        imageElement.alt = 'User Avatar'; // Set an alt text for accessibility
        const textElement = document.createElement('div');
        textElement.classList.add('text');
        textElement.textContent = `${message.username}: ${message.message}`;


        const timestampElement = document.createElement('div');
        timestampElement.classList.add('timestamp');
        timestampElement.textContent = message.displayTime || 'No timestamp';

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
    if (message.username === currentUser) {
        messageElement.classList.add('current-user');
    }
    const chat = document.getElementById('chat');
    const chatId = document.getElementById('chatId').value;

    if (message.chatId == chatId) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');

        // Apply special class if the message is from the current user
        if (message.username === currentUser) {
            messageElement.classList.add('current-user');
        } else {
            // Add avatar image for other users
            const imageElement = document.createElement('img');
            imageElement.classList.add('avatar');
            imageElement.src = message.picture;
            imageElement.alt = 'User Avatar';
            messageElement.appendChild(imageElement);
        }

        const imageElement = document.createElement('img'); // Create an img element
        imageElement.classList.add('avatar'); // Add a class for styling
        imageElement.src = message.picture; // Set the source of the image to AVATAR.png
        imageElement.alt = 'User Avatar'; // Set an alt text for accessibility

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
    }

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
                function hideMessage() {
                    const messageElement = document.getElementById('message');
                    messageElement.classList.remove('hidden'); // Hide the element
                }
                hideMessage();
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
// Listen for updates to the user list from the server
function generateRandomChatId() {
    const randomDigits = Math.random().toString().substring(2, 9); // Generates 7 random digits
    return `DM${randomDigits}`;
}

// Function to join a chat with a specific ID
let isJoining = false;

async function joinChat(chatId) {
    if (isJoining) return; // Prevent multiple joins
    isJoining = true;

    console.log(`joinChat called with ID: ${chatId} at ${new Date().toISOString()}`);

    try {
        socket.emit('joinChat', { chatId }, (response) => {
            console.log(`Server response for joinChat:`, response);
            isJoining = false; // Reset flag after response

            if (response.status === 'ok') {
                console.log(`Successfully joined DM with ID: ${chatId}`);
                const chat = document.getElementById('chat');
                if (chat) {
                    chat.textContent = `Joined DM: ${chatId}`;
                } else {
                    console.error('Chat element not found');
                }
                
                fetchMessagesForChat(chatId);
            } else {
                console.error('Failed to join DM:', response.error);
                alert('Failed to join the DM. Please try again.');
            }
        });
    } catch (error) {
        console.error('Error joining chat:', error);
        alert('An error occurred while joining the chat. Please try again.');
        isJoining = false; // Reset flag on error
    }
}


// Event listener for updating the user list
async function checkDMExists(user1, user2) {
    try {
        const response = await fetch('/checkDM', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ users: [user1, user2] })
        });

        const contentType = response.headers.get('Content-Type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (response.ok) {
                return data.chatId; // Return the existing chat ID if found
            } else {
                console.error('Error checking DM existence:', data.message || 'Unknown error');
            }
        } else {
            const responseText = await response.text();
            console.error('Unexpected response format:', responseText);
        }
    } catch (error) {
        console.error('Error:', error);
    }
    return null; // Return null if no DM exists or if an error occurred
}
const getUserList = () => {
    const userListElement = document.getElementById('userList');
    if (!userListElement) {
        console.error('User list element not found.');
        return [];
    }
    
    // Assuming each user is an element inside userListElement
    return Array.from(userListElement.children).map(userElement => userElement.textContent.trim());
};
const fetchUserNotifications = async () => {
    try {
    const currentUser = localStorage.getItem('username');
    if (!currentUser) return;

    // Fetch user list (assume you have a way to get this)
    const userList = await getUserList(); // This should be defined based on your application logic

    const response = await fetch('/getUserNotifications', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currentUser, userList })
    });

    if (!response.ok) throw new Error('Failed to fetch notifications');
    
    const notifications = await response.json();
    updateNotificationDisplay(notifications);

    } catch (error) {
    console.error('Error fetching user notifications:', error);
    }
};
const userList = await getUserList();
console.log(userList);
  // Update notification display in the user list
const updateNotificationDisplay = (notifications) => {
    const userListElement = document.getElementById('userList');
    userListElement.innerHTML = '';

    for (const [username, notification] of Object.entries(notifications)) {
        const user = document.createElement('div');
        user.classList.add('user-item');
        user.textContent = username;

        if (notification > 0) {
            const notificationBadge = document.createElement('span');
            notificationBadge.classList.add('notification-badge');
            notificationBadge.textContent = notification;
            user.appendChild(notificationBadge);
        }

    userListElement.appendChild(userItem);
    }
};

// function getDMNotificationCount(username) {
//     // Create the URL with the username
//     const url = `/dm-notification/${encodeURIComponent(username)}`;

//     // Make the GET request to the server
//     fetch(url)
//         .then(response => {
//             // Check if the response is successful
//             if (!response.ok) {
//                 throw new Error(`HTTP error! Status: ${response.status}`);
//             }
//             return response.json(); // Parse the response as JSON
//         })
//         .then(data => {
//             // Assuming the server returns { notificationCount: number }
//             console.log(`DM Notification Count for ${username}: ${data.notification}`);
//         })
//         .catch(error => {
//             console.error('Error fetching DM notification count:', error);
//         });
// }

// // Example usage:

// // Periodically fetch notifications every 5 seconds
// const currentUsername = localStorage.getItem('username');
// setInterval(() => getDMNotificationCount(currentUsername), 5000);

document.addEventListener('click', fetchUserNotifications);
  
function updateChatName(Id) {
    const chatNameElement = document.getElementById('chatName');
    const chatId = document.getElementById('chatId')
    if (chatNameElement) {
        chatNameElement.innerText = `Chat ID: ${chatId}`; // Adjust as needed
    }
    chatId.innerText = `Chat ID: ${Id}`
}

// Event listener for updating the user list
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
            userElement.textContent = user.username || 'Unknown User'; // Ensure username is properly accessed
            userElement.setAttribute('data-username', user.username); // Store the username as a data attribute

            // Add a green dot if the user is active
            if (user.isActive) {
                const activeDot = document.createElement('span');
                activeDot.classList.add('active-dot');
                userElement.appendChild(activeDot);
            }

            // Attach click event listener to the user element
            userElement.addEventListener('click', async () => {
                const clickedUser = user.username;
                const currentUser = localStorage.getItem('username'); // Assuming username is stored in localStorage

                if (clickedUser && currentUser) {
                    // Check if DM already exists
                    const existingChatId = await checkDMExists(currentUser, clickedUser);
                    
                    if (existingChatId) {
                        // If DM exists, join the existing chat
                        const chatId = document.getElementById('chatId').value;
                        const chatNameElement = document.getElementById('chatName');
                        
                        if (chatNameElement) {  // Ensure the chatName element exists
                            chatNameElement.innerText = existingChatId; // Update chatName text to chatId
                        }
                        const token = localStorage.getItem('token');
                        
                        if (chatId && token) {

                            document.getElementById('chatId').value = `${existingChatId}`;
                            socket.emit('joinChat', existingChatId);
                        }

                    } else {
                        // Generate a random 5-character chat ID
                        const newChatId = generateRandomChatId();
                        console.log(`Creating DM with ID: ${newChatId} for users: ${currentUser}, ${clickedUser}`);

                        try {
                            // Send a request to create a new DM with the clicked user
                            const response = await fetch('/createDM', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ chatId: newChatId, users: [currentUser, clickedUser] }) // Use `chatId` here
                            });

                            // Check if the response is JSON
                            const contentType = response.headers.get('Content-Type');
                            if (contentType && contentType.includes('application/json')) {
                                const data = await response.json();
                                console.log("Response Data:", data);
                                if (response.ok) {
                                    console.log(`DM created successfully: ${JSON.stringify(data)}`);
                                    // Automatically join the new DM
                                    const chatId = document.getElementById('chatId').value;
                                    const chatNameElement = document.getElementById('chatName');
                                    
                                    if (chatNameElement) {  // Ensure the chatName element exists
                                        chatNameElement.innerText = newChatId; // Update chatName text to chatId
                                    }
                                    const token = localStorage.getItem('token');
                                    if (chatId && token) {
                                        document.getElementById('chatId').value = `${newChatId}`;
                                        socket.emit('joinChat', newChatId);
                                    }
                                } else {
                                    console.error('Error creating DM:', data.message || 'Unknown error');
                                    alert('Failed to create a DM. Please try again.');
                                }
                            } else {
                                // Handle unexpected HTML responses
                                const responseText = await response.text();
                                console.error('Unexpected response format:', responseText);
                                alert('An error occurred while creating the DM. Please try again.');
                            }
                        } catch (error) {
                            console.error('Error:', error);
                            alert('An error occurred. Please try again.');
                        }
                    }
                } else {
                    alert('Unable to identify users. Please try again.');
                }
            });

            userList.appendChild(userElement);
        });
    } else {
        console.error('Invalid users data:', users);
    }
});

document.addEventListener('click', fetchUserChats);

// Search messages
const searchMessages = (query) => {
    const chat = document.getElementById('chat');
    const messages = chat.getElementsByClassName('message');
    Array.from(messages).forEach(message => {
        const text = message.querySelector('.text').textContent.toLowerCase();
        if (text.includes(query.toLowerCase())) {
            message.style.display = 'block';
        } else {
            message.style.display = 'none';
        }
    });
};

// Event listener for search input
document.getElementById('searchInput').addEventListener('input', (e) => {
    searchMessages(e.target.value);
});


// Notify server when user is typing
const typingIndicator = (chatId) => {
    socket.emit('typing', { chatId });
};

// Show typing indicator
socket.on('userTyping', (username) => {
    const typingElement = document.getElementById('typingIndicator');
    if (typingElement) {
        typingElement.textContent = `${username} is typing...`;
        setTimeout(() => {
            typingElement.textContent = '';
        }, 3000); // Hide after 3 seconds
    }
});

// Event listener for typing
document.getElementById('message').addEventListener('input', () => {
    const chatId = document.getElementById('chatId').value;
    if (chatId) {
        typingIndicator(chatId);
    }
});
// Update user presence
socket.on('updatePresence', (userStatus) => {
    const userElement = document.querySelector(`[data-username="${userStatus.username}"]`);
    if (userElement) {
        userElement.classList.toggle('online', userStatus.online);
    }
});

// Emit user presence status
const updateUserPresence = (status) => {
    socket.emit('updatePresence', { username: localStorage.getItem('username'), online: status });
};

// Update presence when window focus changes
window.addEventListener('focus', () => updateUserPresence(true));
window.addEventListener('blur', () => updateUserPresence(false));
// Pin a message
const pinMessage = (messageId) => {
    const pinnedMessages = JSON.parse(localStorage.getItem('pinnedMessages') || '[]');
    if (!pinnedMessages.includes(messageId)) {
        pinnedMessages.push(messageId);
        localStorage.setItem('pinnedMessages', JSON.stringify(pinnedMessages));
        displayPinnedMessages();
    }
};

// Display pinned messages
const displayPinnedMessages = () => {
    const pinnedMessages = JSON.parse(localStorage.getItem('pinnedMessages') || '[]');
    const pinnedContainer = document.getElementById('pinnedMessages');
    pinnedContainer.innerHTML = '';
    pinnedMessages.forEach(messageId => {
        const message = document.getElementById(messageId);
        if (message) {
            pinnedContainer.appendChild(message.cloneNode(true));
        }
    });
};

// Event listener for pinning messages
document.getElementById('chat').addEventListener('click', (e) => {
    if (e.target.classList.contains('pin-message')) {
        pinMessage(e.target.dataset.messageId);
    }
});

// Call on page load
displayPinnedMessages();
// Handle file upload
document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    const chatId = document.getElementById('chatId').value;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('chatId', chatId);

    fetch('/uploadFile', {
        method: 'POST',
        body: formData,
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            socket.emit('sendFile', { file: data.fileUrl, chatId });
        } else {
            console.error('File upload failed:', data.error);
        }
    })
    .catch(error => console.error('Error uploading file:', error));
});

// Handle receiving files
socket.on('receiveFile', (file) => {
    const chat = document.getElementById('chat');
    const fileElement = document.createElement('div');
    fileElement.classList.add('file-message');
    fileElement.innerHTML = `<a href="${file.url}" download>${file.filename}</a>`;
    chat.appendChild(fileElement);
});
// Check for mentions
const checkForMentions = (message) => {
    const username = localStorage.getItem('username');
    if (message.includes(`@${username}`)) {
        showMentionNotification();
    }
};

// Show mention notification
const showMentionNotification = () => {
    let notification = document.getElementById('mentionNotification');

    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'mentionNotification';
        notification.classList.add('mention-notification');
        document.body.appendChild(notification);
    }

    notification.innerHTML = '';
    notification.textContent = 'You were mentioned in a message!';
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
};

// Call checkForMentions on receiving messages
socket.on('receiveMessage', (message) => {
    checkForMentions(message.text);
});

