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

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// DnD Kit
import { 
    DndContext, 
    DragOverlay, 
    useSensor, 
    useSensors, 
    PointerSensor, 
    MouseSensor,
    TouchSensor,
    DragEndEvent,
    DragStartEvent,
    useDraggable,
    useDroppable
} from '@dnd-kit/core';
import { restrictToFirstScrollableAncestor, restrictToWindowEdges } from '@dnd-kit/modifiers';

const HOUR_HEIGHT = 80;

function DraggableAppointment({ app, style, serviceMap, timezone, onClick, isDragging }: any) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `app-${app.id}`,
        data: { type: 'appointment', app }
    });

    const dndStyle = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
        opacity: isDragging ? 0.5 : 1,
    } : undefined;

    return (
        <div ref={setNodeRef} {...listeners} {...attributes}
             onClick={onClick} 
             style={{ ...style, ...dndStyle }} 
             className={cn("absolute left-1.5 right-1.5 rounded-xl p-2.5 border-l-[6px] shadow-lg shadow-neutral-200/20 cursor-grab active:cursor-grabbing transition-all hover:scale-[1.03] hover:z-20 group overflow-hidden", 
                 app.status === 'confirmed' ? "bg-emerald-50 border-emerald-500" : (app.status === 'arrived' || app.status === 'finished') ? "bg-blue-50 border-blue-500" : app.status === 'no_show' ? "bg-red-50 border-red-500" : "bg-amber-50 border-amber-500",
                 isDragging && "scale-105 shadow-2xl ring-2 ring-black/5")}>
            <div className="flex flex-col h-full relative">
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
    );
}

