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
    Eye,
    ChevronRight,
    Search,
    Globe,
    MapPin,
    User as UserIcon,
    Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { WidgetPreview } from './WidgetPreview';
import { SavedWidget } from '@/types/widget';

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
        employeeId: '',
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
            // Premium Visuals
            theme: 'light' as 'light' | 'dark' | 'glass',
            borderRadius: 24,
            headerSecondaryColor: '#F5FF82',
            useGradient: false,
            fontPair: 'modern' as 'modern' | 'classic' | 'minimalist',
            shadowIntensity: 'medium' as 'none' | 'soft' | 'medium' | 'deep',
            slotStep: 15
        }
    });

    useEffect(() => {
        if (initialData) {
            const settings = typeof initialData.settings === 'string' ? JSON.parse(initialData.settings) : initialData.settings || {};
            setFormData({
                name: initialData.name || '',
                description: initialData.description || '',
                branchId: initialData.branch_id?.toString() || 'all',
                employeeId: initialData.employee_id?.toString() || '',
                widgetType: (initialData.widget_type as any) || 'network',
                settings: {
                    ...formData.settings,
                    ...settings
                }
            });
        }
    }, [initialData]);

    if (!isOpen) return null;

    const handleUpdateSettings = (key: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                [key]: value
            }
        }));
    };

    return (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in duration-300">
            {/* Header */}
            <header className="h-16 border-b border-neutral-100 flex items-center justify-between px-6 bg-white shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-neutral-50 rounded-full transition-colors">
                        <X className="h-5 w-5 text-neutral-500" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-neutral-900 rounded-lg flex items-center justify-center text-white">
                            <Settings2 className="h-4 w-4" />
                        </div>
                        <div>
                            <h2 className="font-black text-sm text-neutral-900 leading-none">Конструктор виджета</h2>
                            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-tight mt-1">{formData.name || 'Без названия'}</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-neutral-100 p-1 rounded-xl mr-4">
                        <button 
                            onClick={() => setPreviewMode('mobile')}
                            className={`p-2 rounded-lg transition-all ${previewMode === 'mobile' ? 'bg-white shadow-sm text-black' : 'text-neutral-400'}`}
                        >
                            <Smartphone className="h-4 w-4" />
                        </button>
                        <button 
                            onClick={() => setPreviewMode('desktop')}
                            className={`p-2 rounded-lg transition-all ${previewMode === 'desktop' ? 'bg-white shadow-sm text-black' : 'text-neutral-400'}`}
                        >
                            <MousePointer2 className="h-4 w-4" />
                        </button>
                    </div>
                    <Button variant="outline" onClick={onClose} className="rounded-xl font-bold h-10 px-6 border-neutral-200">Отмена</Button>
                    <Button onClick={() => onSave(formData)} className="bg-neutral-900 text-white rounded-xl font-bold h-10 px-8 flex gap-2">
                        <Save className="h-4 w-4" /> Сохранить
                    </Button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <aside className="w-[400px] border-r border-neutral-100 bg-neutral-50/30 flex flex-col overflow-hidden">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                        <div className="px-6 pt-6 pb-2">
                            <TabsList className="bg-neutral-100 p-1 rounded-2xl w-full h-12">
                                <TabsTrigger value="general" className="flex-1 rounded-xl font-bold text-xs data-[state=active]:shadow-sm">Основные</TabsTrigger>
                                <TabsTrigger value="button" className="flex-1 rounded-xl font-bold text-xs data-[state=active]:shadow-sm">Кнопка</TabsTrigger>
                                <TabsTrigger value="window" className="flex-1 rounded-xl font-bold text-xs data-[state=active]:shadow-sm">Виджет</TabsTrigger>
                                <TabsTrigger value="design" className="flex-1 rounded-xl font-bold text-xs data-[state=active]:shadow-sm">Дизайн</TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
                            <TabsContent value="general" className="mt-0 space-y-8 animate-in slide-in-from-left-2">
                                <section className="space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="h-5 w-5 bg-neutral-100 rounded-md flex items-center justify-center text-neutral-500"><Type className="h-3 w-3" /></div>
                                        <h3 className="font-bold text-sm text-neutral-500 uppercase tracking-wider">Базовая информация</h3>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-xs font-bold text-neutral-700 ml-1">Название виджета</Label>
                                        <Input 
                                            value={formData.name} 
                                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                                            className="h-11 rounded-xl border-neutral-200 bg-white" 
                                            placeholder="Напр: Ссылка для Instagram"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-xs font-bold text-neutral-700 ml-1">Тип онлайн-записи</Label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {[
                                                { id: 'network', icon: Globe, label: 'Общая', desc: 'Выбор филиала и мастера' },
                                                { id: 'branch', icon: MapPin, label: 'Филиал', desc: 'Запись в конкретный адрес' },
                                                { id: 'master', icon: UserIcon, label: 'Мастер', desc: 'Персональная ссылка мастера' }
                                            ].map((type) => (
                                                <div 
                                                    key={type.id}
                                                    onClick={() => setFormData({...formData, widgetType: type.id as any})}
                                                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${formData.widgetType === type.id ? 'border-neutral-900 bg-white shadow-md' : 'border-neutral-100 bg-white/50 hover:border-neutral-300'}`}
                                                >
                                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${formData.widgetType === type.id ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-400'}`}>
                                                        <type.icon className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-sm leading-none">{type.label}</h4>
                                                        <p className="text-[11px] text-neutral-400 mt-1">{type.desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {(formData.widgetType === 'branch' || formData.widgetType === 'master') && (
                                        <div className="grid gap-2 animate-in fade-in zoom-in-95">
                                            <Label className="text-xs font-bold text-neutral-700 ml-1">Выберите филиал</Label>
                                            <Select
                                                value={formData.branchId}
                                                onValueChange={(v) => setFormData({...formData, branchId: v, employeeId: ''})}
                                            >
                                                <SelectTrigger className="h-11 rounded-xl border-neutral-200 bg-white flex gap-2">
                                                    <SelectValue placeholder="Выберите филиал" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {branches?.map((b: any) => (
                                                        <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}

                                    {formData.widgetType === 'master' && formData.branchId !== 'all' && (
                                        <div className="grid gap-2 animate-in fade-in zoom-in-95">
                                            <Label className="text-xs font-bold text-neutral-700 ml-1">Выберите специалиста</Label>
                                            <Select
                                                value={formData.employeeId}
                                                onValueChange={(v) => setFormData({...formData, employeeId: v})}
                                            >
                                                <SelectTrigger className="h-11 rounded-xl border-neutral-200 bg-white flex gap-2">
                                                    <SelectValue placeholder="Выберите специалиста" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {branches.find(b => b.id.toString() === formData.branchId)?.employees?.map((e: any) => (
                                                        <SelectItem key={e.id} value={e.id.toString()}>{e.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </section>
                            </TabsContent>

                            <TabsContent value="button" className="mt-0 space-y-8 animate-in slide-in-from-left-2">
                                <section className="space-y-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="h-5 w-5 bg-neutral-100 rounded-md flex items-center justify-center text-neutral-500"><Palette className="h-3 w-3" /></div>
                                        <h3 className="font-bold text-sm text-neutral-500 uppercase tracking-wider">Стиль кнопки</h3>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-xs font-bold text-neutral-700 ml-1">Текст на кнопке</Label>
                                        <Input
                                            value={formData.settings.buttonText}
                                            onChange={(e) => handleUpdateSettings('buttonText', e.target.value)}
                                            className="h-11 rounded-xl border-neutral-200 bg-white"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-neutral-700 ml-1">Цвет кнопки</Label>
                                            <div className="flex gap-2">
                                                <div className="relative h-11 w-11 shrink-0">
                                                    <Input 
                                                        type="color" 
                                                        value={formData.settings.accentColor} 
                                                        onChange={(e) => handleUpdateSettings('accentColor', e.target.value)}
                                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                    />
                                                    <div className="w-full h-full rounded-xl border border-neutral-200 shadow-sm" style={{ backgroundColor: formData.settings.accentColor }} />
                                                </div>
                                                <Input 
                                                    value={formData.settings.accentColor} 
                                                    onChange={(e) => handleUpdateSettings('accentColor', e.target.value)}
                                                    className="h-11 rounded-xl border-neutral-200 bg-white font-mono text-[10px]"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-neutral-700 ml-1">Цвет текста</Label>
                                            <div className="flex gap-2">
                                                <div className="relative h-11 w-11 shrink-0">
                                                    <Input 
                                                        type="color" 
                                                        value={formData.settings.buttonTextColor} 
                                                        onChange={(e) => handleUpdateSettings('buttonTextColor', e.target.value)}
                                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                    />
                                                    <div className="w-full h-full rounded-xl border border-neutral-200 shadow-sm" style={{ backgroundColor: formData.settings.buttonTextColor }} />
                                                </div>
                                                <Input 
                                                    value={formData.settings.buttonTextColor} 
                                                    onChange={(e) => handleUpdateSettings('buttonTextColor', e.target.value)}
                                                    className="h-11 rounded-xl border-neutral-200 bg-white font-mono text-[10px]"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-xs font-bold text-neutral-700 ml-1">Расположение</Label>
                                        <Select value={formData.settings.buttonPosition} onValueChange={(v) => handleUpdateSettings('buttonPosition', v)}>
                                            <SelectTrigger className="h-11 rounded-xl border-neutral-200 bg-white">
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

                                    <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <Label className="font-bold text-sm">Анимация кнопки</Label>
                                            <p className="text-[11px] text-neutral-400 font-medium">Кнопка будет привлекать внимание</p>
                                        </div>
                                        <Switch 
                                            checked={formData.settings.buttonAnimation} 
                                            onCheckedChange={(checked) => handleUpdateSettings('buttonAnimation', checked)}
                                        />
                                    </div>

                                    {formData.settings.buttonAnimation && (
                                        <div className="grid gap-2 animate-in slide-in-from-top-2">
                                            <Label className="text-xs font-bold text-neutral-700 ml-1">Тип анимации</Label>
                                            <Select value={formData.settings.animationType} onValueChange={(v) => handleUpdateSettings('animationType', v)}>
                                                <SelectTrigger className="h-11 rounded-xl border-neutral-200 bg-white">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="th-pulse">Пульсация</SelectItem>
                                                    <SelectItem value="th-shake">Дрожание</SelectItem>
                                                    <SelectItem value="th-float">Плавание</SelectItem>
                                                    <SelectItem value="th-glow">Свечение</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </section>
                            </TabsContent>

                            <TabsContent value="window" className="mt-0 space-y-8 animate-in slide-in-from-left-2">
                                <section className="space-y-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="h-5 w-5 bg-neutral-100 rounded-md flex items-center justify-center text-neutral-500"><Layout className="h-3 w-3" /></div>
                                        <h3 className="font-bold text-sm text-neutral-500 uppercase tracking-wider">Интерфейс виджета</h3>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-white border border-neutral-200 rounded-2xl">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 bg-neutral-50 rounded-lg flex items-center justify-center text-neutral-400"><Sparkles className="h-4 w-4" /></div>
                                                <Label className="font-bold text-sm">Показывать логотип</Label>
                                            </div>
                                            <Switch 
                                                checked={formData.settings.showCompanyLogo} 
                                                onCheckedChange={(checked) => handleUpdateSettings('showCompanyLogo', checked)}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between p-4 bg-white border border-neutral-200 rounded-2xl">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 bg-neutral-50 rounded-lg flex items-center justify-center text-neutral-400"><Globe className="h-4 w-4" /></div>
                                                <Label className="font-bold text-sm">Соцсети компании</Label>
                                            </div>
                                            <Switch 
                                                checked={formData.settings.showSocialLinks} 
                                                onCheckedChange={(checked) => handleUpdateSettings('showSocialLinks', checked)}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-2 pt-4">
                                        <Label className="text-xs font-bold text-neutral-700 ml-1">Порядок шагов записи</Label>
                                        <Select 
                                            value={formData.settings.stepsOrder[0] === 'services' ? 'services-first' : 'specialist-first'} 
                                            onValueChange={(v) => handleUpdateSettings('stepsOrder', v === 'services-first' ? ['services', 'specialist', 'datetime'] : ['specialist', 'services', 'datetime'])}
                                        >
                                            <SelectTrigger className="h-11 rounded-xl border-neutral-200 bg-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="services-first">Сначала услуги</SelectItem>
                                                <SelectItem value="specialist-first">Сначала специалист</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label className="text-xs font-bold text-neutral-700 ml-1">Интервал слотов</Label>
                                        <Select 
                                            value={String(formData.settings.slotStep || 15)} 
                                            onValueChange={(v) => handleUpdateSettings('slotStep', Number(v))}
                                        >
                                            <SelectTrigger className="h-11 rounded-xl border-neutral-200 bg-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="15">15 минут</SelectItem>
                                                <SelectItem value="30">30 минут</SelectItem>
                                                <SelectItem value="45">45 минут</SelectItem>
                                                <SelectItem value="60">1 час</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-neutral-700 ml-1">Язык интерфейса</Label>
                                        <Select value={formData.settings.language} onValueChange={(v) => handleUpdateSettings('language', v)}>
                                            <SelectTrigger className="h-11 rounded-xl border-neutral-200 bg-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ru">Русский</SelectItem>
                                                <SelectItem value="en">English</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </section>
                            </TabsContent>

                            <TabsContent value="design" className="mt-0 space-y-8 animate-in slide-in-from-left-2">
                                <section className="space-y-8">
                                    {/* Themes */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="h-5 w-5 bg-neutral-100 rounded-md flex items-center justify-center text-neutral-500"><Palette className="h-3 w-3" /></div>
                                            <h3 className="font-bold text-sm text-neutral-500 uppercase tracking-wider">Тема оформления</h3>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { id: 'light', label: 'Светлая', icon: Globe },
                                                { id: 'dark', label: 'Темная', icon: Settings2 },
                                                { id: 'glass', label: 'Стекло', icon: Sparkles }
                                            ].map((t) => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => handleUpdateSettings('theme', t.id)}
                                                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${formData.settings.theme === t.id ? 'border-neutral-900 bg-white shadow-md' : 'border-neutral-100 bg-white/50 hover:border-neutral-300'}`}
                                                >
                                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${formData.settings.theme === t.id ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-400'}`}>
                                                        <t.icon className="h-4 w-4" />
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-tight">{t.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Corner Radius */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="h-5 w-5 bg-neutral-100 rounded-md flex items-center justify-center text-neutral-500"><Layout className="h-3 w-3" /></div>
                                                <h3 className="font-bold text-sm text-neutral-500 uppercase tracking-wider">Скругление углов</h3>
                                            </div>
                                            <span className="text-xs font-black text-neutral-900">{formData.settings.borderRadius}px</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="40" 
                                            value={formData.settings.borderRadius} 
                                            onChange={(e) => handleUpdateSettings('borderRadius', Number(e.target.value))}
                                            className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-900"
                                        />
                                        <div className="flex justify-between text-[10px] text-neutral-400 font-bold">
                                            <span>СТРОГИЙ</span>
                                            <span>МЯГКИЙ</span>
                                        </div>
                                    </div>

                                    {/* Header Gradient */}
                                    <div className="space-y-4 pt-4 border-t border-neutral-100">
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <Label className="font-bold text-sm">Градиент в шапке</Label>
                                                <p className="text-[11px] text-neutral-400 font-medium">Плавный переход между цветами</p>
                                            </div>
                                            <Switch 
                                                checked={formData.settings.useGradient} 
                                                onCheckedChange={(checked) => handleUpdateSettings('useGradient', checked)}
                                            />
                                        </div>

                                        {formData.settings.useGradient && (
                                            <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black text-neutral-400 uppercase">Первый цвет</Label>
                                                    <div className="flex gap-2">
                                                        <div className="w-8 h-8 rounded-lg border border-neutral-200" style={{ backgroundColor: formData.settings.accentColor }} />
                                                        <span className="text-[11px] font-mono self-center uppercase">{formData.settings.accentColor}</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black text-neutral-400 uppercase">Второй цвет</Label>
                                                    <div className="flex gap-2">
                                                        <div className="relative h-8 w-8 shrink-0">
                                                            <Input 
                                                                type="color" 
                                                                value={formData.settings.headerSecondaryColor} 
                                                                onChange={(e) => handleUpdateSettings('headerSecondaryColor', e.target.value)}
                                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                            />
                                                            <div className="w-full h-full rounded-lg border border-neutral-200 shadow-sm" style={{ backgroundColor: formData.settings.headerSecondaryColor }} />
                                                        </div>
                                                        <span className="text-[11px] font-mono self-center uppercase">{formData.settings.headerSecondaryColor}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Font Pair Selection */}
                                    <div className="space-y-4 pt-4 border-t border-neutral-100">
                                        <div className="flex items-center gap-2">
                                            <div className="h-5 w-5 bg-neutral-100 rounded-md flex items-center justify-center text-neutral-500"><Type className="h-3 w-3" /></div>
                                            <h3 className="font-bold text-sm text-neutral-500 uppercase tracking-wider">Стиль шрифта</h3>
                                        </div>
                                        <Select value={formData.settings.fontPair} onValueChange={(v) => handleUpdateSettings('fontPair', v)}>
                                            <SelectTrigger className="h-11 rounded-xl border-neutral-200 bg-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="modern" className="font-sans">Modern Sans (Чистый)</SelectItem>
                                                <SelectItem value="classic" className="font-serif">Elegant Serif (Классика)</SelectItem>
                                                <SelectItem value="minimalist" className="font-mono">Minimal Mono (Минимализм)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </section>
                            </TabsContent>
                        </div>
                    </Tabs>
                </aside>

                {/* Preview Area */}
                <main className="flex-1 bg-neutral-100 flex items-center justify-center p-12 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                    
                    <div className={`transition-all duration-500 flex flex-col items-center gap-6 ${previewMode === 'mobile' ? 'w-[375px]' : 'w-full max-w-4xl'}`}>
                        {/* Devices Frame */}
                        <div className={`bg-white rounded-[48px] shadow-2xl border-[12px] border-neutral-900 overflow-hidden relative transition-all duration-500 w-full ${previewMode === 'mobile' ? 'aspect-[9/19] h-[750px]' : 'aspect-video'}`}>
                            {/* Browser Header if Desktop */}
                            {previewMode === 'desktop' && (
                                <div className="h-10 border-b border-neutral-100 bg-neutral-50 px-4 flex items-center gap-2">
                                    <div className="flex gap-1.5">
                                        <div className="h-3 w-3 rounded-full bg-red-400" />
                                        <div className="h-3 w-3 rounded-full bg-yellow-400" />
                                        <div className="h-3 w-3 rounded-full bg-green-400" />
                                    </div>
                                    <div className="flex-1 bg-white h-6 rounded-md border border-neutral-200 flex items-center px-3 text-[10px] text-neutral-400 font-mono">
                                        example.com/booking
                                    </div>
                                </div>
                            )}

                            {/* Actual Widget Preview Content */}
                            <div className="absolute inset-0 pt-0 overflow-hidden bg-white">
                                <WidgetPreview 
                                    settings={{
                                        ...formData.settings,
                                        widgetType: formData.widgetType,
                                        // Mock company for preview
                                        company: company
                                    }} 
                                    branches={branches}
                                    isFullPreview={true}
                                />
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4 bg-white/50 backdrop-blur-md px-6 py-3 rounded-3xl border border-white/20 shadow-sm text-[11px] font-bold text-neutral-400">
                            <Eye className="h-4 w-4" /> ИНТЕРАКТИВНЫЙ ПРЕДПРОСМОТР
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
