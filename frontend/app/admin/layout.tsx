"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  ClipboardCheck,
  Users,
  DollarSign,
  Package,
  BarChart3,
  History,
  FileText,
  Megaphone,
  LogOut,
  Trash2,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Pending Approvals",
    href: "/admin/approvals",
    icon: ClipboardCheck,
  },
  {
    title: "Documents",
    href: "/admin/documents",
    icon: FileText,
  },
  {
    title: "Announcements",
    href: "/admin/announcements",
    icon: Megaphone,
  },
  {
    title: "User Management",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Recycle Bin",
    href: "/admin/recycle-bin",
    icon: Trash2,
  },
  {
    title: "Price Management",
    href: "/admin/prices",
    icon: DollarSign,
  },
  {
    title: "Inventory",
    href: "/admin/inventory",
    icon: Package,
  },
  {
    title: "Reports",
    href: "/admin/reports",
    icon: BarChart3,
  },
  {
    title: "Payroll",
    href: "/admin/payroll",
    icon: DollarSign,
  },
  {
    title: "Expenses History",
    href: "/admin/expenses-history",
    icon: DollarSign,
  },
  {
    title: "History",
    href: "/admin/history",
    icon: History,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
      window.location.href = "/login";
    }
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-white overflow-hidden">
              <Image src="/family_tree.png" alt="Family Tree Business Inc" width={32} height={32} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground">
                Management
              </span>
              <span className="text-xs text-sidebar-foreground/70">
                Admin Panel
              </span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={
                        pathname === item.href ||
                        (item.href !== "/admin" &&
                          pathname.startsWith(item.href))
                      }
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleLogout}
                className="text-sidebar-foreground/70 hover:text-sidebar-foreground"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex-1">
            <h1 className="text-lg font-semibold">
              {navItems.find(
                (item) =>
                  pathname === item.href ||
                  (item.href !== "/admin" && pathname.startsWith(item.href))
              )?.title || "Dashboard"}
            </h1>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
