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

	private const LOG_KEY = "Ldap";

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
	 * @param Account $oAccount
	 * @return bool $success
	 */
	public function AddLdapMailAccounts(Account $oAccount): bool
	{
		try {
			$this->EnsureBound();
		} catch (LdapException $e) {
			return []; // exceptions are only thrown from the handleerror function that does logging already
		}

		// Try to get account information. Login() returns the username of the user and removes the domainname 
		// if this was configured inside the domain config.
		$username = @ldap_escape($oAccount->Login(), "", LDAP_ESCAPE_FILTER);

		try {
			$mailAddressResults = $this->FindLdapResults(
				$this->config->user_field_search,
				$username,
				$this->config->user_base,
				$this->config->user_objectclass,
				$this->config->user_field_name,
				$this->config->user_field_mail
			);
		} catch (LdapException $e) {
			return []; // exceptions are only thrown from the handleerror function that does logging already
		}

		if (count($mailAddressResults) < 1) {
			$this->logger->Write("Could not find user $username", \LOG_NOTICE, self::LOG_KEY);
			return [];
		} else if (count($mailAddressResults) == 1) {
			$this->logger->Write("Found only one match for user $username, no additional mail adresses found", \LOG_NOTICE, self::LOG_KEY);
		}

		//From: https://github.com/the-djmaze/snappymail/issues/616

		$oActions = \RainLoop\Api::Actions();
		$oMainAccount = $oActions->getMainAccountFromToken();

		if (!$oActions->GetCapa(Capa::ADDITIONAL_ACCOUNTS)) {
			return $oActions->FalseResponse(__FUNCTION__);
		}

		$aAccounts = $oActions->GetAccounts($oMainAccount);

		$sPassword = $oActions->GetActionParam('Password', '');
		$bNew = '1' === (string)$oActions->GetActionParam('New', '1');

		foreach($mailAddressResults as $mailAddressResult)
		{
			$sUsername = $mailAddressResult->$username;
			$sEmail = \MailSo\Base\Utils::IdnToAscii($sUsername, true);
			if ($bNew && ($oMainAccount->Email() === $sUsername || isset($aAccounts[$sUsername]))) {
				//Account already exists
				return false;
			}

			if ($bNew || $sPassword) {
				$oNewAccount = $oActions->LoginProcess($sUsername, $sPassword, false, false);
				$aAccounts[$sUsername] = $oNewAccount->asTokenArray($oMainAccount);
			} else {
				$aAccounts[$sUsername] = \RainLoop\Model\AdditionalAccount::convertArray($aAccounts[$sUsername]);
			}

			if ($aAccounts[$sUsername]) {
				$aAccounts[$sUsername]['name'] = $mailAddressResult->$name;
				$oActions->SetAccounts($oMainAccount, $aAccounts);
			}
		}

/* Not needed at the moment
		if (!$this->config->group_get)
			return $identities;

		try {
			$groupResults = $this->FindLdapResults(
				$this->config->group_field_member,
				$userResult->dn,
				$this->config->group_base,
				$this->config->group_objectclass,
				$this->config->group_field_name,
				$this->config->group_field_mail
			);
		} catch (LdapException $e) {
			return []; // exceptions are only thrown from the handleerror function that does logging already
		}

		foreach ($groupResults as $group) {
			foreach ($group->emails as $email) {
				$name = $this->config->group_sender_format;
				$name = str_replace("#USER#", $userResult->name, $name);
				$name = str_replace("#GROUP#", $group->name, $name);

				$identity = new Identity($email, $email);
				$identity->SetName($name);
				$identity->SetBcc($email);

				$identities[] = $identity;
			}
		}
*/

		return true;
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
	 * @param string $searchValue
	 * @param string $searchBase
	 * @param string $objectClass
	 * @param string $nameField
	 * @param string $mailField
	 * @return LdapResult[]
	 * @throws LdapException
	 */
	private function FindLdapResults(string $searchField, string $searchValue, string $searchBase, string $objectClass, string $nameField, string $mailField): array
	{
		$this->EnsureBound();

		$nameField = strtolower($nameField);
		$mailField = strtolower($mailField);

		//TODO: temporary fixed to concat with Base DN - should be variable
		$filter = "(&(objectclass=$objectClass)($searchField=uid=$searchValue,$searchBase))";
		$this->logger->Write("Filter=$filter", \LOG_NOTICE, self::LOG_KEY);

		$ldapResult = @ldap_search($this->ldap, $searchBase, $filter, ['dn', $mailField, $nameField]);
		if (!$ldapResult) {
			$this->HandleLdapError("Fetch $objectClass");
			return [];
		}

		$entries = @ldap_get_entries($this->ldap, $ldapResult);
		if (!$entries) {
			$this->HandleLdapError("Fetch $objectClass");
			return [];
		}

		$results = [];
		for ($i = 0; $i < $entries["count"]; $i++) {
			$entry = $entries[$i];

			$result = new LdapResult();
			$result->dn = $entry["dn"];
			$result->name = $this->LdapGetAttribute($entry, $nameField, true, true);
			$result->username = $this->LdapGetAttribute($entry, $mailField, true, true);

			$results[] = $result;
		}

		return $results;
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
		//TODO: remove line when not needed anymore
		$this->logger->Write("Attribute=$attribute, DN={$entry['dn']}", \LOG_NOTICE, self::LOG_KEY);

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
}
