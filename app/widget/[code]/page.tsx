'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BookingWidget } from '@/components/widgets/BookingWidget';

export default function WidgetPage() {
    const { code } = useParams();
    const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
    
    // -- 1. WIDGET CONFIG --
    const { data: widget, isLoading: isLoadingWidget } = useQuery({
        queryKey: ['widget', code],
        queryFn: async () => (await api.get(`/widgets/${code}`)).data,
        enabled: !!code
    });

    const settings = useMemo(() => {
        if (!widget?.settings) return { accentColor: '#F5FF82', stepsOrder: ['services', 'specialist', 'datetime'] };
        const s = typeof widget.settings === 'string' ? JSON.parse(widget.settings) : widget.settings;
        const stepsOrder = s.stepsOrder || s.stepOrder || ['services', 'specialist', 'datetime'];
        return { accentColor: '#F5FF82', ...s, stepsOrder };
    }, [widget?.settings]);

    const companyId = widget?.company_id;
    const widgetType = widget?.widget_type || 'branch';
    
    // Default branch from widget or selected by user in network mode
    const activeBranchId = selectedBranchId || widget?.branch_id;

    const { data: company, isLoading: isLoadingCompany } = useQuery({
        queryKey: ['company', companyId],
        queryFn: async () => (await api.get(`/companies/${companyId}`)).data,
        enabled: !!companyId
    });

    // Load branches for network widget
    const { data: branches = [] } = useQuery({
        queryKey: ['branches', companyId],
        queryFn: async () => (await api.get(`/companies/${companyId}/branches`)).data,
        enabled: !!companyId && widgetType === 'network'
    });

    // Load active branch details
    const { data: branch, isLoading: isLoadingBranch } = useQuery({
        queryKey: ['branch', activeBranchId],
        queryFn: async () => activeBranchId ? (await api.get(`/branches/${activeBranchId}`)).data : null,
        enabled: !!activeBranchId
    });

    // Load employees for active branch
    const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({
        queryKey: ['employees', activeBranchId, widget?.employee_id],
        queryFn: async () => {
            if (widgetType === 'master' && widget?.employee_id) {
                const res = await api.get(`/employees/${widget.employee_id}`);
                return [res.data];
            }
            if (activeBranchId) {
                return (await api.get(`/employees?branch_id=${activeBranchId}`)).data;
            }
            return [];
        },
        enabled: !!activeBranchId || (widgetType === 'master' && !!widget?.employee_id)
    });

    const { data: services = [], isLoading: isLoadingServices } = useQuery({
        queryKey: ['services', activeBranchId],
        queryFn: async () => activeBranchId ? (await api.get(`/branches/${activeBranchId}/services`)).data : [],
        enabled: !!activeBranchId
    });

    const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
        queryKey: ['categories', activeBranchId],
        queryFn: async () => activeBranchId ? (await api.get(`/branches/${activeBranchId}/categories`)).data : [],
        enabled: !!activeBranchId
    });

    if (isLoadingWidget || isLoadingCompany) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="animate-spin h-8 w-8 border-4 border-neutral-900 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!widget) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl font-bold">Виджет не найден</h1>
                    <p className="text-neutral-500">Пожалуйста, проверьте ссылку или обратитесь в поддержку.</p>
                </div>
            </div>
        );
    }

    const widgetSettings = { ...settings, widgetType };

    return (
        <div className="min-h-screen bg-neutral-100 flex items-center justify-center sm:p-4">
            <div className="w-full max-w-md bg-white sm:rounded-[40px] shadow-2xl overflow-hidden h-screen sm:h-[800px] relative">
                <BookingWidget 
                    code={code as string}
                    company={company}
                    branch={branch}
                    branches={branches}
                    employees={employees}
                    services={services}
                    categories={categories}
                    settings={widgetSettings}
                    onBranchSelect={(id: number) => setSelectedBranchId(id)}
                    isLoadingData={isLoadingBranch || isLoadingEmployees || isLoadingServices || isLoadingCategories}
                />
            </div>
        </div>
    );
}
