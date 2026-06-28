/**
 * Dashboard Controller
 * 
 * External control interface for the Stats Dashboard (Task T14).
 * Manages dashboard visibility state and provides programmatic control
 * for commands and keyboard shortcuts.
 * 
 * This controller is the public API for:
 * - /stats command (registered in extension entry point T17)
 * - Ctrl+Shift+S keyboard shortcut (registered in T17)
 * - Footer status display when dashboard is closed
 * 
 * State persists during the session and survives show/hide cycles.
 */

import type { StateManager } from '../state/state-manager';
import { DashboardComponent, DASHBOARD_OVERLAY_CONFIG } from './dashboard';

/**
 * Props for DashboardController constructor
 */
interface DashboardControllerProps {
  /** State manager instance for accessing agent data */
  stateManager: StateManager;
  /** Pi context for rendering overlays (injected at runtime) */
  ctx?: PiContext;
}

/**
 * Minimal Pi context interface for dashboard rendering
 * Full type would come from Pi SDK
 */
interface PiContext {
  ui: {
    custom: (config: any) => any;
  };
}

/**
 * DashboardController class
 * 
 * Manages dashboard visibility and provides hooks for external control.
 * The actual dashboard component is created on-demand and destroyed when hidden,
 * but the controller maintains session state.
 */
export class DashboardController {
  private stateManager: StateManager;
  private ctx: PiContext | null = null;
  private dashboardHandle: any = null;
  private visible: boolean = false;

  /**
   * Create a new DashboardController
   * 
   * @param props - Controller properties
   * @throws Error if stateManager is null/undefined
   */
  constructor(props: DashboardControllerProps) {
    if (!props.stateManager) {
      throw new Error('DashboardController requires stateManager');
    }

    this.stateManager = props.stateManager;
    this.ctx = props.ctx || null;
  }

  /**
   * Set the Pi context (called during extension initialization)
   * 
   * @param ctx - Pi context object
   */
  setContext(ctx: PiContext): void {
    this.ctx = ctx;
  }

  /**
   * Toggle dashboard visibility
   * 
   * If dashboard is hidden, shows it.
   * If dashboard is visible, hides it.
   * 
   * This is the primary method called by:
   * - /stats command
   * - Ctrl+Shift+S keyboard shortcut
   */
  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Show the dashboard overlay
   * 
   * Creates a new dashboard component if needed and renders it as an overlay.
   * If already visible, this is a no-op.
   * 
   * State from StateManager persists across show/hide cycles.
   */
  show(): void {
    // Already visible, nothing to do
    if (this.visible) {
      return;
    }

    // Cannot show without context
    if (!this.ctx) {
      console.warn('DashboardController: cannot show dashboard without Pi context');
      return;
    }

    // Create dashboard component
    const dashboard = new DashboardComponent({
      stateManager: this.stateManager,
      controller: this,
      onClose: () => this.hide(),
    });

    // Render as overlay using Pi's UI API
    try {
      this.dashboardHandle = this.ctx.ui.custom({
        overlay: true,
        anchor: DASHBOARD_OVERLAY_CONFIG.anchor,
        widthPercent: DASHBOARD_OVERLAY_CONFIG.widthPercent,
        heightPercent: DASHBOARD_OVERLAY_CONFIG.heightPercent,
        component: dashboard,
      });

      this.visible = true;
    } catch (error) {
      console.error('DashboardController: failed to show dashboard', error);
      this.dashboardHandle = null;
      this.visible = false;
    }
  }

  /**
   * Hide the dashboard overlay
   * 
   * Closes the overlay and cleans up the dashboard component.
   * State in StateManager is preserved for next show().
   */
  hide(): void {
    // Already hidden, nothing to do
    if (!this.visible) {
      return;
    }

    // Close the overlay if we have a handle
    if (this.dashboardHandle) {
      try {
        // Call close() or dispose() on the handle
        // Exact API depends on Pi's overlay implementation
        if (typeof this.dashboardHandle.close === 'function') {
          this.dashboardHandle.close();
        } else if (typeof this.dashboardHandle.dispose === 'function') {
          this.dashboardHandle.dispose();
        }
      } catch (error) {
        console.error('DashboardController: error closing dashboard', error);
      }

      this.dashboardHandle = null;
    }

    this.visible = false;
  }

  /**
   * Check if dashboard is currently visible
   * 
   * @returns true if dashboard overlay is shown, false otherwise
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Get footer status text for Pi footer
   * 
   * When dashboard is closed, this returns a status message showing the number
   * of tracked agents. This is displayed in Pi's status bar/footer.
   * 
   * When dashboard is open, returns empty string (dashboard shows its own status).
   * 
   * @returns Footer status string or empty string if dashboard is visible
   */
  getFooterStatus(): string {
    // Dashboard is open, don't show footer status
    if (this.visible) {
      return '';
    }

    // Get agent count from state manager
    const agents = this.stateManager.getAllAgents();
    const agentCount = agents.length;

    // Return formatted status
    if (agentCount === 0) {
      return '📊 No agents';
    } else if (agentCount === 1) {
      return '📊 1 agent';
    } else {
      return `📊 ${agentCount} agents`;
    }
  }

  /**
   * Register the /stats command with Pi
   * 
   * This method provides a hook for the extension entry point (T17) to
   * register the command. The actual registration happens in index.ts.
   * 
   * @param ctx - Pi context object with commands API
   * @returns Cleanup function to unregister command
   */
  registerStatsCommand(ctx: any): () => void {
    if (!ctx.commands || typeof ctx.commands.register !== 'function') {
      console.warn('DashboardController: Pi context missing commands.register()');
      return () => {};
    }

    try {
      // Register /stats command
      const commandId = ctx.commands.register({
        name: 'stats',
        description: 'Toggle stats dashboard',
        execute: () => this.toggle(),
      });

      // Return cleanup function
      return () => {
        if (ctx.commands.unregister) {
          ctx.commands.unregister(commandId);
        }
      };
    } catch (error) {
      console.error('DashboardController: failed to register /stats command', error);
      return () => {};
    }
  }

  /**
   * Register the Ctrl+Shift+S keyboard shortcut with Pi
   * 
   * This method provides a hook for the extension entry point (T17) to
   * register the global keyboard shortcut. The actual registration happens in index.ts.
   * 
   * @param ctx - Pi context object with shortcuts API
   * @returns Cleanup function to unregister shortcut
   */
  registerKeyboardShortcut(ctx: any): () => void {
    if (!ctx.shortcuts || typeof ctx.shortcuts.register !== 'function') {
      console.warn('DashboardController: Pi context missing shortcuts.register()');
      return () => {};
    }

    try {
      // Register Ctrl+Shift+S shortcut
      const shortcutId = ctx.shortcuts.register({
        key: 'Ctrl+Shift+S',
        description: 'Toggle stats dashboard',
        action: () => this.toggle(),
      });

      // Return cleanup function
      return () => {
        if (ctx.shortcuts.unregister) {
          ctx.shortcuts.unregister(shortcutId);
        }
      };
    } catch (error) {
      console.error('DashboardController: failed to register Ctrl+Shift+S shortcut', error);
      return () => {};
    }
  }

  /**
   * Cleanup method called on extension shutdown
   * 
   * Ensures dashboard is hidden and resources are released.
   */
  dispose(): void {
    this.hide();
    this.ctx = null;
  }
}
