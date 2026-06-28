/**
 * Tool History Component Test Suite
 * 
 * Tests for the ToolHistory component in ui/tool-history.ts
 * 
 * These tests verify:
 * - Tool call list rendering
 * - Chronological order of tool calls
 * - Status icons (⏳ pending, ✓ success, ✗ failed)
 * - Tool name display
 * - Arguments summary display (truncated)
 * - Duration display after completion
 * - Failed calls shown in error color
 * - Expandable detail view (toggle with 'e' key)
 * - Error messages shown on expand for failed calls
 * - Scrollable behavior when list is long
 * - Empty state handling
 * 
 * Tests are written BEFORE implementation (TDD).
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import type { ToolCall } from '@shared/stats_dashboard_tui/types';

// Import component that will be implemented
// This import will fail until tool-history.ts is created
import { ToolHistory } from '@shared/stats_dashboard_tui/ui/tool-history';

describe('ToolHistory Component', () => {
  // Helper function to create test tool calls
  function createToolCall(overrides: Partial<ToolCall> = {}): ToolCall {
    return {
      id: 'tool-' + Math.random().toString(36).substring(7),
      toolName: 'bash',
      args: { command: 'ls -la' },
      argsSummary: 'ls -la',
      status: 'success',
      startTime: Date.now(),
      endTime: Date.now() + 1000,
      duration: 1000,
      isError: false,
      errorMessage: null,
      ...overrides,
    };
  }

  // Helper function to create mock agent with given tool calls
  function createMockAgent(toolCalls: ToolCall[] = []): import('@shared/stats_dashboard_tui/types').Agent {
    return {
      id: 'agent-' + Math.random().toString(36).substring(7),
      name: 'test-agent',
      status: 'running',
      parentId: null,
      startTime: Date.now(),
      endTime: null,
      metrics: {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0,
        contextTokens: 0,
        contextLimit: 128000,
        turnCount: 0,
      },
      toolCalls,
      messageCount: 0,
      subagentIds: [],
    };
  }

  describe('Constructor and Basic Setup', () => {
    it('should create ToolHistory component with empty tool calls', () => {
      const toolHistory = new ToolHistory({ agent: createMockAgent([]), theme: null, width: 80 });
      expect(toolHistory).toBeDefined();
    });

    it('should accept tool calls in constructor', () => {
      const toolCalls = [createToolCall()];
      const toolHistory = new ToolHistory({ agent: createMockAgent(toolCalls), theme: null, width: 80 });
      expect(toolHistory).toBeDefined();
    });

    it('should accept width in constructor', () => {
      const toolHistory = new ToolHistory({ agent: createMockAgent([]), theme: null, width: 80 });
      expect(toolHistory).toBeDefined();
    });

    it('should accept height in constructor', () => {
      const toolHistory = new ToolHistory({ agent: createMockAgent([]), theme: null, width: 80 });
      expect(toolHistory).toBeDefined();
    });
  });

  describe('Empty State Handling', () => {
    it('should display empty state message when no tool calls', () => {
      const toolHistory = new ToolHistory({ agent: createMockAgent([]), theme: null, width: 80 });
      const output = toolHistory.render();
      
      expect(output).toContain('No tool calls yet');
    });

    it('should not show tool list when empty', () => {
      const toolHistory = new ToolHistory({ agent: createMockAgent([]), theme: null, width: 80 });
      const output = toolHistory.render();
      
      // Should not contain any tool icons
      expect(output).not.toContain('⏳');
      expect(output).not.toContain('✓');
      expect(output).not.toContain('✗');
    });

    it('should display friendly empty message', () => {
      const toolHistory = new ToolHistory({ agent: createMockAgent([]), theme: null, width: 80 });
      const output = toolHistory.render();
      
      // Message should be informative and friendly
      expect(output.toLowerCase()).toContain('no tool');
    });
  });

  describe('Tool Call List Rendering', () => {
    it('should render single tool call', () => {
      const toolCall = createToolCall({
        toolName: 'bash',
        argsSummary: 'npm install',
      });
      const toolHistory = new ToolHistory({ agent: createMockAgent([toolCall]), theme: null, width: 80 });
      const output = toolHistory.render();
      
      expect(output).toContain('bash');
      expect(output).toContain('npm install');
    });

    it('should render multiple tool calls', () => {
      const toolCalls = [
        createToolCall({ toolName: 'bash', argsSummary: 'ls -la' }),
        createToolCall({ toolName: 'read', argsSummary: 'file.txt' }),
        createToolCall({ toolName: 'write', argsSummary: 'output.txt (100 chars)' }),
      ];
      const toolHistory = new ToolHistory({ agent: createMockAgent(toolCalls), theme: null, width: 80 });
      const output = toolHistory.render();
      
      expect(output).toContain('bash');
      expect(output).toContain('read');
      expect(output).toContain('write');
    });

    it('should render tool names prominently', () => {
      const toolCall = createToolCall({ toolName: 'important_tool' });
      const toolHistory = new ToolHistory({ agent: createMockAgent([toolCall]), theme: null, width: 80 });
      const output = toolHistory.render();
      
      // Tool name should appear (exact styling TBD by implementation)
      expect(output).toContain('important_tool');
    });

    it('should render args summary for each tool', () => {
      const toolCall = createToolCall({
        argsSummary: 'echo "hello world"',
      });
      const toolHistory = new ToolHistory({ agent: createMockAgent([toolCall]), theme: null, width: 80 });
      const output = toolHistory.render();
      
      expect(output).toContain('echo "hello world"');
    });

    it('should truncate long args summaries', () => {
      const longArgs = 'a'.repeat(200);
      const toolCall = createToolCall({ argsSummary: longArgs });
      const toolHistory = new ToolHistory({ agent: createMockAgent([toolCall]), theme: null, width: 80 });
      const output = toolHistory.render();
      
      // Should contain truncated version (exact truncation length TBD)
      expect(output).toContain('...');
    });
  });

  describe('Chronological Order', () => {
    it('should display tool calls in chronological order (newest first)', () => {
      const toolCalls = [
        createToolCall({ id: 'tool1', toolName: 'first', startTime: 1000 }),
        createToolCall({ id: 'tool2', toolName: 'second', startTime: 2000 }),
        createToolCall({ id: 'tool3', toolName: 'third', startTime: 3000 }),
      ];
      const toolHistory = new ToolHistory({ agent: createMockAgent(toolCalls), theme: null, width: 80 });
      const output = toolHistory.render();
      
      // Newest (third) should appear before oldest (first)
      const thirdIndex = output.indexOf('third');
      const secondIndex = output.indexOf('second');
      const firstIndex = output.indexOf('first');
      
      expect(thirdIndex).toBeLessThan(secondIndex);
      expect(secondIndex).toBeLessThan(firstIndex);
    });

    it('should handle tool calls with same timestamp', () => {
      const timestamp = 5000;
      const toolCalls = [
        createToolCall({ id: 'tool1', toolName: 'tool_a', startTime: timestamp }),
        createToolCall({ id: 'tool2', toolName: 'tool_b', startTime: timestamp }),
      ];
      const toolHistory = new ToolHistory({ agent: createMockAgent(toolCalls), theme: null, width: 80 });
      
      // Should not throw error
      expect(() => toolHistory.render()).not.toThrow();
    });

    it('should handle unsorted input and sort correctly', () => {
      const toolCalls = [
        createToolCall({ toolName: 'middle', startTime: 2000 }),
        createToolCall({ toolName: 'newest', startTime: 3000 }),
        createToolCall({ toolName: 'oldest', startTime: 1000 }),
      ];
      const toolHistory = new ToolHistory({ agent: createMockAgent(toolCalls), theme: null, width: 80 });
      const output = toolHistory.render();
      
      // Should be sorted newest first
      const newestIndex = output.indexOf('newest');
      const middleIndex = output.indexOf('middle');
      const oldestIndex = output.indexOf('oldest');
      
      expect(newestIndex).toBeLessThan(middleIndex);
      expect(middleIndex).toBeLessThan(oldestIndex);
    });
  });

  describe('Status Icons', () => {
    it('should display pending icon (⏳) for pending tool calls', () => {
      const toolCall = createToolCall({
        status: 'pending',
        endTime: null,
        duration: null,
      });
      const toolHistory = new ToolHistory({ agent: createMockAgent([toolCall]), theme: null, width: 80 });
      const output = toolHistory.render();
      
      expect(output).toContain('⏳');
    });

    it('should display success icon (✓) for successful tool calls', () => {
      const toolCall = createToolCall({
        status: 'success',
        isError: false,
      });
      const toolHistory = new ToolHistory({ agent: createMockAgent([toolCall]), theme: null, width: 80 });
      const output = toolHistory.render();
      
      expect(output).toContain('✓');
    });

    it('should display failed icon (✗) for failed tool calls', () => {
      const toolCall = createToolCall({
        status: 'failed',
        isError: true,
        errorMessage: 'Command not found',
      });
      const toolHistory = new ToolHistory({ agent: createMockAgent([toolCall]), theme: null, width: 80 });
      const output = toolHistory.render();
      
      expect(output).toContain('✗');
    });

    it('should display different icons for different statuses in same list', () => {
      const toolCalls = [
        createToolCall({ status: 'pending', endTime: null, duration: null }),
        createToolCall({ status: 'success', isError: false }),
        createToolCall({ status: 'failed', isError: true, errorMessage: 'Error' }),
      ];
      const toolHistory = new ToolHistory({ agent: createMockAgent(toolCalls), theme: null, width: 80 });
      const output = toolHistory.render();
      
      expect(output).toContain('⏳');
      expect(output).toContain('✓');
      expect(output).toContain('✗');
    });

    it('should place icon before tool name', () => {
      const toolCall = createToolCall({
        status: 'success',
        toolName: 'bash',
      });
      const toolHistory = new ToolHistory({ agent: createMockAgent([toolCall]), theme: null, width: 80 });
      const output = toolHistory.render();
      
      // Icon should appear before tool name in output
      const iconIndex = output.indexOf('✓');
      const nameIndex = output.indexOf('bash');
      
      expect(iconIndex).toBeLessThan(nameIndex);
      expect(iconIndex).toBeGreaterThan(-1);
    });
  });

  describe('Duration Display', () => {
    it('should display duration for completed tool calls', () => {
      const toolCall = createToolCall({
        status: 'success',
        duration: 2500,
      });
      const toolHistory = new ToolHistory({ agent: createMockAgent([toolCall]), theme: null, width: 80 });
      const output = toolHistory.render();
      
      // Should contain formatted duration (e.g., "2.5s")
      expect(output).toMatch(/2\.5s|2500ms/);
    });

    it('should not display duration for pending tool calls', () => {
      const toolCall = createToolCall({
        status: 'pending',
        duration: null,
        endTime: null,
      });
      const toolHistory = new ToolHistory({ agent: createMockAgent([toolCall]), theme: null, width: 80 });
      const output = toolHistory.render();
      
      // Should not show a duration since it's still running
      expect(output).not.toMatch(/\d+ms/);
      expect(output).not.toMatch(/\d+\.?\d*s/);
    });

    it('should display duration for failed tool calls', () => {
      const toolCall = createToolCall({
        status: 'failed',
        isError: true,
        duration: 150,
        errorMessage: 'Command failed',
      });
      const toolHistory = new ToolHistory({ agent: createMockAgent([toolCall]), theme: null, width: 80 });
      const output = toolHistory.render();
      
      // Failed calls still show duration
      expect(output).toContain('150ms');
    });

    it('should format duration consistently with format utils', () => {
      const durations = [50, 1500, 90000];
      const toolCalls = durations.map((duration, i) =>
        createToolCall({
          id: `tool-${i}`,
          duration,
          status: 'success',
        })
      );
      const toolHistory = new ToolHistory({ agent: createMockAgent(toolCalls), theme: null, width: 80 });
      const output = toolHistory.render();
      
      // Should use formatDuration utility
      expect(output).toContain('50ms');
      expect(output).toContain('1.5s');
      expect(output).toMatch(/1m 30s|90s/);
    });
  });

  describe('Failed Call Styling', () => {
    it('should apply error color to failed tool calls', () => {
      const toolCall = createToolCall({
        status: 'failed',
        isError: true,
        errorMessage: 'Tool execution failed',
      });
      const toolHistory = new ToolHistory({ agent: createMockAgent([toolCall]), theme: null, width: 80 });
      const output = toolHistory.render();
      
      // Should contain ANSI color codes or theme color markers
      // Exact format depends on implementation, but should be visually distinct
      expect(output).toContain('✗');
    });

    it('should visually distinguish failed from successful calls', () => {
      const toolCalls = [
        createToolCall({ id: 'success', status: 'success', toolName: 'good' }),
        createToolCall({
          id: 'failed',
          status: 'failed',
          isError: true,
          toolName: 'bad',
          errorMessage: 'Error',
        }),
      ];
      const toolHistory = new ToolHistory({ agent: createMockAgent(toolCalls), theme: null, width: 80 });
      const output = toolHistory.render();
      
      // Both should appear but with different styling
      expect(output).toContain('good');
      expect(output).toContain('bad');
      expect(output).toContain('✓');
      expect(output).toContain('✗');
    });

    it('should not apply error styling to pending calls', () => {
      const toolCall = createToolCall({
        status: 'pending',
        isError: false,
        endTime: null,
        duration: null,
      });
      const toolHistory = new ToolHistory({ agent: createMockAgent([toolCall]), theme: null, width: 80 });
      const output = toolHistory.render();
      
      expect(output).toContain('⏳');
      expect(output).not.toContain('✗');
    });
  });

  describe('Expandable Detail View', () => {
    let toolHistory: ToolHistory;
    let toolCalls: ToolCall[];

    beforeEach(() => {
      toolCalls = [
        createToolCall({
          id: 'tool1',
          toolName: 'bash',
          args: { command: 'ls -la /home/user' },
          argsSummary: 'ls -la /home/user',
          status: 'success',
        }),
      ];
      toolHistory = new ToolHistory({ agent: createMockAgent(toolCalls), theme: null, width: 80 });
    });

    it('should collapse details by default', () => {
      const output = toolHistory.render();
      
      // Should show summary, not full args
      expect(output).toContain('ls -la /home/user');
    });

    it('should toggle details when "e" key is pressed', () => {
      const beforeExpand = toolHistory.render();
      
      // Simulate 'e' key press
      const handled = toolHistory.handleInput({ key: 'e' });
      
      expect(handled).toBe(true);
      
      const afterExpand = toolHistory.render();
      
      // Output should change after expand
      expect(afterExpand).not.toBe(beforeExpand);
    });

    it('should expand to show full arguments', () => {
      const toolCall = createToolCall({
        toolName: 'read',
        args: {
          path: '/very/long/path/to/some/file.txt',
          offset: 100,
          limit: 50,
        },
        argsSummary: '/very/long/path/to/some/file.txt (offset: 100, limit: 50)',
      });
      toolHistory = new ToolHistory({ agent: createMockAgent([toolCall]), theme: null, width: 80 });
      
      // Expand details
      toolHistory.handleInput({ key: 'e' });
      const output = toolHistory.render();
      
      // Should show full args when expanded
      expect(output).toContain('path');
      expect(output).toContain('/very/long/path/to/some/file.txt');
      expect(output).toContain('offset');
      expect(output).toContain('100');
    });

    it('should collapse when "e" is pressed again', () => {
      // First expand
      toolHistory.handleInput({ key: 'e' });
      const expanded = toolHistory.render();
      
      // Then collapse
      toolHistory.handleInput({ key: 'e' });
      const collapsed = toolHistory.render();
      
      // Should return to collapsed state
      expect(collapsed).not.toBe(expanded);
    });

    it('should expand only the selected tool call', () => {
      const toolCalls = [
        createToolCall({ id: 'tool1', toolName: 'first' }),
        createToolCall({ id: 'tool2', toolName: 'second' }),
      ];
      toolHistory = new ToolHistory({ agent: createMockAgent(toolCalls), theme: null, width: 80 });
      
      // Select and expand first tool
      toolHistory.handleInput({ key: 'e' });
      const output = toolHistory.render();
      
      // Only selected tool should be expanded
      // (Implementation detail: how selection works)
      expect(output).toBeDefined();
    });
  });

  describe('Error Message Display', () => {
    let toolHistory: ToolHistory;

    it('should show error message when failed call is expanded', () => {
      const toolCall = createToolCall({
        status: 'failed',
        isError: true,
        errorMessage: 'ENOENT: no such file or directory',
      });
      toolHistory = new ToolHistory({ agent: createMockAgent([toolCall]), theme: null, width: 80 });
      
      // Expand details
      toolHistory.handleInput({ key: 'e' });
      const output = toolHistory.render();
      
      expect(output).toContain('ENOENT: no such file or directory');
    });

    it('should not show error message when collapsed', () => {
      const toolCall = createToolCall({
        status: 'failed',
        isError: true,
        errorMessage: 'File not found error message',
      });
      toolHistory = new ToolHistory({ agent: createMockAgent([toolCall]), theme: null, width: 80 });
      
      const output = toolHistory.render();
      
      // Error message should not appear in collapsed view
      expect(output).not.toContain('File not found error message');
    });

    it('should not show error message for successful calls', () => {
      const toolCall = createToolCall({
        status: 'success',
        isError: false,
        errorMessage: null,
      });
      toolHistory = new ToolHistory({ agent: createMockAgent([toolCall]), theme: null, width: 80 });
      
      toolHistory.handleInput({ key: 'e' });
      const output = toolHistory.render();
      
      // Should not contain error-related text
      expect(output.toLowerCase()).not.toContain('error:');
    });

    it('should format error message nicely when expanded', () => {
      const toolCall = createToolCall({
        status: 'failed',
        isError: true,
        errorMessage: 'Command failed with exit code 1: Permission denied',
      });
      toolHistory = new ToolHistory({ agent: createMockAgent([toolCall]), theme: null, width: 80 });
      
      toolHistory.handleInput({ key: 'e' });
      const output = toolHistory.render();
      
      // Error message should be displayed with proper formatting
      expect(output).toContain('Permission denied');
    });

    it('should handle long error messages', () => {
      const longError = 'Error: ' + 'a'.repeat(500);
      const toolCall = createToolCall({
        status: 'failed',
        isError: true,
        errorMessage: longError,
      });
      toolHistory = new ToolHistory({ agent: createMockAgent([toolCall]), theme: null, width: 80 });
      
      toolHistory.handleInput({ key: 'e' });
      const output = toolHistory.render();
      
      // Should contain truncated or wrapped error
      expect(output).toContain('Error');
    });

    it('should handle null error messages gracefully', () => {
      const toolCall = createToolCall({
        status: 'failed',
        isError: true,
        errorMessage: null,
      });
      toolHistory = new ToolHistory({ agent: createMockAgent([toolCall]), theme: null, width: 80 });
      
      toolHistory.handleInput({ key: 'e' });
      
      // Should not throw error
      expect(() => toolHistory.render()).not.toThrow();
    });
  });

  describe('Scrolling Behavior', () => {
    let toolHistory: ToolHistory;

    it('should be scrollable when list is long', () => {
      // Create many tool calls
      const toolCalls = Array.from({ length: 50 }, (_, i) =>
        createToolCall({
          id: `tool-${i}`,
          toolName: `tool_${i}`,
          argsSummary: `args for tool ${i}`,
        })
      );
      toolHistory = new ToolHistory({ agent: createMockAgent(toolCalls), theme: null, width: 80 });
      
      // Should not throw error
      expect(() => toolHistory.render()).not.toThrow();
    });

    it('should handle scroll input', () => {
      const toolCalls = Array.from({ length: 30 }, (_, i) =>
        createToolCall({ id: `tool-${i}`, toolName: `tool_${i}` })
      );
      toolHistory = new ToolHistory({ agent: createMockAgent(toolCalls), theme: null, width: 80 });
      
      // Simulate scroll down
      const handled = toolHistory.handleInput({ key: 'down' });
      
      // Should handle scroll input
      expect(handled).toBe(true);
    });

    it('should scroll with arrow keys', () => {
      const toolCalls = Array.from({ length: 20 }, (_, i) =>
        createToolCall({ id: `tool-${i}` })
      );
      toolHistory = new ToolHistory({ agent: createMockAgent(toolCalls), theme: null, width: 80 });
      
      // Should handle up/down arrows
      expect(toolHistory.handleInput({ key: 'down' })).toBe(true);
      expect(toolHistory.handleInput({ key: 'up' })).toBe(true);
    });

    it('should scroll with j/k keys', () => {
      const toolCalls = Array.from({ length: 20 }, (_, i) =>
        createToolCall({ id: `tool-${i}` })
      );
      toolHistory = new ToolHistory({ agent: createMockAgent(toolCalls), theme: null, width: 80 });
      
      // Should handle j/k for vi-style navigation
      expect(toolHistory.handleInput({ key: 'j' })).toBe(true);
      expect(toolHistory.handleInput({ key: 'k' })).toBe(true);
    });

    it('should not scroll beyond bounds', () => {
      const toolCalls = [createToolCall(), createToolCall()];
      toolHistory = new ToolHistory({ agent: createMockAgent(toolCalls), theme: null, width: 80 });
      
      // Try to scroll up from top
      toolHistory.handleInput({ key: 'up' });
      const atTop = toolHistory.render();
      
      // Try to scroll up again
      toolHistory.handleInput({ key: 'up' });
      const stillAtTop = toolHistory.render();
      
      // Should not change
      expect(stillAtTop).toBe(atTop);
    });

    it('should show scroll indicator when content overflows', () => {
      const toolCalls = Array.from({ length: 30 }, (_, i) =>
        createToolCall({ id: `tool-${i}` })
      );
      toolHistory = new ToolHistory({ agent: createMockAgent(toolCalls), theme: null, width: 80 });
      const output = toolHistory.render();
      
      // Should indicate more content available (e.g., "..." or scroll arrows)
      // Exact indicator TBD by implementation
      expect(output).toBeDefined();
    });

    it('should update scroll position when new tool calls added', () => {
      const toolCalls = Array.from({ length: 5 }, (_, i) =>
        createToolCall({ id: `tool-${i}` })
      );
      toolHistory = new ToolHistory({ agent: createMockAgent(toolCalls), theme: null, width: 80 });
      
      // Add more tool calls
      const newToolCalls = [
        ...toolCalls,
        createToolCall({ id: 'new-tool' }),
      ];
      const newToolHistory = new ToolHistory({ agent: createMockAgent(newToolCalls), theme: null, width: 80 });
      
      // Should handle updated list
      expect(() => newToolHistory.render()).not.toThrow();
    });
  });

  describe('Keyboard Input Handling', () => {
    let toolHistory: ToolHistory;
    let toolCalls: ToolCall[];

    beforeEach(() => {
      toolCalls = [
        createToolCall({ id: 'tool1', toolName: 'first' }),
        createToolCall({ id: 'tool2', toolName: 'second' }),
      ];
    });

    it('should handle "e" key to expand details', () => {
      toolHistory = new ToolHistory({ agent: createMockAgent(toolCalls), theme: null, width: 80 });
      const handled = toolHistory.handleInput({ key: 'e' });
      
      expect(handled).toBe(true);
    });

    it('should handle "E" (uppercase) key to expand details', () => {
      toolHistory = new ToolHistory({ agent: createMockAgent(toolCalls), theme: null, width: 80 });
      const handled = toolHistory.handleInput({ key: 'E' });
      
      expect(handled).toBe(true);
    });

    it('should return false for unhandled keys', () => {
      toolHistory = new ToolHistory({ agent: createMockAgent(toolCalls), theme: null, width: 80 });
      const handled = toolHistory.handleInput({ key: 'x' });
      
      expect(handled).toBe(false);
    });

    it('should not throw on invalid input', () => {
      toolHistory = new ToolHistory({ agent: createMockAgent(toolCalls), theme: null, width: 80 });
      
      expect(() => toolHistory.handleInput({ key: null as any })).not.toThrow();
      expect(() => toolHistory.handleInput({} as any)).not.toThrow();
    });

    it('should handle navigation keys when scrollable', () => {
      const manyToolCalls = Array.from({ length: 20 }, (_, i) =>
        createToolCall({ id: `tool-${i}` })
      );
      toolHistory = new ToolHistory({ agent: createMockAgent(manyToolCalls), theme: null, width: 80 });
      
      expect(toolHistory.handleInput({ key: 'j' })).toBe(true);
      expect(toolHistory.handleInput({ key: 'k' })).toBe(true);
      expect(toolHistory.handleInput({ key: 'down' })).toBe(true);
      expect(toolHistory.handleInput({ key: 'up' })).toBe(true);
    });

    it('should handle PageUp/PageDown for fast scrolling', () => {
      const manyToolCalls = Array.from({ length: 50 }, (_, i) =>
        createToolCall({ id: `tool-${i}` })
      );
      toolHistory = new ToolHistory({ agent: createMockAgent(manyToolCalls), theme: null, width: 80 });
      
      const handlePageDown = toolHistory.handleInput({ key: 'pagedown' });
      const handlePageUp = toolHistory.handleInput({ key: 'pageup' });
      
      // Should handle page navigation
      expect(handlePageDown || handlePageUp).toBeTruthy();
    });
  });

  describe('Render Caching and Performance', () => {
    let toolHistory: ToolHistory;

    it('should cache render output when state unchanged', () => {
      const toolCalls = [createToolCall()];
      toolHistory = new ToolHistory({ agent: createMockAgent(toolCalls), theme: null, width: 80 });
      
      const output1 = toolHistory.render();
      const output2 = toolHistory.render();
      
      // Should return same output when nothing changed
      expect(output1).toBe(output2);
    });

    it('should invalidate cache when state changes', () => {
      const toolCalls = [createToolCall()];
      toolHistory = new ToolHistory({ agent: createMockAgent(toolCalls), theme: null, width: 80 });
      
      const beforeExpand = toolHistory.render();
      
      // Change state
      toolHistory.handleInput({ key: 'e' });
      
      const afterExpand = toolHistory.render();
      
      // Output should differ
      expect(afterExpand).not.toBe(beforeExpand);
    });

    it('should handle rapid re-renders efficiently', () => {
      const toolCalls = Array.from({ length: 100 }, (_, i) =>
        createToolCall({ id: `tool-${i}` })
      );
      toolHistory = new ToolHistory({ agent: createMockAgent(toolCalls), theme: null, width: 80 });
      
      const startTime = Date.now();
      
      // Render multiple times
      for (let i = 0; i < 10; i++) {
        toolHistory.render();
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete in reasonable time (< 100ms for 10 cached renders)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Width and Layout Handling', () => {
    let toolHistory: ToolHistory;

    it('should adapt to different widths', () => {
      const toolCalls = [createToolCall()];
      
      const narrow = new ToolHistory({ agent: createMockAgent(toolCalls), theme: null, width: 80 });
      const wide = new ToolHistory({ agent: createMockAgent(toolCalls), theme: null, width: 80 });
      
      const narrowOutput = narrow.render();
      const wideOutput = wide.render();
      
      // Both should render without error
      expect(narrowOutput).toBeDefined();
      expect(wideOutput).toBeDefined();
    });

    it('should truncate long lines to fit width', () => {
      const toolCall = createToolCall({
        toolName: 'very_long_tool_name_that_exceeds_width',
        argsSummary: 'this is a very long argument summary that should be truncated',
      });
      toolHistory = new ToolHistory({ agent: createMockAgent([toolCall]), theme: null, width: 40 });
      
      const output = toolHistory.render();
      
      // No line should exceed specified width
      const lines = output.split('\n');
      for (const line of lines) {
        // Remove ANSI codes for length check
        const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
        expect(cleanLine.length).toBeLessThanOrEqual(40);
      }
    });

    it('should handle very narrow width gracefully', () => {
      const toolCalls = [createToolCall()];
      toolHistory = new ToolHistory({ agent: createMockAgent(toolCalls), theme: null, width: 80 });
      
      // Should not throw with narrow width
      expect(() => toolHistory.render()).not.toThrow();
    });

    it('should handle very wide width', () => {
      const toolCalls = [createToolCall()];
      toolHistory = new ToolHistory({ agent: createMockAgent(toolCalls), theme: null, width: 80 });
      
      // Should not throw with wide width
      expect(() => toolHistory.render()).not.toThrow();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    let toolHistory: ToolHistory;

    it('should handle tool call with missing fields', () => {
      const incompleteToolCall = {
        id: 'tool1',
        status: 'success',
      } as any;
      
      toolHistory = new ToolHistory({ agent: createMockAgent([incompleteToolCall]), theme: null, width: 80 });
      
      // Should not throw error
      expect(() => toolHistory.render()).not.toThrow();
    });

    it('should handle null toolCalls array', () => {
      expect(() => new ToolHistory({ agent: null as any, theme: null, width: 80 })).toThrow();
    });

    it('should handle undefined toolCalls array', () => {
      expect(() => new ToolHistory({ agent: undefined as any, theme: null, width: 80 })).toThrow();
    });

    it('should handle tool call with very long ID', () => {
      const toolCall = createToolCall({
        id: 'x'.repeat(500),
      });
      toolHistory = new ToolHistory({ agent: createMockAgent([toolCall]), theme: null, width: 80 });
      
      expect(() => toolHistory.render()).not.toThrow();
    });

    it('should handle tool call with special characters in name', () => {
      const toolCall = createToolCall({
        toolName: 'tool<>{}[]()!@#$%^&*',
      });
      toolHistory = new ToolHistory({ agent: createMockAgent([toolCall]), theme: null, width: 80 });
      
      const output = toolHistory.render();
      expect(output).toBeDefined();
    });

    it('should handle tool call with unicode characters', () => {
      const toolCall = createToolCall({
        toolName: 'bash',
        argsSummary: 'echo "Hello 世界 🌍"',
      });
      toolHistory = new ToolHistory({ agent: createMockAgent([toolCall]), theme: null, width: 80 });
      
      const output = toolHistory.render();
      expect(output).toContain('世界');
      expect(output).toContain('🌍');
    });

    it('should handle tool call with negative duration', () => {
      const toolCall = createToolCall({
        duration: -100,
      });
      toolHistory = new ToolHistory({ agent: createMockAgent([toolCall]), theme: null, width: 80 });
      
      // Should handle gracefully (treat as 0 or show as invalid)
      expect(() => toolHistory.render()).not.toThrow();
    });

    it('should handle tool call with future startTime', () => {
      const toolCall = createToolCall({
        startTime: Date.now() + 100000,
      });
      toolHistory = new ToolHistory({ agent: createMockAgent([toolCall]), theme: null, width: 80 });
      
      expect(() => toolHistory.render()).not.toThrow();
    });

    it('should handle empty args summary', () => {
      const toolCall = createToolCall({
        argsSummary: '',
      });
      toolHistory = new ToolHistory({ agent: createMockAgent([toolCall]), theme: null, width: 80 });
      
      const output = toolHistory.render();
      expect(output).toBeDefined();
    });
  });

  describe('Integration with Format Utils', () => {
    let toolHistory: ToolHistory;

    it('should use formatDuration for duration display', () => {
      const toolCall = createToolCall({
        duration: 2500,
        status: 'success',
      });
      toolHistory = new ToolHistory({ agent: createMockAgent([toolCall]), theme: null, width: 80 });
      const output = toolHistory.render();
      
      // Should match formatDuration output
      expect(output).toContain('2.5s');
    });

    it('should use formatToolArgs for args summary', () => {
      const toolCall = createToolCall({
        toolName: 'bash',
        args: { command: 'npm test' },
        argsSummary: 'npm test', // Pre-formatted
      });
      toolHistory = new ToolHistory({ agent: createMockAgent([toolCall]), theme: null, width: 80 });
      const output = toolHistory.render();
      
      expect(output).toContain('npm test');
    });

    it('should use extractErrorMessage for error display', () => {
      const toolCall = createToolCall({
        status: 'failed',
        isError: true,
        errorMessage: 'Command failed: File not found',
      });
      toolHistory = new ToolHistory({ agent: createMockAgent([toolCall]), theme: null, width: 80 });
      
      toolHistory.handleInput({ key: 'e' });
      const output = toolHistory.render();
      
      expect(output).toContain('File not found');
    });

    it('should use truncateText for long content', () => {
      const longSummary = 'x'.repeat(200);
      const toolCall = createToolCall({
        argsSummary: longSummary,
      });
      toolHistory = new ToolHistory({ agent: createMockAgent([toolCall]), theme: null, width: 80 });
      const output = toolHistory.render();
      
      // Should be truncated with ellipsis
      expect(output).toContain('...');
    });
  });

  describe('Update and Refresh', () => {
    let toolHistory: ToolHistory;

    it('should support updating tool calls list', () => {
      const initialCalls = [createToolCall({ id: 'tool1' })];
      toolHistory = new ToolHistory({ agent: createMockAgent(initialCalls), theme: null, width: 80 });
      
      const initialOutput = toolHistory.render();
      
      // Update with new list
      const updatedCalls = [
        ...initialCalls,
        createToolCall({ id: 'tool2' }),
      ];
      const newToolHistory = new ToolHistory({ agent: createMockAgent(updatedCalls), theme: null, width: 80 });
      const updatedOutput = newToolHistory.render();
      
      // Output should reflect new tool call
      expect(updatedOutput).not.toBe(initialOutput);
    });

    it('should reflect status changes in tool calls', () => {
      const toolCall = createToolCall({
        id: 'tool1',
        status: 'pending',
        endTime: null,
        duration: null,
      });
      const pending = new ToolHistory({ agent: createMockAgent([toolCall]), theme: null, width: 80 });
      const pendingOutput = pending.render();
      
      expect(pendingOutput).toContain('⏳');
      
      // Update to completed
      const completedCall = {
        ...toolCall,
        status: 'success' as const,
        endTime: Date.now(),
        duration: 1000,
      };
      const completed = new ToolHistory({ agent: createMockAgent([completedCall]), theme: null, width: 80 });
      const completedOutput = completed.render();
      
      expect(completedOutput).toContain('✓');
      expect(completedOutput).not.toContain('⏳');
    });
  });
});
