<?php

namespace RainLoop\Providers\AddressBook;

abstract class PdoSchema
{
	public static function mysql() : string
	{
		return <<<MYSQLINITIAL

CREATE TABLE IF NOT EXISTS rainloop_ab_contacts (

	id_contact     bigint UNSIGNED  NOT NULL AUTO_INCREMENT,
	id_contact_str varchar(128)     NOT NULL DEFAULT '',
	id_user        int UNSIGNED     NOT NULL,
	display        varchar(255)     NOT NULL DEFAULT '',
	changed        int UNSIGNED     NOT NULL DEFAULT 0,
	deleted        tinyint UNSIGNED NOT NULL DEFAULT 0,
	etag           varchar(128)     CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',

	PRIMARY KEY(id_contact),
	INDEX id_user_rainloop_ab_contacts_index (id_user)

) ENGINE=INNODB CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS rainloop_ab_properties (

	id_prop           bigint UNSIGNED  NOT NULL AUTO_INCREMENT,
	id_contact        bigint UNSIGNED  NOT NULL,
	id_user           int UNSIGNED     NOT NULL,
	prop_type         tinyint UNSIGNED NOT NULL,
	prop_type_str     varchar(255)     CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
	prop_value        MEDIUMTEXT         NOT NULL,
	prop_value_custom MEDIUMTEXT         NOT NULL,
	prop_frec         int UNSIGNED     NOT NULL DEFAULT 0,

	PRIMARY KEY(id_prop),
	INDEX id_user_rainloop_ab_properties_index (id_user),
	INDEX id_user_id_contact_rainloop_ab_properties_index (id_user, id_contact),
	INDEX id_contact_prop_type_rainloop_ab_properties_index (id_contact, prop_type)

) ENGINE=INNODB CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

MYSQLINITIAL;
	}

	public static function pgsql() : string
	{
		return <<<POSTGRESINITIAL

CREATE TABLE rainloop_ab_contacts (
	id_contact     bigserial    PRIMARY KEY,
	id_contact_str varchar(128) NOT NULL DEFAULT '',
	id_user        integer      NOT NULL,
	display        varchar(255) NOT NULL DEFAULT '',
	changed        integer      NOT NULL default 0,
	deleted        integer      NOT NULL default 0,
	etag           varchar(128) NOT NULL DEFAULT ''
);

CREATE INDEX id_user_rainloop_ab_contacts_index ON rainloop_ab_contacts (id_user);

CREATE TABLE rainloop_ab_properties (
	id_prop           bigserial    PRIMARY KEY,
	id_contact        integer      NOT NULL,
	id_user           integer      NOT NULL,
	prop_type         integer      NOT NULL,
	prop_type_str     varchar(255) NOT NULL DEFAULT '',
	prop_value        text         NOT NULL DEFAULT '',
	prop_value_custom text         NOT NULL DEFAULT '',
	prop_frec         integer      NOT NULL default 0
);

CREATE INDEX id_user_rainloop_ab_properties_index ON rainloop_ab_properties (id_user);
CREATE INDEX id_user_id_contact_rainloop_ab_properties_index ON rainloop_ab_properties (id_user, id_contact);

POSTGRESINITIAL;
	}

	public static function sqlite() : string
	{
		return <<<SQLITEINITIAL

CREATE TABLE rainloop_ab_contacts (
	id_contact     integer NOT NULL PRIMARY KEY,
	id_contact_str text    NOT NULL DEFAULT '',
	id_user        integer NOT NULL,
	display        text    NOT NULL DEFAULT '',
	changed        integer NOT NULL DEFAULT 0,
	deleted        integer NOT NULL DEFAULT 0,
	etag           text    NOT NULL DEFAULT ''
);

CREATE INDEX id_user_rainloop_ab_contacts_index ON rainloop_ab_contacts (id_user);

CREATE TABLE rainloop_ab_properties (
	id_prop           integer NOT NULL PRIMARY KEY,
	id_contact        integer NOT NULL,
	id_user           integer NOT NULL,
	prop_type         integer NOT NULL,
	prop_type_str     text    NOT NULL DEFAULT '',
	prop_value        text    NOT NULL DEFAULT '',
	prop_value_custom text    NOT NULL DEFAULT '',
	prop_frec         integer NOT NULL DEFAULT 0
);

CREATE INDEX id_user_rainloop_ab_properties_index ON rainloop_ab_properties (id_user);
CREATE INDEX id_user_id_contact_rainloop_ab_properties_index ON rainloop_ab_properties (id_user, id_contact);

SQLITEINITIAL;
	}

	public static function getForDbType(string $sDbType) : array
	{
		$aVersions = [];
		switch ($sDbType)
		{
			case 'mysql':
				$aVersions = [
					1 => [],
					2 => [
'ALTER TABLE rainloop_ab_properties ADD prop_value_lower MEDIUMTEXT NOT NULL AFTER prop_value_custom;'
					],
					3 => [
'ALTER TABLE rainloop_ab_properties CHANGE prop_value prop_value MEDIUMTEXT NOT NULL;',
'ALTER TABLE rainloop_ab_properties CHANGE prop_value_custom prop_value_custom MEDIUMTEXT NOT NULL;',
'ALTER TABLE rainloop_ab_properties CHANGE prop_value_lower prop_value_lower MEDIUMTEXT NOT NULL;'
					],
					4 => [
'ALTER TABLE rainloop_ab_properties CHANGE prop_value prop_value MEDIUMTEXT NOT NULL;',
'ALTER TABLE rainloop_ab_properties CHANGE prop_value_custom prop_value_custom MEDIUMTEXT NOT NULL;',
'ALTER TABLE rainloop_ab_properties CHANGE prop_value_lower prop_value_lower MEDIUMTEXT NOT NULL;'
					]
				];
				break;

			case 'pgsql':
				$aVersions = [
					1 => [],
					2 => [
'ALTER TABLE rainloop_ab_properties ADD prop_value_lower text NOT NULL DEFAULT \'\';'
					]
				];
				break;

			case 'sqlite':
				$aVersions = [
					1 => [],
					2 => [
'ALTER TABLE rainloop_ab_properties ADD prop_value_lower text NOT NULL DEFAULT \'\';'
					]
				];
				$sInitial = static::{$sDbType}();
				break;
		}

		if ($aVersions) {
			$aList = \explode(';', \trim(static::{$sDbType}()));
			foreach ($aList as $sV) {
				$sV = \trim($sV);
				if (\strlen($sV)) {
					$aVersions[1][] = $sV;
				}
			}
		}

		return $aVersions;
	}

}
