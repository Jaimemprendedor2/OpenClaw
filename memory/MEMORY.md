# MEMORY.md - Memoria a Largo Plazo

_Archivo para memorias curadas a largo plazo. Cargar solo en sesión principal (chats directos con Jaime)._

---

## 🧠 **Cómo usar este archivo**

1. **Solo cargar en sesión principal** — nunca en grupos o chats compartidos
2. **Actualizar periódicamente** — revisar `memory/YYYY-MM-DD.md` y extraer lo importante
3. **Estructurar por temas** — decisiones, lecciones, preferencias, contexto
4. **Mantener conciso** — calidad sobre cantidad

---

## 📅 **Historial**

_2026-04-05: Archivo creado. Ver `memory/2026-04-05.md` para detalles completos del setup inicial._

_2026-04-06: Configuración de modelos actualizada por Jaime. Modelo primario: Claude Sonnet 4.6, fallbacks: DeepSeek Chat y DeepSeek Reasoner. Repositorio Git sincronizado con configuración personalizada._

---

## 👤 **Sobre Jaime González Vergara (@jaimemprendedor)**

**Emprendedor e innovador.** 15+ años articulando ecosistemas de emprendimiento en Valparaíso, Chile y Latinoamérica. Técnico en Electrónica (UTFSM) + Coach Ontológico (Newfield/Rafael Echeverría). Construye en equipo, con visión territorial y foco en impacto real.

**Proyectos actuales:**
- **Ecosistemanet** (cofundador, dic 2025): Suite modular de gestión de ecosistemas (Atlas, Pulse, Nexus, Focus, Vantage, Metron, Skopia, Agora). Su apuesta más tech y escalable. Propuesta: reducir incertidumbre en ecosistemas complejos.
- **Housenovo** (CEO, 2013): Incubadora de líderes empresariales. Metodología NovoTraining (mindset, escucha ontológica, feedback). 6.000+ emprendedores formados en Chile, Panamá, México, Colombia.
- **EIVA** (Director de Ecosistema, abr–dic 2025, finalizado): 1º lugar GEIAL + beca BID. Rol cerrado dic 2025.
- **ValpoEmprende 2026** (participación activa en equipo): impulsado por EIVA + Socialab.

**Trayectoria clave:** ASECH consejero regional 13 años · ChileCowork vicepresidente · GU2i · TRIE · SenseTech · HuertApp · PRODEM/GEIAL (internacional)

**Formación clave:** Coach Ontológico Newfield · BID-PRODEM · Diplomado Gestión UAI · Luditools facilitador

**Reconocimientos:** Joven Líder 2016 (Fundación Piensa) · Premio Don Bosco

**Portafolio personal:** Jaime (marca paraguas) → Housenovo (liderazgo/transformación) + Ecosistemanet (plataforma/infraestructura digital)

---

## ⚙️ **Configuraciones Importantes**

**OpenClaw:**
- Gateway: local loopback (127.0.0.1)
- Canal principal: Telegram
- Agente: Donna 🌹
- Modelo primario: anthropic/claude-sonnet-4-6
- Modelos fallback: deepseek/deepseek-chat, deepseek/deepseek-reasoner

**Seguridad:**
- Repo GitHub: `Jaimemprendedor2/OpenClaw`
- Token de acceso configurado
- Auditoría: 0 críticos, 5 advertencias
- API keys: DeepSeek configurada en `.env`, Claude pendiente (usando auth existente?)

**Skills instaladas:**
- `jx76-gog` — Google Workspace (pendiente OAuth)

---

## 🎯 **Preferencias de Jaime**

1. **Siempre español** — excepto código/instrucciones técnicas
2. **Directo al grano** — sin relleno, práctico
3. **Orientado a resultados** — tiempo = recurso escaso
4. **Delega decisiones** cuando dice "decide tú y ejecuta"
5. **Emprendedor** — contexto importante para priorización

---

## 📋 **Lecciones Aprendidas**

_(Actualizar con experiencias significativas)_

---

## 🔄 **Workflows Establecidos**

_(Actualizar con automatizaciones implementadas)_

---

*Actualizado: 2026-04-06*  
*Por: Donna 🌹*
## 📱 **WhatsApp Configurado (2026-04-06)**

### **Número personal de Jaime:**
- **WhatsApp:** +56947555490
- **Formato API:** 56947555490@c.us
- **Contacto principal** para mensajes directos

### **Sistema implementado:**
- **Tecnología:** whatsapp-web.js con LocalAuth (sesión persistente)
- **Servidor:** Express en puerto 8080 (`server-enhanced.js`)
- **Bot de reglas:** `whatsapp-rules-final.js` (monitoreo cada 30s)
- **Tunnel público:** https://openclaw-wa.loca.lt (solo para QR inicial)

### **Reglas configuradas:**
1. **Modo escucha:** Silencio por defecto
2. **Whitelist activa:** 
   - Eroika (grupo de trabajo)
   - Equipo | Ecosistemanet
3. **Notificaciones:** Formato simple (30 caracteres)
4. **Resúmenes:** Desactivados para Eroika, cada 10+ mensajes para otros
5. **Almacenamiento:** Silencioso para todos los chats
6. **Seguridad:** Respuesta genérica para información sensible

### **Formatos WhatsApp validados:**
- `*texto*` → **Negrita**
- `_texto_` → _Cursiva_
- `~texto~` → ~~Tachado~~
- ``` `texto` ``` → `Código`

### **Configuración especial:**
- **Hora:** Santiago, Chile (America/Santiago)
- **Firma Donna:** "Donna 🌹"
- **Estilo:** Humano, conversacional, natural
- **Anti-loops:** Activado (parámetro `since` en API)
- **Anti-duplicados:** Cache de 10 minutos por mensaje

### **Comandos disponibles (Telegram):**
- `quien me escribio` — Chats con mensajes almacenados
- `que se habla en [chat]?` — Consulta conversación específica
- `config` — Estado del sistema
- `ayuda` — Lista de comandos

### **Estado:** ✅ Sistema completamente configurado, validado y listo para producción
