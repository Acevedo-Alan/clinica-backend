import { test } from "node:test";
import assert from "node:assert/strict";

import pool from "../../src/database/db.js";
import { fechasDisponibles, horariosDisponibles } from "../../src/controllers/disponibilidadController.js";
import { mockRes, mockQuery } from "../helpers/http.js";

test("fechasDisponibles rechaza si faltan parametros", async () => {
  const req = { query: { id_medico: 1 } };
  const res = mockRes();

  await fechasDisponibles(req, res);

  assert.equal(res.statusCode, 400);
});

test("fechasDisponibles devuelve las fechas como YYYY-MM-DD aunque la base las de como Date", async (t) => {
  // Replica el bug de fechaISO ya corregido en turnoController: si esto
  // volviera a pasar un objeto Date por new Date(string), en UTC-3
  // "2026-11-04" se correria a "2026-11-03".
  t.mock.method(
    pool,
    "query",
    mockQuery([[/FROM agenda/, [[{ fecha: new Date(2026, 10, 4) }, { fecha: "2026-11-05" }]]]])
  );

  const req = { query: { id_medico: 1, id_especialidad: 1, id_sede: 1 } };
  const res = mockRes();

  await fechasDisponibles(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.datos, ["2026-11-04", "2026-11-05"]);
});

test("horariosDisponibles rechaza si faltan parametros", async () => {
  const req = { query: { id_medico: 1 } };
  const res = mockRes();

  await horariosDisponibles(req, res);

  assert.equal(res.statusCode, 400);
});

test("horariosDisponibles devuelve [] si la fecha ya paso", async () => {
  const req = { query: { id_medico: 1, fecha: "2000-01-01", id_especialidad: 1, id_sede: 1 } };
  const res = mockRes();

  await horariosDisponibles(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.datos, []);
});

test("horariosDisponibles devuelve [] si el medico no tiene agenda ese dia/especialidad/sede", async (t) => {
  t.mock.method(pool, "query", mockQuery([[/FROM agenda\s+WHERE/, [[]]]]));

  const req = { query: { id_medico: 1, fecha: "2999-01-01", id_especialidad: 1, id_sede: 1 } };
  const res = mockRes();

  await horariosDisponibles(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.datos, []);
});

test("horariosDisponibles genera slots de 30 minutos excluyendo los ya ocupados", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/FROM agenda\s+WHERE/, [[{ id: 1, hora_entrada: "09:00", hora_salida: "10:30" }]]],
      [/FROM turno WHERE id_agenda IN/, [[{ hora: "09:30" }]]],
    ])
  );

  const req = { query: { id_medico: 1, fecha: "2999-01-01", id_especialidad: 1, id_sede: 1 } };
  const res = mockRes();

  await horariosDisponibles(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.datos, ["09:00", "10:00"]);
});

test("horariosDisponibles combina varios bloques de agenda del mismo dia", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [
        /FROM agenda\s+WHERE/,
        [
          [
            { id: 1, hora_entrada: "09:00", hora_salida: "10:00" },
            { id: 2, hora_entrada: "15:00", hora_salida: "16:00" },
          ],
        ],
      ],
      [/FROM turno WHERE id_agenda IN/, [[]]],
    ])
  );

  const req = { query: { id_medico: 1, fecha: "2999-01-01", id_especialidad: 1, id_sede: 1 } };
  const res = mockRes();

  await horariosDisponibles(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.datos, ["09:00", "09:30", "15:00", "15:30"]);
});
