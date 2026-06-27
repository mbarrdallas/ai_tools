/**
 * Tests for Dashboard Component Shell (T7)
 * 
 * Tests the basic DashboardComponent structure including:
 * - Component interface implementation
 * - Render method behavior
 * - Input handling (keyboard)
 * - Invalidation and caching
 * - Constructor props
 * - Basic shell layout
 */

import { DashboardComponent } from '../../lib/stats_dashboard_tui/ui/dashboard';
import { Agent, DashboardState } from '../../lib/stats_dashboard_tui/types';

describe('DashboardComponent', () => {
  let mockStateManager: any;
  let mockController: any;
  let onCloseMock: jest.Mock;

  beforeEach(() => {
    // Mock StateManager with methods that dashboard will need
    mockStateManager = {
      getAllAgents: jest.fn().mockReturnValue([]),
      getAgent: jest.fn().mockReturnValue(null),
      getDashboardState: jest.fn().mockReturnValue({
        isVisible: true,
        selectedAgentId: null,
        expandedSections: new Set<string>(),
      }),
    };

    // Mock Controller for managing dashboard visibility
    mockController = {
      hide: jest.fn(),
      isVisible: jest.fn().mockReturnValue(true),
    };

    onCloseMock = jest.fn();
  });

  describe('Component Interface Implementation', () => {
    it('should implement the Component interface', () => {
      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      // Verify interface methods exist
      expect(typeof dashboard.render).toBe('function');
      expect(typeof dashboard.handleInput).toBe('function');
      expect(typeof dashboard.invalidate).toBe('function');
    });

    it('should accept stateManager in constructor props', () => {
      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      expect(dashboard).toBeDefined();
      // StateManager should be accessible internally (tested via render behavior)
    });

    it('should accept controller in constructor props', () => {
      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      expect(dashboard).toBeDefined();
    });

    it('should accept optional onClose callback', () => {
      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      expect(dashboard).toBeDefined();
    });
  });

  describe('render(width)', () => {
    it('should return an array of strings', () => {
      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      const result = dashboard.render(80);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(typeof result[0]).toBe('string');
    });

    it('should return different output for different widths', () => {
      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      const result40 = dashboard.render(40);
      const result80 = dashboard.render(80);

      // Output should adapt to width
      expect(result40).not.toEqual(result80);
    });

    it('should render header section', () => {
      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      const output = dashboard.render(80);
      const fullOutput = output.join('\n');

      // Should contain dashboard title or header indicator
      expect(fullOutput).toMatch(/stats|dashboard|agent/i);
    });

    it('should render content area below header', () => {
      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      const output = dashboard.render(80);

      // Should have multiple lines (header + content)
      expect(output.length).toBeGreaterThan(1);
    });

    it('should handle empty agent list gracefully', () => {
      mockStateManager.getAllAgents.mockReturnValue([]);

      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      const output = dashboard.render(80);

      // Should still render without crashing
      expect(Array.isArray(output)).toBe(true);
      expect(output.length).toBeGreaterThan(0);
    });

    it('should call stateManager.getAllAgents during render', () => {
      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      dashboard.render(80);

      expect(mockStateManager.getAllAgents).toHaveBeenCalled();
    });

    it('should handle minimum width gracefully', () => {
      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      // Test very narrow width
      const output = dashboard.render(20);

      expect(Array.isArray(output)).toBe(true);
      expect(output.length).toBeGreaterThan(0);
    });

    it('should not exceed provided width in output lines', () => {
      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      const width = 60;
      const output = dashboard.render(width);

      // All lines should respect width (allowing for ANSI codes)
      output.forEach(line => {
        // Strip ANSI codes for length check
        const strippedLine = line.replace(/\x1B\[[0-9;]*m/g, '');
        expect(strippedLine.length).toBeLessThanOrEqual(width);
      });
    });
  });

  describe('handleInput(data)', () => {
    it('should process keyboard input', () => {
      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      // Should not throw
      expect(() => {
        dashboard.handleInput('a');
      }).not.toThrow();
    });

    it('should trigger onClose callback on Escape key', () => {
      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      dashboard.handleInput('\x1b'); // ESC character

      expect(onCloseMock).toHaveBeenCalled();
    });

    it('should trigger onClose callback on Escape sequence', () => {
      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      dashboard.handleInput('\u001b'); // Alternative ESC encoding

      expect(onCloseMock).toHaveBeenCalled();
    });

    it('should not trigger onClose on non-Escape keys', () => {
      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      dashboard.handleInput('a');
      dashboard.handleInput('q');
      dashboard.handleInput('\n');

      expect(onCloseMock).not.toHaveBeenCalled();
    });

    it('should not trigger onClose on arrow keys', () => {
      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      // Arrow keys should not close dashboard
      dashboard.handleInput('\x1b[A'); // Up arrow
      dashboard.handleInput('\x1b[B'); // Down arrow
      dashboard.handleInput('\x1b[C'); // Right arrow
      dashboard.handleInput('\x1b[D'); // Left arrow

      expect(onCloseMock).not.toHaveBeenCalled();
    });

    it('should not trigger onClose on Tab key', () => {
      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      dashboard.handleInput('\x1b[Z'); // Tab (Shift+Tab) sequence

      expect(onCloseMock).not.toHaveBeenCalled();
    });

    it('should handle empty input', () => {
      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      expect(() => {
        dashboard.handleInput('');
      }).not.toThrow();
      expect(onCloseMock).not.toHaveBeenCalled();
    });

    it('should handle null or undefined input gracefully', () => {
      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      expect(() => {
        dashboard.handleInput(null as any);
      }).not.toThrow();

      expect(() => {
        dashboard.handleInput(undefined as any);
      }).not.toThrow();
    });
  });

  describe('invalidate()', () => {
    it('should clear render cache', () => {
      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      // First render
      const output1 = dashboard.render(80);
      
      // Mock data change
      mockStateManager.getAllAgents.mockReturnValue([
        {
          id: 'agent-1',
          name: 'Test Agent',
          status: 'running',
          parentId: null,
          startTime: Date.now(),
          endTime: null,
          metrics: {
            inputTokens: 100,
            outputTokens: 50,
            cacheReadTokens: 0,
            cacheWriteTokens: 0,
            totalCost: 0.01,
            contextTokens: 150,
            contextLimit: 4096,
            turnCount: 1,
          },
          toolCalls: [],
          messageCount: 1,
          subagentIds: [],
        } as Agent,
      ]);

      // Invalidate cache
      dashboard.invalidate();

      // Second render should show updated data
      const output2 = dashboard.render(80);

      // If caching is working, outputs should differ after invalidate
      // (This assumes the component implements caching)
      expect(output1).not.toEqual(output2);
    });

    it('should not throw when called multiple times', () => {
      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      expect(() => {
        dashboard.invalidate();
        dashboard.invalidate();
        dashboard.invalidate();
      }).not.toThrow();
    });

    it('should allow render to work after invalidate', () => {
      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      dashboard.invalidate();
      const output = dashboard.render(80);

      expect(Array.isArray(output)).toBe(true);
      expect(output.length).toBeGreaterThan(0);
    });
  });

  describe('Layout and Structure', () => {
    it('should have consistent structure across multiple renders', () => {
      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      const output1 = dashboard.render(80);
      const output2 = dashboard.render(80);

      // Without data changes, structure should be identical
      expect(output1).toEqual(output2);
    });

    it('should render help text or keyboard hints', () => {
      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      const output = dashboard.render(80);
      const fullOutput = output.join('\n');

      // Should contain hints about ESC or other keys
      expect(fullOutput.toLowerCase()).toMatch(/esc|escape|close|quit/);
    });

    it('should render frame or border for visual structure', () => {
      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      const output = dashboard.render(80);
      const fullOutput = output.join('\n');

      // Should have some box drawing characters or separators
      expect(fullOutput).toMatch(/[─│┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬-]/);
    });

    it('should adapt layout when no agents exist', () => {
      mockStateManager.getAllAgents.mockReturnValue([]);

      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      const output = dashboard.render(80);
      const fullOutput = output.join('\n').toLowerCase();

      // Should show empty state message
      expect(fullOutput).toMatch(/no agents|empty|waiting/);
    });

    it('should show header even with no agents', () => {
      mockStateManager.getAllAgents.mockReturnValue([]);

      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      const output = dashboard.render(80);
      
      // Header should still be present
      expect(output.length).toBeGreaterThan(0);
      expect(output[0].length).toBeGreaterThan(0);
    });
  });

  describe('Integration with StateManager', () => {
    it('should query dashboard state from stateManager', () => {
      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      dashboard.render(80);

      // Should check dashboard state during render
      expect(mockStateManager.getDashboardState).toHaveBeenCalled();
    });

    it('should handle missing dashboard state gracefully', () => {
      mockStateManager.getDashboardState.mockReturnValue(null);

      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      expect(() => {
        dashboard.render(80);
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle extremely narrow width', () => {
      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      const output = dashboard.render(10);

      expect(Array.isArray(output)).toBe(true);
      expect(output.length).toBeGreaterThan(0);
    });

    it('should handle extremely wide width', () => {
      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      const output = dashboard.render(300);

      expect(Array.isArray(output)).toBe(true);
      expect(output.length).toBeGreaterThan(0);
    });

    it('should handle zero width gracefully', () => {
      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      const output = dashboard.render(0);

      // Should return array even if empty or minimal
      expect(Array.isArray(output)).toBe(true);
    });

    it('should handle negative width gracefully', () => {
      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      const output = dashboard.render(-10);

      // Should handle gracefully, perhaps treating as minimum width
      expect(Array.isArray(output)).toBe(true);
    });
  });

  describe('Render Caching', () => {
    it('should cache render output for same width when no invalidate called', () => {
      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      const output1 = dashboard.render(80);
      const output2 = dashboard.render(80);

      // Should return same reference if cached
      expect(output1).toEqual(output2);
      
      // StateManager should only be called once if caching works
      const callCount = mockStateManager.getAllAgents.mock.calls.length;
      expect(callCount).toBeLessThanOrEqual(1);
    });

    it('should refresh cache after invalidate() is called', () => {
      const dashboard = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: onCloseMock,
      });

      dashboard.render(80);
      const firstCallCount = mockStateManager.getAllAgents.mock.calls.length;

      dashboard.invalidate();
      dashboard.render(80);
      const secondCallCount = mockStateManager.getAllAgents.mock.calls.length;

      // Should have made additional call after invalidate
      expect(secondCallCount).toBeGreaterThan(firstCallCount);
    });
  });

  describe('Overlay Configuration', () => {
    it('should export DASHBOARD_OVERLAY_CONFIG', () => {
      const { DASHBOARD_OVERLAY_CONFIG } = require('../../lib/stats_dashboard_tui/ui/dashboard');
      
      expect(DASHBOARD_OVERLAY_CONFIG).toBeDefined();
      expect(DASHBOARD_OVERLAY_CONFIG.anchor).toBe('right-center');
      expect(DASHBOARD_OVERLAY_CONFIG.widthPercent).toBe(50);
      expect(DASHBOARD_OVERLAY_CONFIG.heightPercent).toBe(80);
    });
  });

  describe('Constructor Validation', () => {
    it('should require stateManager parameter', () => {
      expect(() => {
        new DashboardComponent({
          stateManager: null as any,
          controller: mockController,
          onClose: onCloseMock,
        });
      }).toThrow();
    });

    it('should require controller parameter', () => {
      expect(() => {
        new DashboardComponent({
          stateManager: mockStateManager,
          controller: null as any,
          onClose: onCloseMock,
        });
      }).toThrow();
    });

    it('should allow optional onClose parameter', () => {
      expect(() => {
        new DashboardComponent({
          stateManager: mockStateManager,
          controller: mockController,
        });
      }).not.toThrow();
    });
  });
});
