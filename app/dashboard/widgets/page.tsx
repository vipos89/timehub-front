'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { 
    Copy, 
    ExternalLink, 
    Settings, 
    Trash2, 
    Plus, 
    Globe, 
    MapPin, 
    User, 
    Calendar as CalendarIcon,
    ChevronRight,
    Check,
    Info
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { WidgetPreview } from '@/components/widgets/WidgetPreview';

export interface SavedWidget {
    id: number;
    name: string;
    description: string;
    widget_type: string;
    branch_id: number | null;
    employee_id: number | null;
    code: string;
    settings: any;
    created_at: string;
}

export default function WidgetsPage() {
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => {
        setMounted(true);
    }, []);

    const queryClient = useQueryClient();

    // Queries
    const { data: company } = useQuery({
        queryKey: ['my-company'],
        queryFn: async () => {
            const res = await api.get('/companies');
            return res.data[0] || null;
        },
    });

    const { data: savedWidgets = [], isLoading: isLoadingWidgets } = useQuery({
        queryKey: ['widgets', company?.id],
        queryFn: async () => {
            const res = await api.get(`/companies/${company.id}/widgets`);
            return res.data || [];
        },
        enabled: !!company?.id
    });

    const { data: branches } = useQuery({
        queryKey: ['branches', company?.id],
        queryFn: async () => {
            const res = await api.get(`/companies/${company.id}/branches`);
            return res.data || [];
        },
        enabled: !!company?.id
    });

    // Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
    const [modalStep, setModalStep] = useState(1);
    const [widgetType, setWidgetType] = useState<'network' | 'branch' | 'master'>('network');
    const [selectedWidget, setSelectedWidget] = useState<SavedWidget | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        branchId: '',
        masterId: '',
        stepsOrder: 'services-first',
        language: 'ru',
        mapType: 'yandex',
        accentColor: '#F5FF82',
        bgColor: '#ffffff',
        analyticsCode: '',
        buttonAnimation: true,
        buttonText: 'Записаться онлайн',
        buttonTextColor: '#000000',
        animationType: 'th-pulse',
        buttonPosition: 'bottom-right'
    });

    // Employees for master widget
    const { data: employees, isLoading: isLoadingEmployees } = useQuery({
        queryKey: ['employees', formData.branchId],
        queryFn: async () => {
            if (!formData.branchId || formData.branchId === 'all') return [];
            const res = await api.get(`/employees?branch_id=${formData.branchId}`);
            return res.data || [];
        },
        enabled: !!formData.branchId && formData.branchId !== 'all'
    });

    // Mutations
    const createWidgetMutation = useMutation({
        mutationFn: (data: any) => api.post(`/companies/${company.id}/widgets`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['widgets'] });
            toast.success('Виджет успешно создан');
            setIsCreateModalOpen(false);
            resetForm();
        },
        onError: (err: any) => toast.error(err.response?.data?.message || 'Ошибка при создании')
    });

    const updateWidgetMutation = useMutation({
        mutationFn: (data: any) => api.put(`/widgets/${selectedWidget?.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['widgets'] });
            toast.success('Настройки сохранены');
            setIsSettingsModalOpen(false);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || 'Ошибка при сохранении')
    });

    const deleteWidgetMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/widgets/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['widgets'] });
            toast.success('Виджет удален');
        }
    });

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            branchId: '',
            masterId: '',
            stepsOrder: 'services-first',
            language: 'ru',
            mapType: 'yandex',
            accentColor: '#F5FF82',
            bgColor: '#ffffff',
            analyticsCode: '',
            buttonAnimation: true,
            buttonText: 'Записаться онлайн',
            buttonTextColor: '#000000',
            animationType: 'th-pulse',
            buttonPosition: 'bottom-right'
        });
        setModalStep(1);
    };

    const handleSelectType = (type: 'network' | 'branch' | 'master') => {
        setWidgetType(type);
        setModalStep(2);
    };

    const handleOpenSettings = (widget: SavedWidget) => {
        setSelectedWidget(widget);
        const settings = typeof widget.settings === 'string' ? JSON.parse(widget.settings) : widget.settings || {};
        setFormData({
            name: widget.name,
            description: widget.description,
            branchId: widget.branch_id?.toString() || 'all',
            masterId: widget.employee_id?.toString() || '',
            language: settings.language || 'ru',
            mapType: settings.mapType || 'yandex',
            accentColor: settings.accentColor || '#F5FF82',
            bgColor: settings.bgColor || '#ffffff',
            stepsOrder: settings.stepsOrder?.join('-') === 'specialist-services-datetime' ? 'master-first' : 'services-first',
            analyticsCode: settings.analyticsCode || '',
            buttonAnimation: settings.buttonAnimation !== false,
            buttonText: settings.buttonText || 'Записаться онлайн',
            buttonTextColor: settings.buttonTextColor || '#000000',
            animationType: settings.animationType || 'th-pulse',
            buttonPosition: settings.buttonPosition || 'bottom-right'
        });
        setIsSettingsModalOpen(true);
    };

    const handleCreateLink = () => {
        const stepsOrder = formData.stepsOrder === 'master-first' 
            ? ['specialist', 'services', 'datetime'] 
            : ['services', 'specialist', 'datetime'];

        const settings = {
            language: formData.language,
            mapType: formData.mapType,
            accentColor: formData.accentColor,
            bgColor: formData.bgColor,
            stepsOrder: stepsOrder,
            analyticsCode: formData.analyticsCode,
            buttonAnimation: formData.buttonAnimation,
            buttonText: formData.buttonText,
            buttonTextColor: formData.buttonTextColor,
            animationType: formData.animationType,
            buttonPosition: formData.buttonPosition
        };

        createWidgetMutation.mutate({
            name: formData.name,
            description: formData.description,
            widget_type: widgetType,
            branch_id: formData.branchId === 'all' ? null : Number(formData.branchId),
            employee_id: formData.masterId ? Number(formData.masterId) : null,
            settings: JSON.stringify(settings)
        });
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Ссылка скопирована');
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Виджеты и ссылки</h1>
                    <p className="text-neutral-500 font-medium mt-1">Управляйте онлайн-записью для вашего сайта и соцсетей</p>
                </div>
                <Button 
                    onClick={() => { resetForm(); setIsCreateModalOpen(true); }}
                    className="bg-neutral-900 text-white h-12 px-6 rounded-2xl font-bold flex gap-2 shadow-lg shadow-neutral-200 transition-all hover:-translate-y-0.5"
                >
                    <Plus className="h-5 w-5" /> Создать ссылку
                </Button>
            </div>

            {isLoadingWidgets ? (
                <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-neutral-900" /></div>
            ) : savedWidgets.length === 0 ? (
                <div className="py-32 flex flex-col items-center justify-center bg-white rounded-[40px] border border-dashed border-neutral-200 text-center px-10">
                    <div className="h-20 w-20 bg-neutral-50 rounded-full flex items-center justify-center mb-6"><Globe className="h-10 w-10 text-neutral-300" /></div>
                    <h2 className="text-xl font-bold text-neutral-900">У вас пока нет активных ссылок</h2>
                    <p className="text-neutral-500 mt-2 max-w-sm">Создайте первую ссылку для записи, чтобы клиенты могли бронировать услуги онлайн</p>
                    <Button variant="outline" className="mt-8 rounded-xl h-11 px-8 font-bold border-neutral-200" onClick={() => setIsCreateModalOpen(true)}>Создать первую ссылку</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {savedWidgets.map((widget: SavedWidget) => (
                        <div key={widget.id} className="bg-white p-6 rounded-[32px] border border-neutral-100 shadow-sm hover:shadow-md transition-all group flex items-center justify-between gap-6">
                            <div className="flex items-center gap-5">
                                <div className="h-14 w-14 bg-neutral-50 rounded-2xl flex items-center justify-center text-neutral-900 border border-neutral-100 group-hover:bg-neutral-900 group-hover:text-white transition-all duration-300">
                                    {widget.widget_type === 'network' ? <Globe className="h-6 w-6" /> : widget.widget_type === 'branch' ? <MapPin className="h-6 w-6" /> : <User className="h-6 w-6" />}
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-black text-neutral-900 leading-none">{widget.name}</h3>
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest px-2 py-0 border-neutral-100 text-neutral-400">
                                            {widget.widget_type === 'network' ? 'Общая' : widget.widget_type === 'branch' ? 'Филиал' : 'Сотрудник'}
                                        </Badge>
                                        <span className="text-xs text-neutral-400 font-medium">Создан {new Date(widget.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 flex items-center justify-center px-4">
                                <div className="flex items-center gap-2 bg-neutral-50 px-4 py-2.5 rounded-2xl border border-neutral-100 w-full max-w-md">
                                    <code className="text-[11px] text-neutral-500 truncate flex-1 font-mono">
                                        {`${mounted ? window.location.origin : ''}/widget/${widget.code}`}
                                    </code>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white shadow-sm" onClick={() => handleCopy(`${window.location.origin}/widget/${widget.code}`)}>
                                        <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white shadow-sm" asChild>
                                        <a href={`/widget/${widget.code}`} target="_blank" rel="noreferrer">
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </a>
                                    </Button>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button variant="ghost" className="h-11 px-4 rounded-xl font-bold flex gap-2 text-neutral-600 hover:text-black hover:bg-neutral-50" onClick={() => { setSelectedWidget(widget); setIsCodeModalOpen(true); }}>
                                    <Plus className="h-4 w-4" /> Код
                                </Button>
                                <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl text-neutral-400 hover:text-black hover:bg-neutral-50" onClick={() => handleOpenSettings(widget)}>
                                    <Settings className="h-5 w-5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl text-neutral-300 hover:text-red-500 hover:bg-red-50" onClick={() => deleteWidgetMutation.mutate(widget.id)}>
                                    <Trash2 className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={(open) => { setIsCreateModalOpen(open); if (!open) setTimeout(() => setModalStep(1), 300); }}>
                <DialogContent className={`${modalStep === 2 ? 'sm:max-w-[1200px]' : 'sm:max-w-[600px]'} p-0 overflow-hidden border-none rounded-[32px] shadow-2xl transition-all duration-500`}>
                    <div className="bg-white">
                        {modalStep === 1 && (
                            <>
                                <div className="px-8 pb-4 pt-8">
                                    <DialogTitle className="text-2xl font-black text-neutral-900 tracking-tight">Новая ссылка</DialogTitle>
                                    <p className="text-neutral-500 text-sm mt-1 font-medium">Выберите формат онлайн-записи</p>
                                </div>
                                <div className="p-8 space-y-3 bg-neutral-50/50">
                                    <div onClick={() => handleSelectType('network')} className="bg-white p-5 rounded-2xl border border-neutral-100 hover:border-neutral-300 hover:shadow-md transition-all cursor-pointer group flex items-start gap-4">
                                        <div className="h-10 w-10 bg-neutral-100 rounded-full flex items-center justify-center shrink-0 group-hover:bg-neutral-900 group-hover:text-white transition-all"><Globe className="h-5 w-5" /></div>
                                        <div className="flex-1"><h3 className="font-bold text-base text-neutral-900">Общая ссылка</h3><p className="text-xs text-neutral-500 mt-1">Клиент выбирает любой филиал и специалиста</p></div>
                                        <ChevronRight className="h-5 w-5 text-neutral-300 mt-2" />
                                    </div>
                                    <div onClick={() => handleSelectType('branch')} className="bg-white p-5 rounded-2xl border border-neutral-100 hover:border-neutral-300 hover:shadow-md transition-all cursor-pointer group flex items-start gap-4">
                                        <div className="h-10 w-10 bg-neutral-100 rounded-full flex items-center justify-center shrink-0 group-hover:bg-neutral-900 group-hover:text-white transition-all"><MapPin className="h-5 w-5" /></div>
                                        <div className="flex-1"><h3 className="font-bold text-base text-neutral-900">Ссылка филиала</h3><p className="text-xs text-neutral-500 mt-1">Запись в конкретный адрес без выбора филиала</p></div>
                                        <ChevronRight className="h-5 w-5 text-neutral-300 mt-2" />
                                    </div>
                                    <div onClick={() => handleSelectType('master')} className="bg-white p-5 rounded-2xl border border-neutral-100 hover:border-neutral-300 hover:shadow-md transition-all cursor-pointer group flex items-start gap-4">
                                        <div className="h-10 w-10 bg-neutral-100 rounded-full flex items-center justify-center shrink-0 group-hover:bg-neutral-900 group-hover:text-white transition-all"><User className="h-5 w-5" /></div>
                                        <div className="flex-1"><h3 className="font-bold text-base text-neutral-900">Персональная ссылка</h3><p className="text-xs text-neutral-500 mt-1">Клиент сразу попадает в календарь конкретного мастера</p></div>
                                        <ChevronRight className="h-5 w-5 text-neutral-300 mt-2" />
                                    </div>
                                </div>
                            </>
                        )}

                        {modalStep === 2 && (
                            <div className="grid grid-cols-1 lg:grid-cols-2">
                                <div className="border-r border-neutral-100 relative">
                                    <div className="px-8 pb-4 pt-8 border-b border-neutral-100">
                                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-neutral-500 -ml-2 mb-2" onClick={() => setModalStep(1)}>← Назад</Button>
                                        <DialogTitle className="text-2xl font-black text-neutral-900 tracking-tight">Параметры ссылки</DialogTitle>
                                    </div>
                                    <div className="p-8 pb-24 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                        <div className="space-y-6">
                                            <div className="grid gap-2">
                                                <Label className="text-neutral-600 font-bold text-[11px] uppercase tracking-wider">Название</Label>
                                                <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="h-11 rounded-xl border-neutral-200" placeholder="Напр: Instagram Bio" />
                                            </div>
                                            {(widgetType === 'branch' || widgetType === 'master') && (
                                                <div className="grid gap-2">
                                                    <Label className="text-neutral-600 font-bold text-[11px] uppercase tracking-wider">Филиал</Label>
                                                    <Select value={formData.branchId} onValueChange={(v) => setFormData({...formData, branchId: v})}>
                                                        <SelectTrigger className="h-11 rounded-xl border-neutral-200"><SelectValue placeholder="Выберите филиал" /></SelectTrigger>
                                                        <SelectContent>{branches?.map((b: any) => (<SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>))}</SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-neutral-600 font-bold text-[11px] uppercase tracking-wider">Цвет кнопки</Label>
                                                    <div className="flex gap-2">
                                                        <Input type="color" value={formData.accentColor} onChange={(e) => setFormData({...formData, accentColor: e.target.value})} className="w-11 h-11 p-1 rounded-xl cursor-pointer" />
                                                        <Input value={formData.accentColor} onChange={(e) => setFormData({...formData, accentColor: e.target.value})} className="flex-1 h-11 rounded-xl" />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-neutral-600 font-bold text-[11px] uppercase tracking-wider">Текст кнопки</Label>
                                                    <Input value={formData.buttonText} onChange={(e) => setFormData({...formData, buttonText: e.target.value})} className="h-11 rounded-xl" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-neutral-100 flex justify-end gap-3">
                                        <Button variant="outline" className="h-11 px-6 rounded-xl border-neutral-200" onClick={() => setIsCreateModalOpen(false)}>Отмена</Button>
                                        <Button onClick={handleCreateLink} disabled={createWidgetMutation.isPending} className="h-11 px-8 rounded-xl bg-neutral-900 text-white font-bold">{createWidgetMutation.isPending ? 'Создание...' : 'Создать ссылку'}</Button>
                                    </div>
                                </div>
                                <div className="bg-neutral-50 p-8 flex items-center justify-center">
                                    <WidgetPreview 
                                        settings={{
                                            accentColor: formData.accentColor,
                                            buttonText: formData.buttonText,
                                            buttonTextColor: formData.buttonTextColor,
                                            buttonPosition: formData.buttonPosition,
                                            buttonAnimation: formData.buttonAnimation,
                                            animationType: formData.animationType
                                        }} 
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Settings Modal (Edit) */}
            <Dialog open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen}>
                <DialogContent className="sm:max-w-[1200px] p-0 overflow-hidden border-none rounded-[32px] shadow-2xl transition-all duration-500">
                    <div className="bg-white">
                        <div className="grid grid-cols-1 lg:grid-cols-2">
                            <div className="border-r border-neutral-100 relative">
                                <div className="px-8 pb-4 pt-8 border-b border-neutral-100">
                                    <DialogTitle className="text-2xl font-black text-neutral-900 tracking-tight">Настройки</DialogTitle>
                                    <p className="text-neutral-500 text-sm mt-1 font-medium">{selectedWidget?.name}</p>
                                </div>
                                <div className="p-8 pb-24 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                    <div className="space-y-6">
                                        <div className="grid gap-2">
                                            <Label className="text-neutral-600 font-bold text-[11px] uppercase tracking-wider">Название ссылки</Label>
                                            <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="h-11 rounded-xl border-neutral-200" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-neutral-600 font-bold text-[11px] uppercase tracking-wider">Цвет кнопки</Label>
                                                <div className="flex gap-2">
                                                    <Input type="color" value={formData.accentColor} onChange={(e) => setFormData({...formData, accentColor: e.target.value})} className="w-11 h-11 p-1 rounded-xl cursor-pointer" />
                                                    <Input value={formData.accentColor} onChange={(e) => setFormData({...formData, accentColor: e.target.value})} className="flex-1 h-11 rounded-xl" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-neutral-600 font-bold text-[11px] uppercase tracking-wider">Цвет текста</Label>
                                                <div className="flex gap-2">
                                                    <Input type="color" value={formData.buttonTextColor} onChange={(e) => setFormData({...formData, buttonTextColor: e.target.value})} className="w-11 h-11 p-1 rounded-xl cursor-pointer" />
                                                    <Input value={formData.buttonTextColor} onChange={(e) => setFormData({...formData, buttonTextColor: e.target.value})} className="flex-1 h-11 rounded-xl" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="text-neutral-600 font-bold text-[11px] uppercase tracking-wider">Текст на кнопке</Label>
                                            <Input value={formData.buttonText} onChange={(e) => setFormData({...formData, buttonText: e.target.value})} className="h-11 rounded-xl border-neutral-200" />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="text-neutral-600 font-bold text-[11px] uppercase tracking-wider">Положение</Label>
                                            <Select value={formData.buttonPosition} onValueChange={(v) => setFormData({...formData, buttonPosition: v})}>
                                                <SelectTrigger className="h-11 rounded-xl border-neutral-200"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="bottom-right">Снизу справа</SelectItem>
                                                    <SelectItem value="bottom-left">Снизу слева</SelectItem>
                                                    <SelectItem value="top-right">Сверху справа</SelectItem>
                                                    <SelectItem value="top-left">Сверху слева</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                                                <input type="checkbox" id="anim" checked={formData.buttonAnimation} onChange={(e) => setFormData({...formData, buttonAnimation: e.target.checked})} className="h-4 w-4 rounded" />
                                                <Label htmlFor="anim" className="font-bold text-sm cursor-pointer">Анимация кнопки</Label>
                                            </div>
                                            {formData.buttonAnimation && (
                                                <Select value={formData.animationType} onValueChange={(v) => setFormData({...formData, animationType: v})}>
                                                    <SelectTrigger className="h-11 rounded-xl border-neutral-200"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="th-pulse">Пульсация</SelectItem>
                                                        <SelectItem value="th-shake">Тряска</SelectItem>
                                                        <SelectItem value="th-float">Плавание</SelectItem>
                                                        <SelectItem value="th-glow">Свечение</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-neutral-100 flex justify-end gap-3">
                                    <Button variant="outline" className="h-11 px-6 rounded-xl border-neutral-200" onClick={() => setIsSettingsModalOpen(false)}>Отмена</Button>
                                    <Button 
                                        onClick={() => {
                                            const stepsOrder = formData.stepsOrder === 'master-first' ? ['specialist', 'services', 'datetime'] : ['services', 'specialist', 'datetime'];
                                            updateWidgetMutation.mutate({
                                                name: formData.name,
                                                description: formData.description,
                                                widget_type: selectedWidget?.widget_type,
                                                branch_id: formData.branchId === 'all' ? null : Number(formData.branchId),
                                                employee_id: formData.masterId ? Number(formData.masterId) : null,
                                                settings: JSON.stringify({ ...JSON.parse(selectedWidget?.settings || '{}'), accentColor: formData.accentColor, buttonText: formData.buttonText, buttonTextColor: formData.buttonTextColor, buttonPosition: formData.buttonPosition, buttonAnimation: formData.buttonAnimation, animationType: formData.animationType, stepsOrder })
                                            });
                                        }} 
                                        disabled={updateWidgetMutation.isPending} 
                                        className="h-11 px-8 rounded-xl bg-neutral-900 text-white font-bold"
                                    >
                                        Сохранить
                                    </Button>
                                </div>
                            </div>
                            <div className="bg-neutral-50 p-8 flex items-center justify-center">
                                <WidgetPreview settings={formData} />
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Code Modal */}
            <Dialog open={isCodeModalOpen} onOpenChange={setIsCodeModalOpen}>
                <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none rounded-[32px] shadow-2xl">
                    <div className="bg-white">
                        <div className="px-8 pb-4 pt-8 border-b border-neutral-100">
                            <DialogTitle className="text-2xl font-black text-neutral-900 tracking-tight">Код для вставки</DialogTitle>
                            <p className="text-neutral-500 text-sm mt-1 font-medium">Установите виджет на ваш сайт</p>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="relative group">
                                <pre className="bg-neutral-900 text-neutral-100 p-6 rounded-2xl text-[11px] overflow-x-auto font-mono leading-relaxed">
                                    {`<script \n  type="text/javascript" \n  src="${mounted ? window.location.origin : ''}/widget.js?id=${selectedWidget?.code}" \n  charset="UTF-8">\n</script>`}
                                </pre>
                                <Button variant="ghost" size="sm" className="absolute top-4 right-4 text-white/50 hover:text-white" onClick={() => { handleCopy(`<script type="text/javascript" src="${window.location.origin}/widget.js?id=${selectedWidget?.code}" charset="UTF-8"></script>`); }}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-start gap-4">
                                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-neutral-100 shrink-0 text-neutral-400"><Info className="h-5 w-5" /></div>
                                <div className="space-y-1"><h4 className="font-bold text-sm text-neutral-900">Инструкция</h4><p className="text-xs text-neutral-500 leading-relaxed">Просто скопируйте этот код и вставьте его перед закрывающим тегом <code>{`</body>`}</code> на любой странице вашего сайта.</p></div>
                            </div>
                        </div>
                        <div className="p-6 bg-neutral-50 border-t border-neutral-100 flex justify-end"><Button onClick={() => setIsCodeModalOpen(false)} className="rounded-xl font-bold bg-neutral-900 text-white h-11 px-8">Закрыть</Button></div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
