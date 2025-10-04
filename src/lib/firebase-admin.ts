
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    storageBucket: 'finlit-classroom.appspot.com'
  });
}

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

export { db, auth, storage };
