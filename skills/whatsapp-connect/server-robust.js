const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const express = require('express');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuración
const TELEGRAM_BOT_TOKEN = '8799472381:AAGkpBP_oGE3lzghEFrHe_8CH2RVXu6LvIk';
const TELEGRAM_CHAT_ID = '5560884037';
const PORT = 8080;

// Estado global
let client = null;
let isConnected = false;
let pendingMessages = new Map();
let currentQR = null;
let qrImageBuffer = null;
let lastMessagesFetch = 0;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 10000; // 10 segundos

// Inicializar Express
const app = express();
app.use(express.json());

// Función para enviar mensajes a Telegram
async function sendTelegramMessage(text) {
  try {
    const command = `curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${TELEGRAM_CHAT_ID}" \
      -d "text=${encodeURIComponent(text)}"`;
    
    await execAsync(command);
  } catch (err) {
    console.error('Error enviando mensaje Telegram:', err.message);
  }
}

// Función para notificar mensaje entrante
async function notifyIncomingMessage(message) {
  const { from, body, timestamp, id } = message;
  
  const date = new Date(timestamp * 1000).toLocaleTimeString('es-CL');
  const text = `📱 **Nuevo mensaje WhatsApp**\n\n` +
               `👤 **De:** ${from}\n` +
               `🕐 **Hora:** ${date}\n` +
               `💬 **Mensaje:** ${body}\n\n` +
               `📝 **ID:** ${id}\n` +
               `📊 **Pendientes:** ${pendingMessages.size}`;
  
  await sendTelegramMessage(text);
}

