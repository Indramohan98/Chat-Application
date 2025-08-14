import { Request, Response } from 'express';
import prisma from '../lib/prisma';


// 1.Sync Clerk user to DB
export const syncUser = async (req: Request, res: Response) => {
  const { clerkId, email, name, imageUrl } = req.body;
//   console.log("Req Body", req.body)

  if (!clerkId || !email) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { clerkId },
      select: {
        id: true,
      }
    });

    if (!existingUser) {
      await prisma.user.create({
        data: { clerkId, email, name, imageUrl },
        select: { id: true },
      });
    }

    return res.json({ 
        success: true,
        existingUserId: existingUser?.id
    });
  } catch (err) {
    console.error('Error syncing user:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// 2. search User by user name
export const searchUser = async (req: Request, res: Response) => {
  const { name, currentUserClerkId } = req.body;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ message: 'Name is required' });
  }

  if (!currentUserClerkId) {
    return res.status(400).json({ message: 'Current user Clerk ID is required' });
  }

  try {
    // First, get the current user's database ID from their clerkId
    const currentUser = await prisma.user.findUnique({
      where: { clerkId: currentUserClerkId },
      select: { id: true }
    });

    if (!currentUser) {
      return res.status(404).json({ message: 'Current user not found' });
    }

    // Get users matching the search term, excluding the current user
    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            name: {
              contains: name,
              mode: 'insensitive',
            }
          },
          {
            clerkId: {
              not: currentUserClerkId // Exclude current user from results
            }
          }
        ]
      },
      select: {
        id: true,
        clerkId: true,
        name: true,
        imageUrl: true,
      },
      take: 10,
    });

    // Get existing conversations for the current user
    const existingConversations = await prisma.conversation.findMany({
      where: {
        isGroup: false,
        participants: {
          some: {
            userId: currentUser.id
          }
        }
      },
      include: {
        participants: {
          select: {
            userId: true
          }
        }
      }
    });

    // Create a set of user IDs that current user already has conversations with
    const existingChatUserIds = new Set<string>();
    existingConversations.forEach(conversation => {
      conversation.participants.forEach(participant => {
        if (participant.userId !== currentUser.id) {
          existingChatUserIds.add(participant.userId);
        }
      });
    });

    // Add isAlreadyInChat flag to each user
    const usersWithChatStatus = users.map(user => ({
      id: user.id,
      clerkId: user.clerkId,
      name: user.name,
      imageUrl: user.imageUrl,
      isAlreadyInChat: existingChatUserIds.has(user.id)
    }));

    return res.json(usersWithChatStatus);
  } catch (err) {
    console.error('Search Error:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// add User To Chat controller
export const addUserToChat = async (req: Request, res: Response) => {
  const { currentUserClerkId, targetUserClerkId } = req.body;
  console.log('Adding user to chat:', currentUserClerkId, targetUserClerkId);

  if (!currentUserClerkId || !targetUserClerkId) {
    return res.status(400).json({ 
      message: "Both currentUserClerkId and targetUserClerkId are required" 
    });
  }

  try {
    if (currentUserClerkId === targetUserClerkId) {
      return res.status(400).json({ message: "Cannot chat with yourself" });
    }

    // Get both users from database using their clerkIds
    const currentUser = await prisma.user.findUnique({
      where: { clerkId: currentUserClerkId },
      select: { id: true }
    });

    const targetUser = await prisma.user.findUnique({
      where: { clerkId: targetUserClerkId },
      select: { id: true }
    });

    if (!currentUser) {
      return res.status(404).json({ message: "Current user not found" });
    }

    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found" });
    }

    // Check if BOTH users are already in the same conversation
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        AND: [
          {
            participants: {
              some: { userId: currentUser.id }
            }
          },
          {
            participants: {
              some: { userId: targetUser.id }
            }
          }
        ]
      },
    });

    let conversationId: string;
    let isNewConversation = false;

    if (existingConversation) {
      // Return existing conversation
      conversationId = existingConversation.id;
      return res.json({ 
        success: true, 
        conversationId,
        isExisting: true,
        message: "User is already added to chat"
      });
    } else {
      // Create a new conversation with both users
      const newConversation = await prisma.conversation.create({
        data: {
          isGroup: false,
          participants: {
            create: [
              { userId: currentUser.id },
              { userId: targetUser.id },
            ],
          },
        },
      });
      conversationId = newConversation.id;
      isNewConversation = true;
    }

    return res.json({ 
      success: true, 
      conversationId,
      isNewConversation,
      message: isNewConversation ? "User added to chat successfully" : "User is already added to chat"
    });
  } catch (err) {
    console.error("Error adding user to chat:", err);
    return res.status(500).json({ message: "Server error" });
  }
};