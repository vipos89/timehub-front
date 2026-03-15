'use client';

import { useState, useEffect } from 'react';
import { useBranch } from '@/context/branch-context';
import { payrollApi, PayrollPreview, PayrollStatement } from '@/lib/api/payroll';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, Calculator, CheckCircle2, Settings2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';

export function PayrollCalculation() {
    const { selectedBranchID } = useBranch();
    
    const [fromDate, setFromDate] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    });
    const [toDate, setToDate] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
    });

    const [previewData, setPreviewData] = useState<PayrollPreview[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Adjustments state
    const [adjustments, setAdjustments] = useState<Record<number, { bonus: number, penalty: number }>>({});
    const [activeEditId, setActiveEditId] = useState<number | null>(null);
    const [tempBonus, setTempBonus] = useState('');
    const [tempPenalty, setTempPenalty] = useState('');

    const handleCalculate = async () => {
        if (!selectedBranchID) return;
        setIsLoading(true);
        try {
            const res = await payrollApi.getPreview(Number(selectedBranchID), fromDate, toDate);
            setPreviewData(res.data || []);
            // Reset adjustments
            setAdjustments({});
            if (res.data?.length === 0) {
                toast.info('Нет данных для расчета за выбранный период');
            }
        } catch (error) {
            console.error('Failed to load payroll preview', error);
            toast.error('Не удалось рассчитать зарплату');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateStatement = async (employeeId: number) => {
        if (!selectedBranchID) return;
        setIsSubmitting(true);
        try {
            const preview = previewData.find(p => p.employee_id === employeeId);
            if (!preview) return;

            const adj = adjustments[employeeId] || { bonus: 0, penalty: 0 };
            const finalSalary = Math.max(0, preview.calculated_salary + adj.bonus - adj.penalty);

            const statement: PayrollStatement = {
                employee_id: employeeId,
                branch_id: Number(selectedBranchID),
                period_start: fromDate,
                period_end: toDate,
                calculated_salary: finalSalary, // backend will re-calculate, but we pass it anyway
                base_salary_calculated: preview.base_salary_calculated,
                percentage_calculated: preview.percentage_calculated,
                bonuses: adj.bonus,
                penalties: adj.penalty,
                services_count: preview.services_count,
                services_revenue: preview.services_revenue,
                work_days: preview.work_days,
                work_hours: preview.work_hours,
            };

            await payrollApi.createStatements(Number(selectedBranchID), [statement]);
            
            toast.success('Расчетная ведомость создана и сохранена');
            setPreviewData(prev => prev.filter(p => p.employee_id !== employeeId));
        } catch (error) {
            console.error('Failed to create statement', error);
            toast.error('Не удалось сохранить ведомости');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateAll = async () => {
        if (!selectedBranchID || previewData.length === 0) return;
        setIsSubmitting(true);
        try {
            const statements: PayrollStatement[] = previewData.map(preview => {
                const adj = adjustments[preview.employee_id] || { bonus: 0, penalty: 0 };
                const finalSalary = Math.max(0, preview.calculated_salary + adj.bonus - adj.penalty);
                return {
                    employee_id: preview.employee_id,
                    branch_id: Number(selectedBranchID),
                    period_start: fromDate,
                    period_end: toDate,
                    calculated_salary: finalSalary,
                    base_salary_calculated: preview.base_salary_calculated,
                    percentage_calculated: preview.percentage_calculated,
                    bonuses: adj.bonus,
                    penalties: adj.penalty,
                    services_count: preview.services_count,
                    services_revenue: preview.services_revenue,
                    work_days: preview.work_days,
                    work_hours: preview.work_hours,
                };
            });

            await payrollApi.createStatements(Number(selectedBranchID), statements);
            toast.success(`Создано ведомостей: ${statements.length}`);
            setPreviewData([]);
        } catch (error) {
            console.error('Failed to create statements', error);
            toast.error('Не удалось сохранить ведомости');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (empId: number) => {
        setActiveEditId(empId);
        const adj = adjustments[empId] || { bonus: 0, penalty: 0 };
        setTempBonus(adj.bonus.toString());
        setTempPenalty(adj.penalty.toString());
    };

    const saveAdjustments = () => {
        if (activeEditId !== null) {
            setAdjustments(prev => ({
                ...prev,
                [activeEditId]: {
                    bonus: parseFloat(tempBonus) || 0,
                    penalty: parseFloat(tempPenalty) || 0,
                }
            }));
        }
        setActiveEditId(null);
    };

    const activePreview = activeEditId ? previewData.find(p => p.employee_id === activeEditId) : null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                <div className="flex flex-wrap items-end gap-3">
                    <div>
                        <span className="text-xs uppercase tracking-widest text-neutral-400 font-bold mb-1 block">Период с</span>
                        <Input 
                            type="date" 
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="w-[160px] cursor-pointer bg-neutral-50 h-10 rounded-xl"
                        />
                    </div>
                    <div>
                        <span className="text-xs uppercase tracking-widest text-neutral-400 font-bold mb-1 block">по</span>
                        <Input 
                            type="date" 
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="w-[160px] cursor-pointer bg-neutral-50 h-10 rounded-xl"
                        />
                    </div>
                    <Button onClick={handleCalculate} disabled={isLoading} className="gap-2 shrink-0 bg-neutral-900 text-white hover:bg-neutral-800 rounded-xl h-10">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
                        Запустить расчет
                    </Button>
                </div>
                
                {previewData.length > 0 && (
                    <Button onClick={handleCreateAll} disabled={isSubmitting} className="gap-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl h-10 border-0">
                        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                        Начислить всем ({previewData.length})
                    </Button>
                )}
            </div>

            <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 uppercase text-[10px] font-bold tracking-widest">
                        <tr>
                            <th className="px-6 py-4">Сотрудник</th>
                            <th className="px-6 py-4 text-center">Оказано услуг</th>
                            <th className="px-6 py-4 text-right">Выручка (₽)</th>
                            <th className="px-6 py-4 text-right">Расчет по схеме (₽)</th>
                            <th className="px-6 py-4 text-right">Корректировки (₽)</th>
                            <th className="px-6 py-4 text-right bg-orange-50/50 text-orange-900">Итого ЗП (₽)</th>
                            <th className="px-6 py-4 text-center">Действия</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {previewData.length > 0 ? (
                            previewData.map((preview) => {
                                const adj = adjustments[preview.employee_id] || { bonus: 0, penalty: 0 };
                                const adjTotal = adj.bonus - adj.penalty;
                                const finalSalary = Math.max(0, preview.calculated_salary + adjTotal);
                                
                                return (
                                <tr key={preview.employee_id} className="hover:bg-neutral-50/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-neutral-900">
                                        {preview.name}
                                    </td>
                                    <td className="px-6 py-4 text-center text-neutral-500">
                                        {preview.services_count}
                                    </td>
                                    <td className="px-6 py-4 text-right text-neutral-500">
                                        {preview.services_revenue.toLocaleString('ru-RU')} ₽
                                    </td>
                                    <td className="px-6 py-4 text-right text-neutral-600">
                                        {preview.calculated_salary.toLocaleString('ru-RU')} ₽
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 group">
                                            <span className={`font-medium ${adjTotal > 0 ? 'text-green-600' : adjTotal < 0 ? 'text-red-500' : 'text-neutral-400'}`}>
                                                {adjTotal > 0 ? '+' : ''}{adjTotal !== 0 ? adjTotal.toLocaleString('ru-RU') : '0'} ₽
                                            </span>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => openEditModal(preview.employee_id)}
                                            >
                                                <Settings2 className="h-4 w-4 text-neutral-500" />
                                            </Button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-lg bg-orange-50/30 text-orange-950">
                                        {finalSalary.toLocaleString('ru-RU')} ₽
                                    </td>
                                    <td className="px-6 py-4 text-center flex justify-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openEditModal(preview.employee_id)}
                                            className="rounded-lg h-8 px-2 border-neutral-200 text-neutral-600"
                                            title="Детализация и корректировки"
                                        >
                                            <Settings2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() => handleCreateStatement(preview.employee_id)}
                                            disabled={isSubmitting}
                                            className="rounded-lg h-8 gap-2 bg-neutral-900 text-white"
                                        >
                                            <CheckCircle2 className="h-4 w-4" />
                                            Начислить
                                        </Button>
                                    </td>
                                </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-neutral-500">
                                    Нажмите «Запустить расчет», чтобы увидеть данные за период.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Editing Modal */}
            <Dialog open={activeEditId !== null} onOpenChange={(open) => !open && setActiveEditId(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Детализация и корректировки</DialogTitle>
                    </DialogHeader>
                    {activePreview && (
                        <div className="space-y-6 pt-4">
                            {/* Breakdown */}
                            <div className="space-y-3 bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">Расчет по схеме</h4>
                                <div className="flex justify-between text-sm">
                                    <span className="text-neutral-600">Окладная часть / Гарант:</span>
                                    <span className="font-medium">{activePreview.base_salary_calculated.toLocaleString('ru-RU')} ₽</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-neutral-600">Проценты за услуги:</span>
                                    <span className="font-medium">{activePreview.percentage_calculated.toLocaleString('ru-RU')} ₽</span>
                                </div>
                                <div className="pt-2 border-t border-neutral-200 flex justify-between font-bold">
                                    <span>Итого по схеме:</span>
                                    <span>{activePreview.calculated_salary.toLocaleString('ru-RU')} ₽</span>
                                </div>
                            </div>

                            {/* Manual Adjustments */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-neutral-500">Ручные корректировки</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-neutral-600 text-sm mb-1 block">Премия (+₽)</Label>
                                        <Input 
                                            type="number" 
                                            value={tempBonus} 
                                            onChange={e => setTempBonus(e.target.value)}
                                            className="border-green-200 focus-visible:ring-green-500"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-neutral-600 text-sm mb-1 block">Штраф (-₽)</Label>
                                        <Input 
                                            type="number" 
                                            value={tempPenalty} 
                                            onChange={e => setTempPenalty(e.target.value)}
                                            className="border-red-200 focus-visible:ring-red-500"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setActiveEditId(null)}>Отмена</Button>
                        <Button onClick={saveAdjustments} className="bg-black text-white">Сохранить</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
