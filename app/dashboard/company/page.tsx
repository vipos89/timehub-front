'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, MapPin, Phone, Briefcase, Tag, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useBranch } from '@/context/branch-context';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';

export default function CompanyPage() {
    const queryClient = useQueryClient();
    const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
    const [isEditBranchOpen, setIsEditBranchOpen] = useState(false);
    const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState(false);
    const [isEditCompanyOpen, setIsEditCompanyOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<any>(null);
    const [newBranch, setNewBranch] = useState({ 
        name: '', 
        country_id: undefined as number | undefined, 
        region_id: undefined as number | undefined, 
        district_id: undefined as number | undefined, 
        city_id: undefined as number | undefined, 
        address: '', 
        phone: '' 
    });
    const [companyForm, setCompanyForm] = useState({
        name: '',
        country_id: undefined as number | undefined,
        region_id: undefined as number | undefined,
        district_id: undefined as number | undefined,
        city_id: undefined as number | undefined,
        address: '',
        tax_id: ''
    });

    // Geo Queries
    const { data: countries } = useQuery({
        queryKey: ['countries'],
        queryFn: async () => {
            const res = await api.get('/geo/countries');
            return res.data;
        },
    });

    const [branchCountryId, setBranchCountryId] = useState<string>('');
    const [branchRegionId, setBranchRegionId] = useState<string>('');
    const [branchDistrictId, setBranchDistrictId] = useState<string>('');

    const { data: branchRegions } = useQuery({
        queryKey: ['regions', branchCountryId],
        queryFn: async () => {
            const res = await api.get(`/geo/countries/${branchCountryId}/regions`);
            return res.data;
        },
        enabled: !!branchCountryId,
    });

    const { data: branchDistricts } = useQuery({
        queryKey: ['districts', branchRegionId],
        queryFn: async () => {
            const res = await api.get(`/geo/regions/${branchRegionId}/districts`);
            return res.data;
        },
        enabled: !!branchRegionId,
    });

    const { data: branchCities } = useQuery({
        queryKey: ['cities', branchCountryId, branchRegionId, branchDistrictId],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (branchCountryId) params.append('country_id', branchCountryId);
            if (branchRegionId) params.append('region_id', branchRegionId);
            if (branchDistrictId) params.append('district_id', branchDistrictId);
            const res = await api.get(`/geo/cities?${params.toString()}`);
            return res.data;
        },
        enabled: !!branchCountryId,
    });

    const [companyCountryId, setCompanyCountryId] = useState<string>('');
    const [companyRegionId, setCompanyRegionId] = useState<string>('');
    const [companyDistrictId, setCompanyDistrictId] = useState<string>('');

    const { data: companyRegions } = useQuery({
        queryKey: ['regions', companyCountryId],
        queryFn: async () => {
            const res = await api.get(`/geo/countries/${companyCountryId}/regions`);
            return res.data;
        },
        enabled: !!companyCountryId,
    });

    const { data: companyDistricts } = useQuery({
        queryKey: ['districts', companyRegionId],
        queryFn: async () => {
            const res = await api.get(`/geo/regions/${companyRegionId}/districts`);
            return res.data;
        },
        enabled: !!companyRegionId,
    });

    const { data: companyCities } = useQuery({
        queryKey: ['cities', companyCountryId, companyRegionId, companyDistrictId],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (companyCountryId) params.append('country_id', companyCountryId);
            if (companyRegionId) params.append('region_id', companyRegionId);
            if (companyDistrictId) params.append('district_id', companyDistrictId);
            const res = await api.get(`/geo/cities?${params.toString()}`);
            return res.data;
        },
        enabled: !!companyCountryId,
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

    // Mutations
    const addBranchMutation = useMutation({
        mutationFn: (data: any) => api.post(`/companies/${company.id}/branches`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branches'] });
            toast.success('Филиал успешно добавлен');
            setIsAddBranchOpen(false);
            setNewBranch({ name: '', country_id: undefined, city_id: undefined, address: '', phone: '' });
            setBranchCountryId('');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Ошибка при добавлении филиала');
        },
    });

    const updateBranchMutation = useMutation({
        mutationFn: (data: any) => api.put(`/branches/${data.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branches'] });
            toast.success('Данные филиала успешно обновлены');
            setIsEditBranchOpen(false);
            setEditingBranch(null);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Ошибка при обновлении филиала');
        },
    });

    const createCompanyMutation = useMutation({
        mutationFn: (data: any) => api.post('/companies', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-company'] });
            toast.success('Компания успешно создана');
            setIsCreateCompanyOpen(false);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Ошибка при создании компании');
        },
    });

    const updateCompanyMutation = useMutation({
        mutationFn: (data: any) => api.put(`/companies/${company?.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-company'] });
            toast.success('Данные компании успешно обновлены');
            setIsEditCompanyOpen(false);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Ошибка при обновлении компании');
        },
    });

    if (isLoadingCompany) return <div className="p-8 text-neutral-500">Загрузка данных компании...</div>;

    if (!company) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-dashed border-neutral-300">
                <Building2 className="h-12 w-12 text-neutral-300 mb-4" />
                <h2 className="text-xl font-bold text-neutral-900">Компания не найдена</h2>
                <p className="text-neutral-500 mb-6 text-center max-w-sm">
                    Похоже, у вас еще нет зарегистрированной компании. Создайте её сейчас, чтобы начать.
                </p>
                <Dialog open={isCreateCompanyOpen} onOpenChange={setIsCreateCompanyOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-neutral-900 text-white hover:bg-neutral-800 transition-all">
                            Создать компанию
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Новая компания</DialogTitle>
                            <DialogDescription>Введите название вашей компании (например, название салона или сети).</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="company-name">Название компании</Label>
                                <Input
                                    id="company-name"
                                    value={companyForm.name}
                                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                                    placeholder="Beauty Pro Salon"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Страна</Label>
                                <Select 
                                    value={companyForm.country_id?.toString()}
                                    onValueChange={(val) => {
                                        setCompanyCountryId(val);
                                        setCompanyRegionId('');
                                        setCompanyDistrictId('');
                                        setCompanyForm({ ...companyForm, country_id: parseInt(val), region_id: undefined, district_id: undefined, city_id: undefined });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Выберите страну" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {countries?.map((c: any) => (
                                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Регион (Область/Край)</Label>
                                <Select 
                                    value={companyForm.region_id?.toString()}
                                    disabled={!companyCountryId}
                                    onValueChange={(val) => {
                                        setCompanyRegionId(val);
                                        setCompanyDistrictId('');
                                        setCompanyForm({ ...companyForm, region_id: parseInt(val), district_id: undefined, city_id: undefined });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Выберите регион" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {companyRegions?.map((r: any) => (
                                            <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Район (опционально)</Label>
                                <Select 
                                    value={companyForm.district_id?.toString()}
                                    disabled={!companyRegionId}
                                    onValueChange={(val) => {
                                        setCompanyDistrictId(val);
                                        setCompanyForm({ ...companyForm, district_id: parseInt(val), city_id: undefined });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Выберите район" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Не указан</SelectItem>
                                        {companyDistricts?.map((d: any) => (
                                            <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Город</Label>
                                <Select 
                                    value={companyForm.city_id?.toString()}
                                    disabled={!companyRegionId}
                                    onValueChange={(val) => setCompanyForm({ ...companyForm, city_id: parseInt(val) })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Выберите город" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {companyCities?.map((c: any) => (
                                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="company-addr">Адрес</Label>
                                <Input
                                    id="company-addr"
                                    value={companyForm.address}
                                    onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                                    placeholder="ул. Ленина, д. 1"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateCompanyOpen(false)}>Отмена</Button>
                            <Button
                                onClick={() => createCompanyMutation.mutate(companyForm)}
                                disabled={!companyForm.name || createCompanyMutation.isPending}
                                className="bg-neutral-900 text-white hover:bg-neutral-800"
                            >
                                {createCompanyMutation.isPending ? 'Создание...' : 'Создать'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-neutral-900">{company.name}</h1>
                    <div className="text-neutral-500 mt-2 space-y-1">
                        <p className="flex items-center gap-2">
                            Идентификатор: <Badge variant="outline" className="font-mono text-[10px]">{company.tax_id || 'Не указан'}</Badge>
                        </p>
                        {(company.country || company.city || company.address) && (
                            <p className="flex items-center gap-2 text-sm">
                                <MapPin className="h-3 w-3" />
                                {[company.country?.name, company.region?.name, company.district?.name, company.city?.name, company.address].filter(Boolean).join(', ')}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex gap-3">
                    <Dialog open={isEditCompanyOpen} onOpenChange={setIsEditCompanyOpen}>
                        <DialogTrigger asChild>
                            <Button 
                                variant="outline" 
                                className="border-neutral-200 hover:bg-neutral-50 transition-all"
                                onClick={() => {
                                    setCompanyForm({
                                        name: company.name,
                                        country_id: company.country_id,
                                        region_id: company.region_id,
                                        district_id: company.district_id,
                                        city_id: company.city_id,
                                        address: company.address,
                                        tax_id: company.tax_id || ''
                                    });
                                    if (company.country_id) setCompanyCountryId(company.country_id.toString());
                                    if (company.region_id) setCompanyRegionId(company.region_id.toString());
                                    if (company.district_id) setCompanyDistrictId(company.district_id.toString());
                                }}
                            >
                                Редактировать
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Редактировать компанию</DialogTitle>
                                <DialogDescription>Измените данные вашей компании.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-company-name">Название компании</Label>
                                    <Input
                                        id="edit-company-name"
                                        value={companyForm.name}
                                        onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-company-tax">ИНН / Tax ID</Label>
                                    <Input
                                        id="edit-company-tax"
                                        value={companyForm.tax_id}
                                        onChange={(e) => setCompanyForm({ ...companyForm, tax_id: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Страна</Label>
                                    <Select 
                                        value={companyForm.country_id?.toString()}
                                        onValueChange={(val) => {
                                            setCompanyCountryId(val);
                                            setCompanyRegionId('');
                                            setCompanyDistrictId('');
                                            setCompanyForm({ ...companyForm, country_id: parseInt(val), region_id: undefined, district_id: undefined, city_id: undefined });
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Выберите страну" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {countries?.map((c: any) => (
                                                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Регион (Область/Край)</Label>
                                    <Select 
                                        value={companyForm.region_id?.toString()}
                                        disabled={!companyCountryId}
                                        onValueChange={(val) => {
                                            setCompanyRegionId(val);
                                            setCompanyDistrictId('');
                                            setCompanyForm({ ...companyForm, region_id: parseInt(val), district_id: undefined, city_id: undefined });
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Выберите регион" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {companyRegions?.map((r: any) => (
                                                <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Район (опционально)</Label>
                                    <Select 
                                        value={companyForm.district_id?.toString() || 'none'}
                                        disabled={!companyRegionId}
                                        onValueChange={(val) => {
                                            const dId = val === 'none' ? undefined : parseInt(val);
                                            setCompanyDistrictId(val === 'none' ? '' : val);
                                            setCompanyForm({ ...companyForm, district_id: dId, city_id: undefined });
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Выберите район" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Не указан</SelectItem>
                                            {companyDistricts?.map((d: any) => (
                                                <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Город</Label>
                                    <Select 
                                        value={companyForm.city_id?.toString()}
                                        disabled={!companyRegionId}
                                        onValueChange={(val) => setCompanyForm({ ...companyForm, city_id: parseInt(val) })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Выберите город" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {companyCities?.map((c: any) => (
                                                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-company-addr">Адрес</Label>
                                    <Input
                                        id="edit-company-addr"
                                        value={companyForm.address}
                                        onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsEditCompanyOpen(false)}>Отмена</Button>
                                <Button
                                    onClick={() => updateCompanyMutation.mutate(companyForm)}
                                    className="bg-neutral-900 text-white hover:bg-neutral-800"
                                    disabled={updateCompanyMutation.isPending}
                                >
                                    {updateCompanyMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Tabs defaultValue="branches" className="w-full">
                <TabsList className="bg-neutral-100 p-1 mb-8">
                    <TabsTrigger value="branches" className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-6 h-9">Филиалы</TabsTrigger>
                </TabsList>

                <TabsContent value="branches" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-neutral-900">Список филиалов</h2>
                        <Dialog open={isAddBranchOpen} onOpenChange={setIsAddBranchOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-neutral-900 text-white hover:bg-neutral-800 gap-2 shadow-sm transition-all focus:ring-0">
                                    <Plus className="h-4 w-4" /> Добавить филиал
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-bold">Новый филиал</DialogTitle>
                                    <DialogDescription className="text-neutral-500">Введите данные для создания нового филиала</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="branch-name" className="text-neutral-700">Название</Label>
                                        <Input id="branch-name" value={newBranch.name} onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })} className="border-neutral-300 focus:ring-neutral-500" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Страна</Label>
                                        <Select 
                                            value={newBranch.country_id?.toString()}
                                            onValueChange={(val) => {
                                                setBranchCountryId(val);
                                                setBranchRegionId('');
                                                setBranchDistrictId('');
                                                setNewBranch({ ...newBranch, country_id: parseInt(val), region_id: undefined, district_id: undefined, city_id: undefined });
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Выберите страну" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {countries?.map((c: any) => (
                                                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Регион (Область/Край)</Label>
                                        <Select 
                                            value={newBranch.region_id?.toString()}
                                            disabled={!branchCountryId}
                                            onValueChange={(val) => {
                                                setBranchRegionId(val);
                                                setBranchDistrictId('');
                                                setNewBranch({ ...newBranch, region_id: parseInt(val), district_id: undefined, city_id: undefined });
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Выберите регион" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {branchRegions?.map((r: any) => (
                                                    <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Район (опционально)</Label>
                                        <Select 
                                            value={newBranch.district_id?.toString() || 'none'}
                                            disabled={!branchRegionId}
                                            onValueChange={(val) => {
                                                const dId = val === 'none' ? undefined : parseInt(val);
                                                setBranchDistrictId(val === 'none' ? '' : val);
                                                setNewBranch({ ...newBranch, district_id: dId, city_id: undefined });
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Выберите район" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Не указан</SelectItem>
                                                {branchDistricts?.map((d: any) => (
                                                    <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Город</Label>
                                        <Select 
                                            value={newBranch.city_id?.toString()}
                                            disabled={!branchRegionId}
                                            onValueChange={(val) => setNewBranch({ ...newBranch, city_id: parseInt(val) })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Выберите город" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {branchCities?.map((c: any) => (
                                                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="branch-addr" className="text-neutral-700">Адрес</Label>
                                        <Input id="branch-addr" value={newBranch.address} onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })} className="border-neutral-300 focus:ring-neutral-500" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="branch-phone" className="text-neutral-700">Телефон</Label>
                                        <Input id="branch-phone" value={newBranch.phone} onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })} className="border-neutral-300 focus:ring-neutral-500" />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsAddBranchOpen(false)} className="border-neutral-200">Отмена</Button>
                                    <Button onClick={() => addBranchMutation.mutate(newBranch)} className="bg-neutral-900 text-white hover:bg-neutral-800" disabled={addBranchMutation.isPending}>
                                        {addBranchMutation.isPending ? 'Сохранение...' : 'Создать'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {branches?.map((branch: any) => (
                            <Card key={branch.id} className="border-neutral-200 overflow-hidden hover:shadow-md transition-shadow group">
                                <CardHeader className="bg-neutral-50 border-b border-neutral-100 p-4">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg font-bold text-neutral-900">{branch.name}</CardTitle>
                                        <div className="flex items-center gap-2">
                                            {branch.is_main && <Badge className="bg-neutral-900 text-white text-[10px] uppercase tracking-tighter">Основной</Badge>}
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-8 w-8 p-0"
                                                onClick={() => {
                                                    setEditingBranch(branch);
                                                    if (branch.country_id) setBranchCountryId(branch.country_id.toString());
                                                    if (branch.region_id) setBranchRegionId(branch.region_id.toString());
                                                    if (branch.district_id) setBranchDistrictId(branch.district_id.toString());
                                                    setIsEditBranchOpen(true);
                                                }}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex items-start gap-3 text-sm text-neutral-600">
                                        <MapPin className="h-4 w-4 mt-0.5 text-neutral-400 group-hover:text-neutral-900 transition-colors" />
                                        <span>
                                            {[branch.country?.name, branch.region?.name, branch.district?.name, branch.city?.name, branch.address].filter(Boolean).join(', ') || 'Адрес не указан'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-neutral-600">
                                        <Phone className="h-4 w-4 text-neutral-400 group-hover:text-neutral-900 transition-colors" />
                                        <span>{branch.phone || 'Телефон не указан'}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {(!branches || branches.length === 0) && !isLoadingBranches && (
                            <div className="col-span-full py-12 text-center bg-white rounded-xl border border-dashed border-neutral-200 text-neutral-400 font-medium">
                                Филиалы еще не добавлены
                            </div>
                        )}
                    </div>

                    <Dialog open={isEditBranchOpen} onOpenChange={setIsEditBranchOpen}>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold">Редактировать филиал</DialogTitle>
                                <DialogDescription className="text-neutral-500">Измените данные филиала</DialogDescription>
                            </DialogHeader>
                            {editingBranch && (
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="edit-branch-name" className="text-neutral-700">Название</Label>
                                        <Input id="edit-branch-name" value={editingBranch.name} onChange={(e) => setEditingBranch({ ...editingBranch, name: e.target.value })} className="border-neutral-300 focus:ring-neutral-500" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Страна</Label>
                                        <Select 
                                            value={editingBranch.country_id?.toString()}
                                            onValueChange={(val) => {
                                                setBranchCountryId(val);
                                                setBranchRegionId('');
                                                setBranchDistrictId('');
                                                setEditingBranch({ ...editingBranch, country_id: parseInt(val), region_id: undefined, district_id: undefined, city_id: undefined });
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Выберите страну" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {countries?.map((c: any) => (
                                                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Регион (Область/Край)</Label>
                                        <Select 
                                            value={editingBranch.region_id?.toString()}
                                            disabled={!branchCountryId}
                                            onValueChange={(val) => {
                                                setBranchRegionId(val);
                                                setBranchDistrictId('');
                                                setEditingBranch({ ...editingBranch, region_id: parseInt(val), district_id: undefined, city_id: undefined });
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Выберите регион" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {branchRegions?.map((r: any) => (
                                                    <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Район (опционально)</Label>
                                        <Select 
                                            value={editingBranch.district_id?.toString() || 'none'}
                                            disabled={!branchRegionId}
                                            onValueChange={(val) => {
                                                const dId = val === 'none' ? undefined : parseInt(val);
                                                setBranchDistrictId(val === 'none' ? '' : val);
                                                setEditingBranch({ ...editingBranch, district_id: dId, city_id: undefined });
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Выберите район" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Не указан</SelectItem>
                                                {branchDistricts?.map((d: any) => (
                                                    <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Город</Label>
                                        <Select 
                                            value={editingBranch.city_id?.toString()}
                                            disabled={!branchRegionId}
                                            onValueChange={(val) => setEditingBranch({ ...editingBranch, city_id: parseInt(val) })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Выберите город" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {branchCities?.map((c: any) => (
                                                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="edit-branch-addr" className="text-neutral-700">Адрес</Label>
                                        <Input id="edit-branch-addr" value={editingBranch.address} onChange={(e) => setEditingBranch({ ...editingBranch, address: e.target.value })} className="border-neutral-300 focus:ring-neutral-500" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="edit-branch-phone" className="text-neutral-700">Телефон</Label>
                                        <Input id="edit-branch-phone" value={editingBranch.phone} onChange={(e) => setEditingBranch({ ...editingBranch, phone: e.target.value })} className="border-neutral-300 focus:ring-neutral-500" />
                                    </div>
                                </div>
                            )}
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsEditBranchOpen(false)} className="border-neutral-200">Отмена</Button>
                                <Button onClick={() => updateBranchMutation.mutate(editingBranch)} className="bg-neutral-900 text-white hover:bg-neutral-800" disabled={updateBranchMutation.isPending}>
                                    {updateBranchMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </TabsContent>
            </Tabs>
        </div>
    );
}
