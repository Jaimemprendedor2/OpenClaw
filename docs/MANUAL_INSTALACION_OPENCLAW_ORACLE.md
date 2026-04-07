# MANUAL: Instalar OpenClaw con Chromium en Oracle Cloud (AMD)

**Fecha:** 2026-04-06  
**Versión probada:** OpenClaw 2026.4.5  
**Shape:** VM.Standard.E3.Flex (AMD)  
**SO:** Ubuntu 24.04  
**Región:** Chile West (Valparaíso)

---

## ÍNDICE

1. [Crear la instancia en Oracle Cloud](#1-crear-la-instancia-en-oracle-cloud)
2. [IP pública estática (Reservada)](#2-ip-pública-estática-reservada)
3. [SSH desde Windows (PuTTY)](#3-ssh-desde-windows-putty)
4. [Instalación base (Node.js + OpenClaw + Chromium)](#4-instalación-base-nodejs--openclaw--chromium)
5. [Configurar OpenClaw con wizard onboard](#5-configurar-openclaw-con-wizard-onboard)
6. [Configurar API keys y modelo multi-fallback](#6-configurar-api-keys-y-modelo-multi-fallback)
7. [Conectar bot de Telegram](#7-conectar-bot-de-telegram)
8. [Problemas comunes y soluciones](#8-problemas-comunes-y-soluciones)
9. [Checklist final](#9-checklist-final)
10. [Decisiones técnicas](#10-decisiones-técnicas)

---

## 1. CREAR LA INSTANCIA EN ORACLE CLOUD

### Imagen
- **Canonical Ubuntu 24.04 minimal** (build más reciente)

### Shape ⚠️ DECISIÓN CRÍTICA
- **VM.Standard.E3.Flex** (AMD CPU, NO ARM/Ampere)
- **3 OCPUs, 48 GB RAM recomendado** (para browser automation)
- 1 OCPU funciona pero anda justo
- 2 OCPU mínimo si presupuesto ajustado

**Razón:** Necesitas AMD/x86_64 para Chromium headless. La arquitectura ARM (Ampere) tiene problemas de compatibilidad con algunos binarios de browser. Chromium en AMD funciona sin dramas.

### Red
- Reusar VCN existente o crear una nueva
- Subred PÚBLICA (obligatorio para IP pública y SSH)
- Security List: Puertos 22 (SSH), 80 (HTTP), 443 (HTTPS) abiertos
- Asignar IPv4 pública: SÍ (Ephemeral al crear)

### Volumen de inicio
- Default (~50GB está bien)

---

## 2. IP PÚBLICA ESTÁTICA (RESERVADA)

### POR QUÉ
- Sin reservar la IP, se DESTRUYE si apagas o reinicias la instancia
- Cada vez que apagas, queda una IP distinta
- Con la IP reservada, esta es permanente

### PASOS

#### 2a. Crear la IP reservada

1. Menú lateral: Red > Administración de IP > IP públicas reservadas
2. Click en "Reservar dirección IP pública"
3. Nombre: `openclaw-fija` (o lo que quieras)
4. Compartmento: tu raíz
5. Click "Reservar"

#### 2b. Asignar la IP a la instancia

1. Ve a la instancia > click en la VNIC principal (nombre tipo `openclaw-amd-vnic`)
2. En "IP Administration" > IPv4 Addresses, haz click en la Dirección IP privada (ej: `10.0.0.200`)
3. Click en "Editar" (botón o lápiz junto a la IP privada)
4. En "Tipo de dirección IP pública": cambiar de **Efímera** a **Reservada**
5. Selecciona tu IP reservada de la lista
6. Click en "Guardar cambios"

**Resultado:** Tu instancia ahora tiene una IP pública permanente que no cambia aunque la apagues.

### ANOTAR LA IP
Guárdala en algún lado para conectarte por SSH después.

---

## 3. SSH DESDE WINDOWS (PUTTY)

### Si falla la conexión "Server refused our key"

Significa que la clave privada que usa PuTTY no coincide con la pública que subiste a la instancia.

#### Solución A - Convertir la key a .ppk

1. Abre PuTTYgen
2. Click "Load" > cambia a "All Files (*.*)"
3. Selecciona tu key privada (`.pem` o sin extensión)
4. Click "Save private key" > guarda como `.ppk`
5. En PuTTY: Connection > SSH > Auth > Credentials > selecciona el `.ppk`

#### Solución B - Generar nueva key en PuTTYgen

1. Abre PuTTYgen
2. Click "Generate" (mueve el mouse para generar entropía)
3. Copia la public key (área superior)
4. En Oracle Cloud Console > instancia > SSH keys > agrega la nueva key
5. Guarda la private key como `.ppk`
6. Configura PuTTY para usar esa key

### Configuración de PuTTY

| Campo | Valor |
|-------|-------|
| Host | Tu IP reservada |
| Port | 22 |
| Connection type | SSH |
| Auto-login username | `ubuntu` |
| SSH Auth > Private key | tu archivo `.ppk` |

---

## 4. INSTALACIÓN BASE

Una vez dentro del servidor por SSH, ejecuta en orden:

### Paso 1: System update
```bash
sudo apt update && sudo apt upgrade -y
```

### Paso 2: Node.js via NVM
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.nvm/nvm.sh
nvm install --lts
nvm alias default node
```

**Verificar:**
```bash
node --version
npm --version
```

### Paso 3: OpenClaw
```bash
npm install -g openclaw
```

**Verificar:**
```bash
openclaw --version
```

### Paso 4: Playwright + Chromium
```bash
npx playwright install --with-deps chromium
```

**DECISIÓN:** Usar Playwright en vez de instalar Chromium manualmente.

**Razón:** Playwright instala su propio binario de Chromium optimizado para headless, con todas las librerías del sistema correctas. Es más confiable que instalar `chromium-browser` via apt.

### Paso 5: Firewall básico
```bash
sudo apt install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 18789/tcp
echo "y" | sudo ufw enable
```

### Paso 6: Fail2Ban (protección contra ataques SSH)
```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## 5. CONFIGURAR OPENCLAW CON WIZARD ONBOARD

### ⚠️ NO EDITAR `openclaw.json` A MANO

En las versiones recientes de OpenClaw, la estructura cambió significativamente:
- `gateway.bind` usa modos como `"loopback"/"lan"/"auto"` en vez de IPs directas
- `gateway.auth` es un objeto, no un string
- `gateway.mode` es obligatorio (poner `"local"` para standalone)
- Editar manualmente SIEMPRE genera errores de validación

### Solución correcta: usar el wizard
```bash
openclaw onboard --mode local
```

Si no reconoce `--mode local`, solo:
```bash
openclaw onboard
```

### Pasos del wizard

#### Paso 1: Aceptar aviso de seguridad
- Escribe `yes` y Enter

#### Paso 2: Token del bot de Telegram
- Ve a Telegram > @BotFather > /mybots > tu bot > API Token
- Copia el token completo (formato: `NUMEROS:LETRAS_...`)
- Pégalo en el prompt del wizard

#### Paso 3: DM Access Policy
- Para setup personal: selecciona "Open" (DMs abiertos)
- Para producción con usuarios específicos: selecciona "Allow list"

#### Paso 4: Workspace
- El wizard sugiere un path. Acepta el default o pon el tuyo.

#### Paso 5: Búsquedas web
- Recomendación: Selecciona "Skip for now"
- Puedes configurar un proveedor de búsquedas después

#### Paso 6: Skills adicionales
- Recomendación: Skip/None para empezar
- Skills útiles: `session-logs`, `github`, `video-frames`
- Todo lo demás es software específico que no aplica en un server sin GUI
- Puedes instalar skills después en cualquier momento

#### Paso 7: Google Places API Key
- No si no lo necesitas

#### Paso 8: Hooks
- "Skip for now" - ya está seleccionado. Se configuran después si las necesitas.

#### Paso 9: Node manager para skills
- `npm` - ya instalado con Node.js

#### Paso 10: Gateway service
- "Restart" si ya está instalado, sino "Install"

#### Paso 11: Homebrew
- No - Homebrew es para Mac, no para Linux

#### Paso 12: Hatch the bot
- "Hatch in TUI (recommended)" - arranca el bot en la terminal

---

## 6. API KEYS Y MULTI-MODELO

### Configurar Claude como modelo principal

El wizard selecciona un modelo por defecto (típicamente Claude Haiku o Sonnet). Si quieres asegurar Sonnet-4-6 como principal, usa este comando:

```bash
python3 -c "
import json
with open('/home/ubuntu/.openclaw/openclaw.json') as f:
 cfg = json.load(f)
cfg['agents']['defaults']['model'] = {
 'primary': 'anthropic/claude-sonnet-4-6',
 'fallbacks': ['anthropic/claude-haiku-4-5']
}
with open('/home/ubuntu/.openclaw/openclaw.json', 'w') as f:
 json.dump(cfg, f, indent=2)
print('Modelo configurado')
"
```

### Agregar DeepSeek como fallback

Si quieres que el bot intente otro proveedor cuando el principal no está disponible:

```bash
python3 -c "
import json
with open('/home/ubuntu/.openclaw/openclaw.json') as f:
 cfg = json.load(f)
cfg['agents']['defaults']['model']['fallbacks'] = cfg['agents']['defaults']['model'].get('fallbacks', [])
cfg['agents']['defaults']['model']['fallbacks'].append('deepseek/deepseek-chat')
with open('/home/ubuntu/.openclaw/openclaw.json', 'w') as f:
 json.dump(cfg, f, indent=2)
print('DeepSeek agregado como fallback')
"
```

### Configurar las API keys

Las API keys se ponen en un archivo `.env` dentro de la carpeta de OpenClaw:

```bash
cat > ~/.openclaw/.env << 'EOF'
ANTHROPIC_API_KEY=tu-key-de-anthropic-aqui
DEEPSEEK_API_KEY=tu-key-de-deepseek-aqui
EOF
```

Pon tus keys reales. Consíguelas en:
- Anthropic: https://console.anthropic.com/settings/keys
- DeepSeek: https://platform.deepseek.com/settings

### Reiniciar el gateway
Después de cambiar el modelo o las keys:

```bash
openclaw gateway restart
sleep 3
openclaw status
```

---

## 7. PROBLEMAS COMUNES

### Telegram dice "error: no token"

**Causas posibles y soluciones en orden:**

#### 1. Webhook viejo apuntando a otra URL:
Si antes tenías el bot corriendo en otro servidor, puede quedar un webhook apuntando a la URL vieja. Para limpiar:

```bash
curl "https://api.telegram.org/botTU_TOKEN_AQUI/deleteWebhook"
```

Debe responder: `{"ok":true,"result":true,"description":"Webhook is already deleted"}` o similar.

#### 2. Reiniciar el gateway después de limpiar:
```bash
openclaw gateway stop
pkill -f openclaw 2>/dev/null || true
sleep 2
openclaw gateway start
```

#### 3. Verificar token:
```bash
curl "https://api.telegram.org/botTU_TOKEN_AQUI/getMe"
```

Si responde con info del bot, el token es válido. Si da 404, el token está mal.

### "Gateway start blocked: missing gateway.mode"

El wizard debería haberlo configurado. Si no, reejecuta:

```bash
openclaw doctor --fix
```

O mejor, reejecuta el wizard:
```bash
openclaw onboard --mode local
```

### "Server refused our key" en SSH

La key que PuTTY usa no coincide con la de la instancia. Ver Solución A o B en la sección 3.

### Chromium falla al cargar páginas

Reinstalar las dependencias:
```bash
npx playwright install --with-deps chromium
```

### OpenClaw no responde o el modelo no funciona

#### 1. Verificar que la API key esté en `~/.openclaw/.env`
#### 2. Verificar con `cat ~/.openclaw/.env` que no haya errores de tipeo
#### 3. Probar manualmente la API:

```bash
curl -X POST https://api.anthropic.com/v1/messages \
 -H "x-api-key: TU_ANTHROPIC_KEY" \
 -H "anthropic-version: 2023-06-01" \
 -H "content-type: application/json" \
 -d '{"model":"claude-sonnet-4-6","max_tokens":10,"messages":[{"role":"user","content":"hola"}]}'
```

Si responde con un mensaje, la key funciona.

---

## 8. CHECKLIST FINAL

- [ ] **Instancia creada:** VM.Standard.E3.Flex (AMD), OCPU y RAM según presupuesto
- [ ] **IP reservada asignada** (no efímera, no cambia al reiniciar)
- [ ] **SSH funciona** desde PuTTY
- [ ] **Sistema actualizado** (`apt update && apt upgrade`)
- [ ] **Node.js instalado** via NVM
- [ ] **OpenClaw instalado** globalmente
- [ ] **Playwright + Chromium instalado** (para browser automation)
- [ ] **Firewall UFW activo** (puertos 22, 80, 443, 18789)
- [ ] **Fail2Ban corriendo** (protección contra ataques SSH)
- [ ] **Config generada** con `openclaw onboard` (NO a mano)
- [ ] **Modelo configurado** (Claude Sonnet como principal)
- [ ] **API keys** en `~/.openclaw/.env`
- [ ] **Bot Telegram conectado** (token válido, webhook eliminado)
- [ ] **Gateway corriendo** (`openclaw gateway start`)
- [ ] **Bot responde** por Telegram

---

## 9. DECISIONES TÉCNICAS (POR QUÉ ASÍ)

| Decisión | Elección | Razón |
|----------|----------|-------|
| CPU | AMD no ARM (Ampere) | Chromium funciona nativamente sin problemas de compatibilidad |
| Config | Wizard onboard | Elimina errores de validación de JSON manual |
| Browser | Playwright | Instala dependencias correctas automáticamente |
| IP | Reservada | Permanente, no se pierde al reiniciar |
| Modelo | Claude Sonnet | Mejor calidad para agentes conversacionales |
| Fallback | DeepSeek | Más económico, buen respaldo si el principal falla |
| Search | Skip for now | No es crítico para el setup básico |
| Skills | Mínimas al inicio | Se instalan bajo demanda |
| Firewall | UFW básico | Solo puertos necesarios |

---

**Escrito por:** Agente Ecosistemanet  
**Basado en:** Sesión real de creación de instancia nueva 2026-04-06  
**Estado:** Probado paso a paso en vivo

**Última actualización:** 2026-04-06  
**Revisado por:** Donna 🌹