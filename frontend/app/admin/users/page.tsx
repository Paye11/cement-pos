"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Loader2, History, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import { toast } from "sonner";
import { UserInventoryManagement } from "@/components/admin/user-inventory-management";
import { UserExpenseManagement } from "@/components/admin/user-expense-management";

interface User {
  id: string;
  centerName: string;
  name: string;
  location: string;
  contact: string;
  username: string;
  role: string;
  status: "active" | "inactive";
  createdAt: string;
}

interface FormData {
  centerName: string;
  name: string;
  location: string;
  contact: string;
  username: string;
  password: string;
  status: "active" | "inactive";
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    user: User | null;
  }>({ open: false, user: null });
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    userId: string | null;
  }>({ open: false, userId: null });
  const [formData, setFormData] = useState<FormData>({
    centerName: "",
    name: "",
    location: "",
    contact: "",
    username: "",
    password: "",
    status: "active",
  });
  const [initialStock, setInitialStock] = useState<{
    "42.5": string;
    "32.5": string;
  }>({ "42.5": "", "32.5": "" });

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const resetForm = () => {
    setFormData({
      centerName: "",
      name: "",
      location: "",
      contact: "",
      username: "",
      password: "",
      status: "active",
    });
    setInitialStock({ "42.5": "", "32.5": "" });
  };

  const handleCreate = async () => {
    if (
      !formData.centerName ||
      !formData.name ||
      !formData.location ||
      !formData.contact ||
      !formData.username ||
      !formData.password
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          initialStock: {
            "42.5": parseInt(initialStock["42.5"] || "0"),
            "32.5": parseInt(initialStock["32.5"] || "0"),
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setUsers((prev) => [data.user, ...prev]);
        toast.success("User created successfully");
        setCreateDialog(false);
        resetForm();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to create user");
      }
    } catch {
      toast.error("Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editDialog.user) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/users/${editDialog.user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          centerName: formData.centerName,
          name: formData.name,
          location: formData.location,
          contact: formData.contact,
          username: formData.username,
          status: formData.status,
          ...(formData.password && { password: formData.password }),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setUsers((prev) =>
          prev.map((u) => (u.id === data.user.id ? data.user : u))
        );
        toast.success("User updated successfully");
        setEditDialog({ open: false, user: null });
        resetForm();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to update user");
      }
    } catch {
      toast.error("Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.userId) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/users/${deleteDialog.userId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== deleteDialog.userId));
        toast.success("User deleted successfully");
        setDeleteDialog({ open: false, userId: null });
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to delete user");
      }
    } catch {
      toast.error("Failed to delete user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadUserPDF = async (user: User) => {
    setIsDownloading(user.id);
    try {
      const stockParams = new URLSearchParams({ userId: user.id, limit: "100" });
      const txParams = new URLSearchParams({ sellerId: user.id, limit: "200" });
      
      const [stockRes, eventsRes] = await Promise.all([
        fetch(`/api/admin/history/stock?${stockParams.toString()}`),
        fetch(`/api/admin/history/transactions?${txParams.toString()}`),
      ]);

      if (!stockRes.ok || !eventsRes.ok) {
        throw new Error("Failed to fetch history data");
      }

      const stockData = await stockRes.json();
      const txData = await eventsRes.json();

      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text("Seller Performance Report", 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Seller: ${user.name} (@${user.username})`, 14, 30);
      doc.text(`Location: ${user.location || "-"}`, 14, 36);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 42);

      // Stock Table
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text("Stock Assignment History", 14, 54);
      
      const stockLogs = stockData.logs || [];
      const stockTableData = stockLogs.map((l: any) => [
        formatDateTime(l.createdAt),
        `Cement ${l.cementType}`,
        l.action.toUpperCase(),
        formatNumber(l.amount),
        l.performedBy?.name || "-"
      ]);

      autoTable(doc, {
        startY: 58,
        head: [["Date", "Cement", "Action", "Amount", "By"]],
        body: stockTableData,
        theme: "striped",
        headStyles: { fillColor: [41, 128, 185] },
      });

      // Transaction Table
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(14);
      doc.text("Sales Transaction Events", 14, finalY);
      
      const events = txData.events || [];
      const txTableData = events.map((e: any) => [
        formatDateTime(e.createdAt),
        e.eventType.toUpperCase(),
        `Cement ${e.cementType}`,
        formatNumber(e.bagsSold),
        formatCurrency(e.totalAmount),
        e.performedBy?.name || "-"
      ]);

      autoTable(doc, {
        startY: finalY + 4,
        head: [["Date", "Event", "Cement", "Bags", "Amount", "By"]],
        body: txTableData,
        theme: "striped",
        headStyles: { fillColor: [39, 174, 96] },
      });

      doc.save(`${user.name.replace(/\s+/g, "_")}_History_${new Date().getTime()}.pdf`);
      toast.success("PDF generated successfully");
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsDownloading(null);
    }
  };

  const openEditDialog = (user: User) => {
    setFormData({
      centerName: user.centerName || "",
      name: user.name,
      location: user.location || "",
      contact: user.contact || "",
      username: user.username,
      password: "",
      status: user.status,
    });
    setEditDialog({ open: true, user });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>User Management</CardTitle>
          <Dialog open={createDialog} onOpenChange={setCreateDialog}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new seller to the system
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="centerName">Center Name</Label>
                  <Input
                    id="centerName"
                    value={formData.centerName}
                    onChange={(e) =>
                      setFormData({ ...formData, centerName: e.target.value })
                    }
                    placeholder="Center name"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Seller Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Full name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      placeholder="Location"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="contact">Contact</Label>
                    <Input
                      id="contact"
                      value={formData.contact}
                      onChange={(e) =>
                        setFormData({ ...formData, contact: e.target.value })
                      }
                      placeholder="Phone"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    placeholder="username"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Min 6 characters"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="initial-425">Initial Stock (42.5)</Label>
                    <Input
                      id="initial-425"
                      type="number"
                      min="0"
                      value={initialStock["42.5"]}
                      onChange={(e) =>
                        setInitialStock((prev) => ({
                          ...prev,
                          "42.5": e.target.value,
                        }))
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="initial-325">Initial Stock (32.5)</Label>
                    <Input
                      id="initial-325"
                      type="number"
                      min="0"
                      value={initialStock["32.5"]}
                      onChange={(e) =>
                        setInitialStock((prev) => ({
                          ...prev,
                          "32.5": e.target.value,
                        }))
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  Create User
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Inventory</TableHead>
                  <TableHead>Expenses</TableHead>
                  <TableHead>History</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>@{user.username}</TableCell>
                    <TableCell>
                      <UserInventoryManagement userId={user.id} userName={user.name} />
                    </TableCell>
                    <TableCell>
                      <UserExpenseManagement userId={user.id} userName={user.name} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <Button asChild size="sm" variant="outline" className="w-full">
                          <Link href={`/admin/history?userId=${user.id}`}>
                            <History className="h-4 w-4 mr-2" />
                            View
                          </Link>
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full"
                          onClick={() => downloadUserPDF(user)}
                          disabled={isDownloading === user.id}
                        >
                          {isDownloading === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Download className="h-4 w-4 mr-2" />
                          )}
                          PDF
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.status === "active" ? "default" : "secondary"
                        }
                        className={
                          user.status === "active"
                            ? "bg-accent/15 text-accent border-accent/30"
                            : ""
                        }
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() =>
                            setDeleteDialog({ open: true, userId: user.id })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No users found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Click the button above to add your first user
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog
        open={editDialog.open}
        onOpenChange={(open) => {
          setEditDialog({ open, user: null });
          resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user details. Leave password blank to keep current.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-centerName">Center Name</Label>
              <Input
                id="edit-centerName"
                value={formData.centerName}
                onChange={(e) =>
                  setFormData({ ...formData, centerName: e.target.value })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-name">Seller Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-contact">Contact</Label>
                <Input
                  id="edit-contact"
                  value={formData.contact}
                  onChange={(e) =>
                    setFormData({ ...formData, contact: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-password">New Password (optional)</Label>
              <Input
                id="edit-password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Leave blank to keep current"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: "active" | "inactive") =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialog({ open: false, user: null })}
            >
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, userId: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              user account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
