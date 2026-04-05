# Lista Completa de Skills - OpenClaw v2026.4.2

**Fecha:** 2026-04-05  
**OpenClaw versión:** 2026.4.2  
**Sistema:** Ubuntu 24.04 (Linux arm64)  
**Total skills:** 53 (bundled) + 5,700+ en ClawHub

---

## 📊 Resumen por Categoría

### 🟢 **Listas para usar (6)**
- Requisitos cumplidos, listas para activar

### 🟡 **Necesitan setup (47)**
- Requieren CLI/binarios externos o configuración

### 🔴 **Incompatibles con Linux (15+)**
- Diseñadas para macOS, no funcionan en Ubuntu

---

## 🟢 SKILLS LISTAS PARA USAR

### 1. **clawflow** 🪝
**Qué hace:** Runtime para tareas detachadas y flujos multi-step. Substrate bajo Lobster, acpx, o código plano.
**Requisitos:** Ninguno — incluida en OpenClaw.
**Esencial para:** Automatización compleja, workflows multi-paso.

### 2. **clawflow-inbox-triage** 📥
**Qué hace:** Patrón de triaje de bandeja de entrada. Clasifica mensajes por intención.
**Requisitos:** Ninguno.
**Esencial para:** Gestión de emails/mensajes automatizada.

### 3. **healthcheck** 📦
**Qué hace:** Auditoría de seguridad y hardening para deployments de OpenClaw.
**Requisitos:** Ninguno.
**Esencial para:** Seguridad proactiva, monitoreo de riesgos.

### 4. **node-connect** 📦
**Qué hace:** Diagnóstico de conexión de nodos (Android, iOS, macOS).
**Requisitos:** Ninguno.
**Esencial para:** Solucionar problemas de pairing con apps móviles.

### 5. **skill-creator** 📦
**Qué hace:** Crear, editar, mejorar o auditar AgentSkills.
**Requisitos:** Ninguno.
**Esencial para:** Desarrolladores que quieren crear sus propias skills.

### 6. **weather** ☔
**Qué hace:** Clima y pronósticos via wttr.in o Open-Meteo.
**Requisitos:** Ninguno — acceso a internet.
**Esencial para:** Información meteorológica rápida.

---

## 🟡 SKILLS QUE NECESITAN SETUP

### 🔐 **Seguridad & Acceso**
**7. 1password** 🔐
**Qué hace:** CLI de 1Password (`op`) para leer/inyectar secrets.
**Requisitos:** `op` CLI instalado, cuenta 1Password.
**Esencial para:** Gestión segura de credenciales.

**8. himalaya** 📧
**Qué hace:** CLI para email via IMAP/SMTP.
**Requisitos:** `himalaya` CLI, credenciales IMAP/SMTP.
**Esencial para:** Email desde terminal, automatización.

### 📝 **Notas & Documentación**
**9. notion** 📝
**Qué hace:** API de Notion para páginas, bases de datos, bloques.
**Requisitos:** API key de Notion Integration.
**Esencial para:** Usuarios de Notion, automatización de notas.

**10. obsidian** 💎
**Qué hace:** Trabajar con vaults de Obsidian (Markdown).
**Requisitos:** `obsidian-cli`, vault de Obsidian.
**Esencial para:** Usuarios de Obsidian.

**11. bear-notes** 🐻 (macOS only)
**Qué hace:** Notas Bear via `grizzly` CLI.
**Requisitos:** macOS, Bear app, `grizzly` CLI.
**Incompatible con Linux.**

**12. apple-notes** 📝 (macOS only)
**Qué hace:** Notas de Apple via `memo` CLI.
**Requisitos:** macOS, `memo` CLI.
**Incompatible con Linux.**

### 🗓️ **Calendario & Tareas**
**13. gog** 🎮 **(RECOMENDADA)**
**Qué hace:** Google Workspace CLI (Gmail, Calendar, Drive, Contacts, Sheets, Docs).
**Requisitos:** `gog` CLI, OAuth credentials (`client_secret.json`).
**Esencial para:** Cualquier founder — unifica 5+ herramientas Google.

