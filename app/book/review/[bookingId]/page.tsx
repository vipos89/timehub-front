'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Star, CheckCircle2, MessageSquare, ArrowRight, X } from 'lucide-react';
import { toast } from 'sonner';
import { DateTime } from 'luxon';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function ReviewPage() {
    const { bookingId } = useParams();
    const router = useRouter();
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitted, setSubmitted] = useState(false);

    // 1. Fetch Booking Info
    const { data: booking, isLoading: isLoadingBooking } = useQuery({
        queryKey: ['booking', bookingId],
        queryFn: async () => {
            const res = await api.get(`/appointments/${bookingId}`);
            return res.data;
        },
        enabled: !!bookingId,
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
            appointment_id: Number(bookingId),
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

    const startTime = DateTime.fromISO(booking.start_time).setLocale('ru');

    return (
        <div className="min-h-screen bg-neutral-50 py-16 px-6">
            <div className="max-w-xl mx-auto">
                <div className="text-center mb-12 space-y-2">
                    <h1 className="text-5xl font-black tracking-tighter uppercase text-black">Как все прошло?</h1>
                    <p className="text-lg text-neutral-400 font-bold uppercase tracking-widest text-[10px]">Поделитесь впечатлениями о визите в {booking.branch_name}</p>
                </div>

                <Card className="border-none shadow-2xl shadow-neutral-200/50 rounded-[3rem] overflow-hidden bg-white">
                    <div className="bg-black text-white p-10 flex items-center gap-6">
                        <div className="h-16 w-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md shrink-0 border border-white/5 shadow-xl">
                            <MessageSquare className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">Ваш визит</p>
                            <h3 className="text-2xl font-bold leading-none">{startTime.toFormat('d MMMM, HH:mm')}</h3>
                        </div>
                    </div>

                    <CardContent className="p-10 space-y-12">
                        {/* Rating Section */}
                        <div className="space-y-6 text-center">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">Ваша оценка</Label>
                            <div className="flex justify-center gap-2 sm:gap-4">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        className="transition-all active:scale-75"
                                        onMouseEnter={() => setHoveredRating(star)}
                                        onMouseLeave={() => setHoveredRating(0)}
                                        onClick={() => setRating(star)}
                                    >
                                        <Star
                                            className={cn(
                                                "h-14 w-14 transition-all duration-300",
                                                (hoveredRating || rating) >= star 
                                                    ? "fill-[#F5FF82] text-[#F5FF82] drop-shadow-[0_0_15px_rgba(245,255,130,0.5)] scale-110" 
                                                    : "text-neutral-100"
                                            )}
                                        />
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs font-black uppercase tracking-widest text-neutral-400 h-5">
                                {rating === 1 && "Ужасно"}
                                {rating === 2 && "Плохо"}
                                {rating === 3 && "Нормально"}
                                {rating === 4 && "Хорошо"}
                                {rating === 5 && "Отлично!"}
                            </p>
                        </div>

                        {/* Comment Section */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">Комментарий</Label>
                                <span className="text-[10px] font-black text-neutral-200">{comment.length}/500</span>
                            </div>
                            <Textarea
                                placeholder="Что вам особенно понравилось?"
                                className="min-h-[180px] bg-neutral-50 border-none rounded-[24px] p-8 text-lg focus-visible:ring-2 focus-visible:ring-neutral-100 placeholder:text-neutral-300 resize-none transition-all shadow-inner"
                                value={comment}
                                onChange={(e) => setComment(e.target.value.slice(0, 500))}
                            />
                        </div>

                        <Button 
                            className="w-full h-20 bg-black text-white rounded-[24px] text-xl font-black uppercase tracking-widest hover:bg-neutral-800 transition-all disabled:opacity-20 disabled:grayscale shadow-2xl shadow-black/20"
                            onClick={handleSubmit}
                            disabled={rating === 0 || submitMutation.isPending}
                        >
                            {submitMutation.isPending ? "Отправка..." : "Отправить"}
                        </Button>
                    </CardContent>
                </Card>

                <p className="mt-10 text-center text-neutral-300 text-[10px] font-black uppercase tracking-widest px-12 leading-relaxed opacity-50">
                    Ваш отзыв будет опубликован после проверки модератором.
                </p>
            </div>
        </div>
    );
}
