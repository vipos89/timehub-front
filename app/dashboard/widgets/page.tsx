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
import { WidgetBuilder } from '@/components/widgets/WidgetBuilder';
import { SavedWidget } from '@/types/widget';

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

    // Modal / Builder State
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [selectedWidget, setSelectedWidget] = useState<SavedWidget | null>(null);
    const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);

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
            setIsBuilderOpen(false);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || 'Ошибка при создании')
    });

    const updateWidgetMutation = useMutation({
        mutationFn: (data: any) => api.put(`/widgets/${selectedWidget?.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['widgets'] });
            toast.success('Настройки сохранены');
            setIsBuilderOpen(false);
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

    const handleSaveWidget = (builderData: any) => {
        const payload = {
            name: builderData.name,
            description: builderData.description,
            widget_type: builderData.widgetType,
            branch_id: builderData.branchId === 'all' ? null : Number(builderData.branchId),
            employee_id: builderData.employeeId ? Number(builderData.employeeId) : null,
            settings: JSON.stringify(builderData.settings)
        };

        if (selectedWidget) {
            updateWidgetMutation.mutate(payload);
        } else {
            createWidgetMutation.mutate(payload);
        }
    };

    const handleOpenEdit = (widget: SavedWidget) => {
        setSelectedWidget(widget);
        setIsBuilderOpen(true);
    };

    const handleOpenCreate = () => {
        setSelectedWidget(null);
        setIsBuilderOpen(true);
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
                    onClick={handleOpenCreate}
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
                    <Button variant="outline" className="mt-8 rounded-xl h-11 px-8 font-bold border-neutral-200" onClick={handleOpenCreate}>Создать первую ссылку</Button>
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
                                <button className="h-11 w-11 rounded-xl text-neutral-400 hover:text-black hover:bg-neutral-50 flex items-center justify-center transition-all" onClick={() => handleOpenEdit(widget)}>
                                    <Settings className="h-5 w-5" />
                                </button>
                                <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl text-neutral-300 hover:text-red-500 hover:bg-red-50" onClick={() => deleteWidgetMutation.mutate(widget.id)}>
                                    <Trash2 className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Widget Builder Full-Screen Context */}
            <WidgetBuilder 
                isOpen={isBuilderOpen}
                onClose={() => setIsBuilderOpen(false)}
                onSave={handleSaveWidget}
                initialData={selectedWidget}
                branches={branches || []}
                company={company}
            />

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
