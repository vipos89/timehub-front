'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BookingWidget } from '@/components/widgets/BookingWidget';

export default function WidgetPage() {
    const { code } = useParams();
    
    // -- 1. DATA QUERIES --
    const { data: widget, isLoading: isLoadingWidget } = useQuery({
        queryKey: ['widget', code],
        queryFn: async () => (await api.get(`/widgets/${code}`)).data,
        enabled: !!code
    });

    const settings = useMemo(() => {
        if (!widget?.settings) return { accentColor: '#F5FF82', stepsOrder: ['services', 'specialist', 'datetime'] };
        const s = typeof widget.settings === 'string' ? JSON.parse(widget.settings) : widget.settings;
        // Normalize stepsOrder/stepOrder
        const stepsOrder = s.stepsOrder || s.stepOrder || ['services', 'specialist', 'datetime'];
        return { accentColor: '#F5FF82', ...s, stepsOrder };
    }, [widget?.settings]);

    const companyId = widget?.company_id;
    const branchId = widget?.branch_id;
    const employeeId = widget?.employee_id;
    const widgetType = widget?.widget_type || 'branch';

    const { data: company, isLoading: isLoadingCompany } = useQuery({
        queryKey: ['company', companyId],
        queryFn: async () => (await api.get(`/companies/${companyId}`)).data,
        enabled: !!companyId
    });

    const { data: branches = [] } = useQuery({
        queryKey: ['branches', companyId],
        queryFn: async () => (await api.get(`/companies/${companyId}/branches`)).data,
        enabled: !!companyId && widgetType === 'network'
    });

    const { data: branch } = useQuery({
        queryKey: ['branch', branchId],
        queryFn: async () => branchId ? (await api.get(`/branches/${branchId}`)).data : null,
        enabled: !!branchId && widgetType !== 'network'
    });

    const { data: employees = [] } = useQuery({
        queryKey: ['employees', branchId, employeeId],
        queryFn: async () => {
            if (widgetType === 'master' && employeeId) {
                const res = await api.get(`/employees/${employeeId}`);
                return [res.data];
            }
            if (branchId) {
                return (await api.get(`/employees?branch_id=${branchId}`)).data;
            }
            return [];
        },
        enabled: (!!branchId && widgetType !== 'network') || (widgetType === 'master' && !!employeeId)
    });

    const { data: services = [] } = useQuery({
        queryKey: ['services', branchId],
        queryFn: async () => (await api.get(`/branches/${branchId}/services`)).data,
        enabled: !!branchId && widgetType !== 'network'
    });

    const { data: categories = [] } = useQuery({
        queryKey: ['categories', branchId],
        queryFn: async () => (await api.get(`/branches/${branchId}/categories`)).data,
        enabled: !!branchId && widgetType !== 'network'
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

    // Merge widgetType into settings for BookingWidget
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
                />
            </div>
        </div>
    );
}
