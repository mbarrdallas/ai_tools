/**
 * Tab Dismissal Test Suite
 * 
 * Tests for Task T15: Tab Dismissal functionality
 * 
 * This test suite verifies that users can dismiss completed/failed agent tabs
 * from the dashboard, with proper state cleanup and selection management.
 * 
 * Acceptance Criteria:
 * - 'd' or 'D' key dismisses selected agent tab
 * - Only completed/failed agents can be dismissed
 * - Running agents show warning if dismiss attempted
 * - Dismissal removes agent from state manager
 * - Dismissal removes tab from tab bar
 * - Selection moves to adjacent tab after dismiss
 * - Memory properly cleaned up (no orphan tool calls)
 * - Subagents of dismissed parent are also dismissed (or shown warning)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { TabBar } from '@lib/stats_dashboard_tui/ui/tabs';
import { DashboardController } from '@lib/stats_dashboard_tui/ui/controller';
import { StateManager } from '@lib/stats_dashboard_tui/state/state-manager';
import type {
  Agent,
  AgentStatus,
  AgentMetrics,
  ToolCall,
} from '@lib/stats_dashboard_tui/types';

/**
 * Mock theme for testing
 */
const mockTheme = {
  fg: jest.fn((style: string, text: string) => text),
  bg: jest.fn((style: string, text: string) => text),
};

/**
 * Mock Pi context for testing controller
 */
const mockPiContext = {
  ui: {
    custom: jest.fn(),
    notify: jest.fn(),
  },
};

/**
 * Helper to create a complete agent object
 */
function createMockAgent(
  id: string,
  name: string,
  status: AgentStatus,
  parentId: string | null = null,
  subagentIds: string[] = []
): Agent {
  return {
    id,
    name,
    status,
    parentId,
    startTime: Date.now() - 60000,
    endTime: status === 'running' ? null : Date.now() - 30000,
    metrics: {
      inputTokens: 1000,
      outputTokens: 500,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      totalCost: 0.05,
      contextTokens: 5000,
      contextLimit: 100000,
      turnCount: 3,
    },
    toolCalls: [],
    messageCount: 5,
    subagentIds,
  };
}

/**
 * Helper to create a mock tool call
 */
function createMockToolCall(
  id: string,
  toolName: string,
  status: 'pending' | 'success' | 'failed' = 'success'
): ToolCall {
  return {
    id,
    toolName,
    args: { test: 'value' },
    argsSummary: 'test: value',
    status,
    startTime: Date.now() - 5000,
    endTime: status === 'pending' ? null : Date.now() - 1000,
    duration: status === 'pending' ? null : 4000,
    isError: status === 'failed',
    errorMessage: status === 'failed' ? 'Test error' : null,
  };
}

