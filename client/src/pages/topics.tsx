import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Rss, X, Plus, Loader2, Hash, User, Building2 } from "lucide-react";
import type { WatchedTopic } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { format } from "date-fns";

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  keyword: { label: "Keyword", icon: Hash, color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  influencer: { label: "Influencer", icon: User, color: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200" },
  competitor: { label: "Competitor", icon: Building2, color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
};

export default function Topics() {
  const { toast } = useToast();
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState("keyword");

  const { data: topics, isLoading } = useQuery<WatchedTopic[]>({
    queryKey: ["/api/topics"],
  });

  const addMutation = useMutation({
    mutationFn: (data: { keyword: string; type: string }) =>
      apiRequest("POST", "/api/topics", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/topics"] });
      setKeyword("");
      toast({ title: "Topic added", description: "We'll monitor this for content opportunities." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add topic", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/topics/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/topics"] });
      toast({ title: "Topic removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove topic", description: error.message, variant: "destructive" });
    },
  });

  const handleAdd = () => {
    if (!keyword.trim()) return;
    addMutation.mutate({ keyword: keyword.trim(), type });
  };

  const groupedTopics = topics?.reduce((acc, topic) => {
    if (!acc[topic.type]) acc[topic.type] = [];
    acc[topic.type].push(topic);
    return acc;
  }, {} as Record<string, WatchedTopic[]>);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trending Topics</h1>
        <p className="text-muted-foreground">Monitor keywords, influencers, and competitors to surface content opportunities</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Topic to Monitor</CardTitle>
          <CardDescription>
            Track a keyword, influencer handle, or competitor to identify content gaps and trending discussions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-40" data-testid="select-topic-type">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keyword">Keyword</SelectItem>
                <SelectItem value="influencer">Influencer</SelectItem>
                <SelectItem value="competitor">Competitor</SelectItem>
              </SelectContent>
            </Select>
            <Input
              className="flex-1 min-w-48"
              placeholder={
                type === "keyword" ? "e.g., SaaS pricing, indie hacker, building in public" :
                type === "influencer" ? "e.g., @levelsio, @patio11, @dvassallo" :
                "e.g., Taplio, Typefully, AuthoredUp"
              }
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              data-testid="input-topic-keyword"
            />
            <Button
              onClick={handleAdd}
              disabled={!keyword.trim() || addMutation.isPending}
              data-testid="button-add-topic"
            >
              {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span className="ml-2">Add</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : !topics || topics.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Rss className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No topics yet</h3>
            <p className="text-muted-foreground max-w-sm">
              Add keywords, influencers, or competitors above to start monitoring trending discussions and identifying content opportunities.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(TYPE_CONFIG).map(([typeKey, config]) => {
            const items = groupedTopics?.[typeKey] || [];
            if (items.length === 0) return null;
            const Icon = config.icon;
            return (
              <Card key={typeKey}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-4 w-4" />
                    {config.label}s
                    <Badge variant="secondary" className="ml-auto">{items.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {items.map((topic) => (
                      <div
                        key={topic.id}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${config.color}`}
                        data-testid={`topic-${topic.id}`}
                      >
                        <span>{topic.keyword}</span>
                        <button
                          onClick={() => deleteMutation.mutate(topic.id)}
                          disabled={deleteMutation.isPending}
                          className="hover:opacity-60 transition-opacity ml-1"
                          data-testid={`button-remove-topic-${topic.id}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="border-dashed">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <Rss className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">How monitoring works</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                LinkedQueue surfaces trending discussions around your watched topics and identifies unanswered questions in your niche. This data feeds into AI-generated post suggestions tailored to current conversations — so your content is always relevant.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Keywords</strong> — monitor industry terms and discussions.<br />
                <strong>Influencers</strong> — track what your niche leaders are posting about.<br />
                <strong>Competitors</strong> — generate reaction content when they announce changes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
