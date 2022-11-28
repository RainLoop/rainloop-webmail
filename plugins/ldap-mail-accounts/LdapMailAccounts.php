<?php

use RainLoop\Enumerations\Capa;
use MailSo\Log\Logger;
use RainLoop\Model\Account;

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

	/** @var LdapConfig */
	private $config;

	/** @var Logger */
	private $logger;

	private const LOG_KEY = "LDAP MAIL ACCOUNTS PLUGIN";

	/**
	 * LdapMailAccount constructor.
	 *
	 * @param LdapConfig $config
	 * @param Account $oAccount
	 * @param Logger $logger
	 */
	public function __construct(LdapConfig $config, Logger $logger)
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
	 * Add additional mail accounts to the given primary account by looking up the ldap directory
	 * 
	 * The ldap lookup has to be configured in the plugin configuration of the extension (in the SnappyMail Admin Panel)
	 * 
	 * @param Account $oAccount
	 * @return bool $success
	 */
	public function AddLdapMailAccounts(Account $oAccount): bool
	{
		try {
			$this->EnsureBound();
		} catch (LdapException $e) {
			return false; // exceptions are only thrown from the handleerror function that does logging already
		}

		// Try to get account information. Login() returns the username of the user 
		// and removes the domainname if this was configured inside the domain config.
		$username = @ldap_escape($oAccount->Login(), "", LDAP_ESCAPE_FILTER);

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
				$this->config->field_domain
			);
		} 
		catch (LdapException $e) {
			return false; // exceptions are only thrown from the handleerror function that does logging already
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

		foreach($mailAddressResults as $mailAddressResult)
		{
			$sUsername = $mailAddressResult->username;
			$sDomain = $mailAddressResult->domain;

$this->logger->Write("Domain: $sDomain Username: $sUsername Login: " . $oAccount->Login() . " E-Mail: " . $oAccount->Email(), \LOG_NOTICE, self::LOG_KEY);

			//Check if the domain of the found mail address is in the list of configured domains
			if ($oActions->DomainProvider()->Load($sDomain, true))
			{
				//only execute if the found account isn't already in the list of additional accounts
				//and if the found account is different from the main account
				if (!$aAccounts["$sUsername@$sDomain"] && $oAccount->Email() !== "$sUsername@$sDomain")
				{
					//Try to login the user with the same password as the primary account has
					//if this fails the user will see the new mail addresses but will be asked for the correct password
					$sPass = $oAccount->Password();
					$oNewAccount = RainLoop\Model\AdditionalAccount::NewInstanceFromCredentials($oActions, "$sUsername@$sDomain", $sUsername, $sPass);
					$aAccounts["$sUsername@$sDomain"] = $oNewAccount->asTokenArray($oAccount);			
				}
			}
			else {
				$this->logger->Write("Domain $sDomain is not part of configured domains in SnappyMail Admin Panel - mail address $sUsername@$sDomain will not be added.", \LOG_NOTICE, self::LOG_KEY);
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
	 * @inheritDoc
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function SetIdentities(Account $account, array $identities): void
	{
		throw new \RainLoop\Exceptions\ClientException("Ldap identities provider does not support storage");
	}

	/**
	 * @inheritDoc
	 */
	public function SupportsStore(): bool
	{
		return false;
	}

	/**
	 * @inheritDoc
	 */
	public function Name(): string
	{
		return "Ldap";
	}

	/** @throws LdapException */
	private function EnsureConnected(): void
	{
		if ($this->ldapConnected) return;

		$res = $this->Connect();
		if (!$res)
			$this->HandleLdapError("Connect");
	}

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

	/** @throws LdapException */
	private function EnsureBound(): void
	{
		if ($this->ldapBound) return;
		$this->EnsureConnected();

		$res = $this->Bind();
		if (!$res)
			$this->HandleLdapError("Bind");
	}

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
	 * @param string $op
	 * @throws LdapException
	 */
	private function HandleLdapError(string $op = ""): void
	{
		// Obtain LDAP error and write logs
		$errorNo = @ldap_errno($this->ldap);
		$errorMsg = @ldap_error($this->ldap);

		$message = empty($op) ? "LDAP Error: {$errorMsg} ({$errorNo})" : "LDAP Error during {$op}: {$errorMsg} ({$errorNo})";
		$this->logger->Write($message, \LOG_ERR, self::LOG_KEY);
		throw new LdapException($message, $errorNo);
	}

	/**
	 * @param string $searchField
	 * @param string $searchString
	 * @param string $searchBase
	 * @param string $objectClass
	 * @param string $nameField
	 * @param string $usernameField
	 * @param string $domainField
	 * @return LdapResult[]
	 * @throws LdapException
	 */
	private function FindLdapResults(
		string $searchField, 
		string $searchString, 
		string $searchBase, 
		string $objectClass, 
		string $nameField, 
		string $usernameField, 
		string $domainField): array
	{	
		$this->EnsureBound();	
		$nameField = strtolower($nameField);
		$usernameField = strtolower($usernameField);
		$domainField = strtolower($domainField);

		$filter = "(&(objectclass=$objectClass)($searchField=$searchString))";
		$this->logger->Write("Used ldap filter to search for additional mail accounts: $filter", \LOG_NOTICE, self::LOG_KEY);

		$ldapResult = @ldap_search($this->ldap, $searchBase, $filter, ['dn', $usernameField, $nameField, $domainField]);
		if (!$ldapResult) {
			$this->HandleLdapError("Fetch $objectClass");
			return [];
		}

		$entries = @ldap_get_entries($this->ldap, $ldapResult);
		if (!$entries) {
			$this->HandleLdapError("Fetch $objectClass");
			return [];
		}

		// Save the found ldap entries into a LdapResult object and return them
		$results = [];
		for ($i = 0; $i < $entries["count"]; $i++) {
			$entry = $entries[$i];

			$result = new LdapResult();
			$result->dn = $entry["dn"];
			$result->name = $this->LdapGetAttribute($entry, $nameField, true, true);
			
			$result->username = $this->LdapGetAttribute($entry, $usernameField, true, true);
			$result->username = $this->RemoveEventualDomainPart($result->username);

			$result->domain = $this->LdapGetAttribute($entry, $domainField, true, true);
			$result->domain = $this->RemoveEventualLocalPart($result->domain);

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
	 * @param array $entry
	 * @param string $attribute
	 * @param bool $single
	 * @param bool $required
	 * @return string|string[]
	 */
	private function LdapGetAttribute(array $entry, string $attribute, bool $single = true, bool $required = false)
	{
		//INFO if $single=false a array is returned. needet for identities, but not for additional mail accounts / usernames

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

class LdapResult
{
	/** @var string */
	public $dn;

	/** @var string */
	public $name;

	/** @var string */
	public $username;

	/** @var string */
	public $domain;
}
