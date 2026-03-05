'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, UserCircle, Phone, Mail, History, UserX, ExternalLink, MoreVertical, Pencil, Trash2, Calendar as CalendarIcon, Filter, ArrowUpDown, X } from 'lucide-react';
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
    const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
    const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [currentCustomer, setCurrentCustomer] = useState<any>(null);
    const [notificationFilter, setNotificationFilter] = useState<string>('all');
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
        enabled: !!currentCustomer?.id && isDetailsOpen,
    });

    const { data: customerNotifications, isLoading: isLoadingNotifications } = useQuery({
        queryKey: ['customer-notifications', currentCustomer?.id],
        queryFn: async () => {
            const res = await api.get(`/customers/${currentCustomer.id}/notifications`);
            return res.data;
        },
        enabled: !!currentCustomer?.id && isDetailsOpen,
    });

    // Mutations
    const addCustomerMutation = useMutation({
        mutationFn: (data: any) => api.post(`/customers`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            toast.success('Клиент успешно добавлен');
            setIsAddCustomerOpen(false);
            resetForm();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Ошибка при добавлении клиента');
        },
    });

    const updateCustomerMutation = useMutation({
        mutationFn: (data: { id: number; payload: any }) => api.put(`/customers/${data.id}`, data.payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            toast.success('Данные клиента обновлены');
            setIsEditCustomerOpen(false);
            resetForm();
            setCurrentCustomer(null);
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
        setIsEditCustomerOpen(true);
    };

    const handleCustomerClick = (customer: any) => {
        setCurrentCustomer(customer);
        setIsDetailsOpen(true);
    };

    const handleSave = () => {
        const payload = {
            ...formData,
            branch_id: selectedBranchID ? parseInt(selectedBranchID) : 0,
        };

        if (isEditCustomerOpen && currentCustomer) {
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
                    onClick={() => { resetForm(); setIsAddCustomerOpen(true); }}
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

            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent showCloseButton={false} className="sm:max-w-[1400px] w-[98vw] p-0 overflow-hidden bg-white rounded-[1.5rem] border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] h-[92vh] flex flex-col">
                    <DialogTitle className="sr-only">Профиль клиента</DialogTitle>
                    <DialogDescription className="sr-only">Детальная информация о клиенте, история визитов и лог уведомлений</DialogDescription>
                    
                    {/* Header */}
                    <div className="h-16 border-b border-neutral-100 flex items-center justify-between px-6 shrink-0 bg-white z-10">
                        <div className="flex items-center gap-4">
                            <Badge variant="outline" className="bg-neutral-50 text-neutral-400 border-neutral-100 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-xl">
                                Профиль клиента #{currentCustomer?.id}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={(e) => { setIsDetailsOpen(false); handleEditClick(e, currentCustomer); }}
                                className="h-10 rounded-xl font-bold gap-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 transition-all"
                            >
                                <Pencil className="h-4 w-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest italic">Редактировать</span>
                            </Button>
                            <div className="w-px h-6 bg-neutral-100 mx-1" />
                            <Button variant="ghost" size="icon" onClick={() => setIsDetailsOpen(false)} className="text-neutral-300 hover:text-black rounded-xl h-10 w-10">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 grid grid-cols-[320px_1fr_320px] overflow-hidden">
                        {/* Left Column: Basic Info */}
                        <div className="border-r border-neutral-100 p-8 flex flex-col gap-8 overflow-y-auto custom-scrollbar bg-white">
                            <div className="space-y-6">
                                <div className="flex flex-col items-center text-center gap-4">
                                    <Avatar className="h-28 w-28 border-4 border-neutral-50 shadow-md ring-1 ring-neutral-100">
                                        <AvatarFallback className="bg-neutral-900 text-white font-black text-3xl italic">
                                            {currentCustomer?.first_name?.[0] || '?'}{currentCustomer?.last_name?.[0] || ''}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="space-y-1">
                                        <h2 className="text-2xl font-black uppercase tracking-tight text-neutral-900 italic leading-tight">
                                            {currentCustomer?.first_name}<br />{currentCustomer?.last_name}
                                        </h2>
                                        <p className="text-neutral-400 text-xs font-bold tracking-widest uppercase italic mt-2">
                                            Клиент с {currentCustomer?.created_at ? format(new Date(currentCustomer.created_at), 'MMM yyyy', { locale: ru }) : '—'}
                                        </p>
                                    </div>
                                </div>

                                <div className="h-px bg-neutral-100 w-full" />

                                <div className="space-y-5">
                                    <h4 className="text-[10px] font-black uppercase text-neutral-400 tracking-[0.2em] px-1">Контакты</h4>
                                    <div className="space-y-4">
                                        <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 space-y-1 group hover:border-neutral-200 transition-all">
                                            <span className="text-[9px] font-black uppercase text-neutral-300 tracking-widest">Телефон</span>
                                            <div className="flex items-center gap-3 text-sm font-bold text-neutral-900">
                                                <div className="p-1.5 bg-white rounded-lg shadow-sm border border-neutral-100 text-neutral-400">
                                                    <Phone className="h-3.5 w-3.5" />
                                                </div>
                                                {currentCustomer?.phone}
                                            </div>
                                        </div>
                                        <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 space-y-1 group hover:border-neutral-200 transition-all">
                                            <span className="text-[9px] font-black uppercase text-neutral-300 tracking-widest">Email</span>
                                            <div className="flex items-center gap-3 text-sm font-bold text-neutral-900">
                                                <div className="p-1.5 bg-white rounded-lg shadow-sm border border-neutral-100 text-neutral-400">
                                                    <Mail className="h-3.5 w-3.5" />
                                                </div>
                                                <span className="truncate">{currentCustomer?.email || 'Не указан'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-auto pt-6 border-t border-neutral-100">
                                <div className="p-5 bg-neutral-900 rounded-[2rem] shadow-xl shadow-black/10 text-center space-y-1">
                                    <span className="text-[9px] font-black uppercase text-neutral-500 tracking-[0.2em]">Выручка</span>
                                    <div className="text-2xl font-black text-[#F5FF82] italic tracking-tight">
                                        {currentCustomer?.stats?.total_revenue?.toLocaleString() || 0} ₽
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Middle Column: Visits & Notifications */}
                        <div className="border-r border-neutral-100 flex flex-col overflow-hidden bg-neutral-50/30">
                            <Tabs defaultValue="visits" className="flex-1 flex flex-col overflow-hidden">
                                <div className="bg-white px-8 border-b border-neutral-100 shrink-0 h-16 flex items-center">
                                    <TabsList className="bg-transparent h-full p-0 gap-10">
                                        <TabsTrigger value="visits" className="h-full border-b-2 border-transparent data-[state=active]:border-neutral-900 data-[state=active]:bg-transparent rounded-none px-0 font-black uppercase text-[10px] tracking-widest text-neutral-400 data-[state=active]:text-neutral-900 transition-all italic">История визитов</TabsTrigger>
                                        <TabsTrigger value="notifications" className="h-full border-b-2 border-transparent data-[state=active]:border-neutral-900 data-[state=active]:bg-transparent rounded-none px-0 font-black uppercase text-[10px] tracking-widest text-neutral-400 data-[state=active]:text-neutral-900 transition-all italic">Лог уведомлений</TabsTrigger>
                                    </TabsList>
                                </div>

                                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                    <TabsContent value="visits" className="m-0 space-y-4">
                                        {isLoadingVisits ? (
                                            <div className="text-center py-20 text-neutral-400 italic text-sm">Загрузка истории...</div>
                                        ) : customerVisits?.length > 0 ? (
                                            customerVisits.map((visit: any) => (
                                                <div key={visit.id} className="bg-white p-5 rounded-[1.5rem] border border-neutral-100 shadow-sm flex items-center justify-between group hover:border-neutral-200 transition-all">
                                                    <div className="flex items-center gap-6">
                                                        <div className="flex flex-col items-center justify-center h-16 w-16 bg-neutral-50 rounded-2xl border border-neutral-100 shrink-0 group-hover:bg-white transition-colors">
                                                            <span className="text-[10px] font-black uppercase text-neutral-400 leading-none mb-1 tracking-widest">
                                                                {format(new Date(visit.start_time), 'MMM', { locale: ru })}
                                                            </span>
                                                            <span className="text-2xl font-black text-neutral-900 leading-none italic">
                                                                {format(new Date(visit.start_time), 'd')}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-col gap-1.5">
                                                            <span className="text-sm font-black text-neutral-900 uppercase tracking-tight italic">
                                                                {format(new Date(visit.start_time), 'EEEE, HH:mm', { locale: ru })}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="outline" className="text-[9px] font-black uppercase border-neutral-100 text-neutral-400 px-2 py-0.5 rounded-lg bg-neutral-50">
                                                                    {visit.service_name}
                                                                </Badge>
                                                                <span className="text-[10px] font-bold text-neutral-400 uppercase italic tracking-wider">Мастер: {visit.employee_name}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex flex-col items-end gap-2">
                                                        <span className="text-xl font-black text-neutral-900 italic tracking-tight leading-none">{visit.price?.toLocaleString()} ₽</span>
                                                        <Badge className={cn(
                                                            "text-[9px] font-black uppercase px-2.5 py-0.5 rounded-lg border shadow-none tracking-widest",
                                                            visit.status === 'finished' ? "bg-green-50 text-green-600 border-green-100" :
                                                            visit.status === 'no_show' ? "bg-red-50 text-red-600 border-red-100" :
                                                            "bg-neutral-100 text-neutral-400 border-neutral-200"
                                                        )}>
                                                            {visit.status === 'finished' ? 'Пришел' : visit.status === 'no_show' ? 'Не пришел' : visit.status}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-24 text-neutral-300 italic text-sm border-2 border-dashed border-neutral-100 rounded-[2.5rem] bg-white/50">
                                                История посещений пуста
                                            </div>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="notifications" className="m-0 space-y-6">
                                        <div className="flex items-center justify-between sticky top-0 bg-neutral-50/90 backdrop-blur-md py-2 z-10 -mx-2 px-2">
                                            <div className="flex bg-white p-1 rounded-xl border border-neutral-100 shadow-sm">
                                                {['all', 'telegram', 'sms'].map((filter) => (
                                                    <button
                                                        key={filter}
                                                        onClick={() => setNotificationFilter(filter)}
                                                        className={cn(
                                                            "px-4 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all tracking-widest",
                                                            notificationFilter === filter 
                                                                ? "bg-neutral-900 text-white shadow-lg shadow-black/10" 
                                                                : "text-neutral-400 hover:text-neutral-600"
                                                        )}
                                                    >
                                                        {filter === 'all' ? 'Все' : filter}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {isLoadingNotifications ? (
                                                <div className="text-center py-20 text-neutral-400 italic text-sm">Загрузка уведомлений...</div>
                                            ) : customerNotifications?.filter((n: any) => notificationFilter === 'all' || n.channel === notificationFilter).length > 0 ? (
                                                customerNotifications
                                                    .filter((n: any) => notificationFilter === 'all' || n.channel === notificationFilter)
                                                    .map((n: any) => (
                                                    <div key={n.id} className="bg-white p-6 rounded-[2rem] border border-neutral-50 shadow-sm flex flex-col gap-4 group hover:border-neutral-200 transition-all">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-4">
                                                                <div className={cn(
                                                                    "h-10 w-10 rounded-xl flex items-center justify-center border shadow-sm transition-colors",
                                                                    n.channel === 'telegram' ? "bg-blue-50 border-blue-100 text-blue-500" : "bg-neutral-50 border-neutral-100 text-neutral-400"
                                                                )}>
                                                                    {n.channel === 'telegram' ? <span className="text-[10px] font-black italic">TG</span> : <span className="text-[10px] font-black italic">SMS</span>}
                                                                </div>
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="text-[10px] font-black text-neutral-900 uppercase tracking-widest italic">{n.type}</span>
                                                                    <span className="text-[9px] font-bold text-neutral-400 uppercase italic tracking-tighter">
                                                                        {format(new Date(n.created_at), 'd MMMM yyyy, HH:mm', { locale: ru })}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <Badge className={cn(
                                                                "text-[9px] font-black uppercase px-2.5 py-0.5 rounded-lg border shadow-none tracking-widest",
                                                                n.status === 'sent' ? "bg-blue-50 text-blue-600 border-blue-100" :
                                                                n.status === 'delivered' ? "bg-green-50 text-green-600 border-green-100" :
                                                                "bg-neutral-100 text-neutral-400 border-neutral-200"
                                                            )}>
                                                                {n.status}
                                                            </Badge>
                                                        </div>
                                                        <div className="bg-neutral-50/50 p-5 rounded-2xl border border-neutral-100/50">
                                                            <p className="text-xs text-neutral-600 font-medium leading-relaxed italic">
                                                                {n.content}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-24 text-neutral-300 italic text-sm border-2 border-dashed border-neutral-100 rounded-[2.5rem] bg-white/50">
                                                    Уведомлений не найдено
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>
                                </div>
                            </Tabs>
                        </div>

                        {/* Right Column: Stats & Notes */}
                        <div className="p-8 flex flex-col gap-8 overflow-y-auto custom-scrollbar bg-white">
                            <div className="space-y-6">
                                <h4 className="text-[11px] font-black uppercase text-neutral-400 tracking-[0.2em] px-1">Статистика</h4>
                                <div className="space-y-4">
                                    <div className="p-5 bg-emerald-50 rounded-[2rem] border border-emerald-100 flex items-center gap-5 transition-transform hover:scale-[1.02]">
                                        <div className="h-12 w-12 bg-white rounded-2xl shadow-sm border border-emerald-100 flex items-center justify-center shrink-0">
                                            <History className="h-6 w-6 text-emerald-500" />
                                        </div>
                                        <div>
                                            <div className="text-2xl font-black text-emerald-900 italic leading-none">
                                                {currentCustomer?.stats?.total_visits || 0}
                                            </div>
                                            <div className="text-[9px] font-black uppercase text-emerald-600 tracking-widest mt-1">Визитов</div>
                                        </div>
                                    </div>

                                    <div className="p-5 bg-red-50 rounded-[2rem] border border-red-100 flex items-center gap-5 transition-transform hover:scale-[1.02]">
                                        <div className="h-12 w-12 bg-white rounded-2xl shadow-sm border border-red-100 flex items-center justify-center shrink-0">
                                            <UserX className="h-6 w-6 text-red-500" />
                                        </div>
                                        <div>
                                            <div className="text-2xl font-black text-red-900 italic leading-none">
                                                {currentCustomer?.stats?.no_shows || 0}
                                            </div>
                                            <div className="text-[9px] font-black uppercase text-red-600 tracking-widest mt-1">Неявок</div>
                                        </div>
                                    </div>

                                    <div className="p-5 bg-neutral-50 rounded-[2rem] border border-neutral-100 flex flex-col gap-3">
                                        <div className="flex justify-between items-center px-1">
                                            <span className="text-[9px] font-black uppercase text-neutral-400 tracking-widest">Средний чек</span>
                                            <span className="text-sm font-black text-neutral-900 italic">
                                                {currentCustomer?.stats?.avg_check?.toLocaleString() || 0} ₽
                                            </span>
                                        </div>
                                        <div className="h-px bg-neutral-200/50 mx-1" />
                                        <div className="flex justify-between items-center px-1">
                                            <span className="text-[9px] font-black uppercase text-neutral-400 tracking-widest">Последний раз</span>
                                            <span className="text-[10px] font-bold text-neutral-500 uppercase">
                                                {currentCustomer?.last_visit ? format(new Date(currentCustomer.last_visit), 'dd.MM.yy', { locale: ru }) : '—'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-[11px] font-black uppercase text-neutral-400 tracking-[0.2em] px-1">Заметки</h4>
                                <div className="p-6 bg-neutral-50 rounded-[2rem] border border-neutral-100 min-h-[150px]">
                                    <p className="text-xs text-neutral-600 font-medium italic leading-relaxed">
                                        {currentCustomer?.notes || 'Заметки отсутствуют.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isAddCustomerOpen || isEditCustomerOpen} onOpenChange={(open) => {
                if (!open) {
                    setIsAddCustomerOpen(false);
                    setIsEditCustomerOpen(false);
                    resetForm();
                }
            }}>
                <DialogContent className="sm:max-w-[500px] rounded-[2rem] border-none shadow-2xl p-8">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tight text-neutral-900">
                            {isEditCustomerOpen ? 'Редактировать клиента' : 'Новый клиент'}
                        </DialogTitle>
                        <DialogDescription className="text-neutral-400 font-bold text-xs uppercase tracking-wider">
                            {isEditCustomerOpen ? 'Измените данные клиента' : 'Заполните информацию о клиенте'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-neutral-400 pl-1 tracking-widest">Имя</Label>
                                <Input placeholder="Имя" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="h-12 rounded-2xl border-neutral-100 bg-neutral-50/50 focus:ring-1 focus:ring-neutral-200 font-bold" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-neutral-400 pl-1 tracking-widest">Фамилия</Label>
                                <Input placeholder="Фамилия" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="h-12 rounded-2xl border-neutral-100 bg-neutral-50/50 focus:ring-1 focus:ring-neutral-200 font-bold" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-neutral-400 pl-1 tracking-widest">Телефон</Label>
                            <Input placeholder="Телефон" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="h-12 rounded-2xl border-neutral-100 bg-neutral-50/50 focus:ring-1 focus:ring-neutral-200 font-bold" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-neutral-400 pl-1 tracking-widest">Заметки</Label>
                            <textarea rows={4} placeholder="Заметки..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="flex min-h-[100px] w-full rounded-2xl border border-neutral-100 bg-neutral-50/50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-neutral-200" />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => { setIsAddCustomerOpen(false); setIsEditCustomerOpen(false); }} className="rounded-2xl font-bold h-12">Отмена</Button>
                        <Button onClick={handleSave} className="bg-neutral-900 text-white hover:bg-black px-10 rounded-2xl h-12 font-bold shadow-xl shadow-black/10">Сохранить</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
