import { Router } from "express";
import { registro, login, perfil, actualizarPerfil, cambiarPassword } from "../controllers/authController.js";
import { verificarToken } from "../middlewares/auth.js";

const router = Router();

// Públicas
router.post("/registro", registro);
router.post("/login", login);

// Protegidas solo por verificarToken (cualquier rol autenticado, sobre sus propios datos)
router.get("/perfil", verificarToken, perfil);
router.put("/perfil", verificarToken, actualizarPerfil);
router.put("/password", verificarToken, cambiarPassword);

export default router;
