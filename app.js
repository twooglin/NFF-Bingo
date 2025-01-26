import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";

const CLIENT_ID = 'b95b505ced454db2a08dc886d60b55b2';
const REDIRECT_URI = 'https://twooglin.github.io/NFF-Bingo/';
let accessToken = '';

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
const database = getDatabase(app);

window.onload = () => {
    getAccessToken();
    toggleLoginButton();
    generateBingoBoard();
};

function handleSpotifyLogin() {
    const scope = 'user-read-private';
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
        REDIRECT_URI
    )}&scope=${scope}&response_type=token`;
    window.location.href = authUrl;
}

function getAccessToken() {
    const hash = window.location.hash;
    if (hash) {
        accessToken = new URLSearchParams(hash.substring(1)).get('access_token');
        localStorage.setItem('spotifyAccessToken', accessToken);
        fetchSpotifyProfile();
    }
}

async function fetchSpotifyProfile() {
    try {
        const response = await fetch('https://api.spotify.com/v1/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

        const profile = await response.json();
        console.log('Spotify Profile:', profile);
        saveSpotifyUserToFirebase(profile);
    } catch (error) {
        console.error('Error fetching Spotify profile:', error);
    }
}

function saveSpotifyUserToFirebase(profile) {
    const userRef = ref(database, `users/${profile.id}/profile`);
    set(userRef, {
        displayName: profile.display_name,
        email: profile.email,
        spotifyId: profile.id,
        profileImage: profile.images[0]?.url || null,
    })
        .then(() => console.log('Spotify user saved to Firebase!'))
        .catch((error) => console.error('Error saving Spotify user:', error));
}

function toggleLoginButton() {
    const loginButton = document.getElementById('login');
    const savedToken = localStorage.getItem('spotifyAccessToken');

    if (savedToken) {
        accessToken = savedToken;
        loginButton.style.display = 'none';
        fetchSpotifyProfile();
    } else {
        loginButton.style.display = 'block';
        loginButton.onclick = handleSpotifyLogin;
    }
}

function generateBingoBoard() {
    const board = document.getElementById('bingo-board');
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
            const option = document.createElement("div");
            option.className = "dropdown-option";
            option.textContent = artist.name;
            option.onclick = () => selectArtist(artist, square);
            dropdown.appendChild(option);
        });
        square.appendChild(dropdown);
    } catch (error) {
        console.error("Error searching artists:", error);
    }
}

function selectArtist(artist, square) {
    square.innerHTML = "";
    const artistName = document.createElement("div");
    artistName.textContent = artist.name;
    square.appendChild(artistName);
}
