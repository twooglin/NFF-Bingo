import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-database.js";

const CLIENT_ID = 'b95b505ced454db2a08dc886d60b55b2'; // Spotify Client ID
let spotifyAccessToken = '';

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDrZyLpn4AbLiBFxKAUwhP_IRh9IpNTHgo",
    authDomain: "nff-bingo.firebaseapp.com",
    databaseURL: "https://nff-bingo-default-rtdb.firebaseio.com",
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
const provider = new GoogleAuthProvider();

function handleGoogleLogin() {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
        .then((result) => {
            const user = result.user;
            console.log('Google user signed in:', user);

            // Ensure user details are properly displayed
            if (user.displayName) {
                document.getElementById('user-info').innerHTML = `
                    <img src="${user.photoURL}" class="avatar" alt="User Avatar">
                    <span>Welcome, ${user.displayName}!</span>
                `;
            } else {
                document.getElementById('user-info').innerHTML = `<span>Welcome, User!</span>`;
            }

            // Hide login button after successful login
            document.getElementById('login').style.display = 'none';

        })
        .catch((error) => {
            console.error('Google login error:', error);
            alert("Google login failed. Please try again.");
        });
}


// Attach to the window object
window.handleGoogleLogin = handleGoogleLogin;

onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('User signed in:', user);

        if (user.isAnonymous) {
            console.warn("Anonymous login detected. Google login required.");
            document.getElementById('user-info').innerHTML = `<span>Please log in with Google.</span>`;
            return;
        }

        loadBingoBoard(user.uid);
        document.getElementById('login').style.display = 'none';
        document.getElementById('user-info').innerHTML = `
            <img src="${user.photoURL}" class="avatar" alt="User Avatar">
            <span>Welcome, ${user.displayName || "User"}!</span>
        `;
    } else {
        console.log('No user signed in');
        document.getElementById('login').style.display = 'block';
    }
});


// Generate the Bingo Board
function generateBingoBoard() {
    const board = document.getElementById('bingo-board');
    board.innerHTML = ""; // Clear the existing board

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
    square.innerHTML = ""; // Clear square content
    const searchInput = document.createElement("input");
    searchInput.className = "artist-search";
    searchInput.placeholder = "Type artist name";
    searchInput.oninput = () => searchArtists(searchInput, square);
    
    square.appendChild(searchInput);
    searchInput.focus();
}

async function searchArtists(input, square) {
    if (input.value.length < 2) return;

    const token = await getSpotifyAccessToken();
    if (!token) {
        console.error("No valid Spotify Access Token available.");
        alert("Unable to search artists. Please try again later.");
        return;
    }

    try {
        const response = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(input.value)}&type=artist`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!response.ok) {
            throw new Error(`Spotify Search Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Spotify API Response:", data); // Log the response

        // Ensure artists exist before proceeding
        if (!data.artists || !data.artists.items || data.artists.items.length === 0) {
            console.warn("No artists found for:", input.value);
            alert("No artists found. Try a different search.");
            return;
        }

        const dropdown = document.createElement("div");
        dropdown.className = "dropdown";

        data.artists.items.forEach((artist) => {
            console.log(`Artist Found: ${artist.name}`, artist); // Log artist data

            const option = document.createElement("div");
            option.className = "dropdown-option";
            option.textContent = artist.name;
            option.onclick = () => selectArtist(artist, square);
            dropdown.appendChild(option);
        });

        square.innerHTML = "";
        square.appendChild(input);
        square.appendChild(dropdown);
    } catch (error) {
        console.error("Error searching artists on Spotify:", error);
        alert("Error searching for artists. Please try again.");
    }
}

