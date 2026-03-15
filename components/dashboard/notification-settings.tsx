'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    Bell, Send, MessageSquare, Plus, Trash2, Check, AlertCircle, 
    Smartphone, Zap, Clock, ShieldCheck, Settings2, AtSign, UserSquare2,
    Eye, Save
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBranch } from '@/context/branch-context';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const AVAILABLE_CHANNELS = [
    { id: 'telegram', label: 'Telegram', icon: Send },
    { id: 'sms', label: 'SMS', icon: MessageSquare },
    { id: 'email', label: 'Email', icon: AtSign },
    { id: 'vk', label: 'ВКонтакте', icon: UserSquare2 },
];

const DEFAULT_TEMPLATES: Record<string, string> = {
    booking_created: "✅ Здравствуйте, {{client_name}}! Вы успешно записались в {{branch_name}} на {{date}} в {{time}}. Услуги: {{services}}. Ждем вас!",
    booking_confirmed: "✅ Здравствуйте, {{client_name}}! Ваша запись в {{branch_name}} на {{date}} в {{time}} подтверждена. Услуги: {{services}}.",
    booking_updated: "🔄 Здравствуйте, {{client_name}}! Ваша запись в {{branch_name}} была изменена. Новое время: {{date}} в {{time}}.",
    booking_reminder_24h: "⏰ Напоминаем о вашей записи завтра ({{date}} в {{time}}) в {{branch_name}}. До встречи!",
    booking_reminder_1h: "🚀 Ждем вас через час ({{time}}) в {{branch_name}}! Ваш мастер: {{employee_name}}.",
    booking_cancelled: "❌ Здравствуйте, {{client_name}}! Ваша запись в {{branch_name}} на {{date}} в {{time}} отменена.",
    booking_no_show: "😔 Здравствуйте, {{client_name}}! Мы заметили, что вы не смогли прийти на запись в {{branch_name}}. Будем рады видеть вас в другой раз!",
    feedback_request: "🌟 Здравствуйте, {{client_name}}! Как вам визит к мастеру {{employee_name}}? Поделитесь вашим отзывом: {{review_url}}",
    client_reactivation: "👋 Здравствуйте, {{client_name}}! Мы давно не виделись в {{branch_name}}. Хотите записаться снова? Ссылка: {{appointment_url}}",
};

