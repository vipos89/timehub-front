'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, UserCircle, Settings, Building2 } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { api } from '@/lib/api';

export default function StaffPage() {
    const queryClient = useQueryClient();
    const { selectedBranchID } = useBranch();
    const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
    const [newEmployee, setNewEmployee] = useState({ name: '', position: '', email: '' });

    // Queries
    const { data: company } = useQuery({
        queryKey: ['my-company'],
        queryFn: async () => {
            const res = await api.get('/companies');
            return res.data[0] || null;
        },
    });

    const { data: employees, isLoading: isLoadingEmployees } = useQuery({
        queryKey: ['employees', company?.id],
        queryFn: async () => {
            const res = await api.get(`/employees?company_id=${company?.id}`);
            return res.data;
        },
        enabled: !!company?.id,
    });

    // Mutations
    const addEmployeeMutation = useMutation({
        mutationFn: (data: any) => api.post(`/employees`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            toast.success('Сотрудник успешно добавлен');
            setIsAddEmployeeOpen(false);
            setNewEmployee({ name: '', position: '', email: '' });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Ошибка при добавлении сотрудника');
        },
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Персонал</h1>
                    <p className="text-neutral-500 mt-2">Управляйте вашими мастерами и их доступом.</p>
                </div>
                <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-neutral-900 text-white hover:bg-neutral-800 gap-2 transition-all shadow-sm focus:ring-0">
                            <Plus className="h-4 w-4" /> Добавить сотрудника
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold">Новый сотрудник</DialogTitle>
                            <DialogDescription className="text-neutral-500">Заполните анкету для создания мастера в текущем филиале</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="emp-name" className="text-neutral-700">ФИО</Label>
                                <Input id="emp-name" value={newEmployee.name} onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })} className="border-neutral-300 focus:ring-neutral-500" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="emp-email" className="text-neutral-700">Email (для входа)</Label>
                                <Input id="emp-email" type="email" value={newEmployee.email} onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })} className="border-neutral-300 focus:ring-neutral-500" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="emp-pos" className="text-neutral-700">Должность</Label>
                                <Input id="emp-pos" placeholder="Напр. Топ-стилист" value={newEmployee.position} onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })} className="border-neutral-300 focus:ring-neutral-500" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddEmployeeOpen(false)} className="border-neutral-200">Отмена</Button>
                            <Button
                                onClick={() =>
                                    addEmployeeMutation.mutate({
                                        ...newEmployee,
                                        branch_id: selectedBranchID ? parseInt(selectedBranchID) : 0,
                                        company_id: company?.id,
                                    })
                                }
                                className="bg-neutral-900 text-white hover:bg-neutral-800"
                                disabled={addEmployeeMutation.isPending || !selectedBranchID}
                            >
                                {addEmployeeMutation.isPending ? 'Загрузка...' : 'Добавить'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="border-neutral-200 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-neutral-50">
                            <TableRow className="hover:bg-transparent border-neutral-100">
                                <TableHead className="px-6 py-4 text-neutral-500 font-semibold uppercase text-[10px] tracking-wider">Сотрудник</TableHead>
                                <TableHead className="text-neutral-500 font-semibold uppercase text-[10px] tracking-wider">Должность</TableHead>
                                <TableHead className="text-neutral-500 font-semibold uppercase text-[10px] tracking-wider">Филиал</TableHead>
                                <TableHead className="text-neutral-500 font-semibold uppercase text-[10px] tracking-wider">Услуги</TableHead>
                                <TableHead className="text-right px-6 text-neutral-500 font-semibold uppercase text-[10px] tracking-wider">Действия</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {employees?.filter((e: any) => !selectedBranchID || e.branch_id.toString() === selectedBranchID).map((emp: any) => (
                                <TableRow key={emp.id} className="hover:bg-neutral-50 border-neutral-100 transition-colors">
                                    <TableCell className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9 border border-neutral-200">
                                                <AvatarImage src={emp.avatar_url} />
                                                <AvatarFallback className="bg-neutral-100 text-neutral-500 font-bold">
                                                    {emp.name.split(' ').map((n: string) => n[0]).join('')}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-neutral-900">{emp.name}</span>
                                                <span className="text-xs text-neutral-400">{emp.email || 'Нет email'}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-neutral-600 font-medium">{emp.position || '-'}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="bg-neutral-100 text-neutral-700 font-medium">{emp.branch?.name || '-'}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {emp.services?.length > 0 ? (
                                                emp.services.map((s: any) => (
                                                    <Badge key={s.service_id} variant="outline" className="text-[10px] py-0 px-1.5 border-neutral-200">
                                                        {s.service?.name}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-xs text-neutral-400 italic">Не назначены</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right px-6">
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-white text-neutral-400 hover:text-neutral-900 transition-colors">
                                            <Settings className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!employees || employees.length === 0) && !isLoadingEmployees && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-20 bg-neutral-50/30">
                                        <UserCircle className="h-10 w-10 text-neutral-200 mx-auto mb-3" />
                                        <p className="text-neutral-400 font-medium">Сотрудники еще не добавлены</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
