import React from "react";
import "./login.css";
import logo from "./collabo.png"; // Import the image

const Login = () => {
    return (
        <>
            <div className="homePage">
                <img src={logo} alt="Collabo Banner" className="banner"/>
                <h1>Welcome 👋</h1>
                <p className= "general">Collabo is an educational tool designed to help students collaborate effectively. Created by a middle schooler RONIT PARIKH, it offers away for students to communicate for educational purposes. Whether you're working on group projects, sharing resources, or discussing ideas, Collabo provides the platform you need to succeed together. With our advanced file sharing capabilities, students can work together on projects and creatively collaborate. Collabo is school friendly and censors NSFW content/messages. It is our priority to keep students safe and happy in a learning environment. So what are you waiting for? Jump right in and experience collaboration at its finest!</p>
                <div className="about">
                    <div className="about-item">
                        <p><strong>Created by:</strong> [Your Name or Team]</p>
                    </div>
                    <div className="about-item">
                        <p><strong>Use case:</strong> Collabo is designed to enhance student collaboration by providing tools for group projects, resource sharing, and idea discussions.</p>
                    </div>
                </div>
                <div className="login">
                    <div className="item">Login Item 1</div>
                    <div className="seperator"></div>
                    <div className="item">Login Item 2</div>
                </div>
            </div>

            <div className="footer">
                <p>&copy; {new Date().getFullYear()} Collabo. .</p>
            </div>
        </>
    );
}

export default Login;
