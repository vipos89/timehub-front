'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, X, Calendar as CalendarIcon } from 'lucide-react';
import { BookingWidget } from './BookingWidget';
import { cn } from '@/lib/utils';

interface WidgetPreviewProps {
    settings: any;
    company: any;
    branches: any[];
    type: 'network' | 'branch' | 'master';
    branchId?: string;
    employeeId?: string;
    activeTab?: string; // We'll pass this from WidgetBuilder
}

export function WidgetPreview({ settings, company, branches, type, branchId, employeeId, activeTab }: WidgetPreviewProps) {
    const [isWidgetOpen, setIsWidgetOpen] = useState(false);

    // If we are on the 'button' tab, we should emphasize the floating button.
    // Otherwise, we show the widget as it would look when opened.
    const showOnlyButton = activeTab === 'button' && !isWidgetOpen;

    const fontStyles = {
        'Inter': "'Inter', sans-serif",
        'Montserrat': "'Montserrat', sans-serif",
        'Outfit': "'Outfit', sans-serif",
        'Playfair Display': "'Playfair Display', serif"
    };

    const bgPatternStyle = () => {
        switch(settings.bgPattern) {
            case 'dots': return 'radial-gradient(#000 1px, transparent 1px)';
            case 'grid': return 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)';
            case 'gradient': return 'linear-gradient(135deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0) 100%)';
            default: return 'none';
        }
    };

    return (
        <div className="w-full h-full relative bg-white overflow-hidden flex flex-col items-center justify-center p-4">
            {/* Background Pattern to simulate a website */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: bgPatternStyle(), backgroundSize: settings.bgPattern === 'grid' ? '40px 40px' : '32px 32px' }} />
            
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Montserrat:wght@400;700;900&family=Outfit:wght@400;700;900&family=Playfair+Display:wght@400;700;900&display=swap');
                @keyframes th-pulse { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0,0,0,0.2); } 70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(0,0,0,0); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0,0,0,0); } }
                @keyframes th-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px) rotate(-1deg); } 75% { transform: translateX(4px) rotate(1deg); } }
                @keyframes th-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
                @keyframes th-glow { 0%, 100% { filter: brightness(1) drop-shadow(0 0 5px currentColor); } 50% { filter: brightness(1.2) drop-shadow(0 0 20px currentColor); } }
                @keyframes th-bounce { 0%, 20%, 50%, 80%, 100% {transform: translateY(0);} 40% {transform: translateY(-20px);} 60% {transform: translateY(-10px);} }
                @keyframes th-swing { 20% { transform: rotate(15deg); } 40% { transform: rotate(-10deg); } 60% { transform: rotate(5deg); } 80% { transform: rotate(-5deg); } 100% { transform: rotate(0deg); } }
                @keyframes th-pop { 0% { transform: scale(1); } 50% { transform: scale(1.15); } 100% { transform: scale(1); } }
                .th-pulse { animation: th-pulse 2s infinite; } .th-shake { animation: th-shake 0.5s infinite; } .th-float { animation: th-float 3s ease-in-out infinite; } .th-glow { animation: th-glow 2s infinite; } .th-bounce { animation: th-bounce 2s infinite; } .th-swing { animation: th-swing 2s infinite; transform-origin: top center; } .th-pop { animation: th-pop 1s infinite; }
            `}</style>

            {/* The "Phone" Container */}
            <div className={cn(
                "relative w-full h-full max-w-[375px] max-h-[700px] border-[12px] border-neutral-900 rounded-[3.5rem] bg-white shadow-2xl transition-all duration-700 overflow-hidden",
                showOnlyButton ? "opacity-20 scale-95 grayscale" : "opacity-100 scale-100"
            )}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-neutral-900 rounded-b-3xl z-[70]" />
                
                <BookingWidget 
                    company={company}
                    branches={branches}
                    employees={[]} // Should ideally pass real ones if available
                    services={[]}
                    settings={settings}
                    isPreview={true}
                    onClose={() => setIsWidgetOpen(false)}
                />
            </div>

            {/* Floating Action Button - Only interactive when showOnlyButton or for testing */}
            <div className={cn(
                "absolute z-[100] transition-all duration-500",
                settings.buttonPosition === 'bottom-right' ? "bottom-12 right-12" :
                settings.buttonPosition === 'bottom-left' ? "bottom-12 left-12" :
                settings.buttonPosition === 'top-right' ? "top-12 right-12" : "top-12 left-12",
                !showOnlyButton && "pointer-events-none opacity-0 scale-50"
            )}>
                <div className="relative group cursor-pointer" onClick={() => setIsWidgetOpen(true)}>
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-[10px] font-black py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl uppercase tracking-widest">
                        Нажмите для теста
                    </div>
                    <Button 
                        className={cn(
                            "w-16 h-16 rounded-full p-0 flex items-center justify-center shadow-2xl transition-all",
                            settings.buttonAnimation && settings.animationType
                        )}
                        style={{ 
                            backgroundColor: settings.accentColor, 
                            color: settings.accentTextColor || (settings.accentColor === '#F5FF82' ? '#000' : '#fff')
                        }}
                    >
                        <CalendarIcon className="h-7 w-7" />
                    </Button>
                </div>
            </div>

            {/* Label for context */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-neutral-900/5 rounded-full border border-neutral-900/5 backdrop-blur-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
                    {showOnlyButton ? "Предпросмотр кнопки на сайте" : "Предпросмотр окна записи"}
                </p>
            </div>
        </div>
    );
}
