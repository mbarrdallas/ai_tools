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
  /** Optional callback for showing notifications/warnings */
  notifyCallback?: (notification: { type: string; message: string }) => void;
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
  private notifyCallback?: (notification: { type: string; message: string }) => void;
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
    this.notifyCallback = props.notifyCallback;

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

    // Handle dismiss key ('d' or 'D')
    if (data === 'd' || data === 'D') {
      this.handleDismissRequest();
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
   * Handles selection management when agents are removed (e.g., after dismissal)
   * 
   * @param agents - New agents array
   */
  updateAgents(agents: Agent[]): void {
    const oldSelectedId = this.selectedId;
    const oldAgents = this.agents;
    this.agents = agents;
    
    // Check if selected agent still exists
    if (this.selectedId && !this.agents.find(a => a.id === this.selectedId)) {
      // Find the index where the dismissed agent was
      const oldIndex = oldAgents.findIndex(a => a.id === oldSelectedId);
      
      if (this.agents.length === 0) {
        // No agents left
        this.selectedId = null;
      } else if (oldIndex >= 0) {
        // Try to select the next agent (at same index, or previous if at end)
        let newIndex: number;
        if (oldIndex < this.agents.length) {
          // Select agent at same index (which is now the "next" agent)
          newIndex = oldIndex;
        } else {
          // We were at the end, select the new last agent
          newIndex = this.agents.length - 1;
        }
        this.selectedId = this.agents[newIndex].id;
      } else {
        // Fallback to first agent
        this.selectedId = this.agents.length > 0 ? this.agents[0].id : null;
      }
      
      // Notify selection change
      if (this.selectedId && this.onTabSelect) {
        this.onTabSelect(this.selectedId);
      }
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
   * Handle dismiss request for selected tab
   * Validates that agent can be dismissed and calls onTabDismiss callback
   */
  private handleDismissRequest(): void {
    // Must have a selected agent
    if (!this.selectedId) {
      return;
    }

    // Find the selected agent
    const agent = this.agents.find(a => a.id === this.selectedId);
    if (!agent) {
      return;
    }

    // Check if agent is running
    if (agent.status === 'running') {
      this.showWarning('Cannot dismiss a running agent. Wait for it to complete or fail.');
      return;
    }

    // Check if agent has running subagents
    if (this.hasRunningSubagents(agent)) {
      this.showWarning('Cannot dismiss agent with running subagents. Wait for them to complete.');
      return;
    }

    // Agent can be dismissed - call callback
    if (this.onTabDismiss) {
      this.onTabDismiss(agent.id);
    }
  }

  /**
   * Check if an agent has any running subagents
   * 
   * @param agent - Agent to check
   * @returns true if agent has running subagents
   */
  private hasRunningSubagents(agent: Agent): boolean {
    for (const subagentId of agent.subagentIds) {
      const subagent = this.agents.find(a => a.id === subagentId);
      if (subagent && subagent.status === 'running') {
        return true;
      }
    }
    return false;
  }

  /**
   * Show a warning notification
   * 
   * @param message - Warning message to display
   */
  private showWarning(message: string): void {
    if (this.notifyCallback) {
      this.notifyCallback({ type: 'warning', message });
    }
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
