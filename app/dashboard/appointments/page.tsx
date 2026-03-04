'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { DateTime } from 'luxon';
import { useBranch } from '@/context/branch-context';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { BookingEditor } from '@/components/appointments/BookingEditor';
import { useWebSocket } from '@/hooks/use-web-socket';

const TIME_SLOTS_START = 8;
const TIME_SLOTS_END = 22;
const SLOT_DURATION_MIN = 15;

export default function AppointmentsPage() {
    const { selectedBranchID, branches } = useBranch();
    const [currentDate, setCurrentDate] = useState(DateTime.now());
    const queryClient = useQueryClient();

    // WebSocket connection for real-time updates
    useWebSocket('ws://localhost:8080/ws', {
        onMessage: (event) => {
            try {
                // The message is double-stringified, once by the publisher and once by the consumer forwarding it.
                const outerData = JSON.parse(event.data);
                const message = JSON.parse(outerData);

                if (message.action === 'created' || message.action === 'updated' || message.action === 'status_updated') {
                    console.log('Real-time update received:', message);
                    toast.info('Журнал записей обновлен в реальном времени.');
                    // Invalidate queries to refetch data
                    queryClient.invalidateQueries({ queryKey: ['appointments'] });
                    queryClient.invalidateQueries({ queryKey: ['shifts'] }); // Also refetch shifts in case of new bookings
                }
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        },
    });

    // Modal State
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
    const [selectedSlot, setSelectedSlot] = useState<{ empID: number; time: DateTime } | null>(null);
    const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

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

    const { data: categories } = useQuery({
        queryKey: ['categories', selectedBranchID],
        queryFn: async () => {
            const res = await api.get(`/branches/${selectedBranchID}/categories`);
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
    });

    const updateBookingMutation = useMutation({
        mutationFn: ({ id, data }: { id: number, data: any }) => api.put(`/bookings/${id}`, data),
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: number, status: string }) => api.patch(`/appointments/${id}`, { status }),
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
        const slotTime = currentDate.set({ 
            hour: time.hour, 
            minute: time.minute, 
            second: 0, 
            millisecond: 0 
        });
        setSelectedSlot({ empID, time: slotTime });
        setEditorMode('create');
        setIsEditorOpen(true);
    };

    const handleSaveBooking = async (editorData: any) => {
        try {
            const [firstName, ...lastNameParts] = editorData.clientName.split(' ');
            const lastName = lastNameParts.join(' ');

            const clientRes = await createCustomerMutation.mutateAsync({
                company_id: company.id,
                branch_id: Number(selectedBranchID),
                first_name: firstName,
                last_name: lastName,
                phone: editorData.clientPhone,
                email: editorData.clientEmail,
            });

            const dateStr = editorData.bookingDate.toFormat('yyyy-MM-dd');

            const startISO = `${dateStr}T${editorData.startTime}:00`;
            const endISO = `${dateStr}T${editorData.endTime}:00`;

            const servicesData = editorData.selectedServices.map((s: any) => ({
                service_id: s.service_id || s.id,
                price: s.price,
                duration_minutes: s.duration_minutes || s.duration
            }));

            if (editorMode === 'create' && selectedSlot) {
                await createBookingMutation.mutateAsync({
                    employee_id: selectedSlot.empID,
                    client_id: clientRes.data.id,
                    start_time: startISO,
                    end_time: endISO,
                    comment: editorData.comment,
                    total_price: editorData.totalPrice,
                    services: servicesData,
                    payments: editorData.payments?.map((p: any) => ({
                        amount: Number(p.amount),
                        method: p.method
                    })) || []
                });
                toast.success('Запись создана');
            } else if (editorMode === 'edit' && selectedAppointment) {
                await updateBookingMutation.mutateAsync({
                    id: selectedAppointment.id,
                    data: {
                        employee_id: selectedAppointment.employee_id,
                        client_id: clientRes.data.id,
                        start_time: startISO,
                        end_time: endISO,
                        comment: editorData.comment,
                        total_price: editorData.totalPrice,
                        services: servicesData,
                        payments: editorData.payments.map((p: any) => ({
                            amount: Number(p.amount),
                            method: p.method
                        }))
                    }
                });

                if (editorData.status !== selectedAppointment.status) {
                    await updateStatusMutation.mutateAsync({ id: selectedAppointment.id, status: editorData.status });
                }
                toast.success('Запись обновлена');
            }

            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            setIsEditorOpen(false);

        } catch (error: any) {
            console.error(error);
            toast.error('Ошибка сохранения записи: ' + (error.response?.data?.error || error.message));
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
                                                    setEditorMode('edit');
                                                    setIsEditorOpen(true);
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

            <BookingEditor
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                mode={editorMode}
                company={company}
                branchId={Number(selectedBranchID)}
                selectedSlot={selectedSlot}
                selectedAppointment={selectedAppointment}
                employees={employees || []}
                allServices={allServices || []}
                employeeServices={employeeServices || []}
                categories={categories || []}
                customers={customers || []}
                appointments={appointments || []}
                onSave={handleSaveBooking}
                isSaving={createBookingMutation.isPending || updateBookingMutation.isPending || createCustomerMutation.isPending}
            />

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