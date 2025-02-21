"use client";

import { Textarea } from "@/components/ui/textarea";
import { KeyboardEvent, useState, useRef, memo, useCallback, useEffect } from "react";
import { useChat } from "@/contexts/chat-context";
import ChatControls from "./chat-controls";

const ChatBox = memo(() => {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, currentChat, isStreaming, stopStreaming } = useChat();
  const resizeTimeoutRef = useRef<NodeJS.Timeout>();

  const adjustTextareaHeight = useCallback(() => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 400);
    
    // Debounce height transitions
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    textarea.style.transition = 'height 0.3s ease-out';
    textarea.style.height = `${newHeight}px`;
    
    resizeTimeoutRef.current = setTimeout(() => {
      textarea.style.transition = '';
    }, 300);
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [adjustTextareaHeight, value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!value.trim() || !currentChat) return;
    
    const messageContent = value.trim();
    setValue("");
    
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        adjustTextareaHeight();
      }
    });
    
    await sendMessage(messageContent);
  }, [value, currentChat, sendMessage, adjustTextareaHeight]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log(`Uploaded file: ${file.name}`);
    }
  }, []);

  const handleButtonClick = useCallback(() => {
    if (isStreaming) {
      stopStreaming();
    } else {
      handleSendMessage();
    }
  }, [isStreaming, stopStreaming, handleSendMessage]);

  return (
    <div className="flex flex-col gap-0 p-2 border border-neutral-300 dark:border-border/30 bg-white/80 dark:bg-neutral-900/90 backdrop-blur-md shadow-[0_-1px_30px_-12px_rgba(0,0,0,0.08),_0_-8px_16px_-8px_rgba(0,0,0,0.03)] dark:shadow-[0_-1px_30px_-12px_rgba(0,0,0,0.25),_0_-8px_16px_-8px_rgba(0,0,0,0.15)] rounded-t-[1rem] transition-all duration-200 relative before:absolute before:inset-0 before:rounded-t-[1rem] before:p-[1px] before:bg-transparent dark:before:bg-gradient-to-b before:from-zinc-300 dark:before:from-border/20 before:to-transparent before:-z-10">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Write a message..."
          className="min-h-[60px] max-h-[400px] overflow-y-auto resize-none pr-1 bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/70"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--border-color) transparent',
          }}
        />
      </div>
      
      <ChatControls 
        isStreaming={isStreaming}
        onFileUpload={handleFileUpload}
        onSendClick={handleButtonClick}
      />
    </div>
  );
});

ChatBox.displayName = "ChatBox";
export default ChatBox;
