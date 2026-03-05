'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    Bell, Send, MessageSquare, Plus, Trash2, Check, AlertCircle, 
    Smartphone, Zap, Clock, ShieldCheck, Settings2
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

export function NotificationSettings({ companyId, branches }: { companyId: number, branches: any[] }) {
    const queryClient = useQueryClient();
    const { selectedBranchID, setSelectedBranchID } = useBranch();
    
    // Ensure selectedBranchId is initialized from context
    const [localBranchId, setLocalBranchId] = useState<string>(selectedBranchID || branches[0]?.id?.toString() || '');

    useEffect(() => {
        if (selectedBranchID) setLocalBranchId(selectedBranchID);
    }, [selectedBranchID]);

    const handleBranchChange = (id: string) => {
        setLocalBranchId(id);
        setSelectedBranchID(id);
    };

    // -- Queries --
    const { data: rules = [], isLoading: isLoadingRules } = useQuery({
        queryKey: ['notification-rules', localBranchId],
        queryFn: async () => (await api.get(`/notifications/rules/${localBranchId}`)).data,
        enabled: !!localBranchId
    });

    // -- Mutations --
    const toggleRuleMutation = useMutation({
        mutationFn: (rule: any) => api.post(`/notifications/rules`, { ...rule, is_active: !rule.is_active }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notification-rules', localBranchId] });
        }
    });

    const notificationTypes = [
        { id: 'booking_confirmed', label: 'Подтверждение записи', category: 'Увеличение посещаемости' },
        { id: 'booking_updated', label: 'Изменение записи', category: 'Увеличение посещаемости' },
        { id: 'booking_reminder', label: 'Напоминание о визите', category: 'Увеличение посещаемости' },
        { id: 'booking_cancelled', label: 'Отмена записи', category: 'Увеличение посещаемости' },
    ];

    if (!localBranchId) return <div className="p-12 text-center bg-white rounded-[2rem] border border-neutral-100 shadow-sm"><p className="text-neutral-500 font-bold uppercase text-xs tracking-widest">Сначала выберите или создайте филиал</p></div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Branch Selector Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-neutral-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-neutral-900 flex items-center justify-center text-white">
                        <Settings2 className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-tight text-neutral-900">Выбор филиала</h3>
                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-0.5">Настройки применяются к выбранной точке</p>
                    </div>
                </div>
                <Select value={localBranchId} onValueChange={handleBranchChange}>
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

            {/* Rules List */}
            <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
                <CardHeader className="p-8 border-b border-neutral-50 bg-neutral-50/20">
                    <CardTitle className="text-xl font-black uppercase tracking-tight text-neutral-900">События и уведомления</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-neutral-50">
                        {notificationTypes.map((type) => {
                            const rule = rules.find((r: any) => r.type === type.id);
                            const hasSms = rule?.steps?.some((s: any) => s.channel === 'sms');
                            const hasTg = rule?.steps?.some((s: any) => s.channel === 'telegram');

                            return (
                                <div key={type.id} className={cn("p-6 px-8 flex items-center justify-between group hover:bg-neutral-50/30 transition-colors", !rule && "opacity-50")}>
                                    <div className="flex items-center gap-6">
                                        <Switch 
                                            checked={rule?.is_active || false} 
                                            onCheckedChange={() => rule && toggleRuleMutation.mutate(rule)}
                                            disabled={!rule}
                                            className="data-[state=checked]:bg-neutral-900" 
                                        />
                                        <span className="text-sm font-bold text-neutral-700">{type.label}</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                        <div className="flex gap-1.5 mr-4">
                                            <Badge variant="outline" className={cn("h-6 rounded-md text-[9px] font-black uppercase", hasSms ? "bg-neutral-900 text-white border-neutral-900" : "bg-white text-neutral-200 border-neutral-100")}>SMS</Badge>
                                            <Badge variant="outline" className={cn("h-6 rounded-md text-[9px] font-black uppercase", hasTg ? "bg-neutral-900 text-white border-neutral-900" : "bg-white text-neutral-200 border-neutral-100")}>TG</Badge>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                                            <Settings2 className="h-4 w-4 text-neutral-400" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
