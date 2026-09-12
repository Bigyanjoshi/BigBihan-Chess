// Multiplayer Network Layer: Auto LAN WebSocket (for npm run / server.js) + WebRTC P2P (for GitHub Pages & file://)
class ChessNetwork {
  constructor() {
    this.mode = 'offline';
    this.peer = null;
    this.conn = null;
    this.socket = null;
    this.roomId = null;
    this.playerColor = 'w';
    this.isConnected = false;
    this.username = 'Player';
    this.remoteUsername = 'Friend';

    // Callbacks
    this.onMoveCallback = null;
    this.onRestartCallback = null;
    this.onStatusCallback = null;
    this.onErrorCallback = null;
    this.onOpponentUsernameCallback = null;
    this.onResignCallback = null;
    this.heartbeatTimer = null;
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(JSON.stringify({ type: 'ping' }));
        } catch (e) {}
      }
    }, 3000);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // Create Room as Host
  createRoom(username, colorPreference = 'w') {
    this.username = username || 'Player';
    this.playerColor = colorPreference;
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    this.roomId = code;

    // Check if running on local server via HTTP/HTTPS
    if (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http')) {
      return this.createRoomWS(code, this.username, colorPreference);
    } else {
      return this.createRoomPeer(code, this.username, colorPreference);
    }
  }

  // Host room via native local WebSocket server
  createRoomWS(code, username, colorPreference) {
    return new Promise((resolve, reject) => {
      this.mode = 'ws';
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = wsProtocol + '//' + window.location.host;

      try {
        if (this.socket) {
          try { this.socket.close(); } catch (e) {}
        }
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          this.startHeartbeat();
          this.socket.send(JSON.stringify({
            type: 'join',
            roomId: code,
            color: colorPreference,
            username: username
          }));
        };

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'ping') {
              if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({ type: 'pong' }));
              }
              return;
            }
            if (data.type === 'pong') {
              return;
            }
            if (data.type === 'joined') {
              this.isConnected = true;
              if (this.onStatusCallback) {
                this.onStatusCallback('waiting', { roomId: code, color: this.playerColor });
              }
              resolve({ roomId: code, color: this.playerColor });
            } else if (data.type === 'connected') {
              this.isConnected = true;
              this.remoteUsername = data.remoteUsername || 'Friend';
              if (this.onOpponentUsernameCallback) this.onOpponentUsernameCallback(this.remoteUsername);
              if (this.onStatusCallback) {
                this.onStatusCallback('connected', { color: this.playerColor, remoteUsername: this.remoteUsername });
              }
            } else {
              this.handleIncomingData(data);
            }
          } catch (e) {
            console.error('WS parse error:', e);
          }
        };

        this.socket.onerror = (err) => {
          this.stopHeartbeat();
          console.warn('Local WS error, attempting PeerJS fallback:', err);
          this.createRoomPeer(code, username, colorPreference).then(resolve).catch(reject);
        };

        this.socket.onclose = () => {
          this.stopHeartbeat();
          this.isConnected = false;
          if (this.onStatusCallback) {
            this.onStatusCallback('disconnected', 'Multiplayer room disconnected.');
          }
        };
      } catch (e) {
        console.warn('WS initialization failed, falling back to PeerJS:', e);
        this.createRoomPeer(code, username, colorPreference).then(resolve).catch(reject);
      }
    });
  }

  // Host room via PeerJS WebRTC P2P
  createRoomPeer(code, username, colorPreference) {
    return new Promise((resolve, reject) => {
      this.mode = 'p2p';
      if (typeof Peer === 'undefined') {
        const err = 'PeerJS library not loaded. Please ensure you are connected to the network.';
        if (this.onErrorCallback) this.onErrorCallback(err);
        return reject(err);
      }

      const peerId = 'chess-' + code;
      if (this.peer) {
        try { this.peer.destroy(); } catch (e) {}
      }

      this.peer = new Peer(peerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      this.peer.on('open', () => {
        this.roomId = code;
        if (this.onStatusCallback) {
          this.onStatusCallback('waiting', { roomId: code, color: this.playerColor });
        }
        resolve({ roomId: code, color: this.playerColor });
      });

      this.peer.on('connection', (connection) => {
        this.conn = connection;
        this.setupConnEvents();

        const guestColor = this.playerColor === 'w' ? 'b' : 'w';
        this.conn.on('open', () => {
          this.isConnected = true;
          this.sendPayload({
            type: 'handshake',
            color: guestColor,
            username: this.username
          });

          if (this.onStatusCallback) {
            this.onStatusCallback('connected', {
              color: this.playerColor,
              remoteUsername: this.remoteUsername
            });
          }
        });
      });

      this.peer.on('error', (err) => {
        console.error('Peer error:', err);
        if (err.type === 'unavailable-id') {
          return this.createRoom(username, colorPreference).then(resolve).catch(reject);
        }
        const userMsg = 'Network error: ' + (err.message || 'Unknown error');
        if (this.onErrorCallback) this.onErrorCallback(userMsg);
        reject(err);
      });
    });
  }

  // Join existing Room with 4-digit code
  joinRoom(rawCode, username) {
    this.username = username || 'Player';
    const cleanCode = (rawCode || '').trim().replace(/^chess-/, '');
    if (!cleanCode || cleanCode.length < 4) {
      const msg = 'Please enter a valid 4-digit Room Code.';
      if (this.onErrorCallback) this.onErrorCallback(msg);
      return Promise.reject(msg);
    }
    this.roomId = cleanCode;

    if (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http')) {
      return this.joinRoomWS(cleanCode, this.username);
    } else {
      return this.joinRoomPeer(cleanCode, this.username);
    }
  }

  // Join via native local WebSocket server
  joinRoomWS(cleanCode, username) {
    return new Promise((resolve, reject) => {
      this.mode = 'ws';
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = wsProtocol + '//' + window.location.host;

      try {
        if (this.socket) {
          try { this.socket.close(); } catch (e) {}
        }
        this.socket = new WebSocket(wsUrl);

        let timeout = setTimeout(() => {
          const err = 'Could not find Room ' + cleanCode + ' on local server.';
          if (this.onErrorCallback) this.onErrorCallback(err);
          this.disconnect();
          reject(err);
        }, 8000);

        this.socket.onopen = () => {
          this.startHeartbeat();
          this.socket.send(JSON.stringify({
            type: 'join',
            roomId: cleanCode,
            username: username
          }));
        };

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'ping') {
              if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({ type: 'pong' }));
              }
              return;
            }
            if (data.type === 'pong') {
              return;
            }
            if (data.type === 'error') {
              clearTimeout(timeout);
              if (this.onErrorCallback) this.onErrorCallback(data.message);
              reject(data.message);
            } else if (data.type === 'connected') {
              clearTimeout(timeout);
              this.isConnected = true;
              this.playerColor = data.color;
              this.remoteUsername = data.remoteUsername || 'Host';
              if (this.onOpponentUsernameCallback) this.onOpponentUsernameCallback(this.remoteUsername);
              if (this.onStatusCallback) {
                this.onStatusCallback('connected', { color: this.playerColor, remoteUsername: this.remoteUsername });
              }
              resolve({ roomId: cleanCode, color: this.playerColor });
            } else {
              this.handleIncomingData(data);
            }
          } catch (e) {
            console.error('WS parse error:', e);
          }
        };

        this.socket.onerror = (err) => {
          this.stopHeartbeat();
          clearTimeout(timeout);
          console.warn('WS join error, attempting PeerJS fallback:', err);
          this.joinRoomPeer(cleanCode, username).then(resolve).catch(reject);
        };

        this.socket.onclose = () => {
          this.stopHeartbeat();
          this.isConnected = false;
          if (this.onStatusCallback) {
            this.onStatusCallback('disconnected', 'Multiplayer room disconnected.');
          }
        };
      } catch (e) {
        console.warn('WS initialization failed, falling back to PeerJS:', e);
        this.joinRoomPeer(cleanCode, username).then(resolve).catch(reject);
      }
    });
  }

  // Join via PeerJS WebRTC P2P
  joinRoomPeer(cleanCode, username) {
    return new Promise((resolve, reject) => {
      this.mode = 'p2p';
      if (typeof Peer === 'undefined') {
        const err = 'PeerJS library is not available. Please check your internet connection.';
        if (this.onErrorCallback) this.onErrorCallback(err);
        return reject(err);
      }

      const targetPeerId = 'chess-' + cleanCode;
      if (this.peer) {
        try { this.peer.destroy(); } catch (e) {}
      }

      this.peer = new Peer(undefined, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      let connectionTimeout = setTimeout(() => {
        const err = 'Could not find Room ' + cleanCode + '. The code may be incorrect or expired.';
        if (this.onErrorCallback) this.onErrorCallback(err);
        this.disconnect();
        reject(err);
      }, 10000);

      this.peer.on('open', () => {
        this.conn = this.peer.connect(targetPeerId, { reliable: true });
        this.setupConnEvents();

        this.conn.on('open', () => {
          clearTimeout(connectionTimeout);
          this.isConnected = true;
          this.sendPayload({
            type: 'guest_info',
            username: this.username
          });
          resolve({ roomId: cleanCode });
        });
      });

      this.peer.on('error', (err) => {
        clearTimeout(connectionTimeout);
        console.error('Peer error during join:', err);
        const msg = 'Invalid or expired Room Code. Please check the code and try again.';
        if (this.onErrorCallback) this.onErrorCallback(msg);
        reject(msg);
      });
    });
  }

  setupConnEvents() {
    this.conn.on('data', (data) => {
      this.handleIncomingData(data);
    });

    this.conn.on('close', () => {
      this.isConnected = false;
      if (this.onStatusCallback) this.onStatusCallback('disconnected', 'Opponent disconnected.');
    });

    this.conn.on('error', (err) => {
      console.error('Connection error:', err);
      if (this.onErrorCallback) this.onErrorCallback('Connection error occurred.');
    });
  }

  handleIncomingData(data) {
    if (!data) return;

    if (data.type === 'handshake') {
      this.playerColor = data.color;
      this.remoteUsername = data.username || 'Host';
      this.isConnected = true;
      if (this.onOpponentUsernameCallback) this.onOpponentUsernameCallback(this.remoteUsername);
      if (this.onStatusCallback) {
        this.onStatusCallback('connected', { color: this.playerColor, remoteUsername: this.remoteUsername });
      }
    } else if (data.type === 'guest_info') {
      this.remoteUsername = data.username || 'Guest';
      if (this.onOpponentUsernameCallback) this.onOpponentUsernameCallback(this.remoteUsername);
      if (this.onStatusCallback) {
        this.onStatusCallback('connected', { color: this.playerColor, remoteUsername: this.remoteUsername });
      }
    } else if (data.type === 'username_update') {
      this.remoteUsername = data.username || 'Opponent';
      if (this.onOpponentUsernameCallback) this.onOpponentUsernameCallback(this.remoteUsername);
    } else if (data.type === 'move') {
      if (this.onMoveCallback) {
        this.onMoveCallback(data.move);
      }
    } else if (data.type === 'restart') {
      if (this.onRestartCallback) {
        this.onRestartCallback();
      }
    } else if (data.type === 'resign') {
      if (this.onResignCallback) {
        this.onResignCallback(this.remoteUsername || 'Opponent');
      }
    } else if (data.type === 'leave') {
      this.isConnected = false;
      if (this.onStatusCallback) {
        this.onStatusCallback('disconnected', (this.remoteUsername || 'Opponent') + ' left the room.');
      }
    }
  }

  sendMove(move) {
    this.sendPayload({ type: 'move', move });
  }

  sendRestart() {
    this.sendPayload({ type: 'restart' });
  }

  sendResign() {
    this.sendPayload({ type: 'resign' });
  }

  sendUsername(name) {
    this.username = name;
    this.sendPayload({ type: 'username_update', username: name });
  }

  sendLeave() {
    this.sendPayload({ type: 'leave' });
  }

  sendPayload(payload) {
    try {
      if ((this.mode === 'ws' || this.mode === 'lan') && this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(payload));
      } else if (this.mode === 'p2p' && this.conn && this.conn.open) {
        this.conn.send(payload);
      }
    } catch (e) {
      console.error('Error sending payload:', e);
    }
  }

  leaveRoom() {
    this.disconnect();
  }

  disconnect() {
    this.stopHeartbeat();
    try {
      this.sendLeave();
    } catch (e) {}

    if (this.conn) {
      try { this.conn.close(); } catch (e) {}
      this.conn = null;
    }
    if (this.peer) {
      try { this.peer.destroy(); } catch (e) {}
      this.peer = null;
    }
    if (this.socket) {
      try { this.socket.close(); } catch (e) {}
      this.socket = null;
    }

    this.isConnected = false;
    this.mode = 'offline';
    this.roomId = null;
  }
}

window.chessNetwork = new ChessNetwork();
