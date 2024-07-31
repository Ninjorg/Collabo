import "./ChatList.css"

const Chatlist = () => {
    return (
        <div className ='chatList'>
            <div className = "search">
                <div className = "searchBar">
                    <img src= "./search.png" alt="" />
                    <input type= "text" placeholder="search" />
                </div>
                <img src= "./plus.png" alt="" className= "add" />
            </div>
        </div>
    )
}

export default Chatlist