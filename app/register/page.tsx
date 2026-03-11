'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Cookies from 'js-cookie';
import { 
    User, 
    Building2, 
    MapPin, 
    ArrowRight, 
    ArrowLeft, 
    Check, 
    Loader2,
    Mail,
    Lock,
    Phone
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { api, logout } from '@/lib/api';
import { cn } from '@/lib/utils';

const registerSchema = z.object({
    // Step 1: Account
    email: z.string().email('Некорректный email'),
    password: z.string().min(6, 'Пароль должен быть не менее 6 символов'),
    confirm_password: z.string(),
    
    // Step 2: Company
    company_name: z.string().min(2, 'Название компании слишком короткое'),
    phone: z.string().min(5, 'Некорректный номер телефона'),
    
    // Step 3: Address (Full Geo)
    country_id: z.string().min(1, 'Выберите страну'),
    region_id: z.string().optional(),
    district_id: z.string().optional(),
    city_id: z.string().min(1, 'Выберите город'),
    address: z.string().min(5, 'Введите полный адрес'),
}).refine((data) => data.password === data.confirm_password, {
    message: "Пароли не совпадают",
    path: ["confirm_password"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const STEPS = [
    { id: 1, title: 'Аккаунт', icon: User },
    { id: 2, title: 'Компания', icon: Building2 },
    { id: 3, title: 'Адрес', icon: MapPin },
];

export default function RegisterPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            email: '',
            password: '',
            confirm_password: '',
            company_name: '',
            phone: '',
            country_id: '',
            region_id: '',
            district_id: '',
            city_id: '',
            address: '',
        },
    });

    const watchCountry = form.watch('country_id');
    const watchRegion = form.watch('region_id');
    const watchDistrict = form.watch('district_id');

    // Geo Queries
    const { data: countries } = useQuery({
        queryKey: ['countries'],
        queryFn: async () => (await api.get('/geo/countries')).data
    });

    const { data: regions } = useQuery({
        queryKey: ['regions', watchCountry],
        queryFn: async () => (await api.get(`/geo/countries/${watchCountry}/regions`)).data,
        enabled: !!watchCountry
    });

    const { data: districts } = useQuery({
        queryKey: ['districts', watchRegion],
        queryFn: async () => (await api.get(`/geo/regions/${watchRegion}/districts`)).data,
        enabled: !!watchRegion
    });

    const { data: cities } = useQuery({
        queryKey: ['cities', watchCountry, watchRegion, watchDistrict],
        queryFn: async () => {
            let url = `/geo/cities?country_id=${watchCountry}`;
            if (watchRegion) url += `&region_id=${watchRegion}`;
            if (watchDistrict) url += `&district_id=${watchDistrict}`;
            const res = await api.get(url);
            return res.data;
        },
        enabled: !!watchCountry
    });

    // Reset dependent fields when parent changes
    useEffect(() => { form.setValue('region_id', ''); form.setValue('district_id', ''); form.setValue('city_id', ''); }, [watchCountry, form]);
    useEffect(() => { form.setValue('district_id', ''); form.setValue('city_id', ''); }, [watchRegion, form]);
    useEffect(() => { form.setValue('city_id', ''); }, [watchDistrict, form]);

    const onSubmit = async (values: RegisterFormValues) => {
        setIsSubmitting(true);
        // Clear any old session data before starting registration for a new user
        Cookies.remove('token');
        localStorage.clear();
        
        try {
            await api.post('/auth/register', { email: values.email, password: values.password, role: 'owner' });
            const loginRes = await api.post('/auth/login', { email: values.email, password: values.password });
            Cookies.set('token', loginRes.data.token);

            await api.post('/companies', {
                name: values.company_name,
                country_id: parseInt(values.country_id),
                region_id: values.region_id ? parseInt(values.region_id) : undefined,
                district_id: values.district_id ? parseInt(values.district_id) : undefined,
                city_id: parseInt(values.city_id),
                address: values.address,
            });

            queryClient.clear();

            toast.success('Регистрация завершена успешно!');
            router.push('/dashboard');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Ошибка при регистрации');
            setIsSubmitting(false);
        }
    };

    const nextStep = async () => {
        const fields = step === 1 ? ['email', 'password', 'confirm_password'] : step === 2 ? ['company_name', 'phone'] : [];
        if (await form.trigger(fields as any)) setStep(step + 1);
    };

    return (
        <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-xl space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-neutral-900">TimeHub</h1>
                    <p className="text-neutral-500 font-medium">Ваша платформа для управления бизнесом</p>
                </div>

                <div className="relative">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-neutral-200 -translate-y-1/2" />
                    <div className="absolute top-1/2 left-0 h-0.5 bg-black -translate-y-1/2 transition-all duration-500" style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }} />
                    <div className="relative flex justify-between">
                        {STEPS.map((s) => (
                            <div key={s.id} className="flex flex-col items-center gap-2">
                                <div className={cn("h-10 w-10 rounded-full flex items-center justify-center transition-all duration-500 z-10", step >= s.id ? "bg-black text-white" : "bg-white border-2 border-neutral-200 text-neutral-400", step === s.id && "ring-4 ring-black/10")}>
                                    {step > s.id ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
                                </div>
                                <span className={cn("text-[10px] font-black uppercase tracking-widest", step >= s.id ? "text-neutral-900" : "text-neutral-400")}>{s.title}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
                    <CardHeader className="p-8 pb-0">
                        <CardTitle className="text-2xl font-black uppercase tracking-tight">{step === 1 ? 'Создание аккаунта' : step === 2 ? 'Ваш бизнес' : 'Где вы находитесь?'}</CardTitle>
                        <CardDescription>{step === 1 ? 'Введите почту и пароль' : step === 2 ? 'Название вашей компании' : 'Укажите полный адрес филиала'}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                {step === 1 && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                                        <FormField control={form.control} name="email" render={({ field }) => (
                                            <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Email</FormLabel>
                                            <FormControl><div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-300" /><Input placeholder="email@example.com" {...field} className="h-14 pl-12 rounded-2xl border-none bg-neutral-50" /></div></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="password" render={({ field }) => (
                                            <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Пароль</FormLabel>
                                            <FormControl><div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-300" /><Input type="password" placeholder="••••••••" {...field} className="h-14 pl-12 rounded-2xl border-none bg-neutral-50" /></div></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="confirm_password" render={({ field }) => (
                                            <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Подтверждение</FormLabel>
                                            <FormControl><div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-300" /><Input type="password" placeholder="••••••••" {...field} className="h-14 pl-12 rounded-2xl border-none bg-neutral-50" /></div></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                                        <FormField control={form.control} name="company_name" render={({ field }) => (
                                            <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Название компании</FormLabel>
                                            <FormControl><div className="relative"><Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-300" /><Input placeholder="Например: Aura Studio" {...field} className="h-14 pl-12 rounded-2xl border-none bg-neutral-50" /></div></FormControl><FormMessage /></FormItem>
                                        )} />
                                        <FormField control={form.control} name="phone" render={({ field }) => (
                                            <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Телефон</FormLabel>
                                            <FormControl><div className="relative"><Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-300" /><Input placeholder="+375..." {...field} className="h-14 pl-12 rounded-2xl border-none bg-neutral-50" /></div></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>
                                )}

                                {step === 3 && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={form.control} name="country_id" render={({ field }) => (
                                                <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Страна</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-14 rounded-2xl border-none bg-neutral-50"><SelectValue placeholder="Страна" /></SelectTrigger></FormControl>
                                                <SelectContent className="rounded-2xl">{countries?.map((c: any) => (<SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                                            )} />
                                            <FormField control={form.control} name="region_id" render={({ field }) => (
                                                <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Область</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value} disabled={!watchCountry}><FormControl><SelectTrigger className="h-14 rounded-2xl border-none bg-neutral-50"><SelectValue placeholder="Область" /></SelectTrigger></FormControl>
                                                <SelectContent className="rounded-2xl">{regions?.map((r: any) => (<SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>))}</SelectContent></Select></FormItem>
                                            )} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField control={form.control} name="district_id" render={({ field }) => (
                                                <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Район</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value} disabled={!watchRegion}><FormControl><SelectTrigger className="h-14 rounded-2xl border-none bg-neutral-50"><SelectValue placeholder="Район" /></SelectTrigger></FormControl>
                                                <SelectContent className="rounded-2xl">{districts?.map((d: any) => (<SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>))}</SelectContent></Select></FormItem>
                                            )} />
                                            <FormField control={form.control} name="city_id" render={({ field }) => (
                                                <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Город</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value} disabled={!watchCountry}><FormControl><SelectTrigger className="h-14 rounded-2xl border-none bg-neutral-50"><SelectValue placeholder="Город" /></SelectTrigger></FormControl>
                                                <SelectContent className="rounded-2xl">{cities?.map((c: any) => (<SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                                            )} />
                                        </div>
                                        <FormField control={form.control} name="address" render={({ field }) => (
                                            <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Адрес</FormLabel>
                                            <FormControl><div className="relative"><MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-300" /><Input placeholder="Улица, дом, офис" {...field} className="h-14 pl-12 rounded-2xl border-none bg-neutral-50" /></div></FormControl><FormMessage /></FormItem>
                                        )} />
                                    </div>
                                )}

                                <div className="flex gap-4 pt-4">
                                    {step > 1 && <Button type="button" variant="outline" onClick={() => setStep(step - 1)} className="flex-1 h-14 rounded-2xl border-neutral-200 font-bold uppercase tracking-widest text-[10px]">Назад</Button>}
                                    {step < 3 ? <Button type="button" onClick={nextStep} className="flex-1 h-14 rounded-2xl bg-black text-white hover:bg-neutral-900 font-bold uppercase tracking-widest text-[10px]">Далее <ArrowRight className="ml-2 h-4 w-4" /></Button>
                                    : <Button type="submit" disabled={isSubmitting} className="flex-1 h-14 rounded-2xl bg-black text-white hover:bg-neutral-900 font-bold uppercase tracking-widest text-[10px] shadow-xl shadow-black/10 active:scale-[0.98]">{isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Завершить регистрацию <Check className="ml-2 h-5 w-5" /></>}</Button>}
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                    <CardFooter className="p-8 pt-0 flex justify-center"><p className="text-sm text-neutral-400 font-medium">Есть аккаунт? <Button variant="link" className="p-0 h-auto font-black uppercase tracking-widest text-[10px] text-black" onClick={() => router.push('/login')}>Войти</Button></p></CardFooter>
                </Card>
            </div>
        </div>
    );
}
