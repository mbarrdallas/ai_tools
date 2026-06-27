/**
 * Notification Manager Implementation Test Suite
 * 
 * Tests for the NotificationManager class in state/notification-manager.ts (Task T6)
 * 
 * The NotificationManager handles context threshold alerts and tool failure notifications.
 * It prevents duplicate notifications, manages notification state, and integrates with
 * Pi's UI notification system.
 * 
 * Acceptance Criteria:
 * - checkContextThreshold(agentId) triggers warning at 80% context usage
 * - notifyToolFailure(agentId, toolName, error) displays error notification
 * - hasNotified(type, agentId) prevents duplicate notifications
 * - dismiss(notificationId) marks notification as dismissed
 * - Notifications stored in state for tracking
 * - Uses ctx.ui.notify() for displaying alerts
 * - Context notification shows agent name and percentage
 * - Tool failure notification shows tool name and error message
 * - Notifications are non-blocking (users can continue working)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type {
  Agent,
  Notification,
  NotificationType,
} from '@lib/stats_dashboard/types';

// Mock Pi context type
interface MockContext {
  ui: {
    notify: jest.Mock<(message: string, options?: NotifyOptions) => void>;
  };
}

interface NotifyOptions {
  type?: 'info' | 'warning' | 'error' | 'success';
  duration?: number;
  dismissible?: boolean;
}

// The NotificationManager implementation to be tested
// This will be implemented by the Coder Agent
import { NotificationManager } from '@lib/stats_dashboard/state/notification-manager';
import { StateManager } from '@lib/stats_dashboard/state/state-manager';

describe('NotificationManager', () => {
  let notificationManager: NotificationManager;
  let stateManager: StateManager;
  let mockContext: MockContext;
  let mockTimestamp: number;

  beforeEach(() => {
    // Create fresh state manager
    stateManager = new StateManager();
    
    // Create mock Pi context
    mockContext = {
      ui: {
        notify: jest.fn(),
      },
    };
    
    // Create notification manager with mocked context
    notificationManager = new NotificationManager(stateManager, mockContext as any);
    
    mockTimestamp = Date.now();
  });

  describe('Constructor', () => {
    it('should initialize with state manager', () => {
      expect(notificationManager).toBeDefined();
    });

    it('should not trigger any notifications on creation', () => {
      expect(mockContext.ui.notify).not.toHaveBeenCalled();
    });

    it('should be ready to check thresholds immediately', () => {
      const agentId = stateManager.createAgent('test-agent');
      
      expect(() => {
        notificationManager.checkContextThreshold(agentId);
      }).not.toThrow();
    });
  });

  describe('checkContextThreshold', () => {
    let agentId: string;

    beforeEach(() => {
      agentId = stateManager.createAgent('test-agent');
    });

    it('should not notify when context usage is below 80%', () => {
      stateManager.updateMetrics(agentId, {
        contextTokens: 70000,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agentId);
      
      expect(mockContext.ui.notify).not.toHaveBeenCalled();
    });

    it('should notify when context usage reaches exactly 80%', () => {
      stateManager.updateMetrics(agentId, {
        contextTokens: 80000,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agentId);
      
      expect(mockContext.ui.notify).toHaveBeenCalledTimes(1);
    });

    it('should notify when context usage exceeds 80%', () => {
      stateManager.updateMetrics(agentId, {
        contextTokens: 90000,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agentId);
      
      expect(mockContext.ui.notify).toHaveBeenCalledTimes(1);
    });

    it('should include agent name in notification message', () => {
      stateManager.updateMetrics(agentId, {
        contextTokens: 85000,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agentId);
      
      const callArgs = mockContext.ui.notify.mock.calls[0];
      expect(callArgs[0]).toContain('test-agent');
    });

    it('should include percentage in notification message', () => {
      stateManager.updateMetrics(agentId, {
        contextTokens: 85000,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agentId);
      
      const callArgs = mockContext.ui.notify.mock.calls[0];
      expect(callArgs[0]).toMatch(/85%/);
    });

    it('should use warning type for context notifications', () => {
      stateManager.updateMetrics(agentId, {
        contextTokens: 85000,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agentId);
      
      const callArgs = mockContext.ui.notify.mock.calls[0];
      expect(callArgs[1]?.type).toBe('warning');
    });

    it('should not notify twice for same agent', () => {
      stateManager.updateMetrics(agentId, {
        contextTokens: 85000,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agentId);
      notificationManager.checkContextThreshold(agentId);
      
      expect(mockContext.ui.notify).toHaveBeenCalledTimes(1);
    });

    it('should notify different agents independently', () => {
      const agent1 = stateManager.createAgent('agent-1');
      const agent2 = stateManager.createAgent('agent-2');
      
      stateManager.updateMetrics(agent1, {
        contextTokens: 85000,
        contextLimit: 100000,
      });
      
      stateManager.updateMetrics(agent2, {
        contextTokens: 90000,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agent1);
      notificationManager.checkContextThreshold(agent2);
      
      expect(mockContext.ui.notify).toHaveBeenCalledTimes(2);
    });

    it('should handle context usage at 100%', () => {
      stateManager.updateMetrics(agentId, {
        contextTokens: 100000,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agentId);
      
      expect(mockContext.ui.notify).toHaveBeenCalledTimes(1);
      const callArgs = mockContext.ui.notify.mock.calls[0];
      expect(callArgs[0]).toMatch(/100%/);
    });

    it('should handle context usage over 100% gracefully', () => {
      stateManager.updateMetrics(agentId, {
        contextTokens: 110000,
        contextLimit: 100000,
      });
      
      expect(() => {
        notificationManager.checkContextThreshold(agentId);
      }).not.toThrow();
      
      expect(mockContext.ui.notify).toHaveBeenCalledTimes(1);
    });

    it('should handle zero context limit gracefully', () => {
      stateManager.updateMetrics(agentId, {
        contextTokens: 1000,
        contextLimit: 0,
      });
      
      expect(() => {
        notificationManager.checkContextThreshold(agentId);
      }).not.toThrow();
    });

    it('should handle non-existent agent gracefully', () => {
      expect(() => {
        notificationManager.checkContextThreshold('non-existent-id');
      }).not.toThrow();
      
      expect(mockContext.ui.notify).not.toHaveBeenCalled();
    });

    it('should calculate percentage correctly for different limits', () => {
      stateManager.updateMetrics(agentId, {
        contextTokens: 160000,
        contextLimit: 200000,
      });
      
      notificationManager.checkContextThreshold(agentId);
      
      const callArgs = mockContext.ui.notify.mock.calls[0];
      expect(callArgs[0]).toMatch(/80%/);
    });

    it('should not notify when context is exactly 79.9%', () => {
      stateManager.updateMetrics(agentId, {
        contextTokens: 79900,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agentId);
      
      expect(mockContext.ui.notify).not.toHaveBeenCalled();
    });

    it('should create notification record in state', () => {
      stateManager.updateMetrics(agentId, {
        contextTokens: 85000,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agentId);
      
      const hasNotified = notificationManager.hasNotified('context_high', agentId);
      expect(hasNotified).toBe(true);
    });

    it('should handle floating point precision in percentage calculation', () => {
      stateManager.updateMetrics(agentId, {
        contextTokens: 80001,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agentId);
      
      expect(mockContext.ui.notify).toHaveBeenCalledTimes(1);
    });

    it('should make notifications dismissible', () => {
      stateManager.updateMetrics(agentId, {
        contextTokens: 85000,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agentId);
      
      const callArgs = mockContext.ui.notify.mock.calls[0];
      expect(callArgs[1]?.dismissible).not.toBe(false);
    });
  });

  describe('notifyToolFailure', () => {
    let agentId: string;

    beforeEach(() => {
      agentId = stateManager.createAgent('test-agent');
    });

    it('should display notification for tool failure', () => {
      notificationManager.notifyToolFailure(agentId, 'bash', 'Command not found');
      
      expect(mockContext.ui.notify).toHaveBeenCalledTimes(1);
    });

    it('should include tool name in notification message', () => {
      notificationManager.notifyToolFailure(agentId, 'bash', 'Command failed');
      
      const callArgs = mockContext.ui.notify.mock.calls[0];
      expect(callArgs[0]).toContain('bash');
    });

    it('should include error message in notification', () => {
      const errorMsg = 'Command not found: xyz';
      notificationManager.notifyToolFailure(agentId, 'bash', errorMsg);
      
      const callArgs = mockContext.ui.notify.mock.calls[0];
      expect(callArgs[0]).toContain(errorMsg);
    });

    it('should use error type for tool failure notifications', () => {
      notificationManager.notifyToolFailure(agentId, 'bash', 'Error');
      
      const callArgs = mockContext.ui.notify.mock.calls[0];
      expect(callArgs[1]?.type).toBe('error');
    });

    it('should handle different tool names', () => {
      notificationManager.notifyToolFailure(agentId, 'read', 'File not found');
      
      const callArgs = mockContext.ui.notify.mock.calls[0];
      expect(callArgs[0]).toContain('read');
    });

    it('should handle long error messages', () => {
      const longError = 'Error: '.repeat(100) + 'Something went wrong';
      
      expect(() => {
        notificationManager.notifyToolFailure(agentId, 'bash', longError);
      }).not.toThrow();
      
      expect(mockContext.ui.notify).toHaveBeenCalledTimes(1);
    });

    it('should handle empty error message', () => {
      notificationManager.notifyToolFailure(agentId, 'bash', '');
      
      expect(mockContext.ui.notify).toHaveBeenCalledTimes(1);
    });

    it('should handle special characters in error message', () => {
      const errorMsg = 'Error: {"code": 500, "message": "Internal Error"}';
      
      notificationManager.notifyToolFailure(agentId, 'bash', errorMsg);
      
      expect(mockContext.ui.notify).toHaveBeenCalledTimes(1);
    });

    it('should create notification record in state', () => {
      notificationManager.notifyToolFailure(agentId, 'bash', 'Error');
      
      const hasNotified = notificationManager.hasNotified('tool_failed', agentId);
      expect(hasNotified).toBe(true);
    });

    it('should handle multiple tool failures for same agent', () => {
      notificationManager.notifyToolFailure(agentId, 'bash', 'Error 1');
      notificationManager.notifyToolFailure(agentId, 'read', 'Error 2');
      
      // Both should notify (different tools)
      expect(mockContext.ui.notify).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple tool failures for different agents', () => {
      const agent1 = stateManager.createAgent('agent-1');
      const agent2 = stateManager.createAgent('agent-2');
      
      notificationManager.notifyToolFailure(agent1, 'bash', 'Error 1');
      notificationManager.notifyToolFailure(agent2, 'bash', 'Error 2');
      
      expect(mockContext.ui.notify).toHaveBeenCalledTimes(2);
    });

    it('should handle non-existent agent gracefully', () => {
      expect(() => {
        notificationManager.notifyToolFailure('non-existent-id', 'bash', 'Error');
      }).not.toThrow();
      
      expect(mockContext.ui.notify).toHaveBeenCalledTimes(1);
    });

    it('should make notifications dismissible', () => {
      notificationManager.notifyToolFailure(agentId, 'bash', 'Error');
      
      const callArgs = mockContext.ui.notify.mock.calls[0];
      expect(callArgs[1]?.dismissible).not.toBe(false);
    });

    it('should include agent name in notification if helpful', () => {
      notificationManager.notifyToolFailure(agentId, 'bash', 'Command failed');
      
      const callArgs = mockContext.ui.notify.mock.calls[0];
      const message = callArgs[0];
      
      // Either includes agent name or the message is clear without it
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(0);
    });

    it('should handle multiline error messages', () => {
      const multilineError = 'Line 1\nLine 2\nLine 3';
      
      notificationManager.notifyToolFailure(agentId, 'bash', multilineError);
      
      expect(mockContext.ui.notify).toHaveBeenCalledTimes(1);
    });

    it('should handle null or undefined error message gracefully', () => {
      expect(() => {
        notificationManager.notifyToolFailure(agentId, 'bash', null as any);
      }).not.toThrow();
      
      expect(() => {
        notificationManager.notifyToolFailure(agentId, 'read', undefined as any);
      }).not.toThrow();
    });
  });

  describe('hasNotified', () => {
    let agentId: string;

    beforeEach(() => {
      agentId = stateManager.createAgent('test-agent');
    });

    it('should return false when no notification exists', () => {
      const result = notificationManager.hasNotified('context_high', agentId);
      
      expect(result).toBe(false);
    });

    it('should return true after context threshold notification', () => {
      stateManager.updateMetrics(agentId, {
        contextTokens: 85000,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agentId);
      
      const result = notificationManager.hasNotified('context_high', agentId);
      expect(result).toBe(true);
    });

    it('should return true after tool failure notification', () => {
      notificationManager.notifyToolFailure(agentId, 'bash', 'Error');
      
      const result = notificationManager.hasNotified('tool_failed', agentId);
      expect(result).toBe(true);
    });

    it('should distinguish between different notification types', () => {
      stateManager.updateMetrics(agentId, {
        contextTokens: 85000,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agentId);
      
      expect(notificationManager.hasNotified('context_high', agentId)).toBe(true);
      expect(notificationManager.hasNotified('tool_failed', agentId)).toBe(false);
    });

    it('should distinguish between different agents', () => {
      const agent1 = stateManager.createAgent('agent-1');
      const agent2 = stateManager.createAgent('agent-2');
      
      stateManager.updateMetrics(agent1, {
        contextTokens: 85000,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agent1);
      
      expect(notificationManager.hasNotified('context_high', agent1)).toBe(true);
      expect(notificationManager.hasNotified('context_high', agent2)).toBe(false);
    });

    it('should handle checking non-existent agent', () => {
      const result = notificationManager.hasNotified('context_high', 'non-existent-id');
      
      expect(result).toBe(false);
    });

    it('should handle checking after multiple notifications', () => {
      stateManager.updateMetrics(agentId, {
        contextTokens: 85000,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agentId);
      notificationManager.notifyToolFailure(agentId, 'bash', 'Error');
      
      expect(notificationManager.hasNotified('context_high', agentId)).toBe(true);
      expect(notificationManager.hasNotified('tool_failed', agentId)).toBe(true);
    });

    it('should be consistent across multiple checks', () => {
      stateManager.updateMetrics(agentId, {
        contextTokens: 85000,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agentId);
      
      expect(notificationManager.hasNotified('context_high', agentId)).toBe(true);
      expect(notificationManager.hasNotified('context_high', agentId)).toBe(true);
      expect(notificationManager.hasNotified('context_high', agentId)).toBe(true);
    });
  });

  describe('dismiss', () => {
    let agentId: string;

    beforeEach(() => {
      agentId = stateManager.createAgent('test-agent');
    });

    it('should mark notification as dismissed', () => {
      stateManager.updateMetrics(agentId, {
        contextTokens: 85000,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agentId);
      
      // Get notification ID (implementation-specific)
      const notifications = notificationManager.getNotifications();
      const notificationId = notifications[0]?.id;
      
      if (notificationId) {
        notificationManager.dismiss(notificationId);
        
        const dismissed = notifications.find(n => n.id === notificationId);
        expect(dismissed?.dismissed).toBe(true);
      }
    });

    it('should handle dismissing non-existent notification gracefully', () => {
      expect(() => {
        notificationManager.dismiss('non-existent-id');
      }).not.toThrow();
    });

    it('should not affect other notifications', () => {
      const agent1 = stateManager.createAgent('agent-1');
      const agent2 = stateManager.createAgent('agent-2');
      
      stateManager.updateMetrics(agent1, {
        contextTokens: 85000,
        contextLimit: 100000,
      });
      
      stateManager.updateMetrics(agent2, {
        contextTokens: 90000,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agent1);
      notificationManager.checkContextThreshold(agent2);
      
      const notifications = notificationManager.getNotifications();
      const firstNotificationId = notifications[0]?.id;
      
      if (firstNotificationId) {
        notificationManager.dismiss(firstNotificationId);
        
        const otherNotifications = notifications.filter(n => n.id !== firstNotificationId);
        expect(otherNotifications.every(n => !n.dismissed)).toBe(true);
      }
    });

    it('should allow dismissing same notification multiple times', () => {
      stateManager.updateMetrics(agentId, {
        contextTokens: 85000,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agentId);
      
      const notifications = notificationManager.getNotifications();
      const notificationId = notifications[0]?.id;
      
      if (notificationId) {
        expect(() => {
          notificationManager.dismiss(notificationId);
          notificationManager.dismiss(notificationId);
          notificationManager.dismiss(notificationId);
        }).not.toThrow();
      }
    });
  });

  describe('getNotifications', () => {
    it('should return empty array when no notifications exist', () => {
      const notifications = notificationManager.getNotifications();
      
      expect(notifications).toEqual([]);
    });

    it('should return context threshold notifications', () => {
      const agentId = stateManager.createAgent('test-agent');
      
      stateManager.updateMetrics(agentId, {
        contextTokens: 85000,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agentId);
      
      const notifications = notificationManager.getNotifications();
      
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('context_high');
      expect(notifications[0].agentId).toBe(agentId);
    });

    it('should return tool failure notifications', () => {
      const agentId = stateManager.createAgent('test-agent');
      
      notificationManager.notifyToolFailure(agentId, 'bash', 'Error');
      
      const notifications = notificationManager.getNotifications();
      
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('tool_failed');
      expect(notifications[0].agentId).toBe(agentId);
    });

    it('should return all notifications in order', () => {
      const agent1 = stateManager.createAgent('agent-1');
      const agent2 = stateManager.createAgent('agent-2');
      
      stateManager.updateMetrics(agent1, {
        contextTokens: 85000,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agent1);
      notificationManager.notifyToolFailure(agent2, 'bash', 'Error');
      
      const notifications = notificationManager.getNotifications();
      
      expect(notifications).toHaveLength(2);
    });

    it('should include notification properties', () => {
      const agentId = stateManager.createAgent('test-agent');
      
      stateManager.updateMetrics(agentId, {
        contextTokens: 85000,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agentId);
      
      const notifications = notificationManager.getNotifications();
      const notification = notifications[0];
      
      expect(notification).toHaveProperty('id');
      expect(notification).toHaveProperty('type');
      expect(notification).toHaveProperty('agentId');
      expect(notification).toHaveProperty('message');
      expect(notification).toHaveProperty('timestamp');
      expect(notification).toHaveProperty('dismissed');
    });

    it('should include dismissed status', () => {
      const agentId = stateManager.createAgent('test-agent');
      
      stateManager.updateMetrics(agentId, {
        contextTokens: 85000,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agentId);
      
      const notifications = notificationManager.getNotifications();
      
      expect(notifications[0].dismissed).toBe(false);
    });

    it('should reflect dismissed status after dismissal', () => {
      const agentId = stateManager.createAgent('test-agent');
      
      stateManager.updateMetrics(agentId, {
        contextTokens: 85000,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agentId);
      
      const notifications = notificationManager.getNotifications();
      const notificationId = notifications[0].id;
      
      notificationManager.dismiss(notificationId);
      
      const updatedNotifications = notificationManager.getNotifications();
      const dismissedNotification = updatedNotifications.find(n => n.id === notificationId);
      
      expect(dismissedNotification?.dismissed).toBe(true);
    });
  });

  describe('Notification Storage', () => {
    it('should store notifications in state manager', () => {
      const agentId = stateManager.createAgent('test-agent');
      
      stateManager.updateMetrics(agentId, {
        contextTokens: 85000,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agentId);
      
      const notifications = notificationManager.getNotifications();
      expect(notifications.length).toBeGreaterThan(0);
    });

    it('should persist notifications across method calls', () => {
      const agentId = stateManager.createAgent('test-agent');
      
      stateManager.updateMetrics(agentId, {
        contextTokens: 85000,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agentId);
      
      const notifications1 = notificationManager.getNotifications();
      const notifications2 = notificationManager.getNotifications();
      
      expect(notifications1).toEqual(notifications2);
    });

    it('should maintain notification order', () => {
      const agent1 = stateManager.createAgent('agent-1');
      const agent2 = stateManager.createAgent('agent-2');
      
      stateManager.updateMetrics(agent1, {
        contextTokens: 85000,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agent1);
      
      // Small delay to ensure different timestamp
      const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      notificationManager.notifyToolFailure(agent2, 'bash', 'Error');
      
      const notifications = notificationManager.getNotifications();
      
      expect(notifications[0].agentId).toBe(agent1);
      expect(notifications[1].agentId).toBe(agent2);
    });
  });

  describe('Notification IDs', () => {
    it('should generate unique IDs for each notification', () => {
      const agent1 = stateManager.createAgent('agent-1');
      const agent2 = stateManager.createAgent('agent-2');
      
      stateManager.updateMetrics(agent1, {
        contextTokens: 85000,
        contextLimit: 100000,
      });
      
      stateManager.updateMetrics(agent2, {
        contextTokens: 90000,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agent1);
      notificationManager.checkContextThreshold(agent2);
      
      const notifications = notificationManager.getNotifications();
      
      expect(notifications[0].id).not.toBe(notifications[1].id);
    });

    it('should use string IDs', () => {
      const agentId = stateManager.createAgent('test-agent');
      
      stateManager.updateMetrics(agentId, {
        contextTokens: 85000,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agentId);
      
      const notifications = notificationManager.getNotifications();
      
      expect(typeof notifications[0].id).toBe('string');
    });
  });

  describe('Integration with StateManager', () => {
    it('should work with agents created by StateManager', () => {
      const agentId = stateManager.createAgent('integrated-agent');
      
      stateManager.updateMetrics(agentId, {
        contextTokens: 85000,
        contextLimit: 100000,
      });
      
      expect(() => {
        notificationManager.checkContextThreshold(agentId);
      }).not.toThrow();
      
      expect(mockContext.ui.notify).toHaveBeenCalledTimes(1);
    });

    it('should access agent metrics correctly', () => {
      const agentId = stateManager.createAgent('test-agent');
      
      stateManager.updateMetrics(agentId, {
        contextTokens: 85000,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agentId);
      
      const callArgs = mockContext.ui.notify.mock.calls[0];
      expect(callArgs[0]).toMatch(/85%/);
    });

    it('should handle agent dismissal', () => {
      const agentId = stateManager.createAgent('test-agent');
      
      stateManager.updateMetrics(agentId, {
        contextTokens: 85000,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agentId);
      
      stateManager.dismissAgent(agentId);
      
      // Notification should still exist even if agent is dismissed
      const notifications = notificationManager.getNotifications();
      expect(notifications.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle agent with zero context tokens', () => {
      const agentId = stateManager.createAgent('test-agent');
      
      stateManager.updateMetrics(agentId, {
        contextTokens: 0,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agentId);
      
      expect(mockContext.ui.notify).not.toHaveBeenCalled();
    });

    it('should handle very large context values', () => {
      const agentId = stateManager.createAgent('test-agent');
      
      stateManager.updateMetrics(agentId, {
        contextTokens: 1000000,
        contextLimit: 1000000,
      });
      
      expect(() => {
        notificationManager.checkContextThreshold(agentId);
      }).not.toThrow();
      
      expect(mockContext.ui.notify).toHaveBeenCalledTimes(1);
    });

    it('should handle notification with empty tool name', () => {
      const agentId = stateManager.createAgent('test-agent');
      
      notificationManager.notifyToolFailure(agentId, '', 'Error message');
      
      expect(mockContext.ui.notify).toHaveBeenCalledTimes(1);
    });

    it('should handle notification with special characters in tool name', () => {
      const agentId = stateManager.createAgent('test-agent');
      
      notificationManager.notifyToolFailure(agentId, 'bash:exec:cmd-123', 'Error');
      
      expect(mockContext.ui.notify).toHaveBeenCalledTimes(1);
    });

    it('should not break if context.ui.notify throws', () => {
      mockContext.ui.notify.mockImplementation(() => {
        throw new Error('UI error');
      });
      
      const agentId = stateManager.createAgent('test-agent');
      
      stateManager.updateMetrics(agentId, {
        contextTokens: 85000,
        contextLimit: 100000,
      });
      
      // Should handle the error gracefully
      expect(() => {
        notificationManager.checkContextThreshold(agentId);
      }).not.toThrow();
    });

    it('should handle rapid sequential notifications', () => {
      const agentId = stateManager.createAgent('test-agent');
      
      for (let i = 0; i < 100; i++) {
        notificationManager.notifyToolFailure(agentId, `tool-${i}`, `Error ${i}`);
      }
      
      const notifications = notificationManager.getNotifications();
      expect(notifications.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Characteristics', () => {
    it('should check thresholds quickly', () => {
      const agentId = stateManager.createAgent('test-agent');
      
      stateManager.updateMetrics(agentId, {
        contextTokens: 85000,
        contextLimit: 100000,
      });
      
      const start = Date.now();
      notificationManager.checkContextThreshold(agentId);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(50); // Should be nearly instant
    });

    it('should handle many notifications efficiently', () => {
      const start = Date.now();
      
      for (let i = 0; i < 100; i++) {
        const agentId = stateManager.createAgent(`agent-${i}`);
        notificationManager.notifyToolFailure(agentId, 'bash', `Error ${i}`);
      }
      
      const duration = Date.now() - start;
      
      expect(notificationManager.getNotifications()).toHaveLength(100);
      expect(duration).toBeLessThan(500); // Should complete in < 0.5 second
    });

    it('should check hasNotified quickly with many notifications', () => {
      for (let i = 0; i < 100; i++) {
        const agentId = stateManager.createAgent(`agent-${i}`);
        notificationManager.notifyToolFailure(agentId, 'bash', 'Error');
      }
      
      const agentId = stateManager.createAgent('target-agent');
      
      const start = Date.now();
      notificationManager.hasNotified('tool_failed', agentId);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(50); // Should be fast lookup
    });
  });

  describe('Non-Blocking Behavior', () => {
    it('should not block when displaying notification', () => {
      const agentId = stateManager.createAgent('test-agent');
      
      stateManager.updateMetrics(agentId, {
        contextTokens: 85000,
        contextLimit: 100000,
      });
      
      const start = Date.now();
      notificationManager.checkContextThreshold(agentId);
      const duration = Date.now() - start;
      
      // Should return immediately without waiting for user interaction
      expect(duration).toBeLessThan(100);
    });

    it('should allow continued operations after notification', () => {
      const agentId = stateManager.createAgent('test-agent');
      
      stateManager.updateMetrics(agentId, {
        contextTokens: 85000,
        contextLimit: 100000,
      });
      
      notificationManager.checkContextThreshold(agentId);
      
      // Should be able to perform other operations
      const agent2Id = stateManager.createAgent('agent-2');
      stateManager.updateMetrics(agent2Id, { inputTokens: 100 });
      
      expect(stateManager.getAgent(agent2Id)?.metrics.inputTokens).toBe(100);
    });
  });
});
