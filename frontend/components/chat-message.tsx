import { Markdown } from "@/components/ui/markdown"
import { cn } from "@/lib/utils"
import React, { memo } from 'react'
import { TextShimmer } from '@/components/ui/text-shimmer';

interface ChatMessageProps {
  content: string
  role: 'user' | 'assistant'
  isThinking?: boolean
  isStreaming?: boolean
}

// Memoize the ChatMessage component
export const ChatMessage = memo(function ChatMessage({ 
  content, 
  role, 
  isThinking = false, 
  isStreaming = false 
}: ChatMessageProps) {
  // Cache formatted content
  const formattedContent = React.useMemo(() => 
    content.replace(/\n{3,}/g, '\n\n').trim(),
    [content]
  )

  return (
    <div 
      className={cn(
        "flex pb-5 w-full",
        role === 'user' ? "items-start" : "pl-0",
        isStreaming && "streaming-message"
      )}
      data-message-id={role}
      style={{ 
        willChange: 'transform',
        transform: 'translateZ(0)'
      }}
    >
      <div className={cn(
        "rounded-xl px-6 py-5 w-full",
        role === 'assistant' 
          ? "bg-[hsl(var(--message-assistant))]" 
          : "bg-[hsl(var(--message-user))] user-font",
        "text-[hsl(var(--message-text))]",
        isStreaming && "animate-fade-in"
      )}>
        <div 
          className={cn(
            "prose prose-slate dark:prose-invert max-w-none text-[0.9rem] leading-relaxed",
            "prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline",
            "prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg",
            "prose-h1:mb-4 prose-h2:mb-3 prose-h3:mb-2",
            "prose-footnotes:text-sm prose-footnotes:leading-normal",
            isStreaming && "typing-effect"
          )}
        >
          {isThinking && !content ? (
            
            <div className="flex items-center text-muted-foreground text-[0.9rem]">
              <TextShimmer className='font-mono mb-0 pb-0' duration={1}>
                Thinking ...
              </TextShimmer>
            </div>
          ) : (
            <Markdown content={formattedContent} />
          )}
        </div>
      </div>
    </div>
  )
})
