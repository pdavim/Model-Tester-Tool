import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Settings, 
  Key, 
  Cpu, 
  Save, 
  ExternalLink,
  ShieldCheck,
  BrainCircuit
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConfigStore } from '@/store/useConfigStore';
import { ModelSelector } from './ModelSelector';
import { toast } from 'sonner';

export const SettingsModal: React.FC = () => {
  const { 
    openRouterKey, setOpenRouterKey, 
    hfApiKey, setHfApiKey,
    reportModelId 
  } = useConfigStore();

  const [orKey, setOrKey] = React.useState(openRouterKey);
  const [hfKey, setHfKey] = React.useState(hfApiKey);

  const handleSave = () => {
    setOpenRouterKey(orKey);
    setHfApiKey(hfKey);
    toast.success('Configuration saved successfully');
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-all rounded-xl">
          <Settings className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-8 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-500 rounded-xl shadow-lg shadow-orange-500/20">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight">System Settings</DialogTitle>
          </div>
          <DialogDescription className="text-gray-400 font-medium">
            Configure your bridge to global intelligence providers.
          </DialogDescription>
        </DialogHeader>

        <div className="p-8 space-y-8 bg-white">
          {/* API Keys Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-4 h-4 text-orange-500" />
              <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Authentication Keys</h3>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold text-gray-700">OpenRouter API Key</Label>
                  <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" className="text-[10px] font-bold text-orange-500 flex items-center gap-1 hover:underline">
                    Get Key <ExternalLink className="w-2 h-2" />
                  </a>
                </div>
                <Input 
                  type="password"
                  value={orKey}
                  onChange={e => setOrKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="h-11 rounded-xl border-gray-100 bg-gray-50/50 focus:ring-orange-500/10 transition-all"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold text-gray-700">Hugging Face Token</Label>
                  <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer" className="text-[10px] font-bold text-orange-500 flex items-center gap-1 hover:underline">
                    Get Token <ExternalLink className="w-2 h-2" />
                  </a>
                </div>
                <Input 
                  type="password"
                  value={hfKey}
                  onChange={e => setHfKey(e.target.value)}
                  placeholder="hf_..."
                  className="h-11 rounded-xl border-gray-100 bg-gray-50/50 focus:ring-orange-500/10 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Report Intelligence Section */}
          <div className="space-y-6 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <BrainCircuit className="w-4 h-4 text-orange-500" />
              <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-400">Audit Intelligence</h3>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-bold text-gray-700">Dedicated Reporter Model</Label>
              <div className="relative group">
                <ModelSelector mode="chat" /> 
                <p className="mt-2 text-[10px] text-gray-400 font-medium italic">
                  * This model will analyze battle results and generate the cross-comparison audit report.
                </p>
              </div>
              <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <Cpu className="w-3.5 h-3.5 text-gray-400" />
                   <span className="text-[10px] font-bold text-gray-600 truncate max-w-[200px]">{reportModelId}</span>
                </div>
                <Badge variant="outline" className="text-[8px] font-black border-orange-100 text-orange-600 bg-orange-50 uppercase tracking-tighter">Current Reporter</Badge>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleSave}
            className="w-full h-12 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold shadow-xl shadow-gray-200 gap-2 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Save className="w-4 h-4" />
            Commit Configuration
          </Button>
        </div>
        
        <div className="p-4 bg-gray-50 flex items-center justify-center gap-4 border-t border-gray-100">
          <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
            <ShieldCheck className="w-3 h-3 text-green-500" />
            AES-256 Local Encryption
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Simplified badge for the modal
const Badge = ({ children, className, variant }: any) => (
  <span className={cn(
    "px-2 py-0.5 rounded text-[10px] font-medium",
    variant === 'outline' ? "border border-gray-200" : "bg-gray-100",
    className
  )}>
    {children}
  </span>
);
