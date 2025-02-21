'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Chat, Message, TokenStats } from '@/types/chat'
import { ChatService } from '@/services/chat.service'

interface ChatContextType {
  chats: Chat[]
  currentChat: Chat | null
  isLoading: boolean
  isStreaming: boolean
  createChat: () => Promise<Chat>
  sendMessage: (content: string) => Promise<void>
  setCurrentChat: (chat: Chat) => void
  deleteChat: (chatId: string) => Promise<void>
  renameChat: (chatId: string, newTitle: string) => Promise<void>
  clearAllChats: () => Promise<void>
  tokenStats: TokenStats
  updateTokenStats: (stats: Partial<TokenStats> & { title?: string }) => void // Update type here
  stopStreaming: () => void
  loadMoreChats: () => Promise<void> // added here
  totalChats: number;  // Add this
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

const initialTokenStats = { startTokens: 0, totalTokens: 0, maxTokens: 8192, tokensPerSecond: 0 };

// Load tokenStatsMap from session storage if available
const loadTokenStatsMap = () => {
  if (typeof sessionStorage !== 'undefined') {
    const saved = sessionStorage.getItem('tokenStatsMap')
    return saved ? JSON.parse(saved) : {}
  }
  return {}
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChat, setCurrentChat] = useState<Chat | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [tokenStatsMap, setTokenStatsMap] = useState<Record<string, TokenStats>>(loadTokenStatsMap)
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [totalChats, setTotalChats] = useState(0); // added here
  const chatService = ChatService.getInstance()

  const updateTokenStats = (stats: Partial<TokenStats> & { title?: string }) => {
    if (!currentChat) return;
    setTokenStatsMap(prev => ({
      ...prev,
      [currentChat.id]: {
        ...(prev[currentChat.id] || initialTokenStats),
        ...stats
      }
    }));

    // Update currentChat title if available
    if (stats.title) {
      setCurrentChat(prev => {
        if (!prev) return null;
        return { ...prev, title: stats.title! };
      });

      setChats(prevChats =>
        prevChats.map(chat =>
          chat.id === currentChat.id
            ? { ...chat, title: stats.title }
            : chat
        )
      );
    }
  }

