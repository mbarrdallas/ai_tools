/**
 * Data Store Implementation
 * 
 * In-memory data store with index management for efficient lookups.
 * Provides O(1) agent lookup and maintains consistency across indexes.
 */

import type {
  Agent,
  AgentStatus,
  ToolCall,
} from '../types';

/**
 * DataStore class providing Map-based agent storage with index structures
 * for efficient queries by status, parent-child relationships, and pending tool calls.
 */
export class DataStore {
  /** Primary storage: agent ID -> Agent */
  private agents: Map<string, Agent>;
  
  /** Index: status -> Set of agent IDs */
  private agentsByStatus: Map<AgentStatus, Set<string>>;
  
  /** Index: parent ID -> Set of child agent IDs */
  private subagentsByParent: Map<string, Set<string>>;
  
  /** Index: tool call ID -> { agentId, toolCall } for pending tool calls */
  private pendingToolCalls: Map<string, { agentId: string; toolCall: ToolCall }>;

  constructor() {
    this.agents = new Map();
    this.agentsByStatus = new Map([
      ['running', new Set()],
      ['completed', new Set()],
      ['failed', new Set()],
    ]);
    this.subagentsByParent = new Map();
    this.pendingToolCalls = new Map();
  }

  /**
   * Add an agent to the store and update all indexes
   */
  createAgent(agent: Agent): void {
    // Clone the agent to avoid shared reference issues with arrays/objects
    const clonedAgent: Agent = {
      ...agent,
      metrics: { ...agent.metrics },
      toolCalls: agent.toolCalls.map(tc => ({ ...tc, args: { ...tc.args } })),
      subagentIds: [...agent.subagentIds],
    };
    
    // Add to primary storage
    this.agents.set(clonedAgent.id, clonedAgent);
    
    // Update status index
    this.agentsByStatus.get(clonedAgent.status)?.add(clonedAgent.id);
    
    // Update parent-child relationships
    if (clonedAgent.parentId) {
      // Add to parent's subagentIds array
      const parent = this.agents.get(clonedAgent.parentId);
      if (parent) {
        if (!parent.subagentIds.includes(clonedAgent.id)) {
          parent.subagentIds.push(clonedAgent.id);
        }
      }
      
      // Add to subagentsByParent index
      if (!this.subagentsByParent.has(clonedAgent.parentId)) {
        this.subagentsByParent.set(clonedAgent.parentId, new Set());
      }
      this.subagentsByParent.get(clonedAgent.parentId)?.add(clonedAgent.id);
    }
    
    // Index any pending tool calls
    for (const toolCall of clonedAgent.toolCalls) {
      if (toolCall.status === 'pending') {
        this.pendingToolCalls.set(toolCall.id, { agentId: clonedAgent.id, toolCall });
      }
    }
  }

  /**
   * Retrieve an agent by ID in O(1) time
   */
  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  /**
   * Return all agents in the store
   */
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Update agent fields, maintaining index consistency
   */
  updateAgent(id: string, updates: Partial<Agent>): void {
    const agent = this.agents.get(id);
    if (!agent) {
      return; // Silently ignore updates to non-existent agents
    }
    
    // Handle status change - update indexes
    if (updates.status && updates.status !== agent.status) {
      // Remove from old status index
      this.agentsByStatus.get(agent.status)?.delete(id);
      
      // Add to new status index
      this.agentsByStatus.get(updates.status)?.add(id);
    }
    
    // Apply updates to agent
    Object.assign(agent, updates);
    
    // If tool calls were updated, update pending tool calls index
    if (updates.toolCalls) {
      // Remove old pending tool calls for this agent
      for (const [toolCallId, entry] of this.pendingToolCalls.entries()) {
        if (entry.agentId === id) {
          this.pendingToolCalls.delete(toolCallId);
        }
      }
      
      // Add new pending tool calls
      for (const toolCall of updates.toolCalls) {
        if (toolCall.status === 'pending') {
          this.pendingToolCalls.set(toolCall.id, { agentId: id, toolCall });
        }
      }
    }
  }

  /**
   * Remove an agent from the store and all indexes
   */
  deleteAgent(id: string): void {
    const agent = this.agents.get(id);
    if (!agent) {
      return; // Silently ignore deletion of non-existent agents
    }
    
    // Remove from primary storage
    this.agents.delete(id);
    
    // Remove from status index
    this.agentsByStatus.get(agent.status)?.delete(id);
    
    // Remove from parent's subagentIds array
    if (agent.parentId) {
      const parent = this.agents.get(agent.parentId);
      if (parent) {
        parent.subagentIds = parent.subagentIds.filter(childId => childId !== id);
      }
      
      // Remove from subagentsByParent index
      this.subagentsByParent.get(agent.parentId)?.delete(id);
      if (this.subagentsByParent.get(agent.parentId)?.size === 0) {
        this.subagentsByParent.delete(agent.parentId);
      }
    }
    
    // Clean up any entries in subagentsByParent where this agent was a parent
    this.subagentsByParent.delete(id);
    
    // Remove any pending tool calls for this agent
    for (const toolCall of agent.toolCalls) {
      this.pendingToolCalls.delete(toolCall.id);
    }
  }

  /**
   * Clear all state - resets to initial empty state
   */
  reset(): void {
    this.agents.clear();
    
    // Reinitialize status indexes with empty sets
    this.agentsByStatus = new Map([
      ['running', new Set()],
      ['completed', new Set()],
      ['failed', new Set()],
    ]);
    
    this.subagentsByParent.clear();
    this.pendingToolCalls.clear();
  }

  // Test helper methods to verify internal state

  /**
   * Get all agent IDs with a given status (for testing)
   */
  getAgentsByStatus(status: AgentStatus): Set<string> {
    return this.agentsByStatus.get(status) ?? new Set();
  }

  /**
   * Get all subagent IDs for a given parent (for testing)
   */
  getSubagentsByParent(parentId: string): Set<string> {
    return this.subagentsByParent.get(parentId) ?? new Set();
  }

  /**
   * Get pending tool call entry by tool call ID (for testing)
   */
  getPendingToolCall(toolCallId: string): { agentId: string; toolCall: ToolCall } | undefined {
    return this.pendingToolCalls.get(toolCallId);
  }

  /**
   * Get the number of agents in the store (for testing)
   */
  size(): number {
    return this.agents.size;
  }
}
