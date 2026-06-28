/**
 * Data Store Implementation Test Suite
 * 
 * Tests for the DataStore class in state/store.ts (Task T2)
 * 
 * The DataStore provides in-memory storage with index management for efficient lookups.
 * These tests verify all CRUD operations and index consistency.
 * 
 * Acceptance Criteria:
 * - DataStore class with Map-based agent storage
 * - Index structures: agentsByStatus, subagentsByParent, pendingToolCalls
 * - createAgent() adds agent and updates indexes
 * - getAgent() returns agent by ID in O(1)
 * - getAllAgents() returns all active agents
 * - updateAgent() updates agent fields
 * - deleteAgent() removes from store and all indexes
 * - reset() clears all state
 * - Index consistency maintained on all operations
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import type {
  Agent,
  AgentStatus,
  AgentMetrics,
  ToolCall,
  ToolCallStatus,
} from '@shared/stats_dashboard_tui/types';

// The actual DataStore implementation
import { DataStore } from '@shared/stats_dashboard_tui/state/store';

describe('DataStore', () => {
  let store: DataStore;
  let mockAgent: Agent;
  let mockMetrics: AgentMetrics;

  beforeEach(() => {
    store = new DataStore();
    
    mockMetrics = {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      totalCost: 0,
      contextTokens: 0,
      contextLimit: 100000,
      turnCount: 0,
    };

    mockAgent = {
      id: 'agent-123',
      name: 'test-agent',
      status: 'running',
      parentId: null,
      startTime: Date.now(),
      endTime: null,
      metrics: { ...mockMetrics },
      toolCalls: [],
      messageCount: 0,
      subagentIds: [],
    };
  });

  describe('Constructor', () => {
    it('should initialize with empty agents map', () => {
      expect(store.size()).toBe(0);
    });

    it('should initialize agentsByStatus index with all status keys', () => {
      expect(store.getAgentsByStatus('running').size).toBe(0);
      expect(store.getAgentsByStatus('completed').size).toBe(0);
      expect(store.getAgentsByStatus('failed').size).toBe(0);
    });

    it('should initialize empty subagentsByParent index', () => {
      expect(store.getSubagentsByParent('any-id').size).toBe(0);
    });

    it('should initialize empty pendingToolCalls index', () => {
      expect(store.getPendingToolCall('any-id')).toBeUndefined();
    });
  });

  describe('createAgent', () => {
    it('should add agent to store', () => {
      store.createAgent(mockAgent);
      
      const retrieved = store.getAgent(mockAgent.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(mockAgent.id);
      expect(retrieved?.name).toBe(mockAgent.name);
    });

    it('should add agent ID to agentsByStatus index', () => {
      store.createAgent(mockAgent);
      
      const runningAgents = store.getAgentsByStatus('running');
      expect(runningAgents.has(mockAgent.id)).toBe(true);
      expect(runningAgents.size).toBe(1);
    });

    it('should not add agent to wrong status index', () => {
      store.createAgent(mockAgent);
      
      expect(store.getAgentsByStatus('completed').has(mockAgent.id)).toBe(false);
      expect(store.getAgentsByStatus('failed').has(mockAgent.id)).toBe(false);
    });

    it('should handle root agent (parentId is null)', () => {
      store.createAgent(mockAgent);
      
      const agent = store.getAgent(mockAgent.id);
      expect(agent?.parentId).toBeNull();
      expect(store.getSubagentsByParent(mockAgent.id).size).toBe(0);
    });

    it('should update parent agent subagentIds when creating child agent', () => {
      const parentAgent: Agent = { ...mockAgent, id: 'parent-123' };
      const childAgent: Agent = {
        ...mockAgent,
        id: 'child-123',
        name: 'child-agent',
        parentId: 'parent-123',
      };

      store.createAgent(parentAgent);
      store.createAgent(childAgent);

      const parent = store.getAgent('parent-123');
      expect(parent?.subagentIds).toContain('child-123');
      expect(parent?.subagentIds.length).toBe(1);
    });

    it('should add child to subagentsByParent index', () => {
      const parentAgent: Agent = { ...mockAgent, id: 'parent-123' };
      const childAgent: Agent = {
        ...mockAgent,
        id: 'child-123',
        parentId: 'parent-123',
      };

      store.createAgent(parentAgent);
      store.createAgent(childAgent);

      const subagents = store.getSubagentsByParent('parent-123');
      expect(subagents.has('child-123')).toBe(true);
      expect(subagents.size).toBe(1);
    });

    it('should handle multiple children for same parent', () => {
      const parentAgent: Agent = { ...mockAgent, id: 'parent-123' };
      const child1: Agent = { ...mockAgent, id: 'child-1', parentId: 'parent-123' };
      const child2: Agent = { ...mockAgent, id: 'child-2', parentId: 'parent-123' };

      store.createAgent(parentAgent);
      store.createAgent(child1);
      store.createAgent(child2);

      const parent = store.getAgent('parent-123');
      expect(parent?.subagentIds).toHaveLength(2);
      expect(parent?.subagentIds).toContain('child-1');
      expect(parent?.subagentIds).toContain('child-2');

      const subagents = store.getSubagentsByParent('parent-123');
      expect(subagents.size).toBe(2);
    });

    it('should handle creating agent with completed status', () => {
      const completedAgent: Agent = {
        ...mockAgent,
        status: 'completed',
        endTime: Date.now(),
      };

      store.createAgent(completedAgent);

      expect(store.getAgentsByStatus('completed').has(completedAgent.id)).toBe(true);
      expect(store.getAgentsByStatus('running').has(completedAgent.id)).toBe(false);
    });

    it('should handle creating agent with failed status', () => {
      const failedAgent: Agent = {
        ...mockAgent,
        status: 'failed',
        endTime: Date.now(),
      };

      store.createAgent(failedAgent);

      expect(store.getAgentsByStatus('failed').has(failedAgent.id)).toBe(true);
      expect(store.getAgentsByStatus('running').has(failedAgent.id)).toBe(false);
    });

    it('should store agent with tool calls', () => {
      const toolCall: ToolCall = {
        id: 'tool-1',
        toolName: 'bash',
        args: { command: 'ls' },
        argsSummary: 'ls',
        status: 'pending',
        startTime: Date.now(),
        endTime: null,
        duration: null,
        isError: false,
        errorMessage: null,
      };

      const agentWithTools: Agent = {
        ...mockAgent,
        toolCalls: [toolCall],
      };

      store.createAgent(agentWithTools);

      const retrieved = store.getAgent(mockAgent.id);
      expect(retrieved?.toolCalls).toHaveLength(1);
      expect(retrieved?.toolCalls[0].id).toBe('tool-1');
    });

    it('should increment store size', () => {
      expect(store.size()).toBe(0);
      
      store.createAgent(mockAgent);
      expect(store.size()).toBe(1);
      
      store.createAgent({ ...mockAgent, id: 'agent-2' });
      expect(store.size()).toBe(2);
    });
  });

  describe('getAgent', () => {
    beforeEach(() => {
      store.createAgent(mockAgent);
    });

    it('should return agent by ID in O(1) time', () => {
      const agent = store.getAgent(mockAgent.id);
      
      expect(agent).toBeDefined();
      expect(agent?.id).toBe(mockAgent.id);
    });

    it('should return undefined for non-existent agent', () => {
      const agent = store.getAgent('non-existent-id');
      
      expect(agent).toBeUndefined();
    });

    it('should return agent with all properties intact', () => {
      const agent = store.getAgent(mockAgent.id);
      
      expect(agent?.name).toBe(mockAgent.name);
      expect(agent?.status).toBe(mockAgent.status);
      expect(agent?.parentId).toBe(mockAgent.parentId);
      expect(agent?.startTime).toBe(mockAgent.startTime);
      expect(agent?.endTime).toBe(mockAgent.endTime);
      expect(agent?.metrics).toEqual(mockAgent.metrics);
      expect(agent?.toolCalls).toEqual(mockAgent.toolCalls);
      expect(agent?.messageCount).toBe(mockAgent.messageCount);
      expect(agent?.subagentIds).toEqual(mockAgent.subagentIds);
    });

    it('should return same reference as stored (not a copy)', () => {
      const agent1 = store.getAgent(mockAgent.id);
      const agent2 = store.getAgent(mockAgent.id);
      
      expect(agent1).toBe(agent2);
    });
  });

  describe('getAllAgents', () => {
    it('should return empty array when no agents exist', () => {
      const agents = store.getAllAgents();
      
      expect(agents).toEqual([]);
      expect(agents.length).toBe(0);
    });

    it('should return all stored agents', () => {
      const agent1 = { ...mockAgent, id: 'agent-1', name: 'first' };
      const agent2 = { ...mockAgent, id: 'agent-2', name: 'second' };
      const agent3 = { ...mockAgent, id: 'agent-3', name: 'third' };

      store.createAgent(agent1);
      store.createAgent(agent2);
      store.createAgent(agent3);

      const agents = store.getAllAgents();
      
      expect(agents).toHaveLength(3);
      expect(agents.map(a => a.id)).toContain('agent-1');
      expect(agents.map(a => a.id)).toContain('agent-2');
      expect(agents.map(a => a.id)).toContain('agent-3');
    });

    it('should return agents with different statuses', () => {
      const running = { ...mockAgent, id: 'running-1', status: 'running' as AgentStatus };
      const completed = { ...mockAgent, id: 'completed-1', status: 'completed' as AgentStatus };
      const failed = { ...mockAgent, id: 'failed-1', status: 'failed' as AgentStatus };

      store.createAgent(running);
      store.createAgent(completed);
      store.createAgent(failed);

      const agents = store.getAllAgents();
      
      expect(agents).toHaveLength(3);
      expect(agents.find(a => a.status === 'running')).toBeDefined();
      expect(agents.find(a => a.status === 'completed')).toBeDefined();
      expect(agents.find(a => a.status === 'failed')).toBeDefined();
    });

    it('should return agents in insertion order', () => {
      const agent1 = { ...mockAgent, id: 'agent-1' };
      const agent2 = { ...mockAgent, id: 'agent-2' };
      const agent3 = { ...mockAgent, id: 'agent-3' };

      store.createAgent(agent1);
      store.createAgent(agent2);
      store.createAgent(agent3);

      const agents = store.getAllAgents();
      
      // Maps maintain insertion order
      expect(agents[0].id).toBe('agent-1');
      expect(agents[1].id).toBe('agent-2');
      expect(agents[2].id).toBe('agent-3');
    });
  });

  describe('updateAgent', () => {
    beforeEach(() => {
      store.createAgent(mockAgent);
    });

    it('should update agent name', () => {
      store.updateAgent(mockAgent.id, { name: 'updated-name' });
      
      const agent = store.getAgent(mockAgent.id);
      expect(agent?.name).toBe('updated-name');
    });

    it('should update agent status and maintain index consistency', () => {
      store.updateAgent(mockAgent.id, { status: 'completed', endTime: Date.now() });
      
      const agent = store.getAgent(mockAgent.id);
      expect(agent?.status).toBe('completed');
      
      // Check indexes are updated
      expect(store.getAgentsByStatus('running').has(mockAgent.id)).toBe(false);
      expect(store.getAgentsByStatus('completed').has(mockAgent.id)).toBe(true);
    });

    it('should update agent metrics', () => {
      const newMetrics: AgentMetrics = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 100,
        cacheWriteTokens: 50,
        totalCost: 0.01,
        contextTokens: 1500,
        contextLimit: 100000,
        turnCount: 2,
      };

      store.updateAgent(mockAgent.id, { metrics: newMetrics });
      
      const agent = store.getAgent(mockAgent.id);
      expect(agent?.metrics).toEqual(newMetrics);
    });

    it('should update endTime', () => {
      const endTime = Date.now();
      store.updateAgent(mockAgent.id, { endTime });
      
      const agent = store.getAgent(mockAgent.id);
      expect(agent?.endTime).toBe(endTime);
    });

    it('should update messageCount', () => {
      store.updateAgent(mockAgent.id, { messageCount: 5 });
      
      const agent = store.getAgent(mockAgent.id);
      expect(agent?.messageCount).toBe(5);
    });

    it('should update toolCalls array', () => {
      const toolCall: ToolCall = {
        id: 'tool-1',
        toolName: 'read',
        args: { path: '/test' },
        argsSummary: '/test',
        status: 'success',
        startTime: Date.now(),
        endTime: Date.now() + 100,
        duration: 100,
        isError: false,
        errorMessage: null,
      };

      store.updateAgent(mockAgent.id, { toolCalls: [toolCall] });
      
      const agent = store.getAgent(mockAgent.id);
      expect(agent?.toolCalls).toHaveLength(1);
      expect(agent?.toolCalls[0].id).toBe('tool-1');
    });

    it('should handle partial updates without affecting other fields', () => {
      store.updateAgent(mockAgent.id, { messageCount: 10 });
      
      const agent = store.getAgent(mockAgent.id);
      expect(agent?.messageCount).toBe(10);
      expect(agent?.name).toBe(mockAgent.name); // Unchanged
      expect(agent?.status).toBe(mockAgent.status); // Unchanged
    });

    it('should handle updating multiple fields at once', () => {
      const updates = {
        name: 'new-name',
        messageCount: 7,
        endTime: Date.now(),
        status: 'completed' as AgentStatus,
      };

      store.updateAgent(mockAgent.id, updates);
      
      const agent = store.getAgent(mockAgent.id);
      expect(agent?.name).toBe('new-name');
      expect(agent?.messageCount).toBe(7);
      expect(agent?.endTime).toBe(updates.endTime);
      expect(agent?.status).toBe('completed');
    });

    it('should do nothing when updating non-existent agent', () => {
      expect(() => {
        store.updateAgent('non-existent', { name: 'test' });
      }).not.toThrow();
      
      expect(store.getAgent('non-existent')).toBeUndefined();
    });

    it('should update status from running to completed and update indexes', () => {
      store.updateAgent(mockAgent.id, { status: 'completed' });
      
      expect(store.getAgentsByStatus('running').has(mockAgent.id)).toBe(false);
      expect(store.getAgentsByStatus('completed').has(mockAgent.id)).toBe(true);
    });

    it('should update status from running to failed and update indexes', () => {
      store.updateAgent(mockAgent.id, { status: 'failed' });
      
      expect(store.getAgentsByStatus('running').has(mockAgent.id)).toBe(false);
      expect(store.getAgentsByStatus('failed').has(mockAgent.id)).toBe(true);
    });
  });

  describe('deleteAgent', () => {
    beforeEach(() => {
      store.createAgent(mockAgent);
    });

    it('should remove agent from store', () => {
      store.deleteAgent(mockAgent.id);
      
      expect(store.getAgent(mockAgent.id)).toBeUndefined();
      expect(store.size()).toBe(0);
    });

    it('should remove agent from agentsByStatus index', () => {
      store.deleteAgent(mockAgent.id);
      
      expect(store.getAgentsByStatus('running').has(mockAgent.id)).toBe(false);
    });

    it('should remove agent from parent subagentIds array', () => {
      const parentAgent: Agent = { ...mockAgent, id: 'parent-123' };
      const childAgent: Agent = {
        ...mockAgent,
        id: 'child-123',
        parentId: 'parent-123',
      };

      store.createAgent(parentAgent);
      store.createAgent(childAgent);

      store.deleteAgent('child-123');

      const parent = store.getAgent('parent-123');
      expect(parent?.subagentIds).not.toContain('child-123');
      expect(parent?.subagentIds.length).toBe(0);
    });

    it('should remove agent from subagentsByParent index', () => {
      const parentAgent: Agent = { ...mockAgent, id: 'parent-123' };
      const childAgent: Agent = {
        ...mockAgent,
        id: 'child-123',
        parentId: 'parent-123',
      };

      store.createAgent(parentAgent);
      store.createAgent(childAgent);

      store.deleteAgent('child-123');

      const subagents = store.getSubagentsByParent('parent-123');
      expect(subagents.has('child-123')).toBe(false);
      expect(subagents.size).toBe(0);
    });

    it('should clean up pending tool calls', () => {
      const pendingToolCall: ToolCall = {
        id: 'tool-pending',
        toolName: 'bash',
        args: { command: 'sleep 10' },
        argsSummary: 'sleep 10',
        status: 'pending',
        startTime: Date.now(),
        endTime: null,
        duration: null,
        isError: false,
        errorMessage: null,
      };

      const agentWithPendingTool: Agent = {
        ...mockAgent,
        toolCalls: [pendingToolCall],
      };

      store.createAgent(agentWithPendingTool);
      
      // Assuming the store tracks pending tool calls in its index
      // This would be verified by the implementation

      store.deleteAgent(mockAgent.id);

      expect(store.getPendingToolCall('tool-pending')).toBeUndefined();
    });

    it('should handle deleting root agent with children', () => {
      const parentAgent: Agent = { ...mockAgent, id: 'parent-123' };
      const child1: Agent = { ...mockAgent, id: 'child-1', parentId: 'parent-123' };
      const child2: Agent = { ...mockAgent, id: 'child-2', parentId: 'parent-123' };

      store.createAgent(parentAgent);
      store.createAgent(child1);
      store.createAgent(child2);

      store.deleteAgent('parent-123');

      expect(store.getAgent('parent-123')).toBeUndefined();
      // Children should still exist (orphaned or implementation-defined behavior)
      // This depends on the design decision
    });

    it('should do nothing when deleting non-existent agent', () => {
      expect(() => {
        store.deleteAgent('non-existent');
      }).not.toThrow();
      
      expect(store.size()).toBe(1); // Original agent still there
    });

    it('should handle deleting multiple agents', () => {
      const agent2 = { ...mockAgent, id: 'agent-2' };
      const agent3 = { ...mockAgent, id: 'agent-3' };

      store.createAgent(agent2);
      store.createAgent(agent3);

      expect(store.size()).toBe(3);

      store.deleteAgent(mockAgent.id);
      store.deleteAgent('agent-2');

      expect(store.size()).toBe(1);
      expect(store.getAgent('agent-3')).toBeDefined();
    });

    it('should maintain index consistency after deletion', () => {
      const agent2 = { ...mockAgent, id: 'agent-2', status: 'completed' as AgentStatus };
      store.createAgent(agent2);

      store.deleteAgent(mockAgent.id);

      // Verify running status index doesn't have deleted agent
      expect(store.getAgentsByStatus('running').has(mockAgent.id)).toBe(false);
      // But still has other running agents (none in this case)
      expect(store.getAgentsByStatus('running').size).toBe(0);
      // Completed index should have agent-2
      expect(store.getAgentsByStatus('completed').has('agent-2')).toBe(true);
    });
  });

  describe('reset', () => {
    beforeEach(() => {
      // Add multiple agents with various configurations
      const agent1 = { ...mockAgent, id: 'agent-1', status: 'running' as AgentStatus };
      const agent2 = { ...mockAgent, id: 'agent-2', status: 'completed' as AgentStatus };
      const agent3 = { ...mockAgent, id: 'agent-3', status: 'failed' as AgentStatus };
      const parent = { ...mockAgent, id: 'parent' };
      const child = { ...mockAgent, id: 'child', parentId: 'parent' };

      store.createAgent(agent1);
      store.createAgent(agent2);
      store.createAgent(agent3);
      store.createAgent(parent);
      store.createAgent(child);
    });

    it('should clear all agents from store', () => {
      expect(store.size()).toBe(5);
      
      store.reset();
      
      expect(store.size()).toBe(0);
      expect(store.getAllAgents()).toEqual([]);
    });

    it('should clear agentsByStatus index', () => {
      store.reset();
      
      expect(store.getAgentsByStatus('running').size).toBe(0);
      expect(store.getAgentsByStatus('completed').size).toBe(0);
      expect(store.getAgentsByStatus('failed').size).toBe(0);
    });

    it('should clear subagentsByParent index', () => {
      store.reset();
      
      expect(store.getSubagentsByParent('parent').size).toBe(0);
    });

    it('should clear pendingToolCalls index', () => {
      store.reset();
      
      expect(store.getPendingToolCall('any-id')).toBeUndefined();
    });

    it('should allow creating agents after reset', () => {
      store.reset();
      
      const newAgent = { ...mockAgent, id: 'new-agent' };
      store.createAgent(newAgent);
      
      expect(store.size()).toBe(1);
      expect(store.getAgent('new-agent')).toBeDefined();
    });

    it('should not throw when called on empty store', () => {
      store.reset();
      
      expect(() => {
        store.reset();
      }).not.toThrow();
    });

    it('should reinitialize status indexes properly', () => {
      store.reset();
      
      const runningAgent = { ...mockAgent, id: 'running-1', status: 'running' as AgentStatus };
      store.createAgent(runningAgent);
      
      expect(store.getAgentsByStatus('running').has('running-1')).toBe(true);
      expect(store.getAgentsByStatus('completed').size).toBe(0);
      expect(store.getAgentsByStatus('failed').size).toBe(0);
    });
  });

  describe('Index Consistency', () => {
    it('should maintain agentsByStatus index consistency across operations', () => {
      // Create running agent
      store.createAgent(mockAgent);
      expect(store.getAgentsByStatus('running').has(mockAgent.id)).toBe(true);
      
      // Update to completed
      store.updateAgent(mockAgent.id, { status: 'completed' });
      expect(store.getAgentsByStatus('running').has(mockAgent.id)).toBe(false);
      expect(store.getAgentsByStatus('completed').has(mockAgent.id)).toBe(true);
      
      // Delete
      store.deleteAgent(mockAgent.id);
      expect(store.getAgentsByStatus('completed').has(mockAgent.id)).toBe(false);
    });

    it('should maintain subagentsByParent index consistency across operations', () => {
      const parent: Agent = { ...mockAgent, id: 'parent' };
      const child: Agent = { ...mockAgent, id: 'child', parentId: 'parent' };
      
      // Create parent and child
      store.createAgent(parent);
      store.createAgent(child);
      expect(store.getSubagentsByParent('parent').has('child')).toBe(true);
      
      // Delete child
      store.deleteAgent('child');
      expect(store.getSubagentsByParent('parent').has('child')).toBe(false);
    });

    it('should handle complex parent-child relationships', () => {
      const root: Agent = { ...mockAgent, id: 'root' };
      const child1: Agent = { ...mockAgent, id: 'child1', parentId: 'root' };
      const child2: Agent = { ...mockAgent, id: 'child2', parentId: 'root' };
      const grandchild: Agent = { ...mockAgent, id: 'grandchild', parentId: 'child1' };

      store.createAgent(root);
      store.createAgent(child1);
      store.createAgent(child2);
      store.createAgent(grandchild);

      // Verify root has 2 children
      expect(store.getAgent('root')?.subagentIds).toHaveLength(2);
      expect(store.getSubagentsByParent('root').size).toBe(2);
      
      // Verify child1 has 1 child
      expect(store.getAgent('child1')?.subagentIds).toHaveLength(1);
      expect(store.getSubagentsByParent('child1').size).toBe(1);
      
      // Delete child1
      store.deleteAgent('child1');
      
      // Root should have 1 child now
      expect(store.getAgent('root')?.subagentIds).toHaveLength(1);
      expect(store.getSubagentsByParent('root').has('child1')).toBe(false);
    });

    it('should maintain consistency when updating agent with tool calls', () => {
      const pendingTool: ToolCall = {
        id: 'tool-1',
        toolName: 'bash',
        args: {},
        argsSummary: '',
        status: 'pending',
        startTime: Date.now(),
        endTime: null,
        duration: null,
        isError: false,
        errorMessage: null,
      };

      store.createAgent(mockAgent);
      
      // Add pending tool call
      store.updateAgent(mockAgent.id, { toolCalls: [pendingTool] });
      
      const agent = store.getAgent(mockAgent.id);
      expect(agent?.toolCalls).toHaveLength(1);
      
      // Update tool call to completed
      const completedTool: ToolCall = {
        ...pendingTool,
        status: 'success',
        endTime: Date.now(),
        duration: 100,
      };
      
      store.updateAgent(mockAgent.id, { toolCalls: [completedTool] });
      
      const updatedAgent = store.getAgent(mockAgent.id);
      expect(updatedAgent?.toolCalls[0].status).toBe('success');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty agent name', () => {
      const emptyNameAgent = { ...mockAgent, name: '' };
      store.createAgent(emptyNameAgent);
      
      expect(store.getAgent(mockAgent.id)?.name).toBe('');
    });

    it('should handle very long agent name', () => {
      const longName = 'a'.repeat(1000);
      const longNameAgent = { ...mockAgent, name: longName };
      store.createAgent(longNameAgent);
      
      expect(store.getAgent(mockAgent.id)?.name).toBe(longName);
    });

    it('should handle agent with many tool calls', () => {
      const manyTools: ToolCall[] = Array.from({ length: 100 }, (_, i) => ({
        id: `tool-${i}`,
        toolName: 'bash',
        args: {},
        argsSummary: '',
        status: 'success' as ToolCallStatus,
        startTime: Date.now(),
        endTime: Date.now() + 100,
        duration: 100,
        isError: false,
        errorMessage: null,
      }));

      const agentWithManyTools = { ...mockAgent, toolCalls: manyTools };
      store.createAgent(agentWithManyTools);
      
      expect(store.getAgent(mockAgent.id)?.toolCalls).toHaveLength(100);
    });

    it('should handle agent with many subagents', () => {
      const parent: Agent = { ...mockAgent, id: 'parent' };
      store.createAgent(parent);
      
      for (let i = 0; i < 50; i++) {
        const child: Agent = {
          ...mockAgent,
          id: `child-${i}`,
          parentId: 'parent',
        };
        store.createAgent(child);
      }
      
      const parentAgent = store.getAgent('parent');
      expect(parentAgent?.subagentIds).toHaveLength(50);
      expect(store.getSubagentsByParent('parent').size).toBe(50);
    });

    it('should handle zero values in metrics', () => {
      const zeroMetrics: AgentMetrics = {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0,
        contextTokens: 0,
        contextLimit: 1,
        turnCount: 0,
      };

      const agentWithZeros = { ...mockAgent, metrics: zeroMetrics };
      store.createAgent(agentWithZeros);
      
      const agent = store.getAgent(mockAgent.id);
      expect(agent?.metrics).toEqual(zeroMetrics);
    });

    it('should handle large metric values', () => {
      const largeMetrics: AgentMetrics = {
        inputTokens: 1000000,
        outputTokens: 500000,
        cacheReadTokens: 100000,
        cacheWriteTokens: 50000,
        totalCost: 1000.50,
        contextTokens: 95000,
        contextLimit: 100000,
        turnCount: 1000,
      };

      const agentWithLargeMetrics = { ...mockAgent, metrics: largeMetrics };
      store.createAgent(agentWithLargeMetrics);
      
      const agent = store.getAgent(mockAgent.id);
      expect(agent?.metrics).toEqual(largeMetrics);
    });

    it('should handle rapid sequential operations', () => {
      // Create many agents quickly
      for (let i = 0; i < 100; i++) {
        store.createAgent({ ...mockAgent, id: `agent-${i}` });
      }
      
      expect(store.size()).toBe(100);
      
      // Update many agents quickly
      for (let i = 0; i < 50; i++) {
        store.updateAgent(`agent-${i}`, { status: 'completed' });
      }
      
      expect(store.getAgentsByStatus('completed').size).toBe(50);
      
      // Delete many agents quickly
      for (let i = 0; i < 25; i++) {
        store.deleteAgent(`agent-${i}`);
      }
      
      expect(store.size()).toBe(75);
    });

    it('should handle updating non-existent parent reference', () => {
      const orphanAgent: Agent = {
        ...mockAgent,
        parentId: 'non-existent-parent',
      };
      
      // Should not throw, but behavior is implementation-defined
      expect(() => {
        store.createAgent(orphanAgent);
      }).not.toThrow();
    });
  });

  describe('Performance Characteristics', () => {
    it('should provide O(1) lookup with getAgent', () => {
      // Add many agents
      for (let i = 0; i < 1000; i++) {
        store.createAgent({ ...mockAgent, id: `agent-${i}` });
      }
      
      // Lookup should be fast regardless of position
      const start = Date.now();
      store.getAgent('agent-500');
      const duration = Date.now() - start;
      
      // Should complete in less than 1ms (allowing for variance)
      expect(duration).toBeLessThan(10);
    });

    it('should handle large number of agents efficiently', () => {
      const count = 10000;
      
      const start = Date.now();
      for (let i = 0; i < count; i++) {
        store.createAgent({ ...mockAgent, id: `agent-${i}` });
      }
      const duration = Date.now() - start;
      
      expect(store.size()).toBe(count);
      // Should complete in reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
    });
  });
});
