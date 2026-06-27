/**
 * TypeScript Type Definitions for Stats Dashboard Extension
 * 
 * This file contains all shared type definitions for the extension,
 * including types for agents, metrics, tool calls, notifications,
 * and the data store.
 */

/**
 * Agent lifecycle status
 */
export type AgentStatus = "running" | "completed" | "failed";

/**
 * Tool call execution status
 */
export type ToolCallStatus = "pending" | "success" | "failed";

/**
 * Message sender role in conversation
 */
export type MessageRole = "user" | "assistant" | "toolResult";

/**
 * Type of notification
 */
export type NotificationType = "context_high" | "tool_failed";

/**
 * Aggregated metrics for an agent
 */
export interface AgentMetrics {
  /** Total input tokens consumed (>= 0) */
  inputTokens: number;
  /** Total output tokens generated (>= 0) */
  outputTokens: number;
  /** Tokens read from cache (>= 0) */
  cacheReadTokens: number;
  /** Tokens written to cache (>= 0) */
  cacheWriteTokens: number;
  /** Cumulative cost in USD (>= 0) */
  totalCost: number;
  /** Current context window usage (>= 0) */
  contextTokens: number;
  /** Maximum context window for model (> 0) */
  contextLimit: number;
  /** Number of LLM turns (>= 0) */
  turnCount: number;
}

/**
 * Record of a single tool invocation with timing
 */
export interface ToolCall {
  /** Tool call ID from Pi */
  id: string;
  /** Name of the tool (e.g., "bash", "read") */
  toolName: string;
  /** Tool arguments (for display) */
  args: Record<string, unknown>;
  /** Short formatted summary of args */
  argsSummary: string;
  /** Current execution status */
  status: ToolCallStatus;
  /** Unix timestamp when started */
  startTime: number;
  /** Unix timestamp when completed (null if pending) */
  endTime: number | null;
  /** Duration in milliseconds (null if pending, computed) */
  duration: number | null;
  /** Whether execution failed */
  isError: boolean;
  /** Error details if failed */
  errorMessage: string | null;
}

/**
 * Lightweight reference to a conversation message for display
 */
export interface ConversationEntry {
  /** Message sender role */
  role: MessageRole;
  /** Truncated content preview (~100 chars) */
  preview: string;
  /** Unix timestamp of message */
  timestamp: number;
}

/**
 * Notification shown to the user
 */
export interface Notification {
  /** Unique notification ID */
  id: string;
  /** Category of notification */
  type: NotificationType;
  /** Associated agent ID */
  agentId: string;
  /** Notification text */
  message: string;
  /** Unix timestamp when shown */
  timestamp: number;
  /** Whether user dismissed it (default false) */
  dismissed: boolean;
}

/**
 * Agent instance representing a running, completed, or failed agent
 */
export interface Agent {
  /** Unique identifier (UUID v4) */
  id: string;
  /** Display name (e.g., "main", "scout", "designer") */
  name: string;
  /** Current lifecycle status */
  status: AgentStatus;
  /** Parent agent ID (null for root agent) */
  parentId: string | null;
  /** Unix timestamp when agent started */
  startTime: number;
  /** Unix timestamp when agent completed (null if running) */
  endTime: number | null;
  /** Aggregated token/cost metrics */
  metrics: AgentMetrics;
  /** History of tool invocations (ordered by startTime) */
  toolCalls: ToolCall[];
  /** Count of messages in conversation (default 0) */
  messageCount: number;
  /** IDs of child agents (default []) */
  subagentIds: string[];
}

/**
 * Dashboard UI state
 */
export interface DashboardState {
  /** Whether dashboard is shown (default false) */
  isVisible: boolean;
  /** Currently selected tab (agent ID) */
  selectedAgentId: string | null;
  /** Expanded UI sections */
  expandedSections: Set<string>;
}

/**
 * In-memory data store for the extension
 */
export interface DataStore {
  /** All tracked agents (Map for O(1) lookup) */
  agents: Map<string, Agent>;
  /** Root agent ID (the main session agent) */
  rootAgentId: string | null;
  /** Notification history */
  notifications: Notification[];
  /** Dashboard UI state */
  dashboard: DashboardState;
}
