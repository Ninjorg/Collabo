import { useState } from "react";
import { db } from "../../../../lib/firebase";
import "./addUser.css";
import { collection, doc, setDoc, updateDoc, serverTimestamp, arrayUnion, getDocs, query, where, getDoc } from "firebase/firestore";
import { useUserStore } from "../../../../lib/userStore";

const AddUser = () => {
    const [user, setUser] = useState(null);
    const [currentUser] = useUserStore(state => [state.currentUser]);

    const handleAdd = async () => {
        if (!user || !currentUser) return;

        const chatRef = collection(db, "chats");
        const userChatsRef = collection(db, "userchats");

        try {
            // Create a new document reference with an auto-generated ID
            const newChatRef = doc(chatRef);

            // Set the new chat document
            await setDoc(newChatRef, {
                createdAt: serverTimestamp(),
                messages: [],
            });

            // References to user and current user chat documents
            const userChatRef = doc(userChatsRef, user.id);
            const currentUserChatRef = doc(userChatsRef, currentUser.id);

            // Check if the user document exists and create it if not
            const userChatSnap = await getDoc(userChatRef);
            if (!userChatSnap.exists()) {
                await setDoc(userChatRef, { chats: [] });
            }

            // Check if the current user document exists and create it if not
            const currentUserChatSnap = await getDoc(currentUserChatRef);
            if (!currentUserChatSnap.exists()) {
                await setDoc(currentUserChatRef, { chats: [] });
            }

            // Update both user and current user chat documents
            await updateDoc(userChatRef, {
                chats: arrayUnion({
                    chatId: newChatRef.id,
                    lastMessage: " ",
                    receiverId: currentUser.id,
                    updatedAt: Date.now(),
                })
            }, { merge: true });

            await updateDoc(currentUserChatRef, {
                chats: arrayUnion({
                    chatId: newChatRef.id,
                    lastMessage: " ",
                    receiverId: user.id,
                    updatedAt: Date.now(),
                })
            }, { merge: true });

            console.log("New chat added with ID:", newChatRef.id);
        } catch (error) {
            console.error("Error adding chat:", error);
        }
    };

    const handleSearch = async e => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const username = formData.get("username");

        try {
            const userRef = collection(db, "users");
            const q = query(userRef, where("username", "==", username));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                setUser(querySnapshot.docs[0].data());
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error("Error searching user:", error);
        }
    };

    return (
        <div className="addUser">
            <form onSubmit={handleSearch}>
                <input type="text" placeholder="Username" name="username" />
                <button type="submit">Search</button>
            </form>
            {user && (
                <div className="user">
                    <div className="detail">
                        <img src={user.avatar || "./avatar.png"} alt={user.username} />
                        <span>{user.username}</span>
                        <button onClick={handleAdd}>Add User</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddUser;
