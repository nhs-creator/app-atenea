import { describe, it, expect } from "bun:test";
import { formatFiscalNumber, buildAfipQrPayload } from "../../convex/lib/afipSdk";
import {
  validateCuit,
  validatePuntoVenta,
  validateRazonSocial,
  validateCondicionIva,
  validateIsoDate,
} from "../../convex/lib/afipValidators";

describe("formatFiscalNumber", () => {
  it("formatea Factura C correctamente", () => {
    expect(formatFiscalNumber(11, 2, 147)).toBe("C 00002-00000147");
  });

  it("formatea Factura A correctamente", () => {
    expect(formatFiscalNumber(1, 1, 1)).toBe("A 00001-00000001");
  });

  it("formatea Factura B correctamente", () => {
    expect(formatFiscalNumber(6, 3, 99999)).toBe("B 00003-00099999");
  });

  it("formatea Nota de Crédito C", () => {
    expect(formatFiscalNumber(13, 2, 5)).toBe("NC-C 00002-00000005");
  });

  it("maneja tipo desconocido", () => {
    expect(formatFiscalNumber(99, 1, 1)).toBe("99 00001-00000001");
  });
});

describe("buildAfipQrPayload", () => {
  it("genera URL válida con base64 decodificable", () => {
    const url = buildAfipQrPayload({
      ver: 1,
      fecha: "2026-07-01",
      cuit: 20418349973,
      ptoVta: 2,
      cbteTipo: 11,
      cbteNro: 1,
      importe: 50000,
      moneda: "PES",
      ctz: 1,
      tipoDocRec: 99,
      nroDocRec: 0,
      tipoCodAut: "E",
      codAut: 71234567890123,
    });

    expect(url).toMatch(/^https:\/\/www\.afip\.gob\.ar\/fe\/qr\/\?p=/);
    const decoded = JSON.parse(Buffer.from(url.split("?p=")[1], "base64").toString());
    expect(decoded.cuit).toBe(20418349973);
    expect(decoded.cbteTipo).toBe(11);
    expect(decoded.importe).toBe(50000);
  });
});

describe("validateCuit", () => {
  it("acepta un CUIT de 11 dígitos", () => {
    expect(() => validateCuit(20418349973)).not.toThrow();
  });

  it("rechaza un CUIT con menos de 11 dígitos", () => {
    expect(() => validateCuit(123)).toThrow();
  });

  it("rechaza un CUIT no entero o negativo", () => {
    expect(() => validateCuit(-1)).toThrow();
  });
});

describe("validatePuntoVenta", () => {
  it("acepta puntos de venta entre 1 y 99999", () => {
    expect(() => validatePuntoVenta(2)).not.toThrow();
  });

  it("rechaza 0 y valores fuera de rango", () => {
    expect(() => validatePuntoVenta(0)).toThrow();
    expect(() => validatePuntoVenta(100000)).toThrow();
  });
});

describe("validateRazonSocial", () => {
  it("rechaza vacío", () => {
    expect(() => validateRazonSocial("   ")).toThrow();
  });

  it("acepta un nombre válido", () => {
    expect(() => validateRazonSocial("Atenea Store SRL")).not.toThrow();
  });
});

describe("validateCondicionIva", () => {
  it("acepta códigos válidos de AFIP", () => {
    expect(() => validateCondicionIva(6)).not.toThrow();
    expect(() => validateCondicionIva(1)).not.toThrow();
  });

  it("rechaza códigos inválidos", () => {
    expect(() => validateCondicionIva(999)).toThrow();
  });
});

describe("validateIsoDate", () => {
  it("acepta formato YYYY-MM-DD", () => {
    expect(() => validateIsoDate("2026-07-01")).not.toThrow();
  });

  it("rechaza otros formatos", () => {
    expect(() => validateIsoDate("01/07/2026")).toThrow();
  });
});
