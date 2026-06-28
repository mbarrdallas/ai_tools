/**
 * Stats Dashboard TUI - Pi Extension Entry Point
 *
 * Wires together all components: StateManager, NotificationManager,
 * DashboardController, event handlers, commands, and keyboard shortcuts.
 *
 * This is the main extension file that Pi loads on session start.
 */

import { StateManager } from '../../../lib/shared/stats_dashboard_tui/state/state-manager';
import { NotificationManager } from '../../../lib/shared/stats_dashboard_tui/state/notification-manager';
import { DashboardController } from '../../../lib/shared/stats_dashboard_tui/ui/controller';
import { registerEventHandlers, setDashboardHandle } from '../../../lib/shared/stats_dashboard_tui/handlers/events';

/** Keyboard shortcut for toggling the dashboard */
const SHORTCUT = 'ctrl+shift+s';

/** Command name for toggling the dashboard */
const COMMAND = '/stats';

/**
 * Stats Dashboard TUI Extension
 *
 * Provides real-time monitoring of agent metrics, tool history,
 * and conversation view in a terminal UI overlay.
 */
export default {
  name: 'stats-dashboard-tui',
  version: '1.0.0',
  description: 'Real-time agent stats dashboard in a TUI overlay',

  /**
   * Called by Pi when the extension is loaded at session start.
   * Initializes all managers, registers event handlers, command, and shortcut.
   *
   * @param pi - Pi extension API
   * @param ctx - Pi session context
   */
  async load(pi: any, ctx: any) {
    // 1. Initialize managers
    const stateManager = new StateManager();
    const notificationManager = new NotificationManager(ctx);
    const controller = new DashboardController({ stateManager, ctx });

    // 2. Register all Pi event handlers (agent lifecycle, metrics, tools, etc.)
    registerEventHandlers(pi, stateManager, notificationManager);

    // 3. Wire dashboard handle so event handlers can trigger re-renders
    setDashboardHandle({
      requestRender: () => controller.requestRender(),
      close: () => controller.hide(),
    });

    // 4. Register /stats command
    const unregisterCommand = pi.commands?.register(COMMAND, {
      description: 'Toggle the stats dashboard overlay',
      handler: () => controller.toggle(),
    });

    // 5. Register Ctrl+Shift+S keyboard shortcut
    const unregisterShortcut = pi.shortcuts?.register(SHORTCUT, {
      description: 'Toggle stats dashboard',
      handler: () => controller.toggle(),
    });

    // 6. Set footer status when dashboard is closed
    const updateFooter = () => {
      if (!controller.isVisible()) {
        const status = controller.getFooterStatus();
        ctx.ui?.setStatus?.('stats-dashboard', status);
      } else {
        ctx.ui?.setStatus?.('stats-dashboard', undefined);
      }
    };

    // Update footer on visibility change
    controller.onVisibilityChange(updateFooter);

    // Initial footer update
    updateFooter();

    // 7. Return cleanup function called on session shutdown
    return {
      dispose() {
        unregisterCommand?.();
        unregisterShortcut?.();
        setDashboardHandle(null);
        controller.dispose();
        stateManager.reset();
        ctx.ui?.setStatus?.('stats-dashboard', undefined);
      },
    };
  },
};
