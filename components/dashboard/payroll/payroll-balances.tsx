'use client';

import { useState, useEffect } from 'react';
import { useBranch } from '@/context/branch-context';
import { payrollApi, PayrollBalance, PayrollPayout } from '@/lib/api/payroll';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, DollarSign } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';

interface Employee {
    id: number;
    first_name: string;
    last_name: string;
    specialization: string;
}

export function PayrollBalances() {
    const { selectedBranchID } = useBranch();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [balances, setBalances] = useState<PayrollBalance[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [payoutAmount, setPayoutAmount] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchData = async () => {
        if (!selectedBranchID) return;
        setIsLoading(true);
        try {
            const [empRes, balRes] = await Promise.all([
                api.get(`/employees?branch_id=${selectedBranchID}`),
                payrollApi.getBalances(Number(selectedBranchID)),
            ]);

            setEmployees(empRes.data || []);
            setBalances(balRes.data || []);
        } catch (error) {
            console.error('Failed to load payroll balances', error);
            toast.error('Не удалось загрузить взаиморасчеты');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedBranchID]);

    const handleOpenPayout = (employeeId: number) => {
        const emp = employees.find(e => e.id === employeeId);
        if (emp) {
            setSelectedEmployee(emp);
            const balance = balances.find(b => b.employee_id === emp.id)?.balance || 0;
            setPayoutAmount(balance > 0 ? balance.toString() : '');
            setIsPayoutModalOpen(true);
        }
    };

    const handlePayoutSubmit = async () => {
        if (!selectedBranchID || !selectedEmployee || !payoutAmount) return;
        setIsSubmitting(true);
        try {
            const payout: PayrollPayout = {
                employee_id: selectedEmployee.id,
                branch_id: Number(selectedBranchID),
                amount: parseFloat(payoutAmount),
            };
            await payrollApi.createPayout(payout);
            toast.success('Выплата зафиксирована');
            setIsPayoutModalOpen(false);
            fetchData(); // Reload balances
        } catch (error) {
            console.error('Failed to create payout', error);
            toast.error('Не удалось зафиксировать выплату');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-neutral-900">Взаиморасчеты с сотрудниками</h2>
                    <p className="text-sm text-neutral-500">Текущий баланс. Положительная сумма означает, что салон должен мастеру.</p>
                </div>
            </div>

            <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white">
                <table className="w-full text-sm text-left">
                    <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 uppercase text-[10px] font-bold tracking-widest">
                        <tr>
                            <th className="px-6 py-4">Сотрудник</th>
                            <th className="px-6 py-4 w-48 text-right">Текущий баланс (₽)</th>
                            <th className="px-6 py-4 w-40 text-center">Действия</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {balances.length > 0 ? (
                            balances.map((bal) => {
                                const emp = employees.find((e) => e.id === bal.employee_id);
                                if (!emp) return null;

                                const isDebt = bal.balance > 0;
                                const isAdvance = bal.balance < 0;

                                return (
                                    <tr key={emp.id} className="hover:bg-neutral-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-neutral-900">
                                                {emp.first_name} {emp.last_name}
                                            </div>
                                            <div className="text-xs text-neutral-500">{emp.specialization}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className={`font-bold text-lg ${isDebt ? 'text-green-600' : isAdvance ? 'text-red-500' : 'text-neutral-900'}`}>
                                                {bal.balance > 0 ? '+' : ''}{bal.balance.toLocaleString('ru-RU')} ₽
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Button
                                                variant="outline"
                                                onClick={() => handleOpenPayout(emp.id)}
                                                className="gap-2 rounded-xl text-neutral-700 hover:text-black"
                                                disabled={bal.balance <= 0}
                                            >
                                                <DollarSign className="h-4 w-4" />
                                                Выплатить
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={3} className="px-6 py-12 text-center text-neutral-500">
                                    Нет активных балансов для сотрудников. Взаиморасчеты появятся после создания расчетной ведомости.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Dialog open={isPayoutModalOpen} onOpenChange={setIsPayoutModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Зафиксировать выплату</DialogTitle>
                    </DialogHeader>
                    {selectedEmployee && (
                        <div className="py-4 space-y-4">
                            <div>
                                <Label className="text-xs uppercase tracking-widest text-neutral-400 font-bold mb-2">Сотрудник</Label>
                                <div className="font-medium text-neutral-900 border border-neutral-200 bg-neutral-50 px-3 py-2 rounded-xl">
                                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs uppercase tracking-widest text-neutral-400 font-bold mb-2">Сумма к выплате (₽)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={payoutAmount}
                                    onChange={(e) => setPayoutAmount(e.target.value)}
                                    placeholder="Введите сумму"
                                    className="rounded-xl border-neutral-200 focus-visible:ring-1"
                                    autoFocus
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPayoutModalOpen(false)} className="rounded-xl">
                            Отмена
                        </Button>
                        <Button onClick={handlePayoutSubmit} disabled={isSubmitting || !payoutAmount} className="bg-black text-white hover:bg-neutral-800 rounded-xl">
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Провести выплату
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
