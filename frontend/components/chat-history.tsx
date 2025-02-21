"use client";

import { useState, memo, useCallback, useEffect } from "react";
import { Ellipsis, Trash2, Pencil, ChevronDown } from "lucide-react";
import { useChat } from "@/contexts/chat-context";
import { Input } from "./ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChatService } from "@/services/chat.service";

// Add these new imports
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
} from "@/components/ui/sidebar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Chat } from "@/types/chat";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const ChatHistory = memo(function ChatHistory() {
  const {
    chats,
    currentChat,
    setCurrentChat,
    deleteChat,
    createChat,
    renameChat,
    loadMoreChats,
    totalChats, // Add this from context
  } = useChat();
  
  // Initialize expanded state from localStorage
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('chatHistoryExpanded') === 'true'
    }
    return false;
  });

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const chatService = ChatService.getInstance();
  

  // Split chats into visible and additional (change from 5 to 3)
  const visibleChats = chats.slice(0, 3);
  const additionalChats = chats.slice(3);

  // Handle expanding and loading more chats
  const handleExpandToggle = async (open: boolean) => {
    setIsExpanded(open);
    if (typeof window !== 'undefined') {
      localStorage.setItem('chatHistoryExpanded', String(open));
    }
    
    if (open && chats.length < totalChats) {
      setIsLoadingMore(true);
      try {
        await loadMoreChats();
      } finally {
        setIsLoadingMore(false);
      }
    }
  };

  // Show More section if there are more than 3 total chats
  const showMoreSection = totalChats > 3;

  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const router = useRouter();

  // Renames the chat on either form submit or blur
  const handleRename = useCallback(
    async (chatId: string) => {
      if (!newTitle.trim()) {
        // Reset editing state if no valid title
        setEditingChatId(null);
        setNewTitle("");
        return;
      }

      await renameChat(chatId, newTitle.trim());
      setEditingChatId(null);
      setNewTitle("");
    },
    [newTitle, renameChat]
  );

  const startEditing = useCallback((chat: Chat) => {
    setEditingChatId(chat.id);
    setNewTitle(chat.title);
  }, []);

  // Submit rename on "enter" or blur
  const handleSubmit = useCallback(
    (e: React.FormEvent, chatId: string) => {
      e.preventDefault();
      handleRename(chatId);
    },
    [handleRename]
  );

  const handleDeleteChat = async () => {
    if (chatToDelete) {
      await deleteChat(chatToDelete);
      setChatToDelete(null);
    }
  };

  return (
    <>
      <AlertDialog
        open={!!chatToDelete}
        onOpenChange={() => setChatToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this
              chat and its history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteChat}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SidebarGroup>
        <div className="flex items-center px-3 py-3">
          <SidebarGroupLabel className="text-[0.9375rem]">
            Chats
          </SidebarGroupLabel>
        </div>

        <SidebarMenu>
          {/* Initial chats */}
          {visibleChats.map((chat) => (
            <SidebarMenuItem key={chat.id}>
              {editingChatId === chat.id ? (
                <form
                  onSubmit={(e) => handleSubmit(e, chat.id)}
                  className="flex-1"
                >
                  <Input
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onBlur={() => handleRename(chat.id)}
                    className="h-8"
                  />
                </form>
              ) : (
                <Link href={`/chat/${chat.id}`} className="flex-1">
                  <SidebarMenuButton
                    asChild
                    className="justify-start"
                    isActive={currentChat?.id === chat.id}
                  >
                    <button>
                      <span className="flex-1 pl-3 truncate text-[0.9375rem]">
                        {chat.title || "Le Potato v2"}
                      </span>
                    </button>
                  </SidebarMenuButton>
                </Link>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction className="hover:bg-accent hover:text-accent-foreground">
                    <Ellipsis className="shrink-0 w-4 h-4" />
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="right"
                  align="start"
                  className="bg-popover text-popover-foreground border border-border"
                >
                  <DropdownMenuItem onClick={() => startEditing(chat)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    <span>Rename</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="hover:bg-destructive/10"
                    onClick={() => setChatToDelete(chat.id)}
                  >
                    <Trash2 className="text-destructive mr-2 h-4 w-4" />
                    <span className="text-destructive">Delete Chat</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          ))}

          {/* Always show if there are more than 3 total chats */}
          {showMoreSection && (
            <>
              <Collapsible
                open={isExpanded}
                onOpenChange={handleExpandToggle}
                className="group/collapsible w-full"
              >
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="flex w-full items-center pl-5 py-2">
                    <span className="text-[0.9375rem]">
                      {isExpanded ? "Less" : "More"}
                      {isLoadingMore && " (Loading...)"}
                    </span>
                    <ChevronDown 
                      className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" 
                    />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>

                <CollapsibleContent>
                  {additionalChats.map((chat) => (
                    <SidebarMenuItem key={chat.id}>
                      {editingChatId === chat.id ? (
                        <form
                          onSubmit={(e) => handleSubmit(e, chat.id)}
                          className="flex-1"
                        >
                          <Input
                            autoFocus
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onBlur={() => handleRename(chat.id)}
                            className="h-8"
                          />
                        </form>
                      ) : (
                        <Link href={`/chat/${chat.id}`} className="flex-1">
                          <SidebarMenuButton
                            asChild
                            className="justify-start"
                            isActive={currentChat?.id === chat.id}
                          >
                            <button>
                              <span className="flex-1 pl-3 truncate text-[0.9375rem]">
                                {chat.title || "Le Potato v2"}
                              </span>
                            </button>
                          </SidebarMenuButton>
                        </Link>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <SidebarMenuAction className="hover:bg-accent hover:text-accent-foreground">
                            <Ellipsis className="shrink-0 w-4 h-4" />
                          </SidebarMenuAction>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          side="right"
                          align="start"
                          className="bg-popover text-popover-foreground border border-border"
                        >
                          <DropdownMenuItem onClick={() => startEditing(chat)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            <span>Rename</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="hover:bg-destructive/10"
                            onClick={() => setChatToDelete(chat.id)}
                          >
                            <Trash2 className="text-destructive mr-2 h-4 w-4" />
                            <span className="text-destructive">Delete Chat</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </SidebarMenuItem>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </SidebarMenu>
      </SidebarGroup>
    </>
  );
});
