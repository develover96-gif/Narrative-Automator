import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  GitCommit, 
  CheckSquare, 
  GitPullRequest,
  Milestone,
  Search,
  Sparkles,
  Loader2,
  Activity,
  Filter
} from "lucide-react";
import { Github } from "lucide-react";
import { SiLinear } from "react-icons/si";
import type { Activity as ActivityType } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useState } from "react";

function ActivityCard({ 
  activity, 
  onGenerate,
  isGenerating 
}: { 
  activity: ActivityType;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  const getIcon = () => {
    switch (activity.type) {
      case "commit":
        return <GitCommit className="h-5 w-5" />;
      case "issue_completed":
        return <CheckSquare className="h-5 w-5" />;
      case "pr_merged":
        return <GitPullRequest className="h-5 w-5" />;
      case "milestone":
        return <Milestone className="h-5 w-5" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  const getSourceIcon = () => {
    switch (activity.source) {
      case "github":
        return <Github className="h-4 w-4" />;
      case "linear":
        return <SiLinear className="h-4 w-4" />;
      default:
        return null;
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

  const getTypeLabel = () => {
    switch (activity.type) {
      case "commit":
        return "Code Commit";
      case "issue_completed":
        return "Issue Completed";
      case "pr_merged":
        return "PR Merged";
      case "milestone":
        return "Milestone Reached";
      default:
        return activity.type;
    }
  };

  return (
    <Card className="hover-elevate transition-all">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${getSourceColor()}`}>
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="flex items-center gap-1">
                  {getSourceIcon()}
                  <span className="capitalize">{activity.source}</span>
                </Badge>
                <Badge variant="secondary">{getTypeLabel()}</Badge>
                {activity.isProcessed && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Processed
                  </Badge>
                )}
              </div>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {format(new Date(activity.eventDate), "MMM d, h:mm a")}
              </span>
            </div>
            <h3 className="font-semibold text-lg mb-1">{activity.title}</h3>
            <p className="text-muted-foreground text-sm line-clamp-2">
              {activity.description || "No description available"}
            </p>
            {activity.metadata && (
              <div className="mt-3 p-3 rounded-md bg-muted/50 font-mono text-xs overflow-x-auto">
                <pre className="whitespace-pre-wrap">
                  {typeof activity.metadata === "string" 
                    ? activity.metadata 
                    : JSON.stringify(activity.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end mt-4 pt-4 border-t">
          <Button 
            onClick={onGenerate}
            disabled={isGenerating || activity.isProcessed}
            data-testid={`button-generate-content-${activity.id}`}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {activity.isProcessed ? "Content Generated" : "Generate Content"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Activities() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const { data: activities, isLoading } = useQuery<ActivityType[]>({
    queryKey: ["/api/activities"],
  });

  const generateMutation = useMutation({
    mutationFn: async (activityId: string) => {
      setGeneratingId(activityId);
      return apiRequest("POST", `/api/activities/${activityId}/generate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      toast({
        title: "Content generated",
        description: "Your content has been generated and added to the queue.",
      });
      setGeneratingId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Generation failed",
        description: error.message,
        variant: "destructive",
      });
      setGeneratingId(null);
    },
  });

  const filteredActivities = activities?.filter((activity) => {
    const matchesSearch = 
      activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource = sourceFilter === "all" || activity.source === sourceFilter;
    const matchesType = typeFilter === "all" || activity.type === typeFilter;
    return matchesSearch && matchesSource && matchesType;
  }) || [];

  const uniqueSources = [...new Set(activities?.map(a => a.source) || [])];
  const uniqueTypes = [...new Set(activities?.map(a => a.type) || [])];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Activity Feed</h1>
        <p className="text-muted-foreground">
          All activities captured from your connected integrations
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-activities"
              />
            </div>
            <div className="flex gap-2">
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[140px]" data-testid="select-source-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {uniqueSources.map((source) => (
                    <SelectItem key={source} value={source} className="capitalize">
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px]" data-testid="select-type-filter">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueTypes.map((type) => (
                    <SelectItem key={type} value={type} className="capitalize">
                      {type.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-24" />
                    </div>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredActivities.length > 0 ? (
          filteredActivities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              onGenerate={() => generateMutation.mutate(activity.id)}
              isGenerating={generatingId === activity.id}
            />
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Activity className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No activities found</h3>
              <p className="text-muted-foreground text-center max-w-md">
                {searchQuery || sourceFilter !== "all" || typeFilter !== "all"
                  ? "Try adjusting your filters or search query"
                  : "Connect your integrations and sync to start capturing activities"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
