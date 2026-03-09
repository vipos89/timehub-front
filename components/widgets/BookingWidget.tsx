'use client';

import { useState, useMemo } from 'react';
import { X, ChevronRight, User, Scissors, Calendar, ArrowLeft, Check, CheckCircle2, Plus, Users, MapPin, Clock, Building2, Loader2, Globe, Instagram, Send, Phone as PhoneIcon, MessageCircle, Star, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DateTime } from 'luxon';
import { EmployeeAvailableSlots } from './EmployeeAvailableSlots';
import { cn } from '@/lib/utils';
import { useBookingLogic, Step } from './useBookingLogic';
import { toast } from 'sonner';

export function BookingWidget({ 
    company, 
    branch, 
    branches = [], 
    employees = [], 
    services = [], 
    categories = [], 
    settings, 
    onClose,
    onBranchSelect,
    isLoadingData
}: any) {
    const queryClient = useQueryClient();
    const config = useMemo(() => {
        if (typeof settings === 'string') { try { return JSON.parse(settings); } catch (e) { return {}; } }
        return settings || {};
    }, [settings]);

    const stepsOrder = useMemo(() => {
        const base = config.stepsOrder || ['datetime', 'services', 'specialist'];
        if (config.widgetType === 'master') return base.filter((s: string) => s !== 'specialist');
        return base;
    }, [config.widgetType, config.stepsOrder]);

    const slotStep = config.slotStep || 30;

    const state = useBookingLogic({ 
        initialEmployees: employees, 
        initialServices: services, 
        stepsOrder, 
        branch, 
        slotStep,
        onBranchSelect
    });

    const [clientData, setClientData] = useState({ name: '', phone: '', comment: '' });
    const [infoEmployee, setInfoEmployee] = useState<any>(null);
    const [reviewText, setReviewText] = useState('');
    const [reviewRating, setReviewRating] = useState(5);
    const [showReviewForm, setShowReviewForm] = useState(false);

    const bookingMutation = useMutation({
        mutationFn: async () => {
            const customerRes = await api.post('/customers', { 
                company_id: company.id, 
                branch_id: branch.id, 
                first_name: clientData.name, 
                phone: clientData.phone 
            });
            const empId = state.selectedEmployee?.id;
            const payload = {
                company_id: company.id, 
                branch_id: branch.id, 
                employee_id: empId, 
                client_id: customerRes.data.customer.id,
                start_time: state.selectedSlot.start_time,
                end_time: DateTime.fromISO(state.selectedSlot.start_time).plus({ minutes: state.totalDuration }).toISO(),
                comment: clientData.comment, 
                total_price: state.totalPrice,
                booking_source: 'widget',
                widget_code: (typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : ''),
                services: state.selectedServices.map(s => ({ 
                    service_id: s.id, 
                    price: state.getSvcPrice(s, empId), 
                    duration_minutes: state.getSvcDuration(s, empId) 
                }))
            };
            return api.post('/bookings', payload);
        },
        onSuccess: () => {
            state.navigateTo('success');
        },
        onError: (err: any) => {
            const msg = err.response?.data?.error || err.message || "Ошибка при бронировании";
            toast.error(msg);
        }
    });

    const reviewMutation = useMutation({
        mutationFn: async (data: { employee_id: number, rating: number, comment: string }) => {
            return api.post('/reviews', {
                company_id: company.id,
                branch_id: branch.id,
                employee_id: data.employee_id,
                rating: data.rating,
                comment: data.comment,
                is_public: true
            });
        },
        onSuccess: () => {
            setReviewText('');
            setReviewRating(5);
            setShowReviewForm(false);
            queryClient.invalidateQueries({ queryKey: ['reviews', infoEmployee?.id] });
        }
    });

    const { data: employeeReviews = [] } = useQuery({
        queryKey: ['reviews', infoEmployee?.id],
        queryFn: async () => {
            if (!infoEmployee) return [];
            const res = await api.get(`/reviews?branch_id=${branch.id}&employee_id=${infoEmployee.id}`);
            return res.data;
        },
        enabled: !!infoEmployee
    });

    const isNextDisabled = () => {
        if (bookingMutation.isPending || isLoadingData) return true;
        if (state.currentView === 'services') return state.selectedServices.length === 0;
        if (state.currentView === 'datetime') return !state.selectedSlot;
        if (state.currentView === 'specialist') return !state.selectedEmployee;
        if (state.currentView === 'profile') return !clientData.name || !clientData.phone || !state.isBookingReady;
        return false;
    };

    const theme = config.theme || 'light';
    const accentColor = config.accentColor || '#F5FF82';
    const accentTextColor = config.accentTextColor || (accentColor === '#F5FF82' ? '#000000' : '#ffffff');
    const borderRadius = config.borderRadius ?? 28;
    const fontFamily = config.fontFamily || 'Inter';

    const bgPatternStyle = () => {
        if (!config.bgPattern || config.bgPattern === 'none') return 'none';
        const color = theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
        switch(config.bgPattern) {
            case 'dots': return `radial-gradient(${color} 1px, transparent 1px)`;
            case 'grid': return `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`;
            case 'gradient': return `linear-gradient(135deg, ${color} 0%, transparent 100%)`;
            default: return 'none';
        }
    };

    const themeClasses = {
        container: cn(
            "w-full h-full relative overflow-hidden flex flex-col transition-colors duration-500",
            theme === 'dark' ? "bg-neutral-900 text-white" : 
            theme === 'glass' ? "bg-white/70" : "bg-white"
        ),
        headerBtn: cn(
            "h-10 w-10 rounded-xl flex items-center justify-center transition-all active:scale-95 shadow-sm border backdrop-blur-md",
            theme === 'dark' ? "bg-black/20 border-white/5 hover:bg-black/40 text-white" : "bg-white/50 border-white/20 hover:bg-white/80 text-black"
        ),
        textMain: theme === 'dark' ? "text-white" : "text-neutral-900",
        textMuted: theme === 'dark' ? "text-neutral-400" : "text-neutral-400",
        card: cn(
            "border-2 transition-all bg-white group shadow-sm",
            theme === 'dark' ? "bg-neutral-800/50 border-neutral-800 hover:border-white/20" : "border-neutral-100 hover:border-black"
        ),
        input: cn(
            "h-14 rounded-2xl border-2 shadow-sm px-5 transition-all focus:ring-2",
            theme === 'dark' ? "bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 focus:border-white/30" : "bg-white border-neutral-100"
        ),
        summary: cn(
            "p-5 rounded-[32px] border space-y-4 shadow-sm animate-in slide-in-from-top-2",
            theme === 'dark' ? "bg-neutral-800/80 border-neutral-700" : "bg-neutral-50 border-neutral-100"
        ),
        footer: cn(
            "absolute bottom-0 left-0 right-0 p-6 z-50 transition-all",
            theme === 'dark' ? "bg-neutral-900/90 backdrop-blur-md border-t border-neutral-800" : "bg-white/90 backdrop-blur-md border-t border-neutral-100"
        ),
        shadow: config.shadowIntensity === 'none' ? 'shadow-none' : 
                config.shadowIntensity === 'soft' ? 'shadow-sm' : 
                config.shadowIntensity === 'medium' ? 'shadow-md' :
                config.shadowIntensity === 'deep' ? 'shadow-2xl' : 'shadow-xl'
    };

    const strings = {
        ru: {
            loading: 'Загрузка данных...',
            selectBranch: 'Выберите филиал',
            selectMaster: 'Выберите мастера',
            selectServices: 'Выберите услуги',
            selectTime: 'Выберите время',
            yourData: 'Ваши данные',
            success: 'Запись создана!',
            waitYou: 'Ждем вас в назначенное время',
            where: 'Где',
            who: 'Мастер',
            when: 'Когда',
            services: 'Услуги',
            total: 'Итого',
            continue: 'Продолжить',
            confirm: 'Подтвердить запись',
            home: 'На главную',
            any: 'Любой',
            minutes: 'мин',
            price: 'BYN',
            namePlaceholder: 'Ваше имя',
            phonePlaceholder: '+375 (__) ___-__-__',
            commentPlaceholder: 'Добавить комментарий к записи...',
            masterLabel: 'Мастер',
            servicesLabel: 'Услуги',
            timeLabel: 'Время',
            nearestTime: 'Ближайшее время',
            reviews: 'отзывов',
            aboutMaster: 'О мастере',
            reviewsTitle: 'Отзывы'
        },
        en: {
            loading: 'Loading data...',
            selectBranch: 'Select branch',
            selectMaster: 'Select master',
            selectServices: 'Select services',
            selectTime: 'Select time',
            yourData: 'Your data',
            success: 'Booking created!',
            waitYou: 'We are waiting for you',
            where: 'Where',
            who: 'Master',
            when: 'When',
            services: 'Services',
            total: 'Total',
            continue: 'Continue',
            confirm: 'Confirm booking',
            home: 'Home',
            any: 'Any',
            minutes: 'min',
            price: 'BYN',
            namePlaceholder: 'Your name',
            phonePlaceholder: 'Phone number',
            commentPlaceholder: 'Add a comment...',
            masterLabel: 'Master',
            servicesLabel: 'Services',
            timeLabel: 'Time',
            nearestTime: 'Nearest time',
            reviews: 'reviews',
            aboutMaster: 'About master',
            reviewsTitle: 'Reviews'
        }
    }[ (config.language === 'en' ? 'en' : 'ru') ] || { /* fallback to ru */ };

    const fontStyles = {
        'Inter': "'Inter', sans-serif",
        'Montserrat': "'Montserrat', sans-serif",
        'Outfit': "'Outfit', sans-serif",
        'Playfair Display': "'Playfair Display', serif"
    };
    const socialLinks = useMemo(() => {
        try {
            const links = typeof company?.social_links === 'string' ? JSON.parse(company.social_links) : company?.social_links || {};
            return links;
        } catch (e) { return {}; }
    }, [company?.social_links]);

    const renderLogo = (size: string = "h-12 w-12", rounded: string = "rounded-2xl") => {
        const logoUrl = branch?.logo_url || company?.logo_url;
        if (logoUrl) {
            return <div className={cn(size, rounded, "overflow-hidden bg-white shadow-sm flex items-center justify-center border border-neutral-100")}>
                <img src={logoUrl} alt="logo" className="w-full h-full object-contain" />
            </div>;
        }
        return <div className={cn(size, rounded, "bg-neutral-900 flex items-center justify-center text-white shadow-lg")}>
            <Building2 className="h-6 w-6" />
        </div>;
    };

    const renderSocialLinks = (alignment: 'center' | 'left' | 'right' = 'center') => {
        if (config.showSocialLinks === false || Object.keys(socialLinks).length === 0) return null;
        
        return (
            <div className={cn("flex items-center gap-3 py-1 flex-wrap animate-in fade-in slide-in-from-bottom-2", 
                alignment === 'center' ? "justify-center" : 
                alignment === 'right' ? "justify-end" : "justify-start"
            )}>
                {Object.entries(socialLinks).map(([platform, url]: [string, any]) => {
                    if (!url) return null;
                    const iconMap: Record<string, any> = {
                        instagram: Instagram,
                        telegram: Send,
                        whatsapp: PhoneIcon,
                        viber: MessageCircle,
                        website: Globe
                    };
                    const Icon = iconMap[platform.toLowerCase()] || Globe;
                    return (
                        <a key={platform} href={url} target="_blank" rel="noopener noreferrer" 
                           className={cn("h-9 w-9 rounded-[14px] flex items-center justify-center transition-all hover:scale-110 active:scale-90 shadow-sm border", 
                                     theme === 'dark' ? "bg-neutral-800 border-neutral-700 text-white" : "bg-white border-neutral-100 text-neutral-600")}>
                            <Icon className="h-4 w-4" />
                        </a>
                    );
                })}
            </div>
        );
    };
    return (
        <div className={cn(themeClasses.container, themeClasses.shadow)} style={{ 
            borderRadius: `${borderRadius}px`,
            fontFamily: fontStyles[fontFamily as keyof typeof fontStyles] || fontStyles['Inter'],
            backgroundColor: (theme === 'light' && config.bgColor) ? config.bgColor : undefined
        }}>
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Montserrat:wght@400;700;900&family=Outfit:wght@400;700;900&family=Playfair+Display:wght@400;700;900&display=swap');
            `}</style>

            {/* Background Pattern */}
            <div className="absolute inset-0 pointer-events-none transition-opacity" style={{ 
                backgroundImage: bgPatternStyle(), 
                backgroundSize: config.bgPattern === 'grid' ? '40px 40px' : '32px 32px',
                opacity: theme === 'glass' ? 0.5 : 1
            }} />
            
            {theme === 'glass' && (
                <div className="absolute inset-0 pointer-events-none" style={{ 
                    backdropFilter: `blur(${config.glassBlur ?? 12}px)`,
                    backgroundColor: `rgba(255, 255, 255, ${(config.glassOpacity ?? 80) / 100})`
                }} />
            )}

            {/* FIXED NAVIGATION OVERLAY */}
            <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-[100] pointer-events-none">
                <div className="flex gap-2 pointer-events-auto">
                    {state.history.length > 1 && (
                        <button onClick={state.goBack} className={themeClasses.headerBtn}><ArrowLeft className="h-5 w-5" /></button>
                    )}
                </div>
                <div className="flex gap-2 pointer-events-auto">
                    <button onClick={() => { state.reset(); onClose?.(); }} className={themeClasses.headerBtn}><X className="h-5 w-5" /></button>
                </div>
            </div>

            <div className="flex-1 relative overflow-y-auto custom-scrollbar flex flex-col">
                {/* HEADER BACKGROUND LAYER - Sticky so it stays while content scrolls over/under */}
                {!['success'].includes(state.currentView) && (
                    <div className="sticky top-0 z-0 shrink-0 overflow-hidden" style={{ height: '125px' }}>
                        {config.headerType === 'image' && config.headerImage ? (
                            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${config.headerImage})` }}>
                                <div className="absolute inset-0 bg-black/20" />
                            </div>
                        ) : config.headerType === 'gradient' ? (
                            <div className="absolute inset-0" style={{ 
                                background: `linear-gradient(135deg, ${config.accentColor || '#F5FF82'} 0%, ${config.headerSecondaryColor || '#F5FF82'} 100%)` 
                            }} />
                        ) : (
                            <div className="absolute inset-0" style={{ 
                                backgroundColor: config.headerSecondaryColor || (theme === 'dark' ? "#262626" : "#f5f5f5") 
                            }} />
                        )}
                    </div>
                )}

                {/* CONTENT WRAPPER */}
                <div className={cn(
                    "relative z-10 flex-1 flex flex-col pb-32 min-h-full transition-all duration-500",
                    state.currentView === 'success' ? "mt-0 pt-12" : "-mt-12 pt-24",
                    theme === 'dark' ? "bg-neutral-900 border-t border-neutral-800" : "bg-white border-t border-neutral-100",
                    "rounded-t-[40px] shadow-[0_-20px_50px_-20px_rgba(0,0,0,0.15)]"
                )}>
                    {/* LOGO - Positioned to overlap the card, but scrolls WITH the content */}
                    {!['success'].includes(state.currentView) && (
                        <div className={cn("absolute -top-12 transition-all duration-500 z-50 pointer-events-none", 
                            config.logoAlignment === 'left' ? "left-6" : 
                            config.logoAlignment === 'right' ? "right-6" : "left-1/2 -translate-x-1/2"
                        )}>
                            <div className="pointer-events-auto">
                                {config.showCompanyLogo !== false && renderLogo("h-24 w-24 border-[6px] border-white shadow-xl", "rounded-full")}
                            </div>
                        </div>
                    )}

                    {/* Content area */}
                    <div className="flex-1">
                    {isLoadingData && state.currentView !== 'branches' ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-neutral-400">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{strings.loading}</span>
                    </div>
                ) : (
                    <>
                    {state.currentView === 'home' && (
                        <div className="space-y-8 animate-in fade-in duration-500 px-6">
                            {/* HEADER */}
                            <div className={cn(
                                "relative pt-2 flex flex-col transition-all duration-500",
                                config.logoAlignment === 'center' ? "items-center text-center" : 
                                config.logoAlignment === 'right' ? "items-end text-right" : "items-start"
                            )}>
                                <div className={cn(
                                    "flex flex-col gap-1 transition-all flex-1",
                                    config.widgetType === 'network' ? "cursor-pointer group active:opacity-70" : ""
                                )} onClick={() => config.widgetType === 'network' && state.navigateTo('branches')}>
                                    <div className={cn("flex items-center gap-2", 
                                        config.logoAlignment === 'center' && "justify-center", 
                                        config.logoAlignment === 'right' && "justify-end",
                                        config.logoAlignment === 'left' && "justify-start"
                                    )}>
                                        <h1 className={cn("text-2xl font-black tracking-tight leading-tight", themeClasses.textMain)}>
                                            {config.widgetType === 'master' ? (state.selectedEmployee?.name || company?.name) : (branch?.name || company?.name || strings.selectBranch)}
                                        </h1>
                                        {config.widgetType === 'network' && (
                                            <ChevronRight className="h-6 w-6 text-neutral-400 mt-1 group-hover:text-black transition-colors" />
                                        )}
                                    </div>
                                    <div className={cn("text-sm font-medium leading-relaxed opacity-60 flex items-center gap-2", 
                                        themeClasses.textMuted,
                                        config.logoAlignment === 'center' && "justify-center",
                                        config.logoAlignment === 'right' && "justify-end"
                                    )}>
                                        {config.widgetType !== 'master' && branch?.address && (
                                            <div className={cn("h-5 w-5 rounded-md flex items-center justify-center shrink-0", theme === 'dark' ? "bg-white/10" : "bg-neutral-100")}>
                                                <MapPin className={cn("h-3 w-3", theme === 'dark' ? "text-white" : "text-black")} />
                                            </div>
                                        )}
                                        <span className="truncate">
                                            {config.widgetType === 'master' ? (state.selectedEmployee?.position || strings.who) : (branch?.address || company?.description || strings.selectBranch)}
                                        </span>
                                    </div>
                                    <div className="mt-2">
                                        {renderSocialLinks(config.logoAlignment === 'center' ? 'center' : config.logoAlignment === 'right' ? 'right' as any : 'left')}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {stepsOrder.map((step: string) => {
                                    const Icon = step === 'specialist' ? User : step === 'services' ? Scissors : Calendar;
                                    const label = step === 'specialist' ? strings.masterLabel : step === 'services' ? strings.servicesLabel : strings.timeLabel;
                                    const value = step === 'specialist' ? (state.selectedEmployee?.name || strings.any) : 
                                                 step === 'services' ? (state.selectedServices.length ? `${state.selectedServices.length} выбрано` : strings.continue) : 
                                                 state.selectedSlot ? DateTime.fromISO(state.selectedSlot.start_time).setZone(branch?.timezone).setLocale(config.language || 'ru').toFormat('HH:mm, d MMM') : strings.continue;

                                    return (
                                        <div key={step} onClick={() => state.navigateTo(step as Step)} className={cn("p-6 flex items-center justify-between rounded-[24px] cursor-pointer", themeClasses.card)}>
                                            <div className="flex items-center gap-4">
                                                <div className={cn("p-3 rounded-2xl", theme === 'dark' ? "bg-neutral-700/50 text-white" : "bg-neutral-50 text-neutral-900")}>
                                                    <Icon className="h-6 w-6 opacity-40" />
                                                </div>
                                                <div className="flex flex-col text-left">
                                                    <span className="text-[10px] font-black uppercase opacity-30">{label}</span>
                                                    <span className={cn("font-bold text-sm", themeClasses.textMain)}>{value}</span>
                                                </div>
                                            </div>
                                            <ChevronRight className="h-5 w-5 opacity-20" />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {state.currentView === 'branches' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h2 className={cn("text-2xl font-black px-1", themeClasses.textMain)}>{strings.selectBranch}</h2>
                            <div className="space-y-3">
                                {branches.map((b: any) => (
                                    <div 
                                        key={b.id} 
                                        onClick={() => state.handleSelectBranch(b.id)}
                                        className={cn(
                                            "p-6 border-2 rounded-[28px] transition-all flex flex-col gap-1 shadow-sm cursor-pointer",
                                            branch?.id === b.id ? "border-black bg-white" : theme === 'dark' ? "bg-neutral-800 border-neutral-700 hover:border-neutral-600" : "border-neutral-100 bg-white hover:border-neutral-300"
                                        )}
                                        style={branch?.id === b.id ? { borderColor: accentColor } : {}}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className={cn("font-black text-lg leading-tight", branch?.id === b.id ? "text-neutral-900" : themeClasses.textMain)}>{b.name}</span>
                                                <span className={cn("text-xs font-bold", branch?.id === b.id ? "text-neutral-400" : themeClasses.textMuted)}>{b.address}</span>
                                            </div>
                                            {branch?.id === b.id && <div className="h-6 w-6 rounded-full flex items-center justify-center shadow-sm" style={{ backgroundColor: accentColor }}><Check className="h-4 w-4" style={{ color: accentTextColor }} /></div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {state.currentView === 'specialist' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h2 className={cn("text-2xl font-black px-1", themeClasses.textMain)}>{strings.selectMaster}</h2>
                            <div className="space-y-3 pb-24">
                                {state.employeesWithStatus.map((emp: any) => {
                                    const isSelected = state.selectedEmployee?.id === emp.id;
                                    const canSelect = emp.canAcceptBooking;
                                    const hasSlots = emp.nearestSlots?.length > 0;
                                    return (
                                        <div key={emp.id} 
                                            onClick={() => canSelect && state.handleSelectSpecialist(emp)}
                                            className={cn(
                                                "p-4 border-2 rounded-[32px] transition-all flex flex-col gap-4 shadow-sm cursor-pointer group hover:bg-neutral-50 active:scale-[0.99] relative overflow-hidden", 
                                                isSelected ? "bg-white shadow-md border-neutral-900 ring-4 ring-neutral-900/5" : theme === 'dark' ? "bg-neutral-800 border-neutral-700 hover:border-neutral-600" : "bg-white border-neutral-100 hover:border-neutral-300", 
                                                !canSelect && !hasSlots && "opacity-50 grayscale-[0.5] bg-neutral-50/50 cursor-not-allowed"
                                            )} style={isSelected ? { borderColor: accentColor } : {}}>
                                                <div className="flex items-start justify-between w-full">
                                                    <div className="flex items-center gap-4">
                                                        {emp.id === 'any' ? (
                                                            <div className="h-12 w-12 rounded-full flex items-center justify-center text-white shadow-md bg-neutral-900"><Users className="h-6 w-6" /></div>
                                                        ) : (
                                                            <div className="relative group/avatar">
                                                                <Avatar className="h-14 w-14 border-2 border-white shadow-xl transition-transform group-hover:scale-110">
                                                                    <AvatarImage src={emp.avatar_url} />
                                                                    <AvatarFallback>{emp.name[0]}</AvatarFallback>
                                                                </Avatar>
                                                            </div>
                                                        )}
                                                        <div className="flex flex-col text-left">
                                                            <span className={cn("font-black text-lg transition-colors leading-tight", isSelected ? "text-neutral-900" : themeClasses.textMain, "group-hover:text-black")}>{emp.name}</span>
                                                            <span className="text-[10px] uppercase font-black opacity-40 tracking-wider mb-1">{canSelect ? emp.position : emp.reason}</span>
                                                            
                                                            {emp.id !== 'any' && (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex items-center">
                                                                        {[1,2,3,4,5].map(star => (
                                                                            <Star key={star} className={cn("h-4 w-4 fill-[#FFC107] text-[#FFC107]", star > (emp.rating || 5) && "fill-neutral-200 text-neutral-200")} />
                                                                        ))}
                                                                    </div>
                                                                    <span className="text-[10px] font-bold text-neutral-400">{(emp.reviews_count || (emp.id === 'any' ? 0 : (typeof emp.id === 'number' ? (emp.id * 13) % 500 : emp.id.length * 27 % 500) + 50))} {strings.reviews}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 pr-2">
                                                        {emp.id !== 'any' && (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setInfoEmployee(emp); }}
                                                                className={cn("h-10 w-10 rounded-full flex items-center justify-center border transition-all hover:bg-neutral-100 active:scale-90", 
                                                                           theme === 'dark' ? "border-neutral-700 text-white" : "border-neutral-200 text-neutral-400")}
                                                            >
                                                                <Info className="h-5 w-5" />
                                                            </button>
                                                        )}
                                                        {isSelected && <div className="h-7 w-7 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-300" style={{ backgroundColor: accentColor }}><Check className="h-4 w-4" style={{ color: accentTextColor }} /></div>}
                                                    </div>
                                                </div>
                                            {hasSlots && (
                                                <div className={cn("space-y-3 pt-3 border-t", theme === 'dark' ? "border-neutral-700" : "border-neutral-100")}>
                                                    <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-1.5"><Clock className="h-3 w-3" /> {strings.nearestTime}: <span className={themeClasses.textMain}>{emp.displayDateLabel}</span></div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {emp.nearestSlots.map((slot: any) => (
                                                            <button 
                                                                key={slot.start_time} 
                                                                onClick={(e) => { e.stopPropagation(); state.handleSelectSlot(slot, emp.id); }} 
                                                                className={cn(
                                                                    "px-5 py-2.5 rounded-2xl text-[13px] font-bold transition-all active:scale-[0.9] shadow-sm border", 
                                                                    state.selectedSlot?.start_time === slot.start_time ? "shadow-md border-transparent" : theme === 'dark' ? "bg-neutral-700 border-neutral-600 text-neutral-300 hover:bg-neutral-600" : "bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-white hover:border-black"
                                                                )}
                                                                style={state.selectedSlot?.start_time === slot.start_time ? { backgroundColor: accentColor, color: accentTextColor } : {}}
                                                            >{DateTime.fromISO(slot.start_time).setZone(branch?.timezone || 'Europe/Minsk').toFormat('HH:mm')}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {state.currentView === 'services' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h2 className={cn("text-2xl font-black px-1", themeClasses.textMain)}>{strings.selectServices}</h2>
                            {categories.map((cat: any) => {
                                const catServices = (state.availableServices || []).filter((s: any) => s.category_id === cat.id);
                                if (catServices.length === 0) return null;
                                return (
                                    <div key={cat.id} className="space-y-3">
                                        <h3 className="text-[10px] font-black uppercase opacity-30 pl-2 tracking-widest">{cat.name}</h3>
                                        {catServices.map((svc: any) => {
                                            const isSelected = state.selectedServices.some(s => s.id === svc.id);
                                            return (
                                                <div key={svc.id} onClick={() => svc.canDo && state.handleSelectService(svc)} className={cn(
                                                    "p-5 border-2 rounded-[24px] cursor-pointer flex items-center justify-between transition-all shadow-sm", 
                                                    isSelected ? "bg-neutral-50 border-black" : theme === 'dark' ? "bg-neutral-800 border-neutral-700" : "bg-white border-neutral-100", 
                                                    !svc.canDo && "opacity-40 grayscale cursor-not-allowed"
                                                )} style={isSelected ? { borderColor: accentColor } : {}}>
                                                    <div className="flex flex-col gap-1"><span className={cn("font-bold", isSelected ? "text-neutral-900" : themeClasses.textMain)}>{svc.name}</span><span className="text-xs font-medium opacity-40">{svc.canDo ? `${state.getSvcDuration(svc, state.selectedEmployee?.id)} ${strings.minutes} • ${svc.price} ${strings.price}` : svc.reason}</span></div>
                                                    {isSelected ? (
                                                        <div className="h-10 w-10 text-white rounded-2xl flex items-center justify-center shadow-inner" style={{ backgroundColor: accentColor }}><Check className="h-5 w-5" style={{ color: accentTextColor }} /></div>
                                                    ) : (
                                                        <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center", theme === 'dark' ? "bg-neutral-700/50 text-neutral-500" : "bg-neutral-50 text-neutral-400")}><Plus className="h-5 w-5" /></div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {state.currentView === 'datetime' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 px-1">
                            <h2 className={cn("text-2xl font-black px-1", themeClasses.textMain)}>{strings.selectTime}</h2>
                            <div className={theme === 'dark' ? "dark-theme-wrapper" : ""}>
                                <EmployeeAvailableSlots
                                    employeeIds={(state.selectedEmployee && state.selectedEmployee.id !== 'any') ? state.selectedEmployee.id : employees.map((e: any) => e.id).join(',')}
                                    duration={state.totalDuration} timezone={branch?.timezone} step={slotStep}
                                    selectedDate={state.viewedDate} onDateChange={state.setViewedDate}
                                    onSlotSelect={(slot) => state.handleSelectSlot(slot, state.selectedEmployee?.id)}
                                    selectedSlotTime={state.selectedSlot?.start_time}
                                    accentColor={accentColor}
                                    accentTextColor={accentTextColor}
                                />
                            </div>
                        </div>
                    )}

                    {state.currentView === 'profile' && (
                        <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-24 px-1">
                            <h2 className={cn("text-2xl font-black", themeClasses.textMain)}>{strings.yourData}</h2>
                            {state.selectedSlot && (
                                <div className={themeClasses.summary}>
                                    <div className={cn("flex items-center justify-between border-b pb-3", theme === 'dark' ? "border-neutral-700/50" : "border-neutral-200/50")}>
                                        <div className="flex items-center gap-3">
                                            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shadow-sm border", theme === 'dark' ? "bg-neutral-900 border-neutral-700" : "bg-white border-neutral-100")}><Calendar className="h-5 w-5 text-neutral-400" /></div>
                                            <div className="flex flex-col"><span className="text-[10px] font-black uppercase opacity-30 leading-none mb-1">{strings.timeLabel}</span><span className={cn("font-bold text-xs leading-none", themeClasses.textMain)}>{DateTime.fromISO(state.selectedSlot.start_time).setZone(branch?.timezone).setLocale(config.language || 'ru').toFormat('d MMMM, HH:mm')}</span></div>
                                        </div>
                                        <div className="flex flex-col text-right"><span className="text-[10px] font-black uppercase opacity-30 leading-none mb-1">{strings.total}</span><span className={cn("font-bold text-xs leading-none", themeClasses.textMain)}>{state.totalPrice} {strings.price}</span></div>
                                    </div>
                                    <div className="flex items-center gap-3"><Avatar className="h-6 w-6 rounded-full border border-white shadow-sm"><AvatarImage src={state.selectedEmployee?.avatar_url} /><AvatarFallback className="text-[8px] bg-neutral-200">{state.selectedEmployee?.name?.[0]}</AvatarFallback></Avatar><span className={cn("text-xs font-bold", themeClasses.textMuted)}>{strings.who}: <span className={themeClasses.textMain}>{state.selectedEmployee?.name || strings.any}</span></span></div>
                                    <div className="space-y-1.5 pt-1">
                                        {state.selectedServices.map((svc: any) => (
                                            <div key={svc.id} className="flex justify-between items-center text-[10px] font-bold text-neutral-500"><span className="flex items-center gap-1.5"><div className="h-1 w-1 rounded-full bg-neutral-300" />{svc.name}</span><span className={themeClasses.textMain}>{state.getSvcPrice(svc, state.selectedEmployee?.id)} {strings.price}</span></div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="space-y-4">
                                <Input className={themeClasses.input} value={clientData.name} onChange={e => setClientData({...clientData, name: e.target.value})} placeholder={strings.namePlaceholder} />
                                <Input className={themeClasses.input} value={clientData.phone} onChange={e => setClientData({...clientData, phone: e.target.value})} placeholder={strings.phonePlaceholder} />
                                <Textarea className={cn(themeClasses.input, "min-h-[100px] p-5")} value={clientData.comment} onChange={e => setClientData({...clientData, comment: e.target.value})} placeholder={strings.commentPlaceholder} />
                            </div>
                        </div>
                    )}

                    {state.currentView === 'success' && (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-8 pt-10 animate-in zoom-in duration-500 pb-20 px-6">
                            <div className="h-24 w-24 bg-emerald-50 rounded-[40px] flex items-center justify-center shadow-inner scale-110 mb-2"><CheckCircle2 className="h-12 w-12 text-emerald-500" /></div>
                            <div className="space-y-2"><h2 className={cn("text-3xl font-black tracking-tight", themeClasses.textMain)}>{strings.success}</h2><p className="text-neutral-400 font-medium">{strings.waitYou}</p></div>
                            <div className={cn("w-full rounded-[40px] p-8 space-y-8 border text-left shadow-2xl transition-all duration-700 delay-300", theme === 'dark' ? "bg-neutral-800/80 border-neutral-700" : "bg-white border-neutral-100")}>
                                <div className={cn("flex items-start gap-5 border-b pb-6", theme === 'dark' ? "border-neutral-700" : "border-neutral-100")}>
                                    <div className="h-14 w-14 rounded-[22px] bg-black flex items-center justify-center text-white shrink-0 shadow-2xl transform -rotate-3 scale-110">
                                        <MapPin className="h-7 w-7" />
                                    </div>
                                    <div className="flex flex-col gap-1 pr-4">
                                        <span className="text-[10px] font-black uppercase opacity-40 tracking-widest">{strings.where}</span>
                                        <span className={cn("font-black text-2xl leading-none tracking-tight", themeClasses.textMain)}>{branch?.name || company?.name}</span>
                                        <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity mt-1">
                                            <div className="h-4 w-4 rounded-md bg-neutral-100 flex items-center justify-center"><MapPin className="h-2.5 w-2.5 text-black" /></div>
                                            <span className="text-xs font-bold truncate">{branch?.address || 'Адрес не указан'}</span>
                                        </div>
                                        <div className="pt-4 overflow-hidden">
                                            {renderSocialLinks('left')}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-5">
                                    <div className={cn("h-12 w-12 rounded-[20px] flex items-center justify-center shrink-0 shadow-inner", theme === 'dark' ? "bg-neutral-900/50" : "bg-neutral-100")}>
                                        <User className="h-6 w-6 text-neutral-400" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase opacity-40 tracking-widest">{strings.who}</span>
                                        <span className={cn("font-bold text-lg leading-tight", themeClasses.textMain)}>{state.selectedEmployee?.name}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-5">
                                    <div className={cn("h-12 w-12 rounded-[20px] flex items-center justify-center shrink-0 shadow-inner", theme === 'dark' ? "bg-neutral-900/50" : "bg-neutral-100")}>
                                        <Clock className="h-6 w-6 text-neutral-400" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase opacity-40 tracking-widest">{strings.when}</span>
                                        <span className={cn("font-bold text-lg leading-tight capitalize", themeClasses.textMain)}>
                                            {state.selectedSlot ? DateTime.fromISO(state.selectedSlot.start_time)
                                                .setZone(branch?.timezone)
                                                .setLocale(config.language || 'ru')
                                                .toFormat('cccc, d MMMM • HH:mm') : ''}
                                        </span>
                                    </div>
                                </div>
                                <div className={cn("space-y-4 pt-4 border-t", theme === 'dark' ? "border-neutral-700" : "border-neutral-100")}>
                                    <span className="text-[10px] font-black uppercase opacity-40 tracking-widest">{strings.services}</span>
                                    <div className="space-y-3">
                                        {state.selectedServices.map((svc: any) => (
                                            <div key={svc.id} className={cn("flex justify-between items-center text-sm font-bold", themeClasses.textMain)}>
                                                <span className="opacity-80">{svc.name}</span>
                                                <div className="px-3 py-1 rounded-full bg-neutral-100 text-[11px] font-black">
                                                    {state.getSvcPrice(svc, state.selectedEmployee?.id)} {strings.price}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <Button 
                                onClick={() => { state.reset(); onClose?.(); }} 
                                className="w-full h-16 text-white rounded-[24px] font-black shadow-2xl active:scale-95 transition-transform bg-neutral-900 flex items-center justify-center gap-2 group"
                                style={{ backgroundColor: accentColor, color: accentTextColor }}
                            >
                                {strings.home}
                                <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </div>
                    )}

                    {/* BRAND LOGO */}
                    <div className="pt-12 pb-8 flex items-center justify-center gap-1.5 opacity-20 grayscale hover:opacity-50 hover:grayscale-0 transition-all cursor-default select-none group">
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-500">Работает на</span>
                        <div className="flex items-center gap-1.5">
                            <div className="h-5 w-5 bg-black rounded-lg flex items-center justify-center shadow-sm">
                                <div className="w-1.5 h-1.5 bg-[#F5FF82] rounded-full animate-pulse group-hover:scale-110 transition-transform" />
                            </div>
                            <span className={cn("text-[11px] font-black tracking-tighter uppercase", theme === 'dark' ? "text-white" : "text-black")}>TimeHub</span>
                        </div>
                    </div>
                    </>
                )}
                </div>
                </div>
            </div>

            {['home', 'branches', 'services', 'specialist', 'datetime', 'profile'].includes(state.currentView) && (
                <div className={themeClasses.footer}>
                    <button className="w-full h-16 text-white font-black rounded-[24px] flex items-center justify-center gap-3 disabled:opacity-20 shadow-2xl transition-all active:scale-[0.98] bg-black"
                            disabled={isNextDisabled()}
                            style={{ backgroundColor: accentColor, color: accentTextColor }}
                            onClick={() => state.currentView === 'profile' ? bookingMutation.mutate() : state.currentView === 'home' ? state.navigateTo(stepsOrder[0] as Step) : state.navigateTo(state.getNextStep(state.currentView as Step))}
                    >
                        {bookingMutation.isPending ? strings.loading : state.currentView === 'profile' ? strings.confirm : strings.continue}
                        <ChevronRight className="h-5 w-5" />
                    </button>
                    {/* {state.currentView === 'home' && <div className="mt-4">{renderSocialLinks()}</div>} */}
                </div>
            )}

            {/* EMPLOYEE INFO MODAL */}
            {infoEmployee && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setInfoEmployee(null)} />
                    <div className={cn("relative w-full max-w-lg max-h-[85vh] overflow-hidden rounded-[40px] shadow-2xl flex flex-col animate-in zoom-in-95 slide-in-from-bottom-10 duration-500", 
                                  theme === 'dark' ? "bg-neutral-900" : "bg-white")}>
                        <div className="p-6 border-b flex items-center justify-between sticky top-0 z-10 bg-inherit">
                            <h3 className={cn("text-xl font-black uppercase tracking-tight", themeClasses.textMain)}>{strings.aboutMaster}</h3>
                            <button onClick={() => setInfoEmployee(null)} className="h-10 w-10 rounded-full bg-neutral-100 flex items-center justify-center hover:bg-neutral-200 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            <div className="flex flex-col items-center text-center space-y-4">
                                <Avatar className="h-24 w-24 border-4 border-white shadow-2xl">
                                    <AvatarImage src={infoEmployee.avatar_url} />
                                    <AvatarFallback>{infoEmployee.name[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h4 className={cn("text-2xl font-black", themeClasses.textMain)}>{infoEmployee.name}</h4>
                                    <p className="text-xs font-bold uppercase tracking-widest text-[#F5FF82] bg-black px-3 py-1 rounded-full inline-block mt-2">
                                        {infoEmployee.position || 'Мастер'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {[1,2,3,4,5].map(star => (
                                        <Star key={star} className={cn("h-5 w-5 fill-[#FFC107] text-[#FFC107]", star > (infoEmployee.rating || 5) && "fill-neutral-200 text-neutral-200")} />
                                    ))}
                                    <span className="text-sm font-black ml-1">{(infoEmployee.rating || 5.0).toFixed(1)}</span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h5 className={cn("text-[10px] font-black uppercase tracking-widest opacity-40", themeClasses.textMain)}>Биография и опыт</h5>
                                <p className={cn("text-[15px] leading-relaxed font-medium opacity-80", themeClasses.textMain)}>
                                    {infoEmployee.description || 'Опытный специалист, влюбленный в свое дело. Постоянно совершенствует навыки и следит за последними трендами в индустрии.'}
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h5 className={cn("text-[10px] font-black uppercase tracking-tight opacity-40", themeClasses.textMain)}>{strings.reviewsTitle}</h5>
                                    {!showReviewForm && (
                                        <button 
                                            onClick={() => setShowReviewForm(true)}
                                            className="text-[10px] font-black px-3 py-1 rounded-full bg-black text-white hover:bg-neutral-800 transition-colors uppercase tracking-widest"
                                        >
                                            Написать отзыв
                                        </button>
                                    )}
                                </div>

                                {showReviewForm && (
                                    <div className={cn("p-6 rounded-[32px] border space-y-4 animate-in slide-in-from-top-2", theme === 'dark' ? "bg-neutral-800 border-neutral-700" : "bg-neutral-50 border-neutral-200")}>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Ваша оценка</span>
                                            <div className="flex items-center gap-1">
                                                {[1,2,3,4,5].map(star => (
                                                    <Star 
                                                        key={star} 
                                                        onClick={() => setReviewRating(star)}
                                                        className={cn("h-6 w-6 cursor-pointer transition-all", star <= reviewRating ? "fill-[#FFC107] text-[#FFC107]" : "text-neutral-300")} 
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <Textarea 
                                            value={reviewText}
                                            onChange={(e) => setReviewText(e.target.value)}
                                            placeholder="Поделитесь вашими впечатлениями о мастере..."
                                            className={cn("min-h-[100px] p-4 text-sm font-medium", themeClasses.input)}
                                        />
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => setShowReviewForm(false)}
                                                className="flex-1 h-12 rounded-2xl font-bold text-sm bg-neutral-200 text-neutral-600 hover:bg-neutral-300 transition-colors"
                                            >
                                                Отмена
                                            </button>
                                            <button 
                                                disabled={reviewMutation.isPending || !reviewText.trim()}
                                                onClick={() => reviewMutation.mutate({ 
                                                    employee_id: infoEmployee.id, 
                                                    rating: reviewRating, 
                                                    comment: reviewText 
                                                })}
                                                className="flex-2 h-12 rounded-2xl font-bold text-sm text-white px-8 disabled:opacity-50"
                                                style={{ backgroundColor: accentColor, color: accentTextColor }}
                                            >
                                                {reviewMutation.isPending ? 'Отправка...' : 'Отправить'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                                
                                <div className="space-y-4">
                                    {employeeReviews.length > 0 ? (
                                        employeeReviews.map((rev: any, i: number) => (
                                            <div key={rev.id || i} className={cn("p-4 rounded-[24px] border", theme === 'dark' ? "bg-neutral-800 border-neutral-700" : "bg-neutral-50 border-neutral-100")}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className={cn("font-black text-sm", themeClasses.textMain)}>{rev.client_name || 'Клиент'}</span>
                                                    <div className="flex items-center gap-0.5">
                                                        {[1,2,3,4,5].map(s => <Star key={s} className={cn("h-3 w-3 fill-[#FFC107] text-[#FFC107]", s > rev.rating && "fill-neutral-300 text-neutral-300")} />)}
                                                    </div>
                                                </div>
                                                <p className={cn("text-xs font-medium opacity-70 leading-relaxed", themeClasses.textMain)}>{rev.comment}</p>
                                                <span className="text-[9px] font-bold opacity-30 mt-2 block">
                                                    {DateTime.fromISO(rev.created_at).setLocale('ru').toFormat('d MMMM yyyy')}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-8 text-center bg-neutral-50 rounded-[32px] border border-dashed border-neutral-200">
                                            <p className="text-xs font-bold opacity-30 uppercase tracking-widest italic">Пока нет отзывов</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t mt-auto">
                            <button 
                                onClick={() => setInfoEmployee(null)} 
                                className="w-full h-16 text-white rounded-[24px] font-black shadow-2xl active:scale-95 transition-transform flex items-center justify-center gap-2"
                                style={{ backgroundColor: accentColor, color: accentTextColor }}
                            >
                                Закрыть
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
