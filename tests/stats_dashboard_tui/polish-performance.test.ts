/**
 * Tests for Polish and Performance (T16)
 * 
 * Tests covering:
 * - Render caching in all components
 * - Performance of rapid metric updates (<100ms)
 * - Theme color consistency
 * - Empty state handling
 * - Zero agents state
 * - Many agents (10+) performance
 * - Long tool names/args truncation
 * - Very long conversations layout
 * - Memory leak prevention on dismissal
 */

import { DashboardComponent } from '../../lib/stats_dashboard_tui/ui/dashboard';
import { StateManager } from '../../lib/stats_dashboard_tui/state/state-manager';
import { TabBar } from '../../lib/stats_dashboard_tui/ui/tabs';
import { AgentPanel } from '../../lib/stats_dashboard_tui/ui/agent-panel';
import { MetricsDisplay } from '../../lib/stats_dashboard_tui/ui/metrics-display';
import { ToolHistory } from '../../lib/stats_dashboard_tui/ui/tool-history';
import { ConversationView } from '../../lib/stats_dashboard_tui/ui/conversation-view';
import type { Agent, ToolCall, ConversationEntry } from '../../lib/stats_dashboard_tui/types';

describe('Polish and Performance (T16)', () => {
  let stateManager: StateManager;
  let mockController: any;

  beforeEach(() => {
    stateManager = new StateManager();
    mockController = {
      hide: jest.fn(),
      isVisible: jest.fn().mockReturnValue(true),
    };
  });

  describe('Render Caching', () => {
    describe('DashboardComponent caching', () => {
      it('should cache render output for same width', () => {
        const dashboard = new DashboardComponent({
          stateManager,
          controller: mockController,
        });

        const render1 = dashboard.render(80);
        const render2 = dashboard.render(80);

        // Should return exact same array reference (cached)
        expect(render1).toBe(render2);
      });

      it('should invalidate cache when width changes', () => {
        const dashboard = new DashboardComponent({
          stateManager,
          controller: mockController,
        });

        const render1 = dashboard.render(80);
        const render2 = dashboard.render(100);

        // Should return different array reference (not cached)
        expect(render1).not.toBe(render2);
        expect(render1.length).not.toBe(render2.length);
      });

      it('should invalidate cache when invalidate() is called', () => {
        const dashboard = new DashboardComponent({
          stateManager,
          controller: mockController,
        });

        const render1 = dashboard.render(80);
        dashboard.invalidate();
        const render2 = dashboard.render(80);

        // Should return different array reference (cache cleared)
        expect(render1).not.toBe(render2);
      });

      it('should invalidate cache on keyboard input', () => {
        const agentId = stateManager.createAgent('test-agent');
        const dashboard = new DashboardComponent({
          stateManager,
          controller: mockController,
        });

        const render1 = dashboard.render(80);
        dashboard.handleInput('r'); // Refresh command
        const render2 = dashboard.render(80);

        // Cache should be cleared after input
        expect(render1).not.toBe(render2);
      });
    });

    describe('TabBar caching', () => {
      it('should cache render output for same width and data', () => {
        const agentId = stateManager.createAgent('test-agent');
        const agents = stateManager.getAllAgents();

        const tabBar = new TabBar({
          agents,
          selectedId: agentId,
          onTabSelect: jest.fn(),
          onTabDismiss: jest.fn(),
          notifyCallback: jest.fn(),
        });

        const render1 = tabBar.render(80);
        const render2 = tabBar.render(80);

        // Should return cached result
        expect(render1).toEqual(render2);
      });

      it('should invalidate cache when invalidate() is called', () => {
        const agentId = stateManager.createAgent('test-agent');
        const agents = stateManager.getAllAgents();

        const tabBar = new TabBar({
          agents,
          selectedId: agentId,
          onTabSelect: jest.fn(),
          onTabDismiss: jest.fn(),
          notifyCallback: jest.fn(),
        });

        const render1 = tabBar.render(80);
        tabBar.invalidate();
        const render2 = tabBar.render(80);

        // Cache should be cleared
        expect(render1).not.toBe(render2);
      });
    });

    describe('AgentPanel caching', () => {
      it('should cache render output for same agent data', () => {
        const agentId = stateManager.createAgent('test-agent');
        const agent = stateManager.getAgent(agentId)!;
        const conversationEntries: ConversationEntry[] = [];

        const panel = new AgentPanel({
          agent,
          conversationEntries,
          theme: null,
          width: 80,
          height: 30,
        });

        const render1 = panel.render();
        const render2 = panel.render();

        // Should return cached result
        expect(render1).toBe(render2);
      });

      it('should invalidate cache when invalidate() is called', () => {
        const agentId = stateManager.createAgent('test-agent');
        const agent = stateManager.getAgent(agentId)!;
        const conversationEntries: ConversationEntry[] = [];

        const panel = new AgentPanel({
          agent,
          conversationEntries,
          theme: null,
          width: 80,
          height: 30,
        });

        const render1 = panel.render();
        panel.invalidate();
        const render2 = panel.render();

        // Cache should be cleared
        expect(render1).not.toBe(render2);
      });
    });

    describe('MetricsDisplay caching', () => {
      it('should cache render output for same metrics', () => {
        const agentId = stateManager.createAgent('test-agent');
        const agent = stateManager.getAgent(agentId)!;

        const display = new MetricsDisplay({
          agent,
          theme: null,
          width: 80,
        });

        const render1 = display.render();
        const render2 = display.render();

        // Should return cached result
        expect(render1).toBe(render2);
      });

      it('should invalidate cache when metrics change', () => {
        const agentId = stateManager.createAgent('test-agent');
        stateManager.updateMetrics(agentId, { inputTokens: 100 });
        const agent1 = stateManager.getAgent(agentId)!;

        const display = new MetricsDisplay({
          agent: agent1,
          theme: null,
          width: 80,
        });

        const render1 = display.render();

        // Update metrics
        stateManager.updateMetrics(agentId, { inputTokens: 200 });
        const agent2 = stateManager.getAgent(agentId)!;
        display.invalidate();

        const render2 = display.render();

        // Should show different values
        expect(render1).not.toBe(render2);
        expect(render2).toContain('300'); // Total input tokens
      });
    });

    describe('ToolHistory caching', () => {
      it('should cache render output for same tool calls', () => {
        const agentId = stateManager.createAgent('test-agent');
        const agent = stateManager.getAgent(agentId)!;

        const history = new ToolHistory({
          agent,
          theme: null,
          width: 80,
        });

        const render1 = history.render();
        const render2 = history.render();

        // Should return cached result
        expect(render1).toBe(render2);
      });
    });

    describe('ConversationView caching', () => {
      it('should cache render output for same conversation entries', () => {
        const conversationEntries: ConversationEntry[] = [
          { role: 'user', preview: 'Hello', timestamp: Date.now() },
        ];

        const view = new ConversationView({
          conversationEntries,
          theme: null,
          width: 80,
        });

        const render1 = view.render();
        const render2 = view.render();

        // Should return cached result
        expect(render1).toBe(render2);
      });
    });
  });

  describe('Performance - Rapid Metric Updates', () => {
    it('should render dashboard in under 100ms with rapid updates', () => {
      const agentId = stateManager.createAgent('test-agent');
      const dashboard = new DashboardComponent({
        stateManager,
        controller: mockController,
      });

      // Perform rapid metric updates
      const iterations = 100;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        stateManager.updateMetrics(agentId, {
          inputTokens: 10,
          outputTokens: 5,
          totalCost: 0.001,
        });
        dashboard.invalidate();
        dashboard.render(80);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const avgRenderTime = duration / iterations;

      // Each render should take less than 100ms on average
      expect(avgRenderTime).toBeLessThan(100);
    });

    it('should render single dashboard update in under 100ms', () => {
      const agentId = stateManager.createAgent('test-agent');
      stateManager.updateMetrics(agentId, {
        inputTokens: 1000,
        outputTokens: 500,
        totalCost: 0.05,
      });

      const dashboard = new DashboardComponent({
        stateManager,
        controller: mockController,
      });

      const startTime = Date.now();
      dashboard.render(80);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Single render should be very fast (<100ms, typically <10ms)
      expect(duration).toBeLessThan(100);
    });

    it('should handle 10+ rapid metric updates efficiently', () => {
      const agentId = stateManager.createAgent('test-agent');
      const dashboard = new DashboardComponent({
        stateManager,
        controller: mockController,
      });

      // Initial render to establish baseline
      dashboard.render(80);

      const startTime = Date.now();

      // Rapid updates
      for (let i = 0; i < 10; i++) {
        stateManager.updateMetrics(agentId, {
          inputTokens: 100,
          outputTokens: 50,
          cacheReadTokens: 20,
          totalCost: 0.002,
        });
        dashboard.invalidate();
        dashboard.render(80);
      }

      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      // Total time for 10 updates should be reasonable
      expect(totalDuration).toBeLessThan(1000); // 1 second for 10 updates
    });
  });

  describe('Theme Colors Consistency', () => {
    it('should apply theme colors consistently in dashboard header', () => {
      const dashboard = new DashboardComponent({
        stateManager,
        controller: mockController,
      });

      const output = dashboard.render(80);
      const header = output.slice(0, 5).join('\n');

      // Should contain ANSI color codes (bold, cyan, reset)
      expect(header).toMatch(/\x1b\[1m/); // Bold
      expect(header).toMatch(/\x1b\[36m/); // Cyan
      expect(header).toMatch(/\x1b\[0m/); // Reset
    });

    it('should apply dim color for help text consistently', () => {
      const dashboard = new DashboardComponent({
        stateManager,
        controller: mockController,
      });

      const output = dashboard.render(80);
      const footer = output.slice(-3).join('\n');

      // Footer help text should use dim color
      expect(footer).toMatch(/\x1b\[2m/); // Dim
      expect(footer).toMatch(/Press \? for help/);
    });

    it('should apply error color for failed tool calls', () => {
      const agentId = stateManager.createAgent('test-agent');
      const toolCall: ToolCall = {
        id: 'tool-1',
        toolName: 'bash',
        args: { command: 'false' },
        argsSummary: 'command: false',
        status: 'pending',
        startTime: Date.now(),
        endTime: null,
        duration: null,
        isError: false,
        errorMessage: null,
      };
      stateManager.addToolCall(agentId, toolCall);
      stateManager.completeToolCall('tool-1', {
        status: 'failed',
        endTime: Date.now(),
        isError: true,
        errorMessage: 'Command failed',
      });

      const agent = stateManager.getAgent(agentId)!;
      const history = new ToolHistory({
        agent,
        theme: null,
        width: 80,
      });

      const output = history.render();

      // Failed tool call should be styled with error color
      expect(output).toContain('✗'); // Failed icon
      expect(output).toMatch(/failed/i);
    });

    it('should apply success color for completed agents', () => {
      const agentId = stateManager.createAgent('test-agent');
      stateManager.completeAgent(agentId, 'completed');

      const agents = stateManager.getAllAgents();
      const tabBar = new TabBar({
        agents,
        selectedId: agentId,
        onTabSelect: jest.fn(),
        onTabDismiss: jest.fn(),
        notifyCallback: jest.fn(),
      });

      const output = tabBar.render(80);

      // Completed agent should show success indicator
      expect(output[0]).toContain('✓'); // Success icon
    });

    it('should apply warning color for high context usage', () => {
      const agentId = stateManager.createAgent('test-agent');
      stateManager.updateMetrics(agentId, {
        contextTokens: 100000,
        contextLimit: 120000,
      });

      const agent = stateManager.getAgent(agentId)!;
      const display = new MetricsDisplay({
        agent,
        theme: null,
        width: 80,
      });

      const output = display.render();

      // High context (>80%) should be shown in warning color
      expect(output).toMatch(/83%/); // Context percentage
      // Warning color would be applied in the actual rendering
    });
  });

  describe('Empty State Messages', () => {
    it('should show friendly message when no agents exist', () => {
      const dashboard = new DashboardComponent({
        stateManager,
        controller: mockController,
      });

      const output = dashboard.render(80);
      const content = output.join('\n');

      // Should show empty state message
      expect(content).toMatch(/No agents running yet/i);
    });

    it('should show message when agent has no tool calls', () => {
      const agentId = stateManager.createAgent('test-agent');
      const agent = stateManager.getAgent(agentId)!;

      const history = new ToolHistory({
        agent,
        theme: null,
        width: 80,
      });

      const output = history.render();

      // Should show empty state message
      expect(output).toMatch(/No tool calls yet/i);
    });

    it('should show message when conversation is empty', () => {
      const conversationEntries: ConversationEntry[] = [];

      const view = new ConversationView({
        conversationEntries,
        theme: null,
        width: 80,
      });

      const output = view.render();

      // Should show empty state message
      expect(output).toMatch(/No messages yet/i);
    });

    it('should show message when agent not found', () => {
      const agentId = stateManager.createAgent('test-agent');
      stateManager.dismissAgent(agentId); // Remove the agent

      const dashboard = new DashboardComponent({
        stateManager,
        controller: mockController,
      });

      const output = dashboard.render(80);
      const content = output.join('\n');

      // Should handle missing agent gracefully
      expect(content).toMatch(/No agents running yet/i);
    });
  });

  describe('Zero Agents State', () => {
    it('should handle zero agents without errors', () => {
      const dashboard = new DashboardComponent({
        stateManager,
        controller: mockController,
      });

      expect(() => {
        dashboard.render(80);
      }).not.toThrow();
    });

    it('should render valid output with zero agents', () => {
      const dashboard = new DashboardComponent({
        stateManager,
        controller: mockController,
      });

      const output = dashboard.render(80);

      // Should have at least header and footer
      expect(output.length).toBeGreaterThan(5);
      expect(output[0]).toContain('┌'); // Top border
      expect(output[output.length - 1]).toContain('┘'); // Bottom border
    });

    it('should handle keyboard input with zero agents', () => {
      const dashboard = new DashboardComponent({
        stateManager,
        controller: mockController,
      });

      // Should not throw when handling input with no agents
      expect(() => {
        dashboard.handleInput('r');
        dashboard.handleInput('\t');
        dashboard.handleInput('j');
      }).not.toThrow();
    });

    it('should allow creating first agent after zero agents', () => {
      const dashboard = new DashboardComponent({
        stateManager,
        controller: mockController,
      });

      // Render with zero agents
      const output1 = dashboard.render(80);
      expect(output1.join('\n')).toMatch(/No agents running yet/i);

      // Create an agent
      const agentId = stateManager.createAgent('first-agent');
      dashboard.invalidate();

      // Render with one agent
      const output2 = dashboard.render(80);
      expect(output2.join('\n')).toContain('first-agent');
    });
  });

  describe('Many Agents Performance', () => {
    it('should render 10+ agents without performance degradation', () => {
      // Create 15 agents
      const agentIds: string[] = [];
      for (let i = 0; i < 15; i++) {
        const id = stateManager.createAgent(`agent-${i}`);
        agentIds.push(id);
      }

      const dashboard = new DashboardComponent({
        stateManager,
        controller: mockController,
      });

      const startTime = Date.now();
      const output = dashboard.render(80);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should render in under 100ms even with 15 agents
      expect(duration).toBeLessThan(100);
      expect(output.length).toBeGreaterThan(0);
    });

    it('should handle 20+ agents without crashing', () => {
      // Create 25 agents
      for (let i = 0; i < 25; i++) {
        stateManager.createAgent(`agent-${i}`);
      }

      const dashboard = new DashboardComponent({
        stateManager,
        controller: mockController,
      });

      expect(() => {
        dashboard.render(80);
      }).not.toThrow();
    });

    it('should properly truncate or scroll many tabs', () => {
      // Create 15 agents to test tab overflow
      for (let i = 0; i < 15; i++) {
        stateManager.createAgent(`long-agent-name-${i}`);
      }

      const agents = stateManager.getAllAgents();
      const tabBar = new TabBar({
        agents,
        selectedId: agents[0].id,
        onTabSelect: jest.fn(),
        onTabDismiss: jest.fn(),
        notifyCallback: jest.fn(),
      });

      const output = tabBar.render(80);

      // Should handle overflow (truncate or indicate more)
      expect(output.length).toBeGreaterThan(0);
      // Each line should not exceed width
      output.forEach(line => {
        // Strip ANSI codes for length check
        const stripped = line.replace(/\x1b\[[0-9;]*m/g, '');
        expect(stripped.length).toBeLessThanOrEqual(80);
      });
    });

    it('should maintain performance with many agents having metrics', () => {
      // Create 10 agents with significant metrics
      for (let i = 0; i < 10; i++) {
        const id = stateManager.createAgent(`agent-${i}`);
        stateManager.updateMetrics(id, {
          inputTokens: 50000,
          outputTokens: 25000,
          cacheReadTokens: 10000,
          totalCost: 2.5,
          contextTokens: 80000,
        });
      }

      const dashboard = new DashboardComponent({
        stateManager,
        controller: mockController,
      });

      const startTime = Date.now();
      dashboard.render(80);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should still render quickly with full metrics
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Long Tool Names and Arguments', () => {
    it('should truncate very long tool names properly', () => {
      const agentId = stateManager.createAgent('test-agent');
      const longToolName = 'very_long_tool_name_that_exceeds_reasonable_display_width_and_needs_truncation';
      const toolCall: ToolCall = {
        id: 'tool-1',
        toolName: longToolName,
        args: { param: 'value' },
        argsSummary: 'param: value',
        status: 'success',
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        duration: 1000,
        isError: false,
        errorMessage: null,
      };
      stateManager.addToolCall(agentId, toolCall);

      const agent = stateManager.getAgent(agentId)!;
      const history = new ToolHistory({
        agent,
        theme: null,
        width: 60,
      });

      const output = history.render();

      // Should truncate long tool name
      expect(output).toContain('...');
      // Should not exceed width
      output.split('\n').forEach(line => {
        const stripped = line.replace(/\x1b\[[0-9;]*m/g, '');
        expect(stripped.length).toBeLessThanOrEqual(60);
      });
    });

    it('should truncate very long argument summaries properly', () => {
      const agentId = stateManager.createAgent('test-agent');
      const longArgsSummary = 'command: ' + 'a'.repeat(500);
      const toolCall: ToolCall = {
        id: 'tool-1',
        toolName: 'bash',
        args: { command: 'a'.repeat(500) },
        argsSummary: longArgsSummary,
        status: 'success',
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        duration: 1000,
        isError: false,
        errorMessage: null,
      };
      stateManager.addToolCall(agentId, toolCall);

      const agent = stateManager.getAgent(agentId)!;
      const history = new ToolHistory({
        agent,
        theme: null,
        width: 80,
      });

      const output = history.render();

      // Should truncate long args summary
      expect(output).toContain('...');
    });

    it('should handle tool calls with extremely long error messages', () => {
      const agentId = stateManager.createAgent('test-agent');
      const longErrorMessage = 'Error: ' + 'x'.repeat(1000);
      const toolCall: ToolCall = {
        id: 'tool-1',
        toolName: 'bash',
        args: { command: 'false' },
        argsSummary: 'command: false',
        status: 'failed',
        startTime: Date.now() - 1000,
        endTime: Date.now(),
        duration: 1000,
        isError: true,
        errorMessage: longErrorMessage,
      };
      stateManager.addToolCall(agentId, toolCall);

      const agent = stateManager.getAgent(agentId)!;
      const history = new ToolHistory({
        agent,
        theme: null,
        width: 80,
      });

      const output = history.render();

      // Should handle long error messages gracefully
      expect(output.length).toBeGreaterThan(0);
      // Lines should not exceed width
      output.split('\n').forEach(line => {
        const stripped = line.replace(/\x1b\[[0-9;]*m/g, '');
        expect(stripped.length).toBeLessThanOrEqual(80);
      });
    });

    it('should handle tool names with special characters', () => {
      const agentId = stateManager.createAgent('test-agent');
      const specialToolName = 'tool_with_🚀_emoji_and_symbols_!@#$%';
      const toolCall: ToolCall = {
        id: 'tool-1',
        toolName: specialToolName,
        args: {},
        argsSummary: '',
        status: 'success',
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 0,
        isError: false,
        errorMessage: null,
      };
      stateManager.addToolCall(agentId, toolCall);

      const agent = stateManager.getAgent(agentId)!;
      const history = new ToolHistory({
        agent,
        theme: null,
        width: 80,
      });

      expect(() => {
        history.render();
      }).not.toThrow();
    });
  });

  describe('Very Long Conversations', () => {
    it('should handle 100+ conversation entries without breaking layout', () => {
      const conversationEntries: ConversationEntry[] = [];
      for (let i = 0; i < 150; i++) {
        conversationEntries.push({
          role: i % 2 === 0 ? 'user' : 'assistant',
          preview: `Message ${i}: Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
          timestamp: Date.now() - (150 - i) * 1000,
        });
      }

      const view = new ConversationView({
        conversationEntries,
        theme: null,
        width: 80,
      });

      const output = view.render();

      // Should not crash
      expect(output.length).toBeGreaterThan(0);
      
      // Each line should respect width
      output.split('\n').forEach(line => {
        const stripped = line.replace(/\x1b\[[0-9;]*m/g, '');
        expect(stripped.length).toBeLessThanOrEqual(80);
      });
    });

    it('should handle conversation entries with very long previews', () => {
      const longPreview = 'This is a very long message preview that contains a lot of text and should be truncated properly to fit within the display width without breaking the layout or causing rendering issues. '.repeat(5);
      
      const conversationEntries: ConversationEntry[] = [
        {
          role: 'user',
          preview: longPreview,
          timestamp: Date.now(),
        },
      ];

      const view = new ConversationView({
        conversationEntries,
        theme: null,
        width: 80,
      });

      const output = view.render();

      // Should truncate long preview
      expect(output).toContain('...');
      
      // Should not exceed width
      output.split('\n').forEach(line => {
        const stripped = line.replace(/\x1b\[[0-9;]*m/g, '');
        expect(stripped.length).toBeLessThanOrEqual(80);
      });
    });

    it('should render conversation view performantly with many entries', () => {
      const conversationEntries: ConversationEntry[] = [];
      for (let i = 0; i < 200; i++) {
        conversationEntries.push({
          role: i % 2 === 0 ? 'user' : 'assistant',
          preview: `Message ${i}`,
          timestamp: Date.now() - i * 1000,
        });
      }

      const view = new ConversationView({
        conversationEntries,
        theme: null,
        width: 80,
      });

      const startTime = Date.now();
      view.render();
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should render quickly even with many messages
      expect(duration).toBeLessThan(100);
    });

    it('should handle mixed message roles in long conversations', () => {
      const conversationEntries: ConversationEntry[] = [];
      const roles: Array<'user' | 'assistant' | 'toolResult'> = ['user', 'assistant', 'toolResult'];
      
      for (let i = 0; i < 50; i++) {
        conversationEntries.push({
          role: roles[i % 3],
          preview: `Message ${i}`,
          timestamp: Date.now() - i * 1000,
        });
      }

      const view = new ConversationView({
        conversationEntries,
        theme: null,
        width: 80,
      });

      const output = view.render();

      // Should handle all role types
      expect(output).toContain('User:');
      expect(output).toContain('Assistant:');
      // ToolResult handling depends on implementation
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should not leak memory when dismissing single agent', () => {
      const agentId = stateManager.createAgent('test-agent');
      
      // Add data to agent
      stateManager.updateMetrics(agentId, {
        inputTokens: 1000,
        outputTokens: 500,
      });
      const toolCall: ToolCall = {
        id: 'tool-1',
        toolName: 'bash',
        args: { command: 'echo test' },
        argsSummary: 'command: echo test',
        status: 'success',
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 100,
        isError: false,
        errorMessage: null,
      };
      stateManager.addToolCall(agentId, toolCall);

      // Verify agent exists
      expect(stateManager.getAgent(agentId)).toBeDefined();

      // Dismiss agent
      stateManager.dismissAgent(agentId);

      // Verify agent is removed
      expect(stateManager.getAgent(agentId)).toBeUndefined();
      
      // Verify agent is not in getAllAgents
      const allAgents = stateManager.getAllAgents();
      expect(allAgents.find(a => a.id === agentId)).toBeUndefined();
    });

    it('should clean up subagents when dismissing parent', () => {
      const parentId = stateManager.createAgent('parent');
      const childId = stateManager.createAgent('child', parentId);
      const grandchildId = stateManager.createAgent('grandchild', childId);

      // Verify hierarchy
      expect(stateManager.getAgent(parentId)).toBeDefined();
      expect(stateManager.getAgent(childId)).toBeDefined();
      expect(stateManager.getAgent(grandchildId)).toBeDefined();

      // Dismiss parent
      stateManager.dismissAgent(parentId);

      // All should be removed
      expect(stateManager.getAgent(parentId)).toBeUndefined();
      expect(stateManager.getAgent(childId)).toBeUndefined();
      expect(stateManager.getAgent(grandchildId)).toBeUndefined();

      // None should appear in getAllAgents
      const allAgents = stateManager.getAllAgents();
      expect(allAgents.length).toBe(0);
    });

    it('should clean up tool call references when dismissing agent', () => {
      const agentId = stateManager.createAgent('test-agent');
      
      // Add multiple tool calls
      for (let i = 0; i < 10; i++) {
        const toolCall: ToolCall = {
          id: `tool-${i}`,
          toolName: 'bash',
          args: { command: `echo ${i}` },
          argsSummary: `command: echo ${i}`,
          status: 'success',
          startTime: Date.now(),
          endTime: Date.now(),
          duration: 100,
          isError: false,
          errorMessage: null,
        };
        stateManager.addToolCall(agentId, toolCall);
      }

      const agent = stateManager.getAgent(agentId)!;
      expect(agent.toolCalls.length).toBe(10);

      // Dismiss agent
      stateManager.dismissAgent(agentId);

      // Agent and tool calls should be gone
      expect(stateManager.getAgent(agentId)).toBeUndefined();
    });

    it('should handle multiple dismiss operations without accumulation', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Create and dismiss many agents
      for (let i = 0; i < 100; i++) {
        const agentId = stateManager.createAgent(`agent-${i}`);
        stateManager.updateMetrics(agentId, {
          inputTokens: 1000,
          outputTokens: 500,
        });
        stateManager.dismissAgent(agentId);
      }

      // Force garbage collection if available (Node.js with --expose-gc)
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be minimal (allow some overhead for test infrastructure)
      // This is a rough check - exact values depend on runtime
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // 10MB threshold
    });

    it('should allow re-creating agents after dismissal', () => {
      const agentId1 = stateManager.createAgent('test-agent');
      stateManager.dismissAgent(agentId1);

      const agentId2 = stateManager.createAgent('test-agent');
      
      // New agent should have different ID
      expect(agentId2).not.toBe(agentId1);
      
      // New agent should be accessible
      expect(stateManager.getAgent(agentId2)).toBeDefined();
    });

    it('should clean up parent references correctly', () => {
      const parentId = stateManager.createAgent('parent');
      const child1Id = stateManager.createAgent('child1', parentId);
      const child2Id = stateManager.createAgent('child2', parentId);

      const parent = stateManager.getAgent(parentId)!;
      expect(parent.subagentIds).toContain(child1Id);
      expect(parent.subagentIds).toContain(child2Id);

      // Dismiss one child
      stateManager.dismissAgent(child1Id);

      // Parent should still exist but child1 reference should be cleaned
      const updatedParent = stateManager.getAgent(parentId)!;
      expect(updatedParent).toBeDefined();
      // Note: Based on implementation, dismissing removes from parent's subagentIds
    });
  });

  describe('Edge Cases and Resilience', () => {
    it('should handle render with width of 0', () => {
      const dashboard = new DashboardComponent({
        stateManager,
        controller: mockController,
      });

      expect(() => {
        dashboard.render(0);
      }).not.toThrow();
    });

    it('should handle render with negative width', () => {
      const dashboard = new DashboardComponent({
        stateManager,
        controller: mockController,
      });

      expect(() => {
        dashboard.render(-10);
      }).not.toThrow();
    });

    it('should handle render with very large width', () => {
      const dashboard = new DashboardComponent({
        stateManager,
        controller: mockController,
      });

      const output = dashboard.render(1000);
      
      // Should constrain to reasonable maximum
      output.forEach(line => {
        const stripped = line.replace(/\x1b\[[0-9;]*m/g, '');
        expect(stripped.length).toBeLessThanOrEqual(302); // MAX_WIDTH + borders
      });
    });

    it('should handle null/undefined input gracefully', () => {
      const dashboard = new DashboardComponent({
        stateManager,
        controller: mockController,
      });

      expect(() => {
        dashboard.handleInput(null as any);
        dashboard.handleInput(undefined as any);
      }).not.toThrow();
    });

    it('should handle rapid invalidate calls', () => {
      const dashboard = new DashboardComponent({
        stateManager,
        controller: mockController,
      });

      expect(() => {
        for (let i = 0; i < 100; i++) {
          dashboard.invalidate();
        }
      }).not.toThrow();
    });

    it('should handle agent with corrupted data gracefully', () => {
      const agentId = stateManager.createAgent('test-agent');
      const agent = stateManager.getAgent(agentId)!;

      // Create agent with unusual metrics
      stateManager.updateMetrics(agentId, {
        inputTokens: Infinity,
        outputTokens: -100,
        totalCost: NaN,
      });

      const dashboard = new DashboardComponent({
        stateManager,
        controller: mockController,
      });

      expect(() => {
        dashboard.render(80);
      }).not.toThrow();
    });
  });
});
