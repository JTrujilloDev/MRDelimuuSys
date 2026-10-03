# Correo de cierre y alertas operativas

La facturación electrónica sigue fuera de este alcance. Estas notificaciones cubren todos los puntos activos: Delimuu y ambos Veleño. No son facturas ni reportes contables.

## Gmail

1. Activa la verificación en dos pasos de la cuenta que enviará los correos y genera una contraseña de aplicación. Algunas cuentas administradas no permiten esta opción; consulta al administrador de Google Workspace.
2. Configura `GMAIL_USER`, `GMAIL_APP_PASSWORD` y `NOTIFICATIONS_EMAIL_TO` (destinatarios separados por coma). No uses tu contraseña normal de Gmail ni la de ingreso al POS.
3. Después de aplicar la migración, activa `NOTIFICATIONS_EMAIL_ENABLED=true` y reinicia el backend.

Se usa SMTP de Gmail, SSL puerto 465. El remitente es la cuenta autenticada. El correo contiene punto, terminal, cajera, apertura/cierre en hora de Colombia, ventas brutas/netas, descuentos y sus observaciones, medios de pago, gastos, base, efectivo esperado/contado, diferencia/justificación y motivos de anulación. Las ventas anuladas no aumentan los totales. Las cortesías conservan el descuento y valor neto cero.

Documentación: [SMTP de Google](https://support.google.com/a/answer/176600), [contraseñas de aplicación](https://support.google.com/accounts/answer/185833).

## Teléfono y Galaxy Watch

1. Utiliza un servidor ntfy propio con control de acceso, o un plan de ntfy.sh que permita reservar un tema **privado**. Un nombre difícil de adivinar NO sustituye el control de acceso: estas alertas incluyen información del negocio.
2. Configura `NTFY_BASE_URL` (HTTPS), `NTFY_TOPIC` y `NTFY_TOKEN` con permiso de publicación. El servidor debe denegar a terceros tanto lectura como escritura del tema.
3. Instala ntfy en Android y suscríbete al tema usando una cuenta con permiso de lectura. Habilita notificaciones y revisa las restricciones de batería del teléfono.
4. En Galaxy Wearable permite que el reloj muestre las notificaciones de ntfy. La entrega al reloj depende del teléfono, conexión y ajustes del dispositivo; no hay una integración directa con el reloj.
5. Activa `NOTIFICATIONS_PUSH_ENABLED=true` y reinicia el backend.

### Modo gratuito público (opción explícita)

Para ntfy.sh sin tema reservado puede omitirse `NTFY_TOKEN` únicamente con `NTFY_ALLOW_PUBLIC_TOPIC=true`. Mantener HTTPS, un tema aleatorio y `NOTIFICATIONS_PUSH_ENABLED=true`. Por defecto esta excepción está desactivada; el backend advierte al iniciar y el estado de configuración muestra `pushPublicMode`.

Este modo NO es privado: quien conozca el tema puede leer los cierres con cifras y publicar avisos falsos. El token por sí solo tampoco protege un tema no reservado. Usarlo solo con aceptación explícita de ese riesgo, como en la prueba acordada. Para privacidad, reservar/proteger el tema o usar servidor propio y dejar `NTFY_ALLOW_PUBLIC_TOPIC=false`.

El contenido no se reduce en modo público: envía los mismos cierres y alertas de stock. ntfy.sh aplica cuotas al servicio gratuito; revisar volumen al activar porque también se notifican los productos ya bajos/agotados. Una aceptación de ntfy no confirma recepción en el teléfono o el reloj.

Cada cierre genera una alerta con ventas netas, descuentos, efectivo contado y diferencia. No se genera un consolidado diario adicional.

El stock se revisa cada minuto mientras el backend esté encendido. Se usan los mínimos existentes por punto/variante: agotado si stock <= 0; bajo si stock > 0, mínimo > 0 y stock <= mínimo. Solo inventarios inicializados de puntos/grupos activos y variantes activas. Productos de receta no tienen alerta por stock propio; sí sus ingredientes, empaques y bases. Para otros productos se exige pertenecer al catálogo del grupo (incluidos los temporalmente desactivados para venta).

Una alerta por entrada en nivel bajo; otra si se agota. No se repite en cada revisión. Al recuperar stock por encima del mínimo, un descenso posterior habilita una alerta nueva. La primera activación también avisa por productos ya bajos/agotados. Cambios completos entre dos revisiones pueden no detectarse. No se reconstruyen cierres ni movimientos ocurridos con los canales deshabilitados.

Documentación: [publicación y autenticación ntfy](https://docs.ntfy.sh/publish/), [aplicación móvil](https://docs.ntfy.sh/subscribe/phone/).

## Instalación y operación

En desarrollo las variables deben estar en `apps/backend/.env`. En Docker se toman del `.env` de la raíz y se pasan al backend; una imagen ya publicada no contiene automáticamente estos cambios, hay que construir/publicar la versión nueva.

Desde `apps/backend`, ejecuta `pnpm exec prisma migrate deploy` y `pnpm exec prisma generate`, luego reinicia el backend. La migración agrega dos tablas y no modifica inventarios ni ventas. Los dos canales están deshabilitados por defecto, por lo que no envían mensajes al aplicar la migración.

El cierre y sus mensajes pendientes se guardan en la misma transacción. Los envíos externos ocurren después, sin bloquear la respuesta del cierre por fallas del proveedor. Es necesario aplicar la migración antes de habilitar los canales: sin ella no se puede guardar el mensaje del cierre.

La cola se procesa cada 15 segundos, con hasta 8 intentos por mensaje, espera creciente (30 segundos hasta una hora), y reserva temporal para evitar que dos instancias procesen simultáneamente un mensaje. Si faltan credenciales o destinatario, permanece pendiente sin consumir intentos. Cuando se habilitan canales sin destinatario, se utiliza la configuración que se agregue posteriormente; de lo contrario se conserva el destinatario original. Deshabilitar un canal pausa sus pendientes, no los borra.

La entrega es **al menos una vez**: una caída después de que el proveedor acepte el envío y antes de registrar el éxito puede ocasionar un duplicado. No se promete entrega instantánea ni exactamente una vez. Gmail aceptado no implica recepción en bandeja de entrada, y ntfy aceptado no confirma que el reloj lo haya mostrado.

Para el administrador general hay endpoints autenticados bajo el prefijo de la API:

- `GET /notifications`: estado de configuración (sin secretos) y últimos 100 envíos.
- `POST /notifications/:id/retry`: reintentar un pendiente o fallido; no reenvía mensajes ya marcados como enviados.

No hay aún una pantalla de configuración ni de seguimiento de envíos. Las claves se mantienen fuera del repositorio; no las compartas por chat. Revisa periódicamente los fallidos y considera una política de retención de los resúmenes en la base de datos antes de operar a gran escala.
