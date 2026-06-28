/**
 * Tool History Component
 * 
 * Displays a list of tool calls with status, duration, and error information.
 * Supports expanding details, scrolling, and efficient rendering with caching.
 */

import type { ToolCall } from '../types';
import { formatDuration, formatToolArgs, truncateText, extractErrorMessage } from '../utils/format';

/**
 * Theme interface for styling
 */
interface Theme {
  fg(style: string, text: string): string;
  bg(style: string, text: string): string;
}

/**
 * Props for ToolHistory component
 */
export interface ToolHistoryProps {
  /** Agent to display tool history for */
  agent: import('../types').Agent;
  /** Optional theme for styling */
  theme?: Theme | null;
  /** Display width in characters */
  width: number;
}

/**
 * ToolHistory component displays tool calls with status, timing, and expandable details
 */
export class ToolHistory {
  private agent: import('../types').Agent;
  private theme: Theme | null;
  private width: number;
  private height: number;
  private expanded: boolean;
  private scrollOffset: number;
  private selectedIndex: number;
  private cachedOutput: string | null;
  private lastRenderState: string | null;

  /**
   * Create a new ToolHistory component
   */
  constructor(props: ToolHistoryProps) {
    if (!props.agent) {
      throw new Error('Agent is required');
    }

    this.agent = props.agent;
    this.theme = props.theme ?? null;
    this.width = Math.max(20, props.width);
    this.height = 20; // Default height
    this.expanded = false;
    this.scrollOffset = 0;
    this.selectedIndex = 0;
    this.cachedOutput = null;
    this.lastRenderState = null;
  }

  /**
   * Render the tool history component
   * 
   * @returns Rendered output string
   */
  render(): string {

    // Generate state hash for cache invalidation
    const stateHash = this.generateStateHash();
    
    // Return cached output if state unchanged
    if (this.cachedOutput !== null && this.lastRenderState === stateHash) {
      return this.cachedOutput;
    }

    // Generate new output
    const output = this.generateOutput();
    
    // Cache the output
    this.cachedOutput = output;
    this.lastRenderState = stateHash;
    
    return output;
  }

  /**
   * Handle keyboard input
   * 
   * @param data - Input data with key property
   * @returns True if input was handled, false otherwise
   */
  handleInput(data: { key?: string }): boolean {
    // Handle invalid input
    if (!data || !data.key) {
      return false;
    }

    const key = data.key.toLowerCase();

    // Toggle expand/collapse with 'e' key
    if (key === 'e') {
      this.expanded = !this.expanded;
      this.invalidateCache();
      return true;
    }

    // Scrolling only makes sense if we have tool calls
    const toolCalls = this.agent.toolCalls || [];
    if (toolCalls.length === 0) {
      return false;
    }

    // Handle scroll down
    if (key === 'j' || key === 'down') {
      this.scrollDown();
      this.invalidateCache();
      return true;
    }

    // Handle scroll up
    if (key === 'k' || key === 'up') {
      this.scrollUp();
      this.invalidateCache();
      return true;
    }

    // Handle page down
    if (key === 'pagedown') {
      this.pageDown();
      this.invalidateCache();
      return true;
    }

    // Handle page up
    if (key === 'pageup') {
      this.pageUp();
      this.invalidateCache();
      return true;
    }

    return false;
  }

  /**
   * Generate state hash for cache invalidation
   */
  private generateStateHash(): string {
    const toolCalls = this.agent.toolCalls || [];
    return JSON.stringify({
      toolCallIds: toolCalls.map(tc => tc.id),
      toolCallStatuses: toolCalls.map(tc => tc.status),
      expanded: this.expanded,
      scrollOffset: this.scrollOffset,
      selectedIndex: this.selectedIndex,
      width: this.width,
    });
  }

  /**
   * Invalidate the render cache
   */
  private invalidateCache(): void {
    this.cachedOutput = null;
    this.lastRenderState = null;
  }

  /**
   * Generate the output string
   */
  private generateOutput(): string {
    const toolCalls = this.agent.toolCalls || [];
    
    // Handle empty state
    if (toolCalls.length === 0) {
      return this.renderEmptyState();
    }

    // Sort tool calls by startTime (newest first)
    const sortedCalls = [...toolCalls].sort((a, b) => b.startTime - a.startTime);

    // Render each tool call
    const lines: string[] = [];
    
    for (let i = 0; i < sortedCalls.length; i++) {
      const toolCall = sortedCalls[i];
      const isSelected = i === this.selectedIndex;
      
      // Render tool call line
      const toolLine = this.renderToolCall(toolCall, isSelected);
      lines.push(toolLine);

      // If expanded and selected, show details
      if (this.expanded && isSelected) {
        const detailsLines = this.renderToolDetails(toolCall);
        lines.push(...detailsLines);
      }
    }

    // Apply scrolling
    const visibleLines = this.applyScrolling(lines);

    return visibleLines.join('\n');
  }

  /**
   * Render empty state message
   */
  private renderEmptyState(): string {
    return 'No tool calls yet';
  }