// Función para manejar reconexión automática
async function scheduleReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('❌ Máximo de intentos de reconexión alcanzado');
    await sendTelegramMessage('❌ WhatsApp desconectado - Máximo de intentos de reconexión alcanzado');
    return;
  }
  
  reconnectAttempts++;
  const delay = RECONNECT_DELAY * reconnectAttempts; // Backoff exponencial
  
  console.log(`🔄 Programando reconexión en ${delay/1000} segundos (intento ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
  
  setTimeout(() => {
    console.log('🔄 Iniciando reconexión automática...');
    initializeWhatsApp();
  }, delay);
}

// Función para inicializar WhatsApp
function initializeWhatsApp() {
  console.log('🔧 Inicializando cliente WhatsApp...');
  
  // Limpiar cliente anterior si existe
  if (client) {
    try {
      client.destroy();
    } catch (err) {
      console.log('⚠️ Error limpiando cliente anterior:', err.message);
    }
  }
  
  // Crear nuevo cliente con autenticación local
  client = new Client({
    authStrategy: new LocalAuth({
      clientId: 'default',
      dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    }
  });
  
  // Evento: QR Code generado
  client.on('qr', async (qr) => {
    console.log('📱 QR Code recibido');
    currentQR = qr;
    
    // Generar QR para web
    try {
      qrImageBuffer = await QRCode.toBuffer(qr);
    } catch (err) {
      console.error('Error generando QR buffer:', err.message);
    }
    
    // Mostrar QR en terminal
    qrcode.generate(qr, { small: true });
    
    // Notificar por Telegram
    await sendTelegramMessage('📱 **QR Code generado**\n\nSe requiere escanear el código QR. La URL pública se proporcionará por separado.');
  });
  
  // Evento: Cliente listo
  client.on('ready', async () => {
    console.log('✅ WhatsApp conectado y escuchando');
    isConnected = true;
    currentQR = null;
    qrImageBuffer = null;
    reconnectAttempts = 0; // Resetear contador de reconexiones
    
    // Verificar conexión real enviando un ping
    try {
      // Intentar obtener información del cliente para verificar conexión real
      const info = await client.getWWebVersion();
      console.log(`✅ Conexión verificada - Versión WhatsApp Web: ${info}`);
    } catch (err) {
      console.error('❌ Error verificando conexión:', err.message);
      isConnected = false;
      scheduleReconnect();
      return;
    }
    
    // Notificar por Telegram
    await sendTelegramMessage('✅ **WhatsApp conectado exitosamente**\n\nEl sistema está listo para recibir y procesar mensajes.');
  });
  
  // Evento: Mensaje recibido
  client.on('message', async (message) => {
    try {
      console.log(`📩 Mensaje de ${message.from}: ${message.body.substring(0, 50)}...`);
      
      // Almacenar mensaje
      pendingMessages.set(message.id._serialized, {
        id: message.id._serialized,
        from: message._data.notifyName || message.from,
        body: message.body,
        timestamp: message.timestamp,
        chatId: message.from
      });
      
      // Notificar por Telegram
      await notifyIncomingMessage({
        id: message.id._serialized,
        from: message._data.notifyName || message.from,
        body: message.body,
        timestamp: message.timestamp,
        chatId: message.from
      });
      
    } catch (err) {
      console.error('Error procesando mensaje:', err.message);
    }
  });
  
  // Evento: Desconexión
  client.on('disconnected', async (reason) => {
    console.log(`❌ WhatsApp desconectado: ${reason}`);
    isConnected = false;
    
    // Notificar por Telegram
    await sendTelegramMessage(`❌ **WhatsApp desconectado**\n\nRazón: ${reason}\n\nEl sistema intentará reconectar automáticamente.`);
    
    // Programar reconexión
    scheduleReconnect();
  });
  
  // Evento: Error de autenticación
  client.on('auth_failure', async (error) => {
    console.error('❌ Error de autenticación:', error);
    isConnected = false;
    
    // Notificar por Telegram
    await sendTelegramMessage(`❌ **Error de autenticación WhatsApp**\n\n${error}\n\nSe requiere nuevo QR Code.`);
    
    // Programar reconexión
    scheduleReconnect();
  });
  
  // Evento: Error general
  client.on('error', async (error) => {
    console.error('❌ Error en cliente WhatsApp:', error);
    
    // Solo notificar errores críticos
    if (error.message.includes('detached') || error.message.includes('session')) {
      await sendTelegramMessage(`⚠️ **Error crítico WhatsApp**\n\n${error.message}\n\nEl sistema intentará recuperarse.`);
    }
  });
  
  // Inicializar cliente
  client.initialize().catch(async (err) => {
    console.error('❌ Error inicializando WhatsApp:', err);
    await sendTelegramMessage(`❌ **Error inicializando WhatsApp**\n\n${err.message}`);
    scheduleReconnect();
  });
}

// Endpoints HTTP
app.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    whatsappConnected: isConnected,
    hasQR: !!currentQR,
    pendingMessages: pendingMessages.size,
    reconnectAttempts: reconnectAttempts,
    timestamp: Date.now()
  });
});

app.get('/messages', (req, res) => {
  const since = parseInt(req.query.since) || lastMessagesFetch;
  const now = Date.now();
  
  // Filtrar mensajes desde el último fetch
  const allMessages = Array.from(pendingMessages.values());
  const newMessages = allMessages.filter(m => m.timestamp * 1000 > since);
  
  // Actualizar timestamp de última consulta
  lastMessagesFetch = now;
  
  // Limpiar mensajes muy antiguos (más de 1 hora)
  const oneHourAgo = now - 3600000;
  for (const [id, msg] of pendingMessages.entries()) {
    if (msg.timestamp * 1000 < oneHourAgo) {
      pendingMessages.delete(id);
    }
  }
  
  res.json({
    messages: newMessages.map(m => ({
      id: m.id,
      from: m.from,
      body: m.body,
      timestamp: m.timestamp,
      chatId: m.chatId
    })),
    count: newMessages.length,
    timestamp: now
  });
});

app.post('/send', async (req, res) => {
  try {
    const { to, message } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({ error: 'Faltan parámetros: to y message son requeridos' });
    }
    
    if (!isConnected) {
      return res.status(503).json({ error: 'WhatsApp no está conectado' });
    }
    
    const chatId = to.includes('@') ? to : `${to}@c.us`;
    
    // Verificar conexión antes de enviar
    try {
      await client.getWWebVersion();
    } catch (err) {
      console.error('❌ Conexión no válida, reconectando...');
      isConnected = false;
      scheduleReconnect();
      return res.status(503).json({ error: 'WhatsApp desconectado, reconectando...' });
    }
    
    const sentMessage = await client.sendMessage(chatId, message);
    
    console.log(`📤 Enviando mensaje a ${to}: ${message.substring(0, 50)}...`);
    
    res.json({
      success: true,
      messageId: sentMessage.id._serialized,
      timestamp: Date.now()
    });
    
  } catch (err) {
    console.error('Error enviando mensaje:', err);
    
    // Si es error de sesión, programar reconexión
    if (err.message.includes('detached') || err.message.includes('session') || err.message.includes('Frame')) {
      console.log('❌ Error de sesión, reconectando...');
      isConnected = false;
      scheduleReconnect();
      
      // Verificar si hay QR disponible
      if (!currentQR) {
        await sendTelegramMessage('❌ **WhatsApp desconectado - Se requiere nuevo QR**\n\nSe requiere nuevo código QR. La URL pública se proporcionará por separado.');
      }
    }
    
    res.status(500).json({ error: err.message });
  }
});

app.get('/qr', (req, res) => {
  if (!qrImageBuffer) {
    return res.status(404).json({ error: 'No hay QR disponible' });
  }
  
  res.set('Content-Type', 'image/png');
  res.send(qrImageBuffer);
});

app.get('/qr-page', (req, res) => {
  if (!currentQR) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>WhatsApp QR</title>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .status { color: #4CAF50; font-size: 24px; margin-bottom: 20px; }
          .info { color: #666; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="status">✅ WhatsApp Conectado</div>
        <div class="info">No se requiere QR - El sistema está funcionando correctamente</div>
        <div class="info"><a href="/status">Ver estado del sistema</a></div>
      </body>
      </html>
    `);
  }
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>WhatsApp QR</title>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .qr-container { margin: 20px auto; max-width: 300px; }
        .instructions { color: #666; margin-top: 20px; line-height: 1.6; }
        .status { color: #2196F3; font-size: 18px; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="status">📱 Escanea este código QR con WhatsApp</div>
      <div class="qr-container">
        <img src="/qr" alt="QR Code" style="width: 100%;">
      </div>
      <div class="instructions">
        <strong>Instrucciones:</strong><br>
        1. Abre WhatsApp en tu teléfono<br>
        2. Toca Menú → WhatsApp Web<br>
        3. Escanea el código QR<br>
        4. Espera a que se conecte automáticamente
      </div>
      <div class="instructions">
        <a href="/status">Ver estado del sistema</a>
      </div>
    </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    whatsapp: isConnected ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: Date.now()
  });
});

