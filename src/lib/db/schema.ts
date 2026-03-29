import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  uniqueIndex,
  index,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────

export const workspaceRoleEnum = pgEnum("WorkspaceRole", ["OWNER", "ADMIN", "MEMBER", "VIEWER"]);
export const projectStatusEnum = pgEnum("ProjectStatus", ["ACTIVE", "PAUSED", "ARCHIVED", "COMPLETED"]);
export const taskStatusEnum = pgEnum("TaskStatus", ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"]);
export const taskPriorityEnum = pgEnum("TaskPriority", ["URGENT", "HIGH", "MEDIUM", "LOW"]);
export const ownerTypeEnum = pgEnum("OwnerType", ["USER", "AGENT", "UNASSIGNED"]);
export const subtaskStatusEnum = pgEnum("SubtaskStatus", ["TODO", "IN_PROGRESS", "DONE"]);
export const agentStatusEnum = pgEnum("AgentStatus", ["ONLINE", "OFFLINE", "BUSY", "ERROR"]);
export const agentTokenStatusEnum = pgEnum("AgentTokenStatus", ["ACTIVE", "REVOKED", "EXPIRED"]);
export const claimStatusEnum = pgEnum("ClaimStatus", ["ACTIVE", "RELEASED", "COMPLETED", "EXPIRED"]);
export const approvalStateEnum = pgEnum("ApprovalState", ["NONE", "PENDING", "APPROVED", "DENIED"]);
export const approvalStatusEnum = pgEnum("ApprovalStatus", ["PENDING", "APPROVED", "DENIED"]);
export const actorTypeEnum = pgEnum("ActorType", ["USER", "AGENT", "SYSTEM"]);
export const integrationProviderEnum = pgEnum("IntegrationProvider", ["SLACK", "GITHUB", "LINEAR", "NOTION", "GOOGLE_DRIVE", "STRIPE"]);
export const integrationStatusEnum = pgEnum("IntegrationStatus", ["DISCONNECTED", "CONNECTING", "AUTHORIZED", "PROVISIONED", "HEALTHY", "NEEDS_ATTENTION", "DISABLED"]);
export const processingStatusEnum = pgEnum("ProcessingStatus", ["PENDING", "PROCESSING", "PROCESSED", "FAILED", "SKIPPED"]);
export const memoryNodeTypeEnum = pgEnum("MemoryNodeType", ["DOCUMENT", "CHECKLIST", "DECISION", "SPEC", "RUNBOOK", "RESEARCH", "MEETING_NOTES", "REFERENCE"]);

// ─────────────────────────────────────────────
// TABLES
// ─────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").unique(),
  name: text("name"),
  email: text("email").unique(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const workspaceMembers = pgTable("workspace_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: workspaceRoleEnum("role").default("MEMBER").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("workspace_members_workspace_user").on(t.workspaceId, t.userId),
  index("workspace_members_user").on(t.userId),
]);

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  status: projectStatusEnum("status").default("ACTIVE").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (t) => [
  index("projects_workspace_status").on(t.workspaceId, t.status),
]);

export const taskSheets = pgTable("task_sheets", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (t) => [
  index("task_sheets_project_order").on(t.projectId, t.order),
  index("task_sheets_workspace").on(t.workspaceId),
]);

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  taskSheetId: uuid("task_sheet_id").references(() => taskSheets.id, { onDelete: "set null" }),
  queueId: uuid("queue_id").references(() => queues.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").default("BACKLOG").notNull(),
  priority: taskPriorityEnum("priority").default("MEDIUM").notNull(),
  ownerType: ownerTypeEnum("owner_type").default("UNASSIGNED").notNull(),
  ownerId: text("owner_id"),
  requiredCapabilities: text("required_capabilities").array().default([]).notNull(),
  sourceProvider: text("source_provider"),
  sourceObjectType: text("source_object_type"),
  sourceObjectId: text("source_object_id"),
  approvalState: approvalStateEnum("approval_state").default("NONE").notNull(),
  confidence: doublePrecision("confidence"),
  dueAt: timestamp("due_at"),
  metadata: jsonb("metadata"),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (t) => [
  index("tasks_workspace_status").on(t.workspaceId, t.status),
  index("tasks_workspace_project_status").on(t.workspaceId, t.projectId, t.status),
  index("tasks_workspace_queue_status").on(t.workspaceId, t.queueId, t.status),
  index("tasks_workspace_owner").on(t.workspaceId, t.ownerType, t.ownerId),
  index("tasks_workspace_priority_status").on(t.workspaceId, t.priority, t.status),
]);

