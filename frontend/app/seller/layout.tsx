"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  PlusCircle,
  History,
  FileText,
  ClipboardList,
  CalendarDays,
  LogOut,
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
import { Separator } from "@/components/ui/separator";

const navItems = [
  {
    title: "Dashboard",
    href: "/seller",
    icon: LayoutDashboard,
  },
  {
    title: "Daily Reports",
    href: "/seller/daily-reports",
    icon: ClipboardList,
  },
  {
    title: "New Sale",
    href: "/seller/new-sale",
    icon: PlusCircle,
  },
  {
    title: "My Sales",
    href: "/seller/sales",
    icon: History,
  },
  {
    title: "Documents",
    href: "/seller/documents",
    icon: FileText,
  },
  {
    title: "Holidays",
    href: "/seller/holidays",
    icon: CalendarDays,
  },
];

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
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
                Cement Store
              </span>
              <span className="text-xs text-sidebar-foreground/70">
                Seller Portal
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
                        (item.href !== "/seller" &&
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
                  (item.href !== "/seller" && pathname.startsWith(item.href))
              )?.title || "Dashboard"}
            </h1>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
