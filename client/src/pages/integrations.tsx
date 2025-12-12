import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Github, 
  RefreshCw,
  Check,
  X,
  Loader2,
  AlertCircle
} from "lucide-react";
import { SiLinear, SiJira, SiAsana } from "react-icons/si";
import type { Integration } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const integrationConfigs = [
  {
    type: "github",
    name: "GitHub",
    description: "Connect to monitor commits, pull requests, and repository activity",
    icon: Github,
    color: "bg-gray-900 dark:bg-white text-white dark:text-gray-900",
    available: true,
  },
  {
    type: "linear",
    name: "Linear",
    description: "Track completed issues, projects, and team milestones",
    icon: SiLinear,
    color: "bg-indigo-600 text-white",
    available: true,
  },
  {
    type: "jira",
    name: "Jira",
    description: "Monitor tickets, sprints, and project progress",
    icon: SiJira,
    color: "bg-blue-600 text-white",
    available: false,
  },
  {
    type: "asana",
    name: "Asana",
    description: "Track tasks, projects, and team workflows",
    icon: SiAsana,
    color: "bg-orange-500 text-white",
    available: false,
  },
];

function IntegrationCard({ 
  config, 
  integration,
  onConnect,
  onDisconnect,
  onSync,
  isLoading 
}: {
  config: typeof integrationConfigs[0];
  integration?: Integration;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync: () => void;
  isLoading: boolean;
}) {
  const Icon = config.icon;
  const isConnected = integration?.status === "connected";
  const isSyncing = integration?.status === "syncing";
  const hasError = integration?.status === "error";

  const getStatusBadge = () => {
    if (!config.available) {
      return <Badge variant="secondary">Coming Soon</Badge>;
    }
    if (isConnected) {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <Check className="h-3 w-3 mr-1" />
          Connected
        </Badge>
      );
    }
    if (isSyncing) {
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Syncing
        </Badge>
      );
    }
    if (hasError) {
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          Error
        </Badge>
      );
    }
    return <Badge variant="secondary">Not Connected</Badge>;
  };

  return (
    <Card className={!config.available ? "opacity-60" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${config.color}`}>
            <Icon className="h-6 w-6" />
          </div>
          {getStatusBadge()}
        </div>
        <CardTitle className="mt-4">{config.name}</CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {integration?.lastSyncAt && (
          <p className="text-xs text-muted-foreground mb-4">
            Last synced: {format(new Date(integration.lastSyncAt), "MMM d, h:mm a")}
          </p>
        )}
        <div className="flex gap-2">
          {!config.available ? (
            <Button variant="secondary" disabled className="w-full">
              Coming Soon
            </Button>
          ) : isConnected ? (
            <>
              <Button 
                variant="outline" 
                onClick={onSync}
                disabled={isLoading || isSyncing}
                data-testid={`button-sync-${config.type}`}
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
              <Button 
                variant="destructive" 
                className="flex-1"
                onClick={onDisconnect}
                disabled={isLoading}
                data-testid={`button-disconnect-${config.type}`}
              >
                <X className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </>
          ) : (
            <Button 
              className="w-full"
              onClick={onConnect}
              disabled={isLoading}
              data-testid={`button-connect-${config.type}`}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Connect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Integrations() {
  const { toast } = useToast();

  const { data: integrations, isLoading } = useQuery<Integration[]>({
    queryKey: ["/api/integrations"],
  });

  const connectMutation = useMutation({
    mutationFn: async (type: string) => {
      return apiRequest("POST", "/api/integrations/connect", { type });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      toast({
        title: "Integration connected",
        description: "Your integration has been connected successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Connection failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (type: string) => {
      return apiRequest("POST", "/api/integrations/disconnect", { type });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      toast({
        title: "Integration disconnected",
        description: "Your integration has been disconnected.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Disconnection failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (type: string) => {
      return apiRequest("POST", "/api/integrations/sync", { type });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: "Sync complete",
        description: "Your activities have been synced.",
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

  const getIntegration = (type: string) => {
    return integrations?.find(i => i.type === type);
  };

  const connectedCount = integrations?.filter(i => i.status === "connected").length || 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          Connect your work tools to automatically capture activities
        </p>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Connection Status</h3>
              <p className="text-sm text-muted-foreground">
                {connectedCount} of 4 integrations connected
              </p>
            </div>
            <div className="flex gap-1">
              {integrationConfigs.map((config) => {
                const integration = getIntegration(config.type);
                const isConnected = integration?.status === "connected";
                return (
                  <div
                    key={config.type}
                    className={`h-3 w-3 rounded-full ${
                      isConnected ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <Skeleton className="h-6 w-32 mt-4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))
        ) : (
          integrationConfigs.map((config) => (
            <IntegrationCard
              key={config.type}
              config={config}
              integration={getIntegration(config.type)}
              onConnect={() => connectMutation.mutate(config.type)}
              onDisconnect={() => disconnectMutation.mutate(config.type)}
              onSync={() => syncMutation.mutate(config.type)}
              isLoading={
                connectMutation.isPending || 
                disconnectMutation.isPending || 
                syncMutation.isPending
              }
            />
          ))
        )}
      </div>
    </div>
  );
}
