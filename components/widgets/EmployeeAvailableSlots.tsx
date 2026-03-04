'use client';

import { useMemo, useState } from 'react';
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
}

export function EmployeeAvailableSlots({ employeeIds, onSlotSelect, mode = 'full', duration = 30 }: EmployeeAvailableSlotsProps) {
    // Safely get timezone from branch context if available
    const timezone = useMemo(() => {
        try {
            // This hook might throw if used outside BranchProvider (public pages)
            const context = useBranch(); 
            if (!context) return 'UTC';
            const { branches, selectedBranchID } = context;
            const currentBranch = branches?.find(b => b.id.toString() === selectedBranchID);
            return (currentBranch as any)?.timezone || 'UTC';
        } catch (e) {
            return 'UTC';
        }
    }, []);

    const [selectedDate, setSelectedDate] = useState<string>(DateTime.now().setZone(timezone).toISODate()!);

    // 1. Fetch available dates
    const { data: availableDates = [] } = useQuery({
        queryKey: ['availableDates', employeeIds, duration, timezone],
        queryFn: async () => {
            const start = DateTime.now().setZone(timezone).toISODate();
            const end = DateTime.now().setZone(timezone).plus({ days: 60 }).toISODate();
            const res = await api.get(`/available-dates?employee_ids=${employeeIds}&duration=${duration}&start=${start}&end=${end}&timezone=${timezone}`);
            return (res.data || []);
        },
        enabled: !!employeeIds,
    });

    // 2. Fetch slots for the selected date
    const { data: slots = [], isLoading: isLoadingSlots } = useQuery({
        queryKey: ['slots', employeeIds, selectedDate, duration, timezone],
        queryFn: async () => {
            const res = await api.get(`/slots?employee_ids=${employeeIds}&date=${selectedDate}&duration=${duration}&timezone=${timezone}`);
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
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    }, [slots]);

    const firstAvailableDate = useMemo(() => {
        if (availableDates.length > 0) return availableDates[0].split('T')[0];
        return null;
    }, [availableDates]);

    const { data: compactSlots = [] } = useQuery({
        queryKey: ['compactSlots', employeeIds, firstAvailableDate, duration, timezone],
        queryFn: async () => {
            if (!firstAvailableDate) return [];
            const res = await api.get(`/slots?employee_ids=${employeeIds}&date=${firstAvailableDate}&duration=${duration}&timezone=${timezone}`);
            return res.data || [];
        },
        enabled: mode === 'compact' && !!firstAvailableDate
    });

    if (mode === 'compact') {
        if (!firstAvailableDate || compactSlots.length === 0) return null;
        return (
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
                {compactSlots.slice(0, 5).map((slot: any) => (
                    <button
                        key={slot.start_time}
                        onClick={(e) => { e.stopPropagation(); onSlotSelect(slot); }}
                        className="shrink-0 text-[10px] font-black bg-neutral-900 text-white rounded-lg px-2.5 py-1.5 transition-all active:scale-95"
                    >
                        {DateTime.fromISO(slot.start_time).toFormat('HH:mm')}
                    </button>
                ))}
                {compactSlots.length > 5 && (
                    <div className="shrink-0 text-[10px] font-black bg-neutral-100 text-neutral-400 rounded-lg px-2 py-1.5 flex items-center">
                        +{compactSlots.length - 5}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {Array.from({ length: 14 }).map((_, i) => {
                    const d = DateTime.now().setZone(timezone).plus({ days: i });
                    const dateStr = d.toISODate()!;
                    const isAvailable = availableDates.some((ad: string) => ad.startsWith(dateStr));
                    const isSelected = selectedDate === dateStr;
                    return (
                        <button
                            key={dateStr}
                            onClick={() => setSelectedDate(dateStr)}
                            className={cn(
                                "flex flex-col items-center justify-center min-w-[64px] h-20 rounded-2xl border-2 transition-all active:scale-95",
                                isSelected ? "bg-neutral-900 border-neutral-900 text-white shadow-xl" : "bg-white border-neutral-100 text-neutral-400 hover:border-neutral-200",
                                !isAvailable && !isSelected && "opacity-30 grayscale"
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
                    <h3 className="text-sm font-black uppercase tracking-widest text-neutral-900">Доступное время</h3>
                    <div className="text-[10px] font-bold text-neutral-400">{DateTime.fromISO(selectedDate).setLocale('ru').toFormat('d MMMM, cccc')}</div>
                </div>
                {isLoadingSlots ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-neutral-200" /></div> : sortedSlots.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                        {sortedSlots.map((slot: any) => (
                            <button key={slot.start_time} onClick={() => onSlotSelect(slot)} className="h-12 flex items-center justify-center rounded-xl bg-neutral-50 hover:bg-neutral-900 hover:text-white border border-neutral-100 font-bold text-sm transition-all">{DateTime.fromISO(slot.start_time).toFormat('HH:mm')}</button>
                        ))}
                    </div>
                ) : <div className="py-12 text-center bg-neutral-50 rounded-[2rem] border-2 border-dashed border-neutral-100"><p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Нет окон на эту дату</p></div>}
            </div>
        </div>
    );
}
