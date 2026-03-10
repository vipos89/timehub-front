'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    Building2, Globe, Share2, Smartphone, Mail, Phone, Trash2, Plus, 
    FileText, ShieldCheck, Save, Info
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AvatarUpload } from '@/components/avatar-upload';

export default function CompanyProfilePage() {
    const queryClient = useQueryClient();
    const [companyForm, setCompanyForm] = useState<any>({
        name: '', description: '', logo_url: '', website: '', tax_id: '', legal_name: '', legal_address: '',
        contact_phones: [], contact_emails: [], social_links: { instagram: '', telegram: '', vk: '' }
    });

    const { data: company, isLoading } = useQuery({ 
        queryKey: ['my-company'], 
        queryFn: async () => (await api.get('/companies')).data[0] || null 
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

    const updateCompanyMutation = useMutation({
        mutationFn: (data: any) => api.put(`/companies/${company.id}`, { ...data, social_links: JSON.stringify(data.social_links) }),
        onSuccess: () => { 
            queryClient.invalidateQueries({ queryKey: ['my-company'] }); 
            toast.success('Данные компании обновлены'); 
        }
    });

    const handleAddField = (field: string) => setCompanyForm({ ...companyForm, [field]: [...companyForm[field], ''] });
    const handleRemoveField = (field: string, idx: number) => { const newF = [...companyForm[field]]; newF.splice(idx, 1); setCompanyForm({ ...companyForm, [field]: newF }); };
    const handleUpdateField = (field: string, idx: number, val: string) => { const newF = [...companyForm[field]]; newF[idx] = val; setCompanyForm({ ...companyForm, [field]: newF }); };

    if (isLoading) return <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div></div>;

    return (
        <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-neutral-900 flex items-center justify-center text-white">
                        <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-neutral-900">Профиль компании</h1>
                        <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest">Глобальные настройки бренда</p>
                    </div>
                </div>
                <Button onClick={() => updateCompanyMutation.mutate(companyForm)} className="bg-neutral-900 text-white rounded-xl h-11 px-8 font-bold">
                    <Save className="h-4 w-4 mr-2" /> Сохранить изменения
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* Branding */}
                <Card className="rounded-[2rem] border-neutral-100 shadow-sm overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                            <Info className="h-4 w-4" /> Основная информация
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 space-y-8">
                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Логотип бренда</Label>
                                <AvatarUpload value={companyForm.logo_url} onChange={(url) => setCompanyForm({ ...companyForm, logo_url: url })} />
                            </div>
                            <div className="flex-1 w-full space-y-4">
                                <div className="grid gap-2">
                                    <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Название компании</Label>
                                    <Input value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} className="h-12 rounded-xl bg-neutral-50 border-none font-bold" />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Сайт</Label>
                                    <div className="relative">
                                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-300" />
                                        <Input value={companyForm.website} onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })} className="h-12 pl-12 rounded-xl bg-neutral-50 border-none font-bold" placeholder="https://..." />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Описание бренда (для виджетов)</Label>
                            <Textarea value={companyForm.description} onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })} className="min-h-[100px] rounded-xl bg-neutral-50 border-none resize-none p-4 font-medium" />
                        </div>
                    </CardContent>
                </Card>

                {/* Legal Info */}
                <Card className="rounded-[2rem] border-neutral-100 shadow-sm overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4" /> Юридические данные
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="grid gap-2 md:col-span-2">
                            <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Юридическое название</Label>
                            <Input value={companyForm.legal_name} onChange={(e) => setCompanyForm({ ...companyForm, legal_name: e.target.value })} className="h-12 rounded-xl bg-neutral-50 border-none font-bold" placeholder="ООО 'Глобал Трейд'" />
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-[10px] font-black uppercase opacity-40 ml-1">УНП / ИНН</Label>
                            <Input value={companyForm.tax_id} onChange={(e) => setCompanyForm({ ...companyForm, tax_id: e.target.value })} className="h-12 rounded-xl bg-neutral-50 border-none font-bold font-mono" />
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-[10px] font-black uppercase opacity-40 ml-1">Юридический адрес</Label>
                            <Input value={companyForm.legal_address} onChange={(e) => setCompanyForm({ ...companyForm, legal_address: e.target.value })} className="h-12 rounded-xl bg-neutral-50 border-none font-bold" />
                        </div>
                    </CardContent>
                </Card>

                {/* Social Links */}
                <Card className="rounded-[2rem] border-neutral-100 shadow-sm overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                            <Share2 className="h-4 w-4" /> Социальные сети
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {['instagram', 'telegram', 'vk'].map((s) => (
                            <div key={s} className="grid gap-2">
                                <Label className="text-[10px] font-black uppercase opacity-40 ml-1">{s}</Label>
                                <Input value={companyForm.social_links[s]} onChange={(e) => setCompanyForm({ ...companyForm, social_links: { ...companyForm.social_links, [s]: e.target.value } })} className="h-12 rounded-xl bg-neutral-50 border-none font-bold" placeholder="@username" />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
