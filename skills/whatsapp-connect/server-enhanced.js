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
               `⚠️ **Esperando autorización para responder**`;
  
  await sendTelegramMessage(text);
}

// Buscar chromium instalado
function findChromiumPath() {
  const paths = [
    '/home/ubuntu/.cache/ms-playwright/chromium-*/chrome-linux/chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome'
  ];
  
  for (const path of paths) {
    if (path.includes('*')) {
      try {
        const dir = fs.readdirSync('/home/ubuntu/.cache/ms-playwright/')
          .find(d => d.startsWith('chromium-'));
        if (dir) {
          const fullPath = `/home/ubuntu/.cache/ms-playwright/${dir}/chrome-linux/chrome`;
          if (fs.existsSync(fullPath)) {
            return fullPath;
          }
        }
      } catch (e) {
        // Continuar
      }
    } else if (fs.existsSync(path)) {
      return path;
    }
  }
  
  return undefined;
}

// Inicializar cliente WhatsApp
function initializeWhatsAppClient() {
  console.log('🔧 Inicializando cliente WhatsApp...');
  
  const executablePath = findChromiumPath();
  console.log(`🔍 Chromium path: ${executablePath || 'usando default'}`);
  
  client = new Client({
    puppeteer: {
      headless: true,
      executablePath: executablePath || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    },
    authStrategy: new LocalAuth({ clientId: 'default' })
  });
  
  // Evento QR
  client.on('qr', async (qr) => {
    console.log('📱 QR generado. Escanea con WhatsApp:');
    qrcode.generate(qr, { small: true });
    
    // Guardar QR para servir como imagen
    currentQR = qr;
    
    try {
      // Generar imagen PNG del QR
      qrImageBuffer = await QRCode.toBuffer(qr, {
        type: 'png',
        width: 300,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      console.log('🖼️ QR generado como imagen PNG');
      
      // Enviar notificación a Telegram con instrucciones
      await sendTelegramMessage(
        `📱 **QR GENERADO para WhatsApp**\n\n` +
        `🌐 **URL del QR:** https://openclaw-wa.loca.lt/qr\n\n` +
        `**Instrucciones:**\n` +
        `1. Abre https://openclaw-wa.loca.lt/qr en tu navegador\n` +
        `2. Abre WhatsApp en tu teléfono\n` +
        `3. Toca ⋮ → Linked Devices\n` +
        `4. Escanea el código QR de la página\n\n` +
        `**Nota:** El QR se actualiza automáticamente cada ~20 segundos si no se escanea.`
      );
      
    } catch (err) {
      console.error('Error generando QR como imagen:', err.message);
      // Enviar instrucciones alternativas
      await sendTelegramMessage(
        `📱 QR generado (pero error creando imagen).\n\n` +
        `Para ver el QR:\n` +
        `1. Conéctate por SSH al servidor\n` +
        `2. Ejecuta: tail -50 /tmp/whatsapp-server.log\n` +
        `3. Verás el código QR en ASCII`
      );
    }
  });
  
  // Evento ready
  client.on('ready', () => {
    console.log('✅ WhatsApp conectado y escuchando');
    isConnected = true;
    currentQR = null;
    qrImageBuffer = null;
    sendTelegramMessage('✅ WhatsApp CONECTADO y escuchando mensajes. Listo para notificarte de mensajes entrantes.');
  });
  
  // Evento mensaje
  client.on('message', async (msg) => {
    try {
      // Ignorar mensajes propios
      if (msg.fromMe) return;
      
      console.log(`📩 Mensaje de ${msg.from}: ${msg.body.substring(0, 50)}...`);
      
      // Obtener información del contacto
      const contact = await msg.getContact();
      const senderName = contact.pushname || contact.name || msg.from.split('@')[0];
      
      const messageData = {
        id: msg.id.id,
        from: senderName,
        chatId: msg.from,
        body: msg.body,
        timestamp: msg.timestamp,
        raw: msg
      };
      
      // Guardar en pendientes
      pendingMessages.set(msg.id.id, messageData);
      
      // Notificar por Telegram
      await notifyIncomingMessage(messageData);
      
    } catch (err) {
      console.error('Error procesando mensaje:', err.message);
    }
  });
  
  // Evento desconexión
  client.on('disconnected', (reason) => {
    console.log(`🔌 WhatsApp desconectado: ${reason}`);
    isConnected = false;
    sendTelegramMessage(`⚠️ WhatsApp desconectado: ${reason}. Reconectando...`);
    
    // Reconectar después de 5 segundos
    setTimeout(() => {
      if (!isConnected) {
        console.log('🔄 Intentando reconectar...');
        client.initialize();
      }
    }, 5000);
  });
  
  // Inicializar cliente
  client.initialize();
}

// Endpoints HTTP
app.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    whatsappConnected: isConnected,
    hasQR: !!currentQR,
    pendingMessages: pendingMessages.size,
    timestamp: Date.now()
  });
});

