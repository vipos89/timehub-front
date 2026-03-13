'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar as CalendarIcon, Clock, Save, Info, ChevronLeft, ChevronRight, Filter, Download, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { DateTime } from 'luxon';
import { useBranch } from '@/context/branch-context';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const DAYS = [
    { id: 1, name: 'Понедельник' },
    { id: 2, name: 'Вторник' },
    { id: 3, name: 'Среда' },
    { id: 4, name: 'Четверг' },
    { id: 5, name: 'Пятница' },
    { id: 6, name: 'Суббота' },
    { id: 0, name: 'Воскресенье' },
];

const DAYS_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export default function SchedulePage() {
    const queryClient = useQueryClient();
    const { selectedBranchID, branches } = useBranch();
    const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
    const [currentDate, setCurrentDate] = useState(DateTime.now().startOf(viewMode));
    
    // Derived month start for data fetching
    const dataMonth = currentDate.startOf('month').toISODate()!;

    const [selectedCells, setSelectedCells] = useState<Array<{ empID: number; date: string }>>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
    const [newShift, setNewShift] = useState({ start: '09:00', end: '21:00', shiftType: 'work' });
    const [breaks, setBreaks] = useState<Array<{ start: string; end: string }>>([]);
    const [generatorData, setGeneratorData] = useState({
        employeeID: '',
        startDate: DateTime.now().toISODate()!,
        endDate: DateTime.now().plus({ months: 1 }).toISODate()!,
        workDays: 2,
        offDays: 2,
        startTime: '09:00',
        endTime: '21:00',
    });

    // Queries
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
            const res = await api.get(`/employees?company_id=${company?.id}`);
            return res.data.filter((e: any) => e.branch_id.toString() === selectedBranchID);
        },
        enabled: !!selectedBranchID && !!company?.id,
    });

    const { data: shifts, isLoading: isLoadingShifts } = useQuery({
        queryKey: ['shifts', selectedBranchID, dataMonth],
        queryFn: async () => {
            const res = await api.get('/shifts', {
                params: {
                    branch_id: selectedBranchID,
                    month: dataMonth
                }
            });
            return res.data;
        },
        enabled: !!selectedBranchID,
    });

    // Mutations
    const saveShiftMutation = useMutation({
        mutationFn: (data: any[]) => api.post('/shifts', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
            toast.success('График обновлен');
            setSelectedCells([]);
            setIsEditing(false);
            setIsGeneratorOpen(false);
        },
    });

    const handleGenerateShifts = () => {
        if (!generatorData.employeeID || !selectedBranchID) {
            toast.error('Выберите сотрудника');
            return;
        }

        const start = DateTime.fromISO(generatorData.startDate);
        const end = DateTime.fromISO(generatorData.endDate);
        const batch: any[] = [];
        
        let current = start;
        let dayCounter = 0;
        const cycleLength = generatorData.workDays + generatorData.offDays;

        while (current <= end) {
            const isWorkDay = dayCounter % cycleLength < generatorData.workDays;
            
            batch.push({
                employee_id: parseInt(generatorData.employeeID),
                branch_id: parseInt(selectedBranchID),
                date: current.toISODate() + 'T00:00:00Z',
                start_time: generatorData.startTime,
                end_time: generatorData.endTime,
                shift_type: isWorkDay ? 'work' : 'day_off',
            });

            current = current.plus({ days: 1 });
            dayCounter++;
        }

        saveShiftMutation.mutate(batch);
    };

    // Calendar generation
    const days = useMemo(() => {
        if (viewMode === 'month') {
            const daysInMonth = currentDate.daysInMonth!;
            return Array.from({ length: daysInMonth }, (_, i) => currentDate.set({ day: i + 1 }));
        } else {
            // Week view: 7 days starting from start of week
            const startOfWeek = currentDate.startOf('week');
            return Array.from({ length: 7 }, (_, i) => startOfWeek.plus({ days: i }));
        }
    }, [currentDate, viewMode]);

    const getShiftForMaster = (empID: number, day: DateTime) => {
        const dayShifts = shifts?.filter((s: any) => {
            const shiftDate = DateTime.fromISO(s.date);
            return s.employee_id === empID && shiftDate.hasSame(day, 'day');
        }) || [];
        
        // Prioritize 'work' shift, then others, then first available
        return dayShifts.find((s: any) => s.shift_type === 'work') || dayShifts.find((s: any) => s.shift_type !== 'break') || dayShifts[0];
    };

    const handleDateChange = (direction: number) => {
        if (viewMode === 'month') {
            setCurrentDate(currentDate.plus({ months: direction }));
        } else {
            setCurrentDate(currentDate.plus({ weeks: direction }));
        }
    };

    const handleCellClick = (empID: number, day: DateTime) => {
        const dateStr = day.toISODate()!;
        const isSelected = selectedCells.some(c => c.empID === empID && c.date === dateStr);
        
        if (isSelected) {
            setSelectedCells(prev => prev.filter(c => !(c.empID === empID && c.date === dateStr)));
        } else {
            const newSelection = [...selectedCells, { empID, date: dateStr }];
            setSelectedCells(newSelection);

            // If it's the first cell selected, or we want to update state based on selection
            if (newSelection.length === 1) {
                const dayShifts = shifts?.filter((s: any) => s.employee_id === empID && DateTime.fromISO(s.date).hasSame(day, 'day')) || [];
                const workShift = dayShifts.find((s: any) => s.shift_type === 'work' || !s.shift_type);
                const breakShifts = dayShifts.filter((s: any) => s.shift_type === 'break');

                if (workShift) {
                    setNewShift({
                        start: workShift.start_time,
                        end: workShift.end_time,
                        shiftType: workShift.shift_type || 'work'
                    });
                } else {
                    setNewShift({ start: '09:00', end: '21:00', shiftType: 'work' });
                }

                setBreaks(breakShifts.map((b: any) => ({ start: b.start_time, end: b.end_time })));
            }
        }
    };

    const handleDownloadPDF = () => {
        window.print();
    };

    const handleExportExcel = () => {
        const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const url = `${baseURL}/reports/schedule/excel?branch_id=${selectedBranchID}&month=${currentDate.toISODate()}`;
        window.open(url, '_blank');
    };

    const handleBulkAction = (shiftType: string) => {
        const payload = selectedCells.map(c => ({
            employee_id: c.empID,
            branch_id: parseInt(selectedBranchID),
            date: c.date + 'T00:00:00Z',
            start_time: '09:00', // default, ignored if not work
            end_time: '21:00', // default, ignored if not work
            shift_type: shiftType,
        }));
        saveShiftMutation.mutate(payload);
    };

    const handleSaveShift = () => {
        if (selectedCells.length === 0) return;
        const payload: any[] = [];
        
        selectedCells.forEach(c => {
            // Add main shift
            payload.push({
                employee_id: c.empID,
                branch_id: parseInt(selectedBranchID),
                date: c.date + 'T00:00:00Z',
                start_time: newShift.start,
                end_time: newShift.end,
                shift_type: newShift.shiftType,
            });

            // If it's a work day, add breaks
            if (newShift.shiftType === 'work') {
                breaks.forEach(b => {
                    if (b.start && b.end) {
                        payload.push({
                            employee_id: c.empID,
                            branch_id: parseInt(selectedBranchID),
                            date: c.date + 'T00:00:00Z',
                            start_time: b.start,
                            end_time: b.end,
                            shift_type: 'break',
                        });
                    }
                });
            }
        });
        saveShiftMutation.mutate(payload);
    };


    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <style jsx global>{`
                @media print {
                    /* Hide everything in the layout including all sidebar slots */
                    header, nav, aside, button, .print\\:hidden, 
                    [data-sidebar], [data-slot="sidebar"], [data-slot="sidebar-gap"], 
                    [data-slot="sidebar-rail"], [data-slot="sidebar-trigger"],
                    .fixed, .sticky {
                        display: none !important;
                    }
                    
                    /* Reset main content positioning and un-flex ALL layout containers */
                    body, html, #__next, 
                    [data-slot="sidebar-wrapper"], 
                    .flex, .flex-col, 
                    main, 
                    div {
                        display: block !important;
                        height: auto !important;
                        min-height: auto !important;
                        overflow: visible !important;
                        position: static !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        -webkit-print-color-adjust: exact;
                        width: auto !important;
                    }

                    main {
                        width: 100% !important;
                    }

                    /* Only show the printable section */
                    .space-y-6 > *:not(#printable-schedule) {
                        display: none !important;
                    }

                    #printable-schedule {
                        display: block !important;
                        position: static !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        color: black !important;
                        background: white !important;
                        font-size: 8px !important;
                        overflow: visible !important;
                    }

                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        table-layout: auto !important;
                        page-break-inside: auto !important;
                        break-inside: auto !important;
                    }

                    thead {
                        display: table-header-group !important;
                    }
                    
                    tbody {
                        display: table-row-group !important;
                    }

                    tr {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }

                    th, td {
                        padding: 2px !important;
                        border: 0.5pt solid black !important;
                        break-inside: avoid !important;
                    }

                    /* Footer signature block */
                    #printable-schedule > div.mt-24 {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        display: grid !important;
                        grid-template-cols: 1fr 1fr !important;
                        gap: 40px !important;
                        margin-top: 120px !important; /* Extra space in print */
                    }
                }
            `}</style>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-neutral-200">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
                        График работы <Info className="h-4 w-4 text-neutral-300" />
                    </h1>
                    <p className="text-neutral-500 text-sm mt-1">Настройка смен персонала на месяц</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        onClick={() => setIsGeneratorOpen(true)}
                        className="bg-neutral-900 text-white hover:bg-neutral-800 gap-2 shadow-sm transition-all"
                    >
                        <CalendarIcon className="h-4 w-4" /> Генерация графика
                    </Button>
                    <div className="flex flex-col items-end gap-0.5">
                        <Badge variant="outline" className="text-[10px] border-neutral-200 text-neutral-400 font-bold uppercase tracking-tighter">
                            Выбран филиал:
                        </Badge>
                        <span className="text-sm font-bold text-neutral-900">
                            {branches?.find((b: any) => b.id.toString() === selectedBranchID)?.name || '...'}
                        </span>
                    </div>
                    <Button 
                        variant="outline" 
                        className="border-neutral-200 text-neutral-600 gap-2"
                        onClick={handleExportExcel}
                    >
                        <Building2 className="h-4 w-4" /> В Excel
                    </Button>
                    <Button 
                        variant="outline" 
                        className="border-neutral-200 text-neutral-600 gap-2"
                        onClick={handleDownloadPDF}
                    >
                        <Download className="h-4 w-4" /> В PDF
                    </Button>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-white border border-neutral-200 rounded-lg p-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500" onClick={() => handleDateChange(-1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="px-4 font-bold text-neutral-900 min-w-[150px] text-center capitalize">
                            {currentDate.setLocale('ru').toFormat(viewMode === 'month' ? 'LLLL yyyy' : 'dd LLLL')}
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500" onClick={() => handleDateChange(1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button variant="outline" size="sm" className="bg-white border-neutral-200 text-neutral-600" onClick={() => setCurrentDate(DateTime.now().startOf(viewMode))}>
                        Сегодня
                    </Button>
                </div>
                <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg">
                    <Button 
                        variant={viewMode === 'week' ? "secondary" : "ghost"} 
                        size="sm" 
                        className={`text-[12px] h-7 px-3 ${viewMode === 'week' ? 'bg-white shadow-sm font-bold' : ''}`}
                        onClick={() => {
                            setViewMode('week');
                            setCurrentDate(currentDate.startOf('week'));
                        }}
                    >
                        Неделя
                    </Button>
                    <Button 
                        variant={viewMode === 'month' ? "secondary" : "ghost"} 
                        size="sm" 
                        className={`text-[12px] h-7 px-3 ${viewMode === 'month' ? 'bg-white shadow-sm font-bold' : ''}`}
                        onClick={() => {
                            setViewMode('month');
                            setCurrentDate(currentDate.startOf('month'));
                        }}
                    >
                        Месяц
                    </Button>
                </div>
            </div>

            {/* Grid */}
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-neutral-50/50">
                                <th className="sticky left-0 z-10 bg-neutral-50/50 border-r border-b border-neutral-200 p-4 text-left min-w-[200px]">
                                    <div className="text-[10px] uppercase tracking-wider font-bold text-neutral-400">Сотрудники ({employees?.length || 0})</div>
                                </th>
                                <th className="border-b border-neutral-200 p-4 text-center min-w-[80px]">
                                    <div className="text-[10px] uppercase tracking-wider font-bold text-neutral-400">Всего</div>
                                </th>
                                {days.map((day) => (
                                    <th key={day.toISO()} className={`border-b border-neutral-200 p-2 min-w-[60px] text-center ${day.weekday > 5 ? 'bg-orange-50/30' : ''}`}>
                                        <div className={`text-[12px] font-bold ${day.weekday > 5 ? 'text-orange-500' : 'text-neutral-900'}`}>{day.day}</div>
                                        <div className="text-[10px] text-neutral-400 font-medium">{DAYS_RU[day.weekday % 7]}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {employees?.map((emp: any) => (
                                <tr key={emp.id} className="hover:bg-neutral-50/50 transition-colors">
                                    <td className="sticky left-0 z-10 bg-white border-r border-b border-neutral-100 p-4">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={emp.avatar_thumbnail_url || emp.avatar_url} />
                                                <AvatarFallback className="text-[10px] bg-neutral-100 font-bold">{emp.name[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-neutral-900">{emp.name}</span>
                                                <span className="text-[10px] text-neutral-400 uppercase tracking-tighter">{emp.position}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="border-b border-neutral-100 p-4 text-center">
                                        {(() => {
                                            const empDayShifts = shifts?.filter((s: any) => s.employee_id === emp.id) || [];
                                            const workShifts = empDayShifts.filter((s: any) => s.shift_type === 'work');
                                            const breakShifts = empDayShifts.filter((s: any) => s.shift_type === 'break');

                                            let totalMinutes = 0;
                                            workShifts.forEach((ws: any) => {
                                                const start = DateTime.fromFormat(ws.start_time, 'HH:mm');
                                                const end = DateTime.fromFormat(ws.end_time, 'HH:mm');
                                                totalMinutes += end.diff(start, 'minutes').minutes;
                                            });

                                            breakShifts.forEach((bs: any) => {
                                                const start = DateTime.fromFormat(bs.start_time, 'HH:mm');
                                                const end = DateTime.fromFormat(bs.end_time, 'HH:mm');
                                                totalMinutes -= end.diff(start, 'minutes').minutes;
                                            });

                                            const totalHours = Math.max(0, totalMinutes / 60);
                                            
                                            return (
                                                <div className="text-neutral-500 text-sm">
                                                    <div className="flex items-center justify-center gap-1 font-bold">{totalHours.toFixed(1)} ч.</div>
                                                    <div className="text-[10px]">{workShifts.length} смен</div>
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    {days.map((day) => {
                                        const shift = getShiftForMaster(emp.id, day);
                                        const dateStr = day.toISODate()!;
                                        const isSelected = selectedCells.some(c => c.empID === emp.id && c.date === dateStr);
                                        
                                        return (
                                            <td
                                                key={day.toISO()}
                                                onClick={() => handleCellClick(emp.id, day)}
                                                className={cn(
                                                    "border-b border-r border-neutral-50 p-1 text-center group cursor-pointer transition-colors relative",
                                                    day.weekday > 5 ? 'bg-orange-50/10' : '',
                                                    isSelected ? 'bg-neutral-100/80 ring-2 ring-inset ring-neutral-900' : 'hover:bg-neutral-100/50'
                                                )}
                                            >
                                                {shift ? (() => {
                                                    const dayShifts = shifts?.filter((s: any) => s.employee_id === emp.id && DateTime.fromISO(s.date).hasSame(day, 'day')) || [];
                                                    const shiftType = shift.shift_type || (shift.is_day_off ? 'day_off' : 'work');
                                                    const breakCount = dayShifts.filter((s: any) => s.shift_type === 'break').length;

                                                    const typeConfig = {
                                                        work: { bg: 'bg-green-100/80', border: 'border-green-200', text: 'text-green-700', label: '' },
                                                        break: { bg: 'bg-neutral-200/80', border: 'border-neutral-300', text: 'text-neutral-600', label: 'ПЕР' },
                                                        day_off: { bg: 'bg-neutral-100', border: 'border-neutral-200', text: 'text-neutral-400', label: 'ВЫХ' },
                                                        sick_leave: { bg: 'bg-yellow-100/80', border: 'border-yellow-200', text: 'text-yellow-700', label: 'Б/Л' },
                                                        vacation: { bg: 'bg-blue-100/80', border: 'border-blue-200', text: 'text-blue-700', label: 'ОТП' },
                                                        unpaid_leave: { bg: 'bg-purple-100/80', border: 'border-purple-200', text: 'text-purple-700', label: 'С/С' },
                                                        absence: { bg: 'bg-red-100/80', border: 'border-red-200', text: 'text-red-700', label: 'ПРГ' },
                                                    };
                                                    const config = typeConfig[shiftType as keyof typeof typeConfig] || typeConfig.work;
                                                    
                                                    return (
                                                        <div className={cn(
                                                            config.bg, "border", config.border, 
                                                            "rounded-md p-1.5 flex flex-col items-center justify-center animate-in zoom-in-95 duration-200 shadow-sm min-h-[40px] relative"
                                                        )}>
                                                            {['work', 'break'].includes(shiftType) ? (
                                                                <>
                                                                    <span className={cn("text-[10px] font-bold leading-tight", config.text)}>{shift.start_time}</span>
                                                                    <span className={cn("text-[10px] font-bold leading-tight", config.text)}>{shift.end_time}</span>
                                                                    {shiftType === 'work' && breakCount > 0 && (
                                                                        <div className="absolute -top-1 -right-1 flex items-center justify-center h-3 w-3 bg-neutral-900 rounded-full border border-white shadow-sm">
                                                                            <span className="text-[7px] font-black text-white">{breakCount}</span>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <span className={cn("text-[10px] font-black leading-tight", config.text)}>{config.label}</span>
                                                            )}
                                                        </div>
                                                    );
                                                })() : (
                                                    <div className="h-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <div className="h-6 w-6 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow-lg">
                                                            <span className="text-lg font-light leading-none">+</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Shift Dialog */}
            <Dialog open={isEditing} onOpenChange={(open) => !open && setIsEditing(false)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Настройка смен ({selectedCells.length})</DialogTitle>
                        <DialogDescription>
                            Укажите рабочие часы для выбранных дней
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Тип дня</Label>
                            <Select value={newShift.shiftType} onValueChange={(val) => setNewShift({ ...newShift, shiftType: val })}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Выберите тип" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="work">Рабочий день</SelectItem>
                                    <SelectItem value="break">Перерыв</SelectItem>
                                    <SelectItem value="day_off">Выходной</SelectItem>
                                    <SelectItem value="sick_leave">Больничный</SelectItem>
                                    <SelectItem value="vacation">Отпуск</SelectItem>
                                    <SelectItem value="unpaid_leave">Выходной за свой счет</SelectItem>
                                    <SelectItem value="absence">Прогул</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {['work', 'break'].includes(newShift.shiftType) && (
                            <>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="start" className="text-right">Начало</Label>
                                    <Input
                                        id="start"
                                        type="time"
                                        value={newShift.start}
                                        onChange={(e) => setNewShift({ ...newShift, start: e.target.value })}
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="end" className="text-right">Конец</Label>
                                    <Input
                                        id="end"
                                        type="time"
                                        value={newShift.end}
                                        onChange={(e) => setNewShift({ ...newShift, end: e.target.value })}
                                        className="col-span-3"
                                    />
                                </div>
                            </>
                        )}

                        {newShift.shiftType === 'work' && (
                            <div className="space-y-4 pt-4 border-t border-neutral-100">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Перерывы</Label>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => setBreaks([...breaks, { start: '13:00', end: '14:00' }])}
                                        className="h-7 text-[10px] font-bold uppercase text-neutral-900 bg-neutral-100 rounded-lg hover:bg-neutral-200"
                                    >
                                        + Добавить
                                    </Button>
                                </div>
                                {breaks.map((b, idx) => (
                                    <div key={idx} className="flex items-center gap-2 group animate-in slide-in-from-left-2">
                                        <div className="grid grid-cols-2 gap-2 flex-1">
                                            <Input 
                                                type="time" 
                                                value={b.start} 
                                                onChange={(e) => {
                                                    const newBreaks = [...breaks];
                                                    newBreaks[idx].start = e.target.value;
                                                    setBreaks(newBreaks);
                                                }}
                                                className="h-9 text-xs"
                                            />
                                            <Input 
                                                type="time" 
                                                value={b.end} 
                                                onChange={(e) => {
                                                    const newBreaks = [...breaks];
                                                    newBreaks[idx].end = e.target.value;
                                                    setBreaks(newBreaks);
                                                }}
                                                className="h-9 text-xs"
                                            />
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => setBreaks(breaks.filter((_, i) => i !== idx))}
                                            className="h-9 w-9 text-neutral-300 hover:text-red-500 transition-colors"
                                        >
                                            <Save className="h-4 w-4 rotate-45" /> {/* Use close-like icon or generic */}
                                        </Button>
                                    </div>
                                ))}
                                {breaks.length === 0 && <p className="text-[10px] text-neutral-300 italic text-center py-2">Нет запланированных перерывов</p>}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Отмена</Button>
                        <Button type="submit" onClick={handleSaveShift} disabled={saveShiftMutation.isPending}>
                            {saveShiftMutation.isPending ? "Сохранение..." : "Сохранить"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Floating Selection Bar */}
            {selectedCells.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-8">
                    <span className="font-bold text-sm">Выбрано: {selectedCells.length}</span>
                    <div className="h-6 w-px bg-white/20" />
                    <div className="flex gap-2">
                        <Button size="sm" onClick={() => setIsEditing(true)} className="bg-white text-black hover:bg-neutral-100 font-bold rounded-xl h-9">Настроить</Button>
                        <Button size="sm" onClick={() => handleBulkAction('day_off')} className="bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl h-9 border-none">Выходной</Button>
                        <Button size="sm" onClick={() => handleBulkAction('sick_leave')} className="bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl h-9 border-none">Больничный</Button>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedCells([])} className="hover:bg-white/10 text-white font-bold rounded-xl h-9">Отмена</Button>
                    </div>
                </div>
            )}

            {/* Shift Generator Dialog */}
            <Dialog open={isGeneratorOpen} onOpenChange={setIsGeneratorOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Генерация графика</DialogTitle>
                        <DialogDescription>
                            Массовое создание смен по паттерну (например, 2/2).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Сотрудник</Label>
                            <Select value={generatorData.employeeID} onValueChange={(val) => setGeneratorData({ ...generatorData, employeeID: val })}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Выберите сотрудника" />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees?.map((emp: any) => (
                                        <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Период</Label>
                            <div className="col-span-3 flex items-center gap-2">
                                <Input type="date" value={generatorData.startDate} onChange={(e) => setGeneratorData({ ...generatorData, startDate: e.target.value })} />
                                <span>-</span>
                                <Input type="date" value={generatorData.endDate} onChange={(e) => setGeneratorData({ ...generatorData, endDate: e.target.value })} />
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Паттерн</Label>
                            <div className="col-span-3 flex items-center gap-2">
                                <div className="flex-1 space-y-1">
                                    <Label className="text-[10px] uppercase text-neutral-400">Раб. дни</Label>
                                    <Input type="number" value={generatorData.workDays} onChange={(e) => setGeneratorData({ ...generatorData, workDays: parseInt(e.target.value) || 1 })} />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <Label className="text-[10px] uppercase text-neutral-400">Выходные</Label>
                                    <Input type="number" value={generatorData.offDays} onChange={(e) => setGeneratorData({ ...generatorData, offDays: parseInt(e.target.value) || 1 })} />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Часы</Label>
                            <div className="col-span-3 flex items-center gap-2">
                                <Input type="time" value={generatorData.startTime} onChange={(e) => setGeneratorData({ ...generatorData, startTime: e.target.value })} />
                                <span>-</span>
                                <Input type="time" value={generatorData.endTime} onChange={(e) => setGeneratorData({ ...generatorData, endTime: e.target.value })} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsGeneratorOpen(false)}>Отмена</Button>
                        <Button 
                            onClick={handleGenerateShifts} 
                            disabled={saveShiftMutation.isPending || !generatorData.employeeID}
                            className="bg-neutral-900 text-white"
                        >
                            {saveShiftMutation.isPending ? "Генерация..." : "Сгенерировать график"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Printable Section (Hidden on screen, visible on print) */}
            <div id="printable-schedule" className="hidden">
                <div className="text-center mb-6">
                    <h1 className="text-xl font-bold uppercase tracking-tight">График работы персонала</h1>
                    <div className="text-sm mt-1">
                        <span>Организация: {company?.name}</span> | 
                        <span> Филиал: {branches?.find((b: any) => b.id.toString() === selectedBranchID)?.name}</span>
                    </div>
                    <div className="text-sm font-medium mt-1">
                        Период: {currentDate.setLocale('ru').toFormat(viewMode === 'month' ? 'LLLL yyyy' : 'dd LLLL yyyy')}
                    </div>
                </div>

                <table className="w-full border-collapse border border-black text-[9px]">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="border border-black p-2 text-left">Сотрудник</th>
                            <th className="border border-black p-2 w-10 text-center">Часы</th>
                            {days.map(day => (
                                <th key={day.toISO()} className="border border-black p-1 text-center min-w-[30px]">
                                    {day.day}<br/>{DAYS_RU[day.weekday % 7]}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {employees?.map((emp: any) => {
                            const empShifts = shifts?.filter((s: any) => s.employee_id === emp.id && s.shift_type === 'work') || [];
                            const totalHours = empShifts.reduce((acc: number, s: any) => {
                                const start = DateTime.fromFormat(s.start_time, 'HH:mm');
                                const end = DateTime.fromFormat(s.end_time, 'HH:mm');
                                // Subtract 1 hour for lunch
                                return acc + Math.max(0, end.diff(start, 'hours').hours - 1);
                            }, 0);

                            return (
                                <tr key={emp.id}>
                                    <td className="border border-black p-2 font-bold whitespace-nowrap">{emp.name}</td>
                                    <td className="border border-black p-2 text-center font-bold">{totalHours.toFixed(0)}</td>
                                    {days.map(day => {
                                        const shift = getShiftForMaster(emp.id, day);
                                        const isWork = shift?.shift_type === 'work';
                                        if (!isWork) return <td key={day.toISO()} className="border border-black p-0 text-center bg-gray-50"></td>;
                                        
                                        const start = DateTime.fromFormat(shift.start_time, 'HH:mm');
                                        const end = DateTime.fromFormat(shift.end_time, 'HH:mm');
                                        const duration = Math.max(0, end.diff(start, 'hours').hours - 1);

                                        return (
                                            <td key={day.toISO()} className="border border-black p-0 text-center font-medium">
                                                {duration > 0 ? duration : ''}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                <div className="mt-24 grid grid-cols-2 gap-20 text-[10px]">
                    <div className="border-t border-black pt-1">Подпись руководителя: ____________________</div>
                    <div className="border-t border-black pt-1 text-right">Дата: {DateTime.now().toFormat('dd.MM.yyyy')}</div>
                </div>
            </div>
        </div>
    );
}
