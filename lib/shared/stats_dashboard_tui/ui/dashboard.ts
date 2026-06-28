/**
 * Dashboard Component Shell
 * 
 * Main dashboard component implementing the Pi TUI Component interface.
 * Provides a toggleable overlay showing agent stats with header, borders, and content area.
 * Supports keyboard navigation and render caching for performance.
 * 
 * Integrates TabBar for agent selection and AgentPanel for detail display.
 */

import type { StateManager } from '../state/state-manager';
import type { Agent, DashboardState, ConversationEntry } from '../types';
import { TabBar } from './tabs';
import { AgentPanel } from './agent-panel';

/**
 * Overlay configuration for dashboard positioning
 * Used when rendering via ctx.ui.custom({ overlay: true, ... })
 */
export const DASHBOARD_OVERLAY_CONFIG = {
  anchor: 'right-center',
  widthPercent: 50,
  heightPercent: 80,
} as const;

/**
 * Props for DashboardComponent constructor
 */
interface DashboardComponentProps {
  /** State manager instance for accessing agent data */
  stateManager: StateManager;
  /** Controller for managing dashboard visibility */
  controller: DashboardController;
  /** Optional callback triggered when dashboard should close */
  onClose?: () => void;
}

/**
 * Controller interface for dashboard visibility management
 */
interface DashboardController {
  hide(): void;
  isVisible(): boolean;
}

/**
 * Pi TUI Component interface
 */
interface Component {
  render(width: number): string[];
  handleInput?(data: string): void;
  invalidate(): void;
}

/**
 * ANSI escape codes for styling
 */
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  fg: {
    white: '\x1b[37m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
  },
};

/**
 * Box drawing characters for borders
 */
const BOX = {
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  horizontal: '─',
  vertical: '│',
  verticalRight: '├',
  verticalLeft: '┤',
};

/**
 * Minimum and maximum width constraints
 */
const MIN_WIDTH = 20;
const MAX_WIDTH = 300;

/**
 * DashboardComponent class implementing Pi TUI Component interface
 */
export class DashboardComponent implements Component {
  private stateManager: StateManager;
  private controller: DashboardController;
  private onClose?: () => void;
  private cachedRender: { width: number; output: string[] } | null = null;
  
  // Component instances
  private tabBar: TabBar | null = null;
  private agentPanel: AgentPanel | null = null;
  
  // Selection state
  private selectedAgentId: string | null = null;
  
  // UI state
  private showHelp: boolean = false;

  /**
   * Create a new DashboardComponent
   * 
   * @param props - Component properties
   * @throws Error if stateManager or controller is null/undefined
   */
  constructor(props: DashboardComponentProps) {
    if (!props.stateManager) {
      throw new Error('DashboardComponent requires stateManager');
    }
    if (!props.controller) {
      throw new Error('DashboardComponent requires controller');
    }

    this.stateManager = props.stateManager;
    this.controller = props.controller;
    this.onClose = props.onClose;
  }

  /**
   * Render the dashboard UI
   * 
   * @param width - Available width for rendering
   * @returns Array of strings representing each line of the dashboard
   */
  render(width: number): string[] {
    // Check cache first
    if (this.cachedRender && this.cachedRender.width === width) {
      return this.cachedRender.output;
    }

    // Constrain width to reasonable bounds
    const constrainedWidth = Math.max(MIN_WIDTH, Math.min(width, MAX_WIDTH));
    if (constrainedWidth <= 0) {
      return [''];
    }

    const output: string[] = [];

    // Get data from state manager
    const agents = this.stateManager.getAllAgents();
    const dashboardState = this.stateManager.getDashboardState();

    // Apply auto-selection logic
    this.updateSelection(agents);

    // Render header
    output.push(...this.renderHeader(constrainedWidth));

    // Render tab bar
    output.push(...this.renderTabBar(constrainedWidth, agents));

    // Add separator
    const separator = BOX.verticalRight + BOX.horizontal.repeat(constrainedWidth - 2) + BOX.verticalLeft;
    output.push(separator);

    // Render agent panel
    output.push(...this.renderAgentPanel(constrainedWidth, agents));

    // If help overlay is active, add extra padding before footer
    if (this.showHelp) {
      const helpOverlay = this.renderHelpOverlay(constrainedWidth);
      const helpHeight = helpOverlay.length;
      
      // Add extra padding to ensure help overlay stands out and increases total height
      // Add at least 5 extra lines beyond what we already have
      const paddingLines = 5;
      for (let i = 0; i < paddingLines; i++) {
        output.push(`${BOX.vertical}${' '.repeat(constrainedWidth - 2)}${BOX.vertical}`);
      }
      
      // Overlay help on top of existing content (center it)
      const startLine = Math.floor((output.length - helpHeight) / 2);
      for (let i = 0; i < helpOverlay.length; i++) {
        const lineIndex = startLine + i;
        if (lineIndex >= 0 && lineIndex < output.length) {
          output[lineIndex] = helpOverlay[i];
        }
      }
    }

    // Render footer with help text (always at the end)
    output.push(...this.renderFooter(constrainedWidth))

    // Cache the result
    this.cachedRender = { width, output };

    return output;
  }

