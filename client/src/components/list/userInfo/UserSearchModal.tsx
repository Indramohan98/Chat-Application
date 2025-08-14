import React, { useState, useEffect } from 'react';
import { useUserSearch } from '../../../hooks/useUserSearch';
import './userSearchModal.css';

interface User {
  id: string;
  clerkId: string;
  name: string;
  imageUrl?: string;
  isAlreadyInChat?: boolean;
}

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserAdded?: (conversationId: string) => void;
}

const UserSearchModal: React.FC<UserSearchModalProps> = ({ 
  isOpen, 
  onClose, 
  onUserAdded 
}) => {
  const { searchUsers, addUserToChat, loading, error, clearError } = useUserSearch();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [addingUser, setAddingUser] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Search users with debouncing
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      const results = await searchUsers(searchTerm);
      setSearchResults(results);
    }, 300); // 300ms debounce

    return () => clearTimeout(searchTimeout);
  }, [searchTerm, searchUsers]);

  const handleAddUser = async (targetUserClerkId: string) => {
    setAddingUser(targetUserClerkId);
    clearError();
    setSuccessMessage('');

    try {
      const result = await addUserToChat(targetUserClerkId);
      
      if (result.isExisting) {
        // Show message for existing conversation
        setSuccessMessage(result.message || 'User is already in your chat list');
        // Update the user in search results to show as already added
        setSearchResults(prev => 
          prev.map(user => 
            user.clerkId === targetUserClerkId 
              ? { ...user, isAlreadyInChat: true }
              : user
          )
        );
      } else {
        // Notify parent component about the new conversation
        onUserAdded?.(result.conversationId);
        
        // Close the modal and reset state
        handleClose();
      }
    } catch (err) {
      // Error is handled by the hook
    } finally {
      setAddingUser(null);
    }
  };

  const handleClose = () => {
    setSearchTerm('');
    setSearchResults([]);
    clearError();
    setSuccessMessage('');
    setAddingUser(null);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="user-search-modal">
        <div className="modal-header">
          <h2>Add User to Chat</h2>
          <button className="close-button" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="search-section">
          <input
            type="text"
            placeholder="Search users by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            autoFocus
          />
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="success-message">
            {successMessage}
          </div>
        )}

        <div className="search-results">
          {loading && (
            <div className="loading">
              Searching...
            </div>
          )}

          {!loading && searchTerm && searchResults.length === 0 && (
            <div className="no-results">
              No users found matching "{searchTerm}"
            </div>
          )}

          {!loading && searchResults.length > 0 && (
            <div className="results-list">
              {searchResults.map((user) => (
                <div key={user.id} className="user-result">
                  <div className="user-info">
                    <img
                      src={user.imageUrl || '/default-avatar.png'}
                      alt={user.name}
                      className="user-avatar"
                    />
                    <span className="user-name">{user.name}</span>
                  </div>
                  <button
                    onClick={() => handleAddUser(user.clerkId)}
                    disabled={addingUser === user.clerkId || user.isAlreadyInChat}
                    className={`add-button ${
                      addingUser === user.clerkId ? 'loading' : ''
                    } ${user.isAlreadyInChat ? 'already-added' : ''}`}
                  >
                    {addingUser === user.clerkId 
                      ? 'Adding...' 
                      : user.isAlreadyInChat 
                        ? 'Already Added' 
                        : 'Add to Chat'
                    }
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {!searchTerm && (
          <div className="search-hint">
            Start typing to search for users...
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSearchModal;