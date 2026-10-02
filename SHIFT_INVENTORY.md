# Verificación de inventario por turno

## Operación

- La caja abre con el efectivo inicial; no es necesario terminar el inventario para vender.
- «Ver conteos» está disponible en el POS y en el cierre. Cada producto se verifica con una fotografía del stock vigente, no con el stock que tenía al abrir la caja.
- La planilla permite escribir directamente la cantidad física. Entrar al campo actualiza la referencia; Enter o Tab guardan y avanzan al siguiente producto. Al salir del campo también se guarda una fila válida modificada. Si hay diferencia, Enter/Tab llevan a la justificación antes de avanzar.
- Cantidad vacía significa pendiente, no cero. Nunca se rellena con la cantidad esperada: los valores mostrados previamente corresponden únicamente a verificaciones ya guardadas. Se guardan cantidad esperada, física, diferencia, justificación, responsable y hora.
- Cada fila muestra su estado y conserva lo escrito ante un fallo de guardado. Una referencia invalidada por movimientos exige actualizar y volver a contar. No se permite confirmar ni cambiar de etapa con filas pendientes de guardar; «Volver» avisa antes de descartar esas filas. Las verificaciones guardadas sí se conservan al volver al POS.
- Se incluyen variantes con inventario inicializado de productos terminados y de terceros del grupo, así como productos con stock aunque hayan salido del catálogo. No se incluyen recetas, ingredientes, bases ni empaques.
- Las ventas o movimientos que ocurren antes de guardar invalidan la referencia de ese producto, incluso si dos movimientos se compensan. Debe verificarse de nuevo.
- El conteo inicial confirmado conserva la evidencia de recepción; las ventas posteriores no lo invalidan.
- El cierre exige confirmar ambos conteos y mantener vigente el final. Si hubo movimientos después del final, se reabre su verificación, se conserva la fotografía anterior en el historial y se vuelven a verificar los productos afectados.
- Las diferencias justificadas no bloquean el cierre y nunca modifican automáticamente las existencias. Un producto nuevo inicializado antes del cierre también debe contarse en el final.

## Revisión

Historial de cajas → «Conteos y diferencias de inventario». La persona responsable y los administradores de punto pueden consultar los turnos que ya les permite el historial. Solo el administrador general resuelve diferencias, después del cierre:

- Diferencia explicada: se registra el motivo o la referencia de un movimiento ya realizado.
- Error de conteo: se registra el motivo sin modificar stock ni borrar la evidencia.
- Ajuste: únicamente para diferencias finales, de una sola vez y cuando no hay movimientos posteriores. Si el inventario ya cambió, se debe conciliar manualmente en inventario y dejar la referencia en la resolución; no se aplica una diferencia histórica sobre el stock actual.

Los ajustes usan el mecanismo existente de lotes: faltantes se descuentan por FEFO y sobrantes ingresan como «SIN-LOTE». Si se conoce el lote de un faltante/sobrante o se trata de vencimiento, usar el movimiento específico de inventario y explicar la diferencia, en lugar de un ajuste genérico.

El correo de cierre incorpora el detalle de los conteos. Efectivo e inventario se muestran separados.

## Despliegue

Aplicar `20261002090000_shift_inventory_counts` y regenerar Prisma antes de reiniciar el backend. No se modifican turnos cerrados existentes: su historial muestra que no hay conteos. Los turnos abiertos al desplegar sí deben completar ambos conteos para cerrar.

Los movimientos y las verificaciones usan una barrera breve dentro de las transacciones de la base de datos. No bloquea ventas mientras alguien cuenta; únicamente coordina el instante de guardar/confirmar. Actualizar todas las instancias del backend juntas.

## Pruebas

Pruebas de reglas en `shiftInventory.rules.test.ts`. La prueba de integración se activa con `RUN_DB_TESTS=true`, después de aplicar la migración. Crea sus datos dentro de una transacción que se revierte al terminar; no deja productos, turnos ni movimientos de prueba en la base.
