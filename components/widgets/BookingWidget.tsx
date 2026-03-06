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
    Plus,
    MessageSquare,
    ChevronDown
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
import { useBookingStore } from '@/lib/booking-store';

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

const EMPTY_ARRAY: any[] = [];

export function BookingWidget({ 
    code, 
    company, 
    branch: initialBranch, 
    branches = EMPTY_ARRAY,
    employees: initialEmployees = EMPTY_ARRAY, 
    services: initialServices = EMPTY_ARRAY,
    categories: initialCategories = EMPTY_ARRAY,
    settings, 
    isPreview,
    onClose
}: BookingWidgetProps) {
    // 1. ZUSTAND STORE
    const { 
        stepOrder, 
        currentStepIndex, 
        selection, 
        setSteps, 
        setStepIndex, 
        nextStep, 
        prevStep,
        selectService,
        selectMaster,
        selectSlot,
        setData,
        resetAll
    } = useBookingStore();

    // 2. INTERNAL STATE & CONFIG
    const [view, setView] = useState<'home' | 'main' | 'success'>('home');
    const [clientData, setClientData] = useState({ name: '', phone: '', comment: '' });

    const widgetType = settings.widgetType || 'branch';
    const accentColor = settings.accentColor || '#F5FF82';
    const borderRadius = settings.borderRadius !== undefined ? settings.borderRadius : 24;
    const fontPair = settings.fontPair || 'modern';
    const theme = settings.theme || 'light';
    const useGradient = settings.useGradient || false;
    const headerSecondaryColor = settings.headerSecondaryColor || accentColor;
    const slotStep = settings.slotStep || 45;

    const fontFamily = settings.fontFamily || 'Inter';
    const opacity = settings.glassOpacity !== undefined ? settings.glassOpacity : 80;
    const glassBlur = settings.glassBlur !== undefined ? settings.glassBlur : 12;

    const isDark = theme === 'dark';
    const isGlass = theme === 'glass';
    const bgColor = isDark ? '#171717' : isGlass ? 'transparent' : '#ffffff';
    const windowBg = isDark ? '#171717' : isGlass ? `rgba(255, 255, 255, ${opacity / 100})` : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#171717';
    const borderColor = isDark ? '#262626' : isGlass ? 'rgba(255, 255, 255, 0.2)' : '#f5f5f5';
    const cardBg = isDark ? '#262626' : isGlass ? 'rgba(255, 255, 255, 0.5)' : '#ffffff';
    const accentTextColor = settings.accentTextColor || (accentColor === '#F5FF82' ? '#000000' : '#FFFFFF');

    // 3. EFFECT: INITIALIZE STORE 
    useEffect(() => {
        const newSteps = settings.stepsOrder || ['services', 'specialist', 'datetime'];
        // Only update if steps are actually different (shallow check is enough for basic string array)
        if (JSON.stringify(newSteps) !== JSON.stringify(stepOrder)) {
            setSteps(newSteps);
        }
        
        setData({ services: initialServices, masters: initialEmployees, categories: initialCategories });
    }, [settings.stepsOrder, initialServices, initialEmployees, initialCategories]);

    // 4. LIVE FILTERING LOGIC
    const filteredEmployees = useMemo(() => {
        if (selection.serviceIds.length === 0) return initialEmployees;
        return initialEmployees.filter(emp => {
            // Check if employee provides ALL selected services
            return selection.serviceIds.every(svcId => 
                initialServices.find(s => s.id === svcId)?.employees?.some((e: any) => e.employee_id === emp.id)
            );
        });
    }, [initialEmployees, selection.serviceIds, initialServices]);

    const filteredServices = useMemo(() => {
        if (!selection.masterId) return initialServices;
        return initialServices.filter(svc => 
            svc.employees?.some((e: any) => e.employee_id === selection.masterId)
        );
    }, [initialServices, selection.masterId]);

    const filteredCategories = useMemo(() => {
        const svcIds = filteredServices.map(s => s.id);
        return initialCategories.filter(cat => 
            initialServices.some(s => s.category_id === cat.id && svcIds.includes(s.id))
        );
    }, [initialCategories, filteredServices, initialServices]);

    const selectedServicesData = useMemo(() => {
        return initialServices.filter(s => selection.serviceIds.includes(s.id));
    }, [initialServices, selection.serviceIds]);

    const selectedMasterData = useMemo(() => {
        return initialEmployees.find(e => e.id === selection.masterId);
    }, [initialEmployees, selection.masterId]);

    const totalDuration = useMemo(() => {
        if (selection.serviceIds.length === 0) return 0;
        return selectedServicesData.reduce((sum, s) => {
            const empSvc = s.employees?.find((e: any) => e.employee_id === selection.masterId);
            return sum + (empSvc?.duration_minutes || s.duration_minutes || 30);
        }, 0);
    }, [selectedServicesData, selection.masterId]);

    const totalPrice = useMemo(() => {
        return selectedServicesData.reduce((sum, s) => {
            const empSvc = s.employees?.find((e: any) => e.employee_id === selection.masterId);
            return sum + (empSvc?.price || s.price || 0);
        }, 0);
    }, [selectedServicesData, selection.masterId]);

    const bookingMutation = useMutation({
        mutationFn: (data: any) => api.post('/bookings', data),
        onSuccess: () => {
            // queryClient.invalidateQueries({ queryKey: ['slots'] }); // Not needed with new store approach
            // queryClient.invalidateQueries({ queryKey: ['availableDates'] }); // Not needed with new store approach
            setView('success');
        },
        onError: () => toast.error('Ошибка при бронировании')
    });

    // 5. HANDLERS
    const handleFinalBooking = async () => {
        if (!clientData.name || !clientData.phone || !selection.slot) return;
        if (isPreview) { setView('success'); return; }
        
        const startTime = selection.slot.start_time;
        const endTime = DateTime.fromISO(startTime).plus({ minutes: totalDuration }).toISO();

        try {
            const customerRes = await api.post('/customers', { 
                company_id: company.id, 
                branch_id: initialBranch.id, 
                first_name: clientData.name, 
                phone: clientData.phone 
            });
            
            bookingMutation.mutate({
                company_id: company.id,
                branch_id: initialBranch.id,
                employee_id: selection.masterId || selection.slot.employee_id,
                client_id: customerRes.data.id,
                start_time: startTime,
                end_time: endTime,
                comment: clientData.comment,
                total_price: totalPrice,
                services: selectedServicesData.map(s => {
                    const empSvc = s.employees?.find((e: any) => e.employee_id === (selection.masterId || selection.slot.employee_id));
                    return {
                        service_id: s.id,
                        price: empSvc?.price || s.price || 0,
                        duration_minutes: empSvc?.duration_minutes || s.duration_minutes || 30
                    };
                })
            });
        } catch (err) {
            toast.error('Ошибка при создании бронирования');
        }
    };

    const currentStepName = stepOrder[currentStepIndex] || 'profile';

    return (
        <div 
            className={cn("w-full h-full relative overflow-hidden flex flex-col transition-all duration-500 bg-white", fontPair === 'classic' ? 'font-serif' : 'font-sans')} 
            style={{ 
                backgroundColor: bgColor, 
                borderRadius: `${borderRadius}px`,
                fontFamily: `'${fontFamily}', sans-serif`
            }}
        >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

            {/* Header / Summary Panel */}
            <div className="relative shrink-0 z-50 px-6 pt-6 pb-4">
                <div className="flex items-center justify-between mb-4">
                    <button onClick={() => view === 'home' ? onClose?.() : setView('home')} className="p-2.5 bg-neutral-900/5 hover:bg-neutral-900/10 backdrop-blur-md rounded-xl text-neutral-900 transition-all active:scale-90">
                        {view === 'home' ? <X className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
                    </button>
                    {view !== 'home' && view !== 'success' && (
                        <div className="flex-1 px-4">
                            <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full transition-all duration-500 ease-out" 
                                    style={{ 
                                        backgroundColor: accentColor, 
                                        width: `${((currentStepIndex + 1) / (stepOrder.length + 1)) * 100}%` 
                                    }} 
                                />
                            </div>
                        </div>
                    )}
                    <button onClick={onClose} className="p-2.5 bg-neutral-900/5 hover:bg-neutral-900/10 backdrop-blur-md rounded-xl text-neutral-900 transition-all active:scale-90"><Smartphone className="h-5 w-5" /></button>
                </div>

                {view !== 'home' && view !== 'success' && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-500 bg-neutral-50/50 backdrop-blur-sm border border-neutral-100 rounded-3xl p-4 flex flex-col gap-2">
                        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
                            {selectedServicesData.length > 0 ? (
                                selectedServicesData.map(s => (
                                    <Badge key={s.id} variant="outline" className="shrink-0 bg-white border-neutral-200 text-neutral-900 font-bold text-[10px] uppercase tracking-widest px-3 py-1 rounded-lg">
                                        {s.name}
                                    </Badge>
                                ))
                            ) : (
                                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-300">Услуги не выбраны</span>
                            )}
                        </div>
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-3">
                                {selectedMasterData ? (
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6 rounded-lg"><AvatarImage src={selectedMasterData.avatar_url} /><AvatarFallback>{selectedMasterData.name[0]}</AvatarFallback></Avatar>
                                        <span className="text-[11px] font-black uppercase text-neutral-900">{selectedMasterData.name}</span>
                                    </div>
                                ) : (
                                    <span className="text-[11px] font-black uppercase text-neutral-400">Любой специалист</span>
                                )}
                                {selection.slot && (
                                    <div className="flex items-center gap-2 border-l border-neutral-200 pl-3">
                                        <Calendar className="h-3 w-3 text-neutral-400" />
                                        <span className="text-[11px] font-black uppercase text-neutral-900">
                                            {DateTime.fromISO(selection.slot.start_time).setLocale('ru').toFormat('d MMM, HH:mm')}
                                        </span>
                                    </div>
                                )}
                            </div>
                            {totalPrice > 0 && <span className="text-[12px] font-black text-neutral-900">{totalPrice} ₽</span>}
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 relative z-10 overflow-y-auto custom-scrollbar px-6 pt-2 pb-32">
                {view === 'home' && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
                        <Avatar className="h-24 w-24 rounded-[2.5rem] ring-4 ring-neutral-50 shadow-2xl transition-transform duration-500 hover:scale-105">
                            <AvatarImage src={company?.logo_url} />
                            <AvatarFallback className="text-2xl font-black bg-neutral-900 text-white">{company?.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-2">
                            <h1 className="text-3xl font-black tracking-tighter text-neutral-900 uppercase italic">{company?.name}</h1>
                            <p className="text-neutral-400 font-bold uppercase text-[10px] tracking-[0.3em]">{initialBranch?.address || 'Онлайн-запись'}</p>
                        </div>
                        <div className="grid grid-cols-1 w-full gap-4 pt-4">
                            <Button 
                                onClick={() => { setView('main'); setStepIndex(0); }}
                                className="h-16 w-full rounded-2xl bg-neutral-900 hover:bg-black text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-black/10"
                                style={{ backgroundColor: accentColor, color: accentTextColor }}
                            >
                                {settings.buttonText || 'Записаться онлайн'}
                                <ChevronRight className="ml-2 h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                )}

                {view === 'main' && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-8">
                        {currentStepName === 'services' && (
                            <div className="space-y-8">
                                <h2 className="text-3xl font-black tracking-tighter text-neutral-900 uppercase italic">Выберите услуги</h2>
                                {filteredCategories.map((cat: any) => (
                                    <div key={cat.id} className="space-y-4">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">{cat.name}</h3>
                                        <div className="grid grid-cols-1 gap-3">
                                            {filteredServices.filter((s: any) => s.category_id === cat.id).map((svc: any) => {
                                                const isSelected = selection.serviceIds.includes(svc.id);
                                                return (
                                                    <div 
                                                        key={svc.id} 
                                                        onClick={() => selectService(svc.id)} 
                                                        className={cn(
                                                            "p-5 flex items-center justify-between cursor-pointer border-2 transition-all duration-300",
                                                            isSelected ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-50 bg-white hover:border-neutral-200"
                                                        )}
                                                        style={{ 
                                                            borderRadius: `${borderRadius}px`,
                                                            borderColor: isSelected ? accentColor : undefined,
                                                            backgroundColor: isSelected ? accentColor : undefined,
                                                            color: isSelected ? accentTextColor : undefined
                                                        }}
                                                    >
                                                        <div className="flex flex-col">
                                                            <span className="text-lg font-bold tracking-tight">{svc.name}</span>
                                                            <div className="flex items-center gap-3 mt-1 font-black text-[10px] uppercase tracking-widest opacity-60">
                                                                <span>{svc.duration_minutes || 30} мин</span>
                                                                <span>{svc.price} ₽</span>
                                                            </div>
                                                        </div>
                                                        <div className={cn(
                                                            "h-8 w-8 rounded-xl border-2 flex items-center justify-center transition-all",
                                                            isSelected ? "bg-white text-black border-white" : "border-neutral-100"
                                                        )} style={{ backgroundColor: isSelected ? accentTextColor : undefined, color: isSelected ? accentColor : undefined }}>
                                                            {isSelected && <Check className="h-5 w-5" />}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {currentStepName === 'specialist' && (
                            <div className="space-y-8">
                                <h2 className="text-3xl font-black tracking-tighter text-neutral-900 uppercase italic">Выберите мастера</h2>
                                <div className="flex flex-col gap-4">
                                    <div 
                                        onClick={() => selectMaster(null)} 
                                        className={cn(
                                            "p-6 border-2 cursor-pointer flex items-center justify-between transition-all duration-300",
                                            !selection.masterId ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-50 bg-white"
                                        )}
                                        style={{ 
                                            borderRadius: `${borderRadius}px`,
                                            borderColor: !selection.masterId ? accentColor : undefined,
                                            backgroundColor: !selection.masterId ? accentColor : undefined,
                                            color: !selection.masterId ? accentTextColor : undefined
                                        }}
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className="h-14 w-14 rounded-2xl bg-neutral-100 flex items-center justify-center">
                                                <Users className="h-7 w-7 text-neutral-400" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xl font-bold tracking-tight">Любой мастер</span>
                                                <span className="text-[10px] font-black uppercase opacity-40">Выберем свободного</span>
                                            </div>
                                        </div>
                                        {!selection.masterId && <Check className="h-6 w-6" />}
                                    </div>
                                    {filteredEmployees.map((emp: any) => (
                                        <div 
                                            key={emp.id} 
                                            onClick={() => selectMaster(emp.id)} 
                                            className={cn(
                                                "p-6 border-2 cursor-pointer flex items-center justify-between transition-all duration-300",
                                                selection.masterId === emp.id ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-50 bg-white"
                                            )}
                                            style={{ 
                                                borderRadius: `${borderRadius}px`,
                                                borderColor: selection.masterId === emp.id ? accentColor : undefined,
                                                backgroundColor: selection.masterId === emp.id ? accentColor : undefined,
                                                color: selection.masterId === emp.id ? accentTextColor : undefined
                                            }}
                                        >
                                            <div className="flex items-center gap-5">
                                                <Avatar className="h-14 w-14 rounded-2xl shadow-inner">
                                                    <AvatarImage src={emp.avatar_url} />
                                                    <AvatarFallback className="font-black">{emp.name[0]}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="text-xl font-bold tracking-tight">{emp.name}</span>
                                                    <span className="text-[10px] font-black uppercase opacity-40">{emp.position || 'Специалист'}</span>
                                                </div>
                                            </div>
                                            {selection.masterId === emp.id && <Check className="h-6 w-6" />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {currentStepName === 'datetime' && (
                            <div className="space-y-8">
                                <h2 className="text-3xl font-black tracking-tighter text-neutral-900 uppercase italic">Дата и время</h2>
                                <div className="p-2">
                                    <EmployeeAvailableSlots 
                                        employeeIds={selection.masterId || initialEmployees.map(e => e.id).join(',')} 
                                        duration={totalDuration || 30}
                                        step={slotStep}
                                        timezone={initialBranch?.timezone}
                                        onSlotSelect={(slot: any) => { selectSlot(slot); nextStep(); }} 
                                    />
                                </div>
                            </div>
                        )}

                        {currentStepName === 'profile' && (
                            <div className="space-y-8">
                                <h2 className="text-3xl font-black tracking-tighter text-neutral-900 uppercase italic">Завершение</h2>
                                <div className="space-y-6">
                                    <div className="bg-neutral-50/50 rounded-3xl p-6 border border-neutral-100 space-y-6">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest px-1">Ваше имя</Label>
                                            <Input value={clientData.name} onChange={(e) => setClientData({...clientData, name: e.target.value})} className="h-14 border-none bg-white font-bold text-lg rounded-2xl" placeholder="Иван Иванов"/>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest px-1">Телефон</Label>
                                            <Input value={clientData.phone} onChange={(e) => setClientData({...clientData, phone: e.target.value})} className="h-14 border-none bg-white font-bold text-lg rounded-2xl" placeholder="+7 (___) ___-__-__"/>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase text-neutral-400 tracking-widest px-1">Комментарий</Label>
                                            <Textarea value={clientData.comment} onChange={(e) => setClientData({...clientData, comment: e.target.value})} className="min-h-[100px] border-none bg-white font-bold rounded-2xl resize-none" placeholder="Есть пожелания к записи?"/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {view === 'success' && (
                    <div className="flex flex-col items-center justify-center text-center space-y-8 pt-12 animate-in zoom-in-95 duration-700 h-[60vh]">
                        <div className="h-32 w-32 rounded-[3.5rem] bg-emerald-50 text-emerald-500 flex items-center justify-center shadow-inner relative">
                            <CheckCircle2 className="h-16 w-16 stroke-[3]" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-4xl font-black tracking-tighter text-neutral-900 uppercase italic">Вы записаны!</h2>
                            <p className="font-bold text-neutral-400 uppercase text-[10px] tracking-widest">Ждем вас в назначенное время</p>
                        </div>
                        <Button onClick={() => { resetAll(); setView('home'); }} className="w-full h-16 font-black uppercase text-xs tracking-widest border-2 border-neutral-100 rounded-3xl" variant="outline">На главную</Button>
                    </div>
                )}
            </div>

            {/* Bottom Navigation */}
            {view === 'main' && (
                <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-neutral-100 bg-white/80 backdrop-blur-md z-50">
                    <Button 
                        disabled={
                            (currentStepName === 'services' && selection.serviceIds.length === 0) ||
                            (currentStepName === 'profile' && (!clientData.name || !clientData.phone))
                        }
                        className="w-full h-16 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-black/10 transition-all active:scale-95" 
                        style={{ backgroundColor: accentColor, color: accentTextColor }}
                        onClick={() => {
                            if (currentStepIndex === stepOrder.length) {
                                handleFinalBooking();
                            } else if (currentStepName === 'datetime') {
                                // Handled in selectSlot
                            } else {
                                nextStep();
                            }
                        }}
                    >
                        {currentStepIndex === stepOrder.length ? 'Подтвердить запись' : 'Продолжить'}
                        <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                </div>
            )}
        </div>
    );
}
