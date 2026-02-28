'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueries } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, User, Scissors, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';


export default function WidgetPage() {
    const { code } = useParams();
    const searchParams = useSearchParams();
    const [view, setView] = useState<'home' | 'specialist' | 'services' | 'datetime' | 'profile' | 'branches'>('home');

    // Widget Config State
    const { data: widget, isLoading: isLoadingWidget } = useQuery({
        queryKey: ['widget', code],
        queryFn: async () => {
            const res = await api.get(`/widgets/${code}`);
            return res.data;
        },
        enabled: !!code,
    });

    const settings = useMemo(() => {
        if (!widget?.settings) return {};
        try { return JSON.parse(widget.settings); } catch (e) { return {}; }
    }, [widget?.settings]);

    // Selection state
    const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
    const [selectedServices, setSelectedServices] = useState<any[]>([]);
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null); // null means "Any"
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedSlot, setSelectedSlot] = useState<any>(null);

    // Guest state
    const [guestName, setGuestName] = useState('');
    const [guestPhone, setGuestPhone] = useState('');

    // Theme settings from Widget Settings or URL (fallback)
    const accentColor = settings.accentColor || searchParams.get('accent') || '#000000';
    const bgColor = settings.bgColor || searchParams.get('bg') || '#ffffff';
    const stepsOrder = settings.stepsOrder || ['services', 'specialist', 'datetime'];

    // Analytics execution
    useEffect(() => {
        if (settings.analyticsCode) {
            try {
                const script = document.createElement('script');
                script.innerHTML = settings.analyticsCode;
                document.head.appendChild(script);
            } catch (e) {
                console.error('Failed to execute analytics code', e);
            }
        }
    }, [settings.analyticsCode]);

    // Set initial state based on widget type
    const activeBranchId = selectedBranchId || widget?.branch_id;
    const isNetworkWidget = widget?.widget_type === 'network';

    // Navigation logic based on steps order
    const handleNextStep = (currentStep: string) => {
        const currentIndex = stepsOrder.indexOf(currentStep);
        if (currentIndex !== -1 && currentIndex < stepsOrder.length - 1) {
            const nextStep = stepsOrder[currentIndex + 1];
            
            // Skip specialist if it's a master widget and next step is specialist
            if (nextStep === 'specialist' && widget?.widget_type === 'master') {
                handleNextStep('specialist');
                return;
            }

            setView(nextStep as any);
        } else {
            setView('home'); // Fallback to summary
        }
    };

    // Queries
    const { data: allBranches } = useQuery({
        queryKey: ['companyBranches', widget?.company_id],
        queryFn: async () => {
            const res = await api.get(`/companies/${widget.company_id}/branches`);
            return res.data;
        },
        enabled: !!widget?.company_id && isNetworkWidget,
    });

    const { data: branch } = useQuery({
        queryKey: ['branch', activeBranchId],
        queryFn: async () => {
            const res = await api.get(`/branches/${activeBranchId}`);
            return res.data;
        },
        enabled: !!activeBranchId,
    });

    const { data: categories } = useQuery({
        queryKey: ['categories', activeBranchId],
        queryFn: async () => {
            const res = await api.get(`/branches/${activeBranchId}/categories`);
            return res.data;
        },
        enabled: !!activeBranchId,
    });

    const { data: allServices } = useQuery({
        queryKey: ['services', activeBranchId],
        queryFn: async () => {
            const res = await api.get(`/branches/${activeBranchId}/services`);
            return res.data;
        },
        enabled: !!activeBranchId,
    });

    const { data: employees } = useQuery({
        queryKey: ['employees', activeBranchId],
        queryFn: async () => {
            const res = await api.get(`/employees?branch_id=${activeBranchId}`);
            return res.data;
        },
        enabled: !!activeBranchId,
    });

    // Effects to initialize state based on widget
    useEffect(() => {
        if (widget) {
            if (widget.widget_type === 'network' && !selectedBranchId) {
                // If network has only one branch, auto-select it
                if (allBranches && allBranches.length === 1) {
                    setSelectedBranchId(allBranches[0].id);
                    setView('home');
                } else {
                    setView('branches');
                }
            } else if (widget.widget_type === 'branch' && widget.branch_id) {
                setSelectedBranchId(widget.branch_id);
                setView('home');
            } else if (widget.widget_type === 'master' && widget.employee_id) {
                setSelectedBranchId(widget.branch_id);
                setView('home');
            }
        }
    }, [widget, allBranches, selectedBranchId]);

    // Auto-select master if it's a master widget
    useEffect(() => {
        if (widget?.widget_type === 'master' && widget.employee_id && employees && !selectedEmployee) {
            const emp = employees.find((e: any) => e.id === widget.employee_id);
            if (emp) setSelectedEmployee(emp);
        }
    }, [widget, employees, selectedEmployee]);

    // Group services (Categorized vs Uncategorized)
    const groupedServices = useMemo(() => {
        if (!allServices) return [];
        
        const groups: any[] = [];
        const categorizedServiceIds = new Set();

        // 1. Process explicit categories
        if (categories) {
            categories.forEach((cat: any) => {
                if (cat.services && cat.services.length > 0) {
                    groups.push({
                        id: cat.id,
                        name: cat.name,
                        services: cat.services
                    });
                    cat.services.forEach((s: any) => categorizedServiceIds.add(s.id));
                }
            });
        }

        // 2. Process uncategorized services
        const uncategorized = allServices.filter((s: any) => !categorizedServiceIds.has(s.id));
        if (uncategorized.length > 0) {
            groups.push({
                id: 'other',
                name: 'Услуги',
                services: uncategorized
            });
        }

        return groups;
    }, [categories, allServices]);

    const totalDuration = useMemo(() => {
        return selectedServices.reduce((sum, s) => sum + (s.duration_minutes || s.duration || 0), 0);
    }, [selectedServices]);

    const totalPrice = useMemo(() => {
        return selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);
    }, [selectedServices]);

    const isEmployeeCompatible = (emp: any) => {
        if (selectedServices.length === 0) return true;
        
        // Check if the employee provides ALL selected services
        // Based on service.employees relation fetched in groupedServices data
        return selectedServices.every(svc => 
            svc.employees?.some((e: any) => e.employee_id === emp.id)
        );
    };

    // Query for slots of a specific employee
    const { data: specificEmployeeSlots, isLoading: isLoadingSpecificSlots } = useQuery({
        queryKey: ['slots', selectedEmployee?.id, selectedDate],
        queryFn: async () => {
            if (!selectedEmployee?.id) return [];
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const res = await api.get(`/slots?employee_id=${selectedEmployee.id}&date=${dateStr}&service_id=${selectedServices[0]?.id || 0}`);
            return res.data?.map((s: any) => ({
                ...s,
                start_time: s.start_time.replace('Z', ''),
                end_time: s.end_time.replace('Z', '')
            })) || [];
        },
        enabled: !!selectedEmployee?.id && !!selectedDate,
    });

    // Query for slots of ALL employees (for "Any" mode)
    // Only query slots for employees that provide the selected services
    const compatibleEmployees = (employees || []).filter((emp: any) => isEmployeeCompatible(emp));
    const allEmployeeSlotQueries = useQueries({
        queries: compatibleEmployees.map((emp: any) => ({
            queryKey: ['slots', emp.id, selectedDate],
            queryFn: async () => {
                const dateStr = format(selectedDate, 'yyyy-MM-dd');
                const res = await api.get(`/slots?employee_id=${emp.id}&date=${dateStr}&service_id=${selectedServices[0]?.id || 0}`);
                return res.data?.map((s: any) => ({
                    ...s,
                    start_time: s.start_time.replace('Z', ''),
                    end_time: s.end_time.replace('Z', ''),
                    employee_id: emp.id // Inject employee_id here so we know who provides this slot!
                })) || [];
            },
            enabled: !selectedEmployee?.id && !!selectedDate && !!employees,
        })),
    });

    const isLoadingAggregatedSlots = allEmployeeSlotQueries.some(q => q.isLoading);
    const isLoadingSlots = isLoadingSpecificSlots || isLoadingAggregatedSlots;

    // Duration-aware slot filtering and aggregation
    const availableSlots = useMemo(() => {
        const slotDuration = 30; // Assuming 30 min slots from backend
        const neededSlots = Math.ceil((totalDuration || 30) / slotDuration);

        // 1. Determine which raw slot lists to use
        let rawSlotLists: any[][] = [];
        if (selectedEmployee) {
            if (specificEmployeeSlots) rawSlotLists = [specificEmployeeSlots];
        } else if (allEmployeeSlotQueries.length > 0) {
            rawSlotLists = allEmployeeSlotQueries
                .map(q => q.data as any[])
                .filter(data => !!data && data.length > 0);
        }

        if (rawSlotLists.length === 0) return [];

        // 2. Process each employee's slots
        const processedPerEmployee = rawSlotLists.map(slots => {
            const filtered: any[] = [];
            for (let i = 0; i <= slots.length - neededSlots; i++) {
                let possible = true;
                for (let j = 0; j < neededSlots; j++) {
                    if (!slots[i + j].is_free) {
                        possible = false;
                        break;
                    }
                }
                if (possible) {
                    filtered.push({
                        ...slots[i],
                        end_time: slots[i + neededSlots - 1].end_time,
                        employee_id: slots[i].employee_id || selectedEmployee?.id // Keep track of who provides it
                    });
                }
            }
            return filtered;
        });

        // 3. Aggregate: a slot (starting at time T) is available if AT LEAST ONE employee has it
        const aggregatedMap = new Map<string, any>();
        processedPerEmployee.forEach(empSlots => {
            empSlots.forEach(slot => {
                const timeKey = slot.start_time;
                // If we don't have this time, or if we want to potentially track MULTIPLE employees for a slot,
                // we'll just keep the first one we find for now (as the user just needs any specialist).
                if (!aggregatedMap.has(timeKey)) {
                    aggregatedMap.set(timeKey, slot);
                }
            });
        });

        return Array.from(aggregatedMap.values()).sort((a, b) => 
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        );
    }, [specificEmployeeSlots, allEmployeeSlotQueries, totalDuration, selectedEmployee]);

    // Mutations
    const bookingMutation = useMutation({
        mutationFn: (data: any) => api.post('/bookings', data),
        onSuccess: () => {
            setView('success' as any);
            toast.success('Запись успешно создана!');
            if (window.parent) {
                window.parent.postMessage({ type: 'booking_success', branchId: activeBranchId }, '*');
            }
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error || 'Ошибка при бронировании');
        },
    });

    const createCustomerMutation = useMutation({
        mutationFn: (data: any) => api.post('/customers', data),
    });

    const handleBooking = async () => {
        if (!guestName || !guestPhone) {
            toast.error('Пожалуйста, заполните имя и телефон');
            return;
        }

        try {
            const customerRes = await createCustomerMutation.mutateAsync({
                first_name: guestName,
                phone: guestPhone,
                branch_id: Number(activeBranchId),
                email: '', 
            });

            // If no specialist was selected ("Any"), we must assign one that fits the slot
            let finalEmployeeId = selectedEmployee?.id;
            if (!finalEmployeeId && selectedSlot) {
                // Find who provides the current slot
                finalEmployeeId = selectedSlot.employee_id;
            }

            if (!finalEmployeeId) {
                toast.error('Не удалось определить специалиста для выбранного времени');
                return;
            }

            bookingMutation.mutate({
                company_id: Number(branch.company_id),
                employee_id: finalEmployeeId,
                start_time: format(new Date(selectedSlot.start_time), "yyyy-MM-dd'T'HH:mm:ss"),
                end_time: format(new Date(selectedSlot.end_time), "yyyy-MM-dd'T'HH:mm:ss"),
                client_id: customerRes.data.id,
                comment: 'Widget booking',
                total_price: totalPrice,
                services: selectedServices.map(s => ({
                    service_id: s.id,
                    price: s.price,
                    duration_minutes: s.duration_minutes || s.duration
                }))
            });
        } catch (err: any) {
            toast.error('Ошибка при создании клиента: ' + (err.response?.data?.error || err.message));
        }
    };

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [view]);

    if (view as any === 4 || view as any === 'success') {
        return (
            <div className="flex items-center justify-center p-4 min-h-[400px]">
                <div className="text-center p-6 w-full">
                    <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold">Вы успешно записаны!</h2>
                    <p className="mt-2 text-neutral-600 text-sm">
                        Ждем вас в <strong>{branch?.name}</strong>.<br />
                        {selectedSlot && format(new Date(selectedSlot.start_time), 'd MMMM, HH:mm', { locale: ru })}
                    </p>
                    <Button 
                        className="mt-6 w-full h-12" 
                        style={{ backgroundColor: accentColor }}
                        onClick={() => {
                            setView('home');
                            setView('home');
                            setSelectedServices([]);
                            setSelectedEmployee(null);
                            setSelectedSlot(null);
                        }}
                    >
                        Записаться еще
                    </Button>
                </div>
            </div>
        );
    }

    if (isLoadingWidget) {
        return <div className="min-h-screen flex items-center justify-center bg-white"><div className="animate-spin h-8 w-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full" /></div>;
    }

    if (!widget) {
        return <div className="min-h-screen flex items-center justify-center bg-white"><p className="text-neutral-500">Виджет не найден</p></div>;
    }

    return (
        <div className="max-w-md mx-auto min-h-screen flex flex-col transition-colors duration-500" style={{ backgroundColor: bgColor }}>
            {/* Header / Branch Info */}
            <div className="p-6 border-b border-black/5 flex items-center justify-between">
                {view !== 'branches' && isNetworkWidget && (
                    <Button variant="ghost" size="icon" className="mr-2 -ml-2" onClick={() => setView('branches')}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                )}
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-neutral-900">
                        {view === 'branches' ? widget.Company?.name || 'Сеть филиалов' : branch?.name || 'Загрузка...'}
                    </h1>
                    {view !== 'branches' && <p className="text-xs text-neutral-500 mt-0.5">{branch?.address}</p>}
                </div>
                <div className="h-10 w-10 shrink-0 rounded-full bg-black/5 flex items-center justify-center overflow-hidden">
                    {widget.Company?.logo_url ? <img src={widget.Company.logo_url} alt="" className="h-full w-full object-cover" /> : <User className="h-5 w-5 text-neutral-400" />}
                </div>
            </div>

            <div className="flex-1 p-4">
                {view === 'branches' && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold">Выберите филиал</h2>
                        <div className="space-y-3">
                            {allBranches?.map((b: any) => (
                                <div 
                                    key={b.id}
                                    onClick={() => {
                                        setSelectedBranchId(b.id);
                                        setView('home');
                                    }}
                                    className="p-5 rounded-2xl bg-white border border-black/5 shadow-sm cursor-pointer hover:border-black/10 transition-colors flex items-center justify-between"
                                >
                                    <div>
                                        <h3 className="font-bold">{b.name}</h3>
                                        <p className="text-xs text-neutral-500 mt-1">{b.address}</p>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-neutral-300" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {view === 'home' && (
                    <div className="space-y-3">
                        {/* Specialist Selection Row - Hide if master widget */}
                        {widget?.widget_type !== 'master' && (
                            <div 
                                onClick={() => setView('specialist')}
                                className="flex items-center justify-between p-4 rounded-2xl bg-white border border-neutral-100 shadow-sm cursor-pointer hover:border-neutral-200"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`h-12 w-12 rounded-full flex items-center justify-center overflow-hidden ${selectedEmployee ? 'bg-neutral-50 border border-neutral-100' : 'bg-transparent border-2 border-dashed border-neutral-200'}`}>
                                        {selectedEmployee?.avatar_url ? (
                                            <img src={selectedEmployee.avatar_url} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <User className={`h-6 w-6 ${selectedEmployee ? 'text-neutral-400' : 'text-neutral-300'}`} />
                                        )}
                                    </div>
                                    <span className={`font-medium ${selectedEmployee ? 'text-neutral-900' : 'text-neutral-700'}`}>
                                        {selectedEmployee ? selectedEmployee.name : 'Выбрать специалиста'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {selectedEmployee && <button onClick={(e) => { e.stopPropagation(); setSelectedEmployee(null); }} className="text-neutral-300">×</button>}
                                    <ChevronRight className="h-5 w-5 text-neutral-300" />
                                </div>
                            </div>
                        )}

                        {/* Services Selection Row */}
                        <div 
                            onClick={() => setView('services')}
                            className="flex items-center justify-between p-4 rounded-2xl bg-white border border-neutral-100 shadow-sm cursor-pointer hover:border-neutral-200"
                        >
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-neutral-50 flex items-center justify-center">
                                    <Clock className="h-6 w-6 text-neutral-400" />
                                </div>
                                <span className={`font-medium ${selectedServices.length > 0 ? 'text-neutral-900' : 'text-neutral-700'}`}>
                                    {selectedServices.length > 0 
                                        ? `${selectedServices.length} услуг • ${totalPrice} BYN` 
                                        : 'Выбрать услуги'}
                                </span>
                            </div>
                            <ChevronRight className="h-5 w-5 text-neutral-300" />
                        </div>

                        {/* DateTime Selection Row */}
                        <div 
                            onClick={() => {
                                setView('datetime');
                            }}
                            className={`flex items-center justify-between p-4 rounded-2xl bg-white border border-neutral-100 shadow-sm cursor-pointer hover:border-neutral-200`}
                        >
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-neutral-50 flex items-center justify-center">
                                    <CalendarIcon className="h-6 w-6 text-neutral-400" />
                                </div>
                                <span className="font-medium text-neutral-700">
                                    {selectedSlot 
                                        ? format(new Date(selectedSlot.start_time), 'd MMMM, HH:mm', { locale: ru }) 
                                        : (selectedDate ? format(selectedDate, 'd MMMM', { locale: ru }) : 'Выбрать дату и время')}
                                </span>
                            </div>
                            <ChevronRight className="h-5 w-5 text-neutral-300" />
                        </div>

                        {selectedSlot && (
                            <Button 
                                className={`w-full mt-8 h-14 rounded-2xl text-lg font-bold shadow-lg ${settings.buttonAnimation !== false ? (settings.animationType || 'th-pulse') : ''}`}
                                style={{ backgroundColor: accentColor }}
                                onClick={() => setView('profile')}
                            >
                                Перейти к оформлению
                            </Button>
                        )}
                    </div>
                )}

                {view === 'specialist' && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Button variant="ghost" size="icon" onClick={() => setView('home')}>
                                <ChevronLeft className="h-6 w-6" />
                            </Button>
                            <h2 className="text-xl font-bold">Выбрать специалиста</h2>
                        </div>

                        {widget?.widget_type !== 'master' && (
                            <div 
                                onClick={() => { setSelectedEmployee(null); setView('home'); }}
                                className={`flex items-center justify-between p-4 rounded-2xl bg-white border cursor-pointer ${!selectedEmployee ? 'border-neutral-900' : 'border-neutral-100'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-neutral-50 flex items-center justify-center">
                                        <User className="h-6 w-6 text-neutral-400" />
                                    </div>
                                    <span className="font-medium">Любой специалист</span>
                                </div>
                                <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${!selectedEmployee ? 'border-black' : 'border-neutral-200'}`}>
                                    {!selectedEmployee && <div className="h-2.5 w-2.5 rounded-full bg-black" />}
                                </div>
                            </div>
                        )}

                        {employees?.filter((emp: any) => widget?.widget_type !== 'master' || emp.id === widget.employee_id).map((emp: any) => {
                            const isCompatible = isEmployeeCompatible(emp);
                            return (
                                <div key={emp.id} className={`space-y-3 ${!isCompatible ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <div 
                                        onClick={() => { setSelectedEmployee(emp); setView('home'); }}
                                        className={`flex items-center justify-between p-4 rounded-2xl bg-white border cursor-pointer hover:border-neutral-300 ${selectedEmployee?.id === emp.id ? 'border-neutral-900' : 'border-neutral-100'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-full bg-neutral-100 overflow-hidden">
                                                {emp.avatar_url ? <img src={emp.avatar_url} alt="" className="h-full w-full object-cover" /> : <User className="h-full w-full p-3 text-neutral-400" />}
                                            </div>
                                            <div>
                                                <p className="font-bold">{emp.name}</p>
                                                <p className="text-xs text-neutral-500">{emp.position}</p>
                                                <div className="flex items-center gap-1 mt-1 text-orange-400">
                                                    {'★'.repeat(5)} <span className="text-neutral-400 text-[10px] ml-1">42 отзыва</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="h-8 w-8 rounded-full border border-neutral-100 flex items-center justify-center">
                                                <span className="text-xs text-neutral-400">i</span>
                                            </div>
                                            <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${selectedEmployee?.id === emp.id ? 'border-black' : 'border-neutral-200'}`}>
                                                {selectedEmployee?.id === emp.id && <div className="h-2.5 w-2.5 rounded-full bg-black" />}
                                            </div>
                                        </div>
                                    </div>
                                    {isCompatible && (
                                        <div className="px-1">
                                            <p className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider mb-2">Ближайшее время: сегодня</p>
                                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                                {['11:00', '11:30', '12:00', '12:30', '13:00'].map(t => (
                                                    <div 
                                                        key={t} 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedEmployee(emp);
                                                            // Logic to select this slot would go here if we had full date context
                                                            setView('home');
                                                        }}
                                                        className="px-3 py-1.5 rounded-lg bg-neutral-50 border border-neutral-100 text-sm font-medium whitespace-nowrap cursor-pointer hover:border-neutral-300"
                                                    >
                                                        {t}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {!isCompatible && (
                                        <p className="text-[10px] text-red-400 font-medium px-1">Не оказывает выбранные услуги</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {view === 'services' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={() => setView('home')}>
                                    <ChevronLeft className="h-6 w-6" />
                                </Button>
                                <h2 className="text-xl font-bold">Выбрать услуги</h2>
                            </div>
                            {selectedServices.length > 0 && (
                                <button onClick={() => setSelectedServices([])} className="text-xs text-neutral-400 hover:text-neutral-600">Очистить</button>
                            )}
                        </div>

                        <div className="space-y-4">
                            {groupedServices.map((group: any) => (
                                <div key={group.id} className="space-y-2">
                                    <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-2">{group.name}</h3>
                                    <div className="grid gap-2">
                                        {group.services?.map((svc: any) => {
                                            const isSelected = selectedServices.some(s => s.id === svc.id);
                                            return (
                                                <div
                                                    key={svc.id}
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setSelectedServices(prev => prev.filter(s => s.id !== svc.id));
                                                        } else {
                                                            setSelectedServices(prev => [...prev, svc]);
                                                        }
                                                    }}
                                                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                                                        isSelected ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-100 bg-white hover:border-neutral-200'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`h-6 w-6 rounded-lg border flex items-center justify-center transition-colors ${isSelected ? 'bg-black border-black text-white' : 'border-neutral-200'}`}>
                                                            {isSelected && <span className="text-xs">✓</span>}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm">{svc.name}</p>
                                                            <p className="text-[10px] text-neutral-500 mt-0.5">{svc.price} BYN • {svc.duration_minutes || svc.duration} мин</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {selectedServices.length > 0 && (
                            <div className="sticky bottom-4 left-0 right-0">
                                <Button 
                                    className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl flex items-center justify-between px-6"
                                    style={{ backgroundColor: accentColor }}
                                    onClick={() => setView('home')}
                                >
                                    <span>Выбрать</span>
                                    <span>{totalPrice} BYN</span>
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {view === 'datetime' && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Button variant="ghost" size="icon" onClick={() => setView('home')}>
                                <ChevronLeft className="h-6 w-6" />
                            </Button>
                            <h2 className="text-xl font-bold">Дата и время</h2>
                        </div>

                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(d) => d && setSelectedDate(d)}
                            locale={ru}
                            className="rounded-2xl border border-neutral-100 p-4 bg-white shadow-sm"
                            required
                        />

                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-neutral-900">Свободные окна</h3>
                            <div className="grid grid-cols-4 gap-2">
                                {availableSlots.map((slot: any, i: number) => (
                                    <Button
                                        key={i}
                                        variant={selectedSlot === slot ? 'default' : 'outline'}
                                        className={`h-11 rounded-xl text-sm font-medium ${
                                            selectedSlot === slot ? '' : 'border-neutral-100 bg-white hover:bg-neutral-50'
                                        }`}
                                        style={selectedSlot === slot ? { backgroundColor: accentColor } : {}}
                                        onClick={() => {
                                            setSelectedSlot(slot);
                                            setView('home');
                                        }}
                                    >
                                        {format(new Date(slot.start_time), 'HH:mm')}
                                    </Button>
                                ))}
                            </div>
                            {isLoadingSlots && <p className="text-center text-xs text-neutral-400 py-4">Поиск свободных мест...</p>}
                            {!availableSlots.length && !isLoadingSlots && (
                                <div className="text-center py-8 rounded-2xl border-2 border-dashed border-neutral-100">
                                    <p className="text-sm text-neutral-400">На этот день нет подходящих окон</p>
                                    <p className="text-[10px] text-neutral-300 mt-1">Попробуйте другую дату или сократите список услуг</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {view === 'profile' && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Button variant="ghost" size="icon" onClick={() => setView('home')}>
                                <ChevronLeft className="h-6 w-6" />
                            </Button>
                            <h2 className="text-xl font-bold">Оформление</h2>
                        </div>

                        <div className="p-5 rounded-3xl bg-neutral-900 text-white space-y-4 shadow-xl">
                            <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                <div>
                                    <p className="text-[10px] text-white/50 uppercase tracking-widest mb-1">Мастер</p>
                                    <p className="font-bold">{selectedEmployee?.name || 'Любой специалист'}</p>
                                </div>
                                <div className="h-10 w-10 rounded-full border border-white/20 flex items-center justify-center">
                                    <User className="h-5 w-5" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] text-white/50 uppercase tracking-widest">Услуги</p>
                                {selectedServices.map(s => (
                                    <div key={s.id} className="flex justify-between text-sm">
                                        <span>{s.name}</span>
                                        <span className="font-bold">{s.price} BYN</span>
                                    </div>
                                ))}
                                <div className="pt-2 border-t border-white/10 flex justify-between font-bold text-lg">
                                    <span>Итого</span>
                                    <span>{totalPrice} BYN</span>
                                </div>
                            </div>
                            <div className="pt-2">
                                <p className="text-[10px] text-white/50 uppercase tracking-widest mb-1">Дата и время</p>
                                <p className="font-bold text-blue-400">
                                    {selectedSlot && format(new Date(selectedSlot.start_time), 'd MMMM, HH:mm', { locale: ru })}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4 mt-8">
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-sm font-bold text-neutral-700 ml-1">Телефон</Label>
                                <Input
                                    id="phone"
                                    placeholder="+375 (__) ___-__-__"
                                    className="h-14 rounded-2xl border-neutral-100 bg-neutral-50 px-5 text-lg"
                                    value={guestPhone}
                                    onChange={(e) => setGuestPhone(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-sm font-bold text-neutral-700 ml-1">Ваше имя</Label>
                                <Input
                                    id="name"
                                    placeholder="Как к вам обращаться?"
                                    className="h-14 rounded-2xl border-neutral-100 bg-neutral-50 px-5 text-lg"
                                    value={guestName}
                                    onChange={(e) => setGuestName(e.target.value)}
                                />
                            </div>
                            
                            <Button 
                                className="w-full h-16 rounded-2xl text-xl font-bold shadow-2xl mt-4" 
                                style={{ backgroundColor: accentColor }}
                                onClick={handleBooking} 
                                disabled={bookingMutation.isPending || createCustomerMutation.isPending}
                            >
                                {(bookingMutation.isPending || createCustomerMutation.isPending) ? 'Бронирование...' : 'Записаться'}
                            </Button>
                            
                            <p className="text-center text-[10px] text-neutral-400 px-8">
                                Нажимая «Записаться», вы подтверждаете согласие на обработку персональных данных
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
