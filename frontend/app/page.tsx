"use client"

import { useChat } from "@/contexts/chat-context"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TopBar } from "@/components/top-bar"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"

export default function Page() {
  const { chats, createChat } = useChat()
  const router = useRouter()

  const handleNewChat = async () => {
    const newChat = await createChat()
    router.push(`/chat/${newChat.id}`)
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col h-screen bg-background relative">
        <TopBar />
        <main className="flex flex-col flex-1 relative overflow-hidden">
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            {chats.length === 0 ? (
              <>
                <p>No chats yet</p>
                <Button onClick={handleNewChat}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Chat
                </Button>
              </>
            ) : (
              "Select a chat or create a new one"
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}