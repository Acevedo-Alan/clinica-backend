import { test } from "node:test";
import assert from "node:assert/strict";

import pool from "../../src/database/db.js";
import {
  crearTurno,
  reprogramarTurno,
  cancelarTurno,
  atenderTurno,
  turnosMedico,
  turnosSede,
  misTurnos,
} from "../../src/controllers/turnoController.js";
import { mockRes, mockQuery } from "../helpers/http.js";

// La fecha de la agenda importa poco una vez pasado el chequeo de fecha/hora
// pasada (ya cubierto arriba), asi que estos tests usan una fecha futura fija.
const AGENDA_FUTURA = { id: 1, fecha: "2999-01-01", hora_entrada: "08:00", hora_salida: "12:00" };

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

test("crearTurno rechaza si ya hay un turno confirmado en ese horario", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/FROM agenda WHERE id = \?/, [[AGENDA_FUTURA]]],
      [/FROM turno\s+WHERE id_agenda = \? AND fecha = \? AND hora = \? AND estado/, [[{ id: 5 }]]],
    ])
  );

  const req = {
    body: { id_agenda: 1, hora: "09:00", nota: "control" },
    usuario: { rol: "paciente", id: 7 },
  };
  const res = mockRes();

  await crearTurno(req, res);

  assert.equal(res.statusCode, 409);
});

test("crearTurno crea el turno cuando todo es valido", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/FROM agenda WHERE id = \?/, [[AGENDA_FUTURA]]],
      [/FROM turno\s+WHERE id_agenda = \? AND fecha = \? AND hora = \? AND estado/, [[]]],
      [/id_cobertura FROM usuario WHERE id = \?/, [[{ id_cobertura: 2 }]]],
      [/INSERT INTO turno/, [{ insertId: 50 }]],
      [/INSERT INTO notificacion/, [{}]],
      [/INSERT INTO log_auditoria/, [{}]],
    ])
  );

  const req = {
    body: { id_agenda: 1, hora: "09:00", nota: "control" },
    usuario: { rol: "paciente", id: 7 },
  };
  const res = mockRes();

  await crearTurno(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.datos.id, 50);
  assert.equal(res.body.datos.estado, "confirmado");
});

test("reprogramarTurno responde 404 si el turno no existe", async (t) => {
  t.mock.method(pool, "query", mockQuery([[/FROM turno t/, [[]]]]));

  const req = {
    params: { id: 1 },
    body: { id_agenda: 2, hora: "09:00" },
    usuario: { rol: "paciente", id: 7 },
  };
  const res = mockRes();

  await reprogramarTurno(req, res);

  assert.equal(res.statusCode, 404);
});

test("reprogramarTurno rechaza si un paciente intenta reprogramar el turno de otro", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([[/FROM turno t/, [[{ id: 1, estado: "confirmado", id_paciente: 7, id_sede: 1 }]]]])
  );

  const req = {
    params: { id: 1 },
    body: { id_agenda: 2, hora: "09:00" },
    usuario: { rol: "paciente", id: 999 },
  };
  const res = mockRes();

  await reprogramarTurno(req, res);

  assert.equal(res.statusCode, 403);
});

test("reprogramarTurno rechaza un turno que ya no esta confirmado", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([[/FROM turno t/, [[{ id: 1, estado: "cancelado", id_paciente: 7, id_sede: 1 }]]]])
  );

  const req = {
    params: { id: 1 },
    body: { id_agenda: 2, hora: "09:00" },
    usuario: { rol: "paciente", id: 7 },
  };
  const res = mockRes();

  await reprogramarTurno(req, res);

  assert.equal(res.statusCode, 409);
});

test("reprogramarTurno rechaza si la nueva agenda no existe", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/FROM turno t/, [[{ id: 1, estado: "confirmado", id_paciente: 7, id_sede: 1 }]]],
      [/FROM agenda WHERE id = \?/, [[]]],
    ])
  );

  const req = {
    params: { id: 1 },
    body: { id_agenda: 2, hora: "09:00" },
    usuario: { rol: "paciente", id: 7 },
  };
  const res = mockRes();

  await reprogramarTurno(req, res);

  assert.equal(res.statusCode, 400);
});

test("reprogramarTurno rechaza un horario ya ocupado en la nueva agenda", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/FROM turno t/, [[{ id: 1, estado: "confirmado", id_paciente: 7, id_sede: 1 }]]],
      [/FROM agenda WHERE id = \?/, [[AGENDA_FUTURA]]],
      [/FROM turno\s+WHERE id_agenda = \? AND fecha = \? AND hora = \? AND estado = 'confirmado' AND id <> \?/, [[{ id: 99 }]]],
    ])
  );

  const req = {
    params: { id: 1 },
    body: { id_agenda: 1, hora: "09:00" },
    usuario: { rol: "paciente", id: 7 },
  };
  const res = mockRes();

  await reprogramarTurno(req, res);

  assert.equal(res.statusCode, 409);
});

