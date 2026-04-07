#!/usr/bin/env node

/**
 * WhatsApp Full System
 * Con Baileys para manejo completo de mensajes + notificaciones Telegram
 */

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const SESSION_DIR = '/home/ubuntu/.openclaw/whatsapp-session';
const TELEGRAM_BOT_TOKEN = '8799472381:AAGkpBP_oGE3lzghEFrHe_8CH2RVXu6LvIk';
const TELEGRAM_CHAT_ID = '5560884037';
const HTTP_PORT = 8080;

// Estado global
let sock = null;
let isConnected = false;
let pendingMessages = new Map(); // id -> {from, message, timestamp}
let messageQueue = [];

function log(msg) {
  const ts = new Date().toISOString().substring(11, 19);
  console.log(`[${ts}] ${msg}`);
}

function error(msg, err = null) {
  const ts = new Date().toISOString().substring(11, 19);
  console.error(`[${ts}] ❌ ${msg}`, err ? err.message : '');
}

async function sendTelegramMessage(text) {
  try {
    const command = `curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${TELEGRAM_CHAT_ID}" \
      -d "text=${encodeURIComponent(text)}"`;
    
    await execAsync(command);
  } catch (err) {
    error('Error enviando mensaje Telegram', err);
  }
}

async function sendTelegramNotification(messageData) {
  const { from, message, timestamp, messageId } = messageData;
  
  // Formatear el mensaje para Telegram
  const date = new Date(timestamp * 1000).toLocaleTimeString('es-CL');
  const text = `📱 **Nuevo mensaje WhatsApp**\n\n` +
               `👤 **De:** ${from}\n` +
               `🕐 **Hora:** ${date}\n` +
               `💬 **Mensaje:** ${message}\n\n` +
               `📝 **ID:** ${messageId}\n` +
               `⚠️ **Esperando autorización para responder**`;
  
  await sendTelegramMessage(text);
}

async function connectWhatsApp() {
  try {
    log('🔌 Conectando a WhatsApp con Baileys...');
    
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
    
    const { version } = await fetchLatestBaileysVersion();
    
    sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: Browsers.ubuntu('Chrome'),
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: true,
      syncFullHistory: false,
      emitOwnEvents: false,
      defaultQueryTimeoutMs: 60000,
      connectTimeoutMs: 30000,
      keepAliveIntervalMs: 15000
    });
    
    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        log('📱 QR generado (pero ya deberías estar conectado)');
        // Si aparece QR, algo salió mal
        await sendTelegramMessage('⚠️ WhatsApp desconectado. Necesita nuevo QR.');
      }
      
      if (connection === 'open') {
        log('✅ WhatsApp conectado exitosamente');
        isConnected = true;
        await sendTelegramMessage('✅ WhatsApp CONECTADO vía Baileys. Listo para recibir mensajes.');
      }
      
      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        
        log(`🔌 WhatsApp desconectado. Reconectar: ${shouldReconnect}`);
        isConnected = false;
        
        if (shouldReconnect) {
          setTimeout(() => connectWhatsApp(), 5000);
        } else {
          await sendTelegramMessage('❌ WhatsApp desconectado permanentemente. Necesita nuevo QR.');
        }
      }
    });
    
    // Escuchar mensajes
    sock.ev.on('messages.upsert', async (m) => {
      try {
        const msg = m.messages[0];
        
        // Ignorar mensajes propios y actualizaciones
        if (msg.key.fromMe || !msg.message || msg.message.protocolMessage) return;
        
        // Obtener información del remitente
        let from = msg.key.remoteJid;
        let senderName = from;
        
        try {
          const contact = await sock.onWhatsApp(from);
          if (contact?.[0]?.exists) {
            senderName = contact[0].pushname || from.split('@')[0];
          }
        } catch (err) {
          // Ignorar error
        }
        
        // Extraer texto del mensaje
        let messageText = '';
        if (msg.message.conversation) {
          messageText = msg.message.conversation;
        } else if (msg.message.extendedTextMessage?.text) {
          messageText = msg.message.extendedTextMessage.text;
        } else if (msg.message.imageMessage?.caption) {
          messageText = `[Imagen] ${msg.message.imageMessage.caption}`;
        } else if (msg.message.videoMessage?.caption) {
          messageText = `[Video] ${msg.message.videoMessage.caption}`;
        } else if (msg.message.audioMessage) {
          messageText = '[Audio]';
        } else if (msg.message.documentMessage) {
          messageText = `[Documento] ${msg.message.documentMessage.fileName || ''}`;
        } else {
          messageText = '[Mensaje no textual]';
        }
        
        const messageData = {
          messageId: msg.key.id,
          from: senderName,
          jid: from,
          message: messageText,
          timestamp: msg.messageTimestamp,
          type: Object.keys(msg.message)[0]
        };
        
        log(`📩 Mensaje de ${senderName}: ${messageText.substring(0, 50)}...`);
        
        // Guardar en cola de mensajes pendientes
        pendingMessages.set(msg.key.id, messageData);
        
        // Enviar notificación a Telegram
        await sendTelegramNotification(messageData);
        
      } catch (err) {
        error('Error procesando mensaje', err);
      }
    });
    
    log('👂 Escuchando mensajes...');
    
  } catch (err) {
    error('Error conectando WhatsApp', err);
    setTimeout(() => connectWhatsApp(), 10000);
  }
}

