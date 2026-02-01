'use client';

import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/app-sidebar';
import { Separator } from '@/components/ui/separator';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

import { BranchProvider } from '@/context/branch-context';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <BranchProvider>
            <SidebarProvider>
                <div className="flex min-h-screen w-full bg-neutral-50">
                    <AppSidebar />
                    <main className="flex-1 flex flex-col min-w-0">
                        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-neutral-200 bg-white px-6">
                            <SidebarTrigger className="-ml-1" />
                            <Separator orientation="vertical" className="mr-2 h-4" />
                            <Breadcrumb>
                                <BreadcrumbList>
                                    <BreadcrumbItem className="hidden md:block">
                                        <BreadcrumbLink href="/dashboard" className="text-neutral-500 hover:text-neutral-900 transition-colors">
                                            Панель управления
                                        </BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator className="hidden md:block text-neutral-300" />
                                    <BreadcrumbItem>
                                        <BreadcrumbPage className="font-medium text-neutral-900">Обзор</BreadcrumbPage>
                                    </BreadcrumbItem>
                                </BreadcrumbList>
                            </Breadcrumb>
                        </header>
                        <div className="flex-1 overflow-y-auto p-4">
                            <div className="w-full space-y-8">
                                {children}
                            </div>
                        </div>
                    </main>
                </div>
            </SidebarProvider>
        </BranchProvider>
    );
}
