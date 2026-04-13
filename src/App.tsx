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
  Boxes
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ChatSidebar } from './components/sidebar/ChatSidebar';
import { MessageItem } from './components/chat/MessageItem';
import { ChatInput } from './components/chat/ChatInput';
import { useConfigStore } from './store/useConfigStore';
import { useChatStore } from './store/useChatStore';
import { useModelStore } from './store/useModelStore';
import { cn } from '@/lib/utils';
import TestBench from '@/components/TestBench';

const App: React.FC = () => {
  const { sidebarOpen, setSidebarOpen, testMode, setTestMode } = useConfigStore();
  const { 
    sessions, currentSessionId, createNewSession, setCurrentSessionId, 
    deleteSession, renameSession, isLoading 
  } = useChatStore();
  const { fetchModels } = useModelStore();

  const currentSession = sessions.find(s => s.id === currentSessionId);

  useEffect(() => {
    fetchModels();
    if (sessions.length === 0) {
      createNewSession();
    }
  }, []);

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-orange-100" style={{ transform: 'scale(0.7)', transformOrigin: 'top left', width: '142.85%', height: '142.85%' }}>
        <Toaster position="top-center" />
        
        <ChatSidebar />

        <div className="flex-1 flex flex-col relative overflow-hidden">
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
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-orange-500">
                    <History className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
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
                             currentSessionId === session.id ? "bg-orange-50 text-orange-700 border border-orange-100" : "hover:bg-gray-50 text-gray-600"
                           )}
                         >
                           <div className="flex items-center gap-3 truncate">
                             <History className="w-4 h-4 shrink-0" />
                             <span className="truncate text-sm font-medium">{session.name}</span>
                           </div>
                           <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}>
                             <Trash className="w-3 h-3" />
                           </Button>
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
                    {currentSession?.name || 'New Conversation'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex bg-gray-100/50 p-1 rounded-xl border border-gray-200 shadow-sm">
                <Button variant={!testMode ? "default" : "ghost"} size="sm" onClick={() => setTestMode(false)} className={cn("h-8 px-4 text-[10px] font-bold uppercase", !testMode ? "bg-white text-orange-600 shadow-sm" : "text-gray-500")}>
                  Chat Analysis
                </Button>
                <Button variant={testMode ? "default" : "ghost"} size="sm" onClick={() => setTestMode(true)} className={cn("h-8 px-4 text-[10px] font-bold uppercase", testMode ? "bg-white text-orange-600 shadow-sm" : "text-gray-500")}>
                  <Boxes className="w-3 h-3 mr-1.5" /> Battle Mode
                </Button>
              </div>

              <Button variant="ghost" size="icon" onClick={() => fetchModels()} className={cn("text-gray-400 hover:text-orange-500", isLoading && "animate-spin")}>
                <RefreshCw className="w-5 h-5" />
              </Button>
            </div>
          </header>

          <div className="flex-1 flex flex-col relative overflow-hidden">
            {testMode ? (
              <TestBench />
            ) : (
              <>
                <ScrollArea className="flex-1 bg-[#F8F9FA]">
                  <div className="max-w-4xl mx-auto p-8 space-y-8">
                    {!currentSession || currentSession.messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
                          <Cpu className="w-10 h-10 text-orange-500" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-2xl font-bold tracking-tight">Ready to test?</h3>
                          <p className="text-gray-500 max-w-md mx-auto">
                            Select a model from the sidebar, attach files, and start a conversation.
                          </p>
                        </div>
                      </div>
                    ) : (
                      currentSession.messages.map((msg, idx) => (
                        <MessageItem key={idx} message={msg} />
                      ))
                    )}
                  </div>
                </ScrollArea>
                <ChatInput />
              </>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default App;
