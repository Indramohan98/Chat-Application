// src/contexts/ConversationContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

// Types
interface User {
  id: string;
  name: string | null;
  imageUrl: string | null;
  email: string;
}

interface SelectedConversation {
  id: string;
  isGroup: boolean;
  participants: User[];
  chatWith?: User | null; // For 1-on-1 chats
}

interface ConversationContextType {
  selectedConversation: SelectedConversation | null;
  setSelectedConversation: (conversation: SelectedConversation | null) => void;
}

// Create Context
const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

// Provider Props
interface ConversationProviderProps {
  children: ReactNode;
}

// Provider Component
export const ConversationProvider: React.FC<ConversationProviderProps> = ({ children }) => {
  const [selectedConversation, setSelectedConversation] = useState<SelectedConversation | null>(null);

  const contextValue: ConversationContextType = {
    selectedConversation,
    setSelectedConversation,
  };

  return (
    <ConversationContext.Provider value={contextValue}>
      {children}
    </ConversationContext.Provider>
  );
};

// Custom hook to use the context
export const useConversationContext = (): ConversationContextType => {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error('useConversationContext must be used within a ConversationProvider');
  }
  return context;
};