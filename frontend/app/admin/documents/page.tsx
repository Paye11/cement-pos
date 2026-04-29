"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Trash2, UploadCloud } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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

type Category = "Receipt" | "Document";
type FileType = "image" | "pdf";

interface Seller {
  id: string;
  name: string;
  username: string;
}

interface DocItem {
  id: string;
  seller: Seller | null;
  uploadedByRole: "user" | "admin";
  recipientType: "admin" | "seller";
  category: Category;
  title: string;
  fileType: FileType;
  mimeType: string;
  url: string;
  publicId: string;
  bytes: number;
  createdAt: string;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function getFileTypeFromMime(mimeType: string): FileType | null {
  const m = mimeType.toLowerCase();
  if (m === "application/pdf") return "pdf";
  if (m.startsWith("image/")) return "image";
  return null;
}

export default function AdminDocumentsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSellers, setIsLoadingSellers] = useState(true);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [inbox, setInbox] = useState<DocItem[]>([]);
  const [sent, setSent] = useState<DocItem[]>([]);

  const [category, setCategory] = useState<Category>("Document");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sendToAll, setSendToAll] = useState(false);
  const [selectedSellerId, setSelectedSellerId] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [inboxSellerFilter, setInboxSellerFilter] = useState<string>("all");
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSellers = async () => {
    setIsLoadingSellers(true);
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to load sellers");
        return;
      }
      setSellers(data.users || []);
    } catch (error) {
      console.error("Failed to fetch sellers:", error);
      toast.error("Failed to load sellers");
    } finally {
      setIsLoadingSellers(false);
    }
  };

  const fetchDocs = async () => {
    setIsLoading(true);
    try {
      const inboxParams = new URLSearchParams({ limit: "100", box: "inbox" });
      if (inboxSellerFilter !== "all") inboxParams.set("userId", inboxSellerFilter);
      const sentParams = new URLSearchParams({ limit: "100", box: "sent" });
      const [inboxRes, sentRes] = await Promise.all([
        fetch(`/api/documents?${inboxParams.toString()}`, { cache: "no-store" }),
        fetch(`/api/documents?${sentParams.toString()}`, { cache: "no-store" }),
      ]);

      if (inboxRes.ok) {
        const data = await inboxRes.json();
        setInbox(data.documents || []);
      } else {
        const data = await inboxRes.json().catch(() => ({}));
        toast.error(data.error || "Failed to load seller documents");
      }

      if (sentRes.ok) {
        const data = await sentRes.json();
        setSent(data.documents || []);
      } else {
        const data = await sentRes.json().catch(() => ({}));
        toast.error(data.error || "Failed to load sent documents");
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSellers();
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [inboxSellerFilter]);

  const handleFileChange = (f: File | null) => {
    if (!f) {
      setFile(null);
      return;
    }
    const fileType = getFileTypeFromMime(f.type);
    if (!fileType) {
      toast.error("Only images or PDF files are allowed");
      return;
    }
    const maxBytes = 10 * 1024 * 1024;
    if (f.size > maxBytes) {
      toast.error("File is too large (max 10MB)");
      return;
    }
    setFile(f);
    if (!title.trim()) {
      const base = f.name.replace(/\.[^/.]+$/, "");
      setTitle(base.slice(0, 80));
    }
  };

  const canUpload = useMemo(() => {
    if (isUploading) return false;
    if (!file) return false;
    if (!title.trim()) return false;
    if (!sendToAll && !selectedSellerId) return false;
    return true;
  }, [isUploading, file, title, sendToAll, selectedSellerId]);

  const handleUpload = async () => {
    if (!file) return;
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      toast.error("Title is required");
      return;
    }
    if (cleanTitle.length > 80) {
      toast.error("Title cannot exceed 80 characters");
      return;
    }

    const fileType = getFileTypeFromMime(file.type);
    if (!fileType) {
      toast.error("Only images or PDF files are allowed");
      return;
    }

    if (!sendToAll && !selectedSellerId) {
      toast.error("Select a seller or choose send to all");
      return;
    }

    setIsUploading(true);
    try {
      const folder = sendToAll
        ? "cement-pos/admin-documents/all-sellers"
        : `cement-pos/admin-documents/${selectedSellerId}`;

      const signRes = await fetch("/api/cloudinary/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder }),
      });
      if (!signRes.ok) {
        const data = await signRes.json().catch(() => ({}));
        toast.error(data.error || "Failed to prepare upload");
        return;
      }
      const sign = await signRes.json();

      const form = new FormData();
      form.append("file", file);
      form.append("api_key", sign.apiKey);
      form.append("timestamp", String(sign.timestamp));
      form.append("folder", sign.folder);
      form.append("signature", sign.signature);

      const resourceType = fileType === "pdf" ? "raw" : "image";
      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(String(sign.cloudName))}/${resourceType}/upload`,
        { method: "POST", body: form }
      );
      const uploaded = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok || !uploaded?.secure_url || !uploaded?.public_id) {
        toast.error(uploaded?.error?.message || "Cloud upload failed");
        return;
      }

      const saveRes = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientType: "seller",
          sendToAll,
          sellerId: sendToAll ? undefined : selectedSellerId,
          category,
          title: cleanTitle,
          fileType,
          mimeType: file.type,
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
          bytes: uploaded.bytes ?? file.size,
          format: uploaded.format,
          originalFilename: uploaded.original_filename || file.name,
        }),
      });
      const saved = await saveRes.json().catch(() => ({}));
      if (!saveRes.ok) {
        toast.error(saved.error || "Failed to save document");
        return;
      }

      toast.success(sendToAll ? "Document sent to all sellers" : "Document sent to seller");
      setFile(null);
      setTitle("");
      setCategory("Document");
      setSendToAll(false);
      setSelectedSellerId("");
      await fetchDocs();
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/documents/${deleteDialog.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to delete document");
        return;
      }
      toast.success("Deleted");
      setDeleteDialog({ open: false, id: null });
      await fetchDocs();
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete document");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents
          </CardTitle>
          <CardDescription>
            Receive documents uploaded by sellers. You can also upload a document and send it to one seller or all
            sellers.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Send Document</CardTitle>
          <CardDescription>Upload images or PDFs and send to sellers.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Receipt">Receipt</SelectItem>
                <SelectItem value="Document">Document</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2 md:col-span-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. New price list, policy update..."
              maxLength={80}
            />
          </div>

          <div className="flex items-center gap-3 md:col-span-3">
            <Checkbox checked={sendToAll} onCheckedChange={(v) => setSendToAll(Boolean(v))} />
            <div className="flex flex-col">
              <span className="text-sm font-medium">Send to all sellers</span>
              <span className="text-xs text-muted-foreground">If enabled, everyone receives the same document.</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:col-span-3">
            <Label>Seller</Label>
            <Select
              value={selectedSellerId}
              onValueChange={setSelectedSellerId}
              disabled={sendToAll || isLoadingSellers}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingSellers ? "Loading sellers..." : "Select a seller"} />
              </SelectTrigger>
              <SelectContent>
                {sellers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} (@{s.username})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2 md:col-span-3">
            <Label>File (Image or PDF)</Label>
            <Input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange(e.target.files?.[0] || null)} />
            {file ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">{getFileTypeFromMime(file.type) === "pdf" ? "PDF" : "Image"}</Badge>
                <span className="truncate">{file.name}</span>
                <span>•</span>
                <span>{formatBytes(file.size)}</span>
              </div>
            ) : null}
          </div>

          <div className="md:col-span-3">
            <Button onClick={handleUpload} disabled={!canUpload} className="w-full">
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4 mr-2" />
                  Send
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium">Seller Uploads (Inbox)</CardTitle>
            <CardDescription>Documents sellers submitted to admin.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Seller</Label>
            <Select value={inboxSellerFilter} onValueChange={setInboxSellerFilter}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sellers</SelectItem>
                {sellers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} (@{s.username})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : inbox.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inbox.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-muted-foreground">{formatDateTime(d.createdAt)}</TableCell>
                    <TableCell className="font-medium">
                      {d.seller?.name || "Unknown"}
                      <div className="text-xs text-muted-foreground">@{d.seller?.username || "-"}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{d.category}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{d.title}</TableCell>
                    <TableCell className="text-muted-foreground">{d.fileType === "pdf" ? "PDF" : "Image"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatBytes(d.bytes)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteDialog({ open: true, id: d.id })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <a href={d.url} target="_blank" rel="noreferrer">
                          View
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">No seller documents yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Sent Documents</CardTitle>
          <CardDescription>Documents you sent to sellers.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : sent.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sent.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-muted-foreground">{formatDateTime(d.createdAt)}</TableCell>
                    <TableCell className="font-medium">
                      {d.seller?.name || "Seller"}
                      <div className="text-xs text-muted-foreground">@{d.seller?.username || "-"}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{d.category}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{d.title}</TableCell>
                    <TableCell className="text-muted-foreground">{d.fileType === "pdf" ? "PDF" : "Image"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatBytes(d.bytes)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteDialog({ open: true, id: d.id })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <a href={d.url} target="_blank" rel="noreferrer">
                          View
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">No sent documents yet.</p>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, id: open ? deleteDialog.id : null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>This removes the document from the system.</AlertDialogDescription>
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

