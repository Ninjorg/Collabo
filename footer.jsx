// src/components/Footer.jsx
import React, { useState } from "react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import upload from '../../lib/upload'; // Ensure correct import
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from '../../lib/firebase'; // Ensure correct import
import { doc, setDoc } from "firebase/firestore";

const Footer = () => {
    const [avatar, setAvatar] = useState({ file: null, url: "" });
    const [loading, setLoading] = useState(false);

    const handleAvatar = (e) => {
        if (e.target.files[0]) {
            setAvatar({
                file: e.target.files[0],
                url: URL.createObjectURL(e.target.files[0])
            });
        }
    };

    const handleLogin = (e) => {
        e.preventDefault();
        toast.warn("Hello");
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.target);
        const { username, email, password } = Object.fromEntries(formData.entries());

        try {
            const res = await createUserWithEmailAndPassword(auth, email, password);
            const imgUrl = await upload(avatar.file);

            await setDoc(doc(db, "users", res.user.uid), {
                username,
                email,
                avatar: imgUrl,
                id: res.user.uid,
                blocked: []
            });

            await setDoc(doc(db, "userchats", res.user.uid), {
                chats: [],
            });

            console.log("User registered successfully:", res.user);
            toast.success("User registered successfully! Try logging in 😊");
        } catch (error) {
            console.log(error);
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-footer">
            <div className="item">
                <form onSubmit={handleLogin}>
                    <h2>Sign In</h2>
                    <input type="text" placeholder="Email" name="email" />
                    <input type="password" placeholder="Password" name="password" />
                    <button disabled={loading}>{loading ? "Loading" : "Let's Go!"}</button>
                </form>
            </div>
            <div className="seperator"></div>
            <div className="item">
                <form onSubmit={handleRegister}>
                    <h2>Sign Up</h2>
                    <label htmlFor="file">
                        <img src={avatar.url || "./avatar.png"} alt="" />
                        Upload your profile picture
                    </label>
                    <input type="file" id="file" style={{ display: "none" }} onChange={handleAvatar} />
                    <input type="text" placeholder="Username" name="username" />
                    <input type="email" placeholder="Email" name="email" />
                    <input type="password" placeholder="Password" name="password" />
                    <button disabled={loading}>{loading ? "Loading" : "Start!"}</button>
                </form>
            </div>
            <ToastContainer />
        </div>
    );
};

export default Footer;
