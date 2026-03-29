import { createHmac, timingSafeEqual } from "crypto";
import type { ProviderAdapter, NormalizedEvent, DefaultRecipe, WritebackAction } from "./types";

export const githubAdapter: ProviderAdapter = {
  provider: "GITHUB",
  displayName: "GitHub",
  description: "Sync issues, PRs, and code reviews",
  icon: "github",

  getAuthUrl(workspaceId: string, redirectUrl: string): string {
    const clientId = process.env.GITHUB_APP_ID || process.env.GITHUB_CLIENT_ID;
    const params = new URLSearchParams({
      client_id: clientId ?? "",
      redirect_uri: redirectUrl,
      scope: "repo,read:org",
      state: workspaceId,
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  },

  async handleCallback(workspaceId: string, code: string) {
    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const data = await response.json();
    if (data.error) {
      throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
    }

    // Get user info
    const userResponse = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const user = await userResponse.json();

    return {
      credentials: JSON.stringify({
        access_token: data.access_token,
        token_type: data.token_type,
        scope: data.scope,
      }),
      accountId: String(user.id),
      accountName: user.login,
    };
  },

  verifyWebhook(payload: string | Buffer, signature: string, secret: string): boolean {
    const expected = `sha256=${createHmac("sha256", secret)
      .update(payload)
      .digest("hex")}`;
    try {
      return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  },

  normalizeEvent(eventType: string, payload: unknown): NormalizedEvent | null {
    const p = payload as any;

    if (eventType === "pull_request" && p.action === "opened") {
      return {
        provider: "GITHUB",
        eventType: "pr_opened",
        externalId: String(p.pull_request.id),
        externalType: "pull_request",
        title: `Review PR: ${p.pull_request.title}`,
        description: p.pull_request.body || "",
        url: p.pull_request.html_url,
        metadata: {
          number: p.pull_request.number,
          repo: p.repository.full_name,
          author: p.pull_request.user.login,
          base: p.pull_request.base.ref,
          head: p.pull_request.head.ref,
        },
        raw: payload,
      };
    }

    if (eventType === "issues" && p.action === "opened") {
      return {
        provider: "GITHUB",
        eventType: "issue_opened",
        externalId: String(p.issue.id),
        externalType: "issue",
        title: p.issue.title,
        description: p.issue.body || "",
        url: p.issue.html_url,
        metadata: {
          number: p.issue.number,
          repo: p.repository.full_name,
          labels: p.issue.labels.map((l: any) => l.name),
          author: p.issue.user.login,
        },
        raw: payload,
      };
    }

    if (eventType === "issues" && p.action === "labeled") {
      return {
        provider: "GITHUB",
        eventType: "issue_labeled",
        externalId: String(p.issue.id),
        externalType: "issue",
        title: p.issue.title,
        url: p.issue.html_url,
        metadata: {
          number: p.issue.number,
          repo: p.repository.full_name,
          label: p.label?.name,
          labels: p.issue.labels.map((l: any) => l.name),
        },
        raw: payload,
      };
    }

    return null;
  },

  async writeback(credentials: string, action: WritebackAction) {
    const creds = JSON.parse(credentials);
    const token = creds.access_token;

    if (action.type === "add_comment") {
      const { owner, repo, issueNumber, body } = action.payload as any;
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
          },
          body: JSON.stringify({ body }),
        }
      );
      return { success: response.ok, error: response.ok ? undefined : await response.text() };
    }

    if (action.type === "update_issue") {
      const { owner, repo, issueNumber, ...updates } = action.payload as any;
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
          },
          body: JSON.stringify(updates),
        }
      );
      return { success: response.ok, error: response.ok ? undefined : await response.text() };
    }

    return { success: false, error: `Unknown action type: ${action.type}` };
  },

  async healthCheck(credentials: string): Promise<boolean> {
    const creds = JSON.parse(credentials);
    const response = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${creds.access_token}` },
    });
    return response.ok;
  },

  getDefaultRecipes(): DefaultRecipe[] {
    return [
      {
        name: "PR opened → Review task",
        description: "Creates a review task when a PR is opened",
        trigger: { eventType: "pr_opened" },
        action: {
          type: "create_task",
          config: {
            titleTemplate: "Review PR: {{title}}",
            queueName: "Engineering",
            requiredCapabilities: ["review_pr"],
            priority: "HIGH",
          },
        },
      },
      {
        name: "Bug issue → Bug queue",
        description: "Routes issues labeled 'bug' to the bug queue",
        trigger: {
          eventType: "issue_labeled",
          conditions: { label: "bug" },
        },
        action: {
          type: "route_to_queue",
          config: {
            queueName: "Engineering",
            requiredCapabilities: ["write_code"],
            priority: "HIGH",
          },
        },
      },
      {
        name: "New issue → Triage",
        description: "Creates a triage task for new issues",
        trigger: { eventType: "issue_opened" },
        action: {
          type: "create_task",
          config: {
            titleTemplate: "Triage: {{title}}",
            queueName: "Engineering",
            requiredCapabilities: ["triage"],
            priority: "MEDIUM",
          },
        },
      },
    ];
  },
};
