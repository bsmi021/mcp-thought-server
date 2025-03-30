# RFC-009: Semantic Similarity for Context Relevance in Confidence Calculation

* **Status:** Proposed
* **Author:** Cline
* **Date:** 2025-03-30

## 1. Summary

This RFC proposes replacing the current keyword-based context relevance calculation within the confidence scoring system (`calculateContextRelevance` methods in `IntegratedThinkingService`, `SequentialThinkingService`, `ChainOfDraftService`) with a more robust method based on semantic similarity using text embeddings.

## 2. Motivation

The current approach relies on extracting keywords from the generated output and comparing them against keywords derived from the context (problem scope, constraints, assumptions). This method suffers from several fucking problems:

* **Brittleness:** Slight variations in phrasing can cause keyword mismatches, leading to inaccurate relevance scores even when the meaning is aligned.
* **Superficiality:** It only captures surface-level lexical overlap, failing to understand the actual semantic meaning or intent of the text.
* **Gameability:** An LLM could potentially learn to stuff keywords without genuinely improving relevance.
* **Inaccuracy:** It leads to confidence scores that don't reliably reflect how well the output actually addresses the given context.

We need a method that understands meaning, not just words, to make the context relevance component of the confidence score more accurate and reliable.

## 3. Proposed Change

We will replace the existing keyword matching logic in all `calculateContextRelevance` methods with the following approach:

1. **Text Embeddings:** Utilize a sentence-transformer model (e.g., `Xenova/all-MiniLM-L6-v2` via `@xenova/transformers`) running locally within the Node.js service to generate dense vector embeddings for text segments.
2. **Context Representation:** Define the relevant context for a given step as an array of text strings. This array **must** include:
    * Problem Scope (from the current `context` object, if available)
    * Constraints (from the current `context` object, if available)
    * Assumptions (from the current `context` object, if available)
    This array **may optionally** include:
    * The full text content of the immediately preceding thought or draft (or potentially the last two).
    * **Purpose of Optional Inclusion:** Including the previous step's text aims to improve step-by-step coherence and ensure the current output logically follows the preceding work, in addition to being relevant to the overall goals (scope, constraints).
    * **Rationale for Optionality:** This is optional because:
        * The primary context (scope, constraints) might already provide sufficient grounding.
        * Adding more text increases embedding computation slightly.
        * It allows for tuning; we can enable/disable this inclusion via configuration based on observed performance regarding coherence vs. potential focus dilution.
        * Initial implementation will likely start *without* including previous step text, treating it as a potential future enhancement or tuning parameter.
3. **Embedding Generation:**
    * Generate an embedding for the current output text (thought or draft content).
    * Generate embeddings for each non-empty string in the context representation array (both mandatory and optionally included items).
4. **Similarity Calculation & Aggregation:**
    * Calculate the cosine similarity between the output text embedding and *each* of the context text embeddings.
    * Determine the final relevance score by taking the **maximum** similarity value found across all context comparisons.
    * **Justification for Max Strategy:** This approach is chosen because we want to know if the output is strongly relevant to *any* single piece of the defined context (e.g., directly addressing a specific constraint, the core problem scope, or maintaining continuity with the previous step). Averaging could dilute a strong relevance signal if other context items are less similar. The 'max' value directly reflects the strongest connection found.
5. **Integration:** The calculated maximum cosine similarity score (a value between 0 and 1) will become the new output of the `calculateContextRelevance` method, directly feeding into the overall confidence calculation logic in each service.

## 4. Rationale

* **Semantic Understanding:** Embeddings capture the meaning of text, allowing for relevance assessment even with different phrasing or synonyms.
* **Robustness:** Less susceptible to minor wording changes compared to keyword matching.
* **Improved Accuracy:** Directly compares the meaning of the output to the meaning of the context, leading to a more accurate relevance signal for the confidence score. The 'max similarity' aggregation ensures that strong relevance to any key context aspect is captured effectively.
* **Local Execution:** Using `@xenova/transformers` allows local execution, avoiding external API calls for this core calculation.

## 5. Implementation Details

* **Dependency:** Add `npm install @xenova/transformers`.
* **New Utilities (`src/utils/`):**
  * `EmbeddingUtil` (Singleton Class): Manages loading the embedding model (specified via config, e.g., `'Xenova/all-MiniLM-L6-v2'`) once on initialization and provides methods `generateEmbedding(text)` and `generateEmbeddings(texts)` that return normalized vectors. Handles automatic model download/caching via the library.
  * `SimilarityUtil` (Module): Provides `calculateCosineSimilarity(vecA, vecB)` and `calculateRelevanceScore(targetEmbedding, contextEmbeddings)` (implementing the 'max similarity' strategy).
* **Refactoring:**
  * Rewrite `calculateContextRelevance` in `IntegratedThinkingService.ts`, `SequentialThinkingService.ts`, and `ChainOfDraftService.ts` to use `EmbeddingUtil` and `SimilarityUtil`.
  * Remove old keyword extraction and matching logic from these methods and potentially from `src/utils/`.
* **Configuration (`ConfigurationManager`):** Add a setting for `embeddingModel` name. Add a boolean flag like `includePreviousStepTextInContext` (defaulting to `false`).
* **Model Caching:** Rely on the default caching mechanism of `@xenova/transformers` (typically in `~/.cache/huggingface/hub/` or `C:/Users/<User>/.cache/huggingface/hub/`). Be aware of the initial download delay and disk space usage.

## 6. Impact

* **Positive:** Significantly more accurate and robust context relevance scoring, leading to more reliable overall confidence scores. Reduced brittleness.
* **Negative:**
  * Increased dependency (`@xenova/transformers`).
  * Initial model download required (one-time delay, network needed).
  * Slight performance overhead for embedding generation and similarity calculation compared to simple keyword matching (though `all-MiniLM-L6-v2` is generally fast).
  * Increased disk space usage for the cached model.

## 7. Testing Plan

* Unit tests for `EmbeddingUtil` (mocking transformer library).
* Unit tests for `SimilarityUtil` functions.
* Integration tests for refactored `calculateContextRelevance` methods using mock embeddings to verify logic.
* End-to-end testing comparing confidence scores generated by the old vs. new system on benchmark tasks, ideally correlated with human relevance ratings.

## 8. Alternatives Considered

* **Keyword Matching:** Current approach, deemed too brittle and inaccurate.
* **LLM-based Rating:** Using a separate LLM call to rate relevance. Potentially more accurate but adds significant latency and cost/complexity compared to local embeddings. Could be a future enhancement if embeddings alone are insufficient.
* **Alternative Aggregation (Average Similarity):** Averaging the similarity scores across all context items was considered. Rejected because a high average could mask low relevance to critical items (like the core problem scope), and a low average could unfairly penalize output strongly relevant to one specific constraint if other context items are dissimilar. Max similarity better reflects if the output hits *any* relevant target well.
