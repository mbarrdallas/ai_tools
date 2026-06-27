/**
 * Event Handlers Implementation
 * 
 * Event handlers for all Pi lifecycle events. These functions process Pi events
 * and update the StateManager accordingly, implementing the core business logic
 * for metrics collection and agent tracking.
 * 
 * Handlers are responsible for:
 * - Creating and tracking agents
 * - Updating metrics from message usage data
 * - Tracking tool calls with timing and error detection
 * - Detecting subagent spawning via tool call inspection
 * - Handling session lifecycle events
 * - Incrementing turn counts
 * - Updating conversation history
 */

import type { StateManager } from '../state/state-manager';
import type { NotificationManager } from '../state/notification-manager';
import type { ToolCall } from '../types';
import {
  formatToolArgs,
  extractErrorMessage,
  truncateText,
} from '../utils/format';

/**
 * Pi event context structure (simplified for handlers)
 */
interface PiContext {
  ui: {
    notify: (message: string, type?: string) => void;
    setStatus: (key: string, value?: string) => void;
    custom?: (...args: any[]) => any;
  };
  model?: {
    contextWindow?: number;
  };
}

/**
 * Dashboard handle interface for rendering control
 */
interface DashboardHandle {
  requestRender: () => void;
  close: () => void;
}

/**
 * Agent start event data
 */
interface AgentStartEvent {
  // No specific fields - just signals agent start
}

/**
 * Agent end event data
 */
interface AgentEndEvent {
  messages?: Array<{
    role?: string;
    content?: string;
    errorMessage?: string;
  }>;
}

/**
 * Message end event data
 */
interface MessageEndEvent {
  message: {
    role: string;
    content?: string;
    usage?: {
      input: number;
      output: number;
      cacheRead: number;
      cacheWrite: number;
      totalTokens: number;
      cost?: { total: number };
    };
    errorMessage?: string;
  };
}

/**
 * Turn start event data
 */
interface TurnStartEvent {
  turnIndex?: number;
  timestamp: number;
}

/**
 * Turn end event data
 */
interface TurnEndEvent {
  turnIndex?: number;
  message?: {
    role: string;
    content?: string;
  };
}

/**
 * Tool execution start event data
 */
interface ToolExecutionStartEvent {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
}

/**
 * Tool execution end event data
 */
interface ToolExecutionEndEvent {
  toolCallId: string;
  toolName: string;
  result: {
    content?: Array<{ type: string; text?: string }>;
    details?: unknown;
    isError?: boolean;
  };
  isError: boolean;
}

/**
 * Session start event data
 */
interface SessionStartEvent {
  reason?: string;
  previousSessionFile?: string;
}

/**
 * Session shutdown event data
 */
interface SessionShutdownEvent {
  reason?: string;
}

/**
 * Global state shared across handlers
 */
let currentAgentId: string | null = null;
let contextLimit: number = 128000; // Default context limit
let subagentMapping: Map<string, string> = new Map();
let dashboardHandle: DashboardHandle | null = null;
let stateManager: StateManager | null = null;
let notificationManager: NotificationManager | null = null;

/**
 * Set the dashboard handle for rendering updates
 */
export function setDashboardHandle(handle: DashboardHandle | null): void {
  dashboardHandle = handle;
}

/**
 * Get the current agent ID
 */
export function getCurrentAgentId(): string | null {
  return currentAgentId;
}

/**
 * Get the current context limit
 */
export function getContextLimit(): number {
  return contextLimit;
}

/**
 * Set the state manager and notification manager (for testing)
 */
export function setManagers(
  state: StateManager,
  notification: NotificationManager
): void {
  stateManager = state;
  notificationManager = notification;
}

/**
 * Handle agent_start event
 * Creates root agent if not exists and sets currentAgentId
 * @returns The current agent ID
 */
export async function handleAgentStart(
  event: AgentStartEvent,
  ctx: PiContext
): Promise<string | null> {
  if (!stateManager) {
    console.error('StateManager not initialized');
    return null;
  }
  try {
    // Check if root agent already exists
    const existingAgents = stateManager.getAllAgents();
    const rootAgent = existingAgents.find(agent => agent.parentId === null);

    if (!rootAgent) {
      // Create root agent
      currentAgentId = stateManager.createAgent('main', undefined);
    } else {
      // Use existing root agent
      currentAgentId = rootAgent.id;
    }
    return currentAgentId;
  } catch (error) {
    console.error('Error in handleAgentStart:', error);
    return null;
  }
}

/**
 * Handle agent_end event
 * Marks agent as completed or failed based on error status
 */
export async function handleAgentEnd(
  event: AgentEndEvent,
  ctx: PiContext,
  agentId: string
): Promise<void> {
  if (!stateManager) {
    console.error('StateManager not initialized');
    return;
  }
  try {
    // Check if any message has an error
    let hasError = false;
    if (event.messages && Array.isArray(event.messages)) {
      hasError = event.messages.some(msg => msg.errorMessage != null);
    }

    // Complete the agent with appropriate status
    const status = hasError ? 'failed' : 'completed';
    stateManager.completeAgent(agentId, status);
  } catch (error) {
    console.error('Error in handleAgentEnd:', error);
  }
}

