'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, RefreshCw, MessageSquare, Globe, User, Sparkles } from 'lucide-react';
import { DateTime } from 'luxon';
import { useBranch } from '@/context/branch-context';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { BookingEditor } from '@/components/appointments/BookingEditor';
import { useWebSocket } from '@/hooks/use-web-socket';
import { cn } from '@/lib/utils';

const HOUR_HEIGHT = 80;

export default function AppointmentsPage() {
    const { selectedBranchID, branches } = useBranch();
    const currentBranch = branches.find(b => b.id.toString() === selectedBranchID);
    const timezone = (currentBranch as any)?.timezone || 'UTC';

    const [currentDate, setCurrentDate] = useState(DateTime.now().setZone(timezone));
    const queryClient = useQueryClient();

    useEffect(() => {
        setCurrentDate(prev => prev.setZone(timezone));
    }, [timezone]);

    const [now, setNow] = useState(DateTime.now().setZone(timezone));
    useEffect(() => {
        const timer = setInterval(() => setNow(DateTime.now().setZone(timezone)), 30000);
        setNow(DateTime.now().setZone(timezone)); 
        return () => clearInterval(timer);
    }, [timezone]);

    useWebSocket('ws://localhost:8080/ws', {
        onMessage: (event) => {
            try {
                const data = JSON.parse(JSON.parse(event.data));
                if (['created', 'updated', 'status_updated'].includes(data.action)) {
                    queryClient.invalidateQueries({ queryKey: ['appointments'] });
                }
            } catch (e) {}
        },
    });

    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
    const [selectedSlot, setSelectedSlot] = useState<{ empID: number; time: DateTime } | null>(null);
    const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

    const { data: company } = useQuery({
        queryKey: ['my-company'],
        queryFn: async () => (await api.get('/companies')).data[0],
    });

    const { data: employees = [] } = useQuery({
        queryKey: ['employees', selectedBranchID],
        queryFn: async () => (await api.get(`/employees?company_id=${company.id}`)).data.filter((e: any) => e.branch_id.toString() === selectedBranchID),
        enabled: !!selectedBranchID && !!company?.id,
    });

    const { data: appointments = [] } = useQuery({
        queryKey: ['appointments', selectedBranchID, currentDate.toISODate(), timezone],
        queryFn: async () => (await api.get('/appointments', { 
            params: { 
                branch_id: selectedBranchID, 
                date: currentDate.toISODate(),
                timezone: timezone
            } 
        })).data || [],
        enabled: !!selectedBranchID,
    });

    const { data: shifts = [] } = useQuery({
        queryKey: ['shifts', selectedBranchID, currentDate.toISODate()],
        queryFn: async () => (await api.get('/shifts', { params: { branch_id: selectedBranchID, month: currentDate.toISODate() } })).data || [],
        enabled: !!selectedBranchID,
    });

    const { data: allServices = [] } = useQuery({
        queryKey: ['all-services', selectedBranchID],
        queryFn: async () => (await api.get(`/branches/${selectedBranchID}/services`)).data,
        enabled: !!selectedBranchID,
    });

    const { data: categories = [] } = useQuery({
        queryKey: ['categories', selectedBranchID],
        queryFn: async () => (await api.get(`/branches/${selectedBranchID}/categories`)).data,
        enabled: !!selectedBranchID,
    });

    const { data: customers = [] } = useQuery({
        queryKey: ['customers', selectedBranchID],
        queryFn: async () => (await api.get('/customers', { params: { branch_id: selectedBranchID } })).data || [],
        enabled: !!selectedBranchID,
    });

    const { data: employeeServices = [] } = useQuery({
        queryKey: ['employee-services', selectedSlot?.empID],
        queryFn: async () => (await api.get(`/employees/${selectedSlot?.empID}/services`)).data,
        enabled: !!selectedSlot?.empID,
    });

    const serviceMap = useMemo(() => {
        const map: Record<number, string> = {};
        allServices.forEach((s: any) => { map[s.id] = s.name; });
        return map;
    }, [allServices]);

    // 1. Dynamic Time Range Calculation
    const timeRange = useMemo(() => {
        let minStart = 24;
        let maxEnd = 0;

        // 1. Check Branch Schedule for the current day
        if (currentBranch && (currentBranch as any).schedule) {
            const dayOfWeek = currentDate.weekday % 7; // Luxon: 1=Mon...7=Sun. DB: 0=Sun...6=Sat
            const branchDay = (currentBranch as any).schedule.find((s: any) => s.day_of_week === dayOfWeek);
            
            if (branchDay && !branchDay.is_day_off) {
                const [sH] = branchDay.start_time.split(':').map(Number);
                const [eH, eM] = branchDay.end_time.split(':').map(Number);
                if (sH < minStart) minStart = sH;
                const finalEH = eM > 0 ? eH + 1 : eH;
                if (finalEH > maxEnd) maxEnd = finalEH;
            }
        }

        // 2. Check individual employee shifts
        if (shifts && shifts.length > 0) {
            shifts.forEach((s: any) => {
                if (!s.start_time || s.shift_type === 'off') return;
                const [sH] = s.start_time.split(':').map(Number);
                const [eH, eM] = s.end_time.split(':').map(Number);
                if (sH < minStart) minStart = sH;
                const finalEH = eM > 0 ? eH + 1 : eH;
                if (finalEH > maxEnd) maxEnd = finalEH;
            });
        }

        // 3. Check actual appointments (just in case they are outside shifts)
        if (appointments && appointments.length > 0) {
            appointments.forEach((app: any) => {
                const appStart = DateTime.fromISO(app.start_time).setZone(timezone);
                const appEnd = DateTime.fromISO(app.end_time).setZone(timezone);
                if (appStart.hour < minStart) minStart = appStart.hour;
                const finalAppEH = appEnd.minute > 0 ? appEnd.hour + 1 : appEnd.hour;
                if (finalAppEH > maxEnd) maxEnd = finalAppEH;
            });
        }

        // Fallback if no data
        if (minStart === 24) minStart = 9;
        if (maxEnd === 0) maxEnd = 21;

        // Padding
        const start = Math.max(0, minStart - 1);
        const end = Math.min(24, maxEnd + 1);

        return { start, end };
    }, [shifts, appointments, timezone, currentBranch, currentDate]);

    const TIME_SLOTS_START = timeRange.start;
    const TIME_SLOTS_END = timeRange.end;

    const visibleEmployees = useMemo(() => {
        if (!employees.length) return [];
        return employees.filter((emp: any) => {
            if (emp.visible_in_booking === false) return false;
            const hasAppointments = appointments.some((a: any) => a.employee_id === emp.id);
            if (hasAppointments) return true;
            const shift = shifts.find((s: any) => s.employee_id === emp.id && DateTime.fromISO(s.date).hasSame(currentDate, 'day'));
            return shift && (shift.shift_type === 'work' || (!shift.shift_type && !shift.is_day_off));
        });
    }, [employees, shifts, currentDate, appointments]);

    const [isSaving, setIsSaving] = useState(false);

    const handleSaveBooking = async (data: any) => {
        setIsSaving(true);
        try {
            const payload = { ...data, company_id: company.id, branch_id: Number(selectedBranchID) };
            if (editorMode === 'create') await api.post('/bookings', payload);
            else await api.put(`/bookings/${selectedAppointment.id}`, payload);
            setIsEditorOpen(false);
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            toast.success('Запись сохранена');
        } catch (e: any) {
            // Rethrow to let BookingEditor handle specific errors (like overbooking)
            throw e;
        } finally {
            setIsSaving(false);
        }
    };

    const getAppointmentStyle = (app: any) => {
        const startStr = app.start_time.includes('T') ? app.start_time : app.start_time.replace(' ', 'T');
        const endStr = app.end_time.includes('T') ? app.end_time : app.end_time.replace(' ', 'T');
        const start = DateTime.fromISO(startStr).setZone(timezone);
        const end = DateTime.fromISO(endStr).setZone(timezone);
        const startHour = start.hour + start.minute / 60;
        const duration = end.diff(start, 'hours').hours;
        return { top: `${(startHour - TIME_SLOTS_START) * HOUR_HEIGHT}px`, height: `${Math.max(duration * HOUR_HEIGHT, 25)}px` };
    };

    const CurrentTimeMarker = () => {
        if (!now.hasSame(currentDate, 'day')) return null;
        const hour = now.hour + now.minute / 60;
        if (hour < TIME_SLOTS_START || hour > TIME_SLOTS_END) return null;
        return (
            <div className="absolute left-0 right-0 z-40 border-t-2 border-red-500 pointer-events-none flex items-center" style={{ top: `${(hour - TIME_SLOTS_START) * HOUR_HEIGHT}px` }}>
                <div className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-r-md shadow-sm">{now.toFormat('HH:mm')}</div>
            </div>
        );
    };

    const getEmployeeShiftRange = (empId: number) => {
        const shift = shifts.find((s: any) => s.employee_id === empId && DateTime.fromISO(s.date).hasSame(currentDate, 'day'));
        if (shift && shift.start_time && shift.end_time && shift.shift_type !== 'off' && !shift.is_day_off) {
            const [sH, sM] = shift.start_time.split(':').map(Number);
            const [eH, eM] = shift.end_time.split(':').map(Number);
            return { start: sH + sM / 60, end: eH + eM / 60 };
        }
        if (!shift && currentBranch && (currentBranch as any).schedule) {
            const dayOfWeek = currentDate.weekday % 7;
            const branchDay = (currentBranch as any).schedule.find((s: any) => s.day_of_week === dayOfWeek);
            if (branchDay && !branchDay.is_day_off) {
                const [sH, sM] = branchDay.start_time.split(':').map(Number);
                const [eH, eM] = branchDay.end_time.split(':').map(Number);
                return { start: sH + sM / 60, end: eH + eM / 60 };
            }
        }
        return null;
    };

    const renderNonWorkingHours = (empId: number) => {
        const range = getEmployeeShiftRange(empId);
        const zebraStyle = "bg-[repeating-linear-gradient(45deg,#f5f5f5,#f5f5f5_10px,#e5e5e5_10px,#e5e5e5_20px)] opacity-60";
        
        if (!range) {
            return <div className={`absolute left-0 right-0 z-10 pointer-events-none ${zebraStyle}`} style={{ top: 0, bottom: 0 }} />;
        }
        
        const blocks = [];
        if (range.start > TIME_SLOTS_START) {
            blocks.push(<div key="top" className={`absolute left-0 right-0 z-10 pointer-events-none ${zebraStyle}`} style={{ top: 0, height: `${(range.start - TIME_SLOTS_START) * HOUR_HEIGHT}px` }} />);
        }
        if (range.end < TIME_SLOTS_END) {
            blocks.push(<div key="bottom" className={`absolute left-0 right-0 z-10 pointer-events-none ${zebraStyle}`} style={{ top: `${(range.end - TIME_SLOTS_START) * HOUR_HEIGHT}px`, bottom: 0 }} />);
        }
        return blocks;
    };

    return (
        <div className="flex flex-col h-screen bg-neutral-50/30 overflow-hidden">
            <header className="h-16 border-b bg-white flex items-center justify-between px-6 shrink-0 z-40 shadow-sm">
                <div className="flex items-center gap-6">
                    <h1 className="text-lg font-black tracking-tighter uppercase text-neutral-900">Журнал</h1>
                    <div className="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200/50">
                        <Button variant="ghost" size="icon" onClick={() => setCurrentDate(currentDate.minus({ days: 1 }))} className="h-8 w-8 rounded-lg hover:bg-white hover:shadow-sm"><ChevronLeft className="h-4 w-4" /></Button>
                        <div className="px-4 text-[11px] font-black uppercase tracking-[0.1em] text-neutral-600 min-w-[180px] text-center">{currentDate.setLocale('ru').toFormat('d MMMM, cccc')}</div>
                        <Button variant="ghost" size="icon" onClick={() => setCurrentDate(currentDate.plus({ days: 1 }))} className="h-8 w-8 rounded-lg hover:bg-white hover:shadow-sm"><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setCurrentDate(DateTime.now().setZone(timezone))} className="h-10 rounded-xl font-bold border-neutral-200 hover:bg-neutral-50 shadow-sm">Сегодня</Button>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-100"><Clock className="h-3.5 w-3.5 text-amber-600" /><span className="text-[10px] font-black text-amber-700 uppercase">{timezone}</span></div>
                    <Button variant="ghost" size="icon" onClick={() => queryClient.invalidateQueries()} className="h-10 w-10 rounded-xl text-neutral-400 hover:text-neutral-900"><RefreshCw className="h-4 w-4" /></Button>
                </div>
            </header>

            <div className="flex-1 overflow-auto custom-scrollbar relative bg-white">
                <div className="flex min-w-full" style={{ height: `${(TIME_SLOTS_END - TIME_SLOTS_START + 1) * HOUR_HEIGHT + 60}px` }}>
                    <div className="w-20 shrink-0 border-r bg-neutral-50/50 sticky left-0 z-30 flex flex-col pt-12">
                        {Array.from({ length: TIME_SLOTS_END - TIME_SLOTS_START + 1 }).map((_, i) => (
                            <div key={i} className="h-20 border-b border-neutral-100 flex items-start justify-center pt-2"><span className="text-[10px] font-black text-neutral-400">{TIME_SLOTS_START + i}:00</span></div>
                        ))}
                    </div>

                    <div className="flex-1 flex min-w-max">
                        {visibleEmployees.map((emp: any) => (
                            <div key={emp.id} className="min-w-[200px] border-r border-neutral-100 relative group flex flex-col flex-1">
                                <div className="h-12 border-b bg-white/90 backdrop-blur-md flex items-center justify-center sticky top-0 z-20 px-4">
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-7 w-7 ring-2 ring-neutral-100 shadow-sm"><AvatarImage src={emp.avatar_url} /><AvatarFallback className="text-[10px] font-bold">{emp.name?.[0]}</AvatarFallback></Avatar>
                                        <span className="text-[11px] font-black truncate text-neutral-800 uppercase tracking-tight">{emp.name}</span>
                                    </div>
                                </div>
                                <div className="relative flex-1 bg-[linear-gradient(to_bottom,transparent_79px,#f5f5f5_79px,#f5f5f5_80px)] bg-[size:100%_80px]"
                                     onClick={(e) => {
                                         const rect = e.currentTarget.getBoundingClientRect();
                                         const y = e.clientY - rect.top;
                                         const hour = TIME_SLOTS_START + Math.floor(y / HOUR_HEIGHT);
                                         const minute = Math.floor((y % HOUR_HEIGHT) / (HOUR_HEIGHT/4)) * 15;
                                         
                                         const clickTime = currentDate.set({ hour, minute, second: 0, millisecond: 0 });
                                         const clickMillis = clickTime.toMillis();
                                         
                                         // Check if we clicked on an existing appointment to prevent "under-appointment" clicks
                                         const existingApp = appointments.find((a: any) => {
                                             if (a.employee_id !== emp.id || a.status === 'cancelled') return false;
                                             const start = DateTime.fromISO(a.start_time).setZone(timezone).toMillis();
                                             const end = DateTime.fromISO(a.end_time).setZone(timezone).toMillis();
                                             return clickMillis >= start && clickMillis < end;
                                         });

                                         if (existingApp) return;

                                         if (hour >= TIME_SLOTS_START && hour <= TIME_SLOTS_END) {
                                             setSelectedSlot({ empID: emp.id, time: clickTime });
                                             setEditorMode('create'); setSelectedAppointment(null); setIsEditorOpen(true);
                                         }
                                     }}>
                                    
                                    {renderNonWorkingHours(emp.id)}
                                    <CurrentTimeMarker />

                                    {appointments.filter((a: any) => a.employee_id === emp.id).map((app: any) => (
                                        <div key={app.id} onClick={(e) => { e.stopPropagation(); setSelectedAppointment(app); setEditorMode('edit'); setIsEditorOpen(true); }} style={getAppointmentStyle(app)} className={cn("absolute left-1.5 right-1.5 rounded-xl p-2.5 border-l-[6px] shadow-lg shadow-neutral-200/20 cursor-pointer transition-all hover:scale-[1.03] hover:z-20 group overflow-hidden", app.status === 'confirmed' ? "bg-emerald-50 border-emerald-500" : app.status === 'arrived' ? "bg-blue-50 border-blue-500" : app.status === 'no_show' ? "bg-red-50 border-red-500" : "bg-amber-50 border-amber-500")}>
                                            <div className="flex flex-col h-full relative">
                                                {/* Source & New Badge icons */}
                                                <div className="absolute top-0 right-0 flex items-center gap-1">
                                                    {app.is_new_client && (
                                                        <div className="bg-[#F5FF82] text-black px-1 rounded-[4px] flex items-center gap-0.5 animate-pulse">
                                                            <Sparkles className="w-2 h-2" />
                                                            <span className="text-[7px] font-black uppercase">New</span>
                                                        </div>
                                                    )}
                                                    {app.booking_source === 'widget' ? (
                                                        <Globe className="w-2.5 h-2.5 text-neutral-400" />
                                                    ) : (
                                                        <User className="w-2.5 h-2.5 text-neutral-400" />
                                                    )}
                                                </div>

                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-[10px] font-black text-neutral-900/40 uppercase tracking-tighter">{DateTime.fromISO(app.start_time.includes('T') ? app.start_time : app.start_time.replace(' ', 'T')).setZone(timezone).toFormat('HH:mm')}</span>
                                                </div>
                                                <div className="text-[11px] font-black text-neutral-900 leading-none truncate mb-1 pr-10">{app.client_first_name || 'Без имени'}</div>
                                                <div className="text-[9px] font-bold text-neutral-500 uppercase tracking-tighter truncate">{(app.services || []).map((s: any) => serviceMap[s.service_id] || 'Услуга').join(', ')}</div>
                                                {app.comment && <div className="mt-1.5 text-[8px] italic text-neutral-400 truncate border-t border-black/5 pt-1">{app.comment}</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <BookingEditor isOpen={isEditorOpen} onClose={() => setIsEditorOpen(false)} mode={editorMode} company={company} branchId={Number(selectedBranchID)} selectedSlot={selectedSlot} selectedAppointment={selectedAppointment} employees={employees} allServices={allServices} employeeServices={employeeServices} categories={categories} customers={customers} appointments={appointments} shifts={shifts} onSave={handleSaveBooking} isSaving={isSaving} />
        </div>
    );
}
