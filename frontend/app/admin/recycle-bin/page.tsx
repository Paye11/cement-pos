"use client";

import { useEffect, useState } from "react";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";

interface DeletedUser {
  id: string;
  name: string;
  username: string;
  status: "active" | "inactive";
  deletedAt?: string;
  deletedStatus?: "active" | "inactive" | null;
  createdAt: string;
}

export default function RecycleBinPage() {
  const [users, setUsers] = useState<DeletedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [restoringUserId, setRestoringUserId] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    userId: string | null;
  }>({ open: false, userId: null });
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const fetchDeletedUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/recycle-bin");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to load recycle bin");
        return;
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Failed to load recycle bin:", error);
      toast.error("Failed to load recycle bin");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeletedUsers();
  }, []);

  const handleRestore = async (userId: string) => {
    setRestoringUserId(userId);
    try {
      const res = await fetch("/api/admin/recycle-bin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to restore user");
        return;
      }
      toast.success("User restored");
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (error) {
      console.error("Failed to restore user:", error);
      toast.error("Failed to restore user");
    } finally {
      setRestoringUserId(null);
    }
  };

  const handleDeletePermanently = async () => {
    if (!deleteDialog.userId) return;
    const userId = deleteDialog.userId;
    setDeletingUserId(userId);
    try {
      const res = await fetch(`/api/admin/recycle-bin/${userId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to delete permanently");
        return;
      }
      toast.success("User deleted permanently");
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setDeleteDialog({ open: false, userId: null });
    } catch (error) {
      console.error("Failed to delete permanently:", error);
      toast.error("Failed to delete permanently");
    } finally {
      setDeletingUserId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          Recycle Bin
        </CardTitle>
        <Button variant="outline" onClick={fetchDeletedUsers}>
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {users.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Deleted</TableHead>
                <TableHead>Status Before</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>@{user.username}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.deletedAt ? formatDateTime(user.deletedAt) : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {user.deletedStatus || "active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore(user.id)}
                        disabled={restoringUserId === user.id || deletingUserId === user.id}
                      >
                        {restoringUserId === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => setDeleteDialog({ open: true, userId: user.id })}
                        disabled={restoringUserId === user.id || deletingUserId === user.id}
                      >
                        {deletingUserId === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">Recycle Bin is empty</p>
            <p className="text-sm text-muted-foreground mt-1">
              Deleted users will appear here and can be restored.
            </p>
          </div>
        )}
      </CardContent>

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, userId: open ? deleteDialog.userId : null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingUserId)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePermanently}
              disabled={Boolean(deletingUserId)}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
