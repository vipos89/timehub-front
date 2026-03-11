'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    LayoutGrid, Plus, MapPin, Phone, Clock, Pencil, Trash2, 
    Search, Building2, Globe, Check, X, Info, Save
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBranch } from '@/context/branch-context';
import { useRouter } from 'next/navigation';

const DAYS = [
    { id: 1, name: 'Понедельник', short: 'ПН' },
    { id: 2, name: 'Вторник', short: 'ВТ' },
    { id: 3, name: 'Среда', short: 'СР' },
    { id: 4, name: 'Четверг', short: 'ЧТ' },
    { id: 5, name: 'Пятница', short: 'ПТ' },
    { id: 6, name: 'Суббота', short: 'СБ' },
    { id: 0, name: 'Воскресенье', short: 'ВС' }
];

export default function BranchesListPage() {
    const queryClient = useQueryClient();
    const router = useRouter();
    const { setSelectedBranchID } = useBranch();
    const [search, setSearch] = useState('');
    
    // -- Branch Creation State --
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [branchForm, setBranchForm] = useState<any>({
        name: '', description: '', address: '', phone: '',
        is_main: false, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        country_id: undefined, region_id: undefined, city_id: undefined,
        schedule: DAYS.map(d => ({ day_of_week: d.id, start_time: '09:00', end_time: '21:00', is_day_off: false }))
    });

    const [selectedCountryId, setSelectedCountryId] = useState<string>('');
    const [selectedRegionId, setSelectedRegionId] = useState<string>('');

    // -- Queries --
    const { data: company } = useQuery({ 
        queryKey: ['my-company'], 
        queryFn: async () => (await api.get('/companies')).data[0] || null 
    });

    const { data: branches = [], isLoading } = useQuery({ 
        queryKey: ['branches', company?.id], 
        queryFn: async () => (await api.get(`/companies/${company.id}/branches`)).data, 
        enabled: !!company?.id 
    });

    const { data: countries } = useQuery({ queryKey: ['countries'], queryFn: async () => (await api.get('/geo/countries')).data });
    const { data: regions } = useQuery({ queryKey: ['regions', selectedCountryId], queryFn: async () => (await api.get(`/geo/countries/${selectedCountryId}/regions`)).data, enabled: !!selectedCountryId });
    const { data: cities } = useQuery({ 
        queryKey: ['cities', selectedCountryId, selectedRegionId], 
        queryFn: async () => (await api.get(`/geo/cities`, { params: { country_id: selectedCountryId, region_id: selectedRegionId } })).data, 
        enabled: !!selectedCountryId 
    });

    // -- Mutations --
    const addBranchMutation = useMutation({
        mutationFn: (data: any) => api.post(`/companies/${company.id}/branches`, data),
        onSuccess: () => { 
            queryClient.invalidateQueries({ queryKey: ['branches'] }); 
            toast.success('Филиал успешно добавлен'); 
            setIsAddOpen(false);
            setBranchForm({
                name: '', description: '', address: '', phone: '',
                is_main: false, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                country_id: undefined, region_id: undefined, city_id: undefined,
                schedule: DAYS.map(d => ({ day_of_week: d.id, start_time: '09:00', end_time: '21:00', is_day_off: false }))
            });
        }
    });

    const handleEdit = (branch: any) => {
        setSelectedBranchID(branch.id.toString());
        router.push('/dashboard/settings/branch-local');
    };

    const filteredBranches = branches.filter((b: any) => 
        b.name.toLowerCase().includes(search.toLowerCase()) || 
        b.address.toLowerCase().includes(search.toLowerCase())
    );

    if (isLoading) return <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div></div>;

    return (
        <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-neutral-900 flex items-center justify-center text-white">
                        <LayoutGrid className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-neutral-900 uppercase">Список филиалов</h1>
                        <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest">Управление сетью ваших точек ({branches.length})</p>
                    </div>
                </div>
                <Button onClick={() => setIsAddOpen(true)} className="bg-neutral-900 text-white rounded-xl h-11 px-8 font-bold">
                    <Plus className="h-4 w-4 mr-2" /> Добавить филиал
                </Button>
            </div>

            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input 
                    placeholder="Поиск по названию или адресу..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-12 pl-12 rounded-2xl bg-white border-neutral-100 shadow-sm font-medium"
                />
            </div>

            <div className="grid grid-cols-1 gap-4">
                {filteredBranches.map((b: any) => (
                    <Card key={b.id} className="rounded-3xl border-none shadow-sm bg-white group hover:shadow-md transition-all overflow-hidden">
                        <CardContent className="p-0">
                            <div className="flex flex-col md:flex-row md:items-center justify-between p-6 gap-6">
                                <div className="flex items-start gap-5">
                                    <div className="h-14 w-14 rounded-2xl bg-neutral-50 flex items-center justify-center text-neutral-900 group-hover:bg-neutral-900 group-hover:text-[#F5FF82] transition-all shrink-0">
                                        <Building2 className="h-6 w-6" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-black text-neutral-900">{b.name}</h3>
                                            {b.is_main && <Badge className="bg-amber-50 text-amber-600 border-amber-100 font-black text-[8px] uppercase tracking-widest px-2">Основной</Badge>}
                                        </div>
                                        <p className="text-neutral-500 text-sm font-medium flex items-center gap-1.5">
                                            <MapPin className="h-3.5 w-3.5 text-neutral-300" /> {b.address || 'Адрес не указан'}
                                        </p>
                                        <div className="flex flex-wrap gap-4 mt-3">
                                            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                                                <Phone className="h-3 w-3" /> {b.phone || 'Нет телефона'}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                                                <Clock className="h-3 w-3" /> {b.timezone}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 md:border-l md:border-neutral-50 md:pl-6">
                                    <Button onClick={() => handleEdit(b)} variant="ghost" className="rounded-xl font-bold text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 px-4 h-10">
                                        <Pencil className="h-4 w-4 mr-2" /> Настроить
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-neutral-300 hover:text-red-500 hover:bg-red-50">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {filteredBranches.length === 0 && (
                    <div className="py-20 text-center space-y-4">
                        <div className="h-16 w-16 bg-neutral-50 rounded-full flex items-center justify-center mx-auto">
                            <Info className="h-8 w-8 text-neutral-200" />
                        </div>
                        <p className="text-neutral-400 font-bold uppercase text-xs tracking-widest">Филиалы не найдены</p>
                    </div>
                )}
            </div>

            {/* Add Branch Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="max-w-2xl rounded-[2rem] border-none p-0 overflow-hidden shadow-2xl">
                    <div className="bg-white flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-neutral-100 flex items-center justify-between">
                            <div>
                                <DialogTitle className="text-2xl font-black uppercase tracking-tight">Новый филиал</DialogTitle>
                                <DialogDescription className="text-xs font-bold uppercase text-neutral-400 tracking-widest mt-1">Добавление новой точки в вашу сеть</DialogDescription>
                            </div>
                        </div>

                        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar space-y-6 bg-neutral-50/30">
                            <div className="grid gap-4">
                                <div className="grid gap-2"><Label className="text-[10px] font-black uppercase opacity-40 ml-1">Название</Label><Input value={branchForm.name} onChange={(e) => setBranchForm({...branchForm, name: e.target.value})} className="h-12 rounded-xl border-none shadow-sm font-bold" /></div>
                                <div className="grid gap-2"><Label className="text-[10px] font-black uppercase opacity-40 ml-1">Телефон</Label><Input value={branchForm.phone} onChange={(e) => setBranchForm({...branchForm, phone: e.target.value})} className="h-12 rounded-xl border-none shadow-sm font-bold" placeholder="+375..." /></div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Страна</Label>
                                        <Select value={selectedCountryId} onValueChange={(val) => { setSelectedCountryId(val); setSelectedRegionId(''); setBranchForm((p: any) => ({...p, country_id: parseInt(val)})); }}>
                                            <SelectTrigger className="h-12 rounded-xl border-none shadow-sm font-bold"><SelectValue placeholder="Выбрать" /></SelectTrigger>
                                            <SelectContent>{countries?.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Регион</Label>
                                        <Select value={selectedRegionId} onValueChange={(val) => { setSelectedRegionId(val); setBranchForm((p: any) => ({...p, region_id: parseInt(val)})); }}>
                                            <SelectTrigger className="h-12 rounded-xl border-none shadow-sm font-bold"><SelectValue placeholder="Выбрать" /></SelectTrigger>
                                            <SelectContent>{regions?.map((r: any) => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Город</Label>
                                    <Select value={branchForm.city_id?.toString()} onValueChange={(val) => setBranchForm((p: any) => ({...p, city_id: parseInt(val)}))}>
                                        <SelectTrigger className="h-12 rounded-xl border-none shadow-sm font-bold"><SelectValue placeholder="Выбрать" /></SelectTrigger>
                                        <SelectContent>{cities?.map((city: any) => <SelectItem key={city.id} value={city.id.toString()}>{city.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2"><Label className="text-[10px] font-black uppercase opacity-40 ml-1">Адрес</Label><Input value={branchForm.address} onChange={(e) => setBranchForm({...branchForm, address: e.target.value})} className="h-12 rounded-xl border-none shadow-sm font-bold" /></div>
                            </div>
                        </div>

                        <div className="p-8 border-t border-neutral-100 flex justify-end gap-4 bg-white">
                            <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="rounded-xl font-bold text-neutral-400">Отмена</Button>
                            <Button onClick={() => addBranchMutation.mutate(branchForm)} disabled={addBranchMutation.isPending} className="bg-neutral-900 text-white rounded-xl h-12 px-10 font-black uppercase text-xs">
                                {addBranchMutation.isPending ? 'Создание...' : 'Создать филиал'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
