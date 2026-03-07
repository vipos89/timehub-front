'use client';

import { useState, useMemo } from 'react';
import {
    X, ChevronRight, User, Scissors, Calendar,
    ArrowLeft, Check, CheckCircle2, Plus, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { DateTime } from 'luxon';
import { toast } from 'sonner';
import { EmployeeAvailableSlots } from './EmployeeAvailableSlots';
import { cn } from '@/lib/utils';
import { useBookingLogic, Step } from './useBookingLogic';

interface BookingWidgetProps {
    company: any;
    branch: any;
    employees: any[];
    services: any[];
    categories: any[];
    settings: any;
    onClose?: () => void;
}

export function BookingWidget({ company, branch, employees, services, categories, settings, onClose }: BookingWidgetProps) {
    const queryClient = useQueryClient();
    const stepsOrder = useMemo(() => settings.stepsOrder || ['services', 'specialist', 'datetime'], [settings.stepsOrder]);

    const state = useBookingLogic({ initialEmployees: employees, initialServices: services, stepsOrder, branch });
    const [clientData, setClientData] = useState({ name: '', phone: '', comment: '' });

    const handleClose = () => {
        state.reset();
        if (onClose) onClose();
    };

    const bookingMutation = useMutation({
        mutationFn: async () => {
            const customerRes = await api.post('/customers', {
                company_id: company.id, branch_id: branch.id,
                first_name: clientData.name, phone: clientData.phone
            });
            const empId = state.selectedEmployee?.id === 'any' ? state.selectedSlot?.employee_id : state.selectedEmployee?.id;
            const payload = {
                company_id: company.id,
                branch_id: branch.id,
                employee_id: empId,
                client_id: customerRes.data.id,
                start_time: state.selectedSlot.start_time,
                end_time: DateTime.fromISO(state.selectedSlot.start_time).plus({ minutes: state.totalDuration }).toISO(),
                comment: clientData.comment,
                total_price: state.totalPrice,
                services: state.selectedServices.map(s => ({
                    service_id: s.id,
                    price: state.getSvcPrice(s, empId),
                    duration_minutes: state.getSvcDuration(s, empId)
                }))
            };
            return api.post('/bookings', payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['slots'] });
            state.navigateTo('success');
        },
        onError: () => toast.error('Ошибка записи.')
    });

    return (
        <div className="w-full h-full relative overflow-hidden flex flex-col bg-white" style={{ borderRadius: `${settings.borderRadius || 24}px` }}>
            {/* Header */}
            <div className="shrink-0 px-6 pt-6 flex items-center justify-between z-50">
                <button onClick={state.goBack} className="p-2.5 bg-neutral-100 rounded-xl transition-all active:scale-90 shadow-sm"><ArrowLeft className="h-5 w-5 text-neutral-600" /></button>
                <button onClick={handleClose} className="p-2.5 bg-neutral-100 rounded-xl transition-all active:scale-90 shadow-sm"><X className="h-5 w-5 text-neutral-600" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-32 pt-2">
                {state.currentView === 'home' && (
                    <div className="space-y-6">
                        <div className="flex flex-col items-center text-center space-y-4 pt-4">
                            <Avatar className="h-20 w-20 rounded-3xl shadow-xl"><AvatarImage src={company?.logo_url} /><AvatarFallback className="bg-black text-white">{company?.name?.[0]}</AvatarFallback></Avatar>
                            <h1 className="text-2xl font-black text-neutral-900">{company?.name}</h1>
                        </div>
                        <div className="space-y-3">
                            {stepsOrder.map((step) => {
                                const Icon = step === 'specialist' ? User : step === 'services' ? Scissors : Calendar;
                                return (
                                    <div key={step} onClick={() => state.navigateTo(step as Step)} className="p-6 flex items-center justify-between border-2 border-neutral-100 rounded-[24px] cursor-pointer hover:border-black transition-all bg-white group">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-neutral-50 rounded-2xl group-hover:bg-neutral-100 transition-colors">
                                                <Icon className="h-6 w-6 opacity-40 text-neutral-900" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black uppercase opacity-30 tracking-widest">{step === 'specialist' ? 'Мастер' : step === 'services' ? 'Услуги' : 'Время'}</span>
                                                <span className="font-bold text-sm text-neutral-900">
                                                    {step === 'specialist' ? (state.selectedEmployee?.name || 'Любой') :
                                                        step === 'services' ? (state.selectedServices.length ? `${state.selectedServices.length} выбрано` : 'Выбрать услуги') :
                                                            state.selectedSlot ? format(new Date(state.selectedSlot.start_time), 'HH:mm, d MMM', { locale: ru }) : 'Выбрать время'}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 opacity-20" />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {state.currentView === 'specialist' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h2 className="text-2xl font-black text-neutral-900">Выберите мастера</h2>
                        <div className="space-y-3">
                            {state.employeesWithStatus.map((emp) => {
                                const isSelected = state.selectedEmployee?.id === emp.id;
                                const masterSlots = Array.isArray(emp.nearestSlots) ? emp.nearestSlots : [];

                                return (
                                    <div key={emp.id} className={cn(
                                        "p-4 border-2 rounded-[28px] transition-all flex flex-col gap-4 shadow-sm",
                                        isSelected ? "border-black bg-white" : "border-neutral-100 bg-white",
                                        !emp.canAcceptBooking && "opacity-60 grayscale-[0.5]"
                                    )}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4 cursor-pointer" onClick={() => emp.canAcceptBooking && state.handleSelectSpecialist(emp)}>
                                                {emp.id === 'any' ? (
                                                    <div className="h-12 w-12 rounded-full bg-neutral-900 flex items-center justify-center text-white shadow-md">
                                                        <Users className="h-6 w-6" />
                                                    </div>
                                                ) : (
                                                    <Avatar className="h-12 w-12 border-2 border-white shadow-sm"><AvatarImage src={emp.avatar_url} /><AvatarFallback>{emp.name[0]}</AvatarFallback></Avatar>
                                                )}
                                                <div className="flex flex-col text-left">
                                                    <span className="font-bold text-neutral-900">{emp.name}</span>
                                                    <span className="text-[10px] uppercase font-black opacity-40">{emp.position}</span>
                                                </div>
                                            </div>
                                            {isSelected && <div className="h-6 w-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm"><Check className="h-4 w-4 text-white" /></div>}
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {masterSlots.length > 0 ? (
                                                masterSlots.map((slot: any) => (
                                                    <button key={slot.start_time} onClick={() => state.handleSelectSlot(slot)} className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95", state.selectedSlot?.start_time === slot.start_time ? "bg-black text-white shadow-md" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200")}>
                                                        {format(new Date(slot.start_time), 'HH:mm')}
                                                    </button>
                                                ))
                                            ) : (
                                                <span className="text-[10px] text-neutral-400 font-bold ml-1 italic">{emp.reason}</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {state.currentView === 'services' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h2 className="text-2xl font-black text-neutral-900">Выберите услуги</h2>
                        {categories.map((cat) => {
                            const catServices = state.availableServices.filter(s => s.category_id === cat.id);
                            if (catServices.length === 0) return null;
                            return (
                                <div key={cat.id} className="space-y-3">
                                    <h3 className="text-[10px] font-black uppercase opacity-30 tracking-widest pl-1">{cat.name}</h3>
                                    {catServices.map((svc) => {
                                        const isSelected = state.selectedServices.some(s => s.id === svc.id);
                                        return (
                                            <div key={svc.id} onClick={() => state.handleSelectService(svc)} className={cn("p-5 border-2 rounded-[24px] cursor-pointer flex items-center justify-between transition-all bg-white shadow-sm", isSelected ? "border-black bg-neutral-50" : "border-neutral-100 hover:border-neutral-200")}>
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-bold leading-tight text-neutral-900">{svc.name}</span>
                                                    <span className="text-xs font-medium opacity-40 text-neutral-600">{state.getSvcDuration(svc, state.selectedEmployee?.id)} мин • {state.getSvcPrice(svc, state.selectedEmployee?.id)} BYN</span>
                                                </div>
                                                <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center transition-colors shadow-inner", isSelected ? "bg-black text-white" : "bg-neutral-50 text-neutral-400")}>{isSelected ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}</div>
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
                        <h2 className="text-2xl font-black text-neutral-900">Выберите время</h2>
                        <EmployeeAvailableSlots
                            employeeIds={(state.selectedEmployee && state.selectedEmployee.id !== 'any') ? state.selectedEmployee.id : employees.map(e => e.id).join(',')}
                            duration={state.totalDuration}
                            timezone={branch?.timezone}
                            onSlotSelect={state.handleSelectSlot}
                        />
                    </div>
                )}

                {state.currentView === 'profile' && (
                    <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h2 className="text-2xl font-black text-neutral-900">Ваши данные</h2>
                        <div className="space-y-5">
                            <div className="space-y-2"><Label className="text-[10px] font-black uppercase opacity-40 ml-1">Имя</Label><Input className="h-14 rounded-2xl border-2 border-neutral-100 focus:border-black transition-all" value={clientData.name} onChange={e => setClientData({...clientData, name: e.target.value})} placeholder="Иван" /></div>
                            <div className="space-y-2"><Label className="text-[10px] font-black uppercase opacity-40 ml-1">Телефон</Label><Input className="h-14 rounded-2xl border-2 border-neutral-100 focus:border-black transition-all" value={clientData.phone} onChange={e => setClientData({...clientData, phone: e.target.value})} placeholder="+375..." /></div>
                            <div className="space-y-2"><Label className="text-[10px] font-black uppercase opacity-40 ml-1">Комментарий</Label><Textarea className="rounded-2xl border-2 border-neutral-100 focus:border-black transition-all min-h-[100px]" value={clientData.comment} onChange={e => setClientData({...clientData, comment: e.target.value})} /></div>
                        </div>
                    </div>
                )}

                {state.currentView === 'success' && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-6 pt-10">
                        <div className="h-24 w-24 bg-emerald-50 rounded-[40px] flex items-center justify-center animate-in zoom-in duration-500 shadow-inner">
                            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                        </div>
                        <h2 className="text-3xl font-black text-neutral-900">Запись создана!</h2>
                        <Button onClick={handleClose} className="w-full h-16 bg-neutral-900 text-white rounded-[24px] font-bold hover:bg-black transition-all shadow-xl">На главную</Button>
                    </div>
                )}
            </div>

            {/* Floating Footer Button */}
            {['home', 'services', 'specialist', 'datetime', 'profile'].includes(state.currentView) && (
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-md border-t border-neutral-100 z-50">
                    <button className="w-full h-16 bg-black text-white font-black rounded-[24px] flex items-center justify-center gap-3 disabled:opacity-20 shadow-2xl transition-all active:scale-[0.98]"
                            disabled={bookingMutation.isPending || (state.currentView === 'services' && state.selectedServices.length === 0) || (state.currentView === 'profile' && (!clientData.name || !clientData.phone))}
                            onClick={() => state.currentView === 'profile' ? bookingMutation.mutate() : state.currentView === 'home' ? state.navigateTo(stepsOrder[0] as Step) : state.navigateTo(state.getNextStep(state.currentView as Step))}
                    >
                        {bookingMutation.isPending ? 'Загрузка...' : state.currentView === 'profile' ? 'Подтвердить запись' : 'Продолжить'}
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            )}
        </div>
    );
}