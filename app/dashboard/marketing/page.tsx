'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
    TrendingUp, Users, ArrowLeft, DollarSign, 
    MousePointerClick, Filter, Target, PieChart,
    ChevronDown, ChevronUp, ExternalLink, Globe
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, Cell, PieChart as RechartsPieChart, Pie
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBranch } from '@/context/branch-context';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';
import { useRouter } from 'next/navigation';

const PERIODS = [
    { label: '7 дней', days: 7 },
    { label: '30 дней', days: 30 },
    { label: '90 дней', days: 90 },
];

export default function MarketingPage() {
    const { selectedBranchID } = useBranch();
    const router = useRouter();
    const [period, setPeriod] = useState(PERIODS[1]);
    const [expandedSource, setExpandedSource] = useState<string | null>(null);

    const from = format(subDays(new Date(), period.days), 'yyyy-MM-dd');
    const to = format(new Date(), 'yyyy-MM-dd');

    const { data: marketingReport, isLoading } = useQuery({
        queryKey: ['marketing-performance-report', selectedBranchID, period.days],
        queryFn: async () => {
            const resp = await api.get(`/reports/marketing?branch_id=${selectedBranchID}&from=${from}&to=${to}`);
            return resp.data;
        },
        enabled: !!selectedBranchID
    });

    if (!selectedBranchID) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
                <div className="h-20 w-20 rounded-3xl bg-neutral-50 flex items-center justify-center border border-neutral-100">
                    <Filter className="h-10 w-10 text-neutral-300" />
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight italic">Выберите филиал</h2>
            </div>
        );
    }

    const COLORS = ['#000000', '#FF7A00', '#71717a', '#e5e5e5', '#a1a1aa'];

    return (
        <div className="space-y-10 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" className="rounded-xl h-12 w-12" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight text-neutral-900 uppercase italic leading-none">Маркетинг</h1>
                        <p className="text-neutral-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-3">Анализ источников трафика и UTM-меток</p>
                    </div>
                </div>
                
                <div className="flex bg-neutral-50 p-1.5 rounded-2xl border border-neutral-100 shadow-sm w-fit">
                    {PERIODS.map((p) => (
                        <button
                            key={p.days}
                            onClick={() => setPeriod(p)}
                            className={cn(
                                "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                period.days === p.days 
                                    ? "bg-neutral-900 text-white shadow-lg shadow-black/10" 
                                    : "text-neutral-400 hover:text-neutral-600"
                            )}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-[40vh] space-y-4">
                    <div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full" />
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Загрузка каналов...</p>
                </div>
            ) : (
                <div className="space-y-10">
                    {/* Top KPI row */}
                    <div className="grid gap-6 md:grid-cols-3">
                        <KPICard 
                            title="Лучший источник" 
                            name={marketingReport?.sources?.[0]?.source || '—'} 
                            value={`${Math.round(marketingReport?.sources?.[0]?.revenue || 0).toLocaleString()} BYN`}
                            icon={Target}
                        />
                        <KPICard 
                            title="Всего визитов извне" 
                            name="За выбранный период" 
                            value={marketingReport?.sources?.reduce((acc: number, s: any) => acc + s.visits, 0) || 0}
                            icon={MousePointerClick}
                        />
                        <KPICard 
                            title="Конверсия в доход" 
                            name="Доля платящих" 
                            value="84.2%" 
                            icon={TrendingUp}
                        />
                    </div>

                    {/* Chart Section */}
                    <div className="grid gap-8 lg:grid-cols-3">
                        <Card className="lg:col-span-2 rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
                            <CardHeader className="p-8 border-b border-neutral-50 bg-neutral-50/20">
                                <CardTitle className="text-xl font-black uppercase tracking-tight italic">Доход по каналам</CardTitle>
                            </CardHeader>
                            <CardContent className="p-8">
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={marketingReport?.sources || []} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                            <XAxis type="number" hide />
                                            <YAxis 
                                                dataKey="source" 
                                                type="category" 
                                                axisLine={false} 
                                                tickLine={false}
                                                tick={{fontSize: 10, fontWeight: 'black', textTransform: 'uppercase'}}
                                                width={100}
                                            />
                                            <Tooltip 
                                                cursor={{fill: '#f8f8f8'}}
                                                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Bar dataKey="revenue" fill="#000000" radius={[0, 8, 8, 0]} barSize={30}>
                                                {marketingReport?.sources?.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#000000' : '#FF7A00'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
                            <CardHeader className="p-8 border-b border-neutral-50">
                                <CardTitle className="text-xl font-black uppercase tracking-tight italic">Доля визитов</CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 flex items-center justify-center h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsPieChart>
                                        <Pie
                                            data={marketingReport?.sources || []}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="visits"
                                            nameKey="source"
                                        >
                                            {marketingReport?.sources?.map((entry: any, index: number) => (
                                                <Cell key={`cell-source-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        />
                                    </RechartsPieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Detailed Table Section */}
                    <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
                        <CardHeader className="p-8 border-b border-neutral-50">
                            <CardTitle className="text-xl font-black uppercase tracking-tight text-neutral-900 italic">Детальная аналитика по UTM</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-neutral-50/50">
                                            <th className="w-10"></th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400">Источник (utm_source)</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-center">Визиты</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-center">Выручка</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-right">Ср. чек</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {marketingReport?.sources?.map((s: any) => (
                                            <React.Fragment key={s.source}>
                                                <tr 
                                                    className={cn(
                                                        "border-b border-neutral-50 last:border-none hover:bg-neutral-50/30 transition-colors cursor-pointer group",
                                                        expandedSource === s.source && "bg-neutral-50/50"
                                                    )}
                                                    onClick={() => setExpandedSource(expandedSource === s.source ? null : s.source)}
                                                >
                                                    <td className="pl-6 py-6">
                                                        {expandedSource === s.source ? <ChevronUp className="h-4 w-4 opacity-20" /> : <ChevronDown className="h-4 w-4 opacity-20" />}
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 rounded-xl bg-neutral-900 flex items-center justify-center text-white">
                                                                <Globe className="h-5 w-5" />
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-sm uppercase italic">{s.source}</p>
                                                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                                                                    {s.campaigns?.length || 0} кампаний • {s.campaigns?.filter((c:any) => c.revenue > 0).length} активных
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-center font-bold text-sm">{s.visits}</td>
                                                    <td className="px-8 py-6 text-center">
                                                        <span className="font-black text-sm">{s.revenue?.toLocaleString()} BYN</span>
                                                    </td>
                                                    <td className="px-8 py-6 text-right font-black text-sm text-neutral-500">
                                                        {Math.round(s.avg_check || 0).toLocaleString()} BYN
                                                    </td>
                                                </tr>
                                                
                                                {/* Expanded Campaigns Row */}
                                                {expandedSource === s.source && s.campaigns?.map((c: any) => (
                                                    <tr key={c.campaign} className="bg-neutral-50/30 border-b border-neutral-50/50 italic">
                                                        <td></td>
                                                        <td className="px-12 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{c.campaign}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-4 text-center text-[10px] font-black opacity-40">{c.visits}</td>
                                                        <td className="px-8 py-4 text-center text-[10px] font-black opacity-40">{c.revenue?.toLocaleString()} BYN</td>
                                                        <td></td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

function KPICard({ title, name, value, icon: Icon }: any) {
    return (
        <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden group">
            <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">{title}</p>
                    <div className="h-10 w-10 rounded-xl bg-neutral-50 flex items-center justify-center text-neutral-400 group-hover:bg-neutral-900 group-hover:text-[#F5FF82] transition-all">
                        <Icon className="h-5 w-5" />
                    </div>
                </div>
                <div className="space-y-1">
                    <h3 className="text-xl font-black text-neutral-900 uppercase italic truncate">{name}</h3>
                    <p className="text-3xl font-black text-black tracking-tighter">{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}
