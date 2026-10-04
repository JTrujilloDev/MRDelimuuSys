# Créditos del punto de venta

## Funcionamiento

- En el cobro del POS se puede seleccionar **Crédito** e identificar al cliente con nombre y teléfono obligatorios. Cada venta mantiene sus propios datos de cliente; no se fusionan automáticamente personas con nombres o teléfonos iguales.
- La venta queda cerrada: descuenta inventario y registra ventas netas y descuentos una sola vez. No aumenta el efectivo de caja al otorgarla.
- La sección **Créditos** muestra únicamente ventas del punto activo, con búsqueda y filtros de pendientes, pagados y anulados. Permite consultar el valor original, lo abonado, el saldo y el historial de pagos.
- Caja, administración de punto y administración general pueden gestionarlos. Los abonos requieren un turno abierto propio; administración puede apoyar el turno abierto del punto. Cocina no tiene acceso a créditos.
- Se reciben abonos parciales o por el saldo completo en efectivo, tarjeta o QR, también en turnos posteriores al de la venta. No se aceptan sobrepagos ni abonos con otro crédito.
- El abono aparece en el turno que lo recibe, separado de sus ventas. Solo el efectivo aumenta el efectivo esperado. Las ventas del día no vuelven a aumentar al cobrar deudas antiguas.
- Un abono puede anularse con justificación solo mientras su turno original siga abierto y sea el activo. Se conserva fecha, usuario y motivo; el saldo se restaura. Los turnos cerrados no se reescriben.
- La venta a crédito no se puede anular con abonos vigentes. Sin abonos vigentes aplica la regla existente: anular antes del cierre del turno original y restaurar inventario.
- No se incluyen intereses, vencimientos del crédito, límites por cliente, pagos mixtos al vender ni consolidación de cartera entre puntos.

## Integración y protección

Las cuentas mantienen estado `CLOSED` y método `CREDIT` para conservar compatibilidad con inventario y reportes. El estado pendiente/pagado se deriva del saldo, no cambia el estado contable de la venta. Los abonos usan movimientos `CASH_IN` relacionados con la cuenta y el turno receptor. Los movimientos anulados no participan del saldo ni de la caja.

Se valida alcance por punto, turno abierto, monto, método y permisos. Los bloqueos transaccionales coordinan abonos, ventas y cierres; una clave de solicitud evita duplicaciones por reintentos. La migración `20261003160000_credit_payment_operator` identifica al operador real de cada abono, incluso cuando administración apoya otra caja.

## Validación local (3–4 de octubre de 2026)

- Suite backend: 63 pruebas aprobadas, sin omitidas, incluidas las integraciones PostgreSQL de gastos/cierre, créditos y conteos. Los datos de integración se revierten al terminar.
- Créditos: venta con descuento, consumo de inventario, anulación de venta sin abonos, abonos en tres medios, reintento idempotente, sobrepago rechazado, anulación única, aislamiento entre puntos, turno cerrado rechazado y pago de la deuda en un turno posterior sin duplicar ventas.
- Frontend: 15 pruebas aprobadas. Compilación de producción correcta y revisión de tipos backend correcta. La revisión global de tipos frontend conserva problemas preexistentes ajenos a esta implementación.
- Navegador: usuario de caja aislado, venta ficticia de $20.000; abono de $5.000 anulado con motivo; nuevo abono de $5.000 en efectivo y saldo de $15.000 por QR. Cartera pagada, inventario de 3 a 2 unidades, conteo final confirmado, cierre sin justificación con $5.000 esperados y contados. Historial: venta $20.000, abonos $20.000, efectivo $5.000 y diferencia $0. Sin errores de consola durante el flujo.
- Diseño revisado en modo claro y oscuro: modal `lg`, campos contrastados, textarea contenido, cierre a la derecha y separación entre recaudos y descuentos.
- Los avisos externos del servidor temporal estuvieron desactivados. Se retiraron el usuario, punto, producto, ventas y movimientos exclusivos de esa prueba. No se modificaron registros productivos ni se corrigió automáticamente el incidente histórico reportado.

## Despliegue

Respaldar la base productiva y aplicar las dos migraciones de gastos y operador de abonos. Regenerar Prisma y actualizar backend y frontend juntos. Las migraciones ya se aplicaron únicamente en la base local de pruebas. Revisar por separado los movimientos del incidente productivo antes de modificar cualquier importe histórico.
