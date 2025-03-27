# Sequential Thinking Service

A powerful TypeScript-based service for dynamic and reflective problem-solving through structured thinking. This system implements an advanced sequential thinking process with parallel processing capabilities, dynamic adaptation, and comprehensive metrics tracking. Now featuring Chain of Draft (CoD) for iterative document refinement!

## 🚀 Features

### Sequential Thinking

- **Maximum Depth**: 12 sequential thoughts
- **Parallel Processing**: Handle multiple thought chains simultaneously
- **Large Context Window**: 163,840 tokens
- **Advanced Branching**: Create and manage multiple thought paths
- **Dynamic Adaptation**: Automatically adjust processing based on performance
- **Confidence-based Validation**: Ensure high-quality thought processing
- **Comprehensive Metrics**: Track and analyze thinking patterns

### Chain of Draft (CoD)

- **Iterative Refinement**: Draft-Critique-Revision workflow
- **Quality Tracking**: Confidence scoring for each draft
- **Smart Categorization**: Automatic draft type detection
- **Version History**: Track all drafts and revisions
- **Performance Metrics**: Monitor processing efficiency
- **Dynamic Adaptation**: Optimize based on draft quality
- **Error Resilience**: Robust error handling and recovery

## 📦 Installation

```bash
npm install mcp-thought-server
# or
yarn add mcp-thought-server
```

## 🔧 Basic Usage

### Sequential Thinking

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

### Chain of Draft

```typescript
import { ChainOfDraftService } from 'mcp-thought-server';

// Initialize the service
const service = new ChainOfDraftService();

// Create initial draft
const draft = {
    content: "Initial document draft...",
    draftNumber: 1,
    totalDrafts: 3,
    needsRevision: true
};

// Process the draft
const result = await service.processDraft(draft);

// Create a revision
const revision = {
    content: "Improved document content...",
    draftNumber: 2,
    totalDrafts: 3,
    needsRevision: false,
    isRevision: true,
    revisesDraft: 1
};

// Process the revision
const finalResult = await service.processDraft(revision);
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

### Chain of Draft Configuration

```typescript
// Core Configuration
const config = {
    maxDrafts: 10,             // Maximum number of drafts
    contextWindow: 16384,      // Context window size
    confidenceThreshold: 0.8,  // Minimum confidence threshold
    enableParallelProcessing: false,
    revisionEnabled: true
};

// Enhancement Configuration
const enhancementConfig = {
    enableSummarization: true,    // Auto-summarize drafts
    draftCategorization: true,    // Categorize drafts
    progressTracking: true,       // Track progress metrics
    dynamicAdaptation: true      // Enable dynamic adaptation
};

// Debug Configuration
const debugConfig = {
    errorCapture: true,           // Capture and log errors
    metricTracking: true,         // Track performance metrics
    performanceMonitoring: true   // Monitor system performance
};

const service = new ChainOfDraftService(config, enhancementConfig, debugConfig);
```

## 📊 Performance Considerations

1. **Memory Usage**
   - Monitor heap usage with `metrics.resourceUsage`
   - Adjust context window size if needed
   - Clean up completed branches and old drafts

2. **Processing Time**
   - Track with `metrics.processingTime`
   - Use parallel processing for independent thoughts/drafts
   - Monitor adaptation history

3. **Confidence Thresholds**
   - Sequential Thinking default: 0.85 (85%)
   - Chain of Draft default: 0.80 (80%)
   - Adjusts automatically based on success rate
   - Can be configured manually

## 🐛 Error Handling

```typescript
// Sequential Thinking
try {
    const result = sequentialService.processThought(thought);
} catch (error) {
    if (error.message.includes('confidence')) {
        // Handle confidence threshold errors
    } else if (error.message.includes('maxDepth')) {
        // Handle depth limit errors
    }
}

// Chain of Draft
try {
    const result = await draftService.processDraft(draft);
} catch (error) {
    if (error.message.includes('validation')) {
        // Handle draft validation errors
    } else if (error.message.includes('revision')) {
        // Handle revision-related errors
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