test("reprogramarTurno mueve el turno a la nueva agenda/hora", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/FROM turno t/, [[{ id: 1, estado: "confirmado", id_paciente: 7, id_sede: 1 }]]],
      [/FROM agenda WHERE id = \?/, [[AGENDA_FUTURA]]],
      [/FROM turno\s+WHERE id_agenda = \? AND fecha = \? AND hora = \? AND estado = 'confirmado' AND id <> \?/, [[]]],
      [/UPDATE turno SET id_agenda/, [{}]],
      [/INSERT INTO notificacion/, [{}]],
      [/INSERT INTO log_auditoria/, [{}]],
    ])
  );

  const req = {
    params: { id: 1 },
    body: { id_agenda: 1, hora: "09:00" },
    usuario: { rol: "paciente", id: 7 },
  };
  const res = mockRes();

  await reprogramarTurno(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.datos.id_agenda, 1);
  assert.equal(res.body.datos.hora, "09:00");
});

test("reprogramarTurno permite a un medico reprogramar su turno en una sede distinta a la suya", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/FROM turno t/, [[{ id: 1, estado: "confirmado", id_medico: 3, id_sede: 2 }]]],
      [/FROM agenda WHERE id = \?/, [[AGENDA_FUTURA]]],
      [/FROM turno\s+WHERE id_agenda = \? AND fecha = \? AND hora = \? AND estado = 'confirmado' AND id <> \?/, [[]]],
      [/UPDATE turno SET id_agenda/, [{}]],
      [/INSERT INTO notificacion/, [{}]],
      [/INSERT INTO log_auditoria/, [{}]],
    ])
  );

  // El medico tiene id_sede=1 en su propio token, pero el turno es de la sede 2
  // (una de las otras sedes donde atiende): debe poder reprogramarlo igual.
  const req = {
    params: { id: 1 },
    body: { id_agenda: 1, hora: "09:00" },
    usuario: { rol: "medico", id: 3, id_sede: 1 },
  };
  const res = mockRes();

  await reprogramarTurno(req, res);

  assert.equal(res.statusCode, 200);
});

test("reprogramarTurno rechaza a un medico reprogramando el turno de otro medico", async (t) => {
  t.mock.method(pool, "query", mockQuery([[/FROM turno t/, [[{ id: 1, estado: "confirmado", id_medico: 999, id_sede: 1 }]]]]));

  const req = {
    params: { id: 1 },
    body: { id_agenda: 1, hora: "09:00" },
    usuario: { rol: "medico", id: 3, id_sede: 1 },
  };
  const res = mockRes();

  await reprogramarTurno(req, res);

  assert.equal(res.statusCode, 403);
});

test("cancelarTurno responde 404 si el turno no existe", async (t) => {
  t.mock.method(pool, "query", mockQuery([[/FROM turno t/, [[]]]]));

  const req = { params: { id: 1 }, usuario: { rol: "paciente", id: 7 } };
  const res = mockRes();

  await cancelarTurno(req, res);

  assert.equal(res.statusCode, 404);
});

test("cancelarTurno rechaza si un paciente intenta cancelar el turno de otro", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([[/FROM turno t/, [[{ id: 1, estado: "confirmado", id_paciente: 7, id_sede: 1 }]]]])
  );

  const req = { params: { id: 1 }, usuario: { rol: "paciente", id: 999 } };
  const res = mockRes();

  await cancelarTurno(req, res);

  assert.equal(res.statusCode, 403);
});

test("cancelarTurno rechaza a un operador de otra sede", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([[/FROM turno t/, [[{ id: 1, estado: "confirmado", id_paciente: 7, id_sede: 1 }]]]])
  );

  const req = { params: { id: 1 }, usuario: { rol: "operador", id: 50, id_sede: 2 } };
  const res = mockRes();

  await cancelarTurno(req, res);

  assert.equal(res.statusCode, 403);
});

test("cancelarTurno permite a un medico cancelar su turno en una sede distinta a la suya", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/FROM turno t/, [[{ id: 1, estado: "confirmado", id_paciente: 7, id_medico: 3, id_sede: 2, fecha: "2999-01-01", hora: "09:00" }]]],
      [/UPDATE turno SET estado = 'cancelado'/, [{}]],
      [/INSERT INTO notificacion/, [{}]],
      [/INSERT INTO log_auditoria/, [{}]],
    ])
  );

  // El medico tiene id_sede=1 en su propio token, pero el turno es de la sede 2.
  const req = { params: { id: 1 }, usuario: { rol: "medico", id: 3, id_sede: 1 } };
  const res = mockRes();

  await cancelarTurno(req, res);

  assert.equal(res.statusCode, 200);
});

