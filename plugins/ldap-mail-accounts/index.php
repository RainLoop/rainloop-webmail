<?php

use RainLoop\Enumerations\Capa;
use RainLoop\Enumerations\PluginPropertyType;
use RainLoop\Plugins\AbstractPlugin;
use RainLoop\Plugins\Property;
use RainLoop\Model\MainAccount;
use RainLoop\Actions;


class LdapMailAccountsPlugin extends AbstractPlugin
{
	const
		NAME     = 'LDAP Mail Accounts',
		VERSION  = '2.0.0',
		AUTHOR   = 'cm-schl',
		URL      = 'https://github.com/cm-sch',
		RELEASE  = '2022-12-08',
		REQUIRED = '2.25.4',
		CATEGORY = 'Accounts',
		DESCRIPTION = 'Add additional mail accounts the SnappyMail user has access to by a LDAP query. Basing on the work of FWest98 (https://github.com/FWest98).';

	public function __construct()
	{
		include_once __DIR__ . '/LdapMailAccounts.php';
		include_once __DIR__ . '/LdapMailAccountsConfig.php';
		include_once __DIR__ . '/LdapMailAccountsException.php';

		parent::__construct();
	}

	public function Init(): void
	{
		$this->addHook("login.success", 'AddAdditionalLdapMailAccounts');
		$this->addHook('login.credentials', 'overwriteMainAccountEmail');
	}

	// Function gets called by RainLoop/Actions/UserAuth.php
	/**
	 * Overwrite the MainAccount mail address by looking up the new one in the ldap directory
	 *
	 * @param string &$sEmail
	 * @param string &$sLogin
	 */
	public function overwriteMainAccountEmail(&$sEmail, &$sLogin)
	{
$this->Manager()->Actions()->Logger()->Write("Login DATA: login: $sLogin email: $sEmail", \LOG_WARNING, "LDAP MAIL ACCOUNTS PLUGIN");

	// Set up config
	$config = LdapMailAccountsConfig::MakeConfig($this->Config());

		if ($config->bool_overwrite_mail_address_main_account)
		{
			$oldapMailAccounts = new LdapMailAccounts($config, $this->Manager()->Actions()->Logger());
			$oldapMailAccounts->overwriteEmail($sEmail, $sLogin);
		}

$this->Manager()->Actions()->Logger()->Write("Login DATA: login: $sLogin email: $sEmail", \LOG_WARNING, "LDAP MAIL ACCOUNTS PLUGIN");
	}

	// Function gets called by RainLoop/Actions/User.php
	/**
	 * Add additional mail accounts to the webinterface of the user by looking up the ldap directory
	 *
	 * @param MainAccount $oAccount
	 */
	public function AddAdditionalLdapMailAccounts(MainAccount $oAccount)
	{
		// Set up config
		$config = LdapMailAccountsConfig::MakeConfig($this->Config());
		$oldapMailAccounts = new LdapMailAccounts($config, $this->Manager()->Actions()->Logger());
		$oldapMailAccounts->AddLdapMailAccounts($oAccount);
	}

