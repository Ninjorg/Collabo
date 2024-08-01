import React, { useState, useEffect, useRef } from 'react';
import "./chat.css";
import EmojiPicker from "emoji-picker-react";
import gifIcon from './gif.png';
import notificationSound from './notification.mp3';
import videoIcon from './video.png';
import fileIcon from './file.png';
import botAvatar from './bot.png';
import stickerIcon from './sticker.png';
import locationIcon from './location.png';
import micIcon from './mic.png';

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
    const [location, setLocation] = useState(null);
    const [recording, setRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const audioRef = useRef(null);
    const mediaRecorderRef = useRef(null);

    useEffect(() => {
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
        if (text.trim() || file || video || audioUrl || location) {
            const newMessage = {
                id: messages.length + 1,
                text,
                own: true,
                timestamp: "Just now",
                reactions: {},
                read: false,
                file: file ? URL.createObjectURL(file) : null,
                video: video ? URL.createObjectURL(video) : null,
                audio: audioUrl,
                location
            };

            setMessages(prev => [...prev, newMessage]);
            setText("");
            setFile(null);
            setVideo(null);
            setAudioUrl(null);
            setLocation(null);
            setIsTyping(false);
            audioRef.current.play();
        }
    }

    const handleTextChange = (e) => {
        setText(e.target.value);
        setIsTyping(true);
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
        setMessages(prev => [...prev, { id: prev.length + 1, text: "This is an automated response.", own: false, timestamp: "Just now", reactions: {}, read: false, file: null, video: null }]);
    }

    const handleStickerSelect = (sticker) => {
        setMessages(prev => [...prev, { id: prev.length + 1, text: "", own: true, timestamp: "Just now", reactions: {}, read: false, sticker }]);
    }

    const handleLocationShare = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
                setMessages(prev => [...prev, { id: prev.length + 1, text: "Shared location", own: true, timestamp: "Just now", reactions: {}, read: false, location: { lat: position.coords.latitude, lng: position.coords.longitude } }]);
            });
        }
    }

    const startRecording = () => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    const mediaRecorder = new MediaRecorder(stream);
                    mediaRecorderRef.current = mediaRecorder;
                    mediaRecorder.start();

                    const audioChunks = [];
                    mediaRecorder.addEventListener("dataavailable", event => {
                        audioChunks.push(event.data);
                    });

                    mediaRecorder.addEventListener("stop", () => {
                        const audioBlob = new Blob(audioChunks);
                        const audioUrl = URL.createObjectURL(audioBlob);
                        setAudioUrl(audioUrl);
                        setMessages(prev => [...prev, { id: prev.length + 1, text: "", own: true, timestamp: "Just now", reactions: {}, read: false, audio: audioUrl }]);
                    });

                    setRecording(true);
                });
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setRecording(false);
        }
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
                            {message.sticker && <img src={message.sticker} alt="Sticker" />}
                            <p onDoubleClick={() => handleReact(message.id, "❤️")}>{message.text}</p>
                            {message.file && <a href={message.file} download>Download File</a>}
                            {message.video && <video src={message.video} controls />}
                            {message.audio && <audio src={message.audio} controls />}
                            {message.location && <a href={`https://www.google.com/maps?q=${message.location.lat},${message.location.lng}`} target="_blank" rel="noopener noreferrer">View Location</a>}
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
                    <label>
                        <img src="./img.png" alt="File" />
                        <input type="file" style={{ display: "none" }} onChange={handleFileUpload} />
                    </label>
                    <label>
                        <img src={videoIcon} alt="Video" />
                        <input type="file" accept="video/*" style={{ display: "none" }} onChange={handleVideoUpload} />
                    </label>
                    <label>
                        <img src={micIcon} alt="Mic" onClick={recording ? stopRecording : startRecording} />
                    </label>
                    <img src={stickerIcon} alt="Stickers" onClick={() => handleStickerSelect(stickerIcon)} />
                    <img src={locationIcon} alt="Location" onClick={handleLocationShare} />
                </div>
                <input type="text" placeholder="Type a message..." value={text} onChange={handleTextChange} />
                <div className="emoji">
                    <img src="./emoji.png" alt="Emoji" onClick={() => setOpen(prev => !prev)} />
                    <div className={`picker ${open ? "open" : ""}`}>
                        <EmojiPicker onEmojiClick={handleEmoji} />
                    </div>
                </div>
                <button className="sendButton" onClick={handleSend}>Send</button>
                <audio ref={audioRef} src={notificationSound} />
            </div>
        </div>
    )
}

export default Chat;
