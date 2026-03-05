'use client';

import { 
    Settings, Bell, Building2, Users, Scissors, Calendar, 
    ChevronRight, Smartphone, AppWindow, ShieldCheck, LifeBuoy,
    LayoutGrid
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const settingsGroups = [
    {
        title: 'Бизнес-логика',
        items: [
            { title: 'Услуги', url: '/dashboard/services', icon: Scissors, desc: 'Прайс-лист и категории' },
            { title: 'Сотрудники', url: '/dashboard/staff', icon: Users, desc: 'Доступы и персонал' },
            { title: 'График работы', url: '/dashboard/schedule', icon: Calendar, desc: 'Смены и перерывы' },
            { title: 'Виджеты записи', url: '/dashboard/widgets', icon: AppWindow, desc: 'Онлайн-запись для сайта' },
        ]
    },
    {
        title: 'Организация',
        items: [
            { title: 'Профиль компании', url: '/dashboard/settings/company', icon: Building2, desc: 'Бренд и общие реквизиты' },
            { title: 'Список филиалов', url: '/dashboard/settings/branches', icon: LayoutGrid, desc: 'Управление сетью точек' },
            { title: 'Текущий филиал', url: '/dashboard/settings/branch-local', icon: Smartphone, desc: 'Настройки выбранной точки' },
        ]
    },
    {
        title: 'Коммуникации',
        items: [
            { title: 'Уведомления', url: '/dashboard/settings/notifications', icon: Bell, desc: 'SMS, Telegram и цепочки' },
            { title: 'Клиентская база', url: '#', icon: Users, desc: 'CRM и лояльность' },
        ]
    }
];

export default function SettingsPage() {
    return (
        <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-10 animate-in fade-in duration-500">
            {/* Minimal Header */}
            <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-neutral-900 flex items-center justify-center text-white">
                    <Settings className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-neutral-900">Настройки</h1>
                    <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest">Управление системой</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {settingsGroups.map((group, idx) => (
                    <div key={idx} className="space-y-4">
                        <h3 className="px-1 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">
                            {group.title}
                        </h3>
                        
                        <div className="bg-white border border-neutral-100 rounded-2xl overflow-hidden shadow-sm">
                            {group.items.map((item, itemIdx) => (
                                <Link key={itemIdx} href={item.url} className="block group">
                                    <div className={`flex items-center justify-between p-4 transition-colors hover:bg-neutral-50 ${itemIdx !== group.items.length - 1 ? 'border-b border-neutral-50' : ''}`}>
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-lg bg-neutral-50 flex items-center justify-center text-neutral-400 group-hover:bg-neutral-900 group-hover:text-[#F5FF82] transition-all">
                                                <item.icon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <span className="text-sm font-bold text-neutral-800 block">{item.title}</span>
                                                <span className="text-[10px] text-neutral-400 font-medium">{item.desc}</span>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-neutral-200 group-hover:text-neutral-900 group-hover:translate-x-0.5 transition-all" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Support Block - Compact */}
                <div className="md:col-span-2 mt-4">
                    <div className="bg-[#F5FF82] rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 border border-[#e4ee6b]">
                        <div className="flex items-center gap-4 text-center md:text-left">
                            <div className="h-12 w-12 rounded-full bg-white/50 flex items-center justify-center">
                                <LifeBuoy className="h-6 w-6 text-neutral-900" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-neutral-900 uppercase tracking-tight">Нужна помощь?</h3>
                                <p className="text-neutral-800/60 text-xs font-bold">Наша поддержка всегда на связи, чтобы помочь с настройкой.</p>
                            </div>
                        </div>
                        <Button size="sm" className="bg-neutral-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest px-6 h-10 hover:bg-black transition-all">
                            Написать
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
