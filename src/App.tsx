import React, { useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { 
  ChevronLeft, 
  ChevronRight, 
  History, 
  RefreshCw, 
  Settings2, 
  Cpu,
  Plus,
  Pencil,
  Trash,
  Boxes,
  Zap,
  Globe,
  Bot,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChatSidebar } from './components/sidebar/ChatSidebar';
import { MessageItem } from './components/chat/MessageItem';
import { ChatInput } from './components/chat/ChatInput';
import { useConfigStore } from './store/useConfigStore';
import { useChatStore } from './store/useChatStore';
import { useModelStore } from './store/useModelStore';
import { cn } from '@/lib/utils';
import TestBench from '@/components/TestBench';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const App: React.FC = () => {
  const { sidebarOpen, setSidebarOpen, testMode, setTestMode } = useConfigStore();
  const { 
    sessions, currentSessionId, createNewSession, setCurrentSessionId, 
    deleteSession, renameSession, isLoading 
  } = useChatStore();
  const { fetchModels } = useModelStore();

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const activeModel = currentSession?.parameters.selectedModel;

  useEffect(() => {
    fetchModels();
    if (sessions.length === 0) {
      createNewSession();
    }
  }, []);

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-white text-gray-900 overflow-hidden font-sans antialiased">
        <Toaster position="top-right" expand={false} richColors />
        
        {/* Responsive Sidebar Container */}
        <ChatSidebar />

        <main className="flex-1 flex flex-col relative min-w-0 bg-[#FBFBFC]">
          {/* Main Header */}
          <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-8 z-30 sticky top-0">
            <div className="flex items-center gap-6 overflow-hidden">
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-all rounded-xl"
                >
                  {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </Button>
                
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition-all rounded-xl">
                      <History className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[380px] p-0 flex flex-col border-none shadow-2xl">
                    <SheetHeader className="p-8 border-b border-gray-50 bg-gray-50/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <History className="w-5 h-5 text-gray-400" />
                          <SheetTitle className="text-xl font-black uppercase tracking-tight">Archives</SheetTitle>
                        </div>
                        <Button size="icon" variant="ghost" className="rounded-xl hover:bg-orange-500 hover:text-white transition-all shadow-sm" onClick={createNewSession}>
                          <Plus className="w-5 h-5" />
                        </Button>
                      </div>
                    </SheetHeader>
                    <ScrollArea className="flex-1 bg-white">
                      <div className="p-6 space-y-3">
                         {sessions.map(session => (
                           <div
                             key={session.id}
                             onClick={() => setCurrentSessionId(session.id)}
                             className={cn(
                               "group flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all duration-300 border-2",
                               currentSessionId === session.id 
                                ? "bg-orange-50/50 border-orange-500/20 text-orange-700 shadow-md translate-x-1" 
                                : "hover:bg-gray-50 border-transparent text-gray-500 hover:border-gray-100"
                             )}
                           >
                             <div className="flex items-center gap-4 truncate">
                               <div className={cn(
                                 "p-2 rounded-xl transition-colors",
                                 currentSessionId === session.id ? "bg-orange-500 text-white" : "bg-gray-100 group-hover:bg-gray-200"
                               )}>
                                 <MessageSquare className="w-4 h-4" />
                               </div>
                               <span className="truncate text-sm font-black uppercase tracking-tight">{session.name}</span>
                             </div>
                             <Button variant="ghost" size="icon" className="h-9 w-9 opacity-0 group-hover:opacity-100 rounded-xl hover:bg-red-50 hover:text-red-500" onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}>
                               <Trash className="w-4 h-4" />
                             </Button>
                           </div>
                         ))}
                      </div>
                    </ScrollArea>
                  </SheetContent>
                </Sheet>
              </div>

              <Separator orientation="vertical" className="h-8 bg-gray-100" />

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="font-black text-xs uppercase tracking-[0.2em] text-gray-400 leading-none">Intelligence Hub</h1>
                  {activeModel && !testMode && (
                    <Badge variant="secondary" className="bg-orange-50 text-orange-600 border-orange-100 text-[10px] font-black uppercase tracking-tighter px-2 h-5">
                      {activeModel.split('/').pop()}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 truncate">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                  <span className="text-sm font-black text-gray-900 truncate tracking-tight">
                    {currentSession?.name || 'INITIALIZING SYSTEMS'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex bg-gray-100/80 p-1.5 rounded-2xl border border-gray-200/50 shadow-inner">
                <Button 
                  variant={!testMode ? "default" : "ghost"} 
                  size="sm" 
                  onClick={() => setTestMode(false)} 
                  className={cn(
                    "h-9 px-6 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl", 
                    !testMode ? "bg-white text-orange-600 shadow-lg scale-[1.02]" : "text-gray-500 hover:text-gray-900"
                  )}
                >
                  Analysis
                </Button>
                <Button 
                  variant={testMode ? "default" : "ghost"} 
                  size="sm" 
                  onClick={() => setTestMode(true)} 
                  className={cn(
                    "h-9 px-6 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl", 
                    testMode ? "bg-white text-orange-600 shadow-lg scale-[1.02]" : "text-gray-500 hover:text-gray-900"
                  )}
                >
                  <Boxes className="w-4 h-4 mr-2" /> Battle Mode
                </Button>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => fetchModels()} className={cn("text-gray-400 hover:text-orange-500 bg-gray-50 hover:bg-orange-50 rounded-xl transition-all h-10 w-10", isLoading && "animate-spin text-orange-500")}>
                    <RefreshCw className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh Knowledge Base</TooltipContent>
              </Tooltip>
            </div>
          </header>

          <div className="flex-1 flex flex-col relative overflow-hidden">
            {/* Session Status Bar (Responsive) */}
            {!testMode && (
              <div className="bg-white px-8 py-3 border-b border-gray-50 flex items-center justify-between z-20 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-8 min-w-max">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Active Model</span>
                    {activeModel ? (
                      <div className="flex items-center gap-2 px-3 py-1 bg-orange-50 rounded-lg border border-orange-100 shadow-sm">
                        <Bot className="w-3.5 h-3.5 text-orange-500" />
                        <span className="text-[11px] font-black text-orange-700 uppercase tracking-tight">{activeModel}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-1 bg-red-50 rounded-lg border border-red-100 animate-pulse">
                        <Zap className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-[11px] font-black text-red-700 uppercase tracking-tight">Select Context Interface</span>
                      </div>
                    )}
                  </div>
                  
                  <Separator orientation="vertical" className="h-4" />
                  
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Latency</span>
                    <Badge variant="ghost" className="text-[11px] font-black text-gray-500">READY</Badge>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Auto-Scale ON</span>
                  <Globe className="w-4 h-4 text-green-500 opacity-50" />
                </div>
              </div>
            )}

            <div className="flex-1 flex flex-col relative overflow-hidden bg-white/20">
              {testMode ? (
                <TestBench />
              ) : (
                <div className="flex-1 relative flex flex-col overflow-hidden">
                  <ScrollArea className="flex-1 h-full w-full z-10">
                    <div className="max-w-5xl mx-auto px-8 py-12 pb-48 space-y-10">
                      {!currentSession || currentSession.messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 text-center animation-in fade-in zoom-in duration-700">
                          <div className="relative mb-10">
                            <div className="absolute inset-0 bg-orange-500 blur-3xl opacity-20 animate-pulse" />
                            <div className="relative w-32 h-32 bg-gradient-to-br from-orange-500 to-orange-600 rounded-[2.5rem] shadow-2xl flex items-center justify-center rotate-12 hover:rotate-0 transition-all duration-500 scale-100 hover:scale-110">
                              <Cpu className="w-16 h-16 text-white shadow-sm" />
                            </div>
                          </div>
                          <div className="space-y-4 max-w-lg mx-auto">
                            <h3 className="text-4xl font-black tracking-tight text-gray-900 bg-clip-text text-transparent bg-gradient-to-b from-gray-900 to-gray-600">Cognitive Terminal</h3>
                            <p className="text-gray-500 font-medium leading-relaxed">
                              Access localized intelligence manifolds. Select your model interface from the sidebar and begin the neural exchange.
                            </p>
                            <div className="pt-8 flex flex-wrap justify-center gap-3">
                               <Badge className="bg-gray-100 text-gray-500 hover:bg-gray-100 border-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-default">Multi-Modal READY</Badge>
                               <Badge className="bg-orange-500/10 text-orange-600 hover:bg-orange-500/10 border-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-default">GPU ACCELERATED</Badge>
                            </div>
                          </div>
                        </div>
                      ) : (
                        currentSession.messages.map((msg, idx) => (
                          <MessageItem key={idx} message={msg} />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                  
                  {/* Floating Chat Input Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
                    <div className="max-w-5xl mx-auto w-full px-8 pb-10 pointer-events-auto">
                      <div className="bg-white/40 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/20">
                        <ChatInput />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
};

export default App;
