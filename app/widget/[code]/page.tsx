'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueries } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { 
    Calendar as CalendarIcon, 
    Clock, 
    User, 
    Scissors, 
    CheckCircle2, 
    ChevronRight, 
    ChevronLeft,
    Instagram,
    Send,
    Globe,
    Smartphone,
    ArrowLeft,
    Info,
    Users,
    AlertCircle,
    Check,
    Phone,
    Star
} from 'lucide-react';
import { toast } from 'sonner';
import { DateTime } from 'luxon';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';

export default function WidgetPage() {
    const { code } = useParams();
    const searchParams = useSearchParams();
    
    // -- 1. STATE --
    const [view, setView] = useState<'home' | 'specialist' | 'services' | 'datetime' | 'profile' | 'success'>('home');
    const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [selectedServices, setSelectedServices] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<any>(null);
    const [clientData, setClientData] = useState({ name: '', phone: '', comment: '' });

    // -- 2. DATA QUERIES --
    
    const { data: widget, isLoading: isLoadingWidget } = useQuery({
        queryKey: ['widget', code],
        queryFn: async () => (await api.get(`/widgets/${code}`)).data,
        enabled: !!code
    });

    const settings = useMemo(() => {
        if (!widget?.settings) return { stepOrder: ['services', 'specialist', 'datetime'] };
        const s = typeof widget.settings === 'string' ? JSON.parse(widget.settings) : widget.settings;
        return { stepOrder: ['services', 'specialist', 'datetime'], ...s };
    }, [widget?.settings]);

    const activeBranchId = selectedBranchId || widget?.branch_id;

    const { data: company } = useQuery({
        queryKey: ['company', widget?.company_id],
        queryFn: async () => (await api.get(`/companies/${widget.company_id}`)).data,
        enabled: !!widget?.company_id
    });

    const { data: branch } = useQuery({
        queryKey: ['branch', activeBranchId],
        queryFn: async () => (await api.get(`/branches/${activeBranchId}`)).data,
        enabled: !!activeBranchId
    });

    const { data: allServices = [] } = useQuery({
        queryKey: ['services', activeBranchId],
        queryFn: async () => (await api.get(`/branches/${activeBranchId}/services`)).data,
        enabled: !!activeBranchId
    });

    const { data: categories = [] } = useQuery({
        queryKey: ['categories', activeBranchId],
        queryFn: async () => (await api.get(`/branches/${activeBranchId}/categories`)).data,
        enabled: !!activeBranchId
    });

    const { data: employees = [] } = useQuery({
        queryKey: ['employees', activeBranchId],
        queryFn: async () => (await api.get(`/employees?branch_id=${activeBranchId}`)).data,
        enabled: !!activeBranchId
    });

    const getEmployeeServiceDuration = (svc: any, empId: number) => {
        const empSvc = svc.employees?.find((e: any) => e.employee_id === empId);
        return empSvc?.duration_minutes || svc.duration_minutes || svc.duration || 0;
    };

    const getEmployeeServicePrice = (svc: any, empId: number) => {
        const empSvc = svc.employees?.find((e: any) => e.employee_id === empId);
        return empSvc?.price || svc.price || 0;
    };

    const totalDuration = useMemo(() => {
        if (selectedServices.length === 0) return 30; // default for empty state

        // If a specific employee is selected, use their exact durations
        if (selectedEmployee) {
            return selectedServices.reduce((sum, s) => sum + getEmployeeServiceDuration(s, selectedEmployee.id), 0);
        }

        // Otherwise, find the minimum duration among all eligible employees to ensure we fetch enough granular slots
        const minDurations = selectedServices.map(s => {
            let minDur = s.duration_minutes || s.duration || 9999;
            s.employees?.forEach((e: any) => {
                if (e.duration_minutes && e.duration_minutes < minDur) minDur = e.duration_minutes;
            });
            return minDur === 9999 ? 30 : minDur;
        });

        return minDurations.reduce((sum, dur) => sum + dur, 0) || 30;
    }, [selectedServices, selectedEmployee]);

    // -- 3. REACTIVE FILTERS (The Engine) --

    const eligibleEmployees = useMemo(() => {
        return employees.filter((emp: any) => {
            if (selectedServices.length === 0) return true;
            return selectedServices.every(svc => 
                svc.employees?.some((e: any) => e.employee_id === emp.id)
            );
        });
    }, [employees, selectedServices]);

    const activeEmployeeIds = useMemo(() => {
        if (selectedEmployee) return String(selectedEmployee.id);
        return eligibleEmployees.map((e: any) => e.id).join(',');
    }, [selectedEmployee, eligibleEmployees]);

    // NEW: Calendar Mask Query
    const { data: availableDates = [] } = useQuery({
        queryKey: ['available-dates', activeBranchId, activeEmployeeIds, totalDuration],
        queryFn: async () => {
            if (!activeEmployeeIds && employees.length === 0) return [];
            const start = DateTime.now().toISODate();
            const end = DateTime.now().plus({ months: 2 }).toISODate();
            const res = await api.get(`/available-dates?branch_id=${activeBranchId}&employee_ids=${activeEmployeeIds}&duration=${totalDuration || 30}&start=${start}&end=${end}`);
            return res.data ? res.data.map((d: string) => d.split('T')[0]) : [];
        },
        enabled: !!activeBranchId && employees.length > 0
    });

    // NEW: Slots query (Unified)
    const { data: availableSlots = [], isLoading: isLoadingSlots } = useQuery({
        queryKey: ['slots', activeEmployeeIds, selectedDate, totalDuration],
        queryFn: async () => {
            if (!selectedDate || !activeEmployeeIds) return [];
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const res = await api.get(`/slots?employee_ids=${activeEmployeeIds}&date=${dateStr}&duration=${totalDuration || 30}`);
            return (res.data || []).map((slot: any) => ({
                ...slot,
                start_time: slot.start_time.replace('Z', ''),
                end_time: slot.end_time.replace('Z', ''),
            }));
        },
        enabled: !!activeBranchId && !!selectedDate && !!activeEmployeeIds
    });

    // -- 3. REACTIVE FILTERS (The Engine) --

    const isEmployeeCompatible = (emp: any) => {
        // 1. Service compatibility
        const providesServices = selectedServices.length === 0 || selectedServices.every(svc => 
            svc.employees?.some((e: any) => e.employee_id === emp.id)
        );
        if (!providesServices) return false;

        // 2. Schedule compatibility
        if (selectedSlot) {
            const hasExactSlot = availableSlots.some((slot: any) => 
                slot.employee_id === emp.id && 
                slot.start_time === selectedSlot.start_time && 
                (slot.max_duration || 0) >= totalDuration
            );
            if (!hasExactSlot) return false;
        } else if (selectedDate && availableSlots.length > 0) {
            const hasAnySlot = availableSlots.some((slot: any) => slot.employee_id === emp.id);
            if (!hasAnySlot) return false;
        } else if (selectedDate && !isLoadingSlots && availableSlots.length === 0) {
            return false;
        }

        return true;
    };

    const isServiceCompatible = (svc: any) => {
        // 1. Employee compatibility
        if (selectedEmployee) {
            const provides = svc.employees?.some((e: any) => e.employee_id === selectedEmployee.id);
            if (!provides) return false;
        }

        const isSelected = selectedServices.some(s => s.id === svc.id);
        
        // Use employee-specific duration if selected, else base/minimum duration logic
        const svcDuration = selectedEmployee 
            ? getEmployeeServiceDuration(svc, selectedEmployee.id)
            : (svc.duration_minutes || svc.duration || 0);

        const newDuration = isSelected ? totalDuration - svcDuration : totalDuration + svcDuration;

        // 2. Schedule compatibility (if Date/Slot locked in)
        if (selectedSlot) {
            const max = selectedSlot.max_duration || 0;
            if (newDuration > max) return false;
        } else if (selectedDate && !isLoadingSlots && availableSlots.length > 0) {
            const canAccommodate = availableSlots.some((s: any) => (s.max_duration || 0) >= newDuration);
            if (!canAccommodate) return false;
        } else if (selectedDate && !isLoadingSlots && availableSlots.length === 0) {
            return false;
        }

        return true;
    };

    const isDateCompatible = (date: Date) => {
        const dStr = format(date, 'yyyy-MM-dd');
        return availableDates.includes(dStr);
    };

    const filteredEmployees = useMemo(() => employees.filter(isEmployeeCompatible), [employees, selectedServices]);
    const filteredServices = useMemo(() => allServices.filter(isServiceCompatible), [allServices, selectedEmployee]);

    const groupedServices = useMemo(() => {
        const groups: any[] = [];
        const catIds = new Set();
        categories.forEach((cat: any) => {
            const svcs = (cat.services || []).filter((s: any) => allServices.some((as: any) => as.id === s.id));
            if (svcs.length > 0) {
                groups.push({ id: cat.id, name: cat.name, services: svcs });
                svcs.forEach((s: any) => catIds.add(s.id));
            }
        });
        const other = allServices.filter((s: any) => !catIds.has(s.id));
        if (other.length > 0) groups.push({ id: 'other', name: 'Услуги', services: other });
        return groups;
    }, [categories, allServices]);

    // -- 4. HANDLERS --

    const handleSelectSpecialist = (emp: any) => { 
        setSelectedEmployee(emp); 
        setView('home'); 
    };

    const handleSelectService = (svc: any) => {
        const isSelected = selectedServices.some(s => s.id === svc.id);
        const newSelection = isSelected 
            ? selectedServices.filter(s => s.id !== svc.id) 
            : [...selectedServices, svc];
        
        setSelectedServices(newSelection);
    };

    const handleSelectSlot = (slot: any) => { setSelectedSlot(slot); setView('home'); };

    const bookingMutation = useMutation({
        mutationFn: (data: any) => api.post('/bookings', data),
        onSuccess: () => setView('success'),
        onError: () => toast.error('Ошибка при бронировании')
    });

    const handleFinalBooking = async () => {
        if (!clientData.name || !clientData.phone || !selectedSlot) return;
        const empId = selectedEmployee?.id || selectedSlot.employee_id;
        
        // Calculate the exact end time based on the employee's specific duration
        // Strip the Z/timezone to parse as local exact string without offset shifts
        const formattedStartTime = selectedSlot.start_time.slice(0, 19);
        const exactDuration = selectedServices.reduce((sum, s) => sum + getEmployeeServiceDuration(s, empId), 0) || 30;
        const exactEndTime = DateTime.fromISO(formattedStartTime).plus({ minutes: exactDuration }).toFormat("yyyy-MM-dd'T'HH:mm:ss");

        try {
            const customerRes = await api.post('/customers', { company_id: widget.company_id, branch_id: activeBranchId, first_name: clientData.name, phone: clientData.phone });
            bookingMutation.mutate({
                company_id: widget.company_id,
                employee_id: empId,
                start_time: formattedStartTime,
                end_time: exactEndTime, // Send exact end time based on employee
                client_id: customerRes.data.id,
                total_price: selectedServices.reduce((sum, s) => sum + getEmployeeServicePrice(s, empId), 0),
                services: selectedServices.map(s => ({ 
                    service_id: s.id, 
                    price: getEmployeeServicePrice(s, empId), 
                    duration_minutes: getEmployeeServiceDuration(s, empId) 
                }))
            });
        } catch (e) { toast.error('Ошибка связи'); }
    };

    if (isLoadingWidget) return <div className="min-h-screen flex items-center justify-center bg-white"><div className="animate-spin h-8 w-8 border-4 border-neutral-900 border-t-transparent rounded-full" /></div>;

    const accentColor = settings.accentColor || '#F5FF82';
    const socialLinks = company?.social_links ? (typeof company.social_links === 'string' ? JSON.parse(company.social_links) : company.social_links) : {};

    // Helper for "No Timezone Conversion" formatting
    const displayTime = (iso: string) => iso ? iso.slice(11, 16) : '';
    const displayDateFull = (iso: string) => iso ? format(new Date(iso), 'd MMMM', { locale: ru }) : '';

    return (
        <div className="max-w-md mx-auto min-h-screen flex flex-col bg-white">
            <div className="h-32 shrink-0 relative overflow-hidden" style={{ backgroundColor: accentColor }}>
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '16px 12px' }} />
                {view !== 'home' && view !== 'success' && (
                    <button onClick={() => setView('home')} className="absolute top-6 left-6 h-10 w-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-black z-20"><ArrowLeft className="h-5 w-5" /></button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-32 -mt-12 relative z-10 bg-white rounded-t-[40px] custom-scrollbar">
                {view === 'home' && (
                    <div className="pt-0 space-y-8 animate-in fade-in duration-500">
                        <div className="bg-white rounded-[32px] p-6 shadow-xl border border-neutral-50 flex flex-col items-center text-center space-y-4">
                            <Avatar className="h-24 w-24 border-4 border-white shadow-lg -mt-20"><AvatarImage src={company?.logo_url} /><AvatarFallback className="bg-neutral-900 text-white font-black text-2xl">{company?.name?.[0]}</AvatarFallback></Avatar>
                            <div className="space-y-1"><h1 className="font-black text-2xl text-neutral-900 leading-tight">{company?.name || branch?.name}</h1><p className="text-sm text-neutral-500 font-medium px-4">{company?.description || 'Онлайн-запись'}</p></div>
                            <div className="flex gap-3 justify-center w-full">
                                {socialLinks.instagram && <a href={`https://instagram.com/${socialLinks.instagram}`} target="_blank" className="h-11 w-11 rounded-2xl bg-neutral-50 flex items-center justify-center text-neutral-400 border border-neutral-100"><Instagram className="h-5 w-5" /></a>}
                                {socialLinks.telegram && <a href={`https://t.me/${socialLinks.telegram}`} target="_blank" className="h-11 w-11 rounded-2xl bg-neutral-50 flex items-center justify-center text-neutral-400 border border-neutral-100"><Send className="h-5 w-5" /></a>}
                                {company?.website && <a href={company.website} target="_blank" className="h-11 w-11 rounded-2xl bg-neutral-50 flex items-center justify-center text-neutral-400 border border-neutral-100"><Globe className="h-5 w-5" /></a>}
                            </div>
                        </div>

                        <div className="space-y-3">
                            {settings.stepOrder.map((step: string) => {
                                if (step === 'specialist') return (
                                    <div key={step} onClick={() => setView('specialist')} className="p-5 bg-neutral-50 rounded-[28px] border border-neutral-100 flex items-center justify-between cursor-pointer hover:bg-white transition-all shadow-sm">
                                        <div className="flex items-center gap-4"><div className="h-12 w-12 rounded-2xl bg-white border border-neutral-100 flex items-center justify-center text-neutral-900 shadow-sm"><User className="h-6 w-6" /></div><div className="flex flex-col"><span className="text-[10px] font-black uppercase text-neutral-400 mb-1">Специалист</span><span className="text-lg font-bold text-neutral-900 leading-tight">{selectedEmployee?.name || 'Любой специалист'}</span></div></div>
                                        <ChevronRight className="h-5 w-5 text-neutral-300" />
                                    </div>
                                );
                                if (step === 'services') return (
                                    <div key={step} onClick={() => setView('services')} className="p-5 bg-neutral-50 rounded-[28px] border border-neutral-100 flex items-center justify-between cursor-pointer hover:bg-white transition-all shadow-sm">
                                        <div className="flex items-center gap-4"><div className="h-12 w-12 rounded-2xl bg-white border border-neutral-100 flex items-center justify-center text-neutral-900 shadow-sm"><Scissors className="h-6 w-6" /></div><div className="flex flex-col"><span className="text-[10px] font-black uppercase text-neutral-400 mb-1">Услуги</span><span className="text-lg font-bold text-neutral-900">{selectedServices.length > 0 ? `${selectedServices.length} выбрано` : 'Выбрать услуги'}</span></div></div>
                                        <ChevronRight className="h-5 w-5 text-neutral-300" />
                                    </div>
                                );
                                if (step === 'datetime') return (
                                    <div key={step} onClick={() => setView('datetime')} className="p-5 bg-neutral-50 rounded-[28px] border border-neutral-100 flex items-center justify-between cursor-pointer hover:bg-white transition-all shadow-sm">
                                        <div className="flex items-center gap-4"><div className="h-12 w-12 rounded-2xl bg-white border border-neutral-100 flex items-center justify-center text-neutral-900 shadow-sm"><CalendarIcon className="h-6 w-6" /></div><div className="flex flex-col"><span className="text-[10px] font-black uppercase text-neutral-400 mb-1">Дата и время</span><span className="text-lg font-bold text-neutral-900">{selectedSlot ? `${displayDateFull(selectedSlot.start_time)}, ${displayTime(selectedSlot.start_time)}` : (selectedDate ? format(selectedDate, 'd MMMM', { locale: ru }) : 'Выбрать дату')}</span></div></div>
                                        <ChevronRight className="h-5 w-5 text-neutral-300" />
                                    </div>
                                );
                                return null;
                            })}
                        </div>
                    </div>
                )}

                {view === 'specialist' && (
                    <div className="space-y-6 pt-4 animate-in slide-in-from-right-4">
                        <h2 className="text-2xl font-black tracking-tight">Специалисты</h2>
                        <div className="grid grid-cols-1 gap-3">
                            <Card className={`cursor-pointer rounded-3xl transition-all border-2 ${!selectedEmployee ? 'border-black bg-neutral-50 shadow-lg' : 'border-neutral-100 bg-white'}`} onClick={() => handleSelectSpecialist(null)}>
                                <CardContent className="p-4 flex items-center gap-4"><div className="h-16 w-16 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400"><Users className="h-8 w-8" /></div><div className="flex-1"><h3 className="font-bold text-lg leading-tight">Любой специалист</h3><p className="text-[10px] text-neutral-400 font-black uppercase">Все доступные окна</p></div><ChevronRight className="h-5 w-5 text-neutral-300" /></CardContent>
                            </Card>
                            {employees.map((emp: any) => {
                                const isAvailable = isEmployeeCompatible(emp);
                                return (
                                    <Card key={emp.id} className={`cursor-pointer rounded-3xl transition-all border-2 ${selectedEmployee?.id === emp.id ? 'border-black bg-neutral-50 shadow-lg' : isAvailable ? 'border-neutral-100 bg-white' : 'opacity-40 grayscale border-neutral-50'}`} onClick={() => {
                                        if (!isAvailable) {
                                            toast.error('Мастер недоступен', { description: 'Свободные слоты не позволяют выбрать этого мастера' });
                                            return;
                                        }
                                        handleSelectSpecialist(emp);
                                    }}>
                                        <CardContent className="p-4 flex items-center gap-4"><Avatar className="h-16 w-16 border-2 border-white shadow-md"><AvatarImage src={emp.avatar_url} /><AvatarFallback className="bg-neutral-100 font-bold">{emp.name[0]}</AvatarFallback></Avatar>
                                        <div className="flex-1"><h3 className="font-bold text-lg leading-tight truncate">{emp.name}</h3><p className="text-[10px] text-neutral-400 font-black uppercase">{emp.position || 'Специалист'}</p></div><ChevronRight className="h-5 w-5 text-neutral-300" /></CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                )}

                {view === 'services' && (
                    <div className="space-y-6 pt-4 animate-in slide-in-from-right-4">
                        <div className="flex items-center justify-between"><h2 className="text-2xl font-black tracking-tight">Услуги</h2>{selectedServices.length > 0 && <Badge className="bg-black text-white rounded-full">{selectedServices.length}</Badge>}</div>
                        <div className="space-y-4">
                            {groupedServices.map((group: any) => (
                                <div key={group.id} className="space-y-2">
                                    <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-2">{group.name}</h3>
                                    <div className="grid gap-2">
                                        {group.services?.map((svc: any) => {
                                            const isSelected = selectedServices.some(s => s.id === svc.id);
                                            const isAvailable = isServiceCompatible(svc);
                                            return (
                                                <div key={svc.id} onClick={() => {
                                                    if (!isAvailable && !isSelected) {
                                                        const provides = !selectedEmployee || svc.employees?.some((e: any) => e.employee_id === selectedEmployee.id);
                                                        if (!provides) {
                                                            toast.error('Мастер не оказывает', { description: 'Выбранный специалист не предоставляет эту услугу' });
                                                        } else {
                                                            toast.error('Ограничение по времени', { description: 'Свободные слоты не позволяют добавить эту услугу' });
                                                        }
                                                        return;
                                                    }
                                                    handleSelectService(svc);
                                                }} className={`p-5 rounded-[28px] border-2 transition-all flex items-center justify-between cursor-pointer ${isSelected ? 'border-black bg-neutral-50 shadow-md' : isAvailable ? 'border-neutral-100 bg-white' : 'opacity-40 grayscale border-neutral-50'}`}>
                                                    <div className="flex flex-col gap-1 pr-4"><span className="font-bold text-neutral-900 leading-tight">{svc.name}</span><span className="text-[10px] font-black uppercase text-neutral-400">{getEmployeeServiceDuration(svc, selectedEmployee?.id || 0) || svc.duration_minutes || svc.duration || 0} мин</span></div>
                                                    <div className="flex items-center gap-4"><span className="font-black text-neutral-900">{getEmployeeServicePrice(svc, selectedEmployee?.id || 0) || svc.price || 0} BYN</span><div className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center ${isSelected ? 'bg-black border-black text-white' : 'border-neutral-200'}`}>{isSelected && <Check className="h-3.5 w-3.5" />}</div></div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button className="w-full h-14 rounded-2xl font-black bg-black text-white shadow-xl" onClick={() => setView('home')}>Готово</Button>
                    </div>
                )}

                {view === 'datetime' && (
                    <div className="space-y-6 pt-4 animate-in slide-in-from-right-4">
                        <h2 className="text-2xl font-black tracking-tight">Дата и время</h2>
                        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                            {[...Array(21)].map((_, i) => {
                                const date = DateTime.now().plus({ days: i }).toJSDate();
                                const active = selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
                                const isAvailable = isDateCompatible(date);
                                return (
                                    <button key={i} disabled={!isAvailable} className={`shrink-0 w-16 h-20 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${active ? 'border-black bg-neutral-900 text-white shadow-lg scale-105' : isAvailable ? 'border-neutral-100 bg-white hover:border-neutral-300' : 'opacity-20 grayscale border-neutral-50 cursor-not-allowed'}`} onClick={() => setSelectedDate(date)}><span className={`text-[10px] font-black uppercase ${active ? 'text-white/50' : 'text-neutral-400'}`}>{format(date, 'ccc', { locale: ru })}</span><span className="text-lg font-black">{format(date, 'd')}</span></button>
                                );
                            })}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {availableSlots.map((slot: any, i: number) => (
                                <button key={i} className={`h-12 rounded-xl border-2 font-bold text-sm transition-all ${selectedSlot?.start_time === slot.start_time ? 'border-black bg-black text-white' : 'border-neutral-100 bg-neutral-50 hover:border-neutral-300'}`} onClick={() => handleSelectSlot(slot)}>{displayTime(slot.start_time)}</button>
                            ))}
                            {availableSlots.length === 0 && !isLoadingSlots && selectedDate && <div className="col-span-3 py-12 text-center text-neutral-400 font-bold bg-neutral-50 rounded-3xl border border-dashed border-neutral-200">Нет свободных окон</div>}
                            {!selectedDate && <div className="col-span-3 py-12 text-center text-neutral-400 font-bold">Выберите дату</div>}
                            {isLoadingSlots && <div className="col-span-3 py-12 text-center text-neutral-400 animate-pulse">Загрузка...</div>}
                        </div>
                        <Button className="w-full h-14 rounded-2xl font-black bg-black text-white shadow-xl" onClick={() => setView('home')}>Готово</Button>
                    </div>
                )}

                {view === 'profile' && (
                    <div className="space-y-8 pt-4 animate-in slide-in-from-right-4">
                        <h2 className="text-2xl font-black tracking-tight text-neutral-900">Ваши данные</h2>
                        <div className="space-y-4">
                            <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-neutral-400 ml-1">Имя</Label><Input value={clientData.name} onChange={(e) => setClientData({...clientData, name: e.target.value})} className="h-14 rounded-2xl border-neutral-100 bg-neutral-50 font-bold" /></div>
                            <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-neutral-400 ml-1">Телефон</Label><Input value={clientData.phone} onChange={(e) => setClientData({...clientData, phone: e.target.value})} className="h-14 rounded-2xl border-neutral-100 bg-neutral-50 font-bold" /></div>
                            <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-neutral-400 ml-1">Комментарий</Label><Textarea value={clientData.comment} onChange={(e) => setClientData({...clientData, comment: e.target.value})} className="min-h-[100px] rounded-2xl border-neutral-100 bg-neutral-50" /></div>
                        </div>
                        <Button className="w-full h-16 rounded-3xl text-xl font-black shadow-2xl" style={{ backgroundColor: accentColor, color: '#000' }} onClick={handleFinalBooking} disabled={bookingMutation.isPending}>{bookingMutation.isPending ? 'Записываем...' : 'Записаться'}</Button>
                    </div>
                )}

                {view === 'success' && (
                    <div className="flex flex-col items-center justify-center text-center space-y-6 pt-12 animate-in zoom-in-95">
                        <div className="h-24 w-24 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-inner"><CheckCircle2 className="h-12 w-12 stroke-[3]" /></div>
                        <h2 className="text-3xl font-black tracking-tight text-neutral-900">Вы записаны!</h2>
                        <div className="w-full bg-neutral-50 p-6 rounded-[32px] border border-neutral-100 space-y-4 text-left shadow-inner">
                            <div className="flex items-center gap-4"><div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-neutral-100"><CalendarIcon className="h-5 w-5 text-neutral-400" /></div><div><p className="text-[10px] font-black uppercase text-neutral-400 mb-1">Дата и время</p><p className="font-bold text-neutral-900">{selectedSlot ? `${displayDateFull(selectedSlot.start_time)}, ${displayTime(selectedSlot.start_time)}` : ''}</p></div></div>
                            <div className="flex items-center gap-4"><div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-neutral-100"><User className="h-5 w-5 text-neutral-400" /></div><div><p className="text-[10px] font-black uppercase text-neutral-400 mb-1">Специалист</p><p className="font-bold text-neutral-900">{selectedEmployee?.name || selectedSlot?.employee?.name}</p></div></div>
                        </div>
                        <Button onClick={() => window.location.reload()} variant="outline" className="h-12 px-8 rounded-2xl font-bold border-neutral-200">На главную</Button>
                    </div>
                )}
            </div>

            {/* Footer */}
            {view === 'home' && (
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 bg-white/90 backdrop-blur-xl border-t border-neutral-100 z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                    {selectedEmployee && selectedServices.length > 0 && selectedSlot ? (
                        <Button className="w-full h-14 rounded-2xl font-black text-base shadow-xl transition-all" style={{ backgroundColor: accentColor, color: '#000' }} onClick={() => setView('profile')}>Оформить запись</Button>
                    ) : (
                        <Button className="w-full h-14 rounded-2xl font-black text-base shadow-xl transition-all" style={{ backgroundColor: accentColor, color: '#000' }} onClick={() => { if (branch?.phone) window.location.href = `tel:${branch.phone}`; else toast.error('Телефон не указан'); }}><Phone className="h-5 w-5 mr-2" /> Позвонить</Button>
                    )}
                </div>
            )}
        </div>
    );
}
