// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  "projectId": "finlit-classroom",
  "appId": "1:388933518275:web:9f1e38cb6dca37a8437376",
  "storageBucket": "finlit-classroom.appspot.com",
  "apiKey": "AIzaSyBT3glJaZlpOozoZc9aL0CIJhpyO17uiMI",
  "authDomain": "finlit-classroom.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "388933518275"
};


// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, app, storage };
