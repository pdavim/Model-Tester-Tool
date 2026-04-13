import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Cell,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { 
  Play, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Zap, 
  LayoutDashboard,
  Terminal,
  FileText,
  Boxes,
  Activity,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TestResult {
  model: string;
  latency: number;
  tokens: number;
  status: 'pending' | 'running' | 'completed' | 'error';
  response?: string;
  error?: string;
  usage?: any;
}

interface TestBenchProps {
  selectedModels: string[];
  results: TestResult[];
  isTesting: boolean;
  currentTestIndex: number;
  onRunTest: () => void;
  onDownloadReport: () => void;
}

export function TestBench({ 
  selectedModels, 
  results, 
  isTesting, 
  currentTestIndex,
  onRunTest,
  onDownloadReport 
}: TestBenchProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const chartData = results.filter(r => r.status === 'completed').map(r => ({
    name: r.model.split('/').pop() || r.model,
    latency: r.latency,
    tokens: r.tokens,
    efficiency: r.latency > 0 ? (r.tokens / (r.latency / 1000)) : 0
  }));

  const totalProgress = selectedModels.length > 0 
    ? (results.filter(r => r.status === 'completed').length / selectedModels.length) * 100 
    : 0;

  return (
    <div className="flex-1 flex flex-col bg-gray-50/50 p-6 overflow-hidden">
      <div className="max-w-6xl mx-auto w-full flex flex-col h-full gap-6">
        
        {/* Header Controls */}
        <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <Boxes className="w-6 h-6 text-orange-500" />
              Model Battle Bench
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Sequential benchmarking across {selectedModels.length} selected models.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={onDownloadReport}
              disabled={results.length === 0 || isTesting}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export Report
            </Button>
            <Button 
              onClick={onRunTest}
              disabled={isTesting || selectedModels.length === 0}
              className="bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-200 gap-2 min-w-[140px]"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run Battle
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Progress Tracker */}
        {isTesting && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2 bg-white p-4 rounded-xl border border-orange-100"
          >
            <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-orange-600">
              <span>Overall Progress</span>
              <span>{Math.round(totalProgress)}%</span>
            </div>
            <Progress value={totalProgress} className="h-2 [&>div]:bg-orange-500" />
          </motion.div>
        )}

        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Models Queue */}
          <Card className="w-1/3 flex flex-col border-gray-100 shadow-sm">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-gray-400">Execution Queue</CardTitle>
            </CardHeader>
            <ScrollArea className="flex-1 px-2 pb-4">
              <div className="space-y-2">
                {selectedModels.map((modelId, idx) => {
                  const result = results.find(r => r.model === modelId);
                  const isCurrent = currentTestIndex === idx;
                  
                  return (
                    <div 
                      key={modelId}
                      className={cn(
                        "p-3 rounded-xl border transition-all flex items-center justify-between",
                        isCurrent ? "bg-orange-50 border-orange-200 ring-1 ring-orange-200" :
                        result?.status === 'completed' ? "bg-green-50/30 border-green-100" :
                        result?.status === 'error' ? "bg-red-50/30 border-red-100" :
                        "bg-white border-gray-100"
                      )}
                    >
                      <div className="flex flex-col gap-1 overflow-hidden">
                        <span className="text-xs font-bold truncate">{modelId.split('/').pop()}</span>
                        <span className="text-[10px] text-gray-400 truncate">{modelId}</span>
                      </div>
                      <div className="flex items-center gap-2">
                         {isCurrent ? (
                           <RefreshCw className="w-4 h-4 text-orange-500 animate-spin" />
                         ) : result?.status === 'completed' ? (
                           <CheckCircle2 className="w-4 h-4 text-green-500" />
                         ) : result?.status === 'error' ? (
                           <XCircle className="w-4 h-4 text-red-500" />
                         ) : (
                           <div className="w-4 h-4 rounded-full border border-gray-200" />
                         )}
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
              <TabsList className="bg-white border border-gray-100 w-fit mx-auto mb-2">
                <TabsTrigger value="overview" className="gap-2 text-xs uppercase tracking-widest font-bold">
                  <LayoutDashboard className="w-3 h-3" /> Overview
                </TabsTrigger>
                <TabsTrigger value="responses" className="gap-2 text-xs uppercase tracking-widest font-bold">
                  <Terminal className="w-3 h-3" /> Responses
                </TabsTrigger>
                <TabsTrigger value="metrics" className="gap-2 text-xs uppercase tracking-widest font-bold">
                  <Activity className="w-3 h-3" /> Rich Metrics
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="flex-1 mt-0 overflow-hidden">
                <div className="grid grid-cols-2 gap-4 h-full overflow-y-auto pr-2 pb-4">
                   <Card className="border-gray-100">
                     <CardHeader className="py-4">
                       <CardTitle className="text-xs font-bold uppercase tracking-widest text-gray-400">Latency (ms)</CardTitle>
                     </CardHeader>
                     <CardContent className="h-64">
                       <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={chartData}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                           <XAxis dataKey="name" fontSize={9} interval={0} tick={{ fill: '#9ca3af' }} />
                           <YAxis fontSize={9} tick={{ fill: '#9ca3af' }} />
                           <RechartsTooltip 
                             contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                           />
                           <Bar dataKey="latency" fill="#f87171" radius={[4, 4, 0, 0]} barSize={30} />
                         </BarChart>
                       </ResponsiveContainer>
                     </CardContent>
                   </Card>

                   <Card className="border-gray-100">
                     <CardHeader className="py-4">
                       <CardTitle className="text-xs font-bold uppercase tracking-widest text-gray-400">Token Efficiency (T/S)</CardTitle>
                     </CardHeader>
                     <CardContent className="h-64">
                       <ResponsiveContainer width="100%" height="100%">
                         <LineChart data={chartData}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                           <XAxis dataKey="name" fontSize={9} interval={0} tick={{ fill: '#9ca3af' }} />
                           <YAxis fontSize={9} tick={{ fill: '#9ca3af' }} />
                           <RechartsTooltip />
                           <Line type="monotone" dataKey="efficiency" stroke="#fb923c" strokeWidth={3} dot={{ fill: '#fb923c', r: 4 }} />
                         </LineChart>
                       </ResponsiveContainer>
                     </CardContent>
                   </Card>

                   <Card className="col-span-2 border-gray-100">
                     <CardContent className="p-4 grid grid-cols-4 gap-4">
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fastest</span>
                          <span className="text-lg font-bold text-green-500">
                            {chartData.length > 0 ? [...chartData].sort((a,b) => a.latency - b.latency)[0].name : "N/A"}
                          </span>
                        </div>
                        <div className="flex flex-col items-center border-l border-gray-100">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Most Efficient</span>
                          <span className="text-lg font-bold text-orange-500">
                            {chartData.length > 0 ? [...chartData].sort((a,b) => b.efficiency - a.efficiency)[0].name : "N/A"}
                          </span>
                        </div>
                        <div className="flex flex-col items-center border-l border-gray-100">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Tokens</span>
                          <span className="text-lg font-bold text-blue-500">
                            {results.reduce((acc, r) => acc + (r.tokens || 0), 0)}
                          </span>
                        </div>
                        <div className="flex flex-col items-center border-l border-gray-100">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Avg. Latency</span>
                          <span className="text-lg font-bold text-gray-700">
                            {chartData.length > 0 ? Math.round(chartData.reduce((acc, r) => acc + r.latency, 0) / chartData.length) : 0}ms
                          </span>
                        </div>
                     </CardContent>
                   </Card>
                </div>
              </TabsContent>

              <TabsContent value="responses" className="flex-1 mt-0 overflow-hidden">
                <ScrollArea className="h-full bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="space-y-6 p-6">
                    {results.filter(r => r.response || r.error).map(res => (
                      <div key={res.model} className="space-y-3">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-orange-500">{res.model}</Badge>
                            <span className="text-[10px] font-mono text-gray-400">{res.latency}ms</span>
                          </div>
                          <div className="flex items-center gap-4">
                             <div className="flex items-center gap-1 text-[10px] text-gray-400 uppercase font-bold tracking-widest">
                               <Zap className="w-3 h-3" /> {res.tokens} tk
                             </div>
                             <button className="text-gray-400 hover:text-orange-500"><Download className="w-3 h-3"/></button>
                          </div>
                        </div>
                        <div className={cn(
                          "p-4 rounded-xl text-xs leading-relaxed font-mono",
                          res.error ? "bg-red-50 text-red-600 border border-red-100" : "bg-gray-50 text-gray-700 border border-gray-100"
                        )}>
                          {res.error || res.response}
                        </div>
                      </div>
                    ))}
                    {results.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-4 opacity-50">
                        <Terminal className="w-12 h-12" />
                        <p className="text-sm font-medium">No results to display yet. Run a battle to begin.</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="metrics" className="flex-1 mt-0">
                 <div className="flex flex-col items-center justify-center h-full bg-white rounded-xl border border-gray-100 p-12 text-center gap-4">
                    <Activity className="w-12 h-12 text-blue-500 animate-pulse" />
                    <h3 className="text-lg font-bold">Advanced Comparison Logic</h3>
                    <p className="text-sm text-gray-500 max-w-sm">
                      Our system is calculating Cross-Model Semantic Similarity and Reasoning Depth scores. 
                      Run a multi-model test with "Mock Tools" enabled for deeper insights.
                    </p>
                    <div className="flex gap-2">
                       <Badge variant="secondary">Semantic Scorer</Badge>
                       <Badge variant="secondary">Logic Verification</Badge>
                       <Badge variant="secondary">Halo Effect Audit</Badge>
                    </div>
                 </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Footer Info */}
        <div className="bg-white px-6 py-3 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm">
           <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              Safe Queue Active • 2.0s Cooldown Enforced
           </div>
           <p className="text-[10px] text-gray-400 italic">
             Detailed diagnostic logs available in the export file.
           </p>
        </div>
      </div>
    </div>
  );
}

// Helper function for cn
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

// Add motion import from framer-motion as it's common
import { motion } from 'framer-motion';
