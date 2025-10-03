import { User } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc, collection, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { PRESET_EXPENSE_CATEGORIES } from '@/lib/transaction-categories';

async function initializeDefaultTaskCategories(user: User, firestore: any, batch: any) {
    const taskCategoriesRef = collection(firestore, 'users', user.uid, 'taskCategories');
    const tasksRef = collection(firestore, 'users', user.uid, 'tasks');

    // 1. Get all unique categories from existing tasks
    const tasksSnapshot = await getDocs(tasksRef);
    const existingTaskCategories = new Set(tasksSnapshot.docs.map(doc => doc.data().category));

    // 2. Ensure "Otro" is in the set
    existingTaskCategories.add("Otro");

    // 3. Get all categories that are already in the taskCategories collection
    const categoriesSnapshot = await getDocs(taskCategoriesRef);
    const definedCategories = new Set(categoriesSnapshot.docs.map(doc => doc.data().name));

    // 4. Find which categories from tasks are missing in the collection
    const missingCategories = [...existingTaskCategories].filter(cat => !definedCategories.has(cat));

    // 5. Batch-write the missing categories
    missingCategories.forEach(categoryName => {
        if (categoryName) { // Ensure category name is not empty
            const newCategoryRef = doc(taskCategoriesRef);
            batch.set(newCategoryRef, {
                name: categoryName,
                isActive: true,
                userId: user.uid,
                budgetFocus: 'Deseos', // Default value
            });
        }
    });
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
    } else {
        batch.update(userRef, { lastLoginAt: serverTimestamp() });
    }
    
    // Always run the category initialization/migration logic on login
    await initializeDefaultTaskCategories(user, firestore, batch);

    await batch.commit();
};
