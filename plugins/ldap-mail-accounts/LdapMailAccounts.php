<?php

use RainLoop\Enumerations\Capa;
use MailSo\Log\Logger;
use RainLoop\Actions;
use RainLoop\Model\MainAccount;

class LdapMailAccounts
{
	/** @var resource */
	private $ldap;

	/** @var bool */
	private $ldapAvailable = true;
	/** @var bool */
	private $ldapConnected = false;
	/** @var bool */
	private $ldapBound = false;

	/** @var LdapMailAccountsConfig */
	private $config;

	/** @var Logger */
	private $logger;

	private const LOG_KEY = "LDAP MAIL ACCOUNTS PLUGIN";

	/**
	 * LdapMailAccount constructor.
	 *
	 * @param LdapMailAccountsConfig $config LdapMailAccountsConfig object containing the admin configuration for this plugin
	 * @param Logger $logger Used to write to the logfile
	 */
	public function __construct(LdapMailAccountsConfig $config, Logger $logger)
	{
		$this->config = $config;
		$this->logger = $logger;

		// Check if LDAP is available
		if (!extension_loaded('ldap') || !function_exists('ldap_connect')) {
			$this->ldapAvailable = false;
			$logger->Write("The LDAP extension is not available!", \LOG_WARNING, self::LOG_KEY);
			return;
		}

		$this->Connect();
	}


	/**
	 * @inheritDoc
	 *
	 * AOverwrite the MainAccount mail address by looking up the new one in the ldap directory
	 *
	 * The ldap search string has to be configured in the plugin configuration of the extension (in the SnappyMail Admin Panel)
	 *
	 * @param string &$sEmail
	 * @param string &$sLogin
	 */
	public function overwriteEmail(&$sEmail, &$sLogin)
	{
		try {
			$this->EnsureBound();
		} catch (LdapMailAccountsException $e) {
			return false; // exceptions are only thrown from the handle error function that does logging already
		}

		// Try to get account information. IncLogin() returns the username of the user
		// and removes the domainname if this was configured inside the domain config.
		$username = $sEmail;
		$oActions = \RainLoop\Api::Actions();
		$oDomain = $oActions->DomainProvider()->Load(\MailSo\Base\Utils::GetDomainFromEmail($sEmail), true);
		if ($oDomain->ImapSettings()->shortLogin){
			$username = @ldap_escape($this->RemoveEventualDomainPart($sEmail), "", LDAP_ESCAPE_FILTER);
		}

		$searchString = $this->config->search_string;

		// Replace placeholders inside the ldap search string with actual values
		$searchString = str_replace("#USERNAME#", $username, $searchString);
		$searchString = str_replace("#BASE_DN#", $this->config->base, $searchString);

		$this->logger->Write("ldap search string after replacement of placeholders: $searchString", \LOG_NOTICE, self::LOG_KEY);

		try {
			$mailAddressResults = $this->FindLdapResults(
				$this->config->field_search,
				$searchString,
				$this->config->base,
				$this->config->objectclass,
				$this->config->field_name,
				$this->config->field_username,
				$this->config->field_domain,
				true,
				$this->config->field_mail_address_main_account,
			);
		}
		catch (LdapMailAccountsException $e) {
			return false; // exceptions are only thrown from the handle error function that does logging already
		}
		if (count($mailAddressResults) < 1) {
			$this->logger->Write("Could not find user $username in LDAP! Overwriting of main mail address not possible.", \LOG_NOTICE, self::LOG_KEY);
			return false;
		}

		foreach($mailAddressResults as $mailAddressResult)
		{
			if($mailAddressResult->username === $username)	{
				//$sLogin is already set to be the same as $sEmail by function "resolveLoginCredentials" in /RainLoop/Actions/UserAuth.php
				//that called this hook, so we just have to overwrite the mail address
				$sEmail = $mailAddressResult->mailMainAccount;
			}
		}
	}

