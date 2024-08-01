import "./detail.css"
const Detail = () => {
    return (
        <div className ='detail'>
            <div className="user">
            <img src="./avatar.png" alt="" />
                <h2>Bob Russsel</h2>
                <p>Hello, I like clouds!</p>
            </div>
            <div className="info">
                <div className="option">
                    <div className="title">
                        <span>Chat Settings</span>
                        <img src="arrowUp.png" alt="" />
                    </div>
                </div>
                <div className="option">
                    <div className="title">
                        <span>Chat Settings</span>
                        <img src="arrowUp.png" alt="" />
                    </div>
                </div>
                <div className="option">
                    <div className="title">
                        <span>Privacy & Help</span>
                        <img src="arrowUp.png" alt="" />
                    </div>
                </div>
                <div className="option">
                    <div className="title">
                        <span>Shared Photos</span>
                        <img src="arrowDown.png" alt="" />
                    </div>
                        <div className="photos">
                            <div className="photoItem">
                                <div className="phoyoDetail">
                                    <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS92cMXfUwQSMFMcS-U9JrsKK5XNJMw-P-Sus1MuxmWVHVJ03AC-DtMc-betZYjA6UaD7O-fmJ6MrXj4urZStnTHZr_r6q7BMC4hYDA6IE" alt="" />
                                    <span>photo_2024_2.png</span>
                                </div>
                                <img src="./download.png" alt="" className= "icon"/>
                            </div>
                            <div className="photoItem">
                                <div className="phoyoDetail">
                                    <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS92cMXfUwQSMFMcS-U9JrsKK5XNJMw-P-Sus1MuxmWVHVJ03AC-DtMc-betZYjA6UaD7O-fmJ6MrXj4urZStnTHZr_r6q7BMC4hYDA6IE" alt="" />
                                    <span>photo_2024_2.png</span>
                                </div>
                                <img src="./download.png" alt="" className= "icon" />
                            </div>
                            <div className="photoItem">
                                <div className="phoyoDetail">
                                    <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS92cMXfUwQSMFMcS-U9JrsKK5XNJMw-P-Sus1MuxmWVHVJ03AC-DtMc-betZYjA6UaD7O-fmJ6MrXj4urZStnTHZr_r6q7BMC4hYDA6IE" alt="" />
                                    <span>photo_2024_2.png</span>
                                </div>
                                <img src="./download.png" alt="" className= "icon" />
                            </div>
                            <div className="photoItem">
                                <div className="phoyoDetail">
                                    <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS92cMXfUwQSMFMcS-U9JrsKK5XNJMw-P-Sus1MuxmWVHVJ03AC-DtMc-betZYjA6UaD7O-fmJ6MrXj4urZStnTHZr_r6q7BMC4hYDA6IE" alt="" />
                                    <span>photo_2024_2.png</span>
                                </div>
                                <img src="./download.png" alt="" className= "icon" />
                            </div>
                        </div>
                </div>
                <div className="option">
                    <div className="title">
                        <span>Shared Files</span>
                        <img src="arrowUp.png" alt="" />
                    </div>
                </div>
                <button>Block User</button>
            </div>
        </div>
    )
}

export default Detail
