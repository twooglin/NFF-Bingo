const CLIENT_ID = 'b95b505ced454db2a08dc886d60b55b2';
const REDIRECT_URI = 'https://twooglin.github.io/NFF-Bingo/';
let accessToken = '';
let selectedArtists = new Set(); // Track unique artist entries

// Step 1: Spotify Login
document.addEventListener('DOMContentLoaded', () => {
    getAccessToken();
    toggleLoginButton();
    generateBingoBoard();
});

function toggleLoginButton() {
    const loginButton = document.getElementById('login');
    if (accessToken) {
        loginButton.style.display = 'none'; // Hide login button if logged in
    } else {
        loginButton.style.display = 'block';
        loginButton.onclick = () => {
            const scope = 'user-read-private';
            window.location.href = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${scope}&response_type=token`;
        };
    }
}

// Step 2: Get Access Token and Fetch User Info
function getAccessToken() {
    const hash = window.location.hash;
    if (hash) {
        accessToken = new URLSearchParams(hash.substring(1)).get('access_token');
        fetchSpotifyProfile();
    }
}

async function fetchSpotifyProfile() {
    const response = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = await response.json();
    displayUserInfo(profile);
}

function displayUserInfo(profile) {
    const userInfo = document.createElement('div');
    userInfo.id = 'user-info';
    userInfo.innerHTML = `
        <img src="${profile.images[0]?.url || 'default-avatar.png'}" alt="User Avatar" class="avatar">
        <span>${profile.display_name}</span>
    `;
    document.body.prepend(userInfo);
}

// Step 3: Generate Bingo Board
function generateBingoBoard() {
    const board = document.getElementById('bingo-board');
    for (let i = 0; i < 25; i++) {
        const square = document.createElement('div');
        square.className = 'bingo-square';
        square.dataset.index = i;

        if (i === 12) { // Free space in the center
            const logo = document.createElement('img');
            logo.src = 'NFF_logo.jpg';
            square.appendChild(logo);
        } else {
            addSearchBar(square);
        }

        board.appendChild(square);
    }
}

function addSearchBar(square) {
    square.innerHTML = ''; // Clear square
    const searchInput = document.createElement('input');
    searchInput.className = 'artist-search';
    searchInput.placeholder = 'Type artist name';
    searchInput.oninput = () => searchArtists(searchInput, square);

    square.appendChild(searchInput);
    searchInput.focus();
}

// Step 4: Search Artists and Display Dropdown
async function searchArtists(input, square) {
    if (input.value.length < 2) return;

    const response = await fetch(
        `https://api.spotify.com/v1/search?q=${input.value}&type=artist`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await response.json();

    // Create dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'dropdown';
    dropdown.innerHTML = ''; // Clear existing options

    data.artists.items.forEach((artist) => {
        if (!selectedArtists.has(artist.name)) {
            const option = document.createElement('div');
            option.className = 'dropdown-option';
            option.textContent = artist.name;
            option.onclick = () => selectArtist(artist, square);
            dropdown.appendChild(option);
        }
    });

    // Replace or append dropdown
    if (square.querySelector('.dropdown')) {
        square.replaceChild(dropdown, square.querySelector('.dropdown'));
    } else {
        square.appendChild(dropdown);
    }
}

// Step 5: Select an Artist
function selectArtist(artist, square) {
    selectedArtists.add(artist.name); // Track unique artist
    square.innerHTML = ''; // Clear search bar and dropdown

    const artistImage = document.createElement('img');
    artistImage.src = artist.images[0]?.url || '';
    artistImage.alt = artist.name;
    artistImage.className = 'artist-image';

    const artistName = document.createElement('div');
    artistName.textContent = artist.name;

    square.appendChild(artistImage);
    square.appendChild(artistName);

    // Allow re-selection
    square.onclick = () => {
        selectedArtists.delete(artist.name); // Remove previous selection
        addSearchBar(square);
    };
}

// Example: List of officially announced artists
let announcedArtists = ['Taylor Swift', 'Artist 2', 'Artist 3']; // Replace with announced names

// Function to highlight correct squares
function highlightCorrectSquares() {
    const squares = document.querySelectorAll('.bingo-square');

    squares.forEach((square) => {
        const artistName = square.querySelector('div')?.textContent;

        if (artistName && announcedArtists.includes(artistName)) {
            square.classList.add('correct-artist'); // Add highlight class
        } else {
            square.classList.remove('correct-artist'); // Remove highlight if no longer matches
        }
    });
}

// Function to call after the board is generated
window.onload = async () => {
    await getAccessToken();
    generateBingoBoard();
    highlightCorrectSquares(); // Call this function to highlight matches
};
