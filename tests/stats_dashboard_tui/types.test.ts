/**
 * Types Test Suite
 * 
 * Tests for TypeScript type definitions in types.ts
 * 
 * These tests verify:
 * - All types are properly exported
 * - Type structures match the data model specification
 * - Required fields are present in interfaces
 * - Enums contain expected values
 * 
 * Note: These tests use TypeScript's type system at compile time.
 * Runtime tests verify that values conform to expected shapes.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Import all types that should be exported
import type {
  AgentStatus,
  Agent,
  AgentMetrics,
  ToolCall,
  ToolCallStatus,
  ConversationEntry,
  MessageRole,
  Notification,
  NotificationType,
  DashboardState,
  DataStore,
} from '@shared/stats_dashboard_tui/types';

describe('TypeScript Type Definitions', () => {
  describe('Type Exports', () => {
    it('should export AgentStatus type', () => {
      const validStatuses: AgentStatus[] = ['running', 'completed', 'failed'];
      expect(validStatuses).toHaveLength(3);
    });

    it('should export Agent interface', () => {
      const agent: Agent = {
        id: 'test-id',
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
          contextLimit: 100000,
          turnCount: 0,
        },
        toolCalls: [],
        messageCount: 0,
        subagentIds: [],
      };
      expect(agent).toBeDefined();
    });

    it('should export AgentMetrics interface', () => {
      const metrics: AgentMetrics = {
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 20,
        cacheWriteTokens: 10,
        totalCost: 0.005,
        contextTokens: 1000,
        contextLimit: 100000,
        turnCount: 1,
      };
      expect(metrics).toBeDefined();
    });

    it('should export ToolCall interface', () => {
      const toolCall: ToolCall = {
        id: 'tool-call-id',
        toolName: 'bash',
        args: { command: 'ls' },
        argsSummary: 'ls',
        status: 'success',
        startTime: Date.now(),
        endTime: Date.now() + 100,
        duration: 100,
        isError: false,
        errorMessage: null,
      };
      expect(toolCall).toBeDefined();
    });

    it('should export ToolCallStatus type', () => {
      const validStatuses: ToolCallStatus[] = ['pending', 'success', 'failed'];
      expect(validStatuses).toHaveLength(3);
    });

    it('should export ConversationEntry interface', () => {
      const entry: ConversationEntry = {
        role: 'user',
        preview: 'Test message',
        timestamp: Date.now(),
      };
      expect(entry).toBeDefined();
    });

    it('should export MessageRole type', () => {
      const validRoles: MessageRole[] = ['user', 'assistant', 'toolResult'];
      expect(validRoles).toHaveLength(3);
    });

    it('should export Notification interface', () => {
      const notification: Notification = {
        id: 'notif-id',
        type: 'context_high',
        agentId: 'agent-id',
        message: 'Context usage high',
        timestamp: Date.now(),
        dismissed: false,
      };
      expect(notification).toBeDefined();
    });

    it('should export NotificationType type', () => {
      const validTypes: NotificationType[] = ['context_high', 'tool_failed'];
      expect(validTypes).toHaveLength(2);
    });

    it('should export DashboardState interface', () => {
      const state: DashboardState = {
        isVisible: false,
        selectedAgentId: null,
        expandedSections: new Set<string>(),
      };
      expect(state).toBeDefined();
    });

    it('should export DataStore interface', () => {
      const store: DataStore = {
        agents: new Map(),
        rootAgentId: null,
        notifications: [],
        dashboard: {
          isVisible: false,
          selectedAgentId: null,
          expandedSections: new Set<string>(),
        },
      };
      expect(store).toBeDefined();
    });
  });

  describe('AgentStatus Type', () => {
    it('should accept "running" status', () => {
      const status: AgentStatus = 'running';
      expect(status).toBe('running');
    });

    it('should accept "completed" status', () => {
      const status: AgentStatus = 'completed';
      expect(status).toBe('completed');
    });

    it('should accept "failed" status', () => {
      const status: AgentStatus = 'failed';
      expect(status).toBe('failed');
    });

    it('should only accept valid status values', () => {
      const validStatuses: AgentStatus[] = ['running', 'completed', 'failed'];
      validStatuses.forEach(status => {
        expect(['running', 'completed', 'failed']).toContain(status);
      });
    });
  });

  describe('Agent Interface', () => {
    let validAgent: Agent;

    beforeEach(() => {
      validAgent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'test-agent',
        status: 'running',
        parentId: null,
        startTime: 1640000000000,
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
    });

    it('should have required field: id (string)', () => {
      expect(validAgent).toHaveProperty('id');
      expect(typeof validAgent.id).toBe('string');
      expect(validAgent.id.length).toBeGreaterThan(0);
    });

    it('should have required field: name (string)', () => {
      expect(validAgent).toHaveProperty('name');
      expect(typeof validAgent.name).toBe('string');
      expect(validAgent.name.length).toBeGreaterThan(0);
    });

    it('should have required field: status (AgentStatus)', () => {
      expect(validAgent).toHaveProperty('status');
      expect(['running', 'completed', 'failed']).toContain(validAgent.status);
    });

    it('should have required field: parentId (string | null)', () => {
      expect(validAgent).toHaveProperty('parentId');
      expect(validAgent.parentId).toBeNull();
      
      const childAgent: Agent = { ...validAgent, parentId: 'parent-id' };
      expect(typeof childAgent.parentId).toBe('string');
    });

    it('should have required field: startTime (number)', () => {
      expect(validAgent).toHaveProperty('startTime');
      expect(typeof validAgent.startTime).toBe('number');
      expect(validAgent.startTime).toBeGreaterThan(0);
    });

    it('should have required field: endTime (number | null)', () => {
      expect(validAgent).toHaveProperty('endTime');
      expect(validAgent.endTime).toBeNull();
      
      const completedAgent: Agent = { ...validAgent, endTime: Date.now() };
      expect(typeof completedAgent.endTime).toBe('number');
    });

    it('should have required field: metrics (AgentMetrics)', () => {
      expect(validAgent).toHaveProperty('metrics');
      expect(typeof validAgent.metrics).toBe('object');
      expect(validAgent.metrics).toHaveProperty('inputTokens');
    });

    it('should have required field: toolCalls (ToolCall[])', () => {
      expect(validAgent).toHaveProperty('toolCalls');
      expect(Array.isArray(validAgent.toolCalls)).toBe(true);
    });

    it('should have required field: messageCount (number)', () => {
      expect(validAgent).toHaveProperty('messageCount');
      expect(typeof validAgent.messageCount).toBe('number');
      expect(validAgent.messageCount).toBeGreaterThanOrEqual(0);
    });

    it('should have required field: subagentIds (string[])', () => {
      expect(validAgent).toHaveProperty('subagentIds');
      expect(Array.isArray(validAgent.subagentIds)).toBe(true);
    });

    it('should support parent-child relationship', () => {
      const parentAgent: Agent = { ...validAgent, id: 'parent-id' };
      const childAgent: Agent = {
        ...validAgent,
        id: 'child-id',
        parentId: 'parent-id',
      };
      
      expect(childAgent.parentId).toBe(parentAgent.id);
    });

    it('should support subagent tracking', () => {
      const agentWithSubagents: Agent = {
        ...validAgent,
        subagentIds: ['subagent-1', 'subagent-2'],
      };
      
      expect(agentWithSubagents.subagentIds).toHaveLength(2);
      expect(agentWithSubagents.subagentIds).toContain('subagent-1');
      expect(agentWithSubagents.subagentIds).toContain('subagent-2');
    });
  });

  describe('AgentMetrics Interface', () => {
    let validMetrics: AgentMetrics;

    beforeEach(() => {
      validMetrics = {
        inputTokens: 1500,
        outputTokens: 500,
        cacheReadTokens: 200,
        cacheWriteTokens: 100,
        totalCost: 0.0125,
        contextTokens: 2000,
        contextLimit: 100000,
        turnCount: 3,
      };
    });

    it('should have required field: inputTokens (number >= 0)', () => {
      expect(validMetrics).toHaveProperty('inputTokens');
      expect(typeof validMetrics.inputTokens).toBe('number');
      expect(validMetrics.inputTokens).toBeGreaterThanOrEqual(0);
    });

    it('should have required field: outputTokens (number >= 0)', () => {
      expect(validMetrics).toHaveProperty('outputTokens');
      expect(typeof validMetrics.outputTokens).toBe('number');
      expect(validMetrics.outputTokens).toBeGreaterThanOrEqual(0);
    });

    it('should have required field: cacheReadTokens (number >= 0)', () => {
      expect(validMetrics).toHaveProperty('cacheReadTokens');
      expect(typeof validMetrics.cacheReadTokens).toBe('number');
      expect(validMetrics.cacheReadTokens).toBeGreaterThanOrEqual(0);
    });

    it('should have required field: cacheWriteTokens (number >= 0)', () => {
      expect(validMetrics).toHaveProperty('cacheWriteTokens');
      expect(typeof validMetrics.cacheWriteTokens).toBe('number');
      expect(validMetrics.cacheWriteTokens).toBeGreaterThanOrEqual(0);
    });

    it('should have required field: totalCost (number >= 0)', () => {
      expect(validMetrics).toHaveProperty('totalCost');
      expect(typeof validMetrics.totalCost).toBe('number');
      expect(validMetrics.totalCost).toBeGreaterThanOrEqual(0);
    });

    it('should have required field: contextTokens (number >= 0)', () => {
      expect(validMetrics).toHaveProperty('contextTokens');
      expect(typeof validMetrics.contextTokens).toBe('number');
      expect(validMetrics.contextTokens).toBeGreaterThanOrEqual(0);
    });

    it('should have required field: contextLimit (number > 0)', () => {
      expect(validMetrics).toHaveProperty('contextLimit');
      expect(typeof validMetrics.contextLimit).toBe('number');
      expect(validMetrics.contextLimit).toBeGreaterThan(0);
    });

    it('should have required field: turnCount (number >= 0)', () => {
      expect(validMetrics).toHaveProperty('turnCount');
      expect(typeof validMetrics.turnCount).toBe('number');
      expect(validMetrics.turnCount).toBeGreaterThanOrEqual(0);
    });

    it('should support zero values for all token counts', () => {
      const zeroMetrics: AgentMetrics = {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalCost: 0,
        contextTokens: 0,
        contextLimit: 100000,
        turnCount: 0,
      };
      
      expect(zeroMetrics.inputTokens).toBe(0);
      expect(zeroMetrics.outputTokens).toBe(0);
      expect(zeroMetrics.cacheReadTokens).toBe(0);
      expect(zeroMetrics.cacheWriteTokens).toBe(0);
      expect(zeroMetrics.totalCost).toBe(0);
      expect(zeroMetrics.turnCount).toBe(0);
    });

    it('should allow context tokens less than context limit', () => {
      expect(validMetrics.contextTokens).toBeLessThan(validMetrics.contextLimit);
    });

    it('should support high context usage scenario (>= 80%)', () => {
      const highContextMetrics: AgentMetrics = {
        ...validMetrics,
        contextTokens: 85000,
        contextLimit: 100000,
      };
      
      const usagePercent = (highContextMetrics.contextTokens / highContextMetrics.contextLimit) * 100;
      expect(usagePercent).toBeGreaterThanOrEqual(80);
    });
  });

  describe('ToolCall Interface', () => {
    let validToolCall: ToolCall;

    beforeEach(() => {
      validToolCall = {
        id: 'tool-call-123',
        toolName: 'bash',
        args: { command: 'ls -la' },
        argsSummary: 'ls -la',
        status: 'success',
        startTime: 1640000000000,
        endTime: 1640000000250,
        duration: 250,
        isError: false,
        errorMessage: null,
      };
    });

    it('should have required field: id (string)', () => {
      expect(validToolCall).toHaveProperty('id');
      expect(typeof validToolCall.id).toBe('string');
      expect(validToolCall.id.length).toBeGreaterThan(0);
    });

    it('should have required field: toolName (string)', () => {
      expect(validToolCall).toHaveProperty('toolName');
      expect(typeof validToolCall.toolName).toBe('string');
      expect(validToolCall.toolName.length).toBeGreaterThan(0);
    });

    it('should have required field: args (Record<string, unknown>)', () => {
      expect(validToolCall).toHaveProperty('args');
      expect(typeof validToolCall.args).toBe('object');
    });

    it('should have required field: argsSummary (string)', () => {
      expect(validToolCall).toHaveProperty('argsSummary');
      expect(typeof validToolCall.argsSummary).toBe('string');
    });

    it('should have required field: status (ToolCallStatus)', () => {
      expect(validToolCall).toHaveProperty('status');
      expect(['pending', 'success', 'failed']).toContain(validToolCall.status);
    });

    it('should have required field: startTime (number)', () => {
      expect(validToolCall).toHaveProperty('startTime');
      expect(typeof validToolCall.startTime).toBe('number');
      expect(validToolCall.startTime).toBeGreaterThan(0);
    });

    it('should have required field: endTime (number | null)', () => {
      expect(validToolCall).toHaveProperty('endTime');
      
      const pendingToolCall: ToolCall = { ...validToolCall, status: 'pending', endTime: null };
      expect(pendingToolCall.endTime).toBeNull();
      
      const completedToolCall: ToolCall = { ...validToolCall, endTime: Date.now() };
      expect(typeof completedToolCall.endTime).toBe('number');
    });

    it('should have required field: duration (number | null)', () => {
      expect(validToolCall).toHaveProperty('duration');
      
      const pendingToolCall: ToolCall = { ...validToolCall, status: 'pending', duration: null };
      expect(pendingToolCall.duration).toBeNull();
      
      const completedToolCall: ToolCall = { ...validToolCall, duration: 250 };
      expect(typeof completedToolCall.duration).toBe('number');
    });

    it('should have required field: isError (boolean)', () => {
      expect(validToolCall).toHaveProperty('isError');
      expect(typeof validToolCall.isError).toBe('boolean');
    });

    it('should have required field: errorMessage (string | null)', () => {
      expect(validToolCall).toHaveProperty('errorMessage');
      expect(validToolCall.errorMessage).toBeNull();
      
      const failedToolCall: ToolCall = {
        ...validToolCall,
        status: 'failed',
        isError: true,
        errorMessage: 'Command not found',
      };
      expect(typeof failedToolCall.errorMessage).toBe('string');
    });

    it('should support pending status with null endTime and duration', () => {
      const pendingToolCall: ToolCall = {
        ...validToolCall,
        status: 'pending',
        endTime: null,
        duration: null,
      };
      
      expect(pendingToolCall.status).toBe('pending');
      expect(pendingToolCall.endTime).toBeNull();
      expect(pendingToolCall.duration).toBeNull();
    });

    it('should support success status with timing information', () => {
      expect(validToolCall.status).toBe('success');
      expect(validToolCall.endTime).not.toBeNull();
      expect(validToolCall.duration).not.toBeNull();
      expect(validToolCall.isError).toBe(false);
      expect(validToolCall.errorMessage).toBeNull();
    });

    it('should support failed status with error message', () => {
      const failedToolCall: ToolCall = {
        ...validToolCall,
        status: 'failed',
        isError: true,
        errorMessage: 'Permission denied',
      };
      
      expect(failedToolCall.status).toBe('failed');
      expect(failedToolCall.isError).toBe(true);
      expect(failedToolCall.errorMessage).not.toBeNull();
    });

    it('should allow empty args object', () => {
      const toolCallWithoutArgs: ToolCall = {
        ...validToolCall,
        args: {},
      };
      
      expect(toolCallWithoutArgs.args).toEqual({});
    });
  });

  describe('ToolCallStatus Type', () => {
    it('should accept "pending" status', () => {
      const status: ToolCallStatus = 'pending';
      expect(status).toBe('pending');
    });

    it('should accept "success" status', () => {
      const status: ToolCallStatus = 'success';
      expect(status).toBe('success');
    });

    it('should accept "failed" status', () => {
      const status: ToolCallStatus = 'failed';
      expect(status).toBe('failed');
    });
  });

  describe('ConversationEntry Interface', () => {
    let validEntry: ConversationEntry;

    beforeEach(() => {
      validEntry = {
        role: 'user',
        preview: 'This is a test message preview',
        timestamp: Date.now(),
      };
    });

    it('should have required field: role (MessageRole)', () => {
      expect(validEntry).toHaveProperty('role');
      expect(['user', 'assistant', 'toolResult']).toContain(validEntry.role);
    });

    it('should have required field: preview (string)', () => {
      expect(validEntry).toHaveProperty('preview');
      expect(typeof validEntry.preview).toBe('string');
    });

    it('should have required field: timestamp (number)', () => {
      expect(validEntry).toHaveProperty('timestamp');
      expect(typeof validEntry.timestamp).toBe('number');
      expect(validEntry.timestamp).toBeGreaterThan(0);
    });

    it('should support user role', () => {
      const userEntry: ConversationEntry = {
        role: 'user',
        preview: 'User message',
        timestamp: Date.now(),
      };
      expect(userEntry.role).toBe('user');
    });

    it('should support assistant role', () => {
      const assistantEntry: ConversationEntry = {
        role: 'assistant',
        preview: 'Assistant response',
        timestamp: Date.now(),
      };
      expect(assistantEntry.role).toBe('assistant');
    });

    it('should support toolResult role', () => {
      const toolResultEntry: ConversationEntry = {
        role: 'toolResult',
        preview: 'Tool execution result',
        timestamp: Date.now(),
      };
      expect(toolResultEntry.role).toBe('toolResult');
    });

    it('should handle truncated preview text (approx 100 chars)', () => {
      const longText = 'a'.repeat(150);
      const truncatedEntry: ConversationEntry = {
        role: 'user',
        preview: longText.substring(0, 100),
        timestamp: Date.now(),
      };
      expect(truncatedEntry.preview.length).toBeLessThanOrEqual(100);
    });
  });

  describe('MessageRole Type', () => {
    it('should accept "user" role', () => {
      const role: MessageRole = 'user';
      expect(role).toBe('user');
    });

    it('should accept "assistant" role', () => {
      const role: MessageRole = 'assistant';
      expect(role).toBe('assistant');
    });

    it('should accept "toolResult" role', () => {
      const role: MessageRole = 'toolResult';
      expect(role).toBe('toolResult');
    });
  });

  describe('Notification Interface', () => {
    let validNotification: Notification;

    beforeEach(() => {
      validNotification = {
        id: 'notif-123',
        type: 'context_high',
        agentId: 'agent-456',
        message: 'Context usage is at 85%',
        timestamp: Date.now(),
        dismissed: false,
      };
    });

    it('should have required field: id (string)', () => {
      expect(validNotification).toHaveProperty('id');
      expect(typeof validNotification.id).toBe('string');
      expect(validNotification.id.length).toBeGreaterThan(0);
    });

    it('should have required field: type (NotificationType)', () => {
      expect(validNotification).toHaveProperty('type');
      expect(['context_high', 'tool_failed']).toContain(validNotification.type);
    });

    it('should have required field: agentId (string)', () => {
      expect(validNotification).toHaveProperty('agentId');
      expect(typeof validNotification.agentId).toBe('string');
    });

    it('should have required field: message (string)', () => {
      expect(validNotification).toHaveProperty('message');
      expect(typeof validNotification.message).toBe('string');
      expect(validNotification.message.length).toBeGreaterThan(0);
    });

    it('should have required field: timestamp (number)', () => {
      expect(validNotification).toHaveProperty('timestamp');
      expect(typeof validNotification.timestamp).toBe('number');
      expect(validNotification.timestamp).toBeGreaterThan(0);
    });

    it('should have required field: dismissed (boolean)', () => {
      expect(validNotification).toHaveProperty('dismissed');
      expect(typeof validNotification.dismissed).toBe('boolean');
    });

    it('should support context_high notification type', () => {
      expect(validNotification.type).toBe('context_high');
    });

    it('should support tool_failed notification type', () => {
      const toolFailedNotif: Notification = {
        ...validNotification,
        type: 'tool_failed',
        message: 'Tool execution failed: bash',
      };
      expect(toolFailedNotif.type).toBe('tool_failed');
    });

    it('should default dismissed to false', () => {
      expect(validNotification.dismissed).toBe(false);
    });

    it('should allow dismissed to be true', () => {
      const dismissedNotif: Notification = {
        ...validNotification,
        dismissed: true,
      };
      expect(dismissedNotif.dismissed).toBe(true);
    });
  });

  describe('NotificationType Type', () => {
    it('should accept "context_high" type', () => {
      const type: NotificationType = 'context_high';
      expect(type).toBe('context_high');
    });

    it('should accept "tool_failed" type', () => {
      const type: NotificationType = 'tool_failed';
      expect(type).toBe('tool_failed');
    });
  });

  describe('DashboardState Interface', () => {
    let validState: DashboardState;

    beforeEach(() => {
      validState = {
        isVisible: false,
        selectedAgentId: null,
        expandedSections: new Set<string>(),
      };
    });

    it('should have required field: isVisible (boolean)', () => {
      expect(validState).toHaveProperty('isVisible');
      expect(typeof validState.isVisible).toBe('boolean');
    });

    it('should have required field: selectedAgentId (string | null)', () => {
      expect(validState).toHaveProperty('selectedAgentId');
      expect(validState.selectedAgentId).toBeNull();
      
      const stateWithSelection: DashboardState = {
        ...validState,
        selectedAgentId: 'agent-123',
      };
      expect(typeof stateWithSelection.selectedAgentId).toBe('string');
    });

    it('should have required field: expandedSections (Set<string>)', () => {
      expect(validState).toHaveProperty('expandedSections');
      expect(validState.expandedSections).toBeInstanceOf(Set);
    });

    it('should support isVisible false as default', () => {
      expect(validState.isVisible).toBe(false);
    });

    it('should support isVisible true', () => {
      const visibleState: DashboardState = {
        ...validState,
        isVisible: true,
      };
      expect(visibleState.isVisible).toBe(true);
    });

    it('should support null selectedAgentId (no selection)', () => {
      expect(validState.selectedAgentId).toBeNull();
    });

    it('should support string selectedAgentId (agent selected)', () => {
      const selectedState: DashboardState = {
        ...validState,
        selectedAgentId: 'root-agent',
      };
      expect(selectedState.selectedAgentId).toBe('root-agent');
    });

    it('should support empty expandedSections Set', () => {
      expect(validState.expandedSections.size).toBe(0);
    });

    it('should support populated expandedSections Set', () => {
      const expandedState: DashboardState = {
        ...validState,
        expandedSections: new Set(['metrics', 'tools', 'conversation']),
      };
      expect(expandedState.expandedSections.size).toBe(3);
      expect(expandedState.expandedSections.has('metrics')).toBe(true);
    });
  });

  describe('DataStore Interface', () => {
    let validStore: DataStore;

    beforeEach(() => {
      validStore = {
        agents: new Map(),
        rootAgentId: null,
        notifications: [],
        dashboard: {
          isVisible: false,
          selectedAgentId: null,
          expandedSections: new Set<string>(),
        },
      };
    });

    it('should have required field: agents (Map<string, Agent>)', () => {
      expect(validStore).toHaveProperty('agents');
      expect(validStore.agents).toBeInstanceOf(Map);
    });

    it('should have required field: rootAgentId (string | null)', () => {
      expect(validStore).toHaveProperty('rootAgentId');
      expect(validStore.rootAgentId).toBeNull();
      
      const storeWithRoot: DataStore = {
        ...validStore,
        rootAgentId: 'root-123',
      };
      expect(typeof storeWithRoot.rootAgentId).toBe('string');
    });

    it('should have required field: notifications (Notification[])', () => {
      expect(validStore).toHaveProperty('notifications');
      expect(Array.isArray(validStore.notifications)).toBe(true);
    });

    it('should have required field: dashboard (DashboardState)', () => {
      expect(validStore).toHaveProperty('dashboard');
      expect(typeof validStore.dashboard).toBe('object');
      expect(validStore.dashboard).toHaveProperty('isVisible');
    });

    it('should support empty agents Map', () => {
      expect(validStore.agents.size).toBe(0);
    });

    it('should support populated agents Map', () => {
      const agent: Agent = {
        id: 'agent-1',
        name: 'test',
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
      
      const populatedStore: DataStore = {
        ...validStore,
        agents: new Map([['agent-1', agent]]),
      };
      
      expect(populatedStore.agents.size).toBe(1);
      expect(populatedStore.agents.has('agent-1')).toBe(true);
      expect(populatedStore.agents.get('agent-1')).toBe(agent);
    });

    it('should support null rootAgentId (no root agent)', () => {
      expect(validStore.rootAgentId).toBeNull();
    });

    it('should support string rootAgentId (root agent exists)', () => {
      const storeWithRoot: DataStore = {
        ...validStore,
        rootAgentId: 'main-agent',
      };
      expect(storeWithRoot.rootAgentId).toBe('main-agent');
    });

    it('should support empty notifications array', () => {
      expect(validStore.notifications).toHaveLength(0);
    });

    it('should support populated notifications array', () => {
      const notification: Notification = {
        id: 'notif-1',
        type: 'context_high',
        agentId: 'agent-1',
        message: 'High context usage',
        timestamp: Date.now(),
        dismissed: false,
      };
      
      const storeWithNotifs: DataStore = {
        ...validStore,
        notifications: [notification],
      };
      
      expect(storeWithNotifs.notifications).toHaveLength(1);
      expect(storeWithNotifs.notifications[0]).toBe(notification);
    });

    it('should include dashboard state', () => {
      expect(validStore.dashboard.isVisible).toBe(false);
      expect(validStore.dashboard.selectedAgentId).toBeNull();
      expect(validStore.dashboard.expandedSections).toBeInstanceOf(Set);
    });
  });

  describe('Type Relationships and Constraints', () => {
    it('should support Agent with all required relationships', () => {
      const rootAgent: Agent = {
        id: 'root',
        name: 'main',
        status: 'running',
        parentId: null,
        startTime: Date.now(),
        endTime: null,
        metrics: {
          inputTokens: 1000,
          outputTokens: 500,
          cacheReadTokens: 100,
          cacheWriteTokens: 50,
          totalCost: 0.01,
          contextTokens: 1500,
          contextLimit: 100000,
          turnCount: 2,
        },
        toolCalls: [],
        messageCount: 3,
        subagentIds: ['child-1', 'child-2'],
      };

      const childAgent: Agent = {
        id: 'child-1',
        name: 'scout',
        status: 'completed',
        parentId: 'root',
        startTime: Date.now() - 10000,
        endTime: Date.now(),
        metrics: {
          inputTokens: 500,
          outputTokens: 250,
          cacheReadTokens: 50,
          cacheWriteTokens: 25,
          totalCost: 0.005,
          contextTokens: 750,
          contextLimit: 100000,
          turnCount: 1,
        },
        toolCalls: [],
        messageCount: 1,
        subagentIds: [],
      };

      expect(rootAgent.subagentIds).toContain(childAgent.id);
      expect(childAgent.parentId).toBe(rootAgent.id);
    });

    it('should support ToolCall lifecycle states', () => {
      const startTime = Date.now();
      
      // Pending state
      const pendingCall: ToolCall = {
        id: 'call-1',
        toolName: 'bash',
        args: { command: 'sleep 5' },
        argsSummary: 'sleep 5',
        status: 'pending',
        startTime,
        endTime: null,
        duration: null,
        isError: false,
        errorMessage: null,
      };

      // Success state
      const successCall: ToolCall = {
        ...pendingCall,
        status: 'success',
        endTime: startTime + 250,
        duration: 250,
      };

      // Failed state
      const failedCall: ToolCall = {
        ...pendingCall,
        status: 'failed',
        endTime: startTime + 100,
        duration: 100,
        isError: true,
        errorMessage: 'Command not found',
      };

      expect(pendingCall.status).toBe('pending');
      expect(pendingCall.endTime).toBeNull();
      
      expect(successCall.status).toBe('success');
      expect(successCall.endTime).not.toBeNull();
      expect(successCall.isError).toBe(false);
      
      expect(failedCall.status).toBe('failed');
      expect(failedCall.isError).toBe(true);
      expect(failedCall.errorMessage).not.toBeNull();
    });

    it('should support complete DataStore with all relationships', () => {
      const store: DataStore = {
        agents: new Map(),
        rootAgentId: 'root-agent',
        notifications: [
          {
            id: 'notif-1',
            type: 'context_high',
            agentId: 'root-agent',
            message: 'Context at 82%',
            timestamp: Date.now(),
            dismissed: false,
          },
        ],
        dashboard: {
          isVisible: true,
          selectedAgentId: 'root-agent',
          expandedSections: new Set(['metrics', 'tools']),
        },
      };

      expect(store.rootAgentId).toBe('root-agent');
      expect(store.notifications[0].agentId).toBe('root-agent');
      expect(store.dashboard.selectedAgentId).toBe('root-agent');
    });
  });
});
