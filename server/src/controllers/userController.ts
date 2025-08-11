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

// 2. Search user by name
export const searchUser = async (req: Request, res: Response) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ message: 'Name is required' });
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        name: {
          contains: name,
          mode: 'insensitive', // case-insensitive search
        },
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
      },
      take: 10, // limit results to 10
    });

    return res.json(users);
  } catch (err) {
    console.error('Search Error:', err);
    return res.status(500).json({ message: 'Server Error' });
  }
};

// 3. Add a user to a chat (no auth)
export const addUserToChat = async (req: Request, res: Response) => {
  const { currentUserId, targetUserId } = req.body;
  console.log(currentUserId, targetUserId)

  if (!currentUserId || !targetUserId) {
    return res.status(400).json({ message: "Both currentUserId and targetUserId are required" });
  }

  try {
    if (currentUserId === targetUserId) {
      return res.status(400).json({ message: "Cannot chat with yourself" });
    }

    // ✅ Correctly check if BOTH users are in the same conversation
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        participants: {
          some: { userId: currentUserId },
        },
        AND: {
          participants: {
            some: { userId: targetUserId },
          },
        },
      },
    });

    let conversationId: string;

    if (existingConversation) {
      conversationId = existingConversation.id;
    } else {
      // Create a new conversation with both users
      const newConversation = await prisma.conversation.create({
        data: {
          isGroup: false,
          participants: {
            create: [
              { userId: currentUserId },
              { userId: targetUserId },
            ],
          },
        },
      });
      conversationId = newConversation.id;
    }

    return res.json({ success: true, conversationId });
  } catch (err) {
    console.error("Error adding user to chat:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
