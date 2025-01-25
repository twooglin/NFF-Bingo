const CLIENT_ID = 'YOUR_SPOTIFY_CLIENT_ID'; // Replace with your actual Spotify Client ID
const REDIRECT_URI = 'https://twooglin.github.io/NFF-Bingo/'; 
let accessToken = '';
let selectedArtists = new Set(); 

// Import the necessary Firebase modules
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref, set, get } from 'firebase/database';

// Your Firebase configuration (replace with your actual config)
const firebaseConfig = {
    apiKey: "AIzaSyDrZyLpn4AbLiBFxKAUwhP_IRh9IpNTHgo",
    authDomain: "nff-bingo.firebaseapp.com",
    projectId: "nff-bingo",
    storageBucket: "nff-bingo.firebasestorage.app",
    messagingSenderId: "6806365159",
    appId: "1:6806365159:web:94ef8b9bf6671f317b1342",
    measurementId: "G-QVDE9RTWSB"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Example: List of officially announced artists - update with the actual lineup
let announcedArtists = ['Taylor Swift', 'Phoebe Bridgers', 'The Lumineers', /* ...more artists */ ]; 

// Call these functions when the user clicks the sign-up/sign-in buttons
function handleSignUp(email, password) {
  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      console.log('User created:', user);
      // Optionally redirect to another page or update UI
    })
    .catch((error) => {
      console.error('Error creating user:', error);
      // Display error message to the user
    });
}

function handleSignIn(email, password) {
  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      console.log('User signed in:', user);
      // Optionally redirect to another page or update UI
    })
    .catch((error) => {
      console.error('Error signing in:', error);
      // Display error message to the user
    });
}

window.onload = async () => {
  getAccessToken();
  toggleLoginButton();
  generateBingoBoard();
  highlightCorrectSquares();

  // Monitor authentication state changes
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('User is signed in:', user);
      loadResults(); // Load the user's data when they sign in
    } else {
      console.log('User is signed out');
      // Optionally show a sign-in/sign-up form
    }
  });
};

// Toggle Spotify login button visibility
function toggleLoginButton() {
  // ... (your existing toggleLoginButton function)
}

// Get Access Token and Fetch User Info
function getAccessToken() {
  // ... (your existing getAccessToken function)
}

async function fetchSpotifyProfile() {
  // ... (your existing fetchSpotifyProfile function)
}

function displayUserInfo(profile) {
  // ... (your existing displayUserInfo function)
}

// Generate Bingo Board
function generateBingoBoard() {
  // ... (your existing generateBingoBoard function)
}

// Add Search Bar to Square
function addSearchBar(square) {
  // ... (your existing addSearchBar function)
}

// Search Artists and Display Dropdown
async function searchArtists(input, square) {
  // ... (your existing searchArtists function)
}

// Select an Artist
function selectArtist(artist, square) {
  // ... (your existing selectArtist function)
  saveResults(); // Save the results to Firebase
}

// Highlight Correct Squares
function highlightCorrectSquares() {
  // ... (your existing highlightCorrectSquares function)
}

// Function to save results to Firebase
function saveResults() {
  const squares = document.querySelectorAll('.bingo-square');
  const results = {};

  squares.forEach((square) => {
    const artistName = square.dataset.artist;
    if (artistName) {
      const index = square.dataset.index;
      results[index] = artistName;
    }
  });

  const user = auth.currentUser;
  if (user) {
    const userId = user.uid;
    set(ref(database, `users/${userId}/bingoCard`), results)
      .then(() => console.log('Results saved to Firebase!'))
      .catch((error) => console.error('Error saving results:', error));
  }
}

// Function to load results from Firebase
function loadResults() {
  const user = auth.currentUser;
  if (user) {
    const userId = user.uid;
    const resultsRef = ref(database, `users/${userId}/bingoCard`);
    get(resultsRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const results = snapshot.val();
          const squares = document.querySelectorAll('.bingo-square');

          squares.forEach((square) => {
            const index = square.dataset.index;
            const artistName = results[index];
            if (artistName) {
              // Since we're only storing artist names, you'll need to fetch the image again
              fetch(`https://api.spotify.com/v1/search?q=${artistName}&type=artist`, {
                headers: { Authorization: `Bearer ${accessToken}` }
              })
              .then(response => response.json())
              .then(data => {
                const artist = { name: artistName, images: data.artists.items[0].images }; 
                selectArtist(artist, square);
              })
              .catch(error => console.error('Error fetching artist details:', error));
            }
          });
        }
      })
      .catch((error) => console.error('Error loading results:', error));
  }
}
