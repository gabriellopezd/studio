import { User } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc, collection, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { PRESET_EXPENSE_CATEGORIES } from '@/lib/transaction-categories';

const DEFAULT_TASK_CATEGORIES = ['MinJusticia', 'CNMH', 'Proyectos Personales', 'Otro'];

async function initializeDefaultTaskCategories(user: User, firestore: any, batch: any) {
    const taskCategoriesRef = collection(firestore, 'users', user.uid, 'taskCategories');
    const q = query(taskCategoriesRef, where('name', 'in', DEFAULT_TASK_CATEGORIES));
    const snapshot = await getDocs(q);
    const existingNames = snapshot.docs.map(doc => doc.data().name);

    const missingCategories = DEFAULT_TASK_CATEGORIES.filter(name => !existingNames.includes(name));

    missingCategories.forEach(name => {
        const newCategoryRef = doc(taskCategoriesRef);
        batch.set(newCategoryRef, {
            name: name,
            isActive: true,
            userId: user.uid,
            budgetFocus: 'Necesidades',
        });
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

        // Initialize default task categories
        await initializeDefaultTaskCategories(user, firestore, batch);

    } else {
        batch.update(userRef, { lastLoginAt: serverTimestamp() });
        // Also check and initialize categories for existing users
        await initializeDefaultTaskCategories(user, firestore, batch);
    }
    
    await batch.commit();
};
