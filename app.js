const CLIENT_ID = 'b95b505ced454db2a08dc886d60b55b2';
const REDIRECT_URI = 'https://twooglin.github.io/NFF-Bingo/';
let accessToken = '';
let selectedArtists = new Set(); // Track unique artist entries

// Step 1: Spotify Login
document.getElementById('login').onclick = () => {
    const scope = 'user-read-private';
    window.location.href = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${scope}&response_type=token`;
};

// Step 2: Get Access Token and User Info
async function getAccessToken() {
    const hash = window.location.hash;
    if (hash) {
        accessToken = new URLSearchParams(hash.substring(1)).get('access_token');
        await fetchSpotifyProfile();
    }
}

// Fetch and Display Spotify User Profile
async function fetchSpotifyProfile() {
    const response = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
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
            square.onclick = () => openSearchDropdown(square);
        }

        board.appendChild(square);
    }
}

// Step 4: Dropdown Search and Selection
async function openSearchDropdown(square) {
    const input = document.createElement('input');
    input.className = 'artist-search';
    input.placeholder = 'Type artist name';
    input.oninput = () => searchArtists(input, square);

    square.innerHTML = ''; // Clear square content
    square.appendChild(input);
    input.focus();
}

async function searchArtists(input, square) {
    if (input.value.length < 2) return;

    const response = await fetch(
        `https://api.spotify.com/v1/search?q=${input.value}&type=artist`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const data = await response.json();

    const dropdown = document.createElement('div');
    dropdown.className = 'dropdown';

    data.artists.items.forEach(artist => {
        if (!selectedArtists.has(artist.name)) {
            const option = document.createElement('div');
            option.className = 'dropdown-option';
            option.textContent = artist.name;

            option.onclick = () => {
                selectArtist(artist, square);
                input.value = ''; // Reset search input
            };

            dropdown.appendChild(option);
        }
    });

    square.appendChild(dropdown);
}

function selectArtist(artist, square) {
    selectedArtists.add(artist.name); // Add to unique entries
    square.innerHTML = ''; // Clear search UI

    const artistImage = document.createElement('img');
    artistImage.src = artist.images[0]?.url || '';
    artistImage.alt = artist.name;
    artistImage.className = 'artist-image';

    const artistName = document.createElement('div');
    artistName.textContent = artist.name;

    square.appendChild(artistImage);
    square.appendChild(artistName);

    // Allow re-editing by clicking again
    square.onclick = () => openSearchDropdown(square);
}

// Initialize the App
window.onload = async () => {
    await getAccessToken();
    generateBingoBoard();
};
