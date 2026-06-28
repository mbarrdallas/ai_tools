/**
 * State Manager Implementation
 * 
 * High-level state management API that wraps the DataStore.
 * Provides methods for agent lifecycle, metrics accumulation, tool call tracking,
 * and conversation history. Handles parent-child relationships and ensures
 * proper cleanup on agent dismissal.
 */

import { DataStore } from './store';
import type {
  Agent,
  AgentStatus,
  AgentMetrics,
  ToolCall,
  ConversationEntry,
  DashboardState,
} from '../types';

/**
 * Partial metrics update type
 */
type MetricsUpdate = Partial<AgentMetrics>;

/**
 * Tool call completion update
 */
interface ToolCallUpdate {
  status: 'success' | 'failed';
  endTime: number;
  isError: boolean;
  errorMessage: string | null;
}

/**
 * Default context limit for models (can be overridden per agent)
 */
const DEFAULT_CONTEXT_LIMIT = 128000;

/**
 * Generate a UUID v4 string
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * where x is any hexadecimal digit and y is one of 8, 9, A, or B
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * StateManager class providing high-level API for agent state management
 */
export class StateManager {
  private store: DataStore;

  constructor() {
    this.store = new DataStore();
  }

  /**
   * Create a new agent with a generated UUID and default values
   * 
   * @param name - Display name for the agent
   * @param parentId - Optional parent agent ID for hierarchy
   * @returns The generated agent ID (UUID v4)
   */
  createAgent(name: string, parentId?: string): string {
    const agentId = generateUUID();
    const now = Date.now();

    const agent: Agent = {
      id: agentId,
      name,
      status: 'running',
      parentId: parentId ?? null,
      startTime: now,
      endTime: null,
      metrics: {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0,
        contextTokens: 0,
        contextLimit: DEFAULT_CONTEXT_LIMIT,
        turnCount: 0,
      },
      toolCalls: [],
      messageCount: 0,
      subagentIds: [],
    };

    this.store.createAgent(agent);
    return agentId;
  }

  /**
   * Retrieve an agent by ID
   * 
   * @param id - Agent ID
   * @returns Agent if found, undefined otherwise
   */
  getAgent(id: string): Agent | undefined {
    return this.store.getAgent(id);
  }

  /**
   * Get all agents currently tracked
   * 
   * @returns Array of all agents
   */
  getAllAgents(): Agent[] {
    return this.store.getAllAgents();
  }

  /**
   * Mark an agent as completed or failed, setting endTime
   * 
   * @param id - Agent ID
   * @param status - Final status (completed or failed)
   */
  completeAgent(id: string, status: 'completed' | 'failed'): void {
    const agent = this.store.getAgent(id);
    if (!agent) {
      return; // Silently ignore non-existent agents
    }

    let now = Date.now();
    // Ensure endTime is always unique when re-completing
    // If the new timestamp equals the existing endTime, increment by 1ms
    if (agent.endTime !== null && now <= agent.endTime) {
      now = agent.endTime + 1;
    }
    
    this.store.updateAgent(id, {
      status,
      endTime: now,
    });
  }

  /**
   * Remove an agent from the state, cleaning up parent references
   * Recursively dismisses all subagents (children, grandchildren, etc.)
   * 
   * @param id - Agent ID to dismiss
   */
  dismissAgent(id: string): void {
    const agent = this.store.getAgent(id);
    if (!agent) {
      return; // Silently ignore non-existent agents
    }

    // Recursively dismiss all subagents first (depth-first)
    // Clone the array to avoid modifying during iteration
    const subagentIds = [...agent.subagentIds];
    for (const subagentId of subagentIds) {
      this.dismissAgent(subagentId);
    }

    // Now dismiss this agent (store handles parent reference cleanup)
    this.store.deleteAgent(id);
  }

