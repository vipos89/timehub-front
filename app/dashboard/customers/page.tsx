'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, UserCircle, Phone, Mail, History, UserX, ExternalLink, MoreVertical, Pencil, Trash2, Calendar as CalendarIcon, Filter, ArrowUpDown, X, ArrowLeftRight, User, MoreHorizontal, Edit2, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { useBranch } from '@/context/branch-context';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function CustomersPage() {
    const queryClient = useQueryClient();
    const { selectedBranchID } = useBranch();
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'recent'>('name');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCustomer, setCurrentCustomer] = useState<any>(null);
    const [notificationFilter, setNotificationFilter] = useState<string>('all');
    const [activeTab, setActiveTab] = useState<string>('info');
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        notes: '',
    });

    // Queries
    const { data: customers, isLoading: isLoadingCustomers } = useQuery({
        queryKey: ['customers', selectedBranchID, searchQuery, sortBy],
        queryFn: async () => {
            const res = await api.get('/customers', {
                params: {
                    branch_id: selectedBranchID,
                    search: searchQuery,
                }
            });
            
            // For each customer, fetch their stats
            const customersWithStats = await Promise.all(res.data.map(async (c: any) => {
                try {
                    const statsRes = await api.get(`/customers/${c.id}/stats`);
                    return {
                        ...c,
                        stats: statsRes.data,
                        last_visit: statsRes.data.last_visit_date
                    };
                } catch (e) {
                    return {
                        ...c,
                        stats: { total_visits: 0, no_shows: 0 },
                        last_visit: null
                    };
                }
            }));
            
            return customersWithStats.sort((a: any, b: any) => a.first_name.localeCompare(b.first_name));
        },
        enabled: !!selectedBranchID,
    });

    const { data: customerVisits, isLoading: isLoadingVisits } = useQuery({
        queryKey: ['customer-visits', currentCustomer?.id],
        queryFn: async () => {
            const res = await api.get(`/customers/${currentCustomer.id}/visits`);
            return res.data;
        },
        enabled: !!currentCustomer?.id && isModalOpen,
    });

    const { data: customerNotifications, isLoading: isLoadingNotifications } = useQuery({
        queryKey: ['customer-notifications', currentCustomer?.id],
        queryFn: async () => {
            const res = await api.get(`/customers/${currentCustomer.id}/notifications`);
            return res.data;
        },
        enabled: !!currentCustomer?.id && isModalOpen,
    });

    // Calculate detailed visit stats
    const visitStats = {
        total: customerVisits?.length || 0,
        arrived: customerVisits?.filter((v: any) => v.status === 'finished' || v.status === 'arrived').length || 0,
        pending: customerVisits?.filter((v: any) => v.status === 'pending' || v.status === 'confirmed').length || 0,
        noShow: customerVisits?.filter((v: any) => v.status === 'no_show').length || 0,
    };

    // Mutations
    const addCustomerMutation = useMutation({
        mutationFn: (data: any) => api.post(`/customers`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            toast.success('Клиент успешно добавлен');
            setIsModalOpen(false);
            resetForm();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Ошибка при добавлении клиента');
        },
    });

    const updateCustomerMutation = useMutation({
        mutationFn: (data: { id: number; payload: any }) => api.put(`/customers/${data.id}`, data.payload),
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            toast.success('Данные клиента обновлены');
            setCurrentCustomer(res.data);
            // We stay in the modal after update as per current behavior
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Ошибка при обновлении данных');
        },
    });

    const resetForm = () => {
        setFormData({
            first_name: '',
            last_name: '',
            email: '',
            phone: '',
            notes: '',
        });
        setCurrentCustomer(null);
        setActiveTab('info');
    };

    const handleEditClick = (e: React.MouseEvent, customer: any) => {
        e.stopPropagation();
        setCurrentCustomer(customer);
        setFormData({
            first_name: customer.first_name || '',
            last_name: customer.last_name || '',
            email: customer.email || '',
            phone: customer.phone || '',
            notes: customer.notes || '',
        });
        setIsModalOpen(true);
    };

    const handleCustomerClick = (customer: any) => {
        setCurrentCustomer(customer);
        setFormData({
            first_name: customer.first_name || '',
            last_name: customer.last_name || '',
            email: customer.email || '',
            phone: customer.phone || '',
            notes: customer.notes || '',
        });
        setIsModalOpen(true);
    };

    const handleSave = () => {
        const payload = {
            ...formData,
            branch_id: selectedBranchID ? parseInt(selectedBranchID) : 0,
        };

        if (currentCustomer) {
            updateCustomerMutation.mutate({ id: currentCustomer.id, payload });
        } else {
            addCustomerMutation.mutate(payload);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-neutral-900 uppercase italic">CRM / Клиенты</h1>
                    <p className="text-neutral-500 mt-2 font-medium">База ваших клиентов и история их посещений.</p>
                </div>
                <Button 
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="bg-neutral-900 text-white hover:bg-black gap-2 transition-all shadow-xl shadow-black/10 rounded-xl h-12 px-6 font-bold"
                >
                    <Plus className="h-5 w-5" /> Добавить клиента
                </Button>
            </div>

            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <Input 
                        placeholder="Поиск по имени или телефону..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-12 h-12 bg-white border-neutral-100 rounded-2xl shadow-sm focus:ring-1 focus:ring-neutral-200 font-medium"
                    />
                </div>
            </div>

            <Card className="border-neutral-100 shadow-sm overflow-hidden rounded-3xl">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-neutral-50/50">
                            <TableRow className="hover:bg-transparent border-neutral-100 italic">
                                <TableHead className="px-6 py-4 text-neutral-400 font-black uppercase text-[10px] tracking-widest italic">Клиент</TableHead>
                                <TableHead className="text-neutral-400 font-black uppercase text-[10px] tracking-widest italic">Контакты</TableHead>
                                <TableHead className="text-neutral-400 font-black uppercase text-[10px] tracking-widest italic text-center">Визиты</TableHead>
                                <TableHead className="text-neutral-400 font-black uppercase text-[10px] tracking-widest italic text-center">Последний визит</TableHead>
                                <TableHead className="text-neutral-400 font-black uppercase text-[10px] tracking-widest italic">Заметки</TableHead>
                                <TableHead className="text-right px-6 text-neutral-400 font-black uppercase text-[10px] tracking-widest italic">Действия</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {customers?.map((customer: any) => (
                                <TableRow 
                                    key={customer.id} 
                                    onClick={() => handleCustomerClick(customer)}
                                    className="hover:bg-neutral-50/50 border-neutral-50 transition-colors group cursor-pointer"
                                >
                                    <TableCell className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-12 w-12 border-2 border-white shadow-sm ring-1 ring-neutral-100">
                                                <AvatarFallback className="bg-neutral-900 text-white font-black text-xs">
                                                    {customer.first_name?.[0] || '?'}{customer.last_name?.[0] || ''}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-neutral-900 text-base">{customer.first_name} {customer.last_name}</span>
                                                <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">ID: {customer.id}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-sm font-bold text-neutral-700">
                                                <Phone className="h-3 w-3 text-neutral-300" />
                                                {customer.phone}
                                            </div>
                                            {customer.email && (
                                                <div className="flex items-center gap-2 text-[11px] font-medium text-neutral-400">
                                                    <Mail className="h-3 w-3 text-neutral-300" />
                                                    {customer.email}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="inline-flex items-center gap-2 bg-neutral-50 px-3 py-1 rounded-full border border-neutral-100">
                                                <History className="h-3 w-3 text-neutral-300" />
                                                <span className="text-xs font-black text-neutral-400">{customer.stats?.total_visits || 0}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {customer.last_visit ? (
                                            <span className="text-xs font-bold text-neutral-700">
                                                {format(new Date(customer.last_visit), 'dd.MM.yyyy', { locale: ru })}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-black text-neutral-300 uppercase italic">Нет данных</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-xs text-neutral-500 font-medium max-w-[150px] truncate">
                                            {customer.notes || '—'}
                                        </p>
                                    </TableCell>
                                    <TableCell className="text-right px-6">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={(e) => handleEditClick(e, customer)}
                                                className="h-9 w-9 p-0 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900 rounded-xl transition-all"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-9 w-9 p-0 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900 rounded-xl transition-all"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Integrated Details/Edit Modal */}
            <Dialog open={isModalOpen} onOpenChange={(open) => {
                if (!open) { 
                    setIsModalOpen(false); 
                    // Use a timeout to reset after transition
                    setTimeout(resetForm, 300);
                }
            }}>
                <DialogContent className="sm:max-w-[1400px] w-[98vw] h-[92vh] p-0 overflow-hidden border-none rounded-[2rem] shadow-2xl bg-white flex flex-col">
                    <div className="flex flex-col h-full relative">
                        {/* Header: Fixed top-right close */}
                        <div className="shrink-0 h-16 border-b border-neutral-100 flex items-center justify-between px-6 bg-white z-50">
                            <div className="flex items-center gap-4">
                            </div>
                            <div className="flex items-center gap-2">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setIsModalOpen(false)}
                                    className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-neutral-900 group"
                                >
                                    Закрыть <X className="ml-2 h-3.5 w-3.5 transition-transform group-hover:rotate-90" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex flex-1 overflow-hidden h-full">
                            {/* LEFT COLUMN: Summary & Stats */}
                            <aside className="w-[300px] border-r border-neutral-100 flex flex-col bg-white shrink-0 overflow-y-auto custom-scrollbar">
                                <div className="p-6 space-y-8">
                                    {/* Profile Info */}
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <h2 className="text-xl font-black text-neutral-900 leading-tight uppercase italic tracking-tight">
                                                {currentCustomer ? (
                                                    `${formData.first_name} ${formData.last_name || ''}`
                                                ) : (
                                                    formData.first_name || "Новый клиент"
                                                )}
                                            </h2>
                                            <p className="text-xs font-bold text-neutral-400 tracking-tight">{formData.phone || "—"}</p>
                                        </div>

                                            <div className="flex items-center gap-2">
                                                <Button variant="outline" className="h-10 w-10 p-0 rounded-full border-neutral-200 hover:bg-white shadow-sm">
                                                    <User className="h-4 w-4 text-neutral-400" />
                                                </Button>
                                                <Button variant="outline" className="h-10 w-10 p-0 rounded-full border-neutral-200 hover:bg-white shadow-sm">
                                                    <MoreHorizontal className="h-4 w-4 text-neutral-400" />
                                                </Button>
                                            </div>
                                    </div>



                                    {/* Network Data Section */}
                                    <div className="space-y-6 pt-6 border-t border-neutral-100">
                                        <h4 className="text-[10px] font-black uppercase text-neutral-900 tracking-widest italic">Данные по сети</h4>
                                        <div className="space-y-5">
                                            <p className="text-xs font-black text-neutral-400 italic uppercase tracking-wider">BeardClub</p>
                                            
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-bold text-neutral-300 uppercase tracking-widest italic">Последний визит</span>
                                                    <p className="text-[11px] font-black text-neutral-900 italic leading-tight">06.03 09:15</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-bold text-neutral-300 uppercase tracking-widest italic">Всего визитов</span>
                                                    <p className="text-lg font-black text-neutral-900 italic leading-none">{visitStats.total}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-bold text-neutral-300 uppercase tracking-widest italic">Баланс</span>
                                                    <p className="text-xs font-black text-neutral-900 italic leading-none">0</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-bold text-neutral-300 uppercase tracking-widest italic">Продано</span>
                                                    <p className="text-xs font-black text-neutral-900 italic leading-none">
                                                        {Math.round(currentCustomer?.stats?.total_revenue || 0).toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-bold text-neutral-300 uppercase tracking-widest italic">Оплачено</span>
                                                    <p className="text-xs font-black text-neutral-900 italic leading-none">
                                                        {Math.round(currentCustomer?.stats?.total_revenue || 0).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* App Info Section */}
                                    <div className="space-y-4 pt-6 border-t border-neutral-100">
                                        <h4 className="text-[10px] font-black uppercase text-neutral-900 tracking-widest italic">Данные записи</h4>
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-bold text-neutral-300 uppercase tracking-widest italic">Дата создания</span>
                                            <p className="text-xs font-bold text-neutral-900 italic">—</p>
                                        </div>
                                    </div>
                                </div>
                            </aside>

                            {/* CENTER COLUMN: Data Form */}
                            <main className="flex-1 bg-white flex flex-col overflow-hidden relative shadow-[20px_0_50px_rgba(0,0,0,0.02)] z-10">
                                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                                    <div className="px-8 pt-8 pb-4 flex items-center justify-start shrink-0">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 bg-neutral-50 rounded-full flex items-center justify-center border border-neutral-100">
                                                <User className="h-5 w-5 text-neutral-300" />
                                            </div>
                                            <h2 className="text-xl font-black text-neutral-900 uppercase italic tracking-tight">Данные клиента</h2>
                                        </div>
                                    </div>

                                    <div className="px-8 pb-6 shrink-0">
                                        <div className="bg-neutral-100/50 p-1 rounded-xl h-11 flex items-center gap-1 w-fit border border-neutral-100/30">
                                            <TabsList className="bg-transparent border-none shadow-none gap-1">
                                                <TabsTrigger 
                                                    value="info" 
                                                    className="rounded-lg px-6 h-9 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm text-[10px] font-bold uppercase tracking-widest text-neutral-400 transition-all duration-200"
                                                >
                                                    Данные
                                                </TabsTrigger>
                                                {currentCustomer && (
                                                    <>
                                                        <TabsTrigger 
                                                            value="visits" 
                                                            className="rounded-lg px-6 h-9 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm text-[10px] font-bold uppercase tracking-widest text-neutral-400 transition-all duration-200"
                                                        >
                                                            Визиты
                                                        </TabsTrigger>
                                                        <TabsTrigger 
                                                            value="notifications" 
                                                            className="rounded-lg px-6 h-9 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm text-[10px] font-bold uppercase tracking-widest text-neutral-400 transition-all duration-200"
                                                        >
                                                            Уведомления
                                                        </TabsTrigger>
                                                    </>
                                                )}
                                            </TabsList>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                                        <div className="min-h-min p-8 space-y-8">
                                            <TabsContent value="info" className="m-0 outline-none">
                                                <div className="grid gap-6">
                                                    <div className="space-y-2">
                                                        <Label className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Имя</Label>
                                                        <Input 
                                                            value={formData.first_name} 
                                                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                                            className="h-11 rounded-xl border-neutral-200 bg-white focus:ring-1 focus:ring-neutral-900 font-medium" 
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Телефон</Label>
                                                            <Input 
                                                                value={formData.phone} 
                                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                                className="h-11 rounded-xl border-neutral-200 bg-white focus:ring-1 focus:ring-neutral-900 font-medium" 
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Дополнительный телефон</Label>
                                                            <Input 
                                                                placeholder="+375 00 000-00-00"
                                                                className="h-11 rounded-xl border-neutral-200 bg-white focus:ring-1 focus:ring-neutral-900 font-medium text-neutral-300" 
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Email</Label>
                                                        <Input 
                                                            value={formData.email} 
                                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                            placeholder="example@mail.ru"
                                                            className="h-11 rounded-xl border-neutral-200 bg-white focus:ring-1 focus:ring-neutral-900 font-medium" 
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Дата рождения</Label>
                                                            <Input 
                                                                placeholder="01.01.2000"
                                                                className="h-11 rounded-xl border-neutral-200 bg-white focus:ring-1 focus:ring-neutral-900 font-medium text-neutral-300" 
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Пол</Label>
                                                            <div className="h-11 rounded-xl border border-neutral-200 bg-white px-4 flex items-center justify-between cursor-pointer group hover:bg-neutral-50 transition-colors">
                                                                <span className="text-sm font-medium text-neutral-900">Не выбран</span>
                                                                <ArrowUpDown className="h-3 w-3 text-neutral-400 transition-colors group-hover:text-black" />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Категория</Label>
                                                        <div className="h-11 rounded-xl border border-neutral-200 bg-white px-4 flex items-center justify-between cursor-pointer group hover:bg-neutral-50 transition-colors">
                                                            <span className="text-sm font-medium text-neutral-300">Не выбрана</span>
                                                            <ArrowUpDown className="h-3 w-3 text-neutral-400 transition-colors group-hover:text-black" />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Важность</Label>
                                                        <div className="h-11 rounded-xl border border-neutral-200 bg-white px-4 flex items-center justify-between cursor-pointer group hover:bg-neutral-50 transition-colors">
                                                            <span className="text-sm font-medium text-neutral-900">Без класса важности</span>
                                                            <ArrowUpDown className="h-3 w-3 text-neutral-400 transition-colors group-hover:text-black" />
                                                            </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Номер карты</Label>
                                                            <Input 
                                                                placeholder="000 000 000"
                                                                className="h-11 rounded-xl border-neutral-200 bg-white focus:ring-1 focus:ring-neutral-900 font-medium text-neutral-300" 
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Скидка, %</Label>
                                                            <Input 
                                                                defaultValue="0"
                                                                className="h-11 rounded-xl border-neutral-200 bg-white focus:ring-1 focus:ring-neutral-900 font-medium" 
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Примечание</Label>
                                                        <textarea 
                                                            rows={6} 
                                                            value={formData.notes}
                                                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                                            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-neutral-900 transition-all resize-none" 
                                                        />
                                                    </div>

                                                    <div className="flex items-center gap-3 py-2">
                                                        <div className="h-5 w-5 rounded border border-neutral-200 flex items-center justify-center">
                                                            {/* Checkbox placeholder */}
                                                        </div>
                                                        <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-tight">Запретить записываться через онлайн-запись</span>
                                                    </div>
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="visits" className="m-0 outline-none">
                                                <div className="p-0 overflow-x-auto">
                                                    <Table>
                                                        <TableHeader className="bg-neutral-50/50 sticky top-0 z-10">
                                                            <TableRow className="border-neutral-100 hover:bg-transparent">
                                                                <TableHead className="px-8 py-4 text-[10px] font-black uppercase text-neutral-400 tracking-widest italic">Сотрудник</TableHead>
                                                                <TableHead className="text-[10px] font-black uppercase text-neutral-400 tracking-widest italic">Услуга</TableHead>
                                                                <TableHead className="text-[10px] font-black uppercase text-neutral-400 tracking-widest italic text-center">Статус</TableHead>
                                                                <TableHead className="text-[10px] font-black uppercase text-neutral-400 tracking-widest italic text-right px-8">Стоимость</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {isLoadingVisits ? (
                                                                <TableRow>
                                                                    <TableCell colSpan={4} className="py-20 text-center text-[10px] font-black uppercase text-neutral-300 tracking-widest italic">Загрузка данных...</TableCell>
                                                                </TableRow>
                                                            ) : customerVisits?.length > 0 ? (
                                                                customerVisits.map((visit: any, idx: number) => (
                                                                    <TableRow 
                                                                        key={visit.id} 
                                                                        className={cn(
                                                                            "border-neutral-50 transition-colors",
                                                                            idx % 2 === 1 ? "bg-neutral-50/50" : "bg-white"
                                                                        )}
                                                                    >
                                                                        <TableCell className="px-8 py-5">
                                                                            <div className="flex items-center gap-4">
                                                                                <div className="h-10 w-10 bg-neutral-100 rounded-full flex items-center justify-center text-[10px] font-black text-neutral-400 italic">
                                                                                    {visit.employee_name?.[0]}
                                                                                </div>
                                                                                <div className="flex flex-col">
                                                                                    <span className="text-xs font-black text-neutral-900 uppercase italic leading-none mb-1">{visit.employee_name}</span>
                                                                                    <span className="text-[9px] font-bold text-neutral-300 uppercase italic">
                                                                                        {format(new Date(visit.start_time), 'dd.MM.yyyy HH:mm', { locale: ru })}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <div className="flex flex-col gap-1">
                                                                                <span className="text-[11px] font-bold text-neutral-700 uppercase italic tracking-tight">{visit.service_name}</span>
                                                                                <span className="text-[8px] font-bold text-neutral-200 uppercase tracking-widest italic">ID #{visit.id}</span>
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell className="text-center">
                                                                            <Badge className={cn(
                                                                                "text-[8px] font-black uppercase px-2.5 py-1 rounded-full border shadow-none tracking-widest inline-flex transition-colors",
                                                                                visit.status === 'finished' || visit.status === 'arrived' ? "bg-white text-blue-600 border-neutral-100 shadow-sm" :
                                                                                visit.status === 'no_show' ? "bg-neutral-50 text-neutral-400 border-neutral-100" :
                                                                                visit.status === 'confirmed' ? "bg-neutral-50 text-neutral-500 border-neutral-100" :
                                                                                visit.status === 'pending' ? "bg-neutral-50 text-neutral-400 border-neutral-100" :
                                                                                "bg-white text-neutral-400 border-neutral-100 shadow-sm"
                                                                            )}>
                                                                                {visit.status === 'finished' || visit.status === 'arrived' ? 'Пришел' : 
                                                                                visit.status === 'no_show' ? 'Не пришел' : 
                                                                                visit.status === 'confirmed' ? 'Подтвержден' :
                                                                                visit.status === 'pending' ? 'Ожидание' :
                                                                                visit.status}
                                                                            </Badge>
                                                                        </TableCell>
                                                                        <TableCell className="text-right px-8 font-black text-neutral-900 italic tracking-tight text-xs">
                                                                            {visit.price?.toLocaleString()} 
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))
                                                            ) : (
                                                                <TableRow>
                                                                    <TableCell colSpan={4} className="py-32 text-center text-[10px] font-black uppercase text-neutral-200 tracking-widest italic">Нет истории посещений</TableCell>
                                                                </TableRow>
                                                            )}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="notifications" className="m-0 outline-none">
                                                <div className="h-12 border-b border-neutral-50 px-8 flex items-center justify-start gap-4 shrink-0 bg-neutral-50/30">
                                                    {['all', 'telegram', 'sms'].map((filter) => (
                                                        <button
                                                            key={filter}
                                                            onClick={() => setNotificationFilter(filter)}
                                                            className={cn(
                                                                "px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all tracking-widest",
                                                                notificationFilter === filter 
                                                                    ? "bg-white text-neutral-900 shadow-sm border border-neutral-100" 
                                                                    : "text-neutral-300 hover:text-neutral-500"
                                                            )}
                                                        >
                                                            {filter === 'all' ? 'Все' : filter}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="p-8 space-y-4">
                                                    {isLoadingNotifications ? (
                                                        <div className="py-20 text-center text-neutral-300 italic uppercase font-black tracking-widest text-[10px]">Загрузка уведомлений...</div>
                                                    ) : customerNotifications?.filter((n: any) => notificationFilter === 'all' || n.channel === notificationFilter).length > 0 ? (
                                                        customerNotifications
                                                            .filter((n: any) => notificationFilter === 'all' || n.channel === notificationFilter)
                                                            .map((n: any) => (
                                                            <div key={n.id} className="bg-white p-5 rounded-2xl border border-neutral-100 flex items-start justify-between group hover:border-neutral-200 transition-all">
                                                                <div className="space-y-3 flex-1">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={cn(
                                                                            "h-2 w-2 rounded-full",
                                                                            n.status === 'sent' ? "bg-emerald-400" : "bg-neutral-200"
                                                                        )} />
                                                                        <span className="text-[10px] font-black text-neutral-900 uppercase tracking-widest italic">{n.type}</span>
                                                                        <span className="text-[9px] font-bold text-neutral-300 uppercase italic">
                                                                            {format(new Date(n.created_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-sm text-neutral-600 font-medium leading-relaxed italic max-w-2xl">
                                                                        {n.content}
                                                                    </p>
                                                                </div>
                                                                <Badge variant="outline" className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full border-neutral-100 text-neutral-400 tracking-tighter">
                                                                    {n.channel} • {n.status}
                                                                </Badge>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-center py-32 text-neutral-200 italic font-black uppercase tracking-[0.2em] text-[10px]">Уведомлений не найдено</div>
                                                    )}
                                                </div>
                                            </TabsContent>
                                        </div>
                                    </div>
                                </Tabs>

                                <div className="shrink-0 h-20 bg-white border-t border-neutral-100 flex items-center justify-between px-8 z-20">
                                    <div className="flex items-center gap-2">
                                        {currentCustomer && (
                                            <Button variant="ghost" className="h-11 px-0 text-neutral-400 hover:text-rose-600 gap-2 text-[10px] font-black uppercase tracking-widest">
                                                <Trash2 className="h-4 w-4" /> Удалить запись
                                            </Button>
                                        )}
                                    </div>
                                    <Button 
                                        onClick={handleSave}
                                        className="bg-[#FBC400] hover:bg-[#EBB400] text-black h-12 px-10 rounded-xl gap-3 text-[11px] font-black uppercase tracking-widest shadow-lg shadow-[#FBC400]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        {updateCustomerMutation.isPending || addCustomerMutation.isPending ? 'Сохранение...' : 'Сохранить данные'}
                                    </Button>
                                </div>
                            </main>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