/**
 * Handle message_end event
 * Extracts and updates metrics (tokens, cost, context)
 */
export async function handleMessageEnd(
  event: MessageEndEvent,
  ctx: PiContext,
  agentId: string,
  dashHandle?: DashboardHandle | null
): Promise<void> {
  if (!stateManager || !notificationManager) {
    console.error('Managers not initialized');
    return;
  }
  try {
    // Only process assistant messages
    if (event.message.role !== 'assistant') {
      return;
    }

    // Check if usage data exists
    if (!event.message.usage) {
      return;
    }

    const usage = event.message.usage;

    // Update metrics - accumulate all token counts and cost
    stateManager.updateMetrics(agentId, {
      inputTokens: usage.input,
      outputTokens: usage.output,
      cacheReadTokens: usage.cacheRead,
      cacheWriteTokens: usage.cacheWrite,
      totalCost: usage.cost?.total ?? 0,
      contextTokens: usage.totalTokens,
    });

    // Check context threshold for warnings
    notificationManager.checkContextThreshold(agentId);

    // Request UI update if dashboard is visible
    if (dashHandle) {
      dashHandle.requestRender();
    } else if (dashboardHandle) {
      dashboardHandle.requestRender();
    }
  } catch (error) {
    console.error('Error in handleMessageEnd:', error);
  }
}

/**
 * Handle turn_start event
 * Increments turn count for current agent
 */
export async function handleTurnStart(
  event: TurnStartEvent,
  ctx: PiContext,
  agentId: string
): Promise<void> {
  if (!stateManager) {
    console.error('StateManager not initialized');
    return;
  }
  try {
    stateManager.incrementTurnCount(agentId);
  } catch (error) {
    console.error('Error in handleTurnStart:', error);
  }
}

/**
 * Handle turn_end event
 * Updates conversation history with message preview
 */
export async function handleTurnEnd(
  event: TurnEndEvent,
  ctx: PiContext,
  agentId: string,
  dashHandle?: DashboardHandle | null
): Promise<void> {
  if (!stateManager) {
    console.error('StateManager not initialized');
    return;
  }
  try {
    // Check if message exists
    if (!event.message) {
      return;
    }

    const message = event.message;
    const content = message.content ?? '';

    // Create conversation entry with truncated preview
    stateManager.addConversationEntry(agentId, {
      role: message.role as 'user' | 'assistant' | 'toolResult',
      preview: truncateText(content, 100),
      timestamp: Date.now(),
    });

    // Request UI update if dashboard is visible
    if (dashHandle) {
      dashHandle.requestRender();
    } else if (dashboardHandle) {
      dashboardHandle.requestRender();
    }
  } catch (error) {
    console.error('Error in handleTurnEnd:', error);
  }
}

/**
 * Handle tool_execution_start event
 * Creates tool call entry and detects subagent spawning
 */
export async function handleToolExecutionStart(
  event: ToolExecutionStartEvent,
  ctx: PiContext,
  agentId: string,
  mapping: Map<string, string>,
  dashHandle?: DashboardHandle | null
): Promise<void> {
  if (!stateManager) {
    console.error('StateManager not initialized');
    return;
  }
  try {
    // Check if this is a subagent tool call
    if (event.toolName === 'subagent') {
      const agentName = event.args.agent as string;
      if (agentName) {
        // Create new subagent
        const subagentId = stateManager.createAgent(agentName, agentId);
        // Map tool call ID to subagent ID
        mapping.set(event.toolCallId, subagentId);
      }
    }

    // Create tool call record
    const toolCall: ToolCall = {
      id: event.toolCallId,
      toolName: event.toolName,
      args: event.args,
      argsSummary: formatToolArgs(event.toolName, event.args),
      status: 'pending',
      startTime: Date.now(),
      endTime: null,
      duration: null,
      isError: false,
      errorMessage: null,
    };

    stateManager.addToolCall(agentId, toolCall);

    // Request UI update if dashboard is visible
    if (dashHandle) {
      dashHandle.requestRender();
    } else if (dashboardHandle) {
      dashboardHandle.requestRender();
    }
  } catch (error) {
    console.error('Error in handleToolExecutionStart:', error);
  }
}

/**
 * Handle tool_execution_end event
 * Completes tool call, calculates duration, and detects errors
 */
