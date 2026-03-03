import { useState, useMemo, useEffect } from 'react';
import { DateTime } from 'luxon';
import { 
    CalendarIcon, 
    ChevronRight, 
    Search, 
    Plus, 
    Clock, 
    User, 
    Phone, 
    X, 
    Check, 
    CreditCard, 
    Banknote, 
    Smartphone,
    AlertCircle,
    Trash2,
    Calendar as CalendarIcon2
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
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
    customers: any[];
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
    customers,
    onSave,
    onDelete,
    isSaving
}: BookingEditorProps) {
    const [formData, setFormData] = useState({
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
    });

    const [searchService, setSearchService] = useState('');
    const [searchClient, setSearchClient] = useState('');
    const [showClientDropdown, setShowClientDropdown] = useState(false);

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

    // Load or reset data
    useEffect(() => {
        if (isOpen) {
            if (mode === 'create' && selectedSlot) {
                setFormData({
                    clientName: '',
                    clientPhone: '',
                    clientEmail: '',
                    comment: '',
                    status: 'pending',
                    startTime: selectedSlot.time.toFormat('HH:mm'),
                    endTime: selectedSlot.time.plus({ minutes: 60 }).toFormat('HH:mm'),
                    selectedServices: [],
                    payments: [],
                    totalPrice: 0,
                    isGuest: false,
                });
            } else if (mode === 'edit' && selectedAppointment) {
                const customer = customers?.find(c => c.id === selectedAppointment.client_id);
                setFormData({
                    clientName: selectedAppointment.client_first_name || customer?.first_name || '',
                    clientPhone: selectedAppointment.client_phone || customer?.phone || '',
                    clientEmail: customer?.email || '',
                    comment: selectedAppointment.comment || '',
                    status: selectedAppointment.status,
                    startTime: selectedAppointment.start_time.slice(11, 16),
                    endTime: selectedAppointment.end_time.slice(11, 16),
                    selectedServices: selectedAppointment.services?.map((s: any) => ({
                        service_id: s.service_id,
                        price: s.price,
                        duration_minutes: s.duration_minutes,
                        service: s.service || allServices?.find(as => as.id === s.service_id)
                    })) || [],
                    payments: selectedAppointment.payments || [],
                    totalPrice: selectedAppointment.total_price || 0,
                    isGuest: selectedAppointment.client_phone === 'ANONYMOUS' || selectedAppointment.client_phone === '' || selectedAppointment.client_phone === 'guest',
                });
            }
        }
    }, [isOpen, mode, selectedSlot, selectedAppointment, customers, allServices]);

    // Duration & Price sync
    useEffect(() => {
        const price = formData.selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);
        if (formData.startTime) {
            const start = DateTime.fromFormat(formData.startTime, 'HH:mm');
            const end = start.plus({ minutes: totalDuration || 60 });
            setFormData(prev => ({ 
                ...prev, 
                endTime: end.toFormat('HH:mm'),
                totalPrice: price 
            }));
        }
    }, [formData.selectedServices, formData.startTime, totalDuration]);

    const handleSave = () => {
        if (formData.selectedServices.length === 0) {
            toast.error('Выберите хотя бы одну услугу');
            return;
        }
        
        // If client name is missing, use a placeholder
        const dataToSave = {
            ...formData,
            clientName: formData.clientName || 'Без имени',
        };
        onSave(dataToSave);
    };

    const filteredServices = useMemo(() => {
        const source = (mode === 'create' ? employeeServices : allServices) || [];
        const query = searchService.toLowerCase();
        return source.filter((s: any) => (s.service?.name || s.name || '').toLowerCase().includes(query))
            .map(s => ({
                service_id: s.service_id || s.id,
                price: s.price,
                duration_minutes: s.duration_minutes || s.duration,
                service: s.service || s,
            }));
    }, [searchService, employeeServices, allServices, mode]);

    const filteredCustomers = useMemo(() => {
        if (!searchClient) return [];
        const query = searchClient.toLowerCase();
        return (customers || []).filter(c => 
            (c.first_name || '').toLowerCase().includes(query) ||
            (c.last_name || '').toLowerCase().includes(query) ||
            (c.phone || '').toLowerCase().includes(query)
        );
    }, [searchClient, customers]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent showCloseButton={false} className="sm:max-w-[1400px] w-[98vw] p-0 overflow-hidden bg-white rounded-[1.5rem] border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] h-[92vh] flex flex-col">
                {/* Header: Status & Actions */}
                <div className="h-16 border-b border-neutral-100 flex items-center justify-between px-6 shrink-0">
                    <div className="flex gap-1.5 p-1 bg-neutral-100 rounded-xl">
                        {[
                            { id: 'pending', label: 'Ожидание', color: 'bg-amber-500', active: 'bg-white text-amber-600 shadow-sm' },
                            { id: 'confirmed', label: 'Подтвержден', color: 'bg-emerald-500', active: 'bg-white text-emerald-600 shadow-sm' },
                            { id: 'arrived', label: 'Пришел', color: 'bg-blue-500', active: 'bg-white text-blue-600 shadow-sm' },
                            { id: 'no_show', label: 'Не пришел', color: 'bg-red-500', active: 'bg-white text-red-600 shadow-sm' }
                        ].map(s => (
                            <button 
                                key={s.id} 
                                onClick={() => setFormData({...formData, status: s.id})}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${
                                    formData.status === s.id 
                                        ? s.active
                                        : 'text-neutral-400 hover:text-neutral-600'
                                }`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        {mode === 'edit' && onDelete && (
                            <Button variant="ghost" size="icon" onClick={() => onDelete(selectedAppointment.id)} className="text-neutral-300 hover:text-red-500 rounded-xl"><Trash2 className="h-5 w-5" /></Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={onClose} className="text-neutral-300 hover:text-black rounded-xl"><X className="h-5 w-5" /></Button>
                    </div>
                </div>

                <div className="flex-1 grid grid-cols-[320px_1fr_320px] overflow-hidden">
                    {/* Column 1: Client & Basic Info */}
                    <div className="border-r border-neutral-100 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                        <div className="space-y-6">
                            <h4 className="text-[11px] font-black uppercase text-neutral-400 tracking-[0.2em] px-1">Основные данные</h4>
                            <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                                <Avatar className="h-12 w-12 border-2 border-white shadow-sm shrink-0">
                                    <AvatarImage src={master?.avatar_url} />
                                    <AvatarFallback className="bg-neutral-900 text-white font-bold">{master?.name?.[0]}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-sm leading-tight text-neutral-900 truncate">{master?.name}</h3>
                                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-0.5 truncate">{master?.position || 'Специлаист'}</p>
                                </div>
                            </div>
                            
                            <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-100 space-y-4">
                                <div className="flex items-center gap-3 text-xs font-bold text-neutral-900">
                                    <div className="p-2 bg-white rounded-xl shadow-sm border border-neutral-100"><CalendarIcon2 className="h-4 w-4 text-neutral-400" /></div>
                                    {selectedSlot?.time.setLocale('ru').toFormat('d MMMM, cccc') || 'Выбранная дата'}
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 flex flex-col min-w-0">
                                        <Label className="text-[9px] font-black uppercase text-neutral-400 mb-2 pl-1">Приход</Label>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-300" />
                                            <Input value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="pl-9 h-11 font-black border-none bg-white rounded-2xl shadow-sm text-xs" />
                                        </div>
                                    </div>
                                    <div className="flex-1 flex flex-col min-w-0">
                                        <Label className="text-[9px] font-black uppercase text-neutral-400 mb-2 pl-1">Уход</Label>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-200" />
                                            <Input value={formData.endTime} readOnly className="pl-9 h-11 font-black border-none bg-neutral-100/50 rounded-2xl text-neutral-300 text-xs" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between px-1">
                                <h4 className="text-[11px] font-black uppercase text-neutral-400 tracking-[0.2em]">Клиент</h4>
                                {formData.isGuest && <Badge className="bg-neutral-100 text-neutral-400 border-none text-[9px] font-black uppercase">Гость</Badge>}
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2 relative">
                                    <Label className="text-[10px] font-black uppercase text-neutral-400 pl-1">ФИО / Поиск</Label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-300" />
                                        <Input 
                                            value={formData.clientName || searchClient} 
                                            onChange={e => {
                                                const val = e.target.value;
                                                setSearchClient(val);
                                                setFormData({...formData, clientName: val});
                                                setShowClientDropdown(true);
                                            }} 
                                            onFocus={() => setShowClientDropdown(true)}
                                            placeholder="Введите имя или выберите..." 
                                            className="pl-11 h-12 rounded-2xl border-neutral-100 focus:ring-0 text-sm font-bold shadow-sm" 
                                        />
                                        {showClientDropdown && filteredCustomers.length > 0 && (
                                            <div className="absolute top-14 left-0 right-0 z-20 bg-white rounded-3xl border border-neutral-100 shadow-2xl overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                                {filteredCustomers.map((c, i) => (
                                                    <div key={i} onClick={() => {
                                                        setFormData({
                                                            ...formData,
                                                            clientName: `${c.first_name} ${c.last_name || ''}`.trim(),
                                                            clientPhone: c.phone || '',
                                                            clientEmail: c.email || '',
                                                        });
                                                        setSearchClient('');
                                                        setShowClientDropdown(false);
                                                    }} className="px-5 py-3 hover:bg-neutral-50 cursor-pointer flex items-center gap-4 transition-colors">
                                                        <Avatar className="h-8 w-8 shrink-0">
                                                            <AvatarFallback className="bg-neutral-200 text-neutral-500 text-[10px] font-bold">{c.first_name?.[0]}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-neutral-800">{c.first_name} {c.last_name}</span>
                                                            <span className="text-[10px] text-neutral-400 font-bold">{c.phone}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-neutral-400 pl-1">Телефон</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-300" />
                                        <Input value={formData.clientPhone} onChange={e => setFormData({...formData, clientPhone: e.target.value})} placeholder="+375 •• •••-••-••" className="pl-11 h-12 rounded-2xl border-neutral-100 focus:ring-0 text-sm font-bold shadow-sm" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 mt-auto">
                            <Label className="text-[11px] font-black uppercase text-neutral-400 px-1 tracking-widest">Примечание</Label>
                            <Textarea value={formData.comment} onChange={e => setFormData({...formData, comment: e.target.value})} placeholder="Дополнительная информация..." className="min-h-[100px] rounded-[2rem] border-neutral-100 resize-none text-sm p-5 bg-neutral-50/50" />
                        </div>
                    </div>

                    {/* Column 2: Services */}
                    <div className="border-r border-neutral-100 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar bg-neutral-50/30">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black tracking-tight text-neutral-900">Услуги</h3>
                                <p className="text-[10px] text-neutral-400 font-black uppercase tracking-widest mt-1">Выбор и настройка</p>
                            </div>
                            <div className="flex gap-2">
                                <Badge className="bg-white text-neutral-900 border-neutral-100 shadow-sm px-3 py-1.5 rounded-xl text-[10px] font-black uppercase">{totalDuration} мин</Badge>
                                <Badge className="bg-neutral-900 text-white border-none shadow-sm px-3 py-1.5 rounded-xl text-[10px] font-black uppercase">{formData.selectedServices.length}</Badge>
                            </div>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-300" />
                            <Input 
                                value={searchService} 
                                onChange={e => setSearchService(e.target.value)} 
                                placeholder="Найти услугу..." 
                                className="pl-12 h-14 rounded-[1.5rem] border-neutral-100 shadow-sm bg-white font-bold text-neutral-700" 
                            />
                        </div>

                        <div className="grid gap-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {!searchService ? (
                                // Manual selection (all services)
                                <div className="space-y-2">
                                    {(mode === 'create' ? employeeServices : allServices || []).map((s: any, i: number) => {
                                        const serviceItem = s.service || s;
                                        const isSelected = formData.selectedServices.some(ss => ss.service_id === (s.service_id || s.id));
                                        return (
                                            <div 
                                                key={i} 
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setFormData({...formData, selectedServices: formData.selectedServices.filter(ss => ss.service_id !== (s.service_id || s.id))});
                                                    } else {
                                                        setFormData({...formData, selectedServices: [...formData.selectedServices, {
                                                            service_id: s.service_id || s.id,
                                                            price: s.price,
                                                            duration_minutes: s.duration_minutes || s.duration,
                                                            service: serviceItem
                                                        }]});
                                                    }
                                                }}
                                                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between group ${isSelected ? 'bg-neutral-900 border-neutral-900 text-white shadow-xl shadow-neutral-900/10' : 'bg-white border-neutral-100 hover:border-neutral-300 hover:shadow-md'}`}
                                            >
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold">{serviceItem.name}</span>
                                                    <span className={`text-[10px] uppercase font-black tracking-wider mt-1 ${isSelected ? 'text-white/60' : 'text-neutral-400'}`}>{s.duration_minutes || s.duration} мин</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-sm font-black">{s.price} BYN</span>
                                                    {isSelected ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5 text-neutral-200 group-hover:text-neutral-900" />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                // Autocomplete results
                                filteredServices.map((s, i) => (
                                    <div 
                                        key={i} 
                                        onClick={() => { 
                                            setFormData({...formData, selectedServices: [...formData.selectedServices, s]}); 
                                            setSearchService(''); 
                                        }} 
                                        className="p-4 bg-white rounded-2xl border border-neutral-100 hover:border-neutral-900 cursor-pointer flex justify-between items-center transition-all hover:shadow-md"
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-neutral-800">{s.service?.name}</span>
                                            <span className="text-[10px] text-neutral-400 font-black uppercase tracking-wider mt-1">{s.duration_minutes} мин</span>
                                        </div>
                                        <span className="text-sm font-black text-neutral-900">{s.price} BYN</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Column 3: Payments & Summary */}
                    <div className="p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar bg-neutral-50/60">
                        <div className="bg-white rounded-[2rem] border border-neutral-100 p-6 shadow-sm flex flex-col gap-4">
                            <h3 className="text-lg font-black tracking-tight">Расчет</h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-neutral-400">
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Итого</span>
                                    <span className="text-base font-black text-neutral-900">{formData.totalPrice} BYN</span>
                                </div>
                                <div className="flex items-center justify-between text-neutral-400">
                                    <span className="text-[10px] font-bold uppercase tracking-widest">Оплачено</span>
                                    <span className="text-base font-black text-neutral-900">{totalPaid} BYN</span>
                                </div>
                                <div className="h-px bg-neutral-100" />
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-900">К оплате</span>
                                    <span className={`text-xl font-black ${remainingToPay > 0 ? 'text-neutral-900' : 'text-neutral-300'}`}>{remainingToPay} BYN</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-[2rem] border border-neutral-100 p-6 shadow-sm flex flex-col gap-4">
                            <h3 className="text-base font-black tracking-tight">Метод оплаты</h3>
                            <div className="grid grid-cols-1 gap-2">
                                {['cash', 'card', 'qr'].map(method => (
                                    <Button 
                                        key={method} 
                                        variant="outline" 
                                        onClick={() => { 
                                            if (remainingToPay > 0) setFormData({...formData, payments: [...formData.payments, {method, amount: remainingToPay}]}); 
                                        }} 
                                        className="h-12 rounded-xl border-neutral-100 font-bold gap-3 hover:bg-neutral-50 hover:border-neutral-200 transition-all justify-start px-4"
                                    >
                                        <div className="p-1.5 bg-neutral-50 rounded-lg group-hover:bg-white transition-colors">
                                            {method === 'cash' ? <Banknote className="h-4 w-4 text-neutral-600" /> : method === 'card' ? <CreditCard className="h-4 w-4 text-neutral-600" /> : <Smartphone className="h-4 w-4 text-neutral-600" />}
                                        </div>
                                        <span className="text-xs text-neutral-600">{method === 'cash' ? 'Наличные' : method === 'card' ? 'Банковская карта' : 'QR-код / Оплати'}</span>
                                    </Button>
                                ))}
                            </div>
                            
                            <div className="space-y-2 mt-2">
                                {formData.payments.map((p, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-neutral-100 animate-in zoom-in-95 duration-200">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-neutral-900 shadow-[0_0_8px_rgba(0,0,0,0.1)]" />
                                            <span className="text-[10px] font-black uppercase text-neutral-900 tracking-wider font-mono">
                                                {p.method === 'cash' ? 'CASH' : p.method === 'card' ? 'CARD' : 'QR'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Input 
                                                type="number" 
                                                value={p.amount} 
                                                onChange={e => {
                                                    const newPayments = [...formData.payments];
                                                    newPayments[i].amount = parseFloat(e.target.value) || 0;
                                                    setFormData({...formData, payments: newPayments});
                                                }} 
                                                className="h-8 w-24 text-right font-black border-none bg-neutral-100 rounded-lg text-neutral-900 focus:ring-1 focus:ring-neutral-200" 
                                            />
                                            <button onClick={() => setFormData({...formData, payments: formData.payments.filter((_, idx) => idx !== i)})} className="text-neutral-300 hover:text-red-500 transition-colors">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="h-20 border-t border-neutral-100 bg-white flex items-center justify-between px-8 shrink-0">
                    <div className="flex items-center gap-2 text-neutral-400">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Создано администратором</span>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={onClose} className="rounded-2xl font-bold">Отмена</Button>
                        <Button 
                            onClick={handleSave} 
                            disabled={isSaving}
                            className="h-12 px-8 bg-neutral-900 hover:bg-black text-white rounded-xl font-bold text-sm shadow-xl shadow-black/10 hover:scale-[1.02] transition-transform"
                        >
                            {isSaving ? 'Сохранение...' : (mode === 'create' ? 'Создать запись' : 'Сохранить изменения')}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
