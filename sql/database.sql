CREATE DATABASE IF NOT EXISTS weightlifter;

CREATE USER 'weightlifter'@'%' IDENTIFIED BY 'weightlifter';
GRANT ALL PRIVILEGES ON weightlifter.* TO 'weightlifter'@'%';
FLUSH PRIVILEGES;

USE weightlifter;

CREATE TABLE `user` (
  `user_id` integer PRIMARY KEY NOT NULL AUTO_INCREMENT, 
  `username` VARCHAR(40) NOT NULL UNIQUE,
  `password` VARCHAR(225) NOT NULL,
	`name` VARCHAR(225) NOT NULL DEFAULT "",
	`pfp_id` integer,
	`nfc_key` VARCHAR(225) NOT NULL DEFAULT "",
	`permission` INTEGER NOT NULL DEFAULT 0, -- 0 = user, 1 = workout_mutate, 2 = admin, 4 = root
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `pfp` (
	`pfp_id` integer PRIMARY KEY NOT NULL AUTO_INCREMENT,
	`user_id` integer NOT NULL,
	`path` VARCHAR(1024) NOT NULL
);

CREATE TABLE `workout` (
  `workout_id` integer PRIMARY KEY NOT NULL AUTO_INCREMENT,
	`name` VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE `user_auth` (
	`user_auth_id` integer PRIMARY KEY NOT NULL AUTO_INCREMENT,
	`user_id` integer NOT NULL,
	`auth_token` VARCHAR(225) NOT NULL,
	`refresh_token` VARCHAR(225) NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `workout_bridge` (
  `workout_bridge_id` integer PRIMARY KEY NOT NULL AUTO_INCREMENT,
	`workout_id` integer NOT NULL,
	`exercise_id` integer NOT NULL,
	`sets` integer NOT NULL,
	`reps` integer NOT NULL,
	`sequence` integer NOT NULL
);

CREATE TABLE `exercise` (
  `exercise_id` integer PRIMARY KEY NOT NULL AUTO_INCREMENT,
	`name` VARCHAR(255) NOT NULL,
	`description` TEXT,
	`sets` INTEGER NOT NULL DEFAULT 0,
	`reps` INTEGER NOT NULL DEFAULT 0,
	`time_flag` BOOLEAN NOT NULL DEFAULT 0
);

CREATE TABLE `past_workouts` (
	`pw_id` integer PRIMARY KEY NOT NULL AUTO_INCREMENT,
	`workout_id` integer NOT NULL,
	`finished` datetime,
	`duration` time 
);

CREATE TABLE `past_exercise` (
	`pe_id` integer PRIMARY KEY NOT NULL AUTO_INCREMENT,
	`user_id` integer NOT NULL,
	`workout_id` integer NOT NULL,
	`exercise_id` integer NOT NULL,
	`sets` integer NOT NULL DEFAULT 0
);

CREATE TABLE `past_set` (
	`set_id` integer PRIMARY KEY NOT NULL AUTO_INCREMENT,
	`pe_id` integer NOT NULL,
	`weight` float NOT NULL,
	`reps` integer NOT NULL,
	`date` datetime NOT NULL
);

CREATE TABLE `measurements` (
	`measurement_id` integer PRIMARY KEY NOT NULL AUTO_INCREMENT,
	`user_id` integer NOT NULL,
	`weight` float ,
	`bodyfat` float ,
	`neck` float ,
	`back` float ,
	`chest` float ,
	`shoulders` float ,
	`waist` float ,
	`left_arm` float ,
	`right_arm` float,
	`left_forearm` float ,
	`right_forearm` float,
	`left_quad` float ,
	`right_quad` float ,
	`date` datetime 
);


ALTER TABLE `workout_bridge` ADD FOREIGN KEY (`workout_id`) REFERENCES `workout`(`workout_id`);
ALTER TABLE `workout_bridge` ADD FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`exercise_id`);

ALTER TABLE `past_workouts` ADD FOREIGN KEY (`workout_id`) REFERENCES `workout`(`workout_id`);

ALTER TABLE `past_exercise` ADD FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`);
ALTER TABLE `past_exercise` ADD FOREIGN KEY (`workout_id`) REFERENCES `past_workouts`(`pw_id`);
ALTER TABLE `past_exercise` ADD FOREIGN KEY (`exercise_id`) REFERENCES `exercise`(`exercise_id`);

ALTER TABLE `measurements` ADD FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`);

ALTER TABLE `user_auth` ADD FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`);

ALTER TABLE `past_set` ADD FOREIGN KEY (`pe_id`) REFERENCES `past_exercise`(`pe_id`);

ALTER TABLE `pfp` ADD FOREIGN KEY (`user_id`) REFERENCES `user`(`user_id`);

-- demo data

INSERT INTO `user` (`username`, `password`, `name`, `permission`) VALUES ('root', 'root', 'Kevin', 4);

INSERT INTO `workout` (`name`) VALUES ('Chest Day'), ('Leg Day'), ('Back Day'), ('Shoulder Day'), ('Arm Day');

INSERT INTO `exercise` (`name`, `description`, `sets`, `reps`, `time_flag`) VALUES ('Bench Press', 'Bench Press', 4, 8, 0), ('Squat', 'Squat', 4, 8, 0), ('Deadlift', 'Deadlift', 4, 8, 0), ('Shoulder Press', 'Shoulder Press', 4, 8, 0), ('Bicep Curl', 'Bicep Curl', 4, 8, 0), ('Tricep Extension', 'Tricep Extension', 4, 8, 0), ('Leg Press', 'Leg Press', 4, 8, 0), ('Leg Curl', 'Leg Curl', 4, 8, 0), ('Leg Extension', 'Leg Extension', 4, 8, 0), ('Lat Pulldown', 'Lat Pulldown', 4, 8, 0), ('Row', 'Row', 4, 8, 0), ('Pullup', 'Pullup', 4, 8, 0), ('Dumbbell Press', 'Dumbbell Press', 4, 8, 0), ('Dumbbell Curl', 'Dumbbell Curl', 4, 8, 0), ('Dumbbell Extension', 'Dumbbell Extension', 4, 8, 0);

INSERT INTO `workout_bridge` (`workout_id`, `exercise_id`, `sets`, `reps`, `sequence`) VALUES (1, 1, 4, 8, 1), (1, 5, 4, 8, 2), (1, 6, 4, 8, 3), (2, 2, 4, 8, 1), (2, 7, 4, 8, 2), (2, 8, 4, 8, 3), (2, 9, 4, 8, 4), (3, 3, 4, 8, 1), (3, 10, 4, 8, 2), (3, 11, 4, 8, 3), (4, 4, 4, 8, 1), (4, 12, 4, 8, 2), (4, 13, 4, 8, 3), (5, 5, 4, 8, 1), (5, 14, 4, 8, 2), (5, 15, 4, 8, 3);
