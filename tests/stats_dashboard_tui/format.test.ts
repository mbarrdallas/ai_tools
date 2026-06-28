/**
 * Formatting Utilities Test Suite
 * 
 * Tests for formatting utilities in utils/format.ts
 * 
 * These tests verify:
 * - Token count formatting (K, M suffixes)
 * - Duration formatting (ms, s, m, h)
 * - Cost formatting (USD with proper precision)
 * - Tool argument summarization by tool type
 * - Text truncation with ellipsis
 * - Error message extraction from tool results
 * - Edge case handling (null, undefined, empty, very large numbers)
 * 
 * Tests are written BEFORE implementation (TDD).
 */

import { describe, it, expect } from '@jest/globals';

// Import functions that will be implemented
// These imports will fail until format.ts is created
import {
  formatTokens,
  formatDuration,
  formatCost,
  formatToolArgs,
  truncateText,
  extractErrorMessage,
} from '@shared/stats_dashboard_tui/utils/format';

describe('Formatting Utilities', () => {
  describe('formatTokens', () => {
    it('should format small numbers without suffix', () => {
      expect(formatTokens(0)).toBe('0');
      expect(formatTokens(1)).toBe('1');
      expect(formatTokens(10)).toBe('10');
      expect(formatTokens(100)).toBe('100');
      expect(formatTokens(999)).toBe('999');
    });

    it('should format thousands with K suffix', () => {
      expect(formatTokens(1000)).toBe('1.0k');
      expect(formatTokens(1200)).toBe('1.2k');
      expect(formatTokens(1500)).toBe('1.5k');
      expect(formatTokens(10000)).toBe('10.0k');
      expect(formatTokens(12345)).toBe('12.3k');
      expect(formatTokens(99999)).toBe('100.0k'); // Rounds up
    });

    it('should format millions with M suffix', () => {
      expect(formatTokens(1000000)).toBe('1.0M');
      expect(formatTokens(1500000)).toBe('1.5M');
      expect(formatTokens(2340000)).toBe('2.3M');
      expect(formatTokens(10000000)).toBe('10.0M');
      expect(formatTokens(123456789)).toBe('123.5M');
    });

    it('should handle edge cases', () => {
      expect(formatTokens(0)).toBe('0');
      expect(formatTokens(-100)).toBe('0'); // Negative should be treated as 0
      expect(formatTokens(500.5)).toBe('501'); // Should handle floats (Issue 1: standard rounding)
      expect(formatTokens(1234.56)).toBe('1.2k'); // Float thousands
    });

    it('should handle very large numbers', () => {
      expect(formatTokens(1000000000)).toBe('1000.0M');
      expect(formatTokens(999999999)).toBe('1000.0M');
    });

    it('should handle null and undefined gracefully', () => {
      expect(formatTokens(null as any)).toBe('0');
      expect(formatTokens(undefined as any)).toBe('0');
      expect(formatTokens(NaN)).toBe('0');
    });

    it('should round to one decimal place', () => {
      expect(formatTokens(1234)).toBe('1.2k'); // Not 1.23k
      expect(formatTokens(1256)).toBe('1.3k'); // Rounds up
      expect(formatTokens(1999)).toBe('2.0k'); // Rounds up
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds for durations < 1000ms', () => {
      expect(formatDuration(0)).toBe('0ms');
      expect(formatDuration(1)).toBe('1ms');
      expect(formatDuration(50)).toBe('50ms');
      expect(formatDuration(250)).toBe('250ms');
      expect(formatDuration(999)).toBe('999ms');
    });

    it('should format seconds for durations 1s to 59s', () => {
      expect(formatDuration(1000)).toBe('1.0s');
      expect(formatDuration(1500)).toBe('1.5s');
      expect(formatDuration(2345)).toBe('2.3s');
      expect(formatDuration(10000)).toBe('10.0s');
      expect(formatDuration(59999)).toBe('60.0s');
    });

    it('should format minutes and seconds for durations 1m to 59m', () => {
      expect(formatDuration(60000)).toBe('1m 0s');
      expect(formatDuration(90000)).toBe('1m 30s');
      expect(formatDuration(125000)).toBe('2m 5s');
      expect(formatDuration(600000)).toBe('10m 0s');
      expect(formatDuration(3599000)).toBe('59m 59s');
    });

    it('should format hours and minutes for durations >= 1h', () => {
      expect(formatDuration(3600000)).toBe('1h 0m');
      expect(formatDuration(3660000)).toBe('1h 1m');
      expect(formatDuration(5400000)).toBe('1h 30m');
      expect(formatDuration(7200000)).toBe('2h 0m');
      expect(formatDuration(86400000)).toBe('24h 0m'); // 1 day
    });

    it('should handle edge cases', () => {
      expect(formatDuration(0)).toBe('0ms');
      expect(formatDuration(-100)).toBe('0ms'); // Negative should be 0
      expect(formatDuration(500.7)).toBe('501ms'); // Float should be rounded (Issue 2: standard rounding)
    });

    it('should handle null and undefined gracefully', () => {
      expect(formatDuration(null as any)).toBe('0ms');
      expect(formatDuration(undefined as any)).toBe('0ms');
      expect(formatDuration(NaN)).toBe('0ms');
    });

    it('should handle very large durations', () => {
      expect(formatDuration(360000000)).toBe('100h 0m'); // 100 hours
    });

    it('should not show seconds in hour format', () => {
      expect(formatDuration(3665000)).toBe('1h 1m'); // 1h 1m 5s -> 1h 1m
    });
  });

  describe('formatCost', () => {
    it('should format zero cost', () => {
      expect(formatCost(0)).toBe('$0.00');
    });

    it('should format small costs with 4 decimal places', () => {
      expect(formatCost(0.0001)).toBe('$0.0001');
      expect(formatCost(0.0012)).toBe('$0.0012');
      expect(formatCost(0.0099)).toBe('$0.0099');
    });

    it('should format medium costs with 2 decimal places', () => {
      expect(formatCost(0.01)).toBe('$0.01');
      expect(formatCost(0.10)).toBe('$0.10');
      expect(formatCost(0.99)).toBe('$0.99');
      expect(formatCost(1.23)).toBe('$1.23');
      expect(formatCost(10.50)).toBe('$10.50');
    });

    it('should format large costs with proper comma separators', () => {
      expect(formatCost(100.00)).toBe('$100.00');
      expect(formatCost(1000.00)).toBe('$1,000.00');
      expect(formatCost(1234.56)).toBe('$1,234.56');
      expect(formatCost(10000.99)).toBe('$10,000.99');
      expect(formatCost(1000000.00)).toBe('$1,000,000.00');
    });

    it('should handle very small costs', () => {
      expect(formatCost(0.00001)).toBe('$0.0000');
      expect(formatCost(0.000001)).toBe('$0.0000');
    });

    it('should handle edge cases', () => {
      expect(formatCost(-10)).toBe('$0.00'); // Negative should be 0
      expect(formatCost(0.005)).toBe('$0.0050'); // Issue 3: Falls under small value format (< $0.01)
      expect(formatCost(0.0005)).toBe('$0.0005');
    });

    it('should handle null and undefined gracefully', () => {
      expect(formatCost(null as any)).toBe('$0.00');
      expect(formatCost(undefined as any)).toBe('$0.00');
      expect(formatCost(NaN)).toBe('$0.00');
    });

    it('should preserve precision for fractional cents', () => {
      expect(formatCost(0.001234)).toBe('$0.0012');
      expect(formatCost(0.009999)).toBe('$0.0100'); // Rounds
    });
  });

  describe('formatToolArgs', () => {
    describe('bash tool', () => {
      it('should format bash command', () => {
        expect(formatToolArgs('bash', { command: 'ls -la' }))
          .toBe('ls -la');
      });

      it('should truncate long bash commands', () => {
        const longCommand = 'echo ' + 'a'.repeat(100);
        const result = formatToolArgs('bash', { command: longCommand });
        expect(result.length).toBeLessThanOrEqual(53); // 50 + "..."
        expect(result).toContain('...');
      });

      it('should handle missing command', () => {
        expect(formatToolArgs('bash', {}))
          .toBe('(no command)');
      });
    });

    describe('read tool', () => {
      it('should format read with path only', () => {
        expect(formatToolArgs('read', { path: '/home/user/file.txt' }))
          .toBe('/home/user/file.txt');
      });

      it('should format read with path and offset', () => {
        expect(formatToolArgs('read', { path: 'file.txt', offset: 100 }))
          .toBe('file.txt (offset: 100)');
      });

      it('should format read with path, offset, and limit', () => {
        expect(formatToolArgs('read', { path: 'file.txt', offset: 100, limit: 50 }))
          .toBe('file.txt (offset: 100, limit: 50)');
      });

      it('should truncate long paths', () => {
        const longPath = '/very/long/path/' + 'a'.repeat(100) + '/file.txt';
        const result = formatToolArgs('read', { path: longPath });
        expect(result.length).toBeLessThanOrEqual(53);
        expect(result).toContain('...');
      });

      it('should handle missing path', () => {
        expect(formatToolArgs('read', {}))
          .toBe('(no path)');
      });
    });

    describe('write tool', () => {
      it('should format write with path and content length', () => {
        expect(formatToolArgs('write', { path: 'file.txt', content: 'hello world' }))
          .toBe('file.txt (11 chars)');
      });

      it('should format write with long content', () => {
        const longContent = 'x'.repeat(5000);
        expect(formatToolArgs('write', { path: 'output.txt', content: longContent }))
          .toBe('output.txt (5000 chars)');
      });

      it('should handle missing content', () => {
        expect(formatToolArgs('write', { path: 'file.txt' }))
          .toBe('file.txt (0 chars)');
      });

      it('should handle missing path', () => {
        expect(formatToolArgs('write', { content: 'test' }))
          .toBe('(no path) (4 chars)');
      });
    });

    describe('grep tool', () => {
      it('should format grep with pattern only', () => {
        expect(formatToolArgs('grep', { pattern: 'TODO' }))
          .toBe('pattern: "TODO"');
      });

      it('should format grep with pattern and path', () => {
        expect(formatToolArgs('grep', { pattern: 'error', path: './src' }))
          .toBe('pattern: "error" in ./src');
      });

      it('should truncate long patterns', () => {
        const longPattern = 'a'.repeat(60);
        const result = formatToolArgs('grep', { pattern: longPattern });
        expect(result.length).toBeLessThanOrEqual(60);
        expect(result).toContain('...');
      });

      it('should handle missing pattern', () => {
        expect(formatToolArgs('grep', {}))
          .toBe('(no pattern)');
      });
    });

    describe('find tool', () => {
      it('should format find with pattern only', () => {
        expect(formatToolArgs('find', { pattern: '*.ts' }))
          .toBe('pattern: "*.ts"');
      });

      it('should format find with pattern and path', () => {
        expect(formatToolArgs('find', { pattern: '*.json', path: './config' }))
          .toBe('pattern: "*.json" in ./config');
      });

      it('should handle missing pattern', () => {
        expect(formatToolArgs('find', {}))
          .toBe('(no pattern)');
      });
    });

    describe('subagent tool', () => {
      it('should format subagent with agent name', () => {
        expect(formatToolArgs('subagent', { agent: 'scout' }))
          .toBe('agent: scout');
      });

      it('should format subagent with agent and task', () => {
        expect(formatToolArgs('subagent', { agent: 'designer', task: 'Create UI mockup' }))
          .toBe('agent: designer, task: "Create UI mockup"');
      });

      it('should truncate long task descriptions', () => {
        const longTask = 'This is a very long task description that should be truncated because it exceeds the maximum length';
        const result = formatToolArgs('subagent', { agent: 'worker', task: longTask });
        expect(result.length).toBeLessThanOrEqual(70);
        expect(result).toContain('...');
      });

      it('should handle missing agent', () => {
        expect(formatToolArgs('subagent', {}))
          .toBe('(no agent)');
      });
    });

    describe('unknown tools', () => {
      it('should format unknown tool with generic args display', () => {
        expect(formatToolArgs('custom_tool', { arg1: 'value1', arg2: 'value2' }))
          .toContain('arg1');
        expect(formatToolArgs('custom_tool', { arg1: 'value1', arg2: 'value2' }))
          .toContain('arg2');
      });

      it('should handle unknown tool with no args', () => {
        expect(formatToolArgs('unknown_tool', {}))
          .toBe('(no args)');
      });

      it('should truncate generic args summary', () => {
        const manyArgs = {};
        for (let i = 0; i < 20; i++) {
          (manyArgs as any)[`arg${i}`] = `value${i}`;
        }
        const result = formatToolArgs('custom_tool', manyArgs);
        expect(result.length).toBeLessThanOrEqual(80);
      });
    });

    describe('edge cases', () => {
      it('should handle null args', () => {
        expect(formatToolArgs('bash', null as any))
          .toBe('(no args)');
      });

      it('should handle undefined args', () => {
        expect(formatToolArgs('read', undefined as any))
          .toBe('(no args)');
      });

      it('should handle empty tool name', () => {
        expect(formatToolArgs('', { key: 'value' }))
          .toContain('key');
      });

      it('should handle null tool name', () => {
        expect(formatToolArgs(null as any, { key: 'value' }))
          .toContain('key');
      });
    });
  });

  describe('truncateText', () => {
    it('should not truncate text shorter than maxLength', () => {
      expect(truncateText('short', 10)).toBe('short');
      expect(truncateText('hello', 5)).toBe('hello');
      expect(truncateText('test', 100)).toBe('test');
    });

    it('should truncate text longer than maxLength', () => {
      expect(truncateText('hello world', 8)).toBe('hello...');
      expect(truncateText('this is a long text', 10)).toBe('this is...');
      expect(truncateText('abcdefghijk', 5)).toBe('ab...');
    });

    it('should handle exact maxLength', () => {
      expect(truncateText('hello', 5)).toBe('hello');
      expect(truncateText('hello!', 6)).toBe('hello!');
    });

    it('should handle very short maxLength', () => {
      expect(truncateText('hello', 3)).toBe('...');
      expect(truncateText('hello', 4)).toBe('h...');
      expect(truncateText('hello', 2)).toBe('...');
    });

    it('should handle empty string', () => {
      expect(truncateText('', 10)).toBe('');
      expect(truncateText('', 0)).toBe('');
    });

    it('should handle edge cases', () => {
      expect(truncateText(null as any, 10)).toBe('');
      expect(truncateText(undefined as any, 10)).toBe('');
      expect(truncateText('test', 0)).toBe('...');
      expect(truncateText('test', -5)).toBe('...');
    });

    it('should preserve the first part of text', () => {
      const text = 'The quick brown fox jumps over the lazy dog';
      const result = truncateText(text, 15);
      expect(result).toBe('The quick br...'); // Issue 4: maxLength-3 = 12 chars of text + 3 ellipsis = 15 total
      expect(result.startsWith('The')).toBe(true);
    });

    it('should handle multi-line text', () => {
      const multiline = 'line1\nline2\nline3';
      expect(truncateText(multiline, 10)).toBe('line1\nl...'); // Issue 5: 10-3 = 7 chars of text + 3 ellipsis = 10 total
    });

    it('should handle unicode characters', () => {
      expect(truncateText('hello 👋 world', 10)).toBe('hello 👋...');
    });
  });

  describe('extractErrorMessage', () => {
    it('should extract error from result with error property', () => {
      const result = {
        error: 'Command not found: foo',
        stderr: 'some stderr',
      };
      expect(extractErrorMessage(result)).toBe('Command not found: foo');
    });

    it('should extract error from result with errorMessage property', () => {
      const result = {
        errorMessage: 'File not found',
      };
      expect(extractErrorMessage(result)).toBe('File not found');
    });

    it('should extract error from result with message property', () => {
      const result = {
        message: 'Invalid input provided',
      };
      expect(extractErrorMessage(result)).toBe('Invalid input provided');
    });

    it('should extract stderr when no error property exists', () => {
      const result = {
        stderr: 'bash: command not found',
        stdout: 'some output',
      };
      expect(extractErrorMessage(result)).toBe('bash: command not found');
    });

    it('should prefer error over stderr', () => {
      const result = {
        error: 'Primary error message',
        stderr: 'Secondary stderr message',
      };
      expect(extractErrorMessage(result)).toBe('Primary error message');
    });

    it('should handle Error objects', () => {
      const result = new Error('Something went wrong');
      expect(extractErrorMessage(result)).toBe('Something went wrong');
    });

    it('should handle string results as error messages', () => {
      expect(extractErrorMessage('Simple error string')).toBe('Simple error string');
    });

    it('should handle empty error messages', () => {
      expect(extractErrorMessage({ error: '' })).toBe('Unknown error');
      expect(extractErrorMessage({ stderr: '' })).toBe('Unknown error');
      expect(extractErrorMessage('')).toBe('Unknown error');
    });

    it('should handle null and undefined', () => {
      expect(extractErrorMessage(null)).toBe('Unknown error');
      expect(extractErrorMessage(undefined)).toBe('Unknown error');
    });

    it('should handle objects with no error information', () => {
      expect(extractErrorMessage({ stdout: 'output only' })).toBe('Unknown error');
      expect(extractErrorMessage({})).toBe('Unknown error');
    });

    it('should truncate very long error messages', () => {
      const longError = 'Error: ' + 'a'.repeat(500);
      const result = extractErrorMessage({ error: longError });
      expect(result.length).toBeLessThanOrEqual(203); // 200 + "..."
      expect(result).toContain('...');
    });

    it('should handle nested error objects', () => {
      const result = {
        error: {
          message: 'Nested error message',
        },
      };
      expect(extractErrorMessage(result)).toBe('Nested error message');
    });

    it('should handle stack traces by extracting first line', () => {
      const result = {
        error: 'Error: Something failed\n    at Object.<anonymous> (/path/to/file.js:10:15)\n    at Module._compile',
      };
      const extracted = extractErrorMessage(result);
      expect(extracted).toContain('Something failed');
    });

    it('should handle non-string error values', () => {
      expect(extractErrorMessage({ error: 123 })).toBe('123');
      expect(extractErrorMessage({ error: true })).toBe('true');
      expect(extractErrorMessage({ error: { code: 'ERR_001' } })).toContain('ERR_001');
    });
  });

  describe('Integration scenarios', () => {
    it('should format complete tool call display', () => {
      // Simulating what UI component would do
      const toolCall = {
        toolName: 'bash',
        args: { command: 'npm install' },
        duration: 12500,
      };

      const argsDisplay = formatToolArgs(toolCall.toolName, toolCall.args);
      const durationDisplay = formatDuration(toolCall.duration);

      expect(argsDisplay).toBe('npm install');
      expect(durationDisplay).toBe('12.5s');
    });

    it('should format agent metrics summary', () => {
      // Simulating metrics display
      const metrics = {
        inputTokens: 15430,
        outputTokens: 2340,
        totalCost: 0.0234,
      };

      const inputDisplay = formatTokens(metrics.inputTokens);
      const outputDisplay = formatTokens(metrics.outputTokens);
      const costDisplay = formatCost(metrics.totalCost);

      expect(inputDisplay).toBe('15.4k');
      expect(outputDisplay).toBe('2.3k');
      expect(costDisplay).toBe('$0.02'); // Rounded
    });

    it('should format failed tool call with error', () => {
      const toolCall = {
        toolName: 'read',
        args: { path: '/nonexistent/file.txt' },
        duration: 50,
        result: {
          error: 'ENOENT: no such file or directory',
        },
      };

      const argsDisplay = formatToolArgs(toolCall.toolName, toolCall.args);
      const durationDisplay = formatDuration(toolCall.duration);
      const errorDisplay = extractErrorMessage(toolCall.result);

      expect(argsDisplay).toBe('/nonexistent/file.txt');
      expect(durationDisplay).toBe('50ms');
      expect(errorDisplay).toBe('ENOENT: no such file or directory');
    });

    it('should format conversation preview', () => {
      const messageContent = 'This is a very long message that needs to be truncated for the conversation preview display because it exceeds the maximum preview length we want to show in the UI';

      const preview = truncateText(messageContent, 100);

      expect(preview.length).toBeLessThanOrEqual(103); // 100 + "..."
      expect(preview).toContain('This is a very long message');
    });

    it('should handle zero values consistently', () => {
      expect(formatTokens(0)).toBe('0');
      expect(formatDuration(0)).toBe('0ms');
      expect(formatCost(0)).toBe('$0.00');
    });

    it('should handle all null/undefined inputs gracefully', () => {
      // Ensure no exceptions are thrown
      expect(() => formatTokens(null as any)).not.toThrow();
      expect(() => formatDuration(undefined as any)).not.toThrow();
      expect(() => formatCost(NaN)).not.toThrow();
      expect(() => formatToolArgs(null as any, null as any)).not.toThrow();
      expect(() => truncateText(null as any, 10)).not.toThrow();
      expect(() => extractErrorMessage(null)).not.toThrow();
    });
  });
});
