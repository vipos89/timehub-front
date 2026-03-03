'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
    X, 
    ChevronRight, 
    Instagram, 
    Send, 
    Globe, 
    Phone, 
    MapPin, 
    Clock, 
    Smartphone,
    User,
    Scissors,
    Calendar,
    Star,
    Info,
    ArrowLeft,
    Check,
    CheckCircle2,
    Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { DateTime } from 'luxon';
import { toast } from 'sonner';
import { EmployeeAvailableSlots } from './EmployeeAvailableSlots';

interface BookingWidgetProps {
    code?: string;
    company: any;
    branch?: any;
    branches?: any[];
    employees: any[];
    services: any[];
    categories?: any[];
    settings: any;
    isPreview?: boolean;
}

export function BookingWidget({ 
    code, 
    company, 
    branch: initialBranch, 
    branches = [],
    employees: initialEmployees, 
    services: initialServices = [],
    categories: initialCategories = [],
    settings, 
    isPreview 
}: BookingWidgetProps) {
    // -- 1. STATE --
    const [view, setView] = useState<'home' | 'branches' | 'specialist' | 'services' | 'datetime' | 'profile' | 'success'>('home');
    const [selectedBranch, setSelectedBranch] = useState<any>(initialBranch);
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [selectedServices, setSelectedServices] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<any>(null);
    const [clientData, setClientData] = useState({ name: '', phone: '', comment: '' });

    const widgetType = settings.widgetType || 'branch';
    const accentColor = settings.accentColor || '#F5FF82';
    const borderRadius = settings.borderRadius !== undefined ? settings.borderRadius : 24;
    const fontPair = settings.fontPair || 'modern';
    const theme = settings.theme || 'light';
    const useGradient = settings.useGradient || false;
    const headerSecondaryColor = settings.headerSecondaryColor || accentColor;
    const slotStep = settings.slotStep || 15;

    // Font family mapping
    const fontClass = fontPair === 'classic' ? 'font-serif' : fontPair === 'minimalist' ? 'font-mono' : 'font-sans';
    
    // Theme base styles
    const isDark = theme === 'dark';
    const isGlass = theme === 'glass';
    const bgColor = isDark ? '#171717' : isGlass ? 'transparent' : '#ffffff';
    const windowBg = isDark ? '#171717' : isGlass ? 'rgba(255, 255, 255, 0.7)' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#171717';
    const secondaryTextColor = isDark ? '#a3a3a3' : '#737373';
    const borderColor = isDark ? '#262626' : isGlass ? 'rgba(255, 255, 255, 0.2)' : '#f5f5f5';
    const cardBg = isDark ? '#262626' : isGlass ? 'rgba(255, 255, 255, 0.4)' : '#ffffff';

    // Header Background
    const headerBg = useGradient 
        ? `linear-gradient(135deg, ${accentColor}, ${headerSecondaryColor})`
        : accentColor;

    // -- 2. DATA LOADERS (Live mode) --
    const activeBranchId = selectedBranch?.id;

    const { data: employees = initialEmployees } = useQuery({
        queryKey: ['employees', activeBranchId],
        queryFn: async () => (await api.get(`/employees?branch_id=${activeBranchId}`)).data,
        enabled: !isPreview && !!activeBranchId && widgetType !== 'master'
    });

    const { data: services = initialServices } = useQuery({
        queryKey: ['services', activeBranchId],
        queryFn: async () => (await api.get(`/branches/${activeBranchId}/services`)).data,
        enabled: !isPreview && !!activeBranchId
    });

    const { data: categories = initialCategories } = useQuery({
        queryKey: ['categories', activeBranchId],
        queryFn: async () => (await api.get(`/branches/${activeBranchId}/categories`)).data,
        enabled: !isPreview && !!activeBranchId
    });

    // -- 3. LOGIC & FILTERS --
    
    // Auto-select single employee if it's a master widget
    useEffect(() => {
        if (widgetType === 'master' && initialEmployees?.length > 0 && !selectedEmployee) {
            setSelectedEmployee(initialEmployees[0]);
        }
    }, [widgetType, initialEmployees]);

    // Auto-select first branch if single branch widget or master widget
    useEffect(() => {
        if ((widgetType === 'branch' || widgetType === 'master') && !selectedBranch && initialBranch) {
            setSelectedBranch(initialBranch);
        }
    }, [widgetType, initialBranch]);

    const getEmployeeServiceDuration = (svc: any, empId: any) => {
        const empSvc = svc.employees?.find((e: any) => String(e.employee_id) == String(empId));
        return empSvc?.duration_minutes || svc.duration_minutes || svc.duration || 0;
    };

    const getEmployeeServicePrice = (svc: any, empId: any) => {
        const empSvc = svc.employees?.find((e: any) => String(e.employee_id) == String(empId));
        return empSvc?.price || svc.price || 0;
    };

    const totalDuration = useMemo(() => {
        if (selectedServices.length === 0) return 30;
        if (selectedEmployee) {
            return selectedServices.reduce((sum, s) => sum + getEmployeeServiceDuration(s, selectedEmployee.id), 0);
        }
        return selectedServices.reduce((sum, s) => sum + (s.duration_minutes || 30), 0);
    }, [selectedServices, selectedEmployee]);

    // Slots & Dates logic (Mocked for preview)
    const activeEmployeeIds = useMemo(() => {
        if (selectedEmployee) return String(selectedEmployee.id);
        return employees.map((e: any) => e.id).join(',');
    }, [selectedEmployee, employees]);

    const { data: availableDates = [] } = useQuery({
        queryKey: ['available-dates', activeBranchId, activeEmployeeIds, totalDuration],
        queryFn: async () => {
            if (!activeEmployeeIds && employees.length === 0) return [];
            const branchTimezone = selectedBranch?.timezone || 'UTC';
            const start = DateTime.now().setZone(branchTimezone).toISODate();
            const end = DateTime.now().setZone(branchTimezone).plus({ months: 2 }).toISODate();
            const duration = totalDuration > 0 ? totalDuration : 30;
            const res = await api.get(`/available-dates?branch_id=${activeBranchId}&employee_ids=${activeEmployeeIds}&duration=${duration}&step=${slotStep}&start=${start}&end=${end}`);
            return res.data ? res.data.map((d: string) => d.split('T')[0]) : [];
        },
        enabled: !isPreview && !!activeBranchId && employees.length > 0
    });

    const { data: availableSlots = [], isLoading: isLoadingSlots } = useQuery({
        queryKey: ['slots', activeEmployeeIds, selectedDate, totalDuration],
        queryFn: async () => {
            if (!selectedDate || !activeEmployeeIds) return [];
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const duration = totalDuration > 0 ? totalDuration : 30;
            const res = await api.get(`/slots?employee_ids=${activeEmployeeIds}&date=${dateStr}&duration=${duration}&step=${slotStep}`);
            
            const branchTimezone = selectedBranch?.timezone || 'UTC';
            const now = DateTime.now().setZone(branchTimezone);

            return (res.data || [])
                .map((slot: any) => ({
                    ...slot,
                    start_time: slot.start_time.replace('Z', ''),
                    end_time: slot.end_time.replace('Z', ''),
                }))
                .filter((slot: any) => {
                    const slotTime = DateTime.fromISO(slot.start_time, { zone: branchTimezone });
                    return slotTime > now;
                });
        },
        enabled: !isPreview && !!activeBranchId && !!selectedDate && !!activeEmployeeIds
    });

    const isEmployeeCompatible = (emp: any) => {
        if (selectedServices.length === 0) return true;
        return selectedServices.every(svc => 
            svc.employees?.some((e: any) => String(e.employee_id) == String(emp.id))
        );
    };

    const isServiceCompatible = (svc: any) => {
        if (selectedEmployee) {
            return svc.employees?.some((e: any) => String(e.employee_id) == String(selectedEmployee.id));
        }
        return true;
    };

    const groupedServices = useMemo(() => {
        const groups: any[] = [];
        const catIds = new Set();
        (categories || []).forEach((cat: any) => {
            const svcs = (cat.services || []).filter((s: any) => (services || []).some((as: any) => as.id === s.id && isServiceCompatible(as)));
            if (svcs.length > 0) {
                groups.push({ id: cat.id, name: cat.name, services: svcs });
                svcs.forEach((s: any) => catIds.add(s.id));
            }
        });
        const other = (services || []).filter((s: any) => !catIds.has(s.id) && isServiceCompatible(s));
        if (other.length > 0) groups.push({ id: 'other', name: 'Услуги', services: other });
        return groups;
    }, [categories, services, selectedEmployee]);

    // -- 4. HANDLERS --
    const handleSelectBranch = (b: any) => {
        setSelectedBranch(b);
        setSelectedEmployee(null);
        setSelectedServices([]);
        setSelectedDate(null);
        setSelectedSlot(null);
        setView('home');
    };

    const handleSelectSpecialist = (emp: any) => { setSelectedEmployee(emp); setView('home'); };
    const handleSelectService = (svc: any) => {
        const isSelected = selectedServices.some(s => s.id === svc.id);
        setSelectedServices(isSelected ? selectedServices.filter(s => s.id !== svc.id) : [...selectedServices, svc]);
    };
    const handleSelectSlot = (slot: any) => { setSelectedSlot(slot); setView('home'); };

    const bookingMutation = useMutation({
        mutationFn: (data: any) => api.post('/bookings', data),
        onSuccess: () => setView('success'),
        onError: () => toast.error('Ошибка при бронировании')
    });

    const handleFinalBooking = async () => {
        if (!clientData.name || !clientData.phone || !selectedSlot) return;
        if (isPreview) { setView('success'); return; }

        const empId = selectedEmployee?.id || selectedSlot.employee_id;
        const formattedStartTime = selectedSlot.start_time.slice(0, 19);
        const exactDuration = selectedServices.reduce((sum, s) => sum + getEmployeeServiceDuration(s, empId), 0);
        const exactEndTime = DateTime.fromISO(formattedStartTime).plus({ minutes: exactDuration }).toFormat("yyyy-MM-dd'T'HH:mm:ss");

        try {
            const customerRes = await api.post('/customers', { 
                company_id: company.id, 
                branch_id: selectedBranch.id, 
                first_name: clientData.name, 
                phone: clientData.phone 
            });
            bookingMutation.mutate({
                company_id: company.id,
                employee_id: empId,
                start_time: formattedStartTime,
                end_time: exactEndTime,
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

    // Helper for formatting
    const displayTime = (iso: string) => iso ? iso.slice(11, 16) : '';
    const displayDateFull = (iso: string) => iso ? format(new Date(iso), 'd MMMM', { locale: ru }) : '';

    return (
        <div className={`flex flex-col h-full ${fontClass}`} style={{ backgroundColor: bgColor, color: textColor }}>
            {/* Header Banner */}
            <div className="h-28 shrink-0 relative overflow-hidden" style={{ background: headerBg }}>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '16px 12px' }} />
                {view !== 'home' && view !== 'success' && (
                    <button 
                        onClick={() => setView('home')} 
                        className="absolute top-6 left-6 h-10 w-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-black z-20 transition-all hover:bg-white/40"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                )}
            </div>

            {/* Scrolling Content Area */}
            <div 
                className="flex-1 overflow-y-auto px-6 pb-24 -mt-10 relative z-10 custom-scrollbar"
                style={{ 
                    backgroundColor: windowBg,
                    borderRadius: `${borderRadius}px ${borderRadius}px 0 0`,
                    backdropFilter: isGlass ? 'blur(20px)' : 'none'
                }}
            >
                {view === 'home' && (
                    <div className="pt-10 space-y-6 animate-in fade-in duration-500">
                        {/* Company Card */}
                        <div 
                            className="p-6 shadow-xl border flex flex-col items-center text-center space-y-4 mt-8 transition-all"
                            style={{ 
                                backgroundColor: cardBg,
                                borderColor: borderColor,
                                borderRadius: `${borderRadius}px`,
                                backdropFilter: isGlass ? 'blur(10px)' : 'none'
                            }}
                        >
                            {settings.showCompanyLogo !== false && (
                                <Avatar className="h-24 w-24 border-4 border-white shadow-lg -mt-20">
                                    <AvatarImage src={company?.logo_url} />
                                    <AvatarFallback className="bg-neutral-900 text-white font-black text-2xl">{company?.name?.[0] || 'C'}</AvatarFallback>
                                </Avatar>
                            )}
                            <div className="space-y-1">
                                <h1 className="font-black text-2xl leading-tight" style={{ color: textColor }}>{company?.name || 'Название компании'}</h1>
                                <p className="text-sm font-medium px-4 opacity-60" style={{ color: textColor }}>{company?.description || 'Онлайн-запись открыта'}</p>
                            </div>
                            
                            {/* Branch Selection Info & Change Button */}
                            {widgetType === 'network' && (
                                <div className="w-full pt-2 border-t mt-2" style={{ borderColor: borderColor }}>
                                    {selectedBranch ? (
                                        <div className="flex flex-col items-center">
                                            <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider opacity-40 mb-1">
                                                <MapPin className="h-3 w-3" /> Выбранный филиал
                                            </div>
                                            <div className="text-sm font-bold truncate max-w-full text-center mb-2">{selectedBranch.name}</div>
                                            <button 
                                                onClick={() => setView('branches')}
                                                className="text-[11px] font-black uppercase tracking-tight px-4 py-1.5 rounded-full border transition-all hover:bg-black/5"
                                                style={{ borderColor: accentColor }}
                                            >
                                                Сменить филиал
                                            </button>
                                        </div>
                                    ) : (
                                        <Button 
                                            onClick={() => setView('branches')}
                                            variant="outline"
                                            className="w-full text-xs font-black uppercase tracking-tight rounded-xl"
                                        >
                                            Выберите филиал
                                        </Button>
                                    )}
                                </div>
                            )}

                            {settings.showSocialLinks !== false && (
                                <div className="flex gap-3 justify-center w-full">
                                    <div className="h-11 w-11 rounded-2xl flex items-center justify-center border transition-all" style={{ backgroundColor: cardBg, borderColor: borderColor }}><Instagram className="h-5 w-5 opacity-50" style={{ color: textColor }} /></div>
                                    <div className="h-11 w-11 rounded-2xl flex items-center justify-center border transition-all" style={{ backgroundColor: cardBg, borderColor: borderColor }}><Send className="h-5 w-5 opacity-50" style={{ color: textColor }} /></div>
                                    <div className="h-11 w-11 rounded-2xl flex items-center justify-center border transition-all" style={{ backgroundColor: cardBg, borderColor: borderColor }}><Globe className="h-5 w-5 opacity-50" style={{ color: textColor }} /></div>
                                </div>
                            )}
                        </div>

                        {/* Steps Grid */}
                        <div className="space-y-3 pb-8">
                            {(settings.stepsOrder || ['services', 'specialist', 'datetime']).map((step: string) => {
                                // Hide specialist step for master widget
                                if (step === 'specialist' && widgetType === 'master') return null;
                                
                                const stepLabel = step === 'specialist' ? 'Специалист' : step === 'services' ? 'Услуги' : 'Дата и время';
                                const Icon = step === 'specialist' ? User : step === 'services' ? Scissors : Calendar;
                                
                                let stepValue = 'Выбрать';
                                if (step === 'specialist') stepValue = selectedEmployee?.name || 'Любой специалист';
                                if (step === 'services') stepValue = selectedServices.length > 0 ? `${selectedServices.length} выбрано` : 'Выбрать услуги';
                                if (step === 'datetime') stepValue = selectedSlot ? `${displayDateFull(selectedSlot.start_time)}, ${displayTime(selectedSlot.start_time)}` : (selectedDate ? format(selectedDate, 'd MMMM', { locale: ru }) : 'Выбрать дату');

                                return (
                                    <div 
                                        key={step} 
                                        onClick={() => (!selectedBranch && widgetType === 'network') ? setView('branches') : setView(step as any)} 
                                        className={`p-5 flex items-center justify-between cursor-pointer transition-all border shadow-sm group hover:scale-[1.01] ${(!selectedBranch && widgetType === 'network') ? 'opacity-50' : ''}`}
                                        style={{ 
                                            backgroundColor: cardBg,
                                            borderColor: borderColor,
                                            borderRadius: `${borderRadius}px`,
                                            backdropFilter: isGlass ? 'blur(10px)' : 'none'
                                        }}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 flex items-center justify-center shadow-sm border" style={{ backgroundColor: cardBg, borderColor: borderColor, borderRadius: `${borderRadius/1.5}px` }}>
                                                <Icon className="h-6 w-6" style={{ color: textColor }} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black uppercase opacity-40 mb-1" style={{ color: textColor }}>{stepLabel}</span>
                                                <span className="text-lg font-bold leading-tight" style={{ color: textColor }}>{stepValue}</span>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 opacity-30" style={{ color: textColor }} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {view === 'branches' && (
                    <div className="space-y-6 pt-4 animate-in slide-in-from-right-4">
                        <h2 className="text-2xl font-black tracking-tight pt-4" style={{ color: textColor }}>Выберите филиал</h2>
                        <div className="grid grid-cols-1 gap-3">
                            {(branches.length > 0 ? branches : (company?.branches || [])).map((b: any) => (
                                <div 
                                    key={b.id}
                                    onClick={() => handleSelectBranch(b)}
                                    className="p-5 flex items-center justify-between cursor-pointer transition-all border shadow-sm group hover:scale-[1.01]"
                                    style={{ 
                                        backgroundColor: cardBg,
                                        borderColor: selectedBranch?.id === b.id ? accentColor : borderColor,
                                        borderRadius: `${borderRadius}px`,
                                        borderWidth: selectedBranch?.id === b.id ? '2px' : '1px'
                                    }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 flex items-center justify-center shadow-sm border" style={{ backgroundColor: cardBg, borderColor: borderColor, borderRadius: `${borderRadius/1.5}px` }}>
                                            <MapPin className="h-6 w-6" style={{ color: textColor }} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-lg font-bold leading-tight" style={{ color: textColor }}>{b.name}</span>
                                            <span className="text-sm opacity-50 truncate max-w-[200px]" style={{ color: textColor }}>{b.address || 'Адрес не указан'}</span>
                                        </div>
                                    </div>
                                    {selectedBranch?.id === b.id && <Check className="h-6 w-6" style={{ color: accentColor }} />}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {view === 'specialist' && (
                    <div className="space-y-6 pt-4 animate-in slide-in-from-right-4">
                        <h2 className="text-2xl font-black tracking-tight pt-4" style={{ color: textColor }}>Специалисты</h2>
                        <div className="grid grid-cols-1 gap-6 pb-6 mt-4">
                            <div className="flex items-center justify-between cursor-pointer group" onClick={() => handleSelectSpecialist(null)}>
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-full bg-neutral-100 flex items-center justify-center shrink-0 text-neutral-400"><Users className="h-7 w-7" /></div>
                                    <div className="flex-1 space-y-0.5">
                                        <h3 className="text-lg leading-none font-medium text-neutral-900 group-hover:opacity-80 transition-opacity" style={{ color: textColor }}>Любой специалист</h3>
                                        <p className="text-[13px] text-neutral-500 font-medium uppercase tracking-wide">Все доступные окна</p>
                                    </div>
                                </div>
                                <div className={`w-[22px] h-[22px] rounded-full border flex items-center justify-center shrink-0 ${!selectedEmployee ? 'border-black' : 'border-neutral-300'}`} style={{ borderColor: !selectedEmployee ? textColor : borderColor }}>
                                    {!selectedEmployee && <div className="w-3.5 h-3.5 bg-black rounded-full" style={{ backgroundColor: textColor }} />}
                                </div>
                            </div>

                            {employees.map((emp: any) => {
                                const isAvailable = isEmployeeCompatible(emp);
                                return (
                                    <div key={emp.id} className={`flex flex-col gap-3 transition-opacity ${!isAvailable ? 'opacity-40 grayscale' : ''}`}>
                                        <div className="flex items-start justify-between cursor-pointer group" onClick={() => isAvailable && handleSelectSpecialist(emp)}>
                                            <div className="flex items-start gap-4">
                                                <Avatar className="h-[60px] w-[60px] shrink-0"><AvatarImage src={emp.avatar_url} /><AvatarFallback className="bg-neutral-100 font-bold">{emp.name[0]}</AvatarFallback></Avatar>
                                                <div className="flex-1 space-y-1">
                                                    <h3 className="text-lg leading-none font-medium group-hover:opacity-80 transition-opacity" style={{ color: textColor }}>{emp.name}</h3>
                                                    <p className="text-[13px] font-medium uppercase tracking-wide opacity-50" style={{ color: textColor }}>{emp.position || 'Специалист'}</p>
                                                    <div className="flex items-center gap-1.5 pt-0.5">
                                                        <div className="flex text-[#FBB03B]">
                                                            {[1, 2, 3, 4, 5].map((s) => (
                                                                <Star key={s} className="w-3.5 h-3.5 fill-[#FBB03B]" />
                                                            ))}
                                                        </div>
                                                        <span className="text-[13px] opacity-40" style={{ color: textColor }}>5.0 (0 отзывов)</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`w-[22px] h-[22px] rounded-full border flex items-center justify-center shrink-0 ${selectedEmployee?.id === emp.id ? 'border-black' : 'border-neutral-300'}`} style={{ borderColor: selectedEmployee?.id === emp.id ? textColor : borderColor }}>
                                                {selectedEmployee?.id === emp.id && <div className="w-3.5 h-3.5 bg-black rounded-full" style={{ backgroundColor: textColor }} />}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {view === 'services' && (
                    <div className="space-y-6 pt-4 animate-in slide-in-from-right-4">
                        <div className="flex items-center justify-between"><h2 className="text-2xl font-black tracking-tight" style={{ color: textColor }}>Услуги</h2>{selectedServices.length > 0 && <Badge className="bg-black text-white rounded-full" style={{ backgroundColor: textColor, color: bgColor }}>{selectedServices.length}</Badge>}</div>
                        <div className="space-y-6">
                            {groupedServices.map((group: any) => (
                                <div key={group.id} className="space-y-3">
                                    <h3 className="text-[11px] font-black uppercase opacity-40 tracking-widest" style={{ color: textColor }}>{group.name}</h3>
                                    <div className="grid gap-2">
                                        {group.services?.map((svc: any) => {
                                            const isSelected = selectedServices.some(s => s.id === svc.id);
                                            const svcDuration = selectedEmployee ? getEmployeeServiceDuration(svc, selectedEmployee.id) : svc.duration_minutes || svc.duration || 0;
                                            const svcPrice = selectedEmployee ? getEmployeeServicePrice(svc, selectedEmployee.id) : svc.price || 0;
                                            
                                            return (
                                                <div 
                                                    key={svc.id} 
                                                    onClick={() => handleSelectService(svc)} 
                                                    className={`p-5 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer ${isSelected ? 'shadow-md scale-[1.01]' : ''}`}
                                                    style={{ 
                                                        borderColor: isSelected ? accentColor : borderColor,
                                                        backgroundColor: cardBg
                                                    }}
                                                >
                                                    <div className="flex flex-col gap-1 pr-4">
                                                        <span className="font-bold leading-tight" style={{ color: textColor }}>{svc.name}</span>
                                                        <span className="text-[11px] font-black uppercase opacity-40" style={{ color: textColor }}>{svcDuration} мин</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="font-black" style={{ color: textColor }}>{svcPrice} BYN</span>
                                                        <div className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'text-white' : ''}`} style={{ borderColor: isSelected ? accentColor : borderColor, backgroundColor: isSelected ? accentColor : 'transparent' }}>
                                                            {isSelected && <Check className="h-3.5 w-3.5" style={{ color: '#000' }} />}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button className="w-full h-14 font-black shadow-xl" style={{ backgroundColor: accentColor, borderRadius: `${borderRadius}px`, color: '#000' }} onClick={() => setView('home')}>Готово</Button>
                    </div>
                )}

                {view === 'datetime' && (
                    <div className="space-y-6 pt-4 animate-in slide-in-from-right-4">
                        <h2 className="text-2xl font-black tracking-tight" style={{ color: textColor }}>Дата и время</h2>
                        <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar">
                            {[...Array(14)].map((_, i) => {
                                const branchTimezone = selectedBranch?.timezone || 'UTC';
                                const date = DateTime.now().setZone(branchTimezone).plus({ days: i }).toJSDate();
                                const active = selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
                                return (
                                    <button 
                                        key={i} 
                                        className={`shrink-0 w-16 h-20 border-2 flex flex-col items-center justify-center gap-1 transition-all ${active ? 'bg-neutral-900 text-white shadow-lg scale-105' : 'hover:border-neutral-300'}`} 
                                        style={{ 
                                            borderRadius: `${borderRadius/1.5}px`,
                                            borderColor: active ? accentColor : borderColor,
                                            backgroundColor: active ? accentColor : cardBg,
                                            color: active ? (settings.buttonTextColor || '#000') : textColor
                                        }}
                                        onClick={() => setSelectedDate(date)}
                                    >
                                        <span className={`text-[10px] font-black uppercase opacity-60`}>{format(date, 'ccc', { locale: ru })}</span>
                                        <span className="text-lg font-black">{format(date, 'd')}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {/* MOCK SLOTS for preview if none available */}
                            {isPreview ? (
                                ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00'].map((time, i) => (
                                    <button 
                                        key={i} 
                                        className={`h-12 border-2 font-bold text-sm transition-all ${selectedSlot?.start_time === time ? 'border-black bg-black text-white' : 'border-neutral-100 bg-neutral-50 hover:border-neutral-300'}`}
                                        style={{ 
                                            borderRadius: `${borderRadius/2}px`,
                                            borderColor: selectedSlot?.start_time === time ? accentColor : borderColor,
                                            backgroundColor: selectedSlot?.start_time === time ? accentColor : cardBg,
                                            color: selectedSlot?.start_time === time ? (settings.buttonTextColor || '#000') : textColor
                                        }}
                                        onClick={() => setSelectedSlot({ start_time: `2024-01-01T${time}:00` })}
                                    >
                                        {time}
                                    </button>
                                ))
                            ) : isLoadingSlots ? (
                                <div className="col-span-3 py-12 flex items-center justify-center">
                                    <div className="animate-spin h-6 w-6 border-2 border-neutral-900 border-t-transparent rounded-full" style={{ borderColor: accentColor, borderTopColor: 'transparent' }} />
                                </div>
                            ) : availableSlots.length > 0 ? (
                                availableSlots.map((slot: any, i: number) => {
                                    const time = DateTime.fromISO(slot.start_time).toFormat('HH:mm');
                                    const active = selectedSlot?.start_time === slot.start_time;
                                    return (
                                        <button 
                                            key={i} 
                                            className={`h-12 border-2 font-bold text-sm transition-all ${active ? 'shadow-lg scale-105' : 'hover:border-neutral-300'}`}
                                            style={{ 
                                                borderRadius: `${borderRadius/2}px`,
                                                borderColor: active ? accentColor : borderColor,
                                                backgroundColor: active ? accentColor : cardBg,
                                                color: active ? (settings.buttonTextColor || '#000') : textColor
                                            }}
                                            onClick={() => setSelectedSlot(slot)}
                                        >
                                            {time}
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="col-span-3 py-12 text-center opacity-40 font-bold" style={{ color: textColor }}>
                                    {selectedDate ? 'Нет свободных окон' : 'Выберите дату'}
                                </div>
                            )}
                        </div>
                        <Button 
                            className="w-full h-14 font-black text-base shadow-xl transition-all" 
                            style={{ 
                                backgroundColor: accentColor, 
                                color: settings.buttonTextColor || '#000',
                                borderRadius: `${borderRadius}px`
                            }}
                            onClick={() => setView('home')}
                        >
                            Готово
                        </Button>
                    </div>
                )}

                {view === 'profile' && (
                    <div className="space-y-8 pt-4 animate-in slide-in-from-right-4 duration-300">
                        <h2 className="text-2xl font-black tracking-tight" style={{ color: textColor }}>Ваши данные</h2>
                        <div className="space-y-4">
                            <div className="space-y-2 text-left">
                                <Label className="text-[10px] font-black uppercase opacity-40 ml-1" style={{ color: textColor }}>Имя</Label>
                                <Input 
                                    value={clientData.name} 
                                    onChange={(e) => setClientData({...clientData, name: e.target.value})} 
                                    className="h-14 border-none shadow-sm font-bold" 
                                    style={{ backgroundColor: cardBg, borderRadius: `${borderRadius/2}px`, color: textColor }}
                                />
                            </div>
                            <div className="space-y-2 text-left">
                                <Label className="text-[10px] font-black uppercase opacity-40 ml-1" style={{ color: textColor }}>Телефон</Label>
                                <Input 
                                    value={clientData.phone} 
                                    onChange={(e) => setClientData({...clientData, phone: e.target.value})} 
                                    className="h-14 border-none shadow-sm font-bold" 
                                    style={{ backgroundColor: cardBg, borderRadius: `${borderRadius/2}px`, color: textColor }}
                                />
                            </div>
                            <div className="space-y-2 text-left">
                                <Label className="text-[10px] font-black uppercase opacity-40 ml-1" style={{ color: textColor }}>Комментарий</Label>
                                <Textarea 
                                    value={clientData.comment} 
                                    onChange={(e) => setClientData({...clientData, comment: e.target.value})} 
                                    className="min-h-[100px] border-none shadow-sm" 
                                    style={{ backgroundColor: cardBg, borderRadius: `${borderRadius/2}px`, color: textColor }}
                                />
                            </div>
                        </div>
                        <Button 
                            className="w-full h-14 font-black text-lg shadow-xl transition-all" 
                            style={{ 
                                backgroundColor: accentColor, 
                                color: settings.buttonTextColor || '#000',
                                borderRadius: `${borderRadius}px`
                            }}
                            onClick={handleFinalBooking}
                        >
                            Записаться
                        </Button>
                    </div>
                )}

                {view === 'success' && (
                    <div className="flex flex-col items-center justify-center text-center space-y-6 pt-12 animate-in zoom-in-95 duration-500">
                        <div className="h-24 w-24 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner">
                            <CheckCircle2 className="h-12 w-12 stroke-[3]" />
                        </div>
                        <h2 className="text-3xl font-black tracking-tight" style={{ color: textColor }}>Вы записаны!</h2>
                        <div 
                            className="w-full p-6 border space-y-4 text-left shadow-inner transition-all"
                            style={{ 
                                backgroundColor: cardBg,
                                borderColor: borderColor,
                                borderRadius: `${borderRadius}px`
                            }}
                        >
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center shadow-sm border" style={{ borderColor: borderColor }}>
                                    <Calendar className="h-5 w-5 opacity-40" style={{ color: textColor }} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase opacity-40 mb-1" style={{ color: textColor }}>Дата и время</p>
                                    <p className="font-bold font-mono" style={{ color: textColor }}>{selectedSlot ? `${displayDateFull(selectedSlot.start_time)}, ${displayTime(selectedSlot.start_time)}` : ''}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center shadow-sm border" style={{ borderColor: borderColor }}>
                                    <User className="h-5 w-5 opacity-40" style={{ color: textColor }} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase opacity-40 mb-1" style={{ color: textColor }}>Специалист</p>
                                    <p className="font-bold" style={{ color: textColor }}>{selectedEmployee?.name || 'Любой специалист'}</p>
                                </div>
                            </div>
                        </div>
                        <Button 
                            variant="outline" 
                            className="h-12 px-8 font-bold border-2"
                            style={{ borderRadius: `${borderRadius/2}px`, borderColor: borderColor, color: textColor }}
                            onClick={() => setView('home')}
                        >
                            На главную
                        </Button>
                    </div>
                )}
            </div>

            {/* Sticky Footer */}
            {view === 'home' && (
                <div 
                    className="absolute bottom-0 left-0 right-0 p-6 border-t z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] transition-all" 
                    style={{ 
                        backgroundColor: windowBg, 
                        borderColor: borderColor,
                        backdropFilter: isGlass ? 'blur(20px)' : 'none'
                    }}
                >
                    <Button 
                        className="w-full h-14 font-black text-base shadow-xl transition-all" 
                        style={{ 
                            backgroundColor: accentColor, 
                            color: settings.buttonTextColor || '#000',
                            borderRadius: `${borderRadius}px`
                        }}
                        onClick={() => {
                            if (selectedEmployee && selectedServices.length > 0 && selectedSlot) {
                                setView('profile');
                            } else if (selectedBranch?.phone) {
                                window.location.href = `tel:${selectedBranch.phone}`;
                            } else {
                                setView((settings.stepsOrder || ['services'])[0] as any);
                            }
                        }}
                    >
                        {selectedEmployee && selectedServices.length > 0 && selectedSlot ? 'Оформить запись' : (settings.buttonText || 'Записаться онлайн')}
                    </Button>
                </div>
            )}
        </div>
    );
}
