'use client';

import { useState } from 'react';
import { 
    X, 
    ChevronRight, 
    Instagram, 
    Send, 
    Globe, 
    Phone, 
    MapPin, 
    Clock, 
    Smartphone,
    User
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WidgetPreviewProps {
    settings: {
        accentColor: string;
        buttonText: string;
        buttonTextColor: string;
        buttonPosition: string;
        buttonAnimation: boolean;
        animationType: string;
    };
}

export function WidgetPreview({ settings }: WidgetPreviewProps) {
    const [isOpen, setIsOpen] = useState(false);

    const getPositionStyles = () => {
        switch (settings.buttonPosition) {
            case 'bottom-left': return 'bottom-6 left-6';
            case 'top-right': return 'top-6 right-6';
            case 'top-left': return 'top-6 left-6';
            default: return 'bottom-6 right-6';
        }
    };

    const getAnimationClass = () => {
        if (!settings.buttonAnimation) return '';
        return settings.animationType || 'th-pulse';
    };

    return (
        <div className="relative w-full h-[550px] bg-neutral-100 rounded-[32px] border border-neutral-200 overflow-hidden shadow-inner flex items-center justify-center">
            {/* Background Hint */}
            <div className="absolute top-4 left-4 z-10">
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full border border-neutral-100">Предпросмотр</span>
            </div>

            {/* Mock Website Elements */}
            <div className="absolute inset-0 opacity-10 pointer-events-none select-none p-10 space-y-6">
                <div className="h-6 w-1/4 bg-neutral-400 rounded-full" />
                <div className="space-y-2">
                    <div className="h-3 w-full bg-neutral-300 rounded-full" />
                    <div className="h-3 w-full bg-neutral-300 rounded-full" />
                    <div className="h-3 w-2/3 bg-neutral-300 rounded-full" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="h-24 bg-neutral-300 rounded-2xl" />
                    <div className="h-24 bg-neutral-300 rounded-2xl" />
                </div>
            </div>

            {/* Floating Button Mock */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className={`absolute z-20 w-20 h-20 rounded-full shadow-2xl flex items-center justify-center text-center p-3 text-[11px] font-black leading-tight transition-all hover:scale-105 active:scale-95 ${getPositionStyles()} ${getAnimationClass()}`}
                    style={{ 
                        backgroundColor: settings.accentColor, 
                        color: settings.buttonTextColor || '#000',
                        boxShadow: `0 10px 30px -5px ${settings.accentColor}66`
                    }}
                >
                    {settings.buttonText || 'Записаться'}
                    
                    <style jsx>{`
                        @keyframes th-pulse { 0% { box-shadow: 0 0 0 0 ${settings.accentColor}66; } 70% { box-shadow: 0 0 0 15px ${settings.accentColor}00; } 100% { box-shadow: 0 0 0 0 ${settings.accentColor}00; } }
                        .th-pulse { animation: th-pulse 2s infinite; }
                        
                        @keyframes th-shake { 0%, 100% { transform: rotate(0); } 10%, 30%, 50%, 70%, 90% { transform: rotate(-5deg); } 20%, 40%, 60%, 80% { transform: rotate(5deg); } }
                        .th-shake { animation: th-shake 0.8s cubic-bezier(.36,.07,.19,.97) both infinite; }
                        
                        @keyframes th-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
                        .th-float { animation: th-float 3s ease-in-out infinite; }
                        
                        @keyframes th-glow { 0%, 100% { box-shadow: 0 8px 24px ${settings.accentColor}66; } 50% { box-shadow: 0 8px 40px ${settings.accentColor}; } }
                        .th-glow { animation: th-glow 2s ease-in-out infinite; }
                    `}</style>
                </button>
            )}

            {/* Modal Mockup */}
            {isOpen && (
                <div className="absolute inset-0 z-30 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-300">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" onClick={() => setIsOpen(false)} />
                    
                    <div className="relative w-full max-w-[340px] bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col h-[450px] border border-neutral-100 animate-in slide-in-from-bottom-4 duration-500">
                        {/* Header Mock */}
                        <div className="h-20 shrink-0 relative overflow-hidden flex items-center justify-center" style={{ backgroundColor: settings.accentColor }}>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="absolute top-3 right-3 h-7 w-7 rounded-full bg-black/10 flex items-center justify-center text-black"
                            >
                                <X className="h-4 w-4" />
                            </button>
                            <span className="font-black text-sm opacity-20 uppercase tracking-widest">TimeHub</span>
                        </div>

                        {/* Content Mock */}
                        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
                            <div className="space-y-4">
                                <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-xl bg-white border border-neutral-100 flex items-center justify-center text-neutral-400"><User className="h-5 w-5" /></div>
                                        <div className="flex flex-col"><span className="text-[9px] font-black uppercase text-neutral-400 leading-none mb-1">Шаг 1</span><span className="text-xs font-bold text-neutral-900">Выбор мастера</span></div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-neutral-300" />
                                </div>
                                <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-xl bg-white border border-neutral-100 flex items-center justify-center text-neutral-400"><Smartphone className="h-5 w-5" /></div>
                                        <div className="flex flex-col"><span className="text-[9px] font-black uppercase text-neutral-400 leading-none mb-1">Шаг 2</span><span className="text-xs font-bold text-neutral-900">Выбор услуг</span></div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-neutral-300" />
                                </div>
                            </div>
                        </div>

                        {/* Footer Mock */}
                        <div className="p-5 bg-white border-t border-neutral-50">
                            <Button 
                                className="w-full h-11 rounded-xl font-black text-xs shadow-lg"
                                style={{ backgroundColor: settings.accentColor, color: settings.buttonTextColor || '#000' }}
                            >
                                Начать запись
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
