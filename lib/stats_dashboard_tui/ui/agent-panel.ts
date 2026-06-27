/**
 * Agent Panel Component
 * 
 * Composes MetricsDisplay, ToolHistory, and ConversationView into a unified
 * agent detail panel with header, section separation, scrolling, and keyboard navigation.
 * 
 * Features:
 * - Agent header with name and status indicator (🟢/✓/✗)
 * - Subagent count display
 * - Clear visual section separation
 * - Scrolling through all content
 * - Keyboard navigation (j/k or arrow keys)
 * - Height adaptation
 * - Empty agent state handling
 * - Render caching for performance
 */

import type { Agent, ConversationEntry } from '../types';
import { MetricsDisplay } from './metrics-display';
import { ToolHistory } from './tool-history';
import { ConversationView } from './conversation-view';

/**
 * Theme interface for styling
 */
interface Theme {
  fg(style: string, text: string): string;
  bg(style: string, text: string): string;
}

/**
 * Props for AgentPanel component
 */
export interface AgentPanelProps {
  /** Agent to display */
  agent: Agent;
  /** Conversation entries for the agent */
  conversationEntries: ConversationEntry[];
  /** Optional theme for styling */
  theme?: Theme | null;
  /** Display width in characters */
  width: number;
  /** Display height in lines */
  height: number;
}

/**
 * AgentPanel component that composes all agent detail sections
 */
export class AgentPanel {
  private agent: Agent;
  private conversationEntries: ConversationEntry[];
  private theme: Theme | null;
  private width: number;
  private height: number;
  
  // Sub-components
  private metricsDisplay: MetricsDisplay;
  private toolHistory: ToolHistory;
  private conversationView: ConversationView;
  
  // Scrolling state
  private scrollOffset: number = 0;
  
  // Render cache
  private renderCache: string | null = null;
  private lastRenderState: string | null = null;

  /**
   * Create a new AgentPanel instance
   */
  constructor(props: AgentPanelProps) {
    if (!props.agent) {
      throw new Error('Agent is required');
    }

    this.agent = props.agent;
    this.conversationEntries = props.conversationEntries || [];
    this.theme = props.theme ?? null;
    this.width = Math.max(0, props.width);
    this.height = Math.max(0, props.height);

    // Initialize sub-components
    this.metricsDisplay = new MetricsDisplay(this.agent.metrics, this.theme);
    this.toolHistory = new ToolHistory({
      toolCalls: this.agent.toolCalls || [],
      width: this.width,
      height: Math.floor(this.height * 0.3), // Allocate 30% initially
    });
    this.conversationView = new ConversationView({
      conversationEntries: this.conversationEntries,
      width: this.width,
      height: Math.floor(this.height * 0.3), // Allocate 30% initially
    });
  }

  /**
   * Render the agent panel
   * 
   * @returns Rendered panel as string
   */
  public render(): string {
    // Check cache
    const stateHash = this.generateStateHash();
    if (this.renderCache !== null && this.lastRenderState === stateHash) {
      return this.renderCache;
    }

    // Handle zero dimensions
    if (this.width === 0 || this.height === 0) {
      this.renderCache = '';
      this.lastRenderState = stateHash;
      return '';
    }

    const lines: string[] = [];

    // 1. Render header (agent name + status + subagent count)
    const headerLines = this.renderHeader();
    lines.push(...headerLines);

    // 2. Add separator
    lines.push('');

    // Calculate remaining height for content sections
    const usedLines = lines.length;
    const remainingHeight = Math.max(0, this.height - usedLines);

    // 3. Render content sections with height distribution
    if (remainingHeight > 0) {
      const contentLines = this.renderContent(remainingHeight);
      lines.push(...contentLines);
    }

    // Apply scrolling
    const visibleLines = this.applyScrolling(lines);

    // Join and cache
    const output = visibleLines.join('\n');
    this.renderCache = output;
    this.lastRenderState = stateHash;

    return output;
  }

