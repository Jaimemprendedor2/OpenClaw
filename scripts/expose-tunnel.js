#!/usr/bin/env node

/**
 * Expose WhatsApp QR server via localtunnel
 */

const localtunnel = require('localtunnel');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const TELEGRAM_BOT_TOKEN = '8799472381:AAGkpBP_oGE3lzghEFrHe_8CH2RVXu6LvIk';
const TELEGRAM_CHAT_ID = '5560884037';
const PORT = 8080;

async function sendTelegramMessage(text) {
  try {
    const command = `curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${TELEGRAM_CHAT_ID}" \
      -d "text=${encodeURIComponent(text)}"`;
    
    await execAsync(command);
  } catch (error) {
    console.error('Error sending message:', error.message);
  }
}

async function main() {
  console.log('🌐 Creando tunnel público para WhatsApp QR server...');
  
  try {
    const tunnel = await localtunnel({
      port: PORT,
      subdomain: 'openclaw-whatsapp', // Intentar este subdominio
      allow_invalid_cert: true
    });
    
    console.log(`✅ Tunnel creado: ${tunnel.url}`);
    console.log('📱 Esta URL es pública y accesible desde cualquier dispositivo');
    console.log('🔄 Tunnel activo. Mantén este proceso ejecutando.');
    
    const message = `🌐 WhatsApp QR - URL PÚBLICA:\n\n${tunnel.url}\n\n1. Abre esta URL en tu navegador\n2. Escanea el QR que aparece\n3. La página se actualiza automáticamente\n\n⚠️ No cierres este tunnel hasta que escanees el código`;
    
    await sendTelegramMessage(message);
    console.log('📤 URL enviada a Telegram');
    
    // Manejar cierre del tunnel
    tunnel.on('close', () => {
      console.log('❌ Tunnel cerrado');
      process.exit(1);
    });
    
    // Mantener proceso vivo
    process.on('SIGINT', () => {
      console.log('\n🛑 Cerrando tunnel...');
      tunnel.close();
      process.exit(0);
    });
    
    // Enviar recordatorio cada 2 minutos
    setInterval(async () => {
      await sendTelegramMessage(`⏰ WhatsApp QR sigue disponible en:\n${tunnel.url}\n\nEl QR se actualiza automáticamente cada 10 segundos.`);
    }, 120000);
    
  } catch (error) {
    console.error('❌ Error creando tunnel:', error.message);
    
    if (error.message.includes('subdomain')) {
      console.log('⚠️ Subdominio ocupado, intentando sin subdominio...');
      try {
        const tunnel = await localtunnel({
          port: PORT,
          allow_invalid_cert: true
        });
        
        console.log(`✅ Tunnel creado (sin subdominio): ${tunnel.url}`);
        
        const message = `🌐 WhatsApp QR - URL PÚBLICA:\n\n${tunnel.url}\n\n1. Abre esta URL en tu navegador\n2. Escanea el QR\n3. La página se actualiza automáticamente`;
        
        await sendTelegramMessage(message);
        
        tunnel.on('close', () => {
          console.log('❌ Tunnel cerrado');
          process.exit(1);
        });
        
        process.on('SIGINT', () => {
          console.log('\n🛑 Cerrando tunnel...');
          tunnel.close();
          process.exit(0);
        });
        
      } catch (error2) {
        console.error('❌ Error en segundo intento:', error2.message);
        await sendTelegramMessage('❌ No se pudo crear tunnel público. Usa SSH tunnel:\n\nssh -L 8080:localhost:8080 ubuntu@148.116.107.54\n\nLuego abre http://localhost:8080');
        process.exit(1);
      }
    } else {
      await sendTelegramMessage('❌ Error creando tunnel público. Usa SSH tunnel:\n\nssh -L 8080:localhost:8080 ubuntu@148.116.107.54\n\nLuego abre http://localhost:8080');
      process.exit(1);
    }
  }
}

// Verificar si localtunnel está disponible, sino instalarlo
async function ensureLocaltunnel() {
  try {
    require.resolve('localtunnel');
    console.log('✅ localtunnel está instalado');
  } catch (error) {
    console.log('📦 Instalando localtunnel...');
    try {
      await execAsync('npm install --no-save localtunnel');
      console.log('✅ localtunnel instalado');
    } catch (installError) {
      console.error('❌ Error instalando localtunnel:', installError.message);
      throw installError;
    }
  }
}

if (require.main === module) {
  ensureLocaltunnel()
    .then(main)
    .catch(error => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { main };