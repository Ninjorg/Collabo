import React, { useState, useEffect, useRef } from 'react';
import "./chat.css";
import EmojiPicker from "emoji-picker-react";
import gifIcon from './gif.png'; // GIF icon
import notificationSound from './notification.mp3'; // Notification sound
import videoIcon from './video.png'; // Video icon
import fileIcon from './file.png'; // File icon
import botAvatar from './bot.png'; // Chatbot avatar

const Chat = () => {
    const [open, setOpen] = useState(false);
    const [text, setText] = useState("");
    const [messages, setMessages] = useState([
        { id: 1, text: "YO WSGGG", own: false, timestamp: "1 min ago", reactions: {}, read: false },
        { id: 2, text: "Hello, my name is Ronit but I am referred to in a non-disclosure as Ron. Please refer to me as Bob. Ty.", own: true, timestamp: "1 min ago", reactions: {}, read: false },
        { id: 3, text: "YO WSGGG", own: false, timestamp: "1 min ago", reactions: {}, read: false },
        { id: 4, text: "YO WSGGG", own: true, timestamp: "1 min ago", reactions: {}, read: false }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const [theme, setTheme] = useState("light");
    const [editingMessage, setEditingMessage] = useState(null);
    const [file, setFile] = useState(null);
    const [video, setVideo] = useState(null);
    const [liveTypingUsers, setLiveTypingUsers] = useState([]);
    const audioRef = useRef(null);

    useEffect(() => {
        // Simulate live typing from other users
        if (liveTypingUsers.length > 0) {
            const timer = setTimeout(() => setLiveTypingUsers([]), 3000);
            return () => clearTimeout(timer);
        }
    }, [liveTypingUsers]);

    const handleEmoji = (e, emojiObject) => {
        setText(prev => prev + emojiObject.emoji);
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 1000);
    }

    const handleSend = () => {
        if (text.trim() || file || video) {
            const newMessage = {
                id: messages.length + 1,
                text,
                own: true,
                timestamp: "Just now",
                reactions: {},
                read: false,
                file: file ? URL.createObjectURL(file) : null,
                video: video ? URL.createObjectURL(video) : null
            };

            setMessages(prev => [...prev, newMessage]);
            setText("");
            setFile(null);
            setVideo(null);
            setIsTyping(false);
            audioRef.current.play();
        }
    }

    const handleTextChange = (e) => {
        setText(e.target.value);
        setIsTyping(true);
        // Simulate live typing from the user
        setLiveTypingUsers(["Timy"]);
    }

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === "light" ? "dark" : "light");
    }

    const handleEditMessage = (message) => {
        setText(message.text);
        setEditingMessage(message);
    }

    const handleReact = (id, emoji) => {
        setMessages(prev =>
            prev.map(msg =>
                msg.id === id
                    ? { ...msg, reactions: { ...msg.reactions, [emoji]: (msg.reactions[emoji] || 0) + 1 } }
                    : msg
            )
        );
    }

    const handleFileUpload = (e) => {
        setFile(e.target.files[0]);
    }

    const handleVideoUpload = (e) => {
        setVideo(e.target.files[0]);
    }

    const handleBotResponse = () => {
        // Simulate a bot response
        setMessages(prev => [...prev, { id: prev.length + 1, text: "This is an automated response.", own: false, timestamp: "Just now", reactions: {}, read: false, file: null, video: null }]);
    }

    return (
        <div className={`chat ${theme}`}>
            <div className="top">
                <div className="user">
                    <img src="./avatar.png" alt="Avatar"/>
                    <div className="texts">
                        <span>Timy</span>
                        <p>My name is Ronit, You have a leaky faucet then I'm on it.</p>
                    </div>
                </div>
                <div className="icons">
                    <img src="./phone.png" alt="Call"/>
                    <img src="./video.png" alt="Video"/>
                    <img src="./info.png" alt="Info"/>
                    <button onClick={toggleTheme}>
                        {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
                    </button>
                </div>
            </div>
            <div className="center">
                {messages.map((message, index) => (
                    <div className={`message ${message.own ? "own" : ""}`} key={index}>
                        {!message.own && <img src="./avatar.png" alt="Avatar"/>}
                        <div className="texts">
                            <p onDoubleClick={() => handleReact(message.id, "❤️")}>{message.text}</p>
                            {message.file && <a href={message.file} download>Download File</a>}
                            {message.video && <video src={message.video} controls />}
                            <span>{message.timestamp}</span>
                            <div className="reactions">
                                {Object.entries(message.reactions).map(([emoji, count]) => (
                                    <span key={emoji}>{emoji} {count}</span>
                                ))}
                            </div>
                            {message.own && (
                                <button onClick={() => handleEditMessage(message)}>Edit</button>
                            )}
                        </div>
                    </div>
                ))}
                {isTyping && <div className="typing-indicator">You are typing...</div>}
                {liveTypingUsers.length > 0 && (
                    <div className="live-typing">
                        {liveTypingUsers.join(", ")} {liveTypingUsers.length > 1 ? "are" : "is"} typing...
                    </div>
                )}
            </div>
            <div className="bottom">
                <div className="icon">
                    <input type="file" accept="video/*" id="video-upload" style={{ display: "none" }} onChange={handleVideoUpload} />
                    <label htmlFor="video-upload"><img src={videoIcon} alt="Video" /></label>
                    <input type="file" accept="*/*" id="file-upload" style={{ display: "none" }} onChange={handleFileUpload} />
                    <label htmlFor="file-upload"><img src={fileIcon} alt="File" /></label>
                    <img src={gifIcon} alt="GIF" onClick={() => alert("GIF feature coming soon!")}/>
                    <img src="./mic.png" alt="Mic"/>
                </div>
                <input
                    type="text"
                    placeholder="Type a message..."
                    value={text}
                    onChange={handleTextChange}
                />
                <div className="emoji">
                    <img src="./emoji.png" alt="Emoji" onClick={() => setOpen(prev => !prev)}/>
                    {open && (
                        <div className="picker">
                            <EmojiPicker onEmojiClick={handleEmoji}/>
                        </div>
                    )}
                </div>
                <button className="sendButton" onClick={handleSend}>{editingMessage ? "Update" : "Send"}</button>
            </div>
            <audio ref={audioRef} src={notificationSound} />
            <div className="bot">
                <img src={botAvatar} alt="Bot"/>
                <button onClick={handleBotResponse}>Ask Bot</button>
            </div>
        </div>
    )
}

export default Chat;