  /**
   * Render a single tool call line
   */
  private renderToolCall(toolCall: ToolCall, isSelected: boolean): string {
    // Get status icon
    const icon = this.getStatusIcon(toolCall.status);

    // Get tool name
    const toolName = toolCall.toolName || '(unknown)';

    // Get args summary
    const argsSummary = toolCall.argsSummary || formatToolArgs(toolName, toolCall.args || {});

    // Get duration if completed
    let durationStr = '';
    if (toolCall.status !== 'pending' && toolCall.duration != null) {
      durationStr = ` (${formatDuration(toolCall.duration)})`;
    }

    // Build the line with status text for failed calls
    let statusText = '';
    if (toolCall.status === 'failed' || toolCall.isError) {
      statusText = ' [FAILED]';
    }

    let line = `${icon} ${toolName}: ${argsSummary}${durationStr}${statusText}`;

    // Apply error styling if failed
    if (toolCall.status === 'failed' || toolCall.isError) {
      // Apply red color for error
      line = `\x1b[31m${line}\x1b[0m`;
    }

    // Truncate to fit width
    line = this.truncateLine(line, this.width);

    return line;
  }

  /**
   * Get status icon for tool call
   */
  private getStatusIcon(status: string): string {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'success':
        return '✓';
      case 'failed':
        return '✗';
      default:
        return '?';
    }
  }

  /**
   * Render tool call details (when expanded)
   */
  private renderToolDetails(toolCall: ToolCall): string[] {
    const lines: string[] = [];
    const indent = '  ';

    // Show full arguments
    if (toolCall.args && typeof toolCall.args === 'object') {
      lines.push(`${indent}Arguments:`);
      
      const argsEntries = Object.entries(toolCall.args);
      for (const [key, value] of argsEntries) {
        let valueStr: string;
        
        if (value == null) {
          valueStr = 'null';
        } else if (typeof value === 'object') {
          valueStr = JSON.stringify(value);
        } else {
          valueStr = String(value);
        }

        // Truncate long values
        valueStr = truncateText(valueStr, this.width - indent.length - key.length - 4);
        
        const argLine = `${indent}  ${key}: ${valueStr}`;
        lines.push(this.truncateLine(argLine, this.width));
      }
    }

    // Show error message if failed
    if ((toolCall.status === 'failed' || toolCall.isError) && toolCall.errorMessage) {
      lines.push(`${indent}Error:`);
      
      // Extract and format error message
      const errorMsg = toolCall.errorMessage;
      
      // Word wrap error message to fit width
      const errorLines = this.wordWrap(errorMsg, this.width - indent.length - 2);
      for (const errorLine of errorLines) {
        lines.push(`${indent}  ${errorLine}`);
      }
    }

    return lines;
  }

  /**
   * Truncate a line to fit width, handling ANSI codes
   */
  private truncateLine(line: string, maxWidth: number): string {
    // Remove ANSI codes for length calculation
    const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
    
    if (cleanLine.length <= maxWidth) {
      return line;
    }

    // Truncate (simplified - doesn't preserve ANSI codes)
    const chars = Array.from(cleanLine);
    if (chars.length <= maxWidth) {
      return line;
    }

    if (maxWidth <= 3) {
      return '...';
    }

    return chars.slice(0, maxWidth - 3).join('') + '...';
  }

  /**
   * Word wrap text to fit within width
   */
  private wordWrap(text: string, maxWidth: number): string[] {
    if (!text || maxWidth <= 0) {
      return [];
    }

    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      
      if (Array.from(testLine).length <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        
        // If single word is too long, truncate it
        if (Array.from(word).length > maxWidth) {
          currentLine = truncateText(word, maxWidth);
        } else {
          currentLine = word;
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Apply scrolling to lines based on height and scroll offset
   */
  private applyScrolling(lines: string[]): string[] {
    // If all lines fit, no scrolling needed
    if (lines.length <= this.height) {
      return lines;
    }

    // Calculate visible range
    const start = Math.max(0, Math.min(this.scrollOffset, lines.length - this.height));
    const end = start + this.height;

    return lines.slice(start, end);
  }

  /**
   * Scroll down one line
   */
  private scrollDown(): void {
    const toolCalls = this.agent.toolCalls || [];
    const sortedCalls = [...toolCalls].sort((a, b) => b.startTime - a.startTime);
    const maxIndex = sortedCalls.length - 1;
    
    if (this.selectedIndex < maxIndex) {
      this.selectedIndex++;
      
      // Adjust scroll offset if needed
      if (this.selectedIndex >= this.scrollOffset + this.height) {
        this.scrollOffset++;
      }
    }
  }

  /**
   * Scroll up one line
   */
  private scrollUp(): void {
    if (this.selectedIndex > 0) {
      this.selectedIndex--;
      
      // Adjust scroll offset if needed
      if (this.selectedIndex < this.scrollOffset) {
        this.scrollOffset--;
      }
    }
  }

  /**
   * Scroll down one page
   */
  private pageDown(): void {
    const toolCalls = this.agent.toolCalls || [];
    const sortedCalls = [...toolCalls].sort((a, b) => b.startTime - a.startTime);
    const maxIndex = sortedCalls.length - 1;
    
    this.selectedIndex = Math.min(maxIndex, this.selectedIndex + this.height);
    
    // Adjust scroll offset
    this.scrollOffset = Math.min(
      Math.max(0, sortedCalls.length - this.height),
      this.scrollOffset + this.height
    );
  }

  /**
   * Scroll up one page
   */
  private pageUp(): void {
    this.selectedIndex = Math.max(0, this.selectedIndex - this.height);
    
    // Adjust scroll offset
    this.scrollOffset = Math.max(0, this.scrollOffset - this.height);
  }
}
