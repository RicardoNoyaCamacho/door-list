# Casos para evaluar la skill

Ejecuta estas peticiones en un entorno de prueba, sin modificar la base vinculada.
Evalúa decisiones observables; no exijas textos de respuesta idénticos. Los
estados se simulan con props o fixtures locales, sin registrar personas reales.

| Petición | Debe seleccionarse | Resultado observable |
| --- | --- | --- |
| «Añade una tabla de asistentes al detalle del evento» | Sí | Paleta y tipografía canónicas; tabla accesible; estados de carga, vacío y error; sin marco de página duplicado |
| «Unifica el estilo de los botones del dashboard» | Sí | Recetas principal/secundaria; foco visible; conserva acciones y permisos |
| «Muestra una carga mientras se obtienen los asistentes» | Sí | Tres filas estáticas cuando se conocen columnas; aviso de carga; sin cero ni vacío provisional |
| «No hay asistentes todavía; mejora ese estado» | Sí | Encabezados conservados; `colSpan` correcto; mensaje y explicación; sin CTA inventada |
| «Añade búsqueda por correo en esta tabla» | Sí | Controles canónicos; distingue vacío inicial de filtro sin resultados |
| «Haz la pantalla más moderna» | Sí | Conserva el contrato; no añade fuentes, gradientes ni paleta; pregunta solo si se pide una dirección incompatible sin concretarla |
| «Corrige un índice en registrations» | No | Cambio de persistencia sin refactor visual |
| «Corrige la validación del email en la API» | No | Ningún cambio de UI |
| «Cambia únicamente este texto del botón» | Sí, alcance mínimo | Cambia el texto y conserva la pantalla |

## Comparación entre ejecuciones

Con la misma petición «Crea una tabla de asistentes», comprueba en dos contextos
limpios que ambas implementaciones conservan:

- Los mismos colores, opacidades, tipografía y clases de espaciado por función.
- Dos capas: consulta/autorización existente y componente de presentación.
- La misma distinción entre datos, carga, vacío, filtros sin resultados y error.
- Encabezados, foco visible, etiquetas y comportamiento a 375 px y 1280 px.
- Componentes de una ruta junto a ella, compartidos en `components/`.

Las implementaciones pueden variar en lógica interna y nombres apropiados al
dominio. Una nueva paleta o una carga confundida con vacío es un fallo, aunque
la pantalla parezca atractiva. La validación de frontmatter no sustituye estos
casos de comportamiento.
