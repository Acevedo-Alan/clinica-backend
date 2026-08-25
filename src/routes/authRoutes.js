import { Router } from "express";
import { registro, login, perfil, listarUsuarios } from "../controllers/authController.js";
import { verificarToken, verificarRol } from "../middlewares/auth.js";

const router = Router();

// Públicas
router.post("/registro", registro);
router.post("/login", login);

// Protegida solo por verificarToken (cualquier rol autenticado)
router.get("/perfil", verificarToken, perfil);

// Protegida por verificarToken + verificarRol (solo admin u operador)
router.get("/usuarios", verificarToken, verificarRol("administrador", "operador"), listarUsuarios);

export default router;
