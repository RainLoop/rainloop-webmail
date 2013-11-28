-- RainLoop Webmail initial contacts database structure

/*!40014  SET FOREIGN_KEY_CHECKS=0 */;

-- Table structure for table `rainloop_system`
CREATE TABLE IF NOT EXISTS `rainloop_system` (
	`name` varchar(50) NOT NULL,
	`value_int` int(11) UNSIGNED NOT NULL DEFAULT '0',
	`value_str` varchar(255) NOT NULL DEFAULT ''
) /*!40000 ENGINE=INNODB */ /*!40101 CHARACTER SET utf8 COLLATE utf8_general_ci */;

-- Table structure for table `rainloop_users`
CREATE TABLE IF NOT EXISTS `rainloop_users` (
	`id_user` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
	`email` varchar(255) /*!40101 CHARACTER SET ascii COLLATE ascii_general_ci */ NOT NULL,

	UNIQUE `email_unique` (`email`),
	PRIMARY KEY(`id_user`)
) /*!40000 ENGINE=INNODB */;

-- Table structure for table `rainloop_pab_contacts`
CREATE TABLE IF NOT EXISTS `rainloop_pab_contacts` (
	`id_contact` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
	`id_user` int(11) UNSIGNED NOT NULL,
	`display_in_list` varchar(255) NOT NULL DEFAULT '',
	`type` int(11) UNSIGNED NOT NULL DEFAULT '0',
	`changed` int(11) UNSIGNED NOT NULL DEFAULT '0',

	CONSTRAINT `id_user_fk_rainloop_pab_contacts` FOREIGN KEY (`id_user`)
		REFERENCES `rainloop_users` (`id_user`) ON DELETE CASCADE ON UPDATE CASCADE,
	PRIMARY KEY(`id_contact`)
) /*!40000 ENGINE=INNODB */ /*!40101 CHARACTER SET utf8 COLLATE utf8_general_ci */;

-- Table structure for table `rainloop_pab_prop`
CREATE TABLE IF NOT EXISTS `rainloop_pab_prop` (
	`id_prop` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
	`id_contact` int(11) UNSIGNED NOT NULL,
	`id_user` int(11) UNSIGNED NOT NULL,
	`type` int(11) UNSIGNED NOT NULL,
	`type_custom` varchar(50) /*!40101 CHARACTER SET ascii COLLATE ascii_general_ci */ NOT NULL DEFAULT '',
	`value` varchar(255) NOT NULL DEFAULT '',
	`value_custom` varchar(255) NOT NULL DEFAULT '',
	`frec` int(11) UNSIGNED NOT NULL DEFAULT '0',

	INDEX `id_user_id_contact_index` (`id_user`, `id_contact`),
	INDEX `id_user_value_index` (`id_user`, `value`),
	CONSTRAINT `id_contact_fk_rainloop_pab_prop` FOREIGN KEY (`id_contact`)
		REFERENCES `rainloop_pab_contacts` (`id_contact`) ON DELETE CASCADE ON UPDATE CASCADE
) /*!40000 ENGINE=INNODB */ /*!40101 CHARACTER SET utf8 COLLATE utf8_general_ci */;

-- Table structure for table `rainloop_pab_tags`
CREATE TABLE IF NOT EXISTS `rainloop_pab_tags` (
	`id_tag` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
	`id_contact` int(11) UNSIGNED NOT NULL,
	`id_user` int(11) UNSIGNED NOT NULL,
	`name` varchar(255) NOT NULL,

	UNIQUE `id_user_name_unique` (`id_user`, `name`),
	CONSTRAINT `id_user_fk_rainloop_pab_tags` FOREIGN KEY (`id_user`)
		REFERENCES `rainloop_users` (`id_user`) ON DELETE CASCADE ON UPDATE CASCADE,
	PRIMARY KEY(`id_tag`)
) /*!40000 ENGINE=INNODB */ /*!40101 CHARACTER SET utf8 COLLATE utf8_general_ci */;

-- Table structure for table `rainloop_pab_tags_contacts`
CREATE TABLE IF NOT EXISTS `rainloop_pab_tags_contacts` (
	`id_tag` int(11) UNSIGNED NOT NULL,
	`id_contact` int(11) UNSIGNED NOT NULL,

	UNIQUE `id_user_name_unique` (`id_user`, `name`),
	CONSTRAINT `id_contact_fk_rainloop_tags_contacts` FOREIGN KEY (`id_contact`)
		REFERENCES `rainloop_pab_contacts` (`id_contact`) ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT `id_tag_fk_rainloop_tags_contacts` FOREIGN KEY (`id_tag`)
		REFERENCES `rainloop_pab_tags` (`id_tag`) ON DELETE CASCADE ON UPDATE CASCADE
) /*!40000 ENGINE=INNODB */ /*!40101 CHARACTER SET utf8 COLLATE utf8_general_ci */;

-- RainLoop Webmail update contacts database structure

DELIMITER $$

DROP PROCEDURE IF EXISTS rainloop_pab_upgrade_database $$

CREATE PROCEDURE rainloop_pab_upgrade_database()
BEGIN
	DECLARE new_version INT DEFAULT 1;
	DECLARE current_version INT DEFAULT 0;
	SELECT IFNULL(MAX(`value_int`), 0) INTO current_version FROM `rainloop_system` WHERE `name` = 'rainloop-pab-db-version';

--	TODO
--
-- 	IF current_version < 1 THEN
-- 		ALTER TABLE `rainloop_pab_prop` ADD INDEX `id_user_id_contact_index` (`id_user`, `id_contact`);
-- 	END IF;
--
-- 	IF current_version < 2 THEN
-- 		ALTER TABLE `rainloop_pab_prop` ADD INDEX `id_user_id_contact_index` (`id_user`, `id_contact`);
-- 	END IF;

	DELETE FROM `rainloop_system` WHERE `name` = 'rainloop-pab-db-version' AND `value_int` <= new_version;
	INSERT INTO `rainloop_system` (`name`, `value_int`) VALUES ('rainloop-pab-db-version', new_version);
END$$

-- TODO
-- CALL rainloop_pab_upgrade_database() $$

DROP PROCEDURE IF EXISTS rainloop_pab_upgrade_database $$

DELIMITER ;

/*!40014 SET FOREIGN_KEY_CHECKS=1 */;
