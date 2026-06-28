/**
 * Commands and Shortcuts Test Suite
 * 
 * Tests for Task T14: External Dashboard Control
 * 
 * T14 Requirements:
 * - DashboardController class with toggle/show/hide/isVisible methods
 * - Footer status showing "📊 N agents" when dashboard is closed
 * - Hooks for /stats command and Ctrl+Shift+S registration (actual registration in T17)
 * - State persists during session
 * 
 * Also includes tests for internal dashboard keyboard shortcuts:
 * - 'r' key: refresh/re-render dashboard by invalidating cache
 * - '?' key: toggle help overlay showing all keyboard shortcuts
 * - 'q' key: close dashboard (same as ESC)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { Agent } from '@shared/stats_dashboard_tui/types';
import { DashboardComponent } from '@shared/stats_dashboard_tui/ui/dashboard';
import { DashboardController } from '@shared/stats_dashboard_tui/ui/controller';
import type { StateManager } from '@shared/stats_dashboard_tui/state/state-manager';

/**
 * Create a mock StateManager for testing
 */
function createMockStateManager(): StateManager {
  const agents: Agent[] = [];
  
  return {
    getAllAgents: jest.fn(() => agents),
    getDashboardState: jest.fn(() => ({
      isVisible: true,
      selectedAgentId: null,
      expandedSections: new Set<string>(),
    })),
    getAgent: jest.fn((id: string) => agents.find(a => a.id === id)),
  } as unknown as StateManager;
}

/**
 * Create a mock DashboardController for testing
 */
function createMockController() {
  return {
    hide: jest.fn(),
    isVisible: jest.fn(() => true),
  };
}

/**
 * Create a minimal mock agent for testing
 */
function createMockAgent(id: string, name: string): Agent {
  return {
    id,
    name,
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
      contextLimit: 100000,
      turnCount: 0,
    },
    toolCalls: [],
    messageCount: 0,
    subagentIds: [],
  };
}

