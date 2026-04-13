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
  Info,
  Cpu,
  Flame,
  Maximize2,
  Minimize2,
  Sparkles,
  Zap,
  Gauge
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
    sessions,
    currentSessionId,
    comparisonMode, setComparisonMode,
    comparisonModels, setComparisonModels,
    systemPrompt: defaultSystemPrompt, setSystemPrompt,
    temperature: defaultTemperature, setTemperature,
    topP: defaultTopP, setTopP,
    maxTokens: defaultMaxTokens, setMaxTokens,
    frequencyPenalty: defaultFreq, setFrequencyPenalty,
    presencePenalty: defaultPres, setPresencePenalty,
    clearChat
  } = useChatStore();

  const currentSession = sessions.find(s => s.id === currentSessionId);
  
  // Use session parameters or global defaults
  const params = currentSession?.parameters || {
    systemPrompt: defaultSystemPrompt,
    temperature: defaultTemperature,
    topP: defaultTopP,
    maxTokens: defaultMaxTokens,
    frequencyPenalty: defaultFreq,
    presencePenalty: defaultPres,
    selectedModel: '',
    selectedService: 'all'
  };

  const handleSavePreset = () => {
    const name = prompt('Enter preset name:');
    if (name) {
      addPreset({
        id: Math.random().toString(36).substring(7),
        name,
        parameters: { 
          temperature: params.temperature, 
          topP: params.topP, 
          maxTokens: params.maxTokens, 
          frequencyPenalty: params.frequencyPenalty, 
          presencePenalty: params.presencePenalty 
        }
      });
      toast.success('Preset saved');
    }
  };

  return (
    <motion.div 
      initial={false}
      animate={{ width: sidebarOpen ? 320 : 0, opacity: sidebarOpen ? 1 : 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="h-full bg-white border-r border-gray-100 overflow-hidden flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20"
    >
      {/* Header */}
      <div className="p-8 flex items-center justify-between border-b border-gray-50 bg-gradient-to-b from-gray-50/50 to-transparent">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 p-2 rounded-xl shadow-lg shadow-orange-500/20">
            <Gauge className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <h2 className="font-black text-sm uppercase tracking-widest text-gray-900 leading-none">Quantum</h2>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Parameters</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-orange-50 hover:text-orange-600 transition-colors" onClick={handleSavePreset}>
                <Save className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save Template</TooltipContent>
          </Tooltip>
          
          {presets.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-gray-100">
                  <Bookmark className="w-4 h-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl shadow-2xl border-gray-100">
                <DropdownMenuLabel className="text-[11px] font-black uppercase tracking-widest text-gray-400 p-3">Intelligence Presets</DropdownMenuLabel>
                <Separator className="mb-2" />
                {presets.map(preset => (
                  <DropdownMenuItem key={preset.id} className="justify-between group rounded-lg p-3 cursor-pointer hover:bg-gray-50">
                    <span className="truncate font-bold text-gray-700">{preset.name}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePreset(preset.id);
                      }}
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </Button>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-8 space-y-10">
          {/* Comparison Mode Toggle */}
          <div className="relative group overflow-hidden p-5 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-xl shadow-gray-200 text-white">
            <div className="absolute top-0 right-0 p-1 opacity-10 group-hover:opacity-20 transition-opacity">
              <Layers className="w-16 h-16 scale-150 rotate-12" />
            </div>
            <div className="relative flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md">
                   <Zap className="w-4 h-4 text-orange-400" />
                </div>
                <Label className="text-sm font-black uppercase tracking-widest leading-none">Multi-Sync</Label>
              </div>
              <Checkbox 
                checked={comparisonMode} 
                onCheckedChange={(v) => setComparisonMode(!!v)} 
                className="h-6 w-6 border-white/20 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 rounded-lg shadow-inner"
              />
            </div>
            <p className="text-[10px] text-gray-400 font-bold mb-4 opacity-80 leading-relaxed uppercase tracking-tighter">Enable simultaneous benchmarking for up to 6 models in this session.</p>
            {comparisonMode && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex flex-wrap gap-1.5">
                  {comparisonModels.map(id => (
                    <Badge key={id} variant="secondary" className="bg-white/10 hover:bg-white/20 border-white/5 text-white/90 text-[9px] font-black h-6 px-3 rounded-full transition-colors group/badge">
                      {id.split('/').pop()?.toUpperCase()}
                      <button className="ml-2 text-white/30 hover:text-orange-400" onClick={() => setComparisonModels(comparisonModels.filter(m => m !== id))}>×</button>
                    </Badge>
                  ))}
                  {comparisonModels.length === 0 && <span className="text-[10px] text-orange-400 font-black uppercase">No Contenders Selected</span>}
                </div>
              </div>
            )}
          </div>

          {/* Model selection section */}
          {!comparisonMode && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400">Target Manifest</Label>
                {params.selectedModel && (
                  <Badge variant="outline" className="text-[9px] font-bold border-orange-100 text-orange-600 bg-orange-50 uppercase">{params.selectedService}</Badge>
                )}
              </div>
              <ModelSelector mode="chat" />
            </div>
          )}

          <Separator className="bg-gray-100" />

          {/* Core Settings */}
          <div className="space-y-10">
            {/* System Prompt */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-gray-400" />
                <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400">Core Logic (System)</Label>
              </div>
              <Textarea 
                value={params.systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Initialize model directives..."
                className="min-h-[120px] bg-gray-50/50 border-gray-100 rounded-xl text-xs font-medium leading-relaxed resize-none focus:ring-orange-500/20 shadow-inner"
              />
            </div>

            {/* Temperature */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                   <Flame className="w-4 h-4 text-orange-500" />
                   <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400">Creativity Index</Label>
                </div>
                <span className="text-xs font-black bg-orange-50 text-orange-600 px-3 py-1 rounded-full border border-orange-100 shadow-sm">{params.temperature}</span>
              </div>
              <Slider 
                value={[params.temperature]} 
                onValueChange={(v) => setTemperature(v[0])} 
                max={2} 
                step={0.01} 
                className="py-2"
              />
            </div>

            {/* Max Tokens */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                   <Maximize2 className="w-4 h-4 text-blue-500" />
                   <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400">Response Depth</Label>
                </div>
                <span className="text-xs font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100 shadow-sm">{params.maxTokens}</span>
              </div>
              <Slider 
                value={[params.maxTokens]} 
                onValueChange={(v) => setMaxTokens(v[0])} 
                max={8192} 
                step={1} 
                className="py-2"
              />
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-8 border-t border-gray-50 bg-gray-50/20">
        <Button 
          variant="outline" 
          className="w-full h-12 gap-3 rounded-2xl font-black text-xs uppercase tracking-widest border-gray-100 bg-white hover:bg-red-50 hover:text-red-500 hover:border-red-100 shadow-sm transition-all duration-300"
          onClick={clearChat}
        >
          <Trash2 className="w-4 h-4" /> Purge Memory
        </Button>
      </div>
    </motion.div>
  );
};
