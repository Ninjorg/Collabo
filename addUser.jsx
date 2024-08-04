import { useState } from "react";
import { db } from "../../../../lib/firebase";
import "./addUser.css";
import { collection, query, where, getDocs } from "firebase/firestore";

const AddUser = () => {
    const [user, setUser] = useState(null);

    const handleAdd = async () => {

        const chatRef = collection(db, "chats");

        try {
            
        } catch (error) {
            
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
                // Handle case where no users are found
                setUser(null);
            }
        } catch (error) {
            console.log(error);
        }
    };

    return (
        <div className="addUser">
            <form onSubmit={handleSearch}>
                <input type="text" placeholder="Username" name="username" />
                <button>Search</button>
            </form>
            {user && (
                <div className="user">
                    <div className="detail">
                        <img src={user.avatar || "./avatar.png"} alt="" />
                        <span>{user.username}</span>
                        <button onlick = {handleAdd}>Add User</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddUser;
