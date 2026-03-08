'use client';

import { useState, useMemo } from 'react';
import { X, ChevronRight, User, Scissors, Calendar, ArrowLeft, Check, CheckCircle2, Plus, Users, MapPin, Clock, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { DateTime } from 'luxon';
import { EmployeeAvailableSlots } from './EmployeeAvailableSlots';
import { cn } from '@/lib/utils';
import { useBookingLogic, Step } from './useBookingLogic';

export function BookingWidget({ 
    company, 
    branch, 
    branches = [], 
    employees = [], 
    services = [], 
    categories = [], 
    settings, 
    onClose,
    onBranchSelect,
    isLoadingData
}: any) {
    const queryClient = useQueryClient();
    const config = useMemo(() => {
        if (typeof settings === 'string') { try { return JSON.parse(settings); } catch (e) { return {}; } }
        return settings || {};
    }, [settings]);

    const stepsOrder = useMemo(() => {
        const base = config.stepsOrder || ['datetime', 'services', 'specialist'];
        if (config.widgetType === 'master') return base.filter(s => s !== 'specialist');
        return base;
    }, [config.stepsOrder, config.widgetType]);

    const slotStep = config.slotStep || 30;

    const state = useBookingLogic({ 
        initialEmployees: employees, 
        initialServices: services, 
        stepsOrder, 
        branch, 
        slotStep,
        onBranchSelect
    });

    const [clientData, setClientData] = useState({ name: '', phone: '', comment: '' });

    const bookingMutation = useMutation({
        mutationFn: async () => {
            const customerRes = await api.post('/customers', { 
                company_id: company.id, 
                branch_id: branch.id, 
                first_name: clientData.name, 
                phone: clientData.phone 
            });
            const empId = state.selectedEmployee?.id;
            const payload = {
                company_id: company.id, 
                branch_id: branch.id, 
                employee_id: empId, 
                client_id: customerRes.data.customer.id,
                start_time: state.selectedSlot.start_time,
                end_time: DateTime.fromISO(state.selectedSlot.start_time).plus({ minutes: state.totalDuration }).toISO(),
                comment: clientData.comment, 
                total_price: state.totalPrice,
                booking_source: 'widget',
                widget_code: (typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : ''),
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
        }
    });

    const isNextDisabled = () => {
        if (bookingMutation.isPending || isLoadingData) return true;
        if (state.currentView === 'services') return state.selectedServices.length === 0;
        if (state.currentView === 'datetime') return !state.selectedSlot;
        if (state.currentView === 'specialist') return !state.selectedEmployee;
        if (state.currentView === 'profile') return !clientData.name || !clientData.phone || !state.isBookingReady;
        return false;
    };

    return (
        <div className="w-full h-full relative overflow-hidden flex flex-col bg-white" style={{ borderRadius: `${config.borderRadius || 28}px` }}>
            <div className="shrink-0 px-6 pt-6 flex items-center justify-between z-50">
                <button onClick={state.goBack} className="p-2.5 bg-neutral-100 rounded-xl transition-all active:scale-90 shadow-sm text-neutral-600"><ArrowLeft className="h-5 w-5" /></button>
                <button onClick={() => { state.reset(); onClose?.(); }} className="p-2.5 bg-neutral-100 rounded-xl active:scale-90 shadow-sm text-neutral-600"><X className="h-5 w-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-32 pt-2">
                {isLoadingData && state.currentView !== 'branches' ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-neutral-400">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Загрузка данных филиала...</span>
                    </div>
                ) : (
                    <>
                    {state.currentView === 'home' && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            {/* HEADER: Specialist (Master mode) or Branch/Company */}
                            <div className="relative pt-4 px-1">
                                <div className="flex items-start justify-between gap-4">
                                    <div 
                                        className={cn(
                                            "flex flex-col gap-1 transition-all",
                                            config.widgetType === 'network' ? "cursor-pointer group active:opacity-70" : ""
                                        )}
                                        onClick={() => config.widgetType === 'network' && state.navigateTo('branches')}
                                    >
                                        <div className="flex items-center gap-2">
                                            <h1 className="text-2xl font-black text-neutral-900 tracking-tight leading-tight">
                                                {config.widgetType === 'master' ? (state.selectedEmployee?.name || company?.name) : (branch?.name || company?.name || 'Выбрать филиал')}
                                            </h1>
                                            {config.widgetType === 'network' && (
                                                <ChevronRight className="h-5 w-5 text-neutral-300 rotate-90 mt-1 group-hover:text-black transition-colors" />
                                            )}
                                        </div>
                                        <p className="text-xs font-medium text-neutral-400 leading-relaxed max-w-[280px]">
                                            {config.widgetType === 'master' ? (state.selectedEmployee?.position || 'Специалист') : (branch?.address || company?.description || 'Выберите филиал для записи')}
                                        </p>
                                    </div>
                                    {config.widgetType === 'master' && state.selectedEmployee?.avatar_url ? (
                                        <Avatar className="h-14 w-14 rounded-full border-2 border-white shadow-xl flex-shrink-0">
                                            <AvatarImage src={state.selectedEmployee.avatar_url} />
                                            <AvatarFallback className="bg-black text-white">{state.selectedEmployee.name[0]}</AvatarFallback>
                                        </Avatar>
                                    ) : (
                                        <button className="p-3 bg-neutral-50 rounded-full text-neutral-400 hover:bg-neutral-100 transition-colors flex-shrink-0">
                                            <User className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3">
                                {stepsOrder.map((step) => {
                                    const Icon = step === 'specialist' ? User : step === 'services' ? Scissors : Calendar;
                                    const label = step === 'specialist' ? 'Мастер' : step === 'services' ? 'Услуги' : 'Время';
                                    const value = step === 'specialist' ? (state.selectedEmployee?.name || 'Любой') : 
                                                 step === 'services' ? (state.selectedServices.length ? `${state.selectedServices.length} выбрано` : 'Выбрать') : 
                                                 state.selectedSlot ? DateTime.fromISO(state.selectedSlot.start_time).setZone(branch?.timezone).setLocale('ru').toFormat('HH:mm, d MMM') : 'Выбрать';

                                    return (
                                        <div key={step} onClick={() => state.navigateTo(step as Step)} className="p-6 flex items-center justify-between border-2 border-neutral-100 rounded-[24px] cursor-pointer hover:border-black transition-all bg-white group shadow-sm">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-neutral-50 rounded-2xl text-neutral-900"><Icon className="h-6 w-6 opacity-40" /></div>
                                                <div className="flex flex-col text-left">
                                                    <span className="text-[10px] font-black uppercase opacity-30">{label}</span>
                                                    <span className="font-bold text-sm text-neutral-900">{value}</span>
                                                </div>
                                            </div>
                                            <ChevronRight className="h-5 w-5 opacity-20" />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {state.currentView === 'branches' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h2 className="text-2xl font-black text-neutral-900 px-1">Выберите филиал</h2>
                            <div className="space-y-3">
                                {branches.map((b: any) => (
                                    <div 
                                        key={b.id} 
                                        onClick={() => state.handleSelectBranch(b.id)}
                                        className={cn(
                                            "p-6 border-2 rounded-[28px] transition-all flex flex-col gap-1 shadow-sm cursor-pointer",
                                            branch?.id === b.id ? "border-black bg-white" : "border-neutral-100 bg-white hover:border-neutral-300"
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="font-black text-neutral-900 text-lg leading-tight">{b.name}</span>
                                                <span className="text-xs font-bold text-neutral-400">{b.address}</span>
                                            </div>
                                            {branch?.id === b.id && <div className="h-6 w-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm"><Check className="h-4 w-4 text-white" /></div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {state.currentView === 'specialist' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h2 className="text-2xl font-black text-neutral-900 px-1">Выберите мастера</h2>
                            <div className="space-y-3 pb-24">
                                {state.employeesWithStatus.map((emp: any) => {
                                    const isSelected = state.selectedEmployee?.id === emp.id;
                                    const canSelect = emp.canAcceptBooking;
                                    const hasSlots = emp.nearestSlots?.length > 0;
                                    return (
                                        <div key={emp.id} className={cn("p-4 border-2 rounded-[28px] transition-all flex flex-col gap-4 shadow-sm", isSelected ? "border-black bg-white shadow-md" : "border-neutral-100 bg-white", !canSelect && !hasSlots && "opacity-50 grayscale-[0.5] bg-neutral-50/50")}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4 cursor-pointer" onClick={() => canSelect && state.handleSelectSpecialist(emp)}>
                                                    {emp.id === 'any' ? <div className="h-12 w-12 rounded-full bg-neutral-900 flex items-center justify-center text-white shadow-md"><Users className="h-6 w-6" /></div> : <Avatar className="h-12 w-12 border-2 border-white shadow-sm"><AvatarImage src={emp.avatar_url} /><AvatarFallback>{emp.name[0]}</AvatarFallback></Avatar>}
                                                    <div className="flex flex-col text-left"><span className="font-bold text-neutral-900">{emp.name}</span><span className="text-[10px] uppercase font-black opacity-40">{canSelect ? emp.position : emp.reason}</span></div>
                                                </div>
                                                {isSelected && <div className="h-6 w-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm"><Check className="h-4 w-4 text-white" /></div>}
                                            </div>
                                            {hasSlots && (
                                                <div className="space-y-2 pt-2 border-t border-neutral-50">
                                                    <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-tight">Ближайшее время: <span className="text-neutral-900">{emp.displayDateLabel}</span></div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {emp.nearestSlots.map((slot: any) => (
                                                            <button key={slot.start_time} onClick={(e) => { e.stopPropagation(); state.handleSelectSlot(slot, emp.id); }} className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95", state.selectedSlot?.start_time === slot.start_time ? "bg-black text-white shadow-md" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200")}>{DateTime.fromISO(slot.start_time).setZone(branch?.timezone || 'Europe/Minsk').toFormat('HH:mm')}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {state.currentView === 'services' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h2 className="text-2xl font-black text-neutral-900 px-1">Выберите услуги</h2>
                            {categories.map((cat: any) => {
                                const catServices = (state.availableServices || []).filter((s: any) => s.category_id === cat.id);
                                if (catServices.length === 0) return null;
                                return (
                                    <div key={cat.id} className="space-y-3">
                                        <h3 className="text-[10px] font-black uppercase opacity-30 pl-2 tracking-widest">{cat.name}</h3>
                                        {catServices.map((svc: any) => (
                                            <div key={svc.id} onClick={() => state.handleSelectService(svc)} className={cn("p-5 border-2 rounded-[24px] cursor-pointer flex items-center justify-between transition-all bg-white shadow-sm", state.selectedServices.some(s => s.id === svc.id) ? "border-black bg-neutral-50" : "border-neutral-100", !svc.canDo && "opacity-40 grayscale cursor-not-allowed")}>
                                                <div className="flex flex-col gap-1"><span className="font-bold text-neutral-900">{svc.name}</span><span className="text-xs font-medium opacity-40">{svc.canDo ? `${state.getSvcDuration(svc, state.selectedEmployee?.id)} мин • ${svc.price} BYN` : svc.reason}</span></div>
                                                {state.selectedServices.some(s => s.id === svc.id) ? <div className="h-10 w-10 bg-black text-white rounded-2xl flex items-center justify-center shadow-inner"><Check className="h-5 w-5" /></div> : <div className="h-10 w-10 bg-neutral-50 text-neutral-400 rounded-2xl flex items-center justify-center"><Plus className="h-5 w-5" /></div>}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {state.currentView === 'datetime' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 px-1">
                            <h2 className="text-2xl font-black text-neutral-900 px-1">Выберите время</h2>
                            <EmployeeAvailableSlots
                                employeeIds={(state.selectedEmployee && state.selectedEmployee.id !== 'any') ? state.selectedEmployee.id : employees.map((e: any) => e.id).join(',')}
                                duration={state.totalDuration} timezone={branch?.timezone} step={slotStep}
                                selectedDate={state.viewedDate} onDateChange={state.setViewedDate}
                                onSlotSelect={(slot) => state.handleSelectSlot(slot, state.selectedEmployee?.id)}
                                selectedSlotTime={state.selectedSlot?.start_time}
                            />
                        </div>
                    )}

                    {state.currentView === 'profile' && (
                        <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-24 px-1">
                            <h2 className="text-2xl font-black text-neutral-900">Ваши данные</h2>
                            {state.selectedSlot && (
                                <div className="p-5 bg-neutral-50 rounded-[32px] border border-neutral-100 space-y-4 shadow-sm animate-in slide-in-from-top-2">
                                    <div className="flex items-center justify-between border-b border-neutral-200/50 pb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-neutral-100"><Calendar className="h-5 w-5 text-neutral-400" /></div>
                                            <div className="flex flex-col"><span className="text-[10px] font-black uppercase opacity-30 leading-none mb-1">Запись на</span><span className="font-bold text-xs text-neutral-900 leading-none">{DateTime.fromISO(state.selectedSlot.start_time).setZone(branch?.timezone).setLocale('ru').toFormat('d MMMM, HH:mm')}</span></div>
                                        </div>
                                        <div className="flex flex-col text-right"><span className="text-[10px] font-black uppercase opacity-30 leading-none mb-1">Итого</span><span className="font-bold text-xs text-neutral-900 leading-none">{state.totalPrice} BYN</span></div>
                                    </div>
                                    <div className="flex items-center gap-3"><Avatar className="h-6 w-6 rounded-full border border-white shadow-sm"><AvatarImage src={state.selectedEmployee?.avatar_url} /><AvatarFallback className="text-[8px] bg-neutral-200">{state.selectedEmployee?.name?.[0]}</AvatarFallback></Avatar><span className="text-xs font-bold text-neutral-600">Мастер: <span className="text-neutral-900">{state.selectedEmployee?.name || 'Назначим специалиста'}</span></span></div>
                                    <div className="space-y-1.5 pt-1">
                                        {state.selectedServices.map((svc: any) => (
                                            <div key={svc.id} className="flex justify-between items-center text-[10px] font-bold text-neutral-500"><span className="flex items-center gap-1.5"><div className="h-1 w-1 rounded-full bg-neutral-300" />{svc.name}</span><span className="text-neutral-900">{state.getSvcPrice(svc, state.selectedEmployee?.id)} BYN</span></div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="space-y-4">
                                <Input className="h-14 rounded-2xl border-2 shadow-sm px-5" value={clientData.name} onChange={e => setClientData({...clientData, name: e.target.value})} placeholder="Ваше имя" />
                                <Input className="h-14 rounded-2xl border-2 shadow-sm px-5" value={clientData.phone} onChange={e => setClientData({...clientData, phone: e.target.value})} placeholder="+375 (__) ___-__-__" />
                                <Textarea className="rounded-2xl border-2 min-h-[100px] shadow-sm p-5" value={clientData.comment} onChange={e => setClientData({...clientData, comment: e.target.value})} placeholder="Добавить комментарий к записи..." />
                            </div>
                        </div>
                    )}

                    {state.currentView === 'success' && (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-8 pt-10 animate-in zoom-in duration-500 pb-20">
                            <div className="h-24 w-24 bg-emerald-50 rounded-[40px] flex items-center justify-center shadow-inner"><CheckCircle2 className="h-12 w-12 text-emerald-500" /></div>
                            <div className="space-y-2"><h2 className="text-3xl font-black text-neutral-900 tracking-tight">Запись создана!</h2><p className="text-neutral-400 font-medium">Ждем вас в назначенное время</p></div>
                            <div className="w-full bg-neutral-50 rounded-[32px] p-6 space-y-6 border border-neutral-100 text-left">
                                <div className="flex items-center gap-4 border-b border-neutral-200 pb-4"><div className="h-10 w-10 rounded-xl bg-black flex items-center justify-center text-white"><MapPin className="h-5 w-5" /></div><div className="flex flex-col"><span className="text-[10px] font-black uppercase opacity-40">Где</span><span className="font-bold text-neutral-900 leading-tight">{branch?.name || company?.name}</span><span className="text-[11px] text-neutral-500 font-medium">{branch?.address || 'Адрес не указан'}</span></div></div>
                                <div className="flex items-center gap-4"><div className="h-10 w-10 rounded-xl bg-neutral-200/50 flex items-center justify-center"><User className="h-5 w-5 text-neutral-400" /></div><div className="flex flex-col"><span className="text-[10px] font-black uppercase opacity-40">Мастер</span><span className="font-bold text-neutral-900 leading-tight">{state.selectedEmployee?.name}</span></div></div>
                                <div className="flex items-center gap-4"><div className="h-10 w-10 rounded-xl bg-neutral-200/50 flex items-center justify-center"><Clock className="h-5 w-5 text-neutral-400" /></div><div className="flex flex-col"><span className="text-[10px] font-black uppercase opacity-40">Когда</span><span className="font-bold text-neutral-900 leading-tight capitalize">{state.selectedSlot ? DateTime.fromISO(state.selectedSlot.start_time).setZone(branch?.timezone).setLocale('ru').toFormat('cccc, d MMMM • HH:mm') : ''}</span></div></div>
                                <div className="space-y-3 pt-2 border-t border-neutral-200"><span className="text-[10px] font-black uppercase opacity-40">Услуги</span><div className="space-y-2">{state.selectedServices.map((svc: any) => (<div key={svc.id} className="flex justify-between items-center text-[13px] font-bold text-neutral-900"><span className="opacity-80">{svc.name}</span><span>{state.getSvcPrice(svc, state.selectedEmployee?.id)} BYN</span></div>))}</div></div>
                            </div>
                            <Button onClick={() => { state.reset(); onClose?.(); }} className="w-full h-16 bg-neutral-900 text-white rounded-[24px] font-bold shadow-xl active:scale-95 transition-transform">На главную</Button>
                        </div>
                    )}

                    {/* BRAND LOGO: Works on TimeHub */}
                    <div className="pt-12 pb-8 flex items-center justify-center gap-1.5 opacity-20 grayscale hover:opacity-50 hover:grayscale-0 transition-all cursor-default select-none group">
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-500">Работает на</span>
                        <div className="flex items-center gap-1.5">
                            <div className="h-5 w-5 bg-black rounded-lg flex items-center justify-center shadow-sm">
                                <div className="w-1.5 h-1.5 bg-[#F5FF82] rounded-full animate-pulse group-hover:scale-110 transition-transform" />
                            </div>
                            <span className="text-[11px] font-black tracking-tighter text-black uppercase">TimeHub</span>
                        </div>
                    </div>
                    </>
                )}
            </div>

            {['home', 'branches', 'services', 'specialist', 'datetime', 'profile'].includes(state.currentView) && (
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-md border-t border-neutral-100 z-50">
                    <button className="w-full h-16 bg-black text-white font-black rounded-[24px] flex items-center justify-center gap-3 disabled:opacity-20 shadow-2xl transition-all active:scale-[0.98]"
                            disabled={isNextDisabled()}
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
