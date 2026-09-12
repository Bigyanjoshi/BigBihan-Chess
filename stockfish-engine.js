// Unified Stockfish Engine Manager (Web Worker + UCI Protocol)
class StockfishEngine {
  constructor() {
    this.worker = null;
    this.isReady = false;
    this.readyCallbacks = [];
    this.currentTask = null; // { type: 'eval'|'bot'|'custom', resolve, reject, ... }
    this.analysisAbort = false;
    this.skillLevel = 10;
    this.init();
  }

  init() {
    try {
      if (typeof Worker !== 'undefined') {
        try {
          this.worker = new Worker('stockfish.js');
        } catch (e) {
          console.warn('Direct worker instantiation failed, attempting Blob worker fallback:', e);
          if (typeof stockfishSource !== 'undefined') {
            const blob = new Blob([stockfishSource], { type: 'application/javascript' });
            this.worker = new Worker(URL.createObjectURL(blob));
          }
        }
      }

      if (this.worker) {
        this.worker.onmessage = (e) => this.handleMessage(e.data);
        this.worker.onerror = (err) => {
          console.error('Stockfish Worker Error:', err);
          if (this.currentTask && this.currentTask.reject) {
            this.currentTask.reject(err);
            this.currentTask = null;
          }
        };

        this.send('uci');
        this.send('isready');
      } else {
        console.warn('Stockfish Worker unavailable in this environment.');
      }
    } catch (err) {
      console.error('Failed to initialize Stockfish:', err);
    }
  }

  send(cmd) {
    if (this.worker) {
      this.worker.postMessage(cmd);
    }
  }

  handleMessage(line) {
    if (typeof line !== 'string') return;

    if (line === 'uciok') {
      this.send('setoption name Threads value 1');
      this.send('setoption name Hash value 16');
      return;
    }

    if (line === 'readyok') {
      this.isReady = true;
      while (this.readyCallbacks.length > 0) {
        const cb = this.readyCallbacks.shift();
        cb();
      }
      return;
    }

    if (!this.currentTask) return;

    const task = this.currentTask;

    // Parse info line for score and depth
    if (line.startsWith('info ')) {
      let cpMatch = line.match(/score cp (-?\d+)/);
      let mateMatch = line.match(/score mate (-?\d+)/);
      let depthMatch = line.match(/depth (\d+)/);
      let pvMatch = line.match(/pv (.+)/);

      if (depthMatch) {
        task.lastDepth = parseInt(depthMatch[1], 10);
      }

      if (cpMatch) {
        // Stockfish scores from the side-to-move's perspective.
        // We normalize so positive is always White advantage.
        let rawScore = parseInt(cpMatch[1], 10);
        let normalizedScore = (task.turn === 'b') ? -rawScore : rawScore;
        task.lastScore = normalizedScore;
        task.lastMate = null;

        if (task.onStreamEval) {
          task.onStreamEval({
            score: normalizedScore,
            mate: null,
            depth: task.lastDepth,
            pv: pvMatch ? pvMatch[1] : ''
          });
        }
      } else if (mateMatch) {
        let rawMate = parseInt(mateMatch[1], 10);
        let normalizedMate = (task.turn === 'b') ? -rawMate : rawMate;
        task.lastMate = normalizedMate;
        task.lastScore = normalizedMate > 0 ? 10000 : -10000;

        if (task.onStreamEval) {
          task.onStreamEval({
            score: task.lastScore,
            mate: normalizedMate,
            depth: task.lastDepth,
            pv: pvMatch ? pvMatch[1] : ''
          });
        }
      }
    }

    // Parse bestmove line (end of search)
    if (line.startsWith('bestmove ')) {
      const parts = line.split(' ');
      const bestMoveStr = parts[1];
      const timer = task.timer;
      if (timer) clearTimeout(timer);

      this.currentTask = null;

      if (task.type === 'bot') {
        if (!bestMoveStr || bestMoveStr === '(none)') {
          task.resolve(null);
        } else {
          const from = bestMoveStr.slice(0, 2);
          const to = bestMoveStr.slice(2, 4);
          const promotion = bestMoveStr.length > 4 ? bestMoveStr[4] : undefined;
          task.resolve({ from, to, promotion, bestMove: bestMoveStr });
        }
      } else if (task.type === 'eval') {
        task.resolve({
          score: task.lastScore !== undefined ? task.lastScore : 0,
          mate: task.lastMate || null,
          depth: task.lastDepth || 10,
          bestMove: bestMoveStr
        });
      }
    }
  }

