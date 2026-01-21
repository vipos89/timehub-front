'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Branch {
    id: number;
    name: string;
    address?: string;
}

interface BranchContextType {
    selectedBranchID: string;
    setSelectedBranchID: (id: string) => void;
    branches: Branch[];
    isLoading: boolean;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: ReactNode }) {
    const [selectedBranchID, setSelectedBranchIDState] = useState<string>('');

    // Persistence
    useEffect(() => {
        const saved = localStorage.getItem('lastBranchID');
        if (saved) {
            setSelectedBranchIDState(saved);
        }
    }, []);

    const setSelectedBranchID = (id: string) => {
        setSelectedBranchIDState(id);
        localStorage.setItem('lastBranchID', id);
    };

    // Fetch company first (needed for branches)
    const { data: company } = useQuery({
        queryKey: ['my-company'],
        queryFn: async () => {
            const res = await api.get('/companies');
            return res.data[0] || null;
        },
    });

    // Fetch branches
    const { data: branches = [], isLoading } = useQuery({
        queryKey: ['branches', company?.id],
        queryFn: async () => {
            const res = await api.get(`/companies/${company.id}/branches`);
            return res.data;
        },
        enabled: !!company?.id,
    });

    // Default selection
    useEffect(() => {
        if (branches.length > 0) {
            const saved = localStorage.getItem('lastBranchID');
            const isValid = (id: string) => branches.some((b: Branch) => b.id.toString() === id);

            if (!selectedBranchID) {
                if (saved && isValid(saved)) {
                    setSelectedBranchIDState(saved);
                } else {
                    setSelectedBranchIDState(branches[0].id.toString());
                }
            } else if (!isValid(selectedBranchID)) {
                // If currently selected ID is no longer in branches list, reset to first
                setSelectedBranchIDState(branches[0].id.toString());
            }
        }
    }, [branches, selectedBranchID]);

    return (
        <BranchContext.Provider value={{ selectedBranchID, setSelectedBranchID, branches, isLoading }}>
            {children}
        </BranchContext.Provider>
    );
}

export function useBranch() {
    const context = useContext(BranchContext);
    if (context === undefined) {
        throw new Error('useBranch must be used within a BranchProvider');
    }
    return context;
}
