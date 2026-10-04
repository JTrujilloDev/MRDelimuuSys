# Revisión de gastos y cierre — 3 de octubre de 2026

## Hallazgos y correcciones

- La rama revisada no tenía operación ni botón de eliminación de gastos. Ahora se anulan con motivo, fecha y usuario; no se borran los movimientos.
- La pantalla usaba totales acumulados de caja; el cierre sumaba movimientos. El efectivo esperado y los gastos activos se calculan ahora desde los mismos movimientos del backend. El historial conserva la diferencia guardada al cerrar, no vuelve a aplicar el ajuste de cierre.
- Si el saldo mostrado cambió antes de confirmar, se rechaza el cierre y se actualiza el resumen para volver a revisarlo. Los clientes anteriores sin `expectedCash` siguen siendo compatibles, pero no tienen esta protección: actualizar frontend y backend juntos.
- Gastos anulados no afectan efectivo, gastos del turno ni reportes operativos. No se pueden anular gastos de otro turno ni crear/anular después del cierre.
- Creación, anulación y cierre se serializan con los mismos bloqueos de transacción utilizados por ventas. La comprobación de turno abierto ocurre dentro de ese bloqueo.
- Se evita el doble clic mientras se guarda; la misma solicitud incluye una clave única para evitar repetir el gasto al reintentar después de una falla de conexión.
- La lista de gastos del turno ya no queda limitada a los primeros veinte. Se muestra el historial de anulaciones y se informa si falla la consulta.
- Se rechazan montos no finitos y cantidades de billetes/monedas negativas, fraccionadas o fuera del rango seguro. Apertura y cierre usan el mismo cálculo de denominaciones.

## Estado de validación

La suite de lógica no usa producción ni envía avisos externos. Hay pruebas para efectivo, devoluciones, pagos electrónicos/crédito, descuentos/cortesías, anulación de gastos, reintentos y conteo de denominaciones.

Resultado local: 56 pruebas de backend aprobadas, 2 pruebas de integración omitidas por falta de base; 3 pruebas de frontend aprobadas. La revisión de tipos del backend y la compilación de producción del frontend finalizaron correctamente. La revisión global de tipos del frontend sigue mostrando errores en otros archivos (categorías, impresión, productos, reportes y otros); no se presenta como una comprobación global limpia.

La conexión PostgreSQL local devolvió `ECONNREFUSED` y Docker no tenía un motor disponible. Se intentó aplicar la migración, pero no fue posible; la migración sigue pendiente. El cliente Prisma sí fue regenerado, por lo que hay que migrar la base antes de iniciar esta versión del backend.

La prueba `financial.integration.test.ts` reproduce en PostgreSQL una compra duplicada de 131.000, anula una, corrompe deliberadamente los acumulados y verifica que el efectivo esperado sea 169.000 y que contar 168.500 guarde un faltante de 500 tanto al cerrar como en el historial. Todo se ejecuta dentro de una transacción que se revierte.

La prueba de PostgreSQL queda **pendiente** mientras la base local y Docker estén apagados. No se afirma que el incidente productivo esté diagnosticado ni reparado; falta obtener sus movimientos, gastos, base inicial, conteo y versión desplegada. No se han modificado registros productivos.

## Antes de desplegar

1. Iniciar la base **local de pruebas**. Aplicar `20261003120000_expense_cancellation` y regenerar Prisma.
2. Desde `apps/backend`, ejecutar `RUN_DB_TESTS=true` para las pruebas de integración de gastos y conteo de turno (en PowerShell: `$env:RUN_DB_TESTS='true'`, luego ejecutar los archivos con Node y ts-node). Desactivar esa variable al terminar.
3. Probar la interfaz: gasto, reintento, anulación con motivo, lista de anulados, conteo, rechazo de cierre con saldo cambiado, cierre y detalle del historial. Probar también permisos de caja y administrador en otro punto.
4. Revisar el cierre reportado mediante lectura de sus datos, sin corregir importes históricos automáticamente.
5. Tomar respaldo productivo y desplegar juntos migración, backend y frontend solo después de validar los pasos anteriores.

El módulo de créditos queda condicionado a completar esta validación, según lo solicitado. Propuesta de alcance: venta fiada identificada por cliente, saldo por punto y abonos posteriores en un turno abierto, sin duplicar ventas ni inflar el efectivo al vender a crédito.
