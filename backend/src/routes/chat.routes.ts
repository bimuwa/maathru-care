import { Router, Request, Response } from 'express';
import { db } from '../services/db.service.js';

const router = Router();

// GET /api/v1/chat/conversation
router.get('/conversation', async (req: Request, res: Response): Promise<void> => {
  try {
    const { user1, user2 } = req.query;
    if (!user1 || !user2) {
      res.status(400).json({ success: false, error: 'Missing user1 or user2 in query' });
      return;
    }

    const supabase = db.getSupabase();

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .or(`and(sender_id.eq.${user1},receiver_id.eq.${user2}),and(sender_id.eq.${user2},receiver_id.eq.${user1})`)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const messages = data.map((m: any) => ({
      id: m.id,
      senderId: m.sender_id,
      receiverId: m.receiver_id,
      messageText: m.message_text,
      attachmentUrl: m.attachment_url,
      attachmentType: m.attachment_type,
      isRead: m.is_read,
      createdAt: m.created_at,
    }));

    res.status(200).json({ success: true, messages });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/chat/send
router.post('/send', async (req: Request, res: Response): Promise<void> => {
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

    const supabase = db.getSupabase();

    const insertData = {
      sender_id: senderId,
      receiver_id: receiverId,
      message_text: messageText || null,
      attachment_url: attachmentUrl || null,
      attachment_type: attachmentType || null,
      is_read: false,
    };

    const { data, error } = await supabase
      .from('chat_messages')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;

    const message = {
      id: data.id,
      senderId: data.sender_id,
      receiverId: data.receiver_id,
      messageText: data.message_text,
      attachmentUrl: data.attachment_url,
      attachmentType: data.attachment_type,
      isRead: data.is_read,
      createdAt: data.created_at,
    };

    res.status(201).json({ success: true, message });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