	/**
	 * Defines the content of the plugin configuration page inside the Admin Panel of SnappyMail
	 */
	protected function configMapping(): array
	{
		$groupOverwriteMainAccount = new \RainLoop\Plugins\PropertyCollection('Overwrite mail address of main account');
		$groupOverwriteMainAccount->exchangeArray([
			\RainLoop\Plugins\Property::NewInstance(LdapMailAccountsConfig::CONFIG_BOOL_OVERWRITE_MAIL_ADDRESS_MAIN_ACCOUNT)->SetLabel('Enabled')
			->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
			->SetDefaultValue(false),

			\RainLoop\Plugins\Property::NewInstance(LdapMailAccountsConfig::CONFIG_FIELD_MAIL_ADDRESS_MAIN_ACCOUNT)
				->SetLabel("Mail address field for main account")
				->SetType(RainLoop\Enumerations\PluginPropertyType::STRING)
				->SetDescription("The ldap field containing the mail address to use on the SnappyMail main account.
					\nThe value found inside ldap will overwrite the mail address of the SnappyMail main account (the account the user logged in at SnappyMail)
					\nThe mail address used at login will still be used to login to the servers.")
				->SetDefaultValue("mail"),
		]);	

		return [
			\RainLoop\Plugins\Property::NewInstance(LdapMailAccountsConfig::CONFIG_SERVER)
				->SetLabel("LDAP Server URL")
				->SetPlaceholder("ldap://server:port")
				->SetType(RainLoop\Enumerations\PluginPropertyType::STRING),

			\RainLoop\Plugins\Property::NewInstance(LdapMailAccountsConfig::CONFIG_PROTOCOL_VERSION)
				->SetLabel("LDAP Protocol Version")
				->SetType(RainLoop\Enumerations\PluginPropertyType::SELECTION)
				->SetDefaultValue([2, 3]),

			\RainLoop\Plugins\Property::NewInstance(LdapMailAccountsConfig::CONFIG_BIND_USER)
				->SetLabel("LDAP Username")
				->SetDescription("The user to use for binding to the LDAP server. Should be a DN or RDN. Leave empty for anonymous bind.")
				->SetType(RainLoop\Enumerations\PluginPropertyType::STRING),

			\RainLoop\Plugins\Property::NewInstance(LdapMailAccountsConfig::CONFIG_BIND_PASSWORD)
				->SetLabel("LDAP Password")
				->SetDescription("Leave empty for anonymous bind.")
				->SetType(RainLoop\Enumerations\PluginPropertyType::PASSWORD),

			\RainLoop\Plugins\Property::NewInstance(LdapMailAccountsConfig::CONFIG_OBJECTCLASS)
				->SetLabel("Object class")
				->SetType(RainLoop\Enumerations\PluginPropertyType::STRING)
				->SetDescription("The object class to use when searching for additional mail accounts of the logged in SnappyMail user")
				->SetDefaultValue("user"),

			\RainLoop\Plugins\Property::NewInstance(LdapMailAccountsConfig::CONFIG_BASE)
				->SetLabel("Base DN")
				->SetType(RainLoop\Enumerations\PluginPropertyType::STRING)
				->SetDescription("The base DN to search in for additional mail accounts of the logged in SnappyMail user"),

			\RainLoop\Plugins\Property::NewInstance(LdapMailAccountsConfig::CONFIG_FIELD_SEARCH)
				->SetLabel("Search field")
				->SetType(RainLoop\Enumerations\PluginPropertyType::STRING)
				->SetDescription("The name of the ldap attribute that has to contain the here defined 'LDAP search string'.")
				->SetDefaultValue("member"),

			\RainLoop\Plugins\Property::NewInstance(LdapMailAccountsConfig::CONFIG_SEARCH_STRING)
				->SetLabel("LDAP search string")
				->SetType(RainLoop\Enumerations\PluginPropertyType::STRING)
				->SetDescription("The search string used to find ldap objects of mail accounts the user has access to.
					\nPossible placeholers:\n#USERNAME# - replaced with the username of the actual SnappyMail user
					\n#BASE_DN# - replaced with the value inside the field 'User base DN'.")
				->SetDefaultValue("uid=#USERNAME#"),

			\RainLoop\Plugins\Property::NewInstance(LdapMailAccountsConfig::CONFIG_FIELD_USERNAME)
				->SetLabel("Username field")
				->SetType(RainLoop\Enumerations\PluginPropertyType::STRING)
				->SetDescription("Used when searching for additional accounts or when overwriting the mail address of the main account.
					\nThe field containing the username of the mail account.
					\nWhen looking up additional accounts:
					\nIf this field contains an email address, only the local-part before the @ is used. The domain part is retrieved configuring the field below. This username gets used by SnappyMail to login to the additional mail account
					\nWhen overwriting the main account mail address:
					\nThe username from SnappyMail login gets used to search an LDAP entry containig a field with the same username.")
				->SetDefaultValue("uid"),

			\RainLoop\Plugins\Property::NewInstance(LdapMailAccountsConfig::CONFIG_FIELD_MAIL_DOMAIN)
				->SetLabel("Domain name field of additional account")
				->SetType(RainLoop\Enumerations\PluginPropertyType::STRING)
				->SetDescription("The field containing the domain name of the found additional mail account.
					\nThis domain gets looked up by SnappyMail to choose the right connection parameters at logging in to the additional mail account.
					\nIf this field contains an email address, only the domain-part after the @ is used.")
				->SetDefaultValue("mail"),

			\RainLoop\Plugins\Property::NewInstance(LdapMailAccountsConfig::CONFIG_FIELD_MAIL_ADDRESS_ADDITIONAL_ACCOUNT)
				->SetLabel("Mail address field for additional account")
				->SetType(RainLoop\Enumerations\PluginPropertyType::STRING)
				->SetDescription("The ldap field containing the mail address to use on the found additional mail account.
					\nThe value found inside ldap will be used as mail address of the additional mail accounts created by this plugin.
					\nIn most cases this could be the same ldap field as in \"Domain name field of additional account\"")
				->SetDefaultValue("mail"),

			\RainLoop\Plugins\Property::NewInstance(LdapMailAccountsConfig::CONFIG_FIELD_NAME)
				->SetLabel("Additional account name field")
				->SetType(RainLoop\Enumerations\PluginPropertyType::STRING)
				->SetDescription("The field containing the default sender name of the found additional mail account.")
				->SetDefaultValue("displayName"),

			$groupOverwriteMainAccount
					
		];
	}
}
