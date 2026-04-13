import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { 
  Play, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Zap, 
  LayoutDashboard,
  Terminal,
  Activity,
  ShieldCheck,
  Plus,
  Rocket,
  Wand2,
  BrainCircuit,
  FileSearch,
  Trophy,
  History,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTestStore } from '@/store/useTestStore';
import { useConfigStore } from '@/store/useConfigStore';
import { useModelStore } from '@/store/useModelStore';
import { ModelSelector } from '@/components/modals/ModelSelector';
import { BENCHMARK_PROMPTS } from '@/utils/benchmark-prompts';

export default function TestBench() {
  const [activeTab, setActiveTab] = useState('overview');
  const [customPrompt, setCustomPrompt] = useState('');
  
  const { 
    testModels, 
    testResults, 
    isTesting, 
    isAnalyzing,
    currentTestIndex, 
    battleAnalysis,
    runTestBatch,
    clearResults,
    removeModelFromTest
  } = useTestStore();

  const { openRouterKey, hfApiKey } = useConfigStore();
  const { models, customModels } = useModelStore();

  const allModels = [...models, ...customModels];

  const chartData = testResults.filter(r => r.status === 'completed').map(r => ({
    name: r.model.split('/').pop() || r.model,
    latency: r.latency,
    tokens: r.tokens,
    efficiency: r.latency > 0 ? (r.tokens / (r.latency / 1000)) : 0
  }));

  const totalProgress = testModels.length > 0 
    ? (testResults.filter(r => r.status === 'completed' || r.status === 'error').length / testModels.length) * 100 
    : 0;

  const handleRunTest = (promptText: string) => {
    runTestBatch(promptText, { openRouterKey, hfApiKey });
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50/50 p-6 overflow-hidden">
      <div className="max-w-7xl mx-auto w-full flex flex-col h-full gap-6">
        
        {/* Header Controls */}
        <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Rocket className="w-24 h-24" />
          </div>
          <div className="z-10">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <Rocket className="w-6 h-6 text-orange-500" />
              Model Battle Bench
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Sequential benchmarking and AI analysis via GLM-5.1
            </p>
          </div>
          <div className="flex items-center gap-3 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 border-orange-200 text-orange-600 hover:bg-orange-50">
                  <BrainCircuit className="w-4 h-4" />
                  Select Pro Prompt
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Expert Benchmarks</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {BENCHMARK_PROMPTS.map(p => (
                  <DropdownMenuItem key={p.id} onClick={() => { setCustomPrompt(p.prompt); handleRunTest(p.prompt); }} className="flex flex-col items-start gap-1 p-3">
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-xs">{p.title}</span>
                      <Badge variant="secondary" className="text-[9px] uppercase">{p.category}</Badge>
                    </div>
                    <span className="text-[10px] text-gray-500 line-clamp-1">{p.prompt}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button 
              onClick={clearResults}
              variant="ghost"
              disabled={isTesting || testResults.length === 0}
              className="text-gray-400"
            >
              Reset
            </Button>
            
            <Button 
              onClick={() => handleRunTest(customPrompt || BENCHMARK_PROMPTS[0].prompt)}
              disabled={isTesting || testModels.length === 0}
              className="bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-200 gap-2 min-w-[140px]"
            >
              {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {isTesting ? 'In Battle...' : 'Start Battle'}
            </Button>
          </div>
        </div>

        {/* Progress Tracker */}
        <AnimatePresence>
          {isTesting && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-2 bg-white p-4 rounded-xl border border-orange-100 overflow-hidden"
            >
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-orange-600">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Analyzing {testModels[currentTestIndex]?.split('/').pop()}
                </span>
                <span>{Math.round(totalProgress)}% Complete</span>
              </div>
              <Progress value={totalProgress} className="h-2 [&>div]:bg-orange-500" />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Models Queue */}
          <Card className="w-1/4 flex flex-col border-gray-100 shadow-sm">
            <CardHeader className="pb-3 pt-4 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-gray-400">Battle List</CardTitle>
              <ModelSelector mode="test" />
            </CardHeader>
            <ScrollArea className="flex-1 px-4 pb-4">
              <div className="space-y-3">
                {testModels.length === 0 && (
                  <div className="py-12 flex flex-col items-center justify-center text-center opacity-40">
                    <Plus className="w-10 h-10 mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">No Contenders</p>
                  </div>
                )}
                {testModels.map((modelId, idx) => {
                  const result = testResults.find(r => r.model === modelId);
                  const modelInfo = allModels.find(m => m.id === modelId);
                  const isCurrent = currentTestIndex === idx;
                  
                  return (
                    <div 
                      key={modelId}
                      className={cn(
                        "group p-3 rounded-xl border transition-all flex flex-col gap-2",
                        isCurrent ? "bg-orange-50 border-orange-200 shadow-md scale-105 z-10" :
                        result?.status === 'completed' ? "bg-green-50/20 border-green-100" :
                        "bg-white border-gray-100"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <Badge variant="outline" className="text-[8px] font-mono px-1 scale-90">{modelInfo?.id.split('/')[0] || 'HF'}</Badge>
                           <span className="text-xs font-bold truncate max-w-[120px]">{modelInfo?.name || modelId.split('/').pop()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                           {isCurrent ? <RefreshCw className="w-3 h-3 text-orange-500 animate-spin" /> :
                            result?.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> :
                            result?.status === 'error' ? <XCircle className="w-4 h-4 text-red-500" /> :
                            <button onClick={() => removeModelFromTest(modelId)} className="opacity-0 group-hover:opacity-100 transition-opacity"><Plus className="w-4 h-4 rotate-45 text-gray-300 hover:text-red-500" /></button>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-gray-400 px-1">
                        <span>{modelInfo?.context_length?.toLocaleString() || '---'} context</span>
                        {result?.latency && <span className="font-mono text-orange-500">{result.latency}ms</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </Card>

          {/* Results & Analytics */}
          <div className="flex-1 flex flex-col gap-6 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <TabsList className="bg-white border border-gray-100 w-fit">
                  <TabsTrigger value="overview" className="gap-2 text-xs uppercase tracking-widest font-bold">
                    <LayoutDashboard className="w-3 h-3" /> Overview
                  </TabsTrigger>
                  <TabsTrigger value="analysis" className="gap-2 text-xs uppercase tracking-widest font-bold">
                    <Wand2 className="w-3 h-3" /> AI Report
                  </TabsTrigger>
                  <TabsTrigger value="responses" className="gap-2 text-xs uppercase tracking-widest font-bold">
                    <Terminal className="w-3 h-3" /> Responses
                  </TabsTrigger>
                </TabsList>
                
                {battleAnalysis && (
                  <Badge className="bg-green-100 text-green-700 border-green-200 animate-pulse">Report Ready</Badge>
                )}
              </div>

              <TabsContent value="overview" className="flex-1 mt-0 overflow-hidden">
                <div className="grid grid-cols-2 gap-4 h-full overflow-y-auto pr-2 pb-4">
                   <Card className="border-gray-100 shadow-sm">
                     <CardHeader className="py-4">
                       <div className="flex items-center justify-between">
                         <CardTitle className="text-xs font-bold uppercase tracking-widest text-gray-400">Response Latency</CardTitle>
                         <Zap className="w-4 h-4 text-red-400" />
                       </div>
                     </CardHeader>
                     <CardContent className="h-64">
                       <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={chartData}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                           <XAxis dataKey="name" fontSize={9} interval={0} tick={{ fill: '#9ca3af' }} />
                           <YAxis fontSize={9} tick={{ fill: '#9ca3af' }} />
                           <RechartsTooltip cursor={{fill: '#fef3c7'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                           <Bar dataKey="latency" fill="#f87171" radius={[6, 6, 0, 0]} barSize={40}>
                              {chartData.map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? '#f87171' : '#fca5a5'} />
                              ))}
                           </Bar>
                         </BarChart>
                       </ResponsiveContainer>
                     </CardContent>
                   </Card>

                   <Card className="border-gray-100 shadow-sm">
                     <CardHeader className="py-4">
                       <div className="flex items-center justify-between">
                         <CardTitle className="text-xs font-bold uppercase tracking-widest text-gray-400">Throughput Efficiency (T/S)</CardTitle>
                         <Activity className="w-4 h-4 text-blue-400" />
                       </div>
                     </CardHeader>
                     <CardContent className="h-64">
                       <ResponsiveContainer width="100%" height="100%">
                         <LineChart data={chartData}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                           <XAxis dataKey="name" fontSize={9} interval={0} tick={{ fill: '#9ca3af' }} />
                           <YAxis fontSize={9} tick={{ fill: '#9ca3af' }} />
                           <RechartsTooltip />
                           <Line type="monotone" dataKey="efficiency" stroke="#fb923c" strokeWidth={4} dot={{ fill: '#fb923c', r: 6, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                         </LineChart>
                       </ResponsiveContainer>
                     </CardContent>
                   </Card>

                   <Card className="col-span-2 border-gray-100 shadow-sm bg-gradient-to-r from-white to-gray-50/50">
                     <CardContent className="p-6 grid grid-cols-4 gap-6">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1"><Trophy className="w-3 h-3 text-yellow-500" /> Fastest</span>
                          <span className="text-lg font-bold text-gray-900 truncate">
                            {chartData.length > 0 ? [...chartData].sort((a,b) => a.latency - b.latency)[0].name : "---"}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 border-l border-gray-100 pl-6">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1"><Zap className="w-3 h-3 text-orange-500" /> Efficient</span>
                          <span className="text-lg font-bold text-gray-900 truncate">
                            {chartData.length > 0 ? [...chartData].sort((a,b) => b.efficiency - a.efficiency)[0].name : "---"}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 border-l border-gray-100 pl-6">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1"><BrainCircuit className="w-3 h-3 text-blue-500" /> Avg. Tokens</span>
                          <span className="text-lg font-bold text-gray-900">
                            {chartData.length > 0 ? Math.round(testResults.reduce((acc, r) => acc + (r.tokens || 0), 0) / chartData.length) : "0"}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 border-l border-gray-100 pl-6">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1"><History className="w-3 h-3 text-purple-500" /> Status</span>
                          <Badge variant="outline" className="w-fit text-[10px] font-bold uppercase">{isTesting ? 'In Progress' : testResults.length > 0 ? 'Cycle Complete' : 'Idle'}</Badge>
                        </div>
                     </CardContent>
                   </Card>
                </div>
              </TabsContent>

              <TabsContent value="analysis" className="flex-1 mt-0 overflow-hidden">
                 <ScrollArea className="h-full bg-white rounded-xl border border-gray-100 shadow-sm">
                   <div className="p-8">
                      {isAnalyzing ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-6">
                           <div className="relative">
                              <div className="w-16 h-16 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin" />
                              <BrainCircuit className="w-6 h-6 text-orange-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                           </div>
                           <div className="text-center space-y-2">
                              <h3 className="font-bold text-lg">GLM-5.1 is generating your report</h3>
                              <p className="text-sm text-gray-400 animate-pulse">Analyzing logic, latency, and reasoning depth...</p>
                           </div>
                        </div>
                      ) : battleAnalysis ? (
                        <div className="prose prose-orange max-w-none">
                           <div className="flex items-center gap-3 mb-6 p-4 bg-orange-50 rounded-xl border border-orange-100">
                              <Badge className="bg-orange-500">AI REPORT</Badge>
                              <span className="text-xs font-bold text-orange-900 uppercase tracking-widest">Model Tester Intelligence Output</span>
                           </div>
                           <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-700">
                              {battleAnalysis}
                           </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-300 gap-4 opacity-50">
                           <FileSearch className="w-16 h-16" />
                           <p className="text-sm font-bold uppercase tracking-widest">No Analysis Available</p>
                           <p className="text-[10px] max-w-xs text-center uppercase tracking-widest">Reports are automatically generated by zai-org/GLM-5.1 after a battle finishes.</p>
                        </div>
                      )}
                   </div>
                 </ScrollArea>
              </TabsContent>

              <TabsContent value="responses" className="flex-1 mt-0 overflow-hidden">
                <ScrollArea className="h-full bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="space-y-6 p-8">
                    {testResults.filter(r => r.response || r.error).map(res => (
                      <div key={res.model} className="space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                          <div className="flex items-center gap-3">
                            <Badge className="bg-orange-500 rounded-lg px-3 py-1">{res.model}</Badge>
                            <div className="h-4 w-[1px] bg-gray-200" />
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                               <Clock className="w-3 h-3 text-orange-300" /> {res.latency}ms
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                             <div className="flex items-center gap-1 text-[11px] text-gray-500 font-bold">
                               <Zap className="w-3 h-3 text-orange-400" /> {res.tokens} tokens
                             </div>
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-300 hover:text-orange-500">
                               <Download className="w-3 h-3"/>
                             </Button>
                          </div>
                        </div>
                        <div className={cn(
                          "p-6 rounded-2xl text-xs leading-relaxed font-sans shadow-inner",
                          res.error ? "bg-red-50 text-red-600 border border-red-100 font-bold" : "bg-gray-50 text-gray-700 border border-gray-100"
                        )}>
                          {res.error || res.response}
                        </div>
                      </div>
                    ))}
                    {testResults.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-20 text-gray-300 gap-6">
                        <Terminal className="w-16 h-16 opacity-20" />
                        <div className="text-center space-y-1">
                          <p className="text-sm font-bold uppercase tracking-widest opacity-40">Zero Signal</p>
                          <p className="text-[10px] uppercase tracking-widest opacity-40">Start a battle to stream responses here.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Footer Info */}
        <div className="bg-white px-8 py-4 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm">
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                Safe Queue V2 Active
              </div>
              <div className="w-[1px] h-4 bg-gray-100" />
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <BrainCircuit className="w-4 h-4 text-orange-500" />
                GLM-5.1 Analyzer Wired
              </div>
           </div>
           <p className="text-[10px] text-gray-400 font-medium">
             DESIGNED BY ANTIGRAVITY • V1.5.0
           </p>
        </div>
      </div>
    </div>
  );
}
