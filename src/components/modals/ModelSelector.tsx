import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Search, 
  Sparkles, 
  Plus, 
  RefreshCw, 
  Star, 
  Trash, 
  Terminal, 
  Zap, 
  Clock, 
  AlertCircle,
  Sword,
  Check,
  Info,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConfigStore } from '@/store/useConfigStore';
import { useModelStore } from '@/store/useModelStore';
import { useChatStore } from '@/store/useChatStore';
import { useTestStore } from '@/store/useTestStore';
import { toast } from 'sonner';

interface ModelSelectorProps {
  mode?: 'chat' | 'test';
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ mode = 'chat' }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isAddingCustom, setIsAddingCustom] = React.useState(false);
  const [newCustomId, setNewCustomId] = React.useState('');
  const [newCustomName, setNewCustomName] = React.useState('');

  const {
    models, customModels, favorites, hfHubModels,
    searchQuery, selectedService, filterFree, filterPaid,
    filterModality, filterTags, filterProviders, filterFavorites, filterSelected,
    sortBy, sortOrder,
    setSearchQuery, setSelectedService, setFilterFree, setFilterPaid,
    setFilterModality, setFilterTags, setFilterProviders, setFilterFavorites, setFilterSelected,
    setSortBy, setSortOrder, clearFilters,
    fetchModels, searchHFModels, addCustomModel, toggleFavorite,
    isSearchingHub
  } = useModelStore();

  const { sessions, currentSessionId, setSelectedModelForSession, comparisonModels, setComparisonModels } = useChatStore();
  const { testModels, addModelToTest, removeModelFromTest } = useTestStore();

  // Debounced Hub Search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 3) {
        searchHFModels(searchQuery);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [searchQuery, searchHFModels]);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const sessionSelectedModel = currentSession?.parameters.selectedModel;

  const allAvailableModels = [...models, ...customModels, ...hfHubModels];

  // Derive filter options
  const creators = React.useMemo(() => {
    const set = new Set<string>();
    allAvailableModels.forEach(m => {
      if (m.id.includes('/')) set.add(m.id.split('/')[0]);
    });
    return Array.from(set).sort();
  }, [allAvailableModels]);

  const tasks = React.useMemo(() => {
    const set = new Set<string>();
    allAvailableModels.forEach(m => {
      if (m.pipeline_tag) set.add(m.pipeline_tag);
    });
    return Array.from(set).sort();
  }, [allAvailableModels]);

  const testModelsSet = React.useMemo(() => new Set(testModels), [testModels]);
  const sessionModelsSet = React.useMemo(() => {
    const set = new Set<string>();
    sessions.forEach(s => {
      if (s.parameters.selectedModel) set.add(s.parameters.selectedModel);
    });
    return set;
  }, [sessions]);

  const { setReportModelId, reportModelId } = useConfigStore();

  const filteredModels = allAvailableModels
    .filter((model, index, self) => index === self.findIndex((t) => t.id === model.id))
    .filter(model => {
      const matchesSearch = !searchQuery || 
        model.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        model.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFree = !filterFree || model.pricing?.prompt === "0";
      const matchesPaid = !filterPaid || (model.pricing && model.pricing.prompt !== "0");
      
      const matchesModality = filterModality.length === 0 || 
        (model.architecture?.modality && filterModality.includes(model.architecture.modality));
        
      const matchesFavorites = !filterFavorites || favorites.includes(model.id);
      
      const service = model.provider || (model.isCustom ? 'huggingface' : 'openrouter');
      const matchesService = selectedService === 'all' || service === selectedService;
      
      const provider = model.id.includes('/') ? model.id.split('/')[0] : 'unknown';
      const matchesProvider = filterProviders.length === 0 || filterProviders.includes(provider);
      
      const matchesTags = filterTags.length === 0 || (model.pipeline_tag && filterTags.includes(model.pipeline_tag));

      const isActuallySelected = mode === 'test' ? testModelsSet.has(model.id) : (sessionSelectedModel === model.id);
      const matchesSelected = !filterSelected || isActuallySelected;

      return matchesSearch && matchesFree && matchesPaid && matchesModality && matchesFavorites && matchesService && matchesProvider && matchesTags && matchesSelected;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') comparison = a.name.localeCompare(b.name);
      else if (sortBy === 'created') comparison = (a.created || 0) - (b.created || 0);
      else if (sortBy === 'context') comparison = (a.context_length || 0) - (b.context_length || 0);
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleSelectModel = (id: string) => {
    // If the selector is being used from Settings to choose the report model
    if (!currentSessionId && mode === 'chat') {
        setReportModelId(id);
        toast.success(`Report model set to ${id.split('/').pop()}`);
        setIsOpen(false);
        return;
    }

    if (mode === 'chat') {
        if (!currentSessionId) {
          toast.error('Please select a session first');
          return;
        }
        const model = allAvailableModels.find(m => m.id === id);
        const service = model?.provider || (model?.isCustom ? 'huggingface' : 'openrouter');
        setSelectedModelForSession(currentSessionId, id, service as any);
        setIsOpen(false);
    } else {
        if (testModels.includes(id)) removeModelFromTest(id);
        else addModelToTest(id);
    }
  };

  const handleAddCustom = () => {
    if (!newCustomId.trim()) return;
    addCustomModel({ id: newCustomId, name: newCustomName || newCustomId });
    setNewCustomId('');
    setNewCustomName('');
    setIsAddingCustom(false);
    toast.success('Custom model added');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-between bg-gray-50 border-gray-200 hover:bg-gray-100 h-10 px-3 transition-all duration-200 group">
          <div className="flex items-center gap-2 truncate">
            <Sparkles className="w-4 h-4 text-orange-500 shrink-0 group-hover:animate-pulse" />
            <span className="truncate max-w-[180px] font-medium text-gray-700">
              {mode === 'test' 
                ? `Selected (${testModels.length}) Models` 
                : (sessionSelectedModel ? sessionSelectedModel.split('/').pop() : 'Select AI Model')}
            </span>
          </div>
          {mode === 'test' ? <Sword className="w-4 h-4 text-orange-400 shrink-0" /> : <Plus className="w-3 h-3 text-gray-400 shrink-0" />}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[85vw] max-w-[1200px] h-[85vh] flex flex-col p-0 overflow-hidden sm:max-w-[85vw] rounded-2xl border-none shadow-2xl">
        <DialogHeader className="p-8 border-b border-gray-100 bg-white/50 backdrop-blur-md">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <DialogTitle className="text-3xl font-black tracking-tight text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-700 to-orange-600">
                {mode === 'test' ? 'Battle Mode: Select Contenders' : 'Knowledge Hub'}
              </DialogTitle>
              <DialogDescription className="text-gray-500 font-medium">
                {mode === 'test' ? 'Choose up to 10 models for the benchmarking battle.' : `Connect with ${allAvailableModels.length} cutting-edge intelligence models.`}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsAddingCustom(!isAddingCustom)}
                className={cn("gap-2 rounded-xl h-10 font-bold", isAddingCustom && "bg-orange-50 border-orange-200 text-orange-600 shadow-inner")}
              >
                <Plus className="w-4 h-4" />
                Custom Manifest
              </Button>
              {mode === 'test' && (
                <Button size="sm" className="bg-gradient-to-r from-orange-500 to-orange-600 h-10 px-6 rounded-xl font-bold shadow-lg hover:shadow-orange-500/20" onClick={() => setIsOpen(false)}>Confirm Selection</Button>
              )}
            </div>
          </div>
        </DialogHeader>
        
        <div className="px-8 py-3 bg-gray-50/80 border-b border-gray-100 flex gap-6 items-center">
          <div className="flex bg-white/80 border border-gray-200 p-1 rounded-xl shadow-sm">
            {(['all', 'openrouter', 'huggingface'] as const).map(s => (
              <Button 
                key={s}
                variant={selectedService === s ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setSelectedService(s)}
                className={cn(
                  "h-9 px-6 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all duration-300", 
                  selectedService === s ? "bg-gray-900 text-white shadow-lg scale-105" : "text-gray-400 hover:text-gray-800"
                )}
              >
                {s === 'all' ? 'Universal' : s === 'openrouter' ? 'OpenRouter' : 'Hugging Face'}
              </Button>
            ))}
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <Badge variant="outline" className="rounded-full px-3">{filteredModels.length} Matches</Badge>
          </div>
        </div>

        {isAddingCustom && (
          <div className="p-6 bg-orange-50/50 border-b border-orange-100 flex gap-6 items-end backdrop-blur-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex-1 space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-wider text-orange-700">Model Identifier</Label>
              <Input value={newCustomId} onChange={e => setNewCustomId(e.target.value)} placeholder="e.g., openai/gpt-4" className="h-11 bg-white/80 border-orange-200 focus:ring-orange-500/20 rounded-xl" />
            </div>
            <div className="flex-1 space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-wider text-orange-700">Display Alias</Label>
              <Input value={newCustomName} onChange={e => setNewCustomName(e.target.value)} placeholder="GPT-4 Professional" className="h-11 bg-white/80 border-orange-200 focus:ring-orange-500/20 rounded-xl" />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" className="h-11 rounded-xl font-bold" onClick={() => setIsAddingCustom(false)}>Cancel</Button>
              <Button className="h-11 rounded-xl px-10 bg-orange-500 hover:bg-orange-600 font-bold shadow-lg" onClick={handleAddCustom}>Inject Model</Button>
            </div>
          </div>
        )}
        
        <div className="flex flex-1 overflow-hidden">
          <ScrollArea className="w-80 border-r border-gray-100 bg-gray-50/20">
            <div className="p-8 space-y-10">
              <div className="space-y-4">
                <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 leading-none">Discovery</Label>
                <div className="relative">
                  <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors", isSearchingHub ? "text-orange-500 animate-spin" : "text-gray-400")} />
                  <Input 
                    placeholder="Search Hub..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                    className="pl-11 h-11 bg-white border-gray-100 rounded-xl shadow-sm focus:ring-orange-500/10" 
                  />
                  {isSearchingHub && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                       <span className="text-[10px] font-black text-orange-500 uppercase tracking-tighter animate-pulse">Syncing Hub...</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 leading-none">Sort Intelligence</Label>
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="h-11 bg-white border-gray-100 rounded-xl shadow-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl border-gray-100">
                    <SelectItem value="name" className="rounded-lg">Alphabetical</SelectItem>
                    <SelectItem value="created" className="rounded-lg">Deployment Date</SelectItem>
                    <SelectItem value="context" className="rounded-lg">Window Capacity</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-6">
                <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 leading-none">Filters</Label>
                <div className="space-y-3 bg-white p-4 rounded-2xl border border-gray-50 shadow-sm">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="free" className="text-sm font-bold text-gray-700">Open Source / Free</Label>
                    <Checkbox id="free" checked={filterFree} onCheckedChange={(v) => setFilterFree(!!v)} className="h-5 w-5 rounded-lg border-gray-200" />
                  </div>
                  <Separator className="bg-gray-50" />
                  <div className="flex items-center justify-between">
                    <Label htmlFor="fav" className="text-sm font-bold text-gray-700">Curated Favorites</Label>
                    <Checkbox id="fav" checked={filterFavorites} onCheckedChange={(v) => setFilterFavorites(!!v)} className="h-5 w-5 rounded-lg border-gray-200" />
                  </div>
                  <Separator className="bg-gray-50" />
                  <div className="flex items-center justify-between">
                    <Label htmlFor="selected" className="text-sm font-bold text-gray-700">Selected Models Only</Label>
                    <Checkbox id="selected" checked={filterSelected} onCheckedChange={(v) => setFilterSelected(!!v)} className="h-5 w-5 rounded-lg border-gray-200" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 leading-none">Intelligence Creators</Label>
                  <Badge variant="ghost" className="text-[9px] font-black">{filterProviders.length || 'ALL'}</Badge>
                </div>
                <ScrollArea className="h-[180px] bg-white rounded-2xl border border-gray-50 p-2 shadow-inner">
                  <div className="space-y-1">
                    {creators.map(creator => (
                      <div 
                        key={creator}
                        onClick={() => {
                          const next = filterProviders.includes(creator) 
                            ? filterProviders.filter(p => p !== creator) 
                            : [...filterProviders, creator];
                          setFilterProviders(next);
                        }}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all text-xs font-bold",
                          filterProviders.includes(creator) ? "bg-orange-50 text-orange-600" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                        )}
                      >
                        <span className="truncate">{creator}</span>
                        {filterProviders.includes(creator) && <Check className="w-3 h-3" />}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 leading-none">Model Core Task</Label>
                  <Badge variant="ghost" className="text-[9px] font-black">{filterTags.length || 'ALL'}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tasks.map(tag => (
                    <Badge 
                      key={tag}
                      variant={filterTags.includes(tag) ? 'default' : 'outline'}
                      onClick={() => {
                        const next = filterTags.includes(tag) 
                          ? filterTags.filter(t => t !== tag) 
                          : [...filterTags, tag];
                        setFilterTags(next);
                      }}
                      className={cn(
                        "cursor-pointer px-3 py-1.5 rounded-xl border-gray-100 text-[9px] font-black uppercase tracking-tighter transition-all",
                        filterTags.includes(tag) ? "bg-gray-900 text-white shadow-lg scale-105" : "bg-white text-gray-400 hover:text-orange-500 hover:border-orange-100"
                      )}
                    >
                      {tag.replace('-', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>

              <Button variant="ghost" size="sm" className="w-full gap-2 text-xs font-bold text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-xl h-10" onClick={clearFilters}>
                <RefreshCw className="w-3.5 h-3.5" /> Reset Research Area
              </Button>
            </div>
          </ScrollArea>

          <ScrollArea className="flex-1 bg-white">
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredModels.length > 0 ? (
                filteredModels.map((model) => {
                  const isSelected = mode === 'test' 
                    ? testModels.includes(model.id) 
                    : sessionSelectedModel === model.id;
                  
                  return (
                    <div
                      key={model.id}
                      onClick={() => handleSelectModel(model.id)}
                      className={cn(
                        "group relative flex flex-col items-start p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-sm",
                        isSelected 
                          ? "border-orange-500 bg-orange-50 shadow-xl shadow-orange-500/10 scale-[1.02] z-10" 
                          : "border-gray-50 bg-white hover:border-orange-200 hover:shadow-xl hover:shadow-gray-200/50"
                      )}
                    >
                      {isSelected && (
                         <div className="absolute top-0 right-0 p-3 bg-orange-500 rounded-bl-2xl shadow-lg">
                           <Check className="w-4 h-4 text-white stroke-[3px]" />
                         </div>
                      )}
                      
                      <div className="flex items-center gap-3 mb-4">
                        <div className={cn(
                          "p-2 rounded-xl transition-colors duration-300",
                          isSelected ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-400 group-hover:bg-orange-100 group-hover:text-orange-500"
                        )}>
                          {model.provider === 'huggingface' ? <Terminal className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                        </div>
                        <div className="flex flex-col">
                          <h4 
                            onClick={(e) => {
                              e.stopPropagation();
                              const url = model.provider === 'openrouter' 
                                ? `https://openrouter.ai/models/${model.id}` 
                                : `https://huggingface.co/${model.id}`;
                              window.open(url, '_blank');
                            }}
                            className="font-black text-sm tracking-tight text-gray-900 group-hover:text-orange-600 transition-colors uppercase leading-tight hover:underline flex items-center gap-1"
                          >
                            {model.name.split('/').pop()}
                            <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </h4>
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{model.provider || 'HF'} HUB</span>
                        </div>
                      </div>

                      <p className="text-[12px] text-gray-500 font-medium line-clamp-2 h-9 leading-snug mb-6">{model.description || "Intelligence manifest not yet documented for this model."}</p>
                      
                      <div className="mt-auto w-full space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-[9px] font-black border-gray-100 bg-gray-50/50 uppercase tracking-tighter">
                            {model.context_length ? `${(model.context_length / 1000).toFixed(0)}K Context` : 'Standard Context'}
                          </Badge>
                          {model.pricing?.prompt === "0" && (
                            <Badge className="text-[9px] font-black bg-green-500/10 text-green-600 hover:bg-green-500/10 border-none uppercase tracking-tighter">Open Access</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(model.id); }}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <Star className={cn("w-4 h-4", favorites.includes(model.id) ? "fill-yellow-400 text-yellow-400" : "text-gray-200")} />
                          </button>
                          
                          <div className="flex items-center gap-2">
                             <Dialog>
                                <DialogTrigger asChild>
                                   <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-300 hover:text-orange-500 hover:bg-orange-50 rounded-lg" onClick={e => e.stopPropagation()}>
                                      <Info className="w-4 h-4" />
                                   </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl rounded-3xl p-8">
                                   <DialogHeader>
                                      <div className="flex items-center gap-3 mb-4">
                                         <div className="p-3 bg-orange-500 rounded-2xl shadow-xl shadow-orange-500/20">
                                            <Sparkles className="w-6 h-6 text-white" />
                                         </div>
                                         <div className="flex flex-col">
                                            <DialogTitle className="text-2xl font-black uppercase tracking-tight">{model.name}</DialogTitle>
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Global Intelligence Identifier: {model.id}</span>
                                         </div>
                                      </div>
                                   </DialogHeader>
                                   <div className="space-y-6">
                                      <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                         <h5 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-3">Capabilities & Description</h5>
                                         <p className="text-sm text-gray-600 leading-relaxed font-medium">{model.description || "No official documentation manifest available for this model yet."}</p>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-4">
                                         <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Context Capacity</span>
                                            <span className="text-lg font-black text-gray-900">{model.context_length?.toLocaleString() || '---'} <span className="text-xs font-bold text-gray-400">Tokens</span></span>
                                         </div>
                                         <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Pricing (Prompt)</span>
                                            <span className="text-lg font-black text-green-600">${model.pricing?.prompt || '0.00'}<span className="text-[10px] text-gray-400 px-1">/ 1M</span></span>
                                         </div>
                                         <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Primary Task</span>
                                            <Badge variant="secondary" className="mt-1 bg-gray-900 text-white rounded-lg px-3 uppercase text-[9px] font-black">{model.pipeline_tag || 'General Intelligence'}</Badge>
                                         </div>
                                         <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Deployment Source</span>
                                            <Badge className="mt-1 bg-orange-50 text-orange-600 border border-orange-100 rounded-lg px-3 uppercase text-[9px] font-black">{model.provider?.toUpperCase() || 'HUB'}</Badge>
                                         </div>
                                      </div>
                                   </div>
                                </DialogContent>
                             </Dialog>

                             <span className="text-[10px] font-black text-gray-300 tracking-widest group-hover:text-orange-400 transition-colors uppercase">Deploy Link</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center py-32 text-gray-400 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
                  <AlertCircle className="w-16 h-16 mb-6 opacity-10" />
                  <p className="font-black uppercase tracking-widest opacity-30 text-sm">No intelligence matches the criteria</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
