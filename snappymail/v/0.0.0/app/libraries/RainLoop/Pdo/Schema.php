<?php

namespace RainLoop\Pdo;

abstract class Schema
{
	public static function mysql() : array
	{
		return [
			'CREATE TABLE IF NOT EXISTS rainloop_system (
sys_name varchar(64) NOT NULL,
value_int int UNSIGNED NOT NULL DEFAULT 0,
PRIMARY KEY (sys_name)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;',
			'CREATE TABLE IF NOT EXISTS rainloop_users (
id_user int UNSIGNED NOT NULL AUTO_INCREMENT,
rl_email varchar(254) NOT NULL,
PRIMARY KEY (id_user),
UNIQUE KEY ui_rainloop_users_email (rl_email)
);'
		];
	}

	public static function pgsql() : array
	{
		return [
			'CREATE TABLE rainloop_system (
sys_name varchar(50) NOT NULL,
value_int integer NOT NULL DEFAULT 0
);',
			'CREATE INDEX sys_name_rainloop_system_index ON rainloop_system (sys_name);',
			'CREATE SEQUENCE id_user START WITH 1 INCREMENT BY 1 NO MAXVALUE NO MINVALUE CACHE 1;',
			'CREATE TABLE rainloop_users (
id_user integer DEFAULT nextval(\'id_user\'::text) PRIMARY KEY,
rl_email varchar(254) NOT NULL DEFAULT \'\'
);',
			'CREATE INDEX rl_email_rainloop_users_index ON rainloop_users (rl_email);'
		];
	}

	public static function sqlite() : array
	{
		return [
			'CREATE TABLE rainloop_system (
sys_name text NOT NULL,
value_int integer NOT NULL DEFAULT 0
);',
			'CREATE UNIQUE INDEX ui_rainloop_system_sys_name ON rainloop_system (sys_name);',
			'CREATE TABLE rainloop_users (
id_user integer NOT NULL PRIMARY KEY,
rl_email text NOT NULL DEFAULT \'\'
);',
			'CREATE INDEX rl_email_rainloop_users_index ON rainloop_users (rl_email);'
		];
	}

	public static function getForDbType(string $sDbType) : array
	{
		switch ($sDbType)
		{
			case 'mysql':
			case 'pgsql':
			case 'sqlite':
				return static::{$sDbType}();
		}
		return [];
	}
}
