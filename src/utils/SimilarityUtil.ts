/**
 * Calculates the dot product of two vectors.
 * Assumes vectors are of the same length.
 * @param vecA The first vector.
 * @param vecB The second vector.
 * @returns The dot product.
 */
function dotProduct(vecA: number[], vecB: number[]): number {
    let product = 0;
    for (let i = 0; i < vecA.length; i++) {
        product += vecA[i] * vecB[i];
    }
    return product;
}

/**
 * Calculates the magnitude (Euclidean norm) of a vector.
 * @param vec The vector.
 * @returns The magnitude.
 */
function magnitude(vec: number[]): number {
    let sumOfSquares = 0;
    for (let i = 0; i < vec.length; i++) {
        sumOfSquares += vec[i] * vec[i];
    }
    return Math.sqrt(sumOfSquares);
}

/**
 * Calculates the cosine similarity between two vectors.
 * Assumes vectors are non-zero and of the same length.
 * For normalized vectors (magnitude 1), this simplifies to just the dot product.
 *
 * @param vecA The first vector (ideally normalized).
 * @param vecB The second vector (ideally normalized).
 * @returns The cosine similarity (between -1 and 1).
 */
export function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
        // Handle invalid input gracefully
        console.error("Invalid input vectors for cosine similarity.");
        return 0;
    }

    // If vectors are pre-normalized (magnitude is 1), dot product is sufficient and faster.
    // We assume normalization happens during embedding generation based on EmbeddingUtil.
    const similarity = dotProduct(vecA, vecB);

    // Clamp the value between -1 and 1 due to potential floating point inaccuracies
    return Math.max(-1, Math.min(1, similarity));

    /*
    // Full calculation (if vectors are not normalized):
    const product = dotProduct(vecA, vecB);
    const magA = magnitude(vecA);
    const magB = magnitude(vecB);
    if (magA === 0 || magB === 0) {
        return 0; // Avoid division by zero
    }
    const similarity = product / (magA * magB);
    return Math.max(-1, Math.min(1, similarity)); // Clamp value
    */
}

/**
 * Calculates a relevance score based on the similarity of a target embedding
 * to a set of context embeddings using the 'max similarity' strategy.
 *
 * @param targetEmbedding The normalized embedding of the output text.
 * @param contextEmbeddings An array of normalized embeddings for the context strings.
 * @returns The maximum cosine similarity found (between 0 and 1, as negative similarity is usually not meaningful for relevance). Returns 0 if inputs are invalid.
 */
export function calculateRelevanceScore(targetEmbedding: number[] | null, contextEmbeddings: (number[] | null)[] | null): number {
    if (!targetEmbedding || !contextEmbeddings || contextEmbeddings.length === 0) {
        return 0; // No context or target to compare against
    }

    let maxSimilarity = -1; // Initialize lower than possible cosine similarity

    for (const contextEmbedding of contextEmbeddings) {
        if (contextEmbedding) { // Ensure the context embedding is valid
            const similarity = calculateCosineSimilarity(targetEmbedding, contextEmbedding);
            if (similarity > maxSimilarity) {
                maxSimilarity = similarity;
            }
        }
    }

    // Since relevance is typically considered non-negative, clamp the lower bound to 0.
    // A score of -1 (perfectly opposite meaning) is usually treated as 0 relevance.
    return Math.max(0, maxSimilarity);
}
