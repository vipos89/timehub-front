'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, UserCircle, Settings, Pencil, CalendarIcon, MoreVertical } from 'lucide-react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AvatarUpload } from '@/components/avatar-upload';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function StaffPage() {
    const queryClient = useQueryClient();
    const { selectedBranchID } = useBranch();
    const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
    const [isEditEmployeeOpen, setIsEditEmployeeOpen] = useState(false);
    const [currentEmployee, setCurrentEmployee] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: '',
        position: '',
        email: '',
        phone: '',
        description: '',
        hire_date: new Date(),
        visible_in_booking: true,
        avatar_url: '',
        avatar_thumbnail_url: '',
    });

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
            resetForm();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Ошибка при добавлении сотрудника');
        },
    });

    const updateEmployeeMutation = useMutation({
        mutationFn: (data: { id: number; payload: any }) => api.put(`/employees/${data.id}`, data.payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            toast.success('Данные сотрудника обновлены');
            setIsEditEmployeeOpen(false);
            resetForm();
            setCurrentEmployee(null);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Ошибка при обновлении данных');
        },
    });

    const resetForm = () => {
        setFormData({
            name: '',
            position: '',
            email: '',
            phone: '',
            description: '',
            hire_date: new Date(),
            visible_in_booking: true,
            avatar_url: '',
            avatar_thumbnail_url: '',
        });
    };

    const handleEditClick = (emp: any) => {
        setCurrentEmployee(emp);
        setFormData({
            name: emp.name || '',
            position: emp.position || '',
            email: emp.email || '',
            phone: emp.phone || '',
            description: emp.description || '',
            hire_date: emp.hire_date ? new Date(emp.hire_date) : new Date(),
            visible_in_booking: emp.visible_in_booking !== false,
            avatar_url: emp.avatar_url || '',
            avatar_thumbnail_url: emp.avatar_thumbnail_url || '',
        });
        setIsEditEmployeeOpen(true);
    };

    const handleSave = () => {
        const payload = {
            ...formData,
            branch_id: selectedBranchID ? parseInt(selectedBranchID) : 0,
            company_id: company?.id,
        };

        if (isEditEmployeeOpen && currentEmployee) {
            updateEmployeeMutation.mutate({ id: currentEmployee.id, payload });
        } else {
            addEmployeeMutation.mutate(payload);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Персонал</h1>
                    <p className="text-neutral-500 mt-2">Управляйте вашими мастерами и их доступом.</p>
                </div>
                <Button 
                    onClick={() => { resetForm(); setIsAddEmployeeOpen(true); }}
                    className="bg-neutral-900 text-white hover:bg-neutral-800 gap-2 transition-all shadow-sm focus:ring-0"
                >
                    <Plus className="h-4 w-4" /> Добавить сотрудника
                </Button>
            </div>

            <Card className="border-neutral-200 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-neutral-50/50">
                            <TableRow className="hover:bg-transparent border-neutral-100 italic">
                                <TableHead className="px-6 py-4 text-neutral-500 font-semibold uppercase text-[10px] tracking-wider italic">Сотрудник</TableHead>
                                <TableHead className="text-neutral-500 font-semibold uppercase text-[10px] tracking-wider italic">Должность</TableHead>
                                <TableHead className="text-neutral-500 font-semibold uppercase text-[10px] tracking-wider italic">Контакты</TableHead>
                                <TableHead className="text-neutral-500 font-semibold uppercase text-[10px] tracking-wider italic">Филиал</TableHead>
                                <TableHead className="text-neutral-500 font-semibold uppercase text-[10px] tracking-wider italic">Статус</TableHead>
                                <TableHead className="text-right px-6 text-neutral-500 font-semibold uppercase text-[10px] tracking-wider italic">Действия</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {employees?.filter((e: any) => !selectedBranchID || e.branch_id.toString() === selectedBranchID).map((emp: any) => (
                                <TableRow key={emp.id} className="hover:bg-neutral-50/50 border-neutral-100 transition-colors">
                                    <TableCell className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10 border border-neutral-200 shadow-sm">
                                                <AvatarImage src={emp.avatar_thumbnail_url || emp.avatar_url} />
                                                <AvatarFallback className="bg-neutral-100 text-neutral-500 font-bold">
                                                    {emp.name.split(' ').map((n: string) => n[0]).join('')}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-neutral-900">{emp.name}</span>
                                                <span className="text-[11px] text-neutral-400">
                                                    Нанят: {emp.hire_date ? format(new Date(emp.hire_date), 'dd.MM.yyyy') : '-'}
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-neutral-600 font-medium">{emp.position || '-'}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-[11px]">
                                            <span className="text-neutral-600">{emp.phone || '-'}</span>
                                            <span className="text-neutral-400">{emp.email || '-'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="bg-neutral-100 text-neutral-700 font-medium border-neutral-200">{emp.branch?.name || '-'}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {emp.visible_in_booking ? (
                                            <Badge className="bg-green-50 text-green-700 border-green-200 font-medium">В записи</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-neutral-400 font-medium">Скрыт</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right px-6">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => handleEditClick(emp)}
                                            className="h-8 w-8 p-0 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900 transition-colors"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!employees || employees.length === 0) && !isLoadingEmployees && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-20 bg-neutral-50/30">
                                        <UserCircle className="h-10 w-10 text-neutral-200 mx-auto mb-3" />
                                        <p className="text-neutral-400 font-medium">Сотрудники еще не добавлены</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Dialog for Add/Edit */}
            <Dialog open={isAddEmployeeOpen || isEditEmployeeOpen} onOpenChange={(open) => {
                if (!open) {
                    setIsAddEmployeeOpen(false);
                    setIsEditEmployeeOpen(false);
                    resetForm();
                }
            }}>
                <DialogContent className="sm:max-w-[600px] overflow-y-auto max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold">
                            {isEditEmployeeOpen ? 'Редактировать сотрудника' : 'Новый сотрудник'}
                        </DialogTitle>
                        <DialogDescription className="text-neutral-500">
                            {isEditEmployeeOpen ? 'Измените данные мастера' : 'Заполните анкету для создания мастера'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <Label className="text-neutral-700 font-bold self-start">Аватарка</Label>
                            <AvatarUpload 
                                value={formData.avatar_url}
                                thumbnail={formData.avatar_thumbnail_url}
                                onChange={(url, thumb) => setFormData({ ...formData, avatar_url: url, avatar_thumbnail_url: thumb })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="emp-name" className="text-neutral-700 font-bold">ФИО</Label>
                                <Input 
                                    id="emp-name" 
                                    placeholder="Иванов Иван Иванович"
                                    value={formData.name} 
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                                    className="border-neutral-200 focus:ring-0" 
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="emp-pos" className="text-neutral-700 font-bold">Должность</Label>
                                <Input 
                                    id="emp-pos" 
                                    placeholder="Топ-стилист" 
                                    value={formData.position} 
                                    onChange={(e) => setFormData({ ...formData, position: e.target.value })} 
                                    className="border-neutral-200 focus:ring-0" 
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="emp-phone" className="text-neutral-700 font-bold">Телефон</Label>
                                <Input 
                                    id="emp-phone" 
                                    placeholder="+7 (999) 000-00-00"
                                    value={formData.phone} 
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                                    className="border-neutral-200 focus:ring-0" 
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="emp-email" className="text-neutral-700 font-bold">Email</Label>
                                <Input 
                                    id="emp-email" 
                                    type="email" 
                                    placeholder="example@mail.com"
                                    value={formData.email} 
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                                    className="border-neutral-200 focus:ring-0" 
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 items-center">
                            <div className="grid gap-2">
                                <Label className="text-neutral-700 font-bold">Дата приема на работу</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal border-neutral-200",
                                                !formData.hire_date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formData.hire_date ? format(formData.hire_date, "PPP", { locale: ru }) : <span>Выберите дату</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={formData.hire_date}
                                            onSelect={(date) => date && setFormData({ ...formData, hire_date: date })}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="flex items-center space-x-2 pt-6">
                                <Switch 
                                    id="visible" 
                                    checked={formData.visible_in_booking} 
                                    onCheckedChange={(checked) => setFormData({ ...formData, visible_in_booking: checked })}
                                />
                                <Label htmlFor="visible" className="text-neutral-700 font-bold">Отображать в записи</Label>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="emp-desc" className="text-neutral-700 font-bold">Описание мастера</Label>
                            <textarea 
                                id="emp-desc" 
                                rows={4}
                                placeholder="Расскажите об опыте и специализации мастера..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="flex min-h-[100px] w-full rounded-md border border-neutral-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => { setIsAddEmployeeOpen(false); setIsEditEmployeeOpen(false); }} 
                            className="border-neutral-200"
                        >
                            Отмена
                        </Button>
                        <Button
                            onClick={handleSave}
                            className="bg-neutral-900 text-white hover:bg-neutral-800 px-8"
                            disabled={addEmployeeMutation.isPending || updateEmployeeMutation.isPending || !selectedBranchID}
                        >
                            {addEmployeeMutation.isPending || updateEmployeeMutation.isPending ? 'Загрузка...' : 'Сохранить'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

