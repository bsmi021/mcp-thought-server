# MCP Thought Server

A powerful server providing advanced thinking tools via the Model Context Protocol (MCP) to enhance the reasoning, planning, and iterative refinement capabilities of AI agents like Cline.

## Core Purpose

This server offers specialized MCP tools designed to guide AI agents through structured cognitive processes, enabling them to tackle complex tasks more effectively by simulating advanced reasoning, breaking down problems, generating and critiquing solutions, and tracking progress reliably.

## Key Features / Available Tools

The server provides the following tools for structured thinking via MCP:

### Sequential Thinking (`sequentialThinking`)

* **Purpose:** Guides structured, step-by-step problem-solving through stages like analysis, hypothesis, verification, revision, and solution.
* **Key Concepts:** Manages distinct thinking stages and state, including thought numbers and branching for exploring alternatives.
* **Workflow Diagram:**

    ```mermaid
    graph TD
        A[Analysis] --> H{Hypothesis};
        H --> V{Verification};
        V -- Success --> S[Solution];
        V -- Failure/Inconclusive --> R{Revision};
        R --> H;
        H -- Alternative --> B[Branch: New Hypothesis];
        B --> V;
    ```

* **Usage Note:** The `thought` parameter is **required** even on the first call (`thoughtNumber: 1`) and must contain the initial problem statement or analysis.
* **Parameter Reference:** *See `src/tools/sequentialThinkingParams.ts` for detailed parameters, descriptions, and usage examples.*

### Chain of Draft (`chainOfDraft`)

* **Purpose:** Facilitates iterative content generation and refinement through cycles of drafting, critiquing, and revising.
* **Key Concepts:** Manages distinct drafting stages (initial, critique, revision, final) and state, including draft numbers. Draft history is persisted using SQLite.
* **Workflow Diagram:**

    ```mermaid
    graph TD
        I[Initial Draft] --> C{Critique};
        C -- Revision Needed --> R[Revision];
        R --> C;
        C -- Good Enough --> F[Final Draft];
    ```

* **Parameter Reference:** *See `src/tools/chainOfDraftParams.ts` for detailed parameters, descriptions, and usage examples.*

### Integrated Thinking (`integratedThinking`)

* **Purpose:** Combines Sequential Thinking and Chain of Draft for complex tasks requiring both structured reasoning and iterative content refinement.
* **Key Concepts:** Integrates both methodologies and manages combined state (thought and draft numbers). Relies on SQLite for draft history persistence via the underlying `ChainOfDraftService`.
* **Workflow Diagram (Simplified):**

    ```mermaid
    graph TD
        Start[Start: Initial Thought/Draft] --> Step1{Critique / Analysis};
        Step1 -- Needs Improvement --> Step2[Revision / Hypothesis];
        Step2 --> Step1;
        Step1 -- Looks Good --> Step3{Verification / Final Review};
        Step3 -- Pass --> Finish[Final Output];
        Step3 -- Fail --> Step2;
    ```

    *(Note: This diagram simplifies the potentially complex interplay)*
* **Usage Note:** The `category.type: 'final'` can only be used when `thoughtNumber` equals `totalThoughts`.
* **Parameter Reference:** *See `src/tools/integratedParams.ts` for detailed parameters, descriptions, and usage examples.*

### Set Feature (`setFeature`)

* **Purpose:** A debug tool for enabling or disabling specific internal server features during runtime, such as detailed logging or metric tracking.
* **Key Concepts:** Intended for debugging and diagnostics.
* **Parameter Reference:** *See `src/tools/setFeatureParams.ts` for detailed parameters and available features.*

### Advanced Confidence Scoring

The server employs an advanced confidence scoring system to provide more accurate assessments of the AI's output quality and relevance, replacing older, simpler methods. This system has two main components:

* **Semantic Relevance (RFC-009):** Measures how relevant the AI's output (thought/draft) is to the provided task context (problem scope, constraints, assumptions). It uses local text embeddings (via `@xenova/transformers`, default model `Xenova/all-MiniLM-L6-v2`) and cosine similarity to understand meaning beyond simple keywords. *(See `docs/rfcs/009-semantic-relevance-confidence.md` for technical details)*.
* **Optional LLM Coherence Check (RFC-010):** If enabled via environment variables, this uses an external LLM to assess the logical consistency and quality of the AI's output. It requires the configured LLM to support **structured JSON output** (specifically `{"rating": N}` where N is 1-5) requested via the `response_format` parameter. This check is **optional**; if disabled or if the LLM call fails, the system **gracefully falls back** to a neutral default score (0.7) for the coherence component, ensuring the server continues to function. *(See `docs/rfcs/010-llm-coherence-check.md` for technical details)*.

