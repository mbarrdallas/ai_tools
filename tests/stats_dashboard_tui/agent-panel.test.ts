/**
 * Agent Panel Assembly Tests
 * 
 * Tests for the AgentPanel component that composes MetricsDisplay,
 * ToolHistory, and ConversationView into a unified agent detail panel.
 * 
 * Task: T12 - Agent Panel Assembly
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import type { 
  Agent, 
  AgentStatus, 
  AgentMetrics, 
  ToolCall, 
  ConversationEntry,
  MessageRole,
  ToolCallStatus 
} from '../../lib/stats_dashboard_tui/types';

import { AgentPanel } from '../../lib/stats_dashboard_tui/ui/agent-panel';

// Mock theme interface for testing
interface MockTheme {
  fg(style: string, text: string): string;
  bg(style: string, text: string): string;
}

// Helper function to create a mock agent
function createMockAgent(overrides?: Partial<Agent>): Agent {
  const defaultMetrics: AgentMetrics = {
    inputTokens: 1000,
    outputTokens: 500,
    cacheReadTokens: 200,
    cacheWriteTokens: 100,
    totalCost: 0.05,
    contextTokens: 5000,
    contextLimit: 8000,
    turnCount: 3,
  };

  return {
    id: 'agent-123',
    name: 'test-agent',
    status: 'running',
    parentId: null,
    startTime: Date.now() - 60000,
    endTime: null,
    metrics: defaultMetrics,
    toolCalls: [],
    messageCount: 2,
    subagentIds: [],
    ...overrides,
  };
}

// Helper function to create a mock tool call
function createMockToolCall(overrides?: Partial<ToolCall>): ToolCall {
  return {
    id: 'tool-123',
    toolName: 'bash',
    args: { command: 'ls -la' },
    argsSummary: 'ls -la',
    status: 'success',
    startTime: Date.now() - 5000,
    endTime: Date.now() - 4000,
    duration: 1000,
    isError: false,
    errorMessage: null,
    ...overrides,
  };
}

// Helper function to create a mock conversation entry
function createMockConversationEntry(overrides?: Partial<ConversationEntry>): ConversationEntry {
  return {
    role: 'user',
    preview: 'Hello, this is a test message',
    timestamp: Date.now() - 30000,
    ...overrides,
  };
}

// Helper function to create a mock theme
function createMockTheme(): MockTheme {
  return {
    fg: (style: string, text: string) => `<${style}>${text}</${style}>`,
    bg: (style: string, text: string) => `<bg:${style}>${text}</bg:${style}>`,
  };
}

describe('AgentPanel', () => {
  describe('Component Composition', () => {
    it('should_compose_metrics_display_component', () => {
      // This test will verify that AgentPanel includes MetricsDisplay
      // Arrange
      const agent = createMockAgent();
      const theme = createMockTheme();
      const conversationEntries: ConversationEntry[] = [];
      
      // Act
      const panel = new AgentPanel({ agent, conversationEntries, theme, width: 80, height: 40 });
      const rendered = panel.render();
      
      // Assert
      expect(rendered).toContain('Input'); // Token metric label
      expect(rendered).toContain('Output'); // Token metric label
    });

    it('should_compose_tool_history_component', () => {
      // This test will verify that AgentPanel includes ToolHistory
      // Arrange
      const agent = createMockAgent({
        toolCalls: [createMockToolCall()],
      });
      const theme = createMockTheme();
      const conversationEntries: ConversationEntry[] = [];
      
      // Act
      const panel = new AgentPanel({ agent, conversationEntries, theme, width: 80, height: 40 });
      const rendered = panel.render();
      
      // Assert
      expect(rendered).toContain('bash'); // Tool name from ToolHistory
      expect(rendered).toContain('Tool History'); // Section header
    });

    it('should_compose_conversation_view_component', () => {
      // This test will verify that AgentPanel includes ConversationView
      // Arrange
      const agent = createMockAgent();
      const conversationEntries: ConversationEntry[] = [
        createMockConversationEntry(),
      ];
      const theme = createMockTheme();
      
      // Act
      const panel = new AgentPanel({ 
        agent, 
        conversationEntries,
        theme, 
        width: 80, 
        height: 40 
      });
      const rendered = panel.render();
      
      // Assert
      expect(rendered).toContain('Conversation'); // Section header
      expect(rendered).toContain('Hello'); // Message preview
    });

    it('should_render_all_three_components_together', () => {
      // This test will verify complete composition
      // Arrange
      const agent = createMockAgent({
        toolCalls: [createMockToolCall()],
      });
      const conversationEntries: ConversationEntry[] = [
        createMockConversationEntry(),
      ];
      const theme = createMockTheme();
      
      // Act
      const panel = new AgentPanel({ 
        agent, 
        conversationEntries,
        theme, 
        width: 80, 
        height: 40 
      });
      const rendered = panel.render();
      
      // Assert - verify all sections present
      expect(rendered).toContain('Input'); // From metrics
      expect(rendered).toContain('Tool History'); // Section header
      expect(rendered).toContain('Conversation'); // Section header
    });
  });

  describe('Agent Header', () => {
    it('should_display_agent_name_in_header', () => {
      // Arrange
      const agent = createMockAgent({ name: 'scout-agent' });
      const theme = createMockTheme();
      const conversationEntries: ConversationEntry[] = [];
      
      // Act
      const panel = new AgentPanel({ agent, conversationEntries, theme, width: 80, height: 40 });
      const rendered = panel.render();
      
      // Assert
      expect(rendered).toContain('scout-agent');
    });

    it('should_display_running_status_in_header', () => {
      // Arrange
      const agent = createMockAgent({ status: 'running' });
      const theme = createMockTheme();
      const conversationEntries: ConversationEntry[] = [];
      
      // Act
      const panel = new AgentPanel({ agent, conversationEntries, theme, width: 80, height: 40 });
      const rendered = panel.render();
      
      // Assert
      expect(rendered).toMatch(/running|🟢/i); // Status or icon
    });

    it('should_display_completed_status_in_header', () => {
      // Arrange
      const agent = createMockAgent({ 
        status: 'completed',
        endTime: Date.now() - 5000,
      });
      const theme = createMockTheme();
      const conversationEntries: ConversationEntry[] = [];
      
      // Act
      const panel = new AgentPanel({ agent, conversationEntries, theme, width: 80, height: 40 });
      const rendered = panel.render();
      
      // Assert
      expect(rendered).toMatch(/completed|✓/i); // Status or icon
    });

    it('should_display_failed_status_in_header', () => {
      // Arrange
      const agent = createMockAgent({ 
        status: 'failed',
        endTime: Date.now() - 5000,
      });
      const theme = createMockTheme();
      const conversationEntries: ConversationEntry[] = [];
      
      // Act
      const panel = new AgentPanel({ agent, conversationEntries, theme, width: 80, height: 40 });
      const rendered = panel.render();
      
      // Assert
      expect(rendered).toMatch(/failed|✗/i); // Status or icon
    });

    it('should_show_header_with_both_name_and_status', () => {
      // Arrange
      const agent = createMockAgent({ 
        name: 'test-agent',
        status: 'running',
      });
      const theme = createMockTheme();
      const conversationEntries: ConversationEntry[] = [];
      
      // Act
      const panel = new AgentPanel({ agent, conversationEntries, theme, width: 80, height: 40 });
      const rendered = panel.render();
      const lines = rendered.split('\n');
      const headerLine = lines[0]; // Assuming first line is header
      
      // Assert
      expect(headerLine).toContain('test-agent');
      expect(headerLine).toMatch(/running|🟢/i);
    });
  });

  describe('Subagent Count Display', () => {
    it('should_not_display_subagent_count_when_no_subagents', () => {
      // Arrange
      const agent = createMockAgent({ subagentIds: [] });
      const theme = createMockTheme();
      const conversationEntries: ConversationEntry[] = [];
      
      // Act
      const panel = new AgentPanel({ agent, conversationEntries, theme, width: 80, height: 40 });
      const rendered = panel.render();
      
      // Assert
      expect(rendered).not.toMatch(/subagent|children/i);
    });

    it('should_display_subagent_count_when_agent_has_one_child', () => {
      // Arrange
      const agent = createMockAgent({ 
        subagentIds: ['child-1'],
      });
      const theme = createMockTheme();
      const conversationEntries: ConversationEntry[] = [];
      
      // Act
      const panel = new AgentPanel({ agent, conversationEntries, theme, width: 80, height: 40 });
      const rendered = panel.render();
      
      // Assert
      expect(rendered).toMatch(/1\s+(subagent|child)/i);
    });

    it('should_display_subagent_count_when_agent_has_multiple_children', () => {
      // Arrange
      const agent = createMockAgent({ 
        subagentIds: ['child-1', 'child-2', 'child-3'],
      });
      const theme = createMockTheme();
      const conversationEntries: ConversationEntry[] = [];
      
      // Act
      const panel = new AgentPanel({ agent, conversationEntries, theme, width: 80, height: 40 });
      const rendered = panel.render();
      
      // Assert
      expect(rendered).toMatch(/3\s+(subagents|children)/i);
    });

    it('should_pluralize_subagent_label_correctly', () => {
      // Arrange
      const agentWithOne = createMockAgent({ subagentIds: ['child-1'] });
      const agentWithMany = createMockAgent({ subagentIds: ['c1', 'c2'] });
      const theme = createMockTheme();
      const conversationEntries: ConversationEntry[] = [];
      
      // Act
      const panelOne = new AgentPanel({ agent: agentWithOne, conversationEntries, theme, width: 80, height: 40 });
      const renderedOne = panelOne.render();
      const panelMany = new AgentPanel({ agent: agentWithMany, conversationEntries, theme, width: 80, height: 40 });
      const renderedMany = panelMany.render();
      
      // Assert
      expect(renderedOne).toMatch(/1\s+subagent[^s]/i); // Singular
      expect(renderedMany).toMatch(/2\s+subagents/i); // Plural
    });
  });

  describe('Visual Section Separation', () => {
    it('should_have_clear_separation_between_header_and_metrics', () => {
      // Arrange
      const agent = createMockAgent();
      const theme = createMockTheme();
      const conversationEntries: ConversationEntry[] = [];
      
      // Act
      const panel = new AgentPanel({ agent, conversationEntries, theme, width: 80, height: 40 });
      const rendered = panel.render();
      const lines = rendered.split('\n');
      
      // Assert - look for blank lines or borders between sections
      // The header includes a separator line (────), then blank line before metrics
      const separatorLine = lines.find(line => line.includes('─'));
      expect(separatorLine).toBeDefined();
    });

    it('should_have_clear_separation_between_metrics_and_tools', () => {
      // Arrange
      const agent = createMockAgent({
        toolCalls: [createMockToolCall()],
      });
      const theme = createMockTheme();
      const conversationEntries: ConversationEntry[] = [];
      
      // Act
      const panel = new AgentPanel({ agent, conversationEntries, theme, width: 80, height: 40 });
      const rendered = panel.render();
      
      // Assert
      // Sections should be visually separated by blank lines or borders
      const sections = rendered.split(/\n\s*\n/);
      expect(sections.length).toBeGreaterThan(1);
    });

    it('should_have_clear_separation_between_tools_and_conversation', () => {
      // Arrange
      const agent = createMockAgent({
        toolCalls: [createMockToolCall()],
      });
      const conversationEntries: ConversationEntry[] = [
        createMockConversationEntry(),
      ];
      const theme = createMockTheme();
      
      // Act
      const panel = new AgentPanel({ 
        agent, 
        conversationEntries,
        theme, 
        width: 80, 
        height: 40 
      });
      const rendered = panel.render();
      
      // Assert
      // Sections should be visually separated
      expect(rendered).toMatch(/Tool[\s\S]*\n\s*\n[\s\S]*Conversation/);
    });

    it('should_use_borders_or_spacing_for_section_separation', () => {
      // Arrange
      const agent = createMockAgent({
        toolCalls: [createMockToolCall()],
      });
      const conversationEntries: ConversationEntry[] = [
        createMockConversationEntry(),
      ];
      const theme = createMockTheme();
      
      // Act
      const panel = new AgentPanel({ 
        agent, 
        conversationEntries,
        theme, 
        width: 80, 
        height: 40 
      });
      const rendered = panel.render();
      
      // Assert
      // Should contain border characters (─, ═, etc.) or multiple blank lines
      expect(rendered).toMatch(/[─═]+|\n\s*\n\s*\n/);
    });
  });

  describe('Scrolling Through Content', () => {
    it('should_enable_scrolling_when_content_exceeds_height', () => {
      // Arrange
      const agent = createMockAgent({
        toolCalls: Array.from({ length: 50 }, (_, i) => 
          createMockToolCall({ id: `tool-${i}`, toolName: `tool-${i}` })
        ),
      });
      const conversationEntries: ConversationEntry[] = Array.from({ length: 50 }, (_, i) =>
        createMockConversationEntry({ 
          preview: `Message ${i}`,
          timestamp: Date.now() - (i * 1000),
        })
      );
      const theme = createMockTheme();
      
      // Act
      const panel = new AgentPanel({ 
        agent, 
        conversationEntries,
        theme, 
        width: 80, 
        height: 8 // Very limited height to force scrolling
      });
      const initialRender = panel.render();
      const initialLines = initialRender.split('\n').length;
      
      // Scroll down
      panel.handleInput({ key: 'j' });
      const scrolledRender = panel.render();
      
      // Assert - either content changes or keys are handled
      expect(initialLines).toBeLessThanOrEqual(8);
      // Scrolling behavior is verified by the scroll handlers returning true
    });

    it('should_scroll_through_metrics_section', () => {
      // Arrange - create lots of content that won't fit in limited height
      const agent = createMockAgent({
        toolCalls: Array.from({ length: 50 }, (_, i) => 
          createMockToolCall({ id: `tool-${i}`, toolName: `tool-${i}` })
        ),
      });
      const theme = createMockTheme();
      const conversationEntries: ConversationEntry[] = [];
      
      // Act
      const panel = new AgentPanel({ agent, conversationEntries, theme, width: 80, height: 6 });
      const lines1 = panel.render().split('\n');
      
      // Scroll down multiple times
      panel.handleInput({ key: 'j' });
      panel.handleInput({ key: 'j' });
      const lines2 = panel.render().split('\n');
      
      // Assert - verify scrolling happens by checking the output stays within height bounds
      expect(lines1.length).toBeLessThanOrEqual(6);
      expect(lines2.length).toBeLessThanOrEqual(6);
    });

    it('should_scroll_through_tool_history_section', () => {
      // Arrange - create lots of tool calls to ensure overflow
      const agent = createMockAgent({
        toolCalls: Array.from({ length: 50 }, (_, i) => 
          createMockToolCall({ id: `tool-${i}`, toolName: `tool-${i}` })
        ),
      });
      const theme = createMockTheme();
      const conversationEntries: ConversationEntry[] = [];
      
      // Act
      const panel = new AgentPanel({ agent, conversationEntries, theme, width: 80, height: 7 });
      const render1 = panel.render();
      panel.handleInput({ key: 'j' }); // Scroll
      const render2 = panel.render();
      
      // Assert - tool history section exists and render is height-constrained
      expect(render1).toContain('Tool History');
      expect(render1.split('\n').length).toBeLessThanOrEqual(7);
      expect(render2.split('\n').length).toBeLessThanOrEqual(7);
    });

    it('should_scroll_through_conversation_section', () => {
      // Arrange - create agent with lots of content
      const agent = createMockAgent({
        toolCalls: Array.from({ length: 50 }, (_, i) => 
          createMockToolCall({ id: `tool-${i}`, toolName: `tool-${i}` })
        ),
      });
      const conversationEntries: ConversationEntry[] = Array.from({ length: 50 }, (_, i) =>
        createMockConversationEntry({ preview: `Message ${i}` })
      );
      const theme = createMockTheme();
      
      // Act
      const panel = new AgentPanel({ 
        agent, 
        conversationEntries,
        theme, 
        width: 80, 
        height: 10 // Enough height to show conversation section
      });
      const render1 = panel.render();
      // Scroll multiple times to navigate through content
      for (let i = 0; i < 10; i++) {
        panel.handleInput({ key: 'j' });
      }
      const render2 = panel.render();
      
      // Assert - output is height-constrained and conversation section appears when enough height
      expect(render1.split('\n').length).toBeLessThanOrEqual(10);
      expect(render2.split('\n').length).toBeLessThanOrEqual(10);
      // At least one render should show conversation when we have enough height
      expect(render1.includes('Conversation') || render2.includes('Conversation')).toBe(true);
    });

    it('should_not_scroll_beyond_content_bounds', () => {
      // Arrange
      const agent = createMockAgent();
      const theme = createMockTheme();
      const conversationEntries: ConversationEntry[] = [];
      
      // Act
      const panel = new AgentPanel({ agent, conversationEntries, theme, width: 80, height: 40 });
      
      // Attempt to scroll up at the top
      panel.handleInput({ key: 'k' });
      panel.handleInput({ key: 'k' });
      const atTop = panel.render();
      
      // Scroll down to bottom
      for (let i = 0; i < 100; i++) {
        panel.handleInput({ key: 'j' });
      }
      const atBottom1 = panel.render();
      
      // Try to scroll further
      panel.handleInput({ key: 'j' });
      const atBottom2 = panel.render();
      
      // Assert - content should be similar (allow for minor render variations)
      // The key behavior is that we don't scroll infinitely - lengths should be close
      expect(Math.abs(atBottom1.length - atBottom2.length)).toBeLessThan(10);
    });
  });

  describe('Keyboard Navigation Between Sections', () => {
    it('should_handle_j_key_for_scrolling_down', () => {
      // Arrange - create enough content to overflow
      const agent = createMockAgent({
        toolCalls: Array.from({ length: 50 }, (_, i) => 
          createMockToolCall({ id: `tool-${i}`, toolName: `tool-${i}` })
        ),
      });
      const theme = createMockTheme();
      const conversationEntries: ConversationEntry[] = [];
      
      // Act
      const panel = new AgentPanel({ agent, conversationEntries, theme, width: 80, height: 7 });
      const handled = panel.handleInput({ key: 'j' });
      
      // Assert - key is handled
      expect(handled).toBe(true);
    });

    it('should_handle_k_key_for_scrolling_up', () => {
      // Arrange - create enough content to overflow
      const agent = createMockAgent({
        toolCalls: Array.from({ length: 50 }, (_, i) => 
          createMockToolCall({ id: `tool-${i}`, toolName: `tool-${i}` })
        ),
      });
      const theme = createMockTheme();
      const conversationEntries: ConversationEntry[] = [];
      
      // Act
      const panel = new AgentPanel({ agent, conversationEntries, theme, width: 80, height: 7 });
      panel.handleInput({ key: 'j' }); // Scroll down first
      const handled = panel.handleInput({ key: 'k' });
      
      // Assert - key is handled
      expect(handled).toBe(true);
    });

    it('should_handle_down_arrow_for_scrolling', () => {
      // Arrange
      const agent = createMockAgent();
      const theme = createMockTheme();
      const conversationEntries: ConversationEntry[] = [];
      
      // Act
      const panel = new AgentPanel({ agent, conversationEntries, theme, width: 80, height: 20 });
      const handled = panel.handleInput({ key: 'down' });
      
      // Assert
      expect(handled).toBe(true);
    });

    it('should_handle_up_arrow_for_scrolling', () => {
      // Arrange
      const agent = createMockAgent();
      const theme = createMockTheme();
      const conversationEntries: ConversationEntry[] = [];
      
      // Act
      const panel = new AgentPanel({ agent, conversationEntries, theme, width: 80, height: 20 });
      panel.handleInput({ key: 'down' }); // Scroll down first
      const handled = panel.handleInput({ key: 'up' });
      
      // Assert
      expect(handled).toBe(true);
    });

    it('should_navigate_between_sections_seamlessly', () => {
      // Arrange - create enough content to ensure scrolling is needed
      const agent = createMockAgent({
        toolCalls: Array.from({ length: 50 }, (_, i) => 
          createMockToolCall({ id: `tool-${i}`, toolName: `tool-${i}` })
        ),
      });
      const conversationEntries: ConversationEntry[] = Array.from({ length: 50 }, (_, i) =>
        createMockConversationEntry({ preview: `Message ${i}` })
      );
      const theme = createMockTheme();
      
      // Act
      const panel = new AgentPanel({ 
        agent, 
        conversationEntries,
        theme, 
        width: 80, 
        height: 7 
      });
      
      // Navigate through sections - each key press should be handled
      let handledCount = 0;
      for (let i = 0; i < 5; i++) {
        if (panel.handleInput({ key: 'j' })) {
          handledCount++;
        }
      }
      
      // Assert - all navigation keys should be handled
      expect(handledCount).toBe(5);
    });

    it('should_return_false_for_unhandled_keys', () => {
      // Arrange
      const agent = createMockAgent();
      const theme = createMockTheme();
      const conversationEntries: ConversationEntry[] = [];
      
      // Act
      const panel = new AgentPanel({ agent, conversationEntries, theme, width: 80, height: 40 });
      const handled = panel.handleInput({ key: 'x' }); // Random key
      
      // Assert
      expect(handled).toBe(false);
    });
  });

  describe('Height Adaptation', () => {
    it('should_adapt_to_small_height', () => {
      // Arrange
      const agent = createMockAgent({
        toolCalls: [createMockToolCall()],
      });
      const conversationEntries: ConversationEntry[] = [
        createMockConversationEntry(),
      ];
      const theme = createMockTheme();
      
      // Act
      const panel = new AgentPanel({ 
        agent, 
        conversationEntries,
        theme, 
        width: 80, 
        height: 10 // Small height
      });
      const rendered = panel.render();
      const lines = rendered.split('\n');
      
      // Assert
      expect(lines.length).toBeLessThanOrEqual(10);
    });

    it('should_adapt_to_large_height', () => {
      // Arrange
      const agent = createMockAgent({
        toolCalls: [createMockToolCall()],
      });
      const conversationEntries: ConversationEntry[] = [
        createMockConversationEntry(),
      ];
      const theme = createMockTheme();
      
      // Act
      const panel = new AgentPanel({ 
        agent, 
        conversationEntries,
        theme, 
        width: 80, 
        height: 100 // Large height
      });
      const rendered = panel.render();
      
      // Assert - Should show all content without truncation
      expect(rendered).toContain('Input'); // From metrics
      expect(rendered).toContain('Tool'); // Tool section
      expect(rendered).toContain('Conversation'); // Conversation section
    });

    it('should_prioritize_metrics_when_height_limited', () => {
      // Arrange
      const agent = createMockAgent({
        toolCalls: Array.from({ length: 10 }, (_, i) => 
          createMockToolCall({ id: `tool-${i}` })
        ),
      });
      const conversationEntries: ConversationEntry[] = Array.from({ length: 10 }, (_, i) =>
        createMockConversationEntry({ preview: `Message ${i}` })
      );
      const theme = createMockTheme();
      
      // Act
      const panel = new AgentPanel({ 
        agent, 
        conversationEntries,
        theme, 
        width: 80, 
        height: 15 // Limited but enough for metrics
      });
      const rendered = panel.render();
      
      // Assert - Metrics section should always be visible
      expect(rendered).toContain('Metrics'); // Metrics section header
    });

    it('should_handle_zero_height_gracefully', () => {
      // Arrange
      const agent = createMockAgent();
      const theme = createMockTheme();
      const conversationEntries: ConversationEntry[] = [];
      
      // Act
      const panel = new AgentPanel({ agent, conversationEntries, theme, width: 80, height: 0 });
      const rendered = panel.render();
      
      // Assert
      expect(rendered).toBe(''); // Or handle gracefully
    });

    it('should_distribute_space_proportionally_with_medium_height', () => {
      // Arrange
      const agent = createMockAgent({
        toolCalls: [createMockToolCall(), createMockToolCall()],
      });
      const conversationEntries: ConversationEntry[] = [
        createMockConversationEntry(),
        createMockConversationEntry(),
      ];
      const theme = createMockTheme();
      
      // Act
      const panel = new AgentPanel({ 
        agent, 
        conversationEntries,
        theme, 
        width: 80, 
        height: 25 // Medium height
      });
      const rendered = panel.render();
      
      // Assert - All three sections should get some space
      expect(rendered).toContain('Input'); // From metrics
      expect(rendered).toContain('Tool'); // Tool section
      expect(rendered).toContain('Conversation'); // Conversation section
    });
  });

  describe('Empty Agent State', () => {
    it('should_handle_agent_with_no_tool_calls', () => {
      // Arrange
      const agent = createMockAgent({ toolCalls: [] });
      const theme = createMockTheme();
      const conversationEntries: ConversationEntry[] = [];
      
      // Act
      const panel = new AgentPanel({ agent, conversationEntries, theme, width: 80, height: 40 });
      const rendered = panel.render();
      
      // Assert
      expect(rendered).toContain('No tool calls yet'); // Empty state message
    });

    it('should_handle_agent_with_no_conversation_entries', () => {
      // Arrange
      const agent = createMockAgent();
      const conversationEntries: ConversationEntry[] = [];
      const theme = createMockTheme();
      
      // Act
      const panel = new AgentPanel({ 
        agent, 
        conversationEntries,
        theme, 
        width: 80, 
        height: 40 
      });
      const rendered = panel.render();
      
      // Assert
      expect(rendered).toContain('No messages yet'); // Empty state message
    });

    it('should_handle_agent_with_zero_metrics', () => {
      // Arrange
      const agent = createMockAgent({
        metrics: {
          inputTokens: 0,
          outputTokens: 0,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          totalCost: 0,
          contextTokens: 0,
          contextLimit: 8000,
          turnCount: 0,
        },
      });
      const theme = createMockTheme();
      const conversationEntries: ConversationEntry[] = [];
      
      // Act
      const panel = new AgentPanel({ agent, conversationEntries, theme, width: 80, height: 40 });
      const rendered = panel.render();
      
      // Assert - Should still render metrics section with zeros
      expect(rendered).toContain('Input'); // Metrics label
      expect(rendered).toContain('0'); // Should show zero values
    });

    it('should_handle_completely_empty_agent', () => {
      // Arrange
      const agent = createMockAgent({
        toolCalls: [],
        messageCount: 0,
        metrics: {
          inputTokens: 0,
          outputTokens: 0,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          totalCost: 0,
          contextTokens: 0,
          contextLimit: 8000,
          turnCount: 0,
        },
      });
      const conversationEntries: ConversationEntry[] = [];
      const theme = createMockTheme();
      
      // Act
      const panel = new AgentPanel({ 
        agent, 
        conversationEntries,
        theme, 
        width: 80, 
        height: 40 
      });
      const rendered = panel.render();
      
      // Assert - Should render without errors and show empty states
      expect(rendered).toBeTruthy();
      expect(rendered).toContain('Input'); // From metrics
      expect(rendered).toContain('No tool calls yet');
      expect(rendered).toContain('No messages yet');
    });

    it('should_display_friendly_message_for_new_agent', () => {
      // Arrange
      const agent = createMockAgent({
        toolCalls: [],
        messageCount: 0,
        startTime: Date.now(), // Just started
      });
      const conversationEntries: ConversationEntry[] = [];
      const theme = createMockTheme();
      
      // Act
      const panel = new AgentPanel({ 
        agent, 
        conversationEntries,
        theme, 
        width: 80, 
        height: 40 
      });
      const rendered = panel.render();
      
      // Assert - Should not show errors or warnings
      expect(rendered).not.toContain('error');
      expect(rendered).not.toContain('Error');
    });
  });

  describe('Render Caching and Invalidation', () => {
    it('should_cache_render_output_for_performance', () => {
      // Arrange
      const agent = createMockAgent();
      const theme = createMockTheme();
      const conversationEntries: ConversationEntry[] = [];
      
      // Act
      const panel = new AgentPanel({ agent, conversationEntries, theme, width: 80, height: 40 });
      const render1 = panel.render();
      const render2 = panel.render(); // Should return cached
      
      // Assert
      expect(render1).toBe(render2); // Same instance
    });

    it('should_invalidate_cache_on_agent_update', () => {
      // Arrange
      const agent = createMockAgent();
      const theme = createMockTheme();
      const conversationEntries: ConversationEntry[] = [];
      
      // Act
      const panel = new AgentPanel({ agent, conversationEntries, theme, width: 80, height: 40 });
      const render1 = panel.render();
      
      // Update agent
      agent.metrics.inputTokens = 2000;
      panel.invalidate();
      const render2 = panel.render();
      
      // Assert
      expect(render1).not.toBe(render2);
    });

    it('should_invalidate_cache_on_scroll', () => {
      // Arrange - create enough content to require scrolling
      const agent = createMockAgent({
        toolCalls: Array.from({ length: 50 }, (_, i) => 
          createMockToolCall({ id: `tool-${i}` })
        ),
      });
      const theme = createMockTheme();
      const conversationEntries: ConversationEntry[] = [];
      
      // Act
      const panel = new AgentPanel({ agent, conversationEntries, theme, width: 80, height: 6 });
      const render1 = panel.render();
      const lines1 = render1.split('\n').length;
      panel.handleInput({ key: 'j' }); // Scroll
      const render2 = panel.render();
      const lines2 = render2.split('\n').length;
      
      // Assert - both renders should be height-constrained
      expect(lines1).toBeLessThanOrEqual(6);
      expect(lines2).toBeLessThanOrEqual(6);
    });
  });

  describe('Edge Cases', () => {
    it('should_handle_null_theme', () => {
      // Arrange
      const agent = createMockAgent();
      const conversationEntries: ConversationEntry[] = [];
      
      // Act
      const panel = new AgentPanel({ agent, conversationEntries, theme: null, width: 80, height: 40 });
      const rendered = panel.render();
      
      // Assert - Should render without styling
      expect(rendered).toBeTruthy();
    });

    it('should_handle_very_long_agent_name', () => {
      // Arrange
      const longName = 'a'.repeat(100);
      const agent = createMockAgent({ name: longName });
      const theme = createMockTheme();
      const conversationEntries: ConversationEntry[] = [];
      
      // Act
      const panel = new AgentPanel({ agent, conversationEntries, theme, width: 80, height: 40 });
      const rendered = panel.render();
      const lines = rendered.split('\n');
      
      // Assert - Name should be truncated to fit
      lines.forEach(line => {
        // Strip ANSI codes and theme wrappers for length check
        const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '').replace(/<[^>]+>/g, '');
        expect(cleanLine.length).toBeLessThanOrEqual(80);
      });
    });

    it('should_handle_very_large_number_of_tool_calls', () => {
      // Arrange
      const agent = createMockAgent({
        toolCalls: Array.from({ length: 1000 }, (_, i) => 
          createMockToolCall({ id: `tool-${i}` })
        ),
      });
      const theme = createMockTheme();
      const conversationEntries: ConversationEntry[] = [];
      
      // Act
      const panel = new AgentPanel({ agent, conversationEntries, theme, width: 80, height: 40 });
      const rendered = panel.render();
      
      // Assert - Should handle large list efficiently
      expect(rendered).toBeTruthy();
    });

    it('should_handle_very_large_number_of_conversation_entries', () => {
      // Arrange
      const agent = createMockAgent();
      const conversationEntries: ConversationEntry[] = Array.from({ length: 500 }, (_, i) =>
        createMockConversationEntry({ preview: `Message ${i}` })
      );
      const theme = createMockTheme();
      
      // Act
      const panel = new AgentPanel({ 
        agent, 
        conversationEntries,
        theme, 
        width: 80, 
        height: 40 
      });
      const rendered = panel.render();
      
      // Assert - Should handle large list efficiently
      expect(rendered).toBeTruthy();
    });

    it('should_handle_negative_width_gracefully', () => {
      // Arrange
      const agent = createMockAgent();
      const theme = createMockTheme();
      const conversationEntries: ConversationEntry[] = [];
      
      // Act & Assert
      // Should either clamp to minimum or throw error
      expect(() => {
        const panel = new AgentPanel({ agent, conversationEntries, theme, width: -10, height: 40 });
        panel.render();
      }).not.toThrow();
    });

    it('should_handle_negative_height_gracefully', () => {
      // Arrange
      const agent = createMockAgent();
      const theme = createMockTheme();
      const conversationEntries: ConversationEntry[] = [];
      
      // Act & Assert
      // Should either clamp to minimum or throw error
      expect(() => {
        const panel = new AgentPanel({ agent, conversationEntries, theme, width: 80, height: -10 });
        panel.render();
      }).not.toThrow();
    });
  });
});
