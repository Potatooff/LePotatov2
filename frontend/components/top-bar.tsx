"use client"

import { PenLine, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useChat } from "@/contexts/chat-context"
import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function TopBar() {
  const { createChat, currentChat, tokenStats } = useChat()
  const router = useRouter()

  const handleNewChat = async () => {
    const chat = await createChat()
    router.push(`/chat/${chat.id}`)
  }

  return (
    <header className="sticky top-0 z-50 flex h-12 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleNewChat}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-4" />
        <Select>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gpt-4o">
              <span className="font-medium">GPT-4o</span>
              <span className="text-muted-foreground ml-2">128k</span>
            </SelectItem>
            <SelectItem value="deepseek-r1">
              <span className="font-medium">Deepseek R1</span>
              <span className="text-muted-foreground ml-2">32k</span>
            </SelectItem>
            <SelectItem value="mistral-small">
              <span className="font-medium">Mistral Small</span>
              <span className="text-muted-foreground ml-2">8k</span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 text-lg font-medium chat-title-font">
        {currentChat?.title || "Le Potato v2"}
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          Context: {tokenStats?.totalTokens || 0}/{tokenStats?.maxTokens || 8192}
        </span>
        <span className="flex items-center gap-1">
          Speed: {(tokenStats?.tokensPerSecond || 0).toFixed(2)} t/s
        </span>
      </div>
    </header>
  )
}
