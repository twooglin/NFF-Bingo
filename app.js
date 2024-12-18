const CLIENT_ID = 'b95b505ced454db2a08dc886d60b55b2';
const REDIRECT_URI = 'https://twooglin.github.io/NFF-Bingo/';
let accessToken = '';
let selectedArtists = new Set(); // Track unique artist entries

// Example: List of officially announced artists
let announcedArtists = ['Taylor Swift', 'Artist 2', 'Artist 3']; // Replace with announced names

window.onload = async () => {
    getAccessToken();
    toggleLoginButton();
    generateBingoBoard();
    highlightCorrectSquares();
};

// Toggle Spotify login button visibility
function toggleLoginButton() {
    const loginButton = document.getElementById('login');
    if (accessToken) {
        loginButton.style.display = 'none';
    } else {
        loginButton.style.display = 'block';
        loginButton.onclick = () => {
            const scope = 'user-read-private';
            window.location.href = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${scope}&response_type=token`;
        };
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

// Generate Bingo Board
function generateBingoBoard() {
    const board = document.getElementById('bingo-board');
    board.innerHTML = ''; // Clear previous content if any

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

// Add Search Bar to Square
function addSearchBar(square) {
    square.innerHTML = ''; // Clear square content
    const searchInput = document.createElement('input');
    searchInput.className = 'artist-search';
    searchInput.placeholder = 'Type artist name';
    searchInput.oninput = () => searchArtists(searchInput, square);

    square.appendChild(searchInput);
    searchInput.focus();
}

// Search Artists and Display Dropdown
async function searchArtists(input, square) {
    if (input.value.length < 2) return;

    const response = await fetch(
        `https://api.spotify.com/v1/search?q=${input.value}&type=artist`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
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
    artistImage.src = artist.images[0]?.url || 'default-artist.png'; // Use fallback image
    artistImage.alt = artist.name;
    artistImage.className = 'artist-image';

    const artistName = document.createElement('div');
    artistName.textContent = artist.name;

    square.appendChild(artistImage);
    square.appendChild(artistName);

    square.onclick = () => {
        selectedArtists.delete(artist.name); // Remove artist
        addSearchBar(square); // Add search bar again
    };

    highlightCorrectSquares(); // Check if the artist matches announced ones
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
