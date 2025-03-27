import { describe, it, expect } from 'vitest';
import {
    sanitizeContext,
    getContextConfidence,
    hasContextContent,
    mergeContexts
} from '../utils/contextSanitizer';

describe('Context Sanitizer', () => {
    describe('sanitizeContext', () => {
        it('should handle null/undefined input', () => {
            expect(sanitizeContext(null)).toEqual({
                problemScope: '',
                assumptions: [],
                constraints: []
            });
            expect(sanitizeContext(undefined)).toEqual({
                problemScope: '',
                assumptions: [],
                constraints: []
            });
        });

        it('should handle invalid input types', () => {
            expect(sanitizeContext(123)).toEqual({
                problemScope: '',
                assumptions: [],
                constraints: []
            });
            expect(sanitizeContext('string')).toEqual({
                problemScope: '',
                assumptions: [],
                constraints: []
            });
        });

        it('should sanitize valid input', () => {
            const input = {
                problemScope: 'test scope',
                assumptions: ['assumption1', 'assumption2'],
                constraints: ['constraint1']
            };
            expect(sanitizeContext(input)).toEqual(input);
        });

        it('should filter out invalid array items', () => {
            const input = {
                problemScope: 'test',
                assumptions: ['valid', null, 123, 'also valid'],
                constraints: [undefined, 'valid', {}]
            };
            expect(sanitizeContext(input)).toEqual({
                problemScope: 'test',
                assumptions: ['valid', 'also valid'],
                constraints: ['valid']
            });
        });
    });

    describe('getContextConfidence', () => {
        it('should calculate confidence correctly', () => {
            expect(getContextConfidence({
                problemScope: 'test',
                assumptions: ['a1'],
                constraints: ['c1']
            })).toBe(1);

            expect(getContextConfidence({
                problemScope: '',
                assumptions: [],
                constraints: []
            })).toBe(0);

            expect(getContextConfidence({
                problemScope: 'test',
                assumptions: [],
                constraints: []
            })).toBe(0.4);
        });
    });

    describe('hasContextContent', () => {
        it('should detect content correctly', () => {
            expect(hasContextContent({
                problemScope: '',
                assumptions: [],
                constraints: []
            })).toBe(false);

            expect(hasContextContent({
                problemScope: 'test',
                assumptions: [],
                constraints: []
            })).toBe(true);

            expect(hasContextContent({
                problemScope: '',
                assumptions: ['test'],
                constraints: []
            })).toBe(true);
        });
    });

    describe('mergeContexts', () => {
        it('should merge multiple contexts', () => {
            const contexts = [
                {
                    problemScope: 'scope1',
                    assumptions: ['a1', 'a2'],
                    constraints: ['c1']
                },
                {
                    problemScope: 'scope2',
                    assumptions: ['a2', 'a3'],
                    constraints: ['c1', 'c2']
                }
            ];

            expect(mergeContexts(contexts)).toEqual({
                problemScope: 'scope2',
                assumptions: ['a1', 'a2', 'a3'],
                constraints: ['c1', 'c2']
            });
        });

        it('should handle empty input', () => {
            expect(mergeContexts([])).toEqual({
                problemScope: '',
                assumptions: [],
                constraints: []
            });
        });
    });
}); 