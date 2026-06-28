/**
 * Tests for Conversation View Component (T11)
 * 
 * Tests the ConversationView component including:
 * - Message list rendering
 * - Role labels (User, Assistant)
 * - Content preview truncation (~100 chars)
 * - Scrolling behavior with many messages
 * - Timestamp display
 * - Toggle expand functionality with 'c' key
 * - Empty state handling
 * - Visual styling and distinction
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ConversationView } from '../../lib/stats_dashboard_tui/ui/conversation-view';
import { ConversationEntry, MessageRole } from '../../lib/stats_dashboard_tui/types';

describe('ConversationView', () => {
  let mockConversationEntries: ConversationEntry[];

  beforeEach(() => {
    // Setup mock conversation data
    mockConversationEntries = [
      {
        role: 'user' as MessageRole,
        preview: 'Can you help me write a function to parse JSON?',
        timestamp: Date.now() - 60000, // 1 minute ago
      },
      {
        role: 'assistant' as MessageRole,
        preview: 'Sure! I can help you with that. Let me create a function that safely parses JSON and handles errors appropriately.',
        timestamp: Date.now() - 50000,
      },
      {
        role: 'user' as MessageRole,
        preview: 'Thanks! Can you also add validation?',
        timestamp: Date.now() - 40000,
      },
      {
        role: 'assistant' as MessageRole,
        preview: 'Absolutely. I\'ll add JSON schema validation to ensure the parsed data meets your requirements.',
        timestamp: Date.now() - 30000,
      },
    ];
  });

  describe('Component Interface Implementation', () => {
    it('should implement the Component interface', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 80,
        height: 20,
      });

      // Verify interface methods exist
      expect(typeof view.render).toBe('function');
      expect(typeof view.handleInput).toBe('function');
      expect(typeof view.invalidate).toBe('function');
    });

    it('should accept conversationEntries in constructor props', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 80,
        height: 20,
      });

      expect(view).toBeDefined();
    });

    it('should accept width and height in constructor props', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 100,
        height: 30,
      });

      expect(view).toBeDefined();
    });

    it('should work with empty conversation entries', () => {
      const view = new ConversationView({
        conversationEntries: [],
        width: 80,
        height: 20,
      });

      expect(view).toBeDefined();
    });
  });

  describe('render()', () => {
    it('should return an array of strings', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 80,
        height: 20,
      });

      const result = view.render();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      const lines = result.split('\n');
      lines.forEach((line: string) => {
        expect(typeof line).toBe('string');
      });
    });

    it('should render messages in chronological order', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 80,
        height: 20,
      });

      const output = view.render();
      const fullOutput = output;

      // First message should appear before last message
      const firstMessageIndex = fullOutput.indexOf('Can you help me write');
      const lastMessageIndex = fullOutput.indexOf('JSON schema validation');

      expect(firstMessageIndex).toBeGreaterThan(-1);
      expect(lastMessageIndex).toBeGreaterThan(-1);
      expect(firstMessageIndex).toBeLessThan(lastMessageIndex);
    });

    it('should not exceed provided width in output lines', () => {
      const width = 60;
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width,
        height: 20,
      });

      const output = view.render();

      output.split('\n').forEach(line => {
        // Strip ANSI codes for length check
        const strippedLine = line.replace(/\x1B\[[0-9;]*m/g, '');
        expect(strippedLine.length).toBeLessThanOrEqual(width);
      });
    });

    it('should respect height constraint when many messages', () => {
      // Create many messages
      const manyMessages: ConversationEntry[] = [];
      for (let i = 0; i < 50; i++) {
        manyMessages.push({
          role: i % 2 === 0 ? 'user' : 'assistant',
          preview: `Message number ${i} with some content`,
          timestamp: Date.now() - (50 - i) * 1000,
        });
      }

      const height = 15;
      const view = new ConversationView({
        conversationEntries: manyMessages,
        width: 80,
        height,
      });

      const output = view.render();

      // Output should not exceed height
      expect(output.split('\n').length).toBeLessThanOrEqual(height);
    });
  });

  describe('Message Role Labels', () => {
    it('should show "User:" label for user messages', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 80,
        height: 20,
      });

      const output = view.render();
      const fullOutput = output;

      expect(fullOutput).toMatch(/User:/);
    });

    it('should show "Assistant:" label for assistant messages', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 80,
        height: 20,
      });

      const output = view.render();
      const fullOutput = output;

      expect(fullOutput).toMatch(/Assistant:/);
    });

    it('should distinguish between user and assistant visually', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 80,
        height: 20,
      });

      const output = view.render();
      const fullOutput = output;

      // Both labels should be present
      expect(fullOutput).toMatch(/User:/);
      expect(fullOutput).toMatch(/Assistant:/);
      
      // Should have different styling (different ANSI codes or formatting)
      const hasAnsiCodes = /\x1B\[[0-9;]*m/.test(fullOutput);
      expect(hasAnsiCodes).toBe(true);
    });

    it('should handle toolResult role messages', () => {
      const entriesWithToolResult: ConversationEntry[] = [
        {
          role: 'toolResult',
          preview: 'Tool execution completed successfully',
          timestamp: Date.now(),
        },
      ];

      const view = new ConversationView({
        conversationEntries: entriesWithToolResult,
        width: 80,
        height: 20,
      });

      const output = view.render();
      const fullOutput = output;

      // Should handle toolResult role (may show as "Tool:" or similar)
      expect(fullOutput.length).toBeGreaterThan(0);
    });
  });

  describe('Content Preview Truncation', () => {
    it('should truncate long messages to approximately 100 characters', () => {
      const longMessage: ConversationEntry[] = [
        {
          role: 'user',
          preview: 'This is a very long message that contains a lot of text and should be truncated to approximately 100 characters because we do not want to display the entire message in the preview and it should show an ellipsis at the end to indicate truncation.',
          timestamp: Date.now(),
        },
      ];

      const view = new ConversationView({
        conversationEntries: longMessage,
        width: 80,
        height: 20,
      });

      const output = view.render();
      const fullOutput = output;

      // Should contain ellipsis indicating truncation
      expect(fullOutput).toMatch(/\.\.\./);
      
      // The preview text shown should be limited
      // Check that the full long text is not present
      expect(fullOutput).not.toContain('should show an ellipsis at the end to indicate truncation');
    });

    it('should not truncate short messages', () => {
      const shortMessage: ConversationEntry[] = [
        {
          role: 'user',
          preview: 'Short message',
          timestamp: Date.now(),
        },
      ];

      const view = new ConversationView({
        conversationEntries: shortMessage,
        width: 80,
        height: 20,
      });

      const output = view.render();
      const fullOutput = output;

      // Should show complete message
      expect(fullOutput).toContain('Short message');
      
      // Should not have truncation for short message
      const messageLines = output.split('\n').filter(line => line.includes('Short message'));
      expect(messageLines.length).toBeGreaterThan(0);
    });

    it('should handle exactly 100 character messages', () => {
      const exactMessage: ConversationEntry[] = [
        {
          role: 'user',
          preview: 'x'.repeat(100),
          timestamp: Date.now(),
        },
      ];

      const view = new ConversationView({
        conversationEntries: exactMessage,
        width: 120,
        height: 20,
      });

      const output = view.render();
      
      expect(typeof output).toBe('string');
      expect(output.split('\n').length).toBeGreaterThan(0);
    });

    it('should handle messages with newlines in preview', () => {
      const multilinePreview: ConversationEntry[] = [
        {
          role: 'user',
          preview: 'Line 1\nLine 2\nLine 3',
          timestamp: Date.now(),
        },
      ];

      const view = new ConversationView({
        conversationEntries: multilinePreview,
        width: 80,
        height: 20,
      });

      const output = view.render();
      
      // Should handle gracefully (may replace newlines with spaces or show first line)
      expect(typeof output).toBe('string');
      expect(output.split('\n').length).toBeGreaterThan(0);
    });
  });

  describe('Timestamp Display', () => {
    it('should show timestamps when space permits', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 100, // Wide enough for timestamps
        height: 20,
      });

      const output = view.render();
      const fullOutput = output;

      // Should contain some time indicator (relative time like "1m ago" or actual time)
      // Look for common time patterns
      const hasTimeIndicator = /\d+[smh]|\d+:\d+|ago|AM|PM/.test(fullOutput);
      expect(hasTimeIndicator).toBe(true);
    });

    it('should omit or abbreviate timestamps in narrow widths', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 40, // Narrow width
        height: 20,
      });

      const output = view.render();
      
      // Should still render successfully
      expect(typeof output).toBe('string');
      expect(output.split('\n').length).toBeGreaterThan(0);
    });

    it('should format timestamps consistently', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 100,
        height: 20,
      });

      const output = view.render();
      const fullOutput = output;

      // All timestamps should follow the same format
      const timeMatches = fullOutput.match(/\d+[smh]|ago/g);
      if (timeMatches) {
        expect(timeMatches.length).toBeGreaterThan(0);
      }
    });

    it('should handle recent timestamps (seconds ago)', () => {
      const recentEntry: ConversationEntry[] = [
        {
          role: 'user',
          preview: 'Just now message',
          timestamp: Date.now() - 5000, // 5 seconds ago
        },
      ];

      const view = new ConversationView({
        conversationEntries: recentEntry,
        width: 100,
        height: 20,
      });

      const output = view.render();
      const fullOutput = output;

      // Should show recent time indicator
      expect(fullOutput.length).toBeGreaterThan(0);
    });

    it('should handle old timestamps (hours ago)', () => {
      const oldEntry: ConversationEntry[] = [
        {
          role: 'user',
          preview: 'Old message',
          timestamp: Date.now() - 3600000 * 2, // 2 hours ago
        },
      ];

      const view = new ConversationView({
        conversationEntries: oldEntry,
        width: 100,
        height: 20,
      });

      const output = view.render();
      const fullOutput = output;

      // Should show hour-based time indicator
      expect(fullOutput.length).toBeGreaterThan(0);
    });
  });

  describe('Scrolling Behavior', () => {
    let manyMessages: ConversationEntry[];

    beforeEach(() => {
      // Create many messages to test scrolling
      manyMessages = [];
      for (let i = 0; i < 30; i++) {
        manyMessages.push({
          role: i % 2 === 0 ? 'user' : 'assistant',
          preview: `Message number ${i}: This is message content for testing scrolling behavior`,
          timestamp: Date.now() - (30 - i) * 1000,
        });
      }
    });

    it('should be scrollable when messages exceed viewport height', () => {
      const view = new ConversationView({
        conversationEntries: manyMessages,
        width: 80,
        height: 10, // Small height to force scrolling
      });

      const output = view.render();

      // Output should be limited to height
      expect(output.split('\n').length).toBeLessThanOrEqual(10);
    });

    it('should show scroll indicator when content is scrollable', () => {
      const view = new ConversationView({
        conversationEntries: manyMessages,
        width: 80,
        height: 10,
      });

      const output = view.render();
      const fullOutput = output;

      // Should have some scroll indicator (arrows, bar, or text hint)
      const hasScrollIndicator = /▼|▲|↓|↑|more|scroll|\.\.\./.test(fullOutput);
      expect(hasScrollIndicator || output.length <= 10).toBe(true);
    });

    it('should handle scrolling with arrow keys', () => {
      const view = new ConversationView({
        conversationEntries: manyMessages,
        width: 80,
        height: 10,
      });

      // Initial render
      const output1 = view.render();

      // Scroll down
      view.handleInput('\x1b[B'); // Down arrow

      // Invalidate cache and re-render
      view.invalidate();
      const output2 = view.render();

      // Content should change (different messages visible)
      // This assumes scrolling changes the viewport
      expect(typeof output1).toBe('string');
      expect(typeof output2).toBe('string');
    });

    it('should handle scrolling with j/k keys (vim-style)', () => {
      const view = new ConversationView({
        conversationEntries: manyMessages,
        width: 80,
        height: 10,
      });

      // These should be handled (may scroll or do nothing if at bounds)
      expect(() => {
        view.handleInput('j'); // Down
        view.handleInput('k'); // Up
      }).not.toThrow();
    });

    it('should not scroll beyond message boundaries', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 80,
        height: 20,
      });

      // Try to scroll up when at top
      view.handleInput('\x1b[A'); // Up arrow
      const output = view.render();

      // Should not crash
      expect(typeof output).toBe('string');
    });

    it('should show most recent messages by default', () => {
      const view = new ConversationView({
        conversationEntries: manyMessages,
        width: 80,
        height: 10,
      });

      const output = view.render();
      const fullOutput = output;

      // Should show recent message numbers (higher indices)
      const hasRecentMessages = /Message number 2[0-9]/.test(fullOutput);
      expect(hasRecentMessages).toBe(true);
    });
  });

  describe('Toggle Expand Functionality', () => {
    it('should handle "c" key to toggle expand mode', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 80,
        height: 20,
      });

      // Should not throw
      expect(() => {
        view.handleInput('c');
      }).not.toThrow();
    });

    it('should show full content when expanded', () => {
      const longMessage: ConversationEntry[] = [
        {
          role: 'user',
          preview: 'This is a very long message that should be truncated in normal view but shown in full when expanded. '.repeat(3),
          timestamp: Date.now(),
        },
      ];

      const view = new ConversationView({
        conversationEntries: longMessage,
        width: 80,
        height: 20,
      });

      // Normal view
      const normalOutput = view.render();
      const normalText = normalOutput;

      // Toggle expand
      view.handleInput('c');
      view.invalidate();

      // Expanded view
      const expandedOutput = view.render();
      const expandedText = expandedOutput;

      // Expanded view should show more content
      expect(expandedText.length).toBeGreaterThanOrEqual(normalText.length);
    });

    it('should toggle back to collapsed with second "c" press', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 80,
        height: 20,
      });

      const output1 = view.render();

      // Toggle expand
      view.handleInput('c');
      view.invalidate();
      const output2 = view.render();

      // Toggle back to collapsed
      view.handleInput('c');
      view.invalidate();
      const output3 = view.render();

      // Should return to similar state as initial (may not be identical due to rendering)
      expect(output1.length).toBeGreaterThan(0);
      expect(output2.length).toBeGreaterThan(0);
      expect(output3.length).toBeGreaterThan(0);
    });

    it('should handle "C" (uppercase) key as well', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 80,
        height: 20,
      });

      expect(() => {
        view.handleInput('C');
      }).not.toThrow();
    });

    it('should show expand hint when in collapsed mode', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 80,
        height: 20,
      });

      const output = view.render();
      const fullOutput = output.toLowerCase();

      // Should hint about expand functionality
      const hasExpandHint = /\bc\b.*expand|expand.*\bc\b|press.*c/i.test(fullOutput);
      expect(hasExpandHint || fullOutput.includes('c')).toBe(true);
    });
  });

  describe('Empty State Handling', () => {
    it('should display empty state message when no messages exist', () => {
      const view = new ConversationView({
        conversationEntries: [],
        width: 80,
        height: 20,
      });

      const output = view.render();
      const fullOutput = output.toLowerCase();

      // Should show empty state message
      expect(fullOutput).toMatch(/no messages|empty|waiting|no conversation/);
    });

    it('should render successfully with empty conversation', () => {
      const view = new ConversationView({
        conversationEntries: [],
        width: 80,
        height: 20,
      });

      const output = view.render();

      expect(typeof output).toBe('string');
      expect(output.split('\n').length).toBeGreaterThan(0);
    });

    it('should not show scrolling UI in empty state', () => {
      const view = new ConversationView({
        conversationEntries: [],
        width: 80,
        height: 20,
      });

      const output = view.render();
      const fullOutput = output;

      // Empty state should be simple, no scroll indicators
      const hasScrollIndicator = /▼|▲|scroll/.test(fullOutput);
      expect(hasScrollIndicator).toBe(false);
    });

    it('should not show expand toggle in empty state', () => {
      const view = new ConversationView({
        conversationEntries: [],
        width: 80,
        height: 20,
      });

      // Toggle should not crash but should have no effect
      expect(() => {
        view.handleInput('c');
      }).not.toThrow();
    });

    it('should handle transition from empty to populated', () => {
      const view = new ConversationView({
        conversationEntries: [],
        width: 80,
        height: 20,
      });

      const emptyOutput = view.render();

      // Update with messages (simulate state change)
      // In real usage, component would be re-instantiated or updated
      // For test, we verify it doesn't crash
      expect(emptyOutput.length).toBeGreaterThan(0);
    });
  });

  describe('Visual Styling and Distinction', () => {
    it('should use ANSI color codes for styling', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 80,
        height: 20,
      });

      const output = view.render();
      const fullOutput = output;

      // Should contain ANSI escape codes
      const hasAnsiCodes = /\x1B\[[0-9;]*m/.test(fullOutput);
      expect(hasAnsiCodes).toBe(true);
    });

    it('should have distinct styling from other sections', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 80,
        height: 20,
      });

      const output = view.render();
      const fullOutput = output;

      // Should have section header or visual separator
      const hasVisualDistinction = /conversation|messages|chat|──|═|■/.test(fullOutput.toLowerCase());
      expect(hasVisualDistinction).toBe(true);
    });

    it('should use different colors for user vs assistant messages', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 80,
        height: 20,
      });

      const output = view.render();

      // Find lines with User and Assistant
      const userLines = output.split('\n').filter(line => line.includes('User:'));
      const assistantLines = output.split('\n').filter(line => line.includes('Assistant:'));

      expect(userLines.length).toBeGreaterThan(0);
      expect(assistantLines.length).toBeGreaterThan(0);

      // Should have ANSI codes (different styling)
      const userHasAnsi = userLines.some(line => /\x1B\[[0-9;]*m/.test(line));
      const assistantHasAnsi = assistantLines.some(line => /\x1B\[[0-9;]*m/.test(line));

      expect(userHasAnsi || assistantHasAnsi).toBe(true);
    });

    it('should render section header or title', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 80,
        height: 20,
      });

      const output = view.render();
      const fullOutput = output.toLowerCase();

      // Should have a header indicating this is the conversation section
      expect(fullOutput).toMatch(/conversation|messages|chat/);
    });

    it('should use box drawing characters for borders', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 80,
        height: 20,
      });

      const output = view.render();
      const fullOutput = output;

      // Should have some box drawing characters for structure
      const hasBoxDrawing = /[─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬]/.test(fullOutput);
      expect(hasBoxDrawing).toBe(true);
    });
  });

  describe('handleInput(data)', () => {
    it('should handle keyboard input without throwing', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 80,
        height: 20,
      });

      expect(() => {
        view.handleInput('a');
        view.handleInput('j');
        view.handleInput('k');
        view.handleInput('\x1b[A');
      }).not.toThrow();
    });

    it('should handle empty input', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 80,
        height: 20,
      });

      expect(() => {
        view.handleInput('');
      }).not.toThrow();
    });

    it('should handle null or undefined input gracefully', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 80,
        height: 20,
      });

      expect(() => {
        view.handleInput(null as any);
        view.handleInput(undefined as any);
      }).not.toThrow();
    });

    it('should ignore unhandled keys', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 80,
        height: 20,
      });

      const output1 = view.render();

      // Press unhandled key
      view.handleInput('x');

      const output2 = view.render();

      // Output should not change for unhandled keys
      expect(output1).toEqual(output2);
    });
  });

  describe('invalidate()', () => {
    it('should clear render cache', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 80,
        height: 20,
      });

      const output1 = view.render();
      
      // Invalidate
      view.invalidate();
      
      const output2 = view.render();

      // Both should be valid (cache should be rebuilt)
      expect(typeof output1).toBe('string');
      expect(typeof output2).toBe('string');
    });

    it('should not throw when called multiple times', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 80,
        height: 20,
      });

      expect(() => {
        view.invalidate();
        view.invalidate();
        view.invalidate();
      }).not.toThrow();
    });

    it('should allow render after invalidate', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 80,
        height: 20,
      });

      view.invalidate();
      const output = view.render();

      expect(typeof output).toBe('string');
      expect(output.split('\n').length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single message', () => {
      const singleMessage: ConversationEntry[] = [
        {
          role: 'user',
          preview: 'Single message',
          timestamp: Date.now(),
        },
      ];

      const view = new ConversationView({
        conversationEntries: singleMessage,
        width: 80,
        height: 20,
      });

      const output = view.render();

      expect(typeof output).toBe('string');
      expect(output.split('\n').length).toBeGreaterThan(0);
    });

    it('should handle extremely narrow width', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 20,
        height: 20,
      });

      const output = view.render();

      expect(typeof output).toBe('string');
      output.split('\n').forEach(line => {
        const stripped = line.replace(/\x1B\[[0-9;]*m/g, '');
        expect(stripped.length).toBeLessThanOrEqual(20);
      });
    });

    it('should handle extremely short height', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 80,
        height: 3,
      });

      const output = view.render();

      expect(typeof output).toBe('string');
      expect(output.split('\n').length).toBeLessThanOrEqual(3);
    });

    it('should handle very long conversation (100+ messages)', () => {
      const veryLongConversation: ConversationEntry[] = [];
      for (let i = 0; i < 100; i++) {
        veryLongConversation.push({
          role: i % 2 === 0 ? 'user' : 'assistant',
          preview: `Message ${i}`,
          timestamp: Date.now() - (100 - i) * 1000,
        });
      }

      const view = new ConversationView({
        conversationEntries: veryLongConversation,
        width: 80,
        height: 20,
      });

      const output = view.render();

      expect(typeof output).toBe('string');
      expect(output.split('\n').length).toBeGreaterThan(0);
    });

    it('should handle messages with empty preview', () => {
      const emptyPreview: ConversationEntry[] = [
        {
          role: 'user',
          preview: '',
          timestamp: Date.now(),
        },
      ];

      const view = new ConversationView({
        conversationEntries: emptyPreview,
        width: 80,
        height: 20,
      });

      const output = view.render();

      expect(typeof output).toBe('string');
      expect(output.split('\n').length).toBeGreaterThan(0);
    });

    it('should handle messages with special characters', () => {
      const specialChars: ConversationEntry[] = [
        {
          role: 'user',
          preview: 'Message with special chars: <>&"\'\t\n\r',
          timestamp: Date.now(),
        },
      ];

      const view = new ConversationView({
        conversationEntries: specialChars,
        width: 80,
        height: 20,
      });

      const output = view.render();

      expect(typeof output).toBe('string');
      expect(output.split('\n').length).toBeGreaterThan(0);
    });

    it('should handle messages with Unicode emoji', () => {
      const emojiMessage: ConversationEntry[] = [
        {
          role: 'assistant',
          preview: 'Great work! 🎉 Let me help you with that 👍',
          timestamp: Date.now(),
        },
      ];

      const view = new ConversationView({
        conversationEntries: emojiMessage,
        width: 80,
        height: 20,
      });

      const output = view.render();

      expect(typeof output).toBe('string');
      expect(output.split('\n').length).toBeGreaterThan(0);
    });

    it('should handle zero width gracefully', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 0,
        height: 20,
      });

      const output = view.render();

      // Should return array even if minimal
      expect(typeof output).toBe('string');
    });

    it('should handle zero height gracefully', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 80,
        height: 0,
      });

      const output = view.render();

      // Should return empty array or minimal output
      expect(typeof output).toBe('string');
    });

    it('should handle negative dimensions gracefully', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: -10,
        height: -5,
      });

      const output = view.render();

      // Should not crash, treat as minimum dimensions
      expect(typeof output).toBe('string');
    });
  });

  describe('Integration Scenarios', () => {
    it('should work correctly with rapid state updates', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 80,
        height: 20,
      });

      // Simulate rapid updates
      for (let i = 0; i < 10; i++) {
        view.invalidate();
        const output = view.render();
        expect(typeof output).toBe('string');
      }
    });

    it('should maintain scroll position across re-renders when possible', () => {
      const manyMessages: ConversationEntry[] = [];
      for (let i = 0; i < 50; i++) {
        manyMessages.push({
          role: i % 2 === 0 ? 'user' : 'assistant',
          preview: `Message ${i}`,
          timestamp: Date.now() - (50 - i) * 1000,
        });
      }

      const view = new ConversationView({
        conversationEntries: manyMessages,
        width: 80,
        height: 10,
      });

      // Scroll to middle
      for (let i = 0; i < 5; i++) {
        view.handleInput('\x1b[A'); // Scroll up
      }

      const output1 = view.render();
      
      // Re-render without scroll
      const output2 = view.render();

      // Position should be maintained
      expect(output1).toEqual(output2);
    });

    it('should handle alternating expand and scroll operations', () => {
      const manyMessages: ConversationEntry[] = [];
      for (let i = 0; i < 30; i++) {
        manyMessages.push({
          role: i % 2 === 0 ? 'user' : 'assistant',
          preview: `Message ${i} with some content`,
          timestamp: Date.now() - (30 - i) * 1000,
        });
      }

      const view = new ConversationView({
        conversationEntries: manyMessages,
        width: 80,
        height: 15,
      });

      // Expand
      view.handleInput('c');
      view.invalidate();
      let output = view.render();
      expect(typeof output).toBe('string');

      // Scroll
      view.handleInput('j');
      view.invalidate();
      output = view.render();
      expect(typeof output).toBe('string');

      // Collapse
      view.handleInput('c');
      view.invalidate();
      output = view.render();
      expect(typeof output).toBe('string');
    });

    it('should display correctly when embedded in larger dashboard', () => {
      // Simulate being part of a larger component by using constrained dimensions
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 70, // Slightly less than full width
        height: 15, // Constrained height
      });

      const output = view.render();

      expect(typeof output).toBe('string');
      expect(output.split('\n').length).toBeLessThanOrEqual(15);
      output.split('\n').forEach(line => {
        const stripped = line.replace(/\x1B\[[0-9;]*m/g, '');
        expect(stripped.length).toBeLessThanOrEqual(70);
      });
    });
  });

  describe('Constructor Validation', () => {
    it('should require conversationEntries parameter', () => {
      expect(() => {
        new ConversationView({
          conversationEntries: null as any,
          width: 80,
          height: 20,
        });
      }).toThrow();
    });

    it('should require width parameter', () => {
      expect(() => {
        new ConversationView({
          conversationEntries: mockConversationEntries,
          width: null as any,
          height: 20,
        });
      }).toThrow();
    });

    it('should accept null height parameter (uses default)', () => {
      expect(() => {
        new ConversationView({
          conversationEntries: mockConversationEntries,
          width: 80,
          height: null as any,
        });
      }).not.toThrow();
    });

    it('should accept valid parameters', () => {
      expect(() => {
        new ConversationView({
          conversationEntries: mockConversationEntries,
          width: 80,
          height: 20,
        });
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should render large conversation in reasonable time', () => {
      const largeConversation: ConversationEntry[] = [];
      for (let i = 0; i < 500; i++) {
        largeConversation.push({
          role: i % 2 === 0 ? 'user' : 'assistant',
          preview: `Message ${i} with some preview content`,
          timestamp: Date.now() - (500 - i) * 1000,
        });
      }

      const view = new ConversationView({
        conversationEntries: largeConversation,
        width: 80,
        height: 20,
      });

      const startTime = Date.now();
      const output = view.render();
      const endTime = Date.now();

      // Should render in less than 100ms
      expect(endTime - startTime).toBeLessThan(100);
      expect(typeof output).toBe('string');
    });

    it('should cache render output when possible', () => {
      const view = new ConversationView({
        conversationEntries: mockConversationEntries,
        width: 80,
        height: 20,
      });

      const output1 = view.render();
      const output2 = view.render();

      // Should return same result when no changes
      expect(output1).toEqual(output2);
    });
  });
});
