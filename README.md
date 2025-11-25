# Aragon — Organizador de Gastos Familiares

Aplicación ligera para administrar y compartir gastos familiares. La app permite crear una cuenta de familia (padre/madre + hijos), llevar un presupuesto mensual, agregar gastos por integrante y categoría, filtrar y exportar los gastos a CSV. Está diseñada para funcionar totalmente del lado del cliente (no requiere backend), usando localStorage para almacenar datos.

## Funcionalidad principal ✅
- Registro y autenticación (roles): crear cuentas de familia y usuarios hijos.
- Gestión de integrantes: agregar y eliminar integrantes de la familia.
- Control de gastos: agregar gastos con fecha, categoría, integrante, monto y descripción.
- Presupuesto mensual: establecer y actualizar presupuesto por mes/año.
- Filtros y búsqueda: filtrar por mes, año, categoría, integrante y búsqueda por descripción.
- Listado de gastos: tabla con ordenamiento por fecha, categoría, integrante, monto y descripción; edición eliminable por padres.
- Vista por categoría: resumen visual con totales por categoría y barras proporcionales.
- Exportar CSV: exportar los gastos filtrados a un archivo CSV descargable.
- Roles: los hijos tienen acceso de lectura y no pueden editar ni agregar gastos (formularios deshabilitados).
- Tema: toggle de tema claro/oscuro guardado en localStorage.
- Persistencia: todos los datos se guardan en localStorage (o sessionStorage para sesiones temporales).

## Estructura del proyecto
- `index.html` — página principal (Dashboard) de la app.
- `Views/Pages/auth.html` — página de autenticación (login/registro).
- `Views/js/app.js` — implementación principal en JavaScript (manejo de UI, almacenamiento local, lógica de negocio).
- `Views/css/styles.css` — estilos CSS de la aplicación.
- `Views/Document/TrabajoFinalAragon[1].docx` — documento complementario (no procesado automáticamente).
- `Controller/`, `Model/` — placeholders para controladores y conexión a DB (vacíos actualmente, la app funciona con localStorage).

## LocalStorage — llaves utilizadas
- `familia.gastos`: lista de gastos
- `familia.presupuesto`: objeto con presupuesto por `YYYY-MM` (ej. `2025-06`)
- `familia.integrantes`: lista de integrantes
- `familia.cuentas`: cuentas/usuarios de familias y sus hijos
- `familia.tema`: tema guardado (light/dark)

## Cómo ejecutar la app localmente (estático)
La app puede ejecutarse fácilmente desde un servidor estático local (recomendado para evitar problemas de rutas con `file://`):

Con Python (si lo tenés instalado):
```powershell
python -m http.server 8000
# Abrir http://localhost:8000/index.html
```

Con Node (serve):
```powershell
npx serve -p 8000
# Abrir http://localhost:8000/index.html
```

## Notas de integración y rutas relativas 🔧
- `Views/js/app.js` tiene lógica que redirige desde la página de autenticación hacia el `index.html`. Si movés `auth.html`, cambialo en el HTML o en `app.js` para que dirija al `index.html` correcto.
- Para simplificar, las rutas relativas se han actualizado a:
	- `index.html`: `Views/css/styles.css`, `Views/js/app.js`, `Views/Pages/auth.html`.
	- `Views/Pages/auth.html`: `../css/styles.css`, `../js/app.js`, `../../index.html`.

## Limitaciones y notas finales 💡
- Actualmente la app está diseñada para funcionar sin backend con almacenamiento en el navegador; si se planea multiusuario real o almacenamiento centralizado, habrá que agregar API/servidor y adaptación de rutas.
- Los archivos en `Controller/` y `Model/` están vacíos; si querés agregar soporte de servidor (PHP/MySQL), esos directorios son el punto de partida.

Si querés que genere una versión con servidor (por ejemplo, Node o PHP) o integre la lógica de una DB, decime qué stack preferís y lo implemento.
