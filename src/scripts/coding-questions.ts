export interface TestCase {
    input: any;
    expectedOutput: any;
    isHidden: boolean;
}

export interface CodingQuestion {
    id: string;
    title: string;
    description: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    timeLimit: number; // in minutes
    testCases: TestCase[];
    starterCode: Record<string, string>; // language -> code template
    constraints: string[];
    tags: string[];
}

export const CODING_QUESTIONS: CodingQuestion[] = [
    // ===== EASY QUESTIONS =====
    {
        id: 'easy_1',
        title: 'Two Sum',
        description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

**Example 1:**
\`\`\`
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
\`\`\`

**Example 2:**
\`\`\`
Input: nums = [3,2,4], target = 6
Output: [1,2]
\`\`\``,
        difficulty: 'Easy',
        timeLimit: 15,
        testCases: [
            { input: { nums: [2, 7, 11, 15], target: 9 }, expectedOutput: [0, 1], isHidden: false },
            { input: { nums: [3, 2, 4], target: 6 }, expectedOutput: [1, 2], isHidden: false },
            { input: { nums: [3, 3], target: 6 }, expectedOutput: [0, 1], isHidden: false },
            { input: { nums: [1, 5, 3, 7, 9], target: 12 }, expectedOutput: [2, 4], isHidden: true },
            { input: { nums: [-1, 0, 1, 2], target: 1 }, expectedOutput: [0, 3], isHidden: true },
        ],
        starterCode: {
            python: `def twoSum(nums, target):
    # Write your code here
    pass`,
            java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your code here
        
    }
}`,
            cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Write your code here
        
    }
};`,
            c: `int* twoSum(int* nums, int numsSize, int target, int* returnSize) {
    // Write your code here
    
}`,
            javascript: `function twoSum(nums, target) {
    // Write your code here
    
}`
        },
        constraints: [
            '2 <= nums.length <= 10^4',
            '-10^9 <= nums[i] <= 10^9',
            '-10^9 <= target <= 10^9',
            'Only one valid answer exists'
        ],
        tags: ['array', 'hash-table']
    },
    {
        id: 'easy_2',
        title: 'Palindrome Number',
        description: `Given an integer \`x\`, return \`true\` if \`x\` is a palindrome, and \`false\` otherwise.

**Example 1:**
\`\`\`
Input: x = 121
Output: true
Explanation: 121 reads as 121 from left to right and from right to left.
\`\`\`

**Example 2:**
\`\`\`
Input: x = -121
Output: false
Explanation: From left to right, it reads -121. From right to left, it becomes 121-. Therefore it is not a palindrome.
\`\`\``,
        difficulty: 'Easy',
        timeLimit: 10,
        testCases: [
            { input: { x: 121 }, expectedOutput: true, isHidden: false },
            { input: { x: -121 }, expectedOutput: false, isHidden: false },
            { input: { x: 10 }, expectedOutput: false, isHidden: false },
            { input: { x: 12321 }, expectedOutput: true, isHidden: true },
            { input: { x: 0 }, expectedOutput: true, isHidden: true },
        ],
        starterCode: {
            python: `def isPalindrome(x):
    # Write your code here
    pass`,
            java: `class Solution {
    public boolean isPalindrome(int x) {
        // Write your code here
        
    }
}`,
            cpp: `class Solution {
public:
    bool isPalindrome(int x) {
        // Write your code here
        
    }
};`,
            c: `bool isPalindrome(int x) {
    // Write your code here
    
}`,
            javascript: `function isPalindrome(x) {
    // Write your code here
    
}`
        },
        constraints: [
            '-2^31 <= x <= 2^31 - 1'
        ],
        tags: ['math']
    },

    // ===== MEDIUM QUESTIONS =====
    {
        id: 'medium_1',
        title: 'Longest Substring Without Repeating Characters',
        description: `Given a string \`s\`, find the length of the **longest substring** without repeating characters.

**Example 1:**
\`\`\`
Input: s = "abcabcbb"
Output: 3
Explanation: The answer is "abc", with the length of 3.
\`\`\`

**Example 2:**
\`\`\`
Input: s = "bbbbb"
Output: 1
Explanation: The answer is "b", with the length of 1.
\`\`\``,
        difficulty: 'Medium',
        timeLimit: 20,
        testCases: [
            { input: { s: "abcabcbb" }, expectedOutput: 3, isHidden: false },
            { input: { s: "bbbbb" }, expectedOutput: 1, isHidden: false },
            { input: { s: "pwwkew" }, expectedOutput: 3, isHidden: false },
            { input: { s: "dvdf" }, expectedOutput: 3, isHidden: true },
            { input: { s: "" }, expectedOutput: 0, isHidden: true },
        ],
        starterCode: {
            python: `def lengthOfLongestSubstring(s):
    # Write your code here
    pass`,
            java: `class Solution {
    public int lengthOfLongestSubstring(String s) {
        // Write your code here
        
    }
}`,
            cpp: `class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        // Write your code here
        
    }
};`,
            c: `int lengthOfLongestSubstring(char* s) {
    // Write your code here
    
}`,
            javascript: `function lengthOfLongestSubstring(s) {
    // Write your code here
    
}`
        },
        constraints: [
            '0 <= s.length <= 5 * 10^4',
            's consists of English letters, digits, symbols and spaces'
        ],
        tags: ['string', 'sliding-window', 'hash-table']
    },

    // ===== HARD QUESTIONS =====
    {
        id: 'hard_1',
        title: 'Median of Two Sorted Arrays',
        description: `Given two sorted arrays \`nums1\` and \`nums2\` of size \`m\` and \`n\` respectively, return **the median** of the two sorted arrays.

The overall run time complexity should be **O(log (m+n))**.

**Example 1:**
\`\`\`
Input: nums1 = [1,3], nums2 = [2]
Output: 2.00000
Explanation: merged array = [1,2,3] and median is 2.
\`\`\`

**Example 2:**
\`\`\`
Input: nums1 = [1,2], nums2 = [3,4]
Output: 2.50000
Explanation: merged array = [1,2,3,4] and median is (2 + 3) / 2 = 2.5.
\`\`\``,
        difficulty: 'Hard',
        timeLimit: 30,
        testCases: [
            { input: { nums1: [1, 3], nums2: [2] }, expectedOutput: 2.0, isHidden: false },
            { input: { nums1: [1, 2], nums2: [3, 4] }, expectedOutput: 2.5, isHidden: false },
            { input: { nums1: [0, 0], nums2: [0, 0] }, expectedOutput: 0.0, isHidden: true },
            { input: { nums1: [], nums2: [1] }, expectedOutput: 1.0, isHidden: true },
            { input: { nums1: [2], nums2: [] }, expectedOutput: 2.0, isHidden: true },
        ],
        starterCode: {
            python: `def findMedianSortedArrays(nums1, nums2):
    # Write your code here
    pass`,
            java: `class Solution {
    public double findMedianSortedArrays(int[] nums1, int[] nums2) {
        // Write your code here
        
    }
}`,
            cpp: `class Solution {
public:
    double findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {
        // Write your code here
        
    }
};`,
            c: `double findMedianSortedArrays(int* nums1, int nums1Size, int* nums2, int nums2Size) {
    // Write your code here
    
}`,
            javascript: `function findMedianSortedArrays(nums1, nums2) {
    // Write your code here
    
}`
        },
        constraints: [
            'nums1.length == m',
            'nums2.length == n',
            '0 <= m <= 1000',
            '0 <= n <= 1000',
            '1 <= m + n <= 2000',
            '-10^6 <= nums1[i], nums2[i] <= 10^6'
        ],
        tags: ['array', 'binary-search', 'divide-and-conquer']
    },
];

// Helper function to get questions by difficulty
export function getCodingQuestionsByDifficulty(difficulty: 'Easy' | 'Medium' | 'Hard'): CodingQuestion[] {
    return CODING_QUESTIONS.filter(q => q.difficulty === difficulty);
}

// Helper function to get random question by difficulty
export function getRandomCodingQuestion(difficulty: 'Easy' | 'Medium' | 'Hard'): CodingQuestion | null {
    const questions = getCodingQuestionsByDifficulty(difficulty);
    if (questions.length === 0) return null;
    return questions[Math.floor(Math.random() * questions.length)];
}
