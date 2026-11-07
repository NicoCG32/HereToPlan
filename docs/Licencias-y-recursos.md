# Licencias, autoría y recursos · estado de revisión

[← Documentación](README.md) · [LICENSING.md](../LICENSING.md) · [LICENSE](../LICENSE) · [NOTICE](../NOTICE)

## Qué es válido afirmar hoy

- **Licencia del proyecto:** el archivo [LICENSE](../LICENSE) contiene el texto de **PolyForm Noncommercial 1.0.0**. Permite los usos definidos por esa licencia, pero no constituye una autorización comercial general.
- **Avisos propios:** el [NOTICE](../NOTICE) incluye actualmente dos líneas `Required Notice:`: copyright del proyecto y repositorio de procedencia. No se deben inventar nuevas líneas con nombres de terceros.
- **Identidad visual:** el responsable del proyecto confirmó que los logotipos, banners, iconos, fondos e ilustraciones de HereToPlan son **suyos**. Esta atribución procede de su declaración; no se ha establecido aquí el método concreto de creación de cada archivo.
- **Interpretación y acuerdos:** [LICENSING.md](../LICENSING.md) explica las condiciones actuales y cómo solicitar permisos adicionales. **Este capítulo no cambia la licencia ni concede derechos nuevos.**

## Inventario documental comprobado

| Elemento en el repositorio   | Fuente para inspeccionar                                                  | Situación                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Código de la aplicación      | [`src/`](../src) y [`package.json`](../package.json)                      | Arquitectura propia; la autoría de cada contribución se verifica en su procedencia.                                           |
| Dependencias de ejecución    | [`package.json`](../package.json): React, React DOM, React Router         | Sus licencias y avisos son **independientes** de PolyForm; falta inventario de distribución verificado.                       |
| Herramientas de desarrollo   | [`package.json`](../package.json): Vite, Vitest, TypeScript, ESLint, etc. | No presumir que todas se distribuyen al usuario final; verificar qué se empaqueta.                                            |
| Branding                     | [`branding/`](../branding/README.md): banners, logos, iconos              | **Autoría declarada por el responsable: propia.** Método y procedencia técnica de cada recurso no documentados.               |
| Recursos usados en la app    | [`src/presentacion/recursos/`](../src/presentacion/recursos/README.md)    | **Recursos declarados propios** por el responsable; sigue pendiente identificar eventuales componentes externos incorporados. |
| Copias públicas de identidad | [`public/brand/`](../public/brand)                                        | Copias de la identidad visual declarada propia; verificar su correspondencia con los originales.                              |
| Fuentes tipográficas         | [`fundamentos.css`](../src/presentacion/estilos/fundamentos.css)          | Se especifica una pila de fuentes; la presencia de `Inter` en CSS **no prueba** que se redistribuya un archivo de fuente.     |

## Antes de afirmar que el NOTICE está completo

1. **Autoría declarada:** el responsable confirmó la titularidad de los recursos visuales del proyecto. Solo falta documentar, cuando sea relevante, el método de creación y si se incorporaron elementos externos con condiciones propias.
2. Revisar el árbol de dependencias de `package-lock.json`, sus licencias declaradas, avisos que requieran conservación y su presencia efectiva en el bundle.
3. Identificar cualquier icono, imagen, fuente, fragmento de código o recurso importado con obligaciones adicionales.
4. Distinguir lo que se puede relicenciar como código original de lo que requiere autorización del titular de otro recurso.
5. Completar avisos de terceros **solo después de conocer autor, obra, licencia y condición real**. No presentar como resuelta una verificación aún pendiente.

## Decisión vigente

**Mantener PolyForm Noncommercial 1.0.0.** La confirmación de titularidad visual no concede automáticamente permisos de uso distintos ni sustituye el examen de condiciones de terceros. Para reutilizaciones comerciales que no estén permitidas por el texto actual, corresponde un acuerdo separado con quienes estén habilitados para conceder los derechos. No se propone cambiar a MIT u otra licencia en esta revisión.

La documentación no constituye asesoría jurídica individual ni verifica por sí sola la titularidad de todos los archivos. El criterio es no confundir «archivo público» con «permiso para cualquier uso».
