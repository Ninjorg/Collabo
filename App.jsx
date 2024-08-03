import Chat from "./components/chat/Chat";
import List from "./components/list/List";
import Detail from "./components/detail/Detail";
import Login from "./components/login/Login"

const user = false

const App = () => {
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
    </div>
  )
}

export default App
