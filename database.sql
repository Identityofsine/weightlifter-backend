CREATE DATABASE IF NOT EXISTS weightlifter;

CREATE USER 'weightlifter'@'%' IDENTIFIED BY 'weightlifter';
GRANT ALL PRIVILEGES ON weightlifter.* TO 'weightlifter'@'%';
FLUSH PRIVILEGES;

USE coinbank;

CREATE TABLE `transactions` (
  `transaction_id` integer PRIMARY KEY NOT NULL AUTO_INCREMENT,
  `coinbank_id` integer NOT NULL,
  `user_id` integer, -- why? this is because the coinjar can be shared with multiple users; it is impossible (as of now) to know who inserted the coin until the user claims it to be them.
	`value` float NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `user` (
  `user_id` integer PRIMARY KEY NOT NULL, 
  `username` VARCHAR(40) NOT NULL UNIQUE,
  `password` VARCHAR(225) NOT NULL,
	`active_token` VARCHAR(225),
	`refresh_token` VARCHAR(225) 
);

CREATE TABLE `coinbank` (
  `coinbank_id` integer PRIMARY KEY NOT NULL,
	`name` VARCHAR(40) NOT NULL,
	`emoji` VARCHAR(40),
  `value` float NOT NULL,
	`token` VARCHAR(225) NOT NULL,
	`user_secret` VARCHAR(40) NOT NULL UNIQUE, -- This is the secret that the user will have to input to add themselves to the coinbank.
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `coinbank_user_bridge` (
  `cub_id` integer PRIMARY KEY NOT NULL AUTO_INCREMENT,
  `coinbank_id` integer NOT NULL,
  `user_id` integer NOT NULL
);

CREATE TABLE `coinbank_auth_users` (
	`auth_id` integer PRIMARY KEY NOT NULL AUTO_INCREMENT,
	`coinbank_id` integer NOT NULL,
	`user_id` integer NOT NULL
	-- is_owner boolean NOT NULL DEFAULT 0
);

ALTER TABLE `transactions` ADD FOREIGN KEY (`coinbank_id`) REFERENCES `coinbank` (`coinbank_id`);

ALTER TABLE `transactions` ADD FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`);

ALTER TABLE `coinbank_user_bridge` ADD FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`);

ALTER TABLE `coinbank_user_bridge` ADD FOREIGN KEY (`coinbank_id`) REFERENCES `coinbank` (`coinbank_id`);

ALTER TABLE `coinbank_auth_users` ADD FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`);

ALTER TABLE `coinbank_auth_users` ADD FOREIGN KEY (`coinbank_id`) REFERENCES `coinbank` (`coinbank_id`);
