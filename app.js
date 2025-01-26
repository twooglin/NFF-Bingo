import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";

const CLIENT_ID = 'b95b505ced454db2a08dc886d60b55b2'; // Spotify Client ID
let accessToken = '';

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDrZyLpn4AbLiBFxKAUwhP_IRh9IpNTHgo",
    authDomain: "nff-bingo.firebaseapp.com",
    databaseURL: "https://nff-bingo-default-rtdb.firebaseio.com",
    projectId: "nff-bingo",
    storageBucket: "nff-bingo.firebasestorage.app",
    messagingSenderId: "6806365159",
    appId: "1:6806365159:web:94ef8b9bf6671f317b1342",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Automatically sign in users anonymously
signInAnonymously(auth).catch((error) => {
    console.error('Anonymous login failed:', error);
});

// Handle user state changes
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('User signed in:', user);
        loadBingoBoard(user.uid);
    } else {
        console.log('No user signed in');
    }
});

// Generate the Bingo Board
function generateBingoBoard() {
    const board = document.getElementById('bingo-board');
    board.innerHTML = ""; // Clear existing board

    for (let i = 0; i < 25; i++) {
        const square = document.createElement("div");
        square.className = "bingo-square";
        square.dataset.index = i;
        if (i === 12) {
            const logo = document.createElement("img");
            logo.src = "NFF_logo.jpg";
            logo.style.width = "100%";
            logo.style.height = "100%";
            square.appendChild(logo);
        } else {
            addSearchBar(square);
        }
        board.appendChild(square);
    }
}

// Add Search Bar for Artist Querying
function addSearchBar(square) {
    square.innerHTML = ""; // Clear square
    const searchInput = document.createElement("input");
    searchInput.className = "artist-search";
    searchInput.placeholder = "Type artist name";
    searchInput.oninput = () => searchArtists(searchInput, square);
    square.appendChild(searchInput);
    searchInput.focus();
}

// Query Spotify Artists
async function searchArtists(input, square) {
    if (input.value.length < 2) return;

    const response = await fetch(
        `https://api.spotify.com/v1/search?q=${input.value}&type=artist`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await response.json();

    const dropdown = document.createElement("div");
    dropdown.className = "dropdown";

    data.artists.items.forEach((artist) => {
        const option = document.createElement("div");
        option.className = "dropdown-option";
        option.textContent = artist.name;
        option.onclick = () => selectArtist(artist, square);
        dropdown.appendChild(option);
    });

    square.appendChild(dropdown);
}

// Select Artist and Save
function selectArtist(artist, square) {
    square.innerHTML = "";
    const artistName = document.createElement("div");
    artistName.textContent = artist.name;
    square.appendChild(artistName);

    // Save artist data locally or to Firebase
    saveBingoBoard(auth.currentUser.uid);
}

// Save Bingo Board to Firebase
function saveBingoBoard(userId) {
    const board = document.querySelectorAll('.bingo-square');
    const boardData = {};

    board.forEach((square) => {
        const index = square.dataset.index;
        const artist = square.textContent.trim();
        if (artist) {
            boardData[index] = artist;
        }
    });

    set(ref(database, `users/${userId}/bingoBoard`), boardData)
        .then(() => console.log('Bingo board saved successfully!'))
        .catch((error) => console.error('Error saving bingo board:', error));
}

// Load Bingo Board from Firebase
function loadBingoBoard(userId) {
    const boardRef = ref(database, `users/${userId}/bingoBoard`);
    get(boardRef)
        .then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const squares = document.querySelectorAll('.bingo-square');
                for (const [index, artist] of Object.entries(data)) {
                    const square = squares[index];
                    square.innerHTML = `<div>${artist}</div>`;
                }
            }
        })
        .catch((error) => console.error('Error loading bingo board:', error));
}

window.onload = () => {
    generateBingoBoard();
};

