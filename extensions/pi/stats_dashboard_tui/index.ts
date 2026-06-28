/**
 * Stats Dashboard TUI - Pi Extension Entry Point
 *
 * Real-time monitoring dashboard for Pi sessions. Tracks agent metrics,
 * tool history, and conversation flow in a TUI overlay.
 *
 * Usage:
 *   /stats   - toggle dashboard
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { StateManager } from "./shared/state/state-manager";
import { NotificationManager } from "./shared/state/notification-manager";
import { DashboardController } from "./shared/ui/controller";
import {
  setManagers,
  setDashboardHandle,
  registerEventHandlers,
} from "./shared/handlers/events";

export default function (pi: ExtensionAPI) {
  // Module-level state so all handlers share the same instances
  const stateManager = new StateManager();
  let controller: DashboardController | null = null;

  // Register all Pi event handlers (agent_start, agent_end, message_end, etc.)
  registerEventHandlers(pi as any, stateManager, null as any);

  // Context-dependent setup: runs once when session is ready
  pi.on("session_start", async (_event, ctx) => {
    const notificationManager = new NotificationManager(
      stateManager,
      ctx as any
    );
    controller = new DashboardController({ stateManager, ctx: ctx as any });

    // Inject notification manager into event handlers
    setManagers(stateManager, notificationManager);

    // Wire re-render handle
    setDashboardHandle({
      requestRender: () => controller?.requestRender(),
      close: () => controller?.hide(),
    });

    // Footer status
    const updateFooter = () => {
      if (controller?.isVisible()) {
        ctx.ui.setStatus("stats", undefined);
      } else {
        ctx.ui.setStatus("stats", controller?.getFooterStatus() ?? "📊 0 agents");
      }
    };
    controller.onVisibilityChange(updateFooter);
    updateFooter();
  });

  // Cleanup on shutdown
  pi.on("session_shutdown", async (_event, ctx) => {
    setDashboardHandle(null);
    controller?.dispose();
    controller = null;
    stateManager.reset();
    ctx.ui.setStatus("stats", undefined);
  });

  // Register /stats command to toggle dashboard
  pi.registerCommand("stats", {
    description: "Toggle the stats dashboard overlay",
    handler: async (_args, ctx) => {
      if (!controller) {
        ctx.ui.notify("Stats dashboard not ready yet", "warning");
        return;
      }
      controller.toggle();
    },
  });
}
