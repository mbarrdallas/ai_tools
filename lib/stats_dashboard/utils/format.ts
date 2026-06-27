/**
 * Formatting Utilities for Stats Dashboard
 * 
 * This module provides utility functions for formatting various data types
 * for display in the stats dashboard UI, including:
 * - Token counts (with K/M suffixes)
 * - Time durations (ms/s/m/h)
 * - Costs in USD
 * - Tool arguments (by tool type)
 * - Text truncation
 * - Error message extraction
 */

/**
 * Format token counts with K/M suffixes for readability
 * 
 * @param count - Number of tokens (>= 0)
 * @returns Formatted string (e.g., "1.2k", "500", "1.5M")
 * 
 * @example
 * formatTokens(500) // "500"
 * formatTokens(1200) // "1.2k"
 * formatTokens(1500000) // "1.5M"
 */
export function formatTokens(count: number): string {
  // Handle invalid inputs
  if (count == null || isNaN(count) || count < 0) {
    return '0';
  }

  // Round floats to integers
  count = Math.round(count);

  // Less than 1000: show as-is
  if (count < 1000) {
    return count.toString();
  }

  // 1000 to 999,999: show with K suffix
  if (count < 1000000) {
    const thousands = count / 1000;
    return `${thousands.toFixed(1)}k`;
  }

  // 1,000,000+: show with M suffix
  const millions = count / 1000000;
  return `${millions.toFixed(1)}M`;
}

/**
 * Format duration in milliseconds to human-readable string
 * 
 * @param ms - Duration in milliseconds (>= 0)
 * @returns Formatted string (e.g., "250ms", "1.5s", "2m 30s", "1h 30m")
 * 
 * @example
 * formatDuration(250) // "250ms"
 * formatDuration(1500) // "1.5s"
 * formatDuration(90000) // "1m 30s"
 * formatDuration(3660000) // "1h 1m"
 */
export function formatDuration(ms: number): string {
  // Handle invalid inputs
  if (ms == null || isNaN(ms) || ms < 0) {
    return '0ms';
  }

  // Round to integer
  ms = Math.round(ms);

  // Less than 1 second: show milliseconds
  if (ms < 1000) {
    return `${ms}ms`;
  }

  // 1 second to 59 seconds: show seconds with decimal
  if (ms < 60000) {
    const seconds = ms / 1000;
    return `${seconds.toFixed(1)}s`;
  }

  // 1 minute to 59 minutes: show minutes and seconds
  if (ms < 3600000) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }

  // 1 hour or more: show hours and minutes (no seconds)
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}

/**
 * Format cost in USD with appropriate precision
 * 
 * @param usd - Cost in USD (>= 0)
 * @returns Formatted string (e.g., "$0.0012", "$1.23", "$1,234.56")
 * 
 * @example
 * formatCost(0.0012) // "$0.0012"
 * formatCost(1.23) // "$1.23"
 * formatCost(1234.56) // "$1,234.56"
 */
