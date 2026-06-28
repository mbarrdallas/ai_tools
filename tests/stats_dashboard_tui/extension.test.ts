/**
 * Extension Entry Point Test Suite
 * 
 * Tests for the stats_dashboard_tui extension entry point (Task T17)
 * 
 * The extension entry point is responsible for:
 * - Initializing all required managers (StateManager, NotificationManager, DashboardController)
 * - Registering event handlers with Pi's event system
 * - Registering the /stats command
 * - Registering the Ctrl+Shift+S keyboard shortcut
 * - Cleaning up resources on session shutdown
 * - Exporting the extension in a format Pi can load
 * 
 * Acceptance Criteria:
 * - Extension exports properly for Pi to load
 * - All event handlers registered on extension load
 * - State manager initialized
 * - Notification manager initialized
 * - Dashboard controller initialized
 * - Command registered
 * - Shortcut registered
 * - Clean shutdown on session end
 * - package.json has correct metadata and extension entry
 * - Extension loads without errors in Pi
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

/**
 * Mock Pi extension API
 */
interface MockPiExtensionAPI {
  on: jest.Mock;
  commands: {
    register: jest.Mock;
    unregister: jest.Mock;
  };
  shortcuts: {
    register: jest.Mock;
    unregister: jest.Mock;
  };
  ui: {
    notify: jest.Mock;
    custom: jest.Mock;
    setStatus: jest.Mock;
  };
  model: {
    contextWindow: number;
  };
}

/**
 * Mock context passed to event handlers
 */
interface MockContext {
  ui: {
    notify: jest.Mock;
    custom: jest.Mock;
    setStatus: jest.Mock;
  };
  commands?: {
    register: jest.Mock;
    unregister: jest.Mock;
  };
  shortcuts?: {
    register: jest.Mock;
    unregister: jest.Mock;
  };
  model?: {
    contextWindow?: number;
  };
}

/**
 * Extension module structure expected by Pi
 */
interface ExtensionModule {
  default?: {
    name: string;
    version: string;
    activate: (pi: any) => Promise<void> | void;
    deactivate?: () => Promise<void> | void;
  };
  activate?: (pi: any) => Promise<void> | void;
  deactivate?: () => Promise<void> | void;
}

