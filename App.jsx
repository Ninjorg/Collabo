import React, { useState } from "react";
import Chat from "./components/chat/Chat";
import List from "./components/list/List";
import Detail from "./components/detail/Detail";
import "./App.css";

const App = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);

  return (
    <div className='container'>
      <List setSelectedChat={setSelectedChat} />
      <Chat selectedChat={selectedChat} />
      <Detail selectedDetail={selectedDetail} />
    </div>
  );
}

export default App;
