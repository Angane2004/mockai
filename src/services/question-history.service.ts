// question-history.service.ts
// Tracks which questions have already been asked to a user across all their interviews.
// This prevents the AI from repeating the same questions in future sessions.
// Data is stored in Firestore under the "userQuestionHistory" collection.

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

class QuestionHistoryService {
    private readonly COLLECTION_NAME = 'userQuestionHistory';

    // Returns a flat list of all questions this user has been asked before
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

    // Saves all questions asked in a completed interview session
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

    // Filters out questions the user has already seen.
    // Normalizes text before comparing so minor wording differences are caught.
    filterUnaskedQuestions(
        allQuestions: string[],
        askedQuestions: string[]
    ): string[] {
        if (askedQuestions.length === 0) {
            return allQuestions;
        }

        // Lowercase + trim + remove punctuation for fair comparison
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

    // Returns stats on how many questions the user has been asked, broken down by interview type
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

    // Soft-deletes all history for a user by setting deleted:true (doesn't actually remove docs)
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

// Singleton — import this wherever you need to read or write question history
export const questionHistoryService = new QuestionHistoryService();
