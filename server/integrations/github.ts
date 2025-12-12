import { Octokit } from '@octokit/rest';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
export async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

// Check if GitHub is connected
export async function isGitHubConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}

// Fetch recent commits from user's repositories
export async function fetchRecentCommits(limit: number = 20) {
  const octokit = await getUncachableGitHubClient();
  
  // Get authenticated user
  const { data: user } = await octokit.users.getAuthenticated();
  
  // Get user's recent events (commits, PRs, etc.)
  const { data: events } = await octokit.activity.listEventsForAuthenticatedUser({
    username: user.login,
    per_page: 100,
  });
  
  const activities = [];
  
  for (const event of events) {
    if (event.type === 'PushEvent' && event.payload && 'commits' in event.payload) {
      const commits = event.payload.commits || [];
      for (const commit of commits.slice(0, 3)) {
        activities.push({
          source: 'github' as const,
          type: 'commit' as const,
          title: commit.message?.split('\n')[0] || 'Code commit',
          description: commit.message || '',
          metadata: {
            sha: commit.sha,
            repo: event.repo?.name,
            author: commit.author?.name,
            url: `https://github.com/${event.repo?.name}/commit/${commit.sha}`,
          },
          eventDate: new Date(event.created_at || Date.now()),
        });
      }
    } else if (event.type === 'PullRequestEvent' && event.payload && 'action' in event.payload) {
      const action = event.payload.action;
      const pr = (event.payload as any).pull_request;
      if (action === 'closed' && pr?.merged) {
        activities.push({
          source: 'github' as const,
          type: 'pr_merged' as const,
          title: `Merged: ${pr.title}`,
          description: pr.body || '',
          metadata: {
            number: pr.number,
            repo: event.repo?.name,
            url: pr.html_url,
            additions: pr.additions,
            deletions: pr.deletions,
          },
          eventDate: new Date(event.created_at || Date.now()),
        });
      }
    }
  }
  
  return activities.slice(0, limit);
}
