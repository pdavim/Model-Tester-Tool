import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Settings2, 
  Cpu, 
  Clock, 
  Zap, 
  Trash2, 
  ChevronRight, 
  ChevronLeft,
  Info,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  Search,
  Filter,
  ArrowUpDown,
  ExternalLink,
  Sparkles,
  History,
  Plus,
  Save,
  Star,
  LayoutGrid,
  MoreVertical,
  Pencil,
  Bookmark,
  Settings,
  AlertTriangle,
  FileText,
  Code,
  Eye,
  Wand2,
  Heart,
  Layers,
  Trash,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Toaster, toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  modelId?: string; // For comparison mode
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  responseTime?: number;
  error?: string;
  isLoading?: boolean;
  mediaUrl?: string;
  mediaType?: 'audio' | 'video' | 'image';
}

interface ChatSession {
  id: string;
  name: string;
  messages: Message[];
  parameters: {
    temperature: number;
    topP: number;
    maxTokens: number;
    frequencyPenalty: number;
    presencePenalty: number;
    systemPrompt: string;
    selectedModel: string;
  };
  createdAt: number;
}

interface ParameterPreset {
  id: string;
  name: string;
  parameters: {
    temperature: number;
    topP: number;
    maxTokens: number;
    frequencyPenalty: number;
    presencePenalty: number;
  };
}

interface Model {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  created?: number;
  pipeline_tag?: string;
  architecture?: {
    modality?: string;
    tokenizer?: string;
    instruct_type?: string;
  };
  pricing?: {
    prompt: string;
    completion: string;
    request?: string;
    image?: string;
  };
  top_provider?: {
    max_completion_tokens?: number;
    is_moderated?: boolean;
  };
  isCustom?: boolean;
  provider?: 'openrouter' | 'huggingface';
}

const AudioMessage = ({ url }: { url: string }) => (
  <div className="mt-3 p-4 bg-orange-50/50 rounded-xl border border-orange-100 flex flex-col gap-3">
    <div className="flex items-center gap-2 text-orange-700">
      <Zap className="w-4 h-4" />
      <span className="text-[10px] font-bold uppercase tracking-widest">Audio Generator Output</span>
    </div>
    <audio controls className="w-full h-10 custom-audio-player">
      <source src={url} type="audio/wav" />
      Your browser does not support the audio element.
    </audio>
  </div>
);

const VideoMessage = ({ url }: { url: string }) => (
  <div className="mt-3 rounded-xl overflow-hidden border border-gray-100 shadow-sm flex flex-col bg-black/5">
    <div className="p-3 bg-white border-b border-gray-100 flex items-center gap-2 text-gray-500">
      <Eye className="w-4 h-4" />
      <span className="text-[10px] font-bold uppercase tracking-widest">Video Generator Output</span>
    </div>
    <video controls className="w-full max-h-[400px] bg-black">
      <source src={url} type="video/mp4" />
      Your browser does not support the video element.
    </video>
  </div>
);

