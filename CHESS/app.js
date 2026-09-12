// Chess.com Clone Application Logic - Perfected & Unified
document.addEventListener('DOMContentLoaded', () => {
  const chess = new Chess();
  const initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

  let orientation = 'white';
  let autoFlip = false;
  let selectedSquare = null;
  let legalMovesForSelected = [];
  let lastMove = null;
  let pendingPromotion = null;
  let gameMode = 'local'; // 'local', 'online', 'bot'
  let botDifficulty = 'medium'; // 'easy', 'medium', 'hard', 'pro'
  let myBotColor = 'w';
  let myOnlineColor = 'w';
  let remoteUsername = 'Friend';

  // 1. USERNAME PERSISTENCE
  let myUsername = localStorage.getItem('chess_username') || 'Player';
  const usernameInput = document.getElementById('username-input');
  if (usernameInput) {
    usernameInput.value = myUsername;
  }

  // 2. ADVANCED CHAINED MULTI-PREMOVE STATE (Universal across Bot, Pass & Play, Multiplayer)
  // Queue of multiple chained premoves: [{ from, to, color, promotion, san, step }]
  let premoveQueue = [];
  let activePremove = null; // Synced with premoveQueue[0] for backwards compatibility
  let premoveSelectionSquare = null;
  let legalPremoveMoves = [];

  function syncActivePremove() {
    activePremove = premoveQueue[0] || null;
  }

  // 3. STRUCTURED MOVE HISTORY & REVIEW MODE STATE
  let structuredHistory = [];
  let isGameOver = false;
  let isReviewMode = false;
  let reviewIndex = -1;
  let autoPlayTimer = null;
  let autoPlayLoop = false;
  const autoPlayIntervalMs = 1000;

  // DOM Elements
  const boardEl = document.getElementById('chessboard');
  const boardContainer = document.getElementById('board-container');
  const dragGhost = document.getElementById('drag-ghost');
  const topPlayerCard = document.getElementById('top-player-card');
  const bottomPlayerCard = document.getElementById('bottom-player-card');
  const topPlayerName = document.getElementById('top-player-name');
  const bottomPlayerName = document.getElementById('bottom-player-name');
  const topPlayerAvatar = document.getElementById('top-player-avatar');
  const bottomPlayerAvatar = document.getElementById('bottom-player-avatar');
  const headerWhitePlayer = document.getElementById('header-white-player');
  const headerBlackPlayer = document.getElementById('header-black-player');

  const statusHeadline = document.getElementById('status-headline');
  const statusSub = document.getElementById('status-sub');
  const moveListEl = document.getElementById('move-list-scroll');
  const promotionOverlay = document.getElementById('promotion-overlay');
  const promotionChoices = document.getElementById('promotion-choices');
  const modalBackdrop = document.getElementById('game-over-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalSubtitle = document.getElementById('modal-subtitle');
  const modalTrophy = document.getElementById('modal-trophy');
  const btnModalReview = document.getElementById('btn-modal-review');
  const btnModalRestart = document.getElementById('btn-modal-restart');

  // Eval Bar Elements
  const evalBarContainer = document.getElementById('eval-bar-container');
  const evalBarWhite = document.getElementById('eval-bar-white');
  const evalScoreBadge = document.getElementById('eval-score-badge');
  const btnToggleEval = document.getElementById('btn-toggle-eval');

  // Premove UI Elements
  const premoveBar = document.getElementById('premove-bar');
  const premoveText = document.getElementById('premove-text');
  const btnClearPremoves = document.getElementById('btn-clear-premoves');
  const btnUndoPremove = document.getElementById('btn-undo-premove');

  // Multiplayer Modals & Buttons
  const friendModal = document.getElementById('friend-modal');
  const btnCreateRoom = document.getElementById('btn-create-room');
  const roomCreatedInfo = document.getElementById('room-created-info');
  const displayRoomCode = document.getElementById('display-room-code');
  const btnCopyCode = document.getElementById('btn-copy-code');
  const btnCopyDirectLink = document.getElementById('btn-copy-direct-link');
  const joinRoomCodeInput = document.getElementById('join-room-code-input');
  const btnSubmitJoin = document.getElementById('btn-submit-join');
  const roomErrorMsg = document.getElementById('room-error-msg');
  const btnCloseFriendModal = document.getElementById('btn-close-friend-modal');

  const btnLeaveRoom = document.getElementById('btn-leave-room');
  const leaveRoomModal = document.getElementById('leave-room-modal');
  const btnConfirmLeave = document.getElementById('btn-confirm-leave');
  const btnCancelLeave = document.getElementById('btn-cancel-leave');

  // Resignation Modal & Buttons
  const btnResign = document.getElementById('btn-resign');
  const resignModal = document.getElementById('resign-modal');
  const btnConfirmResign = document.getElementById('btn-confirm-resign');
  const btnCancelResign = document.getElementById('btn-cancel-resign');

  // Bot Difficulty Modal Elements
  const botDifficultyModal = document.getElementById('bot-difficulty-modal');
  const btnStartBotGame = document.getElementById('btn-start-bot-game');
  const btnCloseBotModal = document.getElementById('btn-close-bot-modal');
  const btnBotWhite = document.getElementById('btn-bot-white');
  const btnBotBlack = document.getElementById('btn-bot-black');

  // Review Mode Playback Controls & Move Quality Elements
  const btnReviewStart = document.getElementById('btn-review-start');
  const btnReviewPrev = document.getElementById('btn-review-prev');
  const btnReviewPlay = document.getElementById('btn-review-play');
  const iconReviewPlay = document.getElementById('icon-review-play');
  const iconReviewPause = document.getElementById('icon-review-pause');
  const btnReviewNext = document.getElementById('btn-review-next');
  const btnReviewEnd = document.getElementById('btn-review-end');
  const reviewStepLabel = document.getElementById('review-step-label');
  const btnReviewLoop = document.getElementById('btn-review-loop');
  const btnExitReview = document.getElementById('btn-exit-review');

  const reviewAnalysisBar = document.getElementById('review-analysis-bar');
  const reviewAnalysisText = document.getElementById('review-analysis-text');
  const reviewMoveExplanation = document.getElementById('review-move-explanation');
  const explanationBadge = document.getElementById('explanation-badge');
  const explanationEval = document.getElementById('explanation-eval');
  const explanationText = document.getElementById('explanation-text');

  // Mode Buttons
  const btnModePass = document.getElementById('btn-mode-pass');
  const btnModeFriend = document.getElementById('btn-mode-friend');
  const btnModeBot = document.getElementById('btn-mode-bot');

  // Controls
  const btnRestart = document.getElementById('btn-restart');
  const btnFlip = document.getElementById('btn-flip');
  const btnAutoFlip = document.getElementById('btn-autoflip');
  const btnSound = document.getElementById('btn-sound');
  const btnSaveUsername = document.getElementById('btn-save-username');

  // View Mode Elements (Master Toggle & Mobile Layout)
  const btnViewToggle = document.getElementById('btn-view-toggle');
  const btnFullscreenToggle = document.getElementById('btn-fullscreen-toggle');
  const mobileViewToggleFab = document.getElementById('mobile-view-toggle-fab');
  const btnPanelFocusBoard = document.getElementById('btn-panel-focus-board');
  const btnLeaveRoomPanel = document.getElementById('btn-leave-room-panel');

  // Full Board Focus Mode state
  // On small mobile screens (<860px), start in Full Board View for distraction-free play.
  let isFullBoard = window.innerWidth <= 860;

  function setViewMode(fullBoard) {
    isFullBoard = fullBoard;
    const isMobile = window.innerWidth <= 860;

    if (isFullBoard) {
      document.body.classList.add('full-board-view');
      document.body.classList.remove('mobile-options-view');
      if (btnViewToggle) {
        btnViewToggle.classList.remove('active-options');
        btnViewToggle.innerHTML = '<span class="view-toggle-icon">📋</span><span class="view-toggle-text">' + (isMobile ? 'Options' : 'Side Panel') + '</span>';
        btnViewToggle.title = isMobile ? 'Open options, move history, and review panel' : 'Open side panel';
      }
      if (mobileViewToggleFab) {
        mobileViewToggleFab.innerHTML = '<span class="fab-icon">📋</span><span class="fab-text">Options & Review</span>';
      }
    } else {
      document.body.classList.remove('full-board-view');
      document.body.classList.add('mobile-options-view');
      if (btnViewToggle) {
        btnViewToggle.classList.add('active-options');
        btnViewToggle.innerHTML = '<span class="view-toggle-icon">⛶</span><span class="view-toggle-text">' + (isMobile ? 'Board' : 'Theater') + '</span>';
        btnViewToggle.title = isMobile ? 'Switch to full board view' : 'Switch to theater full board';
      }
    }

    // Ensure leave room panel button reflects multiplayer status
    if (btnLeaveRoomPanel) {
      btnLeaveRoomPanel.style.display = (gameMode === 'online' && chessNetwork.isConnected) ? 'flex' : 'none';
    }

    renderBoard();
  }

  function toggleViewMode() {
    setViewMode(!isFullBoard);
  }

  if (btnViewToggle) {
    btnViewToggle.addEventListener('click', toggleViewMode);
  }
  if (mobileViewToggleFab) {
    mobileViewToggleFab.addEventListener('click', () => setViewMode(false));
  }
  if (btnPanelFocusBoard) {
    btnPanelFocusBoard.addEventListener('click', () => setViewMode(true));
  }
  if (btnLeaveRoomPanel) {
    btnLeaveRoomPanel.addEventListener('click', () => {
      leaveRoomModal.style.display = 'flex';
    });
  }

  // Native Browser Fullscreen Support
  if (btnFullscreenToggle) {
    btnFullscreenToggle.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    document.addEventListener('fullscreenchange', () => {
      const isFs = !!document.fullscreenElement;
      btnFullscreenToggle.innerHTML = isFs ? '<span class="fs-icon">🗗</span>' : '<span class="fs-icon">⛶</span>';
      btnFullscreenToggle.title = isFs ? 'Exit Fullscreen' : 'Toggle Fullscreen (F)';
      btnFullscreenToggle.classList.toggle('active', isFs);
      if (isFs && window.innerWidth > 860 && !isFullBoard) {
        setViewMode(true);
      }
    });
  }

  // Keyboard shortcut: 'F' toggles Full Board / Focus mode
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      toggleViewMode();
    }
  });

  // Handle window resizing cleanly
  window.addEventListener('resize', () => {
    if (window.innerWidth > 860) {
      document.body.classList.remove('mobile-options-view');
      if (!isFullBoard) {
        document.body.classList.remove('full-board-view');
      }
    }
    renderBoard();
  });

  // Initialize view mode state
  setViewMode(isFullBoard);

  // Save Username handler
  function saveUsername() {
    const val = usernameInput.value.trim();
    myUsername = val || 'Player';
    usernameInput.value = myUsername;
    localStorage.setItem('chess_username', myUsername);
    if (chessNetwork.isConnected) {
      chessNetwork.sendUsername(myUsername);
    }
    updateUI();
  }

  if (btnSaveUsername) {
    btnSaveUsername.addEventListener('click', saveUsername);
  }
  if (usernameInput) {
    usernameInput.addEventListener('change', saveUsername);
    usernameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveUsername();
    });
  }

  // --- ADVANCED CHAINED MULTI-PREMOVE MANAGEMENT ---
  // Works in ALL modes: Bot, Multiplayer, Pass & Play!
  // Supports chaining the same piece from its new virtual square or different pieces.

  function getVirtualBoard() {
    if (premoveQueue.length === 0) return chess;
    try {
      const vBoard = new Chess(chess.fen());
      for (const pm of premoveQueue) {
        const parts = vBoard.fen().split(' ');
        parts[1] = pm.color;
        parts[3] = '-';
        const ok = vBoard.load(parts.join(' '));
        if (ok) {
          vBoard.move({ from: pm.from, to: pm.to, promotion: pm.promotion || 'q' });
        }
      }
      return vBoard;
    } catch (e) {
      console.warn('Virtual board computation fallback:', e);
      return chess;
    }
  }

  function getVirtualLegalMoves(sq, color) {
    try {
      const vBoard = getVirtualBoard();
      const parts = vBoard.fen().split(' ');
      parts[1] = color;
      parts[3] = '-';
      const probe = new Chess();
      if (probe.load(parts.join(' '))) {
        return probe.moves({ square: sq, verbose: true });
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  function addPremove(from, to, color) {
    if (isGameOver || isReviewMode) return;
    let promotion = 'q';
    const vBoard = getVirtualBoard();
    const piece = vBoard.get(from);
    if (piece && piece.type === 'p') {
      if ((color === 'w' && to[1] === '8') || (color === 'b' && to[1] === '1')) {
        promotion = 'q';
      }
    }

    let san = from + '➔' + to;
    try {
      const parts = vBoard.fen().split(' ');
      parts[1] = color;
      parts[3] = '-';
      const probe = new Chess();
      if (probe.load(parts.join(' '))) {
        const mv = probe.move({ from, to, promotion });
        if (mv) san = mv.san;
      }
    } catch (e) {}

    const premoveItem = {
      from,
      to,
      color,
      promotion,
      san,
      step: premoveQueue.length + 1
    };

    premoveQueue.push(premoveItem);
    syncActivePremove();
    premoveSelectionSquare = null;
    legalPremoveMoves = [];

    chessAudio.playMove();
    updatePremoveUI();
    renderBoard();
  }

  // Alias for single-premove backwards compatibility
  function setPremove(from, to, color) {
    addPremove(from, to, color);
  }

  function undoLastPremove() {
    if (premoveQueue.length === 0) return;
    premoveQueue.pop();
    syncActivePremove();
    premoveSelectionSquare = null;
    legalPremoveMoves = [];
    updatePremoveUI();
    renderBoard();
  }

  function clearPremoves() {
    premoveQueue = [];
    syncActivePremove();
    premoveSelectionSquare = null;
    legalPremoveMoves = [];
    updatePremoveUI();
    renderBoard();
  }

  function clearPremove() {
    clearPremoves();
  }

  function updatePremoveUI() {
    if (premoveQueue.length > 0) {
      premoveBar.classList.add('visible');
      const chainStr = premoveQueue.map((p, idx) => (idx + 1) + '. ' + (p.san || (p.from + '➔' + p.to))).join(' ➔ ');
      premoveText.textContent = 'Premoves (' + premoveQueue.length + '): ' + chainStr;
    } else {
      premoveBar.classList.remove('visible');
    }
  }

  // Right-click behavior: Undo one premove at a time (or clear selection)
  boardContainer.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (premoveSelectionSquare) {
      premoveSelectionSquare = null;
      legalPremoveMoves = [];
      renderBoard();
    } else if (premoveQueue.length > 0) {
      undoLastPremove();
    } else if (selectedSquare) {
      selectedSquare = null;
      legalMovesForSelected = [];
      renderBoard();
    }
  });

  if (btnUndoPremove) {
    btnUndoPremove.addEventListener('click', () => {
      undoLastPremove();
    });
  }

  if (btnClearPremoves) {
    btnClearPremoves.addEventListener('click', () => {
      clearPremoves();
    });
  }

  function tryExecutePremove() {
    if (premoveQueue.length === 0 || isGameOver || isReviewMode) return;
    // Check if it's now this premove's color turn!
    if (chess.turn() !== premoveQueue[0].color) return;

    const pm = premoveQueue[0];
    const legalMoves = chess.moves({ verbose: true });
    const isLegal = legalMoves.some(m => m.from === pm.from && m.to === pm.to);

    if (isLegal) {
      premoveQueue.shift();
      syncActivePremove();
      updatePremoveUI();

      setTimeout(() => {
        executeMove(pm.from, pm.to, pm.promotion || 'q');
      }, 30);
    } else {
      // Opponent move invalidated this premove; cleanly cancel remaining dependent chain
      clearPremoves();
      renderBoard();
    }
  }

  // --- BOT DIFFICULTY SELECTION ---
  document.querySelectorAll('.bot-difficulty-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.bot-difficulty-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      botDifficulty = card.dataset.difficulty;
    });
  });

  if (btnBotWhite && btnBotBlack) {
    btnBotWhite.addEventListener('click', () => {
      btnBotWhite.classList.add('active');
      btnBotBlack.classList.remove('active');
      myBotColor = 'w';
    });
    btnBotBlack.addEventListener('click', () => {
      btnBotBlack.classList.add('active');
      btnBotWhite.classList.remove('active');
      myBotColor = 'b';
    });
  }

  btnModeBot.addEventListener('click', () => {
    botDifficultyModal.style.display = 'flex';
  });

  btnCloseBotModal.addEventListener('click', () => {
    botDifficultyModal.style.display = 'none';
  });

  btnStartBotGame.addEventListener('click', () => {
    botDifficultyModal.style.display = 'none';
    setMode('bot');
  });

  // --- MULTIPLAYER ROOMS ---
  btnModeFriend.addEventListener('click', () => {
    roomErrorMsg.style.display = 'none';
    roomCreatedInfo.style.display = 'none';
    joinRoomCodeInput.value = '';
    friendModal.style.display = 'flex';
  });

  btnCloseFriendModal.addEventListener('click', () => {
    friendModal.style.display = 'none';
  });

  btnCreateRoom.addEventListener('click', () => {
    roomErrorMsg.style.display = 'none';
    btnCreateRoom.disabled = true;
    btnCreateRoom.textContent = 'Generating Room...';

    chessNetwork.createRoom(myUsername, 'w')
      .then(info => {
        btnCreateRoom.disabled = false;
        btnCreateRoom.textContent = 'Create Another Room';
        displayRoomCode.textContent = info.roomId;
        roomCreatedInfo.style.display = 'block';
      })
      .catch(err => {
        btnCreateRoom.disabled = false;
        btnCreateRoom.textContent = 'Create Room';
        showRoomError(err.message || err);
      });
  });

  btnCopyCode.addEventListener('click', () => {
    const code = displayRoomCode.textContent;
    copyToClipboard(code, btnCopyCode, 'Copied Code!');
  });

  btnCopyDirectLink.addEventListener('click', () => {
    const code = displayRoomCode.textContent;
    const link = window.location.origin + window.location.pathname + '#room=' + code;
    copyToClipboard(link, btnCopyDirectLink, 'Copied Link!');
  });

  function copyToClipboard(text, btn, successMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        const orig = btn.textContent;
        btn.textContent = successMsg;
        setTimeout(() => { btn.textContent = orig; }, 2000);
      });
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      const orig = btn.textContent;
      btn.textContent = successMsg;
      setTimeout(() => { btn.textContent = orig; }, 2000);
    }
  }

  btnSubmitJoin.addEventListener('click', () => {
    const code = joinRoomCodeInput.value.trim();
    if (!code) {
      showRoomError('Please enter a 4-digit room code.');
      return;
    }

    roomErrorMsg.style.display = 'none';
    btnSubmitJoin.disabled = true;
    btnSubmitJoin.textContent = 'Joining...';

    chessNetwork.joinRoom(code, myUsername)
      .then(() => {
        btnSubmitJoin.disabled = false;
        btnSubmitJoin.textContent = 'Join Room';
      })
      .catch(err => {
        btnSubmitJoin.disabled = false;
        btnSubmitJoin.textContent = 'Join Room';
        showRoomError(typeof err === 'string' ? err : (err.message || 'Failed to connect to room.'));
      });
  });

  function showRoomError(msg) {
    roomErrorMsg.textContent = msg;
    roomErrorMsg.style.display = 'block';
  }

  btnLeaveRoom.addEventListener('click', () => {
    leaveRoomModal.style.display = 'flex';
  });

  btnCancelLeave.addEventListener('click', () => {
    leaveRoomModal.style.display = 'none';
  });

  btnConfirmLeave.addEventListener('click', () => {
    leaveRoomModal.style.display = 'none';
    chessNetwork.leaveRoom();
    setMode('local');
    alert('You have left the multiplayer room.');
  });

  // Resignation Flow
  btnResign.addEventListener('click', () => {
    if (isGameOver) {
      alert('The game is already over.');
      return;
    }
    if (structuredHistory.length === 0) {
      alert('No moves have been played yet.');
      return;
    }
    resignModal.style.display = 'flex';
  });

  btnCancelResign.addEventListener('click', () => {
    resignModal.style.display = 'none';
  });

  btnConfirmResign.addEventListener('click', () => {
    resignModal.style.display = 'none';
    const resigningSide = gameMode === 'local' ? chess.turn() : (gameMode === 'bot' ? myBotColor : myOnlineColor);
    if (gameMode === 'online' && chessNetwork.isConnected) {
      chessNetwork.sendResign();
    }
    handleGameEnd('resignation', resigningSide);
  });


  // --- IN-APP NON-BLOCKING NOTIFICATION TOAST ---
  function showNotification(msg, durationMs = 3500) {
    let toast = document.getElementById('app-notification-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-notification-toast';
      toast.style.position = 'fixed';
      toast.style.top = '65px';
      toast.style.left = '50%';
      toast.style.transform = 'translateX(-50%)';
      toast.style.backgroundColor = '#1f2937';
      toast.style.color = '#f9fafb';
      toast.style.padding = '10px 20px';
      toast.style.borderRadius = '8px';
      toast.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.15)';
      toast.style.zIndex = '100000';
      toast.style.fontSize = '0.9rem';
      toast.style.fontWeight = '600';
      toast.style.display = 'flex';
      toast.style.alignItems = 'center';
      toast.style.gap = '8px';
      toast.style.pointerEvents = 'none';
      toast.style.transition = 'opacity 0.25s, transform 0.25s';
      document.body.appendChild(toast);
    }
    toast.innerHTML = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    if (toast.timer) clearTimeout(toast.timer);
    toast.timer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(-10px)';
    }, durationMs);
  }

  // Network Callbacks
  chessNetwork.onStatusCallback = (status, info) => {
    if (status === 'connected') {
      friendModal.style.display = 'none';
      gameMode = 'online';
      myOnlineColor = info.color;
      remoteUsername = info.remoteUsername || 'Friend';
      orientation = myOnlineColor === 'w' ? 'white' : 'black';

      btnLeaveRoom.style.display = 'flex';
      if (btnLeaveRoomPanel) btnLeaveRoomPanel.style.display = 'flex';

      btnModePass.classList.remove('active');
      btnModeBot.classList.remove('active');
      btnModeFriend.classList.add('active');

      restartGame();
      updateUI();
      showNotification('🤝 Connected with ' + remoteUsername + '! Playing as ' + (myOnlineColor === 'w' ? 'White' : 'Black') + '.');
    } else if (status === 'disconnected') {
      if (gameMode === 'online') {
        showNotification('⚠️ ' + (info || 'Multiplayer disconnected.'));
        setMode('local');
      }
    }
  };

  chessNetwork.onOpponentUsernameCallback = (name) => {
    remoteUsername = name;
    updateUI();
  };

  chessNetwork.onResignCallback = (opponentName) => {
    const resigningSide = myOnlineColor === 'w' ? 'b' : 'w';
    handleGameEnd('resignation', resigningSide, opponentName);
  };

  chessNetwork.onErrorCallback = (err) => {
    showRoomError(err);
  };

  chessNetwork.onMoveCallback = (move) => {
    executeMove(move.from, move.to, move.promotion || 'q', false);
    tryExecutePremove();
  };

  chessNetwork.onRestartCallback = () => {
    restartGame();
  };

  // URL Hash direct join
  if (window.location.hash && window.location.hash.includes('room=')) {
    const hashRoom = window.location.hash.split('room=')[1];
    if (hashRoom) {
      setTimeout(() => {
        friendModal.style.display = 'flex';
        joinRoomCodeInput.value = hashRoom;
        btnSubmitJoin.click();
      }, 600);
    }
  }

  // --- Game Mode Selection ---
  function setMode(mode) {
    gameMode = mode;
    [btnModePass, btnModeFriend, btnModeBot].forEach(b => b.classList.remove('active'));

    if (mode === 'local') {
      btnModePass.classList.add('active');
      btnLeaveRoom.style.display = 'none';
      if (btnLeaveRoomPanel) btnLeaveRoomPanel.style.display = 'none';
      orientation = 'white';
      chessNetwork.disconnect();
    } else if (mode === 'bot') {
      btnModeBot.classList.add('active');
      btnLeaveRoom.style.display = 'none';
      if (btnLeaveRoomPanel) btnLeaveRoomPanel.style.display = 'none';
      orientation = myBotColor === 'w' ? 'white' : 'black';
      chessNetwork.disconnect();
    } else if (mode === 'online') {
      btnModeFriend.classList.add('active');
    }

    clearPremove();
    restartGame();

    if (mode === 'bot' && myBotColor === 'b') {
      triggerBotMove();
    }
  }

  btnModePass.addEventListener('click', () => setMode('local'));

  // Eval Bar Toggle
  let evalBarVisible = true;
  btnToggleEval.addEventListener('click', () => {
    evalBarVisible = !evalBarVisible;
    evalBarContainer.classList.toggle('hidden', !evalBarVisible);
    btnToggleEval.classList.toggle('active', evalBarVisible);
    btnToggleEval.innerHTML = evalBarVisible 
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg> Eval Bar: ON'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg> Eval Bar: OFF';
  });

  // Theme chips
  document.querySelectorAll('.theme-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.theme-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const theme = chip.getAttribute('data-set-theme');
      if (theme === 'green') {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', theme);
      }
    });
  });

  // Sound toggle
  let soundEnabled = true;
  btnSound.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    chessAudio.setMuted(!soundEnabled);
    btnSound.classList.toggle('active', soundEnabled);
    btnSound.innerHTML = soundEnabled 
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg> Sound On'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg> Muted';
  });

  // Flip board
  btnFlip.addEventListener('click', () => {
    orientation = orientation === 'white' ? 'black' : 'white';
    renderBoard();
  });

  // Auto flip toggle
  btnAutoFlip.addEventListener('click', () => {
    autoFlip = !autoFlip;
    btnAutoFlip.classList.toggle('active', autoFlip);
  });

  // Restart
  btnRestart.addEventListener('click', () => {
    if (structuredHistory.length > 0 && !isGameOver) {
      if (confirm('Start a new game? Current match progress will be reset.')) {
        restartGame();
        if (gameMode === 'online' && chessNetwork.isConnected) {
          chessNetwork.sendRestart();
        }
      }
    } else {
      restartGame();
      if (gameMode === 'online' && chessNetwork.isConnected) {
        chessNetwork.sendRestart();
      }
    }
  });

  btnModalRestart.addEventListener('click', () => {
    modalBackdrop.style.display = 'none';
    restartGame();
    if (gameMode === 'online' && chessNetwork.isConnected) {
      chessNetwork.sendRestart();
    }
  });

  btnModalReview.addEventListener('click', () => {
    modalBackdrop.style.display = 'none';
    enterReviewMode(structuredHistory.length - 1);
  });

  function restartGame() {
    stopAutoPlay();
    isGameOver = false;
    isReviewMode = false;
    reviewIndex = -1;
    structuredHistory = [];

    chess.reset();
    selectedSquare = null;
    legalMovesForSelected = [];
    lastMove = null;
    pendingPromotion = null;

    boardContainer.classList.remove('review-mode');
    btnExitReview.style.display = 'none';
    reviewAnalysisBar.style.display = 'none';
    reviewMoveExplanation.style.display = 'none';
    reviewStepLabel.textContent = 'Live Game';
    updatePlaybackControlsState();

    clearPremove();
    renderBoard();
    updateUI();
    updateLiveEvaluation();
    chessAudio.playMove();

    if (gameMode === 'bot' && myBotColor === 'b') {
      triggerBotMove();
    }
  }

  // --- BOARD RENDERING ---
  function getOrderedSquares() {
    const squares = [];
    const ranks = orientation === 'white' ? ['8','7','6','5','4','3','2','1'] : ['1','2','3','4','5','6','7','8'];
    const files = orientation === 'white' ? ['a','b','c','d','e','f','g','h'] : ['h','g','f','e','d','c','b','a'];

    for (let r of ranks) {
      for (let f of files) {
        squares.push(f + r);
      }
    }
    return squares;
  }

  function renderBoard() {
    boardEl.innerHTML = '';
    const squares = getOrderedSquares();
    const isWhiteBottom = orientation === 'white';

    // Player Cards Name & Avatar Rendering
    let whiteNameDisplay = myUsername;
    let blackNameDisplay = 'Brother';

    if (gameMode === 'online') {
      whiteNameDisplay = myOnlineColor === 'w' ? myUsername : remoteUsername;
      blackNameDisplay = myOnlineColor === 'b' ? myUsername : remoteUsername;
    } else if (gameMode === 'bot') {
      const botLabel = 'Computer Bot (' + botDifficulty.toUpperCase() + ')';
      whiteNameDisplay = myBotColor === 'w' ? myUsername : botLabel;
      blackNameDisplay = myBotColor === 'b' ? myUsername : botLabel;
    }

    const topPlayerColor = isWhiteBottom ? 'black' : 'white';
    const bottomPlayerColor = isWhiteBottom ? 'white' : 'black';

    topPlayerName.textContent = isWhiteBottom ? blackNameDisplay : whiteNameDisplay;
    bottomPlayerName.textContent = isWhiteBottom ? whiteNameDisplay : blackNameDisplay;

    topPlayerAvatar.className = 'player-avatar ' + topPlayerColor + '-avatar';
    topPlayerAvatar.textContent = topPlayerColor === 'white' ? 'W' : 'B';
    bottomPlayerAvatar.className = 'player-avatar ' + bottomPlayerColor + '-avatar';
    bottomPlayerAvatar.textContent = bottomPlayerColor === 'white' ? 'W' : 'B';

    headerWhitePlayer.textContent = whiteNameDisplay;
    headerBlackPlayer.textContent = blackNameDisplay;

    // King in check highlight
    let checkSquare = null;
    if (chess.in_check()) {
      const turn = chess.turn();
      for (let r = 1; r <= 8; r++) {
        for (let f of FILES) {
          const piece = chess.get(f + r);
          if (piece && piece.type === 'k' && piece.color === turn) {
            checkSquare = f + r;
            break;
          }
        }
        if (checkSquare) break;
      }
    }

    squares.forEach((sq, idx) => {
      const file = sq[0];
      const rank = sq[1];
      const fileIdx = FILES.indexOf(file);
      const rankIdx = parseInt(rank) - 1;
      const isLight = (fileIdx + rankIdx) % 2 !== 0;

      const sqEl = document.createElement('div');
      sqEl.className = 'square ' + (isLight ? 'light' : 'dark');
      sqEl.dataset.square = sq;

      const isFirstCol = (idx % 8 === 0);
      const isLastRow = (idx >= 56);

      if (isFirstCol) {
        const rankCoord = document.createElement('span');
        rankCoord.className = 'square-coord rank';
        rankCoord.textContent = rank;
        sqEl.appendChild(rankCoord);
      }

      if (isLastRow) {
        const fileCoord = document.createElement('span');
        fileCoord.className = 'square-coord file';
        fileCoord.textContent = file;
        sqEl.appendChild(fileCoord);
      }

      // Highlights
      if (selectedSquare === sq && !isReviewMode) {
        sqEl.classList.add('selected');
      }
      if (lastMove && (lastMove.from === sq || lastMove.to === sq)) {
        sqEl.classList.add(isLight ? 'last-move-light' : 'last-move-dark');
      }
      if (checkSquare === sq) {
        sqEl.classList.add('in-check');
      }

      // Premove Selection Highlight (origin clicked waiting piece)
      if (premoveSelectionSquare === sq && !isReviewMode) {
        sqEl.classList.add('premove-from');
      }

      // Multi-Premove Highlights (Graduated Red Shades + Badges + Markers)
      if (premoveQueue.length > 0 && !isReviewMode && !isGameOver) {
        // Is origin of any premove?
        if (premoveQueue.some(p => p.from === sq)) {
          sqEl.classList.add('premove-from');
        }

        // Is destination of any premove?
        const destStepIndices = [];
        premoveQueue.forEach((p, idx) => {
          if (p.to === sq) destStepIndices.push(idx + 1);
        });

        if (destStepIndices.length > 0) {
          const lastStep = destStepIndices[destStepIndices.length - 1];
          const shadeClass = 'premove-step-' + Math.min(4, lastStep);
          sqEl.classList.add('premove-to', shadeClass);

          const marker = document.createElement('div');
          marker.className = 'premove-target-marker';
          sqEl.appendChild(marker);

          const badge = document.createElement('div');
          badge.className = 'premove-step-badge';
          badge.textContent = destStepIndices.join(',');
          sqEl.appendChild(badge);
        }
      }

      // Legal Move Indicator (for live turn moves)
      if (!isReviewMode && !isGameOver && selectedSquare) {
        const legalMove = legalMovesForSelected.find(m => m.to === sq);
        if (legalMove) {
          const pieceOnTarget = chess.get(sq);
          const isCapture = Boolean(pieceOnTarget) || (legalMove.flags && legalMove.flags.includes('e'));

          const indicator = document.createElement('div');
          indicator.className = isCapture ? 'move-marker-ring' : 'move-marker-dot';
          sqEl.appendChild(indicator);
        }
      }

      // Legal Move Indicator (for premove selection moves)
      if (!isReviewMode && !isGameOver && premoveSelectionSquare) {
        const legalPmMove = legalPremoveMoves.find(m => m.to === sq);
        if (legalPmMove) {
          const vBoard = getVirtualBoard();
          const pieceOnTarget = vBoard.get(sq);
          const isCapture = Boolean(pieceOnTarget);

          const indicator = document.createElement('div');
          indicator.className = isCapture ? 'move-marker-ring' : 'move-marker-dot';
          indicator.style.background = 'rgba(220, 38, 38, 0.45)';
          sqEl.appendChild(indicator);
        }
      }

      // Chess piece: Rendered from Virtual Board when premoving!
      const vBoard = getVirtualBoard();
      const piece = (isReviewMode || premoveQueue.length === 0) ? chess.get(sq) : vBoard.get(sq);
      if (piece) {
        const pieceEl = document.createElement('div');
        pieceEl.className = 'piece-wrapper';
        pieceEl.dataset.piece = piece.color + piece.type.toUpperCase();
        pieceEl.dataset.square = sq;
        pieceEl.innerHTML = getPieceSvg(piece.color, piece.type);

        if (!isReviewMode && !isGameOver) {
          setupPieceDrag(pieceEl, sq, piece);
        }
        sqEl.appendChild(pieceEl);
      }

      sqEl.addEventListener('click', () => {
        handleSquareClick(sq);
      });

      boardEl.appendChild(sqEl);
    });

    updateUI();
  }

  // --- INTERACTIVE MOVE & PREMOVE CLICK HANDLER ---
  // Guarantees captures work 100%, Black moves freely in Pass & Play, and premoves queue cleanly!
  function handleSquareClick(sq) {
    if (pendingPromotion || isGameOver || isReviewMode) return;

    const vBoard = getVirtualBoard();
    const vPiece = vBoard.get(sq);
    const realPiece = chess.get(sq);
    const turnColor = chess.turn();

    const myColor = (gameMode === 'online') ? myOnlineColor : (gameMode === 'bot' ? myBotColor : null);

    // CASE 1: A live turn piece is already selected -> Clicked a target square (Capture or Move!)
    if (selectedSquare) {
      const move = legalMovesForSelected.find(m => m.to === sq);
      if (move) {
        // VALID MOVE OR CAPTURE!
        attemptMove(selectedSquare, sq);
        return;
      }
      // If clicked another friendly live piece of current active turn color, switch selection
      if (realPiece && realPiece.color === turnColor && (myColor === null || realPiece.color === myColor)) {
        selectedSquare = sq;
        legalMovesForSelected = chess.moves({ square: sq, verbose: true });
        renderBoard();
        return;
      }
      // Otherwise clear live selection
      selectedSquare = null;
      legalMovesForSelected = [];
      renderBoard();
      return;
    }

    // CASE 2: Currently Selected Premove Piece -> Target Square Clicked (Premove Queued!)
    if (premoveSelectionSquare) {
      const pColor = vBoard.get(premoveSelectionSquare)?.color || (myColor || (turnColor === 'w' ? 'b' : 'w'));
      // If clicked another friendly waiting piece on virtual board, switch premove source
      if (vPiece && vPiece.color === pColor) {
        premoveSelectionSquare = sq;
        legalPremoveMoves = getVirtualLegalMoves(sq, pColor);
        renderBoard();
        return;
      }
      // Otherwise, queue premove to this square!
      if (sq !== premoveSelectionSquare) {
        addPremove(premoveSelectionSquare, sq, pColor);
        return;
      }
      premoveSelectionSquare = null;
      legalPremoveMoves = [];
      renderBoard();
      return;
    }

    // CASE 3: Nothing currently selected -> Clicked a piece on the board
    // A. Real Live Turn Piece clicked?
    // In Pass & Play (myColor === null): whichever side's turn it is (White or Black) plays live moves!
    // In Online or Bot mode: player only moves live pieces on their turn!
    if (realPiece && realPiece.color === turnColor) {
      if (myColor === null || realPiece.color === myColor) {
        selectedSquare = sq;
        legalMovesForSelected = chess.moves({ square: sq, verbose: true });
        renderBoard();
        return;
      }
    }

    // B. Virtual Premove Piece clicked? (Waiting color piece, either initial or chained)
    // Only waiting color pieces can be queued for premoves!
    if (vPiece) {
      const isWaitingColor = (myColor === null) ? (vPiece.color !== turnColor) : (vPiece.color === myColor && turnColor !== myColor);
      if (isWaitingColor) {
        premoveSelectionSquare = sq;
        legalPremoveMoves = getVirtualLegalMoves(sq, vPiece.color);
        renderBoard();
        return;
      }
    }

    // Clicked empty square with nothing selected -> clear
    selectedSquare = null;
    legalMovesForSelected = [];
    premoveSelectionSquare = null;
    legalPremoveMoves = [];
    renderBoard();
  }

  // --- DRAG & DROP SUPPORT (TOUCH + MOUSE) ---
  let activeDragPiece = null;
  let dragStartSquare = null;
  let dragPieceColor = null;
  let isDraggingPiece = false;
  let dragStartPos = { x: 0, y: 0 };

  function setupPieceDrag(pieceEl, sq, piece) {
    const onStart = (clientX, clientY) => {
      if (pendingPromotion || isGameOver || isReviewMode) return;

      const turnColor = chess.turn();
      const myColor = (gameMode === 'online') ? myOnlineColor : (gameMode === 'bot' ? myBotColor : null);

      // In online or bot mode, cannot drag opponent pieces
      if (myColor !== null && piece.color !== myColor) {
        // But if we already have a piece selected, clicking this opponent piece should capture it!
        if (selectedSquare) {
          const move = legalMovesForSelected.find(m => m.to === sq);
          if (move) {
            attemptMove(selectedSquare, sq);
            return;
          }
        }
        return;
      }

      // If a live piece is already selected, and user clicks an opponent piece (to capture):
      if (selectedSquare) {
        const move = legalMovesForSelected.find(m => m.to === sq);
        if (move) {
          attemptMove(selectedSquare, sq);
          return;
        }
      }

      dragStartSquare = sq;
      dragPieceColor = piece.color;
      dragStartPos = { x: clientX, y: clientY };
      isDraggingPiece = false;
      activeDragPiece = pieceEl;

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onTouchEnd);
      window.addEventListener('touchcancel', onTouchEnd);
    };

    pieceEl.addEventListener('pointerdown', (e) => {
      onStart(e.clientX, e.clientY);
    });
  }

  function onPointerMove(e) {
    if (!activeDragPiece || !dragStartSquare) return;
    const dist = Math.hypot(e.clientX - dragStartPos.x, e.clientY - dragStartPos.y);
    if (!isDraggingPiece && dist > 5) {
      isDraggingPiece = true;
      const turnColor = chess.turn();
      if (dragPieceColor === turnColor) {
        selectedSquare = dragStartSquare;
        legalMovesForSelected = chess.moves({ square: dragStartSquare, verbose: true });
      } else {
        premoveSelectionSquare = dragStartSquare;
        legalPremoveMoves = getVirtualLegalMoves(dragStartSquare, dragPieceColor);
      }
      renderBoard();
      const vBoard = getVirtualBoard();
      const p = vBoard.get(dragStartSquare);
      if (p) {
        dragGhost.innerHTML = getPieceSvg(p.color, p.type);
        dragGhost.style.display = 'block';
      }
      activeDragPiece.classList.add('dragging');
    }

    if (isDraggingPiece) {
      moveGhost(e.clientX, e.clientY);
    }
  }

  function onTouchMove(e) {
    if (!activeDragPiece || !dragStartSquare || !e.touches || !e.touches.length) return;
    const touch = e.touches[0];
    const dist = Math.hypot(touch.clientX - dragStartPos.x, touch.clientY - dragStartPos.y);
    if (!isDraggingPiece && dist > 5) {
      isDraggingPiece = true;
      e.preventDefault();
      const turnColor = chess.turn();
      if (dragPieceColor === turnColor) {
        selectedSquare = dragStartSquare;
        legalMovesForSelected = chess.moves({ square: dragStartSquare, verbose: true });
      } else {
        premoveSelectionSquare = dragStartSquare;
        legalPremoveMoves = getVirtualLegalMoves(dragStartSquare, dragPieceColor);
      }
      renderBoard();
      const vBoard = getVirtualBoard();
      const p = vBoard.get(dragStartSquare);
      if (p) {
        dragGhost.innerHTML = getPieceSvg(p.color, p.type);
        dragGhost.style.display = 'block';
      }
      activeDragPiece.classList.add('dragging');
    }

    if (isDraggingPiece) {
      e.preventDefault();
      moveGhost(touch.clientX, touch.clientY);
    }
  }

  function onTouchEnd(e) {
    const touch = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
    const clientX = touch ? touch.clientX : 0;
    const clientY = touch ? touch.clientY : 0;
    finishDragOrClick(clientX, clientY);
  }

  function onPointerUp(e) {
    finishDragOrClick(e.clientX, e.clientY);
  }

  function finishDragOrClick(clientX, clientY) {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('touchcancel', onTouchEnd);

    dragGhost.style.display = 'none';
    if (activeDragPiece) {
      activeDragPiece.classList.remove('dragging');
    }

    const startSq = dragStartSquare;
    const pieceColor = dragPieceColor;
    const wasDragging = isDraggingPiece;

    activeDragPiece = null;
    dragStartSquare = null;
    dragPieceColor = null;
    isDraggingPiece = false;

    if (!startSq) return;

    if (wasDragging) {
      // It was a drag-and-drop
      const elemBelow = document.elementFromPoint(clientX, clientY);
      const targetSquareEl = elemBelow ? elemBelow.closest('.square') : null;
      if (targetSquareEl) {
        const targetSquare = targetSquareEl.dataset.square;
        if (targetSquare && targetSquare !== startSq) {
          const turnColor = chess.turn();
          if (pieceColor === turnColor) {
            // Live move
            attemptMove(startSq, targetSquare);
            return;
          } else {
            // Premove
            addPremove(startSq, targetSquare, pieceColor);
            return;
          }
        }
      }
      renderBoard();
    } else {
      // It was a simple CLICK on startSq!
      handleSquareClick(startSq);
    }
  }

  function attemptMove(from, to) {
    if (isGameOver || isReviewMode) return;
    const piece = chess.get(from);
    if (!piece) return;

    const isPawn = piece.type === 'p';
    const isPromoting = isPawn && ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));

    if (isPromoting) {
      promptPromotion(from, to, piece.color);
      return;
    }

    executeMove(from, to);
  }

  function promptPromotion(from, to, color) {
    pendingPromotion = { from, to, color };
    promotionChoices.innerHTML = '';

    const pieces = ['q', 'n', 'r', 'b'];
    pieces.forEach(pType => {
      const btn = document.createElement('div');
      btn.className = 'promotion-piece-btn';
      btn.innerHTML = getPieceSvg(color, pType);
      btn.addEventListener('click', () => {
        promotionOverlay.style.display = 'none';
        executeMove(from, to, pType);
        pendingPromotion = null;
      });
      promotionChoices.appendChild(btn);
    });

    promotionOverlay.style.display = 'flex';
  }

  function executeMove(from, to, promotion = 'q', broadcast = true) {
    if (isGameOver || isReviewMode) return;

    const moveResult = chess.move({
      from,
      to,
      promotion
    });

    if (!moveResult) return;

    // Record structured history
    const moveRecord = {
      index: structuredHistory.length,
      from: moveResult.from,
      to: moveResult.to,
      piece: moveResult.piece,
      color: moveResult.color,
      captured: moveResult.captured || null,
      promotion: moveResult.promotion || null,
      san: moveResult.san,
      fen: chess.fen(),
      moveNumber: Math.floor(structuredHistory.length / 2) + 1,
      analysis: null
    };
    structuredHistory.push(moveRecord);

    lastMove = { from, to };
    selectedSquare = null;
    legalMovesForSelected = [];
    premoveSelectionSquare = null;

    if (broadcast && gameMode === 'online' && chessNetwork.isConnected) {
      chessNetwork.sendMove({ from, to, promotion });
    }

    if (moveResult.flags.includes('c') || moveResult.flags.includes('e')) {
      chessAudio.playCapture();
    } else if (moveResult.flags.includes('k') || moveResult.flags.includes('q')) {
      chessAudio.playCastle();
    } else {
      chessAudio.playMove();
    }

    if (chess.in_check()) {
      setTimeout(() => chessAudio.playCheck(), 100);
    }

    if (autoFlip && gameMode === 'local') {
      orientation = chess.turn() === 'w' ? 'white' : 'black';
    }

    renderBoard();
    updateUI();
    updateLiveEvaluation();
    updatePlaybackControlsState();

    const gameOver = checkGameOver();

    // Trigger queued premove if available
    tryExecutePremove();

    // Trigger Computer Bot move if bot turn
    if (!gameOver && gameMode === 'bot' && chess.turn() !== myBotColor) {
      triggerBotMove();
    }
  }

  // --- RELIABLE INSTANT COMPUTER BOT ---
  function triggerBotMove() {
    if (isGameOver || isReviewMode) return;
    if (gameMode !== 'bot' || chess.turn() === myBotColor) return;

    const delay = botDifficulty === 'easy' ? 250 : (botDifficulty === 'medium' ? 350 : 500);

    setTimeout(() => {
      if (isGameOver || isReviewMode || chess.turn() === myBotColor) return;
      const botMove = ChessEvaluator.getBotMove(chess, botDifficulty);
      if (botMove) {
        executeMove(botMove.from, botMove.to, botMove.promotion || 'q');
      }
    }, delay);
  }

  // --- INSTANT LIVE EVALUATION BAR (<1ms latency) ---
  function updateLiveEvaluation() {
    if (!evalBarVisible) return;

    const adv = ChessEvaluator.getAdvantage(chess);
    renderEvalScore(adv.score, adv.text, adv.isMate);
  }

  function renderEvalScore(score, text, isMate = false) {
    evalScoreBadge.classList.remove('forced-mate');

    if (isMate || (typeof text === 'string' && text.includes('#'))) {
      evalScoreBadge.classList.add('forced-mate');
      if (score > 0) {
        evalBarWhite.style.height = '100%';
        evalScoreBadge.textContent = 'M';
        evalScoreBadge.className = 'eval-score-badge white-adv forced-mate';
      } else {
        evalBarWhite.style.height = '0%';
        evalScoreBadge.textContent = '-M';
        evalScoreBadge.className = 'eval-score-badge black-adv forced-mate';
      }
      return;
    }

    const cp = (typeof score === 'number' && !isNaN(score)) ? score : 0;
    const whitePct = Math.max(3, Math.min(97, 50 + 50 * (2 / (1 + Math.exp(-0.0035 * cp)) - 1)));
    evalBarWhite.style.height = whitePct + '%';

    evalScoreBadge.textContent = text || ((cp >= 0 ? '+' : '') + (cp / 100).toFixed(1));
    if (cp >= 0) {
      evalScoreBadge.className = 'eval-score-badge white-adv';
    } else {
      evalScoreBadge.className = 'eval-score-badge black-adv';
    }
  }

  function updateUI() {
    const isWhiteTurn = chess.turn() === 'w';
    const isWhiteBottom = orientation === 'white';

    if (isWhiteBottom) {
      bottomPlayerCard.classList.toggle('active-turn', isWhiteTurn && !isGameOver);
      topPlayerCard.classList.toggle('active-turn', !isWhiteTurn && !isGameOver);
    } else {
      topPlayerCard.classList.toggle('active-turn', isWhiteTurn && !isGameOver);
      bottomPlayerCard.classList.toggle('active-turn', !isWhiteTurn && !isGameOver);
    }

    let turnName = isWhiteTurn ? headerWhitePlayer.textContent : headerBlackPlayer.textContent;

    if (isReviewMode) {
      statusHeadline.innerHTML = '<span style="color: #81b64c;">🔍 Review Mode</span>';
      if (reviewIndex === -1) {
        statusSub.textContent = 'Starting Position (Move 0 of ' + structuredHistory.length + ')';
      } else {
        const curMove = structuredHistory[reviewIndex];
        statusSub.textContent = 'Position after ' + curMove.san + ' (' + (reviewIndex + 1) + ' of ' + structuredHistory.length + ')';
      }
    } else if (chess.in_checkmate()) {
      const winner = chess.turn() === 'w' ? headerBlackPlayer.textContent : headerWhitePlayer.textContent;
      statusHeadline.innerHTML = '<span style="color: #ff5252;">Checkmate!</span> ' + winner + ' wins';
      statusSub.textContent = 'Game concluded by checkmate';
    } else if (chess.in_draw()) {
      let reason = 'Draw';
      if (chess.in_stalemate()) reason = 'Stalemate (Draw)';
      else if (chess.in_threefold_repetition()) reason = 'Threefold Repetition (Draw)';
      else if (chess.insufficient_material()) reason = 'Insufficient Material (Draw)';
      statusHeadline.innerHTML = '<span style="color: #e5a93b;">' + reason + '</span>';
      statusSub.textContent = 'Game drawn according to official rules';
    } else if (chess.in_check()) {
      statusHeadline.innerHTML = '<span style="color: #ff5252;">Check!</span> ' + turnName + "\'s turn";
      statusSub.textContent = turnName + ' King is under attack!';
    } else {
      statusHeadline.innerHTML = turnName + "\'s Turn";
      statusSub.textContent = isWhiteTurn ? 'White to move' : 'Black to move';
    }

    updateCapturedPieces();
    updateMoveList();
  }

  function updateCapturedPieces() {
    const initialCounts = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const currentWhite = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    const currentBlack = { p: 0, n: 0, b: 0, r: 0, q: 0 };

    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece) {
          if (piece.color === 'w') {
            currentWhite[piece.type] = (currentWhite[piece.type] || 0) + 1;
          } else {
            currentBlack[piece.type] = (currentBlack[piece.type] || 0) + 1;
          }
        }
      }
    }

    const capturedWhite = [];
    const capturedBlack = [];

    ['p', 'n', 'b', 'r', 'q'].forEach(type => {
      const lostWhite = Math.max(0, initialCounts[type] - (currentWhite[type] || 0));
      for (let i = 0; i < lostWhite; i++) capturedWhite.push(type);

      const lostBlack = Math.max(0, initialCounts[type] - (currentBlack[type] || 0));
      for (let i = 0; i < lostBlack; i++) capturedBlack.push(type);
    });

    const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    let whiteMaterial = 0;
    let blackMaterial = 0;
    Object.keys(currentWhite).forEach(t => whiteMaterial += currentWhite[t] * (pieceValues[t] || 0));
    Object.keys(currentBlack).forEach(t => blackMaterial += currentBlack[t] * (pieceValues[t] || 0));
    const whiteLead = whiteMaterial - blackMaterial;

    const isWhiteBottom = orientation === 'white';
    const topTray = document.getElementById('top-captured-tray');
    const bottomTray = document.getElementById('bottom-captured-tray');

    function renderTray(trayEl, capturedList, pieceColor, advantage) {
      trayEl.innerHTML = '';
      capturedList.sort((a, b) => (pieceValues[a] || 0) - (pieceValues[b] || 0));

      capturedList.forEach(t => {
        const mini = document.createElement('span');
        mini.className = 'captured-mini-piece';
        mini.innerHTML = getPieceSvg(pieceColor, t);
        trayEl.appendChild(mini);
      });

      if (advantage > 0) {
        const advSpan = document.createElement('span');
        advSpan.className = 'material-diff';
        advSpan.textContent = '+' + advantage;
        trayEl.appendChild(advSpan);
      }
    }

    if (isWhiteBottom) {
      renderTray(bottomTray, capturedBlack, 'b', whiteLead > 0 ? whiteLead : 0);
      renderTray(topTray, capturedWhite, 'w', whiteLead < 0 ? -whiteLead : 0);
    } else {
      renderTray(bottomTray, capturedWhite, 'w', whiteLead < 0 ? -whiteLead : 0);
      renderTray(topTray, capturedBlack, 'b', whiteLead > 0 ? whiteLead : 0);
    }
  }

  function updateMoveList() {
    moveListEl.innerHTML = '';

    for (let i = 0; i < structuredHistory.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const whiteMove = structuredHistory[i];
      const blackMove = structuredHistory[i + 1] || null;

      const row = document.createElement('div');
      row.className = 'move-row';

      const numCol = document.createElement('span');
      numCol.className = 'move-num';
      numCol.textContent = moveNum + '.';

      // White Move Cell
      const wCell = document.createElement('span');
      wCell.className = 'move-cell';
      wCell.dataset.moveIndex = i;

      let wHtml = '<span class="move-text">' + whiteMove.san + '</span>';
      if (whiteMove.analysis) {
        wHtml += '<span class="quality-badge ' + whiteMove.analysis.badgeClass + '" title="' + whiteMove.analysis.label + '">' + whiteMove.analysis.icon + '</span>';
      }
      wCell.innerHTML = wHtml;

      if (isReviewMode && reviewIndex === i) {
        wCell.classList.add('active-review');
      } else if (!isReviewMode && i === structuredHistory.length - 1) {
        wCell.classList.add('latest');
      }

      wCell.addEventListener('click', () => {
        if (isGameOver || isReviewMode) {
          enterReviewMode(i);
        }
      });

      row.appendChild(numCol);
      row.appendChild(wCell);

      // Black Move Cell
      if (blackMove) {
        const bCell = document.createElement('span');
        bCell.className = 'move-cell';
        bCell.dataset.moveIndex = i + 1;

        let bHtml = '<span class="move-text">' + blackMove.san + '</span>';
        if (blackMove.analysis) {
          bHtml += '<span class="quality-badge ' + blackMove.analysis.badgeClass + '" title="' + blackMove.analysis.label + '">' + blackMove.analysis.icon + '</span>';
        }
        bCell.innerHTML = bHtml;

        if (isReviewMode && reviewIndex === i + 1) {
          bCell.classList.add('active-review');
        } else if (!isReviewMode && (i + 1) === structuredHistory.length - 1) {
          bCell.classList.add('latest');
        }

        bCell.addEventListener('click', () => {
          if (isGameOver || isReviewMode) {
            enterReviewMode(i + 1);
          }
        });

        row.appendChild(bCell);
      } else {
        const emptyCell = document.createElement('span');
        emptyCell.className = 'move-cell';
        row.appendChild(emptyCell);
      }

      moveListEl.appendChild(row);
    }

    const activeCell = moveListEl.querySelector('.active-review, .latest');
    if (activeCell) {
      activeCell.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else {
      moveListEl.scrollTop = moveListEl.scrollHeight;
    }
  }

  // --- REVIEW MODE & INSTANT MOVE QUALITY ANALYSIS (<50ms) ---
  function enterReviewMode(targetIndex) {
    isReviewMode = true;
    isGameOver = true;
    clearPremove();

    // Automatically switch to Options Mode so review controls, badges, and analysis card are immediately visible!
    setViewMode(false);

    boardContainer.classList.add('review-mode');
    btnExitReview.style.display = 'inline-block';
    reviewAnalysisBar.style.display = 'none';
    reviewMoveExplanation.style.display = 'block';

    // Run instant move quality classification over all moves
    runInstantGameAnalysis();

    const maxIdx = structuredHistory.length - 1;
    const destIndex = (targetIndex !== undefined) ? Math.max(-1, Math.min(targetIndex, maxIdx)) : maxIdx;
    goToReviewStep(destIndex);
  }

  function runInstantGameAnalysis() {
    let prevScore = 0; // Starting position score is 0.0
    const simChess = new Chess();

    structuredHistory.forEach(record => {
      simChess.move({ from: record.from, to: record.to, promotion: record.promotion || 'q' });
      const adv = ChessEvaluator.getAdvantage(simChess);
      record.evalScore = adv.score;
      record.evalText = adv.text;
      record.analysis = ChessEvaluator.classifyMove(prevScore, adv.score, record.color, record);
      prevScore = adv.score;
    });

    updateMoveList();
  }

  const runDeepGameAnalysis = runInstantGameAnalysis;

  function exitReviewMode() {
    stopAutoPlay();
    isReviewMode = false;
    boardContainer.classList.remove('review-mode');
    btnExitReview.style.display = 'none';
    reviewAnalysisBar.style.display = 'none';
    reviewMoveExplanation.style.display = 'none';

    if (structuredHistory.length > 0) {
      const finalMove = structuredHistory[structuredHistory.length - 1];
      chess.load(finalMove.fen);
      lastMove = { from: finalMove.from, to: finalMove.to };
    } else {
      chess.load(initialFen);
      lastMove = null;
    }

    renderBoard();
    updateUI();
    updateLiveEvaluation();
    reviewStepLabel.textContent = 'Game Concluded';
    updatePlaybackControlsState();
  }

  function goToReviewStep(index) {
    const totalMoves = structuredHistory.length;
    const clampedIndex = Math.max(-1, Math.min(index, totalMoves - 1));
    reviewIndex = clampedIndex;

    if (clampedIndex === -1) {
      chess.load(initialFen);
      lastMove = null;
      reviewStepLabel.textContent = 'Start (0/' + totalMoves + ')';
      renderEvalScore(0, '0.0', false);
      updateReviewExplanation(null);
    } else {
      const curMove = structuredHistory[clampedIndex];
      chess.load(curMove.fen);
      lastMove = { from: curMove.from, to: curMove.to };
      reviewStepLabel.textContent = 'Move ' + (clampedIndex + 1) + '/' + totalMoves + ' (' + curMove.san + ')';

      if (curMove.evalScore !== undefined) {
        renderEvalScore(curMove.evalScore, curMove.evalText, false);
      } else {
        updateLiveEvaluation();
      }

      updateReviewExplanation(curMove);
    }

    renderBoard();
    updateUI();
    updatePlaybackControlsState();
  }

  function updateReviewExplanation(moveRecord) {
    if (!moveRecord) {
      explanationBadge.textContent = 'Start';
      explanationBadge.className = 'explanation-badge';
      explanationEval.textContent = '0.0';
      explanationText.textContent = 'Initial starting board position.';
      return;
    }

    const an = moveRecord.analysis;
    if (an) {
      explanationBadge.textContent = an.label + ' (' + an.icon + ')';
      explanationBadge.className = 'explanation-badge ' + an.badgeClass;

      const evalStr = moveRecord.evalText || ((an.evalScore >= 0 ? '+' : '') + (an.evalScore / 100).toFixed(1));
      explanationEval.textContent = evalStr;

      if (an.blunderNote) {
        explanationText.textContent = an.blunderNote;
      } else if (an.quality === 'brilliant') {
        explanationText.textContent = 'Brilliant move! Exceptional tactical piece play maintaining advantage.';
      } else if (an.quality === 'great') {
        explanationText.textContent = 'Great move! The most accurate continuation in this position.';
      } else if (an.quality === 'best') {
        explanationText.textContent = 'Best move! Engine top recommendation.';
      } else {
        explanationText.textContent = 'Solid natural continuation.';
      }
    }
  }

  function updatePlaybackControlsState() {
    const totalMoves = structuredHistory.length;
    const isAtStart = reviewIndex <= -1;
    const isAtEnd = reviewIndex >= totalMoves - 1;

    btnReviewStart.disabled = totalMoves === 0 || isAtStart;
    btnReviewPrev.disabled = totalMoves === 0 || isAtStart;
    btnReviewNext.disabled = totalMoves === 0 || isAtEnd;
    btnReviewEnd.disabled = totalMoves === 0 || isAtEnd;
    btnReviewPlay.disabled = totalMoves === 0;

    if (autoPlayTimer) {
      btnReviewPlay.classList.add('active-play');
      iconReviewPlay.style.display = 'none';
      iconReviewPause.style.display = 'block';
    } else {
      btnReviewPlay.classList.remove('active-play');
      iconReviewPlay.style.display = 'block';
      iconReviewPause.style.display = 'none';
    }
  }

  function startAutoPlay() {
    if (autoPlayTimer) return;
    if (structuredHistory.length === 0) return;

    if (reviewIndex >= structuredHistory.length - 1) {
      goToReviewStep(-1);
    }

    autoPlayTimer = setInterval(() => {
      if (reviewIndex < structuredHistory.length - 1) {
        goToReviewStep(reviewIndex + 1);
      } else {
        if (autoPlayLoop) {
          goToReviewStep(-1);
        } else {
          stopAutoPlay();
        }
      }
    }, autoPlayIntervalMs);

    updatePlaybackControlsState();
  }

  function stopAutoPlay() {
    if (autoPlayTimer) {
      clearInterval(autoPlayTimer);
      autoPlayTimer = null;
      updatePlaybackControlsState();
    }
  }

  function toggleAutoPlay() {
    if (autoPlayTimer) {
      stopAutoPlay();
    } else {
      if (!isReviewMode) {
        enterReviewMode(reviewIndex >= 0 ? reviewIndex : 0);
      }
      startAutoPlay();
    }
  }

  // Playback Control Event Listeners
  btnReviewStart.addEventListener('click', () => {
    stopAutoPlay();
    if (!isReviewMode) enterReviewMode(-1);
    else goToReviewStep(-1);
  });

  btnReviewPrev.addEventListener('click', () => {
    stopAutoPlay();
    if (!isReviewMode) enterReviewMode(structuredHistory.length - 2);
    else goToReviewStep(reviewIndex - 1);
  });

  btnReviewPlay.addEventListener('click', () => {
    toggleAutoPlay();
  });

  btnReviewNext.addEventListener('click', () => {
    stopAutoPlay();
    if (!isReviewMode) enterReviewMode(0);
    else goToReviewStep(reviewIndex + 1);
  });

  btnReviewEnd.addEventListener('click', () => {
    stopAutoPlay();
    if (!isReviewMode) enterReviewMode(structuredHistory.length - 1);
    else goToReviewStep(structuredHistory.length - 1);
  });

  btnReviewLoop.addEventListener('click', () => {
    autoPlayLoop = !autoPlayLoop;
    btnReviewLoop.classList.toggle('active', autoPlayLoop);
    btnReviewLoop.textContent = autoPlayLoop ? '🔁 Loop: On' : '🔁 Loop: Off';
  });

  btnExitReview.addEventListener('click', () => {
    exitReviewMode();
  });

  // Keyboard Shortcuts for Playback
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      stopAutoPlay();
      if (!isReviewMode && isGameOver) enterReviewMode(structuredHistory.length - 2);
      else if (isReviewMode) goToReviewStep(reviewIndex - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      stopAutoPlay();
      if (!isReviewMode && isGameOver) enterReviewMode(0);
      else if (isReviewMode) goToReviewStep(reviewIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      stopAutoPlay();
      if (!isReviewMode && isGameOver) enterReviewMode(-1);
      else if (isReviewMode) goToReviewStep(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      stopAutoPlay();
      if (!isReviewMode && isGameOver) enterReviewMode(structuredHistory.length - 1);
      else if (isReviewMode) goToReviewStep(structuredHistory.length - 1);
    } else if (e.key === ' ' || e.code === 'Space') {
      if (isGameOver || isReviewMode) {
        e.preventDefault();
        toggleAutoPlay();
      }
    }
  });

  // --- GAME OVER & TERMINAL STATE DETECTION ---
  function checkGameOver() {
    if (chess.game_over()) {
      let reason = 'draw';
      if (chess.in_checkmate()) reason = 'checkmate';
      else if (chess.in_stalemate()) reason = 'stalemate';
      else if (chess.in_threefold_repetition()) reason = 'threefold';
      else if (chess.insufficient_material()) reason = 'insufficient';
      else if (chess.in_draw()) reason = 'draw';

      handleGameEnd(reason);
      return true;
    }
    return false;
  }

  function handleGameEnd(reason, details, extraName) {
    isGameOver = true;
    clearPremove();

    setTimeout(() => {
      chessAudio.playGameEnd();

      if (reason === 'checkmate') {
        const winner = chess.turn() === 'w' ? headerBlackPlayer.textContent : headerWhitePlayer.textContent;
        modalTrophy.textContent = '🏆';
        modalTitle.textContent = winner + ' Wins!';
        modalSubtitle.textContent = 'Victory by Checkmate! Congratulations ' + winner + '.';
      } else if (reason === 'resignation') {
        const winnerColor = details === 'w' ? 'b' : 'w';
        const winner = winnerColor === 'w' ? headerWhitePlayer.textContent : headerBlackPlayer.textContent;
        const resignedPlayer = details === 'w' ? headerWhitePlayer.textContent : headerBlackPlayer.textContent;
        modalTrophy.textContent = '🏳️';
        modalTitle.textContent = winner + ' Wins!';
        modalSubtitle.textContent = (extraName || resignedPlayer) + ' resigned. Victory awarded to ' + winner + '.';
      } else if (reason === 'stalemate') {
        modalTrophy.textContent = '🤝';
        modalTitle.textContent = 'Stalemate';
        modalSubtitle.textContent = 'Game is drawn! The active player has no legal moves and is not in check.';
      } else if (reason === 'threefold') {
        modalTrophy.textContent = '🤝';
        modalTitle.textContent = 'Draw by Repetition';
        modalSubtitle.textContent = 'The exact same position occurred 3 times.';
      } else if (reason === 'insufficient') {
        modalTrophy.textContent = '🤝';
        modalTitle.textContent = 'Draw by Insufficient Material';
        modalSubtitle.textContent = 'Neither player has enough pieces to force checkmate.';
      } else {
        modalTrophy.textContent = '🤝';
        modalTitle.textContent = 'Game Drawn';
        modalSubtitle.textContent = 'Game drawn according to official FIDE chess rules.';
      }

      modalBackdrop.style.display = 'flex';
      reviewStepLabel.textContent = 'Game Concluded';
      updatePlaybackControlsState();
    }, 350);
  }

  renderBoard();
  updateLiveEvaluation();
  updatePlaybackControlsState();
});
