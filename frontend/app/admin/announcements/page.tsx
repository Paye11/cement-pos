"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Megaphone, Pencil, Trash2, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";

type Status = "Active" | "Expired";

interface Announcement {
  id: string;
  title: string;
  message: string;
  status: Status;
  expiresAt: string;
  createdAt: string;
  createdBy: { name: string } | null;
}

function toDatetimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export default function AdminAnnouncementsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [active, setActive] = useState<Announcement[]>([]);
  const [history, setHistory] = useState<Announcement[]>([]);

  const [createTitle, setCreateTitle] = useState("");
  const [createMessage, setCreateMessage] = useState("");
  const [createExpiresAt, setCreateExpiresAt] = useState(() => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return toDatetimeLocalValue(d);
  });
  const [isCreating, setIsCreating] = useState(false);

  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    item: Announcement | null;
    title: string;
    message: string;
    expiresAt: string;
  }>({ open: false, item: null, title: "", message: "", expiresAt: "" });

  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEnding, setIsEnding] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [activeRes, historyRes] = await Promise.all([
        fetch("/api/announcements?view=active&limit=50", { cache: "no-store" }),
        fetch("/api/announcements?view=history&limit=50", { cache: "no-store" }),
      ]);

      if (activeRes.ok) {
        const data = await activeRes.json();
        setActive(data.announcements || []);
      } else {
        const data = await activeRes.json().catch(() => ({}));
        toast.error(data.error || "Failed to load announcements");
      }

      if (historyRes.ok) {
        const data = await historyRes.json();
        setHistory(data.announcements || []);
      } else {
        const data = await historyRes.json().catch(() => ({}));
        toast.error(data.error || "Failed to load announcement history");
      }
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
      toast.error("Failed to load announcements");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const canCreate = useMemo(() => {
    return !isCreating && createTitle.trim().length > 0 && createMessage.trim().length > 0 && !!createExpiresAt;
  }, [isCreating, createTitle, createMessage, createExpiresAt]);

  const handleCreate = async () => {
    const title = createTitle.trim();
    const message = createMessage.trim();
    if (!title) return toast.error("Title is required");
    if (!message) return toast.error("Message is required");
    if (title.length > 80) return toast.error("Title cannot exceed 80 characters");
    if (message.length > 800) return toast.error("Message cannot exceed 800 characters");
    if (!createExpiresAt) return toast.error("Expiry date is required");

    setIsCreating(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          message,
          expiresAt: new Date(createExpiresAt).toISOString(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to create announcement");
        return;
      }
      toast.success("Announcement posted");
      setCreateTitle("");
      setCreateMessage("");
      const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
      setCreateExpiresAt(toDatetimeLocalValue(d));
      await fetchData();
    } catch (error) {
      console.error("Create announcement failed:", error);
      toast.error("Failed to create announcement");
    } finally {
      setIsCreating(false);
    }
  };

  const openEdit = (a: Announcement) => {
    setEditDialog({
      open: true,
      item: a,
      title: a.title,
      message: a.message,
      expiresAt: toDatetimeLocalValue(new Date(a.expiresAt)),
    });
  };

  const handleSaveEdit = async () => {
    if (!editDialog.item) return;
    const title = editDialog.title.trim();
    const message = editDialog.message.trim();
    if (!title) return toast.error("Title is required");
    if (!message) return toast.error("Message is required");
    if (title.length > 80) return toast.error("Title cannot exceed 80 characters");
    if (message.length > 800) return toast.error("Message cannot exceed 800 characters");
    if (!editDialog.expiresAt) return toast.error("Expiry date is required");

    try {
      const res = await fetch(`/api/announcements/${editDialog.item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          title,
          message,
          expiresAt: new Date(editDialog.expiresAt).toISOString(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to update announcement");
        return;
      }
      toast.success("Announcement updated");
      setEditDialog({ open: false, item: null, title: "", message: "", expiresAt: "" });
      await fetchData();
    } catch (error) {
      console.error("Update announcement failed:", error);
      toast.error("Failed to update announcement");
    }
  };

  const handleEndNow = async (id: string) => {
    setIsEnding(id);
    try {
      const res = await fetch(`/api/announcements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to end announcement");
        return;
      }
      toast.success("Announcement ended");
      await fetchData();
    } catch (error) {
      console.error("End announcement failed:", error);
      toast.error("Failed to end announcement");
    } finally {
      setIsEnding(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/announcements/${deleteDialog.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to delete announcement");
        return;
      }
      toast.success("Deleted");
      setDeleteDialog({ open: false, id: null });
      await fetchData();
    } catch (error) {
      console.error("Delete announcement failed:", error);
      toast.error("Failed to delete announcement");
    } finally {
      setIsDeleting(false);
    }
  };

  const renderStatus = (s: Status) => {
    return (
      <Badge variant="outline" className={s === "Active" ? "bg-accent/15 text-accent border-accent/30" : ""}>
        {s}
      </Badge>
    );
  };

  const renderTable = (items: Announcement[], mode: "active" | "history") => {
    if (isLoading) {
      return (
        <div className="flex flex-col gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      );
    }
    if (items.length < 1) {
      return <p className="text-sm text-muted-foreground text-center py-10">No announcements.</p>;
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>By</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="text-muted-foreground">{formatDateTime(a.createdAt)}</TableCell>
              <TableCell className="font-medium">
                {a.title}
                <div className="text-xs text-muted-foreground line-clamp-2">{a.message}</div>
              </TableCell>
              <TableCell>{renderStatus(a.status)}</TableCell>
              <TableCell className="text-muted-foreground">{formatDateTime(a.expiresAt)}</TableCell>
              <TableCell className="text-muted-foreground">{a.createdBy?.name || "-"}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(a)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {mode === "active" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-warning hover:bg-warning hover:text-warning-foreground"
                      onClick={() => handleEndNow(a.id)}
                      disabled={isEnding === a.id}
                    >
                      {isEnding === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => setDeleteDialog({ open: true, id: a.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Announcements
          </CardTitle>
          <CardDescription>
            Post announcements to all sellers. Expired announcements move to history automatically and can be resumed by changing the expiry.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Create Announcement</CardTitle>
          <CardDescription>Announcements are visible to all sellers until they expire.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>Title</Label>
            <Input value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} maxLength={80} />
          </div>
          <div className="grid gap-2">
            <Label>Message</Label>
            <Textarea value={createMessage} onChange={(e) => setCreateMessage(e.target.value)} maxLength={800} />
          </div>
          <div className="grid gap-2 max-w-sm">
            <Label>Expires At</Label>
            <Input type="datetime-local" value={createExpiresAt} onChange={(e) => setCreateExpiresAt(e.target.value)} />
          </div>
          <Button onClick={handleCreate} disabled={!canCreate} className="w-full">
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Posting...
              </>
            ) : (
              "Post Announcement"
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Manage</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active">
            <TabsList>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="active">{renderTable(active, "active")}</TabsContent>
            <TabsContent value="history">{renderTable(history, "history")}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog
        open={editDialog.open}
        onOpenChange={(open) =>
          setEditDialog(open ? editDialog : { open: false, item: null, title: "", message: "", expiresAt: "" })
        }
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
            <DialogDescription>Update title, message, or expiry. Setting a future expiry resumes an announcement.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input value={editDialog.title} onChange={(e) => setEditDialog((p) => ({ ...p, title: e.target.value }))} maxLength={80} />
            </div>
            <div className="grid gap-2">
              <Label>Message</Label>
              <Textarea value={editDialog.message} onChange={(e) => setEditDialog((p) => ({ ...p, message: e.target.value }))} maxLength={800} />
            </div>
            <div className="grid gap-2">
              <Label>Expires At</Label>
              <Input type="datetime-local" value={editDialog.expiresAt} onChange={(e) => setEditDialog((p) => ({ ...p, expiresAt: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, id: open ? deleteDialog.id : null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete announcement?</AlertDialogTitle>
            <AlertDialogDescription>This removes the announcement.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