  /**
   * Handle keyboard input
   * 
   * Global commands are checked BEFORE routing to sub-components.
   * This ensures commands like 'r', '?', and 'q' work from anywhere.
   * 
   * @param data - Input data from keyboard
   */
  handleInput(data: string): void {
    // Handle null/undefined input gracefully
    if (data == null) {
      return;
    }

    // ============================================================
    // GLOBAL COMMANDS - Checked BEFORE sub-component routing
    // ============================================================

    // Refresh command: 'r' or 'R' - invalidate cache and re-render
    if (data === 'r' || data === 'R') {
      this.invalidate();
      return;
    }

    // Help toggle: '?' - show/hide help overlay
    if (data === '?') {
      this.showHelp = !this.showHelp;
      this.invalidate();
      return;
    }

    // Quit command: 'q' or 'Q' - close dashboard (same as ESC)
    if (data === 'q' || data === 'Q') {
      if (this.onClose) {
        this.onClose();
      }
      return;
    }

    // Escape key: close dashboard
    // Check for bare Escape key (ESC = 0x1b = \x1b = \u001b)
    // Note: Arrow keys like \x1b[A should NOT close the dashboard
    if (data === '\x1b' || data === '\u001b') {
      if (this.onClose) {
        this.onClose();
      }
      return;
    }

    // ============================================================
    // SUB-COMPONENT ROUTING
    // ============================================================

    // Route keyboard input to appropriate component
    // Tab/Shift+Tab and Left/Right arrows go to TabBar for navigation
    if (data === '\t' || data === '\x1b[Z' || data === '\x1b[C' || data === '\x1b[D') {
      if (this.tabBar) {
        this.tabBar.handleInput(data);
        this.invalidate(); // Invalidate to trigger re-render with new selection
      }
      return;
    }

    // d/D key for tab dismissal goes to TabBar
    if (data === 'd' || data === 'D') {
      if (this.tabBar) {
        this.tabBar.handleInput(data);
        this.invalidate();
      }
      return;
    }

    // j/k and Up/Down arrows go to AgentPanel for scrolling
    if (data === 'j' || data === 'k' || data === '\x1b[A' || data === '\x1b[B') {
      if (this.agentPanel) {
        const key = data === 'j' ? 'down' : data === 'k' ? 'up' : data === '\x1b[A' ? 'up' : 'down';
        this.agentPanel.handleInput({ key });
        this.invalidate();
      }
      return;
    }

    // Other keys can be routed to AgentPanel (e.g., for expand/collapse)
    if (this.agentPanel) {
      this.agentPanel.handleInput({ key: data });
      this.invalidate();
    }
  }

  /**
   * Clear the render cache to force re-render
   */
  invalidate(): void {
    this.cachedRender = null;
    
    // Invalidate sub-components
    if (this.tabBar) {
      this.tabBar.invalidate();
    }
    if (this.agentPanel) {
      this.agentPanel.invalidate();
    }
  }
  
