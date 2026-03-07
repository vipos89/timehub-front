import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type Step = 'home' | 'branches' | 'specialist' | 'services' | 'datetime' | 'profile' | 'success';

interface UseBookingLogicProps {
    initialEmployees: any[];
    initialServices: any[];
    stepsOrder: Step[];
    branch: any;
}

export function useBookingLogic({ initialEmployees = [], initialServices = [], stepsOrder, branch }: UseBookingLogicProps) {
    const [history, setHistory] = useState<Step[]>(['home']);
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [selectedServices, setSelectedServices] = useState<any[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<any>(null);
    const [viewedDate, setViewedDate] = useState<string>(new Date().toISOString().split('T')[0]);

    const currentView = history[history.length - 1] || 'home';

    const dateToFetch = selectedSlot ? selectedSlot.start_time.split('T')[0] : viewedDate;
    const allEmpIds = initialEmployees.map(e => e.id).join(',');

    const { data: daySlots, isLoading: isLoadingSlots } = useQuery({
        queryKey: ['daySlots', branch?.id, dateToFetch, allEmpIds],
        queryFn: async () => {
            const tz = encodeURIComponent(branch?.timezone || 'Europe/Minsk');
            const res = await api.get(`/slots?employee_ids=${allEmpIds}&date=${dateToFetch}&duration=30&step=30&timezone=${tz}`);
            return res.data || [];
        },
        enabled: !!dateToFetch && initialEmployees.length > 0
    });

    const getSvcDuration = useCallback((svc: any, empId: any) => {
        const override = svc.employees?.find((e: any) => String(e.employee_id) === String(empId));
        return override?.duration_minutes || svc.duration_minutes || 30;
    }, []);

    const getSvcPrice = useCallback((svc: any, empId: any) => {
        const override = svc.employees?.find((e: any) => String(e.employee_id) === String(empId));
        return override?.price || svc.price || 0;
    }, []);

    const totalDuration = useMemo(() => {
        if (selectedServices.length === 0) return 30;
        if (selectedEmployee && selectedEmployee.id !== 'any') {
            return selectedServices.reduce((sum, s) => sum + getSvcDuration(s, selectedEmployee.id), 0);
        }
        return selectedServices.reduce((sum, s) => sum + (s.duration_minutes || 30), 0);
    }, [selectedServices, selectedEmployee, getSvcDuration]);

    const totalPrice = useMemo(() => {
        const empId = (selectedEmployee && selectedEmployee.id !== 'any') ? selectedEmployee.id : selectedSlot?.employee_id;
        return selectedServices.reduce((sum, s) => sum + getSvcPrice(s, empId), 0);
    }, [selectedServices, selectedEmployee, selectedSlot, getSvcPrice]);

    const employeesWithStatus = useMemo(() => {
        const slotsArray = Array.isArray(daySlots) ? daySlots : [];

        // Список ID мастеров, которые МОГУТ оказать все выбранные услуги
        const validEmpIds = initialEmployees
            .filter(emp => selectedServices.every(svc =>
                !svc.employees || svc.employees.length === 0 ||
                svc.employees.some((es: any) => String(es.employee_id) === String(emp.id))
            ))
            .map(emp => String(emp.id));

        const statusList = initialEmployees.map(emp => {
            const providesAllServices = validEmpIds.includes(String(emp.id));

            let isFreeAtSelectedTime = true;
            if (selectedSlot) {
                const targetTime = selectedSlot.start_time.substring(0, 16);
                const masterSlot = slotsArray.find((s: any) =>
                    String(s.employee_id) === String(emp.id) &&
                    s.start_time.substring(0, 16) === targetTime
                );
                isFreeAtSelectedTime = !!(masterSlot && masterSlot.max_duration >= totalDuration);
            }

            const nearestSlots = slotsArray
                .filter((s: any) => String(s.employee_id) === String(emp.id) && s.max_duration >= totalDuration)
                .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time))
                .slice(0, 5);

            return {
                ...emp,
                canAcceptBooking: providesAllServices && (selectedSlot ? isFreeAtSelectedTime : nearestSlots.length > 0),
                nearestSlots,
                reason: !providesAllServices ? 'не делает услугу' : 'нет окон'
            };
        });

        // "Любой мастер" теперь учитывает только тех, кто в validEmpIds
        const anyMasterSlots = slotsArray
            .filter((s: any) => validEmpIds.includes(String(s.employee_id)) && s.max_duration >= totalDuration)
            .filter((v, i, a) => a.findIndex(t => t.start_time === v.start_time) === i)
            .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time))
            .slice(0, 5);

        const anyMaster = {
            id: 'any',
            name: 'Любой мастер',
            position: 'Назначим свободного',
            avatar_url: null,
            canAcceptBooking: anyMasterSlots.length > 0,
            nearestSlots: anyMasterSlots,
            reason: 'нет доступных мастеров'
        };

        return [anyMaster, ...statusList];
    }, [initialEmployees, selectedServices, selectedSlot, daySlots, totalDuration]);

    const availableServices = useMemo(() => {
        let svcs = initialServices;
        if (selectedEmployee && selectedEmployee.id !== 'any') {
            svcs = svcs.filter(svc =>
                !svc.employees || svc.employees.length === 0 ||
                svc.employees.some((es: any) => String(es.employee_id) === String(selectedEmployee.id))
            );
        }
        return svcs;
    }, [initialServices, selectedEmployee]);

    const navigateTo = (step: Step) => setHistory(prev => [...prev, step]);
    const goBack = () => setHistory(prev => prev.length > 1 ? prev.slice(0, -1) : ['home']);

    const reset = () => {
        setSelectedEmployee(null);
        setSelectedServices([]);
        setSelectedSlot(null);
        setViewedDate(new Date().toISOString().split('T')[0]);
        setHistory(['home']);
    };

    const getNextStep = (view: Step) => {
        const idx = stepsOrder.indexOf(view);
        return (idx !== -1 && idx < stepsOrder.length - 1) ? stepsOrder[idx + 1] : 'profile';
    };

    return {
        currentView, selectedEmployee, selectedServices, selectedSlot,
        employeesWithStatus, availableServices, totalDuration, totalPrice, isLoadingSlots,
        getSvcDuration, getSvcPrice, navigateTo, goBack, getNextStep, setViewedDate, reset,
        handleSelectService: (svc: any) => {
            const exists = selectedServices.some(s => s.id === svc.id);
            setSelectedServices(exists ? selectedServices.filter(s => s.id !== svc.id) : [...selectedServices, svc]);
        },
        handleSelectSpecialist: (emp: any) => {
            if (emp && !emp.canAcceptBooking) return;
            setSelectedEmployee(emp);
            if (emp && emp.id !== 'any' && selectedSlot) {
                const targetTime = selectedSlot.start_time.substring(0, 16);
                const slotsArray = Array.isArray(daySlots) ? daySlots : [];
                const newSlot = slotsArray.find((s: any) => String(s.employee_id) === String(emp.id) && s.start_time.substring(0, 16) === targetTime);
                if (newSlot) setSelectedSlot(newSlot);
            }
            navigateTo(getNextStep('specialist'));
        },
        handleSelectSlot: (slot: any) => {
            setSelectedSlot(slot);
            if (slot) setViewedDate(slot.start_time.split('T')[0]);
            const master = initialEmployees.find(e => String(e.id) === String(slot.employee_id));
            if (master) setSelectedEmployee(master);
            navigateTo(getNextStep('datetime'));
        }
    };
}