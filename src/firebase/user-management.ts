import { User } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc, collection, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { PRESET_EXPENSE_CATEGORIES } from '@/lib/transaction-categories';
import { defaultFeelings, defaultInfluences } from '@/lib/moods';

async function initializeDefaultTaskCategories(user: User, firestore: any, batch: any) {
    const taskCategoriesRef = collection(firestore, 'users', user.uid, 'taskCategories');
    const tasksRef = collection(firestore, 'users', user.uid, 'tasks');

    const tasksSnapshot = await getDocs(tasksRef);
    const existingTaskCategories = new Set(tasksSnapshot.docs.map(doc => doc.data().category));

    existingTaskCategories.add("Otro");

    const categoriesSnapshot = await getDocs(taskCategoriesRef);
    const definedCategories = new Set(categoriesSnapshot.docs.map(doc => doc.data().name));

    const missingCategories = [...existingTaskCategories].filter(cat => !definedCategories.has(cat));

    missingCategories.forEach(categoryName => {
        if (categoryName) {
            const newCategoryRef = doc(taskCategoriesRef);
            batch.set(newCategoryRef, {
                name: categoryName,
                isActive: true,
                userId: user.uid,
                budgetFocus: 'Deseos',
            });
        }
    });
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
        
        // This is a new user, so also initialize mood options
        await initializeDefaultMoodOptions(user, firestore, batch);

    } else {
        batch.update(userRef, { lastLoginAt: serverTimestamp() });
    }
    
    await initializeDefaultTaskCategories(user, firestore, batch);

    await batch.commit();
};