**14. apple-reminders** ⏰ (macOS only)
**Qué hace:** Recordatorios de Apple via `remindctl`.
**Requisitos:** macOS, `remindctl` CLI.
**Incompatible con Linux.**

**15. things-mac** ✅ (macOS only)
**Qué hace:** Things 3 via `things` CLI.
**Requisitos:** macOS, Things 3 app.
**Incompatible con Linux.**

**16. trello** 📋
**Qué hace:** Tableros Trello via REST API.
**Requisitos:** API key de Trello.
**Esencial para:** Gestión de proyectos con Trello.

### 💻 **Desarrollo & Código**
**17. github** 🐙
**Qué hace:** Operaciones GitHub via `gh` CLI (issues, PRs, CI).
**Requisitos:** `gh` CLI configurado, auth GitHub.
**Esencial para:** Developers, founders técnicos.

**18. gh-issues** 📦
**Qué hace:** Fetch GitHub issues, spawn sub-agents para fixes, open PRs.
**Requisitos:** `gh` CLI, acceso a repos.
**Esencial para:** Automatización de desarrollo.

**19. coding-agent** 🧩
**Qué hace:** Delegar coding tasks a Codex, Claude Code, o Pi agents.
**Requisitos:** ACP harness configurado.
**Esencial para:** Desarrollo asistido por IA.

**20. oracle** 🧿
**Qué hace:** CLI oracle (prompt + file bundling, engines, sessions).
**Requisitos:** `oracle` CLI.
**Esencial para:** Prompt engineering avanzado.

### 🌐 **Web & Búsqueda**
**21. browser-automation** (built-in)
**Qué hace:** Automatización web con Playwright (Snapshot system).
**Requisitos:** Ninguno — incluido en OpenClaw core.
**Esencial para:** Investigación web, scraping, monitoreo.

**22. web_search** (built-in)
**Qué hace:** Búsqueda web con DuckDuckGo.
**Requisitos:** Ninguno — herramienta nativa.
**Esencial para:** Búsqueda de información.

**23. web_fetch** (built-in)
**Qué hace:** Fetch y extracción de contenido web.
**Requisitos:** Ninguno — herramienta nativa.
**Esencial para:** Leer artículos, extraer info.

**24. firecrawl-search** 🌊 (ClawHub)
**Qué hace:** Extracción avanzada de datos web con Firecrawl API.
**Requisitos:** API key de Firecrawl (free tier disponible).
**Esencial para:** Investigación de mercado, lead gen.

**25. goplaces** 📍
**Qué hace:** Google Places API (New) para búsqueda de lugares.
**Requisitos:** `goplaces` CLI, Google Cloud API key.
**Esencial para:** Búsqueda de negocios, lugares.

### 📊 **Analytics & Marketing**
**26. ga4-analytics** 📊 (ClawHub)
**Qué hace:** Google Analytics 4 reporting.
**Requisitos:** Google Cloud service account.
**Esencial para:** Founders que usan GA4.

**27. seo-content-engine** (parte de marketing-mode)
**Qué hace:** Investigación SEO + escritura de contenido optimizado.
**Requisitos:** LLM con web search, `marketing-mode` skill.
**Esencial para:** Content marketing automatizado.

**28. marketing-mode** ✨
**Qué hace:** 23 skills de marketing en un paquete.
**Requisitos:** Instalación desde ClawHub.
**Esencial para:** Marketing comprehensivo.

**29. xurl** 🐦
**Qué hace:** CLI para X (Twitter) API v2.
**Requisitos:** X API access (pay-per-use).
**Esencial para:** Social media management.

### 🎵 **Media & Entretenimiento**
**30. spotify-player** 🎵
**Qué hace:** Playback de Spotify via `spogo` o `spotify_player`.
**Requisitos:** CLI de Spotify, cuenta premium.
**Esencial para:** Control de música.

**31. sonoscli** 🔊
**Qué hace:** Control de speakers Sonos.
**Requisitos:** `sonoscli`, red local con Sonos.
**Esencial para:** Automatización de audio en casa.

