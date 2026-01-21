'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Tag, Briefcase, Scissors, Search } from 'lucide-react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

export default function ServicesPage() {
    const queryClient = useQueryClient();
    const { selectedBranchID } = useBranch();
    const [selectedServiceID, setSelectedServiceID] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
    const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
    const [newCategory, setNewCategory] = useState({ name: '' });
    const [newService, setNewService] = useState({ name: '', description: '', category_id: '', price: '', duration_minutes: '' });

    // Queries
    const { data: company } = useQuery({
        queryKey: ['my-company'],
        queryFn: async () => {
            const res = await api.get('/companies');
            return res.data[0] || null;
        },
    });

    const { data: categories, isLoading: isLoadingCategories } = useQuery({
        queryKey: ['categories', selectedBranchID],
        queryFn: async () => {
            const res = await api.get(`/branches/${selectedBranchID}/categories`);
            return res.data;
        },
        enabled: !!selectedBranchID,
    });

    const { data: services, isLoading: isLoadingServices } = useQuery({
        queryKey: ['all-services', selectedBranchID],
        queryFn: async () => {
            const res = await api.get(`/branches/${selectedBranchID}/services`);
            return res.data;
        },
        enabled: !!selectedBranchID,
    });

    const { data: employees } = useQuery({
        queryKey: ['branch-employees', selectedBranchID],
        queryFn: async () => {
            const res = await api.get(`/employees?company_id=${company?.id}`);
            return res.data.filter((e: any) => e.branch_id.toString() === selectedBranchID);
        },
        enabled: !!selectedBranchID && !!company?.id,
    });

    const selectedService = services?.find((s: any) => s.id === selectedServiceID);

    // Mutations
    const addCategoryMutation = useMutation({
        mutationFn: (data: any) => api.post(`/branches/${selectedBranchID}/categories`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories', selectedBranchID] });
            toast.success('Категория добавлена');
            setIsAddCategoryOpen(false);
            setNewCategory({ name: '' });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Ошибка при добавлении категории');
        },
    });

    const addServiceMutation = useMutation({
        mutationFn: (data: any) => {
            const payload = {
                ...data,
                company_id: company?.id,
                price: parseFloat(data.price) || 0,
                duration_minutes: parseInt(data.duration_minutes) || 0,
                category_id: data.category_id ? parseInt(data.category_id) : null
            };
            return api.post(`/branches/${selectedBranchID}/services`, payload);
        },
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['all-services', selectedBranchID] });
            queryClient.invalidateQueries({ queryKey: ['categories', selectedBranchID] });
            toast.success('Услуга добавлена');
            setIsAddServiceOpen(false);
            setNewService({ name: '', description: '', category_id: '', price: '', duration_minutes: '' });
            setSelectedServiceID(res.data.id);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Ошибка при добавлении услуги');
        },
    });

    const updateServiceMutation = useMutation({
        mutationFn: (data: any) => api.put(`/services/${data.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-services', selectedBranchID] });
            queryClient.invalidateQueries({ queryKey: ['categories', selectedBranchID] });
            toast.success('Услуга обновлена');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Ошибка при обновлении услуги');
        },
    });

    const assignEmployeeMutation = useMutation({
        mutationFn: (data: { employeeID: number; serviceID: number; price: number; duration: number }) =>
            api.post(`/employees/${data.employeeID}/services`, {
                service_id: data.serviceID,
                price: data.price,
                duration_minutes: data.duration
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branch-employees'] });
            queryClient.invalidateQueries({ queryKey: ['all-services'] });
            toast.success('Мастер привязан');
        }
    });

    const unassignEmployeeMutation = useMutation({
        mutationFn: (data: { employeeID: number; serviceID: number }) =>
            api.delete(`/employees/${data.employeeID}/services/${data.serviceID}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branch-employees'] });
            queryClient.invalidateQueries({ queryKey: ['all-services'] });
            toast.success('Мастер отвязан');
        }
    });

    if (!selectedBranchID) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <Scissors className="h-16 w-16 text-neutral-200 mb-4" />
                <h2 className="text-2xl font-bold text-neutral-900">Выберите филиал</h2>
                <p className="text-neutral-500 mt-2">Пожалуйста, выберите филиал для управления услугами.</p>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-8rem)] -m-8 bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm animate-in fade-in duration-500">
            {/* Sidebar List */}
            <div className="w-80 border-r border-neutral-200 flex flex-col bg-neutral-50/30">
                <div className="p-4 space-y-4 border-b border-neutral-200 bg-white">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-neutral-900">Услуги</h2>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setIsAddCategoryOpen(true)}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
                        <Input
                            placeholder="Поиск услуги..."
                            className="pl-9 h-9 bg-white border-neutral-200"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* Categories and Services */}
                    {categories?.map((cat: any) => (
                        <div key={cat.id} className="mb-2">
                            <div className="px-4 py-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center justify-between">
                                {cat.name}
                                <Button variant="ghost" size="sm" className="h-5 text-[10px] p-0" onClick={() => {
                                    setNewService({ ...newService, category_id: cat.id.toString() });
                                    setIsAddServiceOpen(true);
                                }}>Add</Button>
                            </div>
                            <div className="space-y-0.5">
                                {cat.services?.filter((s: any) => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map((svc: any) => (
                                    <button
                                        key={svc.id}
                                        onClick={() => setSelectedServiceID(svc.id)}
                                        className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${selectedServiceID === svc.id
                                            ? 'bg-neutral-900 text-white shadow-md'
                                            : 'hover:bg-neutral-100 text-neutral-700'
                                            }`}
                                    >
                                        <div className={`p-1 rounded-md ${selectedServiceID === svc.id ? 'bg-neutral-800' : 'bg-neutral-100 text-neutral-400'}`}>
                                            <Scissors className="h-3.5 w-3.5" />
                                        </div>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="text-sm font-bold truncate">{svc.name}</span>
                                            <span className={`text-[10px] ${selectedServiceID === svc.id ? 'text-neutral-400' : 'text-neutral-500'}`}>
                                                {svc.price} ₽ • {svc.duration_minutes} мин
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Uncategorized */}
                    <div className="mb-2">
                        <div className="px-4 py-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                            Без категории
                        </div>
                        {services?.filter((s: any) => !s.category_id && s.name.toLowerCase().includes(searchQuery.toLowerCase())).map((svc: any) => (
                            <button
                                key={svc.id}
                                onClick={() => setSelectedServiceID(svc.id)}
                                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${selectedServiceID === svc.id
                                    ? 'bg-neutral-900 text-white shadow-md'
                                    : 'hover:bg-neutral-100 text-neutral-700'
                                    }`}
                            >
                                <div className={`p-1 rounded-md ${selectedServiceID === svc.id ? 'bg-neutral-800' : 'bg-neutral-100 text-neutral-400'}`}>
                                    <Scissors className="h-3.5 w-3.5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold truncate">{svc.name}</span>
                                    <span className={`text-[10px] ${selectedServiceID === svc.id ? 'text-neutral-400' : 'text-neutral-500'}`}>
                                        {svc.price} ₽ • {svc.duration_minutes} мин
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>

                    {services?.length === 0 && (
                        <div className="p-8 text-center">
                            <Plus className="h-8 w-8 text-neutral-200 mx-auto mb-2" />
                            <p className="text-xs text-neutral-400 font-medium whitespace-pre-wrap">Услуг еще нет.\nДобавьте первую услугу.</p>
                            <Button variant="link" size="sm" onClick={() => setIsAddServiceOpen(true)}>Добавить</Button>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-neutral-200 bg-white">
                    <Button className="w-full bg-neutral-900 text-white hover:bg-neutral-800 h-9" onClick={() => setIsAddServiceOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" /> Новая услуга
                    </Button>
                </div>
            </div>

            {/* Main Content Detail Area */}
            <div className="flex-1 overflow-y-auto bg-neutral-50/10">
                {selectedService ? (
                    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        {/* Header Section */}
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <Badge variant="outline" className="text-[10px] border-neutral-200">ID: {selectedService.id}</Badge>
                                <h1 className="text-3xl font-extrabold text-neutral-900">{selectedService.name}</h1>
                                <p className="text-neutral-500">Редактирование параметров и привязки мастеров</p>
                            </div>
                            <Button
                                onClick={() => updateServiceMutation.mutate({
                                    id: selectedService.id,
                                    name: selectedService.name,
                                    description: selectedService.description,
                                    price: selectedService.price,
                                    duration_minutes: selectedService.duration_minutes,
                                    category_id: selectedService.category_id
                                })}
                                className="bg-neutral-900 text-white hover:bg-neutral-800 font-bold px-6"
                                disabled={updateServiceMutation.isPending}
                            >
                                {updateServiceMutation.isPending ? 'Сохранение...' : 'Сохранить изменения'}
                            </Button>
                        </div>

                        {/* Basic Info Card */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <Card className="border-neutral-200 shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Tag className="h-4 w-4 text-neutral-400" /> Основная информация
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-xs text-neutral-700">Название услуги</Label>
                                        <Input
                                            value={selectedService.name}
                                            onChange={(e) => {
                                                const updated = services.map((s: any) => s.id === selectedService.id ? { ...s, name: e.target.value } : s);
                                                queryClient.setQueryData(['all-services', selectedBranchID], updated);
                                            }}
                                            className="border-neutral-200 focus:ring-neutral-900"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-xs text-neutral-700">Категория</Label>
                                        <Select
                                            value={selectedService.category_id?.toString() || 'none'}
                                            onValueChange={(val) => {
                                                const catId = val === 'none' ? null : parseInt(val);
                                                const updated = services.map((s: any) => s.id === selectedService.id ? { ...s, category_id: catId } : s);
                                                queryClient.setQueryData(['all-services', selectedBranchID], updated);
                                            }}
                                        >
                                            <SelectTrigger className="border-neutral-200">
                                                <SelectValue placeholder="Без категории" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Без категории</SelectItem>
                                                {categories?.map((cat: any) => (
                                                    <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-xs text-neutral-700">Описание</Label>
                                        <Input
                                            value={selectedService.description}
                                            onChange={(e) => {
                                                const updated = services.map((s: any) => s.id === selectedService.id ? { ...s, description: e.target.value } : s);
                                                queryClient.setQueryData(['all-services', selectedBranchID], updated);
                                            }}
                                            className="border-neutral-200 focus:ring-neutral-900"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-neutral-200 shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Scissors className="h-4 w-4 text-neutral-400" /> Базовые параметры
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-xs text-neutral-700">Базовая цена (₽)</Label>
                                        <Input
                                            type="number"
                                            onFocus={(e) => e.target.select()}
                                            value={selectedService.price}
                                            onChange={(e) => {
                                                const updated = services.map((s: any) => s.id === selectedService.id ? { ...s, price: parseFloat(e.target.value) || 0 } : s);
                                                queryClient.setQueryData(['all-services', selectedBranchID], updated);
                                            }}
                                            className="border-neutral-200 focus:ring-neutral-900 font-bold"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="font-bold text-xs text-neutral-700">Длительность (мин)</Label>
                                        <Select
                                            value={selectedService.duration_minutes?.toString()}
                                            onValueChange={(val) => {
                                                const updated = services.map((s: any) => s.id === selectedService.id ? { ...s, duration_minutes: parseInt(val) } : s);
                                                queryClient.setQueryData(['all-services', selectedBranchID], updated);
                                            }}
                                        >
                                            <SelectTrigger className="border-neutral-200 font-bold">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {[15, 30, 45, 60, 90, 120, 180, 240].map(m => (
                                                    <SelectItem key={m} value={m.toString()}>{m} мин ({(m / 60).toFixed(1)} ч)</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Employees Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-extrabold text-neutral-900">Сотрудники, оказывающие услугу</h2>
                            </div>

                            <Card className="border-neutral-200 shadow-sm overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-neutral-50/50">
                                        <TableRow className="hover:bg-transparent border-neutral-100">
                                            <TableHead className="px-6 py-4 text-neutral-500 font-bold uppercase text-[10px] tracking-wider">Мастер</TableHead>
                                            <TableHead className="text-neutral-500 font-bold uppercase text-[10px] tracking-wider">Статус</TableHead>
                                            <TableHead className="text-neutral-500 font-bold uppercase text-[10px] tracking-wider">Цена (₽)</TableHead>
                                            <TableHead className="text-neutral-500 font-bold uppercase text-[10px] tracking-wider">Длительность (мин)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {employees?.map((emp: any) => {
                                            const assignment = emp.services?.find((es: any) => es.service_id === selectedService.id);
                                            const isAssigned = !!assignment;

                                            return (
                                                <TableRow key={emp.id} className="hover:bg-neutral-50 transition-colors border-neutral-100">
                                                    <TableCell className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-bold text-neutral-500 border border-neutral-200">
                                                                {emp.name[0]}
                                                            </div>
                                                            <span className="font-bold text-sm text-neutral-900">{emp.name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant={isAssigned ? "default" : "outline"}
                                                            size="sm"
                                                            className={`h-7 px-3 text-[10px] font-bold ${isAssigned ? 'bg-green-600 hover:bg-green-700 text-white border-0' : 'text-neutral-500 border-neutral-200'}`}
                                                            onClick={() => {
                                                                if (isAssigned) {
                                                                    unassignEmployeeMutation.mutate({ employeeID: emp.id, serviceID: selectedService.id });
                                                                } else {
                                                                    assignEmployeeMutation.mutate({
                                                                        employeeID: emp.id,
                                                                        serviceID: selectedService.id,
                                                                        price: selectedService.price,
                                                                        duration: selectedService.duration_minutes
                                                                    });
                                                                }
                                                            }}
                                                        >
                                                            {isAssigned ? 'Активен' : 'Отключен'}
                                                        </Button>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            disabled={!isAssigned}
                                                            value={isAssigned ? (assignment.price || selectedService.price) : selectedService.price}
                                                            className="h-8 w-24 border-neutral-200 text-xs font-bold disabled:opacity-30"
                                                            onChange={(e) => {
                                                                if (!isAssigned) return;
                                                                const val = parseFloat(e.target.value) || 0;
                                                                queryClient.setQueryData(['branch-employees', selectedBranchID], (old: any) =>
                                                                    old?.map((e: any) => e.id === emp.id ? {
                                                                        ...e,
                                                                        services: e.services?.map((s: any) => s.service_id === selectedService.id ? { ...s, price: val } : s)
                                                                    } : e)
                                                                );
                                                            }}
                                                            onBlur={(e) => {
                                                                if (!isAssigned) return;
                                                                assignEmployeeMutation.mutate({
                                                                    employeeID: emp.id,
                                                                    serviceID: selectedService.id,
                                                                    price: parseFloat(e.target.value) || selectedService.price,
                                                                    duration: assignment.duration_minutes || selectedService.duration_minutes
                                                                });
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            disabled={!isAssigned}
                                                            value={isAssigned ? (assignment.duration_minutes || selectedService.duration_minutes) : selectedService.duration_minutes}
                                                            className="h-8 w-24 border-neutral-200 text-xs font-bold disabled:opacity-30"
                                                            onChange={(e) => {
                                                                if (!isAssigned) return;
                                                                const val = parseInt(e.target.value) || 0;
                                                                queryClient.setQueryData(['branch-employees', selectedBranchID], (old: any) =>
                                                                    old?.map((e: any) => e.id === emp.id ? {
                                                                        ...e,
                                                                        services: e.services?.map((s: any) => s.service_id === selectedService.id ? { ...s, duration_minutes: val } : s)
                                                                    } : e)
                                                                );
                                                            }}
                                                            onBlur={(e) => {
                                                                if (!isAssigned) return;
                                                                assignEmployeeMutation.mutate({
                                                                    employeeID: emp.id,
                                                                    serviceID: selectedService.id,
                                                                    price: assignment.price || selectedService.price,
                                                                    duration: parseInt(e.target.value) || selectedService.duration_minutes
                                                                });
                                                            }}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </Card>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                        <div className="h-20 w-20 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
                            <Scissors className="h-10 w-10 text-neutral-300" />
                        </div>
                        <h2 className="text-xl font-bold text-neutral-400">Выберите услугу для редактирования</h2>
                        <p className="text-sm mt-1 max-w-xs mx-auto">Выберите услугу из списка слева, чтобы настроить её параметры и привязать мастеров.</p>
                    </div>
                )}
            </div>

            {/* Dialogs */}
            <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Новая категория</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>Название</Label>
                        <Input value={newCategory.name} onChange={(e) => setNewCategory({ name: e.target.value })} placeholder="Напр. Стрижки" />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddCategoryOpen(false)}>Отмена</Button>
                        <Button onClick={() => addCategoryMutation.mutate(newCategory)} disabled={!newCategory.name}>Создать</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isAddServiceOpen} onOpenChange={setIsAddServiceOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Новая услуга</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="grid gap-2">
                            <Label>Название</Label>
                            <Input value={newService.name} onChange={(e) => setNewService({ ...newService, name: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Категория</Label>
                            <Select value={newService.category_id} onValueChange={(val) => setNewService({ ...newService, category_id: val })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Без категории" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Без категории</SelectItem>
                                    {categories?.map((cat: any) => (
                                        <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Цена (₽)</Label>
                                <Input type="number" value={newService.price} onChange={(e) => setNewService({ ...newService, price: e.target.value })} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Длительность (мин)</Label>
                                <Input type="number" value={newService.duration_minutes} onChange={(e) => setNewService({ ...newService, duration_minutes: e.target.value })} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddServiceOpen(false)}>Отмена</Button>
                        <Button onClick={() => addServiceMutation.mutate(newService)} disabled={!newService.name}>Создать</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

