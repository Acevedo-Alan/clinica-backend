import { test } from "node:test";
import assert from "node:assert/strict";

import pool from "../../src/database/db.js";
import { crearTurno } from "../../src/controllers/turnoController.js";
import { mockRes, mockQuery } from "../helpers/http.js";

// Misma lógica que fechaISO() en turnoController.js, para construir la fecha
// de "hoy" que usa el mock de agenda sin duplicar el controller completo.
function fechaISO(fecha) {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

test("crearTurno rechaza una agenda con fecha pasada", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [
        /FROM agenda WHERE id = \?/,
        [[{ id: 1, fecha: "2000-01-01", hora_entrada: "08:00", hora_salida: "12:00" }]],
      ],
    ])
  );

  const req = {
    body: { id_agenda: 1, hora: "09:00", nota: "control" },
    usuario: { rol: "paciente", id: 7 },
  };
  const res = mockRes();

  await crearTurno(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.estado, /fecha pasada/);
});

test("crearTurno rechaza un horario de hoy que ya pasó", async (t) => {
  const hoy = fechaISO(new Date());
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/FROM agenda WHERE id = \?/, [[{ id: 1, fecha: hoy, hora_entrada: "00:00", hora_salida: "23:59" }]]],
    ])
  );

  const req = {
    body: { id_agenda: 1, hora: "00:00", nota: "control" },
    usuario: { rol: "paciente", id: 7 },
  };
  const res = mockRes();

  await crearTurno(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.estado, /ya pasó/);
});
