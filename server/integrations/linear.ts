import { LinearClient } from '@linear/sdk';

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
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=linear',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Linear not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
export async function getUncachableLinearClient() {
  const accessToken = await getAccessToken();
  return new LinearClient({ accessToken });
}

// Check if Linear is connected
export async function isLinearConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}

// Fetch recently completed issues
export async function fetchCompletedIssues(limit: number = 20) {
  const client = await getUncachableLinearClient();
  
  // Get completed issues from the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const issues = await client.issues({
    filter: {
      completedAt: { gte: sevenDaysAgo },
    },
    orderBy: { updatedAt: 'descending' } as any,
    first: limit,
  });
  
  const activities = [];
  
  for (const issue of issues.nodes) {
    const state = await issue.state;
    const project = await issue.project;
    
    activities.push({
      source: 'linear' as const,
      type: 'issue_completed' as const,
      title: issue.title,
      description: issue.description || '',
      metadata: {
        identifier: issue.identifier,
        state: state?.name,
        project: project?.name,
        url: issue.url,
        priority: issue.priority,
        estimate: issue.estimate,
      },
      eventDate: issue.completedAt ? new Date(issue.completedAt) : new Date(),
    });
  }
  
  return activities;
}

// Fetch milestones/cycles
export async function fetchMilestones() {
  const client = await getUncachableLinearClient();
  
  const cycles = await client.cycles({
    filter: {
      endsAt: { lte: new Date() },
    },
    orderBy: { endsAt: 'descending' } as any,
    first: 5,
  });
  
  const activities = [];
  
  for (const cycle of cycles.nodes) {
    const team = await cycle.team;
    
    activities.push({
      source: 'linear' as const,
      type: 'milestone' as const,
      title: `Cycle completed: ${cycle.name || cycle.number}`,
      description: `Completed ${cycle.completedIssueCountHistory?.slice(-1)[0] || 0} issues`,
      metadata: {
        number: cycle.number,
        team: team?.name,
        progress: cycle.progress,
        completedAt: cycle.endsAt,
      },
      eventDate: cycle.endsAt ? new Date(cycle.endsAt) : new Date(),
    });
  }
  
  return activities;
}