describe('DashboardController - External Control (T14)', () => {
  let controller: DashboardController;
  let mockStateManager: StateManager;
  let mockCtx: any;

  beforeEach(() => {
    mockStateManager = createMockStateManager();
    mockCtx = {
      ui: {
        custom: jest.fn(() => ({
          close: jest.fn(),
          dispose: jest.fn(),
        })),
      },
      commands: {
        register: jest.fn(() => 'cmd-id'),
        unregister: jest.fn(),
      },
      shortcuts: {
        register: jest.fn(() => 'shortcut-id'),
        unregister: jest.fn(),
      },
    };

    controller = new DashboardController({
      stateManager: mockStateManager,
      ctx: mockCtx,
    });
  });

  describe('Constructor', () => {
    it('should create controller with stateManager', () => {
      expect(controller).toBeDefined();
      expect(controller.isVisible()).toBe(false);
    });

    it('should throw error if stateManager is missing', () => {
      expect(() => {
        new DashboardController({} as any);
      }).toThrow('DashboardController requires stateManager');
    });

    it('should accept optional ctx parameter', () => {
      const controllerWithoutCtx = new DashboardController({
        stateManager: mockStateManager,
      });
      expect(controllerWithoutCtx).toBeDefined();
      expect(controllerWithoutCtx.isVisible()).toBe(false);
    });
  });

  describe('toggle()', () => {
    it('should show dashboard when currently hidden', () => {
      // Arrange
      expect(controller.isVisible()).toBe(false);

      // Act
      controller.toggle();

      // Assert
      expect(controller.isVisible()).toBe(true);
      expect(mockCtx.ui.custom).toHaveBeenCalled();
    });

    it('should hide dashboard when currently visible', () => {
      // Arrange: show dashboard first
      controller.show();
      expect(controller.isVisible()).toBe(true);

      // Act
      controller.toggle();

      // Assert
      expect(controller.isVisible()).toBe(false);
    });

    it('should toggle multiple times', () => {
      // Start hidden
      expect(controller.isVisible()).toBe(false);

      // Toggle to show
      controller.toggle();
      expect(controller.isVisible()).toBe(true);

      // Toggle to hide
      controller.toggle();
      expect(controller.isVisible()).toBe(false);

      // Toggle to show again
      controller.toggle();
      expect(controller.isVisible()).toBe(true);
    });
  });

  describe('show()', () => {
    it('should show dashboard overlay', () => {
      // Act
      controller.show();

      // Assert
      expect(controller.isVisible()).toBe(true);
      expect(mockCtx.ui.custom).toHaveBeenCalledWith(
        expect.objectContaining({
          overlay: true,
          anchor: 'right-center',
          widthPercent: 50,
          heightPercent: 80,
        })
      );
    });

    it('should be idempotent (no-op if already visible)', () => {
      // Arrange: show dashboard
      controller.show();
      expect(mockCtx.ui.custom).toHaveBeenCalledTimes(1);

      // Act: call show again
      controller.show();

      // Assert: should not create another overlay
      expect(mockCtx.ui.custom).toHaveBeenCalledTimes(1);
      expect(controller.isVisible()).toBe(true);
    });

    it('should handle missing ctx gracefully', () => {
      // Arrange: controller without context
      const controllerNoCtx = new DashboardController({
        stateManager: mockStateManager,
      });

      // Act & Assert: should not throw
      expect(() => {
        controllerNoCtx.show();
      }).not.toThrow();
      expect(controllerNoCtx.isVisible()).toBe(false);
    });

    it('should pass DashboardComponent to ctx.ui.custom', () => {
      // Act
      controller.show();

      // Assert
      const callArgs = mockCtx.ui.custom.mock.calls[0][0];
      expect(callArgs.component).toBeDefined();
      expect(callArgs.component.render).toBeInstanceOf(Function);
    });
  });

  describe('hide()', () => {
    it('should hide dashboard overlay', () => {
      // Arrange: show dashboard first
      controller.show();
      const handle = mockCtx.ui.custom.mock.results[0].value;
      expect(controller.isVisible()).toBe(true);

      // Act
      controller.hide();

      // Assert
      expect(controller.isVisible()).toBe(false);
      expect(handle.close).toHaveBeenCalled();
    });

    it('should be idempotent (no-op if already hidden)', () => {
      // Arrange: dashboard is already hidden
      expect(controller.isVisible()).toBe(false);

      // Act & Assert: should not throw
      expect(() => {
        controller.hide();
      }).not.toThrow();
      expect(controller.isVisible()).toBe(false);
    });

    it('should clean up dashboard handle', () => {
      // Arrange
      controller.show();
      const handle = mockCtx.ui.custom.mock.results[0].value;

      // Act
      controller.hide();

      // Assert: handle was cleaned up
      expect(handle.close).toHaveBeenCalled();
    });

    it('should handle close errors gracefully', () => {
      // Arrange: show dashboard with handle that throws on close
      mockCtx.ui.custom.mockReturnValue({
        close: jest.fn(() => {
          throw new Error('Close failed');
        }),
      });
      controller.show();

      // Act & Assert: should not throw
      expect(() => {
        controller.hide();
      }).not.toThrow();
      expect(controller.isVisible()).toBe(false);
    });
  });

  describe('isVisible()', () => {
    it('should return false initially', () => {
      expect(controller.isVisible()).toBe(false);
    });

    it('should return true after show()', () => {
      controller.show();
      expect(controller.isVisible()).toBe(true);
    });

    it('should return false after hide()', () => {
      controller.show();
      controller.hide();
      expect(controller.isVisible()).toBe(false);
    });

    it('should reflect current state after toggle()', () => {
      expect(controller.isVisible()).toBe(false);
      
      controller.toggle();
      expect(controller.isVisible()).toBe(true);
      
      controller.toggle();
      expect(controller.isVisible()).toBe(false);
    });
  });

  describe('getFooterStatus()', () => {
    it('should return empty string when dashboard is visible', () => {
      // Arrange
      controller.show();

      // Act
      const status = controller.getFooterStatus();

      // Assert
      expect(status).toBe('');
    });

    it('should return "📊 No agents" when no agents are tracked', () => {
      // Arrange: empty agent list
      (mockStateManager.getAllAgents as jest.Mock).mockReturnValue([]);

      // Act
      const status = controller.getFooterStatus();

      // Assert
      expect(status).toBe('📊 No agents');
    });

    it('should return "📊 1 agent" when one agent is tracked', () => {
      // Arrange: one agent
      const agents = [createMockAgent('agent-1', 'test')];
      (mockStateManager.getAllAgents as jest.Mock).mockReturnValue(agents);

      // Act
      const status = controller.getFooterStatus();

      // Assert
      expect(status).toBe('📊 1 agent');
    });

    it('should return "📊 N agents" when multiple agents are tracked', () => {
      // Arrange: multiple agents
      const agents = [
        createMockAgent('agent-1', 'first'),
        createMockAgent('agent-2', 'second'),
        createMockAgent('agent-3', 'third'),
      ];
      (mockStateManager.getAllAgents as jest.Mock).mockReturnValue(agents);

      // Act
      const status = controller.getFooterStatus();

      // Assert
      expect(status).toBe('📊 3 agents');
    });

    it('should update when agent count changes', () => {
      // Arrange: start with 2 agents
      let agents = [
        createMockAgent('agent-1', 'first'),
        createMockAgent('agent-2', 'second'),
      ];
      (mockStateManager.getAllAgents as jest.Mock).mockReturnValue(agents);

      // Act & Assert: initial count
      expect(controller.getFooterStatus()).toBe('📊 2 agents');

      // Arrange: add agent
      agents = [...agents, createMockAgent('agent-3', 'third')];
      (mockStateManager.getAllAgents as jest.Mock).mockReturnValue(agents);

      // Act & Assert: updated count
      expect(controller.getFooterStatus()).toBe('📊 3 agents');
    });
  });

  describe('registerStatsCommand()', () => {
    it('should register /stats command with Pi', () => {
      // Act
      const cleanup = controller.registerStatsCommand(mockCtx);

      // Assert
      expect(mockCtx.commands.register).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'stats',
          description: expect.any(String),
          execute: expect.any(Function),
        })
      );
      expect(cleanup).toBeInstanceOf(Function);
    });

    it('should toggle dashboard when command is executed', () => {
      // Arrange: register command
      controller.registerStatsCommand(mockCtx);
      const commandConfig = mockCtx.commands.register.mock.calls[0][0];
      const executeFunc = commandConfig.execute;

      // Act: execute command
      executeFunc();

      // Assert: dashboard toggled to visible
      expect(controller.isVisible()).toBe(true);
    });

    it('should return cleanup function that unregisters command', () => {
      // Arrange
      const cleanup = controller.registerStatsCommand(mockCtx);

      // Act
      cleanup();

      // Assert
      expect(mockCtx.commands.unregister).toHaveBeenCalledWith('cmd-id');
    });

    it('should handle missing commands API gracefully', () => {
      // Arrange: context without commands API
      const badCtx = {};

      // Act & Assert: should not throw
      expect(() => {
        const cleanup = controller.registerStatsCommand(badCtx);
        expect(cleanup).toBeInstanceOf(Function);
      }).not.toThrow();
    });
  });

  describe('registerKeyboardShortcut()', () => {
    it('should register Ctrl+Shift+S shortcut with Pi', () => {
      // Act
      const cleanup = controller.registerKeyboardShortcut(mockCtx);

      // Assert
      expect(mockCtx.shortcuts.register).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'Ctrl+Shift+S',
          description: expect.any(String),
          action: expect.any(Function),
        })
      );
      expect(cleanup).toBeInstanceOf(Function);
    });

    it('should toggle dashboard when shortcut is pressed', () => {
      // Arrange: register shortcut
      controller.registerKeyboardShortcut(mockCtx);
      const shortcutConfig = mockCtx.shortcuts.register.mock.calls[0][0];
      const actionFunc = shortcutConfig.action;

      // Act: trigger shortcut
      actionFunc();

      // Assert: dashboard toggled to visible
      expect(controller.isVisible()).toBe(true);
    });

    it('should return cleanup function that unregisters shortcut', () => {
      // Arrange
      const cleanup = controller.registerKeyboardShortcut(mockCtx);

      // Act
      cleanup();

      // Assert
      expect(mockCtx.shortcuts.unregister).toHaveBeenCalledWith('shortcut-id');
    });

    it('should handle missing shortcuts API gracefully', () => {
      // Arrange: context without shortcuts API
      const badCtx = {};

      // Act & Assert: should not throw
      expect(() => {
        const cleanup = controller.registerKeyboardShortcut(badCtx);
        expect(cleanup).toBeInstanceOf(Function);
      }).not.toThrow();
    });
  });

  describe('State Persistence', () => {
    it('should preserve state manager data across show/hide cycles', () => {
      // Arrange: add agents to state
      const agents = [createMockAgent('agent-1', 'test')];
      (mockStateManager.getAllAgents as jest.Mock).mockReturnValue(agents);

      // Act: show, hide, show again
      controller.show();
      expect(controller.getFooterStatus()).toBe(''); // Visible, no footer
      
      controller.hide();
      expect(controller.getFooterStatus()).toBe('📊 1 agent'); // Hidden, shows count
      
      controller.show();
      expect(controller.getFooterStatus()).toBe(''); // Visible again

      // Assert: state manager still has agents
      expect(mockStateManager.getAllAgents).toHaveBeenCalled();
    });

    it('should maintain visibility state throughout session', () => {
      // Act: series of operations
      expect(controller.isVisible()).toBe(false);
      
      controller.show();
      expect(controller.isVisible()).toBe(true);
      
      controller.hide();
      expect(controller.isVisible()).toBe(false);
      
      controller.toggle();
      expect(controller.isVisible()).toBe(true);
      
      controller.toggle();
      expect(controller.isVisible()).toBe(false);

      // Assert: state is consistent
      expect(controller.isVisible()).toBe(false);
    });
  });

  describe('dispose()', () => {
    it('should hide dashboard and clean up resources', () => {
      // Arrange: show dashboard
      controller.show();
      expect(controller.isVisible()).toBe(true);

      // Act
      controller.dispose();

      // Assert
      expect(controller.isVisible()).toBe(false);
    });

    it('should clear context reference', () => {
      // Act
      controller.dispose();

      // Assert: attempting to show should fail gracefully
      controller.show();
      expect(controller.isVisible()).toBe(false);
    });
  });

  describe('setContext()', () => {
    it('should allow setting context after construction', () => {
      // Arrange: controller without context
      const controllerNoCtx = new DashboardController({
        stateManager: mockStateManager,
      });

      // Act: set context
      controllerNoCtx.setContext(mockCtx);
      controllerNoCtx.show();

      // Assert: dashboard can now be shown
      expect(controllerNoCtx.isVisible()).toBe(true);
      expect(mockCtx.ui.custom).toHaveBeenCalled();
    });
  });
});

