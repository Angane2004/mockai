// code-execution.service.ts
// Sends user code to the Judge0 API (via RapidAPI) for execution in a sandbox.
// Works by submitting code → getting a token → polling until result is ready.
// If no API key is set, it falls back to mock results for development.

const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com';
const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY || '';

// Judge0 language IDs — each language has a fixed ID on their platform
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
    isHidden: boolean;  // Hidden cases aren't shown to the user
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

    // Step 1: Submit code to Judge0 — returns a token to check the result later
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
                cpu_time_limit: 5,      // Max 5 seconds
                memory_limit: 128000,   // Max 128 MB
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to submit code: ${response.statusText}`);
        }

        return await response.json();
    }

    // Step 2: Poll Judge0 until execution is done (status ID > 2 means finished)
    // Status IDs: 1 = queued, 2 = running, 3 = accepted, 4+ = some kind of error
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

            if (result.status.id > 2) {
                return result;
            }

            // Wait 1 second before trying again
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        throw new Error('Execution timeout - please try again');
    }

    // Normalizes output before comparing — trims whitespace and lowercases
    private normalizeOutput(output: string): string {
        return output.trim().toLowerCase().replace(/\s+/g, ' ');
    }

    // Returns true if actual output matches expected output (after normalization)
    private compareOutputs(actual: any, expected: any): boolean {
        const actualStr = String(actual);
        const expectedStr = String(expected);

        return this.normalizeOutput(actualStr) === this.normalizeOutput(expectedStr);
    }

    // Runs the user's code against all test cases and returns pass/fail results
    async runTests(
        code: string,
        language: string,
        testCases: TestCase[]
    ): Promise<ExecutionResult> {
        const languageId = LANGUAGE_IDS[language as keyof typeof LANGUAGE_IDS];

        if (!languageId) {
            throw new Error(`Unsupported language: ${language}`);
        }

        // No API key — use mock results so the feature still works in dev
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
                const stdin = typeof testCase.input === 'object'
                    ? JSON.stringify(testCase.input)
                    : String(testCase.input);

                const { token } = await this.submitCode(code, languageId, stdin);
                const result = await this.getSubmissionResult(token);

                const executionTime = parseFloat(result.time) * 1000 || 0;
                const memory = result.memory || 0;

                totalTime += executionTime;
                totalMemory += memory;

                const actualOutput = result.stdout || result.stderr || '';
                // Test passes only if Judge0 returned "Accepted" AND the output matches
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

    // Used when no API key is set — simulates test results for demo/testing
    private async runMockTests(testCases: TestCase[]): Promise<ExecutionResult> {
        console.log('🎭 Using mock test execution (no API key)');

        await new Promise(resolve => setTimeout(resolve, 1500));

        const testResults: TestResult[] = testCases.map((testCase, index) => {
            const passed = index < 2 || Math.random() > 0.5; // First 2 always pass

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

    // Does a compile-only check without running the code — used for syntax validation
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

// Singleton — import this instance wherever you need to run or check code
export const codeExecutionService = new CodeExecutionService();