  /**
   * Handle keyboard input
   * 
   * @param data - Input data with key property
   * @returns True if input was handled, false otherwise
   */
  public handleInput(data: { key?: string }): boolean {
    if (!data || !data.key) {
      return false;
    }

    const key = data.key.toLowerCase();

    // Handle scrolling
    if (key === 'j' || key === 'down') {
      this.scrollDown();
      this.invalidate();
      return true;
    }

    if (key === 'k' || key === 'up') {
      this.scrollUp();
      this.invalidate();
      return true;
    }

    // Pass through to sub-components if needed
    // (e.g., for expand/collapse functionality)
    return false;
  }

  /**
   * Invalidate render cache to force re-render
   */
  public invalidate(): void {
    this.renderCache = null;
    this.lastRenderState = null;
    
    // Invalidate sub-components
    this.metricsDisplay.invalidate();
    this.toolHistory.handleInput({ key: 'invalidate' }); // Trigger cache invalidation
    this.conversationView.invalidate();
  }

  /**
   * Generate state hash for cache invalidation
   */
  private generateStateHash(): string {
    return JSON.stringify({
      agentId: this.agent.id,
      status: this.agent.status,
      metricsHash: JSON.stringify(this.agent.metrics),
      toolCallCount: this.agent.toolCalls.length,
      conversationCount: this.conversationEntries.length,
      subagentCount: this.agent.subagentIds.length,
      scrollOffset: this.scrollOffset,
      width: this.width,
      height: this.height,
    });
  }

  /**
   * Render agent header with name, status, and subagent count
   */
  private renderHeader(): string[] {
    const lines: string[] = [];

    // Build status indicator
    const statusIcon = this.getStatusIcon(this.agent.status);
    const statusText = this.agent.status;

    // Build agent name line
    const name = this.agent.name || '(unnamed)';
    const nameWithStatus = `${statusIcon} ${name} [${statusText}]`;

    // Apply theme if available
    const styledName = this.theme 
      ? this.theme.fg('accent', nameWithStatus)
      : nameWithStatus;

    lines.push(this.fitToWidth(styledName));

    // Add subagent count if present
    if (this.agent.subagentIds && this.agent.subagentIds.length > 0) {
      const count = this.agent.subagentIds.length;
      const label = count === 1 ? 'subagent' : 'subagents';
      const subagentLine = `  └─ ${count} ${label}`;
      
      const styledSubagentLine = this.theme
        ? this.theme.fg('dim', subagentLine)
        : subagentLine;
      
      lines.push(this.fitToWidth(styledSubagentLine));
    }

    // Add separator line
    const separator = '─'.repeat(Math.min(this.width, 80));
    lines.push(this.fitToWidth(separator));

    return lines;
  }

  /**
   * Get status icon for agent status
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
        return '?';
    }
  }

  /**
   * Render content sections with height distribution
   */
  private renderContent(availableHeight: number): string[] {
    const lines: string[] = [];

    // Minimum lines needed for each section header
    const minHeaderSize = 2;

    // Calculate height distribution
    // Priority: Metrics > Tools > Conversation
    // Try to give each section at least some minimum space

    let metricsHeight = 0;
    let toolsHeight = 0;
    let conversationHeight = 0;

    if (availableHeight >= minHeaderSize * 3) {
      // Enough space for all three sections
      // Allocate proportionally: 40% metrics, 35% tools, 25% conversation
      metricsHeight = Math.floor(availableHeight * 0.40);
      toolsHeight = Math.floor(availableHeight * 0.35);
      conversationHeight = availableHeight - metricsHeight - toolsHeight;
    } else if (availableHeight >= minHeaderSize * 2) {
      // Space for two sections - show metrics and tools
      metricsHeight = Math.floor(availableHeight * 0.55);
      toolsHeight = availableHeight - metricsHeight;
      conversationHeight = 0;
    } else if (availableHeight >= minHeaderSize) {
      // Space for one section - show metrics only
      metricsHeight = availableHeight;
      toolsHeight = 0;
      conversationHeight = 0;
    } else {
      // Not enough space for any complete section
      return lines;
    }

    // Render Metrics section
    if (metricsHeight > 0) {
      const metricsLines = this.renderMetricsSection(metricsHeight);
      lines.push(...metricsLines);
    }

    // Render Tool History section
    if (toolsHeight > 0) {
      if (lines.length > 0) {
        lines.push(''); // Add separator
      }
      const toolLines = this.renderToolHistorySection(toolsHeight);
      lines.push(...toolLines);
    }

    // Render Conversation section
    if (conversationHeight > 0) {
      if (lines.length > 0) {
        lines.push(''); // Add separator
      }
      const conversationLines = this.renderConversationSection(conversationHeight);
      lines.push(...conversationLines);
    }

    return lines;
  }

