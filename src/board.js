import { makeMove } from './socket.js';

let boardElement = null;
let currentRoomId = null;

export function initBoard(elementId) {
  boardElement = document.getElementById(elementId);
}

export function setRoomId(id) {
  currentRoomId = id;
}

export function renderBoard(state, myPlayerNum) {
  if (!boardElement) return;
  boardElement.innerHTML = '';

  const { rows, board, status, turn, blackHoleIndex } = state;

  let index = 0;
  for (let r = 0; r < rows; r++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'pyramid-row';

    for (let c = 0; c <= r; c++) {
      const circleParams = {
        i: index,
        cell: board[index],
        isBlackHole: index === blackHoleIndex,
        isMyTurn: status === 'playing' && turn === myPlayerNum
      };
      
      const circle = createCircle(circleParams);
      rowDiv.appendChild(circle);
      index++;
    }
    boardElement.appendChild(rowDiv);
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
    // Empty cell, can be clicked if it's my turn
    if (isMyTurn) {
      div.addEventListener('click', () => {
        makeMove(currentRoomId, i);
      });
    }
  }

  return div;
}

export function playSuckAnimation(state) {
    if (state.blackHoleIndex === -1) return;
    
    // We would need the getNeighbors logic on the client too to easily find neighbors.
    // However, we can simply find the difference between total tokens and remaining tokens,
    // or we can see which cells are adjacent.
    // A simpler way: just rely on the scores calculated by the server and animate all 
    // circles that are adjacent to the black hole.
    const neighbors = getNeighbors(state.blackHoleIndex, state.rows);
    
    const rowDivs = boardElement.children;
    neighbors.forEach(nIdx => {
      // Find the specific DOM node
      let r = 0;
      while (r < state.rows && (r+1)*(r+2)/2 <= nIdx) r++;
      const c = nIdx - r*(r+1)/2;
      
      if (rowDivs[r] && rowDivs[r].children[c]) {
          const circle = rowDivs[r].children[c];
          setTimeout(() => {
              circle.classList.add('destroyed');
          }, Math.random() * 500); // Staggered animation
      }
    });
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
