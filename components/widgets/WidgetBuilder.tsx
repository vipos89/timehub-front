'use client';

import { useState, useEffect } from 'react';
import { 
    X, 
    Smartphone, 
    MousePointer2, 
    Palette, 
    Type, 
    Layout, 
    Settings2,
    Save,
    ChevronRight,
    Globe,
    MapPin,
    User as UserIcon,
    Sparkles,
    Loader2,
    GripVertical,
    ArrowUp,
    ArrowDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { WidgetPreview } from './WidgetPreview';
import { SavedWidget } from '@/types/widget';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface WidgetBuilderProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    initialData?: SavedWidget | null;
    branches: any[];
    company: any;
}

export function WidgetBuilder({ isOpen, onClose, onSave, initialData, branches, company }: WidgetBuilderProps) {
    const [activeTab, setActiveTab] = useState('general');
    const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile');
    
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        branchId: 'all',
        employeeId: 'all',
        widgetType: 'network' as 'network' | 'branch' | 'master',
        settings: {
            accentColor: '#F5FF82',
            bgColor: '#ffffff',
            language: 'ru',
            stepsOrder: ['services', 'specialist', 'datetime'],
            buttonText: 'Записаться онлайн',
            buttonTextColor: '#000000',
            buttonPosition: 'bottom-right',
            buttonAnimation: true,
            animationType: 'th-pulse',
            showCompanyLogo: true,
            showSocialLinks: true,
            theme: 'light' as 'light' | 'dark' | 'glass',
            borderRadius: 24,
            headerSecondaryColor: '#F5FF82',
            useGradient: false,
            fontPair: 'modern' as 'modern' | 'classic' | 'minimalist',
            shadowIntensity: 'medium' as 'none' | 'soft' | 'medium' | 'deep',
            slotStep: 15
        }
    });

    const animations = [
        { id: 'th-pulse', label: 'Пульсация' },
        { id: 'th-shake', label: 'Тряска' },
        { id: 'th-float', label: 'Плавание' },
        { id: 'th-glow', label: 'Свечение' },
        { id: 'th-bounce', label: 'Прыжок' },
        { id: 'th-swing', label: 'Раскачивание' },
        { id: 'th-pop', label: 'Увеличение' }
    ];

    const { data: branchEmployees = [], isLoading: isLoadingEmployees } = useQuery({
        queryKey: ['builder-employees', formData.branchId],
        queryFn: async () => {
            if (!formData.branchId || formData.branchId === 'all') return [];
            const res = await api.get(`/employees?branch_id=${formData.branchId}`);
            return res.data || [];
        },
        enabled: isOpen && !!formData.branchId && formData.branchId !== 'all'
    });

    useEffect(() => {
        if (initialData) {
            const settings = typeof initialData.settings === 'string' ? JSON.parse(initialData.settings) : initialData.settings || {};
            setFormData({
                name: initialData.name || '',
                description: initialData.description || '',
                branchId: initialData.branch_id?.toString() || 'all',
                employeeId: initialData.employee_id?.toString() || 'all',
                widgetType: (initialData.widget_type as any) || 'network',
                settings: { ...formData.settings, ...settings }
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleUpdateSettings = (key: string, value: any) => {
        setFormData(prev => ({ ...prev, settings: { ...prev.settings, [key]: value } }));
    };

    const moveStep = (index: number, direction: 'up' | 'down') => {
        const newSteps = [...formData.settings.stepsOrder];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newSteps.length) return;
        [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
        handleUpdateSettings('stepsOrder', newSteps);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in duration-300">
            <header className="h-16 border-b border-neutral-100 flex items-center justify-between px-6 bg-white shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-neutral-50 rounded-full transition-colors"><X className="h-5 w-5 text-neutral-500" /></button>
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-neutral-900 rounded-lg flex items-center justify-center text-white"><Settings2 className="h-4 w-4" /></div>
                        <div><h2 className="font-black text-sm text-neutral-900 leading-none">Конструктор виджета</h2><p className="text-[10px] text-neutral-400 font-bold uppercase tracking-tight mt-1">{formData.name || 'Без названия'}</p></div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={onClose} className="rounded-xl font-bold h-10 px-6 border-neutral-200">Отмена</Button>
                    <Button onClick={() => onSave(formData)} className="bg-neutral-900 text-white rounded-xl font-bold h-10 px-8 flex gap-2"><Save className="h-4 w-4" /> Сохранить</Button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <aside className="w-[400px] border-r border-neutral-100 bg-neutral-50/30 flex flex-col overflow-hidden">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                        <div className="px-6 pt-6 pb-2">
                            <TabsList className="bg-neutral-100 p-1 rounded-2xl w-full h-12">
                                <TabsTrigger value="general" className="flex-1 rounded-xl font-bold text-xs">Основные</TabsTrigger>
                                <TabsTrigger value="button" className="flex-1 rounded-xl font-bold text-xs">Кнопка</TabsTrigger>
                                <TabsTrigger value="window" className="flex-1 rounded-xl font-bold text-xs">Виджет</TabsTrigger>
                                <TabsTrigger value="design" className="flex-1 rounded-xl font-bold text-xs">Дизайн</TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
                            <TabsContent value="general" className="mt-0 space-y-8 animate-in slide-in-from-left-2">
                                <section className="space-y-4">
                                    <div className="flex items-center gap-2 mb-2"><div className="h-5 w-5 bg-neutral-100 rounded-md flex items-center justify-center text-neutral-500"><Type className="h-3 w-3" /></div><h3 className="font-bold text-sm text-neutral-500 uppercase tracking-wider">Базовая информация</h3></div>
                                    <div className="grid gap-2"><Label className="text-xs font-bold text-neutral-700 ml-1">Название</Label><Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="h-11 rounded-xl border-neutral-200 bg-white" placeholder="Напр: Ссылка для Instagram"/></div>
                                    <div className="grid gap-2">
                                        <Label className="text-xs font-bold text-neutral-700 ml-1">Тип онлайн-записи</Label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {[
                                                { id: 'network', icon: Globe, label: 'Общая', desc: 'Выбор филиала и мастера' },
                                                { id: 'branch', icon: MapPin, label: 'Филиал', desc: 'Запись в конкретный адрес' },
                                                { id: 'master', icon: UserIcon, label: 'Мастер', desc: 'Персональная ссылка мастера' }
                                            ].map((type) => (
                                                <div key={type.id} onClick={() => setFormData({...formData, widgetType: type.id as any})} className={cn("p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4", formData.widgetType === type.id ? "border-neutral-900 bg-white shadow-md" : "border-neutral-100 bg-white/50 hover:border-neutral-300")}>
                                                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", formData.widgetType === type.id ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-400")}><type.icon className="h-5 w-5" /></div>
                                                    <div><h4 className="font-bold text-sm leading-none">{type.label}</h4><p className="text-[11px] text-neutral-400 mt-1">{type.desc}</p></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {(formData.widgetType === 'branch' || formData.widgetType === 'master') && (
                                        <div className="grid gap-2 animate-in fade-in zoom-in-95">
                                            <Label className="text-xs font-bold text-neutral-700 ml-1">Выберите филиал</Label>
                                            <Select value={formData.branchId} onValueChange={(v) => setFormData({...formData, branchId: v, employeeId: 'all'})}><SelectTrigger className="h-11 rounded-xl border-neutral-200 bg-white flex gap-2"><SelectValue placeholder="Выберите филиал" /></SelectTrigger><SelectContent className="z-[110]"><SelectItem value="all">Все филиалы</SelectItem>{branches?.map((b: any) => (<SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>))}</SelectContent></Select>
                                        </div>
                                    )}
                                    {formData.widgetType === 'master' && (
                                        <div className="grid gap-2 animate-in fade-in zoom-in-95">
                                            <div className="flex items-center justify-between"><Label className="text-xs font-bold text-neutral-700 ml-1">Выберите специалиста</Label>{isLoadingEmployees && <Loader2 className="h-3 w-3 animate-spin text-neutral-400" />}</div>
                                            <Select value={formData.employeeId} onValueChange={(v) => setFormData({...formData, employeeId: v})} disabled={formData.branchId === 'all'}><SelectTrigger className="h-11 rounded-xl border-neutral-200 bg-white flex gap-2"><SelectValue placeholder={formData.branchId === 'all' ? "Сначала выберите филиал" : "Выберите специалиста"} /></SelectTrigger><SelectContent className="z-[110]"><SelectItem value="all">Любой специалист</SelectItem>{branchEmployees?.map((e: any) => (<SelectItem key={e.id} value={e.id.toString()}>{e.name}</SelectItem>))}</SelectContent></Select>
                                        </div>
                                    )}
                                </section>
                            </TabsContent>

                            <TabsContent value="button" className="mt-0 space-y-8 animate-in slide-in-from-left-2">
                                <section className="space-y-6">
                                    <div className="flex items-center gap-2 mb-2"><div className="h-5 w-5 bg-neutral-100 rounded-md flex items-center justify-center text-neutral-500"><Palette className="h-3 w-3" /></div><h3 className="font-bold text-sm text-neutral-500 uppercase tracking-wider">Плавающая кнопка</h3></div>
                                    <div className="grid gap-2"><Label className="text-xs font-bold text-neutral-700 ml-1">Текст на кнопке сайта</Label><Input value={formData.settings.buttonText} onChange={(e) => handleUpdateSettings('buttonText', e.target.value)} className="h-11 rounded-xl border-neutral-200 bg-white" /></div>
                                    <div className="grid gap-2">
                                        <Label className="text-xs font-bold text-neutral-700 ml-1">Расположение на сайте</Label>
                                        <Select value={formData.settings.buttonPosition} onValueChange={(v) => handleUpdateSettings('buttonPosition', v)}><SelectTrigger className="h-11 rounded-xl border-neutral-200 bg-white"><SelectValue /></SelectTrigger><SelectContent className="z-[110]"><SelectItem value="bottom-right">Снизу справа</SelectItem><SelectItem value="bottom-left">Снизу слева</SelectItem><SelectItem value="top-right">Сверху справа</SelectItem><SelectItem value="top-left">Сверху слева</SelectItem></SelectContent></Select>
                                    </div>
                                    <div className="space-y-4 pt-2">
                                        <div className="flex items-center justify-between"><Label className="font-bold text-sm">Анимация кнопки</Label><Switch checked={formData.settings.buttonAnimation} onCheckedChange={(v) => handleUpdateSettings('buttonAnimation', v)}/></div>
                                        {formData.settings.buttonAnimation && (
                                            <div className="grid gap-2">
                                                <Label className="text-xs font-bold text-neutral-700 ml-1">Тип анимации</Label>
                                                <Select value={formData.settings.animationType} onValueChange={(v) => handleUpdateSettings('animationType', v)}>
                                                    <SelectTrigger className="h-11 rounded-xl border-neutral-200 bg-white font-bold"><SelectValue /></SelectTrigger>
                                                    <SelectContent className="z-[110]">
                                                        {animations.map(a => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </TabsContent>

                            <TabsContent value="window" className="mt-0 space-y-8 animate-in slide-in-from-left-2">
                                <section className="space-y-6">
                                    <div className="flex items-center gap-2 mb-2"><div className="h-5 w-5 bg-neutral-100 rounded-md flex items-center justify-center text-neutral-500"><Layout className="h-3 w-3" /></div><h3 className="font-bold text-sm text-neutral-500 uppercase tracking-wider">Интерфейс виджета</h3></div>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-white border border-neutral-200 rounded-2xl"><div className="flex items-center gap-3"><div className="h-8 w-8 bg-neutral-50 rounded-lg flex items-center justify-center text-neutral-400"><Sparkles className="h-4 w-4" /></div><Label className="font-bold text-sm">Логотип</Label></div><Switch checked={formData.settings.showCompanyLogo} onCheckedChange={(v) => handleUpdateSettings('showCompanyLogo', v)}/></div>
                                        <div className="flex items-center justify-between p-4 bg-white border border-neutral-200 rounded-2xl"><div className="flex items-center gap-3"><div className="h-8 w-8 bg-neutral-50 rounded-lg flex items-center justify-center text-neutral-400"><Globe className="h-4 w-4" /></div><Label className="font-bold text-sm">Соцсети</Label></div><Switch checked={formData.settings.showSocialLinks} onCheckedChange={(v) => handleUpdateSettings('showSocialLinks', v)}/></div>
                                    </div>
                                    <div className="space-y-3 pt-2">
                                        <div className="flex items-center gap-2 mb-1"><div className="h-5 w-5 bg-neutral-100 rounded-md flex items-center justify-center text-neutral-500"><GripVertical className="h-3 w-3" /></div><h3 className="font-bold text-xs text-neutral-500 uppercase tracking-widest">Порядок шагов</h3></div>
                                        <div className="space-y-2">
                                            {formData.settings.stepsOrder.map((step, index) => (
                                                <div key={step} className="flex items-center justify-between p-3 bg-white border border-neutral-100 rounded-xl shadow-sm">
                                                    <div className="flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-neutral-50 flex items-center justify-center text-neutral-400 font-bold text-[10px] uppercase">{index + 1}</div><span className="text-xs font-bold text-neutral-700">{step === 'services' ? 'Выбор услуг' : step === 'specialist' ? 'Выбор мастера' : 'Выбор времени'}</span></div>
                                                    <div className="flex gap-1">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveStep(index, 'up')} disabled={index === 0}><ArrowUp className="h-3.5 w-3.5" /></Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveStep(index, 'down')} disabled={index === formData.settings.stepsOrder.length - 1}><ArrowDown className="h-3.5 w-3.5" /></Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid gap-2"><Label className="text-xs font-bold text-neutral-700 ml-1">Интервал слотов</Label><Select value={String(formData.settings.slotStep || 15)} onValueChange={(v) => handleUpdateSettings('slotStep', Number(v))}><SelectTrigger className="h-11 rounded-xl border-neutral-200 bg-white"><SelectValue /></SelectTrigger><SelectContent className="z-[110]"><SelectItem value="15">15 минут</SelectItem><SelectItem value="30">30 минут</SelectItem><SelectItem value="45">45 минут</SelectItem><SelectItem value="60">1 час</SelectItem></SelectContent></Select></div>
                                </section>
                            </TabsContent>

                            <TabsContent value="design" className="mt-0 space-y-8 animate-in slide-in-from-left-2">
                                <section className="space-y-6">
                                    <div className="flex items-center gap-2 mb-2"><div className="h-5 w-5 bg-neutral-100 rounded-md flex items-center justify-center text-neutral-500"><Palette className="h-3 w-3" /></div><h3 className="font-bold text-sm text-neutral-500 uppercase tracking-wider">Оформление</h3></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-neutral-700 ml-1">Акцентный цвет</Label>
                                            <div className="flex gap-2"><div className="relative h-11 w-11 shrink-0"><Input type="color" value={formData.settings.accentColor} onChange={(e) => handleUpdateSettings('accentColor', e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"/><div className="w-full h-full rounded-xl border border-neutral-200 shadow-sm" style={{ backgroundColor: formData.settings.accentColor }} /></div><Input value={formData.settings.accentColor} onChange={(e) => handleUpdateSettings('accentColor', e.target.value)} className="h-11 rounded-xl border-neutral-200 bg-white font-mono text-[10px]"/></div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-neutral-700 ml-1">Тема</Label>
                                            <Select value={formData.settings.theme} onValueChange={(v) => handleUpdateSettings('theme', v)}><SelectTrigger className="h-11 rounded-xl border-neutral-200 bg-white"><SelectValue /></SelectTrigger><SelectContent className="z-[110]"><SelectItem value="light">Светлая</SelectItem><SelectItem value="dark">Темная</SelectItem><SelectItem value="glass">Стекло</SelectItem></SelectContent></Select>
                                        </div>
                                    </div>
                                    <div className="grid gap-2"><Label className="text-xs font-bold text-neutral-700 ml-1">Скругление ({formData.settings.borderRadius}px)</Label><input type="range" min="0" max="40" value={formData.settings.borderRadius} onChange={(e) => handleUpdateSettings('borderRadius', parseInt(e.target.value))} className="w-full h-2 bg-neutral-100 rounded-lg appearance-none cursor-pointer accent-neutral-900"/></div>
                                </section>
                            </TabsContent>
                        </div>
                    </Tabs>
                </aside>

                <main className="flex-1 bg-neutral-50 flex items-center justify-center p-8 relative overflow-hidden">
                    <WidgetPreview 
                        settings={formData.settings} 
                        company={company} 
                        branches={branches} 
                        type={formData.widgetType} 
                        branchId={formData.branchId} 
                        employeeId={formData.employeeId}
                        activeTab={activeTab}
                    />
                </main>
            </div>
        </div>
    );
}
