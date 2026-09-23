# Developer Workflow — Estándares MCCO

Fuente: superpowers/obra (124k), best-practice (30.4k).

Flujo obligatorio para desarrollo con agentes de código en proyectos MCCO.

---

## Las 4 Fases del Desarrollo

Ninguna fase se salta. El código NO se escribe sin plan.

### Fase 1: Research
- Explorar contexto: leer código existente, entender el problema
- Proponer 2-3 enfoques con trade-offs
- Preguntas > suposiciones
- Obtener aprobación del diseño ANTES de escribir código

### Fase 2: Plan
- Crear branch aislado si corresponde: `feature/nombre-descriptivo`
- **Altitud generación Claude 5 (2026-08-02): el plan describe TAREA + GUARDRAILS + CRITERIOS
  DE SALIDA verificables — no un paso-a-paso que dicte CÓMO ejecutar.** Sobre-especificar
  ("haz 1, luego 2, luego 3") es el failure mode documentado de ingenieros senior con modelos
  frontier (ver `karpathy-core.md` §4)
- Cada unidad del plan declara: qué cambia (tarea), qué NO se toca (guardrails), y su check
  ejecutable de salida (test/build/diff que retorna pasa/no-pasa)
- Si el diff completo se puede describir en una oración, saltarse el plan
- La descomposición en micro-tareas de 2-5 min con código exacto queda reservada para: prompts
  de producción MiniMax (sobre-especificación por diseño) y cambios de altísimo riesgo donde
  Mario pida ese nivel de detalle

### Fase 3: Execute
- Una tarea a la vez, en orden del plan
- TDD obligatorio:
  - **RED**: Escribir test que FALLA primero
  - **GREEN**: Escribir código MINIMO que hace pasar el test
  - **REFACTOR**: Limpiar sin cambiar comportamiento
- Commit por tarea completada

### Fase 4: Verify
- Todos los tests pasan (ejecutar, leer output, citar evidencia)
- Self-review del diff completo antes de declarar listo
- Los tests verdes NO sustituyen el self-review: defectos como SQL sin parámetros,
  secretos hardcodeados, timeout faltante o fix sin root cause son invisibles para un suite
  que pasa — solo se ven leyendo el diff
- Decisión: merge directo / crear PR / mantener branch
- NUNCA declarar "listo" sin evidencia verificable

---

## Debugging Sistemático (4 Fases)

Cuando un bug aparece, NO intentar fixes al azar. Seguir el método científico:

### Fase 1: Root Cause Investigation
```
Leer el error COMPLETO (no saltear warnings)
Reproducir el error consistentemente
Revisar cambios recientes (git diff)
Instrumentar boundaries entre componentes
Trazar datos HACIA ATRAS en el call stack
```

### Fase 2: Pattern Analysis
```
Encontrar código similar que SI funciona
Listar CADA diferencia entre working/broken
Buscar el patrón, no el síntoma
```

### Fase 3: Hypothesis & Testing
```
Formular UNA hipótesis específica: "X causa Y porque Z"
Diseñar cambio MINIMO para testear la hipótesis
Si falla: nueva hipótesis (NO acumular fixes)
Si 3+ hipótesis fallan: ESCALAR — es problema arquitectural
```

### Fase 4: Implementation
```
Escribir test que reproduce el bug (RED)
Implementar el fix (GREEN)
Verificar que el test pasa
Verificar que no se rompió nada más
```

---

## Meta-Skill: Crear Nuevos Skills

Cuando se descubre un proceso repetitivo, crear un skill reutilizable usando TDD de procesos:

1. **RED**: Ejecutar el escenario SIN el skill. Documentar errores que ocurren.
2. **GREEN**: Escribir skill MINIMO que aborde esas violaciones.
3. **REFACTOR**: Cerrar loopholes encontrados en uso real.

Formato: archivo Markdown con frontmatter YAML (`name`, `description`) +
secciones: Instrucciones, Pasos, Pitfalls, Verificación.

---

## Convenciones de Commits

```
feat: nueva funcionalidad
fix: corrección de bug
chore: mantenimiento, dependencias
refactor: reestructuración sin cambiar comportamiento
test: agregar o modificar tests
docs: documentación
```

Branch naming: `feature/`, `fix/`, `chore/`
Nunca force push a main.

### Regla anti-desalineación (2026-08-23)

**No mantener una segunda lista exhaustiva de algo que ya tiene fuente de verdad; consultar la
fuente.** Un catálogo (reglas en `docs/reglas/`, perfiles en `targets.json`, comandos de un CLI,
skills instaladas) se enumera COMPLETO en un solo lugar; cualquier otro documento lo referencia,
no lo copia. Una copia exhaustiva se desalinea en silencio con el primer cambio y pasa a mentir.
Referencias parciales con propósito (ej.: "las 3 reglas que aplican a este dominio") sí se
permiten — lo prohibido es el espejo completo que pretende ser índice.

### Convención test-first (2026-08-02)

Los tests de un cambio van en **commit propio y ANTERIOR al código** (`test:` antes de
`feat:`/`fix:`). Un commit que mezcla `tests/` y código fuente debe justificar en su mensaje
por qué cambió el criterio de aceptación. Razón: un agente que edita test y código a la vez
puede "ablandar" el test que él mismo escribió para llegar a verde — el suite pasa a ser
auto-certificado y el RED de la Fase 3 deja de significar algo.
