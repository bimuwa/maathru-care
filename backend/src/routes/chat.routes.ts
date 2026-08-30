import { Router, Request, Response } from 'express';
import { ChatService } from '../services/chat.service.js';

const router = Router();

// GET /api/v1/chat/conversation
router.get('/conversation', (req: Request, res: Response): void => {
  const { user1, user2 } = req.query;
  if (!user1 || !user2) {
    res.status(400).json({ success: false, error: 'Missing user1 or user2 in query' });
    return;
  }

  const messages = ChatService.getConversation(String(user1), String(user2));
  res.status(200).json({ success: true, messages });
});

// POST /api/v1/chat/send
router.post('/send', (req: Request, res: Response): void => {
  try {
    const { senderId, receiverId, messageText, attachmentUrl, attachmentType } = req.body;
    if (!senderId || !receiverId) {
      res.status(400).json({ success: false, error: 'Missing senderId or receiverId' });
      return;
    }

    if (!messageText && !attachmentUrl) {
      res.status(400).json({ success: false, error: 'Message must have text or an attachment' });
      return;
    }

    const message = ChatService.sendMessage({
      senderId,
      receiverId,
      messageText: messageText || '',
      attachmentUrl,
      attachmentType,
    });

    res.status(201).json({ success: true, message });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