export function NotificationSettings({ companyId, branches }: { companyId: number, branches: any[] }) {
    const queryClient = useQueryClient();
    const { selectedBranchID, setSelectedBranchID } = useBranch();
    
    const [localBranchId, setLocalBranchId] = useState<string>(selectedBranchID || branches[0]?.id?.toString() || '');
    const [editingRule, setEditingRule] = useState<any | null>(null);
    const [editingTemplateIdx, setEditingTemplateIdx] = useState<number | null>(null);
    const [localConfig, setLocalConfig] = useState<any>(null);

    const VARIABLES = [
        { name: '{{client_name}}', desc: 'Имя клиента' },
        { name: '{{branch_name}}', desc: 'Название филиала' },
        { name: '{{employee_name}}', desc: 'Имя мастера' },
        { name: '{{date}}', desc: 'Дата (02.01.2026)' },
        { name: '{{time}}', desc: 'Время (15:00)' },
        { name: '{{services}}', desc: 'Список услуг' },
        { name: '{{appointment_url}}', desc: 'Ссылка на детали записи' },
        { name: '{{review_url}}', desc: 'Ссылка на отзыв' },
    ];

    useEffect(() => {
        if (selectedBranchID) setLocalBranchId(selectedBranchID);
    }, [selectedBranchID]);

    const handleBranchChange = (id: string) => {
        setLocalBranchId(id);
        setSelectedBranchID(id);
    };

    // -- Queries --
    const { data: config } = useQuery({
        queryKey: ['notification-config', localBranchId],
        queryFn: async () => (await api.get(`/notifications/config/${localBranchId}`)).data,
        enabled: !!localBranchId
    });

    useEffect(() => {
        if (config) setLocalConfig(config);
    }, [config]);

    const { data: rules = [], isLoading: isLoadingRules } = useQuery({
        queryKey: ['notification-rules', localBranchId],
        queryFn: async () => (await api.get(`/notifications/rules/${localBranchId}`)).data || [],
        enabled: !!localBranchId
    });

    // -- Mutations --
    const saveConfigMutation = useMutation({
        mutationFn: (newConfig: any) => api.post(`/notifications/config/${localBranchId}`, newConfig),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification-config', localBranchId] });
            toast.success('Настройки каналов сохранены');
        }
    });

    const toggleRuleMutation = useMutation({
        mutationFn: (rule: any) => api.post(`/notifications/rules`, { ...rule, is_active: !rule.is_active }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification-rules', localBranchId] });
        }
    });

    const saveRuleMutation = useMutation({
        mutationFn: (rule: any) => api.post(`/notifications/rules`, rule),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification-rules', localBranchId] });
            toast.success('Правило уведомлений сохранено');
            setEditingRule(null);
        },
        onError: () => {
            toast.error('Ошибка сохранения правила');
        }
    });

    const notificationTypes = [
        { id: 'booking_created', label: 'Создание записи', category: 'Оповещения' },
        { id: 'booking_confirmed', label: 'Подтверждение записи', category: 'Оповещения' },
        { id: 'booking_updated', label: 'Изменение записи', category: 'Оповещения' },
        { id: 'booking_reminder_24h', label: 'Напоминание (за 24 часа)', category: 'Напоминания' },
        { id: 'booking_reminder_1h', label: 'Напоминание (за 1 час)', category: 'Напоминания' },
        { id: 'booking_cancelled', label: 'Отмена записи', category: 'Оповещения' },
        { id: 'booking_no_show', label: 'Неявка клиента', category: 'Удержание' },
        { id: 'feedback_request', label: 'Запрос отзыва (после визита)', category: 'Лояльность' },
        { id: 'client_reactivation', label: 'Автопилот: Возврат клиентов', category: 'Удержание' },
    ];

    if (!localBranchId) return <div className="p-12 text-center bg-white rounded-[2rem] border border-neutral-100 shadow-sm"><p className="text-neutral-500 font-bold uppercase text-xs tracking-widest">Сначала выберите или создайте филиал</p></div>;

    const handleEditRule = (typeId: string) => {
        const existingRule = rules.find((r: any) => r.type === typeId);
        if (existingRule) {
            setEditingRule({ ...existingRule });
        } else {
            const label = notificationTypes.find(t => t.id === typeId)?.label || typeId;
            setEditingRule({
                branch_id: parseInt(localBranchId),
                type: typeId,
                is_active: true,
                steps: [
                    { 
                        channel: 'telegram', 
                        condition: 'always', 
                        delay_minutes: 0, 
                        template: {
                            branch_id: parseInt(localBranchId),
                            name: `${label} - Шаг 1`,
                            body: DEFAULT_TEMPLATES[typeId] || DEFAULT_TEMPLATES.booking_created
                        }
                    }
                ]
            });
        }
    };

    const addStep = () => {
        if (!editingRule) return;
        const typeId = editingRule.type;
        const label = notificationTypes.find(t => t.id === typeId)?.label || typeId;
        const nextIdx = (editingRule.steps?.length || 0) + 1;
        
        setEditingRule({
            ...editingRule,
            steps: [
                ...(editingRule.steps || []),
                { 
                    channel: 'telegram', 
                    condition: 'on_failure', 
                    delay_minutes: 0, 
                    template: {
                        branch_id: parseInt(localBranchId),
                        name: `${label} - Шаг ${nextIdx}`,
                        body: DEFAULT_TEMPLATES[typeId] || DEFAULT_TEMPLATES.booking_created
                    }
                }
            ]
        });
    };

    const updateStep = (index: number, field: string, value: any) => {
        if (!editingRule) return;
        const newSteps = [...editingRule.steps];
        newSteps[index] = { ...newSteps[index], [field]: value };
        setEditingRule({ ...editingRule, steps: newSteps });
    };

    const removeStep = (index: number) => {
        if (!editingRule) return;
        setEditingRule({
            ...editingRule,
            steps: editingRule.steps.filter((_: any, i: number) => i !== index)
        });
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Config Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="col-span-1 lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-neutral-900 flex items-center justify-center text-white shadow-lg shadow-black/10">
                                <Zap className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight text-neutral-900 italic">Каналы связи</h3>
                                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-0.5">Настройте токены и ключи провайдеров</p>
                            </div>
                        </div>
                        <Button 
                            onClick={() => saveConfigMutation.mutate(localConfig)}
                            disabled={saveConfigMutation.isPending || !localConfig}
                            className="bg-neutral-900 text-white hover:bg-black rounded-xl font-black uppercase text-[10px] tracking-widest h-10 px-6 transition-all"
                        >
                            <Save className="h-3.5 w-3.5 mr-2" />
                            {saveConfigMutation.isPending ? '...' : 'Сохранить'}
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Send className="h-3.5 w-3.5 text-neutral-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-900">Telegram Bot Token</span>
                                </div>
                                {!localConfig?.telegram_token && <Badge variant="outline" className="text-[7px] border-amber-200 text-amber-600 bg-amber-50">Не настроено</Badge>}
                            </div>
                            <Input 
                                value={localConfig?.telegram_token || ''} 
                                onChange={(e) => setLocalConfig({...localConfig, telegram_token: e.target.value})}
                                placeholder="0000000000:AA..."
                                className="h-11 rounded-xl bg-neutral-50 border-none font-bold text-xs"
                            />
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="h-3.5 w-3.5 text-neutral-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-900">SMS API (RocketSMS)</span>
                                </div>
                                {!localConfig?.sms_api_key && <Badge variant="outline" className="text-[7px] border-amber-200 text-amber-600 bg-amber-50">Не настроено</Badge>}
                            </div>
                            <Input 
                                value={localConfig?.sms_api_key || ''} 
                                onChange={(e) => setLocalConfig({...localConfig, sms_api_key: e.target.value})}
                                placeholder="username:password"
                                className="h-11 rounded-xl bg-neutral-50 border-none font-bold text-xs"
                            />
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <UserSquare2 className="h-3.5 w-3.5 text-neutral-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-900">VK Access Token</span>
                                </div>
                            </div>
                            <Input 
                                value={localConfig?.vk_token || ''} 
                                onChange={(e) => setLocalConfig({...localConfig, vk_token: e.target.value})}
                                placeholder="vk1.a.xxxx..."
                                className="h-11 rounded-xl bg-neutral-50 border-none font-bold text-xs"
                            />
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-3.5 w-3.5 text-neutral-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-900">Telegram Chat ID</span>
                            </div>
                            <Input 
                                value={localConfig?.telegram_chat_id || ''} 
                                onChange={(e) => setLocalConfig({...localConfig, telegram_chat_id: e.target.value})}
                                placeholder="325845638"
                                className="h-11 rounded-xl bg-neutral-50 border-none font-bold text-xs"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm flex flex-col justify-between">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-neutral-50 flex items-center justify-center text-neutral-400 border border-neutral-100">
                                <Settings2 className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-tight text-neutral-900">Филиал</h3>
                                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-0.5">Активный контекст</p>
                            </div>
                        </div>
                        <Select value={localBranchId} onValueChange={handleBranchChange}>
                            <SelectTrigger className="w-full h-12 rounded-2xl border-neutral-200 font-bold bg-neutral-50/50">
                                <SelectValue placeholder="Выберите филиал" />
                            </SelectTrigger>
                            <SelectContent>
                                {branches.map(b => (
                                    <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="pt-6 border-t border-neutral-50 mt-auto">
                        <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400 uppercase">
                            <span>Всего сценариев</span>
                            <span className="text-neutral-900 font-black">{rules.length} / {notificationTypes.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Rules List */}
            <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
                <CardHeader className="p-8 border-b border-neutral-50 bg-neutral-50/20">
                    <CardTitle className="text-xl font-black uppercase tracking-tight text-neutral-900 italic">Сценарии уведомлений</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-neutral-50">
                        {notificationTypes.map((type) => {
                            const rule = rules.find((r: any) => r.type === type.id);
                            
                            return (
                                <div key={type.id} className={cn("p-6 px-8 flex items-center justify-between group hover:bg-neutral-50/30 transition-colors", !rule?.is_active && "opacity-60")}>
                                    <div className="flex items-center gap-6">
                                        <Switch 
                                            checked={rule?.is_active || false} 
                                            onCheckedChange={() => {
                                                if (rule) toggleRuleMutation.mutate(rule);
                                                else handleEditRule(type.id);
                                            }}
                                            className="data-[state=checked]:bg-neutral-900" 
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-neutral-900 tracking-tight">{type.label}</span>
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">{type.category}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                        <div className="flex gap-1.5 mr-2">
                                            {rule?.steps?.map((step: any, idx: number) => {
                                                const ch = AVAILABLE_CHANNELS.find(c => c.id === step.channel);
                                                return ch ? (
                                                    <Badge key={idx} variant="outline" className="h-6 rounded-md text-[9px] font-black uppercase bg-neutral-900 text-white border-neutral-900">
                                                        {ch.label}
                                                    </Badge>
                                                ) : null;
                                            })}
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            onClick={() => handleEditRule(type.id)}
                                            className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-neutral-50 text-neutral-600 hover:bg-neutral-900 hover:text-[#F5FF82] transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            Настроить
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Rule Editor Modal */}
            <Dialog open={!!editingRule} onOpenChange={(open) => !open && setEditingRule(null)}>
                <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-white rounded-[2rem] border-none shadow-2xl">
                    <div className="p-8 border-b border-neutral-100 bg-neutral-50/50">
                        <DialogTitle className="text-2xl font-black uppercase tracking-tight text-neutral-900 italic">
                            Настройка сценария
                        </DialogTitle>
                        <DialogDescription className="text-neutral-500 font-bold text-xs mt-2">
                            {notificationTypes.find(t => t.id === editingRule?.type)?.label}
                        </DialogDescription>
                    </div>

                    <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[11px] font-black uppercase tracking-widest text-neutral-400">Шаги отправки</h4>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={addStep}
                                className="h-8 text-[10px] font-black uppercase tracking-widest rounded-lg border-neutral-200"
                            >
                                <Plus className="h-3 w-3 mr-1" /> Добавить шаг
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {editingRule?.steps?.map((step: any, idx: number) => (
                                <div key={idx} className="p-5 bg-white rounded-[1.5rem] border border-neutral-200 shadow-sm space-y-4 relative group">
                                    {idx > 0 && (
                                        <div className="absolute -top-4 left-8 bg-neutral-100 px-2 py-0.5 rounded text-[8px] font-black uppercase text-neutral-400 tracking-widest border border-white">
                                            Шаг {idx + 1}
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Канал</label>
                                            <Select value={step.channel} onValueChange={(val) => updateStep(idx, 'channel', val)}>
                                                <SelectTrigger className="h-10 rounded-xl bg-neutral-50 border-neutral-100 font-bold text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {AVAILABLE_CHANNELS.map(ch => (
                                                        <SelectItem key={ch.id} value={ch.id}>{ch.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400">Условие</label>
                                            <Select value={step.condition} onValueChange={(val) => updateStep(idx, 'condition', val)}>
                                                <SelectTrigger className="h-10 rounded-xl bg-neutral-50 border-neutral-100 font-bold text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="always">Отправлять всегда</SelectItem>
                                                    {idx > 0 && <SelectItem value="on_failure">Если предыдущий не доставлен</SelectItem>}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-neutral-50">
                                        <Button 
                                            variant="ghost" 
                                            size="sm"
                                            onClick={() => setEditingTemplateIdx(idx)}
                                            className="text-[10px] font-black uppercase text-neutral-400 hover:text-neutral-900 h-8"
                                        >
                                            <MessageSquare className="h-3 w-3 mr-2" />
                                            {step.template?.body ? "Изменить шаблон" : "Создать шаблон"}
                                        </Button>
                                        <div className="flex items-center gap-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-neutral-400">
                                                {editingRule.type === 'client_reactivation' ? 'Через сколько дней' : 'Задержка (мин)'}
                                            </label>
                                            <Input 
                                                type="number" 
                                                value={editingRule.type === 'client_reactivation' ? Math.round(step.delay_minutes / 1440) : (isNaN(step.delay_minutes) ? 0 : step.delay_minutes)} 
                                                onChange={(e) => {
                                                    let val = parseInt(e.target.value);
                                                    if (isNaN(val)) val = 0;
                                                    const finalVal = editingRule.type === 'client_reactivation' ? val * 1440 : val;
                                                    updateStep(idx, 'delay_minutes', finalVal);
                                                }}
                                                className="h-8 w-16 text-[10px] font-bold rounded-lg border-neutral-200"
                                            />
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon"
                                            onClick={() => removeStep(idx)}
                                            className="h-8 w-8 text-neutral-300 hover:text-red-500 rounded-lg hover:bg-red-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <DialogFooter className="p-6 bg-white border-t border-neutral-100">
                        <Button variant="ghost" onClick={() => setEditingRule(null)} className="h-12 rounded-xl font-bold px-8">
                            Отмена
                        </Button>
                        <Button 
                            onClick={() => saveRuleMutation.mutate(editingRule)} 
                            className="h-12 rounded-xl bg-neutral-900 text-white hover:bg-black font-bold px-8 shadow-xl shadow-black/10"
                        >
                            Сохранить сценарий
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Template Editor Modal */}
            <Dialog open={editingTemplateIdx !== null} onOpenChange={(open) => !open && setEditingTemplateIdx(null)}>
                <DialogContent className="sm:max-w-[1000px] w-[90vw] p-0 overflow-hidden bg-white rounded-[2rem] border-none shadow-2xl flex flex-col h-[80vh]">
                    <div className="p-8 border-b border-neutral-100 bg-neutral-900 text-white shrink-0">
                        <DialogTitle className="text-2xl font-black uppercase tracking-tight italic">
                            Шаблон сообщения
                        </DialogTitle>
                        <DialogDescription className="text-neutral-400 font-bold text-xs mt-2">
                            Настройте текст для канала {editingTemplateIdx !== null && editingRule?.steps[editingTemplateIdx]?.channel}
                        </DialogDescription>
                    </div>

                    <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2">
                        <div className="p-8 space-y-6 border-r border-neutral-100 flex flex-col">
                            <div className="flex-1 space-y-4 flex flex-col">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Текст сообщения</label>
                                <textarea
                                    className="flex-1 w-full p-6 rounded-2xl bg-neutral-50 border-none text-sm font-medium focus:ring-1 focus:ring-neutral-200 resize-none"
                                    value={editingTemplateIdx !== null ? (editingRule?.steps[editingTemplateIdx]?.template?.body || '') : ''}
                                    onChange={(e) => {
                                        const newSteps = [...editingRule.steps];
                                        if (!newSteps[editingTemplateIdx!].template) {
                                            newSteps[editingTemplateIdx!].template = { 
                                                body: '', 
                                                branch_id: editingRule.branch_id,
                                                name: `${notificationTypes.find(t => t.id === editingRule.type)?.label} - ${newSteps[editingTemplateIdx!].channel}`
                                            };
                                        }
                                        newSteps[editingTemplateIdx!].template.body = e.target.value;
                                        setEditingRule({ ...editingRule, steps: newSteps });
                                    }}
                                    placeholder="Введите текст сообщения..."
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Доступные переменные</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {VARIABLES.map(v => (
                                        <button
                                            key={v.name}
                                            onClick={() => {
                                                const newSteps = [...editingRule.steps];
                                                const currentBody = newSteps[editingTemplateIdx!].template?.body || '';
                                                if (!newSteps[editingTemplateIdx!].template) {
                                                    newSteps[editingTemplateIdx!].template = { 
                                                        body: '', 
                                                        branch_id: editingRule.branch_id,
                                                        name: `${notificationTypes.find(t => t.id === editingRule.type)?.label} - ${newSteps[editingTemplateIdx!].channel}`
                                                    };
                                                }
                                                newSteps[editingTemplateIdx!].template.body = currentBody + v.name;
                                                setEditingRule({ ...editingRule, steps: newSteps });
                                            }}
                                            className="text-left p-2 px-3 rounded-lg bg-neutral-50 border border-neutral-100 hover:border-neutral-900 transition-colors group"
                                        >
                                            <div className="text-[10px] font-black text-neutral-900 group-hover:text-black">{v.name}</div>
                                            <div className="text-[8px] font-bold text-neutral-400 uppercase tracking-tighter">{v.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-neutral-50/50 flex flex-col">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-6">Предпросмотр (Telegram)</label>
                            
                            <div className="flex-1 flex items-center justify-center">
                                <div className="w-full max-w-[300px] bg-white rounded-2xl shadow-xl border border-neutral-100 overflow-hidden">
                                    <div className="bg-neutral-900 p-3 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#F5FF82] flex items-center justify-center text-black font-black text-[10px]">TH</div>
                                        <div>
                                            <div className="text-white text-[10px] font-black leading-none uppercase">TimeHub Bot</div>
                                            <div className="text-[#F5FF82] text-[8px] font-bold uppercase tracking-widest mt-1">bot</div>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-[#E7EBF3]">
                                        <div className="bg-white p-3 rounded-xl rounded-tl-none shadow-sm text-xs font-medium text-neutral-800 leading-relaxed relative whitespace-pre-wrap">
                                            {(() => {
                                                let body = editingTemplateIdx !== null ? (editingRule?.steps[editingTemplateIdx]?.template?.body || '') : '';
                                                VARIABLES.forEach(v => {
                                                    const valMap: Record<string, string> = {
                                                        '{{client_name}}': 'Иван',
                                                        '{{branch_name}}': 'TimeHub Demo',
                                                        '{{branch_address}}': 'ул. Мира, 15',
                                                        '{{employee_name}}': 'Мастер Юля',
                                                        '{{date}}': '14.03.2026',
                                                        '{{time}}': '15:00',
                                                        '{{services}}': 'Мужская стрижка',
                                                        '{{appointment_url}}': 'https://timehub.by/b/123',
                                                        '{{review_url}}': 'https://timehub.by/r/123',
                                                    };
                                                    body = body.replaceAll(v.name, valMap[v.name] || v.name);
                                                });
                                                return body || 'Текст сообщения появится здесь...';
                                            })()}
                                            <div className="text-[8px] text-neutral-400 mt-2 text-right">15:52</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-6 bg-neutral-50 border-t border-neutral-100 shrink-0">
                        <Button 
                            onClick={() => setEditingTemplateIdx(null)} 
                            className="h-12 w-full rounded-xl bg-neutral-900 text-white hover:bg-black font-bold shadow-xl shadow-black/10"
                        >
                            Готово
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