async function sendWhatsAppMessage(toJid, text) {
  if (!sock || !isConnected) {
    throw new Error('WhatsApp no conectado');
  }
  
  try {
    log(`📤 Enviando mensaje a ${toJid}: ${text.substring(0, 50)}...`);
    
    await sock.sendMessage(toJid, { text });
    
    log('✅ Mensaje enviado');
    return { success: true, messageId: Date.now().toString() };
  } catch (err) {
    error('Error enviando mensaje WhatsApp', err);
    throw err;
  }
}

// Servidor HTTP para control
const server = http.createServer(async (req, res) => {
  const url = require('url').parse(req.url, true);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  try {
    if (req.method === 'GET' && url.pathname === '/status') {
      res.writeHead(200);
      res.end(JSON.stringify({
        status: 'ok',
        whatsappConnected: isConnected,
        pendingMessages: pendingMessages.size,
        timestamp: Date.now()
      }));
      
    } else if (req.method === 'GET' && url.pathname === '/messages') {
      res.writeHead(200);
      res.end(JSON.stringify({
        messages: Array.from(pendingMessages.values()),
        count: pendingMessages.size
      }));
      
    } else if (req.method === 'POST' && url.pathname === '/send') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const { to, message } = JSON.parse(body);
          
          if (!to || !message) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Faltan parámetros to o message' }));
            return;
          }
          
          const result = await sendWhatsAppMessage(to, message);
          
          res.writeHead(200);
          res.end(JSON.stringify(result));
        } catch (err) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      
    } else if (req.method === 'POST' && url.pathname === '/respond') {
      // Endpoint para responder a un mensaje específico
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const { messageId, response } = JSON.parse(body);
          
          if (!messageId || !response) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Faltan parámetros messageId o response' }));
            return;
          }
          
          const originalMessage = pendingMessages.get(messageId);
          if (!originalMessage) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Mensaje no encontrado' }));
            return;
          }
          
          const result = await sendWhatsAppMessage(originalMessage.jid, response);
          
          // Marcar como respondido
          pendingMessages.delete(messageId);
          
          // Notificar a Telegram
          await sendTelegramMessage(`✅ Respondido a ${originalMessage.from}: ${response.substring(0, 100)}...`);
          
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, respondedTo: originalMessage.from }));
        } catch (err) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      
    } else if (req.method === 'GET' && url.pathname === '/health') {
      res.writeHead(200);
      res.end(JSON.stringify({
        status: 'ok',
        whatsapp: isConnected,
        server: 'running',
        timestamp: Date.now()
      }));
      
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Ruta no encontrada' }));
    }
  } catch (err) {
    error('Error en servidor HTTP', err);
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Error interno' }));
  }
});

// Iniciar todo
async function start() {
  log('🚀 Iniciando WhatsApp Full System...');
  
  // Iniciar servidor HTTP
  server.listen(HTTP_PORT, () => {
    log(`🌐 Servidor HTTP en http://localhost:${HTTP_PORT}`);
    log(`📱 Endpoints disponibles:`);
    log(`   GET  /status     - Estado del sistema`);
    log(`   GET  /messages   - Mensajes pendientes`);
    log(`   POST /send       - Enviar mensaje (JSON: {to, message})`);
    log(`   POST /respond    - Responder a mensaje (JSON: {messageId, response})`);
    log(`   GET  /health     - Health check`);
  });
  
  // Conectar WhatsApp
  setTimeout(() => connectWhatsApp(), 2000);
  
  // Enviar IP a Telegram
  execAsync('curl -s ifconfig.me || hostname -I | awk \'{print $1}\'')
    .then(({ stdout }) => {
      const ip = stdout.trim();
      sendTelegramMessage(
        `🚀 WhatsApp Full System iniciado\n\n` +
        `📱 Servidor: http://${ip}:${HTTP_PORT}\n` +
        `🔌 WhatsApp: Conectando...\n\n` +
        `📋 Protocolo:\n` +
        `1. Yo te notifico por Telegram de nuevos mensajes\n` +
        `2. Tú me autorizas responder\n` +
        `3. Yo envío la respuesta por WhatsApp`
      );
    })
    .catch(() => {
      sendTelegramMessage('🚀 WhatsApp Full System iniciado\n\nConectando a WhatsApp...');
    });
}

// Manejar cierre
process.on('SIGINT', async () => {
  log('\n🛑 Cerrando sistema...');
  if (sock) {
    try {
      await sock.end();
      log('✅ WhatsApp desconectado');
    } catch (err) {
      error('Error cerrando WhatsApp', err);
    }
  }
  server.close();
  process.exit(0);
});

// Iniciar
start();