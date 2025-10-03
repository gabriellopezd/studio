import { User } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc, collection, writeBatch, query, where, getDocs, limit } from 'firebase/firestore';
import { PRESET_EXPENSE_CATEGORIES } from '@/lib/transaction-categories';
import { defaultFeelings, defaultInfluences } from '@/lib/moods';
import { PRESET_TASK_CATEGORIES } from '@/lib/task-categories';

async function initializeDefaultTaskCategories(user: User, firestore: any, batch: any) {
    const taskCategoriesRef = collection(firestore, 'users', user.uid, 'taskCategories');
    const categoriesSnapshot = await getDocs(query(taskCategoriesRef, limit(1)));

    // Only initialize if the collection is empty
    if (categoriesSnapshot.empty) {
        PRESET_TASK_CATEGORIES.forEach(categoryName => {
            if (categoryName) {
                const newCategoryRef = doc(taskCategoriesRef);
                batch.set(newCategoryRef, {
                    name: categoryName,
                    isActive: true,
                    userId: user.uid,
                });
            }
        });
    }
}

async function initializeDefaultMoodOptions(user: User, firestore: any, batch: any) {
    // Check for feelings
    const feelingsRef = collection(firestore, 'users', user.uid, 'feelings');
    const feelingsSnap = await getDocs(query(feelingsRef, limit(1)));
    if (feelingsSnap.empty) {
        defaultFeelings.forEach(feeling => {
            const newFeelingRef = doc(feelingsRef);
            batch.set(newFeelingRef, { ...feeling, userId: user.uid, isActive: true });
        });
    }

    // Check for influences
    const influencesRef = collection(firestore, 'users', user.uid, 'influences');
    const influencesSnap = await getDocs(query(influencesRef, limit(1)));
    if (influencesSnap.empty) {
        defaultInfluences.forEach(influence => {
            const newInfluenceRef = doc(influencesRef);
            batch.set(newInfluenceRef, { ...influence, userId: user.uid, isActive: true });
        });
    }
}

async function initializeDefaultBudgets(user: User, firestore: any, batch: any) {
    const budgetsRef = collection(firestore, 'users', user.uid, 'budgets');
    const budgetsSnapshot = await getDocs(query(budgetsRef, limit(1)));

    if (budgetsSnapshot.empty) {
        PRESET_EXPENSE_CATEGORIES.forEach(categoryName => {
            const newBudgetRef = doc(budgetsRef);
            batch.set(newBudgetRef, {
                categoryName: categoryName,
                monthlyLimit: 1000000,
                currentSpend: 0,
                userId: user.uid,
            });
        });
    }
}


export const handleUserLogin = async (user: User, firestore: any, displayName?: string) => {
    if (!user) return;
    const userRef = doc(firestore, 'users', user.uid);
    const batch = writeBatch(firestore);
    
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
        const userProfileData = {
            displayName: displayName || user.displayName || user.email?.split('@')[0],
            email: user.email,
            photoURL: user.photoURL,
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
        };
        batch.set(userRef, userProfileData);
        
        // This is a new user, so initialize everything
        await initializeDefaultTaskCategories(user, firestore, batch);
        await initializeDefaultMoodOptions(user, firestore, batch);
        await initializeDefaultBudgets(user, firestore, batch);

    } else {
        batch.update(userRef, { lastLoginAt: serverTimestamp() });
        // Also check for existing users who might not have the default options
        await initializeDefaultTaskCategories(user, firestore, batch);
        await initializeDefaultMoodOptions(user, firestore, batch);
        await initializeDefaultBudgets(user, firestore, batch);
    }

    await batch.commit();
};
