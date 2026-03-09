'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Star, CheckCircle2, MessageSquare, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

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
            const res = await api.get(`/bookings/${bookingId}`);
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
            <div className="min-h-screen flex items-center justify-center bg-neutral-50">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-12 w-12 bg-neutral-200 rounded-full mb-4"></div>
                    <div className="h-4 w-32 bg-neutral-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
                <Card className="max-w-md w-full p-8 text-center shadow-xl border-neutral-200">
                    <CardTitle>Запись не найдена</CardTitle>
                    <CardDescription className="mt-2">
                        К сожалению, мы не смогли найти информацию об этой записи.
                    </CardDescription>
                    <Button className="mt-6 bg-neutral-900 text-white w-full" onClick={() => router.push('/')}>
                        На главную
                    </Button>
                </Card>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
                <Card className="max-w-md w-full text-center p-10 shadow-xl border-neutral-200 rounded-[2rem]">
                    <div className="h-20 w-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="h-10 w-10 text-green-500" />
                    </div>
                    <CardTitle className="text-3xl font-black tracking-tight uppercase">Спасибо!</CardTitle>
                    <CardDescription className="mt-4 text-lg text-neutral-600">
                        Ваш отзыв помогает нам становиться лучше.
                    </CardDescription>
                    <Button 
                        className="mt-10 bg-black text-white w-full h-14 rounded-2xl text-lg font-bold group"
                        onClick={() => router.push(`/book/${booking.company_id}`)}
                    >
                        Записаться снова
                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-50 py-12 px-6">
            <div className="max-w-xl mx-auto">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-black tracking-tight uppercase text-black mb-2">Как все прошло?</h1>
                    <p className="text-neutral-500 font-medium">Поделитесь вашими впечатлениями о визите в {booking.branch_name}</p>
                </div>

                <Card className="border-none shadow-2xl shadow-neutral-200/50 rounded-[2.5rem] overflow-hidden bg-white">
                    <CardHeader className="bg-neutral-900 text-white p-8">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                                <MessageSquare className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-bold">Ваш визит</CardTitle>
                                <CardDescription className="text-neutral-400 font-medium">
                                    {format(new Date(booking.start_time), 'd MMMM, HH:mm', { locale: ru })}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-8 space-y-10">
                        {/* Rating Section */}
                        <div className="space-y-4 text-center">
                            <Label className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Ваша оценка</Label>
                            <div className="flex justify-center gap-3">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        className="transition-transform active:scale-90"
                                        onMouseEnter={() => setHoveredRating(star)}
                                        onMouseLeave={() => setHoveredRating(0)}
                                        onClick={() => setRating(star)}
                                    >
                                        <Star
                                            className={cn(
                                                "h-12 w-12 transition-colors duration-200",
                                                (hoveredRating || rating) >= star 
                                                    ? "fill-black text-black" 
                                                    : "text-neutral-200"
                                            )}
                                        />
                                    </button>
                                ))}
                            </div>
                            <p className="text-sm font-bold text-neutral-400 h-5">
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
                                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Комментарий (необязательно)</Label>
                                <span className="text-[10px] font-bold text-neutral-300">{comment.length}/500</span>
                            </div>
                            <Textarea
                                placeholder="Что вам особенно понравилось или что нам стоит улучшить?"
                                className="min-h-[150px] bg-neutral-50 border-none rounded-2xl p-6 text-lg focus-visible:ring-1 focus-visible:ring-neutral-200 placeholder:text-neutral-300 resize-none"
                                value={comment}
                                onChange={(e) => setComment(e.target.value.slice(0, 500))}
                            />
                        </div>

                        <Button 
                            className="w-full h-16 bg-black text-white rounded-2xl text-xl font-black uppercase tracking-wider hover:bg-neutral-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/10"
                            onClick={handleSubmit}
                            disabled={rating === 0 || submitMutation.isPending}
                        >
                            {submitMutation.isPending ? "Отправка..." : "Отправить отзыв"}
                        </Button>
                    </CardContent>
                </Card>

                <p className="mt-8 text-center text-neutral-400 text-xs font-medium">
                    Нажимая кнопку, вы соглашаетесь с правилами публикации отзывов.
                </p>
            </div>
        </div>
    );
}