  /**
   * Render metrics section
   */
  private renderMetricsSection(height: number): string[] {
    const lines: string[] = [];

    // Get metrics display output
    const metricsOutput = this.metricsDisplay.render(this.width);
    const metricsLines = metricsOutput.split('\n');

    // Limit to available height
    const limitedLines = metricsLines.slice(0, height);
    lines.push(...limitedLines);

    return lines;
  }

  /**
   * Render tool history section
   */
  private renderToolHistorySection(height: number): string[] {
    const lines: string[] = [];

    // Add section header
    const header = '─ Tool History ';
    const separator = '─'.repeat(Math.max(0, this.width - header.length));
    const headerLine = this.theme
      ? this.theme.fg('accent', header + separator)
      : header + separator;
    
    lines.push(this.fitToWidth(headerLine));

    // Calculate remaining height for tool history content
    const contentHeight = Math.max(0, height - 1);

    if (contentHeight > 0) {
      // Check if there are any tool calls
      if (!this.agent.toolCalls || this.agent.toolCalls.length === 0) {
        // Show empty state
        const emptyMessage = this.theme
          ? this.theme.fg('dim', 'No tool calls yet')
          : 'No tool calls yet';
        lines.push(this.fitToWidth(emptyMessage));
      } else {
        // Render tool history
        const toolOutput = this.toolHistory.render(this.width);
        const toolLines = toolOutput.split('\n');

        // Limit to available height
        const limitedLines = toolLines.slice(0, contentHeight);
        lines.push(...limitedLines);
      }
    }

    return lines;
  }

  /**
   * Render conversation section
   */
  private renderConversationSection(height: number): string[] {
    const lines: string[] = [];

    // ConversationView renders its own header, so just get its output
    const conversationLines = this.conversationView.render();

    // Limit to available height
    const limitedLines = conversationLines.slice(0, height);
    lines.push(...limitedLines);

    return lines;
  }

  /**
   * Apply scrolling to lines based on scroll offset and height
   */
  private applyScrolling(lines: string[]): string[] {
    // If all lines fit, no scrolling needed
    if (lines.length <= this.height) {
      return lines;
    }

    // Calculate visible range
    const maxScroll = Math.max(0, lines.length - this.height);
    this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, maxScroll));

    const start = this.scrollOffset;
    const end = start + this.height;

    return lines.slice(start, end);
  }

  /**
   * Scroll down one line
   */
  private scrollDown(): void {
    // We need to know the total content height to prevent scrolling past end
    // Render without cache to get actual line count
    const tempCache = this.renderCache;
    const tempState = this.lastRenderState;
    
    this.renderCache = null;
    this.lastRenderState = null;
    
    const fullRender = this.render();
    const totalLines = fullRender.split('\n').length;
    
    this.renderCache = tempCache;
    this.lastRenderState = tempState;

    const maxScroll = Math.max(0, totalLines - this.height);
    this.scrollOffset = Math.min(this.scrollOffset + 1, maxScroll);
  }

  /**
   * Scroll up one line
   */
  private scrollUp(): void {
    this.scrollOffset = Math.max(0, this.scrollOffset - 1);
  }

  /**
   * Fit text to width by truncating
   */
  private fitToWidth(text: string): string {
    // Strip ANSI codes for length calculation
    const stripped = this.stripAnsi(text);
    
    if (stripped.length <= this.width) {
      return text;
    }

    // Truncate (simplified version)
    if (this.width <= 3) {
      return '...';
    }

    // Try to preserve ANSI codes while truncating
    // For simplicity, just truncate at width
    const chars = Array.from(stripped);
    const truncated = chars.slice(0, this.width - 3).join('') + '...';
    
    return truncated;
  }

  /**
   * Strip ANSI escape codes from text
   */
  private stripAnsi(text: string): string {
    return text.replace(/\x1b\[[0-9;]*m/g, '');
  }
}
