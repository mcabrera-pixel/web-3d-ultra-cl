# Hooks Deterministas — Estándares MCCO

Fuente: best-practice (30.4k), claude-howto (15.4k), everything-cc (131k).

> **Estado actual**: Solo el hook PostToolUse de Blender está implementado en producción.
> Los patrones documentados abajo son referencia para implementación gradual.

Los hooks son **deterministas**: a diferencia de instrucciones en CLAUDE.md que Claude puede ignorar,
los hooks se ejecutan SIEMPRE que su evento y matcher coincidan.

---

## Hooks Recomendados para Proyectos MCCO

### 1. PreToolUse — Bloquear Operaciones Peligrosas

Bloquear comandos destructivos (`rm -rf`, `DROP TABLE`, `--force`, `push --force`) antes de que se ejecuten.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "<script que inspecciona tool_input y deniega destructivos>" }]
      }
    ]
  }
}
```

### 2. PostToolUse — Auto-validación al Escribir Código

Ejecutar validación sintáctica después de editar archivos: `py_compile` para `.py`, `tsc --noEmit` para `.ts`.

```json
{
  "PostToolUse": [
    {
      "matcher": "Write|Edit",
      "hooks": [{ "type": "command", "command": "<script de validación según extensión>" }]
    }
  ]
}
```

### 3. Stop — Verificación de Completitud

```json
{
  "Stop": [
    {
      "hooks": [{
        "type": "prompt",
        "prompt": "Verifica que todas las tareas solicitadas estén completas. Revisa tests ejecutados, archivos guardados, y que no queden items pendientes.",
        "timeout": 30
      }]
    }
  ]
}
```

---

## Códigos de Salida

| Exit Code | Efecto |
|-----------|--------|
| `0` | Permitir. stdout se inyecta como contexto |
| `2` | Bloquear. stderr se devuelve a Claude como feedback |
| Otro | Permitir pero loguear |

---

## Tipos de Hooks

| Tipo | Uso |
|------|-----|
| `command` | Script shell — más control, determinista |
| `http` | POST a endpoint — integración externa |
| `prompt` | Evaluación LLM single-turn — verificación semántica |
| `agent` | Subagente multi-turn con herramientas — verificación compleja |

---

## Perfiles de Hooks (everything-cc)

Configurar vía variable de entorno:

| Perfil | Uso |
|--------|-----|
| `minimal` | Dev rápido, solo bloqueo de destructivos |
| `standard` | Dev normal: validación + contexto + completitud |
| `strict` | Producción/CI: todo lo anterior + detección secretos + cost tracking |

---

## settings.json — Jerarquía de Precedencia

1. **Managed** (MDM/organizacional) — no se sobreescribe
2. **CLI arguments** — override de sesión
3. **`.claude/settings.local.json`** — personal (git-ignored)
4. **`.claude/settings.json`** — compartido por equipo
5. **`~/.claude/settings.json`** — defaults globales

### Permisos Recomendados MCCO

```json
{
  "permissions": {
    "allow": ["Edit(*)", "Write(*)", "Read(*)", "Glob(*)", "Grep(*)"],
    "deny": [],
    "ask": [
      "Bash(rm *)", "Bash(git push*)", "Bash(git reset*)",
      "Bash(docker *)", "Bash(npm publish*)", "Bash(wrangler deploy*)"
    ]
  }
}
```

Regla: `deny` tiene la mayor precedencia y NUNCA se sobreescribe.

---

## 25 Eventos de Hooks Disponibles

### Tool Hooks
`PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`

### Session Hooks
`SessionStart` (matchers: startup/resume/clear/compact), `SessionEnd`, `Stop`, `StopFailure`, `SubagentStart`, `SubagentStop`

### Task Hooks
`UserPromptSubmit`, `TaskCompleted`, `TaskCreated`, `TeammateIdle`

### Config Hooks
`ConfigChange`, `CwdChanged`, `FileChanged`, `InstructionsLoaded`

### Lifecycle Hooks
`PreCompact`, `PostCompact`, `WorktreeCreate`, `WorktreeRemove`, `Notification`, `Elicitation`, `ElicitationResult`
