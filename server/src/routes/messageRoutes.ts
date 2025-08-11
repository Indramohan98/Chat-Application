import express from 'express';
// import { sendMessage, getConversation, deleteMessage, addReaction } from '../controllers/messageController';
import { getConversation } from '../controllers/messageController';

const router = express.Router();

router.get('/conversations/:conversationId', getConversation);

// POST /api/messages/send - Send a new message
// router.post('/send', sendMessage);

// GET /api/messages/conversations - Fetch conversation
// router.get('/conversations/:conversationId', getConversation);

// DEL /api/messages/conversations - Delete a message
// router.delete('/:messageId', deleteMessage);

// POST /api/messages/conversations - Add reaction to a message
// router.post('/:messageId/reactions', addReaction);

export default router;