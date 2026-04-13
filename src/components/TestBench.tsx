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
  Line,
  Cell
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
  Clock,
  Square,
  AlertTriangle,
  FileCode,
  Braces,
  Settings2
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
  DropdownMenuGroup,
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
import { BENCHMARK_PROMPTS, BenchmarkPrompt } from '@/utils/benchmark-prompts';

export default function TestBench() {
  const [activeTab, setActiveTab] = useState('overview');
  
  const { 
    testModels, 
    testResults, 
    isTesting, 
    isAnalyzing,
    currentTestIndex, 
    currentStepIndex,
    battleAnalysis,
    runTestBatch,
    clearResults,
    removeModelFromTest,
    stopBattle
  } = useTestStore();

  const { openRouterKey, hfApiKey } = useConfigStore();
  const { models, customModels } = useModelStore();

  const allModels = [...models, ...customModels];

  const chartData = testResults.filter(r => r.status === 'completed' || r.capabilities.some(c => c.status === 'completed')).map(r => ({
    name: r.model.split('/').pop() || r.model,
    latency: r.overallLatency,
    tokens: r.overallTokens,
    efficiency: r.overallLatency > 0 ? (r.overallTokens / (r.overallLatency / 1000)) : 0
  }));

  const totalSteps = testModels.length * BENCHMARK_PROMPTS.length;
  const completedSteps = testResults.reduce((acc, r) => acc + r.capabilities.filter(c => c.status === 'completed' || c.status === 'error').length, 0);
  const totalProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const handleRunFullAudit = () => {
    runTestBatch(BENCHMARK_PROMPTS, { openRouterKey, hfApiKey });
  };

  const handleRunSinglePrompt = (prompt: BenchmarkPrompt) => {
    runTestBatch([prompt], { openRouterKey, hfApiKey });
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
              Multi-capability auditing & analytical benchmarking
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
              <DropdownMenuContent align="end" className="w-80 max-h-[400px] overflow-y-auto">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Individual Capability Tests</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {BENCHMARK_PROMPTS.map(p => (
                    <DropdownMenuItem 
                      key={p.id} 
                      onClick={() => handleRunSinglePrompt(p)} 
                      className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-xs">{p.title}</span>
                        <Badge variant="secondary" className="text-[9px] uppercase">{p.category}</Badge>
                      </div>
                      <span className="text-[10px] text-gray-500 line-clamp-1">{p.prompt}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
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
            
            {isTesting ? (
              <Button 
                onClick={stopBattle}
                variant="destructive"
                className="gap-2 shadow-lg min-w-[140px]"
              >
                <Square className="w-4 h-4 fill-white" />
                Stop Battle
              </Button>
            ) : (
              <Button 
                onClick={handleRunFullAudit}
                disabled={testModels.length === 0}
                className="bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-200 gap-2 min-w-[140px]"
              >
                <Play className="w-4 h-4" /> Start Full Audit
              </Button>
            )}
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
                  Testing {testModels[currentTestIndex]?.split('/').pop()} • {BENCHMARK_PROMPTS[currentStepIndex]?.category}
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
                        {result?.overallLatency && <span className="font-mono text-orange-500">{result.overallLatency}ms</span>}
                      </div>

                      {/* Mini capability tracker */}
                      <div className="flex gap-1 mt-1">
                        {result?.capabilities.map((c, cid) => (
                          <div 
                            key={cid} 
                            className={cn(
                              "h-1 flex-1 rounded-full",
                              c.status === 'completed' ? "bg-green-400" :
                              c.status === 'error' ? "bg-red-400" :
                              c.status === 'running' ? "bg-orange-400 animate-pulse" :
                              "bg-gray-100"
                            )} 
                            title={c.categoryName}
                          />
                        ))}
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
                    <LayoutDashboard className="w-3 h-3" /> Capability Matrix
                  </TabsTrigger>
                  <TabsTrigger value="analysis" className="gap-2 text-xs uppercase tracking-widest font-bold">
                    <Wand2 className="w-3 h-3" /> AI Report
                  </TabsTrigger>
                  <TabsTrigger value="responses" className="gap-2 text-xs uppercase tracking-widest font-bold">
                    <Terminal className="w-3 h-3" /> Raw Samples
                  </TabsTrigger>
                </TabsList>
                
                {battleAnalysis && (
                  <Badge className="bg-green-100 text-green-700 border-green-200 animate-pulse">Deep Report Ready</Badge>
                )}
              </div>

              <TabsContent value="overview" className="flex-1 mt-0 overflow-hidden">
                <ScrollArea className="h-full bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="p-6">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="py-4 px-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Contender</th>
                          {BENCHMARK_PROMPTS.map(p => (
                            <th key={p.id} className="py-4 px-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold text-center">
                              {p.category}
                            </th>
                          ))}
                          <th className="py-4 px-4 text-[9px] uppercase tracking-tighter text-gray-400 font-bold text-center border-l border-gray-100">Overall Score</th>
                          <th className="py-4 px-4 text-[9px] uppercase tracking-tighter text-gray-400 font-bold text-center border-l border-gray-100">Total Time</th>
                          <th className="py-4 px-4 text-[9px] uppercase tracking-tighter text-gray-400 font-bold text-center border-l border-gray-100">Total Tokens</th>
                        </tr>
                      </thead>
                      <tbody>
                        {testResults.map(res => (
                          <tr key={res.model} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                            <td className="py-4 px-4">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-900">{res.model.split('/').pop()}</span>
                                <span className="text-[9px] text-gray-400">{res.model.split('/')[0]}</span>
                              </div>
                            </td>
                            {BENCHMARK_PROMPTS.map(p => {
                              const cap = res.capabilities.find(c => c.categoryId === p.id);
                              return (
                                <td key={p.id} className="py-4 px-4 text-center">
                                  {cap?.status === 'completed' ? (
                                    <div className="flex flex-col items-center">
                                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                                      <span className="text-[8px] font-mono mt-1 text-gray-400">{cap.latency}ms</span>
                                    </div>
                                  ) : cap?.status === 'error' ? (
                                    <div className="flex flex-col items-center">
                                      <Badge variant="outline" className="text-[8px] text-red-500 border-red-100 bg-red-50">FAIL</Badge>
                                      <AlertTriangle className="w-3 h-3 text-red-400 mt-1" />
                                    </div>
                                  ) : cap?.status === 'running' ? (
                                    <RefreshCw className="w-4 h-4 text-orange-500 animate-spin mx-auto" />
                                  ) : (
                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-100 mx-auto" />
                                  )}
                                </td>
                              );
                            })}
                            <td className="py-4 px-4 text-center border-l border-gray-50 bg-orange-50/10">
                               <div className="flex flex-col items-center">
                                 <span className="text-xs font-bold text-orange-600">{res.overallLatency}ms</span>
                                 <span className="text-[9px] text-gray-400">{res.overallTokens} tokens</span>
                               </div>
                            </td>
                            <td className="py-4 px-4 text-center border-l border-gray-50">
                               <div className="flex flex-col items-center">
                                 <span className="text-xs font-bold text-gray-900">{(res.overallLatency / 1000).toFixed(2)}s</span>
                                 <span className="text-[9px] text-gray-400 uppercase tracking-widest scale-75">Total Time</span>
                               </div>
                            </td>
                            <td className="py-4 px-4 text-center border-l border-gray-50">
                               <div className="flex flex-col items-center">
                                 <span className="text-xs font-bold text-gray-900">{res.overallTokens.toLocaleString()}</span>
                                 <span className="text-[9px] text-gray-400 uppercase tracking-widest scale-75">Tokens</span>
                               </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {testResults.length === 0 && (
                      <div className="py-20 flex flex-col items-center justify-center text-gray-300">
                        <Settings2 className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-xs font-bold uppercase tracking-widest opacity-40">Ready for Audit</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
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
                              <h3 className="font-bold text-lg">GLM-5.1 Deep Audit</h3>
                              <p className="text-sm text-gray-400 animate-pulse">Running comparative cross-analysis...</p>
                           </div>
                        </div>
                      ) : battleAnalysis ? (
                        <div className="prose prose-orange max-w-none">
                           <div className="flex items-center gap-3 mb-6 p-4 bg-orange-50 rounded-xl border border-orange-100">
                              <Badge className="bg-orange-500">AUDIT SUMMARY</Badge>
                              <span className="text-xs font-bold text-orange-900 uppercase tracking-widest">Global Model Performance Report</span>
                           </div>
                           <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-700">
                              {battleAnalysis}
                           </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-300 gap-4 opacity-50">
                           <FileSearch className="w-16 h-16" />
                           <p className="text-sm font-bold uppercase tracking-widest">No Audit Data</p>
                           <p className="text-[10px] max-w-xs text-center uppercase tracking-widest">Complete a battle to see the AI comparison.</p>
                        </div>
                      )}
                   </div>
                 </ScrollArea>
              </TabsContent>

              <TabsContent value="responses" className="flex-1 mt-0 overflow-hidden">
                <ScrollArea className="h-full bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="space-y-8 p-8">
                    {testResults.map(res => (
                      <div key={res.model} className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                            <Badge className="bg-orange-500 rounded-lg px-4 py-1 font-black">{res.model.split('/').pop()}</Badge>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{res.model.split('/')[0]} Deployment</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {res.capabilities.filter(c => c.response || c.error).map(cap => (
                            <div key={cap.categoryId} className="flex flex-col gap-2 p-4 rounded-xl border border-gray-50 bg-gray-50/30">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {cap.categoryName === 'Coding' ? <FileCode className="w-3 h-3 text-blue-500" /> :
                                   cap.categoryName === 'JSON' ? <Braces className="w-3 h-3 text-purple-500" /> :
                                   <Zap className="w-3 h-3 text-orange-500" />}
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">{cap.categoryName}</span>
                                </div>
                                <span className="text-[9px] font-mono text-gray-400">{cap.latency}ms</span>
                              </div>
                              <div className={cn(
                                "p-3 rounded-lg text-[11px] leading-relaxed max-h-[150px] overflow-y-auto font-sans",
                                cap.error ? "bg-red-50 text-red-600 border border-red-100" : "bg-white text-gray-700 border border-gray-100"
                              )}>
                                {cap.error || cap.response}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {testResults.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-20 text-gray-300 gap-6">
                        <Terminal className="w-16 h-16 opacity-20" />
                        <p className="text-xs font-bold uppercase tracking-widest opacity-40">Awaiting Signal</p>
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
                Capability Audit Active (v2.0)
              </div>
              <div className="w-[1px] h-4 bg-gray-100" />
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <BrainCircuit className="w-4 h-4 text-orange-500" />
                GLM-5.1 Analyzer Wired
              </div>
           </div>
           <p className="text-[10px] text-gray-400 font-medium">
             DESIGNED BY PEDRO DAVIM • V2.0.0
           </p>
        </div>
      </div>
    </div>
  );
}