describe('Extension Entry Point', () => {
  let mockPi: MockPiExtensionAPI;
  let mockContext: MockContext;
  let extension: ExtensionModule;
  let registeredEventHandlers: Map<string, Function>;

  beforeEach(() => {
    // Clear any module cache
    jest.resetModules();

    // Track registered event handlers
    registeredEventHandlers = new Map();

    // Create mock Pi API
    mockPi = {
      on: jest.fn((eventName: any, handler: any) => {
        registeredEventHandlers.set(eventName, handler);
      }),
      commands: {
        register: jest.fn().mockReturnValue('command-id-123'),
        unregister: jest.fn(),
      },
      shortcuts: {
        register: jest.fn().mockReturnValue('shortcut-id-456'),
        unregister: jest.fn(),
      },
      ui: {
        notify: jest.fn(),
        custom: jest.fn().mockReturnValue({ close: jest.fn(), dispose: jest.fn() }),
        setStatus: jest.fn(),
      },
      model: {
        contextWindow: 128000,
      },
    };

    // Create mock context
    mockContext = {
      ui: {
        notify: jest.fn(),
        custom: jest.fn().mockReturnValue({ close: jest.fn(), dispose: jest.fn() }),
        setStatus: jest.fn(),
      },
      commands: {
        register: jest.fn().mockReturnValue('command-id-123'),
        unregister: jest.fn(),
      },
      shortcuts: {
        register: jest.fn().mockReturnValue('shortcut-id-456'),
        unregister: jest.fn(),
      },
      model: {
        contextWindow: 128000,
      },
    };
  });

  describe('Extension Export Structure', () => {
    it('should export default object with extension metadata', async () => {
      // Dynamic import to avoid caching issues
      const module = await import('@lib/stats_dashboard_tui/index');
      
      expect(module.default).toBeDefined();
      expect(typeof module.default).toBe('object');
    });

    it('should export extension with name property', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      expect(module.default.name).toBeDefined();
      expect(typeof module.default.name).toBe('string');
      expect(module.default.name).toBe('stats_dashboard_tui');
    });

    it('should export extension with version property', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      expect(module.default.version).toBeDefined();
      expect(typeof module.default.version).toBe('string');
      expect(module.default.version).toMatch(/^\d+\.\d+\.\d+$/); // Semver format
    });

    it('should export extension with activate function', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      expect(module.default.activate).toBeDefined();
      expect(typeof module.default.activate).toBe('function');
    });

    it('should export extension with deactivate function', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      expect(module.default.deactivate).toBeDefined();
      expect(typeof module.default.deactivate).toBe('function');
    });

    it('should have activate function that accepts Pi API parameter', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      // Check function signature - should accept one parameter
      expect(module.default.activate.length).toBe(1);
    });
  });

  describe('State Manager Initialization', () => {
    it('should initialize StateManager on activation', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      // After activation, event handlers should be able to create agents
      // This verifies StateManager is initialized
      const agentStartHandler = registeredEventHandlers.get('agent_start');
      expect(agentStartHandler).toBeDefined();
      
      // Call handler and verify it can create agent (StateManager must be initialized)
      const agentId = await agentStartHandler!({}, mockContext);
      expect(agentId).toBeDefined();
      expect(typeof agentId).toBe('string');
    });

    it('should initialize StateManager before registering event handlers', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      // Event handlers should not throw when called
      const agentStartHandler = registeredEventHandlers.get('agent_start');
      
      await expect(async () => {
        await agentStartHandler!({}, mockContext);
      }).not.toThrow();
    });

    it('should have functional StateManager after activation', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      // Test that we can create and retrieve an agent
      const agentStartHandler = registeredEventHandlers.get('agent_start');
      const messageEndHandler = registeredEventHandlers.get('message_end');
      
      const agentId = await agentStartHandler!({}, mockContext);
      
      // Should be able to update metrics without errors
      await expect(async () => {
        await messageEndHandler!(
          {
            message: {
              role: 'assistant',
              usage: {
                input: 100,
                output: 50,
                cacheRead: 10,
                cacheWrite: 5,
                totalTokens: 150,
                cost: { total: 0.001 },
              },
            },
          },
          mockContext
        );
      }).not.toThrow();
    });
  });

  describe('Notification Manager Initialization', () => {
    it('should initialize NotificationManager on activation', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      // Trigger tool failure to verify NotificationManager is working
      const toolExecutionStartHandler = registeredEventHandlers.get('tool_execution_start');
      const toolExecutionEndHandler = registeredEventHandlers.get('tool_execution_end');
      const agentStartHandler = registeredEventHandlers.get('agent_start');
      
      await agentStartHandler!({}, mockContext);
      
      await toolExecutionStartHandler!(
        {
          toolCallId: 'tool-123',
          toolName: 'bash',
          args: { command: 'ls' },
        },
        mockContext
      );
      
      await toolExecutionEndHandler!(
        {
          toolCallId: 'tool-123',
          toolName: 'bash',
          result: { isError: true },
          isError: true,
        },
        mockContext
      );
      
      // NotificationManager should have called ui.notify (via the pi context passed to activate)
      expect(mockPi.ui.notify).toHaveBeenCalled();
    });

    it('should have functional NotificationManager for context warnings', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      const agentStartHandler = registeredEventHandlers.get('agent_start');
      const messageEndHandler = registeredEventHandlers.get('message_end');
      
      await agentStartHandler!({}, mockContext);
      
      // Send message with high context usage (95% of 128000 = 121600)
      await messageEndHandler!(
        {
          message: {
            role: 'assistant',
            usage: {
              input: 100,
              output: 50,
              cacheRead: 0,
              cacheWrite: 0,
              totalTokens: 121600,
              cost: { total: 0.01 },
            },
          },
        },
        mockContext
      );
      
      // Should trigger context threshold notification (via the pi context passed to activate)
      expect(mockPi.ui.notify).toHaveBeenCalledWith(
        expect.stringContaining('context usage is high'),
        expect.any(Object)
      );
    });
  });

  describe('Dashboard Controller Initialization', () => {
    it('should initialize DashboardController on activation', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      // Commands should be registered, which requires DashboardController
      expect(mockPi.commands.register).toHaveBeenCalled();
    });

    it('should register /stats command with DashboardController', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      expect(mockPi.commands.register).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'stats',
          description: expect.any(String),
          execute: expect.any(Function),
        })
      );
    });

    it('should register keyboard shortcut with DashboardController', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      expect(mockPi.shortcuts.register).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'Ctrl+Shift+S',
          description: expect.any(String),
          action: expect.any(Function),
        })
      );
    });

    it('should pass Pi context to DashboardController', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      // Get the command execute function
      const commandCall = mockPi.commands.register.mock.calls[0][0] as any;
      const executeFunc = commandCall.execute;
      
      // Execute should not throw (requires properly initialized controller)
      await expect(async () => {
        await executeFunc();
      }).not.toThrow();
    });
  });

  describe('Event Handler Registration', () => {
    it('should register agent_start event handler', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      expect(mockPi.on).toHaveBeenCalledWith('agent_start', expect.any(Function));
      expect(registeredEventHandlers.has('agent_start')).toBe(true);
    });

    it('should register agent_end event handler', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      expect(mockPi.on).toHaveBeenCalledWith('agent_end', expect.any(Function));
      expect(registeredEventHandlers.has('agent_end')).toBe(true);
    });

    it('should register message_end event handler', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      expect(mockPi.on).toHaveBeenCalledWith('message_end', expect.any(Function));
      expect(registeredEventHandlers.has('message_end')).toBe(true);
    });

    it('should register turn_start event handler', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      expect(mockPi.on).toHaveBeenCalledWith('turn_start', expect.any(Function));
      expect(registeredEventHandlers.has('turn_start')).toBe(true);
    });

    it('should register turn_end event handler', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      expect(mockPi.on).toHaveBeenCalledWith('turn_end', expect.any(Function));
      expect(registeredEventHandlers.has('turn_end')).toBe(true);
    });

    it('should register tool_execution_start event handler', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      expect(mockPi.on).toHaveBeenCalledWith('tool_execution_start', expect.any(Function));
      expect(registeredEventHandlers.has('tool_execution_start')).toBe(true);
    });

    it('should register tool_execution_end event handler', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      expect(mockPi.on).toHaveBeenCalledWith('tool_execution_end', expect.any(Function));
      expect(registeredEventHandlers.has('tool_execution_end')).toBe(true);
    });

    it('should register session_start event handler', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      expect(mockPi.on).toHaveBeenCalledWith('session_start', expect.any(Function));
      expect(registeredEventHandlers.has('session_start')).toBe(true);
    });

    it('should register session_shutdown event handler', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      expect(mockPi.on).toHaveBeenCalledWith('session_shutdown', expect.any(Function));
      expect(registeredEventHandlers.has('session_shutdown')).toBe(true);
    });

    it('should register all required event handlers', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      const requiredEvents = [
        'agent_start',
        'agent_end',
        'message_end',
        'turn_start',
        'turn_end',
        'tool_execution_start',
        'tool_execution_end',
        'session_start',
        'session_shutdown',
      ];
      
      for (const eventName of requiredEvents) {
        expect(registeredEventHandlers.has(eventName)).toBe(true);
      }
      
      expect(registeredEventHandlers.size).toBe(requiredEvents.length);
    });

    it('should register event handlers in correct order', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      // Verify session_start is registered (should be first for initialization)
      const calls = mockPi.on.mock.calls;
      const eventNames = calls.map(call => call[0]);
      
      expect(eventNames).toContain('session_start');
      expect(eventNames).toContain('agent_start');
      expect(eventNames).toContain('session_shutdown');
    });
  });

  describe('Command Registration', () => {
    it('should register /stats command', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      expect(mockPi.commands.register).toHaveBeenCalledTimes(1);
    });

    it('should register command with correct name', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      const commandConfig = mockPi.commands.register.mock.calls[0][0] as any;
      expect(commandConfig.name).toBe('stats');
    });

    it('should register command with description', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      const commandConfig = mockPi.commands.register.mock.calls[0][0] as any;
      expect(commandConfig.description).toBeDefined();
      expect(typeof commandConfig.description).toBe('string');
      expect(commandConfig.description.length).toBeGreaterThan(0);
    });

    it('should register command with execute function', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      const commandConfig = mockPi.commands.register.mock.calls[0][0] as any;
      expect(commandConfig.execute).toBeDefined();
      expect(typeof commandConfig.execute).toBe('function');
    });

    it('should execute command without errors', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      const commandConfig = mockPi.commands.register.mock.calls[0][0] as any;
      
      await expect(async () => {
        await commandConfig.execute();
      }).not.toThrow();
    });

    it('should toggle dashboard when command is executed', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      const commandConfig = mockPi.commands.register.mock.calls[0][0] as any;
      
      // Execute command (should show dashboard)
      await commandConfig.execute();
      
      // Should have called ui.custom to create overlay
      expect(mockPi.ui.custom).toHaveBeenCalled();
    });
  });

  describe('Keyboard Shortcut Registration', () => {
    it('should register Ctrl+Shift+S shortcut', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      expect(mockPi.shortcuts.register).toHaveBeenCalledTimes(1);
    });

    it('should register shortcut with correct key combination', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      const shortcutConfig = mockPi.shortcuts.register.mock.calls[0][0] as any;
      expect(shortcutConfig.key).toBe('Ctrl+Shift+S');
    });

    it('should register shortcut with description', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      const shortcutConfig = mockPi.shortcuts.register.mock.calls[0][0] as any;
      expect(shortcutConfig.description).toBeDefined();
      expect(typeof shortcutConfig.description).toBe('string');
      expect(shortcutConfig.description.length).toBeGreaterThan(0);
    });

    it('should register shortcut with action function', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      const shortcutConfig = mockPi.shortcuts.register.mock.calls[0][0] as any;
      expect(shortcutConfig.action).toBeDefined();
      expect(typeof shortcutConfig.action).toBe('function');
    });

    it('should execute shortcut action without errors', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      const shortcutConfig = mockPi.shortcuts.register.mock.calls[0][0] as any;
      
      await expect(async () => {
        await shortcutConfig.action();
      }).not.toThrow();
    });

    it('should toggle dashboard when shortcut is triggered', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      const shortcutConfig = mockPi.shortcuts.register.mock.calls[0][0] as any;
      
      // Trigger shortcut (should show dashboard)
      await shortcutConfig.action();
      
      // Should have called ui.custom to create overlay
      expect(mockPi.ui.custom).toHaveBeenCalled();
    });
  });

  describe('Session Lifecycle', () => {
    it('should handle session_start event', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      const sessionStartHandler = registeredEventHandlers.get('session_start');
      
      await expect(async () => {
        await sessionStartHandler!({ reason: 'new' }, mockContext);
      }).not.toThrow();
    });

    it('should reset state on new session', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      const agentStartHandler = registeredEventHandlers.get('agent_start');
      const sessionStartHandler = registeredEventHandlers.get('session_start');
      
      // Create an agent
      const agentId1 = await agentStartHandler!({}, mockContext);
      expect(agentId1).toBeDefined();
      
      // Start new session (should reset)
      await sessionStartHandler!({ reason: 'new' }, mockContext);
      
      // Create another agent (should get a different ID)
      const agentId2 = await agentStartHandler!({}, mockContext);
      expect(agentId2).toBeDefined();
      expect(agentId2).not.toBe(agentId1);
    });

    it('should handle session_shutdown event', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      const sessionShutdownHandler = registeredEventHandlers.get('session_shutdown');
      
      await expect(async () => {
        await sessionShutdownHandler!({ reason: 'user_exit' }, mockContext);
      }).not.toThrow();
    });

    it('should close dashboard on session shutdown', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      // Open dashboard first
      const commandConfig = mockPi.commands.register.mock.calls[0][0] as any;
      await commandConfig.execute();
      
      const dashboardHandle = mockPi.ui.custom.mock.results[0].value as any;
      
      // Trigger shutdown
      const sessionShutdownHandler = registeredEventHandlers.get('session_shutdown');
      await sessionShutdownHandler!({ reason: 'user_exit' }, mockContext);
      
      // Dashboard should be closed
      expect(dashboardHandle.close).toHaveBeenCalled();
    });
  });

  describe('Deactivation', () => {
    it('should provide deactivate function', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      expect(module.default.deactivate).toBeDefined();
      expect(typeof module.default.deactivate).toBe('function');
    });

    it('should execute deactivate without errors', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      await expect(async () => {
        await module.default.deactivate!();
      }).not.toThrow();
    });

    it('should unregister command on deactivation', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      await module.default.deactivate!();
      
      // Should have unregistered the command
      expect(mockPi.commands.unregister).toHaveBeenCalledWith('command-id-123');
    });

    it('should unregister shortcut on deactivation', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      await module.default.deactivate!();
      
      // Should have unregistered the shortcut
      expect(mockPi.shortcuts.unregister).toHaveBeenCalledWith('shortcut-id-456');
    });

    it('should close dashboard on deactivation', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      // Open dashboard
      const commandConfig = mockPi.commands.register.mock.calls[0][0] as any;
      await commandConfig.execute();
      
      const dashboardHandle = mockPi.ui.custom.mock.results[0].value as any;
      
      // Deactivate
      await module.default.deactivate!();
      
      // Dashboard should be closed
      expect(dashboardHandle.close).toHaveBeenCalled();
    });

    it('should handle deactivation when dashboard is not open', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      // Deactivate without opening dashboard
      await expect(async () => {
        await module.default.deactivate!();
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should not throw if Pi API is missing commands', async () => {
      const incompletePi = {
        ...mockPi,
        commands: undefined,
      };
      
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await expect(async () => {
        await module.default.activate(incompletePi);
      }).not.toThrow();
    });

    it('should not throw if Pi API is missing shortcuts', async () => {
      const incompletePi = {
        ...mockPi,
        shortcuts: undefined,
      };
      
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await expect(async () => {
        await module.default.activate(incompletePi);
      }).not.toThrow();
    });

    it('should handle activation errors gracefully', async () => {
      const errorPi = {
        ...mockPi,
        on: jest.fn(() => {
          throw new Error('Registration failed');
        }),
      };
      
      const module = await import('@lib/stats_dashboard_tui/index');
      
      // Should either handle the error or throw it (but not crash)
      await expect(async () => {
        await module.default.activate(errorPi);
      }).rejects.toThrow('Registration failed');
    });

    it('should handle deactivation errors gracefully', async () => {
      const errorPi = {
        ...mockPi,
        commands: {
          ...mockPi.commands,
          unregister: jest.fn(() => {
            throw new Error('Unregister failed');
          }),
        },
      };
      
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(errorPi);
      
      // Deactivation should not throw even if cleanup fails
      await expect(async () => {
        await module.default.deactivate!();
      }).not.toThrow();
    });
  });

  describe('Integration', () => {
    it('should successfully complete a full lifecycle', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      // Activate
      await module.default.activate(mockPi);
      
      // Simulate session start
      const sessionStartHandler = registeredEventHandlers.get('session_start');
      await sessionStartHandler!({ reason: 'new' }, mockContext);
      
      // Simulate agent start
      const agentStartHandler = registeredEventHandlers.get('agent_start');
      const agentId = await agentStartHandler!({}, mockContext);
      expect(agentId).toBeDefined();
      
      // Simulate tool execution
      const toolStartHandler = registeredEventHandlers.get('tool_execution_start');
      await toolStartHandler!(
        {
          toolCallId: 'tool-1',
          toolName: 'bash',
          args: { command: 'echo hello' },
        },
        mockContext
      );
      
      const toolEndHandler = registeredEventHandlers.get('tool_execution_end');
      await toolEndHandler!(
        {
          toolCallId: 'tool-1',
          toolName: 'bash',
          result: { content: [{ type: 'text', text: 'hello' }] },
          isError: false,
        },
        mockContext
      );
      
      // Simulate turn
      const turnStartHandler = registeredEventHandlers.get('turn_start');
      await turnStartHandler!({ timestamp: Date.now() }, mockContext);
      
      const messageEndHandler = registeredEventHandlers.get('message_end');
      await messageEndHandler!(
        {
          message: {
            role: 'assistant',
            usage: {
              input: 100,
              output: 50,
              cacheRead: 0,
              cacheWrite: 0,
              totalTokens: 150,
              cost: { total: 0.001 },
            },
          },
        },
        mockContext
      );
      
      const turnEndHandler = registeredEventHandlers.get('turn_end');
      await turnEndHandler!(
        {
          message: {
            role: 'assistant',
            content: 'Test response',
          },
        },
        mockContext
      );
      
      // Open dashboard via command
      const commandConfig = mockPi.commands.register.mock.calls[0][0] as any;
      await commandConfig.execute();
      
      // Close via shortcut
      const shortcutConfig = mockPi.shortcuts.register.mock.calls[0][0] as any;
      await shortcutConfig.action();
      
      // Simulate agent end
      const agentEndHandler = registeredEventHandlers.get('agent_end');
      await agentEndHandler!({ messages: [] }, mockContext);
      
      // Simulate session shutdown
      const sessionShutdownHandler = registeredEventHandlers.get('session_shutdown');
      await sessionShutdownHandler!({ reason: 'user_exit' }, mockContext);
      
      // Deactivate
      await module.default.deactivate!();
      
      // No assertions needed - if we got here without throwing, lifecycle is complete
      expect(true).toBe(true);
    });

    it('should maintain state across multiple command invocations', async () => {
      const module = await import('@lib/stats_dashboard_tui/index');
      
      await module.default.activate(mockPi);
      
      // Create agents
      const agentStartHandler = registeredEventHandlers.get('agent_start');
      await agentStartHandler!({}, mockContext);
      
      // Toggle dashboard multiple times
      const commandConfig = mockPi.commands.register.mock.calls[0][0] as any;
      
      await commandConfig.execute(); // Show
      await commandConfig.execute(); // Hide
      await commandConfig.execute(); // Show again
      
      // State should persist
      expect(mockPi.ui.custom).toHaveBeenCalledTimes(2); // Show twice
    });
  });

  describe('Package Metadata', () => {
    it('should have valid package.json with extension entry', async () => {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const packageJsonPath = path.join(
        process.cwd(),
        'extensions',
        'stats_dashboard_tui',
        'package.json'
      );
      
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      expect(packageJson.name).toBe('stats_dashboard_tui');
      expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should have main entry point in package.json', async () => {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const packageJsonPath = path.join(
        process.cwd(),
        'extensions',
        'stats_dashboard_tui',
        'package.json'
      );
      
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      expect(packageJson.main).toBeDefined();
      expect(typeof packageJson.main).toBe('string');
    });

    it('should have correct extension type in package.json', async () => {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const packageJsonPath = path.join(
        process.cwd(),
        'extensions',
        'stats_dashboard_tui',
        'package.json'
      );
      
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      expect(packageJson.pi?.extension).toBe(true);
    });
  });
});
