import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Mic } from 'lucide-react';
import { SquareIcon } from "lucide-react";

interface ChatControlsProps {
  isStreaming: boolean;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSendClick: () => void;
}

const ChatControls = memo(({ isStreaming, onFileUpload, onSendClick }: ChatControlsProps) => {
  return (
    <div className="flex justify-between items-center mr-1 [&_svg]:!w-[1.25rem] [&_svg]:!h-[1.25rem]">
      <div className="flex gap-2 ml-1">
        <input
          type="file"
          id="fileUpload"
          className="hidden"
          onChange={onFileUpload}
        />
        <label htmlFor="fileUpload">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 rounded-full hover:bg-primary/10 hover:text-primary transition-colors duration-200"
            type="button"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-paperclip"><path d="M13.234 20.252 21 12.3"/><path d="m16 6-8.414 8.586a2 2 0 0 0 0 2.828 2 2 0 0 0 2.828 0l8.414-8.586a4 4 0 0 0 0-5.656 4 4 0 0 0-5.656 0l-8.415 8.585a6 6 0 1 0 8.486 8.486"/></svg>
          </Button>
        </label>
        <Toggle 
          variant="default" 
          aria-label="Toggle search"
          className="h-10 w-10 rounded-full hover:bg-primary/10 hover:text-primary transition-colors duration-200 data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-telescope"><path d="m10.065 12.493-6.18 1.318a.934.934 0 0 1-1.108-.702l-.537-2.15a1.07 1.07 0 0 1 .691-1.265l13.504-4.44"/><path d="m13.56 11.747 4.332-.924"/><path d="m16 21-3.105-6.21"/><path d="M16.485 5.94a2 2 0 0 1 1.455-2.425l1.09-.272a1 1 0 0 1 1.212.727l1.515 6.06a1 1 0 0 1-.727 1.213l-1.09.272a2 2 0 0 1-2.425-1.455z"/><path d="m6.158 8.633 1.114 4.456"/><path d="m8 21 3.105-6.21"/><circle cx="12" cy="13" r="2"/></svg>
        </Toggle>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full hover:bg-primary/10 hover:text-primary transition-colors duration-200"
        >
          <Mic size={28} />
        </Button>
      </div>

      <Button 
        variant="default" 
        size="icon" 
        className="h-10 w-10 rounded-full hover:bg-primary/90 bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
        onClick={onSendClick}
      >
        {isStreaming ? (
          <SquareIcon className="h-4 w-4" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-up">
            <path d="m5 12 7-7 7 7"/>
            <path d="M12 19V5"/>
          </svg>
        )}
      </Button>
    </div>
  );
});

ChatControls.displayName = "ChatControls";
export default ChatControls;
