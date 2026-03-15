import { api as apiClient } from '../api';

export interface PayrollScheme {
    id: number;
    branch_id: number;
    name: string;
    scheme_type: string;
}

export interface PayrollRule {
    id: number;
    scheme_id: number;
    base_salary_type: string;
    base_salary_amount: number;
    guaranteed_minimum_type: string;
    guaranteed_minimum_amount: number;
    service_percentage: number;
    product_percentage: number;
    deduct_materials: boolean;
    max_discount_impact: number;
    company_revenue_percentage: number;
    only_own_shifts: boolean;
}

export interface PayrollServiceException {
    id?: number;
    scheme_id?: number;
    entity_type: string;
    entity_id: number;
    custom_percentage?: number | null;
    custom_fixed_amount?: number | null;
}

export interface PayrollSchemeDetails {
    scheme: PayrollScheme;
    rule: PayrollRule;
    exceptions: PayrollServiceException[];
}

export interface EmployeePayrollScheme {
    employee_id: number;
    branch_id: number;
    scheme_id: number;
    valid_from?: string;
}

export interface PayrollPreview {
    employee_id: number;
    name: string;
    scheme_id: number;
    work_days: number;
    work_hours: number;
    services_count: number;
    services_revenue: number;
    base_salary_calculated: number;
    percentage_calculated: number;
    calculated_salary: number;
}

export interface PayrollStatement {
    id?: number;
    employee_id: number;
    branch_id?: number;
    period_start: string;
    period_end: string;
    work_days: number;
    work_hours: number;
    services_count: number;
    services_revenue: number;
    base_salary_calculated: number;
    percentage_calculated: number;
    bonuses: number;
    penalties: number;
    calculated_salary: number;
}

export interface PayrollBalance {
    employee_id: number;
    name?: string;
    role?: string;
    balance: number;
}

export interface PayrollPayout {
    id?: number;
    employee_id: number;
    branch_id?: number;
    amount: number;
}

export const payrollApi = {
    getSchemes: (branchId: number) =>
        apiClient.get<PayrollSchemeDetails[]>(`/reports/payroll/schemes?branch_id=${branchId}`),
    createScheme: (branchId: number, details: PayrollSchemeDetails) =>
        apiClient.post(`/reports/payroll/schemes?branch_id=${branchId}`, details),
    updateScheme: (branchId: number, schemeId: number, details: PayrollSchemeDetails) =>
        apiClient.put(`/reports/payroll/schemes/${schemeId}?branch_id=${branchId}`, details),
    deleteScheme: (branchId: number, schemeId: number) =>
        apiClient.delete(`/reports/payroll/schemes/${schemeId}?branch_id=${branchId}`),
        
    getEmployeeSchemes: (branchId: number) =>
        apiClient.get<EmployeePayrollScheme[]>(`/reports/payroll/employee-schemes?branch_id=${branchId}`),
    assignSchemeToEmployees: (branchId: number, schemeId: number, employeeIds: number[], validFrom?: string, assignments?: {employee_id: number, valid_from: string}[]) =>
        apiClient.post(`/reports/payroll/employee-schemes/assign?branch_id=${branchId}`, {
            scheme_id: schemeId,
            employee_ids: employeeIds,
            valid_from: validFrom,
            assignments: assignments
        }),
        
    getPreview: (branchId: number, from: string, to: string) =>
        apiClient.get<PayrollPreview[]>(`/reports/payroll/preview?branch_id=${branchId}&from=${from}&to=${to}`),
        
    getStatements: (branchId: number, from: string, to: string) =>
        apiClient.get<PayrollStatement[]>(`/reports/payroll/statements?branch_id=${branchId}&from=${from}&to=${to}`),
    createStatements: (branchId: number, statements: PayrollStatement[]) =>
        apiClient.post(`/reports/payroll/statements?branch_id=${branchId}`, statements),
        
    getBalances: (branchId: number) =>
        apiClient.get<PayrollBalance[]>(`/reports/payroll/balances?branch_id=${branchId}`),
    createPayout: (payout: PayrollPayout) =>
        apiClient.post(`/reports/payroll/payouts`, payout),
};
