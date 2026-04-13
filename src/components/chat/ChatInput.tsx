import React from 'react';
import { 
  Paperclip, 
  Send, 
  RefreshCw, 
  ImageIcon, 
  VideoIcon, 
  FileIcon, 
  X, 
  ShieldCheck 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { AnimatePresence, motion } from 'framer-motion';
import { useChatStore } from '@/store/useChatStore';
import { useConfigStore } from '@/store/useConfigStore';
import { useModelStore } from '@/store/useModelStore';
import { processFileAttachment } from '@/utils/file-processing';

export const ChatInput: React.FC = () => {
  const { 
    input, setInput, 
    selectedFiles, setSelectedFiles, removeAttachment,
    isLoading, isProcessingFiles, setIsProcessingFiles,
    handleSend
  } = useChatStore();
  
  const { openRouterKey, hfApiKey } = useConfigStore();
  const { selectedService } = useModelStore(); // Using a slice for selected Model ID would be better, but we'll adapt App.tsx logic later
  
  // We'll need to pass the current selected model ID from somewhere. 
  // For now, let's assume it's passed via store or derived.
  // In the original App.tsx, selectedModel was a state.
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsProcessingFiles(true);
    const newAttachments = [];
    for (const file of files) {
      const processed = await processFileAttachment(file);
      if (processed) newAttachments.push(processed);
    }
    setSelectedFiles([...selectedFiles, ...newAttachments]);
    setIsProcessingFiles(false);
  };

  return (
    <div className="p-6 bg-white border-t border-gray-200">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Attachment Preview Tray */}
        <AnimatePresence>
          {selectedFiles.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-wrap gap-2 pb-2"
            >
              {selectedFiles.map((file) => (
                <div key={file.id} className="relative group bg-gray-50 border border-gray-200 rounded-lg p-2 pr-8 flex items-center gap-2">
                   {file.type === 'image' ? <ImageIcon className="w-3 h-3 text-blue-500" /> :
                    file.type === 'video' ? <VideoIcon className="w-3 h-3 text-purple-500" /> :
                    file.type === 'pdf' ? <FileIcon className="w-3 h-3 text-red-500" /> :
                    <FileIcon className="w-3 h-3 text-gray-500" />}
                   <span className="text-[10px] font-medium truncate max-w-[120px]">{file.name}</span>
                   <Button 
                     variant="ghost" 
                     size="icon" 
                     className="h-5 w-5 absolute right-1 hover:text-red-500 rounded-md"
                     onClick={() => removeAttachment(file.id)}
                   >
                     <X className="w-3 h-3" />
                   </Button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative">
          <Textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                // handleSend needs selectedModel. We'll grab it from the store in the final refactor.
              }
            }}
            placeholder={isProcessingFiles ? "Processing your files..." : "Type your message here..."}
            disabled={isProcessingFiles}
            className="min-h-[100px] max-h-[300px] overflow-y-auto w-full pr-16 bg-gray-50 border-gray-200 focus:ring-orange-500 resize-none rounded-2xl p-4 text-sm shadow-inner"
          />
          <div className="absolute bottom-4 right-4 flex items-center gap-2">
            <input 
              type="file" 
              multiple 
              id="file-upload" 
              className="hidden" 
              onChange={handleFileChange}
              accept="image/*,video/mp4,application/pdf,.md,text/markdown"
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-gray-400 hover:text-orange-500 rounded-lg h-10 w-10 p-0"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={isProcessingFiles}
                >
                  {isProcessingFiles ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Attach Image, Video, PDF or MD</TooltipContent>
            </Tooltip>
            <Button 
              onClick={() => {}} // Integration point
              disabled={(!input.trim() && selectedFiles.length === 0) || isLoading || isProcessingFiles}
              className="bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-200 rounded-lg h-10 w-10 p-0"
            >
              <Send className="w-5 h-5 text-white" />
            </Button>
          </div>
        </div>
      </div>
      <p className="text-center text-[10px] text-gray-400 mt-4 font-medium uppercase tracking-widest flex items-center justify-center gap-2">
        <ShieldCheck className="w-3 h-3" />
        Safe Analysis Mode Active • Press Enter to send
      </p>
    </div>
  );
};
