import React, { useState, useRef } from 'react';
import "./chat.css";
import EmojiPicker from "emoji-picker-react";
import gifIcon from './gif.png'; // Assuming you have a GIF icon
import notificationSound from './notification.mp3'; // Notification sound

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
    const audioRef = useRef(null);

    const handleEmoji = (e, emojiObject) => {
        setText(prev => prev + emojiObject.emoji);
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 1000);
    }

    const handleSend = () => {
        if (text.trim()) {
            if (editingMessage) {
                setMessages(prev =>
                    prev.map(msg =>
                        msg.id === editingMessage.id ? { ...msg, text } : msg
                    )
                );
                setEditingMessage(null);
            } else {
                setMessages(prev => [
                    ...prev,
                    { id: prev.length + 1, text, own: true, timestamp: "Just now", reactions: {}, read: false }
                ]);
            }
            setText("");
            setIsTyping(false);
            audioRef.current.play(); // Play notification sound
        }
    }

    const handleTextChange = (e) => {
        setText(e.target.value);
        setIsTyping(true);
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
                {isTyping && <div className="typing-indicator">Timy is typing...</div>}
            </div>
            <div className="bottom">
                <div className="icon">
                    <img src="./img.png" alt="Attach"/>
                    <img src="./camera.png" alt="Camera"/>
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
        </div>
    )
}

export default Chat;
