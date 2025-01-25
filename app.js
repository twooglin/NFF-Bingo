const CLIENT_ID = 'b95b505ced454db2a08dc886d60b55b2';
const REDIRECT_URI = 'https://twooglin.github.io/NFF-Bingo/';
let accessToken = '';
let selectedArtists = new Set();


// Example: List of officially announced artists - update with the actual lineup
let announcedArtists = ['Taylor Swift', 'Phoebe Bridgers', 'The Lumineers', /* ...more artists */ ]; 

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
    localStorage.setItem('spotifyUserProfile', JSON.stringify(profile));
    // Use Spotify ID as the user ID in Firebase
    const userId = profile.id; 

    // ... rest of your code to save/load data using userId
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
        // Instead of removing the artist, show the search dropdown again
        searchArtists(searchInput, square); // Assuming searchInput is accessible here
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

// Function to save results to localStorage
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

    localStorage.setItem('bingoResults', JSON.stringify(results));
}

// Function to load results from localStorage
function loadResults() {
    const savedResults = localStorage.getItem('bingoResults');
    if (savedResults) {
        const results = JSON.parse(savedResults);
        const squares = document.querySelectorAll('.bingo-square');

        squares.forEach((square) => {
            const index = square.dataset.index;
            const artistName = results[index];
            if (artistName) {
                // Since we're only storing artist names, you'll need to fetch the image again
                fetch(
                    `https://api.spotify.com/v1/search?q=${artistName}&type=artist`,
                    { headers: { Authorization: `Bearer ${accessToken}` } },
                )
                    .then((response) => response.json())
                    .then((data) => {
                        const artist = { name: artistName, images: data.artists.items[0].images };
                        selectArtist(artist, square);
                    })
                    .catch((error) => console.error('Error fetching artist details:', error));
            }
        });
    }
}