  /**
   * Update selection state with auto-selection logic
   * 
   * @param agents - Current agents list
   */
  private updateSelection(agents: Agent[]): void {
    // If no agents, clear selection
    if (agents.length === 0) {
      this.selectedAgentId = null;
      return;
    }
    
    // If we have a selection, check if it still exists
    if (this.selectedAgentId !== null) {
      const selectedExists = agents.some(a => a.id === this.selectedAgentId);
      if (selectedExists) {
        return; // Keep current selection
      }
      // Selected agent was removed, select another
      this.selectedAgentId = agents[0].id;
      return;
    }
    
    // No selection, auto-select first agent
    this.selectedAgentId = agents[0].id;
  }
  
  /**
   * Handle tab selection change
   * 
   * @param agentId - Newly selected agent ID
   */
  private onTabSelect(agentId: string): void {
    this.selectedAgentId = agentId;
    this.invalidate();
  }
  
  /**
   * Handle tab dismissal request
   * 
   * @param agentId - Agent ID to dismiss
   */
  private onTabDismiss(agentId: string): void {
    // Dismiss the agent and all its subagents
    this.stateManager.dismissAgent(agentId);
    // Invalidate to re-render with updated agent list
    this.invalidate();
  }
  
  /**
   * Show a notification/warning to the user
   * 
   * @param notification - Notification object with type and message
   */
  private showNotification(notification: { type: string; message: string }): void {
    // For now, this is a simple console warning
    // In a real implementation, this would use Pi's notification system
    // or show a temporary overlay message
    console.warn(`[${notification.type}] ${notification.message}`);
  }
  
  /**
   * Render the tab bar
   * 
   * @param width - Available width
   * @param agents - Current agents list
   * @returns Array of tab bar lines
   */
  private renderTabBar(width: number, agents: Agent[]): string[] {
    const lines: string[] = [];
    const contentWidth = width - 2; // Account for borders
    
    // Create or update TabBar instance
    if (!this.tabBar) {
      this.tabBar = new TabBar({
        agents,
        selectedId: this.selectedAgentId,
        onTabSelect: (agentId) => this.onTabSelect(agentId),
        onTabDismiss: (agentId) => this.onTabDismiss(agentId),
        notifyCallback: (notification) => this.showNotification(notification),
      });
    } else {
      this.tabBar.updateAgents(agents);
      this.tabBar.setSelectedId(this.selectedAgentId);
    }
    
    // Render tab bar
    const tabBarOutput = this.tabBar.render(contentWidth);
    
    // Wrap in borders
    for (const line of tabBarOutput) {
      const paddedLine = this.padText(line, contentWidth);
      lines.push(`${BOX.vertical}${paddedLine}${BOX.vertical}`);
    }
    
    return lines;
  }
  
  /**
   * Render the agent panel
   * 
   * @param width - Available width
   * @param agents - Current agents list
   * @returns Array of agent panel lines
   */
  private renderAgentPanel(width: number, agents: Agent[]): string[] {
    const lines: string[] = [];
    const contentWidth = width - 2; // Account for borders
    
    // Calculate available height - scale with width to make output vary
    // Wider displays get more vertical space for content
    const headerLines = 6; // Header + separator + tabs + separator
    const footerLines = 3; // Separator + help + border
    const baseHeight = 20;
    const widthBonus = Math.floor((width - 60) / 20); // +1 line per 20 chars width over 60
    const availableHeight = baseHeight + Math.max(0, widthBonus);
    
    // Check if we have a selected agent
    if (this.selectedAgentId === null || agents.length === 0) {
      // Empty state
      const emptyMessage = this.selectedAgentId === null && agents.length > 0
        ? 'Select an agent to view details'
        : 'No agents running yet';
      const emptyLine = this.centerText(emptyMessage, contentWidth);
      lines.push(`${BOX.vertical}${ANSI.dim}${emptyLine}${ANSI.reset}${BOX.vertical}`);
      
      // Add padding to fill available height
      for (let i = 0; i < Math.max(0, availableHeight - 1); i++) {
        lines.push(`${BOX.vertical}${' '.repeat(contentWidth)}${BOX.vertical}`);
      }
      
      return lines;
    }
    
    // Get selected agent
    const agent = agents.find(a => a.id === this.selectedAgentId);
    if (!agent) {
      // Agent not found, show error
      const errorLine = this.centerText('Agent not found', contentWidth);
      lines.push(`${BOX.vertical}${ANSI.dim}${errorLine}${ANSI.reset}${BOX.vertical}`);
      return lines;
    }
    
    // Get conversation entries (empty for now - would come from state manager)
    const conversationEntries: ConversationEntry[] = [];
    
    // Create or update AgentPanel instance
    this.agentPanel = new AgentPanel({
      agent,
      conversationEntries,
      theme: null, // Using default theme
      width: contentWidth,
      height: availableHeight,
    });
    
    // Render agent panel
    const panelOutput = this.agentPanel.render();
    const panelLines = panelOutput.split('\n');
    
    // Wrap in borders
    for (const line of panelLines) {
      const paddedLine = this.padText(line, contentWidth);
      lines.push(`${BOX.vertical}${paddedLine}${BOX.vertical}`);
    }
    
    // Fill remaining height with empty lines
    const remainingLines = Math.max(0, availableHeight - panelLines.length);
    for (let i = 0; i < remainingLines; i++) {
      lines.push(`${BOX.vertical}${' '.repeat(contentWidth)}${BOX.vertical}`);
    }
    
    return lines;
  }

