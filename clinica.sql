-- phpMyAdmin SQL Dump (adaptado)
-- Base de datos: `clinica` — versión ampliada para TP integrador
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

CREATE DATABASE IF NOT EXISTS `clinica` DEFAULT CHARACTER SET utf8mb4;
USE `clinica`;

-- --------------------------------------------------------
-- Estructura de tabla para la tabla `sede`
-- --------------------------------------------------------

CREATE TABLE `sede` (
  `id` tinyint(4) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `direccion` varchar(100) NOT NULL,
  `telefono` varchar(15) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

INSERT INTO `sede` (`id`, `nombre`, `direccion`, `telefono`) VALUES
(1, 'Sede Centro', 'San Martín 123', '3424000001'),
(2, 'Sede Norte', 'Av. Rivadavia 456', '3424000002');

-- --------------------------------------------------------
-- Estructura de tabla para la tabla `cobertura`
-- --------------------------------------------------------

CREATE TABLE `cobertura` (
  `id` tinyint(4) NOT NULL,
  `nombre` varchar(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

INSERT INTO `cobertura` (`id`, `nombre`) VALUES
(1, 'Jerarquicos');

-- --------------------------------------------------------
-- Estructura de tabla para la tabla `especialidad`
-- --------------------------------------------------------

CREATE TABLE `especialidad` (
  `id` tinyint(4) NOT NULL,
  `descripcion` varchar(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

INSERT INTO `especialidad` (`id`, `descripcion`) VALUES
(1, 'Traumatologia');

-- --------------------------------------------------------
-- Estructura de tabla para la tabla `usuario`
-- --------------------------------------------------------

CREATE TABLE `usuario` (
  `id` tinyint(4) NOT NULL,
  `apellido` varchar(30) NOT NULL,
  `nombre` varchar(30) NOT NULL,
  `fecha_nacimiento` date NOT NULL,
  `password` varchar(255) NOT NULL,
  `rol` varchar(20) NOT NULL,
  `email` varchar(30) NOT NULL,
  `telefono` varchar(10) NOT NULL,
  `dni` varchar(8) NOT NULL,
  `id_sede` tinyint(4) DEFAULT NULL,
  `id_cobertura` tinyint(4) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

-- Nota: los valores de `password` deben cargarse ya hasheados con bcrypt desde el backend.
INSERT INTO `usuario` (`id`, `apellido`, `nombre`, `fecha_nacimiento`, `password`, `rol`, `email`, `telefono`, `dni`, `id_sede`, `id_cobertura`) VALUES
(1, 'Perez', 'Juan', '1995-12-30', '$2b$10$hashdeejemplo1', 'operador', 'jperez@gmail.com', '3424568897', '15200548', 1, NULL),
(2, 'Friggeri', 'Franco', '1998-03-14', '$2b$10$hashdeejemplo2', 'paciente', 'asdas@gaasds.com', '342545555', '36000960', NULL, 1),
(3, 'Lopez', 'Ana', '1980-05-10', '$2b$10$hashdeejemplo3', 'medico', 'alopez@clinica.com', '3424111222', '20111222', 1, NULL),
(4, 'Gomez', 'Marcos', '1975-08-01', '$2b$10$hashdeejemplo4', 'admin', 'mgomez@clinica.com', '3424222333', '18222333', NULL, NULL);

-- --------------------------------------------------------
-- Estructura de tabla para la tabla `medico_especialidad`
-- --------------------------------------------------------

CREATE TABLE `medico_especialidad` (
  `id` tinyint(4) NOT NULL,
  `id_medico` tinyint(4) NOT NULL,
  `id_especialidad` tinyint(4) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

INSERT INTO `medico_especialidad` (`id`, `id_medico`, `id_especialidad`) VALUES
(1, 3, 1);

-- --------------------------------------------------------
-- Estructura de tabla para la tabla `agenda`
-- --------------------------------------------------------

CREATE TABLE `agenda` (
  `id` tinyint(4) NOT NULL,
  `hora_entrada` varchar(5) NOT NULL,
  `hora_salida` varchar(5) NOT NULL,
  `fecha` date NOT NULL,
  `id_medico` tinyint(4) NOT NULL,
  `id_especialidad` tinyint(4) NOT NULL,
  `id_sede` tinyint(4) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

INSERT INTO `agenda` (`id`, `hora_entrada`, `hora_salida`, `fecha`, `id_medico`, `id_especialidad`, `id_sede`) VALUES
(2, '15:00', '20:00', '2025-10-20', 3, 1, 1);

-- --------------------------------------------------------
-- Estructura de tabla para la tabla `turno`
-- --------------------------------------------------------

CREATE TABLE `turno` (
  `id` tinyint(4) NOT NULL,
  `nota` varchar(40) DEFAULT NULL,
  `id_agenda` tinyint(11) NOT NULL,
  `fecha` date DEFAULT NULL,
  `hora` varchar(5) DEFAULT NULL,
  `id_paciente` tinyint(11) NOT NULL,
  `id_cobertura` tinyint(4) NOT NULL,
  `estado` varchar(20) NOT NULL DEFAULT 'confirmado'
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

INSERT INTO `turno` (`id`, `nota`, `id_agenda`, `fecha`, `hora`, `id_paciente`, `id_cobertura`, `estado`) VALUES
(2, 'Control de estudio', 2, '2025-10-27', '15:30', 2, 1, 'atendido');

-- --------------------------------------------------------
-- Estructura de tabla para la tabla `historial_clinico`
-- --------------------------------------------------------

CREATE TABLE `historial_clinico` (
  `id` tinyint(4) NOT NULL,
  `id_turno` tinyint(4) NOT NULL,
  `id_medico` tinyint(4) NOT NULL,
  `id_paciente` tinyint(4) NOT NULL,
  `diagnostico` varchar(255) NOT NULL,
  `tratamiento` varchar(255) DEFAULT NULL,
  `observaciones` varchar(255) DEFAULT NULL,
  `fecha_registro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

INSERT INTO `historial_clinico` (`id`, `id_turno`, `id_medico`, `id_paciente`, `diagnostico`, `tratamiento`, `observaciones`, `fecha_registro`) VALUES
(1, 2, 3, 2, 'Esguince de tobillo grado I', 'Reposo y antiinflamatorios', 'Control en 15 dias', '2025-10-27 16:00:00');

-- --------------------------------------------------------
-- Estructura de tabla para la tabla `log_auditoria`
-- --------------------------------------------------------

CREATE TABLE `log_auditoria` (
  `id` tinyint(4) NOT NULL,
  `id_usuario` tinyint(4) NOT NULL,
  `accion` varchar(20) NOT NULL,
  `entidad` varchar(30) NOT NULL,
  `id_entidad` tinyint(4) DEFAULT NULL,
  `detalle` varchar(255) DEFAULT NULL,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

INSERT INTO `log_auditoria` (`id`, `id_usuario`, `accion`, `entidad`, `id_entidad`, `detalle`, `fecha`) VALUES
(1, 4, 'ALTA', 'usuario', 2, 'Alta de paciente Friggeri Franco', '2025-10-01 10:00:00');

-- --------------------------------------------------------
-- Estructura de tabla para la tabla `notificacion`
-- --------------------------------------------------------

CREATE TABLE `notificacion` (
  `id` tinyint(4) NOT NULL,
  `id_usuario` tinyint(4) NOT NULL,
  `tipo` varchar(30) NOT NULL,
  `mensaje` varchar(255) NOT NULL,
  `leida` tinyint(1) NOT NULL DEFAULT 0,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

INSERT INTO `notificacion` (`id`, `id_usuario`, `tipo`, `mensaje`, `leida`, `fecha`) VALUES
(1, 2, 'turno_confirmado', 'Tu turno del 27/10/2025 a las 15:30 fue confirmado.', 1, '2025-10-01 09:00:00'),
(2, 3, 'turno_atendido', 'Registraste el turno de Franco Friggeri como atendido.', 0, '2025-10-27 16:00:00');

--
-- Índices para tablas volcadas
--
ALTER TABLE `sede` ADD PRIMARY KEY (`id`);
ALTER TABLE `cobertura` ADD PRIMARY KEY (`id`);
ALTER TABLE `especialidad` ADD PRIMARY KEY (`id`);

ALTER TABLE `usuario`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_sede` (`id_sede`),
  ADD KEY `id_cobertura` (`id_cobertura`);

ALTER TABLE `medico_especialidad`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_medico` (`id_medico`),
  ADD KEY `id_especialidad` (`id_especialidad`);

ALTER TABLE `agenda`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_especialidad` (`id_especialidad`),
  ADD KEY `id_medico` (`id_medico`),
  ADD KEY `id_sede` (`id_sede`);

ALTER TABLE `turno`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_agenda` (`id_agenda`),
  ADD KEY `id_paciente` (`id_paciente`),
  ADD KEY `id_cobertura` (`id_cobertura`);

ALTER TABLE `historial_clinico`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_turno` (`id_turno`),
  ADD KEY `id_medico` (`id_medico`),
  ADD KEY `id_paciente` (`id_paciente`);

ALTER TABLE `log_auditoria`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_usuario` (`id_usuario`);

ALTER TABLE `notificacion`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_usuario` (`id_usuario`);

--
-- AUTO_INCREMENT de las tablas volcadas
--
ALTER TABLE `sede` MODIFY `id` tinyint(4) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
ALTER TABLE `cobertura` MODIFY `id` tinyint(4) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
ALTER TABLE `especialidad` MODIFY `id` tinyint(4) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
ALTER TABLE `usuario` MODIFY `id` tinyint(4) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;
ALTER TABLE `medico_especialidad` MODIFY `id` tinyint(4) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
ALTER TABLE `agenda` MODIFY `id` tinyint(4) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
ALTER TABLE `turno` MODIFY `id` tinyint(4) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
ALTER TABLE `historial_clinico` MODIFY `id` tinyint(4) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
ALTER TABLE `log_auditoria` MODIFY `id` tinyint(4) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
ALTER TABLE `notificacion` MODIFY `id` tinyint(4) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Restricciones para tablas volcadas
--
ALTER TABLE `usuario`
  ADD CONSTRAINT `usuario_ibfk_1` FOREIGN KEY (`id_sede`) REFERENCES `sede` (`id`),
  ADD CONSTRAINT `usuario_ibfk_2` FOREIGN KEY (`id_cobertura`) REFERENCES `cobertura` (`id`);

ALTER TABLE `medico_especialidad`
  ADD CONSTRAINT `medico_especialidad_ibfk_1` FOREIGN KEY (`id_medico`) REFERENCES `usuario` (`id`),
  ADD CONSTRAINT `medico_especialidad_ibfk_2` FOREIGN KEY (`id_especialidad`) REFERENCES `especialidad` (`id`);

ALTER TABLE `agenda`
  ADD CONSTRAINT `agenda_ibfk_1` FOREIGN KEY (`id_especialidad`) REFERENCES `especialidad` (`id`),
  ADD CONSTRAINT `agenda_ibfk_2` FOREIGN KEY (`id_medico`) REFERENCES `usuario` (`id`),
  ADD CONSTRAINT `agenda_ibfk_3` FOREIGN KEY (`id_sede`) REFERENCES `sede` (`id`);

ALTER TABLE `turno`
  ADD CONSTRAINT `turno_ibfk_1` FOREIGN KEY (`id_agenda`) REFERENCES `agenda` (`id`),
  ADD CONSTRAINT `turno_ibfk_2` FOREIGN KEY (`id_paciente`) REFERENCES `usuario` (`id`),
  ADD CONSTRAINT `turno_ibfk_3` FOREIGN KEY (`id_cobertura`) REFERENCES `cobertura` (`id`);

ALTER TABLE `historial_clinico`
  ADD CONSTRAINT `historial_ibfk_1` FOREIGN KEY (`id_turno`) REFERENCES `turno` (`id`),
  ADD CONSTRAINT `historial_ibfk_2` FOREIGN KEY (`id_medico`) REFERENCES `usuario` (`id`),
  ADD CONSTRAINT `historial_ibfk_3` FOREIGN KEY (`id_paciente`) REFERENCES `usuario` (`id`);

ALTER TABLE `log_auditoria`
  ADD CONSTRAINT `log_auditoria_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id`);

ALTER TABLE `notificacion`
  ADD CONSTRAINT `notificacion_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id`);

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
