import { createHmac, timingSafeEqual } from "crypto";
import type { ProviderAdapter, NormalizedEvent, DefaultRecipe, WritebackAction } from "./types";

export const slackAdapter: ProviderAdapter = {
  provider: "SLACK",
  displayName: "Slack",
  description: "Route messages and mentions to tasks",
  icon: "slack",

  getAuthUrl(workspaceId: string, redirectUrl: string): string {
    const params = new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID ?? "",
      redirect_uri: redirectUrl,
      scope: "channels:read,chat:write,app_mentions:read,commands",
      state: workspaceId,
    });
    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  },

  async handleCallback(_workspaceId: string, code: string) {
    const response = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID ?? "",
        client_secret: process.env.SLACK_CLIENT_SECRET ?? "",
        code,
      }),
    });
    const data = await response.json();
    if (!data.ok) {
      throw new Error(`Slack OAuth error: ${data.error}`);
    }

    return {
      credentials: JSON.stringify({
        access_token: data.access_token,
        team_id: data.team.id,
        team_name: data.team.name,
        bot_user_id: data.bot_user_id,
      }),
      accountId: data.team.id,
      accountName: data.team.name,
    };
  },

  verifyWebhook(payload: string | Buffer, signature: string, secret: string): boolean {
    // Slack uses X-Slack-Signature with timestamp
    const body = typeof payload === "string" ? payload : payload.toString();
    const [version, hash] = signature.split("=");
    if (version !== "v0") return false;
    const expected = createHmac("sha256", secret).update(`v0:${Date.now()}:${body}`).digest("hex");
    try {
      return timingSafeEqual(Buffer.from(hash ?? ""), Buffer.from(expected));
    } catch {
      return false;
    }
  },

  normalizeEvent(eventType: string, payload: unknown): NormalizedEvent | null {
    const p = payload as any;

    if (eventType === "app_mention") {
      return {
        provider: "SLACK",
        eventType: "app_mention",
        externalId: p.event?.ts || String(Date.now()),
        externalType: "message",
        title: `Slack mention: ${(p.event?.text || "").slice(0, 100)}`,
        description: p.event?.text || "",
        metadata: {
          channel: p.event?.channel,
          user: p.event?.user,
          ts: p.event?.ts,
        },
        raw: payload,
      };
    }

    return null;
  },

  async writeback(credentials: string, action: WritebackAction) {
    const creds = JSON.parse(credentials);

    if (action.type === "send_message") {
      const { channel, text } = action.payload as any;
      const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creds.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ channel, text }),
      });
      const data = await response.json();
      return { success: data.ok, error: data.ok ? undefined : data.error };
    }

    return { success: false, error: `Unknown action type: ${action.type}` };
  },

  async healthCheck(credentials: string): Promise<boolean> {
    const creds = JSON.parse(credentials);
    const response = await fetch("https://slack.com/api/auth.test", {
      headers: { Authorization: `Bearer ${creds.access_token}` },
    });
    const data = await response.json();
    return data.ok;
  },

  getDefaultRecipes(): DefaultRecipe[] {
    return [
      {
        name: "App mention → Intake task",
        description: "Creates an intake task when the bot is mentioned",
        trigger: { eventType: "app_mention" },
        action: {
          type: "create_task",
          config: {
            titleTemplate: "Slack request: {{title}}",
            queueName: "Support",
            priority: "MEDIUM",
          },
        },
      },
    ];
  },
};
