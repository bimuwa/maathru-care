import { ChatMessageDTO } from '../types/index.js';
import { db } from './db.service.js';

export class ChatService {
  public static getConversation(user1: string, user2: string): ChatMessageDTO[] {
    return db.messages
      .filter(
        m => (m.senderId === user1 && m.receiverId === user2) || (m.senderId === user2 && m.receiverId === user1)
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  public static sendMessage(input: {
    senderId: string;
    receiverId: string;
    messageText: string;
    attachmentUrl?: string;
    attachmentType?: 'image' | 'vital_summary' | 'prescription';
  }): ChatMessageDTO {
    const newMsg: ChatMessageDTO = {
      id: `msg-${Date.now()}`,
      senderId: input.senderId,
      receiverId: input.receiverId,
      messageText: input.messageText,
      attachmentUrl: input.attachmentUrl,
      attachmentType: input.attachmentType,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    db.messages.push(newMsg);
    return newMsg;
  }
}
