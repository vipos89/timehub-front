import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DateTime } from 'luxon';

export type Step = 'home' | 'specialist' | 'services' | 'datetime' | 'profile' | 'success';

export function useBookingLogic({ initialEmployees = [], initialServices = [], stepsOrder, branch, slotStep = 30 }: any) {
    const [history, setHistory] = useState<Step[]>(['home']);
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [selectedServices, setSelectedServices] = useState<any[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<any>(null);
    const [viewedDate, setViewedDate] = useState<string>(DateTime.now().toISODate()!);

    const currentView = history[history.length - 1] || 'home';
    const allEmpIds = initialEmployees.map((e: any) => e.id).join(',');

    // 1. Запрос доступных дат (на месяц вперед)
    const { data: availableDates = [] } = useQuery({
        queryKey: ['availableDates', allEmpIds, slotStep],
        queryFn: async () => {
            const start = DateTime.now().toISODate();
            const end = DateTime.now().plus({ days: 30 }).toISODate();
            const res = await api.get('/available-dates', { params: { employee_ids: allEmpIds, start, end, duration: slotStep, step: slotStep } });
            return res.data || [];
        },
        enabled: initialEmployees.length > 0
    });

    // 2. Слоты на текущую выбранную дату
    const { data: daySlots = [] } = useQuery({
        queryKey: ['daySlots', branch?.id, viewedDate, allEmpIds, slotStep],
        queryFn: async () => {
            const tz = encodeURIComponent(branch?.timezone || 'Europe/Minsk');
            const res = await api.get(`/slots?employee_ids=${allEmpIds}&date=${viewedDate}&duration=${slotStep}&step=${slotStep}&timezone=${tz}`);
            return res.data || [];
        },
        enabled: !!viewedDate && initialEmployees.length > 0
    });

    // 3. Загрузка слотов для мастеров из будущего (УВЕЛИЧЕН ДИАПАЗОН ДО 10 ДНЕЙ)
    const { data: futureSlots = [] } = useQuery({
        queryKey: ['futureSlots', allEmpIds, viewedDate, slotStep, availableDates.length],
        queryFn: async () => {
            // Берем следующие 10 дат, чтобы перекрыть больничные и отгулы
            const nextDates = availableDates.filter((d: string) => d > viewedDate).slice(0, 10);
            if (nextDates.length === 0) return [];

            const promises = nextDates.map((date: string) =>
                api.get(`/slots`, { params: { employee_ids: allEmpIds, date, duration: slotStep, step: slotStep } })
            );
            const results = await Promise.all(promises);
            return results.flatMap(r => r.data || []);
        },
        enabled: availableDates.length > 0
    });

    // ХЕЛПЕРЫ (без изменений)
    const getSvcDuration = useCallback((svc: any, empId: any) => {
        const override = svc.employees?.find((e: any) => String(e.employee_id) === String(empId));
        return override?.duration_minutes || svc.duration_minutes || 30;
    }, []);

    const getSvcPrice = useCallback((svc: any, empId: any) => {
        const override = svc.employees?.find((e: any) => String(e.employee_id) === String(empId));
        return override?.price || svc.price || 0;
    }, []);

    const calculateTotalDuration = useCallback((empId: any) => {
        if (selectedServices.length === 0) return 30;
        return selectedServices.reduce((sum, s) => sum + getSvcDuration(s, empId), 0);
    }, [selectedServices, getSvcDuration]);

    const checkEmployeeSkills = useCallback((empId: any) => {
        if (selectedServices.length === 0) return true;
        return selectedServices.every(svc =>
            !svc.employees || svc.employees.length === 0 ||
            svc.employees.some((es: any) => String(es.employee_id) === String(empId))
        );
    }, [selectedServices]);

    const getNextStep = useCallback((current: Step) => {
        const idx = stepsOrder.indexOf(current);
        return (idx !== -1 && idx < stepsOrder.length - 1) ? stepsOrder[idx + 1] : 'profile';
    }, [stepsOrder]);

    // МАСТЕРА С ПРОВЕРКОЙ БЛИЖАЙШЕЙ ДАТЫ
    const employeesWithStatus = useMemo(() => {
        const currentSlotsArray = Array.isArray(daySlots) ? daySlots : [];
        const futureSlotsArray = Array.isArray(futureSlots) ? futureSlots : [];

        return initialEmployees.map((emp: any) => {
            const hasSkills = checkEmployeeSkills(emp.id);
            const neededDuration = calculateTotalDuration(emp.id);

            // 1. Слоты на сегодня
            let activeSlots = currentSlotsArray
                .filter((s: any) => String(s.employee_id) === String(emp.id) && s.max_duration >= neededDuration)
                .sort((a, b) => a.start_time.localeCompare(b.start_time));

            let dateLabel = 'сегодня';
            let reason = '';

            // 2. Если на сегодня нет, ищем в расширенном будущем (теперь найдем Пашу на 11.03)
            if (activeSlots.length === 0 && hasSkills) {
                const empFutureSlots = futureSlotsArray
                    .filter((s: any) => String(s.employee_id) === String(emp.id) && s.max_duration >= neededDuration)
                    .sort((a, b) => a.start_time.localeCompare(b.start_time));

                if (empFutureSlots.length > 0) {
                    const firstAvailableDate = empFutureSlots[0].start_time.split('T')[0];
                    dateLabel = DateTime.fromISO(firstAvailableDate).setLocale('ru').toFormat('ccc, d MMM');
                    activeSlots = empFutureSlots.filter(s => s.start_time.startsWith(firstAvailableDate));
                }
            }

            if (!hasSkills) {
                reason = 'Не оказывает выбранные услуги';
            } else if (activeSlots.length === 0) {
                reason = 'Нет свободных окон';
            }

            return {
                ...emp,
                canAcceptBooking: hasSkills && activeSlots.length > 0,
                nearestSlots: activeSlots.slice(0, 5),
                displayDateLabel: dateLabel,
                reason
            };
        });
    }, [initialEmployees, selectedServices, daySlots, futureSlots, checkEmployeeSkills, calculateTotalDuration, viewedDate]);

    return {
        currentView, selectedEmployee, selectedServices, selectedSlot, viewedDate,
        employeesWithStatus,
        availableServices: initialServices.map((svc: any) => {
            let reason = '';
            let canDo = true;
            if (selectedEmployee && selectedEmployee.id !== 'any') {
                const isPerformedByEmp = !svc.employees || svc.employees.length === 0 ||
                    svc.employees.some((e: any) => String(e.employee_id) === String(selectedEmployee.id));
                if (!isPerformedByEmp) { canDo = false; reason = `Мастер ${selectedEmployee.name} не делает это`; }
            }
            return { ...svc, canDo, reason };
        }),
        totalDuration: calculateTotalDuration(selectedEmployee?.id || selectedSlot?.employee_id),
        totalPrice: selectedServices.reduce((sum, s) => sum + getSvcPrice(s, selectedEmployee?.id || selectedSlot?.employee_id), 0),
        navigateTo: (step: Step) => setHistory(prev => [...prev, step]),
        goBack: () => setHistory(prev => prev.length > 1 ? prev.slice(0, -1) : ['home']),
        reset: () => { setSelectedEmployee(null); setSelectedServices([]); setSelectedSlot(null); setViewedDate(DateTime.now().toISODate()!); setHistory(['home']); },
        getSvcDuration, getSvcPrice, getNextStep, setViewedDate,
        handleSelectService: (svc: any) => {
            const exists = selectedServices.some(s => s.id === svc.id);
            setSelectedServices(exists ? selectedServices.filter(s => s.id !== svc.id) : [...selectedServices, svc]);
        },
        handleSelectSpecialist: (emp: any) => {
            if (emp && !emp.canAcceptBooking) return;
            setSelectedEmployee(emp);
            setHistory(prev => [...prev, getNextStep(currentView as Step)]);
        },
        handleSelectSlot: (slot: any) => {
            setSelectedSlot(slot);
            if (slot) {
                const slotDate = slot.start_time.split('T')[0];
                if (slotDate !== viewedDate) setViewedDate(slotDate);
                const master = initialEmployees.find(e => String(e.id) === String(slot.employee_id));
                if (master) setSelectedEmployee(master);
            }
            setHistory(prev => [...prev, getNextStep(currentView as Step)]);
        }
    };
}