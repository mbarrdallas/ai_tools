/**
 * Conversation View Component
 * 
 * Displays conversation history with messages from user and assistant,
 * including role labels, content previews, timestamps, and scrolling support.
 * 
 * Features:
 * - Message list with User/Assistant/Tool labels
 * - Content preview truncated to ~100 chars
 * - Scrolling with j/k or arrow keys
 * - Timestamps (when space permits)
 * - Toggle expand mode with 'c' key
 * - Empty state handling
 * - Visual styling and distinction
 */

import { ConversationEntry, MessageRole } from '../types';
import { truncateText } from '../utils/format';

export interface ConversationViewProps {
  conversationEntries: ConversationEntry[];
  width: number;
  height: number;
}

export class ConversationView {
  private conversationEntries: ConversationEntry[];
  private width: number;
  private height: number;
  private scrollOffset: number = 0;
  private scrollInitialized: boolean = false;
  private isExpanded: boolean = false;
  private renderCache: string[] | null = null;

  constructor(props: ConversationViewProps) {
    // Validate required parameters
    if (props.conversationEntries == null) {
      throw new Error('conversationEntries is required');
    }
    if (props.width == null) {
      throw new Error('width is required');
    }
    if (props.height == null) {
      throw new Error('height is required');
    }

    this.conversationEntries = props.conversationEntries;
    this.width = Math.max(0, props.width); // Ensure non-negative
    this.height = Math.max(0, props.height); // Ensure non-negative
  }

  /**
   * Render the conversation view
   * 
   * @returns Array of strings representing rendered lines
   */
  render(): string[] {
    // Return cached render if available
    if (this.renderCache !== null) {
      return this.renderCache;
    }

    // Build and cache the render
    this.renderCache = this.buildRender();
    return this.renderCache;
  }

  /**
   * Build the rendered output
   */
  private buildRender(): string[] {
    const lines: string[] = [];

    // Handle zero or minimal dimensions
    if (this.height === 0) {
      return [];
    }

    if (this.width === 0) {
      return lines;
    }

    // Add section header
    const header = this.renderHeader();
    lines.push(...header);

    // Handle empty conversation
    if (this.conversationEntries.length === 0) {
      const emptyMessage = this.renderEmptyState();
      lines.push(...emptyMessage);
    } else {
      // Render messages
      const messageLines = this.renderMessages();
      lines.push(...messageLines);
    }

    // Limit to available height
    const limitedLines = this.limitToHeight(lines);

    return limitedLines;
  }

  /**
   * Render section header
   */
  private renderHeader(): string[] {
    const lines: string[] = [];
    
    // Header with box drawing
    const title = '─ Conversation ';
    const remainingWidth = this.width - this.stripAnsi(title).length;
    const headerLine = `\x1b[36m${title}${'─'.repeat(Math.max(0, remainingWidth))}\x1b[0m`;
    
    lines.push(this.fitToWidth(headerLine));

    // Add expand hint if not in expanded mode and have messages
    // Only show if width is sufficient (at least 30 chars)
    if (!this.isExpanded && this.conversationEntries.length > 0 && this.width >= 30) {
      const hint = '\x1b[2m(Press \'c\' to expand)\x1b[0m';
      lines.push(this.fitToWidth(hint));
    }

    return lines;
  }

  /**
   * Render empty state message
   */
  private renderEmptyState(): string[] {
    const lines: string[] = [];
    const message = '\x1b[2mNo messages yet\x1b[0m';
    lines.push(this.fitToWidth(message));
    return lines;
  }

