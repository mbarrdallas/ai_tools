# Implementation Specification - Task T1: TypeScript Type Definitions

## Target File
`extensions/stats_dashboard/types.ts`

## Required Exports

The Coder Agent must create this file with the following exact exports:

### 1. AgentStatus Type
```typescript
export type AgentStatus = "running" | "completed" | "failed";
```

### 2. ToolCallStatus Type
```typescript
export type ToolCallStatus = "pending" | "success" | "failed";
```

### 3. MessageRole Type
```typescript
export type MessageRole = "user" | "assistant" | "toolResult";
```

### 4. NotificationType Type
```typescript
export type NotificationType = "context_high" | "tool_failed";
```

### 5. AgentMetrics Interface
```typescript
export interface AgentMetrics {
  inputTokens: number;        // >= 0
  outputTokens: number;       // >= 0
  cacheReadTokens: number;    // >= 0
  cacheWriteTokens: number;   // >= 0
  totalCost: number;          // >= 0, in USD
  contextTokens: number;      // >= 0, current usage
  contextLimit: number;       // > 0, maximum context window
  turnCount: number;          // >= 0, number of LLM turns
}
```

### 6. ToolCall Interface
```typescript
export interface ToolCall {
  id: string;                        // Tool call ID from Pi
  toolName: string;                  // e.g., "bash", "read"
  args: Record<string, unknown>;     // Tool arguments
  argsSummary: string;               // Formatted summary
  status: ToolCallStatus;            // Current status
  startTime: number;                 // Unix timestamp
  endTime: number | null;            // Unix timestamp or null if pending
  duration: number | null;           // Milliseconds or null if pending
  isError: boolean;                  // Whether execution failed
  errorMessage: string | null;       // Error details if failed
}
```

### 7. ConversationEntry Interface
```typescript
export interface ConversationEntry {
  role: MessageRole;      // Message sender
  preview: string;        // Truncated content (~100 chars)
  timestamp: number;      // Unix timestamp
}
```

### 8. Notification Interface
```typescript
export interface Notification {
  id: string;                  // Unique notification ID
  type: NotificationType;      // Category of notification
  agentId: string;             // Associated agent
  message: string;             // Notification text
  timestamp: number;           // When shown
  dismissed: boolean;          // User dismissed? (default false)
}
```

### 9. Agent Interface
```typescript
export interface Agent {
  id: string;                  // UUID v4
  name: string;                // Display name
  status: AgentStatus;         // Lifecycle status
  parentId: string | null;     // Parent agent ID (null for root)
  startTime: number;           // Unix timestamp when started
  endTime: number | null;      // Unix timestamp when completed (null if running)
  metrics: AgentMetrics;       // Aggregated metrics
  toolCalls: ToolCall[];       // Ordered tool call history
  messageCount: number;        // Count of messages (default 0)
  subagentIds: string[];       // Child agent IDs (default [])
}
```

### 10. DashboardState Interface
```typescript
export interface DashboardState {
  isVisible: boolean;               // Dashboard shown? (default false)
  selectedAgentId: string | null;   // Currently selected tab
  expandedSections: Set<string>;    // Expanded UI sections
}
```

### 11. DataStore Interface
```typescript
export interface DataStore {
  agents: Map<string, Agent>;       // All tracked agents
  rootAgentId: string | null;       // Root agent ID
  notifications: Notification[];    // Notification history
  dashboard: DashboardState;        // Dashboard UI state
}
```

## Validation Rules

### Constraints to Enforce
1. **Agent name**: Must be non-empty string
2. **Metrics values**: All must be >= 0
3. **Context limit**: Must be > 0
4. **Tool call args**: Must be serializable object
5. **Parent agent**: Must exist if parentId is specified
6. **Status transitions**: running → completed | failed (no reverse)

### Relationships
- Agent.subagentIds contains IDs of child agents
- Child agent's parentId references parent agent's id
- ToolCall belongs to one Agent
- ConversationEntry belongs to one Agent
- Notification references one Agent

## Test Verification

Once implemented, verify with:
```bash
npm test tests/types.test.ts
```

All 101 tests should pass.

## Common Pitfalls to Avoid

1. ❌ Don't use enums - use union types (e.g., `type AgentStatus = "running" | ...`)
2. ❌ Don't add extra fields not in the spec
3. ❌ Don't use `any` type - be explicit with `unknown` or specific types
4. ❌ Don't forget to export all types
5. ❌ Don't change field names from the spec

## Success Criteria

✅ All 11 types exported  
✅ Exact field names match tests  
✅ Field types match tests  
✅ No TypeScript compilation errors  
✅ All 101 tests pass  
✅ No linter warnings  

## References

- Data Model: `~/WORKSPACE/active_workflows/stats_dashboard/design/DATA_MODEL.md`
- Task Plan: `~/WORKSPACE/active_workflows/stats_dashboard/planning/TASK_PLAN.md` (T1)
- Test File: `./types.test.ts`
