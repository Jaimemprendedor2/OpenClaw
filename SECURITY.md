# SECURITY.md - Estado de Seguridad

_Última auditoría: 2026-04-05_

## Resultado del Audit (`openclaw security audit`)

**0 críticos · 5 advertencias · 1 info**

### Advertencias Activas

1. **`gateway.trustedProxies` vacío**
   - Riesgo: Si el Control UI se expone via reverse proxy, los headers de IP no se confían correctamente.
   - Acción: Mantener Control UI local (`127.0.0.1`) — sin exposición externa actualmente. ✅ OK por ahora.

2. **`gateway.controlUi.allowInsecureAuth=true`**
   - Riesgo: Flag de depuración activo. No deshabilita auth real, pero es innecesario en producción.
   - Acción pendiente: Deshabilitar cuando no se esté depurando activamente.

3. **Flags inseguros/peligrosos habilitados**
   - Mismo que arriba: `gateway.controlUi.allowInsecureAuth=true`.
   - Acción pendiente: `openclaw config set gateway.controlUi.allowInsecureAuth false`

4. **Entradas en `gateway.nodes.denyCommands` inefectivas**
   - Riesgo: El matching es exacto por nombre de comando, no por contenido de payload.
   - Acción: Revisar qué comandos están listados y usar nombres exactos válidos.

5. **Posible setup multi-usuario detectado**
   - Heurística: Telegram con `groupPolicy="allowlist"`.
   - Acción: Si solo Jaime usa este gateway, está bien. No es multi-tenant real.

### Info

- Gateway accesible en loopback (127.0.0.1) — correcto para setup personal.

## Mejores Prácticas Aplicadas

- ✅ Workspace aislado por usuario
- ✅ Sin Tailscale activado (reduce superficie de ataque remoto)
- ✅ Canal Telegram con allowlist
- ✅ Gateway en loopback solo

## Acciones Pendientes (por orden de prioridad)

1. Deshabilitar `allowInsecureAuth` cuando no se debuggee
2. Revisar y limpiar `denyCommands` con nombres de comando válidos
3. Confirmar que solo Jaime puede enviar mensajes al bot de Telegram

## Cómo Re-auditar

```bash
openclaw security audit
openclaw security audit --deep
```

---

_Revisar después de cada cambio de config o nueva exposición de red._
