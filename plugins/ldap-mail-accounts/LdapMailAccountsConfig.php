<?php


use RainLoop\Config\Plugin;

class LdapMailAccountsConfig
{
	public const CONFIG_SERVER = "server";
	public const CONFIG_PROTOCOL_VERSION = "server_version";

	public const CONFIG_BIND_USER = "bind_user";
	public const CONFIG_BIND_PASSWORD = "bind_password";

	public const CONFIG_BASE = "base";
	public const CONFIG_OBJECTCLASS = "objectclass";
	public const CONFIG_FIELD_NAME = "field_name";
	public const CONFIG_FIELD_SEARCH = "field_search";
	public const CONFIG_FIELD_USERNAME = "field_username";
	public const CONFIG_SEARCH_STRING = "search_string";
	public const CONFIG_FIELD_MAIL_DOMAIN = "field_domain";

	public $server;
	public $protocol;
	public $bind_user;
	public $bind_password;
	public $base;
	public $objectclass;
	public $field_name;
	public $field_search;
	public $field_username;
	public $search_string;
	public $field_domain;

	public static function MakeConfig(Plugin $config): LdapMailAccountsConfig
	{
		$ldap = new self();
		$ldap->server = trim($config->Get("plugin", self::CONFIG_SERVER));
		$ldap->protocol = (int)trim($config->Get("plugin", self::CONFIG_PROTOCOL_VERSION, 3));
		$ldap->bind_user = trim($config->Get("plugin", self::CONFIG_BIND_USER));
		$ldap->bind_password = trim($config->Get("plugin", self::CONFIG_BIND_PASSWORD));
		$ldap->base = trim($config->Get("plugin", self::CONFIG_BASE));
		$ldap->objectclass = trim($config->Get("plugin", self::CONFIG_OBJECTCLASS));
		$ldap->field_name = trim($config->Get("plugin", self::CONFIG_FIELD_NAME));
		$ldap->field_search = trim($config->Get("plugin", self::CONFIG_FIELD_SEARCH));
		$ldap->field_username = trim($config->Get("plugin", self::CONFIG_FIELD_USERNAME));
		$ldap->search_string = trim($config->Get("plugin", self::CONFIG_SEARCH_STRING));
		$ldap->field_domain = trim($config->Get("plugin", self::CONFIG_FIELD_MAIL_DOMAIN));

		return $ldap;
	}
}