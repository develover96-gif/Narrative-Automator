import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  Eye,
  ThumbsUp,
  MessageSquare,
  Share2,
  TrendingUp,
  FileText,
  Clock,
  Zap,
} from "lucide-react";
import type { Content } from "@shared/schema";
import { format } from "date-fns";

interface AnalyticsData {
  totalPublished: number;
  totalDrafts: number;
  totalScheduled: number;
  totalActivities: number;
  processedActivities: number;
  weeklyPosts: number;
  engagement: {
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    avgEngagementRate: string;
  };
  topPosts: Content[];
  recentContent: Content[];
  recentActivities: any[];
}

function MetricCard({
  title,
  value,
  icon: Icon,
  description,
  loading,
  color = "text-primary",
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description: string;
  loading?: boolean;
  color?: string;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-1" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function TopPostCard({ post }: { post: Content }) {
  const metrics = post.engagementMetrics as any;
  const totalEngagement = (metrics?.likes || 0) + (metrics?.comments || 0);
  const engagementRate = metrics?.views > 0 ? ((totalEngagement / metrics.views) * 100).toFixed(1) : "0";

  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm line-clamp-2 mb-2">
          {post.title || post.body.split("\n")[0].slice(0, 80)}
        </p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {(metrics?.views || 0).toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <ThumbsUp className="h-3 w-3" />
            {(metrics?.likes || 0).toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {(metrics?.comments || 0).toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Share2 className="h-3 w-3" />
            {(metrics?.shares || 0).toLocaleString()}
          </span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <Badge variant="secondary" className="text-xs font-mono">{engagementRate}%</Badge>
        <p className="text-xs text-muted-foreground mt-1">
          {post.publishedAt ? format(new Date(post.publishedAt), "MMM d") : "—"}
        </p>
      </div>
    </div>
  );
}

export default function Analytics() {
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics"],
  });

  const conversionRate =
    analytics && analytics.totalActivities > 0
      ? ((analytics.processedActivities / analytics.totalActivities) * 100).toFixed(0)
      : "0";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Track your building in public performance</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Views"
          value={analytics?.engagement.totalViews ?? 0}
          icon={Eye}
          description="Across all published posts"
          loading={isLoading}
          color="text-blue-500"
        />
        <MetricCard
          title="Total Likes"
          value={analytics?.engagement.totalLikes ?? 0}
          icon={ThumbsUp}
          description="Post reactions received"
          loading={isLoading}
          color="text-green-500"
        />
        <MetricCard
          title="Comments"
          value={analytics?.engagement.totalComments ?? 0}
          icon={MessageSquare}
          description="Community conversations"
          loading={isLoading}
          color="text-violet-500"
        />
        <MetricCard
          title="Avg Engagement"
          value={`${analytics?.engagement.avgEngagementRate ?? "0"}%`}
          icon={TrendingUp}
          description="(Likes + Comments) / Views"
          loading={isLoading}
          color="text-orange-500"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Posts Published"
          value={analytics?.totalPublished ?? 0}
          icon={FileText}
          description="Live on LinkedIn"
          loading={isLoading}
        />
        <MetricCard
          title="Posts This Week"
          value={analytics?.weeklyPosts ?? 0}
          icon={Zap}
          description="Last 7 days"
          loading={isLoading}
        />
        <MetricCard
          title="Drafts Pending"
          value={analytics?.totalDrafts ?? 0}
          icon={Clock}
          description="Awaiting your review"
          loading={isLoading}
        />
        <MetricCard
          title="Activity → Content"
          value={`${conversionRate}%`}
          icon={BarChart3}
          description="Activities converted to posts"
          loading={isLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Posts</CardTitle>
            <CardDescription>Your highest engagement content</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-lg border">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-12" />
                </div>
              ))
            ) : analytics?.topPosts && analytics.topPosts.length > 0 ? (
              analytics.topPosts.map((post) => (
                <TopPostCard key={post.id} post={post} />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <BarChart3 className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="font-medium">No published posts yet</p>
                <p className="text-sm text-muted-foreground">Approve and publish content to see analytics</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content Pipeline</CardTitle>
            <CardDescription>Overview of your content stages</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  { label: "Activities Detected", value: analytics?.totalActivities ?? 0, color: "bg-blue-500", max: Math.max(analytics?.totalActivities ?? 1, 1) },
                  { label: "Content Generated", value: analytics?.processedActivities ?? 0, color: "bg-violet-500", max: Math.max(analytics?.totalActivities ?? 1, 1) },
                  { label: "Drafts Awaiting Review", value: analytics?.totalDrafts ?? 0, color: "bg-yellow-500", max: Math.max(analytics?.totalActivities ?? 1, 1) },
                  { label: "Scheduled", value: analytics?.totalScheduled ?? 0, color: "bg-blue-400", max: Math.max(analytics?.totalActivities ?? 1, 1) },
                  { label: "Published", value: analytics?.totalPublished ?? 0, color: "bg-green-500", max: Math.max(analytics?.totalActivities ?? 1, 1) },
                ].map(({ label, value, color, max }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-semibold">{value}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && (
              <div className="mt-6 pt-4 border-t">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-muted/60 p-3">
                    <p className="text-muted-foreground text-xs mb-1">Pipeline Efficiency</p>
                    <p className="font-bold text-lg">{conversionRate}%</p>
                    <p className="text-xs text-muted-foreground">activities → content</p>
                  </div>
                  <div className="rounded-lg bg-muted/60 p-3">
                    <p className="text-muted-foreground text-xs mb-1">Weekly Velocity</p>
                    <p className="font-bold text-lg">{analytics?.weeklyPosts ?? 0}</p>
                    <p className="text-xs text-muted-foreground">posts this week</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
