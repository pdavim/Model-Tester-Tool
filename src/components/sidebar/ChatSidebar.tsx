import React from 'react';
import { motion } from 'framer-motion';
import { 
  Settings2, 
  Settings, 
  Save, 
  Bookmark, 
  Trash, 
  Trash2, 
  Layers, 
  Info 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useChatStore } from '@/store/useChatStore';
import { useConfigStore } from '@/store/useConfigStore';
import { ModelSelector } from '@/components/modals/ModelSelector';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const ChatSidebar: React.FC = () => {
  const {
    sidebarOpen,
    presets,
    addPreset,
    deletePreset
  } = useConfigStore();

  const {
    comparisonMode, setComparisonMode,
    comparisonModels, setComparisonModels,
    systemPrompt, setSystemPrompt,
    temperature, setTemperature,
    topP, setTopP,
    maxTokens, setMaxTokens,
    frequencyPenalty, setFrequencyPenalty,
    presencePenalty, setPresencePenalty,
    clearChat
  } = useChatStore();

  const handleSavePreset = () => {
    const name = prompt('Enter preset name:');
    if (name) {
      addPreset({
        id: Math.random().toString(36).substring(7),
        name,
        parameters: { temperature, topP, maxTokens, frequencyPenalty, presencePenalty }
      });
      toast.success('Preset saved');
    }
  };

  return (
    <motion.div 
      initial={false}
      animate={{ width: sidebarOpen ? 320 : 0, opacity: sidebarOpen ? 1 : 0 }}
      className="h-full bg-white border-r border-gray-200 overflow-hidden flex flex-col shadow-sm z-20"
    >
      <div className="p-6 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="bg-orange-500 p-1.5 rounded-lg">
            <Settings2 className="w-5 h-5 text-white" />
          </div>
          <h2 className="font-semibold text-lg tracking-tight">Parameters</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSavePreset}>
            <Save className="w-4 h-4 text-gray-500" />
          </Button>
          {presets.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Bookmark className="w-4 h-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Presets</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {presets.map(preset => (
                  <DropdownMenuItem key={preset.id} className="justify-between group">
                    <span className="truncate">{preset.name}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePreset(preset.id);
                      }}
                    >
                      <Trash className="w-3 h-3" />
                    </Button>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-6 space-y-8">
          {/* Comparison Mode */}
          <div className="space-y-4 p-4 bg-orange-50 rounded-xl border border-orange-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-orange-600" />
                <Label className="text-sm font-semibold text-orange-900">Comparison Mode</Label>
              </div>
              <Checkbox checked={comparisonMode} onCheckedChange={(v) => setComparisonMode(!!v)} />
            </div>
            {comparisonMode && (
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-orange-400">Selected ({comparisonModels.length}/6)</Label>
                <div className="flex flex-wrap gap-1">
                  {comparisonModels.map(id => (
                    <Badge key={id} variant="secondary" className="bg-white text-[10px] h-5">
                      {id.split('/').pop()}
                      <button className="ml-1" onClick={() => setComparisonModels(comparisonModels.filter(m => m !== id))}>×</button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Model Selection */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Model</Label>
            <ModelSelector />
          </div>

          <Separator className="bg-gray-100" />

          {/* System Prompt */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">System Prompt</Label>
            <Textarea 
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="min-h-[80px] bg-gray-50 border-gray-200 text-xs resize-none"
            />
          </div>

          {/* Temperature */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Temperature</Label>
              <Badge variant="secondary" className="bg-orange-50 text-orange-700 font-mono">{temperature}</Badge>
            </div>
            <Slider value={[temperature]} onValueChange={(v) => setTemperature(v[0])} max={2} step={0.01} />
          </div>

          {/* Max Tokens */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Max Tokens</Label>
              <Badge variant="secondary" className="bg-orange-50 text-orange-700 font-mono">{maxTokens}</Badge>
            </div>
            <Slider value={[maxTokens]} onValueChange={(v) => setMaxTokens(v[0])} max={8192} step={1} />
          </div>

          {/* Penalty section simplified for extraction... */}
        </div>
      </ScrollArea>

      <div className="p-6 border-t border-gray-100">
        <Button 
          variant="outline" 
          className="w-full gap-2 text-gray-500 hover:text-red-500"
          onClick={clearChat}
        >
          <Trash2 className="w-4 h-4" /> Clear Conversation
        </Button>
      </div>
    </motion.div>
  );
};
