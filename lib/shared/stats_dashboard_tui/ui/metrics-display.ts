/**
 * Metrics Display Component
 * 
 * Renders agent metrics including:
 * - Token counts (input, output, cache read/write)
 * - Total cost in USD
 * - Context window progress bar with percentage
 * - Turn count
 * - Cache efficiency percentage
 * 
 * Implements render caching for performance optimization.
 */

import type { AgentMetrics } from '../types';
import { formatTokens, formatCost } from '../utils/format';

/**
 * Theme interface for styling
 */
interface Theme {
  fg(style: string, text: string): string;
  bg(style: string, text: string): string;
}

/**
 * Props for MetricsDisplay component
 */
export interface MetricsDisplayProps {
  /** Agent to display metrics for */
  agent: import('../types').Agent;
  /** Optional theme for styling */
  theme?: Theme | null;
  /** Display width in characters */
  width: number;
}

/**
 * MetricsDisplay component for rendering agent metrics
 */
export class MetricsDisplay {
  private agent: import('../types').Agent;
  private theme: Theme | null;
  private width: number;
  private renderCache: string | null = null;
  private lastRenderState: string | null = null;

  /**
   * Create a new MetricsDisplay instance
   * 
   * @param props - Component props
   */
  constructor(props: MetricsDisplayProps) {
    if (!props.agent) {
      throw new Error('Agent is required');
    }

    this.agent = props.agent;
    this.theme = props.theme ?? null;
    this.width = Math.max(20, props.width);
  }

  /**
   * Clear render cache to force re-render
   */
  public invalidate(): void {
    this.renderCache = null;
    this.lastRenderState = null;
  }

  /**
   * Render metrics display
   * 
   * @returns Rendered metrics as string
   */
  public render(): string {
    // Generate state hash for cache invalidation
    const stateHash = this.generateStateHash();
    
    // Check cache
    if (this.renderCache !== null && this.lastRenderState === stateHash) {
      return this.renderCache;
    }

    // Ensure minimum width
    const effectiveWidth = Math.max(20, this.width);

    const lines: string[] = [];

    // Header
    lines.push(this.renderSectionHeader('Metrics', effectiveWidth));
    lines.push('');

    // Token metrics
    lines.push(this.renderTokenMetrics(effectiveWidth));
    lines.push('');

    // Cost
    lines.push(this.renderCost(effectiveWidth));
    lines.push('');

    // Context window
    lines.push(this.renderContextWindow(effectiveWidth));
    lines.push('');

    // Cache efficiency (if applicable)
    const cacheEfficiency = this.calculateCacheEfficiency();
    if (cacheEfficiency !== null) {
      lines.push(this.renderCacheEfficiency(cacheEfficiency, effectiveWidth));
      lines.push('');
    }

    // Turn count
    lines.push(this.renderTurnCount(effectiveWidth));

    const output = lines.join('\n');

    // Cache the result
    this.renderCache = output;
    this.lastRenderState = stateHash;

    return output;
  }

  /**
   * Generate state hash for cache invalidation
   */
  private generateStateHash(): string {
    return JSON.stringify({
      metrics: this.agent.metrics,
      width: this.width,
    });
  }

  /**
   * Render section header with border
   */
  private renderSectionHeader(title: string, width: number): string {
    const border = '─'.repeat(Math.max(1, width - 2));
    const header = `┌${border}┐\n│ ${title}${' '.repeat(Math.max(0, width - title.length - 4))}│\n└${border}┘`;
    return this.applyTheme('accent', header);
  }

  /**
   * Render token metrics section
   */
  private renderTokenMetrics(width: number): string {
    const lines: string[] = [];

    // Ensure metrics have valid values
    const inputTokens = this.sanitizeNumber(this.agent.metrics.inputTokens);
    const outputTokens = this.sanitizeNumber(this.agent.metrics.outputTokens);
    const cacheReadTokens = this.sanitizeNumber(this.agent.metrics.cacheReadTokens);
    const cacheWriteTokens = this.sanitizeNumber(this.agent.metrics.cacheWriteTokens);

    // Use consistent label width across all metrics
    const labelWidth = this.getLabelWidth();

    lines.push(this.renderMetricRow('Input', formatTokens(inputTokens), labelWidth, width));
    lines.push(this.renderMetricRow('Output', formatTokens(outputTokens), labelWidth, width));
    
    if (cacheReadTokens > 0 || cacheWriteTokens > 0) {
      lines.push(this.renderMetricRow('Cache Read', formatTokens(cacheReadTokens), labelWidth, width));
      lines.push(this.renderMetricRow('Cache Write', formatTokens(cacheWriteTokens), labelWidth, width));
    }

    return lines.join('\n');
  }