  /**
   * Update agent metrics, accumulating token counts and cost
   * Context tokens are replaced (not accumulated) as they represent current state
   * 
   * @param agentId - Agent ID
   * @param metrics - Partial metrics to update
   */
  updateMetrics(agentId: string, metrics: MetricsUpdate): void {
    const agent = this.store.getAgent(agentId);
    if (!agent) {
      return; // Silently ignore non-existent agents
    }

    // Accumulate token counts and cost
    const updatedMetrics: AgentMetrics = {
      inputTokens: agent.metrics.inputTokens + (metrics.inputTokens ?? 0),
      outputTokens: agent.metrics.outputTokens + (metrics.outputTokens ?? 0),
      cacheReadTokens: agent.metrics.cacheReadTokens + (metrics.cacheReadTokens ?? 0),
      cacheWriteTokens: agent.metrics.cacheWriteTokens + (metrics.cacheWriteTokens ?? 0),
      totalCost: agent.metrics.totalCost + (metrics.totalCost ?? 0),
      // Context tokens represent current state, so replace instead of accumulate
      contextTokens: metrics.contextTokens ?? agent.metrics.contextTokens,
      // Context limit can be updated if provided
      contextLimit: metrics.contextLimit ?? agent.metrics.contextLimit,
      // Turn count is handled separately by incrementTurnCount
      turnCount: agent.metrics.turnCount,
    };

    this.store.updateAgent(agentId, {
      metrics: updatedMetrics,
    });
  }

  /**
   * Increment the turn count for an agent
   * 
   * @param agentId - Agent ID
   */
  incrementTurnCount(agentId: string): void {
    const agent = this.store.getAgent(agentId);
    if (!agent) {
      return; // Silently ignore non-existent agents
    }

    this.store.updateAgent(agentId, {
      metrics: {
        ...agent.metrics,
        turnCount: agent.metrics.turnCount + 1,
      },
    });
  }

  /**
   * Add a tool call to an agent's history
   * 
   * @param agentId - Agent ID
   * @param toolCall - Tool call record to add
   */
  addToolCall(agentId: string, toolCall: ToolCall): void {
    const agent = this.store.getAgent(agentId);
    if (!agent) {
      return; // Silently ignore non-existent agents
    }

    // Clone tool call to avoid reference issues
    const clonedToolCall: ToolCall = {
      ...toolCall,
      args: { ...toolCall.args },
    };

    this.store.updateAgent(agentId, {
      toolCalls: [...agent.toolCalls, clonedToolCall],
    });
  }

  /**
   * Complete a tool call, updating status, endTime, and calculating duration
   * 
   * @param toolCallId - Tool call ID
   * @param update - Completion update with status, endTime, error info
   */
  completeToolCall(toolCallId: string, update: ToolCallUpdate): void {
    // Find the agent that owns this tool call
    const allAgents = this.store.getAllAgents();
    let ownerAgent: Agent | undefined;
    let toolCallIndex: number = -1;

    for (const agent of allAgents) {
      const index = agent.toolCalls.findIndex(tc => tc.id === toolCallId);
      if (index !== -1) {
        ownerAgent = agent;
        toolCallIndex = index;
        break;
      }
    }

    if (!ownerAgent || toolCallIndex === -1) {
      return; // Tool call not found, silently ignore
    }

    const toolCall = ownerAgent.toolCalls[toolCallIndex];
    
    // Calculate duration from startTime and endTime
    const duration = update.endTime - toolCall.startTime;

    // Create updated tool call
    const updatedToolCall: ToolCall = {
      ...toolCall,
      status: update.status,
      endTime: update.endTime,
      duration,
      isError: update.isError,
      errorMessage: update.errorMessage,
    };

    // Create updated tool calls array
    const updatedToolCalls = [...ownerAgent.toolCalls];
    updatedToolCalls[toolCallIndex] = updatedToolCall;

    this.store.updateAgent(ownerAgent.id, {
      toolCalls: updatedToolCalls,
    });
  }

  /**
   * Add a conversation entry to an agent, incrementing message count
   * 
   * @param agentId - Agent ID
   * @param entry - Conversation entry to add
   */
  addConversationEntry(agentId: string, entry: ConversationEntry): void {
    const agent = this.store.getAgent(agentId);
    if (!agent) {
      return; // Silently ignore non-existent agents
    }

    // Increment message count
    // Note: The actual conversation entries could be stored in the future
    // For now, we just track the count as per the Agent interface
    this.store.updateAgent(agentId, {
      messageCount: agent.messageCount + 1,
    });
  }

  /**
   * Reset all state - clears all agents and starts fresh
   */
  reset(): void {
    this.store.reset();
  }

  /**
   * Get the current dashboard state
   * 
   * @returns Dashboard state or null if not available
   */
  getDashboardState(): DashboardState | null {
    return this.store.getDashboardState();
  }
}
