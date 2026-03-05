'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    Smartphone, MapPin, Phone, Info, Clock, Save, 
    Check, X, Globe, Calendar, ShieldCheck, Building2,
    ChevronLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useBranch } from '@/context/branch-context';
import { cn } from '@/lib/utils';
import { AvatarUpload } from '@/components/avatar-upload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

const DAYS = [
    { id: 1, name: 'Понедельник', short: 'ПН' },
    { id: 2, name: 'Вторник', short: 'ВТ' },
    { id: 3, name: 'Среда', short: 'СР' },
    { id: 4, name: 'Четверг', short: 'ЧТ' },
    { id: 5, name: 'Пятница', short: 'ПТ' },
    { id: 6, name: 'Суббота', short: 'СБ' },
    { id: 0, name: 'Воскресенье', short: 'ВС' }
];

export default function LocalBranchSettingsPage() {
    const queryClient = useQueryClient();
    const { selectedBranchID } = useBranch();
    const [branchForm, setBranchForm] = useState<any>(null);
    const [scheduleType, setScheduleType] = useState<'unified' | 'detailed'>('detailed');
    const [unifiedSchedule, setUnifiedSchedule] = useState({ start_time: '09:00', end_time: '21:00', days_off: [0] });
    const timezones = Intl.supportedValuesOf('timeZone');

    const [selectedCountryId, setSelectedCountryId] = useState<string>('');
    const [selectedRegionId, setSelectedRegionId] = useState<string>('');

    const { data: branch, isLoading } = useQuery({ 
        queryKey: ['branch-settings', selectedBranchID], 
        queryFn: async () => (await api.get(`/branches/${selectedBranchID}`)).data,
        enabled: !!selectedBranchID
    });

    const { data: countries } = useQuery({ queryKey: ['countries'], queryFn: async () => (await api.get('/geo/countries')).data });
    const { data: regions } = useQuery({ 
        queryKey: ['regions', selectedCountryId], 
        queryFn: async () => (await api.get(`/geo/countries/${selectedCountryId}/regions`)).data, 
        enabled: !!selectedCountryId 
    });
    const { data: cities } = useQuery({ 
        queryKey: ['cities', selectedCountryId, selectedRegionId], 
        queryFn: async () => (await api.get(`/geo/cities`, { params: { country_id: selectedCountryId, region_id: selectedRegionId } })).data, 
        enabled: !!selectedCountryId && !!selectedRegionId
    });

    useEffect(() => {
        if (branch) {
            setBranchForm({
                ...branch,
                schedule: DAYS.map(d => {
                    const found = (branch.schedule || []).find((s: any) => s.day_of_week === d.id);
                    return found ? { ...found } : { day_of_week: d.id, start_time: '09:00', end_time: '21:00', is_day_off: false };
                })
            });
            if (branch.country_id) setSelectedCountryId(branch.country_id.toString());
            if (branch.region_id) setSelectedRegionId(branch.region_id.toString());
        }
    }, [branch]);

    const updateBranchMutation = useMutation({
        mutationFn: (data: any) => {
            const { employees, categories, services, widgets, created_at, updated_at, company_id, ...payload } = data;
            return api.put(`/branches/${selectedBranchID}`, payload);
        },
        onSuccess: () => { 
            queryClient.invalidateQueries({ queryKey: ['branch-settings', selectedBranchID] }); 
            toast.success('Настройки сохранены'); 
        }
    });

    const applyUnifiedSchedule = () => {
        if (!branchForm) return;
        setBranchForm((prev: any) => ({
            ...prev,
            schedule: prev.schedule.map((s: any) => ({
                ...s,
                start_time: unifiedSchedule.start_time,
                end_time: unifiedSchedule.end_time,
                is_day_off: unifiedSchedule.days_off.includes(s.day_of_week)
            }))
        }));
    };

    if (isLoading || !branchForm) return <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div></div>;

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6 animate-in fade-in duration-500">
            {/* Minimal Breadcrumbs / Back */}
            <div className="flex items-center justify-between">
                <Link href="/dashboard/settings" className="flex items-center gap-2 text-neutral-400 hover:text-neutral-900 transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Назад к настройкам</span>
                </Link>
                <Button onClick={() => updateBranchMutation.mutate(branchForm)} size="sm" className="bg-neutral-900 text-white rounded-xl h-10 px-6 font-bold">
                    <Save className="h-4 w-4 mr-2" /> Сохранить
                </Button>
            </div>

            {/* Clean Header */}
            <div className="bg-white border border-neutral-100 rounded-3xl p-8 shadow-sm">
                <div className="flex items-center gap-5">
                    <div className="h-14 w-14 rounded-2xl bg-neutral-50 flex items-center justify-center text-neutral-900 border border-neutral-100">
                        <Building2 className="h-7 w-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-neutral-900 uppercase">{branchForm.name}</h1>
                        <p className="text-neutral-400 text-[10px] font-black uppercase tracking-widest mt-0.5">Локальная конфигурация филиала</p>
                    </div>
                </div>

                <Tabs defaultValue="general" className="mt-10">
                    <TabsList className="bg-neutral-50 p-1 rounded-xl h-11 inline-flex">
                        <TabsTrigger value="general" className="rounded-lg px-6 font-bold text-xs">Основное</TabsTrigger>
                        <TabsTrigger value="schedule" className="rounded-lg px-6 font-bold text-xs">График</TabsTrigger>
                        <TabsTrigger value="legal" className="rounded-lg px-6 font-bold text-xs">Реквизиты</TabsTrigger>
                    </TabsList>

                    <div className="mt-8">
                        {/* GENERAL TAB */}
                        <TabsContent value="general" className="m-0 animate-in fade-in slide-in-from-left-2 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div className="space-y-6">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-900 border-b border-neutral-100 pb-2">Контакты</h3>
                                    <div className="space-y-4">
                                        <div className="grid gap-1.5"><Label className="text-[10px] font-black uppercase opacity-40 ml-1">Название филиала</Label><Input value={branchForm.name} onChange={(e) => setBranchForm({...branchForm, name: e.target.value})} className="h-10 rounded-xl bg-neutral-50 border-transparent focus:bg-white focus:border-neutral-200 transition-all font-bold text-sm" /></div>
                                        <div className="grid gap-1.5"><Label className="text-[10px] font-black uppercase opacity-40 ml-1">Публичный телефон</Label><Input value={branchForm.phone} onChange={(e) => setBranchForm({...branchForm, phone: e.target.value})} className="h-10 rounded-xl bg-neutral-50 border-transparent focus:bg-white focus:border-neutral-200 transition-all font-bold text-sm" /></div>
                                        <div className="grid gap-1.5"><Label className="text-[10px] font-black uppercase opacity-40 ml-1">Описание</Label><Textarea value={branchForm.description} onChange={(e) => setBranchForm({...branchForm, description: e.target.value})} className="min-h-[100px] rounded-xl bg-neutral-50 border-transparent focus:bg-white focus:border-neutral-200 transition-all resize-none p-3 text-sm font-medium" /></div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-900 border-b border-neutral-100 pb-2">Расположение</h3>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="grid gap-1.5">
                                                <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Страна</Label>
                                                <Select value={selectedCountryId} onValueChange={(val) => { setSelectedCountryId(val); setSelectedRegionId(''); setBranchForm(p => ({...p, country_id: parseInt(val)})); }}>
                                                    <SelectTrigger className="h-10 rounded-xl bg-neutral-50 border-transparent font-bold text-xs"><SelectValue /></SelectTrigger>
                                                    <SelectContent>{countries?.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid gap-1.5">
                                                <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Регион</Label>
                                                <Select value={selectedRegionId} onValueChange={(val) => { setSelectedRegionId(val); setBranchForm(p => ({...p, region_id: parseInt(val)})); }}>
                                                    <SelectTrigger className="h-10 rounded-xl bg-neutral-50 border-transparent font-bold text-xs"><SelectValue /></SelectTrigger>
                                                    <SelectContent>{regions?.map((r: any) => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Город</Label>
                                            <Select value={branchForm.city_id?.toString()} onValueChange={(val) => setBranchForm(p => ({...p, city_id: parseInt(val)}))}>
                                                <SelectTrigger className="h-10 rounded-xl bg-neutral-50 border-transparent font-bold text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>{cities?.map((city: any) => <SelectItem key={city.id} value={city.id.toString()}>{city.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-1.5"><Label className="text-[10px] font-black uppercase opacity-40 ml-1">Точный адрес</Label><Input value={branchForm.address} onChange={(e) => setBranchForm({...branchForm, address: e.target.value})} className="h-10 rounded-xl bg-neutral-50 border-transparent font-bold text-sm" /></div>
                                        <div className="grid gap-1.5"><Label className="text-[10px] font-black uppercase opacity-40 ml-1">Часовой пояс</Label>
                                            <Select value={branchForm.timezone} onValueChange={(val) => setBranchForm({...branchForm, timezone: val})}>
                                                <SelectTrigger className="h-10 rounded-xl bg-neutral-50 border-transparent font-bold text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>{timezones.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* SCHEDULE TAB */}
                        <TabsContent value="schedule" className="m-0 animate-in fade-in slide-in-from-left-2 duration-300">
                            <div className="max-w-2xl space-y-8">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-neutral-900">График работы</h3>
                                    <div className="flex bg-neutral-100 p-1 rounded-lg">
                                        <button onClick={() => setScheduleType('unified')} className={cn("px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all", scheduleType === 'unified' ? "bg-white shadow-sm text-black" : "text-neutral-400")}>Единый</button>
                                        <button onClick={() => setScheduleType('detailed')} className={cn("px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all", scheduleType === 'detailed' ? "bg-white shadow-sm text-black" : "text-neutral-400")}>По дням</button>
                                    </div>
                                </div>

                                {scheduleType === 'unified' ? (
                                    <div className="bg-neutral-50 rounded-2xl p-8 space-y-8">
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="space-y-2"><Label className="text-[10px] font-black uppercase opacity-40 ml-1">Открытие</Label><Input type="time" value={unifiedSchedule.start_time} onChange={(e) => setUnifiedSchedule({...unifiedSchedule, start_time: e.target.value})} className="h-12 rounded-xl bg-white border-none font-black text-lg text-center shadow-sm" /></div>
                                            <div className="space-y-2"><Label className="text-[10px] font-black uppercase opacity-40 ml-1">Закрытие</Label><Input type="time" value={unifiedSchedule.end_time} onChange={(e) => setUnifiedSchedule({...unifiedSchedule, end_time: e.target.value})} className="h-12 rounded-xl bg-white border-none font-black text-lg text-center shadow-sm" /></div>
                                        </div>
                                        <div className="flex justify-between gap-2">
                                            {DAYS.map(d => (
                                                <button key={d.id} onClick={() => setUnifiedSchedule(p => ({...p, days_off: p.days_off.includes(d.id) ? p.days_off.filter(id => id !== d.id) : [...p.days_off, d.id]}))} className={cn("h-12 flex-1 rounded-xl flex items-center justify-center border-2 transition-all text-[10px] font-black", unifiedSchedule.days_off.includes(d.id) ? "bg-red-50 border-red-100 text-red-500" : "bg-white border-neutral-100 text-neutral-400")}>
                                                    {d.short}
                                                </button>
                                            ))}
                                        </div>
                                        <Button onClick={applyUnifiedSchedule} className="w-full bg-neutral-900 text-white rounded-xl h-11 font-bold">Применить ко всем дням</Button>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-neutral-50">
                                        {branchForm.schedule.map((s: any, idx: number) => (
                                            <div key={s.day_of_week} className="py-4 flex items-center justify-between group">
                                                <div className="flex items-center gap-4">
                                                    <Switch checked={!s.is_day_off} onCheckedChange={(val) => { const newS = [...branchForm.schedule]; newS[idx].is_day_off = !val; setBranchForm({...branchForm, schedule: newS}); }} className="data-[state=checked]:bg-neutral-900" />
                                                    <span className={cn("text-sm font-bold uppercase tracking-tight transition-opacity", s.is_day_off ? "text-neutral-300" : "text-neutral-700")}>
                                                        {DAYS.find(d => d.id === s.day_of_week)?.name}
                                                    </span>
                                                </div>
                                                {!s.is_day_off ? (
                                                    <div className="flex items-center gap-2">
                                                        <Input type="time" value={s.start_time} onChange={(e) => { const newS = [...branchForm.schedule]; newS[idx].start_time = e.target.value; setBranchForm({...branchForm, schedule: newS}); }} className="h-9 w-24 bg-neutral-50 border-none font-black text-center rounded-lg" />
                                                        <span className="text-neutral-300">—</span>
                                                        <Input type="time" value={s.end_time} onChange={(e) => { const newS = [...branchForm.schedule]; newS[idx].end_time = e.target.value; setBranchForm({...branchForm, schedule: newS}); }} className="h-9 w-24 bg-neutral-50 border-none font-black text-center rounded-lg" />
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] font-black uppercase text-neutral-300 tracking-widest mr-4">Выходной</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        {/* LEGAL TAB */}
                        <TabsContent value="legal" className="m-0 animate-in fade-in slide-in-from-left-2 duration-300">
                            <div className="max-w-2xl space-y-10">
                                <div className="flex gap-8 items-start">
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black uppercase opacity-40 ml-1 text-center block">Логотип</Label>
                                        <AvatarUpload value={branchForm.logo_url} onChange={(url) => setBranchForm({ ...branchForm, logo_url: url })} />
                                    </div>
                                    <div className="flex-1 space-y-6">
                                        <div className="grid gap-1.5">
                                            <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Юридическое название</Label>
                                            <Input value={branchForm.legal_name} onChange={(e) => setBranchForm({...branchForm, legal_name: e.target.value})} className="h-11 rounded-xl bg-neutral-50 border-transparent font-bold text-sm" placeholder="Использовать данные компании" />
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label className="text-[10px] font-black uppercase opacity-40 ml-1">УНП / ИНН</Label>
                                            <Input value={branchForm.tax_id} onChange={(e) => setBranchForm({...branchForm, tax_id: e.target.value})} className="h-11 rounded-xl bg-neutral-50 border-transparent font-bold text-sm font-mono" />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid gap-1.5">
                                    <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Юридический адрес филиала</Label>
                                    <Input value={branchForm.legal_address} onChange={(e) => setBranchForm({...branchForm, legal_address: e.target.value})} className="h-11 rounded-xl bg-neutral-50 border-transparent font-bold text-sm" />
                                </div>
                                <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 flex gap-4">
                                    <ShieldCheck className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-blue-700 leading-relaxed font-medium">Индивидуальные реквизиты позволяют филиалу выступать как самостоятельное юридическое лицо. Эти данные будут приоритетнее общих данных компании в чеках и виджетах.</p>
                                </div>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </div>
    );
}
