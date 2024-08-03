import React, { useState, useEffect, useRef } from 'react';
import "./chat.css";
import EmojiPicker from "emoji-picker-react";

const Chat = () => {
    const [open, setOpen] = useState(false);
    const [text, setText] = useState("");
    const [messages, setMessages] = useState([]);
    const messageEndRef = useRef(null);

    const handleEmoji = (e, emojiObject) => {
        setText(prev => prev + emojiObject.emoji);
        setOpen(false);
    };

    const handleSend = () => {
        if (text.trim() !== "") {
            setMessages([...messages, { text, sender: 'me' }]);
            setText("");
        }
    };

    const handleEnter = (e) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className='chat'>
            <div className="top">
                <div className="user">
                    <img src="./avatar.png" alt=""/>
                    <div className="texts">
                        <span>Timy</span>
                        <p>My name is Ronit, You have a leaky faucet then I'm on it.</p>
                    </div>
                </div>
                <div className="icons">
                    <img src="./phone.png" alt=""/>
                    <img src="./video.png" alt=""/>
                    <img src="./info.png" alt=""/>
                </div>
            </div>
            <div className="center">
                {messages.map((message, index) => (
                    <div key={index} className={`message ${message.sender}`}>
                        <p>{message.text}</p>
                    </div>
                ))}
                <div ref={messageEndRef} />
            </div>
            <div className="bottom">
                <div className="icon">
                    <img src="./img.png" alt=""/>
                    <img src="./camera.png" alt=""/>
                    <img src="./mic.png" alt=""/>
                </div>
                <input 
                    type="text" 
                    placeholder="Type a message..." 
                    value={text} 
                    onChange={(e) => setText(e.target.value)} 
                    onKeyDown={handleEnter}
                />
                <div className="emoji">
                    <img src="./emoji.png" alt="" onClick={() => setOpen(prev => !prev)}/>
                    {open && (
                        <div className="picker">
                            <EmojiPicker onEmojiClick={handleEmoji}/>
                        </div>
                    )}
                </div>
                <button className="sendButton" onClick={handleSend}>Send</button>
            </div>
        </div>
    );
}

export default Chat;
