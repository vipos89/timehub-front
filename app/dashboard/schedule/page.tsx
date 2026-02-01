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
    const [currentMonth, setCurrentMonth] = useState(DateTime.now().startOf('month'));
    const [editingShift, setEditingShift] = useState<{ empID: number; date: string } | null>(null);
    const [newShift, setNewShift] = useState({ start: '09:00', end: '21:00', shiftType: 'work' });

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
            // Filter by branch locally or via API if supported
            const res = await api.get(`/employees?company_id=${company.id}`);
            return res.data.filter((e: any) => e.branch_id.toString() === selectedBranchID);
        },
        enabled: !!selectedBranchID && !!company?.id,
    });

    const { data: shifts, isLoading: isLoadingShifts } = useQuery({
        queryKey: ['shifts', selectedBranchID, currentMonth.toISODate()],
        queryFn: async () => {
            const res = await api.get('/shifts', {
                params: {
                    branch_id: selectedBranchID,
                    month: currentMonth.toISO()
                }
            });
            return res.data;
        },
        enabled: !!selectedBranchID,
    });

    // Mutations
    const saveShiftMutation = useMutation({
        mutationFn: (data: any) => api.post('/shifts', [data]),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
            toast.success('График обновлен');
            setEditingShift(null);
        },
    });

    // Calendar generation
    const daysInMonth = currentMonth.daysInMonth;
    const days = useMemo(() => {
        return Array.from({ length: daysInMonth }, (_, i) => currentMonth.set({ day: i + 1 }));
    }, [currentMonth, daysInMonth]);

    const getShiftForMaster = (empID: number, day: DateTime) => {
        return shifts?.find((s: any) => {
            const shiftDate = DateTime.fromISO(s.date);
            return s.employee_id === empID && shiftDate.hasSame(day, 'day');
        });
    };

    const handleMonthChange = (direction: number) => {
        setCurrentMonth(currentMonth.plus({ months: direction }));
    };

    const handleCellClick = (empID: number, day: DateTime) => {
        const existing = getShiftForMaster(empID, day);
        setEditingShift({ empID, date: day.toISODate()! });
        if (existing) {
            setNewShift({ start: existing.start_time, end: existing.end_time, shiftType: existing.shift_type || 'work' });
        } else {
            setNewShift({ start: '09:00', end: '21:00', shiftType: 'work' });
        }
    };

    const handleSaveShift = () => {
        if (!editingShift) return;
        saveShiftMutation.mutate({
            employee_id: editingShift.empID,
            branch_id: parseInt(selectedBranchID),
            date: editingShift.date + 'T00:00:00Z',
            start_time: newShift.start,
            end_time: newShift.end,
            shift_type: newShift.shiftType,
        });
    };


    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-neutral-200">
                <div>
                    <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
                        График работы <Info className="h-4 w-4 text-neutral-300" />
                    </h1>
                    <p className="text-neutral-500 text-sm mt-1">Настройка смен персонала на месяц</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end gap-0.5">
                        <Badge variant="outline" className="text-[10px] border-neutral-200 text-neutral-400 font-bold uppercase tracking-tighter">
                            Выбран филиал:
                        </Badge>
                        <span className="text-sm font-bold text-neutral-900">
                            {branches?.find((b: any) => b.id.toString() === selectedBranchID)?.name || '...'}
                        </span>
                    </div>
                    <Button variant="outline" className="border-neutral-200 text-neutral-600 gap-2">
                        <Download className="h-4 w-4" /> Выгрузить в PDF
                    </Button>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-white border border-neutral-200 rounded-lg p-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500" onClick={() => handleMonthChange(-1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="px-4 font-bold text-neutral-900 min-w-[150px] text-center capitalize">
                            {currentMonth.setLocale('ru').toFormat('LLLL yyyy')}
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-500" onClick={() => handleMonthChange(1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button variant="outline" size="sm" className="bg-white border-neutral-200 text-neutral-600" onClick={() => setCurrentMonth(DateTime.now().startOf('month'))}>
                        Сегодня
                    </Button>
                </div>
                <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg">
                    <Button variant="ghost" size="sm" className="text-[12px] h-7 px-3">Неделя</Button>
                    <Button variant="secondary" size="sm" className="text-[12px] h-7 px-3 bg-white shadow-sm font-bold">Месяц</Button>
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
                                            const empShifts = shifts?.filter((s: any) => s.employee_id === emp.id && s.shift_type === 'work') || [];
                                            const totalHours = empShifts.reduce((acc: number, s: any) => {
                                                const start = DateTime.fromFormat(s.start_time, 'HH:mm');
                                                const end = DateTime.fromFormat(s.end_time, 'HH:mm');
                                                return acc + end.diff(start, 'hours').hours;
                                            }, 0);
                                            return (
                                                <div className="text-neutral-500 text-sm">
                                                    <div className="flex items-center justify-center gap-1 font-bold">{totalHours.toFixed(0)} ч.</div>
                                                    <div className="text-[10px]">{empShifts.length} смен</div>
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    {days.map((day) => {
                                        const shift = getShiftForMaster(emp.id, day);
                                        return (
                                            <td
                                                key={day.toISO()}
                                                onClick={() => handleCellClick(emp.id, day)}
                                                className={`border-b border-r border-neutral-50 p-1 text-center group cursor-pointer hover:bg-neutral-100/50 transition-colors ${day.weekday > 5 ? 'bg-orange-50/10' : ''}`}
                                            >
                                                {shift ? (() => {
                                                    const shiftType = shift.shift_type || (shift.is_day_off ? 'day_off' : 'work');
                                                    const typeConfig = {
                                                        work: { bg: 'bg-green-100/80', border: 'border-green-200', text: 'text-green-700', label: '' },
                                                        day_off: { bg: 'bg-neutral-100', border: 'border-neutral-200', text: 'text-neutral-400', label: 'Вых' },
                                                        sick_leave: { bg: 'bg-yellow-100/80', border: 'border-yellow-200', text: 'text-yellow-700', label: 'Б/Л' },
                                                        vacation: { bg: 'bg-blue-100/80', border: 'border-blue-200', text: 'text-blue-700', label: 'Отп' },
                                                        unpaid_leave: { bg: 'bg-purple-100/80', border: 'border-purple-200', text: 'text-purple-700', label: 'За свой счет' },
                                                        absence: { bg: 'bg-red-100/80', border: 'border-red-200', text: 'text-red-700', label: 'Прогул' },
                                                    };
                                                    const config = typeConfig[shiftType as keyof typeof typeConfig] || typeConfig.work;
                                                    
                                                    return shiftType === 'work' ? (
                                                        <div className={`${config.bg} border ${config.border} rounded-md p-1.5 flex flex-col items-center justify-center animate-in zoom-in-95 duration-200 shadow-sm`}>
                                                            <span className={`text-[10px] font-bold ${config.text} leading-tight`}>{shift.start_time}</span>
                                                            <span className={`text-[10px] font-bold ${config.text} leading-tight`}>{shift.end_time}</span>
                                                        </div>
                                                    ) : (
                                                        <div className={`${config.bg} border ${config.border} rounded-md p-1.5 flex flex-col items-center justify-center animate-in zoom-in-95 duration-200 ${shiftType === 'day_off' ? 'opacity-60' : ''}`}>
                                                            <span className={`text-[10px] font-bold ${config.text} leading-tight uppercase`}>{config.label}</span>
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
            <Dialog open={!!editingShift} onOpenChange={(open) => !open && setEditingShift(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Настройка смены</DialogTitle>
                        <DialogDescription>
                            Укажите рабочие часы для сотрудника на {editingShift ? DateTime.fromISO(editingShift.date).setLocale('ru').toFormat('dd LLLL') : ''}
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
                                    <SelectItem value="day_off">Выходной</SelectItem>
                                    <SelectItem value="sick_leave">Больничный</SelectItem>
                                    <SelectItem value="vacation">Отпуск</SelectItem>
                                    <SelectItem value="unpaid_leave">Выходной за свой счет</SelectItem>
                                    <SelectItem value="absence">Прогул</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {newShift.shiftType === 'work' && (
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
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setEditingShift(null)}>Отмена</Button>
                        <Button type="submit" onClick={handleSaveShift} disabled={saveShiftMutation.isPending}>
                            {saveShiftMutation.isPending ? "Сохранение..." : "Сохранить"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
