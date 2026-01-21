'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

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
import { api } from '@/lib/api';

const registerSchema = z.object({
    email: z.string().email('Некорректный email'),
    password: z.string().min(6, 'Пароль должен быть не менее 6 символов'),
    confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
    message: "Пароли не совпадают",
    path: ["confirm_password"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
    const router = useRouter();
    const form = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            email: '',
            password: '',
            confirm_password: '',
        },
    });

    const mutation = useMutation({
        mutationFn: async (values: RegisterFormValues) => {
            const response = await api.post('/auth/register', {
                email: values.email,
                password: values.password,
                role: 'owner', // Default for initial registration
            });
            return response.data;
        },
        onSuccess: () => {
            toast.success('Регистрация успешна! Теперь вы можете войти.');
            router.push('/login');
        },
        onError: (error: any) => {
            const message = error.response?.data?.error || 'Ошибка регистрации';
            toast.error(message);
        },
    });

    function onSubmit(values: RegisterFormValues) {
        mutation.mutate(values);
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
            <Card className="w-full max-w-md shadow-lg border-neutral-200">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold tracking-tight text-neutral-900">Регистрация в TimeHub</CardTitle>
                    <CardDescription className="text-neutral-500">
                        Создайте аккаунт владельца компании для начала работы
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-neutral-700">Email</FormLabel>
                                        <FormControl>
                                            <Input placeholder="name@example.com" {...field} className="border-neutral-300 focus:ring-neutral-500" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-neutral-700">Пароль</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="••••••••" {...field} className="border-neutral-300 focus:ring-neutral-500" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="confirm_password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-neutral-700">Подтвердите пароль</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="••••••••" {...field} className="border-neutral-300 focus:ring-neutral-500" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full bg-neutral-900 hover:bg-neutral-800 text-white transition-all" disabled={mutation.isPending}>
                                {mutation.isPending ? 'Загрузка...' : 'Зарегистрироваться'}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-2">
                    <p className="text-sm text-center text-neutral-500">
                        Уже есть аккаунт?{' '}
                        <Button variant="link" className="p-0 h-auto font-semibold text-neutral-900" onClick={() => router.push('/login')}>
                            Войти
                        </Button>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
