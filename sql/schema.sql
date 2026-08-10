-- ==========================================================
-- Database Schema for IoT Medication Reminder Box System
-- Database Engine: MariaDB / MySQL
-- ==========================================================

CREATE DATABASE IF NOT EXISTS `medbox_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `medbox_db`;

-- Disable Foreign Key Checks during setup
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------
-- Table: users
-- Stores registered users (Caregivers, Administrators)
-- ---------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `user_id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'caregiver',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- Table: devices (Medication Boxes)
-- Stores device pairing, serial number, and live telemetry
-- ---------------------------------------------------------
DROP TABLE IF EXISTS `devices`;
CREATE TABLE `devices` (
  `box_id` INT AUTO_INCREMENT PRIMARY KEY,
  `device_code` VARCHAR(50) NOT NULL UNIQUE COMMENT 'ESP32 Serial Number / Token e.g. BOX-CEB123',
  `user_id` INT NULL COMMENT 'Owner user ID',
  `box_name` VARCHAR(100) NOT NULL DEFAULT 'กล่องยาของฉัน',
  `location` VARCHAR(100) DEFAULT 'ห้องนอน',
  `medicine_name` VARCHAR(100) DEFAULT 'พาราเซตามอล 500 mg',
  `medicine_image` VARCHAR(255) DEFAULT '/uploads/default_medicine.png',
  `battery_level` INT NOT NULL DEFAULT 100 COMMENT '0 - 100%',
  `status` VARCHAR(20) NOT NULL DEFAULT 'Offline' COMMENT 'Online / Offline',
  `firmware_version` VARCHAR(20) NOT NULL DEFAULT 'v1.0.0',
  `last_seen` DATETIME NULL,
  `schedule_version` BIGINT NOT NULL DEFAULT 1 COMMENT 'Timestamp or counter for schedule versioning',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_devices_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_devices_device_code` (`device_code`),
  INDEX `idx_devices_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- Table: schedules
-- Stores medication schedules, meal timings & repetition rules
-- ---------------------------------------------------------
DROP TABLE IF EXISTS `schedules`;
CREATE TABLE `schedules` (
  `schedule_id` INT AUTO_INCREMENT PRIMARY KEY,
  `box_id` INT NOT NULL,
  `medicine_name` VARCHAR(100) NOT NULL,
  `time_slot` TIME NOT NULL COMMENT 'e.g. 08:00:00',
  `meal_timing` VARCHAR(20) NOT NULL DEFAULT 'before_meal' COMMENT 'before_meal / after_meal',
  `repeat_day` VARCHAR(50) NOT NULL DEFAULT 'Everyday' COMMENT 'Everyday / Mon,Wed,Fri / custom',
  `repeat_count` INT NOT NULL DEFAULT 3 COMMENT 'Max repeat rounds if not taken (default 3)',
  `repeat_interval_min` INT NOT NULL DEFAULT 5 COMMENT 'Interval between repeats in minutes (default 5)',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_schedules_devices` FOREIGN KEY (`box_id`) REFERENCES `devices` (`box_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_schedules_box_id` (`box_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- Table: medication_logs
-- Stores history of medication intakes
-- ---------------------------------------------------------
DROP TABLE IF EXISTS `medication_logs`;
CREATE TABLE `medication_logs` (
  `log_id` INT AUTO_INCREMENT PRIMARY KEY,
  `box_id` INT NOT NULL,
  `schedule_id` INT NULL,
  `medicine_name` VARCHAR(100) NOT NULL,
  `scheduled_time` DATETIME NULL,
  `taken_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` VARCHAR(30) NOT NULL DEFAULT 'Taken' COMMENT 'Taken / Taken Early / Missed',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_logs_devices` FOREIGN KEY (`box_id`) REFERENCES `devices` (`box_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_logs_schedules` FOREIGN KEY (`schedule_id`) REFERENCES `schedules` (`schedule_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_medication_logs_box_id` (`box_id`),
  INDEX `idx_medication_logs_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- Table: battery_logs
-- Stores battery telemetry history
-- ---------------------------------------------------------
DROP TABLE IF EXISTS `battery_logs`;
CREATE TABLE `battery_logs` (
  `log_id` INT AUTO_INCREMENT PRIMARY KEY,
  `box_id` INT NOT NULL,
  `battery_level` INT NOT NULL,
  `recorded_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_battery_devices` FOREIGN KEY (`box_id`) REFERENCES `devices` (`box_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_battery_logs_box_id` (`box_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- Table: audit_logs
-- Records system activities for security & tracking
-- ---------------------------------------------------------
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `audit_id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `action` VARCHAR(50) NOT NULL COMMENT 'LOGIN, REGISTER, CREATE_DEVICE, EDIT_DEVICE, DELETE_DEVICE, CHANGE_SCHEDULE, CHANGE_PROFILE',
  `details` TEXT NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_audit_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_audit_logs_user_id` (`user_id`),
  INDEX `idx_audit_logs_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- Table: firmware_versions
-- OTA Firmware management table
-- ---------------------------------------------------------
DROP TABLE IF EXISTS `firmware_versions`;
CREATE TABLE `firmware_versions` (
  `firmware_id` INT AUTO_INCREMENT PRIMARY KEY,
  `version_number` VARCHAR(20) NOT NULL UNIQUE,
  `file_url` VARCHAR(255) NOT NULL,
  `checksum` VARCHAR(64) NULL,
  `description` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Enable Foreign Key Checks
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------
-- Seed Initial Data
-- Password for demo users: "Password123!" (hashed with bcrypt)
-- ---------------------------------------------------------
INSERT INTO `users` (`user_id`, `username`, `email`, `password`, `full_name`, `role`) VALUES
(1, 'admin', 'admin@example.com', '$2a$10$zQcAJlybCKh3WleE3zYaVeIKlnCx422IWwLhS3WI9ljLNaII9OwLS', 'ผู้ดูแลระบบสูงสุด', 'admin'),
(2, 'somchai', 'somchai@example.com', '$2a$10$wT8cI5/JpE4V.6a9gE8Pve51cM0OqH6Z28aO5P0/Lh4E0j/O8tCiu', 'นายสมชาย ใจดี', 'caregiver');

-- Register predefined serial numbers (Devices ready to be bound or already bound)
INSERT INTO `devices` (`box_id`, `device_code`, `user_id`, `box_name`, `location`, `medicine_name`, `medicine_image`, `battery_level`, `status`, `firmware_version`, `last_seen`, `schedule_version`) VALUES
(1, 'BOX-CEB123', 2, 'กล่องยาห้องนอน', 'ห้องนอน', 'พาราเซตามอล 500 mg', '/uploads/default_medicine.png', 85, 'Online', 'v1.0.0', NOW(), 1700000001),
(2, 'BOX-CEB456', 2, 'กล่องยาห้องครัว', 'ห้องครัว', 'แอมโลดิพีน (Amlodipine) 5 mg', '/uploads/default_medicine.png', 62, 'Online', 'v1.0.0', NOW(), 1700000002),
(3, 'BOX-CEB789', NULL, 'กล่องยาใหม่ 3', 'ยังไม่เปิดใช้งาน', 'โอเมพราโซล 20 mg', '/uploads/default_medicine.png', 100, 'Offline', 'v1.0.0', NULL, 1700000003);

-- Seed Schedules for Box 1 & Box 2
INSERT INTO `schedules` (`schedule_id`, `box_id`, `medicine_name`, `time_slot`, `meal_timing`, `repeat_day`, `repeat_count`, `repeat_interval_min`, `is_active`) VALUES
(1, 1, 'พาราเซตามอล 500 mg', '08:00:00', 'before_meal', 'Everyday', 3, 5, 1),
(2, 1, 'พาราเซตามอล 500 mg', '13:00:00', 'after_meal', 'Everyday', 3, 5, 1),
(3, 1, 'พาราเซตามอล 500 mg', '20:00:00', 'before_meal', 'Everyday', 3, 5, 1),
(4, 2, 'แอมโลดิพีน 5 mg', '09:00:00', 'after_meal', 'Mon,Wed,Fri', 3, 5, 1),
(5, 2, 'แอมโลดิพีน 5 mg', '18:00:00', 'after_meal', 'Mon,Wed,Fri', 3, 5, 1);

-- Seed Sample Medication Logs
INSERT INTO `medication_logs` (`box_id`, `schedule_id`, `medicine_name`, `scheduled_time`, `taken_time`, `status`, `created_at`) VALUES
(1, 1, 'พาราเซตามอล 500 mg', NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 1 DAY, 'Taken', NOW() - INTERVAL 1 DAY),
(1, 2, 'พาราเซตามอล 500 mg', NOW() - INTERVAL 12 HOUR, NOW() - INTERVAL '11:55' HOUR_MINUTE, 'Taken', NOW() - INTERVAL 12 HOUR),
(2, 4, 'แอมโลดิพีน 5 mg', NOW() - INTERVAL 2 HOUR, NOW() - INTERVAL '2:10' HOUR_MINUTE, 'Taken', NOW() - INTERVAL 2 HOUR);

-- Seed Battery Telemetry Logs
INSERT INTO `battery_logs` (`box_id`, `battery_level`, `recorded_at`) VALUES
(1, 90, NOW() - INTERVAL 2 HOUR),
(1, 85, NOW()),
(2, 65, NOW() - INTERVAL 1 HOUR),
(2, 62, NOW());

-- Seed Initial Firmware Version
INSERT INTO `firmware_versions` (`version_number`, `file_url`, `description`) VALUES
('v1.0.0', '/firmware/bin/medbox_v1.0.0.bin', 'Standard Initial Release firmware with offline RTC support');
