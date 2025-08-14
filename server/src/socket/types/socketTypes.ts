export interface AuthenticatedSocket {
  user?: {
    id: string;
    name: string;
    email: string;
  };
  userId: string;
}

export interface SendMessageData {
  conversationId: string;
  content?: string;
  imageUrl?: string;
}

export interface ToggleReactionData {
  messageId: string;
  emoji: string;
}

export interface DeleteMessageData {
  messageId: string;
}

export interface TypingData {
  conversationId: string;
}

export interface UserStatusData {
  userIds: string[];
}

// Server-to-client events
export interface ServerToClientEvents {
  user_status_changed: (data: {
    userId: string;
    isOnline: boolean;
    lastActive: Date;
  }) => void;
  
  user_statuses_response: (statuses: Array<{
    userId: string;
    isOnline: boolean;
    lastActive: Date;
  }>) => void;
  
  new_message: (message: any) => void;
  message_notification: (data: {
    message: any;
    conversationId: string;
    from: any;
  }) => void;
  
  message_sent: (data: { messageId: string }) => void;
  message_error: (data: { message: string }) => void;
  
  reaction_added: (data: {
    reaction: any;
    messageId: string;
    conversationId: string;
  }) => void;
  
  reaction_removed: (data: {
    messageId: string;
    userId: string;
    emoji: string;
    conversationId: string;
  }) => void;
  
  reaction_error: (data: { message: string }) => void;
  
  message_deleted: (data: {
    messageId: string;
    conversationId: string;
  }) => void;
  
  delete_error: (data: { message: string }) => void;
  
  user_typing: (data: {
    userId: string;
    userName?: string;
    conversationId: string;
    isTyping: boolean;
  }) => void;
}

// Client-to-server events
export interface ClientToServerEvents {
  request_user_statuses: () => void;
  request_specific_user_statuses: (data: UserStatusData) => void;
  join_conversation: (conversationId: string) => void;
  leave_conversation: (conversationId: string) => void;
  send_message: (data: SendMessageData) => void;
  toggle_reaction: (data: ToggleReactionData) => void;
  delete_message: (data: DeleteMessageData) => void;
  typing_start: (data: TypingData) => void;
  typing_stop: (data: TypingData) => void;
}