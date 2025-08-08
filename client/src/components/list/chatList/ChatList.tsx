import "./ChatList.css"
import avatar from "../../../assets/avatar.png"

const users = [
  {
    name: 'Avanish',
    last_message: "Good Night!",
    last_message_time: "08:45",
  },
  {
    name: 'Suraj Prajapati',
    last_message: "Kal milte hai",
    last_message_time: "12:05",
  },
  {
    name: 'Nilesh Kumar Sahani',
    last_message: "How you doin!",
    last_message_time: "10:10",
  },
  {
    name: 'Avanish',
    last_message: "Good Night!",
    last_message_time: "08:45",
  },
  {
    name: 'Suraj Prajapati',
    last_message: "Kal milte hai",
    last_message_time: "12:05",
  },
  {
    name: 'Nilesh Kumar Sahani',
    last_message: "How you doin!",
    last_message_time: "10:10",
  },
  {
    name: 'Avanish',
    last_message: "Good Night!",
    last_message_time: "08:45",
  },
  {
    name: 'Suraj Prajapati',
    last_message: "Kal milte hai",
    last_message_time: "12:05",
  },
  {
    name: 'Nilesh Kumar Sahani',
    last_message: "How you doin!",
    last_message_time: "10:10",
  },
]
const ChatList = () => {
  return (
    <div className="chat-list">
      {
        users.map( (user, index) => (
          <div className="outer-user-container" key={index}>
            <div className="left-user-list">
              <div className="user-avatar">
                <img src={avatar} alt="user-avatar" />
              </div>
              <div className="user-info">
                <span>{user.name}</span>
                <span>{user.last_message}</span>
              </div>
            </div>
            <div className="message-time">
              <span>{user.last_message_time}</span>
            </div>
          </div>
      ))}
    </div>
  )}

export default ChatList