	/**
	 * @inheritDoc
	 *
	 * Add additional mail accounts to the given primary account by looking up the ldap directory
	 *
	 * The ldap search string has to be configured in the plugin configuration of the extension (in the SnappyMail Admin Panel)
	 *
	 * @param MainAccount $oAccount
	 * @return bool true if additional accounts have been added or no additional accounts where found in ldap. false if an error occured
	 */
	public function AddLdapMailAccounts(MainAccount $oAccount): bool
	{
		try {
			$this->EnsureBound();
		} catch (LdapMailAccountsException $e) {
			return false; // exceptions are only thrown from the handle error function that does logging already
		}

		// Try to get account information. IncLogin() returns the username of the user
		// and removes the domainname if this was configured inside the domain config.
		$username = @ldap_escape($oAccount->IncLogin(), "", LDAP_ESCAPE_FILTER);

		$searchString = $this->config->search_string;

		// Replace placeholders inside the ldap search string with actual values
		$searchString = str_replace("#USERNAME#", $username, $searchString);
		$searchString = str_replace("#BASE_DN#", $this->config->base, $searchString);

		$this->logger->Write("ldap search string after replacement of placeholders: $searchString", \LOG_NOTICE, self::LOG_KEY);

		try {
			$mailAddressResults = $this->FindLdapResults(
				$this->config->field_search,
				$searchString,
				$this->config->base,
				$this->config->objectclass,
				$this->config->field_name,
				$this->config->field_username,
				$this->config->field_domain,
				false,
				$this->config->field_mail_address_additional_account
			);
		}
		catch (LdapMailAccountsException $e) {
			return false; // exceptions are only thrown from the handle error function that does logging already
		}
		if (count($mailAddressResults) < 1) {
			$this->logger->Write("Could not find user $username", \LOG_NOTICE, self::LOG_KEY);
			return false;
		} else if (count($mailAddressResults) == 1) {
			$this->logger->Write("Found only one match for user $username, no additional mail adresses found", \LOG_NOTICE, self::LOG_KEY);
			return true;
		}

		//Basing on https://github.com/the-djmaze/snappymail/issues/616

		$oActions = \RainLoop\Api::Actions();

		//Check if SnappyMail is configured to allow additional accounts
		if (!$oActions->GetCapa(Capa::ADDITIONAL_ACCOUNTS)) {
			return $oActions->FalseResponse(__FUNCTION__);
		}

		$aAccounts = $oActions->GetAccounts($oAccount);

		//Search for accounts with suffix " (LDAP)" at the end of the name that were created by this plugin and initially remove them from the
		//account array. This only removes the visibility but does not delete the config done by the user. So if a user looses access to a
		//mailbox the user will not see the account anymore but the configuration can be restored when the user regains access to it
		foreach($aAccounts as $key => $aAccount)
		{
			if (preg_match("/\s\(LDAP\)$/", $aAccount['name']))
			{
				unset($aAccounts[$key]);
			}
		}

		foreach($mailAddressResults as $mailAddressResult)
		{
			$sUsername = $mailAddressResult->username;
			$sDomain = $mailAddressResult->domain;
			$sName = $mailAddressResult->name;
			$sEmail = $mailAddressResult->mailAdditionalAccount;

			//Check if the domain of the found mail address is in the list of configured domains
			if ($oActions->DomainProvider()->Load($sDomain, true))
			{
				//only execute if the found account isn't already in the list of additional accounts
				//and if the found account is different from the main account.
				//The check if the address is different from the one of the main account when using the Nextcloud integration needs
				//to be done twice: directly on the mail address (when Nextcloud is configured to log the user in by mail address)
				//or on "$sUsername@$sDomain" for the case Nextcloud logs the user in to SnappyMail by his username and a default domain.
				if (!isset($aAccounts[$sEmail]) && $oAccount->Email() !== $sEmail && $oAccount->Email() !== "$sUsername@$sDomain")
				{
					//Try to login the user with the same password as the primary account has
					//if this fails the user will see the new mail addresses but will be asked for the correct password
					$sPass = $oAccount->IncPassword();
					//After creating the accounts here $sUsername is used as username to login to the IMAP server (see Account.php)
					$oNewAccount = RainLoop\Model\AdditionalAccount::NewInstanceFromCredentials($oActions, $sEmail, $sUsername, $sPass);

					$aAccounts[$sEmail] = $oNewAccount->asTokenArray($oAccount);
				}

				//Always inject/update the found mailbox names into the array (also if the mailbox already existed)
				if (isset($aAccounts[$sEmail]))
				{
					$aAccounts[$sEmail]['name'] = $sName . " (LDAP)";
				}
			}
			else {
				$this->logger->Write("Domain $sDomain is not part of configured domains in SnappyMail Admin Panel - mail address $sEmail will not be added.", \LOG_NOTICE, self::LOG_KEY);
			}
		}

		if ($aAccounts)
		{
			$oActions->SetAccounts($oAccount, $aAccounts);
			return true;
		}

		return false;
	}

