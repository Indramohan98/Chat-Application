import express from 'express';
import { searchUser, syncUser, addUserToChat } from '../controllers/userController';
import {getUserConversations, getConversationMessages} from '../controllers/conversationController';

const router = express.Router();

router.post('/search', searchUser);
router.post('/sync', syncUser);
router.post("/addUser", addUserToChat);
router.get('/getChatlist/:userId', getUserConversations); // Optional: for direct name search via URL
router.get('/conversation/:conversationId/messages', getConversationMessages);

export default router;
