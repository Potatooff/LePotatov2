import { useChat } from '@/contexts/chat-context'
import { Gauge } from 'lucide-react'

export function Header() {
  const { tokenStats } = useChat()
  
  return (
    <header className="fixed top-0 z-50 w-full border-b bg-background/75 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Le Potato</h1>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            <span>{tokenStats.tokensPerSecond.toFixed(1)} t/s</span>
          </div>
          <div className="flex items-center gap-1">
            <span>{tokenStats.totalTokens}</span>
            <span>/</span>
            <span>{tokenStats.maxTokens}</span>
            <span>tokens</span>
          </div>
        </div>
      </div>
    </header>
  )
}
