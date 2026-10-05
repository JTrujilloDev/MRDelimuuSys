# Facturación electrónica: arquitectura propuesta

Estado: primera base técnica implementada. Rama: `codex/facturacion-electronica`, actualizada con `2.0`.

## Avance implementado

- Contrato de proveedor independiente en `apps/backend/src/billing/domain`.
- Adaptador simulado idempotente que nunca informa aceptación fiscal real.
- Traductor inicial de factura estándar Factus (`document: 01`, `operation_type: 10`).
- Impoconsumo representado mediante código Factus `04`, con tasa configurable por línea; las pruebas cubren el 8% acordado para Veleño.
- Validación decimal sin aritmética de punto flotante, pagos a crédito con vencimiento y ajuste de efectivo limitado a ±500 COP.
- Modelos y migración para emisores fiscales, configuraciones versionadas, rangos, documentos, intentos, cola y artefactos.
- Credenciales referenciadas por nombre; no se almacenan tokens, contraseñas o secretos en la base de datos.

Esta base todavía no crea documentos al cerrar ventas ni realiza llamadas externas. La activación espera credenciales sandbox, datos fiscales, rango de numeración y códigos de medios de pago confirmados.

## Alcance acordado y decisiones pendientes

- Proveedor tentativo: Factus. El núcleo de Delisys no debe depender de sus formatos ni de su autenticación.
- Primera operación habilitada: Veleño; Delimuu conserva la operación actual sin emisión electrónica automática.
- Los negocios usan NIT distintos. Los dos puntos de Veleño deben vincularse explícitamente al mismo emisor fiscal cuando sus datos se confirmen.
- El usuario indicó impuesto al consumo del 8% y documento POS para las ventas. Son requisitos declarados, no una validación tributaria: antes de implementar la emisión se confirmarán el tipo exacto de documento, su soporte por el proveedor y la configuración fiscal aplicable.
- Confirmar resolución, prefijos, rangos, vigencia, datos del emisor y si el precio mostrado incluye el impuesto. No asumir que ambos puntos comparten resolución solo por pertenecer al mismo grupo.
- Confirmar el tratamiento de descuentos, cortesías, ventas a crédito, datos del adquirente y correcciones de documentos emitidos.

## Separación de responsabilidades

La integración debe vivir en el backend. El navegador no recibe credenciales ni construye solicitudes específicas de Factus.

1. **POS y cuentas**: registran la venta, el pago, el descuento y los movimientos actuales. Consultan estados y entregan los documentos disponibles usando identificadores de Delisys.
2. **Servicio de facturación**: comprueba elegibilidad, selecciona el emisor/configuración del punto, crea una fotografía inmutable de la venta y coordina los documentos y sus correcciones.
3. **Persistencia y cola fiscal**: guardan documentos, intentos y trabajos pendientes. El proceso de emisión tiene su propia cola; no utiliza `NotificationOutbox` como almacenamiento fiscal.
4. **Contrato de proveedor**: define operaciones y resultados internos comunes. No importa servicios del POS ni accede directamente a sus cuentas.
5. **Adaptadores**: traducen el contrato común a cada API. Factus será el primero; otro proveedor implementará el mismo contrato.

Ubicación prevista: `apps/backend/src/billing/`, con `domain/`, `application/`, `providers/`, `persistence/` y `workers/`. Las rutas y permisos seguirán las convenciones actuales del backend.

El contrato incluirá emitir, consultar estado y recuperar artefactos. Las operaciones de corrección, consulta por referencia y demás funciones tendrán capacidades explícitas: no todos los proveedores soportan los mismos documentos ni ofrecen las mismas garantías de reintento. El contrato definitivo se establecerá después de revisar su documentación oficial.

## Configuración por emisor, no solo por marca

- **Emisor fiscal**: identidad y datos tributarios propios. No se confunde con `StoreGroup`, que actualmente comparte catálogo y precios.
- **Vinculación del punto**: `Store` identifica el emisor y la configuración que aplica a sus ventas.
- **Configuración del proveedor**: emisor, proveedor, entorno de pruebas/producción y referencia segura a credenciales. Las credenciales permanecen en el servidor y no se incluyen en documentos, logs o respuestas al frontend.
- **Resoluciones**: vinculadas al emisor, entorno y tipo de documento; administración y asignación de numeración conforme al contrato confirmado del proveedor. No crear un contador local sin coordinar su uso entre puntos e instancias.
- Un documento conserva la versión de configuración y el proveedor con que se creó. Cambiar el proveedor no reenvía documentos ya emitidos ni cambia su historia; los pendientes requieren reconciliación antes de migrarlos.

