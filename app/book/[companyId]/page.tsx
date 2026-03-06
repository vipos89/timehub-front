'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, User, Scissors, CheckCircle2, ChevronRight, ChevronLeft, Building2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

const STEPS = ['Филиал', 'Услуга', 'Мастер', 'Дата и время', 'Оформление'];

function BookingWidgetContent() {
    const { companyId } = useParams();
    const searchParams = useSearchParams();
    
    // URL Params
    const urlBranchId = searchParams.get('branchId');
    const urlMasterId = searchParams.get('masterId');

    const [step, setStep] = useState(0);

    // Selection state
    const [selectedBranch, setSelectedBranch] = useState<any>(null);
    const [selectedService, setSelectedService] = useState<any>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [selectedSlot, setSelectedSlot] = useState<any>(null);

    // Guest state
    const [guestName, setGuestName] = useState('');
    const [guestPhone, setGuestPhone] = useState('');

    // Active IDs
    const activeBranchId = urlBranchId || selectedBranch?.id;
    const activeMasterId = urlMasterId;

    // Queries
    const { data: company } = useQuery({
        queryKey: ['company', companyId],
        queryFn: async () => {
            const res = await api.get(`/companies/${companyId}`);
            return res.data;
        },
        enabled: !!companyId,
    });

    const { data: branches, isLoading: isLoadingBranches } = useQuery({
        queryKey: ['branches', companyId],
        queryFn: async () => {
            const res = await api.get(`/companies/${companyId}/branches`);
            return res.data;
        },
        enabled: !!companyId && !urlBranchId && !urlMasterId,
    });

    // Auto-skip branch step if we have branchId in URL or only 1 branch
    useEffect(() => {
        if (urlMasterId) {
            // Master widget skips directly to service selection for that master
            setStep(1); 
        } else if (urlBranchId) {
            // Branch widget skips branch selection
            setStep(1);
        } else if (branches?.length === 1 && step === 0) {
            setSelectedBranch(branches[0]);
            setStep(1);
        } else if (branches?.length > 1 && step === 0 && !selectedBranch) {
            // Needs to select branch
            setStep(0);
        }
    }, [branches, urlBranchId, urlMasterId, step, selectedBranch]);

    const { data: categories } = useQuery({
        queryKey: ['categories', activeBranchId],
        queryFn: async () => {
            // Using companies handler path, typically: /companies/:id/categories is what the old code did
            // Let's use the actual endpoint we saw: /branches/:id/categories
            const res = await api.get(`/branches/${activeBranchId}/categories`);
            return res.data;
        },
        enabled: !!activeBranchId && !activeMasterId,
    });

    const { data: masterServices } = useQuery({
        queryKey: ['employeeServices', activeMasterId],
        queryFn: async () => {
            // Fetch services assigned to this master
            const res = await api.get(`/employees/${activeMasterId}/services`);
            return res.data;
        },
        enabled: !!activeMasterId,
    });

    const { data: masterInfo } = useQuery({
        queryKey: ['employee', activeMasterId],
        queryFn: async () => {
            const res = await api.get(`/employees/${activeMasterId}`);
            return res.data;
        },
        enabled: !!activeMasterId,
    });

    // If activeMasterId is provided, selectedEmployee should be auto-set for slots query
    const targetEmployeeId = activeMasterId || selectedEmployee?.id;

    const { data: slots, isLoading: isLoadingSlots } = useQuery({
        queryKey: ['slots', targetEmployeeId, selectedService?.id, selectedDate],
        queryFn: async () => {
            const dateStr = selectedDate?.toISOString();
            const res = await api.get(`/slots?employee_id=${targetEmployeeId}&service_id=${selectedService.id}&date=${dateStr}`);
            return res.data;
        },
        enabled: !!targetEmployeeId && !!selectedService?.id && !!selectedDate,
    });

    // Mutations
    const bookingMutation = useMutation({
        mutationFn: (data: any) => api.post('/bookings', data),
        onSuccess: () => {
            setStep(4); // Success step
            toast.success('Запись успешно создана!');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Ошибка при бронировании');
        },
    });

    const createCustomerMutation = useMutation({
        mutationFn: (data: any) => api.post('/customers', data),
    });

    const handleBooking = async () => {
        if (!guestName || !guestPhone) {
            toast.error('Пожалуйста, заполните имя и телефон');
            return;
        }

        try {
            // 1. Create or Get Customer
            const customerRes = await createCustomerMutation.mutateAsync({
                first_name: guestName,
                phone: guestPhone,
                branch_id: Number(activeBranchId || 0), // Assuming branch_id is required
                email: '', // Optional for now
            });

            // 2. Create Booking
            bookingMutation.mutate({
                company_id: Number(companyId),
                service_id: selectedService.id,
                employee_id: targetEmployeeId,
                start_time: selectedSlot.start_time,
                end_time: selectedSlot.end_time,
                client_id: customerRes.data.id,
                comment: 'Online booking',
            });
        } catch (err: any) {
            toast.error('Ошибка при создании клиента: ' + (err.response?.data?.error || err.message));
        }
    };

    if (step === 4) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
                <Card className="max-w-md w-full text-center p-8 shadow-xl border-neutral-200">
                    <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto mb-6" />
                    <CardTitle className="text-2xl font-bold text-neutral-900">Вы успешно записаны!</CardTitle>
                    <CardDescription className="mt-4 text-neutral-600">
                        Ждем вас.<br />
                        {format(new Date(selectedSlot.start_time), 'd MMMM, HH:mm', { locale: ru })}
                    </CardDescription>
                    <Button className="mt-8 bg-neutral-900 text-white w-full h-12" onClick={() => window.location.reload()}>
                        Записаться еще
                    </Button>
                </Card>
            </div>
        );
    }

    // Determine current step index considering skipping
    let displayStep = step;
    let actualSteps =STEPS;
    let stepOffset = 0;
    
    if (urlMasterId) {
        actualSteps = ['Услуга', 'Дата и время', 'Оформление'];
        if (step === 1) displayStep = 0;
        if (step === 2) displayStep = 1;
        if (step === 3) displayStep = 2;
    } else if (urlBranchId || (branches?.length === 1)) {
        actualSteps = ['Услуга', 'Мастер', 'Дата и время', 'Оформление'];
        if (step >= 1) displayStep = step - 1;
    } else {
        actualSteps = STEPS;
        displayStep = step;
    }

    const goBack = () => {
        if (urlMasterId && step === 2) setStep(1);
        else if (urlMasterId && step === 3) setStep(2);
        else if (step > 0) {
            // Ensure we don't go back to step 0 if it was skipped
            if (step === 1 && (urlBranchId || branches?.length === 1)) {
                // Cannot go back further
            } else {
                setStep(step - 1);
            }
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50 py-12 px-6">
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight text-neutral-900">{company?.name || 'Запись на услуги'}</h1>
                    <p className="text-neutral-500">{company?.address || 'Онлайн-бронирование'}</p>
                </div>

                {/* Progress bar */}
                <div className="flex justify-between items-center px-2">
                    {actualSteps.map((s, i) => (
                        <div key={s} className="flex flex-col items-center gap-2">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i <= displayStep ? 'bg-neutral-900 text-white scale-110 shadow-md' : 'bg-neutral-200 text-neutral-500'
                                }`}>
                                {i + 1}
                            </div>
                            <span className={`text-[10px] font-semibold uppercase tracking-wider ${i <= displayStep ? 'text-neutral-900' : 'text-neutral-400'}`}>
                                {s}
                            </span>
                        </div>
                    ))}
                </div>

                <Card className="shadow-lg border-neutral-200 overflow-hidden">
                    <CardHeader className="bg-white border-b border-neutral-100 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-bold">{actualSteps[displayStep]}</CardTitle>
                            <CardDescription>Пожалуйста, выберите подходящий вариант</CardDescription>
                        </div>
                        {((step > 0 && !urlMasterId && !urlBranchId && !(branches?.length === 1)) || 
                          (step > 1 && (urlBranchId || branches?.length === 1)) || 
                          (step > 1 && urlMasterId)) && (
                            <Button variant="ghost" className="text-neutral-500 hover:text-neutral-900" onClick={goBack}>
                                <ChevronLeft className="h-4 w-4 mr-1" /> Назад
                            </Button>
                        )}
                    </CardHeader>

                    <CardContent className="p-6">
                        {step === 0 && (!urlBranchId && (!branches || branches.length > 1)) && (
                            <div className="grid gap-3">
                                {isLoadingBranches ? (
                                    <p className="text-center text-sm text-neutral-500 py-10">Загрузка филиалов...</p>
                                ) : (
                                    branches?.map((branch: any) => (
                                        <div
                                            key={branch.id}
                                            onClick={() => { setSelectedBranch(branch); setStep(1); }}
                                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between group ${selectedBranch?.id === branch.id ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-100 hover:border-neutral-300'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-lg bg-neutral-100 flex items-center justify-center group-hover:bg-white transition-colors">
                                                    <Building2 className="h-5 w-5 text-neutral-500" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-neutral-900">{branch.name}</p>
                                                    <p className="text-xs text-neutral-500">{branch.address || 'Адрес не указан'}</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-neutral-300 group-hover:text-neutral-900 transition-colors" />
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {step === 1 && (
                            <div className="grid gap-4">
                                {activeMasterId ? (
                                    // Render services assigned to the master
                                    <div className="space-y-3">
                                        <h3 className="font-bold text-neutral-400 uppercase text-[10px] tracking-widest">
                                            Услуги мастера {masterInfo?.name}
                                        </h3>
                                        <div className="grid gap-3">
                                            {masterServices?.map((empSvc: any) => {
                                                const svc = empSvc.service;
                                                if (!svc) return null;
                                                return (
                                                    <div
                                                        key={svc.id}
                                                        onClick={() => { setSelectedService(svc); setStep(2); }}
                                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between group ${selectedService?.id === svc.id ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-100 hover:border-neutral-300'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="h-10 w-10 rounded-lg bg-neutral-100 flex items-center justify-center group-hover:bg-white transition-colors">
                                                                <Scissors className="h-5 w-5 text-neutral-500" />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-neutral-900">{svc.name}</p>
                                                                <div className="flex items-center gap-2 text-xs text-neutral-500">
                                                                    <span>{empSvc.duration_minutes || svc.duration_minutes} мин</span>
                                                                    <span>•</span>
                                                                    <span className="font-medium text-neutral-900">{empSvc.price || svc.price} </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <ChevronRight className="h-5 w-5 text-neutral-300 group-hover:text-neutral-900 transition-colors" />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    // Render all categories for the branch
                                    categories?.map((cat: any) => (
                                        <div key={cat.id} className="space-y-3">
                                            <h3 className="font-bold text-neutral-400 uppercase text-[10px] tracking-widest">{cat.name}</h3>
                                            <div className="grid gap-3">
                                                {cat.services?.map((svc: any) => (
                                                    <div
                                                        key={svc.id}
                                                        onClick={() => { setSelectedService(svc); setStep(2); }}
                                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between group ${selectedService?.id === svc.id ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-100 hover:border-neutral-300'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="h-10 w-10 rounded-lg bg-neutral-100 flex items-center justify-center group-hover:bg-white transition-colors">
                                                                <Scissors className="h-5 w-5 text-neutral-500" />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-neutral-900">{svc.name}</p>
                                                                <div className="flex items-center gap-2 text-xs text-neutral-500">
                                                                    <span>{svc.duration_minutes} мин</span>
                                                                    <span>•</span>
                                                                    <span className="font-medium text-neutral-900">{svc.price} </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <ChevronRight className="h-5 w-5 text-neutral-300 group-hover:text-neutral-900 transition-colors" />
                                                    </div>
                                                ))}
                                                {(!cat.services || cat.services.length === 0) && (
                                                    <p className="text-xs text-neutral-400 italic px-2">Услуг нет</p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {step === 2 && !urlMasterId && (
                            <div className="grid gap-3">
                                {selectedService?.employees?.map((emp: any) => (
                                    <div
                                        key={emp.id}
                                        onClick={() => { setSelectedEmployee(emp); setStep(3); }}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between hover:border-neutral-300 ${selectedEmployee?.id === emp.id ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-100'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-full bg-neutral-200 overflow-hidden border border-neutral-100">
                                                {/* Avatar Placeholder */}
                                                <User className="h-full w-full p-2 text-neutral-400" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-neutral-900">{emp.name}</p>
                                                <p className="text-xs text-neutral-500">{emp.position}</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-neutral-300" />
                                    </div>
                                ))}
                                {(!selectedService?.employees || selectedService.employees.length === 0) && (
                                    <div className="text-center py-10 text-neutral-400">Нет доступных мастеров для этой услуги</div>
                                )}
                            </div>
                        )}

                        {((step === 2 && urlMasterId) || (step === 3 && !urlMasterId)) && (
                            <div className="flex flex-col md:flex-row gap-8">
                                <div className="flex-1">
                                    <h3 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
                                        <CalendarIcon className="h-4 w-4 text-neutral-400" /> Дата
                                    </h3>
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={setSelectedDate}
                                        locale={ru}
                                        className="rounded-xl border border-neutral-200 p-3"
                                    />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-neutral-900 mb-4 flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-neutral-400" /> Время
                                    </h3>
                                    <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2">
                                        {slots?.map((slot: any, i: number) => (
                                            <Button
                                                key={i}
                                                variant={selectedSlot === slot ? 'default' : 'outline'}
                                                disabled={!slot.is_free}
                                                className={`h-10 transition-all ${selectedSlot === slot ? 'bg-neutral-900 text-white' : 'border-neutral-200 text-neutral-700'
                                                    }`}
                                                onClick={() => setSelectedSlot(slot)}
                                            >
                                                {format(new Date(slot.start_time), 'HH:mm')}
                                            </Button>
                                        ))}
                                        {isLoadingSlots && <p className="col-span-2 text-center text-sm text-neutral-500 py-10">Поиск слотов...</p>}
                                        {!slots?.length && !isLoadingSlots && <p className="col-span-2 text-center text-sm text-neutral-400 py-10 italic">На этот день нет свободных окон</p>}
                                    </div>
                                    {selectedSlot && (
                                        <Button className="w-full mt-6 bg-neutral-900 hover:bg-neutral-800 h-12" onClick={() => setStep(urlMasterId ? 3 : 4)}>
                                            Далее <ChevronRight className="h-4 w-4 ml-2" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}

                        {((step === 3 && urlMasterId) || (step === 4 && !urlMasterId)) && (
                            <div className="space-y-6">
                                <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-4">
                                    <h3 className="font-bold text-lg text-neutral-900">Ваш заказ</h3>
                                    <div className="flex items-start gap-4">
                                        <Scissors className="h-5 w-5 text-neutral-400 mt-1" />
                                        <div>
                                            <p className="text-xs text-neutral-500 uppercase font-bold tracking-widest">Услуга</p>
                                            <p className="font-bold text-neutral-900">{selectedService.name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <User className="h-5 w-5 text-neutral-400 mt-1" />
                                        <div>
                                            <p className="text-xs text-neutral-500 uppercase font-bold tracking-widest">Мастер</p>
                                            <p className="font-bold text-neutral-900">
                                                {urlMasterId ? masterInfo?.name : selectedEmployee?.name}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <CalendarIcon className="h-5 w-5 text-neutral-400 mt-1" />
                                        <div>
                                            <p className="text-xs text-neutral-500 uppercase font-bold tracking-widest">Дата и время</p>
                                            <p className="font-bold text-neutral-900">
                                                {format(new Date(selectedSlot.start_time), 'd MMMM, HH:mm', { locale: ru })}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="font-bold text-lg text-neutral-900">Ваши данные</h3>
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Имя</Label>
                                        <Input
                                            id="name"
                                            placeholder="Как к вам обращаться"
                                            value={guestName}
                                            onChange={(e) => setGuestName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Телефон</Label>
                                        <Input
                                            id="phone"
                                            placeholder="+7 (999) 000-00-00"
                                            value={guestPhone}
                                            onChange={(e) => setGuestPhone(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4">
                                    <Button className="w-full h-14 bg-neutral-900 text-white hover:bg-neutral-800 text-lg font-bold shadow-lg" onClick={handleBooking} disabled={bookingMutation.isPending || createCustomerMutation.isPending}>
                                        {(bookingMutation.isPending || createCustomerMutation.isPending) ? 'Оформление...' : 'Подтвердить запись'}
                                    </Button>
                                    <p className="text-[10px] text-center text-neutral-400 uppercase tracking-widest font-semibold">
                                        Нажимая кнопку, вы соглашаетесь с правилами сервиса
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function BookingPageWrapper() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-neutral-50 py-12 px-6 flex justify-center"><p>Загрузка...</p></div>}>
            <BookingWidgetContent />
        </Suspense>
    );
}
