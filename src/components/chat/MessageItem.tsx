import React from 'react';
import { motion } from 'framer-motion';
import { Message } from '@/types';
import { cn } from '@/lib/utils';
import { 
  AlertTriangle, 
  Paperclip, 
  Zap, 
  Clock, 
  Copy, 
  CheckCircle2 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface MessageItemProps {
  message: Message;
  isFirst?: boolean;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col gap-3 group",
        message.role === 'user' ? "items-end" : "items-start"
      )}
    >
      <div className="flex items-start gap-2 max-w-[85%]">
        <div className={cn(
          "p-5 rounded-2xl shadow-sm text-sm leading-relaxed flex-1 max-h-[600px] overflow-y-auto",
          message.role === 'user' 
            ? "bg-orange-500 text-white rounded-tr-none" 
            : "bg-white text-gray-800 border border-gray-100 rounded-tl-none"
        )}>
          {message.modelId && (
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="outline" className={cn(
                "text-[10px] font-mono",
                message.role === 'user' ? "text-white border-white/30" : "text-gray-400 border-gray-100"
              )}>
                {message.modelId}
              </Badge>
            </div>
          )}
          
          {message.error ? (
            <div className="flex items-center gap-2 text-red-500 text-sm font-medium">
              <AlertTriangle className="w-4 h-4" />
              {message.content}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="whitespace-pre-wrap">
                {message.content}
                {message.isLoading && (
                  <span className="inline-flex ml-1">
                    <span className="animate-bounce">.</span>
                    <span className="animate-bounce [animation-delay:0.2s]">.</span>
                    <span className="animate-bounce [animation-delay:0.4s]">.</span>
                  </span>
                )}
              </div>
              
              {message.attachments && message.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100/10">
                   {message.attachments.map(att => (
                     <div key={att.id} className="flex items-center gap-1.5 bg-black/10 px-2 py-1 rounded text-[10px] backdrop-blur-sm">
                        <Paperclip className="w-3 h-3" /> {att.name}
                     </div>
                   ))}
                </div>
              )}

              {message.mediaUrl && (
                <div className="mt-3 rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                  {message.mediaType === 'image' && <img src={message.mediaUrl} alt="Generated" className="w-full h-auto" />}
                  {message.mediaType === 'video' && <video src={message.mediaUrl} controls className="w-full h-auto" />}
                  {message.mediaType === 'audio' && <audio src={message.mediaUrl} controls className="w-full h-auto" />}
                </div>
              )}
            </div>
          )}
        </div>
        {message.role === 'assistant' && message.content && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity pt-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400" onClick={copyToClipboard}>
              {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        )}
      </div>

      {message.role === 'assistant' && (message.usage || message.responseTime) && (
        <div className="flex items-center gap-4 px-1">
          {message.usage && (
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <Zap className="w-3 h-3 text-orange-400" />
              <span>{message.usage.total_tokens} tokens</span>
            </div>
          )}
          {message.responseTime && (
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <Clock className="w-3 h-3 text-blue-400" />
              <span>{message.responseTime}ms</span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};
