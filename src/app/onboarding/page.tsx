"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FolderKanban,
  Building2,
  Megaphone,
  HeadphonesIcon,
  GitBranch as GithubIcon,
  MessageSquare,
  Layers,
  Bot,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

type UseCase = "ProductEngineering" | "AgencyOps" | "MarketingOps" | "SupportOps";

const useCases: { id: UseCase; name: string; description: string; icon: React.ReactNode; queues: string[]; integrations: string[] }[] = [
  {
    id: "ProductEngineering",
    name: "Product & Engineering",
    description: "Ship features, fix bugs, review PRs with AI agents",
    icon: <FolderKanban className="h-6 w-6" />,
    queues: ["Engineering", "QA", "Research", "Design"],
    integrations: ["GitHub", "Linear", "Slack"],
  },
  {
    id: "AgencyOps",
    name: "Agency Operations",
    description: "Coordinate client work across multiple tools and agents",
    icon: <Building2 className="h-6 w-6" />,
    queues: ["Client Work", "Internal", "Billing", "Support"],
    integrations: ["Slack", "Notion", "Stripe"],
  },
  {
    id: "MarketingOps",
    name: "Marketing Operations",
    description: "Content creation, campaign management, analytics with AI help",
    icon: <Megaphone className="h-6 w-6" />,
    queues: ["Content", "Campaigns", "Analytics", "Social"],
    integrations: ["Slack", "Notion", "Google Drive"],
  },
  {
    id: "SupportOps",
    name: "Support Operations",
    description: "Triage tickets, automate responses, escalate to humans",
    icon: <HeadphonesIcon className="h-6 w-6" />,
    queues: ["Triage", "Tier 1", "Tier 2", "Escalation"],
    integrations: ["Slack", "GitHub", "Stripe"],
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [workspaceName, setWorkspaceName] = useState("");
  const [selectedUseCase, setSelectedUseCase] = useState<UseCase | null>(null);
  const [agentName, setAgentName] = useState("");
  const [agentToken, setAgentToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState<string | null>(null);

  const selectedUseCaseData = useCases.find((u) => u.id === selectedUseCase);

  async function handleCreateWorkspace() {
    if (!workspaceName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: workspaceName, useCase: selectedUseCase }),
      });
      const data = await res.json();
      setCreatedWorkspaceId(data.workspaceId);
      setStep(3);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAgent() {
    if (!agentName.trim() || !createdWorkspaceId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: createdWorkspaceId,
          name: agentName,
          capabilities: ["write_code", "review_pr", "research", "triage"],
        }),
      });
      const data = await res.json();
      setAgentToken(data.rawToken);
      setStep(5);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function copyToken() {
    if (agentToken) {
      navigator.clipboard.writeText(agentToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xl">
                TR
              </div>
              <CardTitle className="text-2xl">Welcome to TaskRouting</CardTitle>
              <CardDescription>
                The control plane for multi-agent work. Let&apos;s set up your workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="workspace-name">Workspace Name</Label>
                <Input
                  id="workspace-name"
                  placeholder="My Team"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button
                className="w-full"
                disabled={!workspaceName.trim()}
                onClick={() => setStep(1)}
              >
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Use Case */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>What will you use TaskRouting for?</CardTitle>
              <CardDescription>
                This helps us set up the right queues and integrations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {useCases.map((uc) => (
                <button
                  key={uc.id}
                  onClick={() => {
                    setSelectedUseCase(uc.id);
                    setStep(2);
                  }}
                  className={`w-full flex items-start gap-4 p-4 rounded-lg border text-left transition-colors hover:bg-accent ${
                    selectedUseCase === uc.id ? "border-primary bg-accent" : "border-border"
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5 text-muted-foreground">{uc.icon}</div>
                  <div>
                    <div className="font-medium">{uc.name}</div>
                    <div className="text-sm text-muted-foreground">{uc.description}</div>
                  </div>
                </button>
              ))}
              <Button variant="ghost" onClick={() => setStep(0)} className="mt-2">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Confirm setup */}
        {step === 2 && selectedUseCaseData && (
          <Card>
            <CardHeader>
              <CardTitle>We&apos;ll set up your workspace with</CardTitle>
              <CardDescription>
                These defaults are based on your use case. You can customize later.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Default Queues</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedUseCaseData.queues.map((q) => (
                    <span
                      key={q}
                      className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm"
                    >
                      {q}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Recommended Integrations
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedUseCaseData.integrations.map((i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm flex items-center gap-1.5"
                    >
                      {i === "GitHub" && <GithubIcon className="h-3.5 w-3.5" />}
                      {i === "Slack" && <MessageSquare className="h-3.5 w-3.5" />}
                      {i === "Linear" && <Layers className="h-3.5 w-3.5" />}
                      {i}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button className="flex-1" onClick={handleCreateWorkspace} disabled={loading}>
                  {loading ? "Creating..." : "Create Workspace"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Integrations */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Connect your tools</CardTitle>
              <CardDescription>
                You can connect tools now or do it later from Settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(selectedUseCaseData?.integrations || ["GitHub", "Slack", "Linear"]).map((name) => (
                <div
                  key={name}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-3">
                    {name === "GitHub" && <GithubIcon className="h-5 w-5 text-muted-foreground" />}
                    {name === "Slack" && <MessageSquare className="h-5 w-5 text-muted-foreground" />}
                    {name === "Linear" && <Layers className="h-5 w-5 text-muted-foreground" />}
                    <span className="font-medium">{name}</span>
                  </div>
                  <Button variant="outline" size="sm">
                    Connect
                  </Button>
                </div>
              ))}
              <div className="flex gap-2 mt-4">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button className="flex-1" variant="outline" onClick={() => setStep(4)}>
                  Skip for now
                </Button>
                <Button className="flex-1" onClick={() => setStep(4)}>
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Add Agent */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" /> Register your first agent
              </CardTitle>
              <CardDescription>
                Add an external AI agent that will connect to TaskRouting via MCP.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="agent-name">Agent Name</Label>
                <Input
                  id="agent-name"
                  placeholder="e.g., CodeBot, ResearchAgent, TriageBot"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep(3)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => router.push("/")}>
                  Skip
                </Button>
                <Button className="flex-1" onClick={handleCreateAgent} disabled={!agentName.trim() || loading}>
                  {loading ? "Creating..." : "Create Agent & Token"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Show Token */}
        {step === 5 && agentToken && (
          <Card>
            <CardHeader>
              <CardTitle>Your agent token</CardTitle>
              <CardDescription>
                Copy this token now. It will <strong>never be shown again</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted rounded-lg p-4 font-mono text-sm break-all relative">
                {agentToken}
                <button
                  onClick={copyToken}
                  className="absolute top-2 right-2 p-1.5 rounded hover:bg-background transition-colors"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-200">
                Store this token securely. Your agent will use it to authenticate with
                TaskRouting&apos;s MCP server.
              </div>

              <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                <div className="font-medium">Connect your agent:</div>
                <pre className="text-xs overflow-x-auto">
{`# Set the token as an environment variable
export MCP_AGENT_TOKEN="${agentToken.slice(0, 12)}..."

# Run the MCP server (your agent connects via stdio)
npx tsx mcp-server/index.ts`}
                </pre>
              </div>

              <Button className="w-full" onClick={() => router.push("/")}>
                Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
