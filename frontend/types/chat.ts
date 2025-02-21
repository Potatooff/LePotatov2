export type Role = 'user' | 'assistant'

export interface Message {
  id: string
  content: string
  role: Role
  createdAt: Date
}

export interface Chat {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

export interface ChatHistory {
  chats: Chat[]
}

export interface TokenStats {
  totalTokens: number
  maxTokens: number
  tokensPerSecond: number
}
