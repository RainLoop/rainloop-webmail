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
		RELEASE  = '2022-11-25',
		REQUIRED = '2.20.0',
		CATEGORY = 'Accounts',
		DESCRIPTION = 'Add additional mail accounts the SnappyMail user has access to by a LDAP query. Basing on the work of FWest98 (https://github.com/FWest98).';

	public function __construct()
	{
		include_once __DIR__ . '/LdapMailAccounts.php';
		include_once __DIR__ . '/LdapConfig.php';
		include_once __DIR__ . '/LdapException.php';

		parent::__construct();
	}

	public function Init(): void
	{
		$this->addHook("login.success", 'AddAdditionalLdapMailAccounts');
	}

	// Function gets called by RainLoop/Actions/User.php
	/**
	 * Add additional mail accounts to the webinterface of the user by looking up the ldap directory
	 * 
	 * @param Account $oAccount
	 */

	public function AddAdditionalLdapMailAccounts(Account $oAccount)
	{
		// Set up config
		$config = LdapConfig::MakeConfig($this->Config());

		$oldapMailAccounts = new LdapMailAccounts($config, $this->Manager()->Actions()->Logger());

		$oldapMailAccounts->AddLdapMailAccounts($oAccount);
	}

	/**
	 * Defines the content of the plugin configuration page inside the Admin Panel of SnappyMail
	 */
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
				->SetLabel("LDAP Username")
				->SetDescription("The user to use for binding to the LDAP server. Should be a DN or RDN. Leave empty for anonymous bind.")
				->SetType(PluginPropertyType::STRING),

			Property::NewInstance(LdapConfig::CONFIG_BIND_PASSWORD)
				->SetLabel("LDAP Password")
				->SetDescription("Leave empty for anonymous bind.")
				->SetType(PluginPropertyType::PASSWORD),

			Property::NewInstance(LdapConfig::CONFIG_OBJECTCLASS)
				->SetLabel("Object class")
				->SetType(PluginPropertyType::STRING)
				->SetDescription("The object class to use when searching for additional mail accounts of the logged in SnappyMail user")
				->SetDefaultValue("user"),

			Property::NewInstance(LdapConfig::CONFIG_BASE)
				->SetLabel("Base DN")
				->SetType(PluginPropertyType::STRING)
				->SetDescription("The base DN to search in for additional mail accounts of the logged in SnappyMail user"),

			Property::NewInstance(LdapConfig::CONFIG_FIELD_SEARCH)
				->SetLabel("Search field")
				->SetType(PluginPropertyType::STRING)
				->SetDescription("The name of the ldap attribute that has to contain the here defined 'LDAP search string'.")
				->SetDefaultValue("member"),				

			Property::NewInstance(LdapConfig::CONFIG_SEARCH_STRING)
				->SetLabel("LDAP search string")
				->SetType(PluginPropertyType::STRING)
				->SetDescription("The search string used to find ldap objects of mail accounts the user has access to.
					\nPossible placeholers:\n#USERNAME# - replaced with the username of the actual SnappyMail user
					\n#BASE_DN# - replaced with the value inside the field 'User base DN'.")
				->SetDefaultValue("uid=#USERNAME#"),	

			Property::NewInstance(LdapConfig::CONFIG_FIELD_USERNAME)
				->SetLabel("Username field of additional account")
				->SetType(PluginPropertyType::STRING)
				->SetDescription("The field containing the username of the found additional mail account. 
					\nThis username gets used by SnappyMail to login to the additional mail account.
					\nIf this field contains an email address, only the local-part before the @ is used.")
				->SetDefaultValue("uid"),

			Property::NewInstance(LdapConfig::CONFIG_FIELD_MAIL_DOMAIN)
				->SetLabel("Domain name field of additional account")
				->SetType(PluginPropertyType::STRING)
				->SetDescription("The field containing the domain name of the found additional mail account. 
					\nThis domain gets looked up by SnappyMail to choose the right connection parameters at logging in to the additional mail account.
					\nIf this field contains an email address, only the domain-part after the @ is used.")
				->SetDefaultValue("mail"),				

			Property::NewInstance(LdapConfig::CONFIG_FIELD_NAME)
				->SetLabel("Additional account name field")
				->SetType(PluginPropertyType::STRING)
				->SetDescription("The field containing the default sender name of the found additional mail account.")
				->SetDefaultValue("displayName")
		];
	}
}
