-- Corrige las tildes de las especialidades cargadas sin acento.
USE `clinica`;
SET NAMES utf8mb4;

UPDATE `especialidad` SET `descripcion` = 'Traumatología'  WHERE `descripcion` = 'Traumatologia';
UPDATE `especialidad` SET `descripcion` = 'Cardiología'    WHERE `descripcion` = 'Cardiologia';
UPDATE `especialidad` SET `descripcion` = 'Pediatría'      WHERE `descripcion` = 'Pediatria';
UPDATE `especialidad` SET `descripcion` = 'Ginecología'    WHERE `descripcion` = 'Ginecologia';
UPDATE `especialidad` SET `descripcion` = 'Dermatología'   WHERE `descripcion` = 'Dermatologia';
UPDATE `especialidad` SET `descripcion` = 'Oftalmología'   WHERE `descripcion` = 'Oftalmologia';
UPDATE `especialidad` SET `descripcion` = 'Clínica médica' WHERE `descripcion` = 'Clinica medica';
