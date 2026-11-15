# Okane

[![CI](https://github.com/Wcno/okane/actions/workflows/ci.yml/badge.svg)](https://github.com/Wcno/okane/actions/workflows/ci.yml)

Okane es una aplicación web de finanzas personales. Reúne el presupuesto mensual y el portafolio de inversión de una persona para responder dos preguntas:

1. ¿Cuánto puedo gastar hasta fin de mes?
2. ¿A qué se debe la variación de mi patrimonio?

Proyecto final de Metodología para el Desarrollo de Sistemas, Universidad Tecnológica de Panamá, grupo 1M321.

## Estado

| Parte | Estado |
|---|---|
| Modelo de dominio, decisiones y matrices | Listo |
| Panel (`/dashboard`) y navegación, con datos de ejemplo | Listo |
| Las demás pantallas | Pendientes |
| `webapp` (Django: autenticación y reenvío a la API) | Pendiente |
| `api-service` (Django REST) y bases de datos | Pendiente |
| Docker Compose | Pendiente |

## Documentación

| Documento | Contenido |
|---|---|
| [GLOSSARY.md](GLOSSARY.md) | El vocabulario del dominio. Es obligatorio en la interfaz y en el código. |
| [docs/matrices.md](docs/matrices.md) | Los 48 casos de uso con su ruta, endpoint, tabla y contenedor. |
| [docs/contratos.md](docs/contratos.md) | Reglas verificables, casos límite y ejemplos para las pruebas HTTP. |
| [docs/plan-de-trabajo.md](docs/plan-de-trabajo.md) | Los 22 tickets en orden de implementación, con sus dependencias. |
| [docs/adr/](docs/adr/) | Las decisiones de arquitectura difíciles de revertir. |
| [PRODUCT.md](PRODUCT.md) | Para quién es Okane, qué problema resuelve y sus principios. |
| [DESIGN.md](DESIGN.md) | El sistema visual: colores, tipografía, componentes y reglas. |

## Arquitectura

Cuatro contenedores, fijados por el documento del curso:

| Contenedor | Tecnología | Responsabilidad |
|---|---|---|
| `webapp` | React + Django | Interfaz, autenticación y reenvío de `/api/*` |
| `webapp-db` | PostgreSQL | Usuarios, credenciales y sesiones |
| `api-service` | Django REST | Cuentas, presupuestos, movimientos, proyecciones e inversiones |
| `api-db` | PostgreSQL | Información financiera |

El navegador solo habla con `webapp` ([ADR 0001](docs/adr/0001-webapp-como-unico-punto-de-entrada.md)).

## Ejecutar el frontend

Requiere Node.js 24 (la versión está en `webapp/frontend/.nvmrc`).

```bash
cd webapp/frontend
npm ci
npm run dev
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run typecheck` | Verifica los tipos de TypeScript |
| `npm run lint` | Revisa el código con oxlint |
| `npm test` | Ejecuta las pruebas con Vitest |
| `npm run build` | Genera el build de producción en `dist/` |

## Cómo contribuir

1. Toma un issue y crea una rama desde `main`: `feat/registrar-ingresos`, `fix/restante-negativo`.
2. Escribe commits pequeños con [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/): `tipo(ámbito): descripción`. Tipos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
3. Abre un PR hacia `main` con la plantilla. El título también sigue Conventional Commits, porque se convierte en el commit final.
4. La CI debe pasar y otro integrante debe aprobar el PR antes de integrarlo.

### Qué verifica la CI

En cada PR y en cada commit a `main`:

- **frontend:** instala dependencias exactas del lockfile, verifica tipos, ejecuta lint, pruebas y build.
- **convenciones:** el título del PR y cada mensaje de commit siguen Conventional Commits.

Cada commit en `main` publica además el build del frontend como artefacto, listo para desplegar. Dependabot propone cada semana las actualizaciones de dependencias y de las acciones de GitHub.
