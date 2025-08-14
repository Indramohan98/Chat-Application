import { useState, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';

interface User {
  id: string;
  clerkId: string;
  name: string;
  imageUrl?: string;
  isAlreadyInChat?: boolean;
}

interface UseUserSearchReturn {
  searchUsers: (searchTerm: string) => Promise<User[]>;
  addUserToChat: (targetUserId: string) => Promise<{
    conversationId: string;
    isExisting?: boolean;
    message?: string;
  }>;
  loading: boolean;
  error: string;
  clearError: () => void;
}

export const useUserSearch = (): UseUserSearchReturn => {
  const { user: currentUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const clearError = useCallback(() => {
    setError('');
  }, []);

  const searchUsers = useCallback(async (searchTerm: string): Promise<User[]> => {
    if (!searchTerm.trim()) {
      return [];
    }

    if (!currentUser?.id) {
      setError('User not authenticated');
      return [];
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3000/api/user/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name: searchTerm.trim(),
          currentUserClerkId: currentUser.id // This is the clerkId from Clerk
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to search users');
      }

      const users = await response.json();
      return users;
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search users. Please try again.');
      return [];
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  const addUserToChat = useCallback(async (targetUserClerkId: string): Promise<{
    conversationId: string;
    isExisting?: boolean;
    message?: string;
  }> => {
    if (!currentUser?.id) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3000/api/user/addUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentUserClerkId: currentUser.id, // This is the clerkId from Clerk
          targetUserClerkId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add user to chat');
      }

      const data = await response.json();
      
      if (!data.success || !data.conversationId) {
        throw new Error('Invalid response from server');
      }

      return {
        conversationId: data.conversationId,
        isExisting: data.isExisting,
        message: data.message
      };
    } catch (err) {
      console.error('Add user error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to add user to chat';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  return {
    searchUsers,
    addUserToChat,
    loading,
    error,
    clearError,
  };
};