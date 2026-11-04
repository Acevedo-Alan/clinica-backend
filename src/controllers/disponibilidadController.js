import pool from "../database/db.js";
import { respuestaOk, respuestaError } from "../utils/respuesta.js";

// Duración fija de cada slot ofrecido como horario libre. crearTurno no exige
// que un turno caiga en esta grilla (no tiene concepto de duración, solo
// rechaza choques por "hora" exacta contra otro turno confirmado), así que
// alcanza con que todo lo que acá se ofrezca como libre sea una hora exacta
// que crearTurno vaya a aceptar: queda coherente sin tener que tocar esa
// validación ya probada.
const DURACION_SLOT_MINUTOS = 30;

// "YYYY-MM-DD" en hora local a partir de un Date o string, evitando el
// corrimiento de un día que da `new Date(string)` en husos detrás de UTC.
function fechaISO(fecha) {
  if (!(fecha instanceof Date)) {
    return String(fecha).slice(0, 10);
  }
  const yyyy = fecha.getFullYear();
  const mm = String(fecha.getMonth() + 1).padStart(2, "0");
  const dd = String(fecha.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function sumarMinutos(horaHHMM, minutos) {
  const [h, m] = horaHHMM.split(":").map(Number);
  const totalMinutos = h * 60 + m + minutos;
  const hh = String(Math.floor(totalMinutos / 60)).padStart(2, "0");
  const mm = String(totalMinutos % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

// GET /disponibilidad/fechas?id_medico=&id_especialidad=&id_sede=
// Fechas (hoy en adelante) en las que ese médico tiene agenda para esa
// especialidad y sede.
export async function fechasDisponibles(req, res) {
  try {
    const { id_medico, id_especialidad, id_sede } = req.query;

    if (!id_medico || !id_especialidad || !id_sede) {
      return respuestaError(res, 400, "Debe indicar id_medico, id_especialidad e id_sede");
    }

    const [filas] = await pool.query(
      `SELECT DISTINCT fecha FROM agenda
       WHERE id_medico = ? AND id_especialidad = ? AND id_sede = ? AND fecha >= CURDATE()
       ORDER BY fecha`,
      [id_medico, id_especialidad, id_sede]
    );

    return respuestaOk(res, 200, filas.map((f) => fechaISO(f.fecha)));
  } catch (error) {
    console.error("Error al obtener las fechas disponibles:", error);
    return respuestaError(res, 500, "Error al obtener las fechas disponibles");
  }
}

// GET /disponibilidad/horarios?id_medico=&fecha=&id_especialidad=&id_sede=
// Horarios libres (rangos de agenda menos turnos confirmados) para ese
// médico, esa fecha, especialidad y sede.
export async function horariosDisponibles(req, res) {
  try {
    const { id_medico, fecha, id_especialidad, id_sede } = req.query;

    if (!id_medico || !fecha || !id_especialidad || !id_sede) {
      return respuestaError(res, 400, "Debe indicar id_medico, fecha, id_especialidad e id_sede");
    }

    const hoy = fechaISO(new Date());
    if (fecha < hoy) {
      return respuestaOk(res, 200, []); // fecha pasada: ninguna sigue libre
    }

    const [bloques] = await pool.query(
      `SELECT id, hora_entrada, hora_salida FROM agenda
       WHERE id_medico = ? AND fecha = ? AND id_especialidad = ? AND id_sede = ?`,
      [id_medico, fecha, id_especialidad, id_sede]
    );

    if (bloques.length === 0) {
      return respuestaOk(res, 200, []);
    }

    const idsAgenda = bloques.map((b) => b.id);
    const [turnosConfirmados] = await pool.query(
      `SELECT hora FROM turno WHERE id_agenda IN (?) AND fecha = ? AND estado = 'confirmado'`,
      [idsAgenda, fecha]
    );
    const horasOcupadas = new Set(turnosConfirmados.map((t) => t.hora));

    const horaActual = fecha === hoy ? new Date().toTimeString().slice(0, 5) : null;

    const horariosLibres = [];
    for (const bloque of bloques) {
      let hora = bloque.hora_entrada;
      while (hora < bloque.hora_salida) {
        const yaPaso = horaActual !== null && hora < horaActual;
        if (!horasOcupadas.has(hora) && !yaPaso) {
          horariosLibres.push(hora);
        }
        hora = sumarMinutos(hora, DURACION_SLOT_MINUTOS);
      }
    }
    horariosLibres.sort();

    return respuestaOk(res, 200, horariosLibres);
  } catch (error) {
    console.error("Error al obtener los horarios disponibles:", error);
    return respuestaError(res, 500, "Error al obtener los horarios disponibles");
  }
}
