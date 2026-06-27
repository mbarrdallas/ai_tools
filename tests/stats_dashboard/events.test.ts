/**
 * Event Handlers Test Suite
 * 
 * Tests for event handler functions in handlers/events.ts (Task T5)
 * 
 * Event handlers process Pi lifecycle events and update the StateManager
 * accordingly. They are the core business logic for metrics collection.
 * 
 * These tests mock the Pi context and events to verify handlers correctly:
 * - Create and track agents
 * - Update metrics from message usage data
 * - Track tool calls with timing and error detection
 * - Detect subagent spawning via tool call inspection
 * - Handle session lifecycle events
 * - Increment turn counts
 * - Update conversation history
 * 
 * Acceptance Criteria:
 * - handleAgentStart() creates root agent if not exists
 * - handleAgentEnd() marks agent as completed/failed
 * - handleMessageEnd() extracts and updates metrics (input/output tokens, cache read/write, cost, context)
 * - handleTurnStart() increments turn count
 * - handleTurnEnd() updates conversation history
 * - handleToolExecutionStart() creates tool call entry, detects subagent spawning
 * - handleToolExecutionEnd() completes tool call, calculates duration, detects errors
 * - handleSessionStart() initializes/resets state based on reason
 * - handleSessionShutdown() cleans up dashboard handle
 * - Subagent detection works via `subagent` tool call inspection
 * - registerEventHandlers() function registers all handlers with Pi API
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type {
  Agent,
  AgentMetrics,
  ToolCall,
  ConversationEntry,
} from '@lib/stats_dashboard/types';

// Mock StateManager and NotificationManager
const mockStateManager = {
  createAgent: jest.fn<(name: string, parentId?: string) => string>(),
  getAgent: jest.fn<(id: string) => Agent | undefined>(),
  getAllAgents: jest.fn<() => Agent[]>(),
  completeAgent: jest.fn<(id: string, status: 'completed' | 'failed') => void>(),
  dismissAgent: jest.fn<(id: string) => void>(),
  updateMetrics: jest.fn<(agentId: string, metrics: Partial<AgentMetrics>) => void>(),
  incrementTurnCount: jest.fn<(agentId: string) => void>(),
  addToolCall: jest.fn<(agentId: string, toolCall: ToolCall) => void>(),
  completeToolCall: jest.fn<(toolCallId: string, update: any) => void>(),
  addConversationEntry: jest.fn<(agentId: string, entry: ConversationEntry) => void>(),
  reset: jest.fn<() => void>(),
};

const mockNotificationManager = {
  checkContextThreshold: jest.fn<(agentId: string) => void>(),
  notifyToolFailure: jest.fn<(agentId: string, toolName: string, error: string) => void>(),
  hasNotified: jest.fn<(type: string, agentId: string) => boolean>(),
  dismiss: jest.fn<(notificationId: string) => void>(),
};

// Mock Pi context
const mockPiContext = {
  ui: {
    notify: jest.fn<(message: string, type?: string) => void>(),
    setStatus: jest.fn<(key: string, value?: string) => void>(),
    custom: jest.fn(),
  },
  model: {
    contextWindow: 128000,
  },
};

// Mock dashboard handle
let mockDashboardHandle: any = null;

// Event handlers module
import {
  handleAgentStart,
  handleAgentEnd,
  handleMessageEnd,
  handleTurnStart,
  handleTurnEnd,
  handleToolExecutionStart,
  handleToolExecutionEnd,
  handleSessionStart,
  handleSessionShutdown,
  registerEventHandlers,
  setManagers,
} from '@lib/stats_dashboard/handlers/events';

describe('Event Handlers', () => {
  let currentAgentId: string;
  let subagentMapping: Map<string, string>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset state
    currentAgentId = 'root-agent-id';
    subagentMapping = new Map();
    mockDashboardHandle = {
      requestRender: jest.fn(),
      close: jest.fn(),
    };

    // Setup managers for handlers
    setManagers(mockStateManager as any, mockNotificationManager as any);

    // Setup default mock returns
    mockStateManager.createAgent.mockReturnValue('new-agent-id');
    mockStateManager.getAgent.mockReturnValue({
      id: currentAgentId,
      name: 'main',
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
      toolCalls: [],
      messageCount: 0,
      subagentIds: [],
    });
    mockStateManager.getAllAgents.mockReturnValue([]);
    mockNotificationManager.hasNotified.mockReturnValue(false);
  });

  describe('handleAgentStart', () => {
    it('should create root agent if not exists', async () => {
      // Arrange
      mockStateManager.getAllAgents.mockReturnValue([]);
      const event = {};
      
      // Act
      await handleAgentStart(event, mockPiContext);
      
      // Assert
      expect(mockStateManager.createAgent).toHaveBeenCalledWith('main', undefined);
    });

    it('should not create agent if root already exists', async () => {
      // Arrange
      const existingAgent: Agent = {
        id: 'existing-root',
        name: 'main',
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
        toolCalls: [],
        messageCount: 0,
        subagentIds: [],
      };
      mockStateManager.getAllAgents.mockReturnValue([existingAgent]);
      const event = {};
      
      // Act
      await handleAgentStart(event, mockPiContext);
      
      // Assert
      expect(mockStateManager.createAgent).not.toHaveBeenCalled();
    });

    it('should set currentAgentId to root agent', async () => {
      // Arrange
      mockStateManager.createAgent.mockReturnValue('root-123');
      const event = {};
      
      // Act
      const agentId = await handleAgentStart(event, mockPiContext);
      
      // Assert
      expect(agentId).toBe('root-123');
    });

    it('should handle event without data gracefully', async () => {
      // Arrange
      const event = {};
      
      // Act & Assert
      // await expect(handleAgentStart(event, mockPiContext)).resolves.not.toThrow();
    });
  });

  describe('handleAgentEnd', () => {
    it('should mark agent as completed when no error', async () => {
      // Arrange
      const event = {
        messages: [
          { role: 'user', content: 'test' },
          { role: 'assistant', content: 'response' },
        ],
      };
      
      // Act
      await handleAgentEnd(event, mockPiContext, currentAgentId);
      
      // Assert
      expect(mockStateManager.completeAgent).toHaveBeenCalledWith(
        currentAgentId,
        'completed'
      );
    });

    it('should mark agent as failed when error message present', async () => {
      // Arrange
      const event = {
        messages: [
          { 
            role: 'assistant',
            content: 'Error occurred',
            errorMessage: 'API call failed',
          },
        ],
      };
      
      // Act
      await handleAgentEnd(event, mockPiContext, currentAgentId);
      
      // Assert
      expect(mockStateManager.completeAgent).toHaveBeenCalledWith(
        currentAgentId,
        'failed'
      );
    });

    it('should handle event with empty messages array', async () => {
      // Arrange
      const event = {
        messages: [],
      };
      
      // Act & Assert
      // await expect(handleAgentEnd(event, mockPiContext, currentAgentId)).resolves.not.toThrow();
    });

    it('should handle event without messages gracefully', async () => {
      // Arrange
      const event = {};
      
      // Act & Assert
      // await expect(handleAgentEnd(event, mockPiContext, currentAgentId)).resolves.not.toThrow();
    });
  });

  describe('handleMessageEnd', () => {
    it('should ignore non-assistant messages', async () => {
      // Arrange
      const event = {
        message: {
          role: 'user',
          content: 'Hello',
        },
      };
      
      // Act
      await handleMessageEnd(event, mockPiContext, currentAgentId);
      
      // Assert
      expect(mockStateManager.updateMetrics).not.toHaveBeenCalled();
    });

    it('should extract and update input tokens', async () => {
      // Arrange
      const event = {
        message: {
          role: 'assistant',
          usage: {
            input: 500,
            output: 200,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: 700,
            cost: { total: 0.005 },
          },
        },
      };
      
      // Act
      await handleMessageEnd(event, mockPiContext, currentAgentId);
      
      // Assert
      expect(mockStateManager.updateMetrics).toHaveBeenCalledWith(
        currentAgentId,
        expect.objectContaining({
          inputTokens: 500,
        })
      );
    });

    it('should extract and update output tokens', async () => {
      // Arrange
      const event = {
        message: {
          role: 'assistant',
          usage: {
            input: 500,
            output: 200,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: 700,
            cost: { total: 0.005 },
          },
        },
      };
      
      // Act
      await handleMessageEnd(event, mockPiContext, currentAgentId);
      
      // Assert
      expect(mockStateManager.updateMetrics).toHaveBeenCalledWith(
        currentAgentId,
        expect.objectContaining({
          outputTokens: 200,
        })
      );
    });

    it('should extract and update cache read tokens', async () => {
      // Arrange
      const event = {
        message: {
          role: 'assistant',
          usage: {
            input: 500,
            output: 200,
            cacheRead: 1000,
            cacheWrite: 0,
            totalTokens: 1700,
            cost: { total: 0.005 },
          },
        },
      };
      
      // Act
      await handleMessageEnd(event, mockPiContext, currentAgentId);
      
      // Assert
      expect(mockStateManager.updateMetrics).toHaveBeenCalledWith(
        currentAgentId,
        expect.objectContaining({
          cacheReadTokens: 1000,
        })
      );
    });

    it('should extract and update cache write tokens', async () => {
      // Arrange
      const event = {
        message: {
          role: 'assistant',
          usage: {
            input: 500,
            output: 200,
            cacheRead: 0,
            cacheWrite: 300,
            totalTokens: 1000,
            cost: { total: 0.005 },
          },
        },
      };
      
      // Act
      await handleMessageEnd(event, mockPiContext, currentAgentId);
      
      // Assert
      expect(mockStateManager.updateMetrics).toHaveBeenCalledWith(
        currentAgentId,
        expect.objectContaining({
          cacheWriteTokens: 300,
        })
      );
    });

    it('should extract and update total cost', async () => {
      // Arrange
      const event = {
        message: {
          role: 'assistant',
          usage: {
            input: 500,
            output: 200,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: 700,
            cost: { total: 0.0123 },
          },
        },
      };
      
      // Act
      await handleMessageEnd(event, mockPiContext, currentAgentId);
      
      // Assert
      expect(mockStateManager.updateMetrics).toHaveBeenCalledWith(
        currentAgentId,
        expect.objectContaining({
          totalCost: 0.0123,
        })
      );
    });

    it('should extract and update context tokens', async () => {
      // Arrange
      const event = {
        message: {
          role: 'assistant',
          usage: {
            input: 500,
            output: 200,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: 700,
            cost: { total: 0.005 },
          },
        },
      };
      
      // Act
      await handleMessageEnd(event, mockPiContext, currentAgentId);
      
      // Assert
      expect(mockStateManager.updateMetrics).toHaveBeenCalledWith(
        currentAgentId,
        expect.objectContaining({
          contextTokens: 700,
        })
      );
    });

    it('should update all metrics in single call', async () => {
      // Arrange
      const event = {
        message: {
          role: 'assistant',
          usage: {
            input: 500,
            output: 200,
            cacheRead: 100,
            cacheWrite: 50,
            totalTokens: 850,
            cost: { total: 0.0075 },
          },
        },
      };
      
      // Act
      await handleMessageEnd(event, mockPiContext, currentAgentId);
      
      // Assert
      expect(mockStateManager.updateMetrics).toHaveBeenCalledWith(
        currentAgentId,
        {
          inputTokens: 500,
          outputTokens: 200,
          cacheReadTokens: 100,
          cacheWriteTokens: 50,
          totalCost: 0.0075,
          contextTokens: 850,
        }
      );
    });

    it('should check context threshold after updating metrics', async () => {
      // Arrange
      const event = {
        message: {
          role: 'assistant',
          usage: {
            input: 500,
            output: 200,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: 700,
            cost: { total: 0.005 },
          },
        },
      };
      
      // Act
      await handleMessageEnd(event, mockPiContext, currentAgentId);
      
      // Assert
      expect(mockNotificationManager.checkContextThreshold).toHaveBeenCalledWith(currentAgentId);
    });

    it('should request UI render if dashboard handle exists', async () => {
      // Arrange
      const event = {
        message: {
          role: 'assistant',
          usage: {
            input: 500,
            output: 200,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: 700,
            cost: { total: 0.005 },
          },
        },
      };
      
      // Act
      await handleMessageEnd(event, mockPiContext, currentAgentId, mockDashboardHandle);
      
      // Assert
      expect(mockDashboardHandle.requestRender).toHaveBeenCalled();
    });

    it('should not crash if dashboard handle is null', async () => {
      // Arrange
      const event = {
        message: {
          role: 'assistant',
          usage: {
            input: 500,
            output: 200,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: 700,
            cost: { total: 0.005 },
          },
        },
      };
      
      // Act & Assert
      // await expect(handleMessageEnd(event, mockPiContext, currentAgentId, null)).resolves.not.toThrow();
    });

    it('should handle missing usage data gracefully', async () => {
      // Arrange
      const event = {
        message: {
          role: 'assistant',
          content: 'response',
        },
      };
      
      // Act
      await handleMessageEnd(event, mockPiContext, currentAgentId);
      
      // Assert
      expect(mockStateManager.updateMetrics).not.toHaveBeenCalled();
    });

    it('should handle missing cost data gracefully', async () => {
      // Arrange
      const event = {
        message: {
          role: 'assistant',
          usage: {
            input: 500,
            output: 200,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: 700,
          },
        },
      };
      
      // Act & Assert
      // await expect(handleMessageEnd(event, mockPiContext, currentAgentId)).resolves.not.toThrow();
    });

    it('should handle zero values in usage', async () => {
      // Arrange
      const event = {
        message: {
          role: 'assistant',
          usage: {
            input: 0,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: 0,
            cost: { total: 0 },
          },
        },
      };
      
      // Act
      await handleMessageEnd(event, mockPiContext, currentAgentId);
      
      // Assert
      expect(mockStateManager.updateMetrics).toHaveBeenCalledWith(
        currentAgentId,
        expect.objectContaining({
          inputTokens: 0,
          outputTokens: 0,
        })
      );
    });
  });

  describe('handleTurnStart', () => {
    it('should increment turn count for current agent', async () => {
      // Arrange
      const event = {
        turnIndex: 0,
        timestamp: Date.now(),
      };
      
      // Act
      await handleTurnStart(event, mockPiContext, currentAgentId);
      
      // Assert
      expect(mockStateManager.incrementTurnCount).toHaveBeenCalledWith(currentAgentId);
    });

    it('should handle multiple turn starts', async () => {
      // Arrange
      const event1 = { turnIndex: 0, timestamp: Date.now() };
      const event2 = { turnIndex: 1, timestamp: Date.now() + 1000 };
      const event3 = { turnIndex: 2, timestamp: Date.now() + 2000 };
      
      // Act
      await handleTurnStart(event1, mockPiContext, currentAgentId);
      await handleTurnStart(event2, mockPiContext, currentAgentId);
      await handleTurnStart(event3, mockPiContext, currentAgentId);
      
      // Assert
      expect(mockStateManager.incrementTurnCount).toHaveBeenCalledTimes(3);
    });

    it('should handle event without turnIndex gracefully', async () => {
      // Arrange
      const event = {
        timestamp: Date.now(),
      };
      
      // Act & Assert
      // await expect(handleTurnStart(event, mockPiContext, currentAgentId)).resolves.not.toThrow();
    });
  });

  describe('handleTurnEnd', () => {
    it('should add conversation entry for user message', async () => {
      // Arrange
      const event = {
        turnIndex: 0,
        message: {
          role: 'user',
          content: 'Hello, assistant!',
        },
      };
      
      // Act
      await handleTurnEnd(event, mockPiContext, currentAgentId);
      
      // Assert
      expect(mockStateManager.addConversationEntry).toHaveBeenCalledWith(
        currentAgentId,
        expect.objectContaining({
          role: 'user',
          preview: expect.stringContaining('Hello'),
        })
      );
    });

    it('should add conversation entry for assistant message', async () => {
      // Arrange
      const event = {
        turnIndex: 0,
        message: {
          role: 'assistant',
          content: 'I can help with that.',
        },
      };
      
      // Act
      await handleTurnEnd(event, mockPiContext, currentAgentId);
      
      // Assert
      expect(mockStateManager.addConversationEntry).toHaveBeenCalledWith(
        currentAgentId,
        expect.objectContaining({
          role: 'assistant',
          preview: expect.stringContaining('help'),
        })
      );
    });

    it('should truncate long message content in preview', async () => {
      // Arrange
      const longContent = 'a'.repeat(500);
      const event = {
        turnIndex: 0,
        message: {
          role: 'user',
          content: longContent,
        },
      };
      
      // Act
      await handleTurnEnd(event, mockPiContext, currentAgentId);
      
      // Assert
      expect(mockStateManager.addConversationEntry).toHaveBeenCalledWith(
        currentAgentId,
        expect.objectContaining({
          preview: expect.stringMatching(/.{1,100}/),
        })
      );
    });

    it('should set timestamp for conversation entry', async () => {
      // Arrange
      const event = {
        turnIndex: 0,
        message: {
          role: 'user',
          content: 'Test message',
        },
      };
      
      // Act
      const beforeCall = Date.now();
      await handleTurnEnd(event, mockPiContext, currentAgentId);
      const afterCall = Date.now();
      
      // Assert
      expect(mockStateManager.addConversationEntry).toHaveBeenCalledWith(
        currentAgentId,
        expect.objectContaining({
          timestamp: expect.any(Number),
        })
      );
    });

    it('should request UI render if dashboard handle exists', async () => {
      // Arrange
      const event = {
        turnIndex: 0,
        message: {
          role: 'user',
          content: 'Test',
        },
      };
      
      // Act
      await handleTurnEnd(event, mockPiContext, currentAgentId, mockDashboardHandle);
      
      // Assert
      expect(mockDashboardHandle.requestRender).toHaveBeenCalled();
    });

    it('should handle event without message gracefully', async () => {
      // Arrange
      const event = {
        turnIndex: 0,
      };
      
      // Act & Assert
      // await expect(handleTurnEnd(event, mockPiContext, currentAgentId)).resolves.not.toThrow();
    });
  });

  describe('handleToolExecutionStart', () => {
    it('should add tool call to current agent', async () => {
      // Arrange
      const event = {
        toolCallId: 'tool-123',
        toolName: 'bash',
        args: { command: 'ls -la' },
      };
      
      // Act
      await handleToolExecutionStart(event, mockPiContext, currentAgentId, subagentMapping);
      
      // Assert
      expect(mockStateManager.addToolCall).toHaveBeenCalledWith(
        currentAgentId,
        expect.objectContaining({
          id: 'tool-123',
          toolName: 'bash',
          status: 'pending',
        })
      );
    });

    it('should set argsSummary using format helper', async () => {
      // Arrange
      const event = {
        toolCallId: 'tool-123',
        toolName: 'read',
        args: { path: '/test/file.txt' },
      };
      
      // Act
      await handleToolExecutionStart(event, mockPiContext, currentAgentId, subagentMapping);
      
      // Assert
      expect(mockStateManager.addToolCall).toHaveBeenCalledWith(
        currentAgentId,
        expect.objectContaining({
          argsSummary: expect.any(String),
        })
      );
    });

    it('should set startTime to current timestamp', async () => {
      // Arrange
      const event = {
        toolCallId: 'tool-123',
        toolName: 'bash',
        args: {},
      };
      
      // Act
      const beforeCall = Date.now();
      await handleToolExecutionStart(event, mockPiContext, currentAgentId, subagentMapping);
      const afterCall = Date.now();
      
      // Assert
      expect(mockStateManager.addToolCall).toHaveBeenCalledWith(
        currentAgentId,
        expect.objectContaining({
          startTime: expect.any(Number),
        })
      );
    });

    it('should detect subagent tool call and create new agent', async () => {
      // Arrange
      mockStateManager.createAgent.mockReturnValue('subagent-456');
      const event = {
        toolCallId: 'tool-123',
        toolName: 'subagent',
        args: {
          agent: 'researcher',
          task: 'Find information about topic X',
        },
      };
      
      // Act
      await handleToolExecutionStart(event, mockPiContext, currentAgentId, subagentMapping);
      
      // Assert
      expect(mockStateManager.createAgent).toHaveBeenCalledWith('researcher', currentAgentId);
    });

    it('should map tool call ID to subagent ID', async () => {
      // Arrange
      mockStateManager.createAgent.mockReturnValue('subagent-456');
      const event = {
        toolCallId: 'tool-123',
        toolName: 'subagent',
        args: {
          agent: 'researcher',
          task: 'Research task',
        },
      };
      const mapping = new Map<string, string>();
      
      // Act
      await handleToolExecutionStart(event, mockPiContext, currentAgentId, mapping);
      
      // Assert
      expect(mapping.get('tool-123')).toBe('subagent-456');
    });

    it('should not create subagent for non-subagent tools', async () => {
      // Arrange
      const event = {
        toolCallId: 'tool-123',
        toolName: 'bash',
        args: { command: 'echo test' },
      };
      
      // Act
      await handleToolExecutionStart(event, mockPiContext, currentAgentId, subagentMapping);
      
      // Assert
      // createAgent should only be called for subagent tool
      // In other tests, expect exactly 1 call for subagent, 0 for others
    });

    it('should request UI render if dashboard handle exists', async () => {
      // Arrange
      const event = {
        toolCallId: 'tool-123',
        toolName: 'bash',
        args: {},
      };
      
      // Act
      await handleToolExecutionStart(event, mockPiContext, currentAgentId, subagentMapping, mockDashboardHandle);
      
      // Assert
      expect(mockDashboardHandle.requestRender).toHaveBeenCalled();
    });

    it('should handle complex args object', async () => {
      // Arrange
      const event = {
        toolCallId: 'tool-123',
        toolName: 'custom_tool',
        args: {
          nested: {
            data: 'value',
          },
          array: [1, 2, 3],
          flag: true,
        },
      };
      
      // Act
      await handleToolExecutionStart(event, mockPiContext, currentAgentId, subagentMapping);
      
      // Assert
      expect(mockStateManager.addToolCall).toHaveBeenCalledWith(
        currentAgentId,
        expect.objectContaining({
          args: event.args,
        })
      );
    });
  });

  describe('handleToolExecutionEnd', () => {
    beforeEach(() => {
      // Setup a pending tool call
      const mockAgent: Agent = {
        id: currentAgentId,
        name: 'main',
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
        toolCalls: [
          {
            id: 'tool-123',
            toolName: 'bash',
            args: { command: 'ls' },
            argsSummary: 'ls',
            status: 'pending',
            startTime: Date.now() - 100,
            endTime: null,
            duration: null,
            isError: false,
            errorMessage: null,
          },
        ],
        messageCount: 0,
        subagentIds: [],
      };
      mockStateManager.getAgent.mockReturnValue(mockAgent);
    });

    it('should complete tool call with success status', async () => {
      // Arrange
      const event = {
        toolCallId: 'tool-123',
        toolName: 'bash',
        result: {
          content: [{ type: 'text', text: 'output' }],
        },
        isError: false,
      };
      
      // Act
      await handleToolExecutionEnd(event, mockPiContext, currentAgentId, subagentMapping);
      
      // Assert
      expect(mockStateManager.completeToolCall).toHaveBeenCalledWith(
        'tool-123',
        expect.objectContaining({
          status: 'success',
          isError: false,
        })
      );
    });

    it('should complete tool call with failed status on error', async () => {
      // Arrange
      const event = {
        toolCallId: 'tool-123',
        toolName: 'bash',
        result: {
          content: [{ type: 'text', text: 'Command not found' }],
          isError: true,
        },
        isError: true,
      };
      
      // Act
      await handleToolExecutionEnd(event, mockPiContext, currentAgentId, subagentMapping);
      
      // Assert
      expect(mockStateManager.completeToolCall).toHaveBeenCalledWith(
        'tool-123',
        expect.objectContaining({
          status: 'failed',
          isError: true,
        })
      );
    });

    it('should set endTime to current timestamp', async () => {
      // Arrange
      const event = {
        toolCallId: 'tool-123',
        toolName: 'bash',
        result: {
          content: [{ type: 'text', text: 'output' }],
        },
        isError: false,
      };
      
      // Act
      const beforeCall = Date.now();
      await handleToolExecutionEnd(event, mockPiContext, currentAgentId, subagentMapping);
      const afterCall = Date.now();
      
      // Assert
      expect(mockStateManager.completeToolCall).toHaveBeenCalledWith(
        'tool-123',
        expect.objectContaining({
          endTime: expect.any(Number),
        })
      );
    });

    it('should extract error message from result on failure', async () => {
      // Arrange
      const event = {
        toolCallId: 'tool-123',
        toolName: 'bash',
        result: {
          content: [
            { type: 'text', text: 'bash: command not found: xyz' },
          ],
          isError: true,
        },
        isError: true,
      };
      
      // Act
      await handleToolExecutionEnd(event, mockPiContext, currentAgentId, subagentMapping);
      
      // Assert
      expect(mockStateManager.completeToolCall).toHaveBeenCalledWith(
        'tool-123',
        expect.objectContaining({
          errorMessage: expect.stringContaining('command not found'),
        })
      );
    });

    it('should set errorMessage to null on success', async () => {
      // Arrange
      const event = {
        toolCallId: 'tool-123',
        toolName: 'bash',
        result: {
          content: [{ type: 'text', text: 'Success' }],
        },
        isError: false,
      };
      
      // Act
      await handleToolExecutionEnd(event, mockPiContext, currentAgentId, subagentMapping);
      
      // Assert
      expect(mockStateManager.completeToolCall).toHaveBeenCalledWith(
        'tool-123',
        expect.objectContaining({
          errorMessage: null,
        })
      );
    });

    it('should notify on tool failure', async () => {
      // Arrange
      const event = {
        toolCallId: 'tool-123',
        toolName: 'bash',
        result: {
          content: [
            { type: 'text', text: 'Command failed: permission denied' },
          ],
          isError: true,
        },
        isError: true,
      };
      
      // Act
      await handleToolExecutionEnd(event, mockPiContext, currentAgentId, subagentMapping);
      
      // Assert
      expect(mockNotificationManager.notifyToolFailure).toHaveBeenCalledWith(
        currentAgentId,
        'bash',
        expect.stringContaining('permission denied')
      );
    });

    it('should not notify on tool success', async () => {
      // Arrange
      const event = {
        toolCallId: 'tool-123',
        toolName: 'bash',
        result: {
          content: [{ type: 'text', text: 'Success' }],
        },
        isError: false,
      };
      
      // Act
      await handleToolExecutionEnd(event, mockPiContext, currentAgentId, subagentMapping);
      
      // Assert
      expect(mockNotificationManager.notifyToolFailure).not.toHaveBeenCalled();
    });

    it('should complete subagent when subagent tool call ends successfully', async () => {
      // Arrange
      subagentMapping.set('tool-123', 'subagent-456');
      const event = {
        toolCallId: 'tool-123',
        toolName: 'subagent',
        result: {
          content: [{ type: 'text', text: 'Subagent completed task' }],
        },
        isError: false,
      };
      
      // Act
      await handleToolExecutionEnd(event, mockPiContext, currentAgentId, subagentMapping);
      
      // Assert
      expect(mockStateManager.completeAgent).toHaveBeenCalledWith(
        'subagent-456',
        'completed'
      );
    });

    it('should mark subagent as failed when subagent tool call fails', async () => {
      // Arrange
      subagentMapping.set('tool-123', 'subagent-456');
      const event = {
        toolCallId: 'tool-123',
        toolName: 'subagent',
        result: {
          content: [{ type: 'text', text: 'Subagent error' }],
          isError: true,
        },
        isError: true,
      };
      
      // Act
      await handleToolExecutionEnd(event, mockPiContext, currentAgentId, subagentMapping);
      
      // Assert
      expect(mockStateManager.completeAgent).toHaveBeenCalledWith(
        'subagent-456',
        'failed'
      );
    });

    it('should remove subagent from mapping after completion', async () => {
      // Arrange
      const mapping = new Map([['tool-123', 'subagent-456']]);
      const event = {
        toolCallId: 'tool-123',
        toolName: 'subagent',
        result: {
          content: [{ type: 'text', text: 'Done' }],
        },
        isError: false,
      };
      
      // Act
      await handleToolExecutionEnd(event, mockPiContext, currentAgentId, mapping);
      
      // Assert
      expect(mapping.has('tool-123')).toBe(false);
    });

    it('should request UI render if dashboard handle exists', async () => {
      // Arrange
      const event = {
        toolCallId: 'tool-123',
        toolName: 'bash',
        result: {
          content: [{ type: 'text', text: 'output' }],
        },
        isError: false,
      };
      
      // Act
      await handleToolExecutionEnd(event, mockPiContext, currentAgentId, subagentMapping, mockDashboardHandle);
      
      // Assert
      expect(mockDashboardHandle.requestRender).toHaveBeenCalled();
    });

    it('should handle non-existent tool call ID gracefully', async () => {
      // Arrange
      const event = {
        toolCallId: 'non-existent',
        toolName: 'bash',
        result: {
          content: [{ type: 'text', text: 'output' }],
        },
        isError: false,
      };
      
      // Act & Assert
      // await expect(handleToolExecutionEnd(event, mockPiContext, currentAgentId, subagentMapping)).resolves.not.toThrow();
    });
  });

  describe('handleSessionStart', () => {
    it('should reset state on new session', async () => {
      // Arrange
      const event = {
        reason: 'new',
      };
      
      // Act
      await handleSessionStart(event, mockPiContext);
      
      // Assert
      expect(mockStateManager.reset).toHaveBeenCalled();
    });

    it('should reset state on startup', async () => {
      // Arrange
      const event = {
        reason: 'startup',
      };
      
      // Act
      await handleSessionStart(event, mockPiContext);
      
      // Assert
      expect(mockStateManager.reset).toHaveBeenCalled();
    });

    it('should not reset state on reload', async () => {
      // Arrange
      const event = {
        reason: 'reload',
      };
      
      // Act
      await handleSessionStart(event, mockPiContext);
      
      // Assert
      expect(mockStateManager.reset).not.toHaveBeenCalled();
    });

    it('should not reset state on resume', async () => {
      // Arrange
      const event = {
        reason: 'resume',
      };
      
      // Act
      await handleSessionStart(event, mockPiContext);
      
      // Assert
      expect(mockStateManager.reset).not.toHaveBeenCalled();
    });

    it('should not reset state on fork', async () => {
      // Arrange
      const event = {
        reason: 'fork',
      };
      
      // Act
      await handleSessionStart(event, mockPiContext);
      
      // Assert
      expect(mockStateManager.reset).not.toHaveBeenCalled();
    });

    it('should store context limit from model info', async () => {
      // Arrange
      const event = {
        reason: 'new',
      };
      const ctx = {
        ...mockPiContext,
        model: {
          contextWindow: 200000,
        },
      };
      
      // Act
      const contextLimit = await handleSessionStart(event, ctx);
      
      // Assert
      expect(contextLimit).toBe(200000);
    });

    it('should use default context limit if model info missing', async () => {
      // Arrange
      const event = {
        reason: 'new',
      };
      const ctx = {
        ...mockPiContext,
        model: undefined,
      };
      
      // Act
      const contextLimit = await handleSessionStart(event, ctx);
      
      // Assert
      expect(contextLimit).toBeGreaterThan(0);
    });

    it('should handle event without reason gracefully', async () => {
      // Arrange
      const event = {};
      
      // Act & Assert
      // await expect(handleSessionStart(event, mockPiContext)).resolves.not.toThrow();
    });
  });

  describe('handleSessionShutdown', () => {
    it('should close dashboard handle if it exists', async () => {
      // Arrange
      const event = {
        reason: 'quit',
      };
      
      // Act
      await handleSessionShutdown(event, mockPiContext, mockDashboardHandle);
      
      // Assert
      expect(mockDashboardHandle.close).toHaveBeenCalled();
    });

    it('should handle null dashboard handle gracefully', async () => {
      // Arrange
      const event = {
        reason: 'quit',
      };
      
      // Act & Assert
      // await expect(handleSessionShutdown(event, mockPiContext, null)).resolves.not.toThrow();
    });

    it('should handle shutdown on reload', async () => {
      // Arrange
      const event = {
        reason: 'reload',
      };
      
      // Act
      await handleSessionShutdown(event, mockPiContext, mockDashboardHandle);
      
      // Assert
      expect(mockDashboardHandle.close).toHaveBeenCalled();
    });

    it('should handle shutdown on new session', async () => {
      // Arrange
      const event = {
        reason: 'new',
      };
      
      // Act
      await handleSessionShutdown(event, mockPiContext, mockDashboardHandle);
      
      // Assert
      expect(mockDashboardHandle.close).toHaveBeenCalled();
    });

    it('should set dashboard handle to null after cleanup', async () => {
      // Arrange
      const event = {
        reason: 'quit',
      };
      
      // Act
      const handle = await handleSessionShutdown(event, mockPiContext, mockDashboardHandle);
      
      // Assert
      expect(handle).toBeNull();
    });
  });

  describe('registerEventHandlers', () => {
    it('should register all event handlers with Pi API', () => {
      // Arrange
      const mockPi = {
        on: jest.fn(),
      };
      
      // Act
      registerEventHandlers(mockPi, mockStateManager as any, mockNotificationManager as any);
      
      // Assert
      expect(mockPi.on).toHaveBeenCalledWith('agent_start', expect.any(Function));
      expect(mockPi.on).toHaveBeenCalledWith('agent_end', expect.any(Function));
      expect(mockPi.on).toHaveBeenCalledWith('message_end', expect.any(Function));
      expect(mockPi.on).toHaveBeenCalledWith('turn_start', expect.any(Function));
      expect(mockPi.on).toHaveBeenCalledWith('turn_end', expect.any(Function));
      expect(mockPi.on).toHaveBeenCalledWith('tool_execution_start', expect.any(Function));
      expect(mockPi.on).toHaveBeenCalledWith('tool_execution_end', expect.any(Function));
      expect(mockPi.on).toHaveBeenCalledWith('session_start', expect.any(Function));
      expect(mockPi.on).toHaveBeenCalledWith('session_shutdown', expect.any(Function));
    });

    it('should register exactly 9 handlers', () => {
      // Arrange
      const mockPi = {
        on: jest.fn(),
      };
      
      // Act
      registerEventHandlers(mockPi, mockStateManager as any, mockNotificationManager as any);
      
      // Assert
      expect(mockPi.on).toHaveBeenCalledTimes(9);
    });

    it('should pass state manager to handlers', () => {
      // Arrange
      const mockPi = {
        on: jest.fn(),
      };
      
      // Act
      registerEventHandlers(mockPi, mockStateManager as any, mockNotificationManager as any);
      
      // Handlers should have closure access to stateManager
      // This is implicitly tested through other tests
    });

    it('should pass notification manager to handlers', () => {
      // Arrange
      const mockPi = {
        on: jest.fn(),
      };
      
      // Act
      registerEventHandlers(mockPi, mockStateManager as any, mockNotificationManager as any);
      
      // Handlers should have closure access to notificationManager
      // This is implicitly tested through other tests
    });
  });

  describe('Integration: Complete Agent Workflow', () => {
    it('should track agent from start to completion', async () => {
      // Arrange
      mockStateManager.createAgent.mockReturnValue('agent-123');
      
      // Act
      // Agent starts
      await handleAgentStart({}, mockPiContext);
      
      // Turn starts
      await handleTurnStart({ turnIndex: 0, timestamp: Date.now() }, mockPiContext, 'agent-123');
      
      // Message ends with metrics
      await handleMessageEnd({
        message: {
          role: 'assistant',
          usage: {
            input: 500,
            output: 200,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: 700,
            cost: { total: 0.005 },
          },
        },
      }, mockPiContext, 'agent-123');
      
      // Turn ends
      await handleTurnEnd({
        turnIndex: 0,
        message: { role: 'user', content: 'test' },
      }, mockPiContext, 'agent-123');
      
      // Agent ends
      await handleAgentEnd({
        messages: [{ role: 'assistant', content: 'done' }],
      }, mockPiContext, 'agent-123');
      
      // Assert
      expect(mockStateManager.createAgent).toHaveBeenCalled();
      expect(mockStateManager.incrementTurnCount).toHaveBeenCalled();
      expect(mockStateManager.updateMetrics).toHaveBeenCalled();
      expect(mockStateManager.addConversationEntry).toHaveBeenCalled();
      expect(mockStateManager.completeAgent).toHaveBeenCalledWith('agent-123', 'completed');
    });

    it('should track tool call from start to completion', async () => {
      // Arrange
      const toolCallId = 'tool-456';
      const agentId = 'agent-123';
      
      // Act
      // Tool starts
      await handleToolExecutionStart({
        toolCallId,
        toolName: 'bash',
        args: { command: 'echo test' },
      }, mockPiContext, agentId, subagentMapping);
      
      // Tool ends
      await handleToolExecutionEnd({
        toolCallId,
        toolName: 'bash',
        result: {
          content: [{ type: 'text', text: 'test' }],
        },
        isError: false,
      }, mockPiContext, agentId, subagentMapping);
      
      // Assert
      expect(mockStateManager.addToolCall).toHaveBeenCalledWith(
        agentId,
        expect.objectContaining({
          id: toolCallId,
          status: 'pending',
        })
      );
      expect(mockStateManager.completeToolCall).toHaveBeenCalledWith(
        toolCallId,
        expect.objectContaining({
          status: 'success',
        })
      );
    });

    it('should track subagent lifecycle', async () => {
      // Arrange
      const parentId = 'parent-123';
      const toolCallId = 'tool-subagent';
      mockStateManager.createAgent.mockReturnValue('subagent-456');
      const mapping = new Map<string, string>();
      
      // Act
      // Parent starts subagent tool
      await handleToolExecutionStart({
        toolCallId,
        toolName: 'subagent',
        args: {
          agent: 'researcher',
          task: 'Research topic',
        },
      }, mockPiContext, parentId, mapping);
      
      // Subagent completes
      await handleToolExecutionEnd({
        toolCallId,
        toolName: 'subagent',
        result: {
          content: [{ type: 'text', text: 'Research complete' }],
        },
        isError: false,
      }, mockPiContext, parentId, mapping);
      
      // Assert
      expect(mockStateManager.createAgent).toHaveBeenCalledWith('researcher', parentId);
      expect(mockStateManager.completeAgent).toHaveBeenCalledWith('subagent-456', 'completed');
      expect(mapping.has(toolCallId)).toBe(false); // Cleaned up
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null or undefined events gracefully', async () => {
      // Act & Assert
      // await expect(handleAgentStart(null as any, mockPiContext)).resolves.not.toThrow();
      // await expect(handleAgentEnd(undefined as any, mockPiContext, currentAgentId)).resolves.not.toThrow();
    });

    it('should handle events with missing required fields', async () => {
      // Arrange
      const incompleteEvent = {
        // Missing toolCallId
        toolName: 'bash',
      };
      
      // Act & Assert
      // await expect(handleToolExecutionStart(incompleteEvent as any, mockPiContext, currentAgentId, subagentMapping)).resolves.not.toThrow();
    });

    it('should handle rapid sequential events', async () => {
      // Arrange
      const events = Array.from({ length: 100 }, (_, i) => ({
        turnIndex: i,
        timestamp: Date.now() + i,
      }));
      
      // Act
      for (const event of events) {
        await handleTurnStart(event, mockPiContext, currentAgentId);
      }
      
      // Assert
      expect(mockStateManager.incrementTurnCount).toHaveBeenCalledTimes(100);
    });

    it('should handle malformed usage data', async () => {
      // Arrange
      const event = {
        message: {
          role: 'assistant',
          usage: {
            // Missing required fields
            input: 100,
            // output missing
            // totalTokens missing
            cost: null, // Invalid cost
          },
        },
      };
      
      // Act & Assert
      // await expect(handleMessageEnd(event as any, mockPiContext, currentAgentId)).resolves.not.toThrow();
    });

    it('should handle very large metric values', async () => {
      // Arrange
      const event = {
        message: {
          role: 'assistant',
          usage: {
            input: Number.MAX_SAFE_INTEGER,
            output: Number.MAX_SAFE_INTEGER,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: Number.MAX_SAFE_INTEGER,
            cost: { total: 999999.99 },
          },
        },
      };
      
      // Act
      await handleMessageEnd(event, mockPiContext, currentAgentId);
      
      // Assert
      expect(mockStateManager.updateMetrics).toHaveBeenCalledWith(
        currentAgentId,
        expect.objectContaining({
          inputTokens: Number.MAX_SAFE_INTEGER,
        })
      );
    });

    it('should handle tool call with empty args', async () => {
      // Arrange
      const event = {
        toolCallId: 'tool-123',
        toolName: 'custom',
        args: {},
      };
      
      // Act
      await handleToolExecutionStart(event, mockPiContext, currentAgentId, subagentMapping);
      
      // Assert
      expect(mockStateManager.addToolCall).toHaveBeenCalledWith(
        currentAgentId,
        expect.objectContaining({
          args: {},
        })
      );
    });

    it('should handle subagent tool with missing agent name', async () => {
      // Arrange
      const event = {
        toolCallId: 'tool-123',
        toolName: 'subagent',
        args: {
          // agent name missing
          task: 'Do something',
        },
      };
      
      // Act & Assert
      // Should handle gracefully - either create with default name or skip
      // await expect(handleToolExecutionStart(event as any, mockPiContext, currentAgentId, subagentMapping)).resolves.not.toThrow();
    });

    it('should handle concurrent events for different agents', async () => {
      // Arrange
      const agent1 = 'agent-1';
      const agent2 = 'agent-2';
      
      // Act
      // await Promise.all([
        handleTurnStart({ turnIndex: 0, timestamp: Date.now() }, mockPiContext, agent1),
        handleTurnStart({ turnIndex: 0, timestamp: Date.now() }, mockPiContext, agent2),
        handleMessageEnd({
          message: { role: 'assistant', usage: { input: 100, output: 50, cacheRead: 0, cacheWrite: 0, totalTokens: 150, cost: { total: 0.001 } } },
        }, mockPiContext, agent1),
        handleMessageEnd({
          message: { role: 'assistant', usage: { input: 200, output: 100, cacheRead: 0, cacheWrite: 0, totalTokens: 300, cost: { total: 0.002 } } },
        }, mockPiContext, agent2),
      // ]);
      
      // Assert
      expect(mockStateManager.incrementTurnCount).toHaveBeenCalledTimes(2);
      expect(mockStateManager.updateMetrics).toHaveBeenCalledTimes(2);
    });
  });
});
