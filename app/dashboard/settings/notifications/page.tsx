'use client';

import { useBranch } from '@/context/branch-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { NotificationSettings } from '@/components/dashboard/notification-settings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Info } from 'lucide-react';

export default function NotificationsPage() {
    const { selectedBranchID } = useBranch();
    const { data: company } = useQuery({ 
        queryKey: ['my-company'], 
        queryFn: async () => (await api.get('/companies')).data[0] || null 
    });
    const { data: branches = [] } = useQuery({ 
        queryKey: ['branches', company?.id], 
        queryFn: async () => (await api.get(`/companies/${company.id}/branches`)).data, 
        enabled: !!company?.id 
    });

    return (
        <div className="max-w-6xl mx-auto p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-neutral-900 flex items-center justify-center text-white shadow-xl shadow-black/10">
                        <Bell className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-neutral-900">Уведомления</h1>
                        <p className="text-neutral-500 font-medium">Настройка типов, каналов и параметров отправки сообщений</p>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="types" className="w-full">
                <TabsList className="bg-white/50 p-1.5 rounded-2xl border border-neutral-200 backdrop-blur-sm h-14 mb-8">
                    <TabsTrigger value="types" className="rounded-xl px-8 font-bold">Типы уведомлений</TabsTrigger>
                    <TabsTrigger value="channels" className="rounded-xl px-8 font-bold">Каналы отправки</TabsTrigger>
                    <TabsTrigger value="params" className="rounded-xl px-8 font-bold">Параметры отправки</TabsTrigger>
                </TabsList>

                <TabsContent value="types" className="m-0">
                    <NotificationSettings companyId={company?.id} branches={branches} />
                </TabsContent>

                <TabsContent value="channels" className="m-0">
                    <div className="bg-white p-12 rounded-[2.5rem] text-center space-y-4">
                        <Info className="h-12 w-12 text-neutral-200 mx-auto" />
                        <h3 className="text-xl font-bold">Каналы отправки</h3>
                        <p className="text-neutral-500 max-w-md mx-auto">Здесь вы сможете настраивать глобальные параметры для Telegram, SMS и других мессенджеров.</p>
                    </div>
                </TabsContent>

                <TabsContent value="params" className="m-0">
                    <div className="bg-white p-12 rounded-[2.5rem] text-center space-y-4">
                        <Info className="h-12 w-12 text-neutral-200 mx-auto" />
                        <h3 className="text-xl font-bold">Параметры отправки</h3>
                        <p className="text-neutral-500 max-w-md mx-auto">Настройка времени тишины, ограничений по количеству сообщений и других системных параметров.</p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
