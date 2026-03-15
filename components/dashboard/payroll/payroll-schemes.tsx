'use client';

import { useState, useEffect } from 'react';
import { useBranch } from '@/context/branch-context';
import { payrollApi, PayrollSchemeDetails, EmployeePayrollScheme } from '@/lib/api/payroll';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Plus, Save, Trash2, Users } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface Employee {
    id: number;
    user_id: number;
    name: string;
    position: string;
}

export function PayrollSchemes() {
    const { selectedBranchID } = useBranch();
    const [schemes, setSchemes] = useState<PayrollSchemeDetails[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [employeeAssignments, setEmployeeAssignments] = useState<EmployeePayrollScheme[]>([]);
    
    const [selectedSchemeID, setSelectedSchemeID] = useState<number | null>(null);
    const [activeScheme, setActiveScheme] = useState<PayrollSchemeDetails | null>(null);
    const [assignedEmployeeIDs, setAssignedEmployeeIDs] = useState<number[]>([]);
    const [assignmentValidFrom, setAssignmentValidFrom] = useState<string>(new Date().toISOString().slice(0, 10));
    const [employeeDates, setEmployeeDates] = useState<Record<number, string>>({});

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!selectedBranchID) return;
        loadData();
    }, [selectedBranchID]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [schemesRes, empRes, assignmentsRes] = await Promise.all([
                payrollApi.getSchemes(Number(selectedBranchID)),
                api.get(`/employees?branch_id=${selectedBranchID}`),
                payrollApi.getEmployeeSchemes(Number(selectedBranchID))
            ]);
            setSchemes(schemesRes.data || []);
            setEmployees(empRes.data || []);
            setEmployeeAssignments(assignmentsRes.data || []);
        } catch (error) {
            console.error(error);
            toast.error('Ошибка загрузки данных схем');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectScheme = (id: number) => {
        setSelectedSchemeID(id);
        const scheme = schemes.find(s => s.scheme.id === id);
        if (scheme) {
            setActiveScheme(JSON.parse(JSON.stringify(scheme))); // deep copy
            const assigned = employeeAssignments
                .filter(a => a.scheme_id === id);
            
            setAssignedEmployeeIDs(assigned.map(a => a.employee_id));
            
            const dates: Record<number, string> = {};
            assigned.forEach(a => {
                if (a.valid_from) {
                    dates[a.employee_id] = new Date(a.valid_from).toISOString().slice(0, 10);
                }
            });
            setEmployeeDates(dates);
        }
    };

    const handleCreateNew = () => {
        setSelectedSchemeID(0);
        setActiveScheme({
            scheme: { id: 0, branch_id: Number(selectedBranchID), name: 'Новая схема', scheme_type: 'master' },
            rule: {
                id: 0, scheme_id: 0, base_salary_type: 'none', base_salary_amount: 0,
                guaranteed_minimum_type: 'none', guaranteed_minimum_amount: 0,
                service_percentage: 0, product_percentage: 0, deduct_materials: false,
                max_discount_impact: 100, company_revenue_percentage: 0, only_own_shifts: false
            },
            exceptions: []
        });
        setAssignedEmployeeIDs([]);
        setEmployeeDates({});
    };

    const handleSave = async () => {
        if (!activeScheme || !selectedBranchID) return;
        setIsSaving(true);
        try {
            let savedId = activeScheme.scheme.id;
            if (activeScheme.scheme.id === 0) {
                const res = await payrollApi.createScheme(Number(selectedBranchID), activeScheme);
                savedId = res.data.scheme.id;
                toast.success('Схема создана');
            } else {
                await payrollApi.updateScheme(Number(selectedBranchID), activeScheme.scheme.id, activeScheme);
                toast.success('Схема обновлена');
            }
            
            const assignmentsToSave = assignedEmployeeIDs.map(id => ({
                employee_id: id,
                valid_from: employeeDates[id] || assignmentValidFrom
            }));
            
            // Assign employees with Valid From date
            await payrollApi.assignSchemeToEmployees(Number(selectedBranchID), savedId, assignedEmployeeIDs, assignmentValidFrom, assignmentsToSave);
            
            await loadData();
            handleSelectScheme(savedId); // re-select
        } catch (error) {
            console.error(error);
            toast.error('Ошибка сохранения схемы');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!activeScheme || activeScheme.scheme.id === 0 || !selectedBranchID) return;
        if (!confirm('Вы уверены, что хотите удалить схему?')) return;
        
        setIsSaving(true);
        try {
            await payrollApi.deleteScheme(Number(selectedBranchID), activeScheme.scheme.id);
            toast.success('Схема удалена');
            setActiveScheme(null);
            setSelectedSchemeID(null);
            await loadData();
        } catch (error) {
            toast.error('Ошибка удаления схемы');
        } finally {
            setIsSaving(false);
        }
    };

    const toggleEmployee = (empId: number) => {
        setAssignedEmployeeIDs(prev => 
            prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
        );
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row gap-6">
            {/* Sidebar with schemes list */}
            <div className="w-full md:w-1/3 flex flex-col gap-4">
                <Button onClick={handleCreateNew} className="w-full gap-2 bg-neutral-900 text-white rounded-xl">
                    <Plus className="h-4 w-4" /> Создать схему
                </Button>
                
                <div className="flex flex-col gap-2">
                    {schemes.map(s => (
                        <button
                            key={s.scheme.id}
                            onClick={() => handleSelectScheme(s.scheme.id)}
                            className={`p-4 text-left rounded-xl transition-all border ${selectedSchemeID === s.scheme.id ? 'border-orange-500 ring-1 ring-orange-500 bg-orange-50 text-orange-900' : 'border-neutral-200 hover:border-neutral-300 bg-white'}`}
                        >
                            <div className="font-bold">{s.scheme.name}</div>
                            <div className="text-xs mt-1 text-neutral-500 opacity-80 truncate" title="Назначенные сотрудники">
                                {(() => {
                                    const assigned = employeeAssignments.filter(a => a.scheme_id === s.scheme.id);
                                    if (assigned.length === 0) return 'Нет сотрудников';
                                    const names = assigned.map(a => {
                                        const emp = employees.find(e => e.id === a.employee_id);
                                        return emp ? emp.name : '';
                                    }).filter(Boolean);
                                    const uniqueNames = Array.from(new Set(names));
                                    return uniqueNames.join(', ');
                                })()}
                            </div>
                        </button>
                    ))}
                    {schemes.length === 0 && (
                        <div className="text-center py-8 text-neutral-500 text-sm">Нет созданных схем</div>
                    )}
                </div>
            </div>

            {/* Main content area */}
            <div className="w-full md:w-2/3">
                {activeScheme ? (
                    <div className="space-y-8 bg-neutral-50/50 p-6 rounded-2xl border border-neutral-100">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold">
                                {activeScheme.scheme.id === 0 ? 'Новая схема' : 'Настройка схемы'}
                            </h2>
                            <div className="flex gap-2">
                                {activeScheme.scheme.id !== 0 && (
                                    <Button variant="outline" onClick={handleDelete} className="text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                                <Button onClick={handleSave} disabled={isSaving} className="gap-2 bg-black text-white hover:bg-neutral-800 rounded-xl">
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    Сохранить
                                </Button>
                            </div>
                        </div>

                        <div className="grid gap-6">
                            {/* General */}
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2 block">Название схемы</Label>
                                    <Input 
                                        value={activeScheme.scheme.name}
                                        onChange={e => setActiveScheme({...activeScheme, scheme: {...activeScheme.scheme, name: e.target.value}})}
                                        className="bg-white rounded-xl h-12"
                                        placeholder="Например: Барбер Senior"
                                    />
                                </div>
                            </div>

                            {/* Base Salary */}
                            <div className="bg-white p-5 rounded-xl border border-neutral-200 space-y-4 shadow-sm">
                                <h3 className="font-bold text-neutral-900">Окладная часть</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs mb-2 block text-neutral-500">Тип оклада</Label>
                                        <Select 
                                            value={activeScheme.rule.base_salary_type} 
                                            onValueChange={v => setActiveScheme({
                                                ...activeScheme, 
                                                rule: {...activeScheme.rule, base_salary_type: v}
                                            })}
                                        >
                                            <SelectTrigger className="h-10 rounded-lg">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Без оклада</SelectItem>
                                                <SelectItem value="per_shift">За смену / выход</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="text-xs mb-2 block text-neutral-500">Сумма оклада (₽)</Label>
                                        <Input 
                                            type="number"
                                            value={activeScheme.rule.base_salary_amount}
                                            onChange={e => setActiveScheme({...activeScheme, rule: {...activeScheme.rule, base_salary_amount: parseFloat(e.target.value) || 0}})}
                                            className="h-10 rounded-lg"
                                            disabled={activeScheme.rule.base_salary_type === 'none'}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Percentages */}
                            <div className="bg-white p-5 rounded-xl border border-neutral-200 space-y-4 shadow-sm">
                                <h3 className="font-bold text-neutral-900">Процентная часть (Услуги/Товары)</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs mb-2 block text-neutral-500">Базовый % от услуг</Label>
                                        <Input 
                                            type="number"
                                            value={activeScheme.rule.service_percentage}
                                            onChange={e => setActiveScheme({...activeScheme, rule: {...activeScheme.rule, service_percentage: parseFloat(e.target.value) || 0}})}
                                            className="h-10 rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs mb-2 block text-neutral-500">Базовый % от товаров</Label>
                                        <Input 
                                            type="number"
                                            value={activeScheme.rule.product_percentage}
                                            onChange={e => setActiveScheme({...activeScheme, rule: {...activeScheme.rule, product_percentage: parseFloat(e.target.value) || 0}})}
                                            className="h-10 rounded-lg"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Guaranteed Minimum */}
                            <div className="bg-white p-5 rounded-xl border border-neutral-200 space-y-4 shadow-sm">
                                <h3 className="font-bold text-neutral-900">Гарантированный минимум (Гарант)</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs mb-2 block text-neutral-500">Тип гаранта</Label>
                                        <Select 
                                            value={activeScheme.rule.guaranteed_minimum_type} 
                                            onValueChange={v => setActiveScheme({
                                                ...activeScheme, 
                                                rule: {...activeScheme.rule, guaranteed_minimum_type: v}
                                            })}
                                        >
                                            <SelectTrigger className="h-10 rounded-lg">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Нет гаранта</SelectItem>
                                                <SelectItem value="per_shift">За смену</SelectItem>
                                                <SelectItem value="per_period">За расчетный период</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="text-xs mb-2 block text-neutral-500">Сумма гаранта (₽)</Label>
                                        <Input 
                                            type="number"
                                            value={activeScheme.rule.guaranteed_minimum_amount}
                                            onChange={e => setActiveScheme({...activeScheme, rule: {...activeScheme.rule, guaranteed_minimum_amount: parseFloat(e.target.value) || 0}})}
                                            className="h-10 rounded-lg"
                                            disabled={activeScheme.rule.guaranteed_minimum_type === 'none'}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Employee Assignment */}
                            <div className="bg-white p-5 rounded-xl border border-neutral-200 space-y-4 shadow-sm">
                                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                                    <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                                        <Users className="h-4 w-4" /> Назначить сотрудникам
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <Label className="text-xs text-neutral-500 whitespace-nowrap">Действует с:</Label>
                                        <Input 
                                            type="date" 
                                            value={assignmentValidFrom}
                                            onChange={(e) => setAssignmentValidFrom(e.target.value)}
                                            className="h-9 rounded-lg"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                    {employees.map(emp => {
                                        const isAssigned = assignedEmployeeIDs.includes(emp.id);
                                        const assignment = employeeAssignments.find(a => 
                                            a.employee_id === emp.id && 
                                            a.scheme_id === activeScheme.scheme.id
                                        );
                                        
                                        return (
                                            <div key={emp.id} className="flex flex-col md:flex-row md:items-center justify-between p-2 hover:bg-neutral-50 rounded-lg gap-2">
                                                <div className="flex items-center space-x-3">
                                                    <Checkbox 
                                                        id={`emp-${emp.id}`}
                                                        checked={isAssigned}
                                                        onCheckedChange={() => toggleEmployee(emp.id)}
                                                    />
                                                    <label htmlFor={`emp-${emp.id}`} className="text-sm font-medium leading-none cursor-pointer select-none">
                                                        {emp.name}
                                                        <span className="text-neutral-400 text-xs ml-2 font-normal">({emp.position})</span>
                                                    </label>
                                                </div>
                                                {isAssigned && (
                                                    <div className="flex items-center gap-2 pl-7 md:pl-0">
                                                        <span className="text-xs text-neutral-500">С</span>
                                                        <Input 
                                                            type="date"
                                                            className="h-8 w-[130px] text-xs px-2 rounded bg-white shadow-sm"
                                                            value={employeeDates[emp.id] || assignmentValidFrom}
                                                            onChange={(e) => setEmployeeDates(prev => ({...prev, [emp.id]: e.target.value}))}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {employees.length === 0 && <div className="text-sm text-neutral-500">Нет сотрудников</div>}
                                </div>
                            </div>

                        </div>
                    </div>
                ) : (
                    <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-neutral-400 border-2 border-dashed border-neutral-200 rounded-2xl">
                        <Users className="h-12 w-12 mb-4 opacity-20" />
                        <p>Выберите схему из списка слева</p>
                        <p className="text-sm mt-1">или создайте новую</p>
                    </div>
                )}
            </div>
        </div>
    );
}