### Usage Example (Sequential Thinking - Step 1)

```json
// Example call to start a sequential thinking process
{
  "tool_name": "sequentialThinking",
  "arguments": {
    "thought": "Initial analysis of the user request to refactor the authentication module.", // Required!
    "nextThoughtNeeded": true,
    "thoughtNumber": 1,
    "totalThoughts": 5, // Initial estimate
    "category": {
      "type": "analysis",
      "confidence": 0.6
    },
    "context": {
      "problemScope": "Refactor the existing authentication module to improve security and use modern practices.",
      "constraints": ["Must maintain compatibility with existing user database.", "Minimize downtime during deployment."]
    }
  }
}
```

## Installation

Ensure you have Node.js (version >= 16.0.0 recommended) and npm installed.

```bash
# Clone the repository (if you haven't already)
# git clone <repository-url>
# cd mcp-thought-server

# Install dependencies (includes sqlite3)
npm install
```

*Note: The first time you run the server after installation, the `@xenova/transformers` library may download the embedding model (`Xenova/all-MiniLM-L6-v2` by default), which requires an internet connection and may take some time.*

## Development & Usage

```bash
# Build the project (compile TypeScript to JavaScript in build/)
npm run build

# Run tests
npm test

# Start the server (runs node build/index.js)
npm start

# Run in development mode with auto-reloading (uses ts-node-dev)
npm run dev
```

The server will start and listen for MCP connections (typically via stdio when launched by an MCP client).

## Configuration (Environment Variables)

Server behavior can be configured using environment variables. You can set these directly in your shell or use a `.env` file (requires `dotenv` package, which is included).

### SQLite Persistence (RFC-012)

To ensure reliable state persistence (like draft history) across requests, especially in environments that might reset process memory, the server uses an embedded SQLite database.

* `MCP_SQLITE_PATH`: (Optional) Specifies the file path for the SQLite database.
  * If not set, defaults to `data/mcp-thought-server.sqlite` relative to the project root. A warning will be logged if the default is used.
  * The directory containing the file will be created automatically if it doesn't exist.
* **Note:** Ensure the `data/` directory (or the custom directory specified) and `*.sqlite` files are added to your `.gitignore`.

### Core MCP Connection

* `MCP_SERVER_URL`: (Optional) MCP server URL if needed for specific configurations (default: `http://localhost:3000` - often unused if stdio is the transport).
* `MCP_API_KEY`: (Optional) API key if the MCP client requires authentication (default: `default-key`).

### Optional LLM Coherence Check (RFC-010)

Enables a more accurate coherence check using an external LLM. Requires `COHERENCE_API_KEY` and `COHERENCE_CHECK_MODEL` to be set. **The configured LLM must support structured JSON output.**

* `COHERENCE_API_KEY`: **(Required to enable)** API key for the LLM service.
* `COHERENCE_CHECK_MODEL`: **(Required to enable)** Model identifier (e.g., `openai/gpt-3.5-turbo`, `google/gemma-7b-it`).
* `COHERENCE_API_BASE`: (Optional) Base URL for OpenAI-compatible endpoints (e.g., OpenRouter, Azure, local Ollama). Defaults to official OpenAI API if unset.
* `COHERENCE_HTTP_REFERER`: (Optional) Site URL header, potentially used by some proxy services like OpenRouter for ranking/identification.
* `COHERENCE_X_TITLE`: (Optional) Site title header, potentially used by some proxy services like OpenRouter for ranking/identification.

**Fallback:** If `COHERENCE_API_KEY` or `COHERENCE_CHECK_MODEL` are not set, or if the LLM API call fails or returns an invalid response, the coherence check will use a default neutral score (0.7).

### Verbose Output Control

These boolean (`true`/`false`) variables control the level of detail included in the tool response payloads.

#### Core Output Controls (Default: `true`)

* `MCP_SHOW_PROCESSING_METRICS`: Show processing time and resource usage.
* `MCP_SHOW_SERVICE_METRICS`: Show service-specific metrics.
* `MCP_SHOW_MCP_METRICS`: Show MCP integration metrics.

#### Detailed Output Controls (Default: `false`)

* `MCP_SHOW_ADAPTATION_HISTORY`: Show adaptation history.
* `MCP_SHOW_CATEGORY_HISTORY`: Show category transition history.
* `MCP_SHOW_DEPENDENCY_CHAIN`: Show thought/draft dependencies.
* `MCP_SHOW_DEBUG_METRICS`: Show detailed debug metrics.

