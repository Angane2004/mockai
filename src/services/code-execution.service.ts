/**
 * Judge0 Code Execution Service
 * Handles secure code execution for coding interview questions
 */

const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com';
const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY || '';

// Language IDs for Judge0
export const LANGUAGE_IDS = {
    python: 71,      // Python 3
    javascript: 63,  // JavaScript (Node.js)
    java: 62,        // Java
    cpp: 54,         // C++ (GCC)
    c: 50,           // C (GCC)
    typescript: 74,  // TypeScript
} as const;

export interface TestCase {
    input: any;
    expectedOutput: any;
    isHidden: boolean;
}

export interface TestResult {
    passed: boolean;
    input: any;
    expected: any;
    actual: any;
    executionTime: number; // milliseconds
    memory: number; // KB
    error?: string;
    status?: string;
}

export interface ExecutionResult {
    allPassed: boolean;
    testResults: TestResult[];
    totalTests: number;
    passedTests: number;
    failedTests: number;
    totalTime: number;
    averageMemory: number;
}

class CodeExecutionService {
    private async submitCode(
        code: string,
        languageId: number,
        stdin: string = ''
    ): Promise<{ token: string }> {
        const response = await fetch(`${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=false`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-RapidAPI-Key': RAPIDAPI_KEY,
                'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
            },
            body: JSON.stringify({
                source_code: code,
                language_id: languageId,
                stdin: stdin,
                cpu_time_limit: 5, // 5 seconds max
                memory_limit: 128000, // 128 MB
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to submit code: ${response.statusText}`);
        }

        return await response.json();
    }

    private async getSubmissionResult(token: string, maxAttempts: number = 10): Promise<any> {
        for (let i = 0; i < maxAttempts; i++) {
            const response = await fetch(
                `${JUDGE0_API_URL}/submissions/${token}?base64_encoded=false`,
                {
                    headers: {
                        'X-RapidAPI-Key': RAPIDAPI_KEY,
                        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to get result: ${response.statusText}`);
            }

            const result = await response.json();

            // Status IDs: 1-2 = In Queue/Processing, 3 = Accepted, 4+ = Errors
            if (result.status.id > 2) {
                return result;
            }

            // Wait before next attempt
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        throw new Error('Execution timeout - please try again');
    }

    private normalizeOutput(output: string): string {
        return output.trim().toLowerCase().replace(/\s+/g, ' ');
    }

    private compareOutputs(actual: any, expected: any): boolean {
        // Convert to strings and normalize
        const actualStr = String(actual);
        const expectedStr = String(expected);

        return this.normalizeOutput(actualStr) === this.normalizeOutput(expectedStr);
    }

    /**
     * Run code against multiple test cases
     */
    async runTests(
        code: string,
        language: string,
        testCases: TestCase[]
    ): Promise<ExecutionResult> {
        const languageId = LANGUAGE_IDS[language as keyof typeof LANGUAGE_IDS];

        if (!languageId) {
            throw new Error(`Unsupported language: ${language}`);
        }

        if (!RAPIDAPI_KEY) {
            console.warn('⚠️ RAPIDAPI_KEY not set, using mock results');
            return this.runMockTests(testCases);
        }

        const testResults: TestResult[] = [];
        let totalTime = 0;
        let totalMemory = 0;

        console.log(`🚀 Running ${testCases.length} test cases for ${language}...`);

        for (const testCase of testCases) {
            try {
                // Prepare input
                const stdin = typeof testCase.input === 'object'
                    ? JSON.stringify(testCase.input)
                    : String(testCase.input);

                // Submit code
                const { token } = await this.submitCode(code, languageId, stdin);

                // Get result
                const result = await this.getSubmissionResult(token);

                const executionTime = parseFloat(result.time) * 1000 || 0; // Convert to ms
                const memory = result.memory || 0;

                totalTime += executionTime;
                totalMemory += memory;

                // Check if passed
                const actualOutput = result.stdout || result.stderr || '';
                const passed = result.status.id === 3 &&
                    this.compareOutputs(actualOutput, testCase.expectedOutput);

                testResults.push({
                    passed,
                    input: testCase.input,
                    expected: testCase.expectedOutput,
                    actual: actualOutput,
                    executionTime,
                    memory,
                    error: result.stderr || result.compile_output || undefined,
                    status: result.status.description
                });

            } catch (error) {
                console.error('Test execution error:', error);
                testResults.push({
                    passed: false,
                    input: testCase.input,
                    expected: testCase.expectedOutput,
                    actual: '',
                    executionTime: 0,
                    memory: 0,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    status: 'Error'
                });
            }
        }

        const passedTests = testResults.filter(r => r.passed).length;

        return {
            allPassed: passedTests === testCases.length,
            testResults,
            totalTests: testCases.length,
            passedTests,
            failedTests: testCases.length - passedTests,
            totalTime,
            averageMemory: totalMemory / testCases.length
        };
    }

    /**
     * Mock test execution for development/demo
     */
    private async runMockTests(testCases: TestCase[]): Promise<ExecutionResult> {
        console.log('🎭 Using mock test execution (no API key)');

        // Simulate async execution
        await new Promise(resolve => setTimeout(resolve, 1500));

        const testResults: TestResult[] = testCases.map((testCase, index) => {
            // Mock: pass first 2 tests, fail rest randomly
            const passed = index < 2 || Math.random() > 0.5;

            return {
                passed,
                input: testCase.input,
                expected: testCase.expectedOutput,
                actual: passed ? testCase.expectedOutput : 'incorrect output',
                executionTime: Math.random() * 100 + 50,
                memory: Math.random() * 5000 + 2000,
                error: passed ? undefined : 'Wrong answer',
                status: passed ? 'Accepted' : 'Wrong Answer'
            };
        });

        const passedTests = testResults.filter(r => r.passed).length;

        return {
            allPassed: passedTests === testCases.length,
            testResults,
            totalTests: testCases.length,
            passedTests,
            failedTests: testCases.length - passedTests,
            totalTime: testResults.reduce((sum, r) => sum + r.executionTime, 0),
            averageMemory: testResults.reduce((sum, r) => sum + r.memory, 0) / testCases.length
        };
    }

    /**
     * Quick syntax check (compile only, no execution)
     */
    async checkSyntax(code: string, language: string): Promise<{ valid: boolean; error?: string }> {
        const languageId = LANGUAGE_IDS[language as keyof typeof LANGUAGE_IDS];

        if (!languageId || !RAPIDAPI_KEY) {
            return { valid: true }; // Skip check if no API key
        }

        try {
            const { token } = await this.submitCode(code, languageId, '');
            const result = await this.getSubmissionResult(token, 5);

            if (result.compile_output) {
                return {
                    valid: false,
                    error: result.compile_output
                };
            }

            return { valid: true };
        } catch (error) {
            return {
                valid: false,
                error: error instanceof Error ? error.message : 'Syntax check failed'
            };
        }
    }
}

export const codeExecutionService = new CodeExecutionService();
