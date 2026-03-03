'use client';

import { useState } from 'react';
import { 
    X, 
    ArrowLeft
} from 'lucide-react';
import { BookingWidget } from './BookingWidget';

interface WidgetPreviewProps {
    settings: any;
    isFullPreview?: boolean;
    branches?: any[];
}

export function WidgetPreview({ settings, isFullPreview, branches = [] }: WidgetPreviewProps) {
    const [isOpen, setIsOpen] = useState(isFullPreview ? true : false);

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

    const company = settings.company;
    const widgetType = settings.widgetType || 'branch';

    // Mock data for preview
    const mockEmployees = [
        { id: 1, name: 'Александр', position: 'Топ-стилист', avatar_url: '' },
        { id: 2, name: 'Мария', position: 'Мастер маникюра', avatar_url: '' }
    ];

    const mockServices = [
        { id: 1, name: 'Мужская стрижка', duration_minutes: 45, price: 40 },
        { id: 2, name: 'Стрижка бороды', duration_minutes: 30, price: 25 }
    ];

    return (
        <div className={`relative w-full h-full ${!isFullPreview ? 'min-h-[550px] bg-neutral-100 rounded-[32px] border border-neutral-200 overflow-hidden shadow-inner flex items-center justify-center' : ''}`}>
            {/* Background Hint for Dashboard List View */}
            {!isFullPreview && (
                <div className="absolute top-4 left-4 z-10 pointer-events-none">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full border border-neutral-100">Предпросмотр</span>
                </div>
            )}

            {/* Mock Website Elements (only in non-full preview) */}
            {!isFullPreview && (
                <div className="absolute inset-0 opacity-10 pointer-events-none select-none p-10 space-y-6">
                    <div className="h-6 w-1/4 bg-neutral-400 rounded-full" />
                    <div className="space-y-2">
                        <div className="h-3 w-full bg-neutral-300 rounded-full" />
                        <div className="h-3 w-full bg-neutral-300 rounded-full" />
                        <div className="h-3 w-2/3 bg-neutral-300 rounded-full" />
                    </div>
                </div>
            )}

            {/* Floating Launcher Button */}
            {!isOpen && !isFullPreview && (
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
                </button>
            )}

            {/* Widget Window Wrapper */}
            {(isOpen || isFullPreview) && (
                <div className={`${!isFullPreview ? 'absolute inset-0 z-30 flex items-center justify-center p-4' : 'w-full h-full flex flex-col'}`}>
                    {!isFullPreview && (
                        <div 
                            className="absolute inset-0 bg-black/20 backdrop-blur-[1px] cursor-pointer" 
                            onClick={() => setIsOpen(false)} 
                        />
                    )}
                    
                    <div 
                        className={`relative w-full ${!isFullPreview ? 'max-w-[375px] h-[600px] border shadow-2xl' : 'h-full'} overflow-hidden flex flex-col transition-all duration-300`}
                        style={{ 
                            borderRadius: !isFullPreview ? `${settings.borderRadius || 24}px` : '0px',
                            borderColor: settings.theme === 'dark' ? '#262626' : '#f5f5f5'
                        }}
                    >
                        {!isFullPreview && (
                            <button 
                                onClick={() => setIsOpen(false)} 
                                className="absolute top-6 right-6 h-10 w-10 rounded-full bg-black/10 flex items-center justify-center text-black z-[100] transition-all hover:bg-black/20"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        )}

                        <BookingWidget 
                            company={company}
                            branch={branches[0] || company?.branches?.[0]}
                            branches={branches.length > 0 ? branches : (company?.branches || [])}
                            employees={mockEmployees}
                            services={mockServices}
                            categories={[]}
                            settings={settings}
                            isPreview={true}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
