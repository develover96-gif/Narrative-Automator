import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  FileText,
  GitCommit,
  CheckSquare,
  GitPullRequest,
  Milestone,
  Sparkles,
  RefreshCw,
  Loader2,
  ArrowRight,
  Eye,
  ThumbsUp,
  MessageSquare,
  Database,
  Zap,
} from "lucide-react";
import { Link } from "wouter";
import { Github } from "lucide-react";
import { SiLinear } from "react-icons/si";
import type { Activity as ActivityType, Content, Integration } from "@shared/schema";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  loading,
  accent,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description: string;
  loading?: boolean;
  accent?: string;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${accent || "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function ActivityItem({ activity, onGenerate, isGenerating }: {
  activity: ActivityType;
  onGenerate: (id: string) => void;
  isGenerating: boolean;
}) {
  const getIcon = () => {
    switch (activity.type) {
      case "commit": return <GitCommit className="h-3.5 w-3.5" />;
      case "issue_completed": return <CheckSquare className="h-3.5 w-3.5" />;
      case "pr_merged": return <GitPullRequest className="h-3.5 w-3.5" />;
      case "milestone": return <Milestone className="h-3.5 w-3.5" />;
      default: return <Activity className="h-3.5 w-3.5" />;
    }
  };

  const getSourceBadge = () => {
    switch (activity.source) {
      case "github":
        return (
          <Badge variant="outline" className="flex items-center gap-1 text-xs py-0">
            <Github className="h-3 w-3" /> GitHub
          </Badge>
        );
      case "linear":
        return (
          <Badge variant="outline" className="flex items-center gap-1 text-xs py-0">
            <SiLinear className="h-3 w-3" /> Linear
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-xs py-0 capitalize">{activity.source}</Badge>;
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0 mt-0.5">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug line-clamp-1">{activity.title}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {getSourceBadge()}
          <span className="text-xs text-muted-foreground">
            {format(new Date(activity.eventDate), "MMM d, h:mm a")}
          </span>
          {activity.isProcessed && (
            <Badge className="text-xs py-0 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              Content generated
            </Badge>
          )}
        </div>
      </div>
      {!activity.isProcessed && (
        <Button
          size="sm"
          variant="ghost"
          className="shrink-0 h-7 px-2 text-xs"
          onClick={() => onGenerate(activity.id)}
          disabled={isGenerating}
          data-testid={`button-generate-${activity.id}`}
        >
          {isGenerating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          <span className="ml-1">Generate</span>
        </Button>
      )}
    </div>
  );
}

function ContentItem({ content, onApprove, isUpdating }: {
  content: Content;
  onApprove: (id: string) => void;
  isUpdating: boolean;
}) {
  const metrics = content.engagementMetrics as any;
  const statusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: "Draft", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
    scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
    published: { label: "Published", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
    archived: { label: "Archived", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400" },
  };
  const config = statusConfig[content.status] || statusConfig.draft;

  return (
    <div className="p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <Badge className={`text-xs ${config.color}`}>{config.label}</Badge>
        <span className="text-xs text-muted-foreground shrink-0">
          {format(new Date(content.createdAt), "MMM d")}
        </span>
      </div>
      <p className="text-sm line-clamp-3 text-foreground/80">{content.body}</p>
      {metrics && (
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{(metrics.views || 0).toLocaleString()}</span>
          <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{metrics.likes || 0}</span>
          <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{metrics.comments || 0}</span>
        </div>
      )}
      {content.status === "draft" && (
        <div className="flex items-center justify-end mt-3 gap-2">
          <Link href="/content">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" data-testid={`button-edit-${content.id}`}>
              Edit
            </Button>
          </Link>
          <Button
            size="sm"
            className="h-7 px-3 text-xs"
            onClick={() => onApprove(content.id)}
            disabled={isUpdating}
            data-testid={`button-approve-${content.id}`}
          >
            {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Approve
          </Button>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { toast } = useToast();

  const { data: activities, isLoading: activitiesLoading } = useQuery<ActivityType[]>({ queryKey: ["/api/activities"] });
  const { data: content, isLoading: contentLoading } = useQuery<Content[]>({ queryKey: ["/api/content"] });
  const { data: integrations, isLoading: integrationsLoading } = useQuery<Integration[]>({ queryKey: ["/api/integrations"] });

  const seedMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/seed"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      toast({ title: "Demo data loaded", description: "Sample activities and content drafts have been added." });
    },
    onError: (error: Error) => {
      toast({ title: "Seed failed", description: error.message, variant: "destructive" });
    },
  });

  const generateMutation = useMutation({
    mutationFn: (activityId: string) => apiRequest("POST", `/api/activities/${activityId}/generate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      toast({ title: "Content generated", description: "Review it in your Content Queue." });
    },
    onError: (error: Error) => {
      toast({ title: "Generation failed", description: error.message, variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/content/${id}`, { status: "published" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      toast({ title: "Post approved", description: "Your content has been marked as published." });
    },
    onError: (error: Error) => {
      toast({ title: "Approval failed", description: error.message, variant: "destructive" });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const connected = integrations?.filter(i => i.status === "connected") || [];
      await Promise.all(connected.map(i => apiRequest("POST", "/api/integrations/sync", { type: i.type })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      toast({ title: "Sync complete", description: "Activities updated from all connected integrations." });
    },
    onError: (error: Error) => {
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    },
  });

  const connectedCount = integrations?.filter(i => i.status === "connected").length || 0;
  const pendingDrafts = content?.filter(c => c.status === "draft").length || 0;
  const publishedCount = content?.filter(c => c.status === "published").length || 0;
  const unprocessedActivities = activities?.filter(a => !a.isProcessed).length || 0;

  const recentActivities = activities?.slice(0, 5) || [];
  const pendingContent = content?.filter(c => c.status === "draft").slice(0, 3) || [];

  const isEmpty = !activitiesLoading && !contentLoading && (activities?.length ?? 0) === 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Your silent partner — building your brand while you build your product</p>
        </div>
        <div className="flex items-center gap-2">
          {isEmpty && (
            <Button
              variant="outline"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              data-testid="button-load-demo"
            >
              {seedMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
              Load Demo Data
            </Button>
          )}
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || connectedCount === 0}
            data-testid="button-sync-activities"
          >
            {syncMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Sync Now
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="New Activities"
          value={unprocessedActivities}
          icon={Zap}
          description="Ready to turn into content"
          loading={activitiesLoading}
          accent="text-primary"
        />
        <StatCard
          title="Drafts Pending"
          value={pendingDrafts}
          icon={FileText}
          description="Awaiting your approval"
          loading={contentLoading}
          accent="text-yellow-500"
        />
        <StatCard
          title="Posts Published"
          value={publishedCount}
          icon={Activity}
          description="Live on LinkedIn"
          loading={contentLoading}
          accent="text-green-500"
        />
        <StatCard
          title={`Integrations`}
          value={`${connectedCount} connected`}
          icon={Activity}
          description="Go to Integrations to connect more"
          loading={integrationsLoading}
          accent="text-blue-500"
        />
      </div>

      {isEmpty && (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
              <Sparkles className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">Welcome to LinkedQueue</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              Your silent partner for building in public. Connect your tools, and LinkedQueue automatically turns your daily work into LinkedIn content.
            </p>
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <Link href="/integrations">
                <Button data-testid="button-connect-integrations">
                  Connect Integrations
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
                data-testid="button-load-demo-empty"
              >
                {seedMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Try with Demo Data
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!isEmpty && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
              <CardTitle className="text-base">Recent Activities</CardTitle>
              <Link href="/activities">
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" data-testid="link-view-all-activities">
                  View all <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {activitiesLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                    <Skeleton className="h-7 w-7 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))
              ) : recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <ActivityItem
                    key={activity.id}
                    activity={activity}
                    onGenerate={(id) => generateMutation.mutate(id)}
                    isGenerating={generateMutation.isPending}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Activity className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">No activities yet</p>
                  <p className="text-xs text-muted-foreground mb-3">Connect integrations and sync to capture your work</p>
                  <Link href="/integrations">
                    <Button size="sm" data-testid="button-connect-integrations-small">Connect integrations</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
              <CardTitle className="text-base">Content Queue</CardTitle>
              <Link href="/content">
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" data-testid="link-view-all-content">
                  View all <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {contentLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-3 rounded-lg border space-y-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))
              ) : pendingContent.length > 0 ? (
                pendingContent.map((item) => (
                  <ContentItem
                    key={item.id}
                    content={item}
                    onApprove={(id) => approveMutation.mutate(id)}
                    isUpdating={approveMutation.isPending}
                  />
                ))
              ) : content && content.length > 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">No drafts pending</p>
                  <p className="text-xs text-muted-foreground">All drafts have been approved</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Sparkles className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">No content yet</p>
                  <p className="text-xs text-muted-foreground">Click "Generate" on an activity to create a post</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