describe('Tab Dismissal (T15)', () => {
  let stateManager: StateManager;
  let onTabSelectCallback: jest.Mock;
  let onTabDismissCallback: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create fresh state manager
    stateManager = new StateManager();
    
    // Create mock callbacks
    onTabSelectCallback = jest.fn();
    onTabDismissCallback = jest.fn();
  });

  describe('Keyboard Input Handling', () => {
    it('should trigger onTabDismiss when "d" key is pressed on selected tab', () => {
      // Arrange
      const completedAgent = createMockAgent('agent-1', 'completed-agent', 'completed');
      const tabBar = new TabBar({
        agents: [completedAgent],
        selectedId: 'agent-1',
        onTabSelect: onTabSelectCallback,
        onTabDismiss: onTabDismissCallback,
        theme: mockTheme,
      });

      // Act
      tabBar.handleInput('d');

      // Assert
      expect(onTabDismissCallback).toHaveBeenCalledTimes(1);
      expect(onTabDismissCallback).toHaveBeenCalledWith('agent-1');
    });

    it('should trigger onTabDismiss when "D" key is pressed (uppercase)', () => {
      // Arrange
      const failedAgent = createMockAgent('agent-1', 'failed-agent', 'failed');
      const tabBar = new TabBar({
        agents: [failedAgent],
        selectedId: 'agent-1',
        onTabSelect: onTabSelectCallback,
        onTabDismiss: onTabDismissCallback,
        theme: mockTheme,
      });

      // Act
      tabBar.handleInput('D');

      // Assert
      expect(onTabDismissCallback).toHaveBeenCalledTimes(1);
      expect(onTabDismissCallback).toHaveBeenCalledWith('agent-1');
    });

    it('should not trigger onTabDismiss when other keys are pressed', () => {
      // Arrange
      const agent = createMockAgent('agent-1', 'test-agent', 'completed');
      const tabBar = new TabBar({
        agents: [agent],
        selectedId: 'agent-1',
        onTabSelect: onTabSelectCallback,
        onTabDismiss: onTabDismissCallback,
        theme: mockTheme,
      });

      // Act - try various other keys
      tabBar.handleInput('a');
      tabBar.handleInput('x');
      tabBar.handleInput('\t'); // Tab key
      tabBar.handleInput('\x1b[C'); // Right arrow

      // Assert
      expect(onTabDismissCallback).not.toHaveBeenCalled();
    });

    it('should not trigger dismiss when no tab is selected', () => {
      // Arrange
      const agent = createMockAgent('agent-1', 'test-agent', 'completed');
      const tabBar = new TabBar({
        agents: [agent],
        selectedId: null,
        onTabSelect: onTabSelectCallback,
        onTabDismiss: onTabDismissCallback,
        theme: mockTheme,
      });

      // Act
      tabBar.handleInput('d');

      // Assert
      expect(onTabDismissCallback).not.toHaveBeenCalled();
    });
  });

  describe('Status-Based Dismissal Restrictions', () => {
    it('should allow dismissal of completed agents', () => {
      // Arrange
      const completedAgent = createMockAgent('agent-1', 'completed-agent', 'completed');
      const tabBar = new TabBar({
        agents: [completedAgent],
        selectedId: 'agent-1',
        onTabSelect: onTabSelectCallback,
        onTabDismiss: onTabDismissCallback,
        theme: mockTheme,
      });

      // Act
      tabBar.handleInput('d');

      // Assert
      expect(onTabDismissCallback).toHaveBeenCalledTimes(1);
      expect(onTabDismissCallback).toHaveBeenCalledWith('agent-1');
    });

    it('should allow dismissal of failed agents', () => {
      // Arrange
      const failedAgent = createMockAgent('agent-1', 'failed-agent', 'failed');
      const tabBar = new TabBar({
        agents: [failedAgent],
        selectedId: 'agent-1',
        onTabSelect: onTabSelectCallback,
        onTabDismiss: onTabDismissCallback,
        theme: mockTheme,
      });

      // Act
      tabBar.handleInput('d');

      // Assert
      expect(onTabDismissCallback).toHaveBeenCalledTimes(1);
      expect(onTabDismissCallback).toHaveBeenCalledWith('agent-1');
    });

    it('should not allow dismissal of running agents', () => {
      // Arrange
      const runningAgent = createMockAgent('agent-1', 'running-agent', 'running');
      const tabBar = new TabBar({
        agents: [runningAgent],
        selectedId: 'agent-1',
        onTabSelect: onTabSelectCallback,
        onTabDismiss: onTabDismissCallback,
        theme: mockTheme,
      });

      // Act
      tabBar.handleInput('d');

      // Assert
      expect(onTabDismissCallback).not.toHaveBeenCalled();
    });

    it('should show warning notification when attempting to dismiss running agent', () => {
      // Arrange
      const mockNotify = jest.fn();
      const runningAgent = createMockAgent('agent-1', 'running-agent', 'running');
      const tabBar = new TabBar({
        agents: [runningAgent],
        selectedId: 'agent-1',
        onTabSelect: onTabSelectCallback,
        onTabDismiss: onTabDismissCallback,
        theme: mockTheme,
        notifyCallback: mockNotify,
      });

      // Act
      tabBar.handleInput('d');

      // Assert
      expect(mockNotify).toHaveBeenCalledTimes(1);
      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'warning',
          message: expect.stringContaining('running'),
        })
      );
    });
  });

  describe('State Manager Integration', () => {
    it('should remove agent from state manager when dismissed', () => {
      // Arrange
      const agentId = stateManager.createAgent('test-agent');
      stateManager.completeAgent(agentId, 'completed');
      
      // Verify agent exists before dismissal
      expect(stateManager.getAgent(agentId)).toBeDefined();
      
      // Act
      stateManager.dismissAgent(agentId);
      
      // Assert
      expect(stateManager.getAgent(agentId)).toBeUndefined();
    });

    it('should remove agent from getAllAgents list after dismissal', () => {
      // Arrange
      const agent1Id = stateManager.createAgent('agent-1');
      const agent2Id = stateManager.createAgent('agent-2');
      stateManager.completeAgent(agent1Id, 'completed');
      stateManager.completeAgent(agent2Id, 'completed');
      
      expect(stateManager.getAllAgents()).toHaveLength(2);
      
      // Act
      stateManager.dismissAgent(agent1Id);
      
      // Assert
      const remaining = stateManager.getAllAgents();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(agent2Id);
    });

    it('should clean up tool calls when agent is dismissed', () => {
      // Arrange
      const agentId = stateManager.createAgent('test-agent');
      const toolCall = createMockToolCall('tool-1', 'bash', 'success');
      stateManager.addToolCall(agentId, toolCall);
      stateManager.completeAgent(agentId, 'completed');
      
      // Verify tool call exists
      const agentBefore = stateManager.getAgent(agentId);
      expect(agentBefore?.toolCalls).toHaveLength(1);
      
      // Act
      stateManager.dismissAgent(agentId);
      
      // Assert
      const agentAfter = stateManager.getAgent(agentId);
      expect(agentAfter).toBeUndefined();
      // Tool calls should be gone with the agent
    });

    it('should not leave orphan tool calls after dismissal', () => {
      // Arrange
      const agentId = stateManager.createAgent('test-agent');
      const toolCall1 = createMockToolCall('tool-1', 'bash', 'success');
      const toolCall2 = createMockToolCall('tool-2', 'read', 'success');
      stateManager.addToolCall(agentId, toolCall1);
      stateManager.addToolCall(agentId, toolCall2);
      stateManager.completeAgent(agentId, 'completed');
      
      // Act
      stateManager.dismissAgent(agentId);
      
      // Assert - verify no orphan tool calls remain in any agent
      const allAgents = stateManager.getAllAgents();
      for (const agent of allAgents) {
        expect(agent.toolCalls.find(tc => tc.id === 'tool-1')).toBeUndefined();
        expect(agent.toolCalls.find(tc => tc.id === 'tool-2')).toBeUndefined();
      }
    });
  });

  describe('Tab Bar UI Updates', () => {
    it('should remove dismissed tab from rendered output', () => {
      // Arrange
      const agent1 = createMockAgent('agent-1', 'agent-1', 'completed');
      const agent2 = createMockAgent('agent-2', 'agent-2', 'completed');
      const agents = [agent1, agent2];
      
      const tabBar = new TabBar({
        agents,
        selectedId: 'agent-1',
        onTabSelect: onTabSelectCallback,
        onTabDismiss: onTabDismissCallback,
        theme: mockTheme,
      });
      
      // Verify both tabs render initially
      const renderBefore = tabBar.render(100);
      expect(renderBefore.join('').includes('agent-1')).toBe(true);
      expect(renderBefore.join('').includes('agent-2')).toBe(true);
      
      // Act - update agents to remove agent-1
      tabBar.updateAgents([agent2]);
      
      // Assert
      const renderAfter = tabBar.render(100);
      expect(renderAfter.join('').includes('agent-1')).toBe(false);
      expect(renderAfter.join('').includes('agent-2')).toBe(true);
    });

    it('should show "No agents" message when all tabs are dismissed', () => {
      // Arrange
      const agent = createMockAgent('agent-1', 'only-agent', 'completed');
      const tabBar = new TabBar({
        agents: [agent],
        selectedId: 'agent-1',
        onTabSelect: onTabSelectCallback,
        onTabDismiss: onTabDismissCallback,
        theme: mockTheme,
      });
      
      // Act - remove all agents
      tabBar.updateAgents([]);
      
      // Assert
      const render = tabBar.render(100);
      expect(render.join('').toLowerCase()).toContain('no agents');
    });
  });

  describe('Selection Management After Dismissal', () => {
    it('should move selection to next tab when middle tab is dismissed', () => {
      // Arrange
      const agent1 = createMockAgent('agent-1', 'agent-1', 'completed');
      const agent2 = createMockAgent('agent-2', 'agent-2', 'completed');
      const agent3 = createMockAgent('agent-3', 'agent-3', 'completed');
      
      const tabBar = new TabBar({
        agents: [agent1, agent2, agent3],
        selectedId: 'agent-2', // Select middle tab
        onTabSelect: onTabSelectCallback,
        onTabDismiss: onTabDismissCallback,
        theme: mockTheme,
      });
      
      // Act - dismiss agent-2, update to remaining agents
      tabBar.updateAgents([agent1, agent3]);
      
      // Assert - selection should move to agent-3 (next in list)
      expect(tabBar.getSelectedId()).toBe('agent-3');
    });

    it('should move selection to previous tab when last tab is dismissed', () => {
      // Arrange
      const agent1 = createMockAgent('agent-1', 'agent-1', 'completed');
      const agent2 = createMockAgent('agent-2', 'agent-2', 'completed');
      const agent3 = createMockAgent('agent-3', 'agent-3', 'completed');
      
      const tabBar = new TabBar({
        agents: [agent1, agent2, agent3],
        selectedId: 'agent-3', // Select last tab
        onTabSelect: onTabSelectCallback,
        onTabDismiss: onTabDismissCallback,
        theme: mockTheme,
      });
      
      // Act - dismiss agent-3, update to remaining agents
      tabBar.updateAgents([agent1, agent2]);
      
      // Assert - selection should move to agent-2 (previous tab)
      expect(tabBar.getSelectedId()).toBe('agent-2');
    });

    it('should move selection to first remaining tab when first tab is dismissed', () => {
      // Arrange
      const agent1 = createMockAgent('agent-1', 'agent-1', 'completed');
      const agent2 = createMockAgent('agent-2', 'agent-2', 'completed');
      const agent3 = createMockAgent('agent-3', 'agent-3', 'completed');
      
      const tabBar = new TabBar({
        agents: [agent1, agent2, agent3],
        selectedId: 'agent-1', // Select first tab
        onTabSelect: onTabSelectCallback,
        onTabDismiss: onTabDismissCallback,
        theme: mockTheme,
      });
      
      // Act - dismiss agent-1, update to remaining agents
      tabBar.updateAgents([agent2, agent3]);
      
      // Assert - selection should move to agent-2 (new first tab)
      expect(tabBar.getSelectedId()).toBe('agent-2');
    });

    it('should set selection to null when last remaining tab is dismissed', () => {
      // Arrange
      const agent = createMockAgent('agent-1', 'only-agent', 'completed');
      
      const tabBar = new TabBar({
        agents: [agent],
        selectedId: 'agent-1',
        onTabSelect: onTabSelectCallback,
        onTabDismiss: onTabDismissCallback,
        theme: mockTheme,
      });
      
      // Act - dismiss the only agent
      tabBar.updateAgents([]);
      
      // Assert
      expect(tabBar.getSelectedId()).toBeNull();
    });

    it('should call onTabSelect callback when selection moves after dismissal', () => {
      // Arrange
      const agent1 = createMockAgent('agent-1', 'agent-1', 'completed');
      const agent2 = createMockAgent('agent-2', 'agent-2', 'completed');
      
      const tabBar = new TabBar({
        agents: [agent1, agent2],
        selectedId: 'agent-1',
        onTabSelect: onTabSelectCallback,
        onTabDismiss: onTabDismissCallback,
        theme: mockTheme,
      });
      
      // Clear any initial callback calls
      onTabSelectCallback.mockClear();
      
      // Act - dismiss agent-1
      tabBar.updateAgents([agent2]);
      
      // Assert - onTabSelect should be called with agent-2
      expect(onTabSelectCallback).toHaveBeenCalledTimes(1);
      expect(onTabSelectCallback).toHaveBeenCalledWith('agent-2');
    });
  });

  describe('Subagent Handling', () => {
    it('should dismiss all subagents when parent is dismissed', () => {
      // Arrange
      const parentId = stateManager.createAgent('parent');
      const child1Id = stateManager.createAgent('child-1', parentId);
      const child2Id = stateManager.createAgent('child-2', parentId);
      
      stateManager.completeAgent(parentId, 'completed');
      stateManager.completeAgent(child1Id, 'completed');
      stateManager.completeAgent(child2Id, 'completed');
      
      // Verify all agents exist
      expect(stateManager.getAgent(parentId)).toBeDefined();
      expect(stateManager.getAgent(child1Id)).toBeDefined();
      expect(stateManager.getAgent(child2Id)).toBeDefined();
      expect(stateManager.getAllAgents()).toHaveLength(3);
      
      // Act - dismiss parent
      stateManager.dismissAgent(parentId);
      
      // Assert - all should be dismissed
      expect(stateManager.getAgent(parentId)).toBeUndefined();
      expect(stateManager.getAgent(child1Id)).toBeUndefined();
      expect(stateManager.getAgent(child2Id)).toBeUndefined();
      expect(stateManager.getAllAgents()).toHaveLength(0);
    });

    it('should dismiss nested subagents when parent is dismissed', () => {
      // Arrange
      const parentId = stateManager.createAgent('parent');
      const child1Id = stateManager.createAgent('child-1', parentId);
      const grandchildId = stateManager.createAgent('grandchild', child1Id);
      
      stateManager.completeAgent(parentId, 'completed');
      stateManager.completeAgent(child1Id, 'completed');
      stateManager.completeAgent(grandchildId, 'completed');
      
      expect(stateManager.getAllAgents()).toHaveLength(3);
      
      // Act - dismiss parent (should cascade to all descendants)
      stateManager.dismissAgent(parentId);
      
      // Assert
      expect(stateManager.getAgent(parentId)).toBeUndefined();
      expect(stateManager.getAgent(child1Id)).toBeUndefined();
      expect(stateManager.getAgent(grandchildId)).toBeUndefined();
      expect(stateManager.getAllAgents()).toHaveLength(0);
    });

    it('should show warning when attempting to dismiss parent with running subagents', () => {
      // Arrange
      const mockNotify = jest.fn();
      const parent = createMockAgent('parent', 'parent', 'completed', null, ['child-1']);
      const runningChild = createMockAgent('child-1', 'child', 'running', 'parent');
      
      const tabBar = new TabBar({
        agents: [parent, runningChild],
        selectedId: 'parent',
        onTabSelect: onTabSelectCallback,
        onTabDismiss: onTabDismissCallback,
        theme: mockTheme,
        notifyCallback: mockNotify,
      });
      
      // Act - attempt to dismiss parent with running child
      tabBar.handleInput('d');
      
      // Assert - should show warning and not dismiss
      expect(mockNotify).toHaveBeenCalledTimes(1);
      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'warning',
          message: expect.stringContaining('subagent'),
        })
      );
      expect(onTabDismissCallback).not.toHaveBeenCalled();
    });

    it('should allow dismissal of child without affecting parent', () => {
      // Arrange
      const parentId = stateManager.createAgent('parent');
      const childId = stateManager.createAgent('child', parentId);
      
      stateManager.completeAgent(parentId, 'completed');
      stateManager.completeAgent(childId, 'completed');
      
      expect(stateManager.getAllAgents()).toHaveLength(2);
      
      // Act - dismiss only child
      stateManager.dismissAgent(childId);
      
      // Assert - parent should remain
      expect(stateManager.getAgent(parentId)).toBeDefined();
      expect(stateManager.getAgent(childId)).toBeUndefined();
      expect(stateManager.getAllAgents()).toHaveLength(1);
      
      // Parent's subagentIds should be updated
      const parent = stateManager.getAgent(parentId);
      expect(parent?.subagentIds).not.toContain(childId);
    });

    it('should clean up parent references when child is dismissed', () => {
      // Arrange
      const parentId = stateManager.createAgent('parent');
      const child1Id = stateManager.createAgent('child-1', parentId);
      const child2Id = stateManager.createAgent('child-2', parentId);
      
      stateManager.completeAgent(parentId, 'completed');
      stateManager.completeAgent(child1Id, 'completed');
      stateManager.completeAgent(child2Id, 'completed');
      
      // Verify parent has both children
      let parent = stateManager.getAgent(parentId);
      expect(parent?.subagentIds).toContain(child1Id);
      expect(parent?.subagentIds).toContain(child2Id);
      expect(parent?.subagentIds).toHaveLength(2);
      
      // Act - dismiss one child
      stateManager.dismissAgent(child1Id);
      
      // Assert - parent should only have remaining child
      parent = stateManager.getAgent(parentId);
      expect(parent?.subagentIds).not.toContain(child1Id);
      expect(parent?.subagentIds).toContain(child2Id);
      expect(parent?.subagentIds).toHaveLength(1);
    });
  });

  describe('Memory Cleanup', () => {
    it('should not leave any agent references after dismissal', () => {
      // Arrange
      const agent1Id = stateManager.createAgent('agent-1');
      const agent2Id = stateManager.createAgent('agent-2');
      stateManager.completeAgent(agent1Id, 'completed');
      stateManager.completeAgent(agent2Id, 'completed');
      
      // Act - dismiss agent-1
      stateManager.dismissAgent(agent1Id);
      
      // Assert - agent-1 should not appear in any agent's data
      const remaining = stateManager.getAllAgents();
      for (const agent of remaining) {
        expect(agent.id).not.toBe(agent1Id);
        expect(agent.parentId).not.toBe(agent1Id);
        expect(agent.subagentIds).not.toContain(agent1Id);
      }
    });

    it('should clean up all tool calls associated with dismissed agent', () => {
      // Arrange
      const agentId = stateManager.createAgent('test-agent');
      
      // Add multiple tool calls
      for (let i = 1; i <= 5; i++) {
        const toolCall = createMockToolCall(`tool-${i}`, 'bash', 'success');
        stateManager.addToolCall(agentId, toolCall);
      }
      
      stateManager.completeAgent(agentId, 'completed');
      
      // Verify tool calls exist
      const agentBefore = stateManager.getAgent(agentId);
      expect(agentBefore?.toolCalls).toHaveLength(5);
      
      // Act
      stateManager.dismissAgent(agentId);
      
      // Assert - no tool calls should remain
      const agentAfter = stateManager.getAgent(agentId);
      expect(agentAfter).toBeUndefined();
    });

    it('should clean up metrics when agent is dismissed', () => {
      // Arrange
      const agentId = stateManager.createAgent('test-agent');
      stateManager.updateMetrics(agentId, {
        inputTokens: 5000,
        outputTokens: 3000,
        totalCost: 1.5,
      });
      stateManager.completeAgent(agentId, 'completed');
      
      // Verify metrics exist
      const agentBefore = stateManager.getAgent(agentId);
      expect(agentBefore?.metrics.inputTokens).toBe(5000);
      
      // Act
      stateManager.dismissAgent(agentId);
      
      // Assert - agent and all its data should be gone
      expect(stateManager.getAgent(agentId)).toBeUndefined();
    });

    it('should not affect other agents when one is dismissed', () => {
      // Arrange
      const agent1Id = stateManager.createAgent('agent-1');
      const agent2Id = stateManager.createAgent('agent-2');
      
      const toolCall1 = createMockToolCall('tool-1', 'bash', 'success');
      const toolCall2 = createMockToolCall('tool-2', 'read', 'success');
      
      stateManager.addToolCall(agent1Id, toolCall1);
      stateManager.addToolCall(agent2Id, toolCall2);
      stateManager.updateMetrics(agent2Id, { inputTokens: 1000 });
      
      stateManager.completeAgent(agent1Id, 'completed');
      stateManager.completeAgent(agent2Id, 'completed');
      
      // Act - dismiss agent-1
      stateManager.dismissAgent(agent1Id);
      
      // Assert - agent-2 should be unaffected
      const agent2 = stateManager.getAgent(agent2Id);
      expect(agent2).toBeDefined();
      expect(agent2?.toolCalls).toHaveLength(1);
      expect(agent2?.toolCalls[0].id).toBe('tool-2');
      expect(agent2?.metrics.inputTokens).toBe(1000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle dismissal when agent has no tool calls', () => {
      // Arrange
      const agentId = stateManager.createAgent('no-tools-agent');
      stateManager.completeAgent(agentId, 'completed');
      
      expect(stateManager.getAgent(agentId)?.toolCalls).toHaveLength(0);
      
      // Act
      stateManager.dismissAgent(agentId);
      
      // Assert
      expect(stateManager.getAgent(agentId)).toBeUndefined();
    });

    it('should handle dismissal when agent has no subagents', () => {
      // Arrange
      const agentId = stateManager.createAgent('no-subagents-agent');
      stateManager.completeAgent(agentId, 'completed');
      
      expect(stateManager.getAgent(agentId)?.subagentIds).toHaveLength(0);
      
      // Act
      stateManager.dismissAgent(agentId);
      
      // Assert
      expect(stateManager.getAgent(agentId)).toBeUndefined();
    });

    it('should handle dismissal of non-existent agent gracefully', () => {
      // Arrange
      const agentId = stateManager.createAgent('real-agent');
      stateManager.completeAgent(agentId, 'completed');
      
      // Act - try to dismiss non-existent agent
      expect(() => {
        stateManager.dismissAgent('non-existent-id');
      }).not.toThrow();
      
      // Assert - real agent should still exist
      expect(stateManager.getAgent(agentId)).toBeDefined();
    });

    it('should handle double dismissal gracefully', () => {
      // Arrange
      const agentId = stateManager.createAgent('test-agent');
      stateManager.completeAgent(agentId, 'completed');
      
      // Act - dismiss twice
      stateManager.dismissAgent(agentId);
      
      expect(() => {
        stateManager.dismissAgent(agentId);
      }).not.toThrow();
      
      // Assert
      expect(stateManager.getAgent(agentId)).toBeUndefined();
    });

    it('should handle dismissal when parent has multiple levels of subagents', () => {
      // Arrange - create complex hierarchy
      const rootId = stateManager.createAgent('root');
      const child1Id = stateManager.createAgent('child-1', rootId);
      const child2Id = stateManager.createAgent('child-2', rootId);
      const grandchild1Id = stateManager.createAgent('grandchild-1', child1Id);
      const grandchild2Id = stateManager.createAgent('grandchild-2', child1Id);
      const greatGrandchildId = stateManager.createAgent('great-grandchild', grandchild1Id);
      
      // Complete all agents
      [rootId, child1Id, child2Id, grandchild1Id, grandchild2Id, greatGrandchildId].forEach(id => {
        stateManager.completeAgent(id, 'completed');
      });
      
      expect(stateManager.getAllAgents()).toHaveLength(6);
      
      // Act - dismiss root
      stateManager.dismissAgent(rootId);
      
      // Assert - entire hierarchy should be dismissed
      expect(stateManager.getAgent(rootId)).toBeUndefined();
      expect(stateManager.getAgent(child1Id)).toBeUndefined();
      expect(stateManager.getAgent(child2Id)).toBeUndefined();
      expect(stateManager.getAgent(grandchild1Id)).toBeUndefined();
      expect(stateManager.getAgent(grandchild2Id)).toBeUndefined();
      expect(stateManager.getAgent(greatGrandchildId)).toBeUndefined();
      expect(stateManager.getAllAgents()).toHaveLength(0);
    });

    it('should preserve other tabs order after dismissal', () => {
      // Arrange
      const agent1 = createMockAgent('agent-1', 'first', 'completed');
      const agent2 = createMockAgent('agent-2', 'second', 'completed');
      const agent3 = createMockAgent('agent-3', 'third', 'completed');
      const agent4 = createMockAgent('agent-4', 'fourth', 'completed');
      
      const tabBar = new TabBar({
        agents: [agent1, agent2, agent3, agent4],
        selectedId: 'agent-2',
        onTabSelect: onTabSelectCallback,
        onTabDismiss: onTabDismissCallback,
        theme: mockTheme,
      });
      
      // Act - dismiss second agent
      tabBar.updateAgents([agent1, agent3, agent4]);
      
      // Assert - order should be preserved
      const render = tabBar.render(200).join('');
      const firstPos = render.indexOf('first');
      const thirdPos = render.indexOf('third');
      const fourthPos = render.indexOf('fourth');
      
      expect(firstPos).toBeLessThan(thirdPos);
      expect(thirdPos).toBeLessThan(fourthPos);
    });
  });

  describe('Integration with DashboardController', () => {
    it('should update dashboard when agent is dismissed', () => {
      // Arrange
      const controller = new DashboardController({
        stateManager,
        ctx: mockPiContext,
      });
      
      const agentId = stateManager.createAgent('test-agent');
      stateManager.completeAgent(agentId, 'completed');
      
      // Act
      stateManager.dismissAgent(agentId);
      
      // Assert - footer status should reflect removal
      const footerStatus = controller.getFooterStatus();
      expect(footerStatus).toContain('No agents');
    });

    it('should update agent count in footer after multiple dismissals', () => {
      // Arrange
      const controller = new DashboardController({
        stateManager,
        ctx: mockPiContext,
      });
      
      const agent1Id = stateManager.createAgent('agent-1');
      const agent2Id = stateManager.createAgent('agent-2');
      const agent3Id = stateManager.createAgent('agent-3');
      
      stateManager.completeAgent(agent1Id, 'completed');
      stateManager.completeAgent(agent2Id, 'completed');
      stateManager.completeAgent(agent3Id, 'completed');
      
      expect(controller.getFooterStatus()).toContain('3 agents');
      
      // Act - dismiss two agents
      stateManager.dismissAgent(agent1Id);
      stateManager.dismissAgent(agent2Id);
      
      // Assert
      expect(controller.getFooterStatus()).toContain('1 agent');
    });
  });
});
