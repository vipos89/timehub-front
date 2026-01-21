'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, User, Scissors, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

const STEPS = ['Услуга', 'Мастер', 'Дата и время', 'Подтверждение'];

export default function BookingPage() {
    const { companyId } = useParams();
    const [step, setStep] = useState(0);

    // Selection state
    const [selectedService, setSelectedService] = useState<any>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [selectedSlot, setSelectedSlot] = useState<any>(null);

    // Queries
    const { data: company } = useQuery({
        queryKey: ['company', companyId],
        queryFn: async () => {
            const res = await api.get(`/companies/${companyId}`);
            return res.data;
        },
        enabled: !!companyId,
    });

    const { data: categories } = useQuery({
        queryKey: ['categories', companyId],
        queryFn: async () => {
            const res = await api.get(`/companies/${companyId}/categories`);
            return res.data;
        },
        enabled: !!companyId,
    });

    const { data: slots, isLoading: isLoadingSlots } = useQuery({
        queryKey: ['slots', selectedEmployee?.id, selectedService?.id, selectedDate],
        queryFn: async () => {
            const dateStr = selectedDate?.toISOString();
            const res = await api.get(`/slots?employee_id=${selectedEmployee.id}&service_id=${selectedService.id}&date=${dateStr}`);
            return res.data;
        },
        enabled: !!selectedEmployee?.id && !!selectedService?.id && !!selectedDate,
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

    const handleBooking = () => {
        bookingMutation.mutate({
            company_id: Number(companyId),
            service_id: selectedService.id,
            employee_id: selectedEmployee.id,
            start_time: selectedSlot.start_time,
            end_time: selectedSlot.end_time,
            client_id: 1, // Mock client ID for now
        });
    };

    if (step === 4) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
                <Card className="max-w-md w-full text-center p-8 shadow-xl border-neutral-200">
                    <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto mb-6" />
                    <CardTitle className="text-2xl font-bold text-neutral-900">Вы успешно записаны!</CardTitle>
                    <CardDescription className="mt-4 text-neutral-600">
                        Ждем вас в <strong>{company?.name}</strong>.<br />
                        {format(new Date(selectedSlot.start_time), 'd MMMM, HH:mm', { locale: ru })}
                    </CardDescription>
                    <Button className="mt-8 bg-neutral-900 text-white w-full h-12" onClick={() => window.location.reload()}>
                        Вернуться назад
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-50 py-12 px-6">
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight text-neutral-900">{company?.name || 'Запись на услуги'}</h1>
                    <p className="text-neutral-500">{company?.address || 'Онлайн-бронирование'}</p>
                </div>

                {/* Progress bar */}
                <div className="flex justify-between items-center px-2">
                    {STEPS.map((s, i) => (
                        <div key={s} className="flex flex-col items-center gap-2">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i <= step ? 'bg-neutral-900 text-white scale-110 shadow-md' : 'bg-neutral-200 text-neutral-500'
                                }`}>
                                {i + 1}
                            </div>
                            <span className={`text-[10px] font-semibold uppercase tracking-wider ${i <= step ? 'text-neutral-900' : 'text-neutral-400'}`}>
                                {s}
                            </span>
                        </div>
                    ))}
                </div>

                <Card className="shadow-lg border-neutral-200 overflow-hidden">
                    <CardHeader className="bg-white border-b border-neutral-100 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-bold">{STEPS[step]}</CardTitle>
                            <CardDescription>Пожалуйста, выберите подходящий вариант</CardDescription>
                        </div>
                        {step > 0 && (
                            <Button variant="ghost" className="text-neutral-500 hover:text-neutral-900" onClick={() => setStep(step - 1)}>
                                <ChevronLeft className="h-4 w-4 mr-1" /> Назад
                            </Button>
                        )}
                    </CardHeader>

                    <CardContent className="p-6">
                        {step === 0 && (
                            <div className="grid gap-4">
                                {categories?.map((cat: any) => (
                                    <div key={cat.id} className="space-y-3">
                                        <h3 className="font-bold text-neutral-400 uppercase text-[10px] tracking-widest">{cat.name}</h3>
                                        <div className="grid gap-3">
                                            {cat.services?.map((svc: any) => (
                                                <div
                                                    key={svc.id}
                                                    onClick={() => { setSelectedService(svc); setStep(1); }}
                                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between group ${selectedService?.id === svc.id ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-100 hover:border-neutral-300'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 rounded-lg bg-neutral-100 flex items-center justify-center group-hover:bg-white transition-colors">
                                                            <Scissors className="h-5 w-5 text-neutral-500" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-neutral-900">{svc.name}</p>
                                                            <p className="text-xs text-neutral-500">{svc.description || '30 минут'}</p>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="h-5 w-5 text-neutral-300 group-hover:text-neutral-900 transition-colors" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {step === 1 && (
                            <div className="grid gap-3">
                                {selectedService?.employees?.map((emp: any) => (
                                    <div
                                        key={emp.id}
                                        onClick={() => { setSelectedEmployee(emp); setStep(2); }}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between hover:border-neutral-300 ${selectedEmployee?.id === emp.id ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-100'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-full bg-neutral-200 overflow-hidden border border-neutral-100">
                                                {/* Avatar Placeholder */}
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

                        {step === 2 && (
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
                                        <Button className="w-full mt-6 bg-neutral-900 hover:bg-neutral-800 h-12" onClick={() => setStep(3)}>
                                            Далее <ChevronRight className="h-4 w-4 ml-2" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-6">
                                <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-100 space-y-4">
                                    <div className="flex items-start gap-4">
                                        <Scissors className="h-5 w-5 text-neutral-400 mt-1" />
                                        <div>
                                            <p className="text-xs text-neutral-500 uppercase font-bold tracking-widest">Услуга</p>
                                            <p className="font-bold text-neutral-900 text-lg">{selectedService.name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <User className="h-5 w-5 text-neutral-400 mt-1" />
                                        <div>
                                            <p className="text-xs text-neutral-500 uppercase font-bold tracking-widest">Мастер</p>
                                            <p className="font-bold text-neutral-900 text-lg">{selectedEmployee.name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <CalendarIcon className="h-5 w-5 text-neutral-400 mt-1" />
                                        <div>
                                            <p className="text-xs text-neutral-500 uppercase font-bold tracking-widest">Дата и время</p>
                                            <p className="font-bold text-neutral-900 text-lg">
                                                {format(new Date(selectedSlot.start_time), 'd MMMM, HH:mm', { locale: ru })}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Button className="w-full h-14 bg-neutral-900 text-white hover:bg-neutral-800 text-lg font-bold shadow-lg" onClick={handleBooking} disabled={bookingMutation.isPending}>
                                        {bookingMutation.isPending ? 'Оформление...' : 'Подтвердить запись'}
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
