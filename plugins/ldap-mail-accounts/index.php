<?php

use RainLoop\Enumerations\Capa;
use RainLoop\Enumerations\PluginPropertyType;
use RainLoop\Plugins\AbstractPlugin;
use RainLoop\Plugins\Property;
use RainLoop\Model\Account;
use RainLoop\Actions;


class LdapMailAccountsPlugin extends AbstractPlugin
{
	const
		NAME     = 'LDAP Mail Accounts',
		VERSION  = '1.0',
		AUTHOR   = 'cm-schl',
		URL      = 'https://github.com/cm-sch',
		RELEASE  = '2022-11-11',
		REQUIRED = '2.20.0',
		CATEGORY = 'Accounts',
		DESCRIPTION = 'Adds functionality to import mail accounts from LDAP. Basing on the work of FWest98 (https://github.com/FWest98).';

	public function __construct()
	{
		include_once __DIR__ . '/LdapMailAccounts.php';
		include_once __DIR__ . '/LdapConfig.php';
		include_once __DIR__ . '/LdapException.php';

		parent::__construct();
	}

	public function Init(): void
	{
		$this->addHook("login.success", 'AddLdapMailAccounts');
	}

	public function AddLdapMailAccounts(Account $oAccount)
	{
		// Set up config
		$config = LdapConfig::MakeConfig($this->Config());

		$oldapMailAccounts = new LdapMailAccounts($config, $this->Manager()->Actions()->Logger());

		$oldapMailAccounts->AddLdapMailAccounts($oAccount);
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
				->SetDescription("The fieldname inside the user object to search for the email/username the user logged in with")
				->SetDefaultValue("member"),

			Property::NewInstance(LdapConfig::CONFIG_USER_FIELD_MAIL)
				->SetLabel("Additional account mail field")
				->SetType(PluginPropertyType::STRING)
				->SetDescription("The field containing the mail address of found additional mail accounts")
				->SetDefaultValue("mail"),

			Property::NewInstance(LdapConfig::CONFIG_USER_FIELD_NAME)
				->SetLabel("Additional account name field")
				->SetType(PluginPropertyType::STRING)
				->SetDescription("The field containing the default sender name of the found additional mail accounts")
				->SetDefaultValue("displayName"),

			Property::NewInstance(LdapConfig::CONFIG_USER_BASE)
				->SetLabel("User base DN")
				->SetType(PluginPropertyType::STRING)
				->SetDescription("The base DN to search in for users")

			/* Not needed at the moment

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
			*/
		];
	}
}