  /**
   * Render the dashboard header
   * 
   * @param width - Available width
   * @returns Array of header lines
   */
  private renderHeader(width: number): string[] {
    const lines: string[] = [];

    // Top border
    const topBorder = BOX.topLeft + BOX.horizontal.repeat(width - 2) + BOX.topRight;
    lines.push(topBorder);

    // Title line
    const title = 'Agent Stats Dashboard';
    const titleLine = this.centerText(title, width - 2);
    const styledTitle = `${BOX.vertical}${ANSI.bold}${ANSI.fg.cyan}${titleLine}${ANSI.reset}${BOX.vertical}`;
    lines.push(styledTitle);

    // Separator
    const separator = BOX.verticalRight + BOX.horizontal.repeat(width - 2) + BOX.verticalLeft;
    lines.push(separator);

    return lines;
  }



  /**
   * Render the footer with help text
   * 
   * @param width - Available width
   * @returns Array of footer lines
   */
  private renderFooter(width: number): string[] {
    const lines: string[] = [];
    const contentWidth = width - 2;

    // Separator
    const separator = BOX.verticalRight + BOX.horizontal.repeat(width - 2) + BOX.verticalLeft;
    lines.push(separator);

    // Help text
    const helpText = 'Press ? for help | ESC or q to close';
    const paddedHelp = this.centerText(helpText, contentWidth);
    lines.push(`${BOX.vertical}${ANSI.dim}${paddedHelp}${ANSI.reset}${BOX.vertical}`);

    // Bottom border
    const bottomBorder = BOX.bottomLeft + BOX.horizontal.repeat(width - 2) + BOX.bottomRight;
    lines.push(bottomBorder);

    return lines;
  }