  /**
   * Render cost section
   */
  private renderCost(width: number): string {
    const cost = this.sanitizeCost(this.agent.metrics.totalCost);
    const labelWidth = this.getLabelWidth();
    return this.renderMetricRow('Cost', formatCost(cost), labelWidth, width);
  }

  /**
   * Render context window progress bar
   */
  private renderContextWindow(width: number): string {
    const contextTokens = this.sanitizeNumber(this.agent.metrics.contextTokens);
    const contextLimit = this.sanitizeNumber(this.agent.metrics.contextLimit);

    // Handle zero or invalid limit
    if (contextLimit <= 0) {
      return this.renderMetricRow('Context', 'N/A', this.getLabelWidth(), width);
    }

    // Calculate percentage
    const percentage = Math.min(100, Math.round((contextTokens / contextLimit) * 100));
    const isHighContext = percentage >= 80;

    // Format token counts
    const contextStr = `${formatTokens(contextTokens)} / ${formatTokens(contextLimit)}`;

    // Calculate progress bar width (leave room for label, counts, and percentage)
    const labelWidth = this.getLabelWidth();
    const remainingWidth = Math.max(10, width - labelWidth - contextStr.length - 8);
    const barWidth = Math.max(5, Math.min(20, remainingWidth));

    // Calculate filled portion
    const filled = Math.round((percentage / 100) * barWidth);
    const empty = barWidth - filled;

    // Create progress bar
    const bar = '█'.repeat(filled) + '░'.repeat(empty);

    // Format percentage string
    const percentStr = `${percentage}%`;

    // Apply warning color if high context
    const displayPercentStr = isHighContext 
      ? this.applyTheme('warning', percentStr)
      : percentStr;

    // Build the line with consistent label width
    const padding = ' '.repeat(Math.max(0, labelWidth - 'Context'.length));
    const line = `Context${padding}: ${contextStr} [${bar}] ${displayPercentStr}`;

    return line;
  }

  /**
   * Calculate cache efficiency percentage
   * Returns null if not applicable (no cache reads)
   */
  private calculateCacheEfficiency(): number | null {
    const inputTokens = this.sanitizeNumber(this.agent.metrics.inputTokens);
    const cacheReadTokens = this.sanitizeNumber(this.agent.metrics.cacheReadTokens);

    const totalInputTokens = inputTokens + cacheReadTokens;

    if (totalInputTokens === 0) {
      return null;
    }

    if (cacheReadTokens === 0) {
      return 0;
    }

    return Math.round((cacheReadTokens / totalInputTokens) * 100);
  }

  /**
   * Render cache efficiency
   */
  private renderCacheEfficiency(efficiency: number, width: number): string {
    const labelWidth = this.getLabelWidth();
    return this.renderMetricRow('Cache Efficiency', `${efficiency}%`, labelWidth, width);
  }

  /**
   * Render turn count
   */
  private renderTurnCount(width: number): string {
    const turnCount = this.sanitizeNumber(this.agent.metrics.turnCount);
    const labelWidth = this.getLabelWidth();
    return this.renderMetricRow('Turn', turnCount.toString(), labelWidth, width);
  }

  /**
   * Get consistent label width for alignment
   * Uses the longest label name: "Cache Efficiency"
   */
  private getLabelWidth(): number {
    return 'Cache Efficiency'.length + 1; // 17 characters
  }

  /**
   * Render a metric row with aligned label and value
   * Colons are positioned consistently for alignment
   */
  private renderMetricRow(label: string, value: string, labelWidth: number, width: number): string {
    const padding = ' '.repeat(Math.max(0, labelWidth - label.length));
    // Put padding BEFORE colon to align all colons at the same position
    return `${label}${padding}: ${value}`;
  }

  /**
   * Apply theme styling if theme is available
   */
  private applyTheme(style: string, text: string): string {
    if (!this.theme) {
      return text;
    }

    return this.theme.fg(style, text);
  }

  /**
   * Sanitize numeric values to ensure they're valid
   */
  private sanitizeNumber(value: number): number {
    if (value == null || isNaN(value) || value < 0) {
      return 0;
    }

    return Math.max(0, Math.round(value));
  }

  /**
   * Sanitize cost values (don't round, preserve decimals)
   */
  private sanitizeCost(value: number): number {
    if (value == null || isNaN(value) || value < 0) {
      return 0;
    }

    return Math.max(0, value);
  }
}
