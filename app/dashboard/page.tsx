'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Calendar, ArrowUpRight } from 'lucide-react';

const stats = [
    {
        title: 'Филиалы',
        value: '0',
        icon: Building2,
        description: 'Всего филиалов компании',
    },
    {
        title: 'Сотрудники',
        value: '0',
        icon: Users,
        description: 'Активных мастеров',
    },
    {
        title: 'Записи сегодня',
        value: '0',
        icon: Calendar,
        description: 'Бронирований на сегодня',
    },
];

export default function DashboardPage() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Обзор</h1>
                <p className="text-neutral-500 mt-2">Добро пожаловать в панель управления TimeHub.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {stats.map((stat) => (
                    <Card key={stat.title} className="border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
                                {stat.title}
                            </CardTitle>
                            <stat.icon className="h-5 w-5 text-neutral-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-neutral-900">{stat.value}</div>
                            <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
                                {stat.description}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="border-neutral-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-xl font-bold text-neutral-900">Быстрый старт</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-neutral-600">Начните настройку вашей системы, выполнив следующие шаги:</p>
                    <ul className="space-y-3">
                        {[
                            { text: 'Добавьте филиал вашей компании', step: 1 },
                            { text: 'Создайте категории и услуги', step: 2 },
                            { text: 'Добавьте сотрудников и назначьте им услуги', step: 3 },
                            { text: 'Настройте график работы для каждого сотрудника', step: 4 },
                        ].map((item) => (
                            <li key={item.step} className="flex items-center gap-3 group cursor-pointer hover:text-neutral-900 transition-colors">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-neutral-200 text-sm font-bold text-neutral-400 group-hover:border-neutral-900 group-hover:text-neutral-900 transition-colors">
                                    {item.step}
                                </div>
                                <span className="text-neutral-700 group-hover:text-neutral-900 font-medium">{item.text}</span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
