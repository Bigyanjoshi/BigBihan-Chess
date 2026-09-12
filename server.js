// Chess.com Clone Local LAN & NPM Multiplayer Server
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;
const STATIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let filePath = path.join(STATIC_DIR, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + err.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

const rooms = new Map();

server.on('upgrade', (req, socket, head) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }

  const crypto = require('crypto');
  const acceptKey = crypto
    .createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');

  const responseHeaders = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    'Sec-WebSocket-Accept: ' + acceptKey,
    '\r\n'
  ];
  socket.setTimeout(0);
  socket.setNoDelay(true);
  socket.setKeepAlive(true, 10000);
  socket.removeAllListeners('timeout');
  socket.write(responseHeaders.join('\r\n'));

  let currentRoom = null;
  let playerColor = null;

  const pingInterval = setInterval(() => {
    if (!socket.destroyed) {
      sendWebSocketMessage(socket, { type: 'ping' });
    } else {
      clearInterval(pingInterval);
    }
  }, 5000);

  socket.on('data', (buffer) => {
    const message = decodeWebSocketFrame(buffer);
    if (!message) return;

    try {
      const data = JSON.parse(message);

      if (data.type === 'ping') {
        sendWebSocketMessage(socket, { type: 'pong' });
        return;
      }
      if (data.type === 'pong') {
        return;
      }

      if (data.type === 'join') {
        currentRoom = data.roomId || 'lobby';
        if (!rooms.has(currentRoom)) {
          rooms.set(currentRoom, []);
        }

        const roomPlayers = rooms.get(currentRoom);
        if (roomPlayers.length >= 2) {
          sendWebSocketMessage(socket, {
            type: 'error',
            message: 'Room ' + currentRoom + ' is already full (2 players).'
          });
          return;
        }

        if (roomPlayers.length === 0) {
          playerColor = data.color || 'w';
        } else {
          playerColor = roomPlayers[0].color === 'w' ? 'b' : 'w';
        }

        const playerInfo = {
          socket,
          color: playerColor,
          username: data.username || 'Player'
        };
        roomPlayers.push(playerInfo);

        // Tell this player they have joined
        sendWebSocketMessage(socket, {
          type: 'joined',
          roomId: currentRoom,
          color: playerColor,
          remoteUsername: roomPlayers.length > 1 ? roomPlayers[0].username : null
        });

        // If second player joined, notify both players with each other's info!
        if (roomPlayers.length === 2) {
          // Notify Host
          sendWebSocketMessage(roomPlayers[0].socket, {
            type: 'connected',
            color: roomPlayers[0].color,
            remoteUsername: playerInfo.username
          });
          // Notify Guest
          sendWebSocketMessage(socket, {
            type: 'connected',
            color: playerColor,
            remoteUsername: roomPlayers[0].username
          });
        }
      } else {
        // Broadcast ALL other message types (move, restart, resign, username_update, etc.) to room peer
        if (currentRoom) {
          broadcastToRoom(currentRoom, socket, data);
        }
      }
    } catch (e) {}
  });

  socket.on('close', () => {
    clearInterval(pingInterval);
    if (currentRoom && rooms.has(currentRoom)) {
      const roomPlayers = rooms.get(currentRoom).filter(p => p.socket !== socket);
      if (roomPlayers.length === 0) {
        rooms.delete(currentRoom);
      } else {
        rooms.set(currentRoom, roomPlayers);
        broadcastToRoom(currentRoom, null, { type: 'player_left' });
      }
    }
  });
});

function broadcastToRoom(roomId, senderSocket, data) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.forEach(p => {
    if (p.socket !== senderSocket && !p.socket.destroyed) {
      sendWebSocketMessage(p.socket, data);
    }
  });
}

function sendWebSocketMessage(socket, data) {
  const payload = Buffer.from(JSON.stringify(data));
  const length = payload.length;

  let header;
  if (length <= 125) {
    header = Buffer.from([0x81, length]);
  } else if (length <= 65535) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }

  socket.write(Buffer.concat([header, payload]));
}

function decodeWebSocketFrame(buffer) {
  if (buffer.length < 2) return null;
  const secondByte = buffer[1];
  const isMasked = (secondByte & 0x80) === 0x80;
  let length = secondByte & 0x7f;
  let offset = 2;

  if (length === 126) {
    length = buffer.readUInt16BE(2);
    offset = 4;
  } else if (length === 127) {
    length = Number(buffer.readBigUInt64BE(2));
    offset = 10;
  }

  let maskKey = null;
  if (isMasked) {
    maskKey = buffer.slice(offset, offset + 4);
    offset += 4;
  }

  const payload = buffer.slice(offset, offset + length);
  if (isMasked && maskKey) {
    for (let i = 0; i < payload.length; i++) {
      payload[i] ^= maskKey[i % 4];
    }
  }

  return payload.toString('utf8');
}

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

server.listen(PORT, () => {
  const localIp = getLocalIpAddress();
  console.log('====================================================');
  console.log('   ♔ CHESS.COM CLONE - MULTIPLAYER LAN SERVER ♔   ');
  console.log('====================================================');
  console.log('  ➜ Local PC:   http://localhost:' + PORT);
  console.log('  ➜ Mobile/LAN: http://' + localIp + ':' + PORT);
  console.log('----------------------------------------------------');
  console.log('  Share the Mobile/LAN link with your brother or');
  console.log('  any device connected to the same Wi-Fi network!');
  console.log('====================================================');
});
