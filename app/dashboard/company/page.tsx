'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    Building2, 
    MapPin, 
    Phone, 
    Mail, 
    Globe, 
    Instagram, 
    Send, 
    Plus, 
    Trash2, 
    Pencil, 
    Save, 
    LayoutDashboard,
    FileText,
    Users,
    Info,
    Smartphone,
    Share2,
    Check,
    X,
    ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AvatarUpload } from '@/components/avatar-upload';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CompanyPage() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('general');
    
    // Forms state
    const [companyForm, setCompanyForm] = useState<any>({
        name: '',
        description: '',
        logo_url: '',
        website: '',
        tax_id: '',
        legal_name: '',
        legal_address: '',
        contact_phones: [],
        contact_emails: [],
        social_links: {
            instagram: '',
            telegram: '',
            vk: '',
            whatsapp: ''
        }
    });

    const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<any>(null);
    const [branchForm, setBranchForm] = useState<any>({
        name: '',
        description: '',
        address: '',
        phone: '',
        contact_phones: [],
        contact_emails: [],
        is_main: false,
        country_id: undefined,
        region_id: undefined,
        district_id: undefined,
        city_id: undefined
    });

    // Queries
    const { data: company, isLoading: isLoadingCompany } = useQuery({
        queryKey: ['my-company'],
        queryFn: async () => {
            const res = await api.get('/companies');
            return res.data[0] || null;
        },
    });

    const { data: branches, isLoading: isLoadingBranches } = useQuery({
        queryKey: ['branches', company?.id],
        queryFn: async () => {
            const res = await api.get(`/companies/${company.id}/branches`);
            return res.data;
        },
        enabled: !!company?.id,
    });

    // Geo Queries
    const { data: countries } = useQuery({ queryKey: ['countries'], queryFn: async () => (await api.get('/geo/countries')).data });
    
    const [selectedCountryId, setSelectedCountryId] = useState<string>('');
    const [selectedRegionId, setSelectedRegionId] = useState<string>('');
    const [selectedDistrictId, setSelectedDistrictId] = useState<string>('');

    const { data: regions } = useQuery({
        queryKey: ['regions', selectedCountryId],
        queryFn: async () => (await api.get(`/geo/countries/${selectedCountryId}/regions`)).data,
        enabled: !!selectedCountryId,
    });

    const { data: districts } = useQuery({
        queryKey: ['districts', selectedRegionId],
        queryFn: async () => (await api.get(`/geo/regions/${selectedRegionId}/districts`)).data,
        enabled: !!selectedRegionId,
    });

    const { data: cities } = useQuery({
        queryKey: ['cities', selectedCountryId, selectedRegionId, selectedDistrictId],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (selectedCountryId) params.append('country_id', selectedCountryId);
            if (selectedRegionId) params.append('region_id', selectedRegionId);
            if (selectedDistrictId) params.append('district_id', selectedDistrictId);
            return (await api.get(`/geo/cities?${params.toString()}`)).data;
        },
        enabled: !!selectedCountryId,
    });

    useEffect(() => {
        if (company) {
            setCompanyForm({
                ...company,
                contact_phones: Array.isArray(company.contact_phones) ? company.contact_phones : JSON.parse(company.contact_phones || '[]'),
                contact_emails: Array.isArray(company.contact_emails) ? company.contact_emails : JSON.parse(company.contact_emails || '[]'),
                social_links: typeof company.social_links === 'object' ? company.social_links : JSON.parse(company.social_links || '{}'),
            });
        }
    }, [company]);

    // Mutations
    const updateCompanyMutation = useMutation({
        mutationFn: (data: any) => {
            const payload = {
                ...data,
                contact_phones: JSON.stringify(data.contact_phones),
                contact_emails: JSON.stringify(data.contact_emails),
                social_links: JSON.stringify(data.social_links),
            };
            return api.put(`/companies/${company.id}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-company'] });
            toast.success('Данные компании обновлены');
        },
    });

    const addBranchMutation = useMutation({
        mutationFn: (data: any) => {
            const payload = {
                ...data,
                contact_phones: JSON.stringify(data.contact_phones),
                contact_emails: JSON.stringify(data.contact_emails),
            };
            return api.post(`/companies/${company.id}/branches`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branches'] });
            toast.success('Филиал добавлен');
            setIsAddBranchOpen(false);
            resetBranchForm();
        },
    });

    const updateBranchMutation = useMutation({
        mutationFn: (data: any) => {
            const payload = {
                ...data,
                contact_phones: JSON.stringify(data.contact_phones),
                contact_emails: JSON.stringify(data.contact_emails),
            };
            return api.put(`/branches/${data.id}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branches'] });
            toast.success('Данные филиала обновлены');
            setEditingBranch(null);
        },
    });

    const resetBranchForm = () => {
        setBranchForm({
            name: '',
            description: '',
            address: '',
            phone: '',
            contact_phones: [],
            contact_emails: [],
            is_main: false,
            country_id: undefined,
            region_id: undefined,
            district_id: undefined,
            city_id: undefined
        });
        setSelectedCountryId('');
        setSelectedRegionId('');
        setSelectedDistrictId('');
    };

    const handleAddField = (form: any, setForm: any, field: string, value: string = '') => {
        setForm({ ...form, [field]: [...form[field], value] });
    };

    const handleRemoveField = (form: any, setForm: any, field: string, index: number) => {
        const newFields = [...form[field]];
        newFields.splice(index, 1);
        setForm({ ...form, [field]: newFields });
    };

    const handleUpdateField = (form: any, setForm: any, field: string, index: number, value: string) => {
        const newFields = [...form[field]];
        newFields[index] = value;
        setForm({ ...form, [field]: newFields });
    };

    const handleEditBranch = (branch: any) => {
        setEditingBranch(branch);
        setBranchForm({
            ...branch,
            contact_phones: Array.isArray(branch.contact_phones) ? branch.contact_phones : JSON.parse(branch.contact_phones || '[]'),
            contact_emails: Array.isArray(branch.contact_emails) ? branch.contact_emails : JSON.parse(branch.contact_emails || '[]'),
        });
        if (branch.country_id) setSelectedCountryId(branch.country_id.toString());
        if (branch.region_id) setSelectedRegionId(branch.region_id.toString());
        if (branch.district_id) setSelectedDistrictId(branch.district_id.toString());
    };

    if (isLoadingCompany) return <div className="p-8 flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div></div>;

    if (!company) return <div>Компания не найдена. Пожалуйста, создайте её.</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="relative group">
                        <AvatarUpload 
                            value={companyForm.logo_url} 
                            onChange={(url) => setCompanyForm({ ...companyForm, logo_url: url })} 
                        />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-neutral-900">{companyForm.name || 'Название не указано'}</h1>
                        <p className="text-neutral-500 font-medium flex items-center gap-2 mt-1">
                            {companyForm.website ? (
                                <a href={companyForm.website} target="_blank" rel="noreferrer" className="hover:text-neutral-900 flex items-center gap-1">
                                    <Globe className="h-3.5 w-3.5" /> {companyForm.website.replace(/^https?:\/\//, '')}
                                </a>
                            ) : 'Сайт не указан'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button 
                        onClick={() => updateCompanyMutation.mutate(companyForm)} 
                        disabled={updateCompanyMutation.isPending}
                        className="bg-neutral-900 text-white hover:bg-neutral-800 h-12 px-8 rounded-2xl shadow-lg shadow-neutral-200 transition-all hover:-translate-y-0.5"
                    >
                        {updateCompanyMutation.isPending ? <span className="flex items-center gap-2"><div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" /> Сохранение</span> : <span className="flex items-center gap-2"><Save className="h-4 w-4" /> Сохранить изменения</span>}
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex items-center justify-between mb-6">
                    <TabsList className="bg-white/50 p-1.5 rounded-2xl border border-neutral-200/50 backdrop-blur-sm shadow-sm h-14">
                        <TabsTrigger value="general" className="rounded-xl px-6 h-11 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-neutral-900 text-neutral-500 font-bold transition-all">Основное</TabsTrigger>
                        <TabsTrigger value="branches" className="rounded-xl px-6 h-11 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-neutral-900 text-neutral-500 font-bold transition-all">Филиалы</TabsTrigger>
                        <TabsTrigger value="legal" className="rounded-xl px-6 h-11 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-neutral-900 text-neutral-500 font-bold transition-all">Юр. данные</TabsTrigger>
                        <TabsTrigger value="social" className="rounded-xl px-6 h-11 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-neutral-900 text-neutral-500 font-bold transition-all">Соцсети</TabsTrigger>
                    </TabsList>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <TabsContent value="general" className="m-0 space-y-6 animate-in fade-in duration-300">
                            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
                                <CardHeader className="px-8 pt-8 pb-4">
                                    <CardTitle className="text-xl font-bold flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-2xl bg-neutral-50 flex items-center justify-center text-neutral-900 border border-neutral-100"><Info className="h-5 w-5" /></div>
                                        Информация о компании
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-8 pt-4 space-y-6">
                                    <div className="grid gap-2">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Название компании</Label>
                                        <Input 
                                            value={companyForm.name} 
                                            onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} 
                                            className="h-12 rounded-2xl border-neutral-200 focus:ring-black focus:border-black transition-all text-base font-medium"
                                            placeholder="Введите название"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Описание</Label>
                                        <Textarea 
                                            value={companyForm.description} 
                                            onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })} 
                                            className="min-h-[120px] rounded-2xl border-neutral-200 focus:ring-black focus:border-black transition-all text-base leading-relaxed"
                                            placeholder="Расскажите о вашей компании..."
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Веб-сайт</Label>
                                        <div className="relative">
                                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                                            <Input 
                                                value={companyForm.website} 
                                                onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })} 
                                                className="h-12 pl-12 rounded-2xl border-neutral-200 focus:ring-black focus:border-black transition-all"
                                                placeholder="https://example.com"
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
                                <CardHeader className="px-8 pt-8 pb-4">
                                    <CardTitle className="text-xl font-bold flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-2xl bg-neutral-50 flex items-center justify-center text-neutral-900 border border-neutral-100"><Smartphone className="h-5 w-5" /></div>
                                        Контактные данные
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-8 pt-4 space-y-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <Label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Телефоны</Label>
                                            <Button variant="ghost" size="sm" onClick={() => handleAddField(companyForm, setCompanyForm, 'contact_phones')} className="h-8 text-neutral-500 hover:text-black font-bold text-xs uppercase tracking-wider">
                                                <Plus className="h-3.5 w-3.5 mr-1" /> Добавить
                                            </Button>
                                        </div>
                                        <div className="grid gap-3">
                                            {companyForm.contact_phones.map((phone: string, idx: number) => (
                                                <div key={idx} className="flex gap-2 animate-in slide-in-from-left-2">
                                                    <div className="relative flex-1">
                                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                                                        <Input 
                                                            value={phone} 
                                                            onChange={(e) => handleUpdateField(companyForm, setCompanyForm, 'contact_phones', idx, e.target.value)} 
                                                            className="h-12 pl-12 rounded-2xl border-neutral-200"
                                                            placeholder="+375 (29) 000-00-00"
                                                        />
                                                    </div>
                                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveField(companyForm, setCompanyForm, 'contact_phones', idx)} className="h-12 w-12 rounded-2xl text-red-500 hover:bg-red-50">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                            {companyForm.contact_phones.length === 0 && <p className="text-sm text-neutral-400 italic">Телефоны не указаны</p>}
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-neutral-50">
                                        <div className="flex items-center justify-between mb-2">
                                            <Label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Email адреса</Label>
                                            <Button variant="ghost" size="sm" onClick={() => handleAddField(companyForm, setCompanyForm, 'contact_emails')} className="h-8 text-neutral-500 hover:text-black font-bold text-xs uppercase tracking-wider">
                                                <Plus className="h-3.5 w-3.5 mr-1" /> Добавить
                                            </Button>
                                        </div>
                                        <div className="grid gap-3">
                                            {companyForm.contact_emails.map((email: string, idx: number) => (
                                                <div key={idx} className="flex gap-2 animate-in slide-in-from-left-2">
                                                    <div className="relative flex-1">
                                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                                                        <Input 
                                                            value={email} 
                                                            onChange={(e) => handleUpdateField(companyForm, setCompanyForm, 'contact_emails', idx, e.target.value)} 
                                                            className="h-12 pl-12 rounded-2xl border-neutral-200"
                                                            placeholder="hello@company.com"
                                                        />
                                                    </div>
                                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveField(companyForm, setCompanyForm, 'contact_emails', idx)} className="h-12 w-12 rounded-2xl text-red-500 hover:bg-red-50">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                            {companyForm.contact_emails.length === 0 && <p className="text-sm text-neutral-400 italic">Email адреса не указаны</p>}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="branches" className="m-0 space-y-6 animate-in fade-in duration-300">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Филиалы</h2>
                                <Dialog open={isAddBranchOpen} onOpenChange={(open) => { if(!open) resetBranchForm(); setIsAddBranchOpen(open); }}>
                                    <DialogTrigger asChild>
                                        <Button className="bg-neutral-900 text-white h-11 px-6 rounded-2xl font-bold flex gap-2 shadow-lg shadow-neutral-100">
                                            <Plus className="h-4 w-4" /> Добавить филиал
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl p-0 overflow-hidden border-none rounded-3xl shadow-2xl">
                                        <div className="bg-white">
                                            <div className="px-8 pb-4 pt-8 border-b border-neutral-100">
                                                <DialogTitle className="text-2xl font-bold text-neutral-900 leading-tight">Новый филиал</DialogTitle>
                                                <p className="text-neutral-500 text-sm mt-2 font-medium">Введите данные физической точки вашего бизнеса</p>
                                            </div>
                                            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                                <div className="grid gap-4">
                                                    <div className="grid gap-2">
                                                        <Label className="text-neutral-600 font-normal">Название филиала</Label>
                                                        <Input value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} className="h-11 rounded-xl border-neutral-200" placeholder="Например: Салон в Центре" />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label className="text-neutral-600 font-normal">Описание (кратко)</Label>
                                                        <Input value={branchForm.description} onChange={(e) => setBranchForm({ ...branchForm, description: e.target.value })} className="h-11 rounded-xl border-neutral-200" placeholder="Напр: 5 минут от метро..." />
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                                        <div className="grid gap-2">
                                                            <Label className="text-neutral-600 font-normal">Страна</Label>
                                                            <Select value={selectedCountryId} onValueChange={(val) => { setSelectedCountryId(val); setSelectedRegionId(''); setSelectedDistrictId(''); setBranchForm({ ...branchForm, country_id: parseInt(val), region_id: undefined, district_id: undefined, city_id: undefined }); }}>
                                                                <SelectTrigger className="h-11 rounded-xl border-neutral-200">
                                                                    <SelectValue placeholder="Выберите страну" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {countries?.map((c: any) => (<SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label className="text-neutral-600 font-normal">Область/Регион</Label>
                                                            <Select value={selectedRegionId} disabled={!selectedCountryId} onValueChange={(val) => { setSelectedRegionId(val); setSelectedDistrictId(''); setBranchForm({ ...branchForm, region_id: parseInt(val), district_id: undefined, city_id: undefined }); }}>
                                                                <SelectTrigger className="h-11 rounded-xl border-neutral-200">
                                                                    <SelectValue placeholder="Выберите регион" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {regions?.map((r: any) => (<SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="grid gap-2">
                                                            <Label className="text-neutral-600 font-normal">Район</Label>
                                                            <Select value={selectedDistrictId} disabled={!selectedRegionId} onValueChange={(val) => { setSelectedDistrictId(val); setBranchForm({ ...branchForm, district_id: parseInt(val), city_id: undefined }); }}>
                                                                <SelectTrigger className="h-11 rounded-xl border-neutral-200">
                                                                    <SelectValue placeholder="Выберите район" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {districts?.map((d: any) => (<SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="grid gap-2">
                                                            <Label className="text-neutral-600 font-normal">Город</Label>
                                                            <Select value={branchForm.city_id?.toString()} disabled={!selectedRegionId} onValueChange={(val) => setBranchForm({ ...branchForm, city_id: parseInt(val) })}>
                                                                <SelectTrigger className="h-11 rounded-xl border-neutral-200">
                                                                    <SelectValue placeholder="Выберите город" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {cities?.map((c: any) => (<SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>

                                                    <div className="grid gap-2">
                                                        <Label className="text-neutral-600 font-normal">Адрес (улица, дом)</Label>
                                                        <Input value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} className="h-11 rounded-xl border-neutral-200" placeholder="ул. Ленина, д. 10, оф. 5" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-8 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-3">
                                                <Button variant="outline" onClick={() => setIsAddBranchOpen(false)} className="h-11 px-6 rounded-xl border-neutral-200">Отмена</Button>
                                                <Button onClick={() => addBranchMutation.mutate(branchForm)} disabled={addBranchMutation.isPending} className="h-11 px-8 rounded-xl bg-neutral-900 text-white font-bold transition-all hover:-translate-y-0.5 shadow-lg shadow-neutral-200">{addBranchMutation.isPending ? 'Сохранение...' : 'Создать филиал'}</Button>
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {branches?.map((branch: any) => (
                                    <Card key={branch.id} className="border-none shadow-sm rounded-3xl overflow-hidden bg-white group hover:shadow-md transition-all">
                                        <CardContent className="p-6">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-5">
                                                    <div className="h-14 w-14 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-900 group-hover:bg-neutral-900 group-hover:text-white transition-all duration-300">
                                                        <MapPin className="h-6 w-6" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-3">
                                                            <h3 className="text-xl font-black text-neutral-900 tracking-tight">{branch.name}</h3>
                                                            {branch.is_main && <Badge className="bg-neutral-900 text-white font-bold text-[10px] rounded-lg h-5 px-2 uppercase tracking-tighter">Основной</Badge>}
                                                        </div>
                                                        <p className="text-neutral-500 font-medium text-sm flex items-center gap-1.5">
                                                            {[branch.city?.name, branch.address].filter(Boolean).join(', ')}
                                                        </p>
                                                        <div className="flex items-center gap-4 mt-3">
                                                            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-400">
                                                                <Phone className="h-3.5 w-3.5" /> {branch.phone || 'Нет телефона'}
                                                            </div>
                                                            {JSON.parse(branch.contact_phones || '[]').length > 0 && (
                                                                <div className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest">
                                                                    + {JSON.parse(branch.contact_phones || '[]').length} доп.
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEditBranch(branch)} className="h-10 w-10 rounded-xl hover:bg-neutral-50">
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                                {branches?.length === 0 && (
                                    <div className="py-20 flex flex-col items-center justify-center bg-neutral-50/50 rounded-3xl border border-dashed border-neutral-200">
                                        <MapPin className="h-12 w-12 text-neutral-200 mb-4" />
                                        <p className="text-neutral-400 font-bold">Филиалы еще не добавлены</p>
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="legal" className="m-0 space-y-6 animate-in fade-in duration-300">
                            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
                                <CardHeader className="px-8 pt-8 pb-4">
                                    <CardTitle className="text-xl font-bold flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-2xl bg-neutral-50 flex items-center justify-center text-neutral-900 border border-neutral-100"><FileText className="h-5 w-5" /></div>
                                        Реквизиты
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-8 pt-4 space-y-6">
                                    <div className="grid gap-2">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Юридическое название</Label>
                                        <Input 
                                            value={companyForm.legal_name} 
                                            onChange={(e) => setCompanyForm({ ...companyForm, legal_name: e.target.value })} 
                                            className="h-12 rounded-2xl border-neutral-200"
                                            placeholder="ООО 'Пример Компани'"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-neutral-400">УНП / ИНН</Label>
                                        <Input 
                                            value={companyForm.tax_id} 
                                            onChange={(e) => setCompanyForm({ ...companyForm, tax_id: e.target.value })} 
                                            className="h-12 rounded-2xl border-neutral-200 font-mono"
                                            placeholder="123456789"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Юридический адрес</Label>
                                        <Input 
                                            value={companyForm.legal_address} 
                                            onChange={(e) => setCompanyForm({ ...companyForm, legal_address: e.target.value })} 
                                            className="h-12 rounded-2xl border-neutral-200"
                                            placeholder="г. Минск, ул. Примерная, 1"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="social" className="m-0 space-y-6 animate-in fade-in duration-300">
                            <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
                                <CardHeader className="px-8 pt-8 pb-4">
                                    <CardTitle className="text-xl font-bold flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-2xl bg-neutral-50 flex items-center justify-center text-neutral-900 border border-neutral-100"><Share2 className="h-5 w-5" /></div>
                                        Социальные сети
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-8 pt-4 space-y-6">
                                    <div className="grid gap-4">
                                        <div className="grid gap-2">
                                            <Label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Instagram</Label>
                                            <div className="relative">
                                                <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                                                <Input 
                                                    value={companyForm.social_links.instagram} 
                                                    onChange={(e) => setCompanyForm({ ...companyForm, social_links: { ...companyForm.social_links, instagram: e.target.value } })} 
                                                    className="h-12 pl-12 rounded-2xl border-neutral-200"
                                                    placeholder="username"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="text-xs font-bold uppercase tracking-widest text-neutral-400">Telegram</Label>
                                            <div className="relative">
                                                <Send className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                                                <Input 
                                                    value={companyForm.social_links.telegram} 
                                                    onChange={(e) => setCompanyForm({ ...companyForm, social_links: { ...companyForm.social_links, telegram: e.target.value } })} 
                                                    className="h-12 pl-12 rounded-2xl border-neutral-200"
                                                    placeholder="@username"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="text-xs font-bold uppercase tracking-widest text-neutral-400">VK</Label>
    
                                            <Input 
                                                value={companyForm.social_links.vk} 
                                                onChange={(e) => setCompanyForm({ ...companyForm, social_links: { ...companyForm.social_links, vk: e.target.value } })} 
                                                className="h-12 pl-12 rounded-2xl border-neutral-200"
                                                placeholder="vk.com/..."
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </div>

                    {/* Sidebar Preview / Help */}
                    <div className="space-y-6">
                        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-neutral-900 text-white p-8">
                            <h3 className="text-lg font-black tracking-tight mb-2">Профиль компании</h3>
                            <p className="text-neutral-400 text-sm mb-6 leading-relaxed">Эти данные используются для отображения информации о вашем бизнесе в виджете онлайн-записи.</p>
                            
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center"><Check className="h-4 w-4 text-[#F5FF82]" /></div>
                                    <span className="text-sm font-medium">Логотип и описание</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center"><Check className="h-4 w-4 text-[#F5FF82]" /></div>
                                    <span className="text-sm font-medium">Актуальные контакты</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center"><Check className="h-4 w-4 text-[#F5FF82]" /></div>
                                    <span className="text-sm font-medium">Юридическая чистота</span>
                                </div>
                            </div>
                            
                            <Button variant="outline" className="text-neutral-950 w-full mt-8 border-white/20 hover:bg-white/10 rounded-2xl h-12 text-sm font-bold transition-all">
                                Посмотреть как видят клиенты
                            </Button>
                        </Card>
                        
                        <div className="p-6 rounded-3xl bg-neutral-50 border border-neutral-100">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-8 w-8 rounded-xl bg-white flex items-center justify-center text-neutral-900 shadow-sm border border-neutral-100"><Info className="h-4 w-4" /></div>
                                <h4 className="font-bold text-neutral-900">Помощь</h4>
                            </div>
                            <p className="text-xs text-neutral-500 leading-loose">
                                Если у вас несколько точек, добавьте их во вкладке <strong>Филиалы</strong>. 
                                Каждому филиалу можно задать свои контакты, которые будут отображаться при выборе этой точки.
                            </p>
                        </div>
                    </div>
                </div>
            </Tabs>

            {/* Branch Edit Dialog/Modal (Global Overlay) */}
            <Dialog open={!!editingBranch} onOpenChange={(open) => !open && setEditingBranch(null)}>
                <DialogContent className="max-w-3xl p-0 overflow-hidden border-none rounded-3xl shadow-2xl">
                    {editingBranch && (
                        <div className="bg-white flex flex-col h-[85vh]">
                            <div className="px-8 pb-4 pt-8 border-b border-neutral-100">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <DialogTitle className="text-2xl font-black text-neutral-900 tracking-tight">Редактировать филиал</DialogTitle>
                                        <p className="text-neutral-500 text-sm mt-1 font-medium">{editingBranch.name}</p>
                                    </div>
                                    {/* <Button variant="ghost" size="icon" onClick={() => setEditingBranch(null)} className="h-10 w-10 rounded-xl"><X className="h-5 w-5" /></Button> */}
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                                <section className="space-y-4">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Общие данные</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label className="text-neutral-600 font-bold text-[11px] uppercase tracking-wider">Название</Label>
                                            <Input value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} className="h-11 rounded-xl border-neutral-200" />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="text-neutral-600 font-bold text-[11px] uppercase tracking-wider">Основной телефон</Label>
                                            <Input value={branchForm.phone} onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })} className="h-11 rounded-xl border-neutral-200" placeholder="+375..." />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-neutral-600 font-bold text-[11px] uppercase tracking-wider">Краткое описание / Ориентир</Label>
                                        <Input value={branchForm.description} onChange={(e) => setBranchForm({ ...branchForm, description: e.target.value })} className="h-11 rounded-xl border-neutral-200" placeholder="Напр: Вход через ТЦ" />
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Локация</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label className="text-neutral-600 font-bold text-[11px] uppercase tracking-wider">Область/Регион</Label>
                                            <Select value={selectedRegionId} onValueChange={(val) => { setSelectedRegionId(val); setSelectedDistrictId(''); setBranchForm({ ...branchForm, region_id: parseInt(val), district_id: undefined, city_id: undefined }); }}>
                                                <SelectTrigger className="h-11 rounded-xl border-neutral-200"><SelectValue /></SelectTrigger>
                                                <SelectContent>{regions?.map((r: any) => (<SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>))}</SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="text-neutral-600 font-bold text-[11px] uppercase tracking-wider">Город</Label>
                                            <Select value={branchForm.city_id?.toString()} onValueChange={(val) => setBranchForm({ ...branchForm, city_id: parseInt(val) })}>
                                                <SelectTrigger className="h-11 rounded-xl border-neutral-200"><SelectValue /></SelectTrigger>
                                                <SelectContent>{cities?.map((c: any) => (<SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>))}</SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-neutral-600 font-bold text-[11px] uppercase tracking-wider">Адрес</Label>
                                        <Input value={branchForm.address} onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} className="h-11 rounded-xl border-neutral-200" />
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Доп. телефоны</h3>
                                        <Button variant="ghost" size="sm" onClick={() => handleAddField(branchForm, setBranchForm, 'contact_phones')} className="h-7 text-xs font-bold uppercase tracking-wider">Добавить</Button>
                                    </div>
                                    <div className="grid gap-3">
                                        {branchForm.contact_phones.map((p: string, i: number) => (
                                            <div key={i} className="flex gap-2 animate-in slide-in-from-left-2">
                                                <Input value={p} onChange={(e) => handleUpdateField(branchForm, setBranchForm, 'contact_phones', i, e.target.value)} className="h-11 rounded-xl border-neutral-200" />
                                                <Button variant="ghost" size="icon" onClick={() => handleRemoveField(branchForm, setBranchForm, 'contact_phones', i)} className="h-11 w-11 text-red-500 hover:bg-red-50 rounded-xl"><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Доп. Email</h3>
                                        <Button variant="ghost" size="sm" onClick={() => handleAddField(branchForm, setBranchForm, 'contact_emails')} className="h-7 text-xs font-bold uppercase tracking-wider">Добавить</Button>
                                    </div>
                                    <div className="grid gap-3">
                                        {branchForm.contact_emails.map((m: string, i: number) => (
                                            <div key={i} className="flex gap-2 animate-in slide-in-from-left-2">
                                                <Input value={m} onChange={(e) => handleUpdateField(branchForm, setBranchForm, 'contact_emails', i, e.target.value)} className="h-11 rounded-xl border-neutral-200" />
                                                <Button variant="ghost" size="icon" onClick={() => handleRemoveField(branchForm, setBranchForm, 'contact_emails', i)} className="h-11 w-11 text-red-500 hover:bg-red-50 rounded-xl"><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>

                            <div className="p-8 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-3">
                                <Button variant="outline" onClick={() => setEditingBranch(null)} className="h-11 px-6 rounded-xl border-neutral-200">Отмена</Button>
                                <Button 
                                    onClick={() => updateBranchMutation.mutate(branchForm)} 
                                    disabled={updateBranchMutation.isPending}
                                    className="h-11 px-8 rounded-xl bg-neutral-900 text-white font-bold transition-all hover:-translate-y-0.5 shadow-lg shadow-neutral-200"
                                >
                                    {updateBranchMutation.isPending ? 'Сохранение...' : 'Сохранить изменения'}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
