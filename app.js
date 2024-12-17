const CLIENT_ID = 'b95b505ced454db2a08dc886d60b55b2';
const REDIRECT_URI = 'https://twooglin.github.io/NFF-Bingo/';
let accessToken = '';

document.getElementById('login').onclick = login;

// Step 1: Spotify Login
function login() {
    const scope = 'user-read-private';
    window.location.href = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${scope}&response_type=token`;
}

// Step 2: Get Access Token
function getAccessToken() {
    const hash = window.location.hash;
    if (hash) {
        accessToken = new URLSearchParams(hash.substring(1)).get('access_token');
    }
}

// Step 3: Generate Bingo Board
function generateBingoBoard() {
    const board = document.getElementById('bingo-board');
    for (let i = 0; i < 25; i++) {
        const square = document.createElement('div');
        square.className = 'bingo-square';

        if (i === 12) { // Free space in the center
            const logo = document.createElement('img');
            logo.src = 'NFF_logo.jpg'; // Replace with hosted logo URL
            square.appendChild(logo);
        } else {
            const searchInput = document.createElement('input');
            searchInput.className = 'artist-search';
            searchInput.placeholder = 'Type artist name';
            searchInput.oninput = (e) => searchArtist(e.target, square);
            square.appendChild(searchInput);
        }

        board.appendChild(square);
    }
}

// Step 4: Search for Artists
async function searchArtist(input, square) {
    if (input.value.length < 2) return;

    const response = await fetch(
        `https://api.spotify.com/v1/search?q=${input.value}&type=artist`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const data = await response.json();
    const artist = data.artists.items[0]; // Top result
    if (artist) {
        input.value = artist.name; // Auto-populate artist name
        square.innerHTML = ''; // Clear previous content
        const artistImage = document.createElement('img');
        artistImage.src = artist.images[0]?.url || ''; // Use artist image
        square.appendChild(artistImage);
        const artistName = document.createElement('div');
        artistName.textContent = artist.name;
        square.appendChild(artistName);
    }
}

window.onload = () => {
    getAccessToken();
    generateBingoBoard();
};
