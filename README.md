# MCP Thought Server

A powerful server for managing and processing thoughts, perspectives, and drafts.

## Features

### 1. Perspective Analysis System (PAS)

The Perspective Analysis System (PAS) is a powerful tool for analyzing, comparing, and synthesizing different perspectives in a system. It helps identify common ground, differences, and potential conflicts between various stakeholders' viewpoints.

Key features:

- Perspective analysis with configurable confidence thresholds
- Multi-perspective comparison with similarity and conflict metrics
- Perspective synthesis to find common ground and generate recommendations
- Perspective optimization to reduce complexity and improve clarity
- Conflict resolution with step-by-step guidance
- Validation with configurable rules and relationship checks

#### Usage Example

```typescript
import { perspectiveAnalysisApi } from './src/services/perspectiveAnalysisApi';

// Analyze a perspective
const analysisResult = await perspectiveAnalysisApi.analyzePerspective({
    input: {
        type: {
            category: 'stakeholder',
            subcategory: 'primary',
            weight: 0.8
        },
        viewpoint: 'User Experience',
        stakeholder: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            role: 'End User',
            influence: 0.9,
            interests: ['Ease of use', 'Performance', 'Reliability']
        },
        requirements: [
            {
                description: 'Fast response time',
                priority: 9,
                rationale: 'Users expect instant feedback',
                validation: {
                    criteria: 'Response time < 200ms',
                    method: 'Performance testing',
                    status: 'pending'
                }
            }
        ],
        constraints: [
            {
                type: 'technical',
                description: 'Must work on mobile devices',
                impact: 0.8,
                mitigation: 'Use responsive design'
            }
        ],
        priorities: [
            {
                item: 'Mobile optimization',
                level: 4,
                justification: 'High mobile user base'
            }
        ]
    },
    config: {
        confidenceThreshold: 0.7,
        maxIterations: 3,
        includeMetadata: true
    }
});

// Compare perspectives
const comparisonResult = await perspectiveAnalysisApi.comparePerspectives({
    perspectives: [perspective1, perspective2],
    config: {
        similarityThreshold: 0.7,
        conflictThreshold: 0.3,
        includeMetrics: true
    }
});

// Synthesize perspectives
const synthesisResult = await perspectiveAnalysisApi.synthesizePerspectives({
    perspectives: [perspective1, perspective2, perspective3],
    config: {
        minCommonGroundStrength: 0.6,
        maxConflicts: 5,
        priorityThreshold: 3
    }
});

// Optimize perspectives
const optimizationResult = await perspectiveAnalysisApi.optimizePerspectives({
    perspectives: [perspective1, perspective2]
});

// Resolve conflicts
const resolutionResult = await perspectiveAnalysisApi.resolveConflicts({
    conflict: {
        description: 'Conflicting requirements',
        perspectives: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001'],
        severity: 0.8,
        resolutionOptions: ['Option A', 'Option B']
    },
    perspectives: [perspective1, perspective2]
});

// Validate perspectives
const validationResult = await perspectiveAnalysisApi.validatePerspectives({
    perspectives: [perspective1, perspective2],
    config: {
        strictMode: true,
        validateRelationships: true,
        maxValidationDepth: 3
    }
});
```

### 2. Chain of Draft (CoD)

Coming soon...

### 3. Sequential Thinking

Coming soon...

## Installation

```bash
npm install
```

## Development

```bash
# Build the project
npm run build

# Run tests
npm test

# Start the server
npm start
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Environment Variables

### Core Configuration

- `MCP_SERVER_URL` - MCP server URL (default: <http://localhost:3000>)
- `MCP_API_KEY` - API key for MCP server authentication
- `MCP_MAX_RETRIES` - Maximum number of retries for failed requests (default: 3)
- `MCP_TIMEOUT` - Request timeout in milliseconds (default: 30000)

### Verbose Output Control

The following environment variables control what information is included in the response payload:

#### Core Output Controls

- `MCP_SHOW_PROCESSING_METRICS` - Show processing time and resource usage (default: true)
- `MCP_SHOW_SERVICE_METRICS` - Show service-specific metrics (default: true)
- `MCP_SHOW_MCP_METRICS` - Show MCP integration metrics (default: true)

#### Detailed Output Controls

- `MCP_SHOW_ADAPTATION_HISTORY` - Show adaptation history in response (default: false)
- `MCP_SHOW_CATEGORY_HISTORY` - Show category transition history (default: false)
- `MCP_SHOW_DEPENDENCY_CHAIN` - Show thought/draft dependencies (default: false)
- `MCP_SHOW_DEBUG_METRICS` - Show detailed debug metrics (default: false)

#### Performance Monitoring

- `MCP_SHOW_MEMORY_USAGE` - Show memory usage statistics (default: false)
- `MCP_SHOW_PARALLEL_TASK_INFO` - Show parallel processing information (default: false)

#### Backward Compatibility

- `MCP_SHOW_FULL_RESPONSE` - Show complete response (overrides other settings if true) (default: true)

### Example Usage

To run with minimal output:

```bash
export MCP_SHOW_FULL_RESPONSE=false
export MCP_SHOW_PROCESSING_METRICS=true
export MCP_SHOW_SERVICE_METRICS=true
export MCP_SHOW_MCP_METRICS=false
```

To enable detailed debugging:

```bash
export MCP_SHOW_FULL_RESPONSE=false
export MCP_SHOW_DEBUG_METRICS=true
export MCP_SHOW_MEMORY_USAGE=true
export MCP_SHOW_DEPENDENCY_CHAIN=true
```
