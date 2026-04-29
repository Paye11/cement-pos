"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Trash2, UploadCloud } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
type RecipientType = "admin" | "seller";
type UploadedByRole = "user" | "admin";

interface SellerDoc {
  id: string;
  category: Category;
  title: string;
  fileType: FileType;
  mimeType: string;
  url: string;
  publicId: string;
  bytes: number;
  format?: string;
  originalFilename?: string;
  uploadedByRole: UploadedByRole;
  recipientType: RecipientType;
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

export default function SellerDocumentsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState<SellerDoc[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "submitted" | "received">("all");

  const [category, setCategory] = useState<Category>("Receipt");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const canUpload = useMemo(() => {
    return !isUploading && title.trim().length > 0 && !!file;
  }, [isUploading, title, file]);

  const fetchDocs = async () => {
    setIsLoading(true);
    try {
      const [meRes, docsRes] = await Promise.all([
        fetch("/api/auth/me", { cache: "no-store" }),
        fetch("/api/documents?limit=100", { cache: "no-store" }),
      ]);

      if (meRes.ok) {
        const me = await meRes.json();
        setUserId(me?.user?.id || null);
      }

      if (!docsRes.ok) {
        const data = await docsRes.json().catch(() => ({}));
        toast.error(data.error || "Failed to load documents");
        return;
      }
      const data = await docsRes.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error("Failed to fetch documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

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

    setIsUploading(true);
    try {
      const folder = userId ? `cement-pos/seller-documents/${userId}` : "cement-pos/seller-documents";
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

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sign.cloudName}/auto/upload`,
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

      toast.success("Uploaded successfully");
      setFile(null);
      setTitle("");
      setCategory("Receipt");
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

  const visibleDocuments = useMemo(() => {
    if (filter === "submitted") return documents.filter((d) => d.recipientType === "admin");
    if (filter === "received") return documents.filter((d) => d.recipientType === "seller");
    return documents;
  }, [documents, filter]);

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
          <CardDescription>Upload receipts and documents (images or PDF only).</CardDescription>
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
              placeholder="e.g. Delivery receipt, Payment proof..."
              maxLength={80}
            />
          </div>

          <div className="flex flex-col gap-2 md:col-span-3">
            <Label>File (Image or PDF)</Label>
            <Input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            />
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
                  Upload
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Uploaded Files</CardTitle>
          <CardDescription>Receipts and documents you submitted, plus documents sent to you by admin.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : visibleDocuments.length > 0 ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Filter</Label>
                <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="submitted">Submitted to Admin</SelectItem>
                    <SelectItem value="received">From Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleDocuments.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="text-muted-foreground">{formatDateTime(d.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {d.recipientType === "admin" ? "Submitted" : "Received"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{d.category}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{d.title}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {d.fileType === "pdf" ? "PDF" : "Image"}
                      </TableCell>
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
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">
              No documents yet.
            </p>
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