export const subtasks = pgTable("subtasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: subtaskStatusEnum("status").default("TODO").notNull(),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("subtasks_task_order").on(t.taskId, t.order),
]);

export const taskComments = pgTable("task_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  actorType: actorTypeEnum("actor_type").notNull(),
  actorId: text("actor_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("task_comments_task_created").on(t.taskId, t.createdAt),
]);

export const queues = pgTable("queues", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  requiredCapabilities: text("required_capabilities").array().default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (t) => [
  uniqueIndex("queues_workspace_name").on(t.workspaceId, t.name),
]);

export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  status: agentStatusEnum("status").default("OFFLINE").notNull(),
  capabilities: text("capabilities").array().default([]).notNull(),
  allowedQueueIds: text("allowed_queue_ids").array().default([]).notNull(),
  metadata: jsonb("metadata"),
  lastSeenAt: timestamp("last_seen_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (t) => [
  uniqueIndex("agents_workspace_name").on(t.workspaceId, t.name),
  index("agents_workspace_status").on(t.workspaceId, t.status),
]);

export const agentTokens = pgTable("agent_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").unique().notNull(),
  name: text("name").notNull(),
  scopes: text("scopes").array().default([]).notNull(),
  status: agentTokenStatusEnum("status").default("ACTIVE").notNull(),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("agent_tokens_agent_status").on(t.agentId, t.status),
]);

export const claims = pgTable("claims", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  queueId: uuid("queue_id").notNull().references(() => queues.id, { onDelete: "cascade" }),
  status: claimStatusEnum("status").default("ACTIVE").notNull(),
  claimedAt: timestamp("claimed_at").defaultNow().notNull(),
  releasedAt: timestamp("released_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("claims_agent_status").on(t.agentId, t.status),
  index("claims_task_status").on(t.taskId, t.status),
  index("claims_queue_status").on(t.queueId, t.status),
]);

export const artifacts = pgTable("artifacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id").references(() => agents.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  content: text("content").notNull(),
  url: text("url"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("artifacts_task").on(t.taskId),
]);

