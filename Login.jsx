import React, { useState } from "react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "./login.css";
import logo from "./collabo.png";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import upload from '../../lib/upload'; // Ensure correct import

import { auth, db } from '../../lib/firebase'; // Ensure correct import
import { doc, setDoc } from "firebase/firestore";

const Login = () => {
    const [avatar, setAvatar] = useState({
        file: null,
        url: ""
    });

    const [loading, setLoading] = useState(false);

    const handleAvatar = (e) => {
        if (e.target.files[0]) {
            setAvatar({
                file: e.target.files[0],
                url: URL.createObjectURL(e.target.files[0])
            });
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);
        const { email, password } = Object.fromEntries(formData.entries());

        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.log(error);
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
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

            // Handle successful registration
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
        <>
            <div className="homePage">
                <div className="info">
                    <p>
                        <strong>Need to log in or sign up?</strong>
                        Scroll down to the bottom of the page to find the login and sign-up options!
                    </p>
                </div>
                <img src={logo} alt="Collabo Banner" className="banner" />
                <h1>Welcome to Collabo 👋</h1>
                <p className="general">
                    Collabo is an educational tool designed to help students collaborate effectively. Created by middle schooler Ronit Parikh, it offers a way for students to communicate for educational purposes. Whether you're working on group projects, sharing resources, or discussing ideas, Collabo provides the platform you need to succeed together. With our advanced file-sharing capabilities, students can work on projects creatively and efficiently. Collabo is school-friendly and censors NSFW content/messages to ensure a safe and positive learning environment. Dive in and experience seamless collaboration today!
                </p>
                <div className="about">
                    <div className="about-item">
                        <h2>About Collabo</h2>
                        <p><strong>Created by:</strong> Ronit Parikh</p>
                        <p><strong>Use case:</strong> Collabo enhances student collaboration by providing tools for group projects, resource sharing, and idea discussions.</p>
                    </div>
                </div>
                <div className="features">
                    <h2>Features</h2>
                    <ul>
                        <li>Seamless file sharing for easy collaboration</li>
                        <li>Real-time messaging and notifications</li>
                        <li>Safe and secure environment with content moderation</li>
                        <li>Customizable group and project management tools</li>
                        <li>Intuitive interface for effortless communication</li>
                    </ul>
                </div>
                <div className="testimonials">
                    <h2>What Our Users Say</h2>
                    <div className="testimonial">
                        <p>"Collabo has transformed the way we work on projects. The ease of sharing files and communicating has made our group work much more efficient!"</p>
                        <p><strong>- Emily R., High School Student</strong></p>
                    </div>
                    <div className="testimonial">
                        <p>"As a teacher, I love how Collabo keeps my students engaged and organized. It's a fantastic tool for any classroom!"</p>
                        <p><strong>- Mr. Johnson, Math Teacher</strong></p>
                    </div>
                </div>
                <div className="faq">
                    <h2>Frequently Asked Questions</h2>
                    <div className="faq-item">
                        <h3>How do I sign up for Collabo?</h3>
                        <p>Scroll down to the bottom of the page and click on the "Sign Up" button in the footer. Follow the prompts to create your account.</p>
                    </div>
                    <div className="faq-item">
                        <h3>Is Collabo free to use?</h3>
                        <p>Yes, Collabo is completely free for students and educators. There are no hidden fees or charges.</p>
                    </div>
                    <div className="faq-item">
                        <h3>How does Collabo ensure user safety?</h3>
                        <p>Collabo employs advanced content moderation tools to filter inappropriate content and provide a safe environment for all users.</p>
                    </div>
                </div>

                {/* Footer content moved here */}
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
                </div>
            </div>
            <ToastContainer />
        </>
    );
};

export default Login;