test("cancelarTurno rechaza a un medico cancelando el turno de otro medico", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([[/FROM turno t/, [[{ id: 1, estado: "confirmado", id_paciente: 7, id_medico: 999, id_sede: 1 }]]]])
  );

  const req = { params: { id: 1 }, usuario: { rol: "medico", id: 3, id_sede: 1 } };
  const res = mockRes();

  await cancelarTurno(req, res);

  assert.equal(res.statusCode, 403);
});

test("cancelarTurno rechaza un turno que ya no esta confirmado", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([[/FROM turno t/, [[{ id: 1, estado: "cancelado", id_paciente: 7, id_sede: 1 }]]]])
  );

  const req = { params: { id: 1 }, usuario: { rol: "paciente", id: 7 } };
  const res = mockRes();

  await cancelarTurno(req, res);

  assert.equal(res.statusCode, 409);
});

test("cancelarTurno cancela el propio turno del paciente", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/FROM turno t/, [[{ id: 1, estado: "confirmado", id_paciente: 7, id_sede: 1, fecha: "2999-01-01", hora: "09:00" }]]],
      [/UPDATE turno SET estado = 'cancelado'/, [{}]],
      [/INSERT INTO notificacion/, [{}]],
      [/INSERT INTO log_auditoria/, [{}]],
    ])
  );

  const req = { params: { id: 1 }, usuario: { rol: "paciente", id: 7 } };
  const res = mockRes();

  await cancelarTurno(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.datos.estado, "cancelado");
});

test("atenderTurno responde 404 si el turno no existe", async (t) => {
  t.mock.method(pool, "query", mockQuery([[/FROM turno t/, [[]]]]));

  const req = { params: { id: 1 }, usuario: { id: 3 } };
  const res = mockRes();

  await atenderTurno(req, res);

  assert.equal(res.statusCode, 404);
});

test("atenderTurno rechaza si el medico no es el de la agenda", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([[/FROM turno t/, [[{ id: 1, estado: "confirmado", id_medico: 3, id_paciente: 7 }]]]])
  );

  const req = { params: { id: 1 }, usuario: { id: 999 } };
  const res = mockRes();

  await atenderTurno(req, res);

  assert.equal(res.statusCode, 403);
});

test("atenderTurno rechaza un turno que ya no esta confirmado", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([[/FROM turno t/, [[{ id: 1, estado: "atendido", id_medico: 3, id_paciente: 7 }]]]])
  );

  const req = { params: { id: 1 }, usuario: { id: 3 } };
  const res = mockRes();

  await atenderTurno(req, res);

  assert.equal(res.statusCode, 409);
});

test("atenderTurno marca el turno como atendido", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/FROM turno t/, [[{ id: 1, estado: "confirmado", id_medico: 3, id_paciente: 7, fecha: "2999-01-01", hora: "09:00" }]]],
      [/UPDATE turno SET estado = 'atendido'/, [{}]],
      [/INSERT INTO notificacion/, [{}]],
      [/INSERT INTO log_auditoria/, [{}]],
    ])
  );

  const req = { params: { id: 1 }, usuario: { id: 3 } };
  const res = mockRes();

  await atenderTurno(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.datos.estado, "atendido");
});

test("turnosMedico rechaza si falta la fecha", async () => {
  const req = { query: {}, usuario: { id: 3 } };
  const res = mockRes();

  await turnosMedico(req, res);

  assert.equal(res.statusCode, 400);
});

test("turnosMedico lista los turnos del medico autenticado para esa fecha", async (t) => {
  t.mock.method(pool, "query", mockQuery([[/WHERE a\.id_medico = \?/, [[{ id: 1 }]]]]));

  const req = { query: { fecha: "2999-01-01" }, usuario: { id: 3 } };
  const res = mockRes();

  await turnosMedico(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.datos.length, 1);
});

test("turnosSede rechaza si falta la fecha", async () => {
  const req = { query: {}, usuario: { id_sede: 1 } };
  const res = mockRes();

  await turnosSede(req, res);

  assert.equal(res.statusCode, 400);
});

test("turnosSede lista los turnos de la sede para esa fecha", async (t) => {
  t.mock.method(pool, "query", mockQuery([[/WHERE a\.id_sede = \?/, [[{ id: 1 }]]]]));

  const req = { query: { fecha: "2999-01-01" }, usuario: { id_sede: 1 } };
  const res = mockRes();

  await turnosSede(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.datos.length, 1);
});

test("misTurnos devuelve el listado paginado del paciente autenticado", async (t) => {
  t.mock.method(
    pool,
    "query",
    mockQuery([
      [/SELECT COUNT\(\*\) AS total FROM turno WHERE id_paciente = \?/, [[{ total: 1 }]]],
      [/FROM turno WHERE id_paciente = \? ORDER BY fecha ASC, hora ASC LIMIT/, [[{ id: 1 }]]],
    ])
  );

  const req = { query: {}, usuario: { id: 7 } };
  const res = mockRes();

  await misTurnos(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.datos.total, 1);
  assert.equal(res.body.datos.items.length, 1);
});
