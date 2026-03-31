import { initSocket, createRoom, joinRoom, joinPublic, makeMove } from './socket.js';

// Elements
const menuScreen = document.getElementById('menu-screen');
const waitingScreen = document.getElementById('waiting-screen');
const gameScreen = document.getElementById('game-screen');

const btnPublic = document.getElementById('btn-public');
const btnCreatePrivate = document.getElementById('btn-create-private');
const btnJoinPrivate = document.getElementById('btn-join-private');
const inputRoomCode = document.getElementById('input-room-code');
const roomCodeDisplay = document.getElementById('room-code-display');
const btnLeave = document.getElementById('btn-leave');
const selectBoardSize = document.getElementById('board-size');
const selectNumPlayers = document.getElementById('num-players');

const turnText = document.getElementById('turn-text');
const currentMoveText = document.getElementById('current-move-text');
const gameBoard = document.getElementById('board');
const playersContainer = document.getElementById('players-container');

const alertsContainer = document.getElementById('alerts-container');
const gameOverModal = document.getElementById('game-over-modal');
const gameOverResults = document.getElementById('game-over-results');

// State
let currentRoomId = null;
let myPlayerNum = null;
let maxTokens = 10;

// Initialize
initSocket();

// View Management
function showScreen(screen) {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  screen.classList.add('active');
}

function showAlert(msg) {
  const alert = document.createElement('div');
  alert.className = 'alert';
  alert.textContent = msg;
  alertsContainer.appendChild(alert);
  setTimeout(() => alert.remove(), 4000);
}

// Dropdown dynamic logic
if (selectNumPlayers) {
  function updateBoardSizes() {
    const numPlayers = parseInt(selectNumPlayers.value);
    selectBoardSize.innerHTML = '';
    let found = false;
    for (let r = 4; r <= 16; r++) {
      const totalCircles = (r * (r + 1)) / 2;
      if ((totalCircles - 1) % numPlayers === 0) {
        found = true;
        const el = document.createElement('option');
        el.value = r;
        el.textContent = `${r} Rows (${totalCircles} Circles)`;
        // Select standard sizes by default if possible
        if (totalCircles >= 20 && totalCircles <= 30 && !selectBoardSize.children.length) {
            el.selected = true;
        }
        selectBoardSize.appendChild(el);
      }
    }
    if (!found) {
        const el = document.createElement('option');
        el.value = 6;
        el.textContent = '6 Rows (Fallback)';
        selectBoardSize.appendChild(el);
    }
  }
  selectNumPlayers.addEventListener('change', updateBoardSizes);
  updateBoardSizes(); // init
}

// Event Listeners
btnPublic.addEventListener('click', () => {
  const rows = parseInt(selectBoardSize.value);
  const numPlayers = parseInt(selectNumPlayers?.value || 2);
  joinPublic(rows, numPlayers);
});

btnCreatePrivate.addEventListener('click', () => {
  const rows = parseInt(selectBoardSize.value);
  const numPlayers = parseInt(selectNumPlayers?.value || 2);
  createRoom(rows, numPlayers);
});

btnJoinPrivate.addEventListener('click', () => {
  const code = inputRoomCode.value.trim();
  if (code) {
    joinRoom(code);
  }
});

btnLeave.addEventListener('click', () => {
  location.reload(); // Quick reset
});

document.getElementById('btn-play-again').addEventListener('click', () => {
    location.reload();
});

// Socket Event Handlers
export function handleRoomCreated({ roomId, playerNum, state }) {
  currentRoomId = roomId;
  myPlayerNum = playerNum;
  roomCodeDisplay.textContent = `Room Code: ${roomId}`;
  updateWaitingScreen(state);
  showScreen(waitingScreen);
}

export function handleJoinedRoom({ roomId, playerNum, state }) {
  currentRoomId = roomId;
  myPlayerNum = playerNum;
  if (state.status === 'waiting') {
    roomCodeDisplay.textContent = `Room Code: ${roomId}`;
    updateWaitingScreen(state);
    showScreen(waitingScreen);
  }
}

function updateWaitingScreen(state) {
    const waitingText = waitingScreen.querySelector('h2');
    if (waitingText) {
        waitingText.textContent = `Waiting for players... (${state.playersCount}/${state.maxPlayers})`;
    }
}

export function handleGameUpdate(state) {
  if (state.status === 'playing' && document.querySelector('.screen.active') !== gameScreen) {
      showScreen(gameScreen);
  } else if (state.status === 'waiting' && document.querySelector('.screen.active') === waitingScreen) {
      updateWaitingScreen(state);
  }

  maxTokens = state.maxTokens;
  renderBoard(state);
  updateUI(state);

  if (state.status === 'finished') {
      showGameOver(state);
  }
}

export function handleError(msg) {
  showAlert(msg);
  if (msg === 'Player left.') {
    setTimeout(() => {
      location.reload();
    }, 1500);
  }
}

