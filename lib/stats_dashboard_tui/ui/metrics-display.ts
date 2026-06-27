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
 * MetricsDisplay component for rendering agent metrics
 */
export class MetricsDisplay {
  private metrics: AgentMetrics;
  private theme: Theme | null;
  private renderCache: { width: number; output: string } | null = null;

  /**
   * Create a new MetricsDisplay instance
   * 
   * @param metrics - Agent metrics to display
   * @param theme - Optional theme for styling
   */
  constructor(metrics: AgentMetrics, theme: Theme | null = null) {
    if (!metrics) {
      throw new Error('Metrics object is required');
    }

    this.metrics = metrics;
    this.theme = theme;
  }

  /**
   * Update metrics and invalidate cache
   * 
   * @param metrics - Updated metrics
   */
  public updateMetrics(metrics: AgentMetrics): void {
    this.metrics = metrics;
    this.invalidate();
  }

  /**
   * Clear render cache to force re-render
   */
  public invalidate(): void {
    this.renderCache = null;
  }

  /**
   * Render metrics display with given width
   * 
   * @param width - Available width for rendering
   * @returns Rendered metrics as string
   */
  public render(width: number): string {
    // Check cache
    if (this.renderCache && this.renderCache.width === width) {
      return this.renderCache.output;
    }

    // Ensure minimum width
    const effectiveWidth = Math.max(20, width);

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
    this.renderCache = { width, output };

    return output;
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
    const inputTokens = this.sanitizeNumber(this.metrics.inputTokens);
    const outputTokens = this.sanitizeNumber(this.metrics.outputTokens);
    const cacheReadTokens = this.sanitizeNumber(this.metrics.cacheReadTokens);
    const cacheWriteTokens = this.sanitizeNumber(this.metrics.cacheWriteTokens);

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
    const cost = this.sanitizeCost(this.metrics.totalCost);
    const labelWidth = this.getLabelWidth();
    return this.renderMetricRow('Cost', formatCost(cost), labelWidth, width);
  }

  /**
   * Render context window progress bar
   */
  private renderContextWindow(width: number): string {
    const contextTokens = this.sanitizeNumber(this.metrics.contextTokens);
    const contextLimit = this.sanitizeNumber(this.metrics.contextLimit);

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
    const inputTokens = this.sanitizeNumber(this.metrics.inputTokens);
    const cacheReadTokens = this.sanitizeNumber(this.metrics.cacheReadTokens);

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
    const turnCount = this.sanitizeNumber(this.metrics.turnCount);
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
