<?php


use RainLoop\Config\Plugin;

class LdapConfig
{
	public const CONFIG_SERVER = "server";
	public const CONFIG_PROTOCOL_VERSION = "server_version";
	public const CONFIG_STARTTLS = "starttls";
	public const CONFIG_MAIL_PREFIX = "mail_prefix";

	public const CONFIG_BIND_USER = "bind_user";
	public const CONFIG_BIND_PASSWORD = "bind_password";

	public const CONFIG_USER_BASE = "user_base";
	public const CONFIG_USER_OBJECTCLASS = "user_objectclass";
	public const CONFIG_USER_FIELD_NAME = "user_field_name";
	public const CONFIG_USER_FIELD_SEARCH = "user_field_search";
	public const CONFIG_USER_FIELD_MAIL = "user_field_mail";

	public const CONFIG_GROUP_GET = "group_get";
	public const CONFIG_GROUP_BASE = "group_base";
	public const CONFIG_GROUP_OBJECTCLASS = "group_objectclass";
	public const CONFIG_GROUP_FIELD_NAME = "group_field_name";
	public const CONFIG_GROUP_FIELD_MEMBER = "group_field_member";
	public const CONFIG_GROUP_FIELD_MAIL = "group_field_mail";
	public const CONFIG_GROUP_SENDER_FORMAT = "group_sender_format";


	public $server;
	public $protocol;
	public $starttls;
	public $mail_prefix;
	public $bind_user;
	public $bind_password;
	public $user_base;
	public $user_objectclass;
	public $user_field_name;
	public $user_field_search;
	public $user_field_mail;
	public $group_get;
	public $group_base;
	public $group_objectclass;
	public $group_field_name;
	public $group_field_member;
	public $group_field_mail;
	public $group_sender_format;

	public static function MakeConfig(Plugin $config): LdapConfig
	{
		$ldap = new self();
		$ldap->server = trim($config->Get("plugin", self::CONFIG_SERVER));
		$ldap->protocol = (int)trim($config->Get("plugin", self::CONFIG_PROTOCOL_VERSION, 3));
		$ldap->starttls = (bool)trim($config->Get("plugin", self::CONFIG_STARTTLS));
		$ldap->mail_prefix = trim($config->Get("plugin", self::CONFIG_MAIL_PREFIX));
		$ldap->bind_user = trim($config->Get("plugin", self::CONFIG_BIND_USER));
		$ldap->bind_password = trim($config->Get("plugin", self::CONFIG_BIND_PASSWORD));
		$ldap->user_base = trim($config->Get("plugin", self::CONFIG_USER_BASE));
		$ldap->user_objectclass = trim($config->Get("plugin", self::CONFIG_USER_OBJECTCLASS));
		$ldap->user_field_name = trim($config->Get("plugin", self::CONFIG_USER_FIELD_NAME));
		$ldap->user_field_search = trim($config->Get("plugin", self::CONFIG_USER_FIELD_SEARCH));
		$ldap->user_field_mail = trim($config->Get("plugin", self::CONFIG_USER_FIELD_MAIL));
		$ldap->group_get = (bool)trim($config->Get("plugin", self::CONFIG_GROUP_GET));
		$ldap->group_base = trim($config->Get("plugin", self::CONFIG_GROUP_BASE));
		$ldap->group_objectclass = trim($config->Get("plugin", self::CONFIG_GROUP_OBJECTCLASS));
		$ldap->group_field_name = trim($config->Get("plugin", self::CONFIG_GROUP_FIELD_NAME));
		$ldap->group_field_member = trim($config->Get("plugin", self::CONFIG_GROUP_FIELD_MEMBER));
		$ldap->group_field_mail = trim($config->Get("plugin", self::CONFIG_GROUP_FIELD_MAIL));
		$ldap->group_sender_format = trim($config->Get("plugin", self::CONFIG_GROUP_SENDER_FORMAT));

		return $ldap;
	}
}