  /**
   * Render conversation messages
   */
  private renderMessages(): string[] {
    const lines: string[] = [];

    // Calculate content for all messages
    const messageBlocks: string[][] = [];

    for (const entry of this.conversationEntries) {
      const block = this.renderMessage(entry);
      messageBlocks.push(block);
    }

    // Apply scrolling by selecting visible range
    const allLines = messageBlocks.flat();
    const availableLines = this.height - 2; // Reserve space for header

    if (availableLines <= 0) {
      return [];
    }

    // Calculate scroll bounds
    const totalLines = allLines.length;
    const maxScroll = Math.max(0, totalLines - availableLines);
    
    // Initialize scroll to show most recent messages (scroll to bottom) on first render
    if (!this.scrollInitialized && totalLines > availableLines) {
      this.scrollOffset = maxScroll;
      this.scrollInitialized = true;
    }
    
    // Clamp scroll offset
    this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, maxScroll));

    // Select visible lines
    let startLine = this.scrollOffset;
    let endLine = Math.min(startLine + availableLines, totalLines);

    // Get visible subset
    const visibleLines = allLines.slice(startLine, endLine);
    lines.push(...visibleLines);

    // Add scroll indicators if needed
    if (totalLines > availableLines) {
      const scrollInfo = this.renderScrollInfo(startLine, endLine, totalLines);
      if (scrollInfo) {
        // Replace last line with scroll info
        if (lines.length > 0) {
          lines[lines.length - 1] = scrollInfo;
        } else {
          lines.push(scrollInfo);
        }
      }
    }

    return lines;
  }

  /**
   * Render a single message entry
   */
  private renderMessage(entry: ConversationEntry): string[] {
    const lines: string[] = [];

    // Get role label and color
    const { label, color } = this.getRoleFormatting(entry.role);

    // Format timestamp if width permits (needs at least 40 chars)
    const showTimestamp = this.width >= 40;
    const timestampStr = showTimestamp ? this.formatTimestamp(entry.timestamp) : '';

    // Build role line with timestamp
    let roleLine: string;
    if (timestampStr) {
      const spacing = ' '.repeat(Math.max(1, this.width - this.stripAnsi(label).length - timestampStr.length - 2));
      roleLine = `${color}${label}\x1b[0m${spacing}\x1b[2m${timestampStr}\x1b[0m`;
    } else {
      roleLine = `${color}${label}\x1b[0m`;
    }

    lines.push(this.fitToWidth(roleLine));

    // Format content (truncate or show full based on expand mode)
    const content = this.formatContent(entry.preview);
    
    // Add content lines with indentation
    const contentLines = content.split('\n');
    for (const line of contentLines) {
      const indented = `  ${line}`;
      lines.push(this.fitToWidth(indented));
    }

    // Add spacing between messages
    lines.push('');

    return lines;
  }

  /**
   * Get role label and color for formatting
   */
  private getRoleFormatting(role: MessageRole): { label: string; color: string } {
    switch (role) {
      case 'user':
        return { label: 'User:', color: '\x1b[32m' }; // Green
      case 'assistant':
        return { label: 'Assistant:', color: '\x1b[34m' }; // Blue
      case 'toolResult':
        return { label: 'Tool:', color: '\x1b[33m' }; // Yellow
      default:
        return { label: 'Unknown:', color: '\x1b[37m' }; // White
    }
  }

  /**
   * Format timestamp as relative time
   */
  private formatTimestamp(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;

    // Convert to seconds
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) {
      return `${seconds}s ago`;
    }

    // Convert to minutes
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    // Convert to hours
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }

    // Convert to days
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  /**
   * Format message content based on expand mode
   */
  private formatContent(preview: string): string {
    // Handle empty or null preview
    if (!preview || preview.length === 0) {
      return '\x1b[2m(empty message)\x1b[0m';
    }

    // Replace newlines with spaces for preview mode
    let content = preview.replace(/\n/g, ' ').replace(/\r/g, '');

    // Truncate in collapsed mode
    if (!this.isExpanded) {
      // Truncate to ~100 chars as specified, but ensure ellipsis is visible
      // by considering the display width (minus indentation)
      const availableWidth = this.width - 2; // Account for "  " indentation
      
      if (content.length > 100) {
        // If content is longer than 100 chars, truncate it
        content = truncateText(content, 100);
      }
      
      // If truncated content still exceeds available width, truncate again to fit
      if (content.length > availableWidth && availableWidth > 3) {
        content = truncateText(content, availableWidth);
      }
    } else {
      // In expanded mode, show full content but wrap to width
      content = this.wrapText(content, this.width - 2); // Account for indentation
    }

    return content;
  }

  /**
   * Wrap text to specified width
   */
  private wrapText(text: string, width: number): string {
    if (width <= 0) {
      return text;
    }

    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length === 0) {
        currentLine = word;
      } else if (currentLine.length + 1 + word.length <= width) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines.join('\n');
  }

  /**
   * Render scroll information
   */
  private renderScrollInfo(startLine: number, endLine: number, totalLines: number): string {
    const percent = Math.round((endLine / totalLines) * 100);
    const info = `\x1b[2m[${percent}% ▼ More messages ▲]\x1b[0m`;
    return this.fitToWidth(info);
  }

  /**
   * Limit lines to available height
   */
  private limitToHeight(lines: string[]): string[] {
    if (this.height <= 0) {
      return [];
    }

    return lines.slice(0, this.height);
  }

  /**
   * Fit text to width by truncating
   */
  private fitToWidth(text: string): string {
    const stripped = this.stripAnsi(text);
    
    if (stripped.length <= this.width) {
      return text;
    }

    // For very narrow widths, try to preserve meaningful content
    if (this.width < 10) {
      return text.substring(0, Math.max(1, this.width));
    }

    // Extract ANSI codes and text segments
    const segments: { type: 'ansi' | 'text'; value: string }[] = [];
    const ansiRegex = /\x1B\[[0-9;]*m/g;
    let lastIndex = 0;
    let match;

    while ((match = ansiRegex.exec(text)) !== null) {
      // Add text before this ANSI code
      if (match.index > lastIndex) {
        segments.push({ type: 'text', value: text.substring(lastIndex, match.index) });
      }
      // Add ANSI code
      segments.push({ type: 'ansi', value: match[0] });
      lastIndex = match.index + match[0].length;
    }
    // Add remaining text
    if (lastIndex < text.length) {
      segments.push({ type: 'text', value: text.substring(lastIndex) });
    }

    // Build output up to width limit
    let result = '';
    let visibleLength = 0;

    for (const segment of segments) {
      if (segment.type === 'ansi') {
        result += segment.value;
      } else {
        const availableWidth = this.width - visibleLength;
        if (availableWidth <= 0) {
          break;
        }
        
        const textToAdd = segment.value.substring(0, availableWidth);
        result += textToAdd;
        visibleLength += textToAdd.length;
        
        if (visibleLength >= this.width) {
          break;
        }
      }
    }

    return result;
  }

  /**
   * Strip ANSI escape codes from text for length calculation
   */
  private stripAnsi(text: string): string {
    return text.replace(/\x1B\[[0-9;]*m/g, '');
  }

  /**
   * Handle keyboard input
   * 
   * @param data - Input data (key press)
   */
  handleInput(data: string): void {
    // Handle null or undefined
    if (data == null) {
      return;
    }

    switch (data) {
      // Toggle expand mode
      case 'c':
      case 'C':
        this.isExpanded = !this.isExpanded;
        this.invalidate();
        break;

      // Scroll down (vim-style)
      case 'j':
        this.scrollDown();
        this.invalidate();
        break;

      // Scroll up (vim-style)
      case 'k':
        this.scrollUp();
        this.invalidate();
        break;

      // Arrow down
      case '\x1b[B':
        this.scrollDown();
        this.invalidate();
        break;

      // Arrow up
      case '\x1b[A':
        this.scrollUp();
        this.invalidate();
        break;

      // Ignore other keys
      default:
        break;
    }
  }

  /**
   * Scroll down by one line
   */
  private scrollDown(): void {
    const messageBlocks: string[][] = [];
    for (const entry of this.conversationEntries) {
      const block = this.renderMessage(entry);
      messageBlocks.push(block);
    }
    const totalLines = messageBlocks.flat().length;
    const availableLines = this.height - 2;
    const maxScroll = Math.max(0, totalLines - availableLines);

    this.scrollOffset = Math.min(this.scrollOffset + 1, maxScroll);
  }

  /**
   * Scroll up by one line
   */
  private scrollUp(): void {
    this.scrollOffset = Math.max(0, this.scrollOffset - 1);
  }

  /**
   * Invalidate render cache
   * 
   * Call this after state changes to force re-render
   */
  invalidate(): void {
    this.renderCache = null;
    // Don't reset scrollInitialized - maintain scroll position
  }
}