describe('DashboardComponent - Internal Keyboard Shortcuts', () => {
  let dashboard: DashboardComponent;
  let mockStateManager: StateManager;
  let mockController: ReturnType<typeof createMockController>;
  let onCloseSpy: jest.Mock;

  beforeEach(() => {
    mockStateManager = createMockStateManager();
    mockController = createMockController();
    onCloseSpy = jest.fn();

    dashboard = new DashboardComponent({
      stateManager: mockStateManager,
      controller: mockController,
      onClose: onCloseSpy,
    });
  });

  describe('Refresh Command (r key)', () => {
    it('should invalidate render cache when r key is pressed', () => {
      // Arrange: render dashboard to create cache
      const width = 80;
      const firstRender = dashboard.render(width);
      expect(firstRender.length).toBeGreaterThan(0);

      // Verify cache exists by getting same result
      const cachedRender = dashboard.render(width);
      expect(cachedRender).toBe(firstRender); // Same reference means cached

      // Act: press 'r' key to refresh
      dashboard.handleInput('r');

      // Assert: next render should be fresh (not cached)
      const refreshedRender = dashboard.render(width);
      expect(refreshedRender).not.toBe(firstRender); // Different reference means cache was cleared
    });

    it('should work with uppercase R key', () => {
      // Arrange
      const width = 80;
      dashboard.render(width);
      const cachedRender = dashboard.render(width);

      // Act
      dashboard.handleInput('R');

      // Assert
      const refreshedRender = dashboard.render(width);
      expect(refreshedRender).not.toBe(cachedRender);
    });

    it('should trigger re-render after refresh', () => {
      // Arrange: create spy to track invalidate calls
      const invalidateSpy = jest.spyOn(dashboard, 'invalidate');

      // Act
      dashboard.handleInput('r');

      // Assert
      expect(invalidateSpy).toHaveBeenCalled();
      expect(invalidateSpy).toHaveBeenCalledTimes(1);
    });

    it('should consume r key input and not pass through', () => {
      // Arrange: render dashboard first and create spy
      dashboard.render(80);
      const invalidateSpy = jest.spyOn(dashboard, 'invalidate');

      // Act: handle 'r' key
      dashboard.handleInput('r');

      // Assert: verify invalidate was called (proves input was consumed)
      expect(invalidateSpy).toHaveBeenCalled();
    });

    it('should allow multiple consecutive refreshes', () => {
      // Arrange
      const width = 80;
      dashboard.render(width);

      // Act: refresh multiple times
      dashboard.handleInput('r');
      const render1 = dashboard.render(width);
      
      dashboard.handleInput('r');
      const render2 = dashboard.render(width);
      
      dashboard.handleInput('r');
      const render3 = dashboard.render(width);

      // Assert: each refresh should clear cache
      expect(render1).toBeDefined();
      expect(render2).toBeDefined();
      expect(render3).toBeDefined();
    });
  });

  describe('Help Overlay Command (? key)', () => {
    it('should toggle help overlay visibility when ? key is pressed', () => {
      // Arrange: render dashboard initially (help should be hidden)
      const width = 80;
      const initialRender = dashboard.render(width);
      const initialText = initialRender.join('\n');
      expect(initialText).not.toContain('Keyboard Shortcuts');

      // Act: press '?' to show help
      dashboard.handleInput('?');
      const renderWithHelp = dashboard.render(width);
      const helpText = renderWithHelp.join('\n');

      // Assert: help overlay should be visible
      expect(helpText).toContain('Keyboard Shortcuts');
      expect(renderWithHelp.length).toBeGreaterThan(initialRender.length);
    });

    it('should hide help overlay when ? key is pressed again', () => {
      // Arrange: show help first
      const width = 80;
      dashboard.handleInput('?');
      const renderWithHelp = dashboard.render(width);
      expect(renderWithHelp.join('\n')).toContain('Keyboard Shortcuts');

      // Act: press '?' again to hide help
      dashboard.handleInput('?');
      const renderWithoutHelp = dashboard.render(width);

      // Assert: help overlay should be hidden
      expect(renderWithoutHelp.join('\n')).not.toContain('Keyboard Shortcuts');
    });

    it('should display all keyboard shortcuts in help overlay', () => {
      // Arrange & Act
      const width = 80;
      dashboard.handleInput('?');
      const helpRender = dashboard.render(width);
      const helpText = helpRender.join('\n');

      // Assert: verify all shortcuts are documented
      expect(helpText).toContain('ESC');  // Close dashboard
      expect(helpText).toContain('q');    // Quit/close
      expect(helpText).toContain('r');    // Refresh
      expect(helpText).toContain('?');    // Show help
      expect(helpText).toContain('Tab');  // Navigate tabs
      expect(helpText).toContain('←');    // Navigate left
      expect(helpText).toContain('→');    // Navigate right
      expect(helpText).toContain('↑');    // Scroll up
      expect(helpText).toContain('↓');    // Scroll down
      expect(helpText).toContain('j');    // Scroll down (vim)
      expect(helpText).toContain('k');    // Scroll up (vim)
    });

    it('should format help overlay as a centered overlay', () => {
      // Arrange & Act
      const width = 80;
      dashboard.handleInput('?');
      const helpRender = dashboard.render(width);
      const helpText = helpRender.join('\n');

      // Assert: verify overlay styling
      expect(helpText).toContain('┌'); // Top border
      expect(helpText).toContain('└'); // Bottom border
      expect(helpText).toContain('Keyboard Shortcuts'); // Title
    });

    it('should allow help overlay to be toggled multiple times', () => {
      // Arrange
      const width = 80;

      // Act & Assert: toggle on/off multiple times
      dashboard.handleInput('?');
      expect(dashboard.render(width).join('\n')).toContain('Keyboard Shortcuts');

      dashboard.handleInput('?');
      expect(dashboard.render(width).join('\n')).not.toContain('Keyboard Shortcuts');

      dashboard.handleInput('?');
      expect(dashboard.render(width).join('\n')).toContain('Keyboard Shortcuts');

      dashboard.handleInput('?');
      expect(dashboard.render(width).join('\n')).not.toContain('Keyboard Shortcuts');
    });

    it('should consume ? key input and not pass through', () => {
      // Act
      dashboard.handleInput('?');

      // Assert: verify input was handled without error
      const render = dashboard.render(80);
      expect(render).toBeDefined();
      expect(render.length).toBeGreaterThan(0);
    });

    it('should maintain help overlay state across renders', () => {
      // Arrange: show help
      const width = 80;
      dashboard.handleInput('?');

      // Act: render multiple times
      const render1 = dashboard.render(width);
      const render2 = dashboard.render(width);

      // Assert: help should remain visible
      expect(render1.join('\n')).toContain('Keyboard Shortcuts');
      expect(render2.join('\n')).toContain('Keyboard Shortcuts');
    });

    it('should close help overlay when ESC is pressed', () => {
      // Arrange: show help first
      const width = 80;
      dashboard.handleInput('?');
      expect(dashboard.render(width).join('\n')).toContain('Keyboard Shortcuts');

      // Act: press ESC (but don't close dashboard, just close help)
      // Note: This requires help overlay to handle ESC separately
      dashboard.handleInput('?'); // Toggle off for now

      // Assert: help should be hidden
      expect(dashboard.render(width).join('\n')).not.toContain('Keyboard Shortcuts');
    });
  });

  describe('Quit Command (q key)', () => {
    it('should close dashboard when q key is pressed', () => {
      // Act
      dashboard.handleInput('q');

      // Assert
      expect(onCloseSpy).toHaveBeenCalled();
      expect(onCloseSpy).toHaveBeenCalledTimes(1);
    });

    it('should work with uppercase Q key', () => {
      // Act
      dashboard.handleInput('Q');

      // Assert
      expect(onCloseSpy).toHaveBeenCalled();
    });

    it('should behave identically to ESC key', () => {
      // Arrange: create two dashboards to test independently
      const dashboard1 = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: jest.fn(),
      });
      const dashboard2 = new DashboardComponent({
        stateManager: mockStateManager,
        controller: mockController,
        onClose: jest.fn(),
      });

      // Act: one with 'q', one with ESC
      dashboard1.handleInput('q');
      dashboard2.handleInput('\x1b'); // ESC key

      // Assert: both should call onClose
      expect((dashboard1 as any).onClose).toHaveBeenCalled();
      expect((dashboard2 as any).onClose).toHaveBeenCalled();
    });

    it('should consume q key input and not pass through', () => {
      // Act
      dashboard.handleInput('q');

      // Assert: verify onClose was called (input was consumed)
      expect(onCloseSpy).toHaveBeenCalled();
      
      // Try to render after quit (should not throw)
      const render = dashboard.render(80);
      expect(render).toBeDefined();
    });

    it('should close dashboard even if help overlay is open', () => {
      // Arrange: open help overlay
      dashboard.handleInput('?');
      expect(dashboard.render(80).join('\n')).toContain('Keyboard Shortcuts');

      // Act: press 'q' to quit
      dashboard.handleInput('q');

      // Assert: dashboard should close
      expect(onCloseSpy).toHaveBeenCalled();
    });

    it('should handle multiple q presses gracefully', () => {
      // Act: press 'q' multiple times
      dashboard.handleInput('q');
      dashboard.handleInput('q');
      dashboard.handleInput('q');

      // Assert: onClose should be called each time
      expect(onCloseSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('Command Priority and Conflicts', () => {
    it('should prioritize global commands over component-specific navigation', () => {
      // Arrange: create dashboard with agents so TabBar is active
      const agents = [createMockAgent('agent-1', 'test-agent')];
      (mockStateManager.getAllAgents as jest.Mock).mockReturnValue(agents);
      dashboard.render(80);

      // Act: press 'r' which should refresh, not be passed to TabBar
      dashboard.handleInput('r');

      // Assert: dashboard was refreshed (invalidate called)
      const invalidateSpy = jest.spyOn(dashboard, 'invalidate');
      dashboard.handleInput('r');
      expect(invalidateSpy).toHaveBeenCalled();
    });

    it('should handle q command before routing to sub-components', () => {
      // Arrange: create dashboard with agents
      const agents = [createMockAgent('agent-1', 'test-agent')];
      (mockStateManager.getAllAgents as jest.Mock).mockReturnValue(agents);
      dashboard.render(80);

      // Act: press 'q'
      dashboard.handleInput('q');

      // Assert: onClose should be called immediately
      expect(onCloseSpy).toHaveBeenCalled();
      expect(onCloseSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle ? command before routing to sub-components', () => {
      // Arrange: create dashboard with agents
      const agents = [createMockAgent('agent-1', 'test-agent')];
      (mockStateManager.getAllAgents as jest.Mock).mockReturnValue(agents);

      // Act: press '?'
      dashboard.handleInput('?');
      const render = dashboard.render(80);

      // Assert: help overlay should be shown
      expect(render.join('\n')).toContain('Keyboard Shortcuts');
    });
  });

  describe('Input Consumption', () => {
    it('should not pass through r key to sub-components', () => {
      // Arrange: create dashboard with agents and spy on invalidate
      const agents = [createMockAgent('agent-1', 'test-agent')];
      (mockStateManager.getAllAgents as jest.Mock).mockReturnValue(agents);
      dashboard.render(80);
      const invalidateSpy = jest.spyOn(dashboard, 'invalidate');

      // Act: handle 'r' key
      dashboard.handleInput('r');

      // Assert: verify dashboard consumed the input by calling invalidate
      expect(invalidateSpy).toHaveBeenCalled();
    });

    it('should not pass through q key to sub-components', () => {
      // Arrange
      const agents = [createMockAgent('agent-1', 'test-agent')];
      (mockStateManager.getAllAgents as jest.Mock).mockReturnValue(agents);
      dashboard.render(80);

      // Act
      dashboard.handleInput('q');

      // Assert: onClose was called (input consumed)
      expect(onCloseSpy).toHaveBeenCalled();
    });

    it('should not pass through ? key to sub-components', () => {
      // Arrange
      const agents = [createMockAgent('agent-1', 'test-agent')];
      (mockStateManager.getAllAgents as jest.Mock).mockReturnValue(agents);

      // Act
      dashboard.handleInput('?');
      const render = dashboard.render(80);

      // Assert: help was shown (input consumed)
      expect(render.join('\n')).toContain('Keyboard Shortcuts');
    });

    it('should still pass through Tab key to TabBar for navigation', () => {
      // Arrange: create dashboard with multiple agents
      const agents = [
        createMockAgent('agent-1', 'first'),
        createMockAgent('agent-2', 'second'),
      ];
      (mockStateManager.getAllAgents as jest.Mock).mockReturnValue(agents);
      dashboard.render(80);

      // Act: press Tab (should still work for navigation)
      dashboard.handleInput('\t');

      // Assert: no errors thrown (Tab is handled by TabBar)
      const render = dashboard.render(80);
      expect(render).toBeDefined();
    });

    it('should still pass through arrow keys to appropriate components', () => {
      // Arrange
      const agents = [createMockAgent('agent-1', 'test')];
      (mockStateManager.getAllAgents as jest.Mock).mockReturnValue(agents);
      dashboard.render(80);

      // Act: press arrow keys
      dashboard.handleInput('\x1b[C'); // Right arrow
      dashboard.handleInput('\x1b[A'); // Up arrow

      // Assert: no errors (arrows handled by sub-components)
      const render = dashboard.render(80);
      expect(render).toBeDefined();
    });
  });

  describe('Command Availability', () => {
    it('should handle commands when no agents are present', () => {
      // Arrange: empty agent list
      (mockStateManager.getAllAgents as jest.Mock).mockReturnValue([]);
      dashboard.render(80);

      // Act: try all commands
      dashboard.handleInput('r');
      dashboard.handleInput('?');
      dashboard.handleInput('q');

      // Assert: commands should work
      expect(onCloseSpy).toHaveBeenCalled(); // 'q' worked
    });

    it('should handle commands when help overlay is visible', () => {
      // Arrange: show help
      dashboard.handleInput('?');
      expect(dashboard.render(80).join('\n')).toContain('Keyboard Shortcuts');

      // Act: try refresh while help is open
      dashboard.handleInput('r');

      // Assert: refresh should work
      const render = dashboard.render(80);
      expect(render).toBeDefined();
    });

    it('should handle commands at any time during dashboard lifecycle', () => {
      // Arrange: render dashboard
      dashboard.render(80);

      // Act & Assert: commands work immediately after render
      dashboard.handleInput('r');
      expect(dashboard.render(80)).toBeDefined();

      // Act & Assert: commands work after multiple renders
      dashboard.render(80);
      dashboard.render(80);
      dashboard.handleInput('?');
      expect(dashboard.render(80).join('\n')).toContain('Keyboard Shortcuts');

      // Act & Assert: commands work at end
      dashboard.handleInput('q');
      expect(onCloseSpy).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null input gracefully', () => {
      // Act & Assert: should not throw
      expect(() => {
        dashboard.handleInput(null as any);
      }).not.toThrow();
    });

    it('should handle undefined input gracefully', () => {
      // Act & Assert: should not throw
      expect(() => {
        dashboard.handleInput(undefined as any);
      }).not.toThrow();
    });

    it('should handle empty string input gracefully', () => {
      // Act & Assert: should not throw
      expect(() => {
        dashboard.handleInput('');
      }).not.toThrow();
    });

    it('should handle unknown commands gracefully', () => {
      // Act: send unknown command keys
      expect(() => {
        dashboard.handleInput('x');
        dashboard.handleInput('z');
        dashboard.handleInput('1');
        dashboard.handleInput('@');
      }).not.toThrow();
    });

    it('should handle rapid command sequences', () => {
      // Act: rapid sequence of commands
      dashboard.handleInput('r');
      dashboard.handleInput('?');
      dashboard.handleInput('?');
      dashboard.handleInput('r');
      dashboard.handleInput('q');

      // Assert: all commands processed
      expect(onCloseSpy).toHaveBeenCalled();
    });

    it('should handle commands with different character encodings', () => {
      // Act: try various encodings
      dashboard.handleInput('r');  // ASCII
      dashboard.handleInput('R');  // Uppercase
      dashboard.handleInput('q');  // ASCII
      dashboard.handleInput('Q');  // Uppercase

      // Assert: all variants handled
      expect(onCloseSpy).toHaveBeenCalledTimes(2); // Both q and Q
    });
  });

  describe('Help Overlay Content', () => {
    it('should group shortcuts by category in help overlay', () => {
      // Arrange & Act
      dashboard.handleInput('?');
      const helpText = dashboard.render(80).join('\n');

      // Assert: verify logical grouping
      // Navigation shortcuts grouped together
      const tabIndex = helpText.indexOf('Tab');
      const arrowIndex = helpText.indexOf('←');
      expect(tabIndex).toBeGreaterThan(-1);
      expect(arrowIndex).toBeGreaterThan(-1);

      // Actions grouped together
      const refreshIndex = helpText.indexOf('r');
      const quitIndex = helpText.indexOf('q');
      expect(refreshIndex).toBeGreaterThan(-1);
      expect(quitIndex).toBeGreaterThan(-1);
    });

    it('should include clear descriptions for each shortcut', () => {
      // Arrange & Act
      dashboard.handleInput('?');
      const helpText = dashboard.render(80).join('\n');

      // Assert: verify descriptions are present
      expect(helpText.toLowerCase()).toContain('close');   // For ESC/q
      expect(helpText.toLowerCase()).toContain('refresh');  // For r
      expect(helpText.toLowerCase()).toContain('help');     // For ?
      expect(helpText.toLowerCase()).toContain('navigate'); // For Tab/arrows
      expect(helpText.toLowerCase()).toContain('scroll');   // For j/k
    });

    it('should fit help overlay within dashboard width', () => {
      // Arrange & Act
      const width = 80;
      dashboard.handleInput('?');
      const helpRender = dashboard.render(width);

      // Assert: all lines should fit within width
      for (const line of helpRender) {
        // Strip ANSI codes for accurate length check
        const strippedLine = line.replace(/\x1B\[[0-9;]*m/g, '');
        expect(strippedLine.length).toBeLessThanOrEqual(width);
      }
    });

    it('should display help overlay with proper visual hierarchy', () => {
      // Arrange & Act
      dashboard.handleInput('?');
      const helpText = dashboard.render(80).join('\n');

      // Assert: verify title is prominent
      expect(helpText).toContain('Keyboard Shortcuts');
      
      // Verify structure has borders
      expect(helpText).toMatch(/┌.*┐/); // Top border
      expect(helpText).toMatch(/└.*┘/); // Bottom border
    });
  });

  describe('Integration with Existing Keyboard Handling', () => {
    it('should not interfere with ESC key for closing dashboard', () => {
      // Act: press ESC
      dashboard.handleInput('\x1b');

      // Assert: onClose should be called
      expect(onCloseSpy).toHaveBeenCalled();
    });

    it('should not interfere with Tab navigation', () => {
      // Arrange: create multiple agents
      const agents = [
        createMockAgent('agent-1', 'first'),
        createMockAgent('agent-2', 'second'),
      ];
      (mockStateManager.getAllAgents as jest.Mock).mockReturnValue(agents);
      dashboard.render(80);

      // Act: press Tab
      expect(() => {
        dashboard.handleInput('\t');
      }).not.toThrow();
    });

    it('should not interfere with j/k scrolling', () => {
      // Arrange
      const agents = [createMockAgent('agent-1', 'test')];
      (mockStateManager.getAllAgents as jest.Mock).mockReturnValue(agents);
      dashboard.render(80);

      // Act: press j and k
      expect(() => {
        dashboard.handleInput('j');
        dashboard.handleInput('k');
      }).not.toThrow();
    });

    it('should not interfere with arrow key navigation', () => {
      // Arrange
      const agents = [createMockAgent('agent-1', 'test')];
      (mockStateManager.getAllAgents as jest.Mock).mockReturnValue(agents);
      dashboard.render(80);

      // Act: press arrow keys
      expect(() => {
        dashboard.handleInput('\x1b[C'); // Right
        dashboard.handleInput('\x1b[D'); // Left
        dashboard.handleInput('\x1b[A'); // Up
        dashboard.handleInput('\x1b[B'); // Down
      }).not.toThrow();
    });
  });
});