export function formatCost(usd: number): string {
  // Handle invalid inputs
  if (usd == null || isNaN(usd) || usd < 0) {
    return '$0.00';
  }

  // Small costs (< $0.01): show 4 decimal places
  if (usd < 0.01 && usd > 0) {
    return `$${usd.toFixed(4)}`;
  }

  // Medium and large costs: show 2 decimal places with comma separators
  return `$${usd.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format tool arguments into concise summary based on tool type
 * 
 * @param toolName - Name of the tool (e.g., "bash", "read", "write")
 * @param args - Tool arguments object
 * @returns Formatted summary string
 * 
 * @example
 * formatToolArgs("bash", { command: "ls -la" }) // "ls -la"
 * formatToolArgs("read", { path: "file.txt", offset: 100 }) // "file.txt (offset: 100)"
 * formatToolArgs("write", { path: "out.txt", content: "hello" }) // "out.txt (5 chars)"
 */
export function formatToolArgs(toolName: string, args: Record<string, unknown>): string {
  // Handle invalid inputs
  if (!args || typeof args !== 'object') {
    return '(no args)';
  }

  // Format based on tool type
  switch (toolName) {
    case 'bash': {
      const command = args.command as string;
      if (!command) {
        return '(no command)';
      }
      return truncateText(command, 50);
    }

    case 'read': {
      const path = args.path as string;
      if (!path) {
        return '(no path)';
      }
      
      let result = truncateText(path, 50);
      
      const offset = args.offset as number;
      const limit = args.limit as number;
      
      if (offset != null && limit != null) {
        result += ` (offset: ${offset}, limit: ${limit})`;
      } else if (offset != null) {
        result += ` (offset: ${offset})`;
      }
      
      return result;
    }

    case 'write': {
      const path = args.path as string;
      const content = args.content as string;
      const contentLength = content ? content.length : 0;
      
      if (!path) {
        return `(no path) (${contentLength} chars)`;
      }
      
      return `${path} (${contentLength} chars)`;
    }

    case 'grep': {
      const pattern = args.pattern as string;
      if (!pattern) {
        return '(no pattern)';
      }
      
      let result = `pattern: "${truncateText(pattern, 40)}"`;
      
      const path = args.path as string;
      if (path) {
        result += ` in ${path}`;
      }
      
      return result;
    }

    case 'find': {
      const pattern = args.pattern as string;
      if (!pattern) {
        return '(no pattern)';
      }
      
      let result = `pattern: "${pattern}"`;
      
      const path = args.path as string;
      if (path) {
        result += ` in ${path}`;
      }
      
      return result;
    }

    case 'subagent': {
      const agent = args.agent as string;
      if (!agent) {
        return '(no agent)';
      }
      
      let result = `agent: ${agent}`;
      
      const task = args.task as string;
      if (task) {
        result += `, task: "${truncateText(task, 40)}"`;
      }
      
      return result;
    }

    default: {
      // Generic format for unknown tools
      const entries = Object.entries(args);
      if (entries.length === 0) {
        return '(no args)';
      }
      
      // Create simple key-value summary
      const summary = entries
        .slice(0, 3) // Limit to first 3 args
        .map(([key, value]) => {
          // Format value based on type
          let valueStr: string;
          if (value == null) {
            valueStr = 'null';
          } else if (typeof value === 'object') {
            valueStr = JSON.stringify(value);
          } else {
            valueStr = String(value);
          }
          
          return `${key}: ${truncateText(valueStr, 20)}`;
        })
        .join(', ');
      
      return truncateText(summary, 70);
    }
  }
}

/**
 * Truncate text to maximum length with ellipsis
 * 
 * @param text - Text to truncate
 * @param maxLength - Maximum length including ellipsis
 * @returns Truncated text with "..." if needed
 * 
 * @example
 * truncateText("hello world", 8) // "hello..."
 * truncateText("short", 10) // "short"
 */
export function truncateText(text: string, maxLength: number): string {
  // Handle invalid inputs
  if (!text || text.length === 0) {
    return '';
  }

  // Handle invalid maxLength
  if (maxLength <= 0) {
    return '...';
  }

  // No truncation needed
  if (text.length <= maxLength) {
    return text;
  }

  // Truncate and add ellipsis
  // Reserve 3 chars for "..."
  if (maxLength <= 3) {
    return '...';
  }

  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Extract error message from tool result or error object
 * 
 * Looks for error information in common properties:
 * - error
 * - errorMessage
 * - message
 * - stderr
 * 
 * @param result - Tool result or error object
 * @returns Extracted error message (truncated to 200 chars)
 * 
 * @example
 * extractErrorMessage({ error: "Command failed" }) // "Command failed"
 * extractErrorMessage({ stderr: "File not found" }) // "File not found"
 * extractErrorMessage(new Error("Oops")) // "Oops"
 */
export function extractErrorMessage(result: unknown): string {
  // Handle null/undefined
  if (result == null) {
    return 'Unknown error';
  }

  // Handle Error objects
  if (result instanceof Error) {
    return truncateText(result.message || 'Unknown error', 200);
  }

  // Handle string results
  if (typeof result === 'string') {
    return result.trim() || 'Unknown error';
  }

  // Handle objects with error properties
  if (typeof result === 'object') {
    const obj = result as Record<string, unknown>;

    // Check for nested error object with message
    if (obj.error && typeof obj.error === 'object') {
      const errorObj = obj.error as Record<string, unknown>;
      if (errorObj.message && typeof errorObj.message === 'string') {
        return truncateText(errorObj.message.trim(), 200);
      }
    }

    // Check various error property names in priority order
    const errorProps = ['error', 'errorMessage', 'message', 'stderr'];
    
    for (const prop of errorProps) {
      if (obj[prop]) {
        const value = obj[prop];
        
        // Convert to string
        let errorStr: string;
        if (typeof value === 'string') {
          errorStr = value.trim();
        } else if (typeof value === 'object') {
          errorStr = JSON.stringify(value);
        } else {
          errorStr = String(value);
        }
        
        if (errorStr) {
          return truncateText(errorStr, 200);
        }
      }
    }
  }

  // Handle non-string primitives
  if (typeof result === 'number' || typeof result === 'boolean') {
    return String(result);
  }

  // Handle objects with no error info
  if (typeof result === 'object') {
    const jsonStr = JSON.stringify(result);
    if (jsonStr && jsonStr !== '{}') {
      return truncateText(jsonStr, 200);
    }
  }

  return 'Unknown error';
}
