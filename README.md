# Sequential Thinking Service

A powerful TypeScript-based service for dynamic and reflective problem-solving through structured thinking. This system implements an advanced sequential thinking process with parallel processing capabilities, dynamic adaptation, and comprehensive metrics tracking.

## 🚀 Features

- **Maximum Depth**: 12 sequential thoughts
- **Parallel Processing**: Handle multiple thought chains simultaneously
- **Large Context Window**: 163,840 tokens
- **Advanced Branching**: Create and manage multiple thought paths
- **Dynamic Adaptation**: Automatically adjust processing based on performance
- **Confidence-based Validation**: Ensure high-quality thought processing
- **Comprehensive Metrics**: Track and analyze thinking patterns

## 📦 Installation

```bash
npm install mcp-thought-server
# or
yarn add mcp-thought-server
```

## 🔧 Basic Usage

```typescript
import { SequentialThinkingService } from 'mcp-thought-server';

// Initialize the service
const service = new SequentialThinkingService();

// Create a thought
const thought = {
    thought: "Initial analysis of the problem",
    thoughtNumber: 1,
    totalThoughts: 3,
    nextThoughtNeeded: true
};

// Process the thought
const result = service.processThought(thought);
```

## 🔥 Advanced Features

### Parallel Processing

```typescript
const service = new SequentialThinkingService({
    parallelTasks: true,
    maxDepth: 12
});

const thoughts = [
    { thought: "Analysis A", thoughtNumber: 1, totalThoughts: 3, nextThoughtNeeded: true },
    { thought: "Analysis B", thoughtNumber: 1, totalThoughts: 3, nextThoughtNeeded: true }
];

const results = await service.processParallelThoughts(thoughts);
```

### Branching Thoughts

```typescript
const mainThought = {
    thought: "Main analysis path",
    thoughtNumber: 1,
    totalThoughts: 3,
    nextThoughtNeeded: true
};

const branchThought = {
    thought: "Alternative analysis path",
    thoughtNumber: 1,
    totalThoughts: 2,
    nextThoughtNeeded: true,
    branchFromThought: 1,
    branchId: "alternative-path"
};
```

## ⚙️ Configuration

### Core Configuration

```typescript
const config = {
    maxDepth: 12,              // Maximum depth of thought chain
    parallelTasks: true,       // Enable parallel processing
    contextWindow: 163840,     // Context window size
    branchingEnabled: true,    // Enable thought branching
    revisionEnabled: true,     // Enable thought revision
    confidenceThreshold: 0.85  // Minimum confidence threshold
};
```

### Enhancement Configuration

```typescript
const enhancementConfig = {
    enableSummarization: true,    // Auto-summarize thought chains
    thoughtCategorization: true,  // Categorize thoughts
    progressTracking: true,       // Track progress metrics
    dynamicAdaptation: true      // Enable dynamic adaptation
};
```

## 📊 Performance Considerations

1. **Memory Usage**
   - Monitor heap usage with `metrics.resourceUsage`
   - Adjust context window size if needed
   - Clean up completed branches

2. **Processing Time**
   - Track with `metrics.processingTime`
   - Use parallel processing for independent thoughts
   - Monitor adaptation history

3. **Confidence Thresholds**
   - Default: 0.85 (85%)
   - Adjusts automatically based on success rate
   - Can be configured manually

## 🐛 Error Handling

```typescript
try {
    const result = service.processThought(thought);
} catch (error) {
    if (error.message.includes('confidence')) {
        // Handle confidence threshold errors
    } else if (error.message.includes('maxDepth')) {
        // Handle depth limit errors
    }
}
```

## 📝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Support

For support, issues, or feature requests, please file an issue in the GitHub repository.
