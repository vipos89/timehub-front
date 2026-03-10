'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
    TrendingUp, Users, Calendar, ArrowLeft, DollarSign, 
    ChevronDown, Clock, MousePointerClick, Star, Filter,
    BarChart3, UserCheck, Percent, AlertCircle
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, Cell
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

export default function StaffReportsPage() {
    const { selectedBranchID } = useBranch();
    const router = useRouter();
    const [period, setPeriod] = useState(PERIODS[1]); // Default 30 days

    const from = format(subDays(new Date(), period.days), 'yyyy-MM-dd');
    const to = format(new Date(), 'yyyy-MM-dd');

    const { data: report, isLoading } = useQuery({
        queryKey: ['staff-performance-report', selectedBranchID, period.days],
        queryFn: async () => {
            const resp = await api.get(`/reports/staff?branch_id=${selectedBranchID}&from=${from}&to=${to}`);
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

    const COLORS = ['#000000', '#FF7A00', '#71717a', '#e5e5e5'];

    return (
        <div className="space-y-10 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" className="rounded-xl h-12 w-12" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight text-neutral-900 uppercase italic leading-none">Персонал</h1>
                        <p className="text-neutral-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-3">Аналитика эффективности мастеров</p>
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
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Сбор данных...</p>
                </div>
            ) : (
                <div className="space-y-10">
                    {/* Top KPI row */}
                    <div className="grid gap-6 md:grid-cols-3">
                        <KPICard 
                            title="Лучший по выручке" 
                            name={report?.staff?.[0]?.name || '—'} 
                            value={`${Math.round(report?.staff?.[0]?.revenue || 0).toLocaleString()} BYN`}
                            icon={DollarSign}
                        />
                        <KPICard 
                            title="Самый загруженный" 
                            name={report?.staff?.slice().sort((a:any, b:any) => b.occupancy - a.occupancy)[0]?.name || '—'} 
                            value={`${report?.staff?.slice().sort((a:any, b:any) => b.occupancy - a.occupancy)[0]?.occupancy?.toFixed(1) || 0}%`}
                            icon={Clock}
                        />
                        <KPICard 
                            title="Высокий средний чек" 
                            name={report?.staff?.slice().sort((a:any, b:any) => b.avg_check - a.avg_check)[0]?.name || '—'} 
                            value={`${Math.round(report?.staff?.slice().sort((a:any, b:any) => b.avg_check - a.avg_check)[0]?.avg_check || 0).toLocaleString()} BYN`}
                            icon={TrendingUp}
                        />
                    </div>

                    {/* Chart & Table Section */}
                    <div className="grid gap-8 lg:grid-cols-3">
                        <Card className="lg:col-span-2 rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
                            <CardHeader className="p-8 border-b border-neutral-50 bg-neutral-50/20">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl font-black uppercase tracking-tight text-neutral-900 italic">Сравнение мастеров</CardTitle>
                                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest mt-1 text-neutral-400">Выручка по специалистам за период</CardDescription>
                                    </div>
                                    <div className="h-10 w-10 rounded-xl bg-neutral-900 flex items-center justify-center text-[#FF7A00]">
                                        <BarChart3 className="h-5 w-5" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8">
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={report?.staff || []}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                            <XAxis 
                                                dataKey="name" 
                                                axisLine={false} 
                                                tickLine={false} 
                                                tick={{fontSize: 10, fontWeight: 'bold'}}
                                            />
                                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                                            <Tooltip 
                                                cursor={{fill: '#f8f8f8'}}
                                                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Bar dataKey="revenue" fill="#000000" radius={[8, 8, 0, 0]} barSize={40}>
                                                {report?.staff?.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#000000' : '#e5e5e5'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden flex flex-col">
                            <CardHeader className="p-8 border-b border-neutral-50">
                                <CardTitle className="text-xl font-black uppercase tracking-tight text-neutral-900 italic">Топ по визитам</CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 flex-1">
                                <div className="space-y-6">
                                    {report?.staff?.slice(0, 5).map((s: any, idx: number) => (
                                        <div key={s.employee_id} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center font-black text-[10px]">
                                                    {idx + 1}
                                                </div>
                                                <span className="font-bold text-sm">{s.name}</span>
                                            </div>
                                            <Badge variant="secondary" className="rounded-lg font-black">{s.visits}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Detailed KPI Table */}
                    <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
                        <CardHeader className="p-8 border-b border-neutral-50">
                            <CardTitle className="text-xl font-black uppercase tracking-tight text-neutral-900 italic">Детальные показатели (KPI)</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-neutral-50/50">
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400">Мастер</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-center">Загрузка</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-center">Возвратность</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-center">Отмены / Неявки</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-right">Ср. чек</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report?.staff?.map((s: any) => (
                                            <tr key={s.employee_id} className="border-b border-neutral-50 last:border-none hover:bg-neutral-50/30 transition-colors">
                                                <td className="px-8 py-6">
                                                    <p className="font-black text-sm uppercase italic">{s.name}</p>
                                                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{s.visits} визитов</p>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <span className="font-bold text-sm">{s.occupancy?.toFixed(1)}%</span>
                                                        <div className="h-1 w-24 bg-neutral-100 rounded-full overflow-hidden">
                                                            <div 
                                                                className={cn("h-full rounded-full transition-all duration-1000", 
                                                                    s.occupancy > 80 ? "bg-rose-500" : s.occupancy > 50 ? "bg-black" : "bg-neutral-300")}
                                                                style={{ width: `${Math.min(100, s.occupancy)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none font-black rounded-lg">
                                                        {s.retention?.toFixed(1)}%
                                                    </Badge>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <div className="flex items-center justify-center gap-2 text-[10px] font-bold">
                                                        <span className="text-rose-500">{s.cancel_rate?.toFixed(1)}%</span>
                                                        <span className="text-neutral-300">/</span>
                                                        <span className="text-amber-600">{s.no_show_rate?.toFixed(1)}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-right font-black text-sm">
                                                    {Math.round(s.avg_check || 0).toLocaleString()} BYN
                                                </td>
                                            </tr>
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
