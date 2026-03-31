export class GameRoom {
  constructor(id, rows, maxPlayers) {
    this.id = id;
    this.rows = rows;
    this.maxPlayers = maxPlayers || 2;
    this.totalCircles = (rows * (rows + 1)) / 2;
    this.maxTokens = (this.totalCircles - 1) / this.maxPlayers;
    this.board = Array(this.totalCircles).fill(null); 
    this.players = []; // [{id, number}]
    this.turn = 1;
    this.currentValue = 1;
    this.status = 'waiting'; 
    this.winner = null;
    this.scores = {};
    for (let i = 1; i <= this.maxPlayers; i++) {
        this.scores[`player${i}`] = 0;
    }
    this.blackHoleIndex = -1;
  }

  addPlayer(playerId) {
    if (this.players.length >= this.maxPlayers) return false;
    if (this.players.some(p => p.id === playerId)) return false;
    const playerNum = this.players.length + 1;
    this.players.push({ id: playerId, number: playerNum });
    if (this.players.length === this.maxPlayers) {
      this.status = 'playing';
    }
    return playerNum;
  }

  removePlayer(playerId) {
    const p = this.players.find(p => p.id === playerId);
    if (!p) return;
    this.players = this.players.filter(p => p.id !== playerId);
    this.status = 'finished'; // end game if someone leaves early
    this.winner = this.players.length > 0 ? this.players[0].number : null; 
  }

  makeMove(playerId, index) {
    if (this.status !== 'playing') return { error: 'Game not active' };
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { error: 'Player not in room' };
    if (this.turn !== player.number) return { error: 'Not your turn' };
    if (index < 0 || index >= this.totalCircles || this.board[index] !== null) return { error: 'Invalid move' };

    this.board[index] = { player: player.number, value: this.currentValue };

    if (this.turn < this.maxPlayers) {
      this.turn++;
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
    this.scores = {};
    for (let i = 1; i <= this.maxPlayers; i++) {
        this.scores[`player${i}`] = 0;
    }

    neighbors.forEach(nIndex => {
        const cell = this.board[nIndex];
        if (cell) {
            this.scores[`player${cell.player}`] += cell.value;
        }
    });

    let minScore = Infinity;
    let minPlayers = [];
    for (const [pKey, score] of Object.entries(this.scores)) {
        if (score < minScore) {
            minScore = score;
            minPlayers = [parseInt(pKey.replace('player', ''))];
        } else if (score === minScore) {
            minPlayers.push(parseInt(pKey.replace('player', '')));
        }
    }

    if (minPlayers.length === 1) {
        this.winner = minPlayers[0];
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
      maxPlayers: this.maxPlayers,
      playersCount: this.players.length,
      winner: this.winner,
      scores: this.scores,
      blackHoleIndex: this.blackHoleIndex,
      rows: this.rows
    };
  }
}
