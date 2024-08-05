import React, { useEffect, useState, useRef } from 'react';
import "./chat.css";
import EmojiPicker from "emoji-picker-react";
import { arrayUnion, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useChatStore } from '../../lib/chatStore';
import useUserStore from '../../lib/userStore';

const Chat = () => {
    const [chat, setChat] = useState();
    const [open, setOpen] = useState(false);
    const [text, setText] = useState("");

    const { currentUser } = useUserStore;
    const { chatId, user} = useChatStore();

    const endRef = useRef(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chat]);

    useEffect(() => {
        const unSub = onSnapshot(doc(db, "chats", chatId), (res) => {
            setChat(res.data());
        });

        return () => {
            unSub();
        };
    }, [chatId]);

    const handleEmoji = e => {
        console.log(e);
        setText(prev => prev + e.emoji);
        setOpen(false);
    };

    const handleSend = async ()=>{
        if(text === "") return;

        try {

            await updateDoc(doc(db, "chats", chatId),{
                messages:arrayUnion({
                    senderId: currentUser.id,
                    text,
                    createdAt: new Date(),
                })
            })

            const userIds = [currentUser.id, user.id]

            userIds.forEach(async (id) => {
                const userChatsRef = doc(db, "userChats", id);
                const userChatsSnapshot = await getDoc(userChatsRef)

                if(userChatsSnapshot.exists()) {
                    const userChatsData = userChatsSnapshot.data()

                    const chatIndex = userChatsData.chats.findIndex(c=> c.chatId === chatId)

                    userChatsData.ch(chatIndex).lastMessage = text
                    userChatsData(chatIndex).isSeen = id === currentUser.id ? true : false;
                    userChatsData(chatIndex).updatedAt= date.now();

                    await updateDoc(userChatsRef, {
                        chats: userChatsData.chats,
                    })
                }
            })
            

        } catch (error) {
            console.log(error)
        }
    }

    return (
        <div className='chat'>
            <div className="top">
                <div className="user">
                    <img src="./avatar.png" alt=""/>
                    <div className="texts">
                        <span>Timy</span>
                        <p>My name is Ronit, You have a leaky focet then I'm on it.</p>
                    </div>
                </div>
                <div className="icons">
                    <img src="./phone.png" alt=""/>
                    <img src="./video.png" alt=""/>
                    <img src="./info.png" alt=""/>
                </div>
            </div>
            <div className="center">
                {chat?.messages?.map(message => (
                    <div key={message?.createAt}>
                        <div className="message own">
                            <div className="texts">
                                {message.img && <img src={message.img} alt="" />}
                                <p>{message.text}</p>
                                {/* <span>{message}</span> */}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={endRef}></div>
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
                    onChange={(e => setText(e.target.value))} 
                />
                <div className="emoji">
                    <img src="./emoji.png" alt="" onClick={() => setOpen(prev => !prev)} />
                    {open && (
                        <div className="picker">
                            <EmojiPicker onEmojiClick={handleEmoji} />
                        </div>
                    )}
                </div>
                <button className="sendButton" onClick={handleSend}>Send</button>
            </div>
        </div>
    );
};

export default Chat;
