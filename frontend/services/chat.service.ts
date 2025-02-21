import { Chat, Message } from '@/types/chat'

export class ChatService {
  private static instance: ChatService
  private baseUrl = 'http://localhost:8000'

  private constructor() {}

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService()
    }
    return ChatService.instance
  }

  private saveChatsToLocalStorage(chats: Chat[]) {
    localStorage.setItem('chats', JSON.stringify(chats));
  }

  private loadChatsFromLocalStorage(): Chat[] {
    const saved = localStorage.getItem('chats');
    return saved ? JSON.parse(saved) : [];
  }

  async getChats(limit: number = 3, offset: number = 0): Promise<{ chats: Chat[], total: number }> {
    try {
      // For initial load (offset 0), always fetch first 3 chats
      const initialLimit = offset === 0 ? 3 : limit;
      const response = await fetch(`${this.baseUrl}/chats?limit=${initialLimit}&offset=${offset}`);
      if (!response.ok) throw new Error('Failed to fetch chats');
      const { chats: chatIds, total } = await response.json();
      
      const chats = await Promise.all(
        chatIds.map(async (id: string) => {
          const chatResponse = await fetch(`${this.baseUrl}/chat/${id}`);
          if (!chatResponse.ok) throw new Error(`Failed to fetch chat ${id}`);
          const chatData = await chatResponse.json();
          return {
            id: chatData.chatId,
            title: chatData.title,
            messages: chatData.conversations.map((conv: any) => ({
              id: conv.message_id,
              content: conv.content,
              role: conv.role,
              createdAt: new Date()
            })),
            createdAt: new Date(chatData.created_at),
            updatedAt: new Date(chatData.created_at)
          };
        })
      );
      
      return { chats, total };
    } catch (error) {
      console.error('Failed to fetch chats:', error);
      return { chats: [], total: 0 };
    }
  }

  async createChat(): Promise<Chat> {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    try {
      // Create chat in backend
      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: newChat.id,
          title: newChat.title
        })
      });
      
      if (!response.ok) throw new Error('Failed to create chat in backend');
      
      // Save to local storage as backup
      const chats = this.loadChatsFromLocalStorage();
      chats.unshift(newChat);
      this.saveChatsToLocalStorage(chats);
      
      return newChat;
    } catch (error) {
      console.error('Failed to create chat in backend:', error);
      // Still save to local storage
      const chats = this.loadChatsFromLocalStorage();
      chats.unshift(newChat);
      this.saveChatsToLocalStorage(chats);
      return newChat;
    }
  }

  async sendMessage(chatId: string, content: string): Promise<Message[]> {
    const userMessage = {
      id: Date.now().toString(),
      content,
      role: 'user',
      createdAt: new Date()
    };

    const assistantMessage = {
      id: (Date.now() + 1).toString(),
      content: '',
      role: 'assistant',
      createdAt: new Date()
    };

    const messages = [userMessage, assistantMessage];

    // Save user message immediately
    await this.saveChat(chatId, [userMessage]);

    return messages;
  }

  // Add method to update assistant message content
  async updateAssistantMessage(chatId: string, messageId: string, content: string): Promise<void> {
    const chats = this.loadChatsFromLocalStorage();
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      const messages = chat.messages.map(msg => 
        msg.id === messageId 
          ? { ...msg, content } 
          : msg
      );
      await this.saveChat(chatId, messages);
    }
  }

  async processStream(
    chatId: string,
    content: string,
    onChunk: (chunk: { 
      content: string;
      totalTokens?: number;
      maxTokens?: number;
      tokensPerSecond?: number;
      title?: string; // Add title here
    }) => void
  ) {
    const response = await fetch(`${this.baseUrl}/user_chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: chatId,
        message: content,
        stream: true
      })
    });

    if (!response.ok) {
      console.error('Stream response status:', response.status);
      const errorText = await response.text();
      console.error('Stream error details:', errorText);
      throw new Error(`Stream request failed: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Save the complete assistant message after streaming is done
          const messages = await this.getChat(chatId);
          if (messages && messages.messages.length > 0) {
            const lastMessage = messages.messages[messages.messages.length - 1];
            if (lastMessage.role === 'assistant') {
              await this.saveChat(chatId, messages.messages);
            }
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(5).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              onChunk(parsed);
            } catch (e) {
              console.error('Failed to parse chunk:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async getChat(chatId: string): Promise<Chat | null> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/${chatId}`);
      if (!response.ok) throw new Error('Failed to fetch chat');
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch chat:', error);
      return null;
    }
  }

  async deleteChat(chatId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/${chatId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete chat');
      
      // Remove from local storage
      const chats = this.loadChatsFromLocalStorage();
      const updatedChats = chats.filter(chat => chat.id !== chatId);
      this.saveChatsToLocalStorage(updatedChats);
    } catch (error) {
      console.error('Failed to delete chat:', error);
      throw error;
    }
  }

  async deleteAllChats(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/chats`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete all chats');
      
      // Clear local storage
      this.saveChatsToLocalStorage([]);
    } catch (error) {
      console.error('Failed to delete all chats:', error);
      throw error;
    }
  }

  async renameChat(chatId: string, newTitle: string): Promise<void> {
    const chats = this.loadChatsFromLocalStorage();
    const updatedChats = chats.map(chat => 
      chat.id === chatId 
        ? { ...chat, title: newTitle }
        : chat
    );
    this.saveChatsToLocalStorage(updatedChats);
  }

  async clearAllChats(): Promise<void> {
    this.saveChatsToLocalStorage([]);
  }

  async getTotalContext(chatId: string): Promise<{ totalTokens: number; maxTokens: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/get_total_context/${chatId}`);
      if (!response.ok) {
        throw new Error(`Failed to get context: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching total context:', error);
      // Return default values if fetch fails
      return { totalTokens: 0, maxTokens: 8192 };
    }
  }

  async saveChat(chatId: string, messages: Message[]): Promise<void> {
    try {
      const messagesFormatted = messages.map((msg, index) => ({
        message_id: msg.id,
        message_position: index + 1,
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch(`${this.baseUrl}/chat/${chatId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesFormatted
        })
      });

      if (!response.ok) throw new Error('Failed to save chat');
    } catch (error) {
      console.error('Failed to save chat:', error);
      throw error;
    }
  }

  async updateChatPosition(chatId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/${chatId}/position`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error('Failed to update chat position');
    } catch (error) {
      console.error('Failed to update chat position:', error);
    }
  }
}
