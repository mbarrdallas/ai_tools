# Stats Dashboard Extension - Test Suite

## Test Files

### `types.test.ts` - TypeScript Type Definitions (Task T1)
**Status:** ✅ Complete - Ready for implementation  
**Test Count:** 101 tests across 13 test suites  
**Coverage:** All type exports, interfaces, and relationships

#### What's Tested:
1. **Type Exports** - All 11 types can be imported
2. **AgentStatus** - Union type with 3 valid values
3. **Agent Interface** - 11 required fields, relationships
4. **AgentMetrics Interface** - 8 required fields, constraints
5. **ToolCall Interface** - 10 required fields, lifecycle
6. **ToolCallStatus** - Union type with 3 valid values
7. **ConversationEntry Interface** - 3 required fields
8. **MessageRole** - Union type with 3 valid values
9. **Notification Interface** - 6 required fields
10. **NotificationType** - Union type with 2 valid values
11. **DashboardState Interface** - 3 required fields
12. **DataStore Interface** - 4 required fields
13. **Type Relationships** - Cross-entity consistency

#### Implementation Contract:
The Coder Agent must create `../types.ts` that exports:

```typescript
// Union Types
export type AgentStatus = "running" | "completed" | "failed";
export type ToolCallStatus = "pending" | "success" | "failed";
export type MessageRole = "user" | "assistant" | "toolResult";
export type NotificationType = "context_high" | "tool_failed";

// Interfaces
export interface AgentMetrics { /* 8 fields */ }
export interface ToolCall { /* 10 fields */ }
export interface ConversationEntry { /* 3 fields */ }
export interface Notification { /* 6 fields */ }
export interface Agent { /* 10 fields */ }
export interface DashboardState { /* 3 fields */ }
export interface DataStore { /* 4 fields */ }
```

See `DATA_MODEL.md` for complete field specifications.

## Running Tests

### Prerequisites
```bash
npm install --save-dev jest @jest/globals @types/jest ts-jest typescript
```

### Jest Configuration
Create `jest.config.js` in project root:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/extensions/stats_dashboard'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'extensions/stats_dashboard/**/*.ts',
    '!extensions/stats_dashboard/**/*.test.ts',
  ],
};
```

### Run Tests
```bash
# All tests
npm test

# Specific test file
npm test types.test.ts

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### Expected Behavior

**Before Implementation:**
- All 101 tests in `types.test.ts` should **FAIL**
- Error: Cannot find module '../types'

**After Implementation:**
- All 101 tests should **PASS**
- Types match data model specification
- All exports are available

## Test-Driven Development Flow

1. **Test Agent** writes comprehensive tests (DONE ✅)
2. **Coder Agent** implements to make tests pass
3. **Reviewer Agent** verifies implementation matches tests
4. Repeat for next task

## Test Conventions

### Naming
- Test files: `*.test.ts`
- Test suites: `describe('[Component/Type Name]', ...)`
- Test cases: `it('should [expected behavior] when [condition]', ...)`

### Structure
```typescript
describe('Component/Type', () => {
  // Setup
  beforeEach(() => {
    // Arrange
  });

  // Tests
  it('should do something', () => {
    // Arrange (if not in beforeEach)
    // Act
    // Assert
  });
});
```

### Assertions
- Use specific matchers: `toBe`, `toEqual`, `toHaveProperty`, etc.
- Test both positive and negative cases
- Cover edge cases and boundaries
- Verify type constraints

## Coverage Goals

- **Unit Tests:** 100% of functions and methods
- **Integration Tests:** All component interactions
- **Type Tests:** All exports and interfaces
- **Edge Cases:** Nulls, zeros, boundaries, errors

## Next Tests

- `store.test.ts` - Data store operations (Task T2)
- `state-manager.test.ts` - State management API (Task T3)
- `format.test.ts` - Formatting utilities (Task T4)
- And so on...

Each test file will be created before implementation begins.
