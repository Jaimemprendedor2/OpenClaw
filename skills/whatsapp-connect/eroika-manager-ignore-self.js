// Módulo para manejar interacciones especiales en el grupo Eroika - IGNORA MENSAJES PROPIOS

const fs = require('fs');
const path = require('path');

// Archivo de solicitudes
const SOLICITUDES_FILE = './solicitudes-jaime.json';

// Configuración
const EROIKA_ID = '120363424931585227@g.us';
const DONNA_SIGNATURE = 'Donna 🌹';

// Identificadores que deben ser IGNORADOS (mensajes propios)
const IGNORE_SENDERS = [
  'Donna 🌹',           // Mis propios mensajes
  'Ecosistemanet',      // Posible nombre alternativo
  'Donna',              // Nombre simple
  'Jaimemprendedor',    // Tú (por si acaso)
  'Jaime González'      // Tu nombre completo
];

// Cargar solicitudes
function cargarSolicitudes() {
  try {
    if (fs.existsSync(SOLICITUDES_FILE)) {
      return JSON.parse(fs.readFileSync(SOLICITUDES_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error cargando solicitudes:', err.message);
  }
  
  return {
    solicitudes: [],
    ultimaActualizacion: new Date().toISOString(),
    total: 0,
    pendientes: 0
  };
}

// Guardar solicitudes
function guardarSolicitudes(data) {
  try {
    fs.writeFileSync(SOLICITUDES_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error guardando solicitudes:', err.message);
  }
}

// Agregar nueva solicitud
function agregarSolicitud(persona, pregunta, contexto = '') {
  const solicitudes = cargarSolicitudes();
  
  const nuevaSolicitud = {
    id: `solicitud_${Date.now()}`,
    fecha: new Date().toISOString(),
    fechaChile: new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' }),
    persona: persona,
    pregunta: pregunta,
    contexto: contexto,
    estado: 'pendiente',
    grupo: EROIKA_ID
  };
  
  solicitudes.solicitudes.push(nuevaSolicitud);
  solicitudes.total = solicitudes.solicitudes.length;
  solicitudes.pendientes = solicitudes.solicitudes.filter(s => s.estado === 'pendiente').length;
  solicitudes.ultimaActualizacion = new Date().toISOString();
  
  guardarSolicitudes(solicitudes);
  
  console.log(`📝 Nueva solicitud guardada: ${persona} → "${pregunta.substring(0, 50)}..."`);
  
  return nuevaSolicitud;
}

// Obtener solicitudes pendientes
function obtenerSolicitudesPendientes() {
  const solicitudes = cargarSolicitudes();
  return solicitudes.solicitudes.filter(s => s.estado === 'pendiente');
}

// Marcar solicitud como respondida
function marcarComoRespondida(idSolicitud) {
  const solicitudes = cargarSolicitudes();
  const solicitud = solicitudes.solicitudes.find(s => s.id === idSolicitud);
  
  if (solicitud) {
    solicitud.estado = 'respondida';
    solicitud.fechaRespuesta = new Date().toISOString();
    solicitudes.pendientes = solicitudes.solicitudes.filter(s => s.estado === 'pendiente').length;
    solicitudes.ultimaActualizacion = new Date().toISOString();
    
    guardarSolicitudes(solicitudes);
    console.log(`✅ Solicitud marcada como respondida: ${idSolicitud}`);
    return true;
  }
  
  return false;
}

// Verificar si es mensaje propio que debe ser IGNORADO
function esMensajePropio(from) {
  return IGNORE_SENDERS.some(ignored => 
    from.toLowerCase().includes(ignored.toLowerCase())
  );
}

// Analizar mensaje de Eroika - IGNORA MENSAJES PROPIOS
function analizarMensajeEroika(mensaje) {
  const { from, body } = mensaje;
  const texto = body.toLowerCase().trim();
  
  // 1. PRIMERO: Verificar si es mensaje propio (IGNORAR)
  if (esMensajePropio(from)) {
    console.log(`⏭️  Ignorando mensaje propio: ${from} → "${texto.substring(0, 30)}..."`);
    return {
      esSaludo: false,
      esPreguntaJaime: false,
      esPreguntaNumero: false,
      esPreguntaGeneral: false,
      mencionaDonna: false,
      esMensajePropio: true,
      necesitaRespuesta: false
    };
  }
  
  // 2. Detectar menciones a Donna
  const mencionesDonna = ['donna', 'donita', 'asistente', 'bot'];
  const mencionaDonna = mencionesDonna.some(palabra => texto.includes(palabra));
  
  // 3. Detectar saludos (incluye menciones a Donna)
  const saludos = ['hola', 'holi', 'hello', 'hi', 'buenas', 'buenos días', 'buenas tardes', 'buenas noches', 'gracias', 'bienvenida', 'bienvenido'];
  const esSaludo = saludos.some(saludo => texto.includes(saludo)) || 
                   (mencionaDonna && (texto.includes('gracias') || texto.includes('bienvenida') || texto.includes('bienvenido')));
  
  // 4. Detectar preguntas por Jaime
  const palabrasJaime = ['jaime', 'jaimemprendedor', 'gonzález', 'vergara'];
  const esPreguntaJaime = palabrasJaime.some(palabra => texto.includes(palabra));
  
  // 5. Detectar preguntas por número
  const palabrasNumero = ['número', 'numero', 'telefono', 'teléfono', 'celular', 'whatsapp', 'contacto', 'contactar'];
  const esPreguntaNumero = palabrasNumero.some(palabra => texto.includes(palabra));
  
  // 6. Detectar preguntas generales
  const palabrasPregunta = ['qué', 'que', 'cómo', 'como', 'cuándo', 'cuando', 'dónde', 'donde', 'por qué', 'porque', '?', '¿'];
  const esPreguntaGeneral = palabrasPregunta.some(palabra => texto.includes(palabra));
  
  return {
    esSaludo,
    esPreguntaJaime,
    esPreguntaNumero,
    esPreguntaGeneral,
    mencionaDonna,
    esMensajePropio: false,
    necesitaRespuesta: esSaludo || esPreguntaJaime || esPreguntaNumero || esPreguntaGeneral
  };
}

// Generar respuesta para Eroika - SOLO si no es mensaje propio
function generarRespuestaEroika(mensaje, analisis) {
  const { from, body } = mensaje;
  const { esSaludo, esPreguntaJaime, esPreguntaNumero, esPreguntaGeneral, mencionaDonna, esMensajePropio } = analisis;
  const texto = body.toLowerCase().trim();
  
  // 1. Si es mensaje propio, NO responder
  if (esMensajePropio) {
    console.log(`🚫 No respondiendo a mensaje propio: ${from}`);
    return null;
  }
  
  // 2. Si es saludo o mención a Donna
  if (esSaludo || mencionaDonna) {
    const nombre = from.split(' ')[0] || from;
    
    // Distinguir tipo de interacción
    if (texto.includes('gracias')) {
      return `¡Gracias a ti, ${nombre}! 😊 Me alegra poder ayudar.\n\n${DONNA_SIGNATURE}`;
    } else if (texto.includes('bienvenida') || texto.includes('bienvenido')) {
      return `¡Muchas gracias, ${nombre}! 😊 Me siento muy bien recibida en el equipo.\n\n${DONNA_SIGNATURE}`;
    } else if (texto.includes('hello') || texto.includes('hi')) {
      return `Hello ${nombre}! 👋 How can I help you?\n\n${DONNA_SIGNATURE}`;
    } else {
      return `¡Hola ${nombre}! 👋 ¿En qué puedo ayudarte?\n\n${DONNA_SIGNATURE}`;
    }
  }
  
  // 3. Si pregunta por Jaime o su número
  if (esPreguntaJaime || esPreguntaNumero) {
    // Guardar solicitud
    agregarSolicitud(from, body, 'pregunta por Jaime/número');
    
    return `Jaime te responderá cuando se pueda conectar. Mientras tanto, guardo tu solicitud para que él la vea.\n\n${DONNA_SIGNATURE}`;
  }
  
  // 4. Si es pregunta general
  if (esPreguntaGeneral) {
    // Guardar solicitud
    agregarSolicitud(from, body, 'pregunta general');
    
    return `Jaime te responderá cuando se pueda conectar. Mientras tanto, guardo tu pregunta para que él la vea.\n\n${DONNA_SIGNATURE}`;
  }
  
  // 5. Por defecto (no responde)
  return null;
}

// Obtener resumen de solicitudes para Telegram
function obtenerResumenSolicitudes() {
  const solicitudes = cargarSolicitudes();
  const pendientes = obtenerSolicitudesPendientes();
  
  if (pendientes.length === 0) {
    return `📋 *Solicitudes para Jaime*\n\n✅ No hay solicitudes pendientes.\n\nTotal registradas: ${solicitudes.total}\nÚltima actualización: ${new Date(solicitudes.ultimaActualizacion).toLocaleString('es-CL', { timeZone: 'America/Santiago' })}`;
  }
  
  let resumen = `📋 *Solicitudes para Jaime - PENDIENTES*\n\n`;
  
  pendientes.forEach((solicitud, index) => {
    resumen += `*${index + 1}. ${solicitud.persona}* (${new Date(solicitud.fecha).toLocaleDateString('es-CL', { timeZone: 'America/Santiago' })})\n`;
    resumen += `   "${solicitud.pregunta.substring(0, 80)}${solicitud.pregunta.length > 80 ? '...' : ''}"\n`;
    if (solicitud.contexto) {
      resumen += `   _Contexto: ${solicitud.contexto}_\n`;
    }
    resumen += `   ID: ${solicitud.id}\n\n`;
  });
  
  resumen += `📊 *Resumen:*\n`;
  resumen += `• Pendientes: ${pendientes.length}\n`;
  resumen += `• Total: ${solicitudes.total}\n`;
  resumen += `• Última: ${new Date(solicitudes.ultimaActualizacion).toLocaleString('es-CL', { timeZone: 'America/Santiago' })}`;
  
  return resumen;
}

module.exports = {
  EROIKA_ID,
  analizarMensajeEroika,
  generarRespuestaEroika,
  agregarSolicitud,
  obtenerSolicitudesPendientes,
  obtenerResumenSolicitudes,
  marcarComoRespondida,
  cargarSolicitudes,
  esMensajePropio
};