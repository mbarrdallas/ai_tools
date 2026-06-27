/**
 * State Manager Implementation Test Suite
 * 
 * Tests for the StateManager class in state/state-manager.ts (Task T3)
 * 
 * The StateManager provides a high-level API that wraps the DataStore,
 * managing agent lifecycle, metrics accumulation, tool call tracking,
 * and conversation history. It handles parent-child relationships and
 * ensures proper cleanup on agent dismissal.
 * 
 * Acceptance Criteria:
 * - createAgent(name, parentId?) creates agent with UUID, returns ID
 * - getAgent(id) returns agent or undefined
 * - getAllAgents() returns all tracked agents
 * - completeAgent(id, status) marks agent as completed/failed with endTime
 * - dismissAgent(id) removes agent and cleans up references
 * - updateMetrics(agentId, metrics) accumulates token counts and cost
 * - incrementTurnCount(agentId) increments turn counter
 * - addToolCall(agentId, toolCall) adds tool call to agent's history
 * - completeToolCall(toolCallId, update) updates tool call status, endTime, and calculates duration
 * - addConversationEntry(agentId, entry) adds message preview
 * - reset() resets all state for new session
 * - Parent-child relationships maintained correctly (subagentIds array updated)
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import type {
  Agent,
  AgentStatus,
  AgentMetrics,
  ToolCall,
  ToolCallStatus,
  ConversationEntry,
  MessageRole,
} from '@lib/stats_dashboard/types';

// The StateManager implementation to be tested
// This will be implemented by the Coder Agent
import { StateManager } from '@lib/stats_dashboard/state/state-manager';

describe('StateManager', () => {
  let stateManager: StateManager;
  let mockTimestamp: number;

  beforeEach(() => {
    stateManager = new StateManager();
    mockTimestamp = Date.now();
  });

  describe('Constructor', () => {
    it('should initialize with empty state', () => {
      expect(stateManager.getAllAgents()).toEqual([]);
    });

    it('should be ready to accept operations immediately', () => {
      const agentId = stateManager.createAgent('test-agent');
      expect(agentId).toBeDefined();
      expect(typeof agentId).toBe('string');
    });
  });

  describe('createAgent', () => {
    it('should create agent with valid UUID', () => {
      const agentId = stateManager.createAgent('test-agent');
      
      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(agentId).toMatch(uuidRegex);
    });

    it('should create agent with provided name', () => {
      const agentId = stateManager.createAgent('my-agent');
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.name).toBe('my-agent');
    });

    it('should create agent with running status by default', () => {
      const agentId = stateManager.createAgent('test-agent');
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.status).toBe('running');
    });

    it('should create agent with null parentId when no parent specified', () => {
      const agentId = stateManager.createAgent('root-agent');
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.parentId).toBeNull();
    });

    it('should create agent with specified parentId', () => {
      const parentId = stateManager.createAgent('parent-agent');
      const childId = stateManager.createAgent('child-agent', parentId);
      
      const child = stateManager.getAgent(childId);
      expect(child?.parentId).toBe(parentId);
    });

    it('should update parent agent subagentIds array', () => {
      const parentId = stateManager.createAgent('parent-agent');
      const childId = stateManager.createAgent('child-agent', parentId);
      
      const parent = stateManager.getAgent(parentId);
      expect(parent?.subagentIds).toContain(childId);
      expect(parent?.subagentIds).toHaveLength(1);
    });

    it('should initialize agent with empty toolCalls array', () => {
      const agentId = stateManager.createAgent('test-agent');
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.toolCalls).toEqual([]);
    });

    it('should initialize agent with zero messageCount', () => {
      const agentId = stateManager.createAgent('test-agent');
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.messageCount).toBe(0);
    });

    it('should initialize agent with empty subagentIds array', () => {
      const agentId = stateManager.createAgent('test-agent');
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.subagentIds).toEqual([]);
    });

    it('should initialize agent with zero metrics', () => {
      const agentId = stateManager.createAgent('test-agent');
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.metrics.inputTokens).toBe(0);
      expect(agent?.metrics.outputTokens).toBe(0);
      expect(agent?.metrics.cacheReadTokens).toBe(0);
      expect(agent?.metrics.cacheWriteTokens).toBe(0);
      expect(agent?.metrics.totalCost).toBe(0);
      expect(agent?.metrics.contextTokens).toBe(0);
      expect(agent?.metrics.turnCount).toBe(0);
    });

    it('should initialize agent with default context limit', () => {
      const agentId = stateManager.createAgent('test-agent');
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.metrics.contextLimit).toBeGreaterThan(0);
    });

    it('should set startTime to current timestamp', () => {
      const beforeCreate = Date.now();
      const agentId = stateManager.createAgent('test-agent');
      const afterCreate = Date.now();
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.startTime).toBeGreaterThanOrEqual(beforeCreate);
      expect(agent?.startTime).toBeLessThanOrEqual(afterCreate);
    });

    it('should set endTime to null for new agent', () => {
      const agentId = stateManager.createAgent('test-agent');
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.endTime).toBeNull();
    });

    it('should create multiple agents with unique IDs', () => {
      const id1 = stateManager.createAgent('agent-1');
      const id2 = stateManager.createAgent('agent-2');
      const id3 = stateManager.createAgent('agent-3');
      
      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should handle multiple children for same parent', () => {
      const parentId = stateManager.createAgent('parent');
      const child1Id = stateManager.createAgent('child-1', parentId);
      const child2Id = stateManager.createAgent('child-2', parentId);
      const child3Id = stateManager.createAgent('child-3', parentId);
      
      const parent = stateManager.getAgent(parentId);
      expect(parent?.subagentIds).toHaveLength(3);
      expect(parent?.subagentIds).toContain(child1Id);
      expect(parent?.subagentIds).toContain(child2Id);
      expect(parent?.subagentIds).toContain(child3Id);
    });

    it('should support nested hierarchy (grandchildren)', () => {
      const rootId = stateManager.createAgent('root');
      const childId = stateManager.createAgent('child', rootId);
      const grandchildId = stateManager.createAgent('grandchild', childId);
      
      const root = stateManager.getAgent(rootId);
      const child = stateManager.getAgent(childId);
      const grandchild = stateManager.getAgent(grandchildId);
      
      expect(root?.subagentIds).toContain(childId);
      expect(child?.subagentIds).toContain(grandchildId);
      expect(grandchild?.parentId).toBe(childId);
    });

    it('should handle creating agent with non-existent parent gracefully', () => {
      // Implementation should not crash, but parent-child link won't be bidirectional
      const childId = stateManager.createAgent('orphan', 'non-existent-parent');
      
      const child = stateManager.getAgent(childId);
      expect(child?.parentId).toBe('non-existent-parent');
      expect(stateManager.getAgent('non-existent-parent')).toBeUndefined();
    });
  });

  describe('getAgent', () => {
    it('should return agent by ID', () => {
      const agentId = stateManager.createAgent('test-agent');
      
      const agent = stateManager.getAgent(agentId);
      expect(agent).toBeDefined();
      expect(agent?.id).toBe(agentId);
    });

    it('should return undefined for non-existent agent', () => {
      const agent = stateManager.getAgent('non-existent-id');
      expect(agent).toBeUndefined();
    });

    it('should return agent with all properties', () => {
      const agentId = stateManager.createAgent('test-agent');
      
      const agent = stateManager.getAgent(agentId);
      expect(agent).toHaveProperty('id');
      expect(agent).toHaveProperty('name');
      expect(agent).toHaveProperty('status');
      expect(agent).toHaveProperty('parentId');
      expect(agent).toHaveProperty('startTime');
      expect(agent).toHaveProperty('endTime');
      expect(agent).toHaveProperty('metrics');
      expect(agent).toHaveProperty('toolCalls');
      expect(agent).toHaveProperty('messageCount');
      expect(agent).toHaveProperty('subagentIds');
    });

    it('should return updated agent after modifications', () => {
      const agentId = stateManager.createAgent('test-agent');
      
      stateManager.updateMetrics(agentId, { inputTokens: 1000 });
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.metrics.inputTokens).toBe(1000);
    });

    it('should perform lookup in O(1) time', () => {
      // Create many agents
      const agentIds = [];
      for (let i = 0; i < 1000; i++) {
        agentIds.push(stateManager.createAgent(`agent-${i}`));
      }
      
      // Lookup should be fast regardless of number of agents
      const start = Date.now();
      stateManager.getAgent(agentIds[500]);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(10); // Should be nearly instant
    });
  });

  describe('getAllAgents', () => {
    it('should return empty array when no agents exist', () => {
      expect(stateManager.getAllAgents()).toEqual([]);
    });

    it('should return all created agents', () => {
      const id1 = stateManager.createAgent('agent-1');
      const id2 = stateManager.createAgent('agent-2');
      const id3 = stateManager.createAgent('agent-3');
      
      const agents = stateManager.getAllAgents();
      expect(agents).toHaveLength(3);
      expect(agents.map(a => a.id)).toContain(id1);
      expect(agents.map(a => a.id)).toContain(id2);
      expect(agents.map(a => a.id)).toContain(id3);
    });

    it('should return agents with different statuses', () => {
      const id1 = stateManager.createAgent('running-agent');
      const id2 = stateManager.createAgent('completed-agent');
      const id3 = stateManager.createAgent('failed-agent');
      
      stateManager.completeAgent(id2, 'completed');
      stateManager.completeAgent(id3, 'failed');
      
      const agents = stateManager.getAllAgents();
      expect(agents).toHaveLength(3);
      expect(agents.find(a => a.status === 'running')).toBeDefined();
      expect(agents.find(a => a.status === 'completed')).toBeDefined();
      expect(agents.find(a => a.status === 'failed')).toBeDefined();
    });

    it('should include both root and child agents', () => {
      const parentId = stateManager.createAgent('parent');
      const childId = stateManager.createAgent('child', parentId);
      
      const agents = stateManager.getAllAgents();
      expect(agents).toHaveLength(2);
      expect(agents.map(a => a.id)).toContain(parentId);
      expect(agents.map(a => a.id)).toContain(childId);
    });

    it('should reflect current state after updates', () => {
      const agentId = stateManager.createAgent('test-agent');
      stateManager.updateMetrics(agentId, { inputTokens: 500 });
      
      const agents = stateManager.getAllAgents();
      expect(agents[0].metrics.inputTokens).toBe(500);
    });

    it('should not include dismissed agents', () => {
      const id1 = stateManager.createAgent('agent-1');
      const id2 = stateManager.createAgent('agent-2');
      
      stateManager.dismissAgent(id1);
      
      const agents = stateManager.getAllAgents();
      expect(agents).toHaveLength(1);
      expect(agents[0].id).toBe(id2);
    });
  });

  describe('completeAgent', () => {
    let agentId: string;

    beforeEach(() => {
      agentId = stateManager.createAgent('test-agent');
    });

    it('should mark agent as completed', () => {
      stateManager.completeAgent(agentId, 'completed');
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.status).toBe('completed');
    });

    it('should mark agent as failed', () => {
      stateManager.completeAgent(agentId, 'failed');
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.status).toBe('failed');
    });

    it('should set endTime when completing agent', () => {
      const beforeComplete = Date.now();
      stateManager.completeAgent(agentId, 'completed');
      const afterComplete = Date.now();
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.endTime).not.toBeNull();
      expect(agent?.endTime).toBeGreaterThanOrEqual(beforeComplete);
      expect(agent?.endTime).toBeLessThanOrEqual(afterComplete);
    });

    it('should not change other agent properties', () => {
      const beforeAgent = stateManager.getAgent(agentId);
      
      stateManager.completeAgent(agentId, 'completed');
      
      const afterAgent = stateManager.getAgent(agentId);
      expect(afterAgent?.name).toBe(beforeAgent?.name);
      expect(afterAgent?.parentId).toBe(beforeAgent?.parentId);
      expect(afterAgent?.startTime).toBe(beforeAgent?.startTime);
      expect(afterAgent?.metrics).toEqual(beforeAgent?.metrics);
    });

    it('should handle completing non-existent agent gracefully', () => {
      expect(() => {
        stateManager.completeAgent('non-existent-id', 'completed');
      }).not.toThrow();
    });

    it('should allow completing already completed agent', () => {
      stateManager.completeAgent(agentId, 'completed');
      
      expect(() => {
        stateManager.completeAgent(agentId, 'failed');
      }).not.toThrow();
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.status).toBe('failed');
    });

    it('should update endTime when re-completing agent', () => {
      stateManager.completeAgent(agentId, 'completed');
      const firstEndTime = stateManager.getAgent(agentId)?.endTime;
      
      // Wait a tiny bit to ensure timestamp changes
      const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      stateManager.completeAgent(agentId, 'failed');
      const secondEndTime = stateManager.getAgent(agentId)?.endTime;
      
      expect(secondEndTime).not.toBe(firstEndTime);
    });
  });

  describe('dismissAgent', () => {
    it('should remove agent from state', () => {
      const agentId = stateManager.createAgent('test-agent');
      
      stateManager.dismissAgent(agentId);
      
      expect(stateManager.getAgent(agentId)).toBeUndefined();
    });

    it('should remove agent from parent subagentIds', () => {
      const parentId = stateManager.createAgent('parent');
      const childId = stateManager.createAgent('child', parentId);
      
      stateManager.dismissAgent(childId);
      
      const parent = stateManager.getAgent(parentId);
      expect(parent?.subagentIds).not.toContain(childId);
      expect(parent?.subagentIds).toEqual([]);
    });

    it('should remove from getAllAgents result', () => {
      const id1 = stateManager.createAgent('agent-1');
      const id2 = stateManager.createAgent('agent-2');
      
      stateManager.dismissAgent(id1);
      
      const agents = stateManager.getAllAgents();
      expect(agents.map(a => a.id)).not.toContain(id1);
      expect(agents).toHaveLength(1);
    });

    it('should handle dismissing non-existent agent gracefully', () => {
      expect(() => {
        stateManager.dismissAgent('non-existent-id');
      }).not.toThrow();
    });

    it('should allow dismissing root agent', () => {
      const rootId = stateManager.createAgent('root');
      
      expect(() => {
        stateManager.dismissAgent(rootId);
      }).not.toThrow();
      
      expect(stateManager.getAgent(rootId)).toBeUndefined();
    });

    it('should handle dismissing agent with children', () => {
      const parentId = stateManager.createAgent('parent');
      const child1Id = stateManager.createAgent('child-1', parentId);
      const child2Id = stateManager.createAgent('child-2', parentId);
      
      stateManager.dismissAgent(parentId);
      
      // Parent should be removed
      expect(stateManager.getAgent(parentId)).toBeUndefined();
      
      // Children behavior is implementation-defined (orphaned or cascade deleted)
      // Just verify no crash occurs
      const allAgents = stateManager.getAllAgents();
      expect(Array.isArray(allAgents)).toBe(true);
    });

    it('should clean up all references to dismissed agent', () => {
      const parentId = stateManager.createAgent('parent');
      const childId = stateManager.createAgent('child', parentId);
      const grandchildId = stateManager.createAgent('grandchild', childId);
      
      stateManager.dismissAgent(childId);
      
      const parent = stateManager.getAgent(parentId);
      expect(parent?.subagentIds).not.toContain(childId);
      
      // Grandchild might be orphaned but should not cause errors
      const grandchild = stateManager.getAgent(grandchildId);
      expect(grandchild?.parentId).toBe(childId); // Still references dismissed parent
    });

    it('should handle dismissing multiple agents', () => {
      const id1 = stateManager.createAgent('agent-1');
      const id2 = stateManager.createAgent('agent-2');
      const id3 = stateManager.createAgent('agent-3');
      
      stateManager.dismissAgent(id1);
      stateManager.dismissAgent(id3);
      
      const agents = stateManager.getAllAgents();
      expect(agents).toHaveLength(1);
      expect(agents[0].id).toBe(id2);
    });
  });

  describe('updateMetrics', () => {
    let agentId: string;

    beforeEach(() => {
      agentId = stateManager.createAgent('test-agent');
    });

    it('should accumulate inputTokens', () => {
      stateManager.updateMetrics(agentId, { inputTokens: 100 });
      stateManager.updateMetrics(agentId, { inputTokens: 200 });
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.metrics.inputTokens).toBe(300);
    });

    it('should accumulate outputTokens', () => {
      stateManager.updateMetrics(agentId, { outputTokens: 50 });
      stateManager.updateMetrics(agentId, { outputTokens: 75 });
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.metrics.outputTokens).toBe(125);
    });

    it('should accumulate cacheReadTokens', () => {
      stateManager.updateMetrics(agentId, { cacheReadTokens: 1000 });
      stateManager.updateMetrics(agentId, { cacheReadTokens: 500 });
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.metrics.cacheReadTokens).toBe(1500);
    });

    it('should accumulate cacheWriteTokens', () => {
      stateManager.updateMetrics(agentId, { cacheWriteTokens: 200 });
      stateManager.updateMetrics(agentId, { cacheWriteTokens: 300 });
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.metrics.cacheWriteTokens).toBe(500);
    });

    it('should accumulate totalCost', () => {
      stateManager.updateMetrics(agentId, { totalCost: 0.01 });
      stateManager.updateMetrics(agentId, { totalCost: 0.02 });
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.metrics.totalCost).toBeCloseTo(0.03, 5);
    });

    it('should update contextTokens (not accumulate)', () => {
      stateManager.updateMetrics(agentId, { contextTokens: 1000 });
      stateManager.updateMetrics(agentId, { contextTokens: 1500 });
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.metrics.contextTokens).toBe(1500); // Last value wins
    });

    it('should update contextLimit if provided', () => {
      stateManager.updateMetrics(agentId, { contextLimit: 200000 });
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.metrics.contextLimit).toBe(200000);
    });

    it('should handle multiple metrics in single update', () => {
      stateManager.updateMetrics(agentId, {
        inputTokens: 100,
        outputTokens: 50,
        totalCost: 0.01,
        contextTokens: 150,
      });
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.metrics.inputTokens).toBe(100);
      expect(agent?.metrics.outputTokens).toBe(50);
      expect(agent?.metrics.totalCost).toBe(0.01);
      expect(agent?.metrics.contextTokens).toBe(150);
    });

    it('should handle partial metric updates', () => {
      stateManager.updateMetrics(agentId, { inputTokens: 100 });
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.metrics.inputTokens).toBe(100);
      expect(agent?.metrics.outputTokens).toBe(0); // Unchanged
    });

    it('should handle zero values', () => {
      stateManager.updateMetrics(agentId, { inputTokens: 0 });
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.metrics.inputTokens).toBe(0);
    });

    it('should handle large metric values', () => {
      stateManager.updateMetrics(agentId, { inputTokens: 1000000 });
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.metrics.inputTokens).toBe(1000000);
    });

    it('should handle fractional cost values', () => {
      stateManager.updateMetrics(agentId, { totalCost: 0.001234 });
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.metrics.totalCost).toBeCloseTo(0.001234, 6);
    });

    it('should handle updating non-existent agent gracefully', () => {
      expect(() => {
        stateManager.updateMetrics('non-existent-id', { inputTokens: 100 });
      }).not.toThrow();
    });

    it('should support complex accumulation patterns', () => {
      // Simulate real usage pattern
      stateManager.updateMetrics(agentId, {
        inputTokens: 500,
        outputTokens: 200,
        totalCost: 0.005,
        contextTokens: 700,
      });
      
      stateManager.updateMetrics(agentId, {
        inputTokens: 300,
        outputTokens: 150,
        totalCost: 0.003,
        contextTokens: 1150,
      });
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.metrics.inputTokens).toBe(800);
      expect(agent?.metrics.outputTokens).toBe(350);
      expect(agent?.metrics.totalCost).toBeCloseTo(0.008, 5);
      expect(agent?.metrics.contextTokens).toBe(1150); // Latest value
    });
  });

  describe('incrementTurnCount', () => {
    let agentId: string;

    beforeEach(() => {
      agentId = stateManager.createAgent('test-agent');
    });

    it('should increment turn count from 0 to 1', () => {
      stateManager.incrementTurnCount(agentId);
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.metrics.turnCount).toBe(1);
    });

    it('should increment turn count multiple times', () => {
      stateManager.incrementTurnCount(agentId);
      stateManager.incrementTurnCount(agentId);
      stateManager.incrementTurnCount(agentId);
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.metrics.turnCount).toBe(3);
    });

    it('should not affect other metrics', () => {
      stateManager.updateMetrics(agentId, { inputTokens: 100 });
      
      stateManager.incrementTurnCount(agentId);
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.metrics.inputTokens).toBe(100); // Unchanged
      expect(agent?.metrics.turnCount).toBe(1);
    });

    it('should handle incrementing non-existent agent gracefully', () => {
      expect(() => {
        stateManager.incrementTurnCount('non-existent-id');
      }).not.toThrow();
    });

    it('should support many increments', () => {
      for (let i = 0; i < 100; i++) {
        stateManager.incrementTurnCount(agentId);
      }
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.metrics.turnCount).toBe(100);
    });
  });

  describe('addToolCall', () => {
    let agentId: string;

    beforeEach(() => {
      agentId = stateManager.createAgent('test-agent');
    });

    it('should add tool call to agent toolCalls array', () => {
      stateManager.addToolCall(agentId, {
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
      });
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.toolCalls).toHaveLength(1);
      expect(agent?.toolCalls[0].id).toBe('tool-1');
    });

    it('should preserve tool call properties', () => {
      const toolCall = {
        id: 'tool-1',
        toolName: 'read',
        args: { path: '/test.txt' },
        argsSummary: '/test.txt',
        status: 'pending' as ToolCallStatus,
        startTime: mockTimestamp,
        endTime: null,
        duration: null,
        isError: false,
        errorMessage: null,
      };
      
      stateManager.addToolCall(agentId, toolCall);
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.toolCalls[0]).toEqual(toolCall);
    });

    it('should add multiple tool calls in order', () => {
      stateManager.addToolCall(agentId, {
        id: 'tool-1',
        toolName: 'bash',
        args: {},
        argsSummary: '',
        status: 'pending',
        startTime: mockTimestamp,
        endTime: null,
        duration: null,
        isError: false,
        errorMessage: null,
      });
      
      stateManager.addToolCall(agentId, {
        id: 'tool-2',
        toolName: 'read',
        args: {},
        argsSummary: '',
        status: 'pending',
        startTime: mockTimestamp + 100,
        endTime: null,
        duration: null,
        isError: false,
        errorMessage: null,
      });
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.toolCalls).toHaveLength(2);
      expect(agent?.toolCalls[0].id).toBe('tool-1');
      expect(agent?.toolCalls[1].id).toBe('tool-2');
    });

    it('should handle tool call with complex args', () => {
      stateManager.addToolCall(agentId, {
        id: 'tool-1',
        toolName: 'subagent',
        args: {
          agent: 'researcher',
          task: 'Find information about X',
          context: { foo: 'bar' },
        },
        argsSummary: 'researcher: Find information about X',
        status: 'pending',
        startTime: mockTimestamp,
        endTime: null,
        duration: null,
        isError: false,
        errorMessage: null,
      });
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.toolCalls[0].args).toEqual({
        agent: 'researcher',
        task: 'Find information about X',
        context: { foo: 'bar' },
      });
    });

    it('should handle adding tool call to non-existent agent gracefully', () => {
      expect(() => {
        stateManager.addToolCall('non-existent-id', {
          id: 'tool-1',
          toolName: 'bash',
          args: {},
          argsSummary: '',
          status: 'pending',
          startTime: mockTimestamp,
          endTime: null,
          duration: null,
          isError: false,
          errorMessage: null,
        });
      }).not.toThrow();
    });

    it('should support many tool calls', () => {
      for (let i = 0; i < 50; i++) {
        stateManager.addToolCall(agentId, {
          id: `tool-${i}`,
          toolName: 'bash',
          args: { command: `cmd-${i}` },
          argsSummary: `cmd-${i}`,
          status: 'pending',
          startTime: mockTimestamp + i,
          endTime: null,
          duration: null,
          isError: false,
          errorMessage: null,
        });
      }
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.toolCalls).toHaveLength(50);
    });
  });

  describe('completeToolCall', () => {
    let agentId: string;
    let toolCallId: string;

    beforeEach(() => {
      agentId = stateManager.createAgent('test-agent');
      toolCallId = 'tool-1';
      
      stateManager.addToolCall(agentId, {
        id: toolCallId,
        toolName: 'bash',
        args: { command: 'ls' },
        argsSummary: 'ls',
        status: 'pending',
        startTime: mockTimestamp,
        endTime: null,
        duration: null,
        isError: false,
        errorMessage: null,
      });
    });

    it('should update tool call status to success', () => {
      stateManager.completeToolCall(toolCallId, {
        status: 'success',
        endTime: mockTimestamp + 100,
        isError: false,
        errorMessage: null,
      });
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.toolCalls[0].status).toBe('success');
    });

    it('should update tool call status to failed', () => {
      stateManager.completeToolCall(toolCallId, {
        status: 'failed',
        endTime: mockTimestamp + 100,
        isError: true,
        errorMessage: 'Command failed',
      });
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.toolCalls[0].status).toBe('failed');
    });

    it('should set endTime', () => {
      const endTime = mockTimestamp + 250;
      
      stateManager.completeToolCall(toolCallId, {
        status: 'success',
        endTime,
        isError: false,
        errorMessage: null,
      });
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.toolCalls[0].endTime).toBe(endTime);
    });

    it('should calculate duration from startTime and endTime', () => {
      const startTime = mockTimestamp;
      const endTime = mockTimestamp + 250;
      
      stateManager.completeToolCall(toolCallId, {
        status: 'success',
        endTime,
        isError: false,
        errorMessage: null,
      });
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.toolCalls[0].duration).toBe(250);
    });

    it('should set isError flag', () => {
      stateManager.completeToolCall(toolCallId, {
        status: 'failed',
        endTime: mockTimestamp + 100,
        isError: true,
        errorMessage: 'Error occurred',
      });
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.toolCalls[0].isError).toBe(true);
    });

    it('should set errorMessage on failure', () => {
      const errorMsg = 'Command not found: xyz';
      
      stateManager.completeToolCall(toolCallId, {
        status: 'failed',
        endTime: mockTimestamp + 100,
        isError: true,
        errorMessage: errorMsg,
      });
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.toolCalls[0].errorMessage).toBe(errorMsg);
    });

    it('should keep errorMessage null on success', () => {
      stateManager.completeToolCall(toolCallId, {
        status: 'success',
        endTime: mockTimestamp + 100,
        isError: false,
        errorMessage: null,
      });
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.toolCalls[0].errorMessage).toBeNull();
    });

    it('should handle completing non-existent tool call gracefully', () => {
      expect(() => {
        stateManager.completeToolCall('non-existent-tool', {
          status: 'success',
          endTime: mockTimestamp + 100,
          isError: false,
          errorMessage: null,
        });
      }).not.toThrow();
    });

    it('should handle multiple tool calls completion', () => {
      stateManager.addToolCall(agentId, {
        id: 'tool-2',
        toolName: 'read',
        args: {},
        argsSummary: '',
        status: 'pending',
        startTime: mockTimestamp,
        endTime: null,
        duration: null,
        isError: false,
        errorMessage: null,
      });
      
      stateManager.completeToolCall('tool-1', {
        status: 'success',
        endTime: mockTimestamp + 100,
        isError: false,
        errorMessage: null,
      });
      
      stateManager.completeToolCall('tool-2', {
        status: 'failed',
        endTime: mockTimestamp + 200,
        isError: true,
        errorMessage: 'Read error',
      });
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.toolCalls[0].status).toBe('success');
      expect(agent?.toolCalls[1].status).toBe('failed');
    });

    it('should calculate duration correctly for quick tool calls', () => {
      stateManager.completeToolCall(toolCallId, {
        status: 'success',
        endTime: mockTimestamp + 5,
        isError: false,
        errorMessage: null,
      });
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.toolCalls[0].duration).toBe(5);
    });

    it('should calculate duration correctly for long-running tool calls', () => {
      stateManager.completeToolCall(toolCallId, {
        status: 'success',
        endTime: mockTimestamp + 60000, // 1 minute
        isError: false,
        errorMessage: null,
      });
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.toolCalls[0].duration).toBe(60000);
    });

    it('should not modify other tool call properties', () => {
      stateManager.completeToolCall(toolCallId, {
        status: 'success',
        endTime: mockTimestamp + 100,
        isError: false,
        errorMessage: null,
      });
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.toolCalls[0].toolName).toBe('bash');
      expect(agent?.toolCalls[0].args).toEqual({ command: 'ls' });
      expect(agent?.toolCalls[0].startTime).toBe(mockTimestamp);
    });
  });

  describe('addConversationEntry', () => {
    let agentId: string;

    beforeEach(() => {
      agentId = stateManager.createAgent('test-agent');
    });

    it('should add conversation entry to agent', () => {
      const entry: ConversationEntry = {
        role: 'user',
        preview: 'Hello, assistant!',
        timestamp: mockTimestamp,
      };
      
      stateManager.addConversationEntry(agentId, entry);
      
      const agent = stateManager.getAgent(agentId);
      // Implementation may store conversation entries or just increment messageCount
      // At minimum, messageCount should be affected
      expect(agent?.messageCount).toBeGreaterThan(0);
    });

    it('should increment messageCount', () => {
      stateManager.addConversationEntry(agentId, {
        role: 'user',
        preview: 'Message 1',
        timestamp: mockTimestamp,
      });
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.messageCount).toBe(1);
    });

    it('should increment messageCount for multiple entries', () => {
      stateManager.addConversationEntry(agentId, {
        role: 'user',
        preview: 'Message 1',
        timestamp: mockTimestamp,
      });
      
      stateManager.addConversationEntry(agentId, {
        role: 'assistant',
        preview: 'Response 1',
        timestamp: mockTimestamp + 100,
      });
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.messageCount).toBe(2);
    });

    it('should handle user role', () => {
      expect(() => {
        stateManager.addConversationEntry(agentId, {
          role: 'user',
          preview: 'User message',
          timestamp: mockTimestamp,
        });
      }).not.toThrow();
    });

    it('should handle assistant role', () => {
      expect(() => {
        stateManager.addConversationEntry(agentId, {
          role: 'assistant',
          preview: 'Assistant message',
          timestamp: mockTimestamp,
        });
      }).not.toThrow();
    });

    it('should handle toolResult role', () => {
      expect(() => {
        stateManager.addConversationEntry(agentId, {
          role: 'toolResult',
          preview: 'Tool output',
          timestamp: mockTimestamp,
        });
      }).not.toThrow();
    });

    it('should handle empty preview', () => {
      stateManager.addConversationEntry(agentId, {
        role: 'user',
        preview: '',
        timestamp: mockTimestamp,
      });
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.messageCount).toBe(1);
    });

    it('should handle long preview text', () => {
      const longText = 'a'.repeat(1000);
      
      stateManager.addConversationEntry(agentId, {
        role: 'assistant',
        preview: longText,
        timestamp: mockTimestamp,
      });
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.messageCount).toBe(1);
    });

    it('should handle adding to non-existent agent gracefully', () => {
      expect(() => {
        stateManager.addConversationEntry('non-existent-id', {
          role: 'user',
          preview: 'Message',
          timestamp: mockTimestamp,
        });
      }).not.toThrow();
    });

    it('should support many conversation entries', () => {
      for (let i = 0; i < 100; i++) {
        stateManager.addConversationEntry(agentId, {
          role: i % 2 === 0 ? 'user' : 'assistant',
          preview: `Message ${i}`,
          timestamp: mockTimestamp + i,
        });
      }
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.messageCount).toBe(100);
    });
  });

  describe('reset', () => {
    beforeEach(() => {
      // Create complex state
      const root = stateManager.createAgent('root');
      const child1 = stateManager.createAgent('child-1', root);
      const child2 = stateManager.createAgent('child-2', root);
      
      stateManager.updateMetrics(root, {
        inputTokens: 1000,
        outputTokens: 500,
        totalCost: 0.05,
      });
      
      stateManager.addToolCall(root, {
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
      });
      
      stateManager.incrementTurnCount(root);
      stateManager.addConversationEntry(root, {
        role: 'user',
        preview: 'Hello',
        timestamp: Date.now(),
      });
    });

    it('should clear all agents', () => {
      stateManager.reset();
      
      expect(stateManager.getAllAgents()).toEqual([]);
    });

    it('should allow creating new agents after reset', () => {
      stateManager.reset();
      
      const newId = stateManager.createAgent('new-agent');
      expect(stateManager.getAgent(newId)).toBeDefined();
    });

    it('should clear all agent data', () => {
      stateManager.reset();
      
      const newId = stateManager.createAgent('fresh-agent');
      const agent = stateManager.getAgent(newId);
      
      expect(agent?.metrics.inputTokens).toBe(0);
      expect(agent?.toolCalls).toEqual([]);
      expect(agent?.messageCount).toBe(0);
    });

    it('should not throw when called on empty state', () => {
      stateManager.reset();
      
      expect(() => {
        stateManager.reset();
      }).not.toThrow();
    });

    it('should reset to initial state', () => {
      const initialAgents = stateManager.getAllAgents().length;
      
      stateManager.reset();
      
      expect(stateManager.getAllAgents().length).toBe(0);
    });

    it('should handle operations correctly after reset', () => {
      stateManager.reset();
      
      const id1 = stateManager.createAgent('agent-1');
      const id2 = stateManager.createAgent('agent-2', id1);
      
      stateManager.updateMetrics(id1, { inputTokens: 100 });
      stateManager.incrementTurnCount(id1);
      
      const parent = stateManager.getAgent(id1);
      expect(parent?.metrics.inputTokens).toBe(100);
      expect(parent?.metrics.turnCount).toBe(1);
      expect(parent?.subagentIds).toContain(id2);
    });
  });

  describe('Parent-Child Relationship Integrity', () => {
    it('should maintain bidirectional parent-child links', () => {
      const parentId = stateManager.createAgent('parent');
      const childId = stateManager.createAgent('child', parentId);
      
      const parent = stateManager.getAgent(parentId);
      const child = stateManager.getAgent(childId);
      
      expect(child?.parentId).toBe(parentId);
      expect(parent?.subagentIds).toContain(childId);
    });

    it('should support multiple levels of hierarchy', () => {
      const rootId = stateManager.createAgent('root');
      const level1Id = stateManager.createAgent('level-1', rootId);
      const level2Id = stateManager.createAgent('level-2', level1Id);
      const level3Id = stateManager.createAgent('level-3', level2Id);
      
      const root = stateManager.getAgent(rootId);
      const level1 = stateManager.getAgent(level1Id);
      const level2 = stateManager.getAgent(level2Id);
      const level3 = stateManager.getAgent(level3Id);
      
      expect(root?.subagentIds).toContain(level1Id);
      expect(level1?.subagentIds).toContain(level2Id);
      expect(level2?.subagentIds).toContain(level3Id);
      expect(level3?.parentId).toBe(level2Id);
    });

    it('should handle sibling relationships', () => {
      const parentId = stateManager.createAgent('parent');
      const child1Id = stateManager.createAgent('child-1', parentId);
      const child2Id = stateManager.createAgent('child-2', parentId);
      const child3Id = stateManager.createAgent('child-3', parentId);
      
      const parent = stateManager.getAgent(parentId);
      
      expect(parent?.subagentIds).toHaveLength(3);
      expect(parent?.subagentIds).toEqual(
        expect.arrayContaining([child1Id, child2Id, child3Id])
      );
    });

    it('should remove child reference when child is dismissed', () => {
      const parentId = stateManager.createAgent('parent');
      const child1Id = stateManager.createAgent('child-1', parentId);
      const child2Id = stateManager.createAgent('child-2', parentId);
      
      stateManager.dismissAgent(child1Id);
      
      const parent = stateManager.getAgent(parentId);
      expect(parent?.subagentIds).not.toContain(child1Id);
      expect(parent?.subagentIds).toContain(child2Id);
    });

    it('should maintain independent agent states', () => {
      const parent = stateManager.createAgent('parent');
      const child = stateManager.createAgent('child', parent);
      
      stateManager.updateMetrics(parent, { inputTokens: 1000 });
      stateManager.updateMetrics(child, { inputTokens: 500 });
      
      const parentAgent = stateManager.getAgent(parent);
      const childAgent = stateManager.getAgent(child);
      
      expect(parentAgent?.metrics.inputTokens).toBe(1000);
      expect(childAgent?.metrics.inputTokens).toBe(500);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty agent name', () => {
      const agentId = stateManager.createAgent('');
      expect(stateManager.getAgent(agentId)?.name).toBe('');
    });

    it('should handle very long agent name', () => {
      const longName = 'a'.repeat(10000);
      const agentId = stateManager.createAgent(longName);
      expect(stateManager.getAgent(agentId)?.name).toBe(longName);
    });

    it('should handle special characters in agent name', () => {
      const specialName = '🔥 agent-123 (test) [main]';
      const agentId = stateManager.createAgent(specialName);
      expect(stateManager.getAgent(agentId)?.name).toBe(specialName);
    });

    it('should handle negative metric values gracefully', () => {
      const agentId = stateManager.createAgent('test');
      
      // Implementation should handle or clamp negative values
      stateManager.updateMetrics(agentId, { inputTokens: -100 });
      
      const agent = stateManager.getAgent(agentId);
      // Accept either clamped to 0 or stored as-is (implementation choice)
      expect(typeof agent?.metrics.inputTokens).toBe('number');
    });

    it('should handle very large metric values', () => {
      const agentId = stateManager.createAgent('test');
      
      stateManager.updateMetrics(agentId, { inputTokens: Number.MAX_SAFE_INTEGER });
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.metrics.inputTokens).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle concurrent operations on different agents', () => {
      const id1 = stateManager.createAgent('agent-1');
      const id2 = stateManager.createAgent('agent-2');
      
      stateManager.updateMetrics(id1, { inputTokens: 100 });
      stateManager.updateMetrics(id2, { inputTokens: 200 });
      stateManager.incrementTurnCount(id1);
      stateManager.incrementTurnCount(id2);
      
      const agent1 = stateManager.getAgent(id1);
      const agent2 = stateManager.getAgent(id2);
      
      expect(agent1?.metrics.inputTokens).toBe(100);
      expect(agent2?.metrics.inputTokens).toBe(200);
      expect(agent1?.metrics.turnCount).toBe(1);
      expect(agent2?.metrics.turnCount).toBe(1);
    });

    it('should handle rapid sequential operations', () => {
      const agentId = stateManager.createAgent('test');
      
      for (let i = 0; i < 1000; i++) {
        stateManager.updateMetrics(agentId, { inputTokens: 1 });
      }
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.metrics.inputTokens).toBe(1000);
    });

    it('should maintain consistency across complex workflow', () => {
      // Simulate real agent workflow
      const rootId = stateManager.createAgent('main');
      
      stateManager.incrementTurnCount(rootId);
      stateManager.updateMetrics(rootId, {
        inputTokens: 500,
        outputTokens: 200,
        contextTokens: 700,
        totalCost: 0.005,
      });
      
      stateManager.addToolCall(rootId, {
        id: 'tool-1',
        toolName: 'subagent',
        args: { agent: 'researcher' },
        argsSummary: 'researcher',
        status: 'pending',
        startTime: Date.now(),
        endTime: null,
        duration: null,
        isError: false,
        errorMessage: null,
      });
      
      const childId = stateManager.createAgent('researcher', rootId);
      
      stateManager.completeToolCall('tool-1', {
        status: 'success',
        endTime: Date.now() + 1000,
        isError: false,
        errorMessage: null,
      });
      
      stateManager.completeAgent(childId, 'completed');
      
      const root = stateManager.getAgent(rootId);
      const child = stateManager.getAgent(childId);
      
      expect(root?.subagentIds).toContain(childId);
      expect(root?.toolCalls[0].status).toBe('success');
      expect(child?.status).toBe('completed');
      expect(child?.endTime).not.toBeNull();
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle many agents efficiently', () => {
      const start = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        stateManager.createAgent(`agent-${i}`);
      }
      
      const duration = Date.now() - start;
      
      expect(stateManager.getAllAgents()).toHaveLength(1000);
      expect(duration).toBeLessThan(1000); // Should complete in < 1 second
    });

    it('should perform fast lookups with many agents', () => {
      const ids = [];
      for (let i = 0; i < 1000; i++) {
        ids.push(stateManager.createAgent(`agent-${i}`));
      }
      
      const start = Date.now();
      stateManager.getAgent(ids[500]);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(10); // O(1) lookup
    });

    it('should handle many tool calls per agent', () => {
      const agentId = stateManager.createAgent('test');
      
      for (let i = 0; i < 100; i++) {
        stateManager.addToolCall(agentId, {
          id: `tool-${i}`,
          toolName: 'bash',
          args: {},
          argsSummary: '',
          status: 'pending',
          startTime: Date.now(),
          endTime: null,
          duration: null,
          isError: false,
          errorMessage: null,
        });
      }
      
      const agent = stateManager.getAgent(agentId);
      expect(agent?.toolCalls).toHaveLength(100);
    });

    it('should handle complex agent hierarchy efficiently', () => {
      const rootId = stateManager.createAgent('root');
      
      // Create deep hierarchy: 10 levels, 2 children per level
      let currentParents = [rootId];
      for (let level = 0; level < 10; level++) {
        const nextParents = [];
        for (const parent of currentParents) {
          nextParents.push(stateManager.createAgent(`l${level}-c1`, parent));
          nextParents.push(stateManager.createAgent(`l${level}-c2`, parent));
        }
        currentParents = nextParents;
      }
      
      // Should have 2^10 = 1024 leaf nodes + all intermediate nodes
      const allAgents = stateManager.getAllAgents();
      expect(allAgents.length).toBeGreaterThan(1000);
    });
  });
});
