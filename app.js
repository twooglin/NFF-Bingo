import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithPopup, SpotifyAuthProvider } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";

const CLIENT_ID = 'b95b505ced454db2a08dc886d60b55b2';
const REDIRECT_URI = 'https://twooglin.github.io/NFF-Bingo/';
let accessToken = '';
let selectedArtists = new Set();

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDrZyLpn4AbLiBFxKAUwhP_IRh9IpNTHgo",
    authDomain: "nff-bingo.firebaseapp.com",
    projectId: "nff-bingo",
    storageBucket: "nff-bingo.firebasestorage.app",
    messagingSenderId: "6806365159",
    appId: "1:6806365159:web:94ef8b9bf6671f317b1342",
    measurementId: "G-QVDE9RTWSB",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const provider = new SpotifyAuthProvider();

window.onload = () => {
    toggleLoginButton();
    generateBingoBoard();

    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("User is logged in:", user);
            loadResults();
        } else {
            console.log("User is logged out");
        }
    });

    document.getElementById("save-button").addEventListener("click", () => {
        saveResults();
        showSaveMessage("Bingo board saved!");
    });
};

function toggleLoginButton() {
    const loginButton = document.getElementById("login");
    if (auth.currentUser) {
        loginButton.style.display = "none";
    } else {
        loginButton.style.display = "block";
        loginButton.onclick = handleSpotifyLogin;
    }
}

function handleSpotifyLogin() {
    signInWithPopup(auth, provider)
        .then((result) => {
            const credential = SpotifyAuthProvider.credentialFromResult(result);
            accessToken = credential.accessToken;
            toggleLoginButton();
            fetchSpotifyProfile();
        })
        .catch((error) => console.error("Spotify login error:", error));
}

async function fetchSpotifyProfile() {
    try {
        const response = await fetch("https://api.spotify.com/v1/me", {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        const profile = await response.json();
        localStorage.setItem("spotifyUserProfile", JSON.stringify(profile));
        console.log("Spotify profile:", profile);
    } catch (error) {
        console.error("Error fetching Spotify profile:", error);
    }
}

function generateBingoBoard() {
    const board = document.getElementById("bingo-board");
    if (!board) {
        console.error("Bingo board container not found");
        return;
    }
    board.innerHTML = "";
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

function addSearchBar(square) {
    square.innerHTML = "";
    const searchInput = document.createElement("input");
    searchInput.className = "artist-search";
    searchInput.placeholder = "Type artist name";
    searchInput.oninput = () => searchArtists(searchInput, square);
    square.appendChild(searchInput);
    searchInput.focus();
}

async function searchArtists(input, square) {
    if (input.value.length < 2) return;
    try {
        const response = await fetch(`https://api.spotify.com/v1/search?q=${input.value}&type=artist`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await response.json();
        const dropdown = document.createElement("div");
        dropdown.className = "dropdown";
        data.artists.items.forEach((artist) => {
            if (!selectedArtists.has(artist.name)) {
                const option = document.createElement("div");
                option.className = "dropdown-option";
                option.textContent = artist.name;
                option.onclick = () => selectArtist(artist, square);
                dropdown.appendChild(option);
            }
        });
        square.appendChild(dropdown);
    } catch (error) {
        console.error("Error searching artists:", error);
    }
}

function selectArtist(artist, square) {
    selectedArtists.add(artist.name);
    square.innerHTML = "";
    const artistName = document.createElement("div");
    artistName.textContent = artist.name;
    square.appendChild(artistName);
    square.dataset.artist = artist.name;
    saveResults();
}

function saveResults() {
    const squares = document.querySelectorAll(".bingo-square");
    const results = {};
    squares.forEach((square) => {
        const artistName = square.dataset.artist;
        if (artistName) results[square.dataset.index] = artistName;
    });
    const user = auth.currentUser;
    if (user) {
        set(ref(database, `users/${user.uid}/bingoBoard`), results)
            .then(() => console.log("Results saved"))
            .catch((error) => console.error("Error saving results:", error));
    }
}

function loadResults() {
    const user = auth.currentUser;
    if (user) {
        const resultsRef = ref(database, `users/${user.uid}/bingoBoard`);
        get(resultsRef).then((snapshot) => {
            if (snapshot.exists()) {
                const results = snapshot.val();
                const squares = document.querySelectorAll(".bingo-square");
                Object.keys(results).forEach((index) => {
                    const square = squares[index];
                    const artistName = results[index];
                    square.dataset.artist = artistName;
                    square.innerHTML = `<div>${artistName}</div>`;
                });
            }
        });
    }
}

function showSaveMessage(message) {
    const saveMessage = document.getElementById("save-message");
    saveMessage.textContent = message;
    setTimeout(() => (saveMessage.textContent = ""), 3000);
}
