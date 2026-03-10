'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { 
    TrendingUp, Users, Calendar as CalendarIcon, 
    Settings2, Banknote, CreditCard, Smartphone,
    ChevronRight, ArrowUpRight, ArrowDownRight,
    PieChart, BarChart3, Filter, Check, MoreVertical,
    Target, UserCheck, AlertCircle
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer, BarChart, Bar, Cell 
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
    Dialog, DialogContent, DialogHeader, 
    DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useBranch } from '@/context/branch-context';
import { cn } from '@/lib/utils';

export default function ReportsPage() {
    const { selectedBranchID } = useBranch();
    const branchId = Number(selectedBranchID);
    const queryClient = useQueryClient();

    // Date Range State
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: DateTime.now().minus({ days: 30 }).toJSDate(),
        to: DateTime.now().toJSDate()
    });

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const dateParams = useMemo(() => ({
        branch_id: branchId,
        from: DateTime.fromJSDate(dateRange.from).toISODate(),
        to: DateTime.fromJSDate(dateRange.to).toISODate()
    }), [branchId, dateRange]);

    // Queries
    const { data: widgets = [] } = useQuery({
        queryKey: ['report-widgets', branchId],
        queryFn: async () => (await api.get('/reports/dashboard/widgets', { params: { branch_id: branchId } })).data,
        enabled: !!branchId
    });

    const { data: revenue, isLoading: isLoadingRevenue } = useQuery({
        queryKey: ['report-revenue', dateParams],
        queryFn: async () => (await api.get('/reports/revenue', { params: dateParams })).data,
        enabled: !!branchId
    });

    const { data: stats, isLoading: isLoadingStats } = useQuery({
        queryKey: ['report-stats', dateParams],
        queryFn: async () => (await api.get('/reports/stats', { params: dateParams })).data,
        enabled: !!branchId
    });

    const { data: marketing, isLoading: isLoadingMarketing } = useQuery({
        queryKey: ['report-marketing', dateParams],
        queryFn: async () => (await api.get('/reports/marketing', { params: dateParams })).data,
        enabled: !!branchId
    });

    const { data: staff, isLoading: isLoadingStaff } = useQuery({
        queryKey: ['report-staff', dateParams],
        queryFn: async () => (await api.get('/reports/staff', { params: dateParams })).data,
        enabled: !!branchId
    });

    const toggleWidgetMutation = useMutation({
        mutationFn: async ({ widgetId, visible }: { widgetId: string; visible: boolean }) => {
            return api.patch(`/reports/dashboard/widgets/${widgetId}?branch_id=${branchId}`, { is_visible: visible });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['report-widgets'] })
    });

    const activeWidgets = useMemo(() => widgets.filter((w: any) => w.is_visible), [widgets]);

    const renderWidget = (widgetId: string) => {
        switch (widgetId) {
            case 'revenue_stats': return <RevenueWidget key={widgetId} data={revenue} isLoading={isLoadingRevenue} />;
            case 'average_check': return <AverageCheckWidget key={widgetId} data={revenue} isLoading={isLoadingRevenue} />;
            case 'visit_stats': return <SummaryWidget key={widgetId} data={stats} isLoading={isLoadingStats} />;
            case 'no_show_stats': return <NoShowWidget key={widgetId} data={stats} isLoading={isLoadingStats} />;
            case 'top_services': return <MarketingWidget key={widgetId} data={marketing} isLoading={isLoadingMarketing} />;
            default: return <Card key={widgetId} className="border-none shadow-sm rounded-[2rem] bg-white p-8 flex items-center justify-center text-center"><div className="space-y-2"><CardTitle className="text-xs font-black uppercase text-neutral-300 tracking-widest">{widgetId}</CardTitle><p className="text-[10px] text-neutral-400 font-bold uppercase">В разработке</p></div></Card>;
        }
    };

    return (
        <div className="p-8 space-y-10 max-w-[1600px] mx-auto min-h-screen bg-neutral-50/50">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black uppercase tracking-tight text-neutral-900">Аналитика</h1>
                    <p className="text-neutral-400 font-bold uppercase tracking-widest text-[10px]">Ключевые показатели бизнеса</p>
                </div>
                <div className="flex items-center gap-3">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="h-12 px-6 rounded-2xl border-neutral-100 bg-white font-bold text-xs gap-3 shadow-sm hover:bg-neutral-50">
                                <CalendarIcon className="h-4 w-4 text-neutral-400" />
                                {DateTime.fromJSDate(dateRange.from).toFormat('d MMM')} — {DateTime.fromJSDate(dateRange.to).toFormat('d MMM')}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-3xl border-none shadow-2xl" align="end">
                            <Calendar initialFocus mode="range" selected={{ from: dateRange.from, to: dateRange.to }} onSelect={(range: any) => range?.from && range?.to && setDateRange({ from: range.from, to: range.to })} className="p-4" />
                        </PopoverContent>
                    </Popover>
                    <Button onClick={() => setIsSettingsOpen(true)} variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-neutral-900 text-[#F5FF82] hover:bg-black shadow-lg"><Settings2 className="h-5 w-5" /></Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {activeWidgets.length > 0 ? activeWidgets.map((w: any) => renderWidget(w.widget_id)) : (
                    <div className="col-span-full py-24 text-center border-2 border-dashed border-neutral-200 rounded-[3rem]">
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-300">Настройте дашборд, чтобы увидеть отчеты</p>
                    </div>
                )}
            </div>

            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
                    <div className="p-8 space-y-8">
                        <DialogHeader><DialogTitle className="text-2xl font-black uppercase tracking-tight">Настройка</DialogTitle><DialogDescription className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Выберите активные виджеты</DialogDescription></DialogHeader>
                        <div className="space-y-3">
                            {widgets.map((w: any) => (
                                <div key={w.id || w.widget_id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                                    <span className="text-xs font-black uppercase tracking-tight text-neutral-900">{w.widget_id.replace('_', ' ')}</span>
                                    <Switch checked={w.is_visible} onCheckedChange={(checked) => toggleWidgetMutation.mutate({ widgetId: w.widget_id, visible: checked })} />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="p-6 bg-neutral-50 flex justify-end"><Button onClick={() => setIsSettingsOpen(false)} className="bg-neutral-900 text-white hover:bg-black rounded-xl font-bold uppercase text-[10px] tracking-widest px-8">Готово</Button></div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function RevenueWidget({ data, isLoading }: any) {
    if (isLoading) return <LoadingWidget />;
    return (
        <Card className="border-none shadow-sm rounded-[2rem] bg-white group hover:shadow-xl transition-all duration-500 overflow-hidden">
            <CardHeader className="p-6 pb-2"><div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center text-[#F5FF82]"><TrendingUp className="h-5 w-5" /></div><CardTitle className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mt-4">Выручка</CardTitle></CardHeader>
            <CardContent className="p-6 pt-0 space-y-6"><div className="text-3xl font-black text-neutral-900 tracking-tight">{data?.total_revenue?.toLocaleString() || 0} BYN</div><div className="grid grid-cols-2 gap-3 pt-4 border-t border-neutral-50"><div className="space-y-1"><span className="flex items-center gap-1.5 text-[8px] font-black uppercase text-neutral-400"><Banknote className="h-2.5 w-2.5" /> Нал</span><div className="text-xs font-bold text-neutral-900">{data?.cash_revenue?.toLocaleString() || 0}</div></div><div className="space-y-1"><span className="flex items-center gap-1.5 text-[8px] font-black uppercase text-neutral-400"><CreditCard className="h-2.5 w-2.5" /> Безнал</span><div className="text-xs font-bold text-neutral-900">{data?.card_revenue?.toLocaleString() || 0}</div></div></div></CardContent>
        </Card>
    );
}

function AverageCheckWidget({ data, isLoading }: any) {
    if (isLoading) return <LoadingWidget />;
    return (
        <Card className="border-none shadow-sm rounded-[2rem] bg-white group hover:shadow-xl transition-all duration-500">
            <CardHeader className="p-6 pb-2"><div className="w-10 h-10 bg-[#F5FF82] rounded-xl flex items-center justify-center text-neutral-900"><PieChart className="h-5 w-5" /></div><CardTitle className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mt-4">Средний чек</CardTitle></CardHeader>
            <CardContent className="p-6 pt-0"><div className="text-3xl font-black text-neutral-900 tracking-tight">{data?.average_check?.toFixed(1) || 0} BYN</div><p className="text-[9px] text-neutral-400 font-bold uppercase mt-4 tracking-widest">Всего {data?.visit_count || 0} оплат</p></CardContent>
        </Card>
    );
}

function SummaryWidget({ data, isLoading }: any) {
    if (isLoading) return <LoadingWidget />;
    return (
        <Card className="border-none shadow-sm rounded-[2rem] bg-white group hover:shadow-xl transition-all duration-500">
            <CardHeader className="p-6 pb-2"><div className="w-10 h-10 bg-neutral-100 rounded-xl flex items-center justify-center text-neutral-900"><Users className="h-5 w-5" /></div><CardTitle className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mt-4">Визиты</CardTitle></CardHeader>
            <CardContent className="p-6 pt-0"><div className="text-3xl font-black text-neutral-900 tracking-tight">{data?.visit_count || 0}</div><p className="text-[9px] text-neutral-400 font-bold uppercase mt-4 tracking-widest">Завершенных визитов</p></CardContent>
        </Card>
    );
}

function NoShowWidget({ data, isLoading }: any) {
    if (isLoading) return <LoadingWidget />;
    return (
        <Card className="border-none shadow-sm rounded-[2rem] bg-white group hover:shadow-xl transition-all duration-500">
            <CardHeader className="p-6 pb-2"><div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500"><AlertCircle className="h-5 w-5" /></div><CardTitle className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mt-4">Неявки</CardTitle></CardHeader>
            <CardContent className="p-6 pt-0"><div className="text-3xl font-black text-red-500 tracking-tight">{data?.no_show_count || 0}</div><p className="text-[9px] text-neutral-400 font-bold uppercase mt-4 tracking-widest">Пропущенных записей</p></CardContent>
        </Card>
    );
}

function MarketingWidget({ data, isLoading }: any) {
    if (isLoading) return <LoadingWidget />;
    return (
        <Card className="border-none shadow-sm rounded-[2rem] bg-white group hover:shadow-xl transition-all duration-500 md:col-span-2">
            <CardHeader className="p-6 pb-2"><div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center text-white"><Target className="h-5 w-5" /></div><CardTitle className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mt-4">Источники записи</CardTitle></CardHeader>
            <CardContent className="p-6 pt-0"><div className="space-y-3">{data?.sources?.map((s: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl"><span className="text-[10px] font-black uppercase text-neutral-900">{s.source}</span><div className="flex items-center gap-4"><span className="text-xs font-bold text-neutral-400">{s.count} виз.</span><span className="text-xs font-black text-neutral-900">{s.value} BYN</span></div></div>
            )) || <p className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest py-4">Нет данных по источникам</p>}</div></CardContent>
        </Card>
    );
}

function LoadingWidget() {
    return <Card className="border-none shadow-sm rounded-[2rem] bg-white p-6 space-y-4 animate-pulse"><div className="w-10 h-10 bg-neutral-50 rounded-xl" /><div className="h-2 w-20 bg-neutral-50 rounded" /><div className="h-8 w-32 bg-neutral-50 rounded" /></Card>;
}
