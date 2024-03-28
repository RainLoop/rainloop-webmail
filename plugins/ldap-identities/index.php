<?php

use RainLoop\Enumerations\PluginPropertyType;
use RainLoop\Plugins\AbstractPlugin;
use RainLoop\Plugins\Property;

class LdapIdentitiesPlugin extends AbstractPlugin
{
	const
		NAME     = 'LDAP Identities',
		VERSION  = '2.3',
		AUTHOR   = 'FWest98',
		URL      = 'https://github.com/FWest98',
		RELEASE  = '2024-02-27',
		REQUIRED = '2.20.0',
		CATEGORY = 'Accounts',
		DESCRIPTION = 'Adds functionality to import account identities from LDAP.';

	public function __construct()
	{
		include_once __DIR__ . '/LdapIdentities.php';
		include_once __DIR__ . '/LdapConfig.php';
		include_once __DIR__ . '/LdapException.php';

		parent::__construct();
	}

	public function Init(): void
	{
		$this->addHook("main.fabrica", 'MainFabrica');
	}

	public function MainFabrica(string $name, &$result)
	{
		if ($name !== 'identities') return;

		if (!is_array($result))
			$result = [];

		// Set up config
		$config = LdapConfig::MakeConfig($this->Config());

		$ldap = new LdapIdentities($config, $this->Manager()->Actions()->Logger());

		$result[] = $ldap;
	}

	protected function configMapping(): array
	{
		return [
			Property::NewInstance(LdapConfig::CONFIG_SERVER)
				->SetLabel("LDAP Server URL")
				->SetPlaceholder("ldap://server:port")
				->SetType(PluginPropertyType::STRING),

			Property::NewInstance(LdapConfig::CONFIG_PROTOCOL_VERSION)
				->SetLabel("LDAP Protocol Version")
				->SetType(PluginPropertyType::SELECTION)
				->SetDefaultValue([2, 3]),

			Property::NewInstance(LdapConfig::CONFIG_STARTTLS)
				->SetLabel("Use StartTLS")
				->SetType(PluginPropertyType::BOOL)
				->SetDescription("Whether or not to use TLS encrypted connection")
				->SetDefaultValue(true),

			Property::NewInstance(LdapConfig::CONFIG_MAIL_PREFIX)
				->SetLabel("Email prefix")
				->SetType(PluginPropertyType::STRING)
				->SetDescription("Only addresses with this prefix will be used as identity. The prefix is removed from the identity list.\nThis is useful for example to import identities from Exchange, which stores mail addresses in the ProxyAddresses attribut of Active Directory with \"smtp:\" as prefix. (e.g. \"smtp:john.doe@topsecret.info\")\n-> To use addresses set by Exchange use \"smtp:\" as prefix.")
				->SetDefaultValue(""),

			Property::NewInstance(LdapConfig::CONFIG_BIND_USER)
				->SetLabel("Bind User DN")
				->SetDescription("The user to use for binding to the LDAP server. Should be a DN or RDN. Leave empty for anonymous bind")
				->SetType(PluginPropertyType::STRING),

			Property::NewInstance(LdapConfig::CONFIG_BIND_PASSWORD)
				->SetLabel("Bind User Password")
				->SetDescription("Leave empty for anonymous bind")
				->SetType(PluginPropertyType::PASSWORD),

			Property::NewInstance(LdapConfig::CONFIG_USER_OBJECTCLASS)
				->SetLabel("User object class")
				->SetType(PluginPropertyType::STRING)
				->SetDefaultValue("user"),

			Property::NewInstance(LdapConfig::CONFIG_USER_FIELD_SEARCH)
				->SetLabel("User search field")
				->SetType(PluginPropertyType::STRING)
				->SetDescription("The field in the user object to search using the email the user logged in with")
				->SetDefaultValue("mail"),

			Property::NewInstance(LdapConfig::CONFIG_USER_FIELD_MAIL)
				->SetLabel("User mail field")
				->SetType(PluginPropertyType::STRING)
				->SetDescription("The field in the user object listing all identities (email addresses) of the user")
				->SetDefaultValue("mail"),

			Property::NewInstance(LdapConfig::CONFIG_USER_FIELD_NAME)
				->SetLabel("User name field")
				->SetType(PluginPropertyType::STRING)
				->SetDescription("The field in the user object with their default sender name")
				->SetDefaultValue("cn"),

			Property::NewInstance(LdapConfig::CONFIG_USER_BASE)
				->SetLabel("User base DN")
				->SetType(PluginPropertyType::STRING)
				->SetDescription("The base DN to search in for users"),

			Property::NewInstance(LdapConfig::CONFIG_GROUP_GET)
				->SetLabel("Find groups?")
				->SetType(PluginPropertyType::BOOL)
				->SetDescription("Whether or not to search for groups")
				->SetDefaultValue(true),

			Property::NewInstance(LdapConfig::CONFIG_GROUP_OBJECTCLASS)
				->SetLabel("Group object class")
				->SetType(PluginPropertyType::STRING)
				->SetDefaultValue("group"),

			Property::NewInstance(LdapConfig::CONFIG_GROUP_FIELD_MAIL)
				->SetLabel("Group mail field")
				->SetType(PluginPropertyType::STRING)
				->SetDescription("The field in the group object listing all identities (email addresses) of the group")
				->SetDefaultValue("mail"),

			Property::NewInstance(LdapConfig::CONFIG_GROUP_FIELD_NAME)
				->SetLabel("Group name field")
				->SetType(PluginPropertyType::STRING)
				->SetDescription("The field in the group object with the name")
				->SetDefaultValue("cn"),

			Property::NewInstance(LdapConfig::CONFIG_GROUP_FIELD_MEMBER)
				->SetLabel("Group member field")
				->SetType(PluginPropertyType::STRING)
				->SetDescription("The field in the group object with all member DNs")
				->SetDefaultValue("member"),

			Property::NewInstance(LdapConfig::CONFIG_GROUP_SENDER_FORMAT)
				->SetLabel("Group mail sender format")
				->SetType(PluginPropertyType::STRING)
				->SetDescription("The sender name format for group addresses. Available template values: #USER# for the user name and #GROUP# for the group name")
				->SetDefaultValue("#USER# || #GROUP#"),

			Property::NewInstance(LdapConfig::CONFIG_GROUP_BASE)
				->SetLabel("Group base DN")
				->SetType(PluginPropertyType::STRING)
				->SetDescription("The base DN to search in for groups")
		];
	}
}
