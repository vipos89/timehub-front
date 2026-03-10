'use client';

import { useQuery } from '@tanstack/react-query';
import { 
    Users, ArrowLeft, Filter, TrendingUp, UserPlus, 
    RefreshCcw, Calendar, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useBranch } from '@/context/branch-context';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function RetentionReportPage() {
    const { selectedBranchID } = useBranch();
    const router = useRouter();

    const { data: report, isLoading } = useQuery({
        queryKey: ['retention-report', selectedBranchID],
        queryFn: async () => {
            const resp = await api.get(`/reports/retention?branch_id=${selectedBranchID}`);
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

    const getBgColor = (value: number) => {
        if (value === 100) return 'bg-neutral-900 text-white';
        if (value > 40) return 'bg-emerald-500 text-white';
        if (value > 25) return 'bg-emerald-400 text-white';
        if (value > 15) return 'bg-emerald-300 text-emerald-900';
        if (value > 5) return 'bg-emerald-100 text-emerald-800';
        if (value > 0) return 'bg-emerald-50/50 text-emerald-600';
        return 'bg-neutral-50 text-neutral-300';
    };

    const formatMonth = (monthStr: string) => {
        try {
            const date = parseISO(monthStr + "-01");
            return format(date, 'MMM yyyy', { locale: ru });
        } catch (e) {
            return monthStr;
        }
    };

    return (
        <div className="space-y-10 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" className="rounded-xl h-12 w-12" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight text-neutral-900 uppercase italic leading-none">Retention</h1>
                        <p className="text-neutral-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-3">Анализ возвращаемости клиентов (Когорты)</p>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-[40vh] space-y-4">
                    <div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full" />
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Анализ когорт...</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Summary Cards */}
                    <div className="grid gap-6 md:grid-cols-3">
                        <KPICard 
                            title="Новых клиентов" 
                            value={report?.cohorts?.reduce((acc: number, c: any) => acc + c.new_clients, 0) || 0}
                            desc="За последние 6 месяцев"
                            icon={UserPlus}
                        />
                        <KPICard 
                            title="Ср. возвращаемость" 
                            value={`${(report?.cohorts?.[0]?.retention?.[1] || 0).toFixed(1)}%`}
                            desc="На второй месяц (Month 1)"
                            icon={RefreshCcw}
                        />
                        <KPICard 
                            title="Здоровье бизнеса" 
                            value={report?.cohorts?.[0]?.retention?.[1] > 20 ? "Стабильно" : "Требует внимания"}
                            desc="Оценка Retention Rate"
                            icon={TrendingUp}
                        />
                    </div>

                    {/* Cohort Table */}
                    <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden">
                        <CardHeader className="p-8 border-b border-neutral-50 bg-neutral-50/20">
                            <CardTitle className="text-xl font-black uppercase tracking-tight text-neutral-900 italic">Когортный анализ</CardTitle>
                            <CardDescription className="text-[10px] font-bold uppercase tracking-widest mt-1 text-neutral-400">Процент клиентов, совершивших повторный визит</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-neutral-50/50">
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-left border-r border-neutral-100/50">Когорта (Месяц)</th>
                                            <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-center border-r border-neutral-100/50">Clients</th>
                                            {[0, 1, 2, 3, 4, 5].map(m => (
                                                <th key={m} className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-center">
                                                    Month {m}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report?.cohorts?.map((c: any) => (
                                            <tr key={c.month} className="border-b border-neutral-50 last:border-none">
                                                <td className="px-8 py-5 border-r border-neutral-100/50">
                                                    <span className="font-black text-sm uppercase italic">{formatMonth(c.month)}</span>
                                                </td>
                                                <td className="px-6 py-5 text-center border-r border-neutral-100/50 font-bold text-neutral-400">
                                                    {c.new_clients}
                                                </td>
                                                {c.retention.map((val: number, idx: number) => (
                                                    <td key={idx} className="p-1">
                                                        <div className={cn(
                                                            "h-12 flex items-center justify-center rounded-xl text-xs font-black transition-all hover:scale-105 cursor-default",
                                                            getBgColor(val)
                                                        )}>
                                                            {val > 0 ? `${val.toFixed(idx === 0 ? 0 : 1)}%` : '—'}
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Legend/Info */}
                    <div className="flex items-center gap-2 px-4 opacity-40">
                        <AlertCircle className="h-4 w-4" />
                        <p className="text-[9px] font-bold uppercase tracking-widest">
                            Когорта — это группа клиентов, совершивших свой первый визит в указанном месяце.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

function KPICard({ title, value, desc, icon: Icon }: any) {
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
                    <h3 className="text-3xl font-black text-black tracking-tighter italic">{value}</h3>
                    <p className="text-[9px] font-bold text-neutral-300 uppercase tracking-widest mt-2">{desc}</p>
                </div>
            </CardContent>
        </Card>
    );
}
