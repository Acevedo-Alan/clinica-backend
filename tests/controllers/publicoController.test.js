import { test } from "node:test";
import assert from "node:assert/strict";

import pool from "../../src/database/db.js";
import { datosLanding } from "../../src/controllers/publicoController.js";
import { mockRes, mockQuery } from "../helpers/http.js";

test("datosLanding agrupa las especialidades de cada médico y no expone datos privados", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/FROM especialidad ORDER BY/, [[{ id: 1, descripcion: "Cardiología" }]]],
      [/FROM sede ORDER BY/, [[{ id: 1, nombre: "Sede Centro", direccion: "San Martín 123", telefono: "3424000001" }]]],
      [/FROM cobertura ORDER BY/, [[{ id: 1, nombre: "Jerarquicos" }]]],
      [
        /FROM usuario u/,
        [
          [
            { id: 5, nombre: "Laura", apellido: "Mendez", especialidad: "Clínica médica" },
            { id: 5, nombre: "Laura", apellido: "Mendez", especialidad: "Pediatría" },
            { id: 6, nombre: "Martin", apellido: "Rios", especialidad: "Cardiología" },
          ],
        ],
      ],
    ])
  );

  const res = mockRes();
  await datosLanding({}, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.datos.medicos.length, 2);
  assert.deepEqual(res.body.datos.medicos[0].especialidades, ["Clínica médica", "Pediatría"]);
  assert.equal(res.body.datos.sedes[0].nombre, "Sede Centro");
  assert.equal(res.body.datos.coberturas[0].nombre, "Jerarquicos");
  const texto = JSON.stringify(res.body.datos);
  assert.doesNotMatch(texto, /dni|email|password/i);
});

test("datosLanding responde 500 si falla la base", async (t) => {
  t.mock.method(pool, "query", async () => {
    throw new Error("caída");
  });
  t.mock.method(console, "error", () => {});

  const res = mockRes();
  await datosLanding({}, res);

  assert.equal(res.statusCode, 500);
});