const CopyButton = ({ content }: { content: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-gray-400 hover:text-orange-500 transition-colors"
      onClick={handleCopy}
    >
      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
    </Button>
  );
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState('google/gemini-2.0-flash-001');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Parameters
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(1);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [frequencyPenalty, setFrequencyPenalty] = useState(0);
  const [presencePenalty, setPresencePenalty] = useState(0);
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful assistant.');
  const [stream, setStream] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Modal Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFree, setFilterFree] = useState(false);
  const [filterPaid, setFilterPaid] = useState(false);
  const [filterModality, setFilterModality] = useState<string[]>([]);
  const [filterProviders, setFilterProviders] = useState<string[]>([]);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'context'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [openRouterKey, setOpenRouterKey] = useState(() => localStorage.getItem('openrouter_api_key') || '');
  const [hfApiKey, setHfApiKey] = useState(() => localStorage.getItem('hf_api_key') || '');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [customModels, setCustomModels] = useState<Model[]>(() => {
    const saved = localStorage.getItem('custom_models');
    return saved ? JSON.parse(saved) : [];
  });
  const [newCustomModelId, setNewCustomModelId] = useState('');
  const [newCustomModelName, setNewCustomModelName] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);

  // New State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [presets, setPresets] = useState<ParameterPreset[]>([]);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonModels, setComparisonModels] = useState<string[]>([]);
  const [hfHubModels, setHfHubModels] = useState<Model[]>([]);
  const [isSearchingHub, setIsSearchingHub] = useState(false);
  const [selectedService, setSelectedService] = useState<'all' | 'openrouter' | 'huggingface'>('all');

  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentModelInfo = models.find(m => m.id === selectedModel);

  // Load from LocalStorage
  useEffect(() => {
    const savedSessions = localStorage.getItem('or-tester-sessions');
    const savedFavorites = localStorage.getItem('or-tester-favorites');
    const savedPresets = localStorage.getItem('or-tester-presets');

    if (savedSessions) {
      const parsed = JSON.parse(savedSessions);
      setSessions(parsed);
      if (parsed.length > 0) setCurrentSessionId(parsed[0].id);
    } else {
      const initialSession: ChatSession = {
        id: crypto.randomUUID(),
        name: 'New Conversation',
        messages: [],
        parameters: {
          temperature: 0.7,
          topP: 1,
          maxTokens: 2048,
          frequencyPenalty: 0,
          presencePenalty: 0,
          systemPrompt: 'You are a helpful assistant.',
          selectedModel: 'google/gemini-2.0-flash-001'
        },
        createdAt: Date.now()
      };
      setSessions([initialSession]);
      setCurrentSessionId(initialSession.id);
    }

    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
    if (savedPresets) setPresets(JSON.parse(savedPresets));
    fetchModels();
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (sessions.length > 0) localStorage.setItem('or-tester-sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('or-tester-favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('or-tester-presets', JSON.stringify(presets));
  }, [presets]);

  // Sync state with current session
  useEffect(() => {
    const session = sessions.find(s => s.id === currentSessionId);
    if (session) {
      setMessages(session.messages);
      setTemperature(session.parameters.temperature);
      setTopP(session.parameters.topP);
      setMaxTokens(session.parameters.maxTokens);
      setFrequencyPenalty(session.parameters.frequencyPenalty);
      setPresencePenalty(session.parameters.presencePenalty);
      setSystemPrompt(session.parameters.systemPrompt);
      setSelectedModel(session.parameters.selectedModel);
    }
  }, [currentSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      name: `Chat ${sessions.length + 1}`,
      messages: [],
      parameters: {
        temperature,
        topP,
        maxTokens,
        frequencyPenalty,
        presencePenalty,
        systemPrompt,
        selectedModel
      },
      createdAt: Date.now()
    };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newSession.id);
    toast.success('New session created');
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (currentSessionId === id) {
      if (newSessions.length > 0) setCurrentSessionId(newSessions[0].id);
      else setCurrentSessionId(null);
    }
    toast.success('Session deleted');
  };

  const renameSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const session = sessions.find(s => s.id === id);
    if (!session) return;
    const newName = prompt('Enter new session name:', session.name);
    if (newName) {
      setSessions(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s));
      toast.success('Session renamed');
    }
  };

  const updateSession = (updates: Partial<ChatSession>) => {
    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, ...updates } : s));
  };

  const updateSessionParams = (paramUpdates: Partial<ChatSession['parameters']>) => {
    setSessions(prev => prev.map(s => s.id === currentSessionId ? { 
      ...s, 
      parameters: { ...s.parameters, ...paramUpdates } 
    } : s));
  };

  // Sync parameters to current session when they change
  useEffect(() => {
    if (currentSessionId && !isLoading) {
      const session = sessions.find(s => s.id === currentSessionId);
      if (session) {
        const hasChanged = 
          session.parameters.temperature !== temperature ||
          session.parameters.topP !== topP ||
          session.parameters.maxTokens !== maxTokens ||
          session.parameters.frequencyPenalty !== frequencyPenalty ||
          session.parameters.presencePenalty !== presencePenalty ||
          session.parameters.systemPrompt !== systemPrompt ||
          session.parameters.selectedModel !== selectedModel;

        if (hasChanged) {
          updateSessionParams({
            temperature,
            topP,
            maxTokens,
            frequencyPenalty,
            presencePenalty,
            systemPrompt,
            selectedModel
          });
        }
      }
    }
  }, [temperature, topP, maxTokens, frequencyPenalty, presencePenalty, systemPrompt, selectedModel, currentSessionId]);

  const savePreset = () => {
    const name = prompt('Enter preset name:', 'My Preset');
    if (!name) return;
    const newPreset: ParameterPreset = {
      id: crypto.randomUUID(),
      name,
      parameters: { temperature, topP, maxTokens, frequencyPenalty, presencePenalty }
    };
    setPresets([...presets, newPreset]);
    toast.success('Preset saved');
  };

  const deletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPresets(prev => prev.filter(p => p.id !== id));
    toast.success('Preset deleted');
  };

  const loadPreset = (preset: ParameterPreset) => {
    setTemperature(preset.parameters.temperature);
    setTopP(preset.parameters.topP);
    setMaxTokens(preset.parameters.maxTokens);
    setFrequencyPenalty(preset.parameters.frequencyPenalty);
    setPresencePenalty(preset.parameters.presencePenalty);
    updateSessionParams(preset.parameters);
    toast.success(`Loaded preset: ${preset.name}`);
  };

  const toggleFavorite = (modelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (favorites.includes(modelId)) {
      setFavorites(favorites.filter(id => id !== modelId));
      toast.success('Removed from favorites');
    } else {
      setFavorites([...favorites, modelId]);
      toast.success('Added to favorites');
    }
  };

  useEffect(() => {
    localStorage.setItem('openrouter_api_key', openRouterKey);
  }, [openRouterKey]);

  useEffect(() => {
    localStorage.setItem('hf_api_key', hfApiKey);
  }, [hfApiKey]);

  useEffect(() => {
    localStorage.setItem('custom_models', JSON.stringify(customModels));
  }, [customModels]);

  const addCustomModel = () => {
    if (!newCustomModelId.trim()) return;

    // Validation: provider/model-name
    const hfModelIdRegex = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;
    if (!hfModelIdRegex.test(newCustomModelId.trim())) {
      toast.error('Invalid Model ID format. Use "provider/model-name" (e.g., meta-llama/Llama-2-7b-hf)');
      return;
    }

    const newModel: Model = {
      id: newCustomModelId.trim(),
      name: newCustomModelName.trim() || newCustomModelId.trim().split('/').pop() || newCustomModelId,
      description: 'Custom Hugging Face Model',
      architecture: { modality: 'text' },
      isCustom: true,
      created: Date.now() / 1000 // OpenRouter uses seconds
    };
    setCustomModels([...customModels, newModel]);
    setNewCustomModelId('');
    setNewCustomModelName('');
    setIsAddingCustom(false);
    toast.success('Custom model added');
  };

  const deleteCustomModel = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomModels(prev => prev.filter(m => m.id !== id));
    toast.success('Custom model removed');
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterFree(false);
    setFilterPaid(false);
    setFilterModality([]);
    setFilterProviders([]);
    setFilterTags([]);
    setFilterFavorites(false);
    toast.success('All filters cleared');
  };

  const allModels = [...models, ...customModels];
  const allAvailableModels = Array.from(new Map([...allModels, ...hfHubModels].map(m => [m.id, m])).values());

  const filteredModels = allAvailableModels
    .filter(model => {
      const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            model.id.toLowerCase().includes(searchQuery.toLowerCase());
      const isFree = model.isCustom || (model.pricing?.prompt === "0" && model.pricing?.completion === "0");
      const matchesFree = !filterFree || isFree;
      const matchesPaid = !filterPaid || !isFree;
      const matchesModality = filterModality.length === 0 || 
                              (model.architecture?.modality && filterModality.includes(model.architecture.modality));
      const matchesFavorites = !filterFavorites || favorites.includes(model.id);
      
      const service = model.provider || (model.isCustom ? 'huggingface' : 'openrouter');
      const matchesService = selectedService === 'all' || service === selectedService;
      
      const provider = model.id.includes('/') ? model.id.split('/')[0] : 'unknown';
      const matchesProvider = filterProviders.length === 0 || filterProviders.includes(provider);
      
      const matchesTags = filterTags.length === 0 || (model.pipeline_tag && filterTags.includes(model.pipeline_tag));

      return matchesSearch && matchesFree && matchesPaid && matchesModality && matchesFavorites && matchesService && matchesProvider && matchesTags;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'created') {
        comparison = (a.created || 0) - (b.created || 0);
      } else if (sortBy === 'context') {
        comparison = (a.context_length || 0) - (b.context_length || 0);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  
  useEffect(() => {
    setFilterProviders([]);
  }, [selectedService]);

  const modalities = Array.from(new Set(allModels.map(m => m.architecture?.modality).filter(Boolean))) as string[];
  
  const providersList = Array.from(new Set(
    allModels
      .filter(m => {
        const service = m.provider || (m.isCustom ? 'huggingface' : 'openrouter');
        return selectedService === 'all' || service === selectedService;
      })
      .map(m => m.id.includes('/') ? m.id.split('/')[0] : 'unknown')
      .filter(Boolean)
  )).sort() as string[];

  const pipelineTagsList = Array.from(new Set(allModels.map(m => m.pipeline_tag).filter(Boolean))) as string[];

  useEffect(() => {
    fetchModels();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchModels = async () => {
    try {
      // Fetch OpenRouter models
      const orResponse = await fetch('/api/models');
      const orData = await orResponse.json();
      const orModels = (orData.data || []).map((m: any) => ({ ...m, provider: 'openrouter' }));

      // Fetch Hugging Face models
      let hfModels: Model[] = [];
      try {
        const hfResponse = await fetch('/api/hf/models');
        if (hfResponse.ok) {
          hfModels = await hfResponse.json();
        }
      } catch (e) {
        console.error('Error fetching HF models:', e);
      }

      setModels([...orModels, ...hfModels]);
    } catch (error) {
      console.error('Error fetching models:', error);
      toast.error('Failed to fetch models');
    }
  };

  const searchHFModels = async (query: string) => {
    if (!query.trim() || query.length < 3) {
      setHfHubModels([]);
      return;
    }
    
    setIsSearchingHub(true);
    try {
      const response = await fetch(`/api/hf/models?search=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setHfHubModels(data);
      }
    } catch (e) {
      console.error('Error searching HF Hub:', e);
    } finally {
      setIsSearchingHub(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchHFModels(searchQuery);
      } else {
        setHfHubModels([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    const modelsToTest = comparisonMode && comparisonModels.length > 0 ? comparisonModels : [selectedModel];
    const startTime = Date.now();

    try {
      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...newMessages.map(m => ({ role: m.role, content: m.content }))
      ];

      const promises = modelsToTest.map(async (modelId) => {
        const modelInfo = allAvailableModels.find(m => m.id === modelId);
        const isHF = modelInfo?.provider === 'huggingface' || customModels.some(m => m.id === modelId);
        const pipeline = modelInfo?.pipeline_tag || '';
        
        // Decide whether to use chat endpoint or generic inference
        // conversational and text-generation (chat-like) use the v1/chat endpoint
        const isChatModel = !pipeline || pipeline === 'conversational' || pipeline === 'text-generation';
        const endpoint = isHF ? (isChatModel ? '/api/hf/chat' : '/api/hf/inference') : '/api/chat';
        
        const payload = isChatModel ? {
            model: modelId,
            messages: apiMessages,
            temperature,
            top_p: topP,
            max_tokens: maxTokens,
            frequency_penalty: frequencyPenalty,
            presence_penalty: presencePenalty,
            stream: stream,
            openRouterKey: isHF ? undefined : openRouterKey,
            hfApiKey: isHF ? hfApiKey : undefined
          } : {
            model: modelId,
            inputs: input, // For non-chat, we just send the last input
            hfApiKey,
            parameters: {
              temperature,
              top_p: topP,
              max_new_tokens: maxTokens
            }
          };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage: Message = {
            role: 'assistant',
            content: errorData.error?.message || `Failed to send message to ${modelId}`,
            modelId,
            error: 'true'
          };
          setMessages(prev => [...prev, errorMessage]);
          return;
        }

        const contentType = response.headers.get('content-type');
        
        // Handle Media Responses
        if (contentType && (contentType.includes('audio') || contentType.includes('video') || contentType.includes('image'))) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const type = contentType.includes('audio') ? 'audio' : contentType.includes('video') ? 'video' : 'image';
          
          const mediaMessage: Message = {
            role: 'assistant',
            content: `Generated ${type}`,
            modelId,
            mediaUrl: url,
            mediaType: type as any,
            responseTime: Date.now() - startTime
          };
          setMessages(prev => [...prev, mediaMessage]);
          return;
        }

        // Handle Chat/Text Responses
        if (stream && isChatModel) {
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let assistantContent = '';
          
          const assistantMessage: Message = {
            role: 'assistant',
            content: '',
            modelId,
            isLoading: true
          };
          
          setMessages(prev => [...prev, assistantMessage]);

          while (reader) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
              const message = line.replace(/^data: /, '');
              if (message === '[DONE]') break;

              try {
                const parsed = JSON.parse(message);
                const content = parsed.choices[0]?.delta?.content || '';
                assistantContent += content;
                
                setMessages(prev => {
                  const updated = [...prev];
                  const idx = updated.findLastIndex(m => m.role === 'assistant' && m.modelId === modelId && m.isLoading);
                  if (idx !== -1) {
                    updated[idx] = {
                      ...updated[idx],
                      content: assistantContent,
                      usage: parsed.usage || updated[idx].usage,
                    };
                  }
                  return updated;
                });
              } catch (e) {
                // Ignore parse errors for partial chunks
              }
            }
          }
          
          const endTime = Date.now();
          setMessages(prev => {
            const updated = [...prev];
            const idx = updated.findLastIndex(m => m.role === 'assistant' && m.modelId === modelId && m.isLoading);
            if (idx !== -1) {
              updated[idx] = {
                ...updated[idx],
                isLoading: false,
                responseTime: endTime - startTime,
              };
            }
            return updated;
          });

        } else {
          const data = await response.json();
          const endTime = Date.now();

          if (data.error) {
            const errorMessage: Message = {
              role: 'assistant',
              content: data.error.message || 'An error occurred',
              modelId,
              error: 'true'
            };
            setMessages(prev => [...prev, errorMessage]);
            return;
          }

          // Handle OpenAI format vs raw HF format
          let content = '';
          if (data.choices && data.choices[0]?.message) {
            content = data.choices[0].message.content;
          } else if (Array.isArray(data) && data[0]?.generated_text) {
            content = data[0].generated_text;
          } else if (data.generated_text) {
            content = data.generated_text;
          } else {
            content = JSON.stringify(data, null, 2);
          }

          const assistantMessage: Message = {
            role: 'assistant',
            content,
            modelId,
            usage: data.usage,
            responseTime: endTime - startTime,
          };

          setMessages(prev => [...prev, assistantMessage]);
        }
      });

      await Promise.all(promises);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast.success('Chat cleared');
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-orange-100" style={{ transform: 'scale(0.7)', transformOrigin: 'top left', width: '142.85%', height: '142.85%' }}>
      <Toaster position="top-center" />
      
      {/* Sidebar - Parameters */}
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
            <Tooltip>
              <TooltipTrigger render={
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsSettingsOpen(true)}>
                  <Settings className="w-4 h-4 text-gray-500" />
                </Button>
              } />
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={savePreset}>
                  <Save className="w-4 h-4 text-gray-500" />
                </Button>
              } />
              <TooltipContent>Save Preset</TooltipContent>
            </Tooltip>
            {presets.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger render={
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Bookmark className="w-4 h-4 text-gray-500" />
                  </Button>
                } />
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Presets</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {presets.map(preset => (
                    <DropdownMenuItem key={preset.id} onClick={() => loadPreset(preset)} className="justify-between group">
                      <span className="truncate">{preset.name}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                        onClick={(e) => deletePreset(preset.id, e)}
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
                <Checkbox 
                  checked={comparisonMode} 
                  onCheckedChange={(checked) => setComparisonMode(!!checked)} 
                />
              </div>
              <p className="text-[10px] text-orange-700 leading-relaxed">
                Test up to 6 models simultaneously with the same prompt.
              </p>
              {comparisonMode && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-orange-400">Selected Models ({comparisonModels.length}/6)</Label>
                  <div className="flex flex-wrap gap-1">
                    {comparisonModels.map(id => (
                      <Badge key={id} variant="secondary" className="bg-white text-[10px] py-0 h-5">
                        {id.split('/').pop()}
                        <button 
                          className="ml-1 hover:text-red-500" 
                          onClick={() => setComparisonModels(prev => prev.filter(m => m !== id))}
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                    {comparisonModels.length === 0 && (
                      <span className="text-[10px] text-orange-400 italic">No models selected</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* System Prompt */}
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">System Prompt</Label>
              <Textarea 
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Enter system instructions..."
                className="min-h-[80px] bg-gray-50 border-gray-200 focus:ring-orange-500 text-xs resize-none"
              />
            </div>

            {/* Model Selection */}
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Model</Label>
              
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger render={
                  <Button variant="outline" className="w-full justify-between bg-gray-50 border-gray-200 hover:bg-gray-100 h-10 px-3">
                    <span className="truncate max-w-[200px]">{currentModelInfo?.name || selectedModel}</span>
                    <Sparkles className="w-4 h-4 text-orange-500 shrink-0" />
                  </Button>
                } />
                <DialogContent className="w-[80vw] max-w-[80vw] h-[80vh] flex flex-col p-0 overflow-hidden sm:max-w-[80vw]">
                  <DialogHeader className="p-6 border-b border-gray-100">
                    <div className="flex justify-between items-center">
                      <div>
                        <DialogTitle className="text-2xl font-bold tracking-tight">Select Model</DialogTitle>
                        <DialogDescription>
                          Browse and filter through {allModels.length} available models.
                        </DialogDescription>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setIsAddingCustom(!isAddingCustom)}
                        className={cn("gap-2", isAddingCustom && "bg-orange-50 border-orange-200 text-orange-600")}
                      >
                        <Plus className="w-4 h-4" />
                        Add Custom HF Model
                      </Button>
                    </div>
                  </DialogHeader>
                  
                  <div className="px-6 py-2 bg-gray-50/50 border-b border-gray-100 flex gap-4">
                    <div className="flex bg-white border border-gray-200 p-1 rounded-lg">
                      <Button 
                        variant={selectedService === 'all' ? 'default' : 'ghost'} 
                        size="sm" 
                        onClick={() => setSelectedService('all')}
                        className={cn("h-8 px-4 text-[11px] font-bold uppercase", selectedService === 'all' && "bg-orange-500 hover:bg-orange-600")}
                      >
                        All Models
                      </Button>
                      <Button 
                        variant={selectedService === 'openrouter' ? 'default' : 'ghost'} 
                        size="sm" 
                        onClick={() => setSelectedService('openrouter')}
                        className={cn("h-8 px-4 text-[11px] font-bold uppercase", selectedService === 'openrouter' && "bg-orange-500 hover:bg-orange-600")}
                      >
                        OpenRouter
                      </Button>
                      <Button 
                        variant={selectedService === 'huggingface' ? 'default' : 'ghost'} 
                        size="sm" 
                        onClick={() => setSelectedService('huggingface')}
                        className={cn("h-8 px-4 text-[11px] font-bold uppercase", selectedService === 'huggingface' && "bg-orange-500 hover:bg-orange-600")}
                      >
                        Hugging Face
                      </Button>
                    </div>
                  </div>

                  {isAddingCustom && (
                    <div className="p-4 bg-orange-50 border-b border-orange-100 flex gap-4 items-end animate-in slide-in-from-top duration-200">
                      <div className="flex-1 space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-orange-600">Model ID (e.g. meta-llama/Llama-2-7b-hf)</Label>
                        <Input 
                          value={newCustomModelId}
                          onChange={(e) => setNewCustomModelId(e.target.value)}
                          placeholder="provider/model-name"
                          className="h-9 bg-white border-orange-200"
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-orange-600">Friendly Name (Optional)</Label>
                        <Input 
                          value={newCustomModelName}
                          onChange={(e) => setNewCustomModelName(e.target.value)}
                          placeholder="My Model"
                          className="h-9 bg-white border-orange-200"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setIsAddingCustom(false)}>Cancel</Button>
                        <Button size="sm" onClick={addCustomModel} className="bg-orange-500 hover:bg-orange-600">Add Model</Button>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-1 overflow-hidden">
                    {/* Filters Sidebar in Modal */}
                    <ScrollArea className="w-64 border-r border-gray-100 bg-gray-50/50">
                      <div className="p-6 space-y-8">
                        <div className="space-y-4">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Search</Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input 
                              placeholder="Search models..." 
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-9 bg-white border-gray-200 focus:ring-orange-500"
                            />
                            {isSearchingHub && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <RefreshCw className="w-3 h-3 text-orange-500 animate-spin" />
                              </div>
                            )}
                          </div>
                          {isSearchingHub && <p className="text-[10px] text-orange-500 animate-pulse font-medium">Searching Hugging Face Hub...</p>}
                        </div>

                        <div className="space-y-4">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Sort By</Label>
                          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                            <SelectTrigger className="bg-white border-gray-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="name">Name</SelectItem>
                              <SelectItem value="created">Newest</SelectItem>
                              <SelectItem value="context">Context Size</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <div className="flex gap-2">
                            <Button 
                              variant={sortOrder === 'asc' ? 'default' : 'outline'} 
                              size="sm" 
                              className={cn("flex-1 h-8 text-[10px] font-bold uppercase", sortOrder === 'asc' && "bg-orange-500")}
                              onClick={() => setSortOrder('asc')}
                            >
                              Asc
                            </Button>
                            <Button 
                              variant={sortOrder === 'desc' ? 'default' : 'outline'} 
                              size="sm" 
                              className={cn("flex-1 h-8 text-[10px] font-bold uppercase", sortOrder === 'desc' && "bg-orange-500")}
                              onClick={() => setSortOrder('desc')}
                            >
                              Desc
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Pricing</Label>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="free-models" 
                                checked={filterFree} 
                                onCheckedChange={(checked) => setFilterFree(!!checked)}
                              />
                              <label htmlFor="free-models" className="text-sm font-medium leading-none">
                                Free Models
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="paid-models" 
                                checked={filterPaid} 
                                onCheckedChange={(checked) => setFilterPaid(!!checked)}
                              />
                              <label htmlFor="paid-models" className="text-sm font-medium leading-none">
                                Paid Models
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="favorite-models" 
                                checked={filterFavorites} 
                                onCheckedChange={(checked) => setFilterFavorites(!!checked)}
                              />
                              <label htmlFor="favorite-models" className="text-sm font-medium leading-none">
                                Favorites Only
                              </label>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Modality</Label>
                          <div className="space-y-2">
                            {modalities.map(mod => (
                              <div key={mod} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={`mod-${mod}`} 
                                  checked={filterModality.includes(mod)}
                                  onCheckedChange={(checked) => {
                                    if (checked) setFilterModality([...filterModality, mod]);
                                    else setFilterModality(filterModality.filter(m => m !== mod));
                                  }}
                                />
                                <label htmlFor={`mod-${mod}`} className="text-sm font-medium leading-none capitalize">
                                  {mod}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Task Types</Label>
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-thin">
                            {pipelineTagsList.map(tag => (
                              <div key={tag} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={`tag-${tag}`} 
                                  checked={filterTags.includes(tag)}
                                  onCheckedChange={(checked) => {
                                    if (checked) setFilterTags([...filterTags, tag]);
                                    else setFilterTags(filterTags.filter(t => t !== tag));
                                  }}
                                />
                                <label htmlFor={`tag-${tag}`} className="text-sm font-medium leading-none capitalize">
                                  {tag.replace(/-/g, ' ')}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Providers</Label>
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-thin">
                            {providersList.map(prov => (
                              <div key={prov} className="flex items-center space-x-2">
                                <Checkbox 
                                  id={`prov-${prov}`} 
                                  checked={filterProviders.includes(prov)}
                                  onCheckedChange={(checked) => {
                                    if (checked) setFilterProviders([...filterProviders, prov]);
                                    else setFilterProviders(filterProviders.filter(p => p !== prov));
                                  }}
                                />
                                <label htmlFor={`prov-${prov}`} className="text-sm font-medium leading-none capitalize">
                                  {prov}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full gap-2 text-xs text-gray-500 hover:text-orange-500 hover:border-orange-200"
                          onClick={clearFilters}
                        >
                          <RefreshCw className="w-3 h-3" />
                          Clear All Filters
                        </Button>
                      </div>
                    </ScrollArea>

                    {/* Models List */}
                    <ScrollArea className="flex-1">
                      <div className="p-6 grid grid-cols-1 gap-4">
                        {filteredModels.length > 0 ? (
                          filteredModels.map((model) => (
                            <div
                              key={model.id}
                              className={cn(
                                "group relative flex flex-col items-start p-4 rounded-xl border text-left transition-all hover:shadow-md",
                                selectedModel === model.id 
                                  ? "border-orange-500 bg-orange-50/50 ring-1 ring-orange-500" 
                                  : comparisonMode && comparisonModels.includes(model.id)
                                    ? "border-blue-500 bg-blue-50/30 ring-1 ring-blue-500"
                                    : "border-gray-100 bg-white hover:border-orange-200"
                              )}
                            >
                              <div className="flex justify-between items-start w-full mb-2">
                                <div className="flex items-center gap-2">
                                  <button 
                                    type="button"
                                    onClick={(e) => toggleFavorite(model.id, e)}
                                    className="hover:scale-110 transition-transform"
                                  >
                                    <Star className={cn("w-4 h-4", favorites.includes(model.id) ? "fill-yellow-400 text-yellow-400" : "text-gray-300")} />
                                  </button>
                                  <h4 className="font-bold text-sm">{model.name}</h4>
                                  {model.isCustom && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none text-[9px]">Custom HF</Badge>}
                                </div>
                                <div className="flex gap-2 items-center">
                                  {hfHubModels.some(hm => hm.id === model.id) && !customModels.some(cm => cm.id === model.id) && (
                                    <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none text-[9px]">HF Hub</Badge>
                                  )}
                                  <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-none text-[9px] font-bold uppercase tracking-wider">
                                    {model.provider === 'huggingface' ? 'HuggingFace' : 'OpenRouter'}
                                  </Badge>
                                  {model.isCustom && (
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6 text-gray-400 hover:text-red-500"
                                      onClick={(e) => deleteCustomModel(model.id, e)}
                                    >
                                      <Trash className="w-3 h-3" />
                                    </Button>
                                  )}
                                  {comparisonMode && (
                                    <Checkbox 
                                      checked={comparisonModels.includes(model.id)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          if (comparisonModels.length < 6) setComparisonModels([...comparisonModels, model.id]);
                                          else toast.error('Max 6 models for comparison');
                                        } else {
                                          setComparisonModels(comparisonModels.filter(m => m !== model.id));
                                        }
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  )}
                                  {model.pricing?.prompt === "0" && (
                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none text-[10px]">FREE</Badge>
                                  )}
                                  <Badge variant="outline" className={cn(
                                    "text-[10px] uppercase",
                                    model.architecture?.modality === 'audio' ? "bg-blue-50 text-blue-600 border-blue-100" :
                                    model.architecture?.modality === 'video' ? "bg-purple-50 text-purple-600 border-purple-100" :
                                    model.architecture?.modality === 'image' ? "bg-green-50 text-green-600 border-green-100" :
                                    "text-gray-400 border-gray-100"
                                  )}>
                                    {model.architecture?.modality || 'text'}
                                  </Badge>
                                </div>
                              </div>
                              <div 
                                className="w-full text-left cursor-pointer"
                                onClick={() => {
                                  setSelectedModel(model.id);
                                  setIsModalOpen(false);
                                }}
                              >
                                <p className="text-xs text-gray-500 line-clamp-2 mb-3 h-8">
                                  {model.description || "No description available."}
                                </p>
                                <div className="flex items-center gap-4 w-full text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                  <div className="flex items-center gap-1">
                                    <Zap className="w-3 h-3" />
                                    {(model.context_length || 0).toLocaleString()} Context
                                  </div>
                                  {model.pricing && model.pricing.prompt !== "0" && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      ${(parseFloat(model.pricing.prompt) * 1000000).toFixed(2)} / 1M
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <Accordion type="single" collapsible className="w-full mt-2">
                                <AccordionItem value="details" className="border-none">
                                  <AccordionTrigger className="py-1 text-[10px] font-bold uppercase text-gray-400 hover:no-underline">
                                    Detailed Information
                                  </AccordionTrigger>
                                  <AccordionContent className="text-[10px] text-gray-500 space-y-2 pt-2">
                                    <div className="mb-2 p-1.5 bg-gray-50 rounded font-mono text-[9px] break-all border border-gray-100">
                                      {model.id}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="space-y-1">
                                        <p className="font-bold uppercase text-gray-400">Pricing (1M Tokens)</p>
                                        <p>Prompt: ${(parseFloat(model.pricing?.prompt || "0") * 1000000).toFixed(2)}</p>
                                        <p>Completion: ${(parseFloat(model.pricing?.completion || "0") * 1000000).toFixed(2)}</p>
                                      </div>
                                      <div className="space-y-1">
                                        <p className="font-bold uppercase text-gray-400">Architecture</p>
                                        <p>Modality: {model.architecture?.modality || 'N/A'}</p>
                                        <p>Tokenizer: {model.architecture?.tokenizer || 'N/A'}</p>
                                      </div>
                                    </div>
                                    {model.top_provider && (
                                      <div className="pt-2 border-t border-gray-100">
                                        <p className="font-bold uppercase text-gray-400">Top Provider Features</p>
                                        <p>Max Completion: {model.top_provider.max_completion_tokens?.toLocaleString() || 'N/A'}</p>
                                        <p>Moderated: {model.top_provider.is_moderated ? 'Yes' : 'No'}</p>
                                      </div>
                                    )}
                                  </AccordionContent>
                                </AccordionItem>
                              </Accordion>
                            </div>
                          ))
                        ) : (
                          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                            <p className="font-medium">No models found matching your filters.</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </DialogContent>
              </Dialog>
              
              {currentModelInfo && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-2"
                >
                  <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider">
                    <span className="text-gray-400">Context</span>
                    <span className="text-gray-600">{(currentModelInfo.context_length || 0).toLocaleString()} tokens</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider">
                    <span className="text-gray-400">Modality</span>
                    <span className="text-gray-600 capitalize">{currentModelInfo.architecture?.modality || 'text'}</span>
                  </div>
                  {currentModelInfo.top_provider?.max_completion_tokens && (
                    <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider">
                      <span className="text-gray-400">Max Output</span>
                      <span className="text-gray-600">{(currentModelInfo.top_provider.max_completion_tokens).toLocaleString()} tokens</span>
                    </div>
                  )}
                  {currentModelInfo.pricing && (
                    <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider">
                      <span className="text-gray-400">Pricing</span>
                      <span className="text-gray-600">
                        ${(parseFloat(currentModelInfo.pricing.prompt) * 1000000).toFixed(2)} / 1M
                      </span>
                    </div>
                  )}
                  {currentModelInfo.description && (
                    <div className="pt-2 border-t border-gray-100 mt-2">
                      <p className="text-[10px] text-gray-400 leading-relaxed line-clamp-3">
                        {currentModelInfo.description}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            <Separator className="bg-gray-100" />

            {/* Streaming Toggle */}
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-widest text-gray-500">Streaming</Label>
              <Button 
                variant={stream ? "default" : "outline"} 
                size="sm" 
                onClick={() => setStream(!stream)}
                className={cn("h-7 px-3 text-[10px] font-bold uppercase tracking-widest", stream && "bg-orange-500 hover:bg-orange-600")}
              >
                {stream ? "Enabled" : "Disabled"}
              </Button>
            </div>

            {/* Temperature */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Tooltip>
                  <TooltipTrigger render={
                    <Label className="text-xs font-bold uppercase tracking-widest text-gray-500 cursor-help flex items-center gap-1">
                      Temperature <Info className="w-3 h-3" />
                    </Label>
                  } />
                  <TooltipContent className="max-w-[200px] text-[10px]">
                    Controls randomness: Lower is more focused and deterministic, higher is more creative and varied.
                  </TooltipContent>
                </Tooltip>
                <Badge variant="secondary" className="bg-orange-50 text-orange-700 font-mono">{temperature}</Badge>
              </div>
              <Slider 
                value={[temperature]} 
                onValueChange={(v) => setTemperature(v[0])} 
                max={2} 
                step={0.01}
                className="[&_[role=slider]]:bg-orange-500"
              />
              <p className="text-[10px] text-gray-400 italic">Higher values make output more random, lower more deterministic.</p>
            </div>

            {/* Top P */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Tooltip>
                  <TooltipTrigger render={
                    <Label className="text-xs font-bold uppercase tracking-widest text-gray-500 cursor-help flex items-center gap-1">
                      Top P <Info className="w-3 h-3" />
                    </Label>
                  } />
                  <TooltipContent className="max-w-[200px] text-[10px]">
                    Nucleus sampling: The model considers the results of the tokens with top_p probability mass.
                  </TooltipContent>
                </Tooltip>
                <Badge variant="secondary" className="bg-orange-50 text-orange-700 font-mono">{topP}</Badge>
              </div>
              <Slider 
                value={[topP]} 
                onValueChange={(v) => setTopP(v[0])} 
                max={1} 
                step={0.01}
                className="[&_[role=slider]]:bg-orange-500"
              />
            </div>

            {/* Max Tokens */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Tooltip>
                  <TooltipTrigger render={
                    <Label className="text-xs font-bold uppercase tracking-widest text-gray-500 cursor-help flex items-center gap-1">
                      Max Tokens <Info className="w-3 h-3" />
                    </Label>
                  } />
                  <TooltipContent className="max-w-[200px] text-[10px]">
                    The maximum number of tokens to generate in the completion.
                  </TooltipContent>
                </Tooltip>
                <Badge variant="secondary" className="bg-orange-50 text-orange-700 font-mono">{maxTokens}</Badge>
              </div>
              <Slider 
                value={[maxTokens]} 
                onValueChange={(v) => setMaxTokens(v[0])} 
                max={8192} 
                step={1}
                className="[&_[role=slider]]:bg-orange-500"
              />
            </div>

            {/* Penalties */}
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Tooltip>
                    <TooltipTrigger render={
                      <Label className="text-xs font-bold uppercase tracking-widest text-gray-500 cursor-help flex items-center gap-1">
                        Freq. Penalty <Info className="w-3 h-3" />
                      </Label>
                    } />
                    <TooltipContent className="max-w-[200px] text-[10px]">
                      Positive values penalize new tokens based on their existing frequency in the text so far.
                    </TooltipContent>
                  </Tooltip>
                  <Badge variant="secondary" className="bg-orange-50 text-orange-700 font-mono">{frequencyPenalty}</Badge>
                </div>
                <Slider 
                  value={[frequencyPenalty]} 
                  onValueChange={(v) => setFrequencyPenalty(v[0])} 
                  min={-2}
                  max={2} 
                  step={0.01}
                  className="[&_[role=slider]]:bg-orange-500"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Tooltip>
                    <TooltipTrigger render={
                      <Label className="text-xs font-bold uppercase tracking-widest text-gray-500 cursor-help flex items-center gap-1">
                        Pres. Penalty <Info className="w-3 h-3" />
                      </Label>
                    } />
                    <TooltipContent className="max-w-[200px] text-[10px]">
                      Positive values penalize new tokens based on whether they appear in the text so far.
                    </TooltipContent>
                  </Tooltip>
                  <Badge variant="secondary" className="bg-orange-50 text-orange-700 font-mono">{presencePenalty}</Badge>
                </div>
                <Slider 
                  value={[presencePenalty]} 
                  onValueChange={(v) => setPresencePenalty(v[0])} 
                  min={-2}
                  max={2} 
                  step={0.01}
                  className="[&_[role=slider]]:bg-orange-500"
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="p-6 border-t border-gray-100">
          <Button 
            variant="outline" 
            className="w-full gap-2 text-gray-500 hover:text-red-500 hover:bg-red-50 border-gray-200"
            onClick={clearChat}
          >
            <Trash2 className="w-4 h-4" />
            Clear Conversation
          </Button>
        </div>
      </motion.div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-400 hover:text-orange-500"
            >
              {sidebarOpen ? <ChevronLeft /> : <ChevronRight />}
            </Button>
            
            <Sheet>
              <SheetTrigger render={
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-orange-500">
                  <History className="w-5 h-5" />
                </Button>
              } />
              <SheetContent side="left" className="w-80 p-0 flex flex-col">
                <SheetHeader className="p-6 border-b">
                  <div className="flex items-center justify-between">
                    <SheetTitle>Chat History</SheetTitle>
                    <Button size="icon" variant="ghost" onClick={createNewSession}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </SheetHeader>
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-2">
                    {sessions.map(session => (
                      <div
                        key={session.id}
                        onClick={() => setCurrentSessionId(session.id)}
                        className={cn(
                          "group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all",
                          currentSessionId === session.id 
                            ? "bg-orange-50 text-orange-700 border border-orange-100" 
                            : "hover:bg-gray-50 text-gray-600 border border-transparent"
                        )}
                      >
                        <div className="flex items-center gap-3 truncate">
                          <History className="w-4 h-4 shrink-0" />
                          <span className="truncate text-sm font-medium">{session.name}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 hover:text-orange-500"
                            onClick={(e) => renameSession(session.id, e)}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 hover:text-red-500"
                            onClick={(e) => deleteSession(session.id, e)}
                          >
                            <Trash className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>

            <div className="flex flex-col">
              <h1 className="font-bold text-sm tracking-tight text-gray-900">Model Tester Tool</h1>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">
                  {sessions.find(s => s.id === currentSessionId)?.name || 'New Conversation'}
                  {comparisonMode && <span className="text-orange-500 ml-2">• Comparison Mode Active ({comparisonModels.length} models)</span>}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={fetchModels} className="text-gray-400 hover:text-orange-500 gap-2">
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              <span className="text-xs font-medium">Sync Models</span>
            </Button>
          </div>
        </header>

        {/* Messages */}
        <ScrollArea className="flex-1 bg-[#F8F9FA]" ref={scrollRef}>
          <div className="max-w-4xl mx-auto p-8 space-y-8">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
                  <Cpu className="w-10 h-10 text-orange-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold tracking-tight">Ready to test?</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    Select a model from the sidebar, adjust your parameters, and start a conversation to see performance metrics.
                  </p>
                </div>
              </div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex flex-col gap-3 group",
                    msg.role === 'user' ? "items-end" : "items-start"
                  )}
                >
                  <div className="flex items-start gap-2 max-w-[85%]">
                    <div className={cn(
                      "p-5 rounded-2xl shadow-sm text-sm leading-relaxed flex-1 max-h-[600px] overflow-y-auto",
                      msg.role === 'user' 
                        ? "bg-orange-500 text-white rounded-tr-none" 
                        : "bg-white text-gray-800 border border-gray-100 rounded-tl-none"
                    )}>
                      {msg.modelId && (
                        <div className="mb-2 flex items-center gap-2">
                          <Badge variant="outline" className={cn(
                            "text-[10px] font-mono",
                            msg.role === 'user' ? "text-white border-white/30" : "text-gray-400 border-gray-100"
                          )}>
                            {msg.modelId}
                          </Badge>
                          {customModels.some(m => m.id === msg.modelId) && (
                            <Badge className="bg-blue-50 text-blue-600 border-blue-100 text-[9px]">HF Inference</Badge>
                          )}
                        </div>
                      )}
                      
                      {msg.error ? (
                        <div className="flex items-center gap-2 text-red-500 text-sm font-medium">
                          <AlertTriangle className="w-4 h-4" />
                          {msg.content}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="whitespace-pre-wrap">
                            {msg.content}
                            {msg.isLoading && (
                              <span className="inline-flex ml-1">
                                <span className="animate-bounce">.</span>
                                <span className="animate-bounce [animation-delay:0.2s]">.</span>
                                <span className="animate-bounce [animation-delay:0.4s]">.</span>
                              </span>
                            )}
                          </div>
                          
                          {msg.mediaUrl && msg.mediaType === 'audio' && (
                            <AudioMessage url={msg.mediaUrl} />
                          )}
                          
                          {msg.mediaUrl && msg.mediaType === 'video' && (
                            <VideoMessage url={msg.mediaUrl} />
                          )}
                          
                          {msg.mediaUrl && msg.mediaType === 'image' && (
                            <div className="mt-3 rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                              <img src={msg.mediaUrl} alt="Generated" className="w-full h-auto" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {msg.role === 'assistant' && msg.content && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity pt-1">
                        <CopyButton content={msg.content} />
                      </div>
                    )}
                  </div>

                  {msg.role === 'assistant' && (msg.usage || msg.responseTime) && (
                    <div className="flex items-center gap-4 px-1">
                      {msg.usage && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          <Zap className="w-3 h-3 text-orange-400" />
                          <span>{msg.usage.total_tokens} tokens</span>
                          <span className="opacity-50">({msg.usage.prompt_tokens}p / {msg.usage.completion_tokens}c)</span>
                        </div>
                      )}
                      {msg.responseTime && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          <Clock className="w-3 h-3 text-blue-400" />
                          <span>{msg.responseTime}ms</span>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />

            {isLoading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 bg-white border border-gray-100 rounded-full flex items-center justify-center shadow-sm">
                  <RefreshCw className="w-4 h-4 text-orange-500 animate-spin" />
                </div>
                <span className="text-xs font-medium text-gray-400 italic">Thinking...</span>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-6 bg-white border-t border-gray-200">
          <div className="max-w-4xl mx-auto relative">
            <Textarea 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type your message here..."
              className="min-h-[100px] max-h-[300px] overflow-y-auto w-full pr-16 bg-gray-50 border-gray-200 focus:ring-orange-500 resize-none rounded-xl p-4 text-sm"
            />
            <Button 
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute bottom-4 right-4 bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-200 rounded-lg h-10 w-10 p-0"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-center text-[10px] text-gray-400 mt-4 font-medium uppercase tracking-widest">
            Powered by OpenRouter API • Press Enter to send
          </p>
        </div>
      </div>
    </div>
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>API Settings</DialogTitle>
            <DialogDescription>
              Configure your API keys to enable model testing. Keys are stored locally in your browser.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="openrouter-key">OpenRouter API Key</Label>
              <Input
                id="openrouter-key"
                type="password"
                value={openRouterKey}
                onChange={(e) => setOpenRouterKey(e.target.value)}
                placeholder="sk-or-v1-..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hf-key">Hugging Face API Key</Label>
              <Input
                id="hf-key"
                type="password"
                value={hfApiKey}
                onChange={(e) => setHfApiKey(e.target.value)}
                placeholder="hf_..."
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setIsSettingsOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