## Documentos y trazabilidad

Cada documento mantiene una referencia a la cuenta y una fotografía de emisor, punto, terminal, adquirente cuando corresponda, líneas, cantidades, precios, descuentos, bases, impuestos, totales y forma de pago. Una edición posterior del catálogo no cambia el documento.

Los cálculos fiscales usarán una representación decimal de precisión definida, no nuevos cálculos con `Float`. Las reglas de redondeo y la distribución de descuentos se verificarán contra los totales de la venta y el contrato fiscal confirmado.

La persistencia separará:

- Documento y su estado interno.
- Referencias, numeración e identificadores fiscales devueltos por el proveedor.
- Intentos de envío/consulta, con resultados normalizados y diagnósticos sin secretos.
- Artefactos disponibles (PDF, XML u otros), obtenidos exclusivamente cuando el proveedor los ofrezca para ese documento.
- Relaciones entre el documento original y las correcciones que se emitan posteriormente.

## Emisión, fallos y duplicados

La creación del documento pendiente y su trabajo de envío debe ser atómica con el registro de la venta elegible. No se llama a la API externa dentro de esa transacción. Un trabajador independiente procesa la cola, con exclusión entre instancias y control de intentos.

Estados internos previstos: pendiente, enviando, procesando, aceptado, rechazado y requiere conciliación. Una respuesta HTTP exitosa no significa automáticamente aceptación fiscal.

- Clave interna única por emisor, operación y documento; evita crear dos documentos originales por la misma venta.
- Usar idempotencia remota únicamente si el proveedor la documenta.
- Ante un timeout posterior al envío, consultar el resultado por la referencia disponible antes de repetir la emisión.
- Si no es posible determinar si el proveedor recibió el documento, marcar **requiere conciliación**, sin reenviar ciegamente ni cambiar de proveedor.
- Los rechazos de datos requieren corrección y revisión explícita. Los errores transitorios pueden reintentarse con espera progresiva cuando sea seguro.
- Un documento aceptado no se borra ni se vuelve a emitir automáticamente.

La venta comercial y el estado fiscal son independientes. Mientras la emisión esté pendiente, la interfaz lo indicará y no presentará un comprobante interno como documento electrónico aceptado. La política de continuidad sin conexión y los tiempos permitidos de emisión quedan pendientes de validar; la cola por sí sola no garantiza cumplimiento tributario.

La anulación actual de una venta no anulará automáticamente un documento electrónico. Cuando exista un documento emitido se requerirá un flujo de corrección autorizado, vinculado al original y soportado por el proveedor y el tipo documental. El historial comercial y el fiscal deben mantenerse coherentes, sin borrar evidencia.

## Entregas sugeridas

1. Confirmar requisitos y documentación oficial de Factus, especialmente el documento POS solicitado. Definir el contrato común y probarlo con un adaptador simulado, que nunca se marque como aceptación fiscal real.
2. Crear modelos y migraciones de emisores, configuraciones, resoluciones, documentos, intentos y cola. Configurar Veleño sin habilitar emisión en Delimuu.
3. Implementar generación de la fotografía de venta, cálculo y validaciones, idempotencia y procesamiento de estados con pruebas automáticas.
4. Implementar el adaptador Factus en sandbox, incluyendo autenticación, consulta, rechazos, timeout ambiguo y recuperación de artefactos.
5. Integrar el POS y la revisión administrativa: estado visible, consultas, entrega de documentos y acciones autorizadas de conciliación/corrección.
6. Validar numeración compartida, concurrencia entre ambos puntos, descuentos y fallos. Habilitar producción únicamente tras confirmar la configuración y las pruebas con el proveedor.

Esta entrega solo crea la rama y documenta el diseño. No añade tablas, migraciones, credenciales ni llamadas a Factus; no cambia ventas, impuestos, caja o inventario.
