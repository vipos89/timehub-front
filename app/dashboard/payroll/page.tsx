'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBranch } from "@/context/branch-context";
import { PayrollCalculation } from "@/components/dashboard/payroll/payroll-calculation";
import { PayrollBalances } from "@/components/dashboard/payroll/payroll-balances";
import { PayrollSchemes } from "@/components/dashboard/payroll/payroll-schemes";

export default function PayrollPage() {
    const { selectedBranchID } = useBranch();

    if (!selectedBranchID) return null;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-black tracking-tight uppercase text-neutral-900">
                    Зарплата и Взаиморасчеты
                </h1>
                <p className="text-neutral-500 mt-1">
                    Управление расчетами, выплатами и правилами мотивации
                </p>
            </div>

            <Tabs defaultValue="calculation" className="w-full">
                <TabsList className="bg-neutral-100 p-1 mb-6 rounded-2xl w-full justify-start h-auto gap-1">
                    <TabsTrigger
                        value="calculation"
                        className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-neutral-900 data-[state=active]:shadow-sm text-neutral-600 font-medium transition-all"
                    >
                        Расчет за период
                    </TabsTrigger>
                    <TabsTrigger
                        value="balances"
                        className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-neutral-900 data-[state=active]:shadow-sm text-neutral-600 font-medium transition-all"
                    >
                        Взаиморасчеты
                    </TabsTrigger>
                    <TabsTrigger
                        value="rules"
                        className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-neutral-900 data-[state=active]:shadow-sm text-neutral-600 font-medium transition-all"
                    >
                        Схемы расчета (Настройки)
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="calculation" className="outline-none">
                    <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-6">
                        <PayrollCalculation />
                    </div>
                </TabsContent>

                <TabsContent value="balances" className="outline-none">
                    <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-6">
                        <PayrollBalances />
                    </div>
                </TabsContent>

                <TabsContent value="rules" className="outline-none">
                    <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm p-6">
                        <PayrollSchemes />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
