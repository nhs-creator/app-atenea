# Guía de versionado y changelog

Este documento explica cómo mantener versiones, changelog y commits en Atenea. **Debe seguirse al hacer cambios o al asistir con este proyecto.**

---

## 1. Versión actual

La versión está en `package.json` y sigue [Semantic Versioning](https://semver.org/lang/es-ES/):

- **MAJOR** (1.x.x): Cambios incompatibles
- **MINOR** (x.1.x): Nuevas funcionalidades compatibles
- **PATCH** (x.x.1): Correcciones de bugs

---

## 2. Cómo hacer commits

### 2.1 Formato de mensaje

Usar prefijos que indican el tipo de cambio:

| Prefijo | Uso | Ejemplo |
|---------|-----|---------|
| `feat:` | Nueva funcionalidad | `feat: agregar categoría Tarjeta de crédito` |
| `fix:` | Corrección de bug | `fix: ventas del 28 de febrero no aparecían` |
| `chore:` | Mantenimiento, config, deps | `chore: actualizar dependencias` |
| `docs:` | Solo documentación | `docs: actualizar CHANGELOG` |
| `refactor:` | Refactor sin cambiar comportamiento | `refactor: simplificar lógica de filtros` |

### 2.2 Regla obligatoria

**Antes de cada commit que cambie código o funcionalidad:**

1. Actualizar `CHANGELOG.md` en la sección `[Unreleased]`.
2. Clasificar el cambio en: **Corregido**, **Añadido**, **Cambiado** o **Eliminado**.
3. Usar el prefijo correspondiente en el mensaje del commit.

### 2.3 Ejemplo de flujo

```bash
# 1. Hacer cambios en el código
# 2. Editar CHANGELOG.md → agregar en [Unreleased]

### Añadido
- Nueva feature X

# 3. Commit
git add .
git commit -m "feat: agregar feature X"

# 4. Push
git push
```

---

## 3. Cómo hacer un release

Cuando se quiera publicar una nueva versión:

### Paso 1: Decidir qué versión

- Bugfix → PATCH (1.0.0 → 1.0.1)
- Nueva feature → MINOR (1.0.0 → 1.1.0)
- Cambio incompatible → MAJOR (1.0.0 → 2.0.0)

### Paso 2: Actualizar CHANGELOG.md

1. Cambiar `## [Unreleased]` por `## [X.Y.Z] - YYYY-MM-DD`
2. Dejar una nueva sección vacía `## [Unreleased]` para lo siguiente

```markdown
## [Unreleased]

---

## [1.1.0] - 2025-03-15

### Añadido
- Feature X
```

### Paso 3: Actualizar package.json

```json
"version": "1.1.0"
```

### Paso 4: Commit y tag

```bash
git add CHANGELOG.md package.json
git commit -m "chore: release v1.1.0"
git tag v1.1.0
git push origin main --tags
```

---

## 4. Estructura del CHANGELOG

```markdown
## [Unreleased]

### Corregido
- Descripción del bug

### Añadido
- Nueva funcionalidad

### Cambiado
- Cambio en comportamiento existente

### Eliminado
- Funcionalidad removida

---

## [1.0.0] - 2025-03-01
...
```

---

## 5. Instrucciones para asistentes (IA / otros chats)

Al hacer cambios en este proyecto:

1. **Siempre** actualizar `CHANGELOG.md` en `[Unreleased]` con cada cambio relevante.
2. Usar mensajes de commit con prefijo: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
3. No modificar la versión en `package.json` ni crear tags de release salvo que el usuario lo pida explícitamente.
4. Para releases, seguir la sección 3 de este documento.

---

## Referencias

- [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/)
- [Semantic Versioning](https://semver.org/lang/es-ES/)
- [Conventional Commits](https://www.conventionalcommits.org/)
