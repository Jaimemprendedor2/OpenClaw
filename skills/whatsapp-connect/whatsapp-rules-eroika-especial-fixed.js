#!/usr/bin/env node
// WhatsApp Rules Bot - Con funciones especiales para Eroika - VERSIÓN CORREGIDA

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Importar módulo Eroika (IGNORA MENSAJES PROPIOS)
const eroikaManager = require('./eroika-manager-ignore-self.js');

// Configuración
const TELEGRAM_BOT_TOKEN = '8799472381:AAGkpBP_oGE3lzghEFrHe_8CH2RVXu6LvIk';
const TELEGRAM_CHAT_ID = '5560884037';
const WHATSAPP_API = 'http://localhost:8080';

// Archivo de reglas
const RULES_FILE = './whatsapp-rules-final.json';

// Estado del bot - INICIALIZAR CON 5 MINUTOS ATRÁS
let lastFetchTime = Date.now() - 300000; // 5 minutos atrás

// Función para obtener hora Chile
function getChileTime() {
  return new Date().toLocaleTimeString('es-CL', {
    timeZone: 'America/Santiago',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// Cargar reglas
function loadRules() {
  try {
    if (fs.existsSync(RULES_FILE)) {
      return JSON.parse(fs.readFileSync(RULES_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error cargando reglas:', err.message);
  }
  
  // Reglas por defecto
  return {
    listenMode: 'whitelist',
    whitelist: [eroikaManager.EROIKA_ID, 'Equipo | Ecosistemanet'],
    notifyFormat: 'simple',
    maxPreviewChars: 30,
    groupThreshold: 10,
    securityResponse: "Le aviso a Jaime y te respondo",
    storeConversations: true,
    conversations: {},
    messageCounters: {},
    processedMessages: {},
    lastChecked: Date.now(),
    eroikaEspecial: true // Nueva funcionalidad activada
  };
}

// Guardar reglas
function saveRules(rules) {
  try {
    fs.writeFileSync(RULES_FILE, JSON.stringify(rules, null, 2));
  } catch (err) {
    console.error('Error guardando reglas:', err.message);
  }
}

// Enviar Telegram
async function sendTelegram(text) {
  try {
    const cmd = `curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${TELEGRAM_CHAT_ID}" \
      -d "text=${encodeURIComponent(text)}"`;
    await execAsync(cmd);
  } catch (err) {
    console.error('Error Telegram:', err.message);
  }
}

// Enviar WhatsApp
async function sendWhatsApp(to, message) {
  try {
    const cmd = `curl -s -X POST "${WHATSAPP_API}/send" \
      -H "Content-Type: application/json" \
      -d '{"to": "${to}", "message": "${message.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"}'`;
    
    const { stdout } = await execAsync(cmd);
    return JSON.parse(stdout);
  } catch (err) {
    console.error('Error enviando WhatsApp:', err.message);
    return { error: err.message };
  }
}

// Verificar mensajes WhatsApp - VERSIÓN MEJORADA
async function checkWhatsAppMessages() {
  try {
    const since = lastFetchTime;
    const cmd = `curl -s "${WHATSAPP_API}/messages?since=${since}"`;
    const { stdout } = await execAsync(cmd);
    const data = JSON.parse(stdout);
    
    // Actualizar tiempo de última consulta
    if (data.nextSince) {
      lastFetchTime = data.nextSince;
    } else if (data.messages && data.messages.length > 0) {
      // Si hay mensajes pero no nextSince, usar el tiempo actual
      lastFetchTime = Date.now();
    }
    
    if (data.messages && data.messages.length > 0) {
      const chileTime = getChileTime();
      console.log(`[${chileTime}] 📨 ${data.messages.length} mensajes nuevos (desde: ${new Date(since).toLocaleTimeString('es-CL', { timeZone: 'America/Santiago' })})`);
      
      for (const msg of data.messages) {
        await processMessage(msg);
      }
    }
  } catch (err) {
    console.error('Error verificando mensajes:', err.message);
  }
}

// Procesar mensaje con funciones especiales para Eroika
async function processMessage(msg) {
  const rules = loadRules();
  const { from, body, chatId, id } = msg;
  
  // 1. Verificar si ya procesamos este mensaje (por ID)
  if (rules.processedMessages && rules.processedMessages[id]) {
    console.log(`⏭️  Mensaje ya procesado: ${id}`);
    return;
  }
  
  // 2. Marcar como procesado
  rules.processedMessages = rules.processedMessages || {};
  rules.processedMessages[id] = Date.now();
  
  // 3. Limpiar mensajes procesados antiguos (más de 1 hora)
  const oneHourAgo = Date.now() - 3600000;
  Object.keys(rules.processedMessages).forEach(msgId => {
    if (rules.processedMessages[msgId] < oneHourAgo) {
      delete rules.processedMessages[msgId];
    }
  });
  
  // 4. Almacenar conversación
  if (rules.storeConversations) {
    if (!rules.conversations[chatId]) {
      rules.conversations[chatId] = [];
    }
    
    const now = Date.now();
    rules.conversations[chatId].push({
      from,
      body,
      timestamp: now
    });
    
    // Limitar tamaño
    if (rules.conversations[chatId].length > 50) {
      rules.conversations[chatId] = rules.conversations[chatId].slice(-50);
    }
  }
  
  // 5. Determinar si es Eroika
  const isEroika = chatId === eroikaManager.EROIKA_ID;
  
  // 6. PARA EROIKA: Funciones especiales
  if (isEroika && rules.eroikaEspecial) {
    // Analizar mensaje
    const analisis = eroikaManager.analizarMensajeEroika(msg);
    
    // Si necesita respuesta especial
    if (analisis.necesitaRespuesta) {
      const respuesta = eroikaManager.generarRespuestaEroika(msg, analisis);
      
      if (respuesta) {
        // Enviar respuesta a WhatsApp
        const resultado = await sendWhatsApp(chatId, respuesta);
        
        if (resultado.success) {
          console.log(`🤖 Respondido en Eroika: ${from} → "${body.substring(0, 30)}..."`);
          
          // Notificar a Telegram sobre interacción especial
          if (analisis.esPreguntaJaime || analisis.esPreguntaNumero || analisis.esPreguntaGeneral) {
            await sendTelegram(
              `📝 *Nueva solicitud en Eroika*\n\n` +
              `👤 *De:* ${from}\n` +
              `💬 *Pregunta:* "${body.substring(0, 100)}${body.length > 100 ? '...' : ''}"\n` +
              `🏷️ *Tipo:* ${analisis.esPreguntaJaime ? 'Pregunta por Jaime' : analisis.esPreguntaNumero ? 'Pregunta por número' : 'Pregunta general'}\n` +
              `⏰ *Hora:* ${getChileTime()}\n\n` +
              `✅ *Respuesta enviada:* "Jaime te responderá cuando se pueda conectar."`
            );
          }
        }
      }
    }
    
    // Notificación normal a Telegram (si no es saludo)
    if (!analisis.esSaludo) {
      const preview = body.length > rules.maxPreviewChars 
        ? body.substring(0, rules.maxPreviewChars) + '...' 
        : body;
      
      const notification = `📱 ${from} → "${preview}"`;
      await sendTelegram(notification);
      console.log(`✅ Notificado: ${from} → ${preview.substring(0, 20)}...`);
    }
  }
  
  // 7. Para otros chats en whitelist (comportamiento normal)
  else if (rules.whitelist.includes(chatId) && chatId !== eroikaManager.EROIKA_ID) {
    const preview = body.length > rules.maxPreviewChars 
      ? body.substring(0, rules.maxPreviewChars) + '...' 
      : body;
    
    let notification = `📱 ${from} → "${preview}"`;
    
    // Actualizar contador para resúmenes
    rules.messageCounters[chatId] = (rules.messageCounters[chatId] || 0) + 1;
    
    // Resumen solo si alcanza threshold
    if (rules.messageCounters[chatId] >= rules.groupThreshold) {
      notification = `📱 ${from} → [${rules.groupThreshold}+ mensajes]`;
      rules.messageCounters[chatId] = 0;
    }
    
    await sendTelegram(notification);
  }
  
  // 8. Guardar reglas
  rules.lastChecked = Date.now();
  saveRules(rules);
}

// Manejar comandos de Telegram
async function handleTelegramCommand(commandText) {
  const parts = commandText.toLowerCase().split(' ');
  const cmd = parts[0];
  const args = parts.slice(1).join(' ');
  
  switch (cmd) {
    case 'solicitudes':
    case 'que':
      if (args.includes('solicitud')) {
        const resumen = eroikaManager.obtenerResumenSolicitudes();
        await sendTelegram(resumen);
      }
      break;
      
    case 'respondida':
      if (args) {
        const idSolicitud = args.trim();
        const resultado = eroikaManager.marcarComoRespondida(idSolicitud);
        
        if (resultado) {
          await sendTelegram(`✅ Solicitud ${idSolicitud} marcada como respondida.`);
        } else {
          await sendTelegram(`❌ No se encontró la solicitud ${idSolicitud}.`);
        }
      }
      break;
      
    case 'config':
      const rules = loadRules();
      const solicitudes = eroikaManager.cargarSolicitudes();
      
      await sendTelegram(
        `⚙️ *Configuración WhatsApp*\n\n` +
        `• *Modo:* ${rules.listenMode}\n` +
        `• *Eroika especial:* ${rules.eroikaEspecial ? 'ACTIVADO' : 'DESACTIVADO'}\n` +
        `• *En escucha:* ${rules.whitelist.length} grupos\n` +
        `• *Notificaciones:* ${rules.notifyFormat}\n` +
        `• *Resumen:* cada ${rules.groupThreshold} mensajes\n\n` +
        `📋 *Solicitudes Eroika:*\n` +
        `• Pendientes: ${solicitudes.pendientes}\n` +
        `• Total: ${solicitudes.total}\n` +
        `• Última: ${new Date(solicitudes.ultimaActualizacion).toLocaleString('es-CL', { timeZone: 'America/Santiago' })}\n\n` +
        `⏰ *Hora Chile:* ${getChileTime()}`
      );
      break;
      
    default:
      await sendTelegram(
        `❓ *Comandos disponibles:*\n\n` +
        `• *solicitudes* — Ver solicitudes pendientes para Jaime\n` +
        `• *respondida [ID]* — Marcar solicitud como respondida\n` +
        `• *config* — Ver configuración del sistema\n` +
        `• *quien me escribio* — Chats con mensajes almacenados\n` +
        `• *ayuda* — Esta lista de comandos`
      );
  }
}

// Función principal - VERSIÓN MEJORADA
async function main() {
  const chileTime = getChileTime();
  console.log(`🚀 WhatsApp Rules Bot - Eroika Especial [${chileTime}]`);
  console.log('🎯 Eroika ID:', eroikaManager.EROIKA_ID);
  console.log('🤖 Funciones especiales: ACTIVADAS');
  console.log('📝 Repositorio solicitudes: CREADO');
  console.log('⏰ Zona horaria: America/Santiago');
  console.log(`⏳ Procesando mensajes desde: ${new Date(lastFetchTime).toLocaleString('es-CL', { timeZone: 'America/Santiago' })}`);
  
  // Cargar estado inicial de solicitudes
  const solicitudes = eroikaManager.cargarSolicitudes();
  console.log(`📋 Solicitudes cargadas: ${solicitudes.total} (${solicitudes.pendientes} pendientes)`);
  
  await sendTelegram(
    `🔄 **WhatsApp Rules Bot - EROIKA ESPECIAL (CORREGIDO)**\n\n` +
    `✅ *Funciones especiales activadas:*\n` +
    `• Saludos automáticos en Eroika\n` +
    `• Respuestas para preguntas por Jaime/número\n` +
    `• Repositorio de solicitudes creado\n\n` +
    `🔧 *Correcciones aplicadas:*\n` +
    `• Detección mejorada de saludos (incluye "Gracias Donna", "Bienvenida Donna")\n` +
    `• Procesamiento de mensajes desde últimos 5 minutos\n` +
    `• Respuestas personalizadas para diferentes tipos de saludos\n\n` +
    `📝 *Comportamiento en Eroika:*\n` +
    `1. Si te saludan → Saludo amigable\n` +
    `2. Si dicen "Gracias Donna" → Agradecimiento\n` +
    `3. Si dicen "Bienvenida Donna" → Agradecimiento por bienvenida\n` +
    `4. Si preguntan por Jaime/número → "Jaime te responderá..."\n` +
    `5. Notificaciones normales siguen activas\n\n` +
    `📋 *Solicitudes actuales:*\n` +
    `• Pendientes: ${solicitudes.pendientes}\n` +
    `• Total: ${solicitudes.total}\n\n` +
    `🔧 *Comandos nuevos:*\n` +
    `• *solicitudes* — Ver solicitudes pendientes\n` +
    `• *respondida [ID]* — Marcar como respondida\n\n` +
    `⏰ *Hora Chile:* ${chileTime}`
  );
  
  // Procesar mensajes pendientes inmediatamente
  console.log('🔄 Procesando mensajes pendientes...');
  await checkWhatsAppMessages();
  
  // Loop cada 30 segundos
  setInterval(async () => {
    try {
      await checkWhatsAppMessages();
    } catch (err) {
      console.error('Error en verificación:', err.message);
    }
  }, 30000);
  
  console.log('⏰ Verificando mensajes nuevos cada 30 segundos...');
  
  // También escuchar comandos de Telegram (simplificado)
  console.log('📨 Listo para recibir comandos de Telegram...');
}

// Ejecutar
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  handleTelegramCommand
};