	/**
	 * Checks if a connection to the LDAP was possible
	 *
	 * @throws LdapMailAccountsException
	 *
	 * */
	private function EnsureConnected(): void
	{
		if ($this->ldapConnected) return;

		$res = $this->Connect();
		if (!$res)
			$this->HandleLdapError("Connect");
	}

	/**
	 * Connect to the LDAP using the server address and protocol version defined inside the configuration of the plugin
	 */
	private function Connect(): bool
	{
		// Set up connection
		$ldap = @ldap_connect($this->config->server);
		if ($ldap === false) {
			$this->ldapAvailable = false;
			return false;
		}

		// Set protocol version
		$option = @ldap_set_option($ldap, LDAP_OPT_PROTOCOL_VERSION, $this->config->protocol);
		if (!$option) {
			$this->ldapAvailable = false;
			return false;
		}

		$this->ldap = $ldap;
		$this->ldapConnected = true;
		return true;
	}

	/**
	 * Ensures the plugin has been authenticated at the LDAP
	 *
	 * @throws LdapMailAccountsException
	 *
	 * */
	private function EnsureBound(): void
	{
		if ($this->ldapBound) return;
		$this->EnsureConnected();

		$res = $this->Bind();
		if (!$res)
			$this->HandleLdapError("Bind");
	}

	/**
	 * Authenticates the plugin at the LDAP using the username and password defined inside the configuration of the plugin
	 *
	 * @return bool true if authentication was successful
	 */
	private function Bind(): bool
	{
		// Bind to LDAP here
		$bindResult = @ldap_bind($this->ldap, $this->config->bind_user, $this->config->bind_password);
		if (!$bindResult) {
			$this->ldapAvailable = false;
			return false;
		}

		$this->ldapBound = true;
		return true;
	}

	/**
	 * Handles and logs an eventual LDAP error
	 *
	 * @param string $op
	 * @throws LdapMailAccountsException
	 */
	private function HandleLdapError(string $op = ""): void
	{
		// Obtain LDAP error and write logs
		$errorNo = @ldap_errno($this->ldap);
		$errorMsg = @ldap_error($this->ldap);

		$message = empty($op) ? "LDAP Error: {$errorMsg} ({$errorNo})" : "LDAP Error during {$op}: {$errorMsg} ({$errorNo})";
		$this->logger->Write($message, \LOG_ERR, self::LOG_KEY);
		throw new LdapMailAccountsException($message, $errorNo);
	}

