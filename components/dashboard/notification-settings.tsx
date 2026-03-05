'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    Bell, Send, MessageSquare, Plus, Trash2, Check, AlertCircle, 
    Smartphone, Zap, Clock, ShieldCheck, Settings2
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function NotificationSettings({ companyId, branches }: { companyId: number, branches: any[] }) {
    const queryClient = useQueryClient();
    const [selectedBranchId, setSelectedBranchId] = useState<string>(branches[0]?.id?.toString() || '');

    // -- Queries --
    const { data: config, isLoading: isLoadingConfig } = useQuery({
        queryKey: ['notification-config', selectedBranchId],
        queryFn: async () => (await api.get(`/notifications/config/${selectedBranchId}`)).data,
        enabled: !!selectedBranchId
    });

    const { data: rules = [] } = useQuery({
        queryKey: ['notification-rules', selectedBranchId],
        queryFn: async () => (await api.get(`/notifications/rules/${selectedBranchId}`)).data,
        enabled: !!selectedBranchId
    });

    // -- Mutation --
    const saveConfigMutation = useMutation({
        mutationFn: (data: any) => api.post(`/notifications/config/${selectedBranchId}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification-config', selectedBranchId] });
            toast.success('Настройки сохранены');
        }
    });

    if (!selectedBranchId) return <div className="p-8 text-center text-neutral-500">Сначала создайте филиал</div>;

    const notificationTypes = [
        { id: 'booking_created_widget', label: 'Создание записи через виджет онлайн-записи', category: 'Увеличение посещаемости' },
        { id: 'booking_created_journal', label: 'Создание записи через журнал записи', category: 'Увеличение посещаемости' },
        { id: 'booking_confirmed', label: 'Уведомление о подтверждении записи', category: 'Увеличение посещаемости' },
        { id: 'booking_updated', label: 'Изменение записи', category: 'Увеличение посещаемости' },
        { id: 'booking_confirmation_request', label: 'Запрос подтверждения записи', category: 'Увеличение посещаемости' },
        { id: 'booking_reminder', label: 'Напоминание о визите', category: 'Увеличение посещаемости' },
        { id: 'booking_cancelled', label: 'Отмена записи', category: 'Увеличение посещаемости' },
        { id: 'feedback_request', label: 'Запрос отзыва после визита', category: 'Контроль качества' },
        { id: 'birthday_greeting', label: 'Поздравление с днём рождения', category: 'Работа с возвращаемостью' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Branch Selector & Channel Config Toggle */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-neutral-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-neutral-900 flex items-center justify-center text-white">
                        <Settings2 className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-tight">Филиал для настройки</h3>
                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-0.5">Выберите точку для конфигурации уведомлений</p>
                    </div>
                </div>
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                    <SelectTrigger className="w-full md:w-[300px] h-12 rounded-2xl border-neutral-200 font-bold bg-neutral-50/50">
                        <SelectValue placeholder="Выберите филиал" />
                    </SelectTrigger>
                    <SelectContent>
                        {branches.map(b => (
                            <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Telegram Config */}
                <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
                    <CardHeader className="bg-neutral-900 text-white p-8">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-3 text-lg font-black tracking-tight uppercase">
                                <Send className="h-5 w-5 text-[#F5FF82]" /> Telegram
                            </CardTitle>
                            <Switch checked={!!config?.telegram_token} />
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Токен бота (@BotFather)</Label>
                                <Input 
                                    placeholder="7530405952:AAGQ..." 
                                    className="h-12 rounded-2xl bg-neutral-50 border-none shadow-inner font-mono text-xs"
                                    defaultValue={config?.telegram_token}
                                    onBlur={(e) => saveConfigMutation.mutate({ ...config, telegram_token: e.target.value })}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* SMS Config */}
                <Card className="rounded-[2.5rem] border-none shadow-sm overflow-hidden bg-white">
                    <CardHeader className="bg-neutral-50 p-8 border-b border-neutral-100">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-3 text-lg font-black tracking-tight uppercase text-neutral-900">
                                <Smartphone className="h-5 w-5 text-neutral-400" /> SMS Шлюз
                            </CardTitle>
                            <Switch checked={!!config?.sms_api_key} />
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Провайдер</Label>
                                <Select defaultValue={config?.sms_provider || 'rocketsms'}>
                                    <SelectTrigger className="h-12 rounded-2xl bg-neutral-50 border-none shadow-inner font-bold">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="rocketsms">RocketSMS.by (Беларусь)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Notification Rules List - Styled like YClients */}
            <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
                <CardHeader className="p-8 border-b border-neutral-50 bg-neutral-50/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-black uppercase tracking-tight">Клиентам</CardTitle>
                            <p className="text-sm text-neutral-400 font-medium">Управление автоматическими сообщениями для ваших посетителей</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {/* Group by Category */}
                    {Array.from(new Set(notificationTypes.map(t => t.category))).map(category => (
                        <div key={category} className="space-y-0">
                            <div className="px-8 py-4 bg-neutral-50/50 border-b border-neutral-50">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">{category}</span>
                            </div>
                            <div className="divide-y divide-neutral-50">
                                {notificationTypes.filter(t => t.category === category).map((type) => (
                                    <div key={type.id} className="p-6 px-8 flex items-center justify-between group hover:bg-neutral-50/30 transition-colors">
                                        <div className="flex items-center gap-6">
                                            <Switch checked={true} className="data-[state=checked]:bg-neutral-900" />
                                            <span className="text-sm font-bold text-neutral-700">{type.label}</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                            <div className="flex gap-1.5 mr-4">
                                                <Badge variant="outline" className="h-6 rounded-md bg-white border-neutral-200 text-[9px] font-black uppercase text-neutral-400">SMS</Badge>
                                                <Badge variant="outline" className="h-6 rounded-md bg-neutral-900 border-neutral-900 text-[9px] font-black uppercase text-white">TG</Badge>
                                                <Badge variant="outline" className="h-6 rounded-md bg-white border-neutral-200 text-[9px] font-black uppercase text-neutral-200">WA</Badge>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                                                <Settings2 className="h-4 w-4 text-neutral-400" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
