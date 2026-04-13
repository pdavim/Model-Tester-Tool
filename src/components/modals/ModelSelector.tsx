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
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
    filterModality, filterTags, filterProviders, filterFavorites,
    sortBy, sortOrder,
    setSearchQuery, setSelectedService, setFilterFree, setFilterPaid,
    setFilterModality, setFilterTags, setFilterProviders, setFilterFavorites,
    setSortBy, setSortOrder, clearFilters,
    fetchModels, addCustomModel, toggleFavorite
  } = useModelStore();

  const { comparisonModels, setComparisonModels } = useChatStore();
  const { testModels, addModelToTest, removeModelFromTest } = useTestStore();

  const allAvailableModels = [...models, ...customModels, ...hfHubModels];

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

      return matchesSearch && matchesFree && matchesPaid && matchesModality && matchesFavorites && matchesService && matchesProvider && matchesTags;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') comparison = a.name.localeCompare(b.name);
      else if (sortBy === 'created') comparison = (a.created || 0) - (b.created || 0);
      else if (sortBy === 'context') comparison = (a.context_length || 0) - (b.context_length || 0);
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleSelectModel = (id: string) => {
    if (mode === 'chat') {
       // Single select logic - users can still use this to set the "active" model for single chat
       // But usually in comparison mode they use multi-select.
       // We'll keep it simple for now and only handle Battle Mode multi-select.
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
        <Button variant="outline" className="w-full justify-between bg-gray-50 border-gray-200 hover:bg-gray-100 h-10 px-3">
          <span className="truncate max-w-[200px]">
            {mode === 'test' ? `Selected (${testModels.length}) Models` : 'Select Model'}
          </span>
          {mode === 'test' ? <Sword className="w-4 h-4 text-orange-500 shrink-0" /> : <Sparkles className="w-4 h-4 text-orange-500 shrink-0" />}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[80vw] max-w-[80vw] h-[85vh] flex flex-col p-0 overflow-hidden sm:max-w-[80vw]">
        <DialogHeader className="p-6 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <div>
              <DialogTitle className="text-2xl font-bold tracking-tight">
                {mode === 'test' ? 'Battle Mode: Select Contenders' : 'Select Model'}
              </DialogTitle>
              <DialogDescription>
                {mode === 'test' ? 'Choose up to 10 models for the benchmarking battle.' : `Browse through ${allAvailableModels.length} available models.`}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsAddingCustom(!isAddingCustom)}
                className={cn("gap-2", isAddingCustom && "bg-orange-50 border-orange-200 text-orange-600")}
              >
                <Plus className="w-4 h-4" />
                Add Custom HF Model
              </Button>
              {mode === 'test' && (
                <Button size="sm" className="bg-orange-500" onClick={() => setIsOpen(false)}>Done</Button>
              )}
            </div>
          </div>
        </DialogHeader>
        
        <div className="px-6 py-2 bg-gray-50/50 border-b border-gray-100 flex gap-4">
          <div className="flex bg-white border border-gray-200 p-1 rounded-lg">
            {(['all', 'openrouter', 'huggingface'] as const).map(s => (
              <Button 
                key={s}
                variant={selectedService === s ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setSelectedService(s)}
                className={cn("h-8 px-4 text-[11px] font-bold uppercase", selectedService === s && "bg-black text-white px-6 shadow-md" )}
              >
                {s === 'all' ? 'All Models' : s === 'openrouter' ? 'OpenRouter' : 'Hugging Face'}
              </Button>
            ))}
          </div>
        </div>

        {isAddingCustom && (
          <div className="p-4 bg-orange-50 border-b border-orange-100 flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label className="text-[10px] font-bold uppercase text-orange-600">Model ID</Label>
              <Input value={newCustomId} onChange={e => setNewCustomId(e.target.value)} placeholder="provider/model-name" className="h-9 bg-white border-orange-200" />
            </div>
            <div className="flex-1 space-y-2">
              <Label className="text-[10px] font-bold uppercase text-orange-600">Friendly Name</Label>
              <Input value={newCustomName} onChange={e => setNewCustomName(e.target.value)} placeholder="My Model" className="h-9 bg-white border-orange-200" />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsAddingCustom(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAddCustom} className="bg-orange-500 hover:bg-orange-600">Add</Button>
            </div>
          </div>
        )}
        
        <div className="flex flex-1 overflow-hidden">
          <ScrollArea className="w-64 border-r border-gray-100 bg-gray-50/50">
            <div className="p-6 space-y-8">
              <div className="space-y-4">
                <Label className="text-[10px] font-bold uppercase text-gray-400">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 bg-white border-gray-200" />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-bold uppercase text-gray-400">Sort By</Label>
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="created">Newest</SelectItem>
                    <SelectItem value="context">Context</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-bold uppercase text-gray-400">Filters</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="free" checked={filterFree} onCheckedChange={(v) => setFilterFree(!!v)} />
                    <label htmlFor="free" className="text-sm font-medium">Free</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="fav" checked={filterFavorites} onCheckedChange={(v) => setFilterFavorites(!!v)} />
                    <label htmlFor="fav" className="text-sm font-medium">Favorites</label>
                  </div>
                </div>
              </div>

              <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={clearFilters}>
                <RefreshCw className="w-3 h-3" /> Clear Filters
              </Button>
            </div>
          </ScrollArea>

          <ScrollArea className="flex-1">
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredModels.length > 0 ? (
                filteredModels.map((model) => {
                  const isSelected = mode === 'test' ? testModels.includes(model.id) : false;
                  return (
                    <div
                      key={model.id}
                      onClick={() => handleSelectModel(model.id)}
                      className={cn(
                        "group relative flex flex-col items-start p-4 rounded-xl border transition-all cursor-pointer",
                        isSelected 
                          ? "border-orange-500 bg-orange-50 shadow-md ring-1 ring-orange-200" 
                          : "border-gray-100 bg-white hover:border-orange-200 hover:shadow-sm"
                      )}
                    >
                      <div className="flex justify-between items-start w-full mb-2">
                        <div className="flex items-center gap-2">
                          <button onClick={(e) => { e.stopPropagation(); toggleFavorite(model.id); }}>
                            <Star className={cn("w-4 h-4", favorites.includes(model.id) ? "fill-yellow-400 text-yellow-400" : "text-gray-300")} />
                          </button>
                          <h4 className="font-bold text-sm truncate max-w-[150px]">{model.name}</h4>
                        </div>
                        <div className="flex items-center gap-1">
                           {isSelected && <div className="bg-orange-500 rounded-full p-0.5"><Check className="w-3 h-3 text-white" /></div>}
                           <Badge variant="secondary" className="text-[8px] font-bold">
                             {model.id.split('/')[0].toUpperCase()}
                           </Badge>
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-500 line-clamp-2 h-8 leading-tight">{model.description || "No description available."}</p>
                      <div className="mt-4 flex flex-col gap-3 w-full border-t border-gray-100/50 pt-3">
                         <div className="flex items-center justify-between text-[9px] font-bold text-gray-400">
                            <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {(model.context_length || 0).toLocaleString()} Context</span>
                            {model.pricing && <span className="flex items-center gap-1"><Zap className="w-2.5 h-2.5" /> ${((parseFloat(model.pricing.prompt) || 0) * 1000000).toFixed(2)}</span>}
                         </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-2 flex flex-col items-center justify-center py-20 text-gray-400">
                  <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                  <p>No models found.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
