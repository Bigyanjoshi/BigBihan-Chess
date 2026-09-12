// Chess Evaluation Engine & AI Bot
// Provides real-time position evaluation (like Chess.com advantage bar) and bot moves
(function(global) {
  // Piece-Square Tables (Midgame)
  const PAWN_PST = [
    0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0
  ];

  const KNIGHT_PST = [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50
  ];

  const BISHOP_PST = [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20
  ];

  const ROOK_PST = [
      0,  0,  0,  0,  0,  0,  0,  0,
      5, 10, 10, 10, 10, 10, 10,  5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
      0,  0,  0,  5,  5,  0,  0,  0
  ];

  const QUEEN_PST = [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20
  ];

  const KING_MID_PST = [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20
  ];

  const PIECE_VALUES = {
    p: 100,
    n: 320,
    b: 330,
    r: 500,
    q: 900,
    k: 20000
  };

  const PST_MAP = {
    p: PAWN_PST,
    n: KNIGHT_PST,
    b: BISHOP_PST,
    r: ROOK_PST,
    q: QUEEN_PST,
    k: KING_MID_PST
  };

  class ChessEvaluator {
    evaluatePosition(chess) {
      if (chess.in_checkmate()) {
        return chess.turn() === 'w' ? -20000 : 20000;
      }
      if (chess.in_draw() || chess.in_stalemate() || chess.in_threefold_repetition()) {
        return 0;
      }

      let score = 0;
      const board = chess.board();

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (!piece) continue;

          const val = PIECE_VALUES[piece.type] || 0;
          const pst = PST_MAP[piece.type];

          let pstVal = 0;
          if (pst) {
            const sqIdx = piece.color === 'w' ? (r * 8 + c) : ((7 - r) * 8 + c);
            pstVal = pst[sqIdx] || 0;
          }

          const totalPieceVal = val + pstVal;
          if (piece.color === 'w') {
            score += totalPieceVal;
          } else {
            score -= totalPieceVal;
          }
        }
      }

      // Tempo bonus for side to move
      score += (chess.turn() === 'w' ? 15 : -15);

      return score;
    }

    minimax(chess, depth, alpha, beta, isMaximizing) {
      if (depth === 0 || chess.game_over()) {
        return this.evaluatePosition(chess);
      }

      const moves = chess.moves({ verbose: true });
      moves.sort((a, b) => {
        const aScore = a.captured ? 10 : 0;
        const bScore = b.captured ? 10 : 0;
        return bScore - aScore;
      });

      if (isMaximizing) {
        let maxEval = -Infinity;
        for (let move of moves) {
          chess.move(move);
          const evaluation = this.minimax(chess, depth - 1, alpha, beta, false);
          chess.undo();
          maxEval = Math.max(maxEval, evaluation);
          alpha = Math.max(alpha, evaluation);
          if (beta <= alpha) break;
        }
        return maxEval;
      } else {
        let minEval = Infinity;
        for (let move of moves) {
          chess.move(move);
          const evaluation = this.minimax(chess, depth - 1, alpha, beta, true);
          chess.undo();
          minEval = Math.min(minEval, evaluation);
          beta = Math.min(beta, evaluation);
          if (beta <= alpha) break;
        }
        return minEval;
      }
    }

    getAdvantage(chess) {
      if (chess.in_checkmate()) {
        const winner = chess.turn() === 'w' ? 'Black' : 'White';
        return {
          score: chess.turn() === 'w' ? -20000 : 20000,
          whitePct: chess.turn() === 'w' ? 0 : 100,
          text: '#',
          isMate: true,
          winner
        };
      }
      if (chess.in_draw() || chess.in_stalemate()) {
        return { score: 0, whitePct: 50, text: '0.0', isMate: false };
      }

      const score = this.evaluatePosition(chess);
      const clampedScore = Math.max(-1500, Math.min(1500, score));
      const winningProbability = 1 / (1 + Math.pow(10, -clampedScore / 400));
      const whitePct = Math.round(winningProbability * 100);

      const pawnVal = (score / 100).toFixed(1);
      const displayText = score > 0 ? ('+' + pawnVal) : (score < 0 ? pawnVal : '0.0');

      return {
        score,
        whitePct,
        text: displayText,
        isMate: false
      };
    }

    getBotMove(chess, difficulty = 'medium') {
      const moves = chess.moves({ verbose: true });
      if (moves.length === 0) return null;

      const diff = (difficulty || 'medium').toLowerCase();

      if (diff === 'easy') {
        const captures = moves.filter(m => m.captured);
        if (captures.length > 0 && Math.random() < 0.4) {
          return captures[Math.floor(Math.random() * captures.length)];
        }
        return moves[Math.floor(Math.random() * moves.length)];
      }

      let depth = 2;
      if (diff === 'hard') depth = 2;
      else if (diff === 'pro') depth = 3;

      const isWhite = chess.turn() === 'w';
      let bestMove = null;
      let bestEval = isWhite ? -Infinity : Infinity;
      let alpha = -Infinity;
      let beta = Infinity;

      // Order moves: captures first
      moves.sort((a, b) => {
        const aScore = a.captured ? 10 : 0;
        const bScore = b.captured ? 10 : 0;
        return bScore - aScore;
      });

      for (let move of moves) {
        chess.move(move);
        const evalVal = this.minimax(chess, depth - 1, alpha, beta, !isWhite);
        chess.undo();

        if (isWhite) {
          if (evalVal > bestEval) {
            bestEval = evalVal;
            bestMove = move;
          }
          alpha = Math.max(alpha, evalVal);
        } else {
          if (evalVal < bestEval) {
            bestEval = evalVal;
            bestMove = move;
          }
          beta = Math.min(beta, evalVal);
        }
      }

      return bestMove || moves[0];
    }

    classifyMove(prevScore, newScore, color, moveRecord) {
      let cpLoss = (color === 'w') ? (prevScore - newScore) : (newScore - prevScore);
      if (isNaN(cpLoss)) cpLoss = 0;

      let quality = 'good';
      let label = 'Good';
      let icon = '✓';
      let badgeClass = 'badge-good';
      let blunderNote = null;

      const isCapture = moveRecord.captured !== null;
      const isCheck = moveRecord.san.includes('+') || moveRecord.san.includes('#');

      if (cpLoss <= 10) {
        if (isCheck || (isCapture && moveRecord.piece !== 'p')) {
          quality = 'brilliant';
          label = 'Brilliant';
          icon = '!!';
          badgeClass = 'badge-brilliant';
        } else {
          quality = 'best';
          label = 'Best';
          icon = '★';
          badgeClass = 'badge-best';
        }
      } else if (cpLoss <= 25) {
        quality = 'great';
        label = 'Great';
        icon = '!';
        badgeClass = 'badge-great';
      } else if (cpLoss <= 60) {
        quality = 'good';
        label = 'Good';
        icon = '✓';
        badgeClass = 'badge-good';
      } else if (cpLoss <= 120) {
        quality = 'inaccuracy';
        label = 'Inaccuracy';
        icon = '?!';
        badgeClass = 'badge-inaccuracy';
        blunderNote = 'Inaccuracy (-' + (cpLoss / 100).toFixed(1) + ' pawns). Sub-optimal continuation.';
      } else if (cpLoss <= 300) {
        quality = 'mistake';
        label = 'Mistake';
        icon = '?';
        badgeClass = 'badge-mistake';
        blunderNote = 'Mistake (-' + (cpLoss / 100).toFixed(1) + ' pawns). Position deteriorated.';
      } else {
        quality = 'blunder';
        label = 'Blunder';
        icon = '??';
        badgeClass = 'badge-blunder';
        blunderNote = 'Blunder (-' + (cpLoss / 100).toFixed(1) + ' pawns). Gave away critical advantage.';
      }

      return {
        quality,
        label,
        icon,
        badgeClass,
        cpLoss,
        blunderNote,
        evalScore: newScore
      };
    }
  }

  global.ChessEvaluator = new ChessEvaluator();
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
