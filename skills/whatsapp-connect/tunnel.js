const localtunnel = require('localtunnel');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const TELEGRAM_BOT_TOKEN = '8799472381:AAGkpBP_oGE3lzghEFrHe_8CH2RVXu6LvIk';
const TELEGRAM_CHAT_ID = '5560884037';

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

(async () => {
  console.log('🌐 Creando tunnel público con localtunnel...');
  
  const tunnel = await localtunnel({ 
    port: 8080,
    subdomain: 'openclaw-wa' // Intentar usar este subdominio
  });
  
  console.log(`✅ Tunnel creado: ${tunnel.url}`);
  
  // Enviar URL a Telegram
  await sendTelegramMessage(
    `🌐 **TUNNEL PÚBLICO CREADO**\n\n` +
    `📱 **URL:** ${tunnel.url}\n\n` +
    `**Para escanear el QR:**\n` +
    `1. Abre esta URL en tu navegador: ${tunnel.url}\n` +
    `2. Deberías ver la página de estado del servidor\n` +
    `3. El QR está en la terminal del servidor, pero ahora puedes:\n` +
    `   - Conectarte por SSH y ver /tmp/whatsapp-server.log\n` +
    `   - O esperar a que implemente servir el QR como imagen\n\n` +
    `**Nota:** Los tunnels gratuitos pueden ser lentos y expiran después de un tiempo.`
  );
  
  console.log('📤 URL enviada a Telegram');
  console.log('🔄 Tunnel activo. Presiona Ctrl+C para cerrar.');
  
  tunnel.on('close', () => {
    console.log('🔒 Tunnel cerrado');
    process.exit(0);
  });
  
  // Mantener el proceso vivo
  process.on('SIGINT', () => {
    tunnel.close();
  });
})();