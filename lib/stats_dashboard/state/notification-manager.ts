/**
 * Notification Manager Implementation
 * 
 * Manages context threshold alerts and tool failure notifications.
 * Prevents duplicate notifications, tracks notification state, and integrates
 * with Pi's UI notification system.
 */

import { StateManager } from './state-manager';
import type { Notification, NotificationType } from '../types';

/**
 * Pi context interface with UI notifications
 */
interface PiContext {
  ui: {
    notify: (message: string, options?: NotifyOptions) => void;
  };
}

interface NotifyOptions {
  type?: 'info' | 'warning' | 'error' | 'success';
  duration?: number;
  dismissible?: boolean;
}

/**
 * Generate a unique notification ID
 */
function generateNotificationId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * NotificationManager class for handling context and tool failure notifications
 */
export class NotificationManager {
  private stateManager: StateManager;
  private ctx: PiContext;
  private notifications: Notification[];
  
  /** Track which agents have been notified for which types to prevent duplicates */
  private notificationTracker: Map<string, Set<NotificationType>>;

  constructor(stateManager: StateManager, ctx: PiContext) {
    this.stateManager = stateManager;
    this.ctx = ctx;
    this.notifications = [];
    this.notificationTracker = new Map();
  }

  /**
   * Check if agent's context usage has reached 80% threshold
   * Triggers a warning notification if threshold is met and hasn't been notified before
   * 
   * @param agentId - Agent ID to check
   */
  checkContextThreshold(agentId: string): void {
    const agent = this.stateManager.getAgent(agentId);
    if (!agent) {
      return; // Silently ignore non-existent agents
    }

    // Check if already notified for this agent
    if (this.hasNotified('context_high', agentId)) {
      return; // Already notified, don't duplicate
    }

    const { contextTokens, contextLimit } = agent.metrics;

    // Handle edge cases
    if (contextLimit <= 0) {
      return; // Invalid context limit
    }

    // Calculate percentage
    const percentage = (contextTokens / contextLimit) * 100;

    // Check if threshold met (80% or higher)
    if (percentage >= 80) {
      const roundedPercentage = Math.round(percentage);
      const message = `⚠️ Agent "${agent.name}" context usage is high: ${roundedPercentage}%`;

      // Create notification record
      const notification: Notification = {
        id: generateNotificationId(),
        type: 'context_high',
        agentId,
        message,
        timestamp: Date.now(),
        dismissed: false,
      };

      this.notifications.push(notification);

      // Track that we've notified this agent
      this.trackNotification('context_high', agentId);

      // Display notification via Pi UI (wrapped in try-catch for safety)
      try {
        this.ctx.ui.notify(message, {
          type: 'warning',
          dismissible: true,
        });
      } catch (error) {
        // Silently handle UI errors
        console.error('Failed to display notification:', error);
      }
    }
  }

  /**
   * Display a notification for tool execution failure
   * 
   * @param agentId - Agent ID where tool failed
   * @param toolName - Name of the failed tool
   * @param errorMessage - Error message from the tool
   */
  notifyToolFailure(agentId: string, toolName: string, errorMessage: string): void {
    // Normalize null/undefined error messages to empty string
    const normalizedError = errorMessage ?? '';

    const message = `❌ Tool "${toolName}" failed: ${normalizedError}`;

    // Create notification record
    const notification: Notification = {
      id: generateNotificationId(),
      type: 'tool_failed',
      agentId,
      message,
      timestamp: Date.now(),
      dismissed: false,
    };

    this.notifications.push(notification);

    // Track this notification (but allow multiple tool failures per agent)
    this.trackNotification('tool_failed', agentId);

    // Display notification via Pi UI (wrapped in try-catch for safety)
    try {
      this.ctx.ui.notify(message, {
        type: 'error',
        dismissible: true,
      });
    } catch (error) {
      // Silently handle UI errors
      console.error('Failed to display notification:', error);
    }
  }

  /**
   * Check if a notification of a given type has been shown for an agent
   * 
   * @param type - Notification type to check
   * @param agentId - Agent ID to check
   * @returns true if already notified, false otherwise
   */
  hasNotified(type: NotificationType, agentId: string): boolean {
    const agentNotifications = this.notificationTracker.get(agentId);
    return agentNotifications?.has(type) ?? false;
  }

  /**
   * Mark a notification as dismissed
   * 
   * @param notificationId - ID of notification to dismiss
   */
  dismiss(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.dismissed = true;
    }
  }

  /**
   * Get all notifications
   * 
   * @returns Array of all notifications
   */
  getNotifications(): Notification[] {
    return this.notifications;
  }

  /**
   * Internal helper to track that an agent has been notified
   * 
   * @param type - Notification type
   * @param agentId - Agent ID
   */
  private trackNotification(type: NotificationType, agentId: string): void {
    if (!this.notificationTracker.has(agentId)) {
      this.notificationTracker.set(agentId, new Set());
    }
    this.notificationTracker.get(agentId)?.add(type);
  }
}
