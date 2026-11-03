import { test } from "node:test";
import assert from "node:assert/strict";

import pool from "../../src/database/db.js";
import { listarAuditoria } from "../../src/controllers/auditoriaController.js";
import { mockRes, mockQuery } from "../helpers/http.js";

test("listarAuditoria devuelve el listado paginado sin filtros", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/SELECT COUNT\(\*\) AS total/, [[{ total: 2 }]]],
      [/FROM log_auditoria l/, [[{ id: 1, accion: "ALTA" }, { id: 2, accion: "BAJA" }]]],
    ])
  );

  const req = { query: {} };
  const res = mockRes();

  await listarAuditoria(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.datos.total, 2);
  assert.equal(res.body.datos.items.length, 2);
});

test("listarAuditoria aplica los filtros de usuario, entidad y rango de fechas", async (t) => {
  const llamadas = [];
  t.mock.method(pool, "query", async (sql, valores) => {
    llamadas.push({ sql, valores });
    if (/SELECT COUNT/.test(sql)) return [[{ total: 0 }]];
    return [[]];
  });

  const req = {
    query: { usuario: "Perez", entidad: "turno", desde: "2026-01-01", hasta: "2026-01-31" },
  };
  const res = mockRes();

  await listarAuditoria(req, res);

  assert.equal(res.statusCode, 200);
  const llamadaCount = llamadas.find(({ sql }) => /SELECT COUNT/.test(sql));
  assert.match(llamadaCount.sql, /u\.nombre LIKE \? OR u\.apellido LIKE \?/);
  assert.match(llamadaCount.sql, /l\.entidad = \?/);
  assert.match(llamadaCount.sql, /l\.fecha >= \?/);
  assert.match(llamadaCount.sql, /l\.fecha <= \?/);
  assert.deepEqual(llamadaCount.valores, [
    "%Perez%",
    "%Perez%",
    "turno",
    "2026-01-01 00:00:00",
    "2026-01-31 23:59:59",
  ]);
});