**32. blucli** 🫐
**Qué hace:** BluOS CLI para discovery, playback, grouping.
**Requisitos:** `blu` CLI, dispositivos BluOS.
**Esencial para:** Sistemas de audio BluOS.

**33. video-frames** 🎬
**Qué hace:** Extraer frames/clips de videos con ffmpeg.
**Requisitos:** `ffmpeg` instalado.
**Esencial para:** Procesamiento de video.

**34. gifgrep** 🧲
**Qué hace:** Buscar GIFs, descargar, extraer stills.
**Requisitos:** `gifgrep` CLI.
**Esencial para:** Creación de contenido visual.

**35. songsee** 🌊
**Qué hace:** Generar espectrogramas y visualizaciones de audio.
**Requisitos:** `songsee` CLI.
**Esencial para:** Análisis de audio.

### 🏠 **Smart Home & IoT**
**36. openhue** 💡
**Qué hace:** Control Philips Hue lights y escenas.
**Requisitos:** `openhue` CLI, bridge Hue.
**Esencial para:** Automatización de iluminación.

**37. eightctl** 🛌
**Qué hace:** Control Eight Sleep pods (temperatura, alarms).
**Requisitos:** `eightctl` CLI, cuenta Eight Sleep.
**Esencial para:** Optimización de sueño.

**38. camsnap** 📸
**Qué hace:** Capturar frames de cámaras RTSP/ONVIF.
**Requisitos:** `camsnap` CLI, cámaras accesibles.
**Esencial para:** Seguridad/vigilancia.

### 🗣️ **Voz & Audio**
**39. sag** 🔊
**Qué hace:** Text-to-speech ElevenLabs con UX tipo macOS `say`.
**Requisitos:** `sag` CLI, API key ElevenLabs.
**Esencial para:** Narración, storytelling.

**40. sherpa-onnx-tts** 🔉
**Qué hace:** TTS local offline con sherpa-onnx.
**Requisitos:** `sherpa-onnx-tts` CLI.
**Esencial para:** TTS sin cloud.

**41. openai-whisper** 🎤
**Qué hace:** Speech-to-text local con Whisper CLI.
**Requisitos:** `whisper` CLI, modelo Whisper.
**Esencial para:** Transcripción offline.

**42. openai-whisper-api** 🌐
**Qué hace:** Transcripción via OpenAI Audio API (Whisper).
**Requisitos:** API key de OpenAI.
**Esencial para:** Transcripción de alta calidad.

**43. voice-call** 📞
**Qué hace:** Llamadas de voz via plugin OpenClaw.
**Requisitos:** Plugin voice-call instalado.
**Esencial para:** Comunicación por voz.

### 📄 **Documentos & PDFs**
**44. nano-pdf** 📄
**Qué hace:** Editar PDFs con instrucciones en lenguaje natural.
**Requisitos:** `nano-pdf` CLI.
**Esencial para:** Manipulación de PDFs.

**45. summarize** 🧾
**Qué hace:** Resumir URLs, podcasts, archivos locales.
**Requisitos:** `summarize` CLI.
**Esencial para:** Procesamiento de contenido largo.

### 📱 **Mensajería & Comunicación**
**46. discord** 🎮
**Qué hace:** Ops de Discord via message tool.
**Requisitos:** Bot de Discord configurado.
**Esencial para:** Comunidades en Discord.

**47. slack** 💬
**Qué hace:** Control de Slack desde OpenClaw.
**Requisitos:** Slack app configurada.
**Esencial para:** Equipos que usan Slack.

**48. telegram** (built-in channel)
**Qué hace:** Canal Telegram nativo.
**Requisitos:** Bot de Telegram configurado.
**Esencial para:** Comunicación por Telegram.

**49. whatsapp** (built-in channel)
**Qué hace:** Canal WhatsApp nativo.
**Requisitos:** WhatsApp Business API o wacli.
**Esencial para:** Comunicación por WhatsApp.

**50. wacli** 📱
**Qué hace:** Enviar mensajes WhatsApp, buscar/sincronizar history.
**Requisitos:** `wacli` CLI.
**Esencial para:** Automatización de WhatsApp.

