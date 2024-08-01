import React, { useState } from 'react';
import "./chat.css";
import EmojiPicker from "emoji-picker-react";

const Chat = () => {
    const [open, setOpen] = useState(false);
    const [text, setText] = useState("");
    const [messages, setMessages] = useState([
        { text: "YO WSGGG", own: false, timestamp: "1 min ago" },
        { text: "Hello, my name is Ronit but I am referred to in a non-disclosure as Ron. Please refer to me as Bob. Ty.", own: true, timestamp: "1 min ago" },
        { text: "YO WSGGG", own: false, timestamp: "1 min ago" },
        { text: "YO WSGGG", own: true, timestamp: "1 min ago" }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const [theme, setTheme] = useState("light");

    const handleEmoji = (e, emojiObject) => {
        setText(prev => prev + emojiObject.emoji);
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 1000); // Simulate typing stop after selecting emoji
    }

    const handleSend = () => {
        if (text.trim()) {
            setMessages(prev => [...prev, { text, own: true, timestamp: "Just now" }]);
            setText("");
            setIsTyping(false);
        }
    }

    const handleTextChange = (e) => {
        setText(e.target.value);
        setIsTyping(true);
    }

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === "light" ? "dark" : "light");
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
                            <p>{message.text}</p>
                            <span>{message.timestamp}</span>
                        </div>
                    </div>
                ))}
                {isTyping && <div className="typing-indicator">Timy is typing...</div>}
            </div>
            <div className="bottom">
                <div className="icon">
                    <img src="./img.png" alt="Attach"/>
                    <img src="./camera.png" alt="Camera"/>
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
                <button className="sendButton" onClick={handleSend}>Send</button>
            </div>
        </div>
    )
}

export default Chat;
