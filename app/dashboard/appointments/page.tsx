'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { DateTime } from 'luxon';
import { useBranch } from '@/context/branch-context';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TIME_SLOTS_START = 8;
const TIME_SLOTS_END = 22;
const SLOT_DURATION_MIN = 15;

export default function AppointmentsPage() {
    const { selectedBranchID, branches } = useBranch();
    const [currentDate, setCurrentDate] = useState(DateTime.now());
    const queryClient = useQueryClient();

    // Modal State
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{ empID: number; time: DateTime } | null>(null);
    const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
    const [formData, setFormData] = useState({
        selectedServices: [] as any[], // Array of service objects from employeeServices
        startTime: '',
        endTime: '',
        clientName: '',
        clientPhone: '',
        comment: '',
        status: 'pending',
        totalPrice: 0,
    });

    // Search customer by phone
    const { data: foundCustomer } = useQuery({
        queryKey: ['customer-search', formData.clientPhone, selectedBranchID],
        queryFn: async () => {
            if (formData.clientPhone.length < 5) return null;
            try {
                const res = await api.get('/customers/by-phone', {
                    params: { branch_id: selectedBranchID, phone: formData.clientPhone }
                });
                return res.data;
            } catch (e) {
                return null;
            }
        },
        enabled: formData.clientPhone.length >= 5 && !!selectedBranchID,
    });

    // Auto-fill name if customer found (only if name is empty)
    useEffect(() => {
        if (foundCustomer && !formData.clientName) {
            setFormData(prev => ({
                ...prev,
                clientName: `${foundCustomer.first_name} ${foundCustomer.last_name}`.trim(),
            }));
        }
    }, [foundCustomer, formData.clientName]);

    // Recalculate duration and price
    useEffect(() => {
        let totalDuration = 0;
        let totalPrice = 0;
        formData.selectedServices.forEach(s => {
            totalDuration += s.duration_minutes || s.duration || 0;
            totalPrice += s.price || 0;
        });

        if (formData.startTime) {
            const start = DateTime.fromFormat(formData.startTime, 'HH:mm');
            const end = start.plus({ minutes: totalDuration || 60 });
            setFormData(prev => ({ 
                ...prev, 
                endTime: end.toFormat('HH:mm'),
                totalPrice: totalPrice 
            }));
        }
    }, [formData.selectedServices, formData.startTime]);

    // Fetch data...
    const { data: company } = useQuery({
        queryKey: ['my-company'],
        queryFn: async () => {
            const res = await api.get('/companies');
            return res.data[0] || null;
        },
    });

    const { data: employees } = useQuery({
        queryKey: ['employees', selectedBranchID],
        queryFn: async () => {
            if (!company?.id) return [];
            const res = await api.get(`/employees?company_id=${company.id}`);
            return res.data.filter((e: any) => e.branch_id.toString() === selectedBranchID);
        },
        enabled: !!selectedBranchID && !!company?.id,
    });

    const { data: shifts } = useQuery({
        queryKey: ['shifts', selectedBranchID, currentDate.toISODate()],
        queryFn: async () => {
            const res = await api.get('/shifts', {
                params: {
                    branch_id: selectedBranchID,
                    month: currentDate.toISODate()
                }
            });
            return res.data;
        },
        enabled: !!selectedBranchID,
    });

    const { data: allServices } = useQuery({
        queryKey: ['all-services', selectedBranchID],
        queryFn: async () => {
            const res = await api.get(`/branches/${selectedBranchID}/services`);
            return res.data;
        },
        enabled: !!selectedBranchID,
    });

    const { data: employeeServices } = useQuery({
        queryKey: ['employee-services', selectedSlot?.empID],
        queryFn: async () => {
            if (!selectedSlot?.empID) return [];
            const res = await api.get(`/employees/${selectedSlot.empID}/services`);
            return res.data;
        },
        enabled: !!selectedSlot?.empID,
    });

    const { data: customers } = useQuery({
        queryKey: ['customers', selectedBranchID],
        queryFn: async () => {
            const res = await api.get('/customers', {
                params: { branch_id: selectedBranchID }
            });
            return res.data || [];
        },
        enabled: !!selectedBranchID,
    });

    const serviceMap = useMemo(() => {
        const map: Record<number, string> = {};
        allServices?.forEach((s: any) => { map[s.id] = s.name; });
        return map;
    }, [allServices]);

    const customerMap = useMemo(() => {
        const map: Record<number, any> = {};
        customers?.forEach((c: any) => { map[c.id] = c; });
        return map;
    }, [customers]);

    const visibleEmployees = useMemo(() => {
        if (!employees || !shifts) return [];
        return employees.filter((emp: any) => {
            // Only show employees visible in booking
            if (emp.visible_in_booking === false) return false;

            const shift = shifts.find((s: any) =>
                s.employee_id === emp.id &&
                DateTime.fromISO(s.date).hasSame(currentDate, 'day')
            );
            return shift && (shift.shift_type === 'work' || (!shift.shift_type && !shift.is_day_off));
        });
    }, [employees, shifts, currentDate]);

    const { data: appointments } = useQuery({
        queryKey: ['appointments', selectedBranchID, currentDate.toISODate(), visibleEmployees?.length],
        queryFn: async () => {
            if (!visibleEmployees || visibleEmployees.length === 0) return [];
            const employeeIds = visibleEmployees.map((e: any) => e.id).join(',');
            const res = await api.get('/appointments', {
                params: {
                    employee_ids: employeeIds,
                    date: currentDate.toISODate() // Просто строка YYYY-MM-DD
                }
            });
            return res.data;
        },
        enabled: !!selectedBranchID && visibleEmployees && visibleEmployees.length > 0,
    });

    const createCustomerMutation = useMutation({
        mutationFn: (data: any) => api.post('/customers', data),
    });

    const createBookingMutation = useMutation({
        mutationFn: (data: any) => api.post('/bookings', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            toast.success('Запись создана');
            setIsBookingModalOpen(false);
            setFormData({ serviceId: '', startTime: '', endTime: '', clientName: '', clientPhone: '', comment: '', status: 'pending' });
        },
        onError: (error: any) => {
            toast.error('Ошибка создания записи: ' + (error.response?.data?.error || error.message));
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: number, status: string }) => api.patch(`/appointments/${id}`, { status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            toast.success('Статус обновлен');
            setIsEditModalOpen(false);
        },
        onError: (error: any) => {
            toast.error('Ошибка обновления: ' + (error.response?.data?.error || error.message));
        }
    });

    const timeSlots = useMemo(() => {
        const slots = [];
        for (let h = TIME_SLOTS_START; h < TIME_SLOTS_END; h++) {
            for (let m = 0; m < 60; m += SLOT_DURATION_MIN) {
                slots.push(DateTime.fromObject({ hour: h, minute: m }));
            }
        }
        return slots;
    }, []);

    const handleDateChange = (days: number) => {
        setCurrentDate(currentDate.plus({ days }));
    };

    // ИЗМЕНЕНО: Парсим время напрямую из строки без учета timezone
    const getAppointmentStyle = (start: string, end: string) => {
        // start: "2026-01-30T12:05:00Z" или "2026-01-30T12:05:00"
        const startHour = parseInt(start.slice(11, 13));
        const startMinute = parseInt(start.slice(14, 16));
        const endHour = parseInt(end.slice(11, 13));
        const endMinute = parseInt(end.slice(14, 16));

        const startMinutes = (startHour - TIME_SLOTS_START) * 60 + startMinute;
        const durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
        
        const PIXELS_PER_MINUTE = 2;

        return {
            top: `${startMinutes * PIXELS_PER_MINUTE}px`,
            height: `${durationMinutes * PIXELS_PER_MINUTE}px`,
        };
    };

    const isWorkingTime = (empID: number, time: DateTime) => {
        if (!shifts) return false;
        const shift = shifts.find((s: any) =>
            s.employee_id === empID &&
            DateTime.fromISO(s.date).hasSame(currentDate, 'day')
        );

        if (!shift || (shift.shift_type && shift.shift_type !== 'work') || (!shift.shift_type && shift.is_day_off)) return false;

        const shiftStart = DateTime.fromFormat(shift.start_time, 'HH:mm');
        const shiftEnd = DateTime.fromFormat(shift.end_time, 'HH:mm');

        const timeOfDay = time.hour * 60 + time.minute;
        const startOfDay = shiftStart.hour * 60 + shiftStart.minute;
        const endOfDay = shiftEnd.hour * 60 + shiftEnd.minute;

        return timeOfDay >= startOfDay && timeOfDay < endOfDay;
    };

    const handleSlotClick = (empID: number, time: DateTime) => {
        setSelectedSlot({ empID, time });
        setFormData({
            ...formData,
            startTime: time.toFormat('HH:mm'),
            endTime: time.plus({ minutes: 60 }).toFormat('HH:mm'),
        });
        setIsBookingModalOpen(true);
    };

    const handleCreateBooking = async () => {
        if (!selectedSlot || formData.selectedServices.length === 0 || !company?.id) {
            toast.error('Выберите хотя бы одну услугу');
            return;
        }

        try {
            // 1. Create or Update Client
            const [firstName, ...lastNameParts] = formData.clientName.split(' ');
            const lastName = lastNameParts.join(' ');

            const clientRes = await createCustomerMutation.mutateAsync({
                company_id: company.id,
                branch_id: Number(selectedBranchID),
                first_name: firstName,
                last_name: lastName,
                phone: formData.clientPhone,
            });

            // 2. Create Booking
            const dateStr = currentDate.toFormat('yyyy-MM-dd');
            const startISO = `${dateStr}T${formData.startTime}:00`;
            const endISO = `${dateStr}T${formData.endTime}:00`;

            await createBookingMutation.mutateAsync({
                employee_id: selectedSlot.empID,
                client_id: clientRes.data.id,
                start_time: startISO,
                end_time: endISO,
                comment: formData.comment,
                total_price: formData.totalPrice,
                services: formData.selectedServices.map(s => ({
                    service_id: s.service_id,
                    price: s.price,
                    duration_minutes: s.duration_minutes
                }))
            });

            setFormData({ 
                selectedServices: [], 
                startTime: '', 
                endTime: '', 
                clientName: '', 
                clientPhone: '', 
                comment: '', 
                status: 'pending',
                totalPrice: 0 
            });

        } catch (e) {
            console.error(e);
        }
    };

    // Вспомогательная функция для отображения времени без timezone
    const formatTimeRaw = (isoString: string) => {
        // isoString: "2026-01-30T09:05:00Z" или "2026-01-30T12:05:00"
        return isoString.slice(11, 16);
    };

    return (
        <div className="h-[calc(100vh-2rem)] flex flex-col space-y-4 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-neutral-200 shadow-sm shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                        Журнал записи
                    </h1>
                    <div className="flex items-center bg-neutral-100 rounded-lg p-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500 hover:text-neutral-900" onClick={() => handleDateChange(-1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="px-4 font-bold text-neutral-900 w-[180px] text-center flex items-center justify-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-neutral-400" />
                            {currentDate.setLocale('ru').toFormat('d MMMM, EEE')}
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500 hover:text-neutral-900" onClick={() => handleDateChange(1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setCurrentDate(DateTime.now())}>
                        Сегодня
                    </Button>
                </div>

                <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="bg-orange-50 text-orange-700 hover:bg-orange-100">
                        {branches?.find((b: any) => b.id.toString() === selectedBranchID)?.name}
                    </Badge>
                </div>
            </div>

            {/* Board */}
            <div className="flex-1 bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden flex flex-col relative">
                {/* Header Row (Employees) */}
                <div className="flex border-b border-neutral-200 bg-neutral-50/80 backdrop-blur-sm z-20 overflow-hidden sticky top-0" style={{ paddingLeft: '60px' }}>
                    {visibleEmployees.length === 0 && (
                        <div className="p-4 text-neutral-400 text-sm italic w-full text-center">
                            Нет мастеров на смене в этот день
                        </div>
                    )}
                    {visibleEmployees.map((emp: any) => (
                        <div key={emp.id} className="flex-1 min-w-[150px] p-3 border-r border-neutral-200 flex items-center gap-3 justify-center">
                            <Avatar className="h-8 w-8 border border-white shadow-sm">
                                <AvatarImage src={emp.avatar_thumbnail_url || emp.avatar_url} />
                                <AvatarFallback className="text-[10px] bg-neutral-200">{emp.name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-neutral-900 leading-none">{emp.name}</span>
                                <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">{emp.position}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-auto relative bg-white">
                    <div className="flex relative" style={{ height: `${timeSlots.length * 30}px`, minWidth: '100%' }}>
                        {/* Time Column */}
                        <div className="sticky left-0 z-10 w-[60px] bg-white border-r border-neutral-200 flex flex-col text-[10px] font-bold text-neutral-400">
                            {timeSlots.filter((_, i) => i % 4 === 0).map((time, i) => (
                                <div key={i} className="absolute w-full text-center border-b border-neutral-100/50" style={{ top: `${i * 4 * 30}px`, height: '120px' }}>
                                    <span className="-translate-y-1/2 block bg-white pt-1">{time.toFormat('HH:mm')}</span>
                                </div>
                            ))}
                        </div>

                        {/* Columns per Employee */}
                        {visibleEmployees.map((emp: any) => (
                            <div key={emp.id} className="flex-1 min-w-[150px] border-r border-neutral-100 relative group">
                                {timeSlots.map((time, i) => {
                                    const working = isWorkingTime(emp.id, time);
                                    return (
                                        <div
                                            key={i}
                                            className={`h-[30px] border-b border-neutral-50 transition-colors ${!working ? 'bg-neutral-100/50 diagonal-stripes' : 'hover:bg-blue-50/30 cursor-pointer'}`}
                                            onClick={() => working && handleSlotClick(emp.id, time)}
                                        />
                                    )
                                })}

                                {appointments
                                    ?.filter((app: any) => app.employee_id === emp.id && app.status !== 'cancelled')
                                    .map((app: any) => {
                                        const customer = customerMap[app.client_id];
                                        
                                        // Get service names from the services array
                                        const serviceNames = app.services?.map((s: any) => 
                                            s.service?.name || serviceMap[s.service_id]
                                        ).filter(Boolean).join(', ') || 'Нет услуг';

                                        return (
                                            <div
                                                key={app.id}
                                                className="absolute left-1 right-1 rounded-md p-2 text-xs shadow-sm border overflow-hidden cursor-pointer hover:scale-[1.02] hover:z-10 transition-all"
                                                style={{
                                                    ...getAppointmentStyle(app.start_time, app.end_time),
                                                    backgroundColor: app.status === 'arrived' ? 'rgba(219, 234, 254, 0.9)' :
                                                                     app.status === 'no_show' ? 'rgba(254, 226, 226, 0.9)' :
                                                                     app.status === 'pending' ? 'rgba(254, 243, 199, 0.9)' :
                                                                     'rgba(236, 253, 245, 0.9)',
                                                    borderColor: app.status === 'arrived' ? 'rgba(96, 165, 250, 0.4)' :
                                                                 app.status === 'no_show' ? 'rgba(248, 113, 113, 0.4)' :
                                                                 app.status === 'pending' ? 'rgba(251, 191, 36, 0.4)' :
                                                                 'rgba(52, 211, 153, 0.4)',
                                                    color: app.status === 'arrived' ? '#1e40af' :
                                                           app.status === 'no_show' ? '#991b1b' :
                                                           app.status === 'pending' ? '#92400e' :
                                                           '#065f46'
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedAppointment(app);
                                                    const customer = customerMap[app.client_id];
                                                    setFormData({
                                                        ...formData,
                                                        status: app.status,
                                                        comment: app.comment || '',
                                                        clientName: app.client_phone !== 'ANONYMOUS' ? (app.client_first_name ? `${app.client_first_name} ${app.client_last_name}`.trim() : (customer ? `${customer.first_name} ${customer.last_name}`.trim() : '')) : 'Клиент',
                                                        clientPhone: app.client_phone !== 'ANONYMOUS' ? (app.client_phone || customer?.phone || '') : '',
                                                        startTime: formatTimeRaw(app.start_time),
                                                        endTime: formatTimeRaw(app.end_time),
                                                        selectedServices: app.services || [],
                                                        totalPrice: app.total_price || 0
                                                    });
                                                    setIsEditModalOpen(true);
                                                }}
                                            >
                                                {/* ИЗМЕНЕНО: выводим время без конвертации timezone */}
                                                <div className="font-bold flex items-center gap-1">
                                                    {formatTimeRaw(app.start_time)}
                                                    <span className="font-normal opacity-70">- {formatTimeRaw(app.end_time)}</span>
                                                </div>
                                                <div className="font-semibold truncate mt-0.5">
                                                    {app.client_phone !== 'ANONYMOUS' ? `${app.client_first_name} ${app.client_last_name}` : `Клиент`}
                                                </div>
                                                <div className="text-[10px] opacity-80 truncate">
                                                    {serviceNames}
                                                </div>
                                            </div>
                                        )
                                    })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Create Booking Modal */}
            <Dialog open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Новая запись</DialogTitle>
                        <DialogDescription>
                            Заполните данные для создания записи.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="service" className="text-right mt-2">Услуги</Label>
                            <div className="col-span-3 space-y-2">
                                <Select
                                    onValueChange={(val) => {
                                        const es = employeeServices?.find((s: any) => s.service_id.toString() === val);
                                        if (es && !formData.selectedServices.find(s => s.service_id.toString() === val)) {
                                            setFormData(prev => ({ 
                                                ...prev, 
                                                selectedServices: [...prev.selectedServices, es] 
                                            }));
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Добавить услугу" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {employeeServices?.map((es: any) => (
                                            <SelectItem key={es.service_id} value={es.service_id.toString()}>
                                                {es.service.name} ({es.duration_minutes} мин) - {es.price} BYN
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <div className="flex flex-wrap gap-2">
                                    {formData.selectedServices.map(s => (
                                        <Badge key={s.service_id} variant="secondary" className="gap-1 pr-1 py-1">
                                            {s.service?.name || serviceMap[s.service_id] || 'Услуга'}
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-4 w-4 rounded-full" 
                                                onClick={() => setFormData(prev => ({
                                                    ...prev,
                                                    selectedServices: prev.selectedServices.filter(item => item.service_id !== s.service_id)
                                                }))}
                                            >
                                                <span className="text-[10px]">×</span>
                                            </Button>
                                        </Badge>
                                    ))}
                                </div>
                                {formData.totalPrice > 0 && (
                                    <div className="text-xs font-bold text-neutral-500">
                                        Итого: {formData.totalPrice} BYN
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="time" className="text-right">Время</Label>
                            <div className="col-span-3 flex items-center gap-2">
                                <Input
                                    type="time"
                                    value={formData.startTime}
                                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                />
                                <span>-</span>
                                <Input
                                    type="time"
                                    value={formData.endTime}
                                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Имя</Label>
                            <Input
                                id="name"
                                value={formData.clientName}
                                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                placeholder="Иван Иванов"
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="phone" className="text-right">Телефон</Label>
                            <Input
                                id="phone"
                                value={formData.clientPhone}
                                onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                                placeholder="+375..."
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="comment" className="text-right">Комментарий</Label>
                            <Input
                                id="comment"
                                value={formData.comment}
                                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                                placeholder="Комментарий к записи"
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBookingModalOpen(false)}>Отмена</Button>
                        <Button
                            onClick={handleCreateBooking}
                            disabled={createCustomerMutation.isPending || createBookingMutation.isPending || formData.selectedServices.length === 0}
                        >
                            {(createCustomerMutation.isPending || createBookingMutation.isPending) ? 'Создание...' : 'Создать запись'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Booking Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Редактирование записи</DialogTitle>
                        <DialogDescription>
                            Изменение статуса и деталей записи.
                        </DialogDescription>
                    </DialogHeader>
                     {selectedAppointment && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Имя</Label>
                                <Input
                                    value={formData.clientName}
                                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Телефон</Label>
                                <Input
                                    value={formData.clientPhone}
                                    onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                                    className="col-span-3"
                                />
                            </div>

                            <div className="grid grid-cols-4 items-start gap-4">
                                <Label className="text-right mt-2">Услуги</Label>
                                <div className="col-span-3 space-y-2">
                                    <Select
                                        onValueChange={(val) => {
                                            const es = allServices?.find((s: any) => s.id.toString() === val);
                                            if (es && !formData.selectedServices.find(s => s.service_id?.toString() === val || s.id?.toString() === val)) {
                                                // Convert to AppointmentService format
                                                const newS = {
                                                    service_id: es.id,
                                                    price: es.price,
                                                    duration_minutes: es.duration_minutes,
                                                    service: es // for display
                                                };
                                                setFormData(prev => ({ 
                                                    ...prev, 
                                                    selectedServices: [...prev.selectedServices, newS] 
                                                }));
                                            }
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Добавить услугу" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {allServices?.map((s: any) => (
                                                <SelectItem key={s.id} value={s.id.toString()}>
                                                    {s.name} ({s.duration_minutes} мин) - {s.price} BYN
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.selectedServices.map((s, idx) => (
                                            <Badge key={idx} variant="secondary" className="gap-1 pr-1 py-1">
                                                {s.service?.name || serviceMap[s.service_id]}
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-4 w-4 rounded-full" 
                                                    onClick={() => setFormData(prev => ({
                                                        ...prev,
                                                        selectedServices: prev.selectedServices.filter((_, i) => i !== idx)
                                                    }))}
                                                >
                                                    <span className="text-[10px]">×</span>
                                                </Button>
                                            </Badge>
                                        ))}
                                    </div>
                                    <div className="text-xs font-bold text-neutral-500">
                                        Итого: {formData.totalPrice} BYN
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Время</Label>
                                <div className="col-span-3 flex items-center gap-2">
                                    <Input
                                        type="time"
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                    />
                                    <span>-</span>
                                    <Input
                                        type="time"
                                        value={formData.endTime}
                                        readOnly
                                        className="bg-neutral-50"
                                    />
                                </div>
                            </div>

                             <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Статус</Label>
                                <div className="col-span-3">
                                    <Select
                                        value={formData.status}
                                        onValueChange={(val) => setFormData({ ...formData, status: val })}
                                    >
                                        <SelectTrigger suppressHydrationWarning>
                                            <SelectValue placeholder="Статус" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending">Ожидание</SelectItem>
                                            <SelectItem value="confirmed">Подтверждено</SelectItem>
                                            <SelectItem value="arrived">Пришел</SelectItem>
                                            <SelectItem value="no_show">Не пришел</SelectItem>
                                            <SelectItem value="cancelled">Отменено</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                     )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Закрыть</Button>
                        <Button 
                            onClick={async () => {
                                // 1. Update Customer info first
                                const [firstName, ...lastNameParts] = formData.clientName.split(' ');
                                const lastName = lastNameParts.join(' ');
                                await createCustomerMutation.mutateAsync({
                                    company_id: company.id,
                                    branch_id: Number(selectedBranchID),
                                    first_name: firstName,
                                    last_name: lastName,
                                    phone: formData.clientPhone,
                                });

                                // 2. Update Appointment
                                const dateStr = selectedAppointment.start_time.slice(0, 10); // "YYYY-MM-DD"
                                const startISO = `${dateStr}T${formData.startTime}:00`;
                                const endISO = `${dateStr}T${formData.endTime}:00`;

                                await api.put(`/bookings/${selectedAppointment.id}`, {
                                    employee_id: selectedAppointment.employee_id,
                                    client_id: selectedAppointment.client_id,
                                    start_time: startISO,
                                    end_time: endISO,
                                    comment: formData.comment,
                                    total_price: formData.totalPrice,
                                    services: formData.selectedServices.map(s => ({
                                        service_id: s.service_id || s.id,
                                        price: s.price,
                                        duration_minutes: s.duration_minutes || s.duration
                                    }))
                                });

                                // 3. Update status if changed
                                if (formData.status !== selectedAppointment.status) {
                                    await updateStatusMutation.mutateAsync({ id: selectedAppointment.id, status: formData.status });
                                }

                                queryClient.invalidateQueries({ queryKey: ['appointments'] });
                                setIsEditModalOpen(false);
                                toast.success('Запись обновлена');
                            }}
                            disabled={updateStatusMutation.isPending}
                        >
                            {updateStatusMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <style jsx global>{`
                .diagonal-stripes {
                    background-image: repeating-linear-gradient(
                        45deg,
                        transparent,
                        transparent 10px,
                        rgba(0,0,0,0.03) 10px,
                        rgba(0,0,0,0.03) 20px
                    );
                }
            `}</style>
        </div>
    );
}