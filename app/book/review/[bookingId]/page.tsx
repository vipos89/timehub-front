'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Star, CheckCircle2, MessageSquare, ArrowRight, X, User, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { DateTime } from 'luxon';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function ReviewPage() {
    const { bookingId } = useParams();
    const router = useRouter();
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [isExpired, setIsExpired] = useState(false);

    // 1. Fetch Booking Info
    const { data: booking, isLoading: isLoadingBooking, error: bookingError } = useQuery({
        queryKey: ['booking', bookingId],
        queryFn: async () => {
            try {
                const res = await api.get(`/bookings/public/${bookingId}`);
                return res.data;
            } catch (err: any) {
                if (err.response?.status === 410) {
                    setIsExpired(true);
                }
                throw err;
            }
        },
        enabled: !!bookingId,
        retry: false
    });

    // 2. Submit Review Mutation
    const submitMutation = useMutation({
        mutationFn: (data: any) => api.post('/reviews', data),
        onSuccess: () => {
            setSubmitted(true);
            toast.success('Спасибо за ваш отзыв!');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Ошибка при отправке отзыва');
        },
    });

    const handleSubmit = () => {
        if (rating === 0) {
            toast.error('Пожалуйста, выберите оценку');
            return;
        }

        submitMutation.mutate({
            appointment_id: booking.id,
            company_id: booking.company_id,
            branch_id: booking.branch_id,
            customer_id: booking.client_id,
            employee_id: booking.employee_id,
            rating: rating,
            comment: comment,
            is_public: true
        });
    };

    if (isLoadingBooking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full" />
            </div>
        );
    }

    if (isExpired) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6 text-center">
                <Card className="max-w-md w-full p-8 rounded-[2.5rem] shadow-2xl border-none">
                    <Clock className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                    <CardTitle className="text-2xl font-black uppercase tracking-tight">Срок действия истек</CardTitle>
                    <p className="text-neutral-500 mt-2">К сожалению, отзыв можно оставить только в течение 7 дней после визита.</p>
                    <Button className="mt-8 bg-black text-white w-full h-14 rounded-2xl font-bold" onClick={() => router.push('/')}>
                        На главную
                    </Button>
                </Card>
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6 text-center">
                <Card className="max-w-md w-full p-8 rounded-[2.5rem] shadow-2xl">
                    <X className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                    <CardTitle className="text-2xl font-black uppercase tracking-tight">Запись не найдена</CardTitle>
                    <p className="text-neutral-500 mt-2">Мы не смогли найти информацию об этом визите.</p>
                    <Button className="mt-8 bg-black text-white w-full h-14 rounded-2xl font-bold" onClick={() => router.push('/')}>
                        На главную
                    </Button>
                </Card>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
                <Card className="max-w-md w-full text-center p-10 shadow-2xl border-none rounded-[3rem] bg-white">
                    <div className="h-24 w-24 bg-emerald-50 rounded-[40px] flex items-center justify-center mx-auto mb-8 shadow-inner">
                        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                    </div>
                    <CardTitle className="text-4xl font-black tracking-tight uppercase">Спасибо!</CardTitle>
                    <CardDescription className="mt-4 text-lg text-neutral-500 font-medium">
                        Ваш отзыв помогает нам становиться лучше.
                    </CardDescription>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 md:p-8">
            <div className="max-w-2xl w-full space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-black uppercase tracking-tight text-neutral-900">Ваш отзыв</h1>
                    <p className="text-neutral-500 font-medium">Поделитесь вашими впечатлениями от визита</p>
                </div>

                <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white">
                    <div className="p-8 md:p-12 space-y-10">
                        {/* Master Info */}
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="h-24 w-24 bg-neutral-100 rounded-[36px] flex items-center justify-center overflow-hidden border-4 border-white shadow-xl relative">
                                {booking.employee_avatar ? (
                                    <img src={booking.employee_avatar} alt={booking.employee_name} className="h-full w-full object-cover" />
                                ) : (
                                    <User className="h-10 w-10 text-neutral-300" />
                                )}
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-black uppercase tracking-tight text-neutral-900">{booking.employee_name}</h3>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Ваш мастер</p>
                            </div>
                        </div>

                        {/* Services List */}
                        <div className="bg-neutral-50 rounded-3xl p-6 space-y-4">
                            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Услуги</span>
                                <span className="text-[10px] font-black text-neutral-900">
                                    {DateTime.fromISO(booking.start_time).setLocale('ru').toFormat('d MMMM yyyy')}
                                </span>
                            </div>
                            <div className="space-y-2">
                                {booking.services?.map((s: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center">
                                        <span className="text-sm font-bold text-neutral-800">{s.service_name || s.name}</span>
                                        <span className="text-xs font-black text-neutral-900">{s.price} BYN</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Rating */}
                        <div className="space-y-6">
                            <div className="flex justify-center gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        className="transition-all duration-300 transform hover:scale-125 focus:outline-none"
                                        onMouseEnter={() => setHoveredRating(star)}
                                        onMouseLeave={() => setHoveredRating(0)}
                                        onClick={() => setRating(star)}
                                    >
                                        <Star
                                            className={cn(
                                                "h-12 w-12 transition-colors",
                                                (hoveredRating || rating) >= star
                                                    ? "fill-orange-500 text-orange-500"
                                                    : "text-neutral-200"
                                            )}
                                        />
                                    </button>
                                ))}
                            </div>
                            <p className="text-center text-[10px] font-black uppercase tracking-widest text-neutral-400">
                                {rating === 5 ? 'Идеально' : rating === 4 ? 'Хорошо' : rating === 3 ? 'Нормально' : rating === 2 ? 'Плохо' : rating === 1 ? 'Ужасно' : 'Ваша оценка'}
                            </p>
                        </div>

                        {/* Comment */}
                        <div className="space-y-4">
                            <div className="relative group">
                                <div className="absolute left-5 top-5">
                                    <MessageSquare className="h-5 w-5 text-neutral-300 group-focus-within:text-orange-500 transition-colors" />
                                </div>
                                <Textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Что вам особенно понравилось или что нам стоит улучшить?"
                                    className="min-h-[150px] w-full p-6 pl-14 rounded-[2rem] border-none bg-neutral-50 focus:ring-2 focus:ring-orange-500/20 text-base font-medium placeholder:text-neutral-300 transition-all shadow-inner"
                                />
                            </div>
                        </div>

                        <Button
                            onClick={handleSubmit}
                            disabled={submitMutation.isPending || rating === 0}
                            className="w-full h-20 bg-black text-white hover:bg-neutral-900 rounded-[2rem] text-lg font-black uppercase tracking-widest shadow-2xl shadow-neutral-200 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {submitMutation.isPending ? 'Отправка...' : (
                                <div className="flex items-center gap-3">
                                    Отправить отзыв
                                    <ArrowRight className="h-6 w-6" />
                                </div>
                            )}
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}
