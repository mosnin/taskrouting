"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Zap,
  ArrowRight,
  ArrowLeft,
  Bot,
  Check,
  Copy,
  Sparkles,
  Code2,
  Server,
  FileText,
  Search,
  Settings,
} from "lucide-react";

const useCases = [
  { id: "engineering", label: "Engineering", icon: Code2, description: "Ship features and fix bugs with AI agents" },
  { id: "devops", label: "DevOps", icon: Server, description: "Automate infrastructure and deployments" },
  { id: "content", label: "Content", icon: FileText, description: "Create and manage content pipelines" },
  { id: "research", label: "Research", icon: Search, description: "Deep research and analysis workflows" },
  { id: "custom", label: "Custom", icon: Settings, description: "Build your own workflow from scratch" },
] as const;

const steps = [
  { label: "Workspace", number: 1 },
  { label: "Use Case", number: 2 },
  { label: "First Agent", number: 3 },
  { label: "Done", number: 4 },
];

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [workspaceName, setWorkspaceName] = useState("");
  const [selectedUseCase, setSelectedUseCase] = useState<string | null>(null);
  const [agentName, setAgentName] = useState("");
  const [agentDescription, setAgentDescription] = useState("");
  const [agentCapabilities, setAgentCapabilities] = useState("");
  const [agentToken, setAgentToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState<string | null>(null);

  const slug = slugify(workspaceName);

  const handleCreateWorkspace = useCallback(async () => {
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
      setStep(2);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [workspaceName, selectedUseCase]);

  const handleCreateAgent = useCallback(async () => {
    if (!agentName.trim() || !createdWorkspaceId) return;
    setLoading(true);
    try {
      const caps = agentCapabilities
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      const res = await fetch("/api/onboarding/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: createdWorkspaceId,
          name: agentName,
          description: agentDescription,
          capabilities: caps.length > 0 ? caps : ["write_code", "review_pr", "research", "triage"],
        }),
      });
      const data = await res.json();
      setAgentToken(data.rawToken);
      setStep(3);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [agentName, agentDescription, agentCapabilities, createdWorkspaceId]);

  function copyToken() {
    if (agentToken) {
      navigator.clipboard.writeText(agentToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="rounded-xl gradient-primary p-2">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold">TaskRouting</span>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-10">
        {steps.map((s, i) => (
          <div key={s.number} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                  i < step
                    ? "bg-primary text-primary-foreground"
                    : i === step
                    ? "gradient-primary text-white shadow-lg shadow-purple-200"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? <Check className="h-4 w-4" /> : s.number}
              </div>
              <span
                className={`text-xs mt-1.5 font-medium ${
                  i <= step ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-16 h-0.5 mx-2 mb-5 transition-colors duration-300 ${
                  i < step ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="w-full max-w-lg">
        {/* Step 1: Create Workspace */}
        {step === 0 && (
          <div className="bg-white rounded-2xl shadow-card border border-border p-8 animate-fade-in">
            <div className="space-y-1 mb-6">
              <h2 className="text-2xl font-bold">Create your workspace</h2>
              <p className="text-muted-foreground">
                Give your workspace a name. You can always change it later.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Workspace Name</Label>
                <Input
                  placeholder="My Team"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  autoFocus
                />
              </div>
              {slug && (
                <p className="text-sm text-muted-foreground">
                  Slug: <span className="font-mono text-foreground">{slug}</span>
                </p>
              )}
              <Button
                className="w-full gap-2 h-11"
                disabled={!workspaceName.trim()}
                onClick={() => setStep(1)}
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Use Case */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-card border border-border p-8 animate-fade-in">
            <div className="space-y-1 mb-6">
              <h2 className="text-2xl font-bold">What&apos;s your use case?</h2>
              <p className="text-muted-foreground">
                This helps us configure the right defaults for your workspace.
              </p>
            </div>

            <div className="grid gap-3">
              {useCases.map((uc) => {
                const Icon = uc.icon;
                const isSelected = selectedUseCase === uc.id;
                return (
                  <button
                    key={uc.id}
                    onClick={() => setSelectedUseCase(uc.id)}
                    className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200 hover:shadow-card-hover ${
                      isSelected
                        ? "border-primary bg-accent shadow-card-hover ring-1 ring-primary"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div
                      className={`rounded-lg p-2.5 ${
                        isSelected ? "gradient-primary text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium">{uc.label}</div>
                      <div className="text-sm text-muted-foreground">{uc.description}</div>
                    </div>
                    {isSelected && (
                      <Check className="h-5 w-5 text-primary ml-auto flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" onClick={() => setStep(0)} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                className="flex-1 gap-2 h-11"
                disabled={!selectedUseCase || loading}
                onClick={handleCreateWorkspace}
              >
                {loading ? "Creating..." : "Create Workspace"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: First Agent */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-card border border-border p-8 animate-fade-in">
            <div className="space-y-1 mb-6">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-bold">Register your first agent</h2>
              </div>
              <p className="text-muted-foreground">
                Add an AI agent that will connect to TaskRouting via MCP.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Agent Name</Label>
                <Input
                  placeholder="e.g., CodeBot, ResearchAgent"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="What does this agent do?"
                  value={agentDescription}
                  onChange={(e) => setAgentDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Capabilities</Label>
                <Input
                  placeholder="write_code, review_pr, research (comma-separated)"
                  value={agentCapabilities}
                  onChange={(e) => setAgentCapabilities(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated list of capabilities. Leave blank for defaults.
                </p>
              </div>

              <div className="flex gap-3 mt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setAgentToken(null);
                    setStep(3);
                  }}
                >
                  Skip
                </Button>
                <Button
                  className="flex-1 gap-2 h-11"
                  disabled={!agentName.trim() || loading}
                  onClick={handleCreateAgent}
                >
                  {loading ? "Creating..." : "Create Agent"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-card border border-border p-8 animate-fade-in">
            <div className="text-center mb-6">
              <div className="mx-auto mb-4 w-16 h-16 rounded-full gradient-primary flex items-center justify-center shadow-lg shadow-purple-200">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-2xl font-bold">You&apos;re all set!</h2>
              <p className="text-muted-foreground mt-1">
                Your workspace is ready. Start routing tasks to your agents.
              </p>
            </div>

            {/* Show token if an agent was created */}
            {agentToken && (
              <div className="space-y-3 mb-6">
                <div className="bg-muted rounded-xl p-4 font-mono text-sm break-all relative">
                  {agentToken}
                  <button
                    onClick={copyToken}
                    className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-background transition-colors"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                  Copy this agent token now. It will <strong>never be shown again</strong>.
                </div>
              </div>
            )}

            <Button
              className="w-full gap-2 h-11"
              onClick={() => router.push("/")}
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
