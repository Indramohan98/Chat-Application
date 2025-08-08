import "./Chat.css"
import Avatar from "../../assets/avatar.png"
import Phone from "../../assets/phone.png"
import Video from "../../assets/video.png"
import Info from "../../assets/info.png"
import Plus from "../../assets/plus.png"
import Emoji from "../../assets/emoji.png"
import Mic from "../../assets/mic.png"
import Minus from "../../assets/minus.png"
import { useEffect, useRef, useState } from "react"
import Details from "../detail/Details"

const Chat = () => {


  const [showDetails , setShowDetails] = useState(true)

  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({behavior: "smooth"})
  }, [])

  return (
    <div className='chat'>
      <div className="top">
        <div className="left-top">
          <img src={Avatar} alt="avatar" />
          <div className="userNameAndStatus">
            <h3>Suarabh</h3>
            <span>Active</span>
          </div>
        </div>
        <div className="right-top">
          <img src={Phone} alt="phone" />
          <img src={Video} alt="video" />
          <img src={Info} alt="info" />
        </div>
      </div>
      { showDetails ? (
        <div className="center">
            <div className="message other-user">
              <img className="profile" src={Avatar} alt="Other User" />
              <div className="content">
                <p className="text">Hey there! How are you?</p>
                <div className="meta">
                  <span className="time">10:32 AM</span>
                </div>
              </div>
            </div>

            <div className="message my-message">
              <div className="content">
                <p className="text">I'm good! Thanks for asking.</p>
                <div className="meta">
                  <span className="time">10:33 AM</span>
                  <img className="status" src={Minus} alt="Read" />
                </div>
              </div>
              <img className="profile" src={Avatar} alt="Me" />
            </div>
            <div className="message other-user">
              <img className="profile" src={Avatar} alt="Other User" />
              <div className="content">
                <p className="text">Hey there! How are you?</p>
                <div className="meta">
                  <span className="time">10:32 AM</span>
                </div>
              </div>
            </div>

            <div className="message my-message">
              <div className="content">
                <p className="text">I'm good! Thanks for asking.</p>
                <div className="meta">
                  <span className="time">10:33 AM</span>
                  <img className="status" src={Minus} alt="Read" />
                </div>
              </div>
              <img className="profile" src={Avatar} alt="Me" />
            </div>
            <div className="message other-user">
              <img className="profile" src={Avatar} alt="Other User" />
              <div className="content">
                <p className="text">Hey there! How are you?</p>
                <div className="meta">
                  <span className="time">10:32 AM</span>
                </div>
              </div>
            </div>

            <div className="message my-message">
              <div className="content">
                <p className="text">I'm good! Thanks for asking.</p>
                <div className="meta">
                  <span className="time">10:33 AM</span>
                  <img className="status" src={Minus} alt="Read" />
                </div>
              </div>
              <img className="profile" src={Avatar} alt="Me" />
            </div>
            <div className="message other-user">
              <img className="profile" src={Avatar} alt="Other User" />
              <div className="content">
                <p className="text">Hey there! How are you?</p>
                <div className="meta">
                  <span className="time">10:32 AM</span>
                </div>
              </div>
            </div>

            <div className="message my-message">
              <div className="content">
                <p className="text">I'm good! Thanks for asking.</p>
                <div className="meta">
                  <span className="time">10:33 AM</span>
                  <img className="status" src={Minus} alt="Read" />
                </div>
              </div>
              <img className="profile" src={Avatar} alt="Me" />
              </div>
              <div ref={endRef}></div>
        </div>
        ) : (
          <div className="center">
            <Details/>
          </div>
        )}
      <div className="bottom">
          <div className="left-message-bar">
            <img src={Plus} alt="Plus" />
            <img src={Emoji} alt="Emoji" />
            <div className="text-area">
              <input type="text" placeholder="Type a message..."/>
            </div>
            <button type="submit">Send</button>
          </div>
          <div className="right-message-bar">
            <img src={Mic} alt="mic" />
          </div>
      </div>
    </div>
  )
}

export default Chat