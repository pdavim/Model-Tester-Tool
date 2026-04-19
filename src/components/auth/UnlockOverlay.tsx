import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, ShieldAlert, Cpu, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';

export const UnlockOverlay: React.FC = () => {
  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(false);
  const setToken = useAuthStore(state => state.setToken);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || isVerifying) return;

    setIsVerifying(true);
    setError(false);

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      if (!response.ok) {
        throw new Error('Invalid terminal access code');
      }

      const { token } = await response.json();
      setToken(token);
      toast.success('Terminal Accessed', {
        description: 'Intelligence bridge established successfully.',
      });
    } catch (err) {
      setError(true);
      setPin('');
      toast.error('Access Denied', {
        description: 'The provided PIN is invalid or the system is locked.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-white">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gray-900/5 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative w-full max-w-lg px-6"
      >
        <div className="bg-white/40 backdrop-blur-2xl border border-gray-100/50 rounded-[3rem] p-12 shadow-2xl shadow-gray-200/50 text-center space-y-10">
          {/* Header Icon */}
          <div className="relative mx-auto w-24 h-24">
            <motion.div
              animate={error ? { x: [-2, 2, -2, 2, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="relative z-10 w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl shadow-xl flex items-center justify-center transform rotate-12"
            >
              {error ? (
                <ShieldAlert className="w-10 h-10 text-red-500" />
              ) : isVerifying ? (
                <Cpu className="w-10 h-10 text-orange-500 animate-spin" />
              ) : (
                <Lock className="w-10 h-10 text-white" />
              )}
            </motion.div>
            <div className="absolute inset-0 bg-orange-500/20 blur-2xl rounded-full scale-110 animate-pulse" />
          </div>

          {/* Titles */}
          <div className="space-y-3">
            <h1 className="text-4xl font-black tracking-tighter text-gray-900 uppercase">
              System <span className="text-orange-500">Locked</span>
            </h1>
            <p className="text-gray-500 font-medium text-sm leading-relaxed max-w-xs mx-auto">
              Terminal authentication required. Please enter your secure access PIN to proceed.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleUnlock} className="space-y-6">
            <div className="relative group">
              <Input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="ENTER ACCESS PIN"
                className={cn(
                  "h-16 rounded-2xl border-gray-100 bg-gray-50/50 text-center text-2xl font-black tracking-[1em] focus:ring-orange-500/10 transition-all placeholder:text-gray-300 placeholder:tracking-normal placeholder:text-xs",
                  error && "border-red-200 bg-red-50/30 text-red-600 focus:ring-red-500/10"
                )}
                autoFocus
                disabled={isVerifying}
              />
              <AnimatePresence>
                {pin.length > 0 && !isVerifying && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute right-3 top-3"
                  >
                    <Button 
                      type="submit" 
                      size="icon" 
                      className="w-10 h-10 rounded-xl bg-gray-900 hover:bg-orange-600 text-white shadow-lg transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center justify-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              Defense-In-Depth Protocol Active
            </p>
          </form>

          {/* Footer Disclaimer */}
          <div className="pt-4 border-t border-gray-50">
             <div className="flex items-center justify-center gap-6 text-[10px] font-black text-gray-300 uppercase tracking-widest">
                <span>AES-256</span>
                <span>SHA-384</span>
                <span>JWT-RS256</span>
             </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');
