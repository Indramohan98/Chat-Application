import React, { useState } from "react";
import { useUser } from "@clerk/clerk-react";
import UserSearchModal from "./UserSearchModal";
import "./userInfo.css";
import PlusIcon from "../../../assets/plus.png";

interface UserInfoProps {
  onNewConversation?: (conversationId: string) => void;
}

const UserInfo: React.FC<UserInfoProps> = ({ onNewConversation }) => {
  const { user } = useUser();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const handlePlusClick = () => {
    setIsSearchModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsSearchModalOpen(false);
  };

  const handleUserAdded = (conversationId: string) => {
    // Notify parent component about new conversation
    onNewConversation?.(conversationId);
    
    // You might want to show a success message here
    // console.log('New conversation created:', conversationId);
  };

  return (
    <>
      <div className="userInfo">
        <div className="user">
          <img src={user?.imageUrl} alt="" />
          <h3>{user?.fullName}</h3>
        </div>
        <div className="icons">
          <img 
            src={PlusIcon} 
            alt="add-user-icon" 
            onClick={handlePlusClick}
            style={{ cursor: 'pointer' }}
          />
        </div>
      </div>

      <UserSearchModal
        isOpen={isSearchModalOpen}
        onClose={handleCloseModal}
        onUserAdded={handleUserAdded}
      />
    </>
  );
};

export default UserInfo;