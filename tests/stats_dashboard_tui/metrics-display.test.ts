/**
 * Metrics Display Component Test Suite
 * 
 * Tests for metrics-display.ts UI component (Task T9)
 * 
 * These tests verify:
 * - Metrics section rendering
 * - Token counts (input, output, cache read/write) with formatting
 * - Cost display in USD format
 * - Context window progress bar with percentage
 * - High context warning color (>=80%)
 * - Turn count display
 * - Layout clarity and readability
 * - Render caching for performance
 * - Edge case handling (zero values, missing data, extreme values)
 * 
 * Tests are written BEFORE implementation (TDD).
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Import types
import type { AgentMetrics } from '@lib/stats_dashboard_tui/types';

// Import component that will be implemented
// This import will fail until metrics-display.ts is created
import { MetricsDisplay } from '@lib/stats_dashboard_tui/ui/metrics-display';

describe('MetricsDisplay Component', () => {
  // Mock theme for color testing
  const mockTheme = {
    fg: jest.fn((style: string, text: string) => `[${style}]${text}[/${style}]`),
    bg: jest.fn((style: string, text: string) => `[bg:${style}]${text}[/bg:${style}]`),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Initialization', () => {
    it('should create instance with valid metrics', () => {
      const metrics: AgentMetrics = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 200,
        cacheWriteTokens: 100,
        totalCost: 0.05,
        contextTokens: 5000,
        contextLimit: 10000,
        turnCount: 3,
      };

      const display = new MetricsDisplay(metrics, mockTheme);

      expect(display).toBeDefined();
      expect(display).toBeInstanceOf(MetricsDisplay);
    });

    it('should handle null theme with default formatting', () => {
      const metrics: AgentMetrics = {
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0.01,
        contextTokens: 1000,
        contextLimit: 10000,
        turnCount: 1,
      };

      const display = new MetricsDisplay(metrics, null as any);

      expect(display).toBeDefined();
    });

    it('should handle zero metrics', () => {
      const metrics: AgentMetrics = {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0,
        contextTokens: 0,
        contextLimit: 10000,
        turnCount: 0,
      };

      const display = new MetricsDisplay(metrics, mockTheme);

      expect(display).toBeDefined();
    });
  });

  describe('Token Display', () => {
    it('should display input tokens with formatted count', () => {
      const metrics: AgentMetrics = {
        inputTokens: 15430,
        outputTokens: 500,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0.05,
        contextTokens: 5000,
        contextLimit: 10000,
        turnCount: 1,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      expect(rendered).toContain('Input');
      expect(rendered).toContain('15.4k'); // Formatted tokens
    });

    it('should display output tokens with formatted count', () => {
      const metrics: AgentMetrics = {
        inputTokens: 1000,
        outputTokens: 2340,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0.05,
        contextTokens: 5000,
        contextLimit: 10000,
        turnCount: 1,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      expect(rendered).toContain('Output');
      expect(rendered).toContain('2.3k');
    });

    it('should display cache read tokens', () => {
      const metrics: AgentMetrics = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 3200,
        cacheWriteTokens: 0,
        totalCost: 0.05,
        contextTokens: 5000,
        contextLimit: 10000,
        turnCount: 1,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      expect(rendered).toContain('Cache Read');
      expect(rendered).toContain('3.2k');
    });

    it('should display cache write tokens', () => {
      const metrics: AgentMetrics = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 0,
        cacheWriteTokens: 1500,
        totalCost: 0.05,
        contextTokens: 5000,
        contextLimit: 10000,
        turnCount: 1,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      expect(rendered).toContain('Cache Write');
      expect(rendered).toContain('1.5k');
    });

    it('should display zero tokens without formatting', () => {
      const metrics: AgentMetrics = {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0,
        contextTokens: 0,
        contextLimit: 10000,
        turnCount: 0,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      expect(rendered).toContain('0');
    });

    it('should display very large token counts with M suffix', () => {
      const metrics: AgentMetrics = {
        inputTokens: 1500000,
        outputTokens: 2340000,
        cacheReadTokens: 500000,
        cacheWriteTokens: 750000,
        totalCost: 50.00,
        contextTokens: 50000,
        contextLimit: 100000,
        turnCount: 10,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      expect(rendered).toContain('1.5M');
      expect(rendered).toContain('2.3M');
    });
  });

  describe('Cost Display', () => {
    it('should display cost in USD format', () => {
      const metrics: AgentMetrics = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 1.23,
        contextTokens: 5000,
        contextLimit: 10000,
        turnCount: 1,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      expect(rendered).toContain('Cost');
      expect(rendered).toContain('$1.23');
    });

    it('should display small costs with 4 decimal places', () => {
      const metrics: AgentMetrics = {
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0.0012,
        contextTokens: 500,
        contextLimit: 10000,
        turnCount: 1,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      expect(rendered).toContain('$0.0012');
    });

    it('should display large costs with comma separators', () => {
      const metrics: AgentMetrics = {
        inputTokens: 10000000,
        outputTokens: 5000000,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 1234.56,
        contextTokens: 50000,
        contextLimit: 100000,
        turnCount: 50,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      expect(rendered).toContain('$1,234.56');
    });

    it('should display zero cost', () => {
      const metrics: AgentMetrics = {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0,
        contextTokens: 0,
        contextLimit: 10000,
        turnCount: 0,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      expect(rendered).toContain('$0.00');
    });
  });

  describe('Context Window Display', () => {
    it('should display context window progress bar', () => {
      const metrics: AgentMetrics = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0.05,
        contextTokens: 5000,
        contextLimit: 10000,
        turnCount: 1,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      expect(rendered).toContain('Context');
      expect(rendered).toMatch(/\[.*\]|█|▓|▒|░/); // Progress bar characters
    });

    it('should display context percentage', () => {
      const metrics: AgentMetrics = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0.05,
        contextTokens: 5000,
        contextLimit: 10000,
        turnCount: 1,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      expect(rendered).toContain('50%'); // 5000 / 10000
    });

    it('should display context count with formatted numbers', () => {
      const metrics: AgentMetrics = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0.05,
        contextTokens: 7500,
        contextLimit: 10000,
        turnCount: 1,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      expect(rendered).toContain('7.5k');
      expect(rendered).toContain('10.0k');
    });

    it('should show warning color when context >= 80%', () => {
      const metrics: AgentMetrics = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0.05,
        contextTokens: 8000,
        contextLimit: 10000,
        turnCount: 1,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      // Should call theme.fg with 'warning' or 'error' style
      expect(mockTheme.fg).toHaveBeenCalledWith(
        expect.stringMatching(/warning|error|danger/),
        expect.any(String)
      );
      expect(rendered).toContain('80%');
    });

    it('should show warning color when context = 80%', () => {
      const metrics: AgentMetrics = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0.05,
        contextTokens: 8000,
        contextLimit: 10000,
        turnCount: 1,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      display.render(80);

      expect(mockTheme.fg).toHaveBeenCalledWith(
        expect.stringMatching(/warning|error|danger/),
        expect.any(String)
      );
    });

    it('should show warning color when context > 80%', () => {
      const metrics: AgentMetrics = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0.05,
        contextTokens: 9500,
        contextLimit: 10000,
        turnCount: 1,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      display.render(80);

      expect(mockTheme.fg).toHaveBeenCalledWith(
        expect.stringMatching(/warning|error|danger/),
        expect.any(String)
      );
    });

    it('should NOT show warning color when context < 80%', () => {
      const metrics: AgentMetrics = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0.05,
        contextTokens: 7900,
        contextLimit: 10000,
        turnCount: 1,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      display.render(80);

      // Should NOT be called with warning style for context display
      const warningCalls = (mockTheme.fg as jest.MockedFunction<any>).mock.calls.filter(
        (call: any) => call[0].match(/warning|error|danger/)
      );
      expect(warningCalls.length).toBe(0);
    });

    it('should handle 100% context usage', () => {
      const metrics: AgentMetrics = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0.05,
        contextTokens: 10000,
        contextLimit: 10000,
        turnCount: 1,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      expect(rendered).toContain('100%');
      expect(mockTheme.fg).toHaveBeenCalledWith(
        expect.stringMatching(/warning|error|danger/),
        expect.any(String)
      );
    });

    it('should handle context over 100% (overflow)', () => {
      const metrics: AgentMetrics = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0.05,
        contextTokens: 12000,
        contextLimit: 10000,
        turnCount: 1,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      // Should cap at 100% or show overflow
      expect(rendered).toMatch(/100%|120%/);
    });

    it('should handle zero context limit gracefully', () => {
      const metrics: AgentMetrics = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0.05,
        contextTokens: 5000,
        contextLimit: 0,
        turnCount: 1,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      // Should show N/A or handle division by zero
      expect(rendered).toMatch(/N\/A|Unknown|0%/);
    });

    it('should handle zero context usage', () => {
      const metrics: AgentMetrics = {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0,
        contextTokens: 0,
        contextLimit: 10000,
        turnCount: 0,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      expect(rendered).toContain('0%');
    });
  });

  describe('Turn Count Display', () => {
    it('should display turn count', () => {
      const metrics: AgentMetrics = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0.05,
        contextTokens: 5000,
        contextLimit: 10000,
        turnCount: 3,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      expect(rendered).toContain('Turn');
      expect(rendered).toContain('3');
    });

    it('should display zero turns', () => {
      const metrics: AgentMetrics = {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0,
        contextTokens: 0,
        contextLimit: 10000,
        turnCount: 0,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      expect(rendered).toContain('0');
    });

    it('should display large turn counts', () => {
      const metrics: AgentMetrics = {
        inputTokens: 100000,
        outputTokens: 50000,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 5.00,
        contextTokens: 8000,
        contextLimit: 10000,
        turnCount: 127,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      expect(rendered).toContain('127');
    });
  });

  describe('Layout and Readability', () => {
    it('should render clear section header', () => {
      const metrics: AgentMetrics = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0.05,
        contextTokens: 5000,
        contextLimit: 10000,
        turnCount: 1,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      expect(rendered).toMatch(/Metrics|METRICS|═|─/); // Section header or border
    });

    it('should use visual separators between sections', () => {
      const metrics: AgentMetrics = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0.05,
        contextTokens: 5000,
        contextLimit: 10000,
        turnCount: 1,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      // Should have borders, lines, or spacing
      expect(rendered).toMatch(/─|═|━|▬|\n\n/);
    });

    it('should align labels consistently', () => {
      const metrics: AgentMetrics = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 200,
        cacheWriteTokens: 100,
        totalCost: 0.05,
        contextTokens: 5000,
        contextLimit: 10000,
        turnCount: 1,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      // Should have consistent spacing/alignment
      const lines = rendered.split('\n').filter(l => l.includes(':'));
      if (lines.length > 1) {
        // Check that colons are roughly aligned (within a few chars)
        const colonPositions = lines.map(l => l.indexOf(':'));
        const maxPos = Math.max(...colonPositions);
        const minPos = Math.min(...colonPositions);
        expect(maxPos - minPos).toBeLessThan(10); // Reasonable alignment tolerance
      }
    });

    it('should respect provided width', () => {
      const metrics: AgentMetrics = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0.05,
        contextTokens: 5000,
        contextLimit: 10000,
        turnCount: 1,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(40);

      const lines = rendered.split('\n');
      for (const line of lines) {
        // Remove ANSI color codes for length calculation
        const plainLine = line.replace(/\[.*?\]/g, '');
        expect(plainLine.length).toBeLessThanOrEqual(45); // Some tolerance for borders
      }
    });

    it('should adapt to different widths', () => {
      const metrics: AgentMetrics = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0.05,
        contextTokens: 5000,
        contextLimit: 10000,
        turnCount: 1,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const narrowRender = display.render(40);
      const wideRender = display.render(120);

      expect(narrowRender).toBeTruthy();
      expect(wideRender).toBeTruthy();
      expect(narrowRender.length).toBeLessThan(wideRender.length);
    });

    it('should handle very narrow width gracefully', () => {
      const metrics: AgentMetrics = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0.05,
        contextTokens: 5000,
        contextLimit: 10000,
        turnCount: 1,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(20);

      expect(rendered).toBeTruthy();
      // Should truncate or wrap, not crash
    });
  });

  describe('Render Caching', () => {
    it('should cache render output for same metrics', () => {
      const metrics: AgentMetrics = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0.05,
        contextTokens: 5000,
        contextLimit: 10000,
        turnCount: 1,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      
      const firstRender = display.render(80);
      const secondRender = display.render(80);

      expect(firstRender).toBe(secondRender);
      // Should return exact same string instance if cached
      expect(firstRender === secondRender).toBe(true);
    });

    it('should invalidate cache when metrics change', () => {
      const initialMetrics: AgentMetrics = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0.05,
        contextTokens: 5000,
        contextLimit: 10000,
        turnCount: 1,
      };

      const display = new MetricsDisplay(initialMetrics, mockTheme);
      const firstRender = display.render(80);

      // Update metrics
      const updatedMetrics: AgentMetrics = {
        ...initialMetrics,
        inputTokens: 2000,
        turnCount: 2,
      };
      display.updateMetrics(updatedMetrics);

      const secondRender = display.render(80);

      expect(secondRender).not.toBe(firstRender);
      expect(secondRender).toContain('2.0k'); // Updated input tokens
      expect(secondRender).toContain('2'); // Updated turn count
    });

    it('should invalidate cache when width changes', () => {
      const metrics: AgentMetrics = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0.05,
        contextTokens: 5000,
        contextLimit: 10000,
        turnCount: 1,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      
      const narrowRender = display.render(40);
      const wideRender = display.render(80);

      expect(narrowRender).not.toBe(wideRender);
    });

    it('should provide invalidate method for manual cache clearing', () => {
      const metrics: AgentMetrics = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0.05,
        contextTokens: 5000,
        contextLimit: 10000,
        turnCount: 1,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      
      display.render(80); // Cache render
      display.invalidate(); // Clear cache
      
      const afterInvalidate = display.render(80);
      
      expect(afterInvalidate).toBeTruthy();
      expect(display.invalidate).toBeDefined();
    });
  });

  describe('Cache Efficiency Display', () => {
    it('should show cache efficiency when cache tokens exist', () => {
      const metrics: AgentMetrics = {
        inputTokens: 10000,
        outputTokens: 5000,
        cacheReadTokens: 8000, // High cache reads
        cacheWriteTokens: 2000,
        totalCost: 0.50,
        contextTokens: 15000,
        contextLimit: 20000,
        turnCount: 5,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      // Should show some indication of cache efficiency
      // Efficiency = cache reads / (input tokens + cache reads)
      // In this case: 8000 / (10000 + 8000) = ~44%
      expect(rendered).toMatch(/Cache|Efficiency|Hit|%/);
    });

    it('should calculate cache read efficiency correctly', () => {
      const metrics: AgentMetrics = {
        inputTokens: 5000,
        outputTokens: 2000,
        cacheReadTokens: 5000, // 50% efficiency
        cacheWriteTokens: 1000,
        totalCost: 0.25,
        contextTokens: 8000,
        contextLimit: 10000,
        turnCount: 3,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      // Cache efficiency = 5000 / (5000 + 5000) = 50%
      expect(rendered).toContain('50%');
    });

    it('should handle zero cache reads', () => {
      const metrics: AgentMetrics = {
        inputTokens: 5000,
        outputTokens: 2000,
        cacheReadTokens: 0,
        cacheWriteTokens: 1000,
        totalCost: 0.25,
        contextTokens: 7000,
        contextLimit: 10000,
        turnCount: 2,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      // Should show 0% efficiency or hide efficiency metric
      expect(rendered).toMatch(/0%|N\/A/);
    });

    it('should handle 100% cache efficiency', () => {
      const metrics: AgentMetrics = {
        inputTokens: 0,
        outputTokens: 2000,
        cacheReadTokens: 10000, // All reads from cache
        cacheWriteTokens: 0,
        totalCost: 0.10,
        contextTokens: 12000,
        contextLimit: 20000,
        turnCount: 5,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      expect(rendered).toContain('100%');
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative values gracefully', () => {
      const metrics: AgentMetrics = {
        inputTokens: -100,
        outputTokens: -50,
        cacheReadTokens: -10,
        cacheWriteTokens: -5,
        totalCost: -0.01,
        contextTokens: -500,
        contextLimit: 10000,
        turnCount: -1,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      expect(rendered).toBeTruthy();
      // Should display as 0 or handle gracefully
      expect(rendered).toContain('0');
    });

    it('should handle extremely large values', () => {
      const metrics: AgentMetrics = {
        inputTokens: Number.MAX_SAFE_INTEGER,
        outputTokens: Number.MAX_SAFE_INTEGER,
        cacheReadTokens: Number.MAX_SAFE_INTEGER,
        cacheWriteTokens: Number.MAX_SAFE_INTEGER,
        totalCost: 999999.99,
        contextTokens: 100000000,
        contextLimit: 100000000,
        turnCount: 99999,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      expect(rendered).toBeTruthy();
      // Should not crash or produce NaN
      expect(rendered).not.toContain('NaN');
      expect(rendered).not.toContain('Infinity');
    });

    it('should handle NaN values', () => {
      const metrics: AgentMetrics = {
        inputTokens: NaN,
        outputTokens: NaN,
        cacheReadTokens: NaN,
        cacheWriteTokens: NaN,
        totalCost: NaN,
        contextTokens: NaN,
        contextLimit: NaN,
        turnCount: NaN,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      expect(rendered).toBeTruthy();
      // Should display as 0 or N/A
      expect(rendered).toMatch(/0|N\/A/);
    });

    it('should handle undefined metric properties', () => {
      const metrics = {
        inputTokens: 1000,
        // Missing other properties
      } as any;

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      expect(rendered).toBeTruthy();
      // Should handle missing values gracefully
    });

    it('should handle null metrics object', () => {
      expect(() => {
        new MetricsDisplay(null as any, mockTheme);
      }).toThrow(); // Should throw or handle gracefully
    });

    it('should handle zero width', () => {
      const metrics: AgentMetrics = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0.05,
        contextTokens: 5000,
        contextLimit: 10000,
        turnCount: 1,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(0);

      expect(rendered).toBeTruthy();
      // Should render something minimal or return empty string
    });

    it('should handle negative width', () => {
      const metrics: AgentMetrics = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0.05,
        contextTokens: 5000,
        contextLimit: 10000,
        turnCount: 1,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(-10);

      expect(rendered).toBeTruthy();
      // Should handle gracefully
    });
  });

  describe('Integration with Format Utilities', () => {
    it('should use formatTokens for all token displays', () => {
      const metrics: AgentMetrics = {
        inputTokens: 1234,
        outputTokens: 5678,
        cacheReadTokens: 910,
        cacheWriteTokens: 111,
        totalCost: 0.05,
        contextTokens: 7933,
        contextLimit: 10000,
        turnCount: 1,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      // All tokens should use K suffix where appropriate
      expect(rendered).toContain('1.2k');
      expect(rendered).toContain('5.7k');
      expect(rendered).toContain('910');
      expect(rendered).toContain('111');
      expect(rendered).toContain('7.9k');
      expect(rendered).toContain('10.0k');
    });

    it('should use formatCost for cost display', () => {
      const metrics: AgentMetrics = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0.0034,
        contextTokens: 1500,
        contextLimit: 10000,
        turnCount: 1,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      const rendered = display.render(80);

      expect(rendered).toContain('$0.0034');
    });
  });

  describe('Performance', () => {
    it('should render quickly for typical metrics', () => {
      const metrics: AgentMetrics = {
        inputTokens: 15430,
        outputTokens: 2340,
        cacheReadTokens: 3200,
        cacheWriteTokens: 1500,
        totalCost: 0.234,
        contextTokens: 22470,
        contextLimit: 100000,
        turnCount: 8,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      
      const startTime = Date.now();
      display.render(80);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100); // Should render in < 100ms
    });

    it('should render quickly even with cached results', () => {
      const metrics: AgentMetrics = {
        inputTokens: 15430,
        outputTokens: 2340,
        cacheReadTokens: 3200,
        cacheWriteTokens: 1500,
        totalCost: 0.234,
        contextTokens: 22470,
        contextLimit: 100000,
        turnCount: 8,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      
      // Prime the cache
      display.render(80);
      
      // Measure cached render
      const startTime = Date.now();
      display.render(80);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(10); // Cached should be very fast
    });

    it('should handle multiple rapid renders without performance degradation', () => {
      const metrics: AgentMetrics = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0.05,
        contextTokens: 5000,
        contextLimit: 10000,
        turnCount: 1,
      };

      const display = new MetricsDisplay(metrics, mockTheme);
      
      const iterations = 100;
      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        display.render(80);
      }
      
      const totalDuration = Date.now() - startTime;
      const avgDuration = totalDuration / iterations;

      expect(avgDuration).toBeLessThan(5); // Average should be very fast due to caching
    });
  });
});