export const memoryNodes = pgTable("memory_nodes", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
  agentId: uuid("agent_id").references(() => agents.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: memoryNodeTypeEnum("type").notNull(),
  tags: text("tags").array().default([]).notNull(),
  version: integer("version").default(1).notNull(),
  createdBy: text("created_by").notNull(),
  updatedBy: text("updated_by").notNull(),
  permissions: jsonb("permissions"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (t) => [
  index("memory_nodes_workspace_type").on(t.workspaceId, t.type),
  index("memory_nodes_workspace_project").on(t.workspaceId, t.projectId),
  index("memory_nodes_workspace_task").on(t.workspaceId, t.taskId),
]);

export const runLogs = pgTable("run_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  actorType: actorTypeEnum("actor_type").notNull(),
  actorId: text("actor_id").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("run_logs_workspace_created").on(t.workspaceId, t.createdAt),
  index("run_logs_workspace_entity").on(t.workspaceId, t.entityType, t.entityId),
  index("run_logs_workspace_event").on(t.workspaceId, t.eventType),
]);

export const approvals = pgTable("approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  requestedByType: actorTypeEnum("requested_by_type").notNull(),
  requestedById: text("requested_by_id").notNull(),
  reviewerId: uuid("reviewer_id").references(() => users.id, { onDelete: "set null" }),
  status: approvalStatusEnum("status").default("PENDING").notNull(),
  decisionNote: text("decision_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("approvals_task_status").on(t.taskId, t.status),
]);

export const integrationConnections = pgTable("integration_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  provider: integrationProviderEnum("provider").notNull(),
  status: integrationStatusEnum("status").default("DISCONNECTED").notNull(),
  encryptedCredentials: text("encrypted_credentials"),
  config: jsonb("config"),
  webhookSecret: text("webhook_secret"),
  externalAccountId: text("external_account_id"),
  externalAccountName: text("external_account_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("integration_connections_workspace_provider").on(t.workspaceId, t.provider),
]);

export const externalEvents = pgTable("external_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  processingStatus: processingStatusEnum("processing_status").default("PENDING").notNull(),
  idempotencyKey: text("idempotency_key").unique().notNull(),
  errorMessage: text("error_message"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("external_events_workspace_provider_status").on(t.workspaceId, t.provider, t.processingStatus),
  index("external_events_status").on(t.processingStatus),
]);

export const externalObjects = pgTable("external_objects", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  externalId: text("external_id").notNull(),
  externalType: text("external_type").notNull(),
  internalType: text("internal_type").notNull(),
  internalId: text("internal_id").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("external_objects_workspace_provider_ext").on(t.workspaceId, t.provider, t.externalId, t.externalType),
  index("external_objects_workspace_internal").on(t.workspaceId, t.internalType, t.internalId),
]);

export const workflowTemplates = pgTable("workflow_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  trigger: jsonb("trigger").notNull(),
  conditions: jsonb("conditions"),
  actions: jsonb("actions").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (t) => [
  uniqueIndex("workflow_templates_workspace_name").on(t.workspaceId, t.name),
  index("workflow_templates_workspace_enabled").on(t.workspaceId, t.enabled),
]);

export const capabilities = pgTable("capabilities", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("capabilities_workspace_name").on(t.workspaceId, t.name),
]);

// ─────────────────────────────────────────────
// TYPE HELPERS (replacing Prisma enums)
// ─────────────────────────────────────────────

export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
export type ProjectStatus = "ACTIVE" | "PAUSED" | "ARCHIVED" | "COMPLETED";
export type TaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED";
export type TaskPriority = "URGENT" | "HIGH" | "MEDIUM" | "LOW";
export type OwnerType = "USER" | "AGENT" | "UNASSIGNED";
export type SubtaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type AgentStatus = "ONLINE" | "OFFLINE" | "BUSY" | "ERROR";
export type AgentTokenStatus = "ACTIVE" | "REVOKED" | "EXPIRED";
export type ClaimStatus = "ACTIVE" | "RELEASED" | "COMPLETED" | "EXPIRED";
export type ApprovalState = "NONE" | "PENDING" | "APPROVED" | "DENIED";
export type ApprovalStatus = "PENDING" | "APPROVED" | "DENIED";
export type ActorType = "USER" | "AGENT" | "SYSTEM";
export type IntegrationProvider = "SLACK" | "GITHUB" | "LINEAR" | "NOTION" | "GOOGLE_DRIVE" | "STRIPE";
export type IntegrationStatus = "DISCONNECTED" | "CONNECTING" | "AUTHORIZED" | "PROVISIONED" | "HEALTHY" | "NEEDS_ATTENTION" | "DISABLED";
export type ProcessingStatus = "PENDING" | "PROCESSING" | "PROCESSED" | "FAILED" | "SKIPPED";
export type MemoryNodeType = "DOCUMENT" | "CHECKLIST" | "DECISION" | "SPEC" | "RUNBOOK" | "RESEARCH" | "MEETING_NOTES" | "REFERENCE";
