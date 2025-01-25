const CLIENT_ID = 'b95b505ced454db2a08dc886d60b55b2';
const REDIRECT_URI = 'https://twooglin.github.io/NFF-Bingo/';
let accessToken = '';
let selectedArtists = new Set();

// Import the necessary Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-analytics.js";

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
const provider = new SpotifyAuthProvider();

// Example: List of officially announced artists - update with the actual lineup
let announcedArtists = ['Taylor Swift', 'Phoebe Bridgers', 'The Lumineers', /* ...more artists */];

// Call this function when the Spotify login button is clicked
function handleSpotifyLogin() {
    signInWithPopup(auth, provider)
        .then((result) => {
            const credential = SpotifyAuthProvider.credentialFromResult(result);
            const token = credential.accessToken;
            const user = result.user;
            console.log('User signed in with Spotify:', user);
            accessToken = token; // Store the Spotify access token
            toggleLoginButton(); // Hide the login button after successful login
            fetchSpotifyProfile(); // Fetch and display user info
        })
        .catch((error) => {
            console.error('Error signing in with Spotify:', error);
        });
}

window.onload = async () => {
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
        }
    });
    // Add event listener to the save button
    document.getElementById('save-button').addEventListener('click', () => {
        saveResults();
        document.getElementById('save-message').textContent = 'Bingo board saved!';
        setTimeout(() => {
            document.getElementById('save-message').textContent = '';
        }, 3000); // Clear the message after 3 seconds
    });
};

// Toggle Spotify login button visibility
function toggleLoginButton() {
    const loginButton = document.getElementById('login');

    if (accessToken) {
        loginButton.style.display = 'none';
    } else {
        loginButton.style.display = 'block';
        loginButton.onclick = handleSpotifyLogin;
    }
}

// Get Access Token and Fetch User Info
function getAccessToken() {
    const hash = window.location.hash;

    if (hash) {
        accessToken = new URLSearchParams(hash.substring(1)).get('access_token');
        fetchSpotifyProfile();
    }
}

async function fetchSpotifyProfile() {
    try {
        const response = await fetch('https://api.spotify.com/v1/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const profile = await response.json();
        displayUserInfo(profile);
        localStorage.setItem('spotifyUserProfile', JSON.stringify(profile));

        const user = auth.currentUser;
        if (user) {
            const userId = user.uid; // Use Firebase UID
            // Store the Spotify user ID in the Firebase Realtime Database
            set(ref(database, `users/${userId}/spotifyId`), profile.id)
                .then(() => console.log('Spotify ID saved to Firebase!'))
                .catch((error) => console.error('Error saving Spotify ID:', error));
        }
    } catch (error) {
        console.error('Error fetching Spotify profile:', error);
    }
}

function displayUserInfo(profile) {
    const userInfo = document.createElement('div');
    userInfo.id = 'user-info';
    userInfo.innerHTML = `
        <img src="${
            profile.images[0]?.url || 'default-avatar.png'
        }" alt="User Avatar" class="avatar">
        <span>${profile.display_name}</span>
    `;
    document.body.prepend(userInfo);
}

// Generate Bingo Board
function generateBingoBoard() {
    const board = document.getElementById('bingo-board');
    board.innerHTML = ''; // Clear previous content if any

    for (let i = 0; i < 25; i++) {
        const square = document.createElement('div');
        square.className = 'bingo-square';
        square.dataset.index = i;

        if (i === 12) {
            // Free space in the center
            const logo = document.createElement('img');
            logo.src = 'NFF_logo.jpg';
            square.appendChild(logo);
        } else {
            addSearchBar(square);
        }

        board.appendChild(square);
    }
}

// Add Search Bar to Square
function addSearchBar(square) {
    square.innerHTML = ''; // Clear square content
    const searchInput = document.createElement('input');
    searchInput.className = 'artist-search';
    searchInput.placeholder = 'Type artist name';

    // Store the searchInput in the square's dataset
    square.dataset.searchInput = searchInput; // Store the searchInput in the square's dataset

    searchInput.oninput = () => searchArtists(searchInput, square);

    square.appendChild(searchInput);
    searchInput.focus();
}

// Search Artists and Display Dropdown
async function searchArtists(input, square) {
    if (input.value.length < 2) return;
    const response = await fetch(
        `https://api.spotify.com/v1/search?q=${input.value}&type=artist`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const data = await response.json();

    const existingDropdown = square.querySelector('.dropdown');
    if (existingDropdown) existingDropdown.remove();

    const dropdown = document.createElement('div');
    dropdown.className = 'dropdown';
    dropdown.innerHTML = '';

    data.artists.items.forEach((artist) => {
        if (!selectedArtists.has(artist.name)) {
            const option = document.createElement('div');
            option.className = 'dropdown-option';
            option.textContent = artist.name;
            option.onclick = () => selectArtist(artist, square);
            dropdown.appendChild(option);
        }
    });
    square.appendChild(dropdown);
}

// Select an Artist
function selectArtist(artist, square) {
    selectedArtists.add(artist.name);
    square.innerHTML = ''; // Clear previous content

    const artistImage = document.createElement('img');
    artistImage.src = artist.images[0]?.url || 'default-artist.png';
    // Use fallback image
    artistImage.alt = artist.name;
    artistImage.className = 'artist-image';
    artistImage.onload = () => {
        console.log("Image loaded successfully!");
    };
    artistImage.onerror = () => {
        console.error("Error loading image:", artistImage.src);
    };

    const artistName = document.createElement('div');
    artistName.textContent = artist.name;
    square.appendChild(artistImage);
    square.appendChild(artistName);

    // Store the selected artist in the square's dataset
    square.dataset.artist = artist.name;

    square.onclick = () => {
        // Retrieve the searchInput from the square's dataset
        const searchInput = square.dataset.searchInput;
        searchArtists(searchInput, square); 
    };
    highlightCorrectSquares(); // Check if the artist matches announced ones
    saveResults(); // Save the results to local storage
}

// Highlight Correct Squares
function highlightCorrectSquares() {
    const squares = document.querySelectorAll('.bingo-square');
    squares.forEach((square) => {
        const artistName = square.querySelector('div')?.textContent;
        if (artistName && announcedArtists.includes(artistName)) {
            square.classList.add('correct-artist');
        } else {
            square.classList.remove('correct-artist');
        }
    });
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

                    for (const index in results) {
                        if (results.hasOwnProperty(index)) {
                            const artistName = results[index];
                            const square = squares[index];

                            // Since we're only storing artist names, you'll need to fetch the image again
                            fetch(
                                `https://api.spotify.com/v1/search?q=${artistName}&type=artist`,
                                { headers: { Authorization: `Bearer ${accessToken}` } },
                            )
                                .then((response) => response.json())
                                .then((data) => {
                                    if (data.artists.items.length > 0) {
                                        const artist = {
                                            name: artistName,
                                            images: data.artists.items[0].images,
                                        };
                                        selectArtist(artist, square);
                                    } else {
                                        console.error('Artist not found on Spotify:', artistName);
                                    }
                                })
                                .catch((error) => console.error('Error fetching artist details:', error));
                        }
                    }
                }
            })
            .catch((error) => console.error('Error loading results:', error));
    }
}
