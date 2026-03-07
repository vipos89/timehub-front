'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { DateTime } from 'luxon';
import { cn } from '@/lib/utils';

interface Props {
    employeeIds: string | number;
    onSlotSelect: (slot: any) => void;
    duration?: number;
    step?: number;
    timezone?: string;
}

export function EmployeeAvailableSlots({ employeeIds, onSlotSelect, duration = 30, step = 30, timezone = 'Europe/Minsk' }: Props) {
    const [selectedDate, setSelectedDate] = useState<string>(DateTime.now().setZone(timezone).toISODate()!);

    // 1. Запрос доступных дат
    const { data: availableDates = [] } = useQuery({
        queryKey: ['availableDates', employeeIds, duration, step, timezone],
        queryFn: async () => {
            const start = DateTime.now().setZone(timezone).toISODate();
            const end = DateTime.now().setZone(timezone).plus({ days: 30 }).toISODate();
            const res = await api.get('/available-dates', { params: { employee_ids: employeeIds, duration, step, start, end, timezone } });
            return res.data || [];
        },
        enabled: !!employeeIds,
    });

    // 2. Запрос слотов для даты
    const { data: slots = [], isLoading: isLoadingSlots } = useQuery({
        queryKey: ['slots', employeeIds, selectedDate, duration, step, timezone],
        queryFn: async () => {
            const res = await api.get('/slots', { params: { employee_ids: employeeIds, date: selectedDate, duration, step, timezone } });
            return res.data || [];
        },
        enabled: !!employeeIds && !!selectedDate,
    });

    // 3. УДАЛЕНИЕ ДУБЛИКАТОВ (Главный фикс для image_505ccd.png)
    const uniqueSlots = useMemo(() => {
        const seen = new Set();
        return slots.filter((slot: any) => {
            const time = slot.start_time;
            if (seen.has(time)) return false;
            seen.add(time);
            return true;
        }).sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));
    }, [slots]);

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            {/* Календарь (остается без изменений) */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {Array.from({ length: 21 }).map((_, i) => {
                    const d = DateTime.now().setZone(timezone).plus({ days: i });
                    const dateStr = d.toISODate()!;
                    const isAvailable = availableDates.some((ad: string) => ad.startsWith(dateStr));
                    const isSelected = selectedDate === dateStr;

                    return (
                        <button key={dateStr} disabled={!isAvailable} onClick={() => setSelectedDate(dateStr)}
                                className={cn("flex flex-col items-center justify-center min-w-[64px] h-20 rounded-2xl border-2 transition-all", isSelected ? "bg-neutral-900 border-neutral-900 text-white shadow-lg scale-105 z-10" : "bg-white border-neutral-100 text-neutral-400 hover:border-neutral-200", !isAvailable && "opacity-20 cursor-not-allowed")}>
                            <span className="text-[10px] font-black uppercase mb-1">{d.setLocale('ru').toFormat('ccc')}</span>
                            <span className="text-xl font-bold">{d.toFormat('d')}</span>
                        </button>
                    );
                })}
            </div>

            {/* Сетка времени */}
            <div className="space-y-4">
                {isLoadingSlots ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-neutral-200" /></div> : uniqueSlots.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                        {uniqueSlots.map((slot: any) => (
                            <button key={slot.start_time} onClick={() => onSlotSelect(slot)} className="h-12 flex items-center justify-center rounded-xl bg-neutral-900 text-white font-black text-sm transition-all active:scale-95 shadow-sm hover:bg-black">
                                {DateTime.fromISO(slot.start_time).setZone(timezone).toFormat('HH:mm')}
                            </button>
                        ))}
                    </div>
                ) : <div className="py-12 text-center bg-neutral-50 rounded-[2rem] border-2 border-dashed border-neutral-100 italic"><p className="text-[10px] font-black text-neutral-300 uppercase tracking-[0.2em]">Нет свободного времени</p></div>}
            </div>
        </div>
    );
}