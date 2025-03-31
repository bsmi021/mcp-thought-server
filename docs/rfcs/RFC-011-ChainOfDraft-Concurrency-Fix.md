# RFC-011: Chain of Draft Concurrency Fix

**Status:** Draft
**Author:** Cline
**Date:** 2025-03-31

## 1. Problem

Users have reported intermittent "MCP error -32603: ... Original draft X not found" errors when using the `integratedThinking` tool, particularly when operations involve referencing earlier drafts (e.g., `revisesDraft: 1`).

Root cause analysis identified an asynchronous race condition within the `ChainOfDraftService`. Because the service instance (and its internal `draftHistory` map) persists across multiple tool calls within a single server session, it's possible for concurrent requests *belonging to the same session* to interfere with each other.

Specifically, a request attempting to read from `draftHistory` (e.g., a revision looking for the original draft) can execute before the preceding request (e.g., the creation of that original draft) has finished writing its result to the `draftHistory` map. This is exacerbated by the `async/await` nature of the service methods.

## 2. Goal

* Prevent the race condition described above.
* Ensure the atomicity and data integrity of read/write operations on the `draftHistory` map within the context of a single session.
* Maintain the ability for *different* sessions to process concurrently without unnecessary blocking.

## 3. Proposed Solution

Implement session-specific locking within the `ChainOfDraftService` using the framework-provided `sessionId` and the `async-mutex` library.

### 3.1. Locking Mechanism

* **Library:** Use `async-mutex` (`npm install async-mutex`).
* **Lock Granularity:** Maintain a map of `Mutex` instances within `ChainOfDraftService`, keyed by `sessionId`.

    ```typescript
    // In ChainOfDraftService.ts
    import { Mutex } from 'async-mutex';
    private sessionLocks: Map<string, Mutex> = new Map();

    private getSessionLock(sessionId: string): Mutex {
        if (!this.sessionLocks.has(sessionId)) {
            this.sessionLocks.set(sessionId, new Mutex());
        }
        return this.sessionLocks.get(sessionId)!;
    }
    ```

* **Lock Acquisition:** Wrap the core logic of the `processDraft` method within `lock.runExclusive()`, ensuring only one operation per session can modify or read the `draftHistory` at a time.

    ```typescript
    // In ChainOfDraftService.ts
    // Modify signature to accept sessionId
    public async processDraft(input: unknown, sessionId: string): Promise<DraftData> {
        const lock = this.getSessionLock(sessionId);
        return await lock.runExclusive(async () => {
            // ... existing core logic (validation, handleDraftProcessing, history update) ...
        });
    }
    ```

### 3.2. Plumbing `sessionId`

The `sessionId` needs to be passed down from the tool handler to the service:

1. **`integratedTool.ts`:** The main handler function receives `args` and `extra`. Extract `sessionId` from `extra` (providing a default if necessary). Pass this `sessionId` to the `processIntegrated` helper function.
2. **`processIntegrated` (in `integratedTool.ts`):** Modify this function to accept `sessionId` and pass it along when calling `integratedService.processIntegratedThought`.
3. **`IntegratedThinkingService.ts`:** Modify `processIntegratedThought` to accept `sessionId` and pass it when calling `this.draftService.processDraft`.

## 4. Alternatives Considered

* **Server-Managed `sessionId`:** The server generates and returns a `sessionId` on the first call, which the client must reuse. Rejected due to the increased burden and potential for errors on the LLM client side.
* **No Locking (Rely on Client):** Assume clients will always send requests sequentially within a session. Rejected as it makes the server fragile and susceptible to client bugs, network issues, or server-side concurrency quirks.

## 5. Impact

* **Robustness:** Significantly improves the robustness of the `ChainOfDraftService` by preventing data corruption due to race conditions.
* **Performance:** Negligible overhead for uncontended lock acquisition/release. Different sessions remain fully concurrent.
* **Complexity:** Introduces `async-mutex` dependency. Requires minor code changes for locking logic and plumbing the `sessionId`. Low-to-medium implementation complexity.
* **Client Impact:** None. Tool schemas and usage instructions remain unchanged.

## 6. Testing Strategy

* **Unit Tests:** Ensure the `getSessionLock` function works correctly.
* **Integration Tests:**
  * Create tests that simulate rapid, concurrent calls to `processDraft` *within the same session*.
  * Example Scenario:
        1. Send "Create Draft 1" request.
        2. *Immediately* send "Revise Draft 1" request (referencing draft 1).
        3. Verify that the second request completes successfully *without* the "Original draft 1 not found" error and that the final state reflects both operations correctly.
  * Verify that requests for *different* sessions can still execute concurrently.
