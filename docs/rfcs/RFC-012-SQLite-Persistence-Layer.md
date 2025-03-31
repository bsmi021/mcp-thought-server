# RFC-012: SQLite Persistence Layer for Session State

**Status:** Draft
**Author:** Cline
**Date:** 2025-03-31

## 1. Problem

The MCP Thought Server currently experiences state loss between requests within the same logical session, specifically causing "Original draft X not found" errors in the `ChainOfDraftService`. Diagnostic logging confirmed that previous attempts using in-memory instance variables and static class variables failed to persist state, likely due to the server's execution environment resetting process memory or reloading modules between requests. The locking mechanism implemented in RFC-011 was insufficient because the underlying state it was meant to protect was being lost.

## 2. Goal

Implement a robust, self-contained persistence mechanism for session-specific state (initially draft history for `ChainOfDraftService`) that reliably survives potential process/memory resets between requests within a session.

## 3. Proposed Solution: SQLite Persistence Layer

Introduce a centralized `StorageService` utilizing an embedded SQLite database file to manage persistent session state.

### 3.1. Dependencies

* Add `sqlite3` runtime dependency (`npm install sqlite3`).
* Add `@types/sqlite3` dev dependency (`npm install --save-dev @types/sqlite3`).

### 3.2. Database Setup

* **Configuration:** The database file path will be configured via the environment variable `MCP_SQLITE_PATH`.
* **Default Location:** If `MCP_SQLITE_PATH` is not set, it will default to `data/mcp-thought-server.sqlite` (relative to project root). A warning should be logged if the default is used.
* **Directory Creation:** The `StorageService` should ensure the directory for the database file exists before connecting.
* **Gitignore:** Add `data/` and `*.sqlite` to `.gitignore`.

### 3.3. `StorageService` (`src/services/StorageService.ts`)

* **Class:** `StorageService`
* **Constructor:** Reads `process.env.MCP_SQLITE_PATH` to determine the database path, falling back to the default (`data/mcp-thought-server.sqlite`) if the variable is unset. Stores the resolved path.
* **`initialize(): Promise<void>`:**
  * Ensures the directory for the database path exists.
  * Connects to the SQLite DB at the configured path using `sqlite3` (using async/await, potentially wrapping callbacks in Promises).
  * Creates the `drafts` table if it doesn't exist:

        ```sql
        CREATE TABLE IF NOT EXISTS drafts (
            sessionId TEXT NOT NULL,
            draftNumber INTEGER NOT NULL,
            jsonData TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (sessionId, draftNumber)
        );
        ```

  * (Consider adding indexes later if needed, e.g., on `sessionId`).
* **`setDraft(sessionId: string, draft: DraftData): Promise<void>`:**
  * Stringifies the `draft` object to JSON.
  * Executes `INSERT OR REPLACE INTO drafts (sessionId, draftNumber, jsonData) VALUES (?, ?, ?)` using prepared statements.
* **`getDraft(sessionId: string, draftNumber: number): Promise<DraftData | undefined>`:**
  * Executes `SELECT jsonData FROM drafts WHERE sessionId = ? AND draftNumber = ?` using prepared statements.
  * If a row is found, parses `jsonData` and returns `DraftData`. Returns `undefined` otherwise.
* **`getRecentDrafts(sessionId: string, limit: number): Promise<DraftData[]>`:** (Optional initial implementation, can be added later)
  * Executes `SELECT jsonData FROM drafts WHERE sessionId = ? ORDER BY draftNumber DESC LIMIT ?`.
  * Parses `jsonData` for each row and returns the array.
* **`close(): Promise<void>`:** Closes the database connection.

### 3.4. Refactor `ChainOfDraftService` (`src/services/ChainOfDraftService.ts`)

* **Remove State:** Delete the static `sessionDrafts` map and `getDraftHistory` method.
* **Remove Locking:** Delete `sessionLocks` map, `getSessionLock`, and `lock.runExclusive` wrapper.
* **Inject Storage:** Add `private storageService: StorageService` to the constructor parameters.
* **Update Logic:** Replace map operations with `await this.storageService.getDraft/setDraft`.
* **Simplify Confidence (Initial):** Modify `calculateHistoricalPerformance` to return a default value (e.g., 0.7) and log a warning. `calculateRevisionImpact` will use `getDraft` to fetch the single required original draft. `calculateSuccessRate` (if used directly) would also need similar simplification or rely on `getRecentDrafts` if implemented.

### 3.5. Initialization & Injection (`src/initialize.ts`, `src/tools/index.ts`, `src/tools/*.ts`)

* Instantiate `StorageService` once in `initialize.ts`.
* Call `await storageService.initialize()` before registering tools.
* Pass the `storageService` instance down through `registerTools` and tool registration functions (`draftTool`, `integratedTool`) to the service constructors (`ChainOfDraftService`, `IntegratedThinkingService`).
* **Documentation:** The main `README.md` needs to be updated later to document the `MCP_SQLITE_PATH` environment variable.

## 4. Alternatives Considered

* **In-Memory Static Map:** Proven unreliable in the current environment based on logs.
* **File-per-Draft Storage:** Less efficient than SQLite for potential history queries; managing many small files can be cumbersome.
* **External Stores (Redis/Memcached):** Violates the self-contained requirement.

## 5. Impact

* **Persistence:** Reliably solves the state loss issue.
* **Self-Contained:** Keeps the server self-contained without external dependencies.
* **Performance:** Introduces disk I/O latency. SQLite is generally performant, but this should be monitored. Initial confidence simplification mitigates potential performance hits from history queries.
* **Refactoring:** Requires significant changes to `ChainOfDraftService` and service initialization/injection logic.
* **Complexity:** Introduces a database dependency and management layer (`StorageService`).

## 6. Future Considerations

* **Schema Evolution:** Define a process if the `drafts` table or other tables need changes.
* **Confidence Accuracy:** Re-evaluate implementing `getRecentDrafts` later to restore full accuracy to history-based confidence calculations if performance allows.
* **Data Cleanup:** Implement a strategy to periodically clean up old session data from the SQLite file.
* **Error Handling:** Robust handling for database connection errors, query failures, etc., within `StorageService`.
* **Other Services:** Extend `StorageService` if other services (`SequentialThinkingService`?) require persistent state.

## 7. Testing Strategy

* **Unit Tests:** Test `StorageService` methods (`setDraft`, `getDraft`, `initialize`, etc.) thoroughly, potentially using an in-memory SQLite DB for testing speed.
* **Integration Tests:**
  * Verify `ChainOfDraftService` correctly interacts with the `StorageService`.
  * Re-run the original failing scenario (create draft 1, revise draft 1 in sequence) across simulated separate requests to confirm the "Original draft not found" error is resolved.
  * Test edge cases (e.g., draft not found, database errors).
