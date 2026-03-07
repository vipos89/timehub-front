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

    const getNextStep = useCallback((current: Step) => {
        const idx = stepsOrder.indexOf(current);
        return (idx !== -1 && idx < stepsOrder.length - 1) ? (stepsOrder[idx + 1] as Step) : 'profile';
    }, [stepsOrder]);

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

    const { data: daySlots = [] } = useQuery({
        queryKey: ['daySlots', branch?.id, viewedDate, allEmpIds, slotStep],
        queryFn: async () => {
            const tz = encodeURIComponent(branch?.timezone || 'Europe/Minsk');
            const res = await api.get(`/slots?employee_ids=${allEmpIds}&date=${viewedDate}&duration=${slotStep}&step=${slotStep}&timezone=${tz}`);
            return res.data || [];
        },
        enabled: !!viewedDate && initialEmployees.length > 0
    });

    const { data: futureSlots = [] } = useQuery({
        queryKey: ['futureSlots', allEmpIds, viewedDate, slotStep, availableDates.length],
        queryFn: async () => {
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

    const checkEmployeeSkills = useCallback((empId: any, servicesToCheck = selectedServices) => {
        if (servicesToCheck.length === 0) return true;
        return servicesToCheck.every(svc =>
            !svc.employees || svc.employees.length === 0 ||
            svc.employees.some((es: any) => String(es.employee_id) === String(empId))
        );
    }, [selectedServices]);

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

    const resolveAnyMaster = useCallback((slot: any, services: any[]) => {
        if (!slot || services.length === 0) return false;
        const targetTime = slot.start_time.substring(0, 16);
        const allSlots = Array.isArray(daySlots) && Array.isArray(futureSlots) ? [...daySlots, ...futureSlots] : (Array.isArray(daySlots) ? daySlots : []);
        const bestMasterSlot = allSlots.find((s: any) =>
            s.start_time.substring(0, 16) === targetTime &&
            checkEmployeeSkills(s.employee_id, services) &&
            s.max_duration >= services.reduce((sum, svc) => sum + getSvcDuration(svc, s.employee_id), 0)
        );
        if (bestMasterSlot) {
            setSelectedEmployee(initialEmployees.find((e: any) => String(e.id) === String(bestMasterSlot.employee_id)));
            return true;
        }
        return false;
    }, [daySlots, futureSlots, initialEmployees, checkEmployeeSkills, getSvcDuration]);

    const isBookingReady = useMemo(() => {
        return selectedServices.length > 0 && !!selectedSlot && !!selectedEmployee && selectedEmployee.id !== 'any';
    }, [selectedServices, selectedSlot, selectedEmployee]);

    const employeesWithStatus = useMemo(() => {
        const currentSlotsArray = Array.isArray(daySlots) ? daySlots : [];
        const futureSlotsArray = Array.isArray(futureSlots) ? futureSlots : [];

        const statusList = initialEmployees.map((emp: any) => {
            const hasSkills = checkEmployeeSkills(emp.id);
            const neededDuration = calculateTotalDuration(emp.id);
            let activeSlots = currentSlotsArray.filter((s: any) => String(s.employee_id) === String(emp.id) && s.max_duration >= neededDuration).sort((a, b) => a.start_time.localeCompare(b.start_time));
            let dateLabel = 'сегодня';
            if (activeSlots.length === 0 && hasSkills) {
                const empFutureSlots = futureSlotsArray.filter((s: any) => String(s.employee_id) === String(emp.id) && s.max_duration >= neededDuration).sort((a, b) => a.start_time.localeCompare(b.start_time));
                if (empFutureSlots.length > 0) {
                    const firstDate = empFutureSlots[0].start_time.split('T')[0];
                    dateLabel = DateTime.fromISO(firstDate).setLocale('ru').toFormat('ccc, d MMM');
                    activeSlots = empFutureSlots.filter(s => s.start_time.startsWith(firstDate));
                }
            }
            return { ...emp, canAcceptBooking: hasSkills && activeSlots.length > 0, nearestSlots: activeSlots.slice(0, 5), displayDateLabel: dateLabel, reason: !hasSkills ? 'Не делает выбранное' : activeSlots.length === 0 ? 'Нет окон' : '' };
        });

        const validEmpIds = selectedServices.length > 0
            ? initialEmployees.filter((emp: any) => checkEmployeeSkills(emp.id)).map((emp: any) => String(emp.id))
            : initialEmployees.map((emp: any) => String(emp.id));

        let anySlots = currentSlotsArray.filter((s: any) => validEmpIds.includes(String(s.employee_id))).filter((v, i, a) => a.findIndex(t => t.start_time === v.start_time) === i).sort((a, b) => a.start_time.localeCompare(b.start_time));
        let anyDateLabel = 'сегодня';
        if (anySlots.length === 0) {
            const anyFutureSlots = futureSlotsArray.filter((s: any) => validEmpIds.includes(String(s.employee_id))).filter((v, i, a) => a.findIndex(t => t.start_time === v.start_time) === i).sort((a, b) => a.start_time.localeCompare(b.start_time));
            if (anyFutureSlots.length > 0) {
                const firstAnyDate = anyFutureSlots[0].start_time.split('T')[0];
                anyDateLabel = DateTime.fromISO(firstAnyDate).setLocale('ru').toFormat('ccc, d MMM');
                anySlots = anyFutureSlots.filter(s => s.start_time.startsWith(firstAnyDate));
            }
        }
        return [{ id: 'any', name: 'Любой мастер', position: 'Назначим свободного', canAcceptBooking: anySlots.length > 0, nearestSlots: anySlots.slice(0, 5), displayDateLabel: anyDateLabel, reason: anySlots.length === 0 ? 'Нет свободных' : '' }, ...statusList];
    }, [initialEmployees, selectedServices, daySlots, futureSlots, checkEmployeeSkills, calculateTotalDuration]);

    return {
        currentView, selectedEmployee, selectedServices, selectedSlot, viewedDate,
        employeesWithStatus, isBookingReady,
        availableServices: initialServices.map((svc: any) => {
            let canDo = true;
            if (selectedEmployee && selectedEmployee.id !== 'any') {
                if (!checkEmployeeSkills(selectedEmployee.id, [svc])) canDo = false;
            }
            return { ...svc, canDo, reason: !canDo ? `Мастер ${selectedEmployee?.name} не делает это` : '' };
        }),
        totalDuration: calculateTotalDuration(selectedEmployee?.id || selectedSlot?.employee_id),
        totalPrice: selectedServices.reduce((sum, s) => sum + getSvcPrice(s, selectedEmployee?.id || selectedSlot?.employee_id), 0),
        navigateTo: (step: Step) => setHistory(prev => [...prev, step]),
        goBack: () => setHistory(prev => prev.length > 1 ? prev.slice(0, -1) : ['home']),
        reset: () => { setSelectedEmployee(null); setSelectedServices([]); setSelectedSlot(null); setViewedDate(DateTime.now().toISODate()!); setHistory(['home']); },
        getSvcDuration, getSvcPrice, getNextStep, setViewedDate,

        handleSelectService: (svc: any) => {
            const exists = selectedServices.some(s => s.id === svc.id);
            const nextServices = exists ? selectedServices.filter(s => s.id !== svc.id) : [...selectedServices, svc];
            setSelectedServices(nextServices);

            if (selectedSlot) {
                if (selectedEmployee && selectedEmployee.id !== 'any') {
                    const newDuration = nextServices.reduce((sum, s) => sum + getSvcDuration(s, selectedEmployee.id), 0);
                    const masterCanDo = checkEmployeeSkills(selectedEmployee.id, nextServices);
                    if (!masterCanDo || selectedSlot.max_duration < newDuration) setSelectedSlot(null);
                } else {
                    const found = resolveAnyMaster(selectedSlot, nextServices);
                    if (!found && nextServices.length > 0) setSelectedSlot(null);
                }
            }
        },

        handleSelectSpecialist: (emp: any) => {
            if (emp && !emp.canAcceptBooking) return;

            if (emp.id === 'any' && selectedSlot && selectedServices.length > 0) {
                resolveAnyMaster(selectedSlot, selectedServices);
                setHistory(prev => [...prev, getNextStep(currentView as Step)]);
                return;
            }

            setSelectedEmployee(emp);

            if (selectedSlot && emp.id !== 'any') {
                const targetTime = selectedSlot.start_time.substring(0, 16);
                const allSlots = Array.isArray(daySlots) && Array.isArray(futureSlots) ? [...daySlots, ...futureSlots] : (Array.isArray(daySlots) ? daySlots : []);
                const newMasterSlot = allSlots.find((s: any) => String(s.employee_id) === String(emp.id) && s.start_time.substring(0, 16) === targetTime);
                if (newMasterSlot && newMasterSlot.max_duration >= calculateTotalDuration(emp.id)) {
                    setSelectedSlot(newMasterSlot);
                } else {
                    setSelectedSlot(null);
                }
            }
            setHistory(prev => [...prev, getNextStep(currentView as Step)]);
        },

        handleSelectSlot: (slot: any, forceEmployeeId?: string | number) => {
            setSelectedSlot(slot);
            if (slot) {
                const slotDate = slot.start_time.split('T')[0];
                if (slotDate !== viewedDate) setViewedDate(slotDate);

                if (forceEmployeeId && forceEmployeeId !== 'any') {
                    const master = initialEmployees.find((e: any) => String(e.id) === String(forceEmployeeId));
                    if (master) setSelectedEmployee(master);
                } else if (!selectedEmployee || selectedEmployee.id === 'any') {
                    if (selectedServices.length > 0) {
                        resolveAnyMaster(slot, selectedServices);
                    } else {
                        if (forceEmployeeId === 'any') setSelectedEmployee({ id: 'any', name: 'Любой мастер' });
                        else {
                            const master = initialEmployees.find((e: any) => String(e.id) === String(slot.employee_id));
                            if (master) setSelectedEmployee(master);
                        }
                    }
                } else {
                    if (!checkEmployeeSkills(selectedEmployee.id)) resolveAnyMaster(slot, selectedServices);
                }
            }
            if (slot) setHistory(prev => [...prev, getNextStep(currentView as Step)]);
        }
    };
}