  waitForReady() {
    return new Promise((resolve) => {
      if (this.isReady) return resolve();
      this.readyCallbacks.push(resolve);
    });
  }

  // Live Eval Bar evaluation (Shallow depth ~10-12 or 250ms)
  evaluatePosition(fen, depth = 10, timeoutMs = 800, onStreamEval = null) {
    return new Promise((resolve, reject) => {
      this.waitForReady().then(() => {
        // Stop any running search
        this.send('stop');

        const turn = (fen.split(' ')[1] || 'w');
        const task = {
          type: 'eval',
          turn,
          lastScore: 0,
          lastMate: null,
          lastDepth: 0,
          onStreamEval,
          resolve,
          reject
        };

        task.timer = setTimeout(() => {
          if (this.currentTask === task) {
            this.send('stop');
          }
        }, timeoutMs);

        this.currentTask = task;
        this.send('position fen ' + fen);
        this.send('go depth ' + depth);
      });
    });
  }

  // Bot move generator mapped to Easy, Medium, Hard, Pro
  getBotMove(fen, difficulty = 'medium') {
    return new Promise((resolve, reject) => {
      this.waitForReady().then(() => {
        this.send('stop');

        let skill = 10;
        let depth = 6;
        let movetime = 300;

        switch (difficulty.toLowerCase()) {
          case 'easy':
            skill = 2;
            depth = 3;
            movetime = 150;
            break;
          case 'medium':
            skill = 8;
            depth = 6;
            movetime = 350;
            break;
          case 'hard':
            skill = 15;
            depth = 11;
            movetime = 700;
            break;
          case 'pro':
            skill = 20;
            depth = 16;
            movetime = 1500;
            break;
          default:
            skill = 8;
            depth = 6;
            movetime = 350;
        }

        this.send('setoption name Skill Level value ' + skill);

        const turn = (fen.split(' ')[1] || 'b');
        const task = {
          type: 'bot',
          turn,
          resolve,
          reject
        };

        task.timer = setTimeout(() => {
          if (this.currentTask === task) {
            this.send('stop');
          }
        }, movetime + 5000);

        this.currentTask = task;
        this.send('position fen ' + fen);
        this.send('go depth ' + depth + ' movetime ' + movetime);
      });
    });
  }

  // Move Quality Classification based on Centipawn Loss
  classifyMove(prevScore, newScore, color, moveRecord) {
    // Calculate advantage delta from perspective of active player
    // Scores are normalized (positive = White advantage, negative = Black advantage)
    let cpLoss = 0;
    if (color === 'w') {
      cpLoss = prevScore - newScore;
    } else {
      cpLoss = newScore - prevScore;
    }

    // Protect against weird mate scores
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

  // Deeper background analysis pass over structuredHistory
  async analyzeHistory(structuredHistory, initialFen, onProgress) {
    this.analysisAbort = false;
    let previousScore = 0; // Starting position is ~0.0

    for (let i = 0; i < structuredHistory.length; i++) {
      if (this.analysisAbort) break;

      const record = structuredHistory[i];
      try {
        // Deep pass (depth 14 for snappy responsive browser analysis)
        const result = await this.evaluatePosition(record.fen, 14, 1200);
        const currentScore = result.score;
        const color = record.color;

        const classification = this.classifyMove(previousScore, currentScore, color, record);
        record.analysis = classification;
        record.evalScore = currentScore;
        record.evalMate = result.mate;

        previousScore = currentScore;

        if (onProgress) {
          onProgress(i + 1, structuredHistory.length, record);
        }
      } catch (e) {
        console.error('Error analyzing move ' + i + ':', e);
      }
    }
  }

  stopAnalysis() {
    this.analysisAbort = true;
    this.send('stop');
  }
}

// Global engine instance
window.stockfishEngine = new StockfishEngine();