  /**
   * Render the help overlay showing all keyboard shortcuts
   * 
   * @param width - Available width
   * @returns Array of help overlay lines
   */
  private renderHelpOverlay(width: number): string[] {
    const lines: string[] = [];
    
    // Calculate overlay width (60% of total width, min 40, max 60)
    const overlayWidth = Math.max(40, Math.min(60, Math.floor(width * 0.6)));
    const contentWidth = overlayWidth - 2;
    
    // Calculate left padding for centering
    const leftPadding = Math.floor((width - overlayWidth) / 2);
    const padding = ' '.repeat(leftPadding);
    
    // Helper to create overlay line with padding
    const overlayLine = (content: string): string => {
      return padding + content;
    };
    
    // Top border
    lines.push(overlayLine(BOX.topLeft + BOX.horizontal.repeat(overlayWidth - 2) + BOX.topRight));
    
    // Title
    const title = 'Keyboard Shortcuts';
    const titleLine = this.centerText(`${ANSI.bold}${title}${ANSI.reset}`, contentWidth);
    lines.push(overlayLine(`${BOX.vertical}${titleLine}${BOX.vertical}`));
    
    // Separator
    lines.push(overlayLine(BOX.verticalRight + BOX.horizontal.repeat(overlayWidth - 2) + BOX.verticalLeft));
    
    // Shortcuts grouped by category
    const shortcuts = [
      { category: 'General', items: [
        { key: 'ESC, q', description: 'Close dashboard' },
        { key: 'r', description: 'Refresh display' },
        { key: '?', description: 'Toggle this help' },
      ]},
      { category: 'Navigation', items: [
        { key: 'Tab, Shift+Tab', description: 'Switch between tabs' },
        { key: '← →', description: 'Navigate tabs' },
        { key: '↑ ↓, j k', description: 'Scroll content' },
      ]},
      { category: 'Tab Management', items: [
        { key: 'd', description: 'Dismiss selected tab (if complete/failed)' },
      ]},
    ];
    
    // Render each category
    for (const section of shortcuts) {
      // Empty line before category
      lines.push(overlayLine(`${BOX.vertical}${' '.repeat(contentWidth)}${BOX.vertical}`));
      
      // Category header
      const categoryHeader = `  ${ANSI.bold}${section.category}${ANSI.reset}`;
      const paddedCategory = this.padText(categoryHeader, contentWidth);
      lines.push(overlayLine(`${BOX.vertical}${paddedCategory}${BOX.vertical}`));
      
      // Shortcuts in category
      for (const item of section.items) {
        const shortcutLine = `    ${ANSI.fg.cyan}${item.key}${ANSI.reset} - ${item.description}`;
        const paddedShortcut = this.padText(shortcutLine, contentWidth);
        lines.push(overlayLine(`${BOX.vertical}${paddedShortcut}${BOX.vertical}`));
      }
    }
    
    // Empty line at bottom
    lines.push(overlayLine(`${BOX.vertical}${' '.repeat(contentWidth)}${BOX.vertical}`));
    
    // Bottom border
    lines.push(overlayLine(BOX.bottomLeft + BOX.horizontal.repeat(overlayWidth - 2) + BOX.bottomRight));
    
    return lines;
  }

  /**
   * Get status icon for an agent
   * 
   * @param status - Agent status
   * @returns Status icon character
   */
  private getStatusIcon(status: string): string {
    switch (status) {
      case 'running':
        return '🟢';
      case 'completed':
        return '✓';
      case 'failed':
        return '✗';
      default:
        return '•';
    }
  }

  /**
   * Center text within a given width
   * 
   * @param text - Text to center
   * @param width - Available width
   * @returns Centered text with padding
   */
  private centerText(text: string, width: number): string {
    const textLength = this.stripAnsi(text).length;
    if (textLength >= width) {
      return this.truncateText(text, width);
    }

    const totalPadding = width - textLength;
    const leftPadding = Math.floor(totalPadding / 2);
    const rightPadding = totalPadding - leftPadding;

    return ' '.repeat(leftPadding) + text + ' '.repeat(rightPadding);
  }

  /**
   * Pad text to fill width (left-aligned)
   * 
   * @param text - Text to pad
   * @param width - Available width
   * @returns Padded text
   */
  private padText(text: string, width: number): string {
    const textLength = this.stripAnsi(text).length;
    if (textLength >= width) {
      return this.truncateText(text, width);
    }

    return text + ' '.repeat(width - textLength);
  }

  /**
   * Truncate text to maximum length with ellipsis
   * 
   * @param text - Text to truncate
   * @param maxLength - Maximum length
   * @returns Truncated text
   */
  private truncateText(text: string, maxLength: number): string {
    const stripped = this.stripAnsi(text);
    if (stripped.length <= maxLength) {
      return text;
    }

    if (maxLength <= 3) {
      return stripped.slice(0, maxLength);
    }

    return stripped.slice(0, maxLength - 3) + '...';
  }

  /**
   * Strip ANSI escape codes from text
   * 
   * @param text - Text with ANSI codes
   * @returns Text without ANSI codes
   */
  private stripAnsi(text: string): string {
    return text.replace(/\x1B\[[0-9;]*m/g, '');
  }
}
