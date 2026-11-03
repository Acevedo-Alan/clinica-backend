import { test } from "node:test";
import assert from "node:assert/strict";

import pool from "../../src/database/db.js";
import { obtenerReportes } from "../../src/controllers/reportesController.js";
import { mockRes, mockQuery } from "../helpers/http.js";

test("obtenerReportes devuelve los cuatro indicadores combinados", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/GROUP BY a\.id_especialidad/, [[{ id_especialidad: 1, descripcion: "Traumatologia", cantidad: 5 }]]],
      [/GROUP BY a\.id_sede/, [[{ id_sede: 1, nombre: "Sede Centro", cantidad: 5 }]]],
      [/GROUP BY a\.id_medico/, [[{ id_medico: 3, nombre: "Juan", apellido: "Perez", cantidad: 4 }]]],
      [/SUM\(CASE WHEN t\.estado = 'cancelado'/, [[{ total: 10, cancelados: 2 }]]],
    ])
  );

  const req = { query: {} };
  const res = mockRes();

  await obtenerReportes(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.datos.turnosPorEspecialidad.length, 1);
  assert.equal(res.body.datos.turnosPorSede.length, 1);
  assert.equal(res.body.datos.rankingMedicos.length, 1);
  assert.deepEqual(res.body.datos.tasaCancelacion, { total: 10, cancelados: 2, porcentaje: 20 });
});

test("obtenerReportes calcula 0% de cancelacion cuando no hay turnos", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/GROUP BY a\.id_especialidad/, [[]]],
      [/GROUP BY a\.id_sede/, [[]]],
      [/GROUP BY a\.id_medico/, [[]]],
      [/SUM\(CASE WHEN t\.estado = 'cancelado'/, [[{ total: 0, cancelados: null }]]],
    ])
  );

  const req = { query: {} };
  const res = mockRes();

  await obtenerReportes(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.datos.tasaCancelacion, { total: 0, cancelados: 0, porcentaje: 0 });
});
