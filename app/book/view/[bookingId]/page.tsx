'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
    Calendar, MapPin, User, Scissors, Clock, 
    ArrowLeft, X, CheckCircle2, AlertCircle, 
    CalendarPlus, Navigation, Phone, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { DateTime } from 'luxon';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function BookingViewPage() {
    const { bookingId } = useParams();
    const router = useRouter();
    const [isCancelling, setIsCancelling] = useState(false);

    // 1. Fetch Booking Info
    const { data: booking, isLoading, error } = useQuery({
        queryKey: ['booking', bookingId],
        queryFn: async () => {
            const res = await api.get(`/appointments/${bookingId}`);
            return res.data;
        },
        enabled: !!bookingId,
    });

    // 2. Cancel Mutation
    const cancelMutation = useMutation({
        mutationFn: () => api.patch(`/appointments/${bookingId}/status`, { status: 'cancelled' }),
        onSuccess: () => {
            toast.success('Запись успешно отменена');
            setIsCancelling(false);
            window.location.reload();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Не удалось отменить запись');
        }
    });

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full" />
            </div>
        );
    }

    if (error || !booking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6 text-center">
                <Card className="max-w-md w-full p-8 rounded-[2.5rem] shadow-2xl">
                    <AlertCircle className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                    <CardTitle className="text-2xl font-black uppercase">Запись не найдена</CardTitle>
                    <p className="text-neutral-500 mt-2">Ссылка недействительна или запись была удалена.</p>
                    <Button className="mt-8 bg-black text-white w-full h-14 rounded-2xl font-bold" onClick={() => router.push('/')}>
                        На главную
                    </Button>
                </Card>
            </div>
        );
    }

    const startTime = DateTime.fromISO(booking.start_time).setLocale('ru');
    const isPast = startTime < DateTime.now();
    const canCancel = !isPast && booking.status !== 'cancelled';

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending': return { label: 'Ожидает подтверждения', color: 'bg-amber-100 text-amber-700', icon: Clock };
            case 'confirmed': return { label: 'Подтверждена', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 };
            case 'cancelled': return { label: 'Отменена', color: 'bg-rose-100 text-rose-700', icon: X };
            case 'no_show': return { label: 'Вы не пришли', color: 'bg-neutral-100 text-neutral-700', icon: AlertCircle };
            case 'finished': return { label: 'Завершена', color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 };
            default: return { label: status, color: 'bg-neutral-100 text-neutral-700', icon: Clock };
        }
    };

    const status = getStatusInfo(booking.status);

    return (
        <div className="min-h-screen bg-neutral-50 pb-20">
            {/* STICKY HEADER */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-100 px-6 py-4">
                <div className="max-w-lg mx-auto flex items-center justify-between">
                    <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Детали записи #{bookingId}</span>
                    <div className="w-10" /> {/* Spacer */}
                </div>
            </header>

            <main className="max-w-lg mx-auto px-6 pt-8 space-y-6">
                {/* STATUS BADGE */}
                <div className="flex justify-center">
                    <Badge className={cn("px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider border-none", status.color)}>
                        <status.icon className="h-3.5 w-3.5 mr-2" />
                        {status.label}
                    </Badge>
                </div>

                {/* MAIN INFO CARD */}
                <Card className="border-none shadow-2xl shadow-neutral-200/50 rounded-[2.5rem] overflow-hidden bg-white">
                    <div className="bg-black text-white p-10 text-center space-y-2">
                        <h1 className="text-5xl font-black tracking-tighter leading-none">
                            {startTime.toFormat('HH:mm')}
                        </h1>
                        <p className="text-lg font-bold opacity-60 uppercase tracking-widest">
                            {startTime.toFormat('d MMMM, cccc')}
                        </p>
                    </div>

                    <CardContent className="p-8 space-y-8">
                        {/* WHERE */}
                        <div className="flex gap-5">
                            <div className="h-14 w-14 bg-neutral-50 rounded-2xl flex items-center justify-center shrink-0">
                                <MapPin className="h-6 w-6 text-black" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Место</p>
                                <h3 className="text-xl font-bold truncate leading-tight">{booking.branch_name || 'Наш филиал'}</h3>
                                <p className="text-neutral-500 font-medium text-sm mt-1">{booking.branch_address || 'Адрес уточняется'}</p>
                                <div className="flex gap-2 mt-4">
                                    <Button variant="outline" className="rounded-xl h-10 text-xs font-bold gap-2 flex-1" onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(booking.branch_address)}`, '_blank')}>
                                        <Navigation className="h-3.5 w-3.5" /> Карта
                                    </Button>
                                    <Button variant="outline" className="rounded-xl h-10 text-xs font-bold gap-2 flex-1">
                                        <Phone className="h-3.5 w-3.5" /> Позвонить
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* WHO */}
                        <div className="flex gap-5">
                            <div className="h-14 w-14 bg-neutral-50 rounded-2xl flex items-center justify-center shrink-0">
                                <User className="h-6 w-6 text-black" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Мастер</p>
                                <h3 className="text-xl font-bold leading-tight">{booking.employee_name || 'Любой свободный'}</h3>
                                <p className="text-neutral-500 font-medium text-sm mt-1">Топ-специалист</p>
                            </div>
                        </div>

                        {/* SERVICES */}
                        <div className="flex gap-5">
                            <div className="h-14 w-14 bg-neutral-50 rounded-2xl flex items-center justify-center shrink-0">
                                <Scissors className="h-6 w-6 text-black" />
                            </div>
                            <div className="flex-1 space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Услуги</p>
                                {booking.services?.map((svc: any) => (
                                    <div key={svc.id} className="flex justify-between items-center">
                                        <span className="font-bold text-sm">{svc.service_name}</span>
                                        <span className="font-black text-sm">{svc.price}</span>
                                    </div>
                                ))}
                                <div className="pt-3 border-t border-dashed border-neutral-100 flex justify-between items-center">
                                    <span className="text-xs font-black uppercase opacity-40">Итого</span>
                                    <span className="text-2xl font-black">{booking.total_price}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ACTIONS */}
                <div className="space-y-3">
                    <Button 
                        className="w-full h-16 bg-[#F5FF82] text-black rounded-[20px] font-black uppercase tracking-widest hover:bg-[#ebf578] transition-all shadow-xl shadow-lime-500/10"
                        onClick={() => {
                            const title = `Запись в ${booking.branch_name}`;
                            const start = startTime.toFormat("yyyyMMdd'T'HHmmss");
                            const end = startTime.plus({ minutes: 60 }).toFormat("yyyyMMdd'T'HHmmss");
                            window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start}/${end}`, '_blank');
                        }}
                    >
                        <CalendarPlus className="mr-3 h-6 w-6" />
                        Добавить в календарь
                    </Button>

                    {canCancel && (
                        <Button 
                            variant="ghost" 
                            className="w-full h-16 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-[20px] font-bold"
                            onClick={() => setIsCancelling(true)}
                        >
                            <X className="mr-2 h-5 w-5" />
                            Отменить запись
                        </Button>
                    )}
                </div>

                <p className="text-center text-[10px] font-bold text-neutral-300 uppercase tracking-widest px-10">
                    Если у вас изменятся планы, пожалуйста, сообщите нам об этом заранее.
                </p>
            </main>

            {/* CANCELLATION DIALOG */}
            {isCancelling && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCancelling(false)} />
                    <Card className="relative w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
                        <div className="p-8 text-center space-y-6">
                            <div className="h-20 w-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500">
                                <AlertCircle className="h-10 w-10" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black uppercase tracking-tight">Отменить запись?</h3>
                                <p className="text-neutral-500 font-medium">Это действие нельзя будет отменить. Вы уверены?</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Button variant="outline" className="h-14 rounded-2xl font-bold" onClick={() => setIsCancelling(false)}>
                                    Назад
                                </Button>
                                <Button 
                                    className="h-14 rounded-2xl font-black bg-rose-500 text-white hover:bg-rose-600"
                                    onClick={() => cancelMutation.mutate()}
                                    disabled={cancelMutation.isPending}
                                >
                                    {cancelMutation.isPending ? "..." : "Да, отменить"}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
