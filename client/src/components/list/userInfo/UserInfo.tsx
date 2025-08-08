import userImg from "../../../assets/user.png"
import "./userInfo.css"
import MoreIcon from "../../../assets/more.png"

const UserInfo = () => {
  return (
    <div className="userInfo">
        <div className="user">
            <img src={userImg} alt="" />
            <h3>Mohan</h3>
        </div>
        <div className="icons">
            <img src={MoreIcon} alt="more-icon" />
        </div>
    </div>
  )
}

export default UserInfo