  // Persist tokenStatsMap whenever it changes
  useEffect(() => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('tokenStatsMap', JSON.stringify(tokenStatsMap))
    }
  }, [tokenStatsMap])

  // Derive tokenStats for the current chat
  const currentTokenStats = currentChat ? (tokenStatsMap[currentChat.id] || initialTokenStats) : initialTokenStats

  useEffect(() => {
    loadChats()
  }, [])

  const loadChats = async () => {
    setIsLoading(true)
    try {
      const { chats: initialChats, total } = await chatService.getChats(3, 0)
      setChats(initialChats || [])
      if (initialChats?.length > 0 && !currentChat) {
        setCurrentChat(initialChats[0])
      }
      
      // Save total to state for pagination
      setTotalChats(total)
    } catch (error) {
      console.error('Failed to load chats:', error)
      setChats([])
    } finally {
      setIsLoading(false)
    }
  }

  // New function to load additional chats when requested
  const loadMoreChats = async () => {
    try {
      const { chats: more } = await chatService.getChats(10, chats.length)
      if (more && more.length > 0) {
        setChats(prevChats => [...prevChats, ...more])
      }
    } catch (error) {
      console.error('Failed to load more chats:', error)
    }
  }

  const createChat = async () => {
    try {
      const newChat = await chatService.createChat()
      setChats(prevChats => [newChat, ...prevChats])
      setCurrentChat(newChat)
      return newChat
    } catch (error) {
      console.error('Failed to create chat:', error)
      throw error
    }
  }

  const updateContextStats = async (chatId: string) => {
    try {
      const stats = await chatService.getTotalContext(chatId);
      updateTokenStats(stats);
    } catch (error) {
      console.error('Failed to update context stats:', error);
    }
  };

  const stopStreaming = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsStreaming(false);
    }
  }, [abortController]);

  // Add new function to move chat to top
  const moveChatToTop = useCallback((chatId: string) => {
    setChats(prevChats => {
      const chatIndex = prevChats.findIndex(c => c.id === chatId);
      if (chatIndex <= 0) return prevChats; // Already at top or not found
      
      const newChats = [...prevChats];
      const [chat] = newChats.splice(chatIndex, 1);
      newChats.unshift(chat);
      return newChats;
    });
  }, []);

  // Update sendMessage to move chat to top after activity
  const sendMessage = async (content: string) => {
    if (!currentChat) return;
    
    try {
      setIsStreaming(true);
      // Move chat to top when message is sent
      moveChatToTop(currentChat.id);
      
      const controller = new AbortController();
      setAbortController(controller);

      const initialTotal = tokenStatsMap[currentChat.id]?.totalTokens || 0;
      const messages = await chatService.sendMessage(currentChat.id, content);
      const assistantMessageId = messages[1].id;
      
      const updateMessages = (chat: Chat) => {
        if (chat.id === currentChat.id) {
          return { ...chat, messages: [...chat.messages, ...messages] };
        }
        return chat;
      };
      
      setChats(prev => prev.map(updateMessages));
      setCurrentChat(prev => prev ? updateMessages(prev) : null);

      let fullContent = '';
      await chatService.processStream(
        currentChat.id,
        content,
        async (chunk) => {
          if (chunk.content) {
            fullContent += chunk.content;
            
            requestAnimationFrame(() => {
              setCurrentChat(prev => {
                if (!prev) return null;
                const lastMessage = prev.messages[prev.messages.length - 1];
                if (lastMessage.role === 'assistant') {
                  const updatedMessages = [...prev.messages];
                  updatedMessages[updatedMessages.length - 1] = {
                    ...lastMessage,
                    content: fullContent
                  };
                  
                  setChats(prevChats => 
                    prevChats.map(chat => 
                      chat.id === currentChat.id
                        ? { ...chat, messages: updatedMessages }
                        : chat
                    )
                  );
                  
                  return { ...prev, messages: updatedMessages };
                }
                return prev;
              });
            });
          }
          // Handle token stats updates
          if (chunk.totalTokens !== undefined || chunk.tokensPerSecond !== undefined || chunk.title) {
            updateTokenStats({
              totalTokens: chunk.totalTokens,
              tokensPerSecond: chunk.tokensPerSecond,
              title: chunk.title, // Pass title here
            });
          }
        },
        controller.signal
      );

      // Save the complete chat after streaming is done
      const updatedChat = chats.find(c => c.id === currentChat.id);
      if (updatedChat) {
        await chatService.saveChat(currentChat.id, updatedChat.messages);
      }

      await updateContextStats(currentChat.id);
      
      // Update the chat's position in the backend
      await chatService.updateChatPosition(currentChat.id);
      
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsStreaming(false);
      setAbortController(null);
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      await chatService.deleteChat(chatId)
      setChats(prevChats => prevChats.filter(chat => chat.id !== chatId))
      if (currentChat?.id === chatId) {
        const remainingChats = chats.filter(chat => chat.id !== chatId)
        setCurrentChat(remainingChats.length > 0 ? remainingChats[0] : null)
      }
    } catch (error) {
      console.error('Failed to delete chat:', error)
      throw error
    }
  }

  const renameChat = async (chatId: string, newTitle: string) => {
    try {
      await chatService.renameChat(chatId, newTitle)
      setChats(prevChats => 
        prevChats.map(chat => 
          chat.id === chatId 
            ? { ...chat, title: newTitle }
            : chat
        )
      )
    } catch (error) {
      console.error('Failed to rename chat:', error)
    }
  }

  const clearAllChats = async () => {
    try {
      await chatService.deleteAllChats()
      setChats([])
      setCurrentChat(null)
      setTokenStatsMap({})
    } catch (error) {
      console.error('Failed to clear chats:', error)
      throw error
    }
  }

  return (
    <ChatContext.Provider
      value={{
        chats,
        currentChat,
        isLoading,
        isStreaming,
        createChat,
        sendMessage,
        setCurrentChat,
        deleteChat,
        renameChat,
        clearAllChats,
        tokenStats: currentTokenStats,
        updateTokenStats,
        stopStreaming,
        loadMoreChats,  // added here
        totalChats,  // Add this
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export const useChat = () => {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}
