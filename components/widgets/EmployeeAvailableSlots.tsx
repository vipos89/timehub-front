'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { DateTime } from 'luxon';

// This component fetches and displays the slots for the first available day for an employee
export function EmployeeAvailableSlots({ employeeId, onSlotSelect }: { employeeId: number, onSlotSelect: (slot: any) => void }) {
    // 1. Find the next available date for this employee
    const { data: nextDates = [], isLoading: isLoadingDates } = useQuery({
        queryKey: ['employeeNextDates', employeeId],
        queryFn: async () => {
            const start = DateTime.now().toISODate();
            const end = DateTime.now().plus({ days: 60 }).toISODate();
            const res = await api.get(`/available-dates?employee_ids=${employeeId}&duration=30&start=${start}&end=${end}`);
            return (res.data || []);
        },
        enabled: !!employeeId,
    });

    const firstDate = nextDates.length > 0 ? nextDates[0].split('T')[0] : null;

    // 2. Fetch slots for that single date
    const { data: firstDateSlots = [], isLoading: isLoadingSlots } = useQuery({
        queryKey: ['slotsForDate', employeeId, firstDate],
        queryFn: async () => {
            if (!firstDate) return [];
            const res = await api.get(`/slots?employee_ids=${employeeId}&date=${firstDate}&duration=30`);
            return res.data || [];
        },
        enabled: !!firstDate,
    });

    const upcomingSlots = useMemo(() => {
        return [...firstDateSlots]
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
            .slice(0, 10);
    }, [firstDateSlots]);

    const isLoading = isLoadingDates || isLoadingSlots;

    if (isLoading) {
        return <div className="flex justify-center py-2"><Loader2 className="h-5 w-5 animate-spin text-neutral-400" /></div>;
    }

    if (!firstDate || upcomingSlots.length === 0) {
        return <p className="text-[13px] text-neutral-400 py-2">Нет свободных окон</p>;
    }

    // Determine the date label
    const dt = DateTime.fromISO(firstDate).setLocale('ru');
    const today = DateTime.now().startOf('day');
    const tomorrow = today.plus({ days: 1 });
    const slotTargetDate = dt.startOf('day');

    let dateLabel = dt.toFormat('d MMMM');
    if (+slotTargetDate === +today) {
        dateLabel = 'сегодня';
    } else if (+slotTargetDate === +tomorrow) {
        dateLabel = 'завтра';
    }

    return (
        <div className="flex flex-col gap-3 py-1">
            <p className="text-[14px] text-neutral-500">
                Ближайшее время для записи <span className="font-bold text-neutral-900">{dateLabel}</span>:
            </p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {upcomingSlots.map((slot: any) => (
                    <button
                        key={slot.start_time}
                        onClick={(e) => { e.stopPropagation(); onSlotSelect(slot); }}
                        className="shrink-0 text-[15px] bg-neutral-100 text-neutral-900 rounded-xl px-4 py-2 hover:bg-neutral-200 transition-colors"
                    >
                        {DateTime.fromISO(slot.start_time).setLocale('ru').toFormat('H:mm')}
                    </button>
                ))}
            </div>
        </div>
    );
}
