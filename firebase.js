import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyAarOk7ApcQ7LzIBqeS2lmFmIHJQhmb_Es",
    authDomain: "habit-tracker-f9d25.firebaseapp.com",
    databaseURL: "https://habit-tracker-f9d25-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "habit-tracker-f9d25",
    storageBucket: "habit-tracker-f9d25.appspot.com",
    messagingSenderId: "627010599884",
    appId: "1:627010599884:web:4733f8522c3048fa4c7b69",
    measurementId: "G-FBR61QG7GQ"
  };



const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

enableIndexedDbPersistence(db, { synchronizeTabs: true })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time.
      console.error('Firestore persistence error: Multiple tabs open.');
    } else if (err.code === 'unimplemented') {
      // The current browser does not support all of the features required to enable persistence
      console.error('Firestore persistence error: The current browser does not support persistence.');
    }
  });

const auth = getAuth(app);

export { app, db, auth };