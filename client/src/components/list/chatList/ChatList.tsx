import React, { useState, useEffect } from 'react';
import "./ChatList.css"
import avatar from "../../../assets/avatar.png"
import { useConversationContext } from '../../../context/ConversationContext';

// TypeScript interfaces (same as before)
interface User {
  id: string;
  name: string | null;
  imageUrl: string | null;
  email: string;
}

interface Message {
  id: string;
  content: string | null;
  imageUrl: string | null;
  createdAt: string;
  sender: {
    id: string;
    name: string | null;
  };
}

interface Conversation {
  id: string;
  isGroup: boolean;
  createdAt: string;
  participants: User[];
  lastMessage: Message | null;
  messageCount: number;
  chatWith: User | null;
}

interface ApiResponse {
  success: boolean;
  data: Conversation[];
  count: number;
}

const ChatList: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Get conversation context to set selected conversation
  const { selectedConversation, setSelectedConversation } = useConversationContext();

  // Functions remain the same
  const formatMessageTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const getConversationDisplayName = (conversation: Conversation): string => {
    if (conversation.isGroup) {
      const participantNames = conversation.participants
        .map(p => p.name || p.email.split('@')[0])
        .join(', ');
      return participantNames || `Group Chat (${conversation.participants.length} members)`;
    } else {
      const otherUser = conversation.chatWith;
      return otherUser?.name || otherUser?.email.split('@')[0] || 'Unknown User';
    }
  };

  const getConversationAvatar = (conversation: Conversation): string => {
    if (conversation.isGroup) {
      return avatar;
    } else {
      return conversation.chatWith?.imageUrl || avatar;
    }
  };

  const getLastMessagePreview = (conversation: Conversation): string => {
    if (!conversation.lastMessage) {
      return 'No messages yet';
    }

    const message = conversation.lastMessage;
    
    if (message.imageUrl && !message.content) {
      return '📷 Image';
    }
    
    if (message.content) {
      return message.content.length > 50 
        ? message.content.substring(0, 50) + '...'
        : message.content;
    }
    
    return 'Message';
  };

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        setError(null);

        const userId = localStorage.getItem("id");
        
        if (!userId) {
          throw new Error('User ID not found. Please log in again.');
        }

        const response = await fetch(`http://localhost:3000/api/user/getChatlist/${userId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result: ApiResponse = await response.json();
        
        if (result.success) {
          setConversations(result.data);
        } else {
          throw new Error('Failed to fetch conversations');
        }
      } catch (err) {
        console.error('Error fetching conversations:', err);
        setError(err instanceof Error ? err.message : 'Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  // Handle conversation click - now sets the selected conversation
  const handleConversationClick = (conversation: Conversation) => {
    console.log('Selected conversation:', conversation.id);
    
    // Set the selected conversation in context
    setSelectedConversation({
      id: conversation.id,
      isGroup: conversation.isGroup,
      participants: conversation.participants,
      chatWith: conversation.chatWith
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="chat-list">
        <div className="loading-state">
          <p>Loading your chats...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="chat-list">
        <div className="error-state">
          <p>Error: {error}</p>
          <button onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (conversations.length === 0) {
    return (
      <div className="chat-list">
        <div className="empty-state">
          <p>No conversations yet</p>
          <p>Start a new chat to see it here!</p>
        </div>
      </div>
    );
  }

  // Render conversations
  return (
    <div className="chat-list">
      {conversations.map((conversation) => (
        <div 
          className={`outer-user-container ${
            selectedConversation?.id === conversation.id ? 'selected' : ''
          }`}
          key={conversation.id}
          onClick={() => handleConversationClick(conversation)}
          style={{ cursor: 'pointer' }}
        >
          <div className="left-user-list">
            <div className="user-avatar">
              <img 
                src={getConversationAvatar(conversation)} 
                alt="user-avatar"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = avatar;
                }}
              />
            </div>
            <div className="user-info">
              <span className="user-name">
                {getConversationDisplayName(conversation)}
              </span>
              <span className="last-message">
                {getLastMessagePreview(conversation)}
              </span>
            </div>
          </div>
          <div className="message-time">
            <span>
              {conversation.lastMessage 
                ? formatMessageTime(conversation.lastMessage.createdAt)
                : formatMessageTime(conversation.createdAt)
              }
            </span>
            {conversation.messageCount > 0 && (
              <div className="message-count-badge">
                {conversation.messageCount}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatList;