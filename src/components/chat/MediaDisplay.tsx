import React from 'react';
import { Play, Pause, Volume2, Grid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

export const AudioMessage: React.FC<{ url: string }> = ({ url }) => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (isPlaying) audioRef.current?.pause();
    else audioRef.current?.play();
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-4">
      <audio ref={audioRef} src={url} onTimeUpdate={() => setProgress(audioRef.current ? (audioRef.current.currentTime / audioRef.current.duration) * 100 : 0)} onEnded={() => setIsPlaying(false)} />
      <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full bg-white shadow-sm hover:shadow-md transition-all" onClick={togglePlay}>
        {isPlaying ? <Pause className="w-4 h-4 text-orange-500" /> : <Play className="w-4 h-4 text-orange-500 fill-orange-500" />}
      </Button>
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          <span>{isPlaying ? 'Playing Audio' : 'Audio Ready'}</span>
          <Volume2 className="w-3 h-3" />
        </div>
        <Slider value={[progress]} max={100} step={0.1} className="[&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:bg-orange-500" />
      </div>
    </div>
  );
};

export const VideoMessage: React.FC<{ url: string }> = ({ url }) => {
  return (
    <div className="mt-3 space-y-3">
      <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm bg-black aspect-video flex items-center justify-center relative group">
        <video src={url} controls className="w-full h-full" />
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <Badge className="bg-black/50 backdrop-blur-md border-none text-[10px]">4K GENERATED</Badge>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[1,2,3,4].map(i => (
          <div key={i} className="aspect-video bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
            <Grid className="w-4 h-4 text-gray-300" />
          </div>
        ))}
      </div>
    </div>
  );
};

import { Badge } from '@/components/ui/badge';
