import express from "express";
import cors from "cors";
import pool from "./database/db.js";
import { respuestaOk, respuestaError } from "./utils/respuesta.js";

import authRoutes from "./routes/authRoutes.js";
import coberturaRoutes from "./routes/coberturaRoutes.js";
import sedeRoutes from "./routes/sedeRoutes.js";
import especialidadRoutes from "./routes/especialidadRoutes.js";
import agendaRoutes from "./routes/agendaRoutes.js";
import turnoRoutes from "./routes/turnoRoutes.js";
import historialRoutes from "./routes/historialRoutes.js";
import notificacionRoutes from "./routes/notificacionRoutes.js";
import auditoriaRoutes from "./routes/auditoriaRoutes.js";
import reportesRoutes from "./routes/reportesRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

// GET /health - prueba la conexión a la base antes de avanzar con el resto
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    return respuestaOk(res, 200, { mensaje: "Servidor arriba y conectado a la base de datos" });
  } catch (error) {
    console.error("Error de conexión a la base:", error);
    return respuestaError(res, 500, "No se pudo conectar a la base de datos");
  }
});

app.use("/auth", authRoutes);
app.use("/coberturas", coberturaRoutes);
app.use("/sedes", sedeRoutes);
app.use("/especialidades", especialidadRoutes);
app.use("/agenda", agendaRoutes);
app.use("/turnos", turnoRoutes);
app.use("/historial", historialRoutes);
app.use("/notificaciones", notificacionRoutes);
app.use("/auditoria", auditoriaRoutes);
app.use("/reportes", reportesRoutes);

// 404 - también respeta el formato uniforme
app.use((req, res) => {
  return respuestaError(res, 404, "Recurso no encontrado");
});

export default app;