// Ruta principal
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>WhatsApp Server</title>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; padding: 50px; max-width: 800px; margin: 0 auto; }
        h1 { color: #25D366; }
        .endpoint { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
        code { background: #eee; padding: 2px 5px; border-radius: 3px; }
        .status { padding: 10px; border-radius: 5px; margin: 20px 0; }
        .connected { background: #d4edda; color: #155724; }
        .disconnected { background: #f8d7da; color: #721c24; }
      </style>
    </head>
    <body>
      <h1>🤖 WhatsApp Server</h1>
      
      <div class="status ${isConnected ? 'connected' : 'disconnected'}">
        <strong>Estado:</strong> ${isConnected ? '✅ Conectado' : '❌ Desconectado'}
        ${currentQR ? ' (QR disponible)' : ''}
      </div>
      
      <h2>Endpoints disponibles:</h2>
      
      <div class="endpoint">
        <strong>GET</strong> <code>/status</code><br>
        Estado del sistema WhatsApp
      </div>
      
      <div class="endpoint">
        <strong>GET</strong> <code>/qr-page</code><br>
        Página con código QR para conectar WhatsApp
      </div>
      
      <div class="endpoint">
        <strong>GET</strong> <code>/messages</code><br>
        Mensajes pendientes (query: ?since=timestamp)
      </div>
      
      <div class="endpoint">
        <strong>POST</strong> <code>/send</code><br>
        Enviar mensaje: {"to": "569xxxxxxx@c.us", "message": "texto"}
      </div>
      
      <div class="endpoint">
        <strong>GET</strong> <code>/health</code><br>
        Health check del servidor
      </div>
      
      <p>
        <a href="/qr-page">Conectar WhatsApp</a> | 
        <a href="/status">Ver estado</a> | 
        <a href="/health">Health check</a>
      </p>
    </body>
    </html>
  `);
});

// Iniciar servidor HTTP
app.listen(PORT, () => {
  console.log(`🚀 Servidor HTTP en http://localhost:${PORT}`);
  console.log('📋 Endpoints:');
  console.log('   GET  /           - Página principal');
  console.log('   GET  /qr         - QR como imagen PNG');
  console.log('   GET  /qr-page    - Página completa con QR');
  console.log('   GET  /status     - Estado del sistema');
  console.log('   GET  /messages   - Mensajes pendientes');
  console.log('   POST /send       - Enviar mensaje');
  console.log('   GET  /health     - Health check');
  
  // Inicializar WhatsApp
  initializeWhatsApp();
});

// Manejar cierre limpio
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando servidor...');
  if (client) {
    client.destroy();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Cerrando servidor (SIGTERM)...');
  if (client) {
    client.destroy();
  }
  process.exit(0);
});