app.get('/messages', (req, res) => {
  res.json({
    messages: Array.from(pendingMessages.values()).map(m => ({
      id: m.id,
      from: m.from,
      body: m.body,
      timestamp: m.timestamp,
      chatId: m.chatId
    })),
    count: pendingMessages.size
  });
});

app.get('/qr', (req, res) => {
  if (!qrImageBuffer) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head><title>QR no disponible</title></head>
      <body>
        <h1>QR no disponible</h1>
        <p>Esperando generación de QR...</p>
        <p>Revisa la terminal del servidor para ver el QR en ASCII.</p>
      </body>
      </html>
    `);
  }
  
  res.writeHead(200, {
    'Content-Type': 'image/png',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.end(qrImageBuffer);
});

app.get('/qr-page', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>WhatsApp QR - OpenClaw</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: sans-serif;
          text-align: center;
          padding: 40px;
          background: #25D366;
          color: white;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .container {
          background: rgba(255,255,255,0.1);
          padding: 40px;
          border-radius: 20px;
          max-width: 500px;
          width: 100%;
          backdrop-filter: blur(10px);
        }
        h1 { margin-bottom: 10px; }
        .qr-box {
          background: white;
          padding: 20px;
          border-radius: 15px;
          margin: 30px 0;
          display: inline-block;
        }
        #qr-img {
          max-width: 300px;
          width: 100%;
          border-radius: 10px;
        }
        .status {
          padding: 15px;
          border-radius: 10px;
          margin: 20px 0;
          font-weight: bold;
        }
        .waiting { background: rgba(255,193,7,0.2); border: 2px solid #FFC107; }
        .connected { background: rgba(76,175,80,0.2); border: 2px solid #4CAF50; }
        .instructions {
          text-align: left;
          background: rgba(255,255,255,0.2);
          padding: 20px;
          border-radius: 10px;
          margin-top: 20px;
        }
        ol { margin-left: 20px; }
        li { margin-bottom: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📱 WhatsApp QR</h1>
        <p>Escanea para conectar OpenClaw a WhatsApp</p>
        
        <div class="qr-box">
          <img id="qr-img" src="/qr" alt="QR Code">
        </div>
        
        <div id="status" class="status waiting">
          ⏳ Esperando QR...
        </div>
        
        <div class="instructions">
          <h3>Instrucciones:</h3>
          <ol>
            <li>Abre WhatsApp en tu teléfono</li>
            <li>Toca ⋮ → Linked Devices</li>
            <li>Escanea este código QR</li>
            <li>Espera a que la página detecte la conexión</li>
          </ol>
          <p><strong>Nota:</strong> El QR se actualiza automáticamente cada ~20 segundos.</p>
        </div>
        
        <div style="margin-top:20px;font-size:14px;opacity:0.8;">
          🔄 Auto-refresh cada 5 segundos
        </div>
      </div>
      
      <script>
        function update() {
          // Actualizar imagen QR con timestamp para evitar cache
          document.getElementById('qr-img').src = '/qr?' + Date.now();
          
          // Actualizar estado
          fetch('/status')
            .then(r => r.json())
            .then(data => {
              const status = document.getElementById('status');
              if (data.whatsappConnected) {
                status.className = 'status connected';
                status.innerHTML = '✅ ¡WhatsApp CONECTADO!';
              } else if (data.hasQR) {
                status.className = 'status waiting';
                status.innerHTML = '⏳ Esperando escaneo...';
              } else {
                status.className = 'status waiting';
                status.innerHTML = '🔄 Generando QR...';
              }
            })
            .catch(() => {
              document.getElementById('status').innerHTML = '❌ Error de conexión';
            });
        }
        
        setInterval(update, 5000);
        update();
      </script>
    </body>
    </html>
  `);
});

