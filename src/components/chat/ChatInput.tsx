import React from 'react';
import { 
  Paperclip, 
  Send, 
  RefreshCw, 
  ImageIcon, 
  VideoIcon, 
  FileIcon, 
  X, 
  ShieldCheck,
  Command,
  CornerDownLeft
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
import { processFileAttachment } from '@/utils/file-processing';
import { cn } from '@/lib/utils';

export const ChatInput: React.FC = () => {
  const { 
    input, setInput, 
    selectedFiles, setSelectedFiles, removeAttachment,
    isLoading, isProcessingFiles, setIsProcessingFiles,
    handleSend
  } = useChatStore();
  
  const { openRouterKey, hfApiKey } = useConfigStore();
  
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

  const onSend = async () => {
    if ((!input.trim() && selectedFiles.length === 0) || isLoading || isProcessingFiles) return;
    await handleSend({ openRouterKey, hfApiKey });
  };

  return (
    <div className="bg-white/60 backdrop-blur-2xl border border-white/60 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.1)] rounded-[2.5rem] p-2 relative group transition-all duration-500">
      <div className="flex flex-col w-full">
        {/* Attachment Preview Tray */}
        <AnimatePresence>
          {selectedFiles.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-3 p-4 bg-gray-50/50 rounded-[1.5rem] mb-2 mx-2 overflow-hidden"
            >
              {selectedFiles.map((file) => (
                <motion.div 
                  key={file.id} 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative group/item bg-white border border-gray-100 rounded-xl p-2.5 pr-10 flex items-center gap-3 shadow-sm hover:shadow-md transition-all"
                >
                   <div className={cn(
                     "p-2 rounded-lg",
                     file.type === 'image' ? "bg-blue-50 text-blue-500" :
                     file.type === 'video' ? "bg-purple-50 text-purple-500" :
                     file.type === 'pdf' ? "bg-red-50 text-red-500" : "bg-gray-50 text-gray-500"
                   )}>
                      {file.type === 'image' ? <ImageIcon className="w-4 h-4" /> :
                       file.type === 'video' ? <VideoIcon className="w-4 h-4" /> :
                       file.type === 'pdf' ? <FileIcon className="w-4 h-4" /> :
                       <FileIcon className="w-4 h-4" />}
                   </div>
                   <div className="flex flex-col">
                     <span className="text-[11px] font-black uppercase tracking-tight text-gray-700 truncate max-w-[140px] leading-none mb-1">{file.name}</span>
                     <span className="text-[9px] font-bold text-gray-300 uppercase leading-none">{file.type}</span>
                   </div>
                   <Button 
                     variant="ghost" 
                     size="icon" 
                     className="h-6 w-6 absolute right-2 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
                     onClick={() => removeAttachment(file.id)}
                   >
                     <X className="w-3.5 h-3.5" />
                   </Button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative flex items-center px-4 min-h-[72px]">
          <div className="flex items-center gap-2 mr-4">
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
                    className="text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-xl h-11 w-11 transition-all"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={isProcessingFiles}
                  >
                    {isProcessingFiles ? <RefreshCw className="w-5 h-5 animate-spin text-orange-500" /> : <Paperclip className="w-5 h-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="rounded-xl font-bold bg-gray-900 border-none px-4 py-2">Attach Knowledge (PDF, Vision, Code)</TooltipContent>
              </Tooltip>
          </div>

          <Textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder={isProcessingFiles ? "Injecting Data Manifolds..." : "Initiate neural exchange..."}
            disabled={isProcessingFiles}
            className="flex-1 bg-transparent border-none focus-visible:ring-0 resize-none min-h-[40px] max-h-[300px] h-auto p-4 text-sm font-semibold tracking-tight leading-relaxed placeholder:text-gray-300 placeholder:italic pr-20"
          />

          <div className="absolute right-4 flex items-center gap-3">
             <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-lg text-[9px] font-black text-gray-300 uppercase tracking-widest border border-gray-100">
                <Command className="w-3 h-3" />
                <CornerDownLeft className="w-3 h-3" />
             </div>
             <Button 
                onClick={onSend}
                disabled={(!input.trim() && selectedFiles.length === 0) || isLoading || isProcessingFiles}
                className={cn(
                  "h-12 w-12 rounded-2xl transition-all duration-300 shadow-lg",
                  isLoading ? "bg-orange-100 text-orange-500" : "bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20 hover:scale-110"
                )}
              >
                {isLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6 fill-current" />}
              </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
