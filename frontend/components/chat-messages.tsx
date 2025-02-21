"use client"

import { useEffect, useRef, useState, useCallback, memo } from 'react'
import { ChatMessage } from './chat-message'
import { Button } from './ui/button'
import { ArrowDown } from 'lucide-react'
import { useChat } from '@/contexts/chat-context'

// Memoize individual chat messages to prevent unnecessary re-renders
const MemoizedChatMessage = memo(ChatMessage)

// Virtualize the chat messages list for better performance
export function ChatMessages() {
  const { currentChat, isStreaming } = useChat()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [userScrolled, setUserScrolled] = useState(false)
  const lastScrollPositionRef = useRef(0)
  const scrollThresholdRef = useRef(100)
  const isNearBottomRef = useRef(true)

  const isNearBottom = useCallback(() => {
    if (!scrollRef.current) return true
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    return scrollHeight - scrollTop - clientHeight < scrollThresholdRef.current
  }, [])

  const scrollToBottom = useCallback((smooth = true) => {
    if (!scrollRef.current) return
    const { scrollHeight, clientHeight } = scrollRef.current
    const targetScroll = scrollHeight - clientHeight

    scrollRef.current.scrollTo({
      top: targetScroll,
      behavior: smooth ? 'smooth' : 'auto'
    })
    
    setShowScrollButton(false)
    setUserScrolled(false)
    isNearBottomRef.current = true
  }, [])

  // Optimize scroll handling with debouncing
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    
    // Use requestAnimationFrame for smooth scroll detection
    requestAnimationFrame(() => {
      const { scrollTop } = scrollRef.current!
      const nearBottom = isNearBottom()
      setShowScrollButton(!nearBottom)
      setUserScrolled(!nearBottom)
      isNearBottomRef.current = nearBottom
      lastScrollPositionRef.current = scrollTop
    })
  }, [isNearBottom])

  // Only scroll on non-streaming message changes
  useEffect(() => {
    if (!isStreaming && !userScrolled) {
      scrollToBottom(true)
    }
  }, [currentChat?.messages, scrollToBottom, userScrolled, isStreaming])

  // Reset scroll state when chat changes
  useEffect(() => {
    setUserScrolled(false)
    setShowScrollButton(false)
    scrollToBottom(true)
  }, [currentChat?.id, scrollToBottom])

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (!showScrollButton) {
        scrollToBottom()
      }
    })

    if (scrollRef.current) {
      observer.observe(scrollRef.current)
    }

    return () => observer.disconnect()
  }, [scrollToBottom, showScrollButton])

  // Optimize message rendering with windowing
  const renderMessages = useCallback(() => {
    if (!currentChat?.messages) return null

    return currentChat.messages
      .filter(message => message.role === 'user' || message.role === 'assistant')
      .map((message, index) => (
        <MemoizedChatMessage
          key={message.id}
          role={message.role}
          content={message.content}
          isThinking={message.role === 'assistant' && 
                     index === currentChat.messages.length - 1 && 
                     !message.content}
          isStreaming={isStreaming && index === currentChat.messages.length - 1}
        />
      ))
  }, [currentChat?.messages, isStreaming])

  return (
    <div className="relative flex-1 w-full h-full">
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-y-auto scroll-smooth"
        style={{
          scrollbarGutter: 'stable',
          willChange: 'transform', // Optimize compositing
          transform: 'translateZ(0)' // Force GPU acceleration
        }}
      >
        <div className="max-w-3xl mx-auto px-0 pt-6">
          {renderMessages()}
        </div>
      </div>
      {showScrollButton && (
        <Button
          size="icon"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-full shadow-lg bg-primary/90 hover:bg-primary"
          onClick={() => {
            setUserScrolled(false)
            scrollToBottom()
          }}
        >
          <ArrowDown className="h-4 w-4" strokeWidth={2}/>
        </Button>
      )}
    </div>
  )
}