export function updateOnlineUsers(count) {
  const onlineCountSpan = document.getElementById('online-count');
  if (onlineCountSpan) {
    onlineCountSpan.textContent = count;
  }
}

// Game Rendering & UI Updates
function renderBoard(state) {
  gameBoard.innerHTML = '';
  let index = 0;
  for (let r = 0; r < state.rows; r++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'pyramid-row';

    for (let c = 0; c <= r; c++) {
      const circleParams = {
        i: index,
        cell: state.board[index],
        isBlackHole: index === state.blackHoleIndex,
        isMyTurn: state.status === 'playing' && state.turn === myPlayerNum
      };
      
      const circle = createCircle(circleParams);
      rowDiv.appendChild(circle);
      index++;
    }
    gameBoard.appendChild(rowDiv);
  }
}

function createCircle({ i, cell, isBlackHole, isMyTurn }) {
  const div = document.createElement('div');
  div.className = 'circle';
  
  if (cell) {
    div.classList.add(`p${cell.player}-token`);
    div.textContent = cell.value;
  } else if (isBlackHole) {
    div.classList.add('black-hole');
  } else {
    // Empty cell
    if (isMyTurn) {
      div.addEventListener('click', () => {
        makeMove(currentRoomId, i);
      });
      div.style.cursor = 'pointer';
      // hover effect only for your turn
      div.classList.add('interactive'); 
    }
  }

  return div;
}

function updateUI(state) {
    if (playersContainer) playersContainer.innerHTML = '';
    
    // Current token info
    let counts = {};
    for (let i = 1; i <= state.maxPlayers; i++) counts[i] = 0;
    
    state.board.forEach(c => {
        if(c) counts[c.player]++;
    });

    if (playersContainer) {
        for (let i = 1; i <= state.maxPlayers; i++) {
            const card = document.createElement('div');
            card.className = `player-card p${i}`;
            if (state.status === 'playing' && state.turn === i) card.classList.add('active');
            
            card.innerHTML = `
                <span class="p-name">Player ${i}</span>
                <span class="p-score">Tokens: <span>${counts[i]} / ${state.maxTokens}</span></span>
            `;
            playersContainer.appendChild(card);
        }
    }

    if (state.turn === myPlayerNum) {
        turnText.textContent = "YOUR TURN";
        turnText.style.color = 'var(--primary)';
    } else {
        turnText.textContent = "OPPONENT'S TURN";
        turnText.style.color = 'var(--text-muted)';
    }

    currentMoveText.innerHTML = `Placing: <span class="badge badge-lg">${state.currentValue}</span>`;
    
    if (state.status === 'finished') {
        turnText.textContent = "GAME OVER";
        currentMoveText.innerHTML = "";
    }
}

function showGameOver(state) {
    // Animate the suck in effect
    const neighbors = getNeighbors(state.blackHoleIndex, state.rows);
    const rowDivs = gameBoard.children;

    neighbors.forEach(nIdx => {
      let r = 0;
      while (r < state.rows && (r+1)*(r+2)/2 <= nIdx) r++;
      const c = nIdx - r*(r+1)/2;
      
      if (rowDivs[r] && rowDivs[r].children[c]) {
          const circle = rowDivs[r].children[c];
          setTimeout(() => {
              circle.classList.add('destroyed');
          }, 500 + Math.random() * 1000);
      }
    });

    setTimeout(() => {
        gameOverModal.classList.add('active');
        
        if (gameOverResults) {
            gameOverResults.innerHTML = '';
            for(let i=1; i <= state.maxPlayers; i++) {
                const p = document.createElement('p');
                p.innerHTML = `Player ${i} destroyed tokens: <span class="bold">${state.scores[`player${i}`] || 0}</span>`;
                gameOverResults.appendChild(p);
            }
        }

        const winnerText = document.getElementById('winner-text');
        if (state.winner === 'draw') {
             winnerText.textContent = "It's a Draw!";
        } else if (state.winner === myPlayerNum) {
             winnerText.textContent = "You Win!";
             winnerText.style.color = 'var(--primary)';
        } else {
             winnerText.textContent = "You Lose!";
             winnerText.style.color = '#ef4444';
        }

    }, 2000);
}

function getNeighbors(index, rows) {
    const neighbors = [];
    let r = 0;
    while(r < rows && (r+1)*(r+2)/2 <= index) r++;
    const c = index - r*(r+1)/2;

    const addIfValid = (nr, nc) => {
        if(nr >= 0 && nr < rows && nc >= 0 && nc <= nr) {
            neighbors.push(nr*(nr+1)/2 + nc);
        }
    };
    addIfValid(r, c-1);       
    addIfValid(r, c+1);       
    addIfValid(r-1, c-1);     
    addIfValid(r-1, c);       
    addIfValid(r+1, c);       
    addIfValid(r+1, c+1);     

    return neighbors;
}
