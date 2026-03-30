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

const p1TokensEl = document.getElementById('p1-tokens');
const p2TokensEl = document.getElementById('p2-tokens');
const p1Card = document.querySelector('.player-card.p1');
const p2Card = document.querySelector('.player-card.p2');
const turnText = document.getElementById('turn-text');
const currentMoveText = document.getElementById('current-move-text');
const gameBoard = document.getElementById('board');

const alertsContainer = document.getElementById('alerts-container');
const gameOverModal = document.getElementById('game-over-modal');

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

// Event Listeners
btnPublic.addEventListener('click', () => {
  const rows = parseInt(selectBoardSize.value);
  joinPublic(rows);
});

btnCreatePrivate.addEventListener('click', () => {
  const rows = parseInt(selectBoardSize.value);
  createRoom(rows);
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
  showScreen(waitingScreen);
}

export function handleJoinedRoom({ roomId, playerNum, state }) {
  currentRoomId = roomId;
  myPlayerNum = playerNum;
  // Let game update handle transition to game screen
}

export function handleGameUpdate(state) {
  if (state.status === 'playing' && document.querySelector('.screen.active') !== gameScreen) {
      showScreen(gameScreen);
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
    // Current token info
    let p1T = 0; let p2T = 0;
    state.board.forEach(c => {
        if(c) {
            if(c.player===1) p1T++;
            if(c.player===2) p2T++;
        }
    });

    p1TokensEl.textContent = `${p1T} / ${state.maxTokens}`;
    p2TokensEl.textContent = `${p2T} / ${state.maxTokens}`;

    p1Card.classList.remove('active');
    p2Card.classList.remove('active');
    
    if (state.status === 'playing') {
        if (state.turn === 1) p1Card.classList.add('active');
        if (state.turn === 2) p2Card.classList.add('active');
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
        document.getElementById('p1-final-score').textContent = state.scores.player1;
        document.getElementById('p2-final-score').textContent = state.scores.player2;

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
