import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import {
    X,
    ChevronRight,
    Plus,
    Clock,
    User,
    Phone,
    Search,
    Check,
    CreditCard,
    Banknote,
    Smartphone,
    AlertCircle,
    Trash2,
    Calendar as CalendarIcon2,
    ChevronDown,
    ChevronUp,
    Eye,
    EyeOff,
    History,
    UserX,
    Sparkles,
    Globe,
    TrendingUp
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useBranch } from '@/context/branch-context';
import { toast } from 'sonner';

export interface BookingEditorProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'create' | 'edit';
    company: any;
    branchId: number;
    selectedSlot: { empID: number; time: DateTime } | null;
    selectedAppointment: any | null;
    employees: any[];
    allServices: any[];
    employeeServices: any[];
    categories: any[];
    customers: any[];
    appointments?: any[];
    shifts?: any[];
    onSave: (data: any) => Promise<void>;
    onDelete?: (id: number) => Promise<void>;
    isSaving: boolean;
}

export function BookingEditor({
    isOpen,
    onClose,
    mode,
    company,
    branchId,
    selectedSlot,
    selectedAppointment,
    employees,
    allServices,
    employeeServices,
    categories,
    customers: initialCustomers,
    appointments = [],
    shifts,
    onSave,
    onDelete,
    isSaving
}: BookingEditorProps) {
    const { branches } = useBranch();
    const currentBranch = branches.find(b => b.id === branchId);
    const timezone = (currentBranch as any)?.timezone || 'UTC';

    const [formData, setFormData] = useState({
        bookingDate: DateTime.now().setZone(timezone) as DateTime<true>,
        clientName: '',
        clientPhone: '',
        clientEmail: '',
        comment: '',
        status: 'pending' as any,
        startTime: '',
        endTime: '',
        selectedServices: [] as any[],
        payments: [] as any[],
        totalPrice: 0,
        isGuest: false,
        clientID: null as number | null,
        discount: 0,
    });

    const [searchService, setSearchService] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearchingClient, setIsSearchingClient] = useState(false);
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const [activeSearchField, setActiveSearchField] = useState<'name' | 'phone' | null>(null);
    const [warningType, setWarningType] = useState<'overbooking' | 'out_of_shift' | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    // Fetch customer profile & history when client is selected
    const { data: customerStats } = useQuery({
        queryKey: ['customerStats', formData.clientID],
        queryFn: async () => (await api.get(`/customers/${formData.clientID}/stats`)).data,
        enabled: !!formData.clientID
    });

    const { data: customerVisits = [] } = useQuery({
        queryKey: ['customerVisits', formData.clientID],
        queryFn: async () => (await api.get(`/customers/${formData.clientID}/visits`)).data,
        enabled: !!formData.clientID
    });

    const { data: historyLogs = [] } = useQuery({
        queryKey: ['appointmentLogs', selectedAppointment?.id],
        queryFn: async () => (await api.get(`/appointments/${selectedAppointment.id}/logs`)).data,
        enabled: mode === 'edit' && !!selectedAppointment?.id
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.client-search-container')) setShowClientDropdown(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [collapsedCategories, setCollapsedCategories] = useState<Record<number, boolean>>({});
    const [showAvailableServices, setShowAvailableServices] = useState(true);

    const master = useMemo(() => {
        const empID = mode === 'create' ? selectedSlot?.empID : selectedAppointment?.employee_id;
        return employees?.find(e => e.id === empID) || null;
    }, [mode, selectedSlot, selectedAppointment, employees]);

    const suggestedDuration = useMemo(() => {
        return formData.selectedServices.reduce((acc, s) => acc + (s.duration_minutes || s.duration || s.service?.duration_minutes || s.service?.duration || 0), 0);
    }, [formData.selectedServices]);

    const actualDuration = useMemo(() => {
        if (!formData.startTime || !formData.endTime) return 0;
        try {
            const start = DateTime.fromFormat(formData.startTime, 'HH:mm', { zone: timezone });
            const end = DateTime.fromFormat(formData.endTime, 'HH:mm', { zone: timezone });
            const diff = end.diff(start, 'minutes').minutes;
            return diff > 0 ? diff : 0;
        } catch (e) { return 0; }
    }, [formData.startTime, formData.endTime, timezone]);

    const totalPaid = useMemo(() => formData.payments.reduce((sum, p) => sum + (p.amount || 0), 0), [formData.payments]);
    const remainingToPay = formData.totalPrice - totalPaid;

    useEffect(() => {
        if (isOpen) {
            if (mode === 'create' && selectedSlot) {
                const localTime = selectedSlot.time.setZone(timezone);
                setFormData({
                    bookingDate: localTime.startOf('day') as DateTime<true>,
                    clientName: '', clientPhone: '', clientEmail: '', comment: '', status: 'pending',
                    startTime: localTime.toFormat('HH:mm'),
                    endTime: localTime.plus({ minutes: 60 }).toFormat('HH:mm'),
                    selectedServices: [], payments: [], totalPrice: 0, isGuest: false, clientID: null, discount: 0,
                });
                setActiveSearchField(null);
            } else if (mode === 'edit' && selectedAppointment) {
                const localStart = DateTime.fromISO(selectedAppointment.start_time).setZone(timezone);
                const localEnd = DateTime.fromISO(selectedAppointment.end_time).setZone(timezone);
                setFormData({
                    bookingDate: localStart.startOf('day') as DateTime<true>,
                    clientName: `${selectedAppointment.client_first_name || ''} ${selectedAppointment.client_last_name || ''}`.trim(),
                    clientPhone: selectedAppointment.client_phone || '',
                    clientEmail: '', comment: selectedAppointment.comment || '', status: selectedAppointment.status,
                    startTime: localStart.toFormat('HH:mm'),
                    endTime: localEnd.toFormat('HH:mm'),
                    selectedServices: selectedAppointment.services?.map((s: any) => ({
                        service_id: s.service_id, price: s.price, duration_minutes: s.duration_minutes,
                        service: s.service || allServices?.find(as => as.id === s.service_id)
                    })) || [],
                    payments: selectedAppointment.payments || [], totalPrice: selectedAppointment.total_price || 0,
                    isGuest: selectedAppointment.client_phone === 'ANONYMOUS' || selectedAppointment.client_phone === '' || selectedAppointment.client_phone === 'guest',
                    clientID: selectedAppointment.client_id || null,
                    discount: selectedAppointment.discount || 0
                });
                setActiveSearchField(null);
            }
        }
    }, [isOpen, mode, selectedSlot, selectedAppointment, allServices, timezone]);

    useEffect(() => {
        const rawPrice = formData.selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);
        const discountAmount = Math.round(rawPrice * (formData.discount / 100));
        const finalPrice = rawPrice - discountAmount;

        const duration = formData.selectedServices.reduce((acc, s) => acc + (s.duration_minutes || s.duration || s.service?.duration_minutes || s.service?.duration || 0), 0);
        setFormData(prev => {
            const newState = { ...prev, totalPrice: finalPrice };
            if (prev.startTime && duration > 0) {
                const start = DateTime.fromFormat(prev.startTime, 'HH:mm', { zone: timezone });
                newState.endTime = start.plus({ minutes: duration }).toFormat('HH:mm');
            }
            return newState;
        });
    }, [formData.selectedServices, timezone, formData.discount]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!activeSearchField) return;
            const query = activeSearchField === 'name' ? formData.clientName : formData.clientPhone;
            if (query.length >= 2) {
                setIsSearchingClient(true);
                try {
                    const res = await api.get('/customers', { params: { branch_id: branchId, search: query } });
                    // API returns { items: [...], total: X }
                    const data = res.data?.items || res.data?.data || res.data || [];
                    setSearchResults(Array.isArray(data) ? data : []);
                } catch (err) {} finally { setIsSearchingClient(false); }
            } else { setSearchResults([]); }
        }, 300);
        return () => clearTimeout(timer);
    }, [formData.clientName, formData.clientPhone, branchId, activeSearchField]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && showClientDropdown) {
                e.preventDefault();
                e.stopPropagation();
                setShowClientDropdown(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown, true);
        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [showClientDropdown]);

    const handleSelectCustomer = (c: any) => {
        setFormData({
            ...formData,
            clientName: `${c.first_name} ${c.last_name || ''}`.trim(),
            clientPhone: c.phone || '',
            clientEmail: c.email || '',
            clientID: c.id || null,
            isGuest: false,
            discount: c.discount || 0
        });
        setSearchResults([]); setShowClientDropdown(false); setActiveSearchField(null);
    };

    const handleCreateNewClient = () => {
        setFormData({ ...formData, clientID: null, isGuest: true });
        setShowClientDropdown(false);
        setActiveSearchField(null);
    };

    const executeSave = async (allowOverbooking = false) => {
        const [startH, startM] = formData.startTime.split(':').map(Number);
        const [endH, endM] = formData.endTime.split(':').map(Number);

        const startISO = formData.bookingDate.set({ hour: startH, minute: startM, second: 0, millisecond: 0 }).setZone(timezone, { keepLocalTime: true }).toISO({ suppressMilliseconds: true });
        const endISO = formData.bookingDate.set({ hour: endH, minute: endM, second: 0, millisecond: 0 }).setZone(timezone, { keepLocalTime: true }).toISO({ suppressMilliseconds: true });

        // Split client name into first and last
        const nameParts = formData.clientName.trim().split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ');

        // Map to exact backend format (snake_case)
        const payload = {
            company_id: company?.id,
            branch_id: branchId,
            branch_name: currentBranch?.name || '',
            employee_id: master?.id,
            client_id: formData.clientID,
            client_first_name: firstName,
            client_last_name: lastName,
            client_phone: formData.clientPhone,
            start_time: startISO,
            end_time: endISO,
            status: formData.status,
            comment: formData.comment,
            total_price: formData.totalPrice,
            booking_source: 'admin',
            allow_overbooking: allowOverbooking,
            services: formData.selectedServices.map(s => ({
                service_id: s.service_id,
                service_name: s.service?.name || '',
                price: s.price,
                duration_minutes: s.duration_minutes
            })),
            payments: formData.payments
        };

        try {
            await onSave(payload);
            setWarningType(null);
        } catch (err: any) {
            const errorData = err.response?.data;
            const errorMsg = typeof errorData === 'string' ? errorData : errorData?.error || err.message;

            if (errorMsg && errorMsg.includes("overbooking not allowed")) {
                setWarningType('overbooking');
            } else {
                toast.error(errorMsg || 'Ошибка сохранения');
            }
        }
    };

    const handleSave = () => {
        if (master) {
            const [startH, startM] = formData.startTime.split(':').map(Number);
            const [endH, endM] = formData.endTime.split(':').map(Number);

            const newStart = formData.bookingDate.set({ hour: startH, minute: startM, second: 0, millisecond: 0 }).toMillis();
            const newEnd = formData.bookingDate.set({ hour: endH, minute: endM, second: 0, millisecond: 0 }).toMillis();

            const hasOverlap = appointments.some(app => {
                if (app.employee_id !== master.id || app.status === 'cancelled') return false;
                if (mode === 'edit' && selectedAppointment && app.id === selectedAppointment.id) return false;

                const appStart = DateTime.fromISO(app.start_time).setZone(timezone).toMillis();
                const appEnd = DateTime.fromISO(app.end_time).setZone(timezone).toMillis();

                return newStart < appEnd && newEnd > appStart;
            });

            if (hasOverlap) {
                setWarningType('overbooking');
                return;
            }

            if (shifts) {
                const shiftDate = formData.bookingDate.toISODate();
                const shift = shifts.find((s: any) => s.employee_id === master.id && s.date && s.date.startsWith(shiftDate));

                let hasWorkingHours = false;
                let shiftStartH = 0, shiftStartM = 0;
                let shiftEndH = 24, shiftEndM = 0;

                if (shift && shift.start_time && shift.end_time && shift.shift_type !== 'off' && !shift.is_day_off) {
                    [shiftStartH, shiftStartM] = shift.start_time.split(':').map(Number);
                    [shiftEndH, shiftEndM] = shift.end_time.split(':').map(Number);
                    hasWorkingHours = true;
                } else if (!shift && currentBranch && (currentBranch as any).schedule) {
                    const dayOfWeek = formData.bookingDate.weekday % 7;
                    const branchDay = (currentBranch as any).schedule.find((s: any) => s.day_of_week === dayOfWeek);
                    if (branchDay && !branchDay.is_day_off) {
                        [shiftStartH, shiftStartM] = branchDay.start_time.split(':').map(Number);
                        [shiftEndH, shiftEndM] = branchDay.end_time.split(':').map(Number);
                        hasWorkingHours = true;
                    }
                }

                if (!hasWorkingHours) {
                    setWarningType('out_of_shift');
                    return;
                } else {
                    const reqStartTotal = startH * 60 + startM;
                    const reqEndTotal = endH * 60 + endM;
                    const shiftStartTotal = shiftStartH * 60 + shiftStartM;
                    const shiftEndTotal = shiftEndH * 60 + shiftEndM;

                    if (reqStartTotal < shiftStartTotal || reqEndTotal > shiftEndTotal) {
                        setWarningType('out_of_shift');
                        return;
                    }
                }
            }
        }
        executeSave(false);
    };

    const filteredServices = useMemo(() => {
        const source = (mode === 'create' ? employeeServices : allServices) || [];
        const query = searchService.toLowerCase();
        return source.filter((s: any) => (s.service?.name || s.name || '').toLowerCase().includes(query))
            .map(s => ({ service_id: s.service_id || s.id, price: s.price, duration_minutes: s.duration_minutes || s.duration, service: s.service || s }));
    }, [searchService, employeeServices, allServices, mode]);

    const categorizedServices = useMemo(() => {
        const source = (mode === 'create' ? employeeServices : allServices) || [];
        const groups: Record<number | string, any[]> = {};
        source.forEach((s: any) => {
            const serviceItem = s.service || s;
            const catId = serviceItem.category_id || 'uncategorized';
            if (!groups[catId]) groups[catId] = [];
            groups[catId].push({ service_id: s.service_id || s.id, price: s.price, duration_minutes: s.duration_minutes || s.duration, service: serviceItem });
        });
        return Object.entries(groups).map(([id, items]) => ({
            id: id === 'uncategorized' ? 0 : Number(id),
            name: categories?.find(c => c.id === Number(id))?.name || 'Без категории',
            services: items
        }));
    }, [employeeServices, allServices, mode, categories]);

    const toggleCategory = (id: number) => setCollapsedCategories(prev => ({...prev, [id]: !prev[id]}));

    const ClientDropdown = ({ field }: { field: 'name' | 'phone' }) => {
        if (!showClientDropdown || activeSearchField !== field) return null;

        const hasResults = Array.isArray(searchResults) && searchResults.length > 0;
        const shouldShow = isSearchingClient || hasResults || (activeSearchField === field);

        if (!shouldShow) return null;

        return (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-neutral-100 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                {isSearchingClient ? (
                    <div className="p-4 text-center text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center justify-center gap-2">
                        <div className="w-3 h-3 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
                        Поиск...
                    </div>
                ) : (
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                        {hasResults && searchResults.map((c, i) => (
                            <div key={i} onClick={() => handleSelectCustomer(c)} className="p-4 border-b border-neutral-50 hover:bg-neutral-50 cursor-pointer flex items-center justify-between group transition-colors">
                                <div className="flex items-center gap-3"><div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center text-white text-xs font-black">{c.first_name?.[0]}{c.last_name?.[0]}</div>
                                <div className="flex flex-col"><span className="text-sm font-bold text-neutral-900 group-hover:text-black">{c.first_name} {c.last_name}</span><span className="text-[10px] font-black text-neutral-400">{c.phone}</span></div></div>
                                <ChevronRight className="h-4 w-4 text-neutral-200 group-hover:text-neutral-900 transition-all group-hover:translate-x-1" />
                            </div>
                        ))}
                        <div
                            onClick={handleCreateNewClient}
                            className="p-4 hover:bg-neutral-50 cursor-pointer flex items-center gap-3 text-neutral-600 transition-colors group"
                        >
                            <div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center text-neutral-400 group-hover:bg-neutral-900 group-hover:text-[#F5FF82] transition-colors">
                                <Plus className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold group-hover:text-neutral-900">Новый клиент</span>
                                <span className="text-[10px] font-medium uppercase tracking-tight opacity-60">Использовать введенные данные</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent showCloseButton={false} className="sm:max-w-[1400px] w-[98vw] p-0 overflow-hidden bg-white rounded-[1.5rem] border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] h-[92vh] flex flex-col">
                <DialogTitle className="sr-only">Редактор записи</DialogTitle>
                <DialogDescription className="sr-only">Управление деталями бронирования, услугами и клиентом</DialogDescription>

                <div className="h-16 border-b border-neutral-100 flex items-center justify-between px-6 shrink-0">
                    <div className="flex gap-1.5 p-1 bg-neutral-100 rounded-xl">
                        {[
                            { id: 'pending', label: 'Ожидание', color: 'bg-amber-500', active: 'bg-white text-amber-600 shadow-sm' },
                            { id: 'confirmed', label: 'Подтвержден', color: 'bg-emerald-500', active: 'bg-white text-emerald-600 shadow-sm' },
                            { id: 'arrived', label: 'Пришел', color: 'bg-blue-500', active: 'bg-white text-blue-600 shadow-sm' },
                            { id: 'no_show', label: 'Не пришел', color: 'bg-red-500', active: 'bg-white text-red-600 shadow-sm' }
                        ].map(s => {
                            const isActive = formData.status === s.id || (s.id === 'arrived' && formData.status === 'finished');
                            return (
                                <button
                                    key={s.id}
                                    onClick={() => setFormData({...formData, status: s.id})}
                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${isActive ? s.active : 'text-neutral-400 hover:text-neutral-600'}`}>
                                    {s.label}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-2">
                        {mode === 'edit' && onDelete && <Button variant="ghost" size="icon" onClick={() => onDelete(selectedAppointment.id)} className="text-neutral-300 hover:text-red-500 rounded-xl"><Trash2 className="h-5 w-5" /></Button>}
                        <Button variant="ghost" size="icon" onClick={onClose} className="text-neutral-300 hover:text-black rounded-xl"><X className="h-5 w-5" /></Button>
                    </div>
                </div>

                <div className="flex-1 grid grid-cols-[320px_1fr_320px] overflow-hidden">
                    <div className="border-r border-neutral-100 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                        <div className="space-y-6">
                            <h4 className="text-[11px] font-black uppercase text-neutral-400 tracking-[0.2em] px-1">Основные данные</h4>
                            <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                                <Avatar className="h-12 w-12 border-2 border-white shadow-sm shrink-0"><AvatarImage src={master?.avatar_url} /><AvatarFallback className="bg-neutral-900 text-white font-bold">{master?.name?.[0]}</AvatarFallback></Avatar>
                                <div className="min-w-0"><h3 className="font-bold text-sm leading-tight text-neutral-900 truncate">{master?.name}</h3><p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-0.5 truncate">{master?.position || 'Специалист'}</p></div>
                            </div>
                            <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-100 space-y-4">
                                <div className="flex items-center gap-3 text-xs font-bold text-neutral-900">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" className="p-0 h-auto hover:bg-transparent flex items-center gap-3 text-xs font-bold text-neutral-900 w-full justify-start"><div className="p-2 bg-white rounded-xl shadow-sm border border-neutral-100"><CalendarIcon2 className="h-4 w-4 text-neutral-400" /></div>{formData.bookingDate.setLocale('ru').toFormat('d MMMM, cccc')}</Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 rounded-[1.5rem] border-none shadow-2xl" align="start">
                                            <Calendar mode="single" selected={formData.bookingDate.toJSDate()} onSelect={(date) => date && setFormData({ ...formData, bookingDate: DateTime.fromJSDate(date).setZone(timezone) as any })} initialFocus className="p-4" />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 flex flex-col min-w-0"><Label className="text-[9px] font-black uppercase text-neutral-400 mb-2 pl-1">Приход</Label><div className="relative"><Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-300" /><Input value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="pl-9 h-11 font-black border-none bg-white rounded-2xl shadow-sm text-xs" /></div></div>
                                    <div className="flex-1 flex flex-col min-w-0"><Label className="text-[9px] font-black uppercase text-neutral-400 mb-2 pl-1">Уход</Label><div className="relative"><Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-300" /><Input value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="pl-9 h-11 font-black border-none bg-white rounded-2xl shadow-sm text-xs" /></div></div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3 mt-auto"><Label className="text-[11px] font-black uppercase text-neutral-400 px-1 tracking-widest">Примечание</Label><Textarea value={formData.comment} onChange={e => setFormData({...formData, comment: e.target.value})} placeholder="Дополнительная информация..." className="min-h-[100px] rounded-[2rem] border-neutral-100 resize-none text-sm p-5 bg-neutral-50/50" /></div>
                    </div>

                    <div className="border-r border-neutral-100 flex flex-col overflow-hidden bg-neutral-50/30">
                        <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between"><h3 className="text-sm font-black uppercase tracking-widest text-neutral-900">Выбранные услуги</h3><Badge className="bg-neutral-900 text-white border-none px-2 py-0.5 rounded-lg text-[10px] font-black">{formData.selectedServices.length}</Badge></div>
                                <div className="space-y-2">
                                    {formData.selectedServices.map((s, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl border border-neutral-100 shadow-sm transition-all"><div className="flex flex-col"><span className="text-xs font-bold text-neutral-800">{s.service?.name}</span><span className="text-[9px] text-neutral-400 font-black uppercase">{s.duration_minutes} мин</span></div><div className="flex items-center gap-4"><span className="text-xs font-black text-neutral-900">{s.price} BYN</span><button onClick={() => setFormData({...formData, selectedServices: formData.selectedServices.filter((_, idx) => idx !== i)})} className="text-neutral-300 hover:text-red-500 transition-colors"><X className="h-4 w-4" /></button></div></div>
                                    ))}
                                    {formData.selectedServices.length === 0 && <div className="py-8 text-center border-2 border-dashed border-neutral-100 rounded-2xl"><p className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest">Ничего не выбрано</p></div>}
                                </div>
                            </div>
                            <div className="h-px bg-neutral-100" />
                            <div className="space-y-4">
                                <div className="flex items-center justify-between"><h3 className="text-sm font-black uppercase tracking-widest text-neutral-900">Доступные услуги</h3><Button variant="ghost" size="sm" onClick={() => setShowAvailableServices(!showAvailableServices)} className="h-8 px-2 text-neutral-400 hover:text-neutral-900">{showAvailableServices ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}<span className="text-[10px] font-black uppercase">{showAvailableServices ? 'Скрыть' : 'Показать'}</span></Button></div>
                                {showAvailableServices && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-300" /><Input value={searchService} onChange={e => setSearchService(e.target.value)} placeholder="Поиск услуги..." className="pl-9 h-10 rounded-xl border-neutral-100 shadow-sm bg-white font-bold text-xs" /></div>
                                        <div className="space-y-2">
                                            {searchService ? filteredServices.map((s, i) => (<div key={i} onClick={() => { if (!formData.selectedServices.some(ss => ss.service_id === s.service_id)) { setFormData({...formData, selectedServices: [...formData.selectedServices, s]}); } setSearchService(''); }} className="p-3 bg-white rounded-xl border border-neutral-100 hover:border-neutral-900 cursor-pointer flex justify-between items-center transition-all hover:shadow-sm"><div className="flex flex-col"><span className="text-xs font-bold text-neutral-800">{s.service?.name}</span><span className="text-[9px] text-neutral-400 font-black uppercase">{s.duration_minutes} мин</span></div><span className="text-xs font-black text-neutral-900">{s.price} BYN</span></div>)) : categorizedServices.map((cat, i) => (
                                                <div key={cat.id} className="border border-neutral-100 rounded-xl overflow-hidden bg-white shadow-sm">
                                                    <div onClick={() => toggleCategory(cat.id)} className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-neutral-50 transition-colors"><span className="text-[10px] font-black uppercase text-neutral-500 tracking-widest">{cat.name}</span>{collapsedCategories[cat.id as keyof typeof collapsedCategories] ? <ChevronDown className="h-4 w-4 text-neutral-300" /> : <ChevronUp className="h-4 w-4 text-neutral-300" />}</div>
                                                    {!collapsedCategories[cat.id as keyof typeof collapsedCategories] && (<div className="border-t border-neutral-50 p-2 space-y-1 bg-neutral-50/30">{cat.services.map((s: any, idx: number) => { const isSelected = formData.selectedServices.some(ss => ss.service_id === s.service_id); return (<div key={idx} onClick={() => { if (isSelected) { setFormData({...formData, selectedServices: formData.selectedServices.filter(ss => ss.service_id !== s.service_id)}); } else { setFormData({...formData, selectedServices: [...formData.selectedServices, s]}); } }} className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${isSelected ? 'bg-neutral-900 border-neutral-900 text-white' : 'bg-white border-transparent hover:border-neutral-200'}`}><div className="flex flex-col"><span className="text-xs font-bold">{s.service.name}</span><span className={`text-[8px] font-black uppercase ${isSelected ? 'text-white/60' : 'text-neutral-400'}`}>{s.duration_minutes} мин</span></div><span className="text-xs font-black">{s.price} BYN</span></div>);})}</div>)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-6 border-t border-neutral-100 bg-white shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.05)]">
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">Итого</span>
                                        {formData.discount > 0 && (
                                            <span className="px-1.5 py-0.5 bg-[#F5FF82] text-black text-[8px] font-black rounded-md uppercase tracking-tighter">
                                                -{formData.discount}%
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <div className="text-lg font-black text-neutral-900">{formData.totalPrice} BYN</div>
                                        {formData.discount > 0 && (
                                            <div className="text-[10px] font-bold text-neutral-300 line-through">
                                                {formData.selectedServices.reduce((sum, s) => sum + (s.price || 0), 0)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1 text-right">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">Остаток</span>
                                    <div className={cn("text-lg font-black", remainingToPay > 0 ? "text-red-500" : "text-emerald-500")}>
                                        {remainingToPay} BYN
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-4"><div className="grid grid-cols-3 gap-2">{[{ id: 'cash', label: 'Нал', icon: Banknote }, { id: 'card', label: 'Безнал', icon: CreditCard }, { id: 'other', label: 'Другое', icon: Smartphone }].map(method => (<Button key={method.id} variant="outline" onClick={() => { if (remainingToPay > 0) setFormData({...formData, payments: [...formData.payments, {method: method.id, amount: remainingToPay}]}); }} className="h-10 rounded-xl border-neutral-100 font-bold gap-2 hover:bg-neutral-50 text-[10px] uppercase"><method.icon className="h-3.5 w-3.5" />{method.label}</Button>))}</div><div className="space-y-2">{formData.payments.map((p, i) => (<div key={i} className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-100 transition-all"><span className="text-[9px] font-black uppercase text-neutral-400">{p.method === 'cash' ? 'НАЛ' : p.method === 'card' ? 'БЕЗНАЛ' : 'ДРУГОЕ'}</span><div className="flex items-center gap-2"><Input type="number" value={p.amount} onChange={e => { const newPayments = [...formData.payments]; newPayments[i].amount = parseFloat(e.target.value) || 0; setFormData({...formData, payments: newPayments}); }} className="h-7 w-20 text-right font-black border-none bg-white rounded-md text-xs p-1" /><button onClick={() => setFormData({...formData, payments: formData.payments.filter((_, idx) => idx !== i)})} className="text-neutral-300 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button></div></div>))}</div></div>
                        </div>
                    </div>

                    <div className="p-6 flex flex-col gap-8 overflow-y-auto custom-scrollbar bg-white client-search-container">
                        <div className="flex items-center justify-between px-1 mb-2">
                            <h4 className="text-[11px] font-black uppercase text-neutral-400 tracking-[0.2em]">Клиент</h4>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsHistoryModalOpen(true)}
                                className="h-8 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 rounded-lg text-[10px] font-black uppercase tracking-widest gap-2"
                            >
                                <History className="h-3.5 w-3.5" />
                                История
                            </Button>
                        </div>

                        <div className="flex-1 flex flex-col min-h-0 space-y-8 animate-in fade-in duration-500">
                            <div className="space-y-6">
                                <div className="flex items-center justify-between px-1">

                                    {formData.isGuest && <Badge className="bg-neutral-100 text-neutral-400 border-none text-[9px] font-black uppercase">Гость</Badge>}
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2 relative">
                                        <Label className="text-[10px] font-black uppercase text-neutral-400 pl-1">ФИО / Поиск</Label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-300" />
                                            <Input
                                                value={formData.clientName}
                                                onChange={e => { const val = e.target.value; setFormData({...formData, clientName: val}); setActiveSearchField('name'); setShowClientDropdown(true); }}
                                                onFocus={() => { setActiveSearchField('name'); setShowClientDropdown(true); }}
                                                placeholder="Введите имя..."
                                                className="pl-11 h-12 rounded-2xl border-neutral-100 focus:ring-1 focus:ring-neutral-200 text-sm font-bold shadow-sm"
                                            />
                                            <ClientDropdown field="name" />
                                        </div>
                                    </div>
                                    <div className="space-y-2 relative">
                                        <Label className="text-[10px] font-black uppercase text-neutral-400 pl-1">Телефон</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-300" />
                                            <Input
                                                value={formData.clientPhone}
                                                onChange={e => { const val = e.target.value; setFormData({...formData, clientPhone: val}); setActiveSearchField('phone'); setShowClientDropdown(true); }}
                                                onFocus={() => { setActiveSearchField('phone'); setShowClientDropdown(true); }}
                                                placeholder="+375 •• •••-••-••"
                                                className="pl-11 h-12 rounded-2xl border-neutral-100 focus:ring-1 focus:ring-neutral-200 text-sm font-bold shadow-sm"
                                            />
                                            <ClientDropdown field="phone" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="flex-1 min-h-0">
                                    <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                                        {/* SUMMARY STATS */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                                                <div className="text-lg font-black text-neutral-900">{customerStats?.total_visits || 0}</div>
                                                <div className="text-[8px] font-black uppercase text-neutral-400 tracking-widest">Визитов</div>
                                            </div>
                                            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                                                <div className="text-lg font-black text-neutral-900">{customerStats?.avg_check?.toFixed(0) || 0} <span className="text-[10px]">BYN</span></div>
                                                <div className="text-[8px] font-black uppercase text-neutral-400 tracking-widest">Средний чек</div>
                                            </div>
                                            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                                                <div className="text-lg font-black text-red-500">{customerStats?.no_shows || 0}</div>
                                                <div className="text-[8px] font-black uppercase text-neutral-400 tracking-widest">Пропуски</div>
                                            </div>
                                            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100/50">
                                                <div className="text-lg font-black text-emerald-600">{customerStats?.total_revenue?.toFixed(0) || 0} <span className="text-[10px]">BYN</span></div>
                                                <div className="text-[8px] font-black uppercase text-emerald-600/60 tracking-widest">LTV</div>
                                            </div>
                                        </div>

                                        {/* RECENT VISITS */}
                                        <div className="space-y-4">
                                            <h4 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest px-1">Последние визиты</h4>
                                            <div className="space-y-2 pb-4">
                                                {customerVisits.length > 0 ? customerVisits.slice(0, 10).map((v: any, i: number) => (
                                                    <div key={i} className="p-3 bg-white border border-neutral-100 rounded-xl shadow-sm space-y-1">
                                                        <div className="flex justify-between items-start">
                                                            <span className="text-[10px] font-bold text-neutral-900">{DateTime.fromISO(v.start_time).setLocale('ru').toFormat('d MMM yyyy, HH:mm')}</span>
                                                            <Badge className={cn(
                                                                "text-[7px] font-black uppercase px-1 py-0 rounded",
                                                                v.status === 'finished' ? "bg-emerald-50 text-emerald-600" :
                                                                v.status === 'no_show' ? "bg-red-50 text-red-600" : "bg-neutral-100 text-neutral-400"
                                                            )}>
                                                                {v.status}
                                                            </Badge>
                                                        </div>
                                                        <div className="text-[11px] font-bold text-neutral-600 truncate">{v.service_name}</div>
                                                        <div className="flex justify-between items-center text-[9px] font-medium text-neutral-400 italic">
                                                            <span>{v.employee_name}</span>
                                                            <span className="font-black not-italic text-neutral-900">{v.price} BYN</span>
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <div className="py-12 text-center border-2 border-dashed border-neutral-100 rounded-3xl">
                                                        <p className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest">История пуста</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-20 border-t border-neutral-100 bg-white flex items-center justify-between px-8 shrink-0">
                    <div className="flex items-center gap-2 text-neutral-400"><AlertCircle className="h-4 w-4" /><span className="text-[10px] font-bold uppercase tracking-widest">Админ-панель</span></div>
                    <div className="flex gap-3"><Button variant="ghost" onClick={onClose} className="rounded-2xl font-bold">Отмена</Button><Button onClick={handleSave} disabled={isSaving || isSearchingClient} className="h-12 px-8 bg-neutral-900 hover:bg-black text-white rounded-xl font-bold text-sm shadow-xl shadow-black/10 transition-transform active:scale-[0.98]">{isSearchingClient ? 'Поиск...' : isSaving ? 'Сохранение...' : (mode === 'create' ? 'Создать запись' : 'Сохранить')}</Button></div>
                </div>
            </DialogContent>
        </Dialog>

        <Dialog open={warningType !== null} onOpenChange={(open) => !open && setWarningType(null)}>
            <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-white rounded-[2rem] shadow-2xl shadow-black/20">
                <div className="p-8 space-y-6 text-center">
                    <div className="mx-auto w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center animate-bounce">
                        <AlertCircle className="w-10 h-10 text-amber-500" />
                    </div>
                    <div className="space-y-2">
                        <DialogTitle className="text-2xl font-black text-neutral-900">
                            {warningType === 'overbooking' ? 'Пересечение времени' : 'Вне рабочего времени'}
                        </DialogTitle>
                        <DialogDescription className="text-sm font-medium text-neutral-500 leading-relaxed px-4">
                            {warningType === 'overbooking'
                                ? 'На это время уже есть запись. Создать овербукинг?'
                                : 'Выбранное время выходит за рамки графика работы мастера. Продолжить создание записи?'}
                        </DialogDescription>
                    </div>
                </div>
                <div className="bg-neutral-50/50 p-6 flex gap-3 sm:justify-center">
                    <Button variant="ghost" onClick={() => setWarningType(null)} className="flex-1 h-12 rounded-xl font-bold hover:bg-neutral-100">Отмена</Button>
                    <Button onClick={() => executeSave(true)} disabled={isSaving} className="flex-1 h-12 bg-neutral-900 hover:bg-black text-white rounded-xl font-bold">Да, создать</Button>
                </div>
            </DialogContent>
        </Dialog>

        <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
            <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-white rounded-[2rem] shadow-2xl flex flex-col max-h-[80vh]">
                <div className="h-16 border-b border-neutral-100 flex items-center justify-between px-6 shrink-0">
                    <h4 className="text-[11px] font-black uppercase text-neutral-900 tracking-[0.2em]">История изменений</h4>
                    <Button variant="ghost" size="icon" onClick={() => setIsHistoryModalOpen(false)} className="text-neutral-300 hover:text-black rounded-xl"><X className="h-5 w-5" /></Button>
                </div>
                <DialogTitle className="sr-only">История изменений записи</DialogTitle>
                <DialogDescription className="sr-only">Логи всех действий с текущей записью</DialogDescription>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                    <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-neutral-100">
                        {historyLogs.length > 0 ? historyLogs.map((log: any, i: number) => (
                            <div key={i} className="relative pl-8 space-y-2 group">
                                <div className="absolute left-0 top-1.5 w-[23px] h-[23px] rounded-full bg-white border-2 border-neutral-100 flex items-center justify-center z-10 group-hover:border-neutral-900 transition-colors">
                                    <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 group-hover:bg-neutral-900 transition-colors" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-900">
                                            {log.action === 'created' ? 'Запись создана' :
                                                log.action === 'status_changed' ? 'Статус изменен' : 'Запись обновлена'}
                                        </span>
                                        <span className="text-[8px] font-bold text-neutral-400">
                                            {DateTime.fromISO(log.created_at).setLocale('ru').toFormat('d MMM, HH:mm')}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-neutral-500 font-medium italic leading-relaxed">
                                        {log.change_details || (log.action === 'status_changed' ? (
                                            <>Изменение статуса: <span className="font-black not-italic text-neutral-900 uppercase tracking-tighter">{log.old_value}</span> → <span className="font-black not-italic text-neutral-900 uppercase tracking-tighter">{log.new_value}</span></>
                                        ) : log.action === 'created' ? (
                                            <>Запись добавлена администратором</>
                                        ) : (
                                            <>Внесены изменения в запись</>
                                        ))}
                                    </p>
                                    {log.user_name && <div className="text-[8px] font-black uppercase opacity-40">Автор: {log.user_name}</div>}
                                </div>
                            </div>
                        )) : (
                            <div className="py-20 text-center">
                                <History className="h-10 w-10 text-neutral-100 mx-auto mb-4" />
                                <p className="text-[10px] font-black uppercase text-neutral-300 tracking-widest">Логов пока нет</p>
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-6 border-t border-neutral-100 bg-neutral-50/50 flex justify-center">
                    <Button variant="outline" onClick={() => setIsHistoryModalOpen(false)} className="h-11 px-8 rounded-xl font-bold">Закрыть</Button>
                </div>
            </DialogContent>
        </Dialog>
        </>
    );
}
