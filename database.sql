CREATE DATABASE IF NOT EXISTS weightlifter;

CREATE USER 'weightlifter'@'%' IDENTIFIED BY 'weightlifter';
GRANT ALL PRIVILEGES ON weightlifter.* TO 'weightlifter'@'%';
FLUSH PRIVILEGES;

USE weightlifter;

CREATE TABLE `user` (
  `user_id` integer PRIMARY KEY NOT NULL, 
  `username` VARCHAR(40) NOT NULL UNIQUE,
  `password` VARCHAR(225) NOT NULL,
	`nfc_key` VARCHAR(225) NOT NULL,
	`permission` INTEGER NOT NULL DEFAULT 0, -- 0 = user, 1 = workout_mutate, 2 = admin 
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `workout` (
  `workout_id` integer PRIMARY KEY NOT NULL
);

CREATE TABLE `workout_bridge` (
  `workout_bridge_id` integer PRIMARY KEY NOT NULL,
	`workout_id` integer NOT NULL,
	`exercise_id` integer NOT NULL,
	`sets` integer NOT NULL,
	`reps` integer NOT NULL,
	`order` integer NOT NULL
);

CREATE TABLE `exercise` (
  `exercise_id` integer PRIMARY KEY NOT NULL AUTO_INCREMENT,
	`name` VARCHAR(255) NOT NULL,
	`description` TEXT,
	`sets` INTEGER NOT NULL DEFAULT 0,
	`reps` INTEGER NOT NULL DEFAULT 0,
	`time_flag` BOOLEAN NOT NULL DEFAULT 0
);

CREATE TABLE `user_workout_history` (
	`uwh_id` integer PRIMARY KEY NOT NULL AUTO_INCREMENT,
	`user_id` integer NOT NULL,
	`workout_id` integer NOT NULL
);

CREATE TABLE `past_workouts` (
	`pw_id` integer PRIMARY KEY NOT NULL AUTO_INCREMENT,
	`workout_id` integer NOT NULL UNIQUE,
	`finished` datetime,
	`duration` integer
);

CREATE TABLE `past_exercise` (
	`pe_id` integer PRIMARY KEY NOT NULL AUTO_INCREMENT,
	`uwh_id` integer NOT NULL,
	`workout_id` integer NOT NULL,
	`exercise_id` integer NOT NULL,
	`sets` integer NOT NULL DEFAULT 0,
	`reps` integer NOT NULL DEFAULT 0
);

CREATE TABLE `measurements` (
	`measurement_id` integer PRIMARY KEY NOT NULL AUTO_INCREMENT,
	`user_id` integer NOT NULL,
	`weight` integer NOT NULL,
	`bodyfat` float NOT NULL,
	`neck` float NOT NULL,
	`back` float NOT NULL,
	`chest` float NOT NULL,
	`shoulders` float NOT NULL,
	`waist` float NOT NULL,
	`left_arm` float NOT NULL,
	`right_arm` float NOT NULL,
	`left_forearm` float NOT NULL,
	`right_forearm` float NOT NULL,
	`left_quad` float NOT NULL,
	`right_quad` float NOT NULL,
	`date` datetime NOT NULL
);


ALTER TABLE `workout_bridge` ADD FOREIGN KEY (`workout_id`) REFERENCES `workout`(`workout_id`);
ALTER TABLE `workout_bridge` ADD FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`exercise_id`);

ALTER TABLE `user_workout_history` ADD FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`);
ALTER TABLE `user_workout_history` ADD FOREIGN KEY (`workout_id`) REFERENCES `past_workouts`(`workout_id`);

ALTER TABLE `past_workouts` ADD FOREIGN KEY (`workout_id`) REFERENCES `workout`(`workout_id`);

ALTER TABLE `past_exercise` ADD FOREIGN KEY (`uwh_id`) REFERENCES `user_workout_history`(`uwh_id`);
ALTER TABLE `past_exercise` ADD FOREIGN KEY (`workout_id`) REFERENCES `past_workouts`(`workout_id`);
ALTER TABLE `past_exercise` ADD FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`exercise_id`);

ALTER TABLE `measurements` ADD FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`);

