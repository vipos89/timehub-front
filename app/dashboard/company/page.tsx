'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, MapPin, Phone, Briefcase, Tag, Scissors } from 'lucide-react';
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
    const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState(false);
    const [newBranch, setNewBranch] = useState({ name: '', address: '', phone: '' });
    const [companyName, setCompanyName] = useState('');

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
            setNewBranch({ name: '', address: '', phone: '' });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Ошибка при добавлении филиала');
        },
    });

    const createCompanyMutation = useMutation({
        mutationFn: (name: string) => api.post('/companies', { name }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-company'] });
            toast.success('Компания успешно создана');
            setIsCreateCompanyOpen(false);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Ошибка при создании компании');
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
                        <div className="py-4">
                            <Label htmlFor="company-name">Название компании</Label>
                            <Input
                                id="company-name"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                placeholder="Beauty Pro Salon"
                                className="mt-2"
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateCompanyOpen(false)}>Отмена</Button>
                            <Button
                                onClick={() => createCompanyMutation.mutate(companyName)}
                                disabled={!companyName || createCompanyMutation.isPending}
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
                    <p className="text-neutral-500 mt-2 flex items-center gap-2">
                        Идентификатор: <Badge variant="outline" className="font-mono text-[10px]">{company.tax_id || 'Не указан'}</Badge>
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="border-neutral-200 hover:bg-neutral-50 transition-all">Редактировать</Button>
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
                                        {branch.is_main && <Badge className="bg-neutral-900 text-white text-[10px] uppercase tracking-tighter">Основной</Badge>}
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex items-start gap-3 text-sm text-neutral-600">
                                        <MapPin className="h-4 w-4 mt-0.5 text-neutral-400 group-hover:text-neutral-900 transition-colors" />
                                        <span>{branch.address || 'Адрес не указан'}</span>
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
                </TabsContent>
            </Tabs>
        </div>
    );
}