#### Performance Monitoring (Default: `false`)

* `MCP_SHOW_MEMORY_USAGE`: Show memory usage statistics.
* `MCP_SHOW_PARALLEL_TASK_INFO`: Show parallel processing information.

#### Backward Compatibility (Default: `true`)

* `MCP_SHOW_FULL_RESPONSE`: Show complete response (overrides other `MCP_SHOW_*` settings if `true`). Set to `false` to enable fine-grained control with the other flags.

### Example Usage

To run with minimal output, enabling only core metrics:

```bash
export MCP_SHOW_FULL_RESPONSE=false
export MCP_SHOW_PROCESSING_METRICS=true
export MCP_SHOW_SERVICE_METRICS=true
export MCP_SHOW_MCP_METRICS=false
# ... other MCP_SHOW_* flags default to false ...
npm start
```

To enable the LLM coherence check using OpenRouter:

```bash
export COHERENCE_API_KEY="your-openrouter-key"
export COHERENCE_CHECK_MODEL="google/gemma-7b-it" # Or another model
export COHERENCE_API_BASE="https://openrouter.ai/api/v1"
export COHERENCE_HTTP_REFERER="http://localhost:3000" # Your site URL
export COHERENCE_X_TITLE="MCPThoughtServer" # Your app name
npm start
```

To specify a custom SQLite database location:

```bash
export MCP_SQLITE_PATH="/path/to/your/data/custom_thoughts.sqlite"
npm start
```

## Troubleshooting

* **Connection Issues:** Ensure the server is running (`npm start` or `node build/index.js`). Verify the MCP client configuration points to the correct transport (e.g., stdio).
* **Tool Errors (`InvalidParams`, etc.):** Carefully check the tool's required parameters and types against the linked `*Params.ts` file (e.g., `src/tools/sequentialThinkingParams.ts`). Zod validation is strict. Check server logs for detailed validation errors if possible.
  * *Common Error:* For `sequentialThinking`, ensure the `thought` parameter is provided even on the first call (`thoughtNumber: 1`).
  * *Common Error:* For `integratedThinking`, ensure `category.type: 'final'` is only used when `thoughtNumber` equals `totalThoughts`.
* **"Original draft X not found" Errors:** This indicates an issue retrieving draft history. Ensure the SQLite database file path (configured via `MCP_SQLITE_PATH` or the default `data/mcp-thought-server.sqlite`) is correct and the server process has write permissions to that location. Check server logs for database errors. If the database file (`.sqlite`) seems corrupted, deleting it might resolve the issue (but will lose history).
* **LLM Coherence Check Issues:** If enabled, verify `COHERENCE_API_KEY`, `COHERENCE_CHECK_MODEL`, and `COHERENCE_API_BASE` environment variables are correctly set. Check the status of the external LLM service. Ensure the selected model supports the required structured JSON output format. Check server logs for API errors.
* **Low Confidence Scores:** May indicate the AI's output is genuinely not relevant (check semantic similarity score component) or not coherent (if LLM check is enabled), or that the `context` provided to the tool was insufficient or poorly defined.
* **Embedding Model Download Failure:** Ensure an internet connection is available the first time the server runs to download the sentence transformer model. Check permissions for the cache directory (e.g., `~/.cache/huggingface/hub/`).
* **SQLite Errors:** Check file system permissions for the database file and its directory. Ensure the `sqlite3` native addon built correctly during `npm install` (sometimes requires build tools like Python, C++ compiler).
* **General:** Check the server's console output (stdout/stderr) for more detailed error messages or logging information.

## Architecture Overview (Brief)

The server is a Node.js application built with TypeScript. It follows standard MCP server patterns, using the `@modelcontextprotocol/sdk`. Key logic is separated into:

* **Tools (`src/tools/`):** Define MCP tool interfaces (using Zod schemas) and handle request validation/routing.
* **Services (`src/services/`):** Encapsulate the core logic for each thinking strategy (`sequentialThinking`, `chainOfDraft`, `integratedThinking`) and persistence (`StorageService`).
* **Configuration (`src/config/`):** Manages settings and environment variables.
* **Utilities (`src/utils/`):** Shared functions for tasks like logging, embeddings, similarity, and coherence checks.
* **Types (`src/types/`):** Centralized TypeScript definitions.

## Contributing

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

## License

ISC - See the LICENSE file for details (Note: LICENSE file does not currently exist in the provided file list).
