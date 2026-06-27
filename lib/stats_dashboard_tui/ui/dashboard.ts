/**
 * Dashboard Component Shell
 * 
 * Main dashboard component implementing the Pi TUI Component interface.
 * Provides a toggleable overlay showing agent stats with header, borders, and content area.
 * Supports keyboard navigation and render caching for performance.
 */

import type { StateManager } from '../state/state-manager';
import type { Agent, DashboardState } from '../types';

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

    // Render header
    output.push(...this.renderHeader(constrainedWidth));

    // Render content area
    output.push(...this.renderContent(constrainedWidth, agents, dashboardState));

    // Render footer with help text
    output.push(...this.renderFooter(constrainedWidth));

    // Cache the result
    this.cachedRender = { width, output };

    return output;
  }

  /**
   * Handle keyboard input
   * 
   * @param data - Input data from keyboard
   */
  handleInput(data: string): void {
    // Handle null/undefined input gracefully
    if (data == null) {
      return;
    }

    // Check for bare Escape key (ESC = 0x1b = \x1b = \u001b)
    // Note: Arrow keys like \x1b[A should NOT close the dashboard
    if (data === '\x1b' || data === '\u001b') {
      if (this.onClose) {
        this.onClose();
      }
    }

    // Additional key handling can be added here in future tasks
  }

  /**
   * Clear the render cache to force re-render
   */
  invalidate(): void {
    this.cachedRender = null;
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
   * Render the main content area
   * 
   * @param width - Available width
   * @param agents - Array of agents to display
   * @param dashboardState - Current dashboard state
   * @returns Array of content lines
   */
  private renderContent(width: number, agents: Agent[], dashboardState: DashboardState | null): string[] {
    const lines: string[] = [];
    const contentWidth = width - 2; // Account for borders

    if (agents.length === 0) {
      // Empty state
      const emptyMessage = 'No agents running yet';
      const emptyLine = this.centerText(emptyMessage, contentWidth);
      lines.push(`${BOX.vertical}${ANSI.dim}${emptyLine}${ANSI.reset}${BOX.vertical}`);
      
      // Add some padding
      for (let i = 0; i < 3; i++) {
        lines.push(`${BOX.vertical}${' '.repeat(contentWidth)}${BOX.vertical}`);
      }
    } else {
      // Show agent list
      const listHeader = `${agents.length} agent${agents.length === 1 ? '' : 's'} tracked`;
      const paddedHeader = this.padText(listHeader, contentWidth);
      lines.push(`${BOX.vertical}${ANSI.fg.white}${paddedHeader}${ANSI.reset}${BOX.vertical}`);

      // Empty line
      lines.push(`${BOX.vertical}${' '.repeat(contentWidth)}${BOX.vertical}`);

      // List agents (show first few)
      const maxAgentsToShow = 5;
      const agentsToShow = agents.slice(0, maxAgentsToShow);

      for (const agent of agentsToShow) {
        const statusIcon = this.getStatusIcon(agent.status);
        const agentLine = `  ${statusIcon} ${agent.name}`;
        const paddedLine = this.padText(this.truncateText(agentLine, contentWidth), contentWidth);
        lines.push(`${BOX.vertical}${paddedLine}${BOX.vertical}`);
      }

      if (agents.length > maxAgentsToShow) {
        const remaining = agents.length - maxAgentsToShow;
        const moreText = `  ... and ${remaining} more`;
        const paddedMore = this.padText(moreText, contentWidth);
        lines.push(`${BOX.vertical}${ANSI.dim}${paddedMore}${ANSI.reset}${BOX.vertical}`);
      }

      // Add padding to make content area larger
      const additionalPadding = 2;
      for (let i = 0; i < additionalPadding; i++) {
        lines.push(`${BOX.vertical}${' '.repeat(contentWidth)}${BOX.vertical}`);
      }
    }

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
    const helpText = 'Press ESC to close';
    const paddedHelp = this.centerText(helpText, contentWidth);
    lines.push(`${BOX.vertical}${ANSI.dim}${paddedHelp}${ANSI.reset}${BOX.vertical}`);

    // Bottom border
    const bottomBorder = BOX.bottomLeft + BOX.horizontal.repeat(width - 2) + BOX.bottomRight;
    lines.push(bottomBorder);

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
