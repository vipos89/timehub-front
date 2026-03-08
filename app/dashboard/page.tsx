'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
    TrendingUp, Users, Calendar, ArrowUpRight, DollarSign, 
    ChevronDown, Clock, MousePointerClick, Star, Filter
} from 'lucide-react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBranch } from '@/context/branch-context';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';

const PERIODS = [
    { label: '7 дней', days: 7 },
    { label: '30 дней', days: 30 },
    { label: '90 дней', days: 90 },
];

export default function DashboardPage() {
    const { selectedBranchID } = useBranch();
    const [period, setPeriod] = useState(PERIODS[0]);

    const from = format(subDays(new Date(), period.days), 'yyyy-MM-dd');
    const to = format(new Date(), 'yyyy-MM-dd');

    const { data: stats, isLoading } = useQuery({
        queryKey: ['dashboard-stats', selectedBranchID, period.days],
        queryFn: async () => {
            const resp = await api.get(`/reports/stats?branch_id=${selectedBranchID}&from=${from}&to=${to}`);
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
                <div className="space-y-1">
                    <h2 className="text-xl font-black uppercase tracking-tight italic">Выберите филиал</h2>
                    <p className="text-neutral-400 text-sm font-bold uppercase tracking-widest">Для отображения аналитики</p>
                </div>
            </div>
        );
    }

    const COLORS = ['#000000', '#F5FF82', '#71717a', '#e5e5e5'];

    return (
        <div className="space-y-10 animate-in fade-in duration-700 pb-10">
            {/* Header with Period Switcher */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-neutral-900 uppercase italic leading-none">Аналитика</h1>
                    <p className="text-neutral-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-3">Обзор показателей эффективности филиала</p>
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

            {/* Top KPI Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard 
                    title="Выручка" 
                    value={`${stats?.total_revenue?.toLocaleString() || 0} BYN`}
                    desc="Сумма завершенных визитов"
                    icon={DollarSign}
                    trend="+12.5%"
                    isLoading={isLoading}
                />
                <StatCard 
                    title="Средний чек" 
                    value={`${Math.round(stats?.avg_check || 0).toLocaleString()} BYN`}
                    desc="Выручка на одного клиента"
                    icon={TrendingUp}
                    trend="+2.1%"
                    isLoading={isLoading}
                />
                <StatCard 
                    title="Всего записей" 
                    value={stats?.total_appointments || 0}
                    desc="Забронировано слотов"
                    icon={Calendar}
                    isLoading={isLoading}
                />
                <StatCard 
                    title="Загрузка" 
                    value={`${stats?.utilization?.toFixed(1) || 0}%`}
                    desc="Эффективность филиала"
                    icon={Clock}
                    isLoading={isLoading}
                    isUtilization
                />
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Main Revenue Chart */}
                <Card className="lg:col-span-2 rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="p-8 border-b border-neutral-50 bg-neutral-50/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xl font-black uppercase tracking-tight text-neutral-900 italic">Динамика выручки</CardTitle>
                                <CardDescription className="text-[10px] font-bold uppercase tracking-widest mt-1 text-neutral-400">Ежедневный доход за выбранный период</CardDescription>
                            </div>
                            <div className="h-10 w-10 rounded-xl bg-neutral-900 flex items-center justify-center text-[#F5FF82] shadow-lg shadow-black/10">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 pt-10">
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats?.revenue_by_day || []}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#000000" stopOpacity={0.05}/>
                                            <stop offset="95%" stopColor="#000000" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis 
                                        dataKey="date" 
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{fill: '#a3a3a3', fontSize: 10, fontWeight: 800}}
                                        tickFormatter={(val) => format(new Date(val), 'dd MMM', { locale: ru })}
                                        dy={10}
                                    />
                                    <YAxis 
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{fill: '#a3a3a3', fontSize: 10, fontWeight: 800}}
                                        tickFormatter={(val) => `${val >= 1000 ? val/1000 + 'k' : val}`}
                                    />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                                        labelStyle={{ color: '#a3a3a3', marginBottom: '4px' }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="revenue" 
                                        name="Выручка"
                                        stroke="#000000" 
                                        strokeWidth={4}
                                        fillOpacity={1} 
                                        fill="url(#colorRevenue)" 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Top Services */}
                <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden flex flex-col">
                    <CardHeader className="p-8 border-b border-neutral-50 bg-neutral-50/20">
                        <CardTitle className="text-xl font-black uppercase tracking-tight text-neutral-900 italic">Топ услуг</CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest mt-1 text-neutral-400">По количеству записей</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 flex-1">
                        <div className="space-y-6">
                            {stats?.services_usage?.sort((a: any, b: any) => b.value - a.value).slice(0, 5).map((item: any, idx: number) => (
                                <div key={item.name} className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black uppercase text-neutral-900 italic tracking-tight">{item.name}</span>
                                        <span className="text-sm font-black text-neutral-900">{item.value}</span>
                                    </div>
                                    <div className="h-2 w-full bg-neutral-50 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-neutral-900 rounded-full transition-all duration-1000" 
                                            style={{ width: `${(item.value / (stats?.services_usage?.[0]?.value || item.value)) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                            {(!stats?.services_usage || stats?.services_usage.length === 0) && !isLoading && (
                                <div className="text-center py-20 text-neutral-300 italic text-sm border-2 border-dashed border-neutral-50 rounded-[2rem]">Нет данных для отображения</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Employee Performance Grid */}
            <div className="grid gap-8">
                <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="p-8 border-b border-neutral-50 bg-neutral-50/20">
                        <CardTitle className="text-xl font-black uppercase tracking-tight text-neutral-900 italic">Эффективность мастеров</CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest mt-1 text-neutral-400">Показатели выручки и среднего чека</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-neutral-50/50 border-b border-neutral-50">
                                        <th className="px-8 py-4 text-left text-[9px] font-black uppercase tracking-widest text-neutral-400">Мастер</th>
                                        <th className="px-8 py-4 text-right text-[9px] font-black uppercase tracking-widest text-neutral-400">Визитов</th>
                                        <th className="px-8 py-4 text-right text-[9px] font-black uppercase tracking-widest text-neutral-400">Средний чек</th>
                                        <th className="px-8 py-4 text-right text-[9px] font-black uppercase tracking-widest text-neutral-400">Выручка</th>
                                        <th className="px-8 py-4 text-right text-[9px] font-black uppercase tracking-widest text-neutral-400">Доля</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(stats?.employee_performance || []).map((emp: any) => (
                                        <tr key={emp.employee_id} className="border-b border-neutral-50 last:border-0 hover:bg-neutral-50/30 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 bg-neutral-900 rounded-xl flex items-center justify-center text-[#F5FF82] text-[10px] font-black shadow-sm group-hover:scale-110 transition-transform">
                                                        {emp.name?.[0]}
                                                    </div>
                                                    <span className="text-sm font-black text-neutral-900">{emp.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right font-bold text-neutral-600">{emp.visits}</td>
                                            <td className="px-8 py-5 text-right font-bold text-neutral-600">{Math.round(emp.avg_check).toLocaleString()} BYN</td>
                                            <td className="px-8 py-5 text-right font-black text-neutral-900">{emp.revenue.toLocaleString()} BYN</td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className="text-[10px] font-black text-emerald-500">{Math.round((emp.revenue / (stats?.total_revenue || 1)) * 100)}%</span>
                                                    <div className="w-12 h-1 bg-neutral-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(emp.revenue / (stats?.total_revenue || 1)) * 100}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!stats?.employee_performance || stats?.employee_performance.length === 0) && !isLoading && (
                                        <tr>
                                            <td colSpan={5} className="py-20 text-center text-neutral-300 italic text-sm">Нет данных по мастерам</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Grid: Status & Source Distribution */}
            <div className="grid gap-8 lg:grid-cols-2">
                <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="p-8 border-b border-neutral-50">
                        <CardTitle className="text-xl font-black uppercase tracking-tight text-neutral-900 italic">Статусы визитов</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 flex items-center justify-center h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats?.status_distribution || []}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {stats?.status_distribution?.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-col gap-3 ml-4">
                            {stats?.status_distribution?.map((item: any, idx: number) => (
                                <div key={item.name} className="flex items-center gap-3">
                                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{item.name}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="p-8 border-b border-neutral-50">
                        <CardTitle className="text-xl font-black uppercase tracking-tight text-neutral-900 italic">Источники записи</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 flex items-center justify-center h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats?.source_distribution || []}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {stats?.source_distribution?.map((entry: any, index: number) => (
                                        <Cell key={`cell-source-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-col gap-3 ml-4">
                            {stats?.source_distribution?.map((item: any, idx: number) => (
                                <div key={item.name} className="flex items-center gap-3">
                                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[(idx + 2) % COLORS.length] }} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">{item.name}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tips Section */}
            <div className="grid gap-8">
                <div className="bg-[#F5FF82] rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center justify-between border border-[#e4ee6b] shadow-xl shadow-[#F5FF82]/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Star className="h-40 w-40 text-black fill-black" />
                    </div>
                    <div className="space-y-4 relative z-10">
                        <Badge className="bg-black text-[#F5FF82] hover:bg-black font-black uppercase tracking-widest text-[9px] px-3 py-1 rounded-lg">Совет дня</Badge>
                        <h3 className="text-2xl font-black text-neutral-900 uppercase italic tracking-tight leading-tight">Увеличьте возвращаемость<br />на 15% за месяц</h3>
                        <p className="text-neutral-800/70 text-sm font-bold leading-relaxed max-w-sm italic">
                            Настройте автоматическое напоминание клиентам, которые не были у вас более 30 дней в разделе "Уведомления".
                        </p>
                    </div>
                    <Button className="w-fit mt-6 md:mt-0 bg-neutral-900 text-white rounded-2xl h-12 px-8 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-black/20 hover:bg-black relative z-10">
                        Настроить сейчас
                    </Button>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, desc, icon: Icon, trend, isLoading, isUtilization }: any) {
    return (
        <Card className="rounded-[2rem] border-none shadow-sm bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden group">
            <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="h-12 w-12 rounded-2xl bg-neutral-50 flex items-center justify-center text-neutral-400 group-hover:bg-neutral-900 group-hover:text-[#F5FF82] transition-all duration-500">
                        <Icon className="h-6 w-6" />
                    </div>
                    {trend && (
                        <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black italic">
                            {trend}
                        </div>
                    )}
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">{title}</p>
                    {isLoading ? (
                        <div className="h-9 w-24 bg-neutral-50 animate-pulse rounded-lg" />
                    ) : (
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-black text-neutral-900 italic tracking-tight">{value}</h3>
                        </div>
                    )}
                    {isUtilization && !isLoading && (
                        <div className="h-1.5 w-full bg-neutral-50 rounded-full mt-3 overflow-hidden">
                            <div 
                                className="h-full bg-neutral-900 rounded-full transition-all duration-1000" 
                                style={{ width: `${value}` }}
                            />
                        </div>
                    )}
                    <p className="text-[9px] font-bold text-neutral-300 uppercase tracking-widest mt-2">{desc}</p>
                </div>
            </CardContent>
        </Card>
    );
}