	/**
	 * Looks up the LDAP for additional mail accounts
	 *
	 * The search for additional mail accounts is done by a ldap search using the defined fields inside the configuration of the plugin (SnappyMail Admin Panel)
	 *
	 * @param string $searchField
	 * @param string $searchString
	 * @param string $searchBase
	 * @param string $objectClass
	 * @param string $nameField
	 * @param string $usernameField
	 * @param string $domainField
	 * @param bool $overwriteMailMainAccount true if the mail address of the main account should be looked up for overwriting. false if additional mail accounts should be searched
	 * @param string $mailAddressField The field containing the mail address (of main account or additional mail account)
	 * @return LdapMailAccountResult[]
	 * @throws LdapMailAccountsException
	 */
	private function FindLdapResults(
		string $searchField,
		string $searchString,
		string $searchBase,
		string $objectClass,
		string $nameField,
		string $usernameField,
		string $domainField,
		bool $overwriteMailMainAccount,
		string $mailAddressField): array
	{
		$this->EnsureBound();
		$nameField = strtolower($nameField);
		$usernameField = strtolower($usernameField);
		$domainField = strtolower($domainField);

		$filter = "(&(objectclass=$objectClass)($searchField=$searchString))";
		$this->logger->Write("Used ldap filter to search for mail account(s): $filter", \LOG_NOTICE, self::LOG_KEY);

		//Set together the attributes to search inside the LDAP
		$ldapAttributes = ['dn', $usernameField, $nameField, $domainField, $mailAddressField];

		$ldapResult = @ldap_search($this->ldap, $searchBase, $filter, $ldapAttributes);
		if (!$ldapResult) {
			$this->HandleLdapError("Fetch $objectClass");
			return [];
		}

		$entries = @ldap_get_entries($this->ldap, $ldapResult);
		if (!$entries) {
			$this->HandleLdapError("Fetch $objectClass");
			return [];
		}

		// Save the found ldap entries into a LdapMailAccountResult object and return them
		$results = [];
		for ($i = 0; $i < $entries["count"]; $i++) {
			$entry = $entries[$i];

			$result = new LdapMailAccountResult();
			$result->dn = $entry["dn"];
			$result->name = $this->LdapGetAttribute($entry, $nameField, true, true);

			$result->username = $this->LdapGetAttribute($entry, $usernameField, true, true);
			$result->username = $this->RemoveEventualDomainPart($result->username);

			$result->domain = $this->LdapGetAttribute($entry, $domainField, true, true);
			$result->domain = $this->RemoveEventualLocalPart($result->domain);

			if($overwriteMailMainAccount) {
				$result->mailMainAccount = $this->LdapGetAttribute($entry, $mailAddressField, true, true);
			}
			else {
				$result->mailAdditionalAccount = $this->LdapGetAttribute($entry, $mailAddressField, true, true);
			}

			$results[] = $result;
		}

		return $results;
	}

	/**
	 * Removes an eventually found domain-part of an email address
	 *
	 * If the input string contains an '@' character the function returns the local-part before the '@'\
	 * If no '@' character can be found the input string is returned.
	 *
	 * @param string $sInput
	 * @return string
	 */
	public static function RemoveEventualDomainPart(string $sInput) : string
	{
		// Copy of \MailSo\Base\Utils::GetAccountNameFromEmail to make sure that also after eventual future
		// updates the input string gets returned when no '@' is found (GetDomainFromEmail already doesn't do this)
		$sResult = '';
		if (\strlen($sInput))
		{
			$iPos = \strrpos($sInput, '@');
			$sResult = (false === $iPos) ? $sInput : \substr($sInput, 0, $iPos);
		}

		return $sResult;
	}


	/**
	 * Removes an eventually found local-part of an email address
	 *
	 * If the input string contains an '@' character the function returns the domain-part behind the '@'\
	 * If no '@' character can be found the input string is returned.
	 *
	 * @param string $sInput
	 * @return string
	 */
	public static function RemoveEventualLocalPart(string $sInput) : string
	{
		$sResult = '';
		if (\strlen($sInput))
		{
			$iPos = \strrpos($sInput, '@');
			$sResult = (false === $iPos) ? $sInput : \substr($sInput, $iPos + 1);
		}

		return $sResult;
	}


	/**
	 * Gets LDAP attributes out of the input array
	 *
	 * @param array $entry Array containing the result of a ldap search
	 * @param string $attribute The name of the attribute to return
	 * @param bool $single If true the function checks if exact one value for this attribute is inside the input array. If false an array is returned. Default true.
	 * @param bool $required If true the attribute has to exist inside the input array. Default false.
	 * @return string|string[]
	 */
	private function LdapGetAttribute(array $entry, string $attribute, bool $single = true, bool $required = false)
	{
		if (!isset($entry[$attribute])) {
			if ($required)
				$this->logger->Write("Attribute $attribute not found on object {$entry['dn']} while required", \LOG_NOTICE, self::LOG_KEY);

			return $single ? "" : [];
		}

		if ($single) {
			if ($entry[$attribute]["count"] > 1)
				$this->logger->Write("Attribute $attribute is multivalues while only a single value is expected", \LOG_NOTICE, self::LOG_KEY);

			return $entry[$attribute][0];
		}

		$result = $entry[$attribute];
		unset($result["count"]);
		return array_values($result);
	}
}

class LdapMailAccountResult
{
	/** @var string */
	public $dn;

	/** @var string */
	public $name;

	/** @var string */
	public $username;

	/** @var string */
	public $domain;

	/** @var string */
	public $mailMainAccount;

	/** @var string */
	public $mailAdditionalAccount;
}
