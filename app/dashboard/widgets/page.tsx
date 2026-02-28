'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { 
    Copy, 
    ExternalLink, 
    Settings, 
    Trash2, 
    Image as ImageIcon,
    MessageCircle,
    Globe,
    Megaphone,
    MapPin,
    Smartphone,
    Plane,
    CreditCard,
    Briefcase,
    Bell,
    Clock,
    History,
    User,
    Info,
    Star,
    ChevronRight,
    Calendar
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export interface SavedWidget {
    id: number;
    name: string;
    description: string;
    widget_type: 'network' | 'branch' | 'master';
    code: string;
    branch_id: number | null;
    employee_id: number | null;
    settings: any;
    created_at: string;
}

export default function WidgetsPage() {
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => {
        setMounted(true);
    }, []);

    // Current user context (mocked for now, should come from auth provider)
    const [company] = useState({ id: 1, name: 'Main Company' });

    // Queries for API
    const { data: savedWidgets = [], isLoading: isLoadingWidgets, refetch: refetchWidgets } = useQuery({
        queryKey: ['widgets', company.id],
        queryFn: async () => {
            const res = await api.get(`/companies/${company.id}/widgets`);
            return res.data || [];
        },
        enabled: !!company.id
    });

    const { data: branches, isLoading: isLoadingBranches } = useQuery({
        queryKey: ['branches', company.id],
        queryFn: async () => {
            if (!company?.id) return [];
            const res = await api.get(`/companies/${company.id}/branches`);
            return res.data || [];
        },
        enabled: !!company.id
    });

    // Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
    const [selectedWidget, setSelectedWidget] = useState<SavedWidget | null>(null);
    const [modalStep, setModalStep] = useState(1);
    
    // ... rest of state ...

    const handleOpenCode = (widget: SavedWidget) => {
        setSelectedWidget(widget);
        setIsCodeModalOpen(true);
    };
    
    // Form State
    const [widgetType, setWidgetType] = useState<'network' | 'branch' | 'master'>('network');
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        branchId: 'all',
        masterId: '',
        language: 'ru',
        mapType: 'yandex',
        accentColor: '#F5FF82',
        bgColor: '#ffffff',
        stepsOrder: 'services-first', // 'services-first' or 'master-first'
        analyticsCode: '',
        buttonAnimation: true,
        buttonText: 'Записаться онлайн',
        buttonTextColor: '#000000',
        animationType: 'th-pulse', // 'th-pulse', 'th-shake', 'th-float', 'th-glow'
        buttonPosition: 'bottom-right'
    });

    // Query employees when a branch is selected (for master widget)
    const { data: employees, isLoading: isLoadingEmployees } = useQuery({
        queryKey: ['employees', formData.branchId],
        queryFn: async () => {
            if (!company?.id || !formData.branchId || formData.branchId === 'all') return [];
            const res = await api.get(`/employees?company_id=${company.id}&branch_id=${formData.branchId}`);
            return res.data || [];
        },
        enabled: !!company?.id && !!formData.branchId && formData.branchId !== 'all' && widgetType === 'master',
    });

    // Auto-select first branch/master if available
    useEffect(() => {
        if (branches?.length === 1 && formData.branchId === 'all') {
            setFormData(prev => ({ ...prev, branchId: branches[0].id.toString() }));
        }
    }, [branches, formData.branchId]);

    // Handlers
    const handleCopy = (url: string) => {
        navigator.clipboard.writeText(url);
        toast.success('Ссылка скопирована в буфер обмена');
    };

    const handleSelectType = (type: 'network' | 'branch' | 'master') => {
        setWidgetType(type);
        setModalStep(2);
        // Reset form specific fields
        setFormData(prev => ({ ...prev, branchId: 'all', masterId: '' }));
    };

    const createWidgetMutation = useMutation({
        mutationFn: (data: any) => api.post(`/companies/${company.id}/widgets`, data),
        onSuccess: () => {
            toast.success('Ссылка успешно создана');
            refetchWidgets();
            setIsCreateModalOpen(false);
            setModalStep(1);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Ошибка при создании виджета');
        }
    });

    const updateWidgetMutation = useMutation({
        mutationFn: (data: any) => api.put(`/widgets/${selectedWidget?.id}`, data),
        onSuccess: () => {
            toast.success('Настройки сохранены');
            refetchWidgets();
            setIsSettingsModalOpen(false);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Ошибка при сохранении');
        }
    });

    const deleteWidgetMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/widgets/${id}`),
        onSuccess: () => {
            toast.success('Ссылка удалена');
            refetchWidgets();
        },
        onError: () => {
            toast.error('Ошибка при удалении');
        }
    });

    const handleOpenSettings = (widget: SavedWidget) => {
        setSelectedWidget(widget);
        const settings = typeof widget.settings === 'string' ? JSON.parse(widget.settings) : widget.settings || {};
        
        setWidgetType(widget.widget_type);
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
            buttonTextColor: settings.buttonTextColor || '#111827',
            animationType: settings.animationType || 'th-pulse',
            buttonPosition: settings.buttonPosition || 'bottom-right'
        });
        setIsSettingsModalOpen(true);
    };

    const handleCreateLink = () => {
        if (!formData.name.trim()) {
            toast.error('Пожалуйста, введите название ссылки');
            return;
        }

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

        const payload = {
            name: formData.name,
            description: formData.description,
            widget_type: widgetType,
            branch_id: formData.branchId === 'all' ? null : Number(formData.branchId),
            employee_id: formData.masterId ? Number(formData.masterId) : null,
            settings: JSON.stringify(settings)
        };

        createWidgetMutation.mutate(payload);
    };

    const handleDelete = (id: number) => {
        if (confirm('Вы уверены, что хотите удалить эту ссылку? Она перестанет работать везде, где была размещена.')) {
            deleteWidgetMutation.mutate(id);
        }
    };

    return (
        <div className="p-8 max-w-[1200px] mx-auto space-y-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 to-neutral-500">Виджеты</h1>
                    <p className="text-neutral-500 mt-2 text-sm">Управляйте вашими ссылками для онлайн-записи и виджетами</p>
                </div>
                <Button 
                    className="h-11 px-6 rounded-xl shadow-md transition-all hover:-translate-y-0.5"
                    style={{ backgroundColor: '#F5FF82', color: '#000' }}
                    onClick={() => {
                        setModalStep(1);
                        setIsCreateModalOpen(true);
                    }}
                >
                    <span className="font-semibold">Новая ссылка</span>
                </Button>
            </div>

            {/* List Section */}
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white/50 backdrop-blur-sm">
                <CardHeader className="bg-white px-6 py-5 border-b border-neutral-100">
                    <CardTitle className="text-lg">Ссылки для онлайн-записи</CardTitle>
                    <CardDescription>Ссылки, которые вы можете разместить в Instagram, Telegram или отправить клиенту</CardDescription>
                </CardHeader>
                <CardContent className="p-0 bg-white">
                    {savedWidgets.length === 0 && !isLoadingWidgets ? (
                        <div className="text-center py-20 bg-neutral-50/50">
                            <div className="h-16 w-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ExternalLink className="h-8 w-8 text-neutral-300" />
                            </div>
                            <h3 className="text-lg font-bold text-neutral-900 mb-2">У вас пока нет ссылок</h3>
                            <p className="text-neutral-500 text-sm max-w-sm mx-auto mb-6">Создайте свою первую ссылку для онлайн-записи, чтобы начать получать клиентов через социальные сети.</p>
                            <Button 
                                className="h-10 px-6 rounded-xl"
                                style={{ backgroundColor: '#F5FF82', color: '#000' }}
                                onClick={() => {
                                    setModalStep(1);
                                    setIsCreateModalOpen(true);
                                }}
                            >
                                <span className="font-semibold">Создать ссылку</span>
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-neutral-100 bg-neutral-50/50 text-xs uppercase tracking-widest text-neutral-400">
                                        <th className="font-semibold p-4 rounded-tl-xl w-1/4">Название</th>
                                        <th className="font-semibold p-4 w-1/6">Тип</th>
                                        <th className="font-semibold p-4 w-1/4">Ссылка</th>
                                        <th className="font-semibold p-4 w-1/6">Создана</th>
                                        <th className="font-semibold p-4 w-1/6 text-right rounded-tr-xl">Действия</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoadingWidgets ? (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-neutral-400">Загрузка...</td>
                                        </tr>
                                    ) : (
                                        savedWidgets.map((widget: SavedWidget) => (
                                            <tr key={widget.id} className="border-b border-neutral-100 hover:bg-neutral-50/50">
                                                <td className="p-4 align-top">
                                                    <p className="font-bold text-sm">{widget.name}</p>
                                                    {widget.description && <p className="text-xs text-neutral-500 mt-1">{widget.description}</p>}
                                                </td>
                                                <td className="p-4 align-top">
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase ${
                                                        widget.widget_type === 'network' ? 'bg-neutral-100 text-neutral-600' :
                                                        widget.widget_type === 'branch' ? 'bg-blue-50 text-blue-600' :
                                                        'bg-amber-50 text-amber-600'
                                                    }`}>
                                                        {widget.widget_type === 'network' ? 'Сеть' : widget.widget_type === 'branch' ? 'Филиал' : 'Сотрудник'}
                                                    </span>
                                                </td>
                                                <td className="p-4 align-top">
                                                    <div className="flex items-center gap-2">
                                                        <code className="text-xs bg-neutral-100 px-2 py-1 rounded-md text-neutral-600 max-w-[200px] truncate">
                                                            {`${mounted ? window.location.origin : ''}/widget/${widget.code}`}
                                                        </code>
                                                        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleCopy(`${window.location.origin}/widget/${widget.code}`)}>
                                                            <Copy className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
                                                            <a href={`/widget/${widget.code}`} target="_blank" rel="noreferrer">
                                                                <ExternalLink className="h-3.5 w-3.5" />
                                                            </a>
                                                        </Button>
                                                    </div>
                                                </td>
                                                <td className="p-4 align-top text-neutral-400 text-xs">
                                                    {new Date(widget.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                </td>
                                                <td className="p-4 align-top text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button variant="ghost" size="sm" className="h-8 text-neutral-500 hover:text-neutral-900" onClick={() => handleOpenCode(widget)}>
                                                            <Globe className="h-4 w-4 mr-2" /> Код
                                                        </Button>
                                                        <Button variant="ghost" size="sm" className="h-8 text-neutral-500 hover:text-neutral-900" onClick={() => handleOpenSettings(widget)}>
                                                            <Settings className="h-4 w-4 mr-2" /> Настроить
                                                        </Button>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(widget.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Empty UI Layout - Same as before */}
            <div className="mt-12 space-y-6">
                <h2 className="text-xl font-bold px-1">Расширенные настройки онлайн-записи</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Placeholder Marketing Sections */}
                    <Card className="border-none shadow-sm rounded-2xl overflow-hidden opacity-70 pointer-events-none">
                        <CardHeader className="bg-white/50 border-b border-neutral-100">
                            <CardTitle className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Информация о компании</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-neutral-100">
                                <div className="p-4 flex gap-4 hover:bg-neutral-50/50 transition-colors">
                                    <div className="mt-1"><ImageIcon className="h-5 w-5 text-neutral-400" /></div>
                                    <div>
                                        <p className="font-bold text-sm">Добавьте логотип и фото обложки</p>
                                        <p className="text-xs text-neutral-500 mt-1">Это персонализирует страницу и повысит доверие к бренду</p>
                                    </div>
                                </div>
                                <div className="p-4 flex gap-4 hover:bg-neutral-50/50 transition-colors">
                                    <div className="mt-1"><MessageCircle className="h-5 w-5 text-neutral-400" /></div>
                                    <div>
                                        <p className="font-bold text-sm">Укажите ссылки на соцсети (Instagram, VK)</p>
                                        <p className="text-xs text-neutral-500 mt-1">Это поможет привлечь новых подписчиков и общаться с клиентами в мессенджерах</p>
                                    </div>
                                </div>
                                <div className="p-4 flex gap-4 hover:bg-neutral-50/50 transition-colors">
                                    <div className="mt-1"><Globe className="h-5 w-5 text-neutral-400" /></div>
                                    <div>
                                        <p className="font-bold text-sm">Создайте сайт на Tilda с помощью AI</p>
                                        <p className="text-xs text-neutral-500 mt-1">Добавьте кнопку "Записаться онлайн"</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-dashed border-neutral-200 bg-neutral-50/50 shadow-none rounded-2xl flex items-center justify-center min-h-[250px] opacity-70">
                        <p className="text-sm font-medium text-neutral-400">Иллюстрация дизайна</p>
                    </Card>
                </div>
            </div>

            {/* Creation Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={(open) => {
                setIsCreateModalOpen(open);
                if (!open) {
                    setTimeout(() => setModalStep(1), 300);
                }
            }}>
                <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none rounded-3xl shadow-2xl">
                    <div className="bg-white">
                        {modalStep === 1 && (
                            <>
                                <div className="px-8 pb-4 pt-8">
                                    <DialogTitle className="text-2xl font-bold text-neutral-900 leading-tight">Вы здесь, чтобы создать</DialogTitle>
                                    <p className="text-neutral-500 text-sm mt-2">Выберите тип виджета для продолжения</p>
                                </div>
                                <div className="p-8 space-y-3 bg-neutral-50/50">
                                    <div 
                                        onClick={() => handleSelectType('network')}
                                        className="bg-white p-5 rounded-2xl border border-neutral-100 hover:border-neutral-300 hover:shadow-md transition-all cursor-pointer group flex items-start gap-4"
                                    >
                                        <div className="h-10 w-10 bg-neutral-100 rounded-full flex items-center justify-center shrink-0 group-hover:bg-neutral-200 transition-colors">
                                            <Globe className="h-5 w-5 text-neutral-600" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-base text-neutral-900 group-hover:text-black">Общую ссылку</h3>
                                            <p className="text-xs text-neutral-500 mt-1">Клиенты смогут выбрать любой филиал и любого сотрудника.</p>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-neutral-300 mt-2" />
                                    </div>
                                    
                                    <div 
                                        onClick={() => handleSelectType('branch')}
                                        className="bg-white p-5 rounded-2xl border border-neutral-100 hover:border-neutral-300 hover:shadow-md transition-all cursor-pointer group flex items-start gap-4"
                                    >
                                        <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                                            <MapPin className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-base text-neutral-900 group-hover:text-black">Ссылку для филиала</h3>
                                            <p className="text-xs text-neutral-500 mt-1">Ссылка жестко привязанная к одному конкретному филиалу.</p>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-neutral-300 mt-2" />
                                    </div>

                                    <div 
                                        onClick={() => handleSelectType('master')}
                                        className="bg-white p-5 rounded-2xl border border-neutral-100 hover:border-neutral-300 hover:shadow-md transition-all cursor-pointer group flex items-start gap-4"
                                    >
                                        <div className="h-10 w-10 bg-amber-50 rounded-full flex items-center justify-center shrink-0 group-hover:bg-amber-100 transition-colors">
                                            <User className="h-5 w-5 text-amber-600" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-base text-neutral-900 group-hover:text-black">Ссылку для сотрудника</h3>
                                            <p className="text-xs text-neutral-500 mt-1">Сразу показывает расписание и услуги выбранного мастера.</p>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-neutral-300 mt-2" />
                                    </div>

                                    {/* Mock visually disabled step */}
                                    <div className="bg-white p-5 rounded-2xl border border-neutral-100 opacity-60 flex items-start gap-4 relative overflow-hidden">
                                        <div className="h-10 w-10 bg-neutral-100 rounded-full flex items-center justify-center shrink-0">
                                            <Calendar className="h-5 w-5 text-neutral-400" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-base text-neutral-600">Расписание на неделю</h3>
                                                <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 hover:bg-emerald-50 border-emerald-200">New</Badge>
                                            </div>
                                            <p className="text-xs text-neutral-500 mt-1">Сетка расписания для размещения на сайте (скоро).</p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {modalStep === 2 && (
                            <>
                                <div className="px-8 pb-4 pt-8 border-b border-neutral-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-neutral-500 -ml-2" onClick={() => setModalStep(1)}>
                                            ← Назад
                                        </Button>
                                    </div>
                                    <DialogTitle className="text-2xl font-bold text-neutral-900 leading-tight">
                                        {widgetType === 'network' ? 'Новая общая ссылка' : widgetType === 'branch' ? 'Новая ссылка филиала' : 'Новая ссылка для сотрудника'}
                                    </DialogTitle>
                                    <p className="text-neutral-500 text-sm mt-2">
                                        {widgetType === 'network' ? 'Клиенты смогут выбрать любой филиал и специалиста' :
                                         widgetType === 'branch' ? 'Клиентам не нужно будет выбирать филиал' : 
                                         'Клиенты попадут сразу на профиль этого сотрудника'}
                                    </p>
                                </div>

                                <div className="p-8 pb-20 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                    <div className="space-y-6">
                                        <div className="grid gap-2">
                                            <Label htmlFor="linkName" className="text-neutral-600 font-normal">Название ссылки</Label>
                                            <Input 
                                                id="linkName" 
                                                value={formData.name}
                                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                                className="border-neutral-200 shadow-sm h-11 text-[15px] rounded-xl focus-visible:ring-1 focus-visible:ring-neutral-300"
                                                placeholder={widgetType === 'network' ? 'Основная запись' : widgetType === 'branch' ? 'Запись в филиал' : 'Запись к мастеру'} 
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="linkDesc" className="text-neutral-600 font-normal">Описание (опционально)</Label>
                                            <Textarea 
                                                id="linkDesc" 
                                                value={formData.description}
                                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                                className="border-neutral-200 shadow-sm min-h-[80px] text-[15px] rounded-xl resize-none focus-visible:ring-1 focus-visible:ring-neutral-300"
                                                placeholder="Например, для профиля Instagram" 
                                            />
                                        </div>

                                        {(widgetType === 'branch' || widgetType === 'master') && (
                                            <div className="p-5 bg-neutral-50/50 rounded-2xl border border-neutral-100 space-y-4">
                                                <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest leading-none mb-1">Привязка</h3>
                                                
                                                <div className="grid gap-2">
                                                    <Label className="text-neutral-600 font-normal">Филиал</Label>
                                                    <Select value={formData.branchId || 'all'} onValueChange={(v) => setFormData({...formData, branchId: v, masterId: ''})}>
                                                        <SelectTrigger className="border-neutral-200 bg-white shadow-sm h-11 text-[15px] rounded-xl">
                                                            <SelectValue placeholder="Выберите филиал" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {widgetType !== 'branch' && <SelectItem value="all">Не выбрано (На всю сеть)</SelectItem>}
                                                            {branches?.map((branch: any) => (
                                                                <SelectItem key={branch.id} value={branch.id.toString()}>
                                                                    {branch.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {widgetType === 'master' && (
                                                    <div className="grid gap-2 mt-4">
                                                        <Label className="text-neutral-600 font-normal">Сотрудник</Label>
                                                        <Select 
                                                            value={formData.masterId} 
                                                            onValueChange={(v) => setFormData({...formData, masterId: v})}
                                                            disabled={!formData.branchId || formData.branchId === 'all' || isLoadingEmployees}
                                                        >
                                                            <SelectTrigger className="border-neutral-200 bg-white shadow-sm h-11 text-[15px] rounded-xl">
                                                                <SelectValue placeholder={(!formData.branchId || formData.branchId === 'all') ? "Сначала выберите филиал" : (isLoadingEmployees ? "Загрузка..." : "Выберите сотрудника")} />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {employees?.length === 0 && !isLoadingEmployees ? (
                                                                    <SelectItem value="empty" disabled>Нет сотрудников в этом филиале</SelectItem>
                                                                ) : (
                                                                    employees?.map((emp: any) => (
                                                                        <SelectItem key={emp.id} value={emp.id.toString()}>
                                                                            {emp.name} {emp.position ? `(${emp.position})` : ''}
                                                                        </SelectItem>
                                                                    ))
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                        {(!formData.branchId || formData.branchId === 'all') && (
                                                            <p className="text-[11px] text-amber-600 mt-1">Для выбора мастера необходимо указать филиал.</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="space-y-4 pt-2">
                                            <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest leading-none mb-1">Порядок записи</h3>
                                            
                                            <div className="grid gap-2">
                                                <Label className="text-neutral-600 font-normal">Что клиент выбирает первым?</Label>
                                                <Select value={formData.stepsOrder} onValueChange={(v) => setFormData({...formData, stepsOrder: v})}>
                                                    <SelectTrigger className="border-neutral-200 shadow-sm h-11 text-[15px] rounded-xl">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="services-first">Сначала услугу, затем мастера</SelectItem>
                                                        <SelectItem value="master-first">Сначала мастера, затем услугу</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-2">
                                            <div className="space-y-2">
                                                <Label className="text-neutral-600 font-normal">Акцентный цвет</Label>
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="color" 
                                                        value={formData.accentColor} 
                                                        onChange={(e) => setFormData({...formData, accentColor: e.target.value})}
                                                        className="w-11 h-11 p-1 rounded-xl border border-neutral-200 cursor-pointer bg-white"
                                                    />
                                                    <Input 
                                                        value={formData.accentColor} 
                                                        onChange={(e) => setFormData({...formData, accentColor: e.target.value})}
                                                        className="flex-1 h-11 rounded-xl border-neutral-200"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-neutral-600 font-normal">Цвет фона</Label>
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="color" 
                                                        value={formData.bgColor} 
                                                        onChange={(e) => setFormData({...formData, bgColor: e.target.value})}
                                                        className="w-11 h-11 p-1 rounded-xl border border-neutral-200 cursor-pointer bg-white"
                                                    />
                                                    <Input 
                                                        value={formData.bgColor} 
                                                        onChange={(e) => setFormData({...formData, bgColor: e.target.value})}
                                                        className="flex-1 h-11 rounded-xl border-neutral-200"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-2">
                                            <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest leading-none mb-1">Эффекты и кнопка</h3>
                                            
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="grid gap-2">
                                                    <Label className="text-neutral-600 font-normal">Текст плавающей кнопки</Label>
                                                    <Input 
                                                        value={formData.buttonText}
                                                        onChange={(e) => setFormData({...formData, buttonText: e.target.value})}
                                                        className="border-neutral-200 h-11 rounded-xl"
                                                        placeholder="Записаться онлайн" 
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-neutral-600 font-normal">Цвет текста кнопки</Label>
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="color" 
                                                            value={formData.buttonTextColor} 
                                                            onChange={(e) => setFormData({...formData, buttonTextColor: e.target.value})}
                                                            className="w-11 h-11 p-1 rounded-xl border border-neutral-200 cursor-pointer bg-white"
                                                        />
                                                        <Input 
                                                            value={formData.buttonTextColor} 
                                                            onChange={(e) => setFormData({...formData, buttonTextColor: e.target.value})}
                                                            className="flex-1 h-11 rounded-xl border-neutral-200"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid gap-2">
                                                <Label className="text-neutral-600 font-normal">Положение кнопки</Label>
                                                <Select value={formData.buttonPosition} onValueChange={(v) => setFormData({...formData, buttonPosition: v})}>
                                                    <SelectTrigger className="border-neutral-200 h-11 rounded-xl">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="bottom-right">Снизу справа</SelectItem>
                                                        <SelectItem value="bottom-left">Снизу слева</SelectItem>
                                                        <SelectItem value="top-right">Сверху справа</SelectItem>
                                                        <SelectItem value="top-left">Сверху слева</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="flex items-center space-x-2 p-4 bg-neutral-50/50 rounded-2xl border border-neutral-100">
                                                <input 
                                                    type="checkbox" 
                                                    id="buttonAnimation" 
                                                    checked={formData.buttonAnimation}
                                                    onChange={(e) => setFormData({...formData, buttonAnimation: e.target.checked})}
                                                    className="h-4 w-4 rounded border-neutral-300 text-black focus:ring-black"
                                                />
                                                <Label htmlFor="buttonAnimation" className="text-sm font-medium leading-none cursor-pointer">
                                                    Анимировать кнопку записи
                                                </Label>
                                            </div>

                                            {formData.buttonAnimation && (
                                                <div className="grid gap-2">
                                                    <Label className="text-neutral-600 font-normal text-xs uppercase tracking-wider">Тип анимации</Label>
                                                    <Select value={formData.animationType} onValueChange={(v) => setFormData({...formData, animationType: v})}>
                                                        <SelectTrigger className="border-neutral-200 h-11 rounded-xl">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="th-pulse">Пульсация</SelectItem>
                                                            <SelectItem value="th-shake">Тряска</SelectItem>
                                                            <SelectItem value="th-float">Плавание</SelectItem>
                                                            <SelectItem value="th-glow">Свечение</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-4 pt-2">
                                            <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest leading-none mb-1">Скрипты и аналитика</h3>
                                            
                                            <div className="grid gap-2">
                                                <Label className="text-neutral-600 font-normal">JS-код (Метрика, Аналитика, Пиксель)</Label>
                                                <Textarea 
                                                    value={formData.analyticsCode}
                                                    onChange={(e) => setFormData({...formData, analyticsCode: e.target.value})}
                                                    className="border-neutral-200 shadow-sm min-h-[80px] text-xs font-mono rounded-xl resize-none"
                                                    placeholder="<script>... analytics code ...</script>" 
                                                />
                                                <p className="text-[10px] text-neutral-400">Код будет выполнен при загрузке виджета.</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-2 pb-4">
                                            <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest leading-none mb-1">Дополнительно</h3>
                                            
                                            <div className="grid gap-2">
                                                <Label className="text-neutral-600 font-normal">Язык онлайн-записи по умолчанию</Label>
                                                <Select value={formData.language} onValueChange={(v) => setFormData({...formData, language: v})}>
                                                    <SelectTrigger className="border-neutral-200 shadow-sm h-11 text-[15px] rounded-xl max-w-[200px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="ru">Русский</SelectItem>
                                                        <SelectItem value="en">English</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="grid gap-2">
                                                <Label className="text-neutral-600 font-normal">Тип карты</Label>
                                                <Select value={formData.mapType} onValueChange={(v) => setFormData({...formData, mapType: v})}>
                                                    <SelectTrigger className="border-neutral-200 shadow-sm h-11 text-[15px] rounded-xl max-w-[200px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="yandex">Яндекс</SelectItem>
                                                        <SelectItem value="google">Google</SelectItem>
                                                        <SelectItem value="2gis">2ГИС</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-neutral-100 flex justify-end gap-3 z-10">
                                    <Button variant="outline" className="h-11 px-6 rounded-xl border-neutral-200 shadow-sm" onClick={() => setIsCreateModalOpen(false)}>
                                        Отмена
                                    </Button>
                                    <Button 
                                        className="h-11 px-8 rounded-xl shadow-md transition-all hover:-translate-y-0.5"
                                        style={{ backgroundColor: '#F5FF82', color: '#000' }}
                                        onClick={handleCreateLink}
                                        disabled={createWidgetMutation.isPending || (widgetType === 'master' && !formData.masterId)}
                                    >
                                        {createWidgetMutation.isPending ? 'Создание...' : 'Создать'}
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Settings Modal (Edit) */}
            <Dialog open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen}>
                <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none rounded-3xl shadow-2xl">
                    <div className="bg-white">
                        <div className="px-8 pb-4 pt-8 border-b border-neutral-100">
                            <DialogTitle className="text-2xl font-bold text-neutral-900 leading-tight">Настройки виджета</DialogTitle>
                            <p className="text-neutral-500 text-sm mt-2">Персонализируйте внешний вид и логику вашей ссылки</p>
                        </div>

                        <div className="p-8 pb-24 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-6">
                                <div className="grid gap-2">
                                    <Label className="text-neutral-600 font-normal">Название</Label>
                                    <Input 
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        className="border-neutral-200 h-11 rounded-xl"
                                    />
                                </div>

                                <div className="space-y-4 pt-2">
                                    <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest leading-none mb-1">Порядок записи</h3>
                                    <Select value={formData.stepsOrder} onValueChange={(v) => setFormData({...formData, stepsOrder: v})}>
                                        <SelectTrigger className="border-neutral-200 h-11 rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="services-first">Сначала услугу, затем мастера</SelectItem>
                                            <SelectItem value="master-first">Сначала мастера, затем услугу</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="space-y-2">
                                        <Label className="text-neutral-600 font-normal">Акцентный цвет</Label>
                                        <div className="flex gap-2">
                                            <input type="color" value={formData.accentColor} onChange={(e) => setFormData({...formData, accentColor: e.target.value})} className="w-11 h-11 p-1 rounded-xl border border-neutral-200 cursor-pointer bg-white" />
                                            <Input value={formData.accentColor} onChange={(e) => setFormData({...formData, accentColor: e.target.value})} className="flex-1 h-11 rounded-xl border-neutral-200" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-neutral-600 font-normal">Цвет фона</Label>
                                        <div className="flex gap-2">
                                            <input type="color" value={formData.bgColor} onChange={(e) => setFormData({...formData, bgColor: e.target.value})} className="w-11 h-11 p-1 rounded-xl border border-neutral-200 cursor-pointer bg-white" />
                                            <Input value={formData.bgColor} onChange={(e) => setFormData({...formData, bgColor: e.target.value})} className="flex-1 h-11 rounded-xl border-neutral-200" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-2">
                                    <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest leading-none mb-1">Эффекты и кнопка</h3>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label className="text-neutral-600 font-normal">Текст плавающей кнопки</Label>
                                            <Input 
                                                value={formData.buttonText}
                                                onChange={(e) => setFormData({...formData, buttonText: e.target.value})}
                                                className="border-neutral-200 h-11 rounded-xl"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-neutral-600 font-normal">Цвет текста кнопки</Label>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="color" 
                                                    value={formData.buttonTextColor} 
                                                    onChange={(e) => setFormData({...formData, buttonTextColor: e.target.value})}
                                                    className="w-11 h-11 p-1 rounded-xl border border-neutral-200 cursor-pointer bg-white"
                                                />
                                                <Input 
                                                    value={formData.buttonTextColor} 
                                                    onChange={(e) => setFormData({...formData, buttonTextColor: e.target.value})}
                                                    className="flex-1 h-11 rounded-xl border-neutral-200"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label className="text-neutral-600 font-normal">Положение кнопки</Label>
                                        <Select value={formData.buttonPosition} onValueChange={(v) => setFormData({...formData, buttonPosition: v})}>
                                            <SelectTrigger className="border-neutral-200 h-11 rounded-xl">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="bottom-right">Снизу справа</SelectItem>
                                                <SelectItem value="bottom-left">Снизу слева</SelectItem>
                                                <SelectItem value="top-right">Сверху справа</SelectItem>
                                                <SelectItem value="top-left">Сверху слева</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex items-center space-x-2 p-4 bg-neutral-50/50 rounded-2xl border border-neutral-100">
                                        <input 
                                            type="checkbox" 
                                            id="editButtonAnimation" 
                                            checked={formData.buttonAnimation}
                                            onChange={(e) => setFormData({...formData, buttonAnimation: e.target.checked})}
                                            className="h-4 w-4 rounded border-neutral-300 text-black focus:ring-black"
                                        />
                                        <Label htmlFor="editButtonAnimation" className="text-sm font-medium leading-none cursor-pointer">
                                            Анимировать кнопку записи
                                        </Label>
                                    </div>

                                    {formData.buttonAnimation && (
                                        <div className="grid gap-2">
                                            <Label className="text-neutral-600 font-normal text-xs uppercase tracking-wider">Тип анимации</Label>
                                            <Select value={formData.animationType} onValueChange={(v) => setFormData({...formData, animationType: v})}>
                                                <SelectTrigger className="border-neutral-200 h-11 rounded-xl">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="th-pulse">Пульсация</SelectItem>
                                                    <SelectItem value="th-shake">Тряска</SelectItem>
                                                    <SelectItem value="th-float">Плавание</SelectItem>
                                                    <SelectItem value="th-glow">Свечение</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4 pt-2">
                                    <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest leading-none mb-1">Скрипты и аналитика</h3>
                                    <div className="grid gap-2">
                                        <Label className="text-neutral-600 font-normal">JS-код (Метрика, Аналитика)</Label>
                                        <Textarea 
                                            value={formData.analyticsCode}
                                            onChange={(e) => setFormData({...formData, analyticsCode: e.target.value})}
                                            className="border-neutral-200 min-h-[100px] text-xs font-mono rounded-xl"
                                            placeholder="<script>...</script>" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-neutral-100 flex justify-end gap-3 z-10">
                            <Button variant="outline" className="h-11 px-6 rounded-xl border-neutral-200" onClick={() => setIsSettingsModalOpen(false)}>
                                Отмена
                            </Button>
                            <Button 
                                className="h-11 px-8 rounded-xl shadow-md transition-all hover:-translate-y-0.5"
                                style={{ backgroundColor: '#F5FF82', color: '#000' }}
                                onClick={() => {
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

                                    updateWidgetMutation.mutate({
                                        name: formData.name,
                                        description: formData.description,
                                        widget_type: widgetType,
                                        branch_id: formData.branchId === 'all' ? null : Number(formData.branchId),
                                        employee_id: formData.masterId ? Number(formData.masterId) : null,
                                        settings: JSON.stringify(settings)
                                    });
                                }}
                                disabled={updateWidgetMutation.isPending}
                            >
                                {updateWidgetMutation.isPending ? 'Сохранение...' : 'Сохранить изменения'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Code Modal */}
            <Dialog open={isCodeModalOpen} onOpenChange={setIsCodeModalOpen}>
                <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-none rounded-3xl shadow-2xl">
                    <div className="bg-white">
                        <div className="px-8 pb-4 pt-8 border-b border-neutral-100">
                            <DialogTitle className="text-2xl font-bold text-neutral-900 leading-tight">Код для вставки</DialogTitle>
                            <p className="text-neutral-500 text-sm mt-2">Просто вставьте этот код в любое место вашего сайта</p>
                        </div>

                        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-4">
                                <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                                    <span className="h-6 w-6 rounded-full bg-black text-white text-[10px] flex items-center justify-center">1</span>
                                    Основной способ (Рекомендуется)
                                </h3>
                                <p className="text-xs text-neutral-500">Добавьте этот код в секцию &lt;head&gt; или в конец страницы перед &lt;/body&gt;. На сайте появится плавающая кнопка записи.</p>
                                <div className="relative group">
                                    <pre className="bg-neutral-900 text-neutral-100 p-6 rounded-2xl text-[11px] overflow-x-auto font-mono leading-relaxed">
                                        {`<script \n  type="text/javascript" \n  src="${mounted ? window.location.origin : ''}/widget.js?id=${selectedWidget?.code}" \n  charset="UTF-8">\n</script>`}
                                    </pre>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="absolute top-4 right-4 text-white/50 hover:text-white hover:bg-white/10"
                                        onClick={() => {
                                            const code = `<script type="text/javascript" src="${window.location.origin}/widget.js?id=${selectedWidget?.code}" charset="UTF-8"></script>`;
                                            navigator.clipboard.writeText(code);
                                            toast.success('Скопировано в буфер обмена');
                                        }}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                                    <span className="h-6 w-6 rounded-full bg-black text-white text-[10px] flex items-center justify-center">2</span>
                                    Для своих кнопок
                                </h3>
                                <p className="text-xs text-neutral-500">Если у вас уже есть кнопка на сайте, просто добавьте ей специальный атрибут:</p>
                                <div className="relative group">
                                    <pre className="bg-neutral-900 text-neutral-100 p-6 rounded-2xl text-[11px] overflow-x-auto font-mono leading-relaxed">
                                        {`<button data-timehub-widget="${selectedWidget?.code}">\n  Записаться онлайн\n</button>`}
                                    </pre>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="absolute top-4 right-4 text-white/50 hover:text-white hover:bg-white/10"
                                        onClick={() => {
                                            const code = `<button data-timehub-widget="${selectedWidget?.code}">Записаться онлайн</button>`;
                                            navigator.clipboard.writeText(code);
                                            toast.success('Скопировано в буфер обмена');
                                        }}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                                <p className="text-[10px] text-amber-600 font-medium">Важно: при использовании своих кнопок, основной скрипт из пункта 1 всё равно должен быть подключен на странице!</p>
                            </div>
                        </div>

                        <div className="p-6 bg-neutral-50 border-t border-neutral-100 flex justify-end">
                            <Button className="h-11 px-8 rounded-xl font-semibold" onClick={() => setIsCodeModalOpen(false)}>
                                Закрыть
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