export async function handleToolExecutionEnd(
  event: ToolExecutionEndEvent,
  ctx: PiContext,
  agentId: string,
  mapping: Map<string, string>,
  dashHandle?: DashboardHandle | null
): Promise<void> {
  if (!stateManager || !notificationManager) {
    console.error('Managers not initialized');
    return;
  }
  try {
    const endTime = Date.now();

    // Complete the tool call
    stateManager.completeToolCall(event.toolCallId, {
      status: event.isError ? 'failed' : 'success',
      endTime,
      isError: event.isError,
      errorMessage: event.isError ? extractErrorMessage(event.result) : null,
    });

    // Notify on failure
    if (event.isError) {
      const errorMsg = extractErrorMessage(event.result);
      notificationManager.notifyToolFailure(agentId, event.toolName, errorMsg);
    }

    // Update subagent status if this was a subagent call
    if (event.toolName === 'subagent') {
      const subagentId = mapping.get(event.toolCallId);
      if (subagentId) {
        stateManager.completeAgent(
          subagentId,
          event.isError ? 'failed' : 'completed'
        );
        // Clean up mapping
        mapping.delete(event.toolCallId);
      }
    }

    // Request UI update if dashboard is visible
    if (dashHandle) {
      dashHandle.requestRender();
    } else if (dashboardHandle) {
      dashboardHandle.requestRender();
    }
  } catch (error) {
    console.error('Error in handleToolExecutionEnd:', error);
  }
}

/**
 * Handle session_start event
 * Initializes or resets state based on session reason
 * @returns The context limit that was set
 */
export async function handleSessionStart(
  event: SessionStartEvent,
  ctx: PiContext
): Promise<number> {
  if (!stateManager) {
    console.error('StateManager not initialized');
    return contextLimit;
  }
  try {
    // Reset state on new session or startup
    if (event.reason === 'new' || event.reason === 'startup') {
      stateManager.reset();
      currentAgentId = null;
      subagentMapping.clear();
    }

    // Store context limit from model info
    if (ctx.model?.contextWindow) {
      contextLimit = ctx.model.contextWindow;
    }
    return contextLimit;
  } catch (error) {
    console.error('Error in handleSessionStart:', error);
    return contextLimit;
  }
}

/**
 * Handle session_shutdown event
 * Cleans up dashboard handle on session end
 * @returns The dashboard handle (should be null after cleanup)
 */
export async function handleSessionShutdown(
  event: SessionShutdownEvent,
  ctx: PiContext,
  dashHandle?: DashboardHandle | null
): Promise<DashboardHandle | null> {
  try {
    // Close dashboard if open
    if (dashHandle) {
      dashHandle.close();
    } else if (dashboardHandle) {
      dashboardHandle.close();
      dashboardHandle = null;
    }
    return dashboardHandle;
  } catch (error) {
    console.error('Error in handleSessionShutdown:', error);
    return dashboardHandle;
  }
}

/**
 * Register all event handlers with Pi API
 * 
 * This function wires up all event handlers to the Pi event system.
 * It creates closures that capture the state manager and notification manager,
 * so handlers have access to them when events fire.
 * 
 * @param pi - Pi extension API object with .on() method
 * @param state - State manager instance
 * @param notification - Notification manager instance
 */
export function registerEventHandlers(
  pi: any,
  state: StateManager,
  notification: NotificationManager
): void {
  // Store managers in module-level variables
  stateManager = state;
  notificationManager = notification;

  // Agent lifecycle events
  pi.on('agent_start', async (event: AgentStartEvent, ctx: PiContext) => {
    await handleAgentStart(event, ctx);
  });

  pi.on('agent_end', async (event: AgentEndEvent, ctx: PiContext) => {
    if (currentAgentId) {
      await handleAgentEnd(event, ctx, currentAgentId);
    }
  });

  // Message events
  pi.on('message_end', async (event: MessageEndEvent, ctx: PiContext) => {
    if (currentAgentId) {
      await handleMessageEnd(event, ctx, currentAgentId);
    }
  });

  // Turn events
  pi.on('turn_start', async (event: TurnStartEvent, ctx: PiContext) => {
    if (currentAgentId) {
      await handleTurnStart(event, ctx, currentAgentId);
    }
  });

  pi.on('turn_end', async (event: TurnEndEvent, ctx: PiContext) => {
    if (currentAgentId) {
      await handleTurnEnd(event, ctx, currentAgentId);
    }
  });

  // Tool execution events
  pi.on(
    'tool_execution_start',
    async (event: ToolExecutionStartEvent, ctx: PiContext) => {
      if (currentAgentId) {
        await handleToolExecutionStart(
          event,
          ctx,
          currentAgentId,
          subagentMapping
        );
      }
    }
  );

  pi.on(
    'tool_execution_end',
    async (event: ToolExecutionEndEvent, ctx: PiContext) => {
      if (currentAgentId) {
        await handleToolExecutionEnd(
          event,
          ctx,
          currentAgentId,
          subagentMapping
        );
      }
    }
  );

  // Session lifecycle events
  pi.on('session_start', async (event: SessionStartEvent, ctx: PiContext) => {
    await handleSessionStart(event, ctx);
  });

  pi.on(
    'session_shutdown',
    async (event: SessionShutdownEvent, ctx: PiContext) => {
      await handleSessionShutdown(event, ctx);
    }
  );
}
