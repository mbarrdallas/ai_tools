/**
 * Tab Bar Component
 * 
 * Provides horizontal tab navigation for switching between agents.
 * Displays agent names with status indicators and hierarchy for subagents.
 * Supports keyboard navigation (Tab/Shift+Tab, Arrow keys) with wrapping.
 */

import type { Agent, AgentStatus } from '../types';

/**
 * Props for TabBar constructor
 */
interface TabBarProps {
  /** Array of agents to display as tabs */
  agents: Agent[];
  /** Currently selected agent ID (null if none) */
  selectedId: string | null;
  /** Callback fired when tab selection changes */
  onTabSelect?: (agentId: string) => void;
  /** Callback fired when tab dismiss is requested (wired in T15) */
  onTabDismiss?: (agentId: string) => void;
  /** Optional theme for styling (defaults to basic ANSI) */
  theme?: Theme;
}

/**
 * Theme interface for styling
 */
interface Theme {
  fg(style: string, text: string): string;
  bg(style: string, text: string): string;
}

/**
 * Default theme using ANSI escape codes
 */
const DEFAULT_THEME: Theme = {
  fg: (style: string, text: string) => {
    const codes: Record<string, string> = {
      dim: '\x1b[2m',
      error: '\x1b[31m',
      success: '\x1b[32m',
      accent: '\x1b[36m',
    };
    const code = codes[style] || '';
    return `${code}${text}\x1b[0m`;
  },
  bg: (style: string, text: string) => {
    const codes: Record<string, string> = {
      accent: '\x1b[46m\x1b[30m', // Cyan background with black text
    };
    const code = codes[style] || '';
    return `${code}${text}\x1b[0m`;
  },
};

/**
 * TabBar class for agent selection UI
 */
export class TabBar {
  private agents: Agent[];
  private selectedId: string | null;
  private onTabSelect?: (agentId: string) => void;
  private onTabDismiss?: (agentId: string) => void;
  private theme: Theme;
  private cachedRender: { width: number; agentsHash: string; output: string[] } | null = null;

  /**
   * Create a new TabBar
   * 
   * @param props - TabBar properties
   */
  constructor(props: TabBarProps) {
    this.agents = props.agents || [];
    this.selectedId = props.selectedId;
    this.onTabSelect = props.onTabSelect;
    this.onTabDismiss = props.onTabDismiss;
    this.theme = props.theme || DEFAULT_THEME;

    // Validate selectedId - if invalid, use first agent or null
    if (this.selectedId && !this.agents.find(a => a.id === this.selectedId)) {
      this.selectedId = this.agents.length > 0 ? this.agents[0].id : null;
    }
  }

  /**
   * Render the tab bar
   * 
   * @param width - Available width for rendering
   * @returns Array of strings representing the tab bar
   */
  render(width: number): string[] {
    // Check cache
    const agentsHash = this.getAgentsHash();
    if (this.cachedRender && 
        this.cachedRender.width === width && 
        this.cachedRender.agentsHash === agentsHash) {
      return this.cachedRender.output;
    }

    const output: string[] = [];

    // Handle empty state
    if (this.agents.length === 0) {
      output.push(this.theme.fg('dim', 'No agents'));
      this.cachedRender = { width, agentsHash, output };
      return output;
    }

    // Build hierarchy map for indentation
    const hierarchyDepth = new Map<string, number>();
    this.calculateHierarchyDepth(hierarchyDepth);

    // Build tabs with overflow handling
    const tabs = this.buildTabs(hierarchyDepth, width);
    output.push(tabs);

    // Cache result
    this.cachedRender = { width, agentsHash, output };
    return output;
  }

  /**
   * Handle keyboard input for navigation
   * 
   * @param data - Input data from keyboard
   */
  handleInput(data: string): void {
    if (!data || this.agents.length === 0) {
      return;
    }

    // Single agent - no navigation needed
    if (this.agents.length === 1) {
      return;
    }

    const currentIndex = this.getCurrentIndex();
    let newIndex: number | null = null;

    // Handle Tab key (forward)
    if (data === '\t') {
      newIndex = this.getNextIndex(currentIndex);
    }
    // Handle Shift+Tab (backward) - usually comes as '\x1b[Z'
    else if (data === '\x1b[Z') {
      newIndex = this.getPreviousIndex(currentIndex);
    }
    // Handle right arrow
    else if (data === '\x1b[C') {
      newIndex = this.getNextIndex(currentIndex);
    }
    // Handle left arrow
    else if (data === '\x1b[D') {
      newIndex = this.getPreviousIndex(currentIndex);
    }
    // Ignore other keys (including Ctrl/Alt combinations)
    else {
      return;
    }

    // Update selection if we have a new index
    if (newIndex !== null && newIndex !== currentIndex) {
      const newAgentId = this.agents[newIndex].id;
      this.selectedId = newAgentId;
      if (this.onTabSelect) {
        this.onTabSelect(newAgentId);
      }
      this.invalidate();
    }
  }

  /**
   * Update the agents list
   * 
   * @param agents - New agents array
   */
  updateAgents(agents: Agent[]): void {
    this.agents = agents;
    
    // Check if selected agent still exists
    if (this.selectedId && !this.agents.find(a => a.id === this.selectedId)) {
      // Select first agent or null
      this.selectedId = this.agents.length > 0 ? this.agents[0].id : null;
    }
    
    this.invalidate();
  }

