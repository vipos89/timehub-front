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
    Users,
    Plus
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
import { cn } from '@/lib/utils';

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
    onClose?: () => void;
}

export function BookingWidget({ 
    code, 
    company, 
    branch: initialBranch, 
    branches = [],
    employees: initialEmployees = [], 
    services: initialServices = [],
    categories: initialCategories = [],
    settings, 
    isPreview,
    onClose
}: BookingWidgetProps) {
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

    const fontClass = fontPair === 'classic' ? 'font-serif' : fontPair === 'minimalist' ? 'font-mono' : 'font-sans';
    const isDark = theme === 'dark';
    const isGlass = theme === 'glass';
    const bgColor = isDark ? '#171717' : isGlass ? 'transparent' : '#ffffff';
    const windowBg = isDark ? '#171717' : isGlass ? 'rgba(255, 255, 255, 0.8)' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#171717';
    const borderColor = isDark ? '#262626' : isGlass ? 'rgba(255, 255, 255, 0.2)' : '#f5f5f5';
    const cardBg = isDark ? '#262626' : isGlass ? 'rgba(255, 255, 255, 0.5)' : '#ffffff';

    const headerBg = useGradient 
        ? `linear-gradient(135deg, ${accentColor}, ${headerSecondaryColor})`
        : accentColor;

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

    useEffect(() => {
        if (widgetType === 'master' && initialEmployees?.length > 0 && !selectedEmployee) setSelectedEmployee(initialEmployees[0]);
    }, [widgetType, initialEmployees]);

    useEffect(() => {
        if ((widgetType === 'branch' || widgetType === 'master') && !selectedBranch && initialBranch) setSelectedBranch(initialBranch);
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
        if (selectedEmployee) return selectedServices.reduce((sum, s) => sum + getEmployeeServiceDuration(s, selectedEmployee.id), 0);
        return selectedServices.reduce((sum, s) => sum + (s.duration_minutes || 30), 0);
    }, [selectedServices, selectedEmployee]);

    const displayTime = (iso: string) => DateTime.fromISO(iso).toFormat('HH:mm');
    const displayDateFull = (iso: string) => DateTime.fromISO(iso).setLocale('ru').toFormat('d MMMM, cccc');

    const handleSelectBranch = (b: any) => {
        setSelectedBranch(b); setSelectedEmployee(null); setSelectedServices([]); setSelectedDate(null); setSelectedSlot(null); setView('home');
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
        
        // Pass full ISO string with offset
        const formattedStartTime = selectedSlot.start_time; 
        const exactDuration = selectedServices.reduce((sum, s) => sum + getEmployeeServiceDuration(s, empId), 0);
        
        // Calculate end time using Luxon to preserve offset
        const exactEndTime = DateTime.fromISO(formattedStartTime).plus({ minutes: exactDuration }).toISO();

        try {
            const customerRes = await api.post('/customers', { company_id: company.id, branch_id: selectedBranch.id, first_name: clientData.name, phone: clientData.phone });
            bookingMutation.mutate({ 
                company_id: company.id, 
                employee_id: empId, 
                client_id: customerRes.data.id, 
                start_time: formattedStartTime, 
                end_time: exactEndTime, 
                comment: clientData.comment, 
                total_price: selectedServices.reduce((sum, s) => sum + getEmployeeServicePrice(s, empId), 0), 
                services: selectedServices.map(s => ({ 
                    service_id: s.id, 
                    price: getEmployeeServicePrice(s, empId), 
                    duration_minutes: getEmployeeServiceDuration(s, empId) 
                })) 
            });
        } catch (err) { toast.error('Ошибка при создании клиента'); }
    };

    return (
        <div className={cn("w-full h-full relative overflow-hidden flex flex-col transition-all duration-500", fontClass)} style={{ backgroundColor: bgColor, borderRadius: `${borderRadius}px` }}>
            <style jsx global>{`
                @keyframes th-pulse { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0,0,0,0.2); } 70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(0,0,0,0); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0,0,0,0); } }
                @keyframes th-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px) rotate(-1deg); } 75% { transform: translateX(4px) rotate(1deg); } }
                @keyframes th-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
                @keyframes th-glow { 0%, 100% { filter: brightness(1) drop-shadow(0 0 5px currentColor); } 50% { filter: brightness(1.2) drop-shadow(0 0 20px currentColor); } }
                @keyframes th-bounce { 0%, 20%, 50%, 80%, 100% {transform: translateY(0);} 40% {transform: translateY(-20px);} 60% {transform: translateY(-10px);} }
                @keyframes th-swing { 20% { transform: rotate(15deg); } 40% { transform: rotate(-10deg); } 60% { transform: rotate(5deg); } 80% { transform: rotate(-5deg); } 100% { transform: rotate(0deg); } }
                @keyframes th-pop { 0% { transform: scale(1); } 50% { transform: scale(1.15); } 100% { transform: scale(1); } }
                .th-pulse { animation: th-pulse 2s infinite; } .th-shake { animation: th-shake 0.5s infinite; } .th-float { animation: th-float 3s ease-in-out infinite; } .th-glow { animation: th-glow 2s infinite; } .th-bounce { animation: th-bounce 2s infinite; } .th-swing { animation: th-swing 2s infinite; transform-origin: top center; } .th-pop { animation: th-pop 1s infinite; }
            `}</style>

            <div className="absolute top-0 left-0 right-0 h-40 transition-all duration-700 opacity-20" style={{ background: headerBg, borderRadius: `0 0 ${borderRadius}px ${borderRadius}px` }} />
            
            <div className="relative shrink-0 px-6 pt-6 flex items-center justify-end z-50">
                <button onClick={onClose} className="p-2.5 bg-neutral-900/5 hover:bg-neutral-900/10 backdrop-blur-md rounded-xl text-neutral-900 transition-all active:scale-90"><X className="h-5 w-5" /></button>
            </div>

            <div className="flex-1 relative z-10 overflow-y-auto custom-scrollbar px-6 pt-2 pb-32">
                {view === 'home' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="relative group">
                                <Avatar className="h-20 w-20 rounded-3xl ring-4 ring-white shadow-2xl transition-transform group-hover:scale-105 duration-500"><AvatarImage src={company?.logo_url} /><AvatarFallback className="text-xl font-black bg-neutral-900 text-white">{company?.name?.[0]}</AvatarFallback></Avatar>
                                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1.5 rounded-xl shadow-lg ring-4 ring-white"><Check className="h-3 w-3 stroke-[4]" /></div>
                            </div>
                            <div className="space-y-1">
                                <h1 className="text-2xl font-black tracking-tighter" style={{ color: textColor }}>{company?.name}</h1>
                                
                                {widgetType === 'network' ? (
                                    <div className="pt-2">
                                        {selectedBranch ? (
                                            <button 
                                                onClick={() => setView('branches')}
                                                className="group flex flex-col items-center gap-1 active:scale-95 transition-all"
                                            >
                                                <div className="flex items-center gap-1.5 px-4 py-1.5 bg-neutral-900/5 rounded-full border border-neutral-900/5 group-hover:bg-neutral-900/10 transition-colors">
                                                    <MapPin className="h-3 w-3 text-neutral-400" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: textColor }}>{selectedBranch.name}</span>
                                                    <ChevronRight className="h-3 w-3 text-neutral-300 group-hover:translate-x-0.5 transition-transform" />
                                                </div>
                                                <span className="text-[9px] font-bold text-neutral-400 opacity-60 truncate max-w-[200px]">{selectedBranch.address || 'Сменить филиал'}</span>
                                            </button>
                                        ) : (
                                            <Button 
                                                onClick={() => setView('branches')}
                                                variant="outline"
                                                className="h-10 px-6 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest animate-bounce duration-[2000ms]"
                                                style={{ borderColor: accentColor }}
                                            >
                                                <MapPin className="h-3.5 w-3.5 mr-2" />
                                                Выберите филиал
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    selectedBranch && (
                                        <div className="flex flex-col items-center gap-1.5">
                                            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest opacity-40" style={{ color: textColor }}>
                                                <MapPin className="h-3 w-3" />
                                                {selectedBranch.address || selectedBranch.name}
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>

                            {/* Social Links restored */}
                            {settings.showSocialLinks !== false && (
                                <div className="flex gap-3 justify-center pt-2">
                                    {[
                                        { Icon: Instagram, link: company?.instagram_url },
                                        { Icon: Send, link: company?.telegram_url },
                                        { Icon: Globe, link: company?.website_url }
                                    ].map((social, idx) => (
                                        <button 
                                            key={idx}
                                            className="h-12 w-12 rounded-2xl flex items-center justify-center border-2 transition-all hover:scale-110 active:scale-95 shadow-sm bg-white" 
                                            style={{ borderColor: borderColor }}
                                        >
                                            <social.Icon className="h-5 w-5 opacity-40" style={{ color: textColor }} />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="space-y-3 pb-4">
                            {(settings.stepsOrder || ['services', 'specialist', 'datetime']).map((step: string) => {
                                if (step === 'specialist' && widgetType === 'master') return null;
                                const stepLabel = step === 'specialist' ? 'Специалист' : step === 'services' ? 'Услуги' : 'Дата и время';
                                const Icon = step === 'specialist' ? User : step === 'services' ? Scissors : Calendar;
                                let stepValue = 'Выбрать';
                                if (step === 'specialist') stepValue = selectedEmployee?.name || 'Любой специалист';
                                if (step === 'services') stepValue = selectedServices.length > 0 ? `${selectedServices.length} выбрано` : 'Выбрать услуги';
                                if (step === 'datetime') stepValue = selectedSlot ? `${displayDateFull(selectedSlot.start_time)}, ${displayTime(selectedSlot.start_time)}` : (selectedDate ? format(selectedDate, 'd MMMM', { locale: ru }) : 'Выбрать дату');
                                return (
                                    <div key={step} onClick={() => (!selectedBranch && widgetType === 'network') ? setView('branches') : setView(step as any)} className={cn("p-6 flex items-center justify-between cursor-pointer transition-all border-2 shadow-sm group active:scale-[0.98]", (!selectedBranch && widgetType === 'network') && "opacity-50")} style={{ backgroundColor: cardBg, borderColor: borderColor, borderRadius: `${borderRadius}px`, backdropFilter: isGlass ? 'blur(10px)' : 'none' }}>
                                        <div className="flex items-center gap-5">
                                            <div className="h-14 w-14 flex items-center justify-center shadow-inner border-2" style={{ backgroundColor: cardBg, borderColor: borderColor, borderRadius: `${borderRadius/1.5}px` }}><Icon className="h-7 w-7" style={{ color: textColor }} /></div>
                                            <div className="flex flex-col"><span className="text-[11px] font-black uppercase opacity-30 mb-1" style={{ color: textColor }}>{stepLabel}</span><span className="text-xl font-bold tracking-tight leading-none" style={{ color: textColor }}>{stepValue}</span></div>
                                        </div>
                                        <ChevronRight className="h-6 w-6 opacity-20 group-hover:opacity-100 transition-opacity" style={{ color: textColor }} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {view === 'branches' && (
                    <div className="space-y-6 pt-4 animate-in slide-in-from-right-8 duration-500">
                        <div className="flex items-center gap-4"><button onClick={() => setView('home')} className="h-12 w-12 rounded-2xl flex items-center justify-center border-2" style={{ borderColor: borderColor, color: textColor }}><ArrowLeft className="h-6 w-6" /></button><h2 className="text-3xl font-black tracking-tighter" style={{ color: textColor }}>Филиалы</h2></div>
                        <div className="grid grid-cols-1 gap-4">
                            {(branches.length > 0 ? branches : (company?.branches || [])).map((b: any) => {
                                const isSelected = selectedBranch?.id === b.id;
                                return (
                                    <div 
                                        key={b.id} 
                                        onClick={() => handleSelectBranch(b)} 
                                        className="p-6 flex items-center justify-between cursor-pointer border-2 shadow-sm active:scale-[0.98] transition-all" 
                                        style={{ 
                                            backgroundColor: cardBg, 
                                            borderColor: isSelected ? accentColor : borderColor, 
                                            borderRadius: `${borderRadius}px`,
                                            boxShadow: isSelected ? `0 10px 30px ${accentColor}20` : 'none'
                                        }}
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className="h-14 w-14 flex items-center justify-center shadow-inner border-2" style={{ backgroundColor: cardBg, borderColor: borderColor, borderRadius: `${borderRadius/1.5}px` }}><MapPin className="h-7 w-7" style={{ color: textColor }} /></div>
                                            <div className="flex flex-col"><span className="text-xl font-bold tracking-tight" style={{ color: textColor }}>{b.name}</span><span className="text-sm font-medium opacity-40 truncate max-w-[200px]" style={{ color: textColor }}>{b.address || 'Адрес не указан'}</span></div>
                                        </div>
                                        {isSelected && <div className="h-8 w-8 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: accentColor }}><Check className="h-5 w-5 stroke-[3]" style={{ color: accentColor === '#F5FF82' ? '#000' : '#fff' }} /></div>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {view === 'specialist' && (
                    <div className="space-y-8 pt-4 animate-in slide-in-from-right-8 duration-500">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setView('home')} className="h-12 w-12 rounded-2xl flex items-center justify-center border-2 transition-colors hover:bg-neutral-50" style={{ borderColor: borderColor, color: textColor }}>
                                <ArrowLeft className="h-6 w-6" />
                            </button>
                            <h2 className="text-3xl font-black tracking-tighter" style={{ color: textColor }}>Мастера</h2>
                        </div>

                        <div className="flex flex-col gap-6">
                            {/* Any Master Card */}
                            <div 
                                onClick={() => handleSelectSpecialist(null)}
                                className={cn(
                                    "relative p-6 rounded-[2.5rem] border-2 transition-all duration-300 cursor-pointer bg-white shadow-sm hover:shadow-xl active:scale-[0.98]",
                                    !selectedEmployee ? "border-neutral-900 ring-4 ring-neutral-900/5" : "border-neutral-100 hover:border-neutral-200"
                                )}
                                style={{ borderColor: !selectedEmployee ? accentColor : undefined }}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-5">
                                        <div className="h-16 w-16 rounded-3xl bg-neutral-900 flex items-center justify-center shadow-lg">
                                            <Users className="h-8 w-8 text-white" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xl font-black tracking-tight" style={{ color: textColor }}>Любой мастер</span>
                                            <span className="text-sm font-bold opacity-40" style={{ color: textColor }}>Выберем свободного</span>
                                        </div>
                                    </div>
                                    {!selectedEmployee && <div className="h-8 w-8 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: accentColor }}><Check className="h-5 w-5 stroke-[4]" style={{ color: accentColor === '#F5FF82' ? '#000' : '#fff' }} /></div>}
                                </div>
                                
                                <div className="pt-4 border-t border-neutral-50">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-300 mb-3">Ближайшие окна всех мастеров:</p>
                                    <EmployeeAvailableSlots 
                                        employeeIds={employees.map((e: any) => e.id).join(',')} 
                                        mode="compact" 
                                        duration={totalDuration}
                                        onSlotSelect={(slot) => {
                                            setSelectedEmployee(null);
                                            handleSelectSlot(slot);
                                        }} 
                                    />
                                </div>
                            </div>

                            {/* Individual Master Cards */}
                            {employees.map((emp: any) => {
                                const isSelected = selectedEmployee?.id === emp.id;
                                return (
                                    <div 
                                        key={emp.id} 
                                        onClick={() => handleSelectSpecialist(emp)} 
                                        className={cn(
                                            "relative p-6 rounded-[2.5rem] border-2 transition-all duration-300 cursor-pointer bg-white shadow-sm hover:shadow-xl active:scale-[0.98]",
                                            isSelected ? "border-neutral-900 ring-4 ring-neutral-900/5" : "border-neutral-100 hover:border-neutral-200"
                                        )}
                                        style={{ borderColor: isSelected ? accentColor : undefined }}
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-5">
                                                <div className="relative">
                                                    <Avatar className="h-16 w-16 rounded-3xl ring-4 ring-neutral-50 shadow-inner">
                                                        <AvatarImage src={emp.avatar_url} />
                                                        <AvatarFallback className="font-black text-lg bg-neutral-100 text-neutral-400">{emp.name?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xl font-black tracking-tight" style={{ color: textColor }}>{emp.name}</span>
                                                    <span className="text-sm font-bold opacity-40" style={{ color: textColor }}>{emp.position || 'Специалист'}</span>
                                                </div>
                                            </div>
                                            {isSelected && <div className="h-8 w-8 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: accentColor }}><Check className="h-5 w-5 stroke-[4]" style={{ color: accentColor === '#F5FF82' ? '#000' : '#fff' }} /></div>}
                                        </div>
                                        
                                        <div className="pt-4 border-t border-neutral-50">
                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-300 mb-3">Ближайшее время:</p>
                                            <EmployeeAvailableSlots 
                                                employeeIds={emp.id} 
                                                mode="compact" 
                                                duration={totalDuration}
                                                onSlotSelect={(slot) => {
                                                    setSelectedEmployee(emp);
                                                    handleSelectSlot(slot);
                                                }} 
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {view === 'services' && (
                    <div className="space-y-8 pt-4 animate-in slide-in-from-right-8 duration-500">
                        <div className="flex items-center justify-between"><div className="flex items-center gap-4"><button onClick={() => setView('home')} className="h-12 w-12 rounded-2xl flex items-center justify-center border-2" style={{ borderColor: borderColor, color: textColor }}><ArrowLeft className="h-6 w-6" /></button><h2 className="text-3xl font-black tracking-tighter" style={{ color: textColor }}>Услуги</h2></div>{selectedServices.length > 0 && <Badge className="px-4 py-2 bg-black text-white font-black rounded-xl">{selectedServices.length}</Badge>}</div>
                        <div className="space-y-8">
                            {categories.map((cat: any) => (
                                <div key={cat.id} className="space-y-4">
                                    <h3 className="text-[12px] font-black uppercase tracking-[0.2em] opacity-30 px-2" style={{ color: textColor }}>{cat.name}</h3>
                                    <div className="grid grid-cols-1 gap-3">
                                        {services.filter((s: any) => s.category_id === cat.id).map((svc: any) => {
                                            const isSelected = selectedServices.some(s => s.id === svc.id);
                                            return (
                                                <div key={svc.id} onClick={() => handleSelectService(svc)} className="p-5 flex items-center justify-between cursor-pointer border-2 transition-all active:scale-[0.98]" style={{ backgroundColor: isSelected ? accentColor : cardBg, borderColor: isSelected ? accentColor : borderColor, borderRadius: `${borderRadius}px` }}>
                                                    <div className="flex flex-col text-left"><span className="text-lg font-bold tracking-tight" style={{ color: isSelected && (accentColor === '#000' || accentColor === '#171717') ? '#fff' : (isSelected ? '#000' : textColor) }}>{svc.name}</span><div className="flex items-center gap-3 mt-1 opacity-50 font-black text-[10px] uppercase tracking-widest" style={{ color: isSelected && (accentColor === '#000' || accentColor === '#171717') ? '#fff' : (isSelected ? '#000' : textColor) }}><span>{getEmployeeServiceDuration(svc, selectedEmployee?.id)} мин</span><div className="w-1 h-1 rounded-full bg-current" /><span>{getEmployeeServicePrice(svc, selectedEmployee?.id)} BYN</span></div></div>
                                                    <div className={cn("h-8 w-8 rounded-xl border-2 flex items-center justify-center transition-all", isSelected ? "bg-black border-black text-white scale-110 shadow-lg" : "border-neutral-200")}>{isSelected ? <Check className="h-5 w-5 stroke-[3]" /> : <Plus className="h-5 w-5 opacity-30" />}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {view === 'datetime' && (
                    <div className="space-y-8 pt-4 animate-in slide-in-from-right-8 duration-500">
                        <div className="flex items-center gap-4"><button onClick={() => setView('home')} className="h-12 w-12 rounded-2xl flex items-center justify-center border-2" style={{ borderColor: borderColor, color: textColor }}><ArrowLeft className="h-6 w-6" /></button><h2 className="text-3xl font-black tracking-tighter" style={{ color: textColor }}>Время</h2></div>
                        <div className="p-2 border-2" style={{ backgroundColor: cardBg, borderColor: borderColor, borderRadius: `${borderRadius}px` }}>
                            <EmployeeAvailableSlots 
                                employeeIds={selectedEmployee?.id || employees.map((e: any) => e.id).join(',')} 
                                duration={totalDuration}
                                onSlotSelect={(slot: any) => handleSelectSlot(slot)} 
                            />
                        </div>
                    </div>
                )}

                {view === 'profile' && (
                    <div className="space-y-8 pt-4 animate-in slide-in-from-right-8 duration-500">
                        <div className="flex items-center gap-4"><button onClick={() => setView('home')} className="h-12 w-12 rounded-2xl flex items-center justify-center border-2" style={{ borderColor: borderColor, color: textColor }}><ArrowLeft className="h-6 w-6" /></button><h2 className="text-3xl font-black tracking-tighter" style={{ color: textColor }}>Завершение</h2></div>
                        <div className="space-y-6">
                            <div className="p-6 border-2 space-y-6" style={{ backgroundColor: cardBg, borderColor: borderColor, borderRadius: `${borderRadius}px` }}>
                                <div className="space-y-3"><Label className="text-[11px] font-black uppercase opacity-40 px-1 tracking-widest" style={{ color: textColor }}>Ваше имя</Label><Input value={clientData.name} onChange={(e) => setClientData({...clientData, name: e.target.value})} className="h-16 border-2 shadow-inner font-bold text-lg px-6" style={{ backgroundColor: bgColor, borderColor: borderColor, borderRadius: `${borderRadius/1.5}px`, color: textColor }} placeholder="Иван Иванов"/></div>
                                <div className="space-y-3"><Label className="text-[11px] font-black uppercase opacity-40 px-1 tracking-widest" style={{ color: textColor }}>Телефон</Label><Input value={clientData.phone} onChange={(e) => setClientData({...clientData, phone: e.target.value})} className="h-16 border-2 shadow-inner font-bold text-lg px-6" style={{ backgroundColor: bgColor, borderColor: borderColor, borderRadius: `${borderRadius/1.5}px`, color: textColor }} placeholder="+375 •• ••• •• ••"/></div>
                                <div className="space-y-3"><Label className="text-[11px] font-black uppercase opacity-40 px-1 tracking-widest" style={{ color: textColor }}>Комментарий</Label><Textarea value={clientData.comment} onChange={(e) => setClientData({...clientData, comment: e.target.value})} className="min-h-[120px] border-2 shadow-inner font-bold px-6 py-4" style={{ backgroundColor: bgColor, borderColor: borderColor, borderRadius: `${borderRadius/1.5}px`, color: textColor }} placeholder="Ваши пожелания..."/></div>
                            </div>
                            <div className="p-6 border-2 border-dashed flex flex-col items-center justify-center" style={{ borderColor: borderColor, borderRadius: `${borderRadius}px` }}><p className="text-[10px] font-black uppercase opacity-30 text-center" style={{ color: textColor }}>Нажимая кнопку «Записаться», вы соглашаетесь с правилами предоставления услуг</p></div>
                        </div>
                    </div>
                )}

                {view === 'success' && (
                    <div className="flex flex-col items-center justify-center text-center space-y-8 pt-12 animate-in zoom-in-95 duration-700">
                        <div className="h-32 w-32 rounded-[3rem] bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner relative"><CheckCircle2 className="h-16 w-16 stroke-[3]" /><div className="absolute -top-2 -right-2 bg-emerald-500 h-8 w-8 rounded-full border-4 border-white animate-ping opacity-20" /></div>
                        <div className="space-y-2"><h2 className="text-4xl font-black tracking-tighter" style={{ color: textColor }}>Готово!</h2><p className="font-bold opacity-40" style={{ color: textColor }}>Ждем вас в назначенное время</p></div>
                        <div className="w-full p-8 border-2 space-y-6 text-left shadow-2xl transition-all" style={{ backgroundColor: cardBg, borderColor: borderColor, borderRadius: `${borderRadius}px` }}>
                            <div className="flex items-center gap-5"><div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center shadow-inner border-2" style={{ borderColor: borderColor }}><Calendar className="h-7 w-7 opacity-30" style={{ color: textColor }} /></div><div><p className="text-[11px] font-black uppercase opacity-30 mb-1" style={{ color: textColor }}>Дата и время</p><p className="text-xl font-bold tracking-tight" style={{ color: textColor }}>{selectedSlot ? `${displayDateFull(selectedSlot.start_time)}, ${displayTime(selectedSlot.start_time)}` : ''}</p></div></div>
                            <div className="flex items-center gap-5"><div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center shadow-inner border-2" style={{ borderColor: borderColor }}><User className="h-7 w-7 opacity-30" style={{ color: textColor }} /></div><div><p className="text-[11px] font-black uppercase opacity-30 mb-1" style={{ color: textColor }}>Специалист</p><p className="text-xl font-bold tracking-tight" style={{ color: textColor }}>{selectedEmployee?.name || 'Любой специалист'}</p></div></div>
                        </div>
                        <button onClick={() => setView('home')} className="w-full h-16 font-black border-2 rounded-2xl text-lg shadow-sm" style={{ borderColor: borderColor, color: textColor }}>Закрыть</button>
                    </div>
                )}
            </div>

            {['home', 'services', 'profile'].includes(view) && (
                <div className="absolute bottom-0 left-0 right-0 p-6 pb-[env(safe-area-inset-bottom,24px)] border-t z-50 shadow-[0_-20px_80px_rgba(0,0,0,0.1)] transition-all animate-in slide-in-from-bottom-full duration-500" style={{ backgroundColor: windowBg, borderColor: borderColor, backdropFilter: isGlass ? 'blur(24px)' : 'none' }}>
                    <button className="w-full h-16 font-black text-lg shadow-2xl transition-all active:scale-95 group overflow-hidden relative flex items-center justify-center gap-3" disabled={bookingMutation.isPending} style={{ backgroundColor: accentColor, color: (accentColor === '#F5FF82' ? '#000' : '#fff'), borderRadius: `${borderRadius}px` }} onClick={() => { if (view === 'profile') { handleFinalBooking(); } else if (selectedEmployee && selectedServices.length > 0 && selectedSlot) { setView('profile'); } else if (selectedBranch?.phone && view === 'home') { window.location.href = `tel:${selectedBranch.phone}`; } else { setView((settings.stepsOrder || ['services'])[0] as any); } }}>
                        {bookingMutation.isPending ? 'Сохранение...' : (<>{view === 'profile' ? 'Подтвердить запись' : (selectedEmployee && selectedServices.length > 0 && selectedSlot ? 'Перейти к оформлению' : (settings.buttonText || 'Записаться онлайн'))}<ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" /></>)}
                    </button>
                </div>
            )}
        </div>
    );
}
