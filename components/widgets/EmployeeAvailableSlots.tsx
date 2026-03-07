'use client';

import { useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { DateTime } from 'luxon';
import { cn } from '@/lib/utils';

interface Props {
    employeeIds: string | number;
    onSlotSelect: (slot: any) => void;
    selectedDate: string;
    onDateChange: (date: string) => void;
    selectedSlotTime?: string; // Пропс для подсветки выбранного времени
    duration?: number;
    step?: number;
    timezone?: string;
}

export function EmployeeAvailableSlots({ employeeIds, onSlotSelect, selectedDate, onDateChange, selectedSlotTime, duration = 30, step = 30, timezone = 'Europe/Minsk' }: Props) {

    // ФИКС ПЕРЕКЛЮЧЕНИЯ КАЛЕНДАРЯ: Безопасное получение локальной даты с учетом часового пояса
    useEffect(() => {
        if (selectedSlotTime) {
            // Конвертируем сохраненное время в нужную таймзону и берем из нее дату
            const slotDateStr = DateTime.fromISO(selectedSlotTime).setZone(timezone).toISODate();
            if (slotDateStr && slotDateStr !== selectedDate) {
                onDateChange(slotDateStr);
            }
        }
    }, [selectedSlotTime, selectedDate, onDateChange, timezone]);

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

    const { data: slots = [], isLoading: isLoadingSlots } = useQuery({
        queryKey: ['slots', employeeIds, selectedDate, duration, step, timezone],
        queryFn: async () => {
            const res = await api.get('/slots', { params: { employee_ids: employeeIds, date: selectedDate, duration, step, timezone } });
            return res.data || [];
        },
        enabled: !!employeeIds && !!selectedDate,
    });

    const uniqueSlots = useMemo(() => {
        const seen = new Set();
        return slots.filter((slot: any) => {
            if (seen.has(slot.start_time)) return false;
            seen.add(slot.start_time);
            return true;
        }).sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));
    }, [slots]);

    return (
        <div className="flex flex-col gap-6 animate-in fade-in">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {Array.from({ length: 14 }).map((_, i) => {
                    const d = DateTime.now().setZone(timezone).plus({ days: i });
                    const dateStr = d.toISODate()!;
                    const isAvailable = availableDates.some((ad: string) => ad.startsWith(dateStr));
                    const isSelected = selectedDate === dateStr;
                    return (
                        <button key={dateStr} disabled={!isAvailable} onClick={() => onDateChange(dateStr)}
                                className={cn("flex flex-col items-center justify-center min-w-[64px] h-20 rounded-2xl border-2 transition-all", isSelected ? "bg-neutral-900 border-neutral-900 text-white shadow-lg scale-105 z-10" : "bg-white border-neutral-100 text-neutral-400 hover:border-neutral-200", !isAvailable && "opacity-20")}>
                            <span className="text-[10px] font-black uppercase mb-1">{d.setLocale('ru').toFormat('ccc')}</span>
                            <span className="text-xl font-bold">{d.toFormat('d')}</span>
                        </button>
                    );
                })}
            </div>
            <div className="space-y-4">
                {isLoadingSlots ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-neutral-200" /></div> : uniqueSlots.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                        {uniqueSlots.map((slot: any) => {
                            // ЖЕЛЕЗОБЕТОННЫЙ ФИКС ПОДСВЕТКИ:
                            // Конвертируем обе строки в абсолютные миллисекунды.
                            // Теперь 2026-03-09T15:45:00Z === 2026-03-09T18:45:00+03:00
                            const isSelected = !!selectedSlotTime &&
                                DateTime.fromISO(selectedSlotTime).toMillis() === DateTime.fromISO(slot.start_time).toMillis();

                            return (
                                <button key={slot.start_time} onClick={() => onSlotSelect(slot)}
                                        className={cn("h-12 flex items-center justify-center rounded-xl font-black text-sm active:scale-95 shadow-sm transition-colors", isSelected ? "bg-black text-white" : "bg-neutral-100 text-neutral-900 hover:bg-neutral-200")}>
                                    {DateTime.fromISO(slot.start_time).setZone(timezone).toFormat('HH:mm')}
                                </button>
                            );
                        })}
                    </div>
                ) : <div className="py-12 text-center bg-neutral-50 rounded-[2rem] border-2 border-dashed border-neutral-100 italic"><p className="text-[10px] font-black text-neutral-300 uppercase">Нет свободного времени</p></div>}
            </div>
        </div>
    );
}