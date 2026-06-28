/**
 * Stats Dashboard TUI - Extension Entry Point
 *
 * Wires together StateManager, NotificationManager, DashboardController,
 * event handlers, /stats command, and Ctrl+Shift+S shortcut.
 *
 * Follows the Pi extension API: activate(pi) / deactivate()
 */

import { StateManager } from './state/state-manager';
import { NotificationManager } from './state/notification-manager';
import { DashboardController } from './ui/controller';
import { registerEventHandlers, setDashboardHandle } from './handlers/events';

/** Pi extension name */
const EXTENSION_NAME = 'stats_dashboard_tui';

/** Extension version */
const EXTENSION_VERSION = '1.0.0';

/** Keyboard shortcut for toggling the dashboard */
const SHORTCUT = 'ctrl+shift+s';

/** Command name for toggling the dashboard */
const COMMAND = '/stats';

// Module-level cleanup function (set during activate)
let _deactivate: (() => void) | null = null;

const extension = {
  name: EXTENSION_NAME,
  version: EXTENSION_VERSION,
  description: 'Real-time agent stats dashboard in a TUI overlay',

  /**
   * Called by Pi when the extension is loaded at session start.
   *
   * @param pi - Pi extension API (on, commands, shortcuts, ui, model)
   */
  async activate(pi: any): Promise<void> {
    // Use pi.ctx if provided, otherwise use pi itself as context fallback
    const ctx = pi.ctx ?? pi;

    // 1. Initialize managers
    const stateManager = new StateManager();
    const notificationManager = new NotificationManager(stateManager, ctx);
    const controller = new DashboardController({ stateManager, ctx });

    // 2. Register all Pi event handlers (agent lifecycle, metrics, tools, etc.)
    registerEventHandlers(pi, stateManager, notificationManager);

    // 3. Wire dashboard handle so event handlers can trigger re-renders
    setDashboardHandle({
      requestRender: () => controller.requestRender(),
      close: () => controller.hide(),
    });

    // 4. Register /stats command
    let unregisterCommand: (() => void) | undefined;
    if (pi.commands?.register) {
      const result = pi.commands.register({
        name: 'stats',
        description: 'Toggle the stats dashboard overlay',
        execute: () => controller.toggle(),
      });
      unregisterCommand = typeof result === 'function' ? result : () => {
        pi.commands?.unregister?.(result);
      };
    }

    // 5. Register Ctrl+Shift+S keyboard shortcut
    let unregisterShortcut: (() => void) | undefined;
    if (pi.shortcuts?.register) {
      const result = pi.shortcuts.register({
        key: 'Ctrl+Shift+S',
        description: 'Toggle stats dashboard',
        action: () => controller.toggle(),
      });
      unregisterShortcut = typeof result === 'function' ? result : () => {
        pi.shortcuts?.unregister?.(result);
      };
    }

    // 6. Set footer status when dashboard visibility changes
    const updateFooter = () => {
      if (!controller.isVisible()) {
        const status = controller.getFooterStatus();
        pi.ui?.setStatus?.('stats-dashboard', status);
      } else {
        pi.ui?.setStatus?.('stats-dashboard', undefined);
      }
    };

    controller.onVisibilityChange(updateFooter);
    updateFooter();

    // 7. Store cleanup for deactivate()
    _deactivate = () => {
      try { unregisterCommand?.(); } catch { /* ignore cleanup errors */ }
      try { unregisterShortcut?.(); } catch { /* ignore cleanup errors */ }
      try { setDashboardHandle(null); } catch { /* ignore cleanup errors */ }
      try { controller.dispose(); } catch { /* ignore cleanup errors */ }
      try { stateManager.reset(); } catch { /* ignore cleanup errors */ }
      try { pi.ui?.setStatus?.('stats-dashboard', undefined); } catch { /* ignore cleanup errors */ }
      _deactivate = null;
    };
  },

  /**
   * Called by Pi on session shutdown. Cleans up all resources.
   */
  async deactivate(): Promise<void> {
    _deactivate?.();
  },
};

export default extension;
