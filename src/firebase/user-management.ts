import { User } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc, collection, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { PRESET_EXPENSE_CATEGORIES } from '@/lib/transaction-categories';

// This function ensures that at least the "Otro" category exists.
// All other categories are fully managed by the user.
async function initializeDefaultTaskCategories(user: User, firestore: any, batch: any) {
    const taskCategoriesRef = collection(firestore, 'users', user.uid, 'taskCategories');
    const q = query(taskCategoriesRef, where('name', '==', 'Otro'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        const otroCategoryRef = doc(taskCategoriesRef);
        batch.set(otroCategoryRef, {
            name: 'Otro',
            isActive: true,
            userId: user.uid,
            budgetFocus: 'Deseos',
        });
    }
}

export const handleUserLogin = async (user: User, firestore: any, displayName?: string) => {
    if (!user) return;
    const userRef = doc(firestore, 'users', user.uid);
    const batch = writeBatch(firestore);
    
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
        // Create user profile
        const userProfileData = {
            displayName: displayName || user.displayName || user.email?.split('@')[0],
            email: user.email,
            photoURL: user.photoURL,
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
        };
        batch.set(userRef, userProfileData);

        // Initialize default task categories for new user
        await initializeDefaultTaskCategories(user, firestore, batch);

    } else {
        batch.update(userRef, { lastLoginAt: serverTimestamp() });
        // Also check and initialize categories for existing users who might not have it
        await initializeDefaultTaskCategories(user, firestore, batch);
    }
    
    await batch.commit();
};