app.post('/send', async (req, res) => {
  try {
    const { to, message } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({ error: 'Faltan parámetros to o message' });
    }
    
    if (!isConnected || !client) {
      return res.status(503).json({ error: 'WhatsApp no conectado' });
    }
    
    console.log(`📤 Enviando mensaje a ${to}: ${message.substring(0, 50)}...`);
    
    const result = await client.sendMessage(to, message);
    
    res.json({
      success: true,
      messageId: result.id.id,
      timestamp: Date.now()
    });
    
  } catch (err) {
    console.error('Error enviando mensaje:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/respond', async (req, res) => {
  try {
    const { messageId, response } = req.body;
    
    if (!messageId || !response) {
      return res.status(400).json({ error: 'Faltan parámetros messageId o response' });
    }
    
    if (!isConnected || !client) {
      return res.status(503).json({ error: 'WhatsApp no conectado' });
    }
    
    const originalMessage = pendingMessages.get(messageId);
    if (!originalMessage) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }
    
    console.log(`📤 Respondiendo a ${originalMessage.from}: ${response.substring(0, 50)}...`);
    
    await client.sendMessage(originalMessage.chatId, response);
    
    // Eliminar de pendientes
    pendingMessages.delete(messageId);
    
    // Notificar a Telegram
    await sendTelegramMessage(`✅ Respondido a ${originalMessage.from}: ${response.substring(0, 100)}...`);
    
    res.json({
      success: true,
      respondedTo: originalMessage.from
    });
    
  } catch (err) {
    console.error('Error respondiendo mensaje:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    whatsapp: isConnected,
    server: 'running',
    hasQR: !!currentQR,
    timestamp: Date.now()
  });
});

app.get('/', (req, res) => {
  res.redirect('/qr-page');
});

// Iniciar servidor
app.listen(PORT, async () => {
  console.log(`🚀 Servidor HTTP en http://localhost:${PORT}`);
  console.log(`📋 Endpoints:`);
  console.log(`   GET  /           - Página con QR`);
  console.log(`   GET  /qr         - QR como imagen PNG`);
  console.log(`   GET  /qr-page    - Página completa con QR`);
  console.log(`   GET  /status     - Estado del sistema`);
  console.log(`   GET  /messages   - Mensajes pendientes`);
  console.log(`   POST /send       - Enviar mensaje`);
  console.log(`   POST /respond    - Responder a mensaje`);
  console.log(`   GET  /health     - Health check`);
  
  // Enviar IP a Telegram
  try {
    const { stdout } = await execAsync('curl -s ifconfig.me || hostname -I | awk \'{print $1}\'');
    const ip = stdout.trim();
    await sendTelegramMessage(
      `🚀 WhatsApp Server mejorado iniciado\n\n` +
      `📱 Servidor local: http://localhost:${PORT}\n` +
      `🌐 Tunnel público: https://openclaw-wa.loca.lt\n` +
      `🔌 WhatsApp: Generando QR...\n\n` +
      `📋 Protocolo:\n` +
      `1. Escanea el QR en https://openclaw-wa.loca.lt\n` +
      `2. Yo te notifico por Telegram de nuevos mensajes\n` +
      `3. Tú me autorizas responder\n` +
      `4. Yo envío la respuesta por WhatsApp`
    );
  } catch (err) {
    await sendTelegramMessage('🚀 WhatsApp Server mejorado iniciado\n\nGenerando QR...');
  }
  
  // Inicializar WhatsApp
  initializeWhatsAppClient();
});

// Manejar cierre
process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando servidor...');
  if (client) {
    try {
      await client.destroy();
      console.log('✅ WhatsApp desconectado');
    } catch (err) {
      console.error('Error cerrando WhatsApp:', err.message);
    }
  }
  process.exit(0);
});