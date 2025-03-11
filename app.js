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

function addSearchBar(square) {
    square.innerHTML = ""; // Clear square content

    const searchInput = document.createElement("input");
    searchInput.className = "artist-search";
    searchInput.placeholder = "Type artist name";

    // ✅ Add a unique id and name attribute for autofill support
    searchInput.id = `artist-search-${square.dataset.index}`;
    searchInput.name = `artist-search-${square.dataset.index}`;

    // ✅ Ensure focus remains on input
    searchInput.addEventListener("focus", () => {
        searchInput.select();
    });

    searchInput.oninput = () => {
        searchArtists(searchInput, square);
        console.log("Search triggered:", searchInput.value); // Debugging
    };
        // Keep focus on input when dropdown is generated
        searchInput.onfocus = () => {
            const dropdown = square.querySelector(".dropdown");
            if (dropdown) dropdown.style.display = "block";
        };
    

    square.appendChild(searchInput);
    searchInput.focus();
}

async function searchArtists(input, square) {
    if (input.value.length < 2) return; // Require at least 2 characters before searching

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
        console.log("Spotify API Response:", data);

        if (!data.artists || !data.artists.items || data.artists.items.length === 0) {
            console.warn("No artists found for:", input.value);
            return;
        }

        // Remove any existing dropdown before creating a new one
        let existingDropdown = square.querySelector(".dropdown");
        if (existingDropdown) {
            existingDropdown.remove();
        }

        // Create dropdown container
        const dropdown = document.createElement("div");
        dropdown.className = "dropdown";

        // Populate dropdown with artist names
        data.artists.items.forEach((artist) => {
            console.log(`Artist Found: ${artist.name}`);

            const option = document.createElement("div");
            option.className = "dropdown-option";
            option.textContent = artist.name;
            option.onclick = () => {
                selectArtist(artist.name, square); // Pass only the name
                dropdown.remove(); // Remove dropdown after selection
            };
            dropdown.appendChild(option);
        });

        // ✅ Append dropdown to square (to maintain positioning)
        square.appendChild(dropdown);
        console.log("Dropdown added to:", square);
    } catch (error) {
        console.error("Error searching artists on Spotify:", error);
        alert("Error searching for artists. Please try again.");
    }
}


function selectArtist(artistName, square) {
    if (!artistName) {
        console.error("Invalid artist selected.");
        return;
    }

    console.log("Selected Artist:", artistName);

    // Clear square before adding new elements
    square.innerHTML = "";

    // Create the artist name element
    const artistNameDiv = document.createElement("div");
    artistNameDiv.textContent = artistName;
    artistNameDiv.className = "selected-artist";

    // Append artist name
    square.appendChild(artistNameDiv);

    // Allow users to click the artist name to re-enable editing
    artistNameDiv.onclick = () => addSearchBar(square);

    // ✅ Ensure the board is saved to Firebase after selection
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

    // Save to Firebase and allow editing
    set(boardRef, {
        board: boardData,
        submittedAt: Date.now(),
        displayName: user.displayName || "Anonymous",
        correctCount: calculateCorrectGuesses(boardData) // Number of correct guesses
    }).then(() => {
        alert("Bingo board submitted!");
        document.getElementById("submit-button").textContent = "Update Board"; // Change button text
        document.getElementById("submit-button").onclick = updateBingoBoard; // Change function
    }).catch((error) => {
        console.error("Error submitting board:", error);
    });
}

function updateBingoBoard() {
    const user = auth.currentUser;
    if (!user) {
        alert("You must be logged in to update your board.");
        return;
    }

    const userId = user.uid;
    const boardRef = ref(database, `submittedBoards/${userId}`);

    // Retrieve the updated bingo board
    const board = document.querySelectorAll('.bingo-square');
    const boardData = {};
    board.forEach((square) => {
        const index = square.dataset.index;
        const artistName = square.querySelector("div")?.textContent || "";
        boardData[index] = artistName;
    });

    // Update the same entry in Firebase
    set(boardRef, {
        board: boardData,
        submittedAt: Date.now(),
        displayName: user.displayName || "Anonymous",
        correctCount: calculateCorrectGuesses(boardData)
    }).then(() => {
        alert("Bingo board updated!");
    }).catch((error) => {
        console.error("Error updating board:", error);
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

// Function to Calculate Correct Guesses
function calculateCorrectGuesses(boardData) {
    const announcedArtists = ["Waxahatchee","Mt. Joy","Jeff Tweedy","Julien Baker","Torres","BCUC","Michael Kiwanuka","The Deslondes","Jesse Welles", "Alex G", "Kim Deal", "Hurray For The Riff Raff", "Mon Rovia", "Stephen Wilson Jr.", "I'm With Her", "Iron & Wine", "MJ Lenderman", "Kevin Morby", "Sammy Rae & The Friends", "Illiterate Light"]; // Replace with dynamic list
    let correctCount = 0;

    Object.values(boardData).forEach((artist) => {
        if (announcedArtists.includes(artist)) {
            correctCount++;
        }
    });

    return correctCount;
}

function loadLeaderboard() {
    const leaderboardRef = ref(database, "submittedBoards");

    get(leaderboardRef).then((snapshot) => {
        if (!snapshot.exists()) return;

        const leaderboardBody = document.getElementById("leaderboard-body");
        if (!leaderboardBody) {
            console.error("Leaderboard body element not found in the HTML.");
            return;
        }
        leaderboardBody.innerHTML = ""; // Clear previous entries

        const boards = snapshot.val();

        // Dynamically recalculate correct guesses using the most recent announced artists
        const sortedBoards = Object.entries(boards).map(([userId, board]) => {
            const dynamicCount = calculateCorrectGuesses(board.board || {}); // ✅ Always recalculate
            return { userId, board, dynamicCount };
        }).sort((a, b) => b.dynamicCount - a.dynamicCount);

        // Populate the leaderboard table
        sortedBoards.forEach(({ userId, board, dynamicCount }) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td class="leaderboard-name">${board.displayName}</td>
                <td>${dynamicCount}</td>
            `;
            row.onclick = () => displayUserBoard(userId, board);
            leaderboardBody.appendChild(row);
        });

        console.log("Leaderboard updated with dynamically calculated correct guesses.");
    }).catch((error) => {
        console.error("Error loading leaderboard:", error);
    });
}


function displayUserBoard(userId, board) {
    const selectedBoardContainer = document.getElementById("selected-board-container");
    const selectedBingoBoard = document.getElementById("selected-bingo-board");
    const selectedUserTitle = document.getElementById("selected-user-title");

    // Update the title with the selected user's name
    selectedUserTitle.textContent = `${board.displayName}'s Bingo Board`;

    // Generate the board layout
    let boardHTML = '<div class="leaderboard-grid">';
    for (let i = 0; i < 25; i++) {
        const artistName = board.board[i] || "";
        boardHTML += `<div class="leaderboard-square">${artistName}</div>`;
    }
    boardHTML += "</div>";

    selectedBingoBoard.innerHTML = boardHTML;
    selectedBoardContainer.style.display = "block"; // Show the container
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

// Expose functions globally so they can be called from index.html
window.submitBingoBoard = submitBingoBoard;
window.clearBingoBoard = clearBingoBoard;

