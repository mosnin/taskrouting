import { createHmac, timingSafeEqual } from "crypto";
import type { ProviderAdapter, NormalizedEvent, DefaultRecipe, WritebackAction } from "./types";

export const linearAdapter: ProviderAdapter = {
  provider: "LINEAR",
  displayName: "Linear",
  description: "Sync issues and project tracking",
  icon: "linear",

  getAuthUrl(workspaceId: string, redirectUrl: string): string {
    const params = new URLSearchParams({
      client_id: process.env.LINEAR_CLIENT_ID ?? "",
      redirect_uri: redirectUrl,
      response_type: "code",
      scope: "read,write",
      state: workspaceId,
    });
    return `https://linear.app/oauth/authorize?${params.toString()}`;
  },

  async handleCallback(_workspaceId: string, code: string) {
    const response = await fetch("https://api.linear.app/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.LINEAR_CLIENT_ID ?? "",
        client_secret: process.env.LINEAR_CLIENT_SECRET ?? "",
        code,
        grant_type: "authorization_code",
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/integrations/callback/linear`,
      }),
    });
    const data = await response.json();
    if (data.error) {
      throw new Error(`Linear OAuth error: ${data.error}`);
    }

    // Get organization info
    const orgResponse = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${data.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "{ organization { id name } }",
      }),
    });
    const orgData = await orgResponse.json();

    return {
      credentials: JSON.stringify({
        access_token: data.access_token,
        token_type: data.token_type,
      }),
      accountId: orgData.data?.organization?.id,
      accountName: orgData.data?.organization?.name,
    };
  },

  verifyWebhook(payload: string | Buffer, signature: string, secret: string): boolean {
    const body = typeof payload === "string" ? payload : payload.toString();
    const expected = createHmac("sha256", secret).update(body).digest("hex");
    try {
      return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  },

  normalizeEvent(eventType: string, payload: unknown): NormalizedEvent | null {
    const p = payload as any;

    if (p.type === "Issue" && p.action === "create") {
      return {
        provider: "LINEAR",
        eventType: "issue_created",
        externalId: p.data?.id || "",
        externalType: "issue",
        title: p.data?.title || "Untitled",
        description: p.data?.description || "",
        url: p.url,
        metadata: {
          identifier: p.data?.identifier,
          priority: p.data?.priority,
          state: p.data?.state?.name,
          team: p.data?.team?.name,
          assignee: p.data?.assignee?.name,
        },
        raw: payload,
      };
    }

    return null;
  },

  async writeback(credentials: string, action: WritebackAction) {
    const creds = JSON.parse(credentials);

    if (action.type === "update_issue") {
      const { issueId, ...updates } = action.payload as any;
      const response = await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creds.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `mutation { issueUpdate(id: "${issueId}", input: ${JSON.stringify(updates)}) { success } }`,
        }),
      });
      const data = await response.json();
      return { success: !!data.data?.issueUpdate?.success };
    }

    if (action.type === "add_comment") {
      const { issueId, body } = action.payload as any;
      const response = await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creds.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `mutation { commentCreate(input: { issueId: "${issueId}", body: "${body}" }) { success } }`,
        }),
      });
      const data = await response.json();
      return { success: !!data.data?.commentCreate?.success };
    }

    return { success: false, error: `Unknown action type: ${action.type}` };
  },

  async healthCheck(credentials: string): Promise<boolean> {
    const creds = JSON.parse(credentials);
    const response = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: "{ viewer { id } }" }),
    });
    const data = await response.json();
    return !!data.data?.viewer?.id;
  },

  getDefaultRecipes(): DefaultRecipe[] {
    return [
      {
        name: "Linear issue → Sync task",
        description: "Creates a task when a Linear issue is created",
        trigger: { eventType: "issue_created" },
        action: {
          type: "create_task",
          config: {
            titleTemplate: "{{title}}",
            queueName: "Engineering",
            priority: "MEDIUM",
          },
        },
      },
    ];
  },
};
