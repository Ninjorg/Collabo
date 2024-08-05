import React, { useState, useEffect } from "react";
import './ChatList.css';
import AddUser from './addUser/addUser.jsx';
import { useUserStore } from '../../../lib/userStore';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useChatStore } from "../../../lib/chatStore";

const ChatList = () => {
    const [addMode, setAddMode] = useState(false);
    const [chats, setChats] = useState([]);
    const { currentUser } = useUserStore();
    const { changeChat } = useChatStore();

    useEffect(() => {
        if (!currentUser) return; // Early return if currentUser is not available

        const chatDocRef = doc(db, "userchats", currentUser.id);
        const unsubscribe = onSnapshot(chatDocRef, async (res) => {
            const data = res.data();

            if (data && Array.isArray(data.chats)) {
                const items = data.chats;

                const promises = items.map(async (item) => {
                    const userDocRef = doc(db, "users", item.receiverId);
                    const userDocSnap = await getDoc(userDocRef);

                    const user = userDocSnap.data();

                    return { ...item, user };
                });

                const chatData = await Promise.all(promises);
                setChats(chatData.sort((a, b) => b.updatedAt - a.updatedAt));
            } else {
                setChats([]);
            }
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleSelect = async (chat) => {
        
        const userChats = chats.map(item => {
            const {user, ...rest} = item;
            return rest;
        })

        const chatIndex = userChats.findIndex(item => item.chatId === chat.chatId)

        userChats[chatIndex].isSeem = true;

        const userChatsRef = doc (db, "userchats", currentUser.id);

        try {
            await updateDoc(userChatsRef,{
                chats: userChats,

            });
            changeChat(chat.chatId, chat.user);
        } catch (error) {
            console.log(err)
            
        }
    }

    return (
        <div className='chatList'>
            <div className='search'>
                <div className='searchBar'>
                    <img src="./search.png" alt="Search Icon" />
                    <input type='text' placeholder='Search' />
                </div>
                <img
                    src={addMode ? "./minus.png" : "./plus.png"}
                    alt={addMode ? "Minus Icon" : "Plus Icon"}
                    className='add'
                    onClick={() => setAddMode(prev => !prev)}
                />
            </div>

            {chats.map((chat) => (
                <div className="item" key={chat.chatId} onClick={() => handleSelect(chat)} style= {{backgroundColor: chat?.isSeen ? "transparent" : "#ff1158"}}>
                    <img src={chat.user.avatar || "./avatar.png"} alt="" />
                    <div className="texts">
                        <span>{chat.user.username}</span>
                        <p>{chat.lastMessage}</p>
                    </div>
                </div>
            ))}
            {addMode && <AddUser />}
        </div>
    );
}

export default ChatList;