function selectArtist(artist, square) {
    if (!artist || !artist.name) {
        console.error("Invalid artist selected.");
        return;
    }

    console.log("Selected Artist:", artist); // Log selected artist data

    // Clear square before adding new elements
    square.innerHTML = "";

    // Get the artist's image from Spotify (leave blank if none exists)
    const artistImageUrl = artist.images?.[0]?.url || null;

    // If the artist has an image, display it
    if (artistImageUrl) {
        console.log(`Displaying image for ${artist.name}: ${artistImageUrl}`); // Log image URL

        const artistImage = document.createElement("img");
        artistImage.src = artistImageUrl;
        artistImage.alt = artist.name;
        artistImage.className = "artist-image";
        square.appendChild(artistImage);
    } else {
        console.warn(`No image available for ${artist.name}`);
    }

    // Create the artist name element
    const artistName = document.createElement("div");
    artistName.textContent = artist.name;
    artistName.className = "selected-artist"; // Click to edit
    square.appendChild(artistName);

    // Allow users to click the artist name to re-enable editing
    artistName.onclick = () => addSearchBar(square);

    // Save the updated selection to Firebase
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

async function getSpotifyAccessToken() {
    const clientId = "b95b505ced454db2a08dc886d60b55b2";
    const clientSecret = "39bdaeeb64bd4de2a390918eb62ce588"; // Ensure this is correct

    try {
        const response = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
            },
            body: "grant_type=client_credentials",
        });

        if (!response.ok) {
            throw new Error(`Spotify Token Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Spotify Access Token Retrieved:", data.access_token);
        return data.access_token;
    } catch (error) {
        console.error("Error fetching Spotify access token:", error);
        alert("Error fetching Spotify token. Please try again later.");
        return null;
    }
}

// Function to Submit or Update the Bingo Board
function submitBingoBoard() {
    const user = auth.currentUser;
    if (!user) {
        alert("You must be logged in to submit your board.");
        return;
    }

    const userId = user.uid;
    const boardRef = ref(database, `submittedBoards/${userId}`);

    // Retrieve the current bingo board
    const board = document.querySelectorAll('.bingo-square');
    const boardData = {};
    board.forEach((square) => {
        const index = square.dataset.index;
        const artistName = square.querySelector("div")?.textContent || "";
        boardData[index] = artistName;
    });

    // Save to Firebase
    set(boardRef, {
        board: boardData,
        submittedAt: Date.now(),
        displayName: user.displayName || "Anonymous",
        correctCount: calculateCorrectGuesses(boardData) // Number of correct guesses
    }).then(() => {
        alert("Bingo board submitted!");
        document.getElementById("submit-button").textContent = "Update Board"; // Change button text
    }).catch((error) => {
        console.error("Error submitting board:", error);
    });
}

// Function to Check for Changes (Show 'Update Board' if Needed)
function checkForUpdates() {
    const user = auth.currentUser;
    if (!user) return;

    const userId = user.uid;
    const boardRef = ref(database, `submittedBoards/${userId}`);

    get(boardRef).then((snapshot) => {
        if (!snapshot.exists()) {
            document.getElementById("submit-button").textContent = "Submit Board";
            return;
        }

        const submittedBoard = snapshot.val().board;
        const currentBoard = {};
        document.querySelectorAll('.bingo-square').forEach((square) => {
            const index = square.dataset.index;
            currentBoard[index] = square.querySelector("div")?.textContent || "";
        });

        // If the boards are different, show "Update Board"
        if (JSON.stringify(submittedBoard) !== JSON.stringify(currentBoard)) {
            document.getElementById("submit-button").textContent = "Update Board";
        } else {
            document.getElementById("submit-button").textContent = "Board Submitted";
        }
    }).catch((error) => {
        console.error("Error checking for board updates:", error);
    });
}

// Function to Load the Leaderboard
function loadLeaderboard() {
    const leaderboardRef = ref(database, "submittedBoards");

    get(leaderboardRef).then((snapshot) => {
        if (!snapshot.exists()) return;

        const boards = snapshot.val();
        const sortedBoards = Object.values(boards).sort((a, b) => b.correctCount - a.correctCount);

        const leaderboardDiv = document.getElementById("leaderboard");
        leaderboardDiv.innerHTML = "<h3>Top Submitted Boards</h3>";

        sortedBoards.forEach((board, index) => {
            const boardContainer = document.createElement("div");
            boardContainer.className = "leaderboard-entry";
            boardContainer.innerHTML = `
                <p><strong>${index + 1}. ${board.displayName}</strong> - ${board.correctCount} Correct</p>
                <div class="leaderboard-board">${formatLeaderboardBoard(board.board)}</div>
            `;
            leaderboardDiv.appendChild(boardContainer);
        });
    }).catch((error) => {
        console.error("Error loading leaderboard:", error);
    });
}

// Helper Function to Format Leaderboard Boards
function formatLeaderboardBoard(boardData) {
    let boardHTML = '<div class="leaderboard-grid">';
    for (let i = 0; i < 25; i++) {
        const artistName = boardData[i] || "";
        boardHTML += `<div class="leaderboard-square">${artistName}</div>`;
    }
    boardHTML += "</div>";
    return boardHTML;
}

// Function to Calculate Correct Guesses
function calculateCorrectGuesses(boardData) {
    const announcedArtists = ["Taylor Swift", "The Lumineers", "Mumford & Sons"]; // Replace with dynamic list
    let correctCount = 0;

    Object.values(boardData).forEach((artist) => {
        if (announcedArtists.includes(artist)) {
            correctCount++;
        }
    });

    return correctCount;
}

// Function to Clear the Bingo Board
function clearBingoBoard() {
    const user = auth.currentUser;
    if (!user) {
        alert("You must be logged in to clear your board.");
        return;
    }

    if (!confirm("Are you sure you want to clear your board? This cannot be undone.")) {
        return;
    }

    const board = document.querySelectorAll('.bingo-square');

    // Reset each square by clearing its content
    board.forEach((square) => {
        square.innerHTML = ""; // Remove artist name and image
        addSearchBar(square); // Restore search bar
    });

    // Save the cleared board to Firebase
    saveBingoBoard(user.uid);
}

// Run These Functions on Load
window.onload = () => {
    generateBingoBoard();
    loadLeaderboard();
    onAuthStateChanged(auth, (user) => {
        if (user) {
            checkForUpdates();
        }
    });
};

window.onload = () => {
    generateBingoBoard();
};
