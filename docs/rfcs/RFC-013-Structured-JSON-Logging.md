# RFC-013: Structured JSON Logging

* **Status**: Proposed
* **Date**: 2025-04-01
* **Author**: Cline
* **Related Issues**: (User Request)

## Summary

This RFC proposes replacing the current string-based logging utility in `src/utils/logging.ts` with a new implementation that outputs structured JSON logs to `stderr`. This aligns with best practices for server logging, improving parseability and monitoring capabilities.

## Motivation

The current logging implementation outputs simple prefixed strings (e.g., `[INFO] message`) to `stderr`. While functional and configurable by `LOG_LEVEL`, this format has drawbacks:

* **Difficult Parsing**: String logs are harder for automated log aggregation and analysis tools to parse reliably compared to JSON.
* **Limited Context**: It's cumbersome to include rich, structured context (like request IDs, parameters, state) alongside log messages.
* **Inconsistent Error Handling**: Error objects are not consistently formatted or included in a structured way.

Adopting a structured JSON logging pattern, as provided in the initial request, addresses these issues by:

* Ensuring logs are easily machine-readable.
* Providing a standard way to include arbitrary context via a `context` object.
* Properly formatting `Error` objects, including stack traces and potential custom details.
* Maintaining the separation of application logs (`stderr`) from MCP protocol messages (`stdout`).

## Proposed Implementation

### 1. Update `src/utils/logger.ts`

The entire content of `src/utils/logging.ts` will be replaced with the following implementation (based on the user-provided pattern):

```typescript
/**
 * Simple structured logger utility that writes JSON to stderr.
 */

// Define log levels (using string enum for clarity in JSON)
enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
}

// Numeric levels for comparison
const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3,
};

// Default to 'info' if LOG_LEVEL is not set or invalid
const configuredLevelName = (process.env.LOG_LEVEL?.toUpperCase() ?? LogLevel.INFO) as LogLevel;
const configuredLevelValue = LOG_LEVEL_VALUES[configuredLevelName] ?? LOG_LEVEL_VALUES[LogLevel.INFO];

// Interface for the structured log entry
interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: Record<string, any>; // For additional structured data
    error?: {
        message: string;
        name?: string; // Include error name (e.g., 'TypeError')
        stack?: string;
        details?: any; // Include details from custom errors if available
    };
}

/**
 * Checks if a message at a given level should be logged based on configured level.
 * @param level - The level of the message to check.
 * @returns True if the message should be logged, false otherwise.
 */
function shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_VALUES[level] >= configuredLevelValue;
}

/**
 * Writes a structured log entry as JSON to stderr if the level is sufficient.
 * @param level - The log level.
 * @param message - The main log message.
 * @param context - Optional structured context object.
 * @param error - Optional error object for ERROR level logs.
 */
function writeLog(level: LogLevel, message: string, context?: Record<string, any>, error?: unknown) {
    if (!shouldLog(level)) {
        return;
    }

    const logEntry: Partial<LogEntry> = {
        timestamp: new Date().toISOString(),
        level,
        message,
    };

    if (context && Object.keys(context).length > 0) {
        logEntry.context = context;
    }

    if (level === LogLevel.ERROR && error) {
        if (error instanceof Error) {
            logEntry.error = {
                message: error.message,
                name: error.name,
                stack: error.stack,
                // Attempt to include details from custom BaseError or similar
                details: (error as any).details,
            };
        } else {
            // Handle cases where non-Error objects are thrown
            logEntry.error = {
                message: 'Non-error object thrown or passed to logger.error',
                name: 'UnknownError',
                details: error, // Log the raw value
            };
        }
    }

    // Use console.error to write the JSON string to stderr
    // Ensure the entire log entry is on a single line
    try {
        console.error(JSON.stringify(logEntry));
    } catch (stringifyError) {
        // Fallback if JSON.stringify fails (e.g., circular references in context/error)
        console.error(JSON.stringify({
            timestamp: logEntry.timestamp,
            level: LogLevel.ERROR,
            message: "Failed to stringify original log entry. See details.",
            originalMessage: message, // Include original message
            error: {
                name: "LoggingError",
                message: "Could not serialize log entry to JSON.",
                details: stringifyError instanceof Error ? stringifyError.message : String(stringifyError),
            }
        }));
    }
}

// Logger object with methods matching the new signature
export const logger = {
    debug: (message: string, context?: Record<string, any>): void => {
        writeLog(LogLevel.DEBUG, message, context);
    },
    info: (message: string, context?: Record<string, any>): void => {
        writeLog(LogLevel.INFO, message, context);
    },
    warn: (message: string, context?: Record<string, any>): void => {
        writeLog(LogLevel.WARN, message, context);
    },
    // Error signature: message, error object, context object
    error: (message: string, error?: unknown, context?: Record<string, any>): void => {
        writeLog(LogLevel.ERROR, message, context, error);
    },
};

```

### 2. Update Existing Logger Calls

All existing calls to `logger.debug`, `logger.info`, `logger.warn`, and `logger.error` throughout the `src/` directory must be updated to match the new function signatures.

**Example Changes:**

```typescript
// --- Before ---

// Simple message
logger.info("Server starting...");

// Message with unstructured args
const toolName = 'sequentialThinking';
logger.debug(`Handling tool: ${toolName}`, someVariable);

// Error logging
try {
  // ... some operation ...
} catch (err) {
  logger.error("Operation failed:", err, { requestId: '123' }); // Incorrect arg order/structure
}


// --- After ---

// Simple message (no change needed for info/debug/warn if no context)
logger.info("Server starting...");

// Message with structured context
const toolName = 'sequentialThinking';
logger.debug(`Handling tool`, { tool: toolName, otherData: someVariable }); // Context object

// Error logging (Corrected)
try {
  // ... some operation ...
} catch (err) {
  // Pass error object as second arg, context as third
  logger.error("Operation failed", err, { requestId: '123' });
}
```

This refactoring will involve searching the codebase for `logger.` calls and adjusting the arguments accordingly.

## Impact

* **Log Format Change**: Log output will change from prefixed strings to single-line JSON objects written to `stderr`. Any existing log parsing or monitoring setups might need adjustment.
* **Improved Debugging**: Structured context and error details will significantly aid in debugging and tracing requests.
* **Code Modification**: Requires modifying `logger.ts` and potentially numerous call sites throughout the `src/` directory.

## Alternatives Considered

* **Keep Current Logger**: Rejected because it lacks structured context and proper error formatting, hindering effective monitoring and debugging.
* **Use External Logging Library (e.g., Pino, Winston)**: Considered, but the provided simple implementation is sufficient for the current needs, avoids adding external dependencies, and directly addresses the requirements.

## Next Steps

1. Approve this RFC.
2. Implement the changes described above (in ACT MODE).
3. Update Memory Bank (`activeContext.md`, `progress.md`) after implementation.
