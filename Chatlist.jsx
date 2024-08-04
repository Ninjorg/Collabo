import React, { useState, useEffect } from "react";
import './ChatList.css';
import AddUser from './addUser/addUser.jsx';
import { useUserStore } from '../../../lib/userStore';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

const Chatlist = () => {
    const [addMode, setAddMode] = useState(false);
    const [chats, setChats] = useState([]);
    const { currentUser } = useUserStore();

    useEffect(() => {
        const chatDocRef = doc(db, "userchats", currentUser.id);
        const unsubscribe = onSnapshot(chatDocRef, (res) => {
            const items = res.data().chats;

            async (res) => {
                const promises = itmes.map(async(item) => {
                    const userDocRef = doc(db, "users", item.receiverId);
                    const userDocSnap = await getDoc(userdocRef);

                    const user = userDocSnap.data();

                    return {...item, user};
                })
                const chatData = await Promise.all(promises)
                setChats(chatData.sort((a,b)=>b.updatedAt - a.updatedAt));
            } 
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, [currentUser.id]);


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
                <div className="item" key={chat.chatid}>
                    <img src="./avatar.png" alt="" />
                    <div className="texts">
                        <span>Charles Dickonson</span>
                        <p>{chat.lastMessage}A</p>
                    </div>
                </div>
            ))}
            {addMode && <AddUser />}
        </div>
    );
}

export default Chatlist;