**51. imsg** 📨 (macOS only)
**Qué hace:** iMessage/SMS CLI para listar chats y enviar mensajes.
**Requisitos:** macOS, Messages.app.
**Incompatible con Linux.**

**52. bluebubbles** 🫧 (macOS only)
**Qué hace:** iMessage integration recomendada.
**Requisitos:** macOS, BlueBubbles server.
**Incompatible con Linux.**

### 🛠️ **Utilidades & Sistema**
**53. tmux** 🧵
**Qué hace:** Remote-control tmux sessions para CLIs interactivos.
**Requisitos:** `tmux` instalado, sesiones activas.
**Esencial para:** Automatización de terminales.

**54. peekaboo** 👀 (macOS only)
**Qué hace:** Capturar y automatizar macOS UI.
**Requisitos:** macOS, `peekaboo` CLI.
**Incompatible con Linux.**

**55. ordercli** 🛵
**Qué hace:** CLI para Foodora (pedidos pasados y status).
**Requisitos:** `ordercli`, cuenta Foodora.
**Esencial para:** Automatización de pedidos de comida.

**56. session-logs** 📜
**Qué hace:** Buscar y analizar session logs propios.
**Requisitos:** `jq` instalado.
**Esencial para:** Debugging, análisis de uso.

**57. model-usage** 📊
**Qué hace:** Resumen de costos por modelo con CodexBar.
**Requisitos:** `codexbar` CLI, datos de uso.
**Esencial para:** Control de costos de modelos.

**58. mcporter** 📦
**Qué hace:** CLI para MCP servers/tools (HTTP o stdio).
**Requisitos:** `mcporter` CLI.
**Esencial para:** Integración con Model Context Protocol.

**59. clawhub** 📦
**Qué hace:** CLI para buscar, instalar, actualizar skills desde ClawHub.
**Requisitos:** `clawhub` CLI.
**Esencial para:** Gestión de skills.

---

## 🏆 **TOP 10 SKILLS ESENCIALES PARA UN AGENTE PRODUCTIVO**

### **🥇 Nivel 1: Fundamentales**
1. **gog** 🎮 — Google Workspace completo (email, calendario, docs, sheets)
2. **github** 🐙 — Desarrollo y colaboración
3. **browser-automation** 🌐 — Investigación web automática
4. **web_search/web_fetch** 🔍 — Búsqueda y extracción de información

### **🥈 Nivel 2: Productividad**
5. **notion** 📝 — Gestión de conocimiento
6. **summarize** 🧾 — Procesamiento de contenido
7. **weather** ☔ — Información contextual
8. **1password** 🔐 — Gestión segura de credenciales

### **🥉 Nivel 3: Especializadas**
9. **firecrawl-search** 🌊 — Investigación avanzada
10. **seo-content-engine** 📈 — Marketing automatizado

---

## ⚠️ **CONSIDERACIONES PARA UBUNTU 24.04**

### **Skills incompatibles (macOS only):**
- apple-notes, apple-reminders, bear-notes
- things-mac, imsg, bluebubbles
- peekaboo

### **Dependencias comunes necesarias:**
- `build-essential`, `golang-go` — para compilar CLIs
- `ffmpeg` — para procesamiento de video
- `jq` — para procesamiento JSON
- `tmux` — para terminal multiplexing

### **Requisitos de sistema:**
- Acceso a internet para APIs cloud
- Permisos de red para dispositivos locales
- Storage para caché y datos temporales

---

## 🚀 **PLAN DE IMPLEMENTACIÓN RECOMENDADO**

### **Semana 1: Core**
1. Configurar `gog` con Google OAuth
2. Instalar `github` CLI y configurar auth
3. Probar `browser-automation` con una tarea simple

### **Semana 2: Productividad**
4. Conectar `notion` si lo usas
5. Configurar `1password` CLI para secrets
6. Probar `summarize` con URLs de interés

### **Semana 3: Avanzado**
7. Evaluar `firecrawl-search` para investigación
8. Considerar `marketing-mode` para content
9. Automatizar reportes con `ga4-analytics` si usas GA4

---

## 📈 **ESTADÍSTICAS FINALES**

- **Total skills bundled:** 53
- **Listas para usar:** 6