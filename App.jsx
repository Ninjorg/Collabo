import Chat from "./components/chat/Chat";
import List from "./components/list/List";
import Detail from "./components/detail/Detail";
import Login from "./components/login/Login";
import Notification from "./components/notification/Notification";
import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./lib/firebase";

const App = () => {

  useEffect(() =>{
    const unSub = onAuthStateChanged(auth, (user) => {
      console.log(user)
    })

    return ()=>{
      unSub();
    }
  }, [])


  return (
    <div className='container'>
      {
        user ? (
        <>
          <List/>
          <Chat/>
          <Detail/>
        </>
        ) : (
        <Login/>
        )
      }
      <Notification/>
    </div>
  )
}

export default App
