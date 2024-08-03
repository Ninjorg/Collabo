import React from 'react';
import "./userInfo.css";
import avatar from './avatar.png';
import moreIcon from './more.png';
import videoIcon from './video.png';
import editIcon from './edit.png';
import notificationSound from './notification.mp3';

const Userinfo = () => {
    const handleMoreOptions = () => {
        // Logic for more options
        alert("More options clicked!");
    };

    const handleVideoCall = () => {
        // Logic for initiating a video call
        alert("Video call clicked!");
    };

    const handleEditProfile = () => {
        // Logic for editing profile
        alert("Edit profile clicked!");
    };

    return (
        <div className='userInfo'>
            <div className='user'>
                <img src={avatar} alt="Avatar" />
                <h2>Bob Ross</h2>
                <p>Status: <span className="online">Online</span></p>
                <p>Last seen: 5 minutes ago</p>
            </div>
            <div className='icons'>
                <img src={moreIcon} alt="More" onClick={handleMoreOptions} />
                <img src={videoIcon} alt="Video Call" onClick={handleVideoCall} />
                <img src={editIcon} alt="Edit Profile" onClick={handleEditProfile} />
            </div>
            <audio src={notificationSound} autoPlay={false} />
        </div>
    );
}

export default Userinfo;
