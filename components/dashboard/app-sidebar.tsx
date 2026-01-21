'use client';

import * as React from 'react';
import {
    BookOpen,
    Calendar,
    Building2,
    Users,
    LayoutDashboard,
    Settings,
    LogOut,
    Scissors,
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { useBranch } from '@/context/branch-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
} from '@/components/ui/sidebar';
import { Label } from '@/components/ui/label';

const navItems = [
    {
        title: 'Обзор',
        url: '/dashboard',
        icon: LayoutDashboard,
    },
    {
        title: 'Компания',
        url: '/dashboard/company',
        icon: Building2,
    },
    {
        title: 'Персонал',
        url: '/dashboard/staff',
        icon: Users,
    },
    {
        title: 'Услуги',
        url: '/dashboard/services',
        icon: Scissors,
    },
    {
        title: 'Расписание',
        url: '/dashboard/schedule',
        icon: Calendar,
    },
    {
        title: 'Записи',
        url: '/dashboard/bookings',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const { selectedBranchID, setSelectedBranchID, branches, isLoading } = useBranch();

    const handleLogout = () => {
        Cookies.remove('token');
        router.push('/login');
    };

    return (
        <Sidebar variant="sidebar" collapsible="icon">
            <SidebarHeader className="flex flex-col gap-4 p-6 border-b border-neutral-200 bg-white">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-neutral-900 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-bold text-xl tracking-tight text-neutral-900 group-data-[collapsible=icon]:hidden">TimeHub</span>
                </div>

                <div className="group-data-[collapsible=icon]:hidden animate-in fade-in slide-in-from-top-1 duration-500">
                    <Label className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 mb-2 block px-1">Филиал</Label>
                    <Select value={selectedBranchID} onValueChange={setSelectedBranchID}>
                        <SelectTrigger className="w-full justify-start gap-2 border-neutral-200 hover:bg-neutral-50 px-2 h-9 transition-all bg-white">
                            <Building2 className="h-4 w-4 text-neutral-400" />
                            <div className="flex flex-col items-start overflow-hidden">
                                <SelectValue placeholder="Загрузка..." />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                            {branches?.map((b: any) => (
                                <SelectItem key={b.id} value={b.id.toString()} className="text-xs">
                                    {b.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </SidebarHeader>
            <SidebarContent className="bg-white">
                <SidebarGroup>
                    <SidebarGroupLabel className="px-6 text-neutral-400 font-semibold uppercase text-[10px] tracking-wider mb-2">Навигация</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu className="px-3 gap-1">
                            {navItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={pathname === item.url}
                                        tooltip={item.title}
                                        className="h-10 px-3 rounded-md hover:bg-neutral-100 transition-colors"
                                    >
                                        <Link href={item.url} className="flex items-center gap-3 w-full">
                                            <item.icon className="h-5 w-5 text-neutral-500 group-data-[active=true]:text-neutral-900" />
                                            <span className="text-sm font-medium text-neutral-700 group-data-[active=true]:text-neutral-900 group-data-[collapsible=icon]:hidden">
                                                {item.title}
                                            </span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="border-t border-neutral-200 bg-white p-4">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            variant="default"
                            className="w-full h-10 gap-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                            onClick={handleLogout}
                        >
                            <LogOut className="h-5 w-5" />
                            <span className="text-sm font-medium group-data-[collapsible=icon]:hidden">Выйти</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
