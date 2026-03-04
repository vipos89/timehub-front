'use client';

import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { BookingWidget } from './BookingWidget';
import { cn } from '@/lib/utils';

interface WidgetPreviewProps {
    settings: any;
    company: any;
    branches: any[];
    type: 'network' | 'branch' | 'master';
    branchId?: string;
    employeeId?: string;
}

export function WidgetPreview({ settings, company, branches, type, branchId, employeeId }: WidgetPreviewProps) {
    return (
        <div className="w-full h-full relative bg-neutral-50 overflow-hidden flex flex-col items-center justify-center p-4">
            {/* The "Phone" Container */}
            <div className="relative w-full h-full max-w-[375px] max-h-[700px] border-[8px] border-neutral-900 rounded-[3rem] bg-white shadow-2xl overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-neutral-900 rounded-b-2xl z-[70]" /> {/* Dynamic Island Notch */}
                
                {/* The Actual Widget Inside */}
                <BookingWidget 
                    company={company}
                    branches={branches}
                    employees={[]}
                    services={[]}
                    settings={settings}
                    isPreview={true}
                />

                {/* Floating Action Button (External Site Mockup Overlay) */}
                <div className={cn(
                    "absolute z-[100] transition-all duration-500",
                    settings.buttonPosition === 'bottom-right' ? "bottom-8 right-6" :
                    settings.buttonPosition === 'bottom-left' ? "bottom-8 left-6" :
                    settings.buttonPosition === 'top-right' ? "top-12 right-6" : "top-12 left-6"
                )}>
                    <Button 
                        className={cn(
                            "h-14 px-8 font-black text-base shadow-2xl transition-all pointer-events-none",
                            settings.buttonAnimation && settings.animationType
                        )}
                        style={{ 
                            backgroundColor: settings.accentColor, 
                            color: settings.buttonTextColor || (settings.accentColor === '#F5FF82' ? '#000' : '#fff'),
                            borderRadius: `${settings.borderRadius}px`
                        }}
                    >
                        {settings.buttonText || 'Записаться онлайн'}
                        <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
