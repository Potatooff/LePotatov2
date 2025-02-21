"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useChat } from '@/contexts/chat-context'
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import dynamic from 'next/dynamic'
import { TopBar } from "@/components/top-bar"

const ChatMessages = dynamic(() => import('@/components/chat-messages').then(mod => mod.ChatMessages), {
  ssr: false,
  loading: () => <div className='flex flex-col items-center justify-center h-full gap-4 text-muted-foreground'><p>Loading chat messages...</p></div>,
})

interface ChatBoxProps {
  onSendMessage: (message: string) => Promise<void>;
}

const ChatBox = dynamic<ChatBoxProps>(() => import('@/components/chat-box'), {
  ssr: false,
  loading: () => <div className='flex flex-col items-center justify-center h-full gap-4 text-muted-foreground'><p>Loading chat box...</p></div>,
})

export default function ChatPage({ params }: { params: { chatId: string } }) {
  const { chats, setCurrentChat, updateTokenStats, isLoading } = useChat()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isLoading) return

    const chat = chats.find((c) => c.id === params.chatId)
    if (chat) {
      setCurrentChat(chat)
    } else if (chats.length > 0) {
      router.push(`/chat/${chats[0].id}`)
    } else {
      router.push('/')
    }
  }, [params.chatId, chats, setCurrentChat, router, isLoading])

  // Show loading state while chats are being loaded
  if (!isClient || isLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex flex-col h-screen bg-background relative">
          <TopBar />
          <main className="flex flex-col flex-1 relative overflow-hidden">
            <div className="flex items-center justify-center h-full">
              <div className="text-lg text-muted-foreground">Loading chats...</div>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  const currentChat = chats.find(c => c.id === params.chatId)
  if (!currentChat) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex flex-col h-screen bg-background relative">
          <TopBar />
          <main className="flex flex-col flex-1 relative overflow-hidden">
            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
              Loading...
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  const handleMessage = async (message: string) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, chatId: params.chatId }),
      })

      if (!response.ok) throw new Error('Network response was not ok')

      const data = await response.json()
      updateTokenStats({
        totalTokens: data.totalTokens,
        maxTokens: data.maxTokens,
        tokensPerSecond: data.tokensPerSecond,
      })
      // ...rest of handling code...
    } catch (error) {
      console.error('Error:', error)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-screen bg-background relative">
        <TopBar />
        <main className="flex flex-col flex-1 relative overflow-hidden">
          <div className="flex-1 flex flex-col relative">
            <ChatMessages />
          </div>
          <div className="sticky bottom-0 left-0 right-0 bg-background pr-2">
            <div className="w-full mx-auto" style={{ maxWidth: "50rem" }}>
              <ChatBox onSendMessage={handleMessage} />
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
