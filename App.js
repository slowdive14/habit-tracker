import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from './firebase';
import HabitTracker from './HabitTracker';

const App = () => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    // Network status detection
    window.addEventListener('online', () => {
      console.log('You are now online!');
      if (user) {
        loadHabitData();
      }
    });

    window.addEventListener('offline', () => {
      console.log('You are now offline.');
      alert('You are offline. Habit data is unavailable.');
    });

    return () => {
      window.removeEventListener('online', () => {});
      window.removeEventListener('offline', () => {});
    };
  }, [user]);

  const handleLogin = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log('Logged in successfully');
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please check your credentials and try again.');
    }
  };

  const handleSignup = async (email, password) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      console.log('Signed up successfully');
    } catch (error) {
      console.error('Signup error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('This email is already in use. Please use a different email.');
      } else {
        setError('Signup failed. Please try again.');
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const saveHabitData = async (data) => {
    if (user) {
      const userDoc = doc(db, "users", user.uid);
      try {
        await setDoc(userDoc, { habitData: data }, { merge: true });
        console.log('Data saved successfully');
      } catch (error) {
        console.error('Error saving data:', error);
      }
    }
  };

  const loadHabitData = async () => {
    if (user) {
      const userDoc = doc(db, "users", user.uid);
      try {
        const docSnap = await getDoc(userDoc);
        if (docSnap.exists()) {
          console.log('Data loaded successfully:', docSnap.data().habitData);
          return docSnap.data().habitData;
        } else {
          console.log("No such document!");
        }
      } catch (error) {
        if (error.code === 'unavailable') {
          console.error('You are offline. Data cannot be loaded.');
          alert('You are offline. Habit data is unavailable.');
        } else {
          console.error('Error loading data:', error);
        }
      }
    }
    return null;
  };

  return (
    <div>
      {!user ? (
        <div>
          <h1>Login</h1>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <input type="email" placeholder="Email" id="email" />
          <input type="password" placeholder="Password" id="password" />
          <button onClick={() => handleLogin(document.getElementById('email').value, document.getElementById('password').value)}>Login</button>
          <button onClick={() => handleSignup(document.getElementById('email').value, document.getElementById('password').value)}>Signup</button>
        </div>
      ) : (
        <div>
          <button onClick={handleLogout}>Logout</button>
          <HabitTracker 
            saveHabitData={saveHabitData} 
            loadHabitData={loadHabitData} 
          />
        </div>
      )}
    </div>
  );
};

export default App;