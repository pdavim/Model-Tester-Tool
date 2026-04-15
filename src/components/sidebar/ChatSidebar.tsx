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
  Gauge,
  Key,
  Lock,
  Shield,
  Fingerprint,
  Activity,
  Download,
  Upload,
  FileJson,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useChatStore } from '@/store/useChatStore';
import { useConfigStore } from '@/store/useConfigStore';
import { useModelStore } from '@/store/useModelStore';
import { ModelSelector } from '@/components/modals/ModelSelector';
import { ExportService } from '@/utils/export';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const ChatSidebar: React.FC = () => {
  const {
    sidebarOpen,
    presets,
    addPreset,
    deletePreset,
    openRouterKey,
    hfApiKey,
    setOpenRouterKey,
    setHfApiKey
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

  const { models, customModels, hfHubModels } = useModelStore();
  const allModels = [...models, ...customModels, ...hfHubModels];

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const selectedModelId = currentSession?.parameters.selectedModel;
  const selectedModel = allModels.find(m => m.id === selectedModelId);
  
  // Use session parameters or global defaults with absolute fallbacks
  const params = {
    systemPrompt: currentSession?.parameters?.systemPrompt ?? defaultSystemPrompt ?? 'You are a helpful AI assistant.',
    temperature: currentSession?.parameters?.temperature ?? defaultTemperature ?? 0.7,
    topP: currentSession?.parameters?.topP ?? defaultTopP ?? 1,
    maxTokens: currentSession?.parameters?.maxTokens ?? defaultMaxTokens ?? 2048,
    frequencyPenalty: currentSession?.parameters?.frequencyPenalty ?? defaultFreq ?? 0,
    presencePenalty: currentSession?.parameters?.presencePenalty ?? defaultPres ?? 0,
    selectedModel: currentSession?.parameters?.selectedModel ?? '',
    selectedService: currentSession?.parameters?.selectedService ?? 'all'
  };

  const maxTokensLimit = selectedModel?.context_length || 4096;

      toast.success('Preset saved');
    }
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

  const handleExport = (type: 'json' | 'md') => {
    if (!currentSession) {
      toast.error('No active session to export');
      return;
    }
    if (type === 'json') ExportService.exportSessionJson(currentSession);
    else ExportService.exportSessionMarkdown(currentSession);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const session = JSON.parse(event.target?.result as string);
        if (!session.id || !session.messages) throw new Error('Invalid session format');
        
        // Add to store (needs a new action in useChatStore if we want to add externally)
        // For now, let's assume we use the existing createNewSession logic but inject data
        const { sessions } = useChatStore.getState();
        useChatStore.setState({ sessions: [session, ...sessions], currentSessionId: session.id });
        toast.success('Session imported successfully');
      } catch (err) {
        toast.error('Failed to import session: Invalid JSON');
      }
    };
    reader.readAsText(file);
  };

  return (
    <motion.div 
      initial={false}
      animate={{ width: sidebarOpen ? 280 : 0, opacity: sidebarOpen ? 1 : 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="h-full bg-white border-r border-gray-100 overflow-hidden flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20"
    >
      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-gray-50 bg-gradient-to-b from-gray-50/50 to-transparent">
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
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-[11px] font-black uppercase tracking-widest text-gray-400 p-3">Intelligence Presets</DropdownMenuLabel>
                  <DropdownMenuSeparator className="mb-2" />
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
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0 no-scrollbar">
        <div className="p-6 space-y-6">
          
          {/* Model Selection - Targeting Interface */}
          {!comparisonMode && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-orange-500" />
                  <Label className="text-[11px] font-black uppercase tracking-widest text-gray-900">Targeting Interface</Label>
                </div>
                {selectedModelId && (
                  <Badge variant="outline" className="text-[9px] font-bold border-orange-100 text-orange-600 bg-orange-50 uppercase tracking-tighter">
                    {currentSession?.parameters.selectedService || 'HUB'}
                  </Badge>
                )}
              </div>
              <ModelSelector mode="chat" />
            </div>
          )}

          <Separator className="bg-gray-100" />

          <Accordion type="multiple" defaultValue={["security", "logic", "neural"]} className="w-full space-y-8">
            
            {/* Security Core - API KEYS */}
            <AccordionItem value="security" className="border-none">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-orange-500" />
                <Label className="text-[11px] font-black uppercase tracking-widest text-gray-900">Security Core</Label>
              </div>
              <AccordionContent className="space-y-4 pt-2">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase tracking-tight text-gray-400">OpenRouter Key</Label>
                    {openRouterKey ? <Lock className="w-3 h-3 text-green-500" /> : <Fingerprint className="w-3 h-3 text-red-400" />}
                  </div>
                  <Input 
                    type="password"
                    value={openRouterKey}
                    onChange={(e) => setOpenRouterKey(e.target.value)}
                    placeholder="sk-or-v1-..."
                    className="h-10 bg-gray-50/50 border-gray-100 rounded-xl text-xs font-mono shadow-inner focus:ring-orange-500/20"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase tracking-tight text-gray-400">HuggingFace Hub</Label>
                    {hfApiKey ? <Lock className="w-3 h-3 text-green-500" /> : <Fingerprint className="w-3 h-3 text-red-400" />}
                  </div>
                  <Input 
                    type="password"
                    value={hfApiKey}
                    onChange={(e) => setHfApiKey(e.target.value)}
                    placeholder="hf_..."
                    className="h-10 bg-gray-50/50 border-gray-100 rounded-xl text-xs font-mono shadow-inner focus:ring-orange-500/20"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Logical Parameters */}
            <AccordionItem value="logic" className="border-none">
              <div className="flex items-center gap-2 mb-4">
                <Cpu className="w-4 h-4 text-blue-500" />
                <Label className="text-[11px] font-black uppercase tracking-widest text-gray-900">Logical Params</Label>
              </div>
              <AccordionContent className="space-y-8 pt-2">
                {/* Temperature */}
                <div className="space-y-5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Flame className="w-3.5 h-3.5 text-orange-500" />
                      <Label className="text-[10px] font-bold uppercase tracking-tight text-gray-500">Creativity</Label>
                    </div>
                    <span className="text-[10px] font-black bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full border border-orange-100">
                      {typeof params.temperature === 'number' ? params.temperature.toFixed(2) : '0.70'}
                    </span>
                  </div>
                  <Slider 
                    value={[params.temperature]} 
                    onValueChange={(v) => setTemperature(v[0])} 
                    max={2} 
                    step={0.01} 
                    className="py-1"
                  />
                </div>

                {/* Top P */}
                <div className="space-y-5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                      <Label className="text-[10px] font-bold uppercase tracking-tight text-gray-500">Nucleus Sampling</Label>
                    </div>
                    <span className="text-[10px] font-black bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full border border-purple-100">
                      {typeof params.topP === 'number' ? params.topP.toFixed(2) : '1.00'}
                    </span>
                  </div>
                  <Slider 
                    value={[params.topP]} 
                    onValueChange={(v) => setTopP(v[0])} 
                    max={1} 
                    step={0.01} 
                    className="py-1"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Neural Parameters */}
            <AccordionItem value="neural" className="border-none">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-yellow-500" />
                <Label className="text-[11px] font-black uppercase tracking-widest text-gray-900">Neural Response</Label>
              </div>
              <AccordionContent className="space-y-8 pt-2">
                {/* Max Tokens */}
                <div className="space-y-5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Maximize2 className="w-3.5 h-3.5 text-blue-500" />
                      <Label className="text-[10px] font-bold uppercase tracking-tight text-gray-500">Token Horizon</Label>
                    </div>
                    <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">{params.maxTokens}</span>
                  </div>
                  <Slider 
                    value={[params.maxTokens]} 
                    onValueChange={(v) => setMaxTokens(v[0])} 
                    max={maxTokensLimit} 
                    step={1} 
                    className="py-1"
                  />
                  <p className="text-[9px] text-gray-400 font-medium italic">Adjusted to model capacity: {maxTokensLimit} tokens</p>
                </div>

                {/* Penalties */}
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-5">
                    <div className="flex justify-between items-center">
                      <Label className="text-[10px] font-bold uppercase tracking-tight text-gray-500">Freq. Penalty</Label>
                      <span className="text-[9px] font-bold text-gray-400">{params.frequencyPenalty}</span>
                    </div>
                    <Slider 
                      value={[params.frequencyPenalty]} 
                      onValueChange={(v) => setFrequencyPenalty(v[0])} 
                      min={-2}
                      max={2} 
                      step={0.01} 
                      className="py-1"
                    />
                  </div>
                  <div className="space-y-5">
                    <div className="flex justify-between items-center">
                      <Label className="text-[10px] font-bold uppercase tracking-tight text-gray-500">Pres. Penalty</Label>
                      <span className="text-[9px] font-bold text-gray-400">{params.presencePenalty}</span>
                    </div>
                    <Slider 
                      value={[params.presencePenalty]} 
                      onValueChange={(v) => setPresencePenalty(v[0])} 
                      min={-2}
                      max={2} 
                      step={0.01} 
                      className="py-1"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

          </Accordion>

          <Separator className="bg-gray-100" />

          {/* System Logic */}
          <div className="space-y-6">
             <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-500" />
                <Label className="text-[11px] font-black uppercase tracking-widest text-gray-900">Cognitive Directive</Label>
              </div>
              <Textarea 
                value={params.systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Initialize model directives..."
                className="min-h-[140px] bg-gray-50/50 border-gray-100 rounded-2xl text-[11px] font-medium leading-relaxed resize-none focus:ring-orange-500/20 shadow-inner"
              />
          </div>

          <div className="pt-4">
             {/* Comparison Mode Toggle */}
            <div className="relative group overflow-hidden p-6 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-xl shadow-gray-200 text-white">
              <div className="absolute top-0 right-0 p-1 opacity-10 group-hover:opacity-20 transition-opacity">
                <Layers className="w-16 h-16 scale-150 rotate-12" />
              </div>
              <div className="relative flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md">
                    <Zap className="w-4 h-4 text-orange-400" />
                  </div>
                  <Label className="text-xs font-black uppercase tracking-widest leading-none">Multi-Sync</Label>
                </div>
                <Checkbox 
                  checked={comparisonMode} 
                  onCheckedChange={(v) => setComparisonMode(!!v)} 
                  className="h-6 w-6 border-white/20 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500 rounded-lg shadow-inner"
                />
              </div>
              <p className="text-[9px] text-gray-400 font-bold mb-4 opacity-70 leading-relaxed uppercase tracking-tighter">Simultaneous benchmarking. Up to 6 models in one-shot exchange.</p>
              {comparisonMode && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex flex-wrap gap-1.5">
                    {comparisonModels.map(id => (
                      <Badge key={id} variant="secondary" className="bg-white/10 hover:bg-white/20 border-white/5 text-white/90 text-[8px] font-black h-5 px-2 rounded-full transition-colors group/badge">
                        {id.split('/').pop()?.toUpperCase()}
                        <button className="ml-1.5 text-white/30 hover:text-orange-400" onClick={() => setComparisonModels(comparisonModels.filter(m => m !== id))}>×</button>
                      </Badge>
                    ))}
                    {comparisonModels.length === 0 && <span className="text-[9px] text-orange-400 font-black uppercase tracking-widest animate-pulse">Select Contenders</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-6 border-t border-gray-50 bg-gray-50/20 space-y-3">
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="flex-1 h-10 gap-2 rounded-2xl font-black text-[10px] uppercase tracking-widest border-gray-100 bg-white hover:bg-orange-50 hover:text-orange-500 shadow-sm transition-all duration-300"
              >
                <Download className="w-3.5 h-3.5" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40 rounded-xl">
              <DropdownMenuItem onClick={() => handleExport('json')} className="gap-2 cursor-pointer">
                <FileJson className="w-4 h-4" /> JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('md')} className="gap-2 cursor-pointer">
                <FileText className="w-4 h-4" /> Markdown
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant="outline" 
            className="flex-1 h-10 gap-2 rounded-2xl font-black text-[10px] uppercase tracking-widest border-gray-100 bg-white hover:bg-blue-50 hover:text-blue-500 shadow-sm transition-all duration-300"
            onClick={() => document.getElementById('import-session')?.click()}
          >
            <Upload className="w-3.5 h-3.5" /> Import
            <input type="file" id="import-session" className="hidden" accept=".json" onChange={handleImport} />
          </Button>
        </div>

        <Button 
          variant="outline" 
          className="w-full h-10 gap-2 rounded-2xl font-black text-[10px] uppercase tracking-widest border-gray-100 bg-white hover:bg-red-50 hover:text-red-500 hover:border-red-100 shadow-sm transition-all duration-300"
          onClick={clearChat}
        >
          <Trash2 className="w-4 h-4" /> Purge Session
        </Button>
      </div>
    </motion.div>
  );
};

