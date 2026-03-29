import { db } from '@/config/firebase.config';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    serverTimestamp,
    updateDoc,
    doc
} from 'firebase/firestore';

/**
 * Service to track and prevent repetitive interview questions
 */
class QuestionHistoryService {
    private readonly COLLECTION_NAME = 'userQuestionHistory';

    /**
     * Get all previously asked questions for a user
     */
    async getUserAskedQuestions(userId: string): Promise<string[]> {
        try {
            const q = query(
                collection(db, this.COLLECTION_NAME),
                where('userId', '==', userId)
            );

            const querySnapshot = await getDocs(q);
            const askedQuestions: string[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.questions && Array.isArray(data.questions)) {
                    askedQuestions.push(...data.questions);
                }
            });

            console.log(`📚 Found ${askedQuestions.length} previously asked questions for user ${userId}`);
            return askedQuestions;
        } catch (error) {
            console.error('Error fetching user question history:', error);
            return [];
        }
    }

    /**
     * Save asked questions for an interview
     */
    async saveAskedQuestions(
        userId: string,
        interviewId: string,
        questions: string[],
        interviewType: string
    ): Promise<void> {
        try {
            await addDoc(collection(db, this.COLLECTION_NAME), {
                userId,
                interviewId,
                questions,
                interviewType,
                askedAt: serverTimestamp()
            });

            console.log(`✅ Saved ${questions.length} questions to history for user ${userId}`);
        } catch (error) {
            console.error('Error saving question history:', error);
        }
    }

    /**
     * Filter out already asked questions from a list
     */
    filterUnaskedQuestions(
        allQuestions: string[],
        askedQuestions: string[]
    ): string[] {
        if (askedQuestions.length === 0) {
            return allQuestions;
        }

        // Normalize questions for comparison (lowercase, trim, remove punctuation)
        const normalizeQuestion = (q: string) =>
            q.toLowerCase().trim().replace(/[?.!,]/g, '');

        const askedSet = new Set(askedQuestions.map(normalizeQuestion));

        const unasked = allQuestions.filter(q => {
            const normalized = normalizeQuestion(q);
            return !askedSet.has(normalized);
        });

        console.log(`🔍 Filtered questions: ${allQuestions.length} total → ${unasked.length} unasked`);
        return unasked;
    }

    /**
     * Get statistics on question usage
     */
    async getQuestionStats(userId: string): Promise<{
        totalAsked: number;
        uniqueQuestions: number;
        byType: Record<string, number>;
    }> {
        try {
            const q = query(
                collection(db, this.COLLECTION_NAME),
                where('userId', '==', userId)
            );

            const querySnapshot = await getDocs(q);
            const allQuestions: string[] = [];
            const byType: Record<string, number> = {};

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.questions && Array.isArray(data.questions)) {
                    allQuestions.push(...data.questions);

                    const type = data.interviewType || 'Unknown';
                    byType[type] = (byType[type] || 0) + data.questions.length;
                }
            });

            const uniqueQuestions = new Set(allQuestions.map(q => q.toLowerCase().trim())).size;

            return {
                totalAsked: allQuestions.length,
                uniqueQuestions,
                byType
            };
        } catch (error) {
            console.error('Error getting question stats:', error);
            return { totalAsked: 0, uniqueQuestions: 0, byType: {} };
        }
    }

    /**
     * Clear question history for a user (useful for testing or reset)
     */
    async clearUserHistory(userId: string): Promise<void> {
        try {
            const q = query(
                collection(db, this.COLLECTION_NAME),
                where('userId', '==', userId)
            );

            const querySnapshot = await getDocs(q);
            const deletePromises = querySnapshot.docs.map(doc =>
                updateDoc(doc.ref, { deleted: true })
            );

            await Promise.all(deletePromises);
            console.log(`🗑️ Cleared question history for user ${userId}`);
        } catch (error) {
            console.error('Error clearing question history:', error);
        }
    }
}

export const questionHistoryService = new QuestionHistoryService();