  /**
   * Set the selected agent ID
   * 
   * @param agentId - Agent ID to select
   */
  setSelectedId(agentId: string | null): void {
    this.selectedId = agentId;
    this.invalidate();
  }

  /**
   * Get the currently selected agent ID
   * 
   * @returns Selected agent ID or null
   */
  getSelectedId(): string | null {
    return this.selectedId;
  }

  /**
   * Clear the render cache
   */
  invalidate(): void {
    this.cachedRender = null;
  }

  /**
   * Calculate hierarchy depth for each agent
   * 
   * @param depthMap - Map to populate with agent ID -> depth
   */
  private calculateHierarchyDepth(depthMap: Map<string, number>): void {
    const agentMap = new Map(this.agents.map(a => [a.id, a]));

    const calculateDepth = (agentId: string): number => {
      if (depthMap.has(agentId)) {
        return depthMap.get(agentId)!;
      }

      const agent = agentMap.get(agentId);
      if (!agent || agent.parentId === null) {
        depthMap.set(agentId, 0);
        return 0;
      }

      const depth = 1 + calculateDepth(agent.parentId);
      depthMap.set(agentId, depth);
      return depth;
    };

    for (const agent of this.agents) {
      calculateDepth(agent.id);
    }
  }

  /**
   * Build tabs string with overflow handling
   * 
   * @param hierarchyDepth - Map of agent ID to hierarchy depth
   * @param width - Available width
   * @returns Formatted tabs string
   */
  private buildTabs(hierarchyDepth: Map<string, number>, width: number): string {
    const parts: string[] = [];
    let totalWidth = 0;

    for (let i = 0; i < this.agents.length; i++) {
      const agent = this.agents[i];
      const depth = hierarchyDepth.get(agent.id) || 0;
      const isSelected = agent.id === this.selectedId;
      
      // Build tab content
      const tabContent = this.buildTabContent(agent, depth, isSelected);
      const tabWidth = this.stripAnsi(tabContent).length;

      // Check if we have space (leave room for overflow indicator)
      const remainingWidth = width - totalWidth;
      const needsOverflow = i < this.agents.length - 1;
      const requiredSpace = tabWidth + (needsOverflow ? 5 : 0); // 5 chars for " ... "

      if (remainingWidth < requiredSpace && parts.length > 0) {
        // Add overflow indicator
        const remaining = this.agents.length - i;
        parts.push(this.theme.fg('dim', ` ... +${remaining}`));
        break;
      }

      // Add spacing between tabs
      if (parts.length > 0) {
        parts.push('  ');
        totalWidth += 2;
      }

      parts.push(tabContent);
      totalWidth += tabWidth;
    }

    return parts.join('');
  }

  /**
   * Build content for a single tab
   * 
   * @param agent - Agent to display
   * @param depth - Hierarchy depth
   * @param isSelected - Whether this tab is selected
   * @returns Formatted tab string
   */
  private buildTabContent(agent: Agent, depth: number, isSelected: boolean): string {
    const parts: string[] = [];

    // Add hierarchy indicator for subagents
    if (depth > 0) {
      parts.push('↳ ');
    }

    // Add status indicator
    const statusIcon = this.getStatusIcon(agent.status);
    parts.push(statusIcon);
    parts.push(' ');

    // Add agent name
    const maxNameLength = 20;
    const truncatedName = this.truncateText(agent.name, maxNameLength);
    parts.push(truncatedName);

    // Combine parts
    const content = parts.join('');

    // Apply styling
    if (isSelected) {
      return this.theme.bg('accent', ` ${content} `);
    } else {
      return content;
    }
  }

  /**
   * Get status icon for agent
   * 
   * @param status - Agent status
   * @returns Status icon character
   */
  private getStatusIcon(status: AgentStatus): string {
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
   * Get current agent index
   * 
   * @returns Current index or -1 if none selected
   */
  private getCurrentIndex(): number {
    if (!this.selectedId) {
      return -1;
    }
    return this.agents.findIndex(a => a.id === this.selectedId);
  }

  /**
   * Get next agent index with wrapping
   * 
   * @param currentIndex - Current index
   * @returns Next index
   */
  private getNextIndex(currentIndex: number): number {
    if (currentIndex === -1) {
      return 0; // No selection, select first
    }
    return (currentIndex + 1) % this.agents.length;
  }

  /**
   * Get previous agent index with wrapping
   * 
   * @param currentIndex - Current index
   * @returns Previous index
   */
  private getPreviousIndex(currentIndex: number): number {
    if (currentIndex === -1) {
      return this.agents.length - 1; // No selection, select last
    }
    return (currentIndex - 1 + this.agents.length) % this.agents.length;
  }

  /**
   * Truncate text to maximum length with ellipsis
   * 
   * @param text - Text to truncate
   * @param maxLength - Maximum length
   * @returns Truncated text
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    if (maxLength <= 3) {
      return text.slice(0, maxLength);
    }
    return text.slice(0, maxLength - 3) + '...';
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

  /**
   * Generate hash for agents state (for cache invalidation)
   * 
   * @returns Hash string
   */
  private getAgentsHash(): string {
    return JSON.stringify({
      ids: this.agents.map(a => a.id),
      statuses: this.agents.map(a => a.status),
      names: this.agents.map(a => a.name),
      selected: this.selectedId,
    });
  }
}
