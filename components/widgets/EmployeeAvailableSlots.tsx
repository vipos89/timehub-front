'use client';

import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Loader2, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { DateTime } from 'luxon';
import { cn } from '@/lib/utils';
import { useBranch } from '@/context/branch-context';

interface EmployeeAvailableSlotsProps {
    employeeIds: string | number;
    onSlotSelect: (slot: any) => void;
    mode?: 'compact' | 'full';
    duration?: number;
    step?: number;
    timezone?: string;
}

export function EmployeeAvailableSlots({ employeeIds, onSlotSelect, mode = 'full', duration = 30, step = 30, timezone: explicitTimezone }: EmployeeAvailableSlotsProps) {
    // Safely get timezone from branch context or prop
    const timezone = useMemo(() => {
        if (explicitTimezone) return explicitTimezone;
        try {
            const context = useBranch(); 
            if (!context) return 'UTC';
            const { branches, selectedBranchID } = context;
            const currentBranch = branches?.find(b => b.id.toString() === selectedBranchID);
            return (currentBranch as any)?.timezone || 'UTC';
        } catch (e) {
            return 'UTC';
        }
    }, [explicitTimezone]);

    const [selectedDate, setSelectedDate] = useState<string>(
        DateTime.now().setZone(timezone).toISODate() || DateTime.now().toISODate()!
    );

    // Sync selectedDate when timezone arrives (e.g. after delay in parent)
    useEffect(() => {
        if (timezone && timezone !== 'UTC') {
            setSelectedDate(DateTime.now().setZone(timezone).toISODate()!);
        }
    }, [timezone]);

    // 1. Fetch available dates
    const { data: availableDates = [], isLoading: isLoadingDates } = useQuery({
        queryKey: ['availableDates', employeeIds, duration, step, timezone],
        queryFn: async () => {
            const start = DateTime.now().setZone(timezone).toISODate();
            const end = DateTime.now().setZone(timezone).plus({ days: 60 }).toISODate();
            const res = await api.get('/available-dates', {
                params: {
                    employee_ids: employeeIds,
                    duration,
                    step,
                    start,
                    end,
                    timezone
                }
            });
            return (res.data || []);
        },
        enabled: !!employeeIds,
    });

    // 2. Fetch slots for the selected date
    const { data: slots = [], isLoading: isLoadingSlots } = useQuery({
        queryKey: ['slots', employeeIds, selectedDate, duration, step, timezone],
        queryFn: async () => {
            const res = await api.get('/slots', {
                params: {
                    employee_ids: employeeIds,
                    date: selectedDate,
                    duration,
                    step,
                    timezone
                }
            });
            return res.data || [];
        },
        enabled: !!employeeIds && !!selectedDate,
    });

    const sortedSlots = useMemo(() => {
        const seen = new Set();
        return [...slots]
            .filter(s => {
                const time = s.start_time;
                if (seen.has(time)) return false;
                seen.add(time);
                return true;
            })
            .sort((a, b) => DateTime.fromISO(a.start_time).toMillis() - DateTime.fromISO(b.start_time).toMillis());
    }, [slots]);

    const firstAvailableDate = useMemo(() => {
        if (availableDates.length > 0) return availableDates[0].split('T')[0];
        return null;
    }, [availableDates]);

    // Auto-select first available date if nothing is selected or today is not available
    useEffect(() => {
        if (availableDates.length > 0 && !availableDates.some((ad: string) => ad.startsWith(selectedDate))) {
            setSelectedDate(availableDates[0].split('T')[0]);
        }
    }, [availableDates]);

    if (mode === 'compact') {
        const { data: compactSlots = [] } = useQuery({
            queryKey: ['compactSlots', employeeIds, firstAvailableDate, duration, step, timezone],
            queryFn: async () => {
                if (!firstAvailableDate) return [];
                const res = await api.get('/slots', {
                    params: { employee_ids: employeeIds, date: firstAvailableDate, duration, step, timezone }
                });
                return res.data || [];
            },
            enabled: !!firstAvailableDate
        });

        if (!firstAvailableDate || compactSlots.length === 0) return null;
        return (
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
                {compactSlots.slice(0, 5).map((slot: any) => (
                    <button
                        key={slot.start_time}
                        onClick={(e) => { e.stopPropagation(); onSlotSelect(slot); }}
                        className="shrink-0 text-[10px] font-black bg-neutral-900 text-white rounded-lg px-2.5 py-1.5 transition-all active:scale-95"
                    >
                        {DateTime.fromISO(slot.start_time).setZone(timezone).toFormat('HH:mm')}
                    </button>
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {Array.from({ length: 30 }).map((_, i) => {
                    const d = DateTime.now().setZone(timezone).plus({ days: i });
                    const dateStr = d.toISODate()!;
                    const isAvailable = availableDates.some((ad: string) => ad.startsWith(dateStr));
                    const isSelected = selectedDate === dateStr;
                    
                    if (!isAvailable && !isSelected && i > 14) return null; // Show up to 14 days if not available, up to 30 if available

                    return (
                        <button
                            key={dateStr}
                            disabled={!isAvailable}
                            onClick={() => setSelectedDate(dateStr)}
                            className={cn(
                                "flex flex-col items-center justify-center min-w-[64px] h-20 rounded-2xl border-2 transition-all active:scale-95",
                                isSelected ? "bg-neutral-900 border-neutral-900 text-white shadow-xl scale-105 z-10" : "bg-white border-neutral-100 text-neutral-400 hover:border-neutral-200",
                                !isAvailable && "opacity-20 cursor-not-allowed grayscale"
                            )}
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest mb-1">{d.setLocale('ru').toFormat('ccc')}</span>
                            <span className="text-xl font-bold">{d.toFormat('d')}</span>
                        </button>
                    );
                })}
            </div>
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-black uppercase tracking-widest text-neutral-900 italic">Свободные окна</h3>
                    <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{DateTime.fromISO(selectedDate).setZone(timezone).setLocale('ru').toFormat('d MMMM, cccc')}</div>
                </div>
                {isLoadingSlots ? (
                    <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-neutral-200" /></div>
                ) : sortedSlots.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                        {sortedSlots.map((slot: any) => (
                            <button 
                                key={slot.start_time} 
                                onClick={() => onSlotSelect(slot)} 
                                className="h-12 flex items-center justify-center rounded-xl bg-neutral-900 text-white font-black text-sm transition-all active:scale-95 shadow-sm hover:bg-black"
                            >
                                {DateTime.fromISO(slot.start_time).setZone(timezone).toFormat('HH:mm')}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="py-12 text-center bg-neutral-50 rounded-[2rem] border-2 border-dashed border-neutral-100 italic">
                        <p className="text-[10px] font-black text-neutral-300 uppercase tracking-[0.2em]">Нет свободного времени</p>
                    </div>
                )}
            </div>
        </div>
    );
}
