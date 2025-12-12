import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  FileText, 
  Search,
  Edit,
  Trash2,
  Check,
  Clock,
  Send,
  Copy,
  Loader2,
  Archive
} from "lucide-react";
import type { Content } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useState } from "react";

function ContentCard({ 
  content, 
  onEdit, 
  onDelete, 
  onApprove,
  onArchive,
  isUpdating
}: { 
  content: Content;
  onEdit: (content: Content) => void;
  onDelete: (id: string) => void;
  onApprove: (id: string) => void;
  onArchive: (id: string) => void;
  isUpdating: boolean;
}) {
  const getStatusColor = () => {
    switch (content.status) {
      case "draft":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "scheduled":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "published":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "archived":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = () => {
    switch (content.status) {
      case "draft":
        return <Edit className="h-3 w-3" />;
      case "scheduled":
        return <Clock className="h-3 w-3" />;
      case "published":
        return <Check className="h-3 w-3" />;
      case "archived":
        return <Archive className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content.body);
  };

  return (
    <Card className="hover-elevate transition-all">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <Badge className={`flex items-center gap-1 ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="capitalize">{content.status}</span>
          </Badge>
          <span className="text-sm text-muted-foreground">
            {format(new Date(content.createdAt), "MMM d, yyyy")}
          </span>
        </div>

        {content.title && (
          <h3 className="font-semibold text-lg mb-2">{content.title}</h3>
        )}

        <div className="relative">
          <p className="text-foreground whitespace-pre-wrap line-clamp-6">
            {content.body}
          </p>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {content.body.length} characters
            </span>
            {content.scheduledAt && (
              <span className="text-xs text-muted-foreground">
                Scheduled: {format(new Date(content.scheduledAt), "MMM d, h:mm a")}
              </span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button 
              size="sm" 
              variant="ghost"
              onClick={copyToClipboard}
              data-testid={`button-copy-${content.id}`}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => onEdit(content)}
              data-testid={`button-edit-${content.id}`}
            >
              <Edit className="h-4 w-4" />
            </Button>
            {content.status === "draft" && (
              <>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => onArchive(content.id)}
                  disabled={isUpdating}
                  data-testid={`button-archive-${content.id}`}
                >
                  <Archive className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm"
                  onClick={() => onApprove(content.id)}
                  disabled={isUpdating}
                  data-testid={`button-approve-${content.id}`}
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1" />
                      Approve
                    </>
                  )}
                </Button>
              </>
            )}
            {content.status !== "published" && (
              <Button 
                size="sm" 
                variant="destructive"
                onClick={() => onDelete(content.id)}
                disabled={isUpdating}
                data-testid={`button-delete-${content.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ContentPreview({ content }: { content: string }) {
  return (
    <div className="border rounded-lg p-6 bg-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-lg font-bold text-primary">Y</span>
        </div>
        <div>
          <p className="font-semibold">Your Name</p>
          <p className="text-sm text-muted-foreground">Technical Founder • Building in Public</p>
        </div>
      </div>
      <p className="whitespace-pre-wrap text-foreground">{content}</p>
      <div className="flex items-center gap-4 mt-4 pt-4 border-t text-muted-foreground">
        <span className="text-sm">0 Likes</span>
        <span className="text-sm">0 Comments</span>
        <span className="text-sm">0 Reposts</span>
      </div>
    </div>
  );
}

export default function ContentQueue() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [editedBody, setEditedBody] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data: content, isLoading } = useQuery<Content[]>({
    queryKey: ["/api/content"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: string }) => {
      return apiRequest("PATCH", `/api/content/${id}`, { body });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      setEditingContent(null);
      toast({
        title: "Content updated",
        description: "Your content has been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      setUpdatingId(id);
      return apiRequest("PATCH", `/api/content/${id}`, { status: "published" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      toast({
        title: "Content approved",
        description: "Your content has been marked as published.",
      });
      setUpdatingId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Approval failed",
        description: error.message,
        variant: "destructive",
      });
      setUpdatingId(null);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      setUpdatingId(id);
      return apiRequest("PATCH", `/api/content/${id}`, { status: "archived" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      toast({
        title: "Content archived",
        description: "Your content has been archived.",
      });
      setUpdatingId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Archive failed",
        description: error.message,
        variant: "destructive",
      });
      setUpdatingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      setUpdatingId(id);
      return apiRequest("DELETE", `/api/content/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      toast({
        title: "Content deleted",
        description: "Your content has been deleted.",
      });
      setUpdatingId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion failed",
        description: error.message,
        variant: "destructive",
      });
      setUpdatingId(null);
    },
  });

  const handleEdit = (item: Content) => {
    setEditingContent(item);
    setEditedBody(item.body);
  };

  const handleSaveEdit = () => {
    if (editingContent) {
      updateMutation.mutate({ id: editingContent.id, body: editedBody });
    }
  };

  const filteredContent = content?.filter((item) => {
    const matchesSearch = 
      item.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === "all" || item.status === activeTab;
    return matchesSearch && matchesTab;
  }) || [];

  const counts = {
    all: content?.length || 0,
    draft: content?.filter(c => c.status === "draft").length || 0,
    scheduled: content?.filter(c => c.status === "scheduled").length || 0,
    published: content?.filter(c => c.status === "published").length || 0,
    archived: content?.filter(c => c.status === "archived").length || 0,
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Content Queue</h1>
        <p className="text-muted-foreground">
          Review, edit, and manage your generated content
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-content"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">
            All ({counts.all})
          </TabsTrigger>
          <TabsTrigger value="draft" data-testid="tab-draft">
            Drafts ({counts.draft})
          </TabsTrigger>
          <TabsTrigger value="scheduled" data-testid="tab-scheduled">
            Scheduled ({counts.scheduled})
          </TabsTrigger>
          <TabsTrigger value="published" data-testid="tab-published">
            Published ({counts.published})
          </TabsTrigger>
          <TabsTrigger value="archived" data-testid="tab-archived">
            Archived ({counts.archived})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid gap-4 lg:grid-cols-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex justify-between">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : filteredContent.length > 0 ? (
              filteredContent.map((item) => (
                <ContentCard
                  key={item.id}
                  content={item}
                  onEdit={handleEdit}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onApprove={(id) => approveMutation.mutate(id)}
                  onArchive={(id) => archiveMutation.mutate(id)}
                  isUpdating={updatingId === item.id}
                />
              ))
            ) : (
              <div className="lg:col-span-2">
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-1">No content found</h3>
                    <p className="text-muted-foreground text-center max-w-md">
                      {searchQuery
                        ? "Try adjusting your search query"
                        : "Generate content from your activities to see it here"}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingContent} onOpenChange={() => setEditingContent(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Content</DialogTitle>
            <DialogDescription>
              Make changes to your content and preview how it will appear
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 lg:grid-cols-2 py-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Content</label>
                <Textarea
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  rows={12}
                  className="resize-none"
                  data-testid="textarea-edit-content"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {editedBody.length} characters
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Preview</label>
                <ContentPreview content={editedBody} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingContent(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending}
              data-testid="button-save-content"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
