import React, { useEffect, useRef, useState } from "react";
import "./Chat.css";
import Avatar from "../../assets/avatar.png";
import Emoji from "../../assets/emoji.png";
import Details from "../detail/Details";
import { useConversationContext } from '../../context/ConversationContext';
import { io, Socket } from 'socket.io-client';
import EmojiPicker from 'emoji-picker-react';

// TypeScript interfaces
interface User {
  id: string;
  name: string | null;
  imageUrl: string | null;
  email: string;
  isOnline?: boolean;
  lastActive?: string;
}

interface MessageReaction {
  id: string;
  emoji: string;
  user: {
    id: string;
    name: string | null;
  };
}

interface Message {
  id: string;
  content: string | null;
  imageUrl: string | null;
  createdAt: string;
  sender: User;
  reactions: MessageReaction[];
}

interface ConversationData {
  conversation: {
    id: string;
    isGroup: boolean;
    participants: User[];
  };
  messages: Message[];
}

// interface ApiResponse {
//   success: boolean;
//   data: ConversationData;
// }

interface UserStatus {
  userId: string;
  isOnline: boolean;
  lastActive: Date;
}

const Chat: React.FC = () => {
  const [showDetails, setShowDetails] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [sending, setSending] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');

  const [isEmojiPickerOpen, setisEmojiPickerOpen] = useState<boolean>(false);
  
  // New state for user statuses
  const [userStatuses, setUserStatuses] = useState<Map<string, UserStatus>>(new Map());

  const endRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  
  // Get selected conversation from context
  const { selectedConversation } = useConversationContext();

  // Get current user ID from localStorage
  const currentUserId = localStorage.getItem("id");

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!currentUserId) return;

    const socketInstance = io('http://localhost:3000', {
      auth: {
        userId: currentUserId
      },
      transports: ['websocket', 'polling']
    });

    setSocket(socketInstance);

    // Connection events
    socketInstance.on('connect', () => {
      // console.log('Connected to server');
      setConnectionStatus('connected');
      setError(null);
      
      // Request current user statuses after connecting
      socketInstance.emit('request_user_statuses');
    });

    socketInstance.on('disconnect', () => {
      // console.log('Disconnected from server');
      setConnectionStatus('disconnected');
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
      setConnectionStatus('error');
      setError('Failed to connect to server');
    });

    // Message events
    socketInstance.on('new_message', (message: Message) => {
      // console.log('New message received:', message);
      setMessages(prev => [...prev, message]);
    });

    socketInstance.on('message_sent', () => {
      // console.log('Message sent confirmation:', data.messageId);
      setSending(false);
    });

    socketInstance.on('message_error', (error: { message: string }) => {
      console.error('Message error:', error.message);
      setError(error.message);
      setSending(false);
    });

    socketInstance.on('message_deleted', (data: { messageId: string; conversationId: string }) => {
      // console.log('Message deleted:', data);
      setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
    });

    // Reaction events
    socketInstance.on('reaction_added', (data: { reaction: MessageReaction; messageId: string }) => {
      // console.log('Reaction added:', data);
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, reactions: [...msg.reactions, data.reaction] }
          : msg
      ));
    });

    socketInstance.on('reaction_removed', (data: { messageId: string; userId: string; emoji: string }) => {
      // console.log('Reaction removed:', data);
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { 
              ...msg, 
              reactions: msg.reactions.filter(r => 
                !(r.user.id === data.userId && r.emoji === data.emoji)
              )
            }
          : msg
      ));
    });

    socketInstance.on('reaction_error', (error: { message: string }) => {
      console.error('Reaction error:', error.message);
      setError(error.message);
    });

    socketInstance.on('delete_error', (error: { message: string }) => {
      console.error('Delete error:', error.message);
      setError(error.message);
    });

    // Typing events
    socketInstance.on('user_typing', (data: { userId: string; userName: string; isTyping: boolean }) => {
      if (data.userId !== currentUserId) {
        setTypingUsers(prev => {
          if (data.isTyping) {
            return [...prev.filter(u => u !== data.userName), data.userName || 'Unknown'];
          } else {
            return prev.filter(u => u !== data.userName);
          }
        });
      }
    });

    // User status events - NEW
    socketInstance.on('user_status_changed', (data: UserStatus) => {
      // console.log('User status changed:', data);
      setUserStatuses(prev => {
        const newMap = new Map(prev);
        newMap.set(data.userId, data);
        return newMap;
      });
    });

    // Handle bulk user statuses response
    socketInstance.on('user_statuses_response', (statuses: UserStatus[]) => {
      // console.log('Received user statuses:', statuses);
      setUserStatuses(prev => {
        const newMap = new Map(prev);
        statuses.forEach(status => {
          newMap.set(status.userId, status);
        });
        return newMap;
      });
    });

    // Notification events
    socketInstance.on('message_notification', () => {
      // console.log('New message notification:', data);
      // Handle notifications for messages in other conversations
      // You might want to show a toast notification or update conversation list
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [currentUserId]);

  // Join conversation room when conversation changes
  useEffect(() => {
    if (socket && selectedConversation) {
      socket.emit('join_conversation', selectedConversation.id);
      
      return () => {
        socket.emit('leave_conversation', selectedConversation.id);
      };
    }
  }, [socket, selectedConversation]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when conversation selected
  useEffect(() => {
    if (selectedConversation && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedConversation]);

  // Fetch messages when a conversation is selected (HTTP for initial load)
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedConversation) {
        setMessages([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `http://localhost:3000/api/messages/conversations/${selectedConversation.id}?userId=${currentUserId}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
          setMessages(result.data.messages);
          
          // Request status for conversation participants
          if (socket && connectionStatus === 'connected') {
            const participantIds = selectedConversation.isGroup 
              ? selectedConversation.participants.map(p => p.id)
              : selectedConversation.chatWith ? [selectedConversation.chatWith.id] : [];
            
            if (participantIds.length > 0) {
              socket.emit('request_specific_user_statuses', { userIds: participantIds });
            }
          }
        } else {
          throw new Error('Failed to fetch messages');
        }
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError(err instanceof Error ? err.message : 'Failed to load messages');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [selectedConversation, currentUserId, socket, connectionStatus]);

  // Handle typing indicator
  const handleTyping = (value: string) => {
    setNewMessage(value);

    if (!socket || !selectedConversation) return;

    if (value.length > 0 && !isTyping) {
      setIsTyping(true);
      socket.emit('typing_start', { conversationId: selectedConversation.id });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        socket.emit('typing_stop', { conversationId: selectedConversation.id });
      }
    }, 1000);
  };

  // Send message via WebSocket
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedConversation || !currentUserId || sending || !socket) {
      return;
    }

    if (connectionStatus !== 'connected') {
      setError('Not connected to server. Please check your connection.');
      return;
    }

    setisEmojiPickerOpen(false); // Close emoji picker if open


    try {
      setSending(true);

      // Stop typing indicator
      if (isTyping) {
        setIsTyping(false);
        socket.emit('typing_stop', { conversationId: selectedConversation.id });
      }

      // Clear message immediately (optimistic update)
      const messageToSend = newMessage.trim();
      setNewMessage("");

      // Send via WebSocket
      socket.emit('send_message', {
        conversationId: selectedConversation.id,
        content: messageToSend
      });

      // Focus back to input after sending
      if (inputRef.current) {
        inputRef.current.focus();
      }

    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setSending(false);
      // Restore message text on error
      setNewMessage(newMessage);
    }
  };

  // Delete message via WebSocket
  const deleteMessage = async (messageId: string) => {
    if (!currentUserId || !socket) return;

    if (connectionStatus !== 'connected') {
      setError('Not connected to server. Please check your connection.');
      return;
    }

    try {
      socket.emit('delete_message', { messageId });
    } catch (err) {
      console.error('Error deleting message:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete message');
    }
  };

  // Toggle reaction via WebSocket
  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!currentUserId || !socket) return;

    if (connectionStatus !== 'connected') {
      setError('Not connected to server. Please check your connection.');
      return;
    }

    try {
      socket.emit('toggle_reaction', {
        messageId,
        emoji
      });
    } catch (err) {
      console.error('Error toggling reaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle reaction');
    }
  };

  // Format message time
  const formatMessageTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } else {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = date.toDateString() === yesterday.toDateString();
      
      if (isYesterday) {
        const time = date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        return `Yesterday ${time}`;
      } else {
        const dateStr = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
        const timeStr = date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        return `${dateStr} ${timeStr}`;
      }
    }
  };

  // Format last active time
  const formatLastActive = (lastActive: string): string => {
    const date = new Date(lastActive);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInMinutes < 10080) {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  // Get display name for chat header
  const getChatDisplayName = (): string => {
    if (!selectedConversation) return "WhatsApp";
    
    if (selectedConversation.isGroup) {
      const participantNames = selectedConversation.participants
        .map(p => p.name || p.email.split('@')[0])
        .join(', ');
      return participantNames || `Group Chat (${selectedConversation.participants.length} members)`;
    } else {
      const otherUser = selectedConversation.chatWith;
      return otherUser?.name || otherUser?.email.split('@')[0] || 'Unknown User';
    }
  };

  // Get avatar for chat header
  const getChatAvatar = (): string => {
    if (!selectedConversation) return Avatar;
    
    if (selectedConversation.isGroup) {
      return Avatar;
    } else {
      return selectedConversation.chatWith?.imageUrl || Avatar;
    }
  };

  // Check if current user has reacted with specific emoji
  const hasUserReacted = (reactions: MessageReaction[], emoji: string): boolean => {
    return reactions.some(r => r.user.id === currentUserId && r.emoji === emoji);
  };

  // Get reaction count for specific emoji
  const getReactionCount = (reactions: MessageReaction[], emoji: string): number => {
    return reactions.filter(r => r.emoji === emoji).length;
  };

  // Updated getLastSeenStatus function with real user status integration
  const getLastSeenStatus = (): string => {
    if (!selectedConversation) return "";
    
    if (connectionStatus !== 'connected') {
      return "Connecting...";
    }
    
    if (typingUsers.length > 0) {
      return `${typingUsers.join(', ')} ${typingUsers.length === 1 ? 'is' : 'are'} typing...`;
    }
    
    if (selectedConversation.isGroup) {
      const onlineCount = selectedConversation.participants.filter(participant => {
        const status = userStatuses.get(participant.id);
        return status?.isOnline || false;
      }).length;
      
      if (onlineCount > 0) {
        return `${selectedConversation.participants.length} members, ${onlineCount} online`;
      }
      return `${selectedConversation.participants.length} members`;
    } else {
      // For individual chat, show the other user's status
      const otherUser = selectedConversation.chatWith;
      if (!otherUser) return "Unknown user";
      
      const userStatus = userStatuses.get(otherUser.id);
      
      if (userStatus?.isOnline) {
        return "online";
      } else if (userStatus?.lastActive) {
        return `last seen ${formatLastActive(userStatus.lastActive.toString())}`;
      } else {
        return "last seen recently";
      }
    }
  };

  return (
    <div className='chat'>
      {/* Connection Status Indicator */}
      {connectionStatus !== 'connected' && (
        <div className={`connection-status ${connectionStatus}`}>
          {connectionStatus === 'connecting' && 'Connecting...'}
          {connectionStatus === 'disconnected' && 'Disconnected from server'}
          {connectionStatus === 'error' && 'Connection error - trying to reconnect...'}
        </div>
      )}

      {/* Header */}
      <div className="top">
        <div className="left-top" onClick={() => setShowDetails(!showDetails)}>
          <div className="avatar-container">
            <img src={getChatAvatar()} alt="avatar" />
            {/* Online indicator for individual chats */}
            {!selectedConversation?.isGroup && selectedConversation?.chatWith && (
              <div className={`online-indicator ${
                userStatuses.get(selectedConversation.chatWith.id)?.isOnline ? 'online' : 'offline'
              }`}></div>
            )}
          </div>
          <div className="userNameAndStatus">
            <h3>{getChatDisplayName()}</h3>
            <span className="status-text">{getLastSeenStatus()}</span>
          </div>
        </div>
      </div>

      {/* Messages or Details */}
      {showDetails ? (
        <Details />
      ) : (
        <>
          {/* Messages Container */}
          <div className="center">
            {/* Loading state */}
            {loading && (
              <div className="loading-messages">
                <p>Loading messages...</p>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="error-messages">
                <p>{error}</p>
                <button onClick={() => setError(null)}>Dismiss</button>
              </div>
            )}

            {/* No conversation selected */}
            {!selectedConversation && !loading && (
              <div className="no-conversation">
                <p>Select a chat to start messaging</p>
              </div>
            )}

            {/* Messages */}
            {selectedConversation && !loading && !error && (
              <>
                {messages.length === 0 ? (
                  <div className="no-messages">
                    <p>No messages here yet...</p>
                    <p>Send a message to start the conversation.</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div 
                      key={message.id}
                      className={`message ${
                        message.sender.id === currentUserId ? 'my-message' : 'other-user'
                      }`}
                    >
                      {/* Profile image for other users only */}
                      {message.sender.id !== currentUserId && (
                        <div className="profile-container">
                          <img 
                            src={message.sender.imageUrl || Avatar} 
                            alt={message.sender.name || 'User'} 
                            className="profile"
                          />
                          {/* Online indicator for message sender */}
                          <div className={`profile-online-indicator ${
                            userStatuses.get(message.sender.id)?.isOnline ? 'online' : 'offline'
                          }`}></div>
                        </div>
                      )}
                      
                      <div className="content">
                        {/* Message image */}
                        {message.imageUrl && (
                          <img 
                            src={message.imageUrl} 
                            alt="Message attachment" 
                            className="message-image"
                          />
                        )}
                        
                        {/* Message text */}
                        {message.content && (
                          <p className="text">{message.content}</p>
                        )}
                        
                        {/* Meta info */}
                        <div className="meta">
                          <span className="time">{formatMessageTime(message.createdAt)}</span>
                          {message.sender.id === currentUserId && (
                            <>
                              <svg className="status" viewBox="0 0 16 15" width="16" height="15">
                                <path fill="currentColor" d="m15.01 3.316-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l3.132 3.005c.143.14.361.125.484-.033l5.741-7.342a.366.366 0 0 0-.063-.512z"/>
                              </svg>
                              <button 
                                className="delete-message"
                                onClick={() => deleteMessage(message.id)}
                                title="Delete message"
                                disabled={connectionStatus !== 'connected'}
                              >
                                ✕
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Reaction buttons - show on hover */}
                      <div className="reaction-buttons">
                        {['❤️', '👍', '😂', '😮', '😢', '😡'].map(emoji => (
                          <button
                            key={emoji}
                            className="add-reaction"
                            onClick={() => toggleReaction(message.id, emoji)}
                            title={`React with ${emoji}`}
                            disabled={connectionStatus !== 'connected'}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>

                      {/* Message reactions - show existing reactions */}
                      {message.reactions && message.reactions.length > 0 && (
                        <div className="message-reactions">
                          {['❤️', '👍', '😂', '😮', '😢', '😡'].map(emoji => {
                            const count = getReactionCount(message.reactions, emoji);
                            if (count === 0) return null;
                            
                            return (
                              <button
                                key={emoji}
                                className={`reaction ${hasUserReacted(message.reactions, emoji) ? 'reacted' : ''}`}
                                onClick={() => toggleReaction(message.id, emoji)}
                                title={`${emoji} (${count})`}
                                disabled={connectionStatus !== 'connected'}
                              >
                                <span className="emoji">{emoji}</span>
                                <span className="count">{count}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={endRef}></div>
              </>
            )}
          </div>

          {/* Input Section */}
          <div className="bottom">
            <form onSubmit={sendMessage} className="message-form">
              <div className="left-message-bar">
                <div className="emoji-wrapper">
                  <img 
                    src={Emoji} 
                    alt="Emoji" 
                    title="Emoji" 
                    onClick={() => setisEmojiPickerOpen(prev => !prev)}
                  />
                  {isEmojiPickerOpen && (
                    <div className="emoji-picker-container">
                      <EmojiPicker onEmojiClick={(e) => setNewMessage(prev => prev + e.emoji)} />
                    </div>
                  )}
                </div>
                {/* <img src={Plus} alt="Attach" title="Attach" /> */}
                
                <div className="text-area">
                  <input 
                    ref={inputRef}
                    type="text" 
                    value={newMessage}
                    onChange={(e) => handleTyping(e.target.value)}
                    placeholder={
                      connectionStatus !== 'connected' 
                        ? "Connecting..." 
                        : "Type a message"
                    }
                    disabled={!selectedConversation || sending || connectionStatus !== 'connected'}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(e);
                      }
                    }}
                  />
                </div>
                
                {newMessage.trim() ? (
                  <button 
                    type="submit"
                    disabled={!selectedConversation || !newMessage.trim() || sending || connectionStatus !== 'connected'}
                    title={sending ? "Sending..." : "Send"}
                  >
                    {sending ? (
                      <div className="spinner">⟳</div>
                    ) : (
                      <svg viewBox="0 0 24 24" width="24" height="24">
                        <path fill="currentColor" d="M1.101 21.757L23.8 12.028L1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"/>
                      </svg>
                    )}
                  </button>
                ) : (
                  // <img src={Mic} alt="Voice message" title="Voice message" />
                  <div></div>
                )}
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default Chat;