function DroppableColumn({ emp, children, onColumnClick, renderNonWorkingHours, currentTimeMarker, onShiftEdit }: any) {
    const { setNodeRef, isOver } = useDroppable({
        id: `emp-${emp.id}`,
        data: { type: 'column', empID: emp.id }
    });

    return (
        <div ref={setNodeRef} className={cn("min-w-[200px] border-r border-neutral-100 relative group flex flex-col flex-1", isOver && "bg-neutral-50/50")}>
            <div className="h-12 border-b bg-white/90 backdrop-blur-md flex items-center justify-center sticky top-0 z-20 px-4">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div className="flex items-center gap-2 cursor-pointer hover:bg-neutral-50 p-1.5 rounded-lg transition-colors">
                            <Avatar className="h-7 w-7 ring-2 ring-neutral-100 shadow-sm"><AvatarImage src={emp.avatar_url} /><AvatarFallback className="text-[10px] font-bold">{emp.name?.[0]}</AvatarFallback></Avatar>
                            <span className="text-[11px] font-black truncate text-neutral-800 uppercase tracking-tight">{emp.name}</span>
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 rounded-xl shadow-xl border-neutral-100">
                        <div className="px-2 py-1.5 text-[9px] font-black uppercase text-neutral-400 tracking-widest">Управление сменой</div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onShiftEdit(emp.id)} className="rounded-lg gap-2 cursor-pointer">
                            <CalendarIcon className="w-3.5 h-3.5" />
                            <span className="text-xs font-bold">Настроить график</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="relative flex-1 bg-[linear-gradient(to_bottom,transparent_79px,#f5f5f5_79px,#f5f5f5_80px)] bg-[size:100%_80px]"
                 onClick={(e) => onColumnClick(e, emp.id)}>
                {renderNonWorkingHours(emp.id)}
                {currentTimeMarker}
                {children}
            </div>
        </div>
    );
}

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

    // Quick Shift Editing States
    const [isShiftDialogOpen, setIsShiftDialogOpen] = useState(false);
    const [quickShiftData, setQuickShiftData] = useState({ 
        empID: 0, 
        workStart: '09:00', 
        workEnd: '18:00', 
        breaks: [] as Array<{start: string, end: string}> 
    });

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
            
            const dayShifts = shifts.filter((s: any) => s.employee_id === emp.id && DateTime.fromISO(s.date).hasSame(currentDate, 'day'));
            const workShift = dayShifts.find((s: any) => s.shift_type === 'work' || (!s.shift_type && !s.is_day_off));
            return !!workShift;
        });
    }, [employees, shifts, currentDate, appointments]);

    const [isSaving, setIsSaving] = useState(false);

    const saveShiftMutation = useMutation({
        mutationFn: (data: any[]) => api.post('/shifts', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
            toast.success('Расписание обновлено');
            setIsShiftDialogOpen(false);
        },
    });

    const handleQuickShiftSave = () => {
        const payload: any[] = [];
        
        // 1. Add main work shift
        payload.push({
            employee_id: quickShiftData.empID,
            branch_id: Number(selectedBranchID),
            date: currentDate.toISODate() + 'T00:00:00Z',
            start_time: quickShiftData.workStart,
            end_time: quickShiftData.workEnd,
            shift_type: 'work',
        });

        // 2. Add all breaks
        quickShiftData.breaks.forEach(b => {
            if (b.start && b.end) {
                payload.push({
                    employee_id: quickShiftData.empID,
                    branch_id: Number(selectedBranchID),
                    date: currentDate.toISODate() + 'T00:00:00Z',
                    start_time: b.start,
                    end_time: b.end,
                    shift_type: 'break',
                });
            }
        });

        saveShiftMutation.mutate(payload);
    };

    const handleShiftEdit = (empID: number) => {
        const dayShifts = shifts.filter((s: any) => s.employee_id === empID && DateTime.fromISO(s.date).hasSame(currentDate, 'day'));
        const workShift = dayShifts.find((s: any) => s.shift_type === 'work' || !s.shift_type);
        const breakShifts = dayShifts.filter((s: any) => s.shift_type === 'break');
        
        setQuickShiftData({
            empID,
            workStart: workShift?.start_time || '09:00',
            workEnd: workShift?.end_time || '18:00',
            breaks: breakShifts.map((b: any) => ({ start: b.start_time, end: b.end_time })),
        });
        setIsShiftDialogOpen(true);
    };

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const app = active.data.current?.app;
        const targetEmpID = over.data.current?.empID;

        if (!app || !targetEmpID) return;

        // Calculate new time based on drop position
        // @ts-ignore
        const dropY = event.delta.y; 
        // This is tricky because dnd-kit gives delta. 
        // We need to know the absolute position or use a different approach.
        // For simplicity, let's assume we want to change ONLY the employee if dropped on a column,
        // OR calculate time if we had more info.
        
        // BETTER APPROACH: Use the mouse position relative to the droppable container
        // Since we don't have it easily in DragEndEvent, let's just support changing the employee for now,
        // keeping the same time, OR we can add a more sophisticated listener.
        
        // Actually, we can get the client position from the original event
        const { x, y } = event.delta;
        const minutesDelta = Math.round((y / HOUR_HEIGHT) * 4) * 15;
        
        const oldStart = DateTime.fromISO(app.start_time).setZone(timezone);
        const oldEnd = DateTime.fromISO(app.end_time).setZone(timezone);
        const newStart = oldStart.plus({ minutes: minutesDelta });
        const newEnd = oldEnd.plus({ minutes: minutesDelta });

        try {
            setIsSaving(true);
            const payload = {
                ...app,
                employee_id: targetEmpID,
                start_time: newStart.toISO(),
                end_time: newEnd.toISO(),
                company_id: company.id,
                branch_id: Number(selectedBranchID)
            };
            await api.put(`/bookings/${app.id}`, payload);
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            toast.success('Запись перенесена');
        } catch (e: any) {
            toast.error(e.response?.data?.error || 'Ошибка при переносе');
        } finally {
            setIsSaving(false);
        }
    };

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
        const dayShifts = shifts.filter((s: any) => s.employee_id === empId && DateTime.fromISO(s.date).hasSame(currentDate, 'day'));
        const shift = dayShifts.find((s: any) => s.shift_type === 'work' || !s.shift_type);

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

        // Add break shifts
        const dayBreaks = shifts.filter((s: any) => s.employee_id === empId && s.shift_type === 'break' && DateTime.fromISO(s.date).hasSame(currentDate, 'day'));
        dayBreaks.forEach((b: any, idx: number) => {
            const [sH, sM] = b.start_time.split(':').map(Number);
            const [eH, eM] = b.end_time.split(':').map(Number);
            const start = sH + sM / 60;
            const end = eH + eM / 60;
            
            blocks.push(
                <div key={`break-${idx}`} 
                     onClick={(e) => { e.stopPropagation(); handleShiftEdit(empId); }}
                     className="absolute left-0 right-0 z-30 cursor-pointer bg-neutral-100 hover:bg-neutral-200/50 transition-colors flex items-center justify-center border-y border-neutral-200/50" 
                     style={{ top: `${(start - TIME_SLOTS_START) * HOUR_HEIGHT}px`, height: `${(end - start) * HOUR_HEIGHT}px` }}>
                    <div className="flex items-center gap-1.5 opacity-30 pointer-events-none">
                        <Clock className="w-3 h-3" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Перерыв</span>
                    </div>
                </div>
            );
        });

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
                <DndContext sensors={sensors} onDragEnd={handleDragEnd} modifiers={[restrictToFirstScrollableAncestor]}>
                    <div className="flex min-w-full" style={{ height: `${(TIME_SLOTS_END - TIME_SLOTS_START + 1) * HOUR_HEIGHT + 60}px` }}>
                        <div className="w-20 shrink-0 border-r bg-neutral-50/50 sticky left-0 z-30 flex flex-col pt-12">
                            {Array.from({ length: TIME_SLOTS_END - TIME_SLOTS_START + 1 }).map((_, i) => (
                                <div key={i} className="h-20 border-b border-neutral-100 flex items-start justify-center pt-2"><span className="text-[10px] font-black text-neutral-400">{TIME_SLOTS_START + i}:00</span></div>
                            ))}
                        </div>

                        <div className="flex-1 flex min-w-max">
                            {visibleEmployees.map((emp: any) => (
                                <DroppableColumn 
                                    key={emp.id} 
                                    emp={emp} 
                                    onColumnClick={(e: any, empID: number) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const y = e.clientY - rect.top;
                                        const hour = TIME_SLOTS_START + Math.floor(y / HOUR_HEIGHT);
                                        const minute = Math.floor((y % HOUR_HEIGHT) / (HOUR_HEIGHT/4)) * 15;
                                        const clickTime = currentDate.set({ hour, minute, second: 0, millisecond: 0 });
                                        setSelectedSlot({ empID, time: clickTime });
                                        setEditorMode('create'); setSelectedAppointment(null); setIsEditorOpen(true);
                                    }}
                                    renderNonWorkingHours={renderNonWorkingHours}
                                    currentTimeMarker={<CurrentTimeMarker />}
                                    onShiftEdit={handleShiftEdit}
                                >
                                    {appointments.filter((a: any) => a.employee_id === emp.id).map((app: any) => (
                                        <DraggableAppointment 
                                            key={app.id} 
                                            app={app} 
                                            style={getAppointmentStyle(app)} 
                                            serviceMap={serviceMap} 
                                            timezone={timezone}
                                            onClick={(e: any) => { e.stopPropagation(); setSelectedAppointment(app); setEditorMode('edit'); setIsEditorOpen(true); }}
                                        />
                                    ))}
                                </DroppableColumn>
                            ))}
                        </div>
                    </div>
                </DndContext>
            </div>

            <BookingEditor isOpen={isEditorOpen} onClose={() => setIsEditorOpen(false)} mode={editorMode} company={company} branchId={Number(selectedBranchID)} selectedSlot={selectedSlot} selectedAppointment={selectedAppointment} employees={employees} allServices={allServices} employeeServices={employeeServices} categories={categories} customers={customers} appointments={appointments} shifts={shifts} onSave={handleSaveBooking} isSaving={isSaving} />

            <Dialog open={isShiftDialogOpen} onOpenChange={setIsShiftDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            Настройка графика
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-6 py-6">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-10 w-10 ring-2 ring-neutral-100 shadow-sm">
                                <AvatarImage src={employees.find((e: any) => e.id === quickShiftData.empID)?.avatar_url} />
                                <AvatarFallback className="text-xs font-bold">{employees.find((e: any) => e.id === quickShiftData.empID)?.name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-sm font-black text-neutral-900 uppercase tracking-tight">{employees.find((e: any) => e.id === quickShiftData.empID)?.name}</p>
                                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">{currentDate.setLocale('ru').toFormat('d MMMM, cccc')}</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Рабочее время</Label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-bold text-neutral-400 uppercase">Начало</span>
                                        <Input 
                                            type="time" 
                                            value={quickShiftData.workStart} 
                                            onChange={(e) => setQuickShiftData({...quickShiftData, workStart: e.target.value})} 
                                            className="h-10 text-sm font-bold bg-neutral-50 border-none rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-bold text-neutral-400 uppercase">Конец</span>
                                        <Input 
                                            type="time" 
                                            value={quickShiftData.workEnd} 
                                            onChange={(e) => setQuickShiftData({...quickShiftData, workEnd: e.target.value})} 
                                            className="h-10 text-sm font-bold bg-neutral-50 border-none rounded-xl"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-neutral-100">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Перерывы</Label>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => setQuickShiftData({
                                            ...quickShiftData, 
                                            breaks: [...quickShiftData.breaks, { start: '13:00', end: '14:00' }]
                                        })}
                                        className="h-6 text-[9px] font-black uppercase bg-neutral-100 rounded-lg hover:bg-neutral-200"
                                    >
                                        + Добавить
                                    </Button>
                                </div>
                                
                                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                                    {quickShiftData.breaks.map((b, idx) => (
                                        <div key={idx} className="flex items-center gap-2 group animate-in slide-in-from-left-2">
                                            <div className="grid grid-cols-2 gap-2 flex-1">
                                                <Input 
                                                    type="time" 
                                                    value={b.start} 
                                                    onChange={(e) => {
                                                        const newBreaks = [...quickShiftData.breaks];
                                                        newBreaks[idx].start = e.target.value;
                                                        setQuickShiftData({...quickShiftData, breaks: newBreaks});
                                                    }}
                                                    className="h-9 text-xs font-bold bg-neutral-50/50 border-none"
                                                />
                                                <Input 
                                                    type="time" 
                                                    value={b.end} 
                                                    onChange={(e) => {
                                                        const newBreaks = [...quickShiftData.breaks];
                                                        newBreaks[idx].end = e.target.value;
                                                        setQuickShiftData({...quickShiftData, breaks: newBreaks});
                                                    }}
                                                    className="h-9 text-xs font-bold bg-neutral-50/50 border-none"
                                                />
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => {
                                                    const newBreaks = quickShiftData.breaks.filter((_, i) => i !== idx);
                                                    setQuickShiftData({...quickShiftData, breaks: newBreaks});
                                                }}
                                                className="h-8 w-8 text-neutral-300 hover:text-red-500 transition-colors"
                                            >
                                                <Badge variant="outline" className="p-0 border-none">×</Badge>
                                            </Button>
                                        </div>
                                    ))}
                                    {quickShiftData.breaks.length === 0 && (
                                        <p className="text-[10px] text-neutral-300 italic text-center py-2">Нет перерывов</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsShiftDialogOpen(false)} className="rounded-xl font-bold uppercase text-[10px] tracking-widest">Отмена</Button>
                        <Button 
                            onClick={handleQuickShiftSave} 
                            disabled={saveShiftMutation.isPending}
                            className="bg-neutral-900 text-white hover:bg-neutral-800 rounded-xl font-bold uppercase text-[10px] tracking-widest px-8 shadow-lg shadow-neutral-200"
                        >
                            {saveShiftMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
