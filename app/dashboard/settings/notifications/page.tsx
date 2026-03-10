'use client';

import { useState, useEffect } from 'react';
import { useBranch } from '@/context/branch-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { NotificationSettings } from '@/components/dashboard/notification-settings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Info, Send, Smartphone, Save, Mail, AtSign, UserSquare2, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function NotificationsPage() {
    const queryClient = useQueryClient();
    const { selectedBranchID } = useBranch();
    
    const [tgForm, setTgForm] = useState({ token: '', adminChatId: '' });
    const [smsForm, setSmsForm] = useState({ provider: 'rocketsms', apiKey: '' });
    const [whatsappForm, setWhatsappForm] = useState({ token: '', accountId: '' });
    const [emailForm, setEmailForm] = useState({ host: '', port: 587, user: '', pass: '', from: '' });
    const [vkForm, setVkForm] = useState({ token: '', groupId: '' });

    const { data: company } = useQuery({ 
        queryKey: ['my-company'], 
        queryFn: async () => (await api.get('/companies')).data[0] || null 
    });
    
    const { data: branches = [] } = useQuery({ 
        queryKey: ['branches', company?.id], 
        queryFn: async () => (await api.get(`/companies/${company.id}/branches`)).data, 
        enabled: !!company?.id 
    });

    const { data: config } = useQuery({
        queryKey: ['notification-config', selectedBranchID],
        queryFn: async () => (await api.get(`/notifications/config/${selectedBranchID}`)).data,
        enabled: !!selectedBranchID
    });

    useEffect(() => {
        if (config) {
            setTgForm({ token: config.telegram_token || '', adminChatId: config.telegram_chat_id || '' });
            setSmsForm({ provider: config.sms_provider || 'rocketsms', apiKey: config.sms_api_key || '' });
            setWhatsappForm({ token: config.whatsapp_token || '', accountId: config.whatsapp_account_id || '' });
            setEmailForm({ 
                host: config.email_host || '', 
                port: config.email_port || 587, 
                user: config.email_user || '', 
                pass: config.email_pass || '', 
                from: config.email_from || '' 
            });
            setVkForm({ token: config.vk_token || '', groupId: config.vk_group_id || '' });
        }
    }, [config]);

    const saveConfigMutation = useMutation({
        mutationFn: (data: any) => api.post(`/notifications/config/${selectedBranchID}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification-config', selectedBranchID] });
            toast.success('Настройки каналов сохранены');
        }
    });

    const handleSaveTelegram = () => {
        saveConfigMutation.mutate({ 
            ...config, 
            telegram_token: tgForm.token, 
            telegram_chat_id: tgForm.adminChatId 
        });
    };

    const handleSaveSms = () => {
        saveConfigMutation.mutate({ 
            ...config, 
            sms_provider: smsForm.provider, 
            sms_api_key: smsForm.apiKey 
        });
    };

    const handleSaveWhatsapp = () => {
        saveConfigMutation.mutate({ 
            ...config, 
            whatsapp_token: whatsappForm.token, 
            whatsapp_account_id: whatsappForm.accountId 
        });
    };

    const handleSaveEmail = () => {
        saveConfigMutation.mutate({ 
            ...config, 
            email_host: emailForm.host,
            email_port: emailForm.port,
            email_user: emailForm.user,
            email_pass: emailForm.pass,
            email_from: emailForm.from
        });
    };

    const handleSaveVk = () => {
        saveConfigMutation.mutate({ 
            ...config, 
            vk_token: vkForm.token, 
            vk_group_id: vkForm.groupId 
        });
    };

    return (
        <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-neutral-900 flex items-center justify-center text-white shadow-xl shadow-black/10">
                    <Bell className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-neutral-900 uppercase italic">Уведомления</h1>
                    <p className="text-neutral-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Центр управления коммуникациями</p>
                </div>
            </div>

            <Tabs defaultValue="types" className="w-full">
                <TabsList className="bg-neutral-50 p-1 rounded-xl h-11 inline-flex mb-8">
                    <TabsTrigger value="types" className="rounded-lg px-8 font-bold text-xs">Типы уведомлений</TabsTrigger>
                    <TabsTrigger value="channels" className="rounded-lg px-8 font-bold text-xs">Каналы отправки</TabsTrigger>
                    <TabsTrigger value="params" className="rounded-lg px-8 font-bold text-xs">Параметры</TabsTrigger>
                </TabsList>

                <TabsContent value="types" className="m-0">
                    <NotificationSettings companyId={company?.id} branches={branches} />
                </TabsContent>

                <TabsContent value="channels" className="m-0 animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Telegram Config */}
                        <Card className="rounded-[2rem] border-neutral-100 shadow-sm overflow-hidden bg-white flex flex-col">
                            <CardHeader className="bg-neutral-900 text-white p-8 flex flex-row items-center justify-between">
                                <CardTitle className="flex items-center gap-3 text-lg font-black tracking-tight uppercase italic">
                                    <Send className="h-5 w-5 text-[#F5FF82]" /> Telegram
                                </CardTitle>
                                <button 
                                    onClick={handleSaveTelegram}
                                    disabled={saveConfigMutation.isPending}
                                    className="h-8 px-4 rounded-lg bg-[#F5FF82] text-neutral-900 text-[10px] font-black uppercase hover:scale-105 transition-transform disabled:opacity-50"
                                >
                                    {saveConfigMutation.isPending ? '...' : 'Сохранить'}
                                </button>
                            </CardHeader>
                            <CardContent className="p-8 space-y-6 flex-1">
                                <div className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Токен бота (@BotFather)</Label>
                                        <Input 
                                            placeholder="7530405952:AAGQ..." 
                                            className="h-12 rounded-xl bg-neutral-50 border-none shadow-inner font-mono text-xs"
                                            value={tgForm.token}
                                            onChange={(e) => setTgForm({ ...tgForm, token: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-[10px] font-black uppercase opacity-40 ml-1">ID Администратора (для тестов)</Label>
                                        <Input 
                                            placeholder="325845638" 
                                            className="h-12 rounded-xl bg-neutral-50 border-none shadow-inner font-mono text-xs"
                                            value={tgForm.adminChatId}
                                            onChange={(e) => setTgForm({ ...tgForm, adminChatId: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* WhatsApp Config - Disabled for now */}
                        {/* <Card className="rounded-[2rem] border-neutral-100 shadow-sm overflow-hidden bg-white flex flex-col">
                            <CardHeader className="bg-emerald-600 text-white p-8 flex flex-row items-center justify-between">
                                <CardTitle className="flex items-center gap-3 text-lg font-black tracking-tight uppercase italic">
                                    <Smartphone className="h-5 w-5 text-emerald-100" /> WhatsApp Business
                                </CardTitle>
                                <button 
                                    onClick={handleSaveWhatsapp}
                                    disabled={saveConfigMutation.isPending}
                                    className="h-8 px-4 rounded-lg bg-emerald-100 text-emerald-900 text-[10px] font-black uppercase hover:scale-105 transition-transform disabled:opacity-50"
                                >
                                    {saveConfigMutation.isPending ? '...' : 'Сохранить'}
                                </button>
                            </CardHeader>
                            <CardContent className="p-8 space-y-6 flex-1">
                                <div className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Access Token</Label>
                                        <Input 
                                            placeholder="EAAB..." 
                                            className="h-12 rounded-xl bg-neutral-50 border-none shadow-inner font-mono text-xs"
                                            value={whatsappForm.token}
                                            onChange={(e) => setWhatsappForm({ ...whatsappForm, token: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Phone Number ID / Account ID</Label>
                                        <Input 
                                            placeholder="104857493..." 
                                            className="h-12 rounded-xl bg-neutral-50 border-none shadow-inner font-mono text-xs"
                                            value={whatsappForm.accountId}
                                            onChange={(e) => setWhatsappForm({ ...whatsappForm, accountId: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card> */}

                        {/* Email Config */}
                        <Card className="rounded-[2rem] border-neutral-100 shadow-sm overflow-hidden bg-white flex flex-col">
                            <CardHeader className="bg-neutral-50 p-8 border-b border-neutral-100 flex flex-row items-center justify-between">
                                <CardTitle className="flex items-center gap-3 text-lg font-black tracking-tight uppercase text-neutral-900 italic">
                                    <Mail className="h-5 w-5 text-neutral-400" /> Email (SMTP)
                                </CardTitle>
                                <button 
                                    onClick={handleSaveEmail}
                                    disabled={saveConfigMutation.isPending}
                                    className="h-8 px-4 rounded-lg bg-neutral-900 text-white text-[10px] font-black uppercase hover:scale-105 transition-transform disabled:opacity-50"
                                >
                                    {saveConfigMutation.isPending ? '...' : 'Сохранить'}
                                </button>
                            </CardHeader>
                            <CardContent className="p-8 space-y-4 flex-1">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label className="text-[10px] font-black uppercase opacity-40 ml-1">SMTP Host</Label>
                                        <Input 
                                            placeholder="smtp.gmail.com" 
                                            className="h-10 rounded-xl bg-neutral-50 border-none shadow-inner font-mono text-xs"
                                            value={emailForm.host}
                                            onChange={(e) => setEmailForm({ ...emailForm, host: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Port</Label>
                                        <Input 
                                            type="number"
                                            placeholder="587" 
                                            className="h-10 rounded-xl bg-neutral-50 border-none shadow-inner font-mono text-xs"
                                            value={emailForm.port}
                                            onChange={(e) => setEmailForm({ ...emailForm, port: parseInt(e.target.value) || 587 })}
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Username / Login</Label>
                                    <Input 
                                        placeholder="admin@example.com" 
                                        className="h-10 rounded-xl bg-neutral-50 border-none shadow-inner font-mono text-xs"
                                        value={emailForm.user}
                                        onChange={(e) => setEmailForm({ ...emailForm, user: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Password</Label>
                                    <Input 
                                        type="password"
                                        placeholder="••••••••" 
                                        className="h-10 rounded-xl bg-neutral-50 border-none shadow-inner font-mono text-xs"
                                        value={emailForm.pass}
                                        onChange={(e) => setEmailForm({ ...emailForm, pass: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Sender Email (From)</Label>
                                    <Input 
                                        placeholder="no-reply@timehub.com" 
                                        className="h-10 rounded-xl bg-neutral-50 border-none shadow-inner font-mono text-xs"
                                        value={emailForm.from}
                                        onChange={(e) => setEmailForm({ ...emailForm, from: e.target.value })}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* VK Config */}
                        <Card className="rounded-[2rem] border-neutral-100 shadow-sm overflow-hidden bg-white flex flex-col">
                            <CardHeader className="bg-blue-600 text-white p-8 flex flex-row items-center justify-between">
                                <CardTitle className="flex items-center gap-3 text-lg font-black tracking-tight uppercase italic">
                                    <UserSquare2 className="h-5 w-5 text-blue-100" /> VK Бизнес
                                </CardTitle>
                                <button 
                                    onClick={handleSaveVk}
                                    disabled={saveConfigMutation.isPending}
                                    className="h-8 px-4 rounded-lg bg-blue-100 text-blue-900 text-[10px] font-black uppercase hover:scale-105 transition-transform disabled:opacity-50"
                                >
                                    {saveConfigMutation.isPending ? '...' : 'Сохранить'}
                                </button>
                            </CardHeader>
                            <CardContent className="p-8 space-y-6 flex-1">
                                <div className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Токен сообщества</Label>
                                        <Input 
                                            placeholder="vk1.a.abc..." 
                                            className="h-12 rounded-xl bg-neutral-50 border-none shadow-inner font-mono text-xs"
                                            value={vkForm.token}
                                            onChange={(e) => setVkForm({ ...vkForm, token: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-[10px] font-black uppercase opacity-40 ml-1">ID Группы</Label>
                                        <Input 
                                            placeholder="12345678" 
                                            className="h-12 rounded-xl bg-neutral-50 border-none shadow-inner font-mono text-xs"
                                            value={vkForm.groupId}
                                            onChange={(e) => setVkForm({ ...vkForm, groupId: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* SMS Config */}
                        <Card className="rounded-[2rem] border-neutral-100 shadow-sm overflow-hidden bg-white flex flex-col">
                            <CardHeader className="bg-neutral-100 p-8 border-b border-neutral-100 flex flex-row items-center justify-between">
                                <CardTitle className="flex items-center gap-3 text-lg font-black tracking-tight uppercase text-neutral-900 italic">
                                    <Smartphone className="h-5 w-5 text-neutral-400" /> SMS Шлюз
                                </CardTitle>
                                <button 
                                    onClick={handleSaveSms}
                                    disabled={saveConfigMutation.isPending}
                                    className="h-8 px-4 rounded-lg bg-neutral-900 text-white text-[10px] font-black uppercase hover:scale-105 transition-transform disabled:opacity-50"
                                >
                                    {saveConfigMutation.isPending ? '...' : 'Сохранить'}
                                </button>
                            </CardHeader>
                            <CardContent className="p-8 space-y-6 flex-1">
                                <div className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Провайдер</Label>
                                        <Select value={smsForm.provider} onValueChange={(val) => setSmsForm({ ...smsForm, provider: val })}>
                                            <SelectTrigger className="h-12 rounded-xl bg-neutral-50 border-none shadow-inner font-bold">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="rocketsms">RocketSMS.by</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-[10px] font-black uppercase opacity-40 ml-1">API Ключ (логин:пароль)</Label>
                                        <Input 
                                            placeholder="user:pass" 
                                            className="h-12 rounded-xl bg-neutral-50 border-none shadow-inner font-mono text-xs"
                                            value={smsForm.apiKey}
                                            onChange={(e) => setSmsForm({ ...smsForm, apiKey: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="params" className="m-0">
                    <div className="bg-white p-12 rounded-[2.5rem] border border-neutral-100 text-center space-y-4 shadow-sm">
                        <Globe className="h-12 w-12 text-neutral-200 mx-auto" />
                        <h3 className="text-xl font-bold text-neutral-900 uppercase tracking-tight italic">Параметры отправки</h3>
                        <p className="text-neutral-500 max-w-md mx-auto text-sm font-medium">Настройка времени тишины, ограничений по количеству сообщений и других системных параметров.</p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
