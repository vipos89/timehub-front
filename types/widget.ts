export interface SavedWidget {
    id: number;
    name: string;
    description: string;
    widget_type: string;
    branch_id: number | null;
    employee_id: number | null;
    code: string;
    settings: any;
    created_at: string;
}
