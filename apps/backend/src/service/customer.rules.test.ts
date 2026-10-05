import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCustomerIdentification, validateCustomerFiscalInput } from "./customer.rules";

test("normalizes a reusable fiscal customer", () => {
  const customer = validateCustomerFiscalInput({
    identificationType: "NIT",
    identification: " 900.123.456 ",
    verificationDigit: "7",
    organizationType: "LEGAL_ENTITY",
    name: "  Cliente de prueba SAS ",
    email: "FACTURAS@EJEMPLO.COM ",
    municipalityCode: "11001",
  });

  assert.equal(customer.identification, "900123456");
  assert.equal(customer.name, "Cliente de prueba SAS");
  assert.equal(customer.email, "facturas@ejemplo.com");
  assert.equal(customer.countryCode, "CO");
  assert.deepEqual(customer.responsibilities, ["R-99-PN"]);
});

test("rejects incomplete or malformed customer data", () => {
  assert.throws(() => normalizeCustomerIdentification("-"), /entre 3 y 30/);
  assert.throws(() => validateCustomerFiscalInput({
    identificationType: "CC",
    identification: "123456",
    name: "A",
  }), /nombre o razón social/);
  assert.throws(() => validateCustomerFiscalInput({
    identificationType: "CC",
    identification: "123456",
    name: "Ana Pérez",
    email: "correo-invalido",
  }), /correo/);
});
