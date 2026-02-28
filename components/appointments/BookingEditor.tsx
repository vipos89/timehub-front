import { useState, useMemo, useEffect } from 'react';
import { DateTime } from 'luxon';
import { CalendarIcon, ChevronLeft, ChevronRight, Search, Plus, Clock, User, Phone, AlignLeft, X, Check, History, Bell, CreditCard, Banknote, HelpCircle, FileText, Smartphone } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

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
    customers: any[];
    onSave: (data: any) => Promise<void>;
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
    customers,
    onSave,
    isSaving
}: BookingEditorProps) {
    const [formData, setFormData] = useState({
        clientName: '',
        clientPhone: '',
        clientEmail: '',
        comment: '',
        promocode: '',
        status: 'pending',
        startTime: '',
        endTime: '',
        selectedServices: [] as any[],
        payments: [] as any[],
        totalPrice: 0,
        isGuest: false,
        additionalPhone: ''
    });

    const [searchService, setSearchService] = useState('');

    const master = useMemo(() => {
        const empID = mode === 'create' ? selectedSlot?.empID : selectedAppointment?.employee_id;
        return employees?.find(e => e.id === empID) || null;
    }, [mode, selectedSlot, selectedAppointment, employees]);

    const totalDuration = useMemo(() => {
        return formData.selectedServices.reduce((acc, s) => acc + (s.duration_minutes || s.duration || 0), 0);
    }, [formData.selectedServices]);

    const totalPaid = useMemo(() => {
        return formData.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    }, [formData.payments]);

    const remainingToPay = formData.totalPrice - totalPaid;

    // Reset or populate form when modal opens
    useEffect(() => {
        if (isOpen) {
            if (mode === 'create' && selectedSlot) {
                setFormData({
                    clientName: '',
                    clientPhone: '',
                    clientEmail: '',
                    comment: '',
                    promocode: '',
                    status: 'pending',
                    startTime: selectedSlot.time.toFormat('HH:mm'),
                    endTime: selectedSlot.time.plus({ minutes: 60 }).toFormat('HH:mm'),
                    selectedServices: [],
                    payments: [],
                    totalPrice: 0,
                    isGuest: false,
                    additionalPhone: ''
                });
            } else if (mode === 'edit' && selectedAppointment) {
                const customer = customers?.find(c => c.id === selectedAppointment.client_id);
                
                const clientName = selectedAppointment.client_phone !== 'ANONYMOUS' 
                    ? (selectedAppointment.client_first_name ? `${selectedAppointment.client_first_name} ${selectedAppointment.client_last_name || ''}`.trim() : (customer ? `${customer.first_name} ${customer.last_name || ''}`.trim() : '')) 
                    : 'Клиент';
                    
                const clientPhone = selectedAppointment.client_phone !== 'ANONYMOUS' 
                    ? (selectedAppointment.client_phone || customer?.phone || '') 
                    : '';

                setFormData({
                    clientName,
                    clientPhone,
                    clientEmail: customer?.email || '',
                    comment: selectedAppointment.comment || '',
                    promocode: '', // Add to schema later if needed
                    status: selectedAppointment.status,
                    startTime: formatTimeRaw(selectedAppointment.start_time),
                    endTime: formatTimeRaw(selectedAppointment.end_time),
                    selectedServices: selectedAppointment.services?.map((s: any) => ({
                        service_id: s.service_id,
                        price: s.price,
                        duration_minutes: s.duration_minutes,
                        service: s.service || allServices?.find(as => as.id === s.service_id)
                    })) || [],
                    payments: selectedAppointment.payments || [],
                    totalPrice: selectedAppointment.total_price || 0,
                    isGuest: selectedAppointment.client_phone === 'ANONYMOUS',
                    additionalPhone: ''
                });
            }
            setSearchService('');
        }
    }, [isOpen, mode, selectedSlot, selectedAppointment, customers, allServices]);

    // Update endTime and totalPrice when services change
    useEffect(() => {
        let price = 0;
        formData.selectedServices.forEach(s => {
            price += s.price || 0;
        });

        if (formData.startTime) {
            const start = DateTime.fromFormat(formData.startTime, 'HH:mm');
            const end = start.plus({ minutes: totalDuration || 60 });
            setFormData(prev => ({ 
                ...prev, 
                endTime: end.toFormat('HH:mm'),
                totalPrice: price 
            }));
        }
    }, [formData.selectedServices, formData.startTime]);
    
    // Auto-fill client from phone lookup
    useEffect(() => {
        if (formData.clientPhone && formData.clientPhone.length >= 7 && mode === 'create' && !formData.clientName) {
            const found = customers?.find(c => c.phone?.replace(/\D/g, '') === formData.clientPhone.replace(/\D/g, ''));
            if (found) {
                setFormData(prev => ({
                    ...prev,
                    clientName: `${found.first_name} ${found.last_name || ''}`.trim(),
                    clientEmail: found.email || prev.clientEmail
                }));
            }
        }
    }, [formData.clientPhone, customers, mode]);

    const formatTimeRaw = (isoString: string) => {
        if (!isoString) return '';
        return isoString.slice(11, 16);
    };

    const addService = (serviceObj: any) => {
        if (!formData.selectedServices.find(s => s.service_id === serviceObj.service_id)) {
            setFormData(prev => ({
                ...prev,
                selectedServices: [...prev.selectedServices, serviceObj]
            }));
        }
        setSearchService('');
    };

    const removeService = (serviceId: number) => {
        setFormData(prev => ({
            ...prev,
            selectedServices: prev.selectedServices.filter(s => s.service_id !== serviceId)
        }));
    };

    const addPayment = (method: string, amount: number) => {
        setFormData(prev => {
            const existingIdx = prev.payments.findIndex(p => p.method === method);
            if (existingIdx >= 0) {
                const newPayments = [...prev.payments];
                newPayments[existingIdx].amount += amount;
                return { ...prev, payments: newPayments };
            }
            return {
                ...prev,
                payments: [...prev.payments, { method, amount }]
            };
        });
    };

    const removePayment = (index: number) => {
        setFormData(prev => ({
            ...prev,
            payments: prev.payments.filter((_, i) => i !== index)
        }));
    };

    const handleSave = () => {
        onSave(formData);
    };

    const displayDate = mode === 'create' && selectedSlot 
        ? selectedSlot.time.setLocale('ru').toFormat('d MMMM') 
        : (selectedAppointment ? DateTime.fromISO(selectedAppointment.start_time).setLocale('ru').toFormat('d MMMM') : '');

    const filteredServices = useMemo(() => {
        if (!searchService) return [];
        const query = searchService.toLowerCase();
        
        // Use employee services for create mode to get accurate master pricing
        const source = mode === 'create' ? employeeServices : allServices;
        if (!source) return [];

        return source.filter((s: any) => {
            const name = (s.service?.name || s.name || '').toLowerCase();
            return name.includes(query);
        }).map(s => {
            // Normalize shape
            return {
                service_id: s.service_id || s.id,
                price: s.price,
                duration_minutes: s.duration_minutes,
                service: s.service || s,
            };
        });
    }, [searchService, employeeServices, allServices, mode]);

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'pending': return 'bg-neutral-600 border-neutral-600 text-white';
            case 'arrived': return 'bg-emerald-100 border-emerald-200 text-emerald-800';
            case 'no_show': return 'bg-red-50 border-red-100 text-red-600';
            case 'confirmed': return 'bg-blue-50 border-blue-200 text-blue-700';
            default: return 'bg-neutral-100 border-neutral-200 text-neutral-600';
        }
    };

    const getStatusText = (status: string) => {
        switch(status) {
            case 'pending': return 'Ожидание';
            case 'arrived': return 'Пришел';
            case 'no_show': return 'Не пришел';
            case 'confirmed': return 'Подтвердил';
            default: return 'Статус';
        }
    };

    const handleStatusClick = (status: string) => {
        setFormData(prev => ({ ...prev, status }));
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[1240px] sm:max-w-[1240px] p-0 overflow-hidden bg-neutral-100 border-none shadow-2xl h-[90vh] flex flex-col rounded-2xl">
                
                {/* Main Content */}
                <div className="flex flex-1 overflow-hidden">
                    
                    {/* Left Column: Master & Status */}
                    <div className="w-[280px] shrink-0 bg-white border-r border-neutral-200 flex flex-col overflow-y-auto">
                        
                        {/* Master Info */}
                        <div className="p-4 flex items-center gap-3">
                            <Avatar className="h-10 w-10 border">
                                <AvatarImage src={master?.avatar_thumbnail_url || master?.avatar_url} />
                                <AvatarFallback>{master?.name?.charAt(0) || 'M'}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <span className="font-bold text-sm text-neutral-900 leading-tight">{master?.name || 'Мастер'}</span>
                                <span className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider">{master?.position || 'Специалист'}</span>
                            </div>
                        </div>

                        {/* Date & Time */}
                        <div className="px-4 pb-4 border-b border-neutral-100">
                            <div className="flex items-start gap-3 bg-neutral-50 rounded-xl p-3 border border-neutral-100">
                                <CalendarIcon className="h-5 w-5 text-neutral-400 mt-0.5" />
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm text-neutral-900">{displayDate}</span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs text-neutral-600 font-medium">{formData.startTime}-{formData.endTime}</span>
                                        <span className="text-xs text-neutral-400">·</span>
                                        <span className="text-[11px] text-neutral-400">{Math.floor(totalDuration/60) > 0 ? `${Math.floor(totalDuration/60)} ч ` : ''}{totalDuration % 60 > 0 ? `${totalDuration%60} мин` : (totalDuration === 0 ? '0 мин' : '')}</span>
                                    </div>
                                    <button className="text-[11px] text-blue-600 font-medium mt-1 flex items-center gap-1 hover:underline w-fit">
                                        <Clock className="h-3 w-3" /> Редактировать время
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Promocode & Education Banner */}
                        <div className="p-4 border-b border-neutral-100 space-y-3">
                            <div className="flex items-center justify-between border border-neutral-200 rounded-xl p-3">
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-bold text-neutral-900 leading-tight">Познакомьтесь с новым<br/>окном за 1 минуту</span>
                                    <button className="text-[10px] font-bold text-neutral-900 border border-neutral-200 rounded-full px-3 py-1 mt-2 flex items-center gap-1 w-fit hover:bg-neutral-50 transition-colors">
                                        🚀 Пройти обучение
                                    </button>
                                </div>
                                <button className="self-start text-neutral-400 hover:text-neutral-600"><X className="h-4 w-4" /></button>
                            </div>
                        </div>

                        {/* Pinned Fields */}
                        <div className="p-4 space-y-4 border-b border-neutral-100">
                            <div className="flex items-center gap-2 text-neutral-400 text-xs font-bold w-full uppercase tracking-wider">
                                <AlignLeft className="h-3.5 w-3.5" /> Закрепленные поля
                            </div>
                            
                            <div className="space-y-1.5 flex flex-col flex-1 h-fit">
                                <Label className="text-[11px] font-semibold text-neutral-500">Комментарий к записи</Label>
                                <Textarea 
                                    placeholder="Введите комментарий..."
                                    className="resize-none h-20 text-xs rounded-xl border-neutral-200"
                                    value={formData.comment}
                                    onChange={(e) => setFormData({...formData, comment: e.target.value})}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[11px] font-semibold text-neutral-500 uppercase tracking-widest">Промокод</Label>
                                <Input 
                                    className="h-10 text-xs rounded-xl border-neutral-200" 
                                    placeholder="Введите промокод"
                                    value={formData.promocode}
                                    onChange={(e) => setFormData({...formData, promocode: e.target.value})}
                                />
                            </div>
                        </div>

                        {/* Action Buttons Grid */}
                        <div className="p-4 grid grid-cols-2 gap-2 mt-auto">
                            <Button variant="outline" className="h-[60px] flex-col gap-1.5 rounded-xl border-neutral-200 bg-white shadow-sm text-neutral-600 hover:bg-neutral-50 font-medium">
                                <AlignLeft className="h-4 w-4" />
                                <span className="text-[10px]">Расширенные поля</span>
                            </Button>
                            <Button variant="outline" className="h-[60px] flex-col gap-1.5 rounded-xl border-neutral-200 bg-white shadow-sm text-neutral-600 hover:bg-neutral-50 font-medium">
                                <Clock className="h-4 w-4" />
                                <span className="text-[10px]">Повторение записи</span>
                            </Button>
                            <Button variant="outline" className="h-[60px] flex-col gap-1.5 rounded-xl border-neutral-200 bg-white shadow-sm text-neutral-600 hover:bg-neutral-50 font-medium relative">
                                <Bell className="h-4 w-4" />
                                <span className="text-[10px]">Уведомления о визите</span>
                                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-red-500"></span>
                            </Button>
                            <Button variant="outline" className="h-[60px] flex-col gap-1.5 rounded-xl border-neutral-200 bg-white shadow-sm text-neutral-600 hover:bg-neutral-50 font-medium">
                                <FileText className="h-4 w-4" />
                                <span className="text-[10px]">Списание расходников</span>
                            </Button>
                            <Button variant="outline" className="h-[60px] flex-col gap-1.5 rounded-xl border-neutral-200 bg-white shadow-sm text-neutral-600 hover:bg-neutral-50 font-medium col-span-2">
                                <History className="h-4 w-4" />
                                <span className="text-[10px]">История изменений</span>
                            </Button>
                        </div>
                    </div>

                    {/* Center Column: Services & Payment */}
                    <div className="flex-1 flex flex-col bg-neutral-50 min-w-[400px]">
                        
                        {/* Status Bar */}
                        <div className="h-16 border-b border-neutral-200 bg-white px-6 flex items-center shrink-0">
                            <div className="flex bg-neutral-100 p-1 rounded-xl w-fit">
                                <button 
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${formData.status === 'pending' ? 'bg-neutral-600 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
                                    onClick={() => handleStatusClick('pending')}
                                >
                                    <Clock className="h-3 w-3 inline mr-1" /> Ожидание
                                </button>
                                <button 
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${formData.status === 'arrived' ? 'bg-emerald-100 text-emerald-800 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
                                    onClick={() => handleStatusClick('arrived')}
                                >
                                    <Plus className="h-3 w-3 inline mr-1" /> Пришел
                                </button>
                                <button 
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${formData.status === 'no_show' ? 'bg-red-50 text-red-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
                                    onClick={() => handleStatusClick('no_show')}
                                >
                                    <span className="font-bold inline mr-1">—</span> Не пришел
                                </button>
                                <button 
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${formData.status === 'confirmed' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'}`}
                                    onClick={() => handleStatusClick('confirmed')}
                                >
                                    <Check className="h-3 w-3 inline mr-1" /> Подтвердил
                                </button>
                            </div>
                        </div>

                        {/* Title Bar */}
                        <div className="px-6 py-5 bg-white border-b border-neutral-200 shrink-0">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-neutral-500 font-medium">
                                    <span>{master?.name.split(' ')[0]}</span>
                                    <span>·</span>
                                    <span>{Math.floor(totalDuration/60) > 0 ? `${Math.floor(totalDuration/60)} ч ` : ''}{totalDuration % 60 > 0 ? `${totalDuration%60} мин` : (totalDuration === 0 ? '0 мин' : '')}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm font-bold text-neutral-900">
                                    {formData.totalPrice} BYN
                                    <ChevronRight className="h-4 w-4 text-neutral-400 cursor-pointer" />
                                </div>
                            </div>
                            <h2 className="text-xl font-bold mt-1 uppercase">
                                {formData.selectedServices.length === 1 ? formData.selectedServices[0].service?.name : (formData.selectedServices.length === 0 ? 'Выберите услуги' : `Услуги (${formData.selectedServices.length})`)}
                            </h2>
                        </div>

                        {/* Scrollable middle section */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            
                            {/* Tabs & Search */}
                            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-4 h-[400px] flex flex-col">
                                <Tabs defaultValue="services" className="w-full flex-1 flex flex-col">
                                    <TabsList className="grid w-full grid-cols-2 h-10 bg-neutral-100 rounded-xl p-1 mb-4">
                                        <TabsTrigger value="services" className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                            Услуги
                                        </TabsTrigger>
                                        <TabsTrigger value="products" className="rounded-lg text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                            Товары
                                        </TabsTrigger>
                                    </TabsList>
                                    
                                    <TabsContent value="services" className="mt-0 flex-1 flex flex-col">
                                        <div className="relative mb-4">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                                            <Input 
                                                className="pl-9 h-10 border-neutral-200 rounded-xl bg-white shadow-sm text-sm"
                                                placeholder="Поиск по услугам"
                                                value={searchService}
                                                onChange={(e) => setSearchService(e.target.value)}
                                            />
                                        </div>

                                        {/* Dropdown for search results */}
                                        {searchService && filteredServices.length > 0 && (
                                            <div className="absolute z-10 w-[calc(100%-2rem)] max-h-[200px] overflow-y-auto bg-white border border-neutral-200 rounded-xl shadow-lg mt-12 py-1">
                                                {filteredServices.map((s: any, i) => (
                                                    <div 
                                                        key={`${s.service_id}-${i}`}
                                                        className="px-4 py-2 hover:bg-neutral-50 cursor-pointer flex justify-between items-center group"
                                                        onClick={() => addService(s)}
                                                    >
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium">{s.service?.name}</span>
                                                            <span className="text-xs text-neutral-500">{s.duration_minutes} мин</span>
                                                        </div>
                                                        <span className="text-sm font-bold text-neutral-900 group-hover:text-blue-600">{s.price} BYN</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {searchService && filteredServices.length === 0 && (
                                            <div className="absolute z-10 w-[calc(100%-2rem)] bg-white border border-neutral-200 rounded-xl shadow-lg mt-12 py-4 px-4 text-center text-sm text-neutral-500">
                                                Услуги не найдены
                                            </div>
                                        )}

                                        {/* Selected Services Cards */}
                                        <div className="flex flex-wrap gap-3 overflow-y-auto content-start flex-1 items-start">
                                            {formData.selectedServices.map((s, idx) => (
                                                <div key={`${s.service_id}-${idx}`} className="w-[calc(33.333%-0.5rem)] min-w-[140px] border border-neutral-200 rounded-2xl p-3 bg-white hover:border-blue-300 relative group flex flex-col justify-between h-28 shadow-sm transition-all">
                                                    <div>
                                                        <div className="text-[11px] font-bold leading-tight upppercase line-clamp-2 text-neutral-800 pr-5">
                                                            {s.service?.name}
                                                        </div>
                                                        {idx === 0 && mode === 'edit' && (
                                                            <div className="mt-1">
                                                                <span className="text-[9px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded leading-none">Последний визит</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-xs font-bold text-neutral-600">{s.price} BYN</span>
                                                        <span className="text-[10px] text-neutral-400">{s.duration_minutes} мин</span>
                                                    </div>
                                                    <button 
                                                        className="absolute top-2 right-2 text-neutral-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => removeService(s.service_id)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            <div 
                                                className="w-[calc(33.333%-0.5rem)] min-w-[140px] border border-dashed border-neutral-300 rounded-2xl p-3 flex flex-col items-center justify-center h-28 cursor-pointer hover:bg-neutral-50 transition-colors text-neutral-500 hover:text-neutral-700"
                                                onClick={() => document.querySelector<HTMLInputElement>('input[placeholder="Поиск по услугам"]')?.focus()}
                                            >
                                                <Plus className="h-6 w-6 mb-1 text-neutral-400" />
                                                <span className="text-xs font-bold">Добавить услугу</span>
                                            </div>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="products" className="mt-0 flex-1 flex flex-col items-center justify-center text-neutral-400 text-sm">
                                        Раздел товаров в разработке
                                    </TabsContent>
                                </Tabs>
                            </div>

                            {/* Payment Section */}
                            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 space-y-4 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-50 rounded-bl-full -z-0 opacity-50"></div>
                                <div className="relative z-10 flex items-center justify-between border-b border-neutral-100 pb-4">
                                    <div className="flex items-end gap-3">
                                        <span className="text-sm font-bold text-neutral-500">К оплате</span>
                                        <div className="text-2xl font-black text-neutral-900 leading-none">{formData.totalPrice} BYN</div>
                                    </div>
                                    {remainingToPay > 0 && formData.totalPrice > 0 && totalPaid > 0 && (
                                        <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 text-xs">Остаток: {remainingToPay} BYN</Badge>
                                    )}
                                    {remainingToPay <= 0 && formData.totalPrice > 0 && (
                                        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-xs gap-1.5 py-1">
                                            <Check className="h-3 w-3" /> Оплачено полностью
                                        </Badge>
                                    )}
                                </div>
                                
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold text-neutral-600">Быстрая оплата</span>
                                        <button className="text-[10px] text-neutral-500 font-bold hover:text-neutral-900 uppercase tracking-widest flex items-center gap-1">
                                            <AlignLeft className="h-3 w-3" /> Настроить
                                        </button>
                                    </div>

                                    <div className="flex gap-3">
                                        <div 
                                            className={`flex-1 rounded-xl p-3 flex flex-col gap-1 cursor-pointer transition-all active:scale-95 ${formData.payments.some(p => p.method === 'card') ? 'border-2 border-emerald-400 bg-emerald-50/30 shadow-sm' : 'border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'}`}
                                            onClick={() => {
                                                if (remainingToPay > 0) addPayment('card', remainingToPay);
                                            }}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                                                    <CreditCard className="h-3.5 w-3.5 text-neutral-500" /> Карта
                                                </div>
                                                {formData.payments.find(p => p.method === 'card') && (
                                                    <span className="text-[10px] font-bold text-emerald-600">{formData.payments.find(p => p.method === 'card')?.amount} BYN</span>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-neutral-400">Расчетный счет</span>
                                        </div>
                                        <div 
                                            className={`flex-1 rounded-xl p-3 flex flex-col gap-1 cursor-pointer transition-all active:scale-95 ${formData.payments.some(p => p.method === 'cash') ? 'border-2 border-emerald-400 bg-emerald-50/30 shadow-sm' : 'border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'}`}
                                            onClick={() => {
                                                if (remainingToPay > 0) addPayment('cash', remainingToPay);
                                            }}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                                                    <Banknote className="h-3.5 w-3.5 text-neutral-500" /> Наличные
                                                </div>
                                                {formData.payments.find(p => p.method === 'cash') && (
                                                    <span className="text-[10px] font-bold text-emerald-600">{formData.payments.find(p => p.method === 'cash')?.amount} BYN</span>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-neutral-400">Основная касса</span>
                                        </div>
                                        <div className="flex-1 rounded-xl border border-neutral-200 p-3 flex flex-col justify-center items-center gap-1.5 cursor-pointer hover:border-neutral-300 hover:bg-neutral-50 text-neutral-600 hover:text-neutral-900 transition-all">
                                            <div className="text-xs font-bold flex items-center gap-1.5">
                                                <CreditCard className="h-4 w-4" /> Все способы
                                            </div>
                                        </div>
                                    </div>

                                    {/* Selected Payments List (if partially paid or mixed) */}
                                    {formData.payments.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-neutral-100 flex flex-col gap-2">
                                            {formData.payments.map((p, idx) => (
                                                <div key={idx} className="flex items-center justify-between bg-white border border-neutral-200 rounded-lg p-2 text-sm shadow-sm">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary" className="bg-neutral-100 uppercase tracking-widest text-[9px] font-bold text-neutral-500">
                                                            {p.method === 'cash' ? 'Наличные' : p.method === 'card' ? 'Карта' : 'Безнал'}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Input 
                                                            type="number" 
                                                            value={p.amount} 
                                                            onChange={(e) => {
                                                                const newPayments = [...formData.payments];
                                                                newPayments[idx].amount = parseFloat(e.target.value) || 0;
                                                                setFormData({ ...formData, payments: newPayments });
                                                            }}
                                                            className="h-7 w-20 text-right font-bold text-xs border-none focus-visible:ring-0 bg-transparent"
                                                        />
                                                        <span className="text-xs font-bold text-neutral-400">BYN</span>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-neutral-400 hover:text-red-500 mx-1" onClick={() => removePayment(idx)}>
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Online Payment Banner */}
                                    <div className="mt-4 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 rounded-xl p-3 border border-indigo-100 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="flex -space-x-1 shrink-0">
                                                <div className="h-6 w-6 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-white"><Smartphone className="h-3 w-3" /></div>
                                                <div className="h-6 w-6 rounded-full bg-purple-500 border-2 border-white flex items-center justify-center text-white"><CreditCard className="h-3 w-3" /></div>
                                                <div className="h-6 w-6 rounded-full bg-yellow-400 border-2 border-white flex items-center justify-center text-white"><Banknote className="h-3 w-3" /></div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-neutral-900 leading-tight">Подключите онлайн-платежи</span>
                                                <span className="text-[10px] text-neutral-500">СБП с комиссией от 0.4%</span>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold rounded-lg border-neutral-300 bg-white">Подключить</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Client & Metadata */}
                    <div className="w-[300px] shrink-0 bg-white border-l border-neutral-200 flex flex-col">
                        
                        {/* Change Client Header */}
                        <div className="h-14 border-b border-neutral-200 px-4 flex items-center">
                            <button className="text-[11px] font-bold text-neutral-500 hover:text-neutral-900 flex items-center gap-1 transition-colors uppercase tracking-widest">
                                <ChevronLeft className="h-3 w-3" /> Сменить клиента
                            </button>
                        </div>

                        {/* Client Info */}
                        <div className="p-5 border-b border-neutral-100 flex-1 overflow-y-auto">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <Input 
                                        className="h-8 px-0 border-0 bg-transparent text-lg font-bold text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-0 rounded-none shadow-none"
                                        placeholder="Имя клиента *"
                                        value={formData.clientName}
                                        onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                                    />
                                    <div className="flex items-center gap-1 text-neutral-500">
                                        <Input 
                                            className="h-6 px-0 text-sm border-0 bg-transparent focus-visible:ring-0 rounded-none shadow-none font-medium"
                                            placeholder="+375 •• •••-••-••"
                                            value={formData.clientPhone}
                                            onChange={(e) => setFormData({...formData, clientPhone: e.target.value})}
                                        />
                                        <AlignLeft className="h-3.5 w-3.5 text-neutral-400" />
                                    </div>
                                    <Input 
                                        className="h-6 px-0 text-xs border-0 bg-transparent focus-visible:ring-0 rounded-none shadow-none text-neutral-500"
                                        placeholder="email@example.com (необязательно)"
                                        value={formData.clientEmail}
                                        onChange={(e) => setFormData({...formData, clientEmail: e.target.value})}
                                    />
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-neutral-200 text-neutral-600"><User className="h-4 w-4" /></Button>
                                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-neutral-200 text-neutral-600">⋯</Button>
                                </div>
                            </div>

                            <Button variant="outline" className="mt-4 flex flex-col gap-1 w-[90px] h-[60px] rounded-xl border-neutral-200 text-neutral-600 hover:bg-neutral-50">
                                <FileText className="h-4 w-4" />
                                <span className="text-[10px] font-bold">История<br/>посещений</span>
                            </Button>

                            <div className="mt-5 flex items-center space-x-2">
                                <Checkbox id="other-client" checked={formData.isGuest} onCheckedChange={(val) => setFormData({...formData, isGuest: !!val})} />
                                <Label htmlFor="other-client" className="text-xs text-neutral-600 font-medium">Записывает другого посетителя</Label>
                            </div>

                            <Separator className="my-5 bg-neutral-100" />

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-neutral-900">Дополнительно</h3>
                                <button className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:underline">
                                    <Plus className="h-3 w-3" /> Добавить примечание
                                </button>
                                
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest">Дополнительный телефон</Label>
                                    <Input 
                                        className="h-8 text-xs border-0 border-b border-dashed border-neutral-300 rounded-none px-0 shadow-none focus-visible:ring-0 bg-transparent placeholder:text-neutral-300" 
                                        placeholder="Введите номер"
                                        value={formData.additionalPhone}
                                        onChange={(e) => setFormData({...formData, additionalPhone: e.target.value})}
                                    />
                                </div>
                            </div>

                            <Separator className="my-5 bg-neutral-100" />

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-neutral-900">Данные по сети</h3>
                                <div className="text-xs text-neutral-600 font-medium">{company?.name || 'Company Name'}</div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Последний визит</span>
                                        <span className="text-xs font-bold text-neutral-800">28.02 16:45</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Всего визитов</span>
                                        <span className="text-xs font-bold text-neutral-800">23</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Не пришел</span>
                                        <span className="text-xs font-bold text-neutral-800">1 раз</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Баланс</span>
                                        <span className="text-xs font-bold text-emerald-600">0</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Продано</span>
                                        <span className="text-xs font-bold text-neutral-800">1025 BYN</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Оплачено</span>
                                        <span className="text-xs font-bold text-neutral-800">1025 BYN</span>
                                    </div>
                                </div>
                            </div>

                            <Separator className="my-5 bg-neutral-100" />

                            <div className="space-y-4 pb-4">
                                <h3 className="text-sm font-bold text-neutral-900">Данные записи</h3>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Дата создания</span>
                                        <span className="text-xs font-medium text-neutral-800">{DateTime.now().toFormat('dd.MM HH:mm')}</span>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Источник</span>
                                    <span className="text-xs font-medium text-neutral-800">Онлайн-запись</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-neutral-200 bg-neutral-50 shrink-0 flex items-center justify-between gap-3">
                            {mode === 'edit' && (
                                <Button variant="outline" className="h-10 px-4 rounded-xl text-xs font-bold text-neutral-600 hover:text-red-500 border-neutral-200 bg-white">
                                    <HelpCircle className="h-4 w-4 mr-1.5" /> Удалить
                                </Button>
                            )}
                            <div className="flex-1"></div>
                            <Button 
                                className="h-10 px-6 rounded-xl text-xs font-bold"
                                style={{ backgroundColor: '#FFD700', color: '#000' }}
                                onClick={handleSave}
                                disabled={isSaving || !formData.clientName || formData.selectedServices.length === 0}
                            >
                                {isSaving ? 'Сохранение...' : 'Сохранить запись'}
                            </Button>
                        </div>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    );
}
