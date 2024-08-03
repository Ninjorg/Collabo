import React, { useState } from 'react';
import "./detail.css";
import arrowUp from './arrowUp.png';
import arrowDown from './arrowDown.png';
import downloadIcon from './download.png';
import avatar from './avatar.png';
import gifIcon from './gif.png';
import notificationSound from './notification.mp3';

const Detail = () => {
    const [isChatSettingsOpen, setIsChatSettingsOpen] = useState(false);
    const [isPrivacyHelpOpen, setIsPrivacyHelpOpen] = useState(false);
    const [isSharedPhotosOpen, setIsSharedPhotosOpen] = useState(false);
    const [isSharedFilesOpen, setIsSharedFilesOpen] = useState(false);
    const [theme, setTheme] = useState("light");

    const toggleSection = (section) => {
        switch (section) {
            case 'chatSettings':
                setIsChatSettingsOpen(!isChatSettingsOpen);
                break;
            case 'privacyHelp':
                setIsPrivacyHelpOpen(!isPrivacyHelpOpen);
                break;
            case 'sharedPhotos':
                setIsSharedPhotosOpen(!isSharedPhotosOpen);
                break;
            case 'sharedFiles':
                setIsSharedFilesOpen(!isSharedFilesOpen);
                break;
            default:
                break;
        }
    }

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === "light" ? "dark" : "light");
    }

    return (
        <div className={`detail ${theme}`}>
            <div className="user">
                <img src={avatar} alt="Avatar" />
                <h2>Bob Russell</h2>
                <p>Hello, I like clouds!</p>
                <p>Status: <span className="online">Online</span></p>
                <p>Last seen: 5 minutes ago</p>
            </div>
            <div className="info">
                <div className="option" onClick={() => toggleSection('chatSettings')}>
                    <div className="title">
                        <span>Chat Settings</span>
                        <img src={isChatSettingsOpen ? arrowUp : arrowDown} alt="Toggle" />
                    </div>
                    {isChatSettingsOpen && (
                        <div className="details">
                            <p>Mute Notifications</p>
                            <p>Clear Chat</p>
                            <p>Archive Chat</p>
                        </div>
                    )}
                </div>
                <div className="option" onClick={() => toggleSection('privacyHelp')}>
                    <div className="title">
                        <span>Privacy & Help</span>
                        <img src={isPrivacyHelpOpen ? arrowUp : arrowDown} alt="Toggle" />
                    </div>
                    {isPrivacyHelpOpen && (
                        <div className="details">
                            <p>Report</p>
                            <p>Block User</p>
                            <p>Help Center</p>
                        </div>
                    )}
                </div>
                <div className="option" onClick={() => toggleSection('sharedPhotos')}>
                    <div className="title">
                        <span>Shared Photos</span>
                        <img src={isSharedPhotosOpen ? arrowUp : arrowDown} alt="Toggle" />
                    </div>
                    {isSharedPhotosOpen && (
                        <div className="photos">
                            <div className="photoItem">
                                <div className="photoDetail">
                                    <img src="https://via.placeholder.com/150" alt="Shared" />
                                    <span>photo_2024_2.png</span>
                                </div>
                                <img src={downloadIcon} alt="Download" className="icon" />
                            </div>
                            <div className="photoItem">
                                <div className="photoDetail">
                                    <img src="https://via.placeholder.com/150" alt="Shared" />
                                    <span>photo_2024_3.png</span>
                                </div>
                                <img src={downloadIcon} alt="Download" className="icon" />
                            </div>
                            {/* Add more photos as needed */}
                        </div>
                    )}
                </div>
                <div className="option" onClick={() => toggleSection('sharedFiles')}>
                    <div className="title">
                        <span>Shared Files</span>
                        <img src={isSharedFilesOpen ? arrowUp : arrowDown} alt="Toggle" />
                    </div>
                    {isSharedFilesOpen && (
                        <div className="files">
                            <div className="fileItem">
                                <span>document_2024.pdf</span>
                                <img src={downloadIcon} alt="Download" className="icon" />
                            </div>
                            <div className="fileItem">
                                <span>report_2024.pdf</span>
                                <img src={downloadIcon} alt="Download" className="icon" />
                            </div>
                            {/* Add more files as needed */}
                        </div>
                    )}
                </div>
                <button className="blockButton">Block User</button>
                <button className="reportButton">Report User</button>
                <button className="muteButton">Mute Notifications</button>
                <button className="themeToggle" onClick={toggleTheme}>
                    {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
                </button>
            </div>
        </div>
    )
}

export default Detail;
