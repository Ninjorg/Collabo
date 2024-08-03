import React, { useState } from "react";
import Chat from "./components/chat/Chat";
import List from "./components/list/List";
import Detail from "./components/detail/Detail";
import "./App.css";

const App = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [chats, setChats] = useState([
    { id: 1, name: "Chat 1", detail: "Detail 1", messages: ["Hello", "How are you?"] },
    { id: 2, name: "Chat 2", detail: "Detail 2", messages: ["Hi", "Good evening"] },
    { id: 3, name: "Chat 3", detail: "Detail 3", messages: ["Hey", "What's up?"] },
    // Add more chats as needed
  ]);

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleChatSelection = (chat) => {
    setSelectedChat(chat);
    setSelectedDetail(chat.detail);
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  return (
    <div className='container'>
      <div className="list-container">
        <input
          type="text"
          placeholder="Search chats..."
          value={searchTerm}
          onChange={handleSearch}
          className="search-bar"
        />
        <List
          chats={filteredChats}
          onChatSelect={handleChatSelection}
        />
      </div>
      <Chat selectedChat={selectedChat} />
      <Detail selectedDetail={selectedDetail} />
    </div>
  );
};

export default App;
