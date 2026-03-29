export class GameRoom {
  constructor(id, rows) {
    this.id = id;
    this.rows = rows;
    this.totalCircles = (rows * (rows + 1)) / 2;
    this.maxTokens = (this.totalCircles - 1) / 2; // Tokens each player gets
    this.board = Array(this.totalCircles).fill(null); 
    this.players = []; // [{id, number}]
    this.turn = 1;
    this.currentValue = 1;
    this.status = 'waiting'; 
    this.winner = null;
    this.scores = { player1: 0, player2: 0 };
    this.blackHoleIndex = -1;
  }

  addPlayer(playerId) {
    if (this.players.length >= 2) return false;
    const playerNum = this.players.length === 0 ? 1 : 2;
    this.players.push({ id: playerId, number: playerNum });
    if (this.players.length === 2) {
      this.status = 'playing';
    }
    return playerNum;
  }

  removePlayer(playerId) {
    const p = this.players.find(p => p.id === playerId);
    if (!p) return;
    this.players = this.players.filter(p => p.id !== playerId);
    this.status = 'finished'; // end game if someone leaves early
    this.winner = p.number === 1 ? 2 : 1; // other player wins by default
  }

  makeMove(playerId, index) {
    if (this.status !== 'playing') return { error: 'Game not active' };
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { error: 'Player not in room' };
    if (this.turn !== player.number) return { error: 'Not your turn' };
    if (index < 0 || index >= this.totalCircles || this.board[index] !== null) return { error: 'Invalid move' };

    this.board[index] = { player: player.number, value: this.currentValue };

    if (this.turn === 1) {
      this.turn = 2;
    } else {
      this.turn = 1;
      this.currentValue++;
    }

    if (this.currentValue > this.maxTokens) {
      this.finishGame();
    }

    return { success: true };
  }

  getNeighbors(index) {
    const neighbors = [];
    const R = this.rows;
    let r = 0;
    while(r < R && (r+1)*(r+2)/2 <= index) {
        r++;
    }
    const c = index - r*(r+1)/2;

    const addIfValid = (nr, nc) => {
        if(nr >= 0 && nr < R && nc >= 0 && nc <= nr) {
            neighbors.push(nr*(nr+1)/2 + nc);
        }
    };

    addIfValid(r, c-1);       // left
    addIfValid(r, c+1);       // right
    addIfValid(r-1, c-1);     // top-left
    addIfValid(r-1, c);       // top-right
    addIfValid(r+1, c);       // bottom-left
    addIfValid(r+1, c+1);     // bottom-right

    return neighbors;
  }

  finishGame() {
    this.status = 'finished';
    this.blackHoleIndex = this.board.findIndex(b => b === null);

    const neighbors = this.getNeighbors(this.blackHoleIndex);
    this.scores = { player1: 0, player2: 0 };
    neighbors.forEach(nIndex => {
        const cell = this.board[nIndex];
        if (cell) {
            if (cell.player === 1) this.scores.player1 += cell.value;
            if (cell.player === 2) this.scores.player2 += cell.value;
        }
    });

    if (this.scores.player1 < this.scores.player2) {
        this.winner = 1;
    } else if (this.scores.player2 < this.scores.player1) {
        this.winner = 2;
    } else {
        this.winner = 'draw';
    }
  }

  getState() {
    return {
      id: this.id,
      status: this.status,
      board: this.board,
      turn: this.turn,
      currentValue: this.currentValue,
      maxTokens: this.maxTokens,
      playersCount: this.players.length,
      winner: this.winner,
      scores: this.scores,
      blackHoleIndex: this.blackHoleIndex,
      rows: this.rows
    };
  }
}
