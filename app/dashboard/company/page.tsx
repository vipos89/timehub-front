'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    Building2, MapPin, Phone, Mail, Globe, Instagram, Send, Plus, Trash2, Pencil, Save, 
    FileText, Users, Info, Smartphone, Share2, Check, X, Clock, Calendar, ChevronLeft, ChevronRight,
    Bell
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AvatarUpload } from '@/components/avatar-upload';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { NotificationSettings } from '@/components/dashboard/notification-settings';

const DAYS = [
    { id: 1, name: 'Понедельник', short: 'ПН' },
    { id: 2, name: 'Вторник', short: 'ВТ' },
    { id: 3, name: 'Среда', short: 'СР' },
    { id: 4, name: 'Четверг', short: 'ЧТ' },
    { id: 5, name: 'Пятница', short: 'ПТ' },
    { id: 6, name: 'Суббота', short: 'СБ' },
    { id: 0, name: 'Воскресенье', short: 'ВС' }
];

export default function CompanyPage() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('general');
    const timezones = Intl.supportedValuesOf('timeZone');
    
    // -- Company State --
    const [companyForm, setCompanyForm] = useState<any>({
        name: '', description: '', logo_url: '', website: '', tax_id: '', legal_name: '', legal_address: '',
        contact_phones: [], contact_emails: [], social_links: { instagram: '', telegram: '', vk: '', whatsapp: '' }
    });

    // -- Branch State --
    const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<any>(null);
    const [branchForm, setBranchForm] = useState<any>({
        name: '', description: '', address: '', phone: '', contact_phones: [], contact_emails: [],
        is_main: false, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        country_id: undefined, region_id: undefined, city_id: undefined,
        schedule: DAYS.map(d => ({ day_of_week: d.id, start_time: '09:00', end_time: '21:00', is_day_off: false }))
    });

    const [scheduleType, setScheduleType] = useState<'unified' | 'detailed'>('unified');
    const [unifiedSchedule, setUnifiedSchedule] = useState({ start_time: '09:00', end_time: '21:00', days_off: [0] as number[] });

    // -- Geo Selectors State --
    const [selectedCountryId, setSelectedCountryId] = useState<string>('');
    const [selectedRegionId, setSelectedRegionId] = useState<string>('');

    // -- Queries --
    const { data: company, isLoading: isLoadingCompany } = useQuery({ queryKey: ['my-company'], queryFn: async () => (await api.get('/companies')).data[0] || null });
    const { data: branches = [] } = useQuery({ queryKey: ['branches', company?.id], queryFn: async () => (await api.get(`/companies/${company.id}/branches`)).data, enabled: !!company?.id });
    
    const { data: countries } = useQuery({ queryKey: ['countries'], queryFn: async () => (await api.get('/geo/countries')).data });
    const { data: regions } = useQuery({ queryKey: ['regions', selectedCountryId], queryFn: async () => (await api.get(`/geo/countries/${selectedCountryId}/regions`)).data, enabled: !!selectedCountryId });
    const { data: cities } = useQuery({ 
        queryKey: ['cities', selectedCountryId, selectedRegionId], 
        queryFn: async () => (await api.get(`/geo/cities`, { params: { country_id: selectedCountryId, region_id: selectedRegionId } })).data, 
        enabled: !!selectedCountryId 
    });

    useEffect(() => {
        if (company) {
            setCompanyForm({
                ...company,
                contact_phones: Array.isArray(company.contact_phones) ? company.contact_phones : [],
                contact_emails: Array.isArray(company.contact_emails) ? company.contact_emails : [],
                social_links: typeof company.social_links === 'object' ? company.social_links : JSON.parse(company.social_links || '{}'),
            });
        }
    }, [company]);

    // -- Mutations --
    const updateCompanyMutation = useMutation({
        mutationFn: (data: any) => api.put(`/companies/${company.id}`, { ...data, social_links: JSON.stringify(data.social_links) }),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['my-company'] }); toast.success('Данные обновлены'); }
    });

    const addBranchMutation = useMutation({
        mutationFn: (data: any) => {
            const { employees, categories, services, widgets, id, created_at, updated_at, company_id, ...payload } = data;
            return api.post(`/companies/${company.id}/branches`, payload);
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['branches'] }); toast.success('Филиал добавлен'); setIsAddBranchOpen(false); resetBranchForm(); }
    });

    const updateBranchMutation = useMutation({
        mutationFn: (data: any) => {
            const { employees, categories, services, widgets, created_at, updated_at, company_id, ...payload } = data;
            return api.put(`/branches/${data.id}`, payload);
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['branches'] }); toast.success('Филиал обновлен'); setEditingBranch(null); }
    });

    const resetBranchForm = () => {
        setBranchForm({
            name: '', description: '', address: '', phone: '', contact_phones: [], contact_emails: [],
            is_main: false, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            country_id: undefined, region_id: undefined, city_id: undefined,
            schedule: DAYS.map(d => ({ day_of_week: d.id, start_time: '09:00', end_time: '21:00', is_day_off: false }))
        });
        setSelectedCountryId(''); setSelectedRegionId(''); setScheduleType('detailed');
    };

    const handleEditBranch = (branch: any) => {
        setEditingBranch(branch);
        const existingSchedule = branch.schedule || [];
        setBranchForm({
            ...branch,
            contact_phones: Array.isArray(branch.contact_phones) ? branch.contact_phones : [],
            contact_emails: Array.isArray(branch.contact_emails) ? branch.contact_emails : [],
            schedule: DAYS.map(d => {
                const found = existingSchedule.find((s: any) => s.day_of_week === d.id);
                return found ? { ...found } : { day_of_week: d.id, start_time: '09:00', end_time: '21:00', is_day_off: false };
            })
        });
        if (branch.country_id) setSelectedCountryId(branch.country_id.toString());
        if (branch.region_id) setSelectedRegionId(branch.region_id.toString());
        setScheduleType('detailed');
    };

    const applyUnifiedSchedule = () => {
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

    useEffect(() => {
        if (scheduleType === 'unified') applyUnifiedSchedule();
    }, [unifiedSchedule, scheduleType]);

    const handleAddField = (form: any, setForm: any, field: string) => setForm({ ...form, [field]: [...form[field], ''] });
    const handleRemoveField = (form: any, setForm: any, field: string, idx: number) => { const newF = [...form[field]]; newF.splice(idx, 1); setForm({ ...form, [field]: newF }); };
    const handleUpdateField = (form: any, setForm: any, field: string, idx: number, val: string) => { const newF = [...form[field]]; newF[idx] = val; setForm({ ...form, [field]: newF }); };

    if (isLoadingCompany) return <div className="p-8 flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div></div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm">
                <div className="flex items-center gap-6">
                    <AvatarUpload value={companyForm.logo_url} onChange={(url) => setCompanyForm({ ...companyForm, logo_url: url })} />
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-neutral-900">{companyForm.name || 'Компания'}</h1>
                        <p className="text-neutral-500 font-medium flex items-center gap-2 mt-1">
                            {companyForm.website ? (
                                <a href={companyForm.website} target="_blank" className="hover:text-neutral-900 flex items-center gap-1">
                                    <Globe className="h-3.5 w-3.5" /> {companyForm.website.replace(/^https?:\/\//, '')}
                                </a>
                            ) : 'Сайт не указан'}
                        </p>
                    </div>
                </div>
                <Button onClick={() => updateCompanyMutation.mutate(companyForm)} className="bg-neutral-900 text-white h-12 px-8 rounded-2xl shadow-lg transition-transform hover:-translate-y-0.5">Сохранить всё</Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-white/50 p-1.5 rounded-2xl border border-neutral-200 backdrop-blur-sm h-14 mb-6">
                    <TabsTrigger value="general" className="rounded-xl px-6 font-bold">Основное</TabsTrigger>
                    <TabsTrigger value="branches" className="rounded-xl px-6 font-bold">Филиалы</TabsTrigger>
                    <TabsTrigger value="legal" className="rounded-xl px-6 font-bold">Юр. данные</TabsTrigger>
                    <TabsTrigger value="social" className="rounded-xl px-6 font-bold">Соцсети</TabsTrigger>
                    <TabsTrigger value="notifications" className="rounded-xl px-6 font-bold">Уведомления</TabsTrigger>
                </TabsList>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <TabsContent value="general" className="m-0 space-y-6">
                            <Card className="rounded-[2.5rem] border-none shadow-sm p-8 space-y-8 bg-white">
                                <section className="space-y-6">
                                    <h3 className="text-xl font-bold flex items-center gap-3"><Info className="h-5 w-5" /> Основное</h3>
                                    <div className="grid gap-4">
                                        <div className="grid gap-2"><Label className="text-xs uppercase font-black opacity-40">Название</Label><Input value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} className="h-12 rounded-2xl" /></div>
                                        <div className="grid gap-2"><Label className="text-xs uppercase font-black opacity-40">Описание</Label><Textarea value={companyForm.description} onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })} className="min-h-[120px] rounded-2xl leading-relaxed" /></div>
                                    </div>
                                </section>

                                <section className="space-y-6 pt-8 border-t border-neutral-50">
                                    <div className="flex items-center justify-between"><h3 className="text-xl font-bold flex items-center gap-3"><Smartphone className="h-5 w-5" /> Контакты</h3><Button variant="ghost" onClick={() => handleAddField(companyForm, setCompanyForm, 'contact_phones')} className="text-xs font-bold uppercase tracking-widest"><Plus className="h-4 w-4 mr-1" /> Добавить тел.</Button></div>
                                    <div className="grid gap-3">
                                        {companyForm.contact_phones.map((phone: string, idx: number) => (
                                            <div key={idx} className="flex gap-2 animate-in slide-in-from-left-2">
                                                <div className="relative flex-1"><Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-300" /><Input value={phone} onChange={(e) => handleUpdateField(companyForm, setCompanyForm, 'contact_phones', idx, e.target.value)} className="h-12 pl-12 rounded-2xl" /></div>
                                                <Button variant="ghost" size="icon" onClick={() => handleRemoveField(companyForm, setCompanyForm, 'contact_phones', idx)} className="h-12 w-12 text-red-400"><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </Card>
                        </TabsContent>

                        <TabsContent value="branches" className="m-0 space-y-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-2xl font-black tracking-tight">Филиалы</h2>
                                <Button onClick={() => { resetBranchForm(); setIsAddBranchOpen(true); }} className="bg-neutral-900 text-white rounded-2xl font-bold gap-2 h-11 px-6"><Plus className="h-4 w-4" /> Добавить</Button>
                            </div>
                            <div className="grid gap-4">
                                {branches.map((b: any) => (
                                    <Card key={b.id} className="rounded-[2rem] border-none shadow-sm p-6 bg-white group hover:shadow-md transition-all">
                                        <div className="flex items-start justify-between">
                                            <div className="flex gap-5">
                                                <div className="h-14 w-14 rounded-2xl bg-neutral-50 flex items-center justify-center text-neutral-900 group-hover:bg-neutral-900 group-hover:text-white transition-all"><MapPin className="h-6 w-6" /></div>
                                                <div>
                                                    <h3 className="text-xl font-black">{b.name}</h3>
                                                    <p className="text-neutral-500 text-sm font-medium">{b.address || 'Адрес не указан'}</p>
                                                    <div className="flex gap-4 mt-3 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                                                        <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {b.phone || 'Нет тел.'}</span>
                                                        <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {b.timezone}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => handleEditBranch(b)} className="rounded-xl hover:bg-neutral-50"><Pencil className="h-4 w-4 text-neutral-400" /></Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="legal" className="m-0">
                            <Card className="rounded-[2.5rem] border-none shadow-sm p-8 bg-white space-y-6">
                                <h3 className="text-xl font-bold flex items-center gap-3"><FileText className="h-5 w-5" /> Юридические данные</h3>
                                <div className="grid gap-6">
                                    <div className="grid gap-2"><Label className="text-xs uppercase font-black opacity-40">Юридическое название</Label><Input value={companyForm.legal_name} onChange={(e) => setCompanyForm({ ...companyForm, legal_name: e.target.value })} className="h-12 rounded-2xl" placeholder="ООО 'Пример'"/></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2"><Label className="text-xs uppercase font-black opacity-40">УНП / ИНН</Label><Input value={companyForm.tax_id} onChange={(e) => setCompanyForm({ ...companyForm, tax_id: e.target.value })} className="h-12 rounded-2xl font-mono" /></div>
                                        <div className="grid gap-2"><Label className="text-xs uppercase font-black opacity-40">Юридический адрес</Label><Input value={companyForm.legal_address} onChange={(e) => setCompanyForm({ ...companyForm, legal_address: e.target.value })} className="h-12 rounded-2xl" /></div>
                                    </div>
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="social" className="m-0">
                            <Card className="rounded-[2.5rem] border-none shadow-sm p-8 bg-white space-y-6">
                                <h3 className="text-xl font-bold flex items-center gap-3"><Share2 className="h-5 w-5" /> Социальные сети</h3>
                                <div className="grid grid-cols-2 gap-6">
                                    {['instagram', 'telegram', 'vk', 'whatsapp'].map((s) => (
                                        <div key={s} className="grid gap-2">
                                            <Label className="text-xs uppercase font-black opacity-40">{s}</Label>
                                            <Input value={companyForm.social_links[s]} onChange={(e) => setCompanyForm({ ...companyForm, social_links: { ...companyForm.social_links, [s]: e.target.value } })} className="h-12 rounded-2xl" placeholder="Никнейм или ссылка"/>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </TabsContent>

                        <TabsContent value="notifications" className="m-0">
                            <NotificationSettings companyId={company?.id} branches={branches} />
                        </TabsContent>
                    </div>

                    {/* Sidebar Help */}
                    <div className="space-y-6">
                        <Card className="rounded-[2.5rem] border-none bg-neutral-900 text-white p-8 space-y-6 overflow-hidden relative">
                            <div className="relative z-10 space-y-4">
                                <h3 className="text-lg font-black tracking-tight">Профиль компании</h3>
                                <p className="text-neutral-400 text-sm leading-relaxed">Настройте общую информацию, которая будет отображаться клиентам при записи в любой из ваших филиалов.</p>
                                <div className="space-y-3 pt-4">
                                    {['Логотип', 'Контакты', 'Юр. данные'].map(item => (
                                        <div key={item} className="flex items-center gap-3"><div className="h-6 w-6 rounded-lg bg-white/10 flex items-center justify-center"><Check className="h-3 w-3 text-[#F5FF82]" /></div><span className="text-xs font-bold text-neutral-200 uppercase tracking-widest">{item}</span></div>
                                    ))}
                                </div>
                            </div>
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#F5FF82]/10 blur-3xl rounded-full" />
                        </Card>
                    </div>
                </div>
            </Tabs>

            <Dialog open={isAddBranchOpen || !!editingBranch} onOpenChange={(open) => { if(!open) { setIsAddBranchOpen(false); setEditingBranch(null); } }}>
                <DialogContent className="sm:max-w-[900px] w-[95vw] p-0 overflow-hidden border-none rounded-[2.5rem] shadow-2xl">
                    <div className="bg-white flex flex-col h-[85vh] sm:h-[80vh]">
                        <div className="px-6 sm:px-10 pt-8 sm:pt-10 pb-6 border-b border-neutral-100 flex items-center justify-between shrink-0">
                            <div><DialogTitle className="text-2xl sm:text-3xl font-black tracking-tighter uppercase">{editingBranch ? 'Редактировать филиал' : 'Новый филиал'}</DialogTitle><DialogDescription className="text-neutral-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">{branchForm.name || 'Настройка точки'}</DialogDescription></div>
                           
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                            {/* Left Panel: General Info */}
                            <div className="w-full md:w-[45%] border-b md:border-b-0 md:border-r border-neutral-100 p-6 sm:p-10 overflow-y-auto custom-scrollbar space-y-8 bg-neutral-50/30">
                                <section className="space-y-6">
                                    <div className="flex items-center gap-2 text-neutral-400"><Info className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-widest">Основная информация</span></div>
                                    <div className="grid gap-4">
                                        <div className="grid gap-2"><Label className="text-[10px] font-black uppercase opacity-40 ml-1">Название</Label><Input value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} className="h-12 rounded-2xl border-none shadow-sm bg-white font-bold" /></div>
                                        <div className="grid gap-2"><Label className="text-[10px] font-black uppercase opacity-40 ml-1">Телефон</Label><Input value={branchForm.phone} onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })} className="h-12 rounded-2xl border-none shadow-sm bg-white font-bold" placeholder="+375..." /></div>
                                        <div className="grid gap-2"><Label className="text-[10px] font-black uppercase opacity-40 ml-1">Описание</Label><Textarea value={branchForm.description} onChange={(e) => setBranchForm({ ...branchForm, description: e.target.value })} className="min-h-[100px] rounded-2xl border-none shadow-sm bg-white resize-none p-4" /></div>
                                    </div>
                                </section>

                                <section className="space-y-6 pt-6 border-t border-neutral-100">
                                    <div className="flex items-center gap-2 text-neutral-400"><MapPin className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-widest">Адрес и Зона</span></div>
                                    <div className="grid gap-4">
                                        <div className="grid gap-2">
                                            <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Страна</Label>
                                            <Select value={selectedCountryId} onValueChange={(val) => { 
                                                setSelectedCountryId(val); 
                                                setSelectedRegionId(''); 
                                                setBranchForm((prev: any) => ({ ...prev, country_id: parseInt(val), region_id: undefined, city_id: undefined })); 
                                            }}>
                                                <SelectTrigger className="h-12 rounded-2xl border-none shadow-sm bg-white font-bold"><SelectValue placeholder="Выберите страну" /></SelectTrigger>
                                                <SelectContent>{countries?.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                        {selectedCountryId && (
                                            <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                                                <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Регион / Область</Label>
                                                <Select value={selectedRegionId} onValueChange={(val) => {
                                                    setSelectedRegionId(val);
                                                    setBranchForm((prev: any) => ({ ...prev, region_id: parseInt(val), city_id: undefined }));
                                                }}>
                                                    <SelectTrigger className="h-12 rounded-2xl border-none shadow-sm bg-white font-bold"><SelectValue placeholder="Выберите регион" /></SelectTrigger>
                                                    <SelectContent>{regions?.map((r: any) => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                        {selectedRegionId && (
                                            <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                                                <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Город</Label>
                                                <Select value={branchForm.city_id?.toString()} onValueChange={(val) => setBranchForm((prev: any) => ({ ...prev, city_id: parseInt(val) }))}>
                                                    <SelectTrigger className="h-12 rounded-2xl border-none shadow-sm bg-white font-bold"><SelectValue placeholder="Выберите город" /></SelectTrigger>
                                                    <SelectContent>{cities?.map((city: any) => <SelectItem key={city.id} value={city.id.toString()}>{city.name}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                        <div className="grid gap-2"><Label className="text-[10px] font-black uppercase opacity-40 ml-1">Улица, дом</Label><Input value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} className="h-12 rounded-2xl border-none shadow-sm bg-white font-bold" /></div>
                                        <div className="grid gap-2"><Label className="text-[10px] font-black uppercase opacity-40 ml-1">Часовой пояс</Label><Select value={branchForm.timezone} onValueChange={(val) => setBranchForm({ ...branchForm, timezone: val })}><SelectTrigger className="h-12 rounded-2xl border-none shadow-sm bg-white font-bold"><SelectValue /></SelectTrigger><SelectContent>{timezones.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}</SelectContent></Select></div>
                                    </div>
                                </section>
                            </div>

                            {/* Right Panel: Schedule */}
                            <div className="flex-1 p-6 sm:p-10 overflow-y-auto custom-scrollbar space-y-8 bg-white">
                                <section className="space-y-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-2 text-neutral-400"><Clock className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-widest">График работы</span></div>
                                        <div className="p-1 bg-neutral-100 rounded-xl flex gap-1 h-10 w-full sm:w-48">
                                            <button onClick={() => setScheduleType('unified')} className={cn("flex-1 rounded-lg text-[9px] font-black uppercase transition-all", scheduleType === 'unified' ? "bg-white shadow-sm text-black" : "text-neutral-400")}>Единый</button>
                                            <button onClick={() => setScheduleType('detailed')} className={cn("flex-1 rounded-lg text-[9px] font-black uppercase transition-all", scheduleType === 'detailed' ? "bg-white shadow-sm text-black" : "text-neutral-400")}>По дням</button>
                                        </div>
                                    </div>

                                    {scheduleType === 'unified' ? (
                                        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                                            <div className="grid grid-cols-2 gap-6 p-6 sm:p-8 bg-neutral-50 rounded-[2rem] border border-neutral-100">
                                                <div className="space-y-3"><Label className="text-[10px] font-black uppercase opacity-40 ml-1">Открытие</Label><Input type="time" value={unifiedSchedule.start_time} onChange={(e) => setUnifiedSchedule({ ...unifiedSchedule, start_time: e.target.value })} className="h-14 rounded-2xl border-none shadow-inner bg-white font-black text-xl px-6" /></div>
                                                <div className="space-y-3"><Label className="text-[10px] font-black uppercase opacity-40 ml-1">Закрытие</Label><Input type="time" value={unifiedSchedule.end_time} onChange={(e) => setUnifiedSchedule({ ...unifiedSchedule, end_time: e.target.value })} className="h-14 rounded-2xl border-none shadow-inner bg-white font-black text-xl px-6" /></div>
                                            </div>
                                            <div className="space-y-4">
                                                <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Выберите выходные дни</Label>
                                                <div className="grid grid-cols-4 sm:flex sm:justify-between gap-2">
                                                    {DAYS.map(d => (
                                                        <button key={d.id} onClick={() => setUnifiedSchedule((prev: any) => ({ ...prev, days_off: prev.days_off.includes(d.id) ? prev.days_off.filter((id: number) => id !== d.id) : [...prev.days_off, d.id] }))} className={cn("h-14 rounded-2xl flex flex-col items-center justify-center border-2 transition-all group active:scale-95", unifiedSchedule.days_off.includes(d.id) ? "bg-red-50 border-red-100 text-red-500" : "bg-white border-neutral-100 text-neutral-400 hover:border-neutral-900 hover:text-black")}>
                                                            <span className="text-[9px] font-black uppercase tracking-tighter mb-1 opacity-60">{d.short}</span>
                                                            <span className="text-xs font-black">{unifiedSchedule.days_off.includes(d.id) ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-500">
                                            {branchForm.schedule.map((s: any, idx: number) => (
                                                <div key={s.day_of_week} className={cn("flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-3xl border-2 transition-all", s.is_day_off ? "bg-neutral-50/50 border-transparent opacity-60" : "bg-white border-neutral-50 shadow-sm")}>
                                                    <div className="w-20 sm:w-24 flex flex-col">
                                                        <span className="text-[9px] sm:text-[10px] font-black uppercase text-neutral-900 tracking-tighter truncate">{DAYS.find(d => d.id === s.day_of_week)?.name}</span>
                                                        <span className="text-[8px] font-bold text-neutral-400 uppercase">{s.is_day_off ? 'Вых.' : 'Раб.'}</span>
                                                    </div>
                                                    <Switch checked={!s.is_day_off} onCheckedChange={(val) => { const newS = [...branchForm.schedule]; newS[idx].is_day_off = !val; setBranchForm({ ...branchForm, schedule: newS }); }} className="data-[state=checked]:bg-neutral-900 scale-90 sm:scale-100" />
                                                    {!s.is_day_off && (
                                                        <div className="flex items-center gap-1 sm:gap-2 ml-auto animate-in slide-in-from-left-4">
                                                            <Input type="time" value={s.start_time} onChange={(e) => { const newS = [...branchForm.schedule]; newS[idx].start_time = e.target.value; setBranchForm({ ...branchForm, schedule: newS }); }} className="h-8 sm:h-10 w-20 sm:w-24 px-2 sm:px-3 text-xs sm:text-sm font-black border-none bg-neutral-100 rounded-xl shadow-inner text-center" />
                                                            <span className="text-neutral-200">—</span>
                                                            <Input type="time" value={s.end_time} onChange={(e) => { const newS = [...branchForm.schedule]; newS[idx].end_time = e.target.value; setBranchForm({ ...branchForm, schedule: newS }); }} className="h-8 sm:h-10 w-20 sm:w-24 px-2 sm:px-3 text-xs sm:text-sm font-black border-none bg-neutral-100 rounded-xl shadow-inner text-center" />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            </div>
                        </div>

                        <div className="p-6 sm:p-8 bg-neutral-50 border-t border-neutral-100 flex justify-end items-center gap-4 shrink-0">
                            <Button variant="ghost" onClick={() => { setIsAddBranchOpen(false); setEditingBranch(null); }} className="h-12 sm:h-14 px-6 sm:px-8 rounded-2xl sm:rounded-[1.5rem] font-bold text-neutral-400 hover:text-black">Отмена</Button>
                            <Button onClick={() => editingBranch ? updateBranchMutation.mutate(branchForm) : addBranchMutation.mutate(branchForm)} disabled={addBranchMutation.isPending || updateBranchMutation.isPending} className="h-12 sm:h-14 px-8 sm:px-12 rounded-2xl sm:rounded-[1.5rem] bg-neutral-900 text-white font-black shadow-2xl shadow-black/20 hover:scale-[1.02] transition-transform active:scale-95">{editingBranch ? 'Сохранить' : 'Создать филиал'}</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
