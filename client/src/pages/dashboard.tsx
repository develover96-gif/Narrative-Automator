import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Activity, 
  FileText, 
  CheckCircle, 
  Clock,
  ArrowRight,
  GitCommit,
  CheckSquare,
  Sparkles,
  RefreshCw,
  Loader2
} from "lucide-react";
import { Link } from "wouter";
import type { Activity as ActivityType, Content, Integration } from "@shared/schema";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  description,
  loading 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType;
  description: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
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
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function ActivityItem({ activity }: { activity: ActivityType }) {
  const getIcon = () => {
    switch (activity.type) {
      case "commit":
        return <GitCommit className="h-4 w-4" />;
      case "issue_completed":
        return <CheckSquare className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getSourceColor = () => {
    switch (activity.source) {
      case "github":
        return "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900";
      case "linear":
        return "bg-indigo-600 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border bg-card hover-elevate transition-colors">
      <div className={`flex h-8 w-8 items-center justify-center rounded-md ${getSourceColor()}`}>
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{activity.title}</p>
        <p className="text-sm text-muted-foreground truncate">
          {activity.description || "No description"}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="secondary" className="text-xs">
            {activity.source}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {format(new Date(activity.eventDate), "MMM d, h:mm a")}
          </span>
        </div>
      </div>
      {!activity.isProcessed && (
        <Button size="sm" variant="outline" data-testid={`button-generate-${activity.id}`}>
          <Sparkles className="h-3 w-3 mr-1" />
          Generate
        </Button>
      )}
    </div>
  );
}

function ContentItem({ content }: { content: Content }) {
  const getStatusColor = () => {
    switch (content.status) {
      case "draft":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "scheduled":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "published":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  return (
    <div className="p-4 rounded-lg border bg-card hover-elevate transition-colors">
      <div className="flex items-start justify-between gap-4 mb-2">
        <Badge className={getStatusColor()}>
          {content.status}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {format(new Date(content.createdAt), "MMM d")}
        </span>
      </div>
      <p className="text-sm line-clamp-3">{content.body}</p>
      <div className="flex items-center justify-end mt-3 gap-2">
        <Link href={`/content/${content.id}`}>
          <Button size="sm" variant="ghost" data-testid={`button-edit-${content.id}`}>
            Edit
          </Button>
        </Link>
        <Button size="sm" data-testid={`button-approve-${content.id}`}>
          Approve
        </Button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { toast } = useToast();

  const { data: activities, isLoading: activitiesLoading } = useQuery<ActivityType[]>({
    queryKey: ["/api/activities"],
  });

  const { data: content, isLoading: contentLoading } = useQuery<Content[]>({
    queryKey: ["/api/content"],
  });

  const { data: integrations, isLoading: integrationsLoading } = useQuery<Integration[]>({
    queryKey: ["/api/integrations"],
  });

  const syncAllMutation = useMutation({
    mutationFn: async () => {
      const connectedIntegrations = integrations?.filter(i => i.status === "connected") || [];
      const results = await Promise.all(
        connectedIntegrations.map(integration => 
          apiRequest("POST", "/api/integrations/sync", { type: integration.type })
        )
      );
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      toast({
        title: "Sync complete",
        description: "Your activities have been synced from all connected integrations.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const connectedIntegrations = integrations?.filter(i => i.status === "connected").length || 0;
  const pendingDrafts = content?.filter(c => c.status === "draft").length || 0;
  const todayActivities = activities?.filter(a => {
    const today = new Date();
    const activityDate = new Date(a.eventDate);
    return activityDate.toDateString() === today.toDateString();
  }).length || 0;

  const recentActivities = activities?.slice(0, 5) || [];
  const pendingContent = content?.filter(c => c.status === "draft").slice(0, 3) || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Your building in public content automation hub
          </p>
        </div>
        <Button 
          onClick={() => syncAllMutation.mutate()}
          disabled={syncAllMutation.isPending || connectedIntegrations === 0}
          data-testid="button-sync-activities"
        >
          {syncAllMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Sync Activities
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Activities Today"
          value={todayActivities}
          icon={Activity}
          description="Events captured from integrations"
          loading={activitiesLoading}
        />
        <StatCard
          title="Drafts Pending"
          value={pendingDrafts}
          icon={FileText}
          description="Content awaiting review"
          loading={contentLoading}
        />
        <StatCard
          title="Integrations"
          value={`${connectedIntegrations}/4`}
          icon={CheckCircle}
          description="Connected services"
          loading={integrationsLoading}
        />
        <StatCard
          title="Queue Status"
          value="Active"
          icon={Clock}
          description="Content pipeline running"
          loading={false}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle>Recent Activity</CardTitle>
            <Link href="/activities">
              <Button variant="ghost" size="sm" data-testid="link-view-all-activities">
                View all
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {activitiesLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-lg border">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))
            ) : recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-1">No activities yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect your integrations to start capturing activities
                </p>
                <Link href="/integrations">
                  <Button data-testid="button-connect-integrations">
                    Connect Integrations
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle>Pending Drafts</CardTitle>
            <Link href="/content">
              <Button variant="ghost" size="sm" data-testid="link-view-all-content">
                View all
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {contentLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 rounded-lg border space-y-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))
            ) : pendingContent.length > 0 ? (
              pendingContent.map((item) => (
                <ContentItem key={item.id} content={item} />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-1">No pending content</h3>
                <p className="text-sm text-muted-foreground">
                  Generated content will appear here for review
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
