import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type Step = 'home' | 'specialist' | 'services' | 'datetime' | 'profile' | 'success';

export function useBookingLogic({ initialEmployees = [], initialServices = [], stepsOrder, branch, slotStep = 30 }: any) {
    const [history, setHistory] = useState<Step[]>(['home']);
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [selectedServices, setSelectedServices] = useState<any[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<any>(null);
    const [viewedDate, setViewedDate] = useState<string>(new Date().toISOString().split('T')[0]);

    const currentView = history[history.length - 1] || 'home';

    const dateToFetch = selectedSlot ? selectedSlot.start_time.split('T')[0] : viewedDate;
    const allEmpIds = initialEmployees.map((e: any) => e.id).join(',');

    const { data: daySlots = [] } = useQuery({
        queryKey: ['daySlots', branch?.id, dateToFetch, allEmpIds, slotStep],
        queryFn: async () => {
            const tz = encodeURIComponent(branch?.timezone || 'Europe/Minsk');
            const res = await api.get(`/slots?employee_ids=${allEmpIds}&date=${dateToFetch}&duration=${slotStep}&step=${slotStep}&timezone=${tz}`);
            return res.data || [];
        },
        enabled: !!dateToFetch && initialEmployees.length > 0
    });

    const totalDuration = useMemo(() => {
        if (selectedServices.length === 0) return 30;
        return selectedServices.reduce((sum, s) => sum + (s.duration_minutes || 30), 0);
    }, [selectedServices]);

    const availableServices = useMemo(() => {
        let svcs = initialServices || [];
        if (selectedEmployee && selectedEmployee.id !== 'any') {
            svcs = svcs.filter((svc: any) =>
                !svc.employees || svc.employees.length === 0 ||
                svc.employees.some((es: any) => String(es.employee_id) === String(selectedEmployee.id))
            );
        }
        return svcs;
    }, [initialServices, selectedEmployee]);

    const employeesWithStatus = useMemo(() => {
        const slotsArray = Array.isArray(daySlots) ? daySlots : [];

        const validEmpIds = initialEmployees.filter((emp: any) =>
            selectedServices.every(svc => !svc.employees || svc.employees.some((es: any) => String(es.employee_id) === String(emp.id)))
        ).map((emp: any) => String(emp.id));

        const statusList = initialEmployees.map((emp: any) => {
            const providesAllServices = validEmpIds.includes(String(emp.id));

            // СТРОГАЯ ПРОВЕРКА СВОБОДНОГО ВРЕМЕНИ
            let isFreeAtSelectedTime = true;
            if (selectedSlot) {
                const targetTime = selectedSlot.start_time.substring(0, 16);
                const masterSlot = slotsArray.find((s: any) =>
                    String(s.employee_id) === String(emp.id) &&
                    s.start_time.substring(0, 16) === targetTime
                );
                // Мастер свободен, если у него есть слот на это время и его max_duration хватает на услуги
                isFreeAtSelectedTime = !!(masterSlot && masterSlot.max_duration >= totalDuration);
            }

            const nearestSlots = slotsArray
                .filter((s: any) => String(s.employee_id) === String(emp.id) && s.max_duration >= totalDuration)
                .sort((a, b) => a.start_time.localeCompare(b.start_time))
                .slice(0, 5);

            return {
                ...emp,
                // Мастер доступен только если делает услуги И свободен в выбранное время (если оно выбрано)
                canAcceptBooking: providesAllServices && isFreeAtSelectedTime && (selectedSlot ? true : nearestSlots.length > 0),
                nearestSlots,
                reason: !providesAllServices ? 'не делает услугу' : 'выходной или занят'
            };
        });

        const anyMasterSlots = slotsArray
            .filter((s: any) => validEmpIds.includes(String(s.employee_id)) && s.max_duration >= totalDuration)
            .filter((v, i, a) => a.findIndex(t => t.start_time === v.start_time) === i)
            .slice(0, 5);

        return [
            {
                id: 'any',
                name: 'Любой мастер',
                position: 'Назначим свободного',
                canAcceptBooking: anyMasterSlots.length > 0,
                nearestSlots: anyMasterSlots,
                reason: 'нет доступных мастеров'
            },
            ...statusList
        ];
    }, [initialEmployees, selectedServices, daySlots, totalDuration, selectedSlot]);

    const navigateTo = (step: Step) => setHistory(prev => [...prev, step]);
    const goBack = () => setHistory(prev => prev.length > 1 ? prev.slice(0, -1) : ['home']);

    const getNextStep = (current: Step) => {
        const idx = stepsOrder.indexOf(current);
        if (idx !== -1 && idx < stepsOrder.length - 1) return stepsOrder[idx + 1];
        return 'profile';
    };

    return {
        currentView, selectedEmployee, selectedServices, selectedSlot, viewedDate,
        employeesWithStatus, availableServices, totalDuration,
        totalPrice: selectedServices.reduce((sum, s) => sum + (s.price || 0), 0),
        navigateTo, goBack, getNextStep, setViewedDate,
        reset: () => {
            setSelectedEmployee(null); setSelectedServices([]); setSelectedSlot(null);
            setViewedDate(new Date().toISOString().split('T')[0]); setHistory(['home']);
        },
        getSvcDuration: (svc: any, empId: any) => {
            const override = svc.employees?.find((e: any) => String(e.employee_id) === String(empId));
            return override?.duration_minutes || svc.duration_minutes || 30;
        },
        getSvcPrice: (svc: any, empId: any) => {
            const override = svc.employees?.find((e: any) => String(e.employee_id) === String(empId));
            return override?.price || svc.price || 0;
        },
        handleSelectSpecialist: (emp: any) => {
            if (emp && !emp.canAcceptBooking) return;
            setSelectedEmployee(emp);
            setHistory(prev => [...prev, getNextStep(currentView as Step)]);
        },
        handleSelectSlot: (slot: any) => {
            setSelectedSlot(slot);
            if (slot) {
                setViewedDate(slot.start_time.split('T')[0]);
                const master = initialEmployees.find((e: any) => String(e.id) === String(slot.employee_id));
                if (master) setSelectedEmployee(master);
            }
            setHistory(prev => [...prev, getNextStep(currentView as Step)]);
        },
        handleSelectService: (svc: any) => {
            const exists = selectedServices.some(s => s.id === svc.id);
            setSelectedServices(exists ? selectedServices.filter(s => s.id !== svc.id) : [...selectedServices, svc]);
        }
    };
}