<?php

namespace RainLoop;

use RainLoop\Enumerations\UploadClientError;
use RainLoop\Enumerations\UploadError;
use RainLoop\Providers\Identities;

class Actions
{
	use Actions\Admin;
	use Actions\User;
	use Actions\Raw;
	use Actions\Response;
	use Actions\Localization;
	use Actions\Themes;

	const AUTH_SIGN_ME_TOKEN_KEY = 'rlsmauth';
	const AUTH_MAILTO_TOKEN_KEY = 'rlmailtoauth';
	const AUTH_SPEC_TOKEN_KEY = 'rlspecauth';
	const AUTH_SPEC_LOGOUT_TOKEN_KEY = 'rlspeclogout';
	const AUTH_SPEC_LOGOUT_CUSTOM_MSG_KEY = 'rlspeclogoutcmk';

	/**
	 * @var \MailSo\Base\Http
	 */
	private $oHttp;

	/**
	 * @var array
	 */
	private $aCurrentActionParams;

	/**
	 * @var \MailSo\Mail\MailClient
	 */
	private $oMailClient;

	/**
	 * @var \RainLoop\Plugins\Manager
	 */
	private $oPlugins;

	/**
	 * @var \MailSo\Log\Logger
	 */
	private $oLogger;

	/**
	 * @var \MailSo\Log\Logger
	 */
	private $oLoggerAuth;

	/**
	 * @var array of \MailSo\Cache\CacheClient
	 */
	private $aCachers;

	/**
	 * @var Providers\Identities
	 */
	private $oIdentitiesProvider;

	/**
	 * @var \RainLoop\Providers\Storage
	 */
	private $oStorageProvider;

	/**
	 * @var \RainLoop\Providers\Storage
	 */
	private $oLocalStorageProvider;

	/**
	 * @var \RainLoop\Providers\Files
	 */
	private $oFilesProvider;

	/**
	 * @var \RainLoop\Providers\Domain
	 */
	private $oDomainProvider;

	/**
	 * @var \RainLoop\Providers\Settings
	 */
	private $oSettingsProvider;

	/**
	 * @var \RainLoop\Providers\Settings
	 */
	private $oLocalSettingsProvider;

	/**
	 * @var \RainLoop\Providers\AddressBook
	 */
	private $oAddressBookProvider;

	/**
	 * @var \RainLoop\Providers\Suggestions
	 */
	private $oSuggestionsProvider;

	/**
	 * @var \RainLoop\Config\Application
	 */
	private $oConfig;

	/**
	 * @var string
	 */
	private $sSpecAuthToken;

	/**
	 * @access private
	 */
	function __construct()
	{
		$this->aCurrentActionParams = array();

		$this->oHttp = null;
		$this->oLogger = null;
		$this->oPlugins = null;
		$this->oMailClient = null;
		$this->oConfig = null;
		$this->aCachers = array();

		$this->oStorageProvider = null;
		$this->oLocalStorageProvider = null;
		$this->oSettingsProvider = null;
		$this->oLocalSettingsProvider = null;
		$this->oFilesProvider = null;
		$this->oDomainProvider = null;
		$this->oAddressBookProvider = null;
		$this->oSuggestionsProvider = null;

		$this->sSpecAuthToken = '';
		$this->bIsJson = false;

		$oConfig = $this->Config();
		$this->Plugins()->RunHook('filter.application-config', array($oConfig));

		$this->Logger()->Ping();
	}

	public function SetSpecAuthToken(string $sSpecAuthToken): self
	{
		$this->sSpecAuthToken = $sSpecAuthToken;

		return $this;
	}

	public function SetIsJson(bool $bIsJson): self
	{
		$this->bIsJson = $bIsJson;

		return $this;
	}

	public function GetSpecAuthToken(): string
	{
		return $this->sSpecAuthToken;
	}

	public function GetIsJson(): bool
	{
		return $this->bIsJson;
	}

	public function GetShortLifeSpecAuthToken(int $iLife = 60): string
	{
		$aAccountHash = Utils::DecodeKeyValues($this->getLocalAuthToken());
		if (!empty($aAccountHash[0]) && 'token' === $aAccountHash[0]) {
			$aAccountHash[10] = \time() + $iLife;
			return Utils::EncodeKeyValues($aAccountHash);
		}

		return '';
	}

	public function Config(): Config\Application
	{
		if (null === $this->oConfig) {
			$this->oConfig = new Config\Application();
			if (!$this->oConfig->Load()) {
				usleep(10000);
				$this->oConfig->Load();
			}

//			if (!$bLoaded && !$this->oConfig->IsFileExists())
//			{
//				$bSave = true;
//			}
//
//			if ($bLoaded && !$bSave)
//			{
//				$bSave = APP_VERSION !== $this->oConfig->Get('version', 'current');
//			}
//
//			if ($bSave)
//			{
//				$this->oConfig->Save();
//			}
		}

		return $this->oConfig;
	}

	/**
	 * @return mixed
	 */
	private function fabrica(string $sName, ?Model\Account $oAccount = null)
	{
		$mResult = null;
		$this->Plugins()->RunHook('main.fabrica', array($sName, &$mResult), false);

		if (null === $mResult) {
			switch ($sName) {
				case 'files':
					// RainLoop\Providers\Files\IFiles
					$mResult = new Providers\Files\FileStorage(APP_PRIVATE_DATA . 'storage/files');
					break;
				case 'storage':
				case 'storage-local':
					// RainLoop\Providers\Storage\IStorage
					$mResult = new Providers\Storage\FileStorage(
						APP_PRIVATE_DATA . 'storage', 'storage-local' === $sName);
					break;
				case 'settings':
				case 'settings-local':
					// RainLoop\Providers\Settings\ISettings
					$mResult = new Providers\Settings\DefaultSettings(
						$this->StorageProvider('settings-local' === $sName));
					break;
				case 'login':
					// Providers\Login\LoginInterface
					$mResult = new Providers\Login\DefaultLogin();
					break;
				case 'domain':
					// Providers\Domain\DomainAdminInterface
					$mResult = new Providers\Domain\DefaultDomain(APP_PRIVATE_DATA . 'domains', $this->Cacher());
					break;
				case 'filters':
					// Providers\Filters\FiltersInterface
					$mResult = new Providers\Filters\SieveStorage(
						$this->Plugins(), $this->Config()
					);
					break;
				case 'address-book':
					// Providers\AddressBook\AddressBookInterface
					$sDsn = \trim($this->Config()->Get('contacts', 'pdo_dsn', ''));
					$sUser = \trim($this->Config()->Get('contacts', 'pdo_user', ''));
					$sPassword = (string)$this->Config()->Get('contacts', 'pdo_password', '');
					$sDsnType = $this->ValidateContactPdoType(\trim($this->Config()->Get('contacts', 'type', 'sqlite')));
					if ('sqlite' === $sDsnType) {
						$sUser = $sPassword = '';
						$sDsn = 'sqlite:' . APP_PRIVATE_DATA . 'AddressBook.sqlite';
					} else {
						$sDsn = $sDsnType . ':' . \preg_replace('/^[a-z]+:/', '', $sDsn);
					}
					$mResult = new Providers\AddressBook\PdoAddressBook($sDsn, $sUser, $sPassword, $sDsnType);
					break;
				case 'identities':
					$mResult = [];
					break;
				case 'suggestions':
					$mResult = [];
					break;
			}
		}

		// Always give the file provider as last for identities, it is the override
		if ('identities' === $sName) {
			$mResult[] = new Providers\Identities\FileIdentities($this->StorageProvider(true));
		}

		foreach (\is_array($mResult) ? $mResult : array($mResult) as $oItem) {
			if ($oItem && \method_exists($oItem, 'SetLogger')) {
				$oItem->SetLogger($this->Logger());
			}
		}

		$this->Plugins()->RunHook('filter.fabrica', array($sName, &$mResult, $oAccount), false);

		return $mResult;
	}

	public function BootEnd(): void
	{
		try {
			if ($this->MailClient()->IsLoggined()) {
				$this->MailClient()->LogoutAndDisconnect();
			}
		} catch (\Throwable $oException) {
			unset($oException);
		}
	}

	public function ParseQueryString(): string
	{
		$sQuery = \trim($_SERVER['QUERY_STRING'] ?? '');

		$iPos = \strpos($sQuery, '&');
		if (0 < $iPos) {
			$sQuery = \substr($sQuery, 0, $iPos);
		}

		$sQuery = \trim(\trim($sQuery), ' /');

		$aSubQuery = $_GET['q'] ?? null;
		if (\is_array($aSubQuery)) {
			$aSubQuery = \array_map(function ($sS) {
				return \trim(\trim($sS), ' /');
			}, $aSubQuery);

			if (0 < \count($aSubQuery)) {
				$sQuery .= '/' . \implode('/', $aSubQuery);
			}
		}

		return $sQuery;
	}

	// rlspecauth / AuthAccountHash
	public function getAuthAccountHash() : string
	{
		if ('' === $this->sSpecAuthToken && !\strlen($this->GetSpecAuthLogoutTokenWithDeletion())) {
			$sAuthAccountHash = $this->GetSpecAuthTokenCookie() ?: $this->GetSpecAuthToken();
			if (empty($sAuthAccountHash)) {
				$oAccount = $this->GetAccountFromSignMeToken();
				if ($oAccount) try
				{
					$this->CheckMailConnection($oAccount);
					$this->AuthToken($oAccount);
					$sAuthAccountHash = $this->GetSpecAuthToken();
				}
				catch (\Throwable $oException)
				{
					$oException = null;
					$this->ClearSignMeData($oAccount);
				}
			}
			$this->SetSpecAuthToken($sAuthAccountHash);
		}
		return $this->GetSpecAuthToken();
	}

	private function compileLogParams(string $sLine, ?Model\Account $oAccount = null, bool $bUrlEncode = false, array $aAdditionalParams = array()): string
	{
		$aClear = array();

		if (false !== \strpos($sLine, '{date:')) {
			$oConfig = $this->Config();
			$sLine = \preg_replace_callback('/\{date:([^}]+)\}/', function ($aMatch) use ($oConfig, $bUrlEncode) {
				return Utils::UrlEncode((new \DateTime('now', new \DateTimeZone($oConfig->Get('logs', 'time_zone', 'UTC'))))->format($aMatch[1]), $bUrlEncode);
			}, $sLine);

			$aClear['/\{date:([^}]*)\}/'] = 'date';
		}

		if (false !== \strpos($sLine, '{imap:') || false !== \strpos($sLine, '{smtp:')) {
			if (!$oAccount) {
				$this->getAuthAccountHash();
				$oAccount = $this->getAccountFromToken(false);
			}

			if ($oAccount) {
				$sLine = \str_replace('{imap:login}', Utils::UrlEncode($oAccount->IncLogin(), $bUrlEncode), $sLine);
				$sLine = \str_replace('{imap:host}', Utils::UrlEncode($oAccount->DomainIncHost(), $bUrlEncode), $sLine);
				$sLine = \str_replace('{imap:port}', Utils::UrlEncode($oAccount->DomainIncPort(), $bUrlEncode), $sLine);

				$sLine = \str_replace('{smtp:login}', Utils::UrlEncode($oAccount->OutLogin(), $bUrlEncode), $sLine);
				$sLine = \str_replace('{smtp:host}', Utils::UrlEncode($oAccount->DomainOutHost(), $bUrlEncode), $sLine);
				$sLine = \str_replace('{smtp:port}', Utils::UrlEncode($oAccount->DomainOutPort(), $bUrlEncode), $sLine);
			}

			$aClear['/\{imap:([^}]*)\}/i'] = 'imap';
			$aClear['/\{smtp:([^}]*)\}/i'] = 'smtp';
		}

		if (false !== \strpos($sLine, '{request:')) {
			if (false !== \strpos($sLine, '{request:ip}')) {
				$sLine = \str_replace('{request:ip}', Utils::UrlEncode($this->Http()->GetClientIp(
					$this->Config()->Get('labs', 'http_client_ip_check_proxy', false)), $bUrlEncode), $sLine);
			}

			if (false !== \strpos($sLine, '{request:domain}')) {
				$sLine = \str_replace('{request:domain}',
					Utils::UrlEncode($this->Http()->GetHost(false, true, true), $bUrlEncode), $sLine);
			}

			if (false !== \strpos($sLine, '{request:domain-clear}')) {
				$sLine = \str_replace('{request:domain-clear}',
					Utils::UrlEncode(
						\MailSo\Base\Utils::GetClearDomainName($this->Http()->GetHost(false, true, true)), $bUrlEncode), $sLine);
			}

			$aClear['/\{request:([^}]*)\}/i'] = 'request';
		}

		if (false !== \strpos($sLine, '{user:')) {
			if (false !== \strpos($sLine, '{user:uid}')) {
				$sLine = \str_replace('{user:uid}',
					Utils::UrlEncode(\base_convert(\sprintf('%u',
						\crc32(\md5(Utils::GetConnectionToken()))), 10, 32), $bUrlEncode),
					$sLine
				);
			}

			if (false !== \strpos($sLine, '{user:ip}')) {
				$sLine = \str_replace('{user:ip}', Utils::UrlEncode($this->Http()->GetClientIp(
					$this->Config()->Get('labs', 'http_client_ip_check_proxy', false)), $bUrlEncode), $sLine);
			}

			if (\preg_match('/\{user:(email|login|domain)\}/i', $sLine)) {
				if (!$oAccount) {
					$this->getAuthAccountHash();
					$oAccount = $this->getAccountFromToken(false);
				}

				if ($oAccount) {
					$sEmail = $oAccount->Email();

					$sLine = \str_replace('{user:email}', Utils::UrlEncode($sEmail, $bUrlEncode), $sLine);
					$sLine = \str_replace('{user:login}', Utils::UrlEncode(
						\MailSo\Base\Utils::GetAccountNameFromEmail($sEmail), $bUrlEncode), $sLine);
					$sLine = \str_replace('{user:domain}', Utils::UrlEncode(
						\MailSo\Base\Utils::GetDomainFromEmail($sEmail), $bUrlEncode), $sLine);
					$sLine = \str_replace('{user:domain-clear}', Utils::UrlEncode(
						\MailSo\Base\Utils::GetClearDomainName(
							\MailSo\Base\Utils::GetDomainFromEmail($sEmail)), $bUrlEncode), $sLine);
				}
			}

			$aClear['/\{user:([^}]*)\}/i'] = 'unknown';
		}

		if (false !== \strpos($sLine, '{labs:')) {
			$sLine = \preg_replace_callback('/\{labs:rand:([1-9])\}/', function ($aMatch) {
				return \rand(\pow(10, $aMatch[1] - 1), \pow(10, $aMatch[1]) - 1);
			}, $sLine);

			$aClear['/\{labs:([^}]*)\}/'] = 'labs';
		}

		foreach ($aAdditionalParams as $sKey => $sValue) {
			$sLine = \str_replace($sKey, $sValue, $sLine);
		}

		foreach ($aClear as $sKey => $sValue) {
			$sLine = \preg_replace($sKey, $sValue, $sLine);
		}

		return $sLine;
	}

	private function compileLogFileName(string $sFileName): string
	{
		$sFileName = \trim($sFileName);

		if (0 !== \strlen($sFileName)) {
			$sFileName = $this->compileLogParams($sFileName);

			$sFileName = \preg_replace('/[\/]+/', '/', \preg_replace('/[.]+/', '.', $sFileName));
			$sFileName = \preg_replace('/[^a-zA-Z0-9@_+=\-\.\/!()\[\]]/', '', $sFileName);
		}

		if (0 === \strlen($sFileName)) {
			$sFileName = 'rainloop-log.txt';
		}

		return $sFileName;
	}

	public function SetAuthLogoutToken(): void
	{
		\header('X-RainLoop-Action: Logout');
		Utils::SetCookie(self::AUTH_SPEC_LOGOUT_TOKEN_KEY, \md5($_SERVER['REQUEST_TIME_FLOAT']), 0);
	}

	public function SetAuthToken(Model\Account $oAccount): void
	{
		$sSpecAuthToken = '_' . $oAccount->GetAuthTokenQ();

		$this->SetSpecAuthToken($sSpecAuthToken);
		Utils::SetCookie(self::AUTH_SPEC_TOKEN_KEY, $sSpecAuthToken);

		if ($oAccount->SignMe() && 0 < \strlen($oAccount->SignMeToken())) {
			Utils::SetCookie(self::AUTH_SIGN_ME_TOKEN_KEY,
				Utils::EncodeKeyValuesQ(array(
					'e' => $oAccount->Email(),
					't' => $oAccount->SignMeToken()
				)),
				\time() + 60 * 60 * 24 * 30);

			$this->StorageProvider()->Put($oAccount,
				Providers\Storage\Enumerations\StorageType::CONFIG,
				'sign_me',
				Utils::EncodeKeyValuesQ(array(
					'Time' => \time(),
					'AuthToken' => $oAccount->GetAuthTokenQ(),
					'SignMetToken' => $oAccount->SignMeToken()
				))
			);
		}
	}

	public function GetSpecAuthTokenCookie(): string
	{
		return Utils::GetCookie(self::AUTH_SPEC_TOKEN_KEY, '');
	}

	public function GetSpecAuthLogoutTokenWithDeletion(): string
	{
		$sResult = Utils::GetCookie(self::AUTH_SPEC_LOGOUT_TOKEN_KEY, '');
		if (0 < strlen($sResult)) {
			Utils::ClearCookie(self::AUTH_SPEC_LOGOUT_TOKEN_KEY);
		}

		return $sResult;
	}

	public function GetSpecLogoutCustomMgsWithDeletion(): string
	{
		$sResult = Utils::GetCookie(self::AUTH_SPEC_LOGOUT_CUSTOM_MSG_KEY, '');
		if (0 < strlen($sResult)) {
			Utils::ClearCookie(self::AUTH_SPEC_LOGOUT_CUSTOM_MSG_KEY);
		}

		return $sResult;
	}

	public function SetSpecLogoutCustomMgsWithDeletion(string $sMessage): string
	{
		Utils::SetCookie(self::AUTH_SPEC_LOGOUT_CUSTOM_MSG_KEY, $sMessage, 0);
	}

	private function getLocalAuthToken(): string
	{
		$sToken = $this->GetSpecAuthToken();
		return !empty($sToken) && '_' === \substr($sToken, 0, 1) ? \substr($sToken, 1) : '';
	}

	/**
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function GetAccount(bool $bThrowExceptionOnFalse = false): ?Model\Account
	{
		return $this->getAccountFromToken($bThrowExceptionOnFalse);
	}

	public function Http(): \MailSo\Base\Http
	{
		if (null === $this->oHttp) {
			$this->oHttp = \MailSo\Base\Http::SingletonInstance();
		}

		return $this->oHttp;
	}

	public function MailClient(): \MailSo\Mail\MailClient
	{
		if (null === $this->oMailClient) {
			$this->oMailClient = new \MailSo\Mail\MailClient();
			$this->oMailClient->SetLogger($this->Logger());
		}

		return $this->oMailClient;
	}

	public function StorageProvider(bool $bLocal = false): Providers\Storage
	{
		if ($bLocal) {
			if (null === $this->oLocalStorageProvider) {
				$this->oLocalStorageProvider = new Providers\Storage(
					$this->fabrica('storage-local'));
			}

			return $this->oLocalStorageProvider;
		} else {
			if (null === $this->oStorageProvider) {
				$this->oStorageProvider = new Providers\Storage(
					$this->fabrica('storage'));
			}

			return $this->oStorageProvider;
		}
	}

	public function IdentitiesProvider(): Identities
	{
		if (null === $this->oIdentitiesProvider) {
			$this->oIdentitiesProvider = new Providers\Identities($this->fabrica('identities'));
		}

		return $this->oIdentitiesProvider;
	}

	public function SettingsProvider(bool $bLocal = false): Providers\Settings
	{
		if ($bLocal) {
			if (null === $this->oLocalSettingsProvider) {
				$this->oLocalSettingsProvider = new Providers\Settings(
					$this->fabrica('settings-local'));
			}

			return $this->oLocalSettingsProvider;
		} else {
			if (null === $this->oSettingsProvider) {
				$this->oSettingsProvider = new Providers\Settings(
					$this->fabrica('settings'));
			}

			return $this->oSettingsProvider;
		}
	}

	public function FilesProvider(): Providers\Files
	{
		if (null === $this->oFilesProvider) {
			$this->oFilesProvider = new Providers\Files(
				$this->fabrica('files'));
		}

		return $this->oFilesProvider;
	}

	public function DomainProvider(): Providers\Domain
	{
		if (null === $this->oDomainProvider) {
			$this->oDomainProvider = new Providers\Domain(
				$this->fabrica('domain'), $this->Plugins());
		}

		return $this->oDomainProvider;
	}

	public function SuggestionsProvider(): Providers\Suggestions
	{
		if (null === $this->oSuggestionsProvider) {
			$this->oSuggestionsProvider = new Providers\Suggestions(
				$this->fabrica('suggestions'));
		}

		return $this->oSuggestionsProvider;
	}

	public function AddressBookProvider(?Model\Account $oAccount = null, bool $bForceEnable = false): Providers\AddressBook
	{
		if (null === $this->oAddressBookProvider) {
			$oDriver = null;
			if ($this->GetCapa(false, Enumerations\Capa::CONTACTS, $oAccount)) {
				if ($this->Config()->Get('contacts', 'enable', false) || $bForceEnable) {
					$oDriver = $this->fabrica('address-book', $oAccount);
				}
			}

			$this->oAddressBookProvider = new Providers\AddressBook($oDriver);
			$this->oAddressBookProvider->SetLogger($this->Logger());
		}

		return $this->oAddressBookProvider;
	}

	public function Cacher(?Model\Account $oAccount = null, bool $bForceFile = false): \MailSo\Cache\CacheClient
	{
		$sKey = '';
		if ($oAccount) {
			$sKey = $oAccount->ParentEmailHelper();
		}

		$sIndexKey = empty($sKey) ? '_default_' : $sKey;
		if ($bForceFile) {
			$sIndexKey .= '/_files_';
		}

		if (!isset($this->aCachers[$sIndexKey])) {
			$this->aCachers[$sIndexKey] = new \MailSo\Cache\CacheClient();

			$oDriver = null;
			$sDriver = \strtoupper(\trim($this->Config()->Get('cache', 'fast_cache_driver', 'files')));

			switch (true) {
				default:
				case $bForceFile:
					$oDriver = new \MailSo\Cache\Drivers\File(APP_PRIVATE_DATA . 'cache', $sKey);
					break;

				case ('APCU' === $sDriver) &&
					\MailSo\Base\Utils::FunctionExistsAndEnabled(array(
						'apcu_store', 'apcu_fetch', 'apcu_delete', 'apcu_clear_cache')):

					$oDriver = new \MailSo\Cache\Drivers\APC($sKey);
					break;

				case ('MEMCACHE' === $sDriver || 'MEMCACHED' === $sDriver) &&
					\MailSo\Base\Utils::FunctionExistsAndEnabled('memcache_connect'):

					$oDriver = new \MailSo\Cache\Drivers\Memcache(
						$this->Config()->Get('labs', 'fast_cache_memcache_host', '127.0.0.1'),
						(int)$this->Config()->Get('labs', 'fast_cache_memcache_port', 11211),
						43200,
						$sKey
					);
					break;

				case 'REDIS' === $sDriver && \class_exists('Predis\Client'):
					$oDriver = new \MailSo\Cache\Drivers\Redis(
						$this->Config()->Get('labs', 'fast_cache_redis_host', '127.0.0.1'),
						(int)$this->Config()->Get('labs', 'fast_cache_redis_port', 6379),
						43200,
						$sKey
					);
					break;
			}

			if ($oDriver) {
				$this->aCachers[$sIndexKey]->SetDriver($oDriver);
			}

			$this->aCachers[$sIndexKey]->SetCacheIndex($this->Config()->Get('cache', 'fast_cache_index', ''));
		}

		return $this->aCachers[$sIndexKey];
	}

	public function Plugins(): Plugins\Manager
	{
		if (null === $this->oPlugins) {
			$this->oPlugins = new Plugins\Manager($this);
			$this->oPlugins->SetLogger($this->Logger());
		}

		return $this->oPlugins;
	}

	public function Logger(): \MailSo\Log\Logger
	{
		if (null === $this->oLogger) {
			$this->oLogger = \MailSo\Log\Logger::SingletonInstance();

			if (!!$this->Config()->Get('logs', 'enable', false)) {
				$sSessionFilter = (string)$this->Config()->Get('logs', 'session_filter', '');
				if (!empty($sSessionFilter)) {
					$aSessionParts = \explode(':', $sSessionFilter, 2);

					if (empty($aSessionParts[0]) || empty($aSessionParts[1]) ||
						(string)$aSessionParts[1] !== (string)Utils::GetCookie($aSessionParts[0], '')) {
						return $this->oLogger;
					}
				}

				$sTimeZone = $this->Config()->Get('logs', 'time_zone', 'UTC');

				$this->oLogger->SetShowSecter(!$this->Config()->Get('logs', 'hide_passwords', true));

				$sLogFileName = $this->Config()->Get('logs', 'filename', '');

				$oDriver = null;
				if ('syslog' === $sLogFileName) {
					$oDriver = new \MailSo\Log\Drivers\Syslog();
				} else {
					$sLogFileFullPath = \APP_PRIVATE_DATA . 'logs/' . $this->compileLogFileName($sLogFileName);
					$sLogFileDir = \dirname($sLogFileFullPath);

					if (!\is_dir($sLogFileDir)) {
						\mkdir($sLogFileDir, 0755, true);
					}

					$oDriver = new \MailSo\Log\Drivers\File($sLogFileFullPath);
				}

				$this->oLogger->append($oDriver
					->WriteOnErrorOnly($this->Config()->Get('logs', 'write_on_error_only', false))
					->WriteOnPhpErrorOnly($this->Config()->Get('logs', 'write_on_php_error_only', false))
					->WriteOnTimeoutOnly($this->Config()->Get('logs', 'write_on_timeout_only', 0))
					->SetTimeZone($sTimeZone)
				);

				if (!$this->Config()->Get('debug', 'enable', false)) {
					$this->oLogger->AddForbiddenType(\MailSo\Log\Enumerations\Type::TIME);
				}

				$this->oLogger->WriteEmptyLine();

				$oHttp = $this->Http();

				$this->oLogger->Write('[DATE:' . (new \DateTime('now', new \DateTimeZone($sTimeZone)))->format('Y-m-d ') .
					$sTimeZone .
					'][RL:' . APP_VERSION . '][PHP:' . PHP_VERSION . '][IP:' .
					$oHttp->GetClientIp($this->Config()->Get('labs', 'http_client_ip_check_proxy', false)) . '][PID:' .
					(\MailSo\Base\Utils::FunctionExistsAndEnabled('getmypid') ? \getmypid() : 'unknown') . '][' .
					$oHttp->GetServer('SERVER_SOFTWARE', '~') . '][' .
					(\MailSo\Base\Utils::FunctionExistsAndEnabled('php_sapi_name') ? \php_sapi_name() : '~') . ']'
				);

				$this->oLogger->Write(
					'[APCU:' . (\MailSo\Base\Utils::FunctionExistsAndEnabled('apcu_fetch') ? 'on' : 'off') .
					'][MB:' . (\MailSo\Base\Utils::FunctionExistsAndEnabled('mb_convert_encoding') ? 'on' : 'off') .
					'][PDO:' . (\class_exists('PDO') ? (\implode(',', \Pdo::getAvailableDrivers()) ?: '~') : 'off') .
					'][Streams:' . \implode(',', \stream_get_transports()) .
					']');

				$this->oLogger->Write(
					'[' . $oHttp->GetMethod() . '] ' . $oHttp->GetScheme() . '://' . $oHttp->GetHost(false, false) . $oHttp->GetServer('REQUEST_URI', ''),
					\MailSo\Log\Enumerations\Type::NOTE, 'REQUEST');
			}
		}

		return $this->oLogger;
	}

	public function LoggerAuth(): \MailSo\Log\Logger
	{
		if (null === $this->oLoggerAuth) {
			$this->oLoggerAuth = new \MailSo\Log\Logger(false);

			if (!!$this->Config()->Get('logs', 'auth_logging', false)) {
				$sAuthLogFileFullPath = \APP_PRIVATE_DATA . 'logs/' . $this->compileLogFileName(
						$this->Config()->Get('logs', 'auth_logging_filename', ''));

				$sLogFileDir = \dirname($sAuthLogFileFullPath);

				if (!is_dir($sLogFileDir)) {
					mkdir($sLogFileDir, 0755, true);
				}

				$this->oLoggerAuth->AddForbiddenType(\MailSo\Log\Enumerations\Type::MEMORY);
				$this->oLoggerAuth->AddForbiddenType(\MailSo\Log\Enumerations\Type::TIME);
				$this->oLoggerAuth->AddForbiddenType(\MailSo\Log\Enumerations\Type::TIME_DELTA);

				$oDriver = new \MailSo\Log\Drivers\File($sAuthLogFileFullPath);

				$oDriver->DisableTimePrefix();
				$oDriver->DisableGuidPrefix();
				$oDriver->DisableTypedPrefix();

				$this->oLoggerAuth->append($oDriver);
			}
		}

		return $this->oLoggerAuth;
	}

	public function LoggerAuthHelper(?Model\Account $oAccount = null, array $aAdditionalParams = array()): void
	{
		$sLine = $this->Config()->Get('logs', 'auth_logging_format', '');
		if (!empty($sLine)) {
			$this->LoggerAuth()->Write($this->compileLogParams($sLine, $oAccount, false, $aAdditionalParams));
		}
		if ($this->Config()->Get('logs', 'auth_logging', false) && \openlog('snappymail', 0, \LOG_AUTHPRIV)) {
			\syslog(\LOG_ERR, $this->compileLogParams('Auth failed: ip={request:ip} user={imap:login}', $oAccount, false, $aAdditionalParams));
			\closelog();
		}
	}

	public function SetMailtoRequest(string $sTo): void
	{
		if (!empty($sTo)) {
			Utils::SetCookie(self::AUTH_MAILTO_TOKEN_KEY,
				Utils::EncodeKeyValuesQ(array(
					'Time' => \microtime(true),
					'MailTo' => 'MailTo',
					'To' => $sTo
				)), 0);
		}
	}

	protected function LoginProvide(string $sEmail, string $sLogin, string $sPassword, string $sSignMeToken = '', string $sClientCert = '', bool $bThrowProvideException = false): ?Model\Account
	{
		$oAccount = null;
		if (0 < \strlen($sEmail) && 0 < \strlen($sLogin) && 0 < \strlen($sPassword)) {
			$oDomain = $this->DomainProvider()->Load(\MailSo\Base\Utils::GetDomainFromEmail($sEmail), true);
			if ($oDomain) {
				if ($oDomain->ValidateWhiteList($sEmail, $sLogin)) {
					$oAccount = new Model\Account($sEmail, $sLogin, $sPassword, $oDomain, $sSignMeToken, '', '', $sClientCert);
					$this->Plugins()->RunHook('filter.account', array($oAccount));

					if ($bThrowProvideException && !$oAccount) {
						throw new Exceptions\ClientException(Notifications::AuthError);
					}
				} else if ($bThrowProvideException) {
					throw new Exceptions\ClientException(Notifications::AccountNotAllowed);
				}
			} else if ($bThrowProvideException) {
				throw new Exceptions\ClientException(Notifications::DomainNotAllowed);
			}
		}

		return $oAccount;
	}

	/**
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function GetAccountFromCustomToken(string $sToken, bool $bThrowExceptionOnFalse = true, bool $bValidateShortToken = true, bool $bQ = false): ?Model\Account
	{
		$oResult = null;
		if (!empty($sToken)) {
			$aAccountHash = $bQ ? Utils::DecodeKeyValuesQ($sToken) : Utils::DecodeKeyValues($sToken);
			if (!empty($aAccountHash[0]) && 'token' === $aAccountHash[0] && // simple token validation
				8 <= \count($aAccountHash) && // length checking
				!empty($aAccountHash[7]) && // does short token exist
				(!$bValidateShortToken || Utils::GetShortToken() === $aAccountHash[7] ||  // check short token if needed
					(isset($aAccountHash[10]) && 0 < $aAccountHash[10] && \time() < $aAccountHash[10]))
			) {
				$oAccount = $this->LoginProvide($aAccountHash[1], $aAccountHash[2], $aAccountHash[3],
					empty($aAccountHash[5]) ? '' : $aAccountHash[5], empty($aAccountHash[11]) ? '' : $aAccountHash[11], $bThrowExceptionOnFalse);

				if ($oAccount) {
					// init proxy user/password
					if (!empty($aAccountHash[8]) && !empty($aAccountHash[9])) {
						$oAccount->SetProxyAuthUser($aAccountHash[8]);
						$oAccount->SetProxyAuthPassword($aAccountHash[9]);
					}

					$this->Logger()->AddSecret($oAccount->Password());
					$this->Logger()->AddSecret($oAccount->ProxyAuthPassword());

					$oAccount->SetParentEmail($aAccountHash[6]);
					$oResult = $oAccount;
				}
			} else if ($bThrowExceptionOnFalse) {
				throw new Exceptions\ClientException(Notifications::AuthError);
			}
		}

		if ($bThrowExceptionOnFalse && !$oResult) {
			throw new Exceptions\ClientException(Notifications::AuthError);
		}

		return $oResult;
	}

	public function GetAccountFromSignMeToken(): ?Model\Account
	{
		$oAccount = null;

		$sSignMeToken = Utils::GetCookie(self::AUTH_SIGN_ME_TOKEN_KEY, '');
		if (!empty($sSignMeToken)) {
			$aTokenData = Utils::DecodeKeyValuesQ($sSignMeToken);
			if (!empty($aTokenData['e']) && !empty($aTokenData['t'])) {
				$sTokenSettings = $this->StorageProvider()->Get($aTokenData['e'],
					Providers\Storage\Enumerations\StorageType::CONFIG,
					'sign_me'
				);

				if (!empty($sTokenSettings)) {
					$aSignMeData = Utils::DecodeKeyValuesQ($sTokenSettings);
					if (!empty($aSignMeData['AuthToken']) &&
						!empty($aSignMeData['SignMetToken']) &&
						$aSignMeData['SignMetToken'] === $aTokenData['t']) {
						$oAccount = $this->GetAccountFromCustomToken($aSignMeData['AuthToken'], false, false, true);
					}
				}
			}
		} else {
			Utils::ClearCookie(self::AUTH_SIGN_ME_TOKEN_KEY);
		}

		return $oAccount;
	}

	/**
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function getAccountFromToken(bool $bThrowExceptionOnFalse = true): ?Model\Account
	{
		return $this->GetAccountFromCustomToken($this->getLocalAuthToken(), $bThrowExceptionOnFalse, true, true);
	}

	public function AppDataSystem(bool $bAdmin = false): array
	{
		$oConfig = $this->Config();

		$aAttachmentsActions = array();
		if ($this->GetCapa(false, Enumerations\Capa::ATTACHMENTS_ACTIONS)) {
			if (\class_exists('PharData') || \class_exists('ZipArchive')) {
				$aAttachmentsActions[] = 'zip';
			}
		}

		return \array_merge(array(
			'version' => APP_VERSION,
			'admin' => $bAdmin,
			'webPath' => Utils::WebPath(),
			'webVersionPath' => Utils::WebVersionPath(),
			'token' => $oConfig->Get('security', 'csrf_protection', false) ? Utils::GetCsrfToken() : '',
			'inIframe' => (bool)$oConfig->Get('labs', 'in_iframe', false),
			'allowHtmlEditorSourceButton' => (bool)$oConfig->Get('labs', 'allow_html_editor_source_button', false),
			'allowHtmlEditorBitiButtons' => (bool)$oConfig->Get('labs', 'allow_html_editor_biti_buttons', false),
			'allowCtrlEnterOnCompose' => (bool)$oConfig->Get('labs', 'allow_ctrl_enter_on_compose', false),
			'hideSubmitButton' => (bool)$oConfig->Get('login', 'hide_submit_button', true),
			'useImapThread' => (bool)$oConfig->Get('labs', 'use_imap_thread', false),
			'useImapSubscribe' => (bool)$oConfig->Get('labs', 'use_imap_list_subscribe', true),
			'allowAppendMessage' => (bool)$oConfig->Get('labs', 'allow_message_append', false),
			'folderSpecLimit' => (int)$oConfig->Get('labs', 'folders_spec_limit', 50),
			'faviconStatus' => (bool)$oConfig->Get('labs', 'favicon_status', true),
			'listPermanentFiltered' => '' !== \trim(Api::Config()->Get('labs', 'imap_message_list_permanent_filter', '')),
			'themes' => $this->GetThemes(),
			'languages' => \SnappyMail\L10n::getLanguages(false),
			'languagesAdmin' => \SnappyMail\L10n::getLanguages(true),
			'attachmentsActions' => $aAttachmentsActions
		), $bAdmin ? array(
			'adminHostUse' => '' !== $oConfig->Get('security', 'admin_panel_host', ''),
			'adminPath' => \strtolower($oConfig->Get('security', 'admin_panel_key', 'admin')),
			'allowAdminPanel' => (bool)$oConfig->Get('security', 'allow_admin_panel', true),
		) : array());
	}

	public function AppData(bool $bAdmin): array
	{
		$oAccount = null;
		$oConfig = $this->Config();

		/*
		required by Index.html and rl.js:
		PluginsLink
		*/

		$value = \ini_get('upload_max_filesize');
		$upload_max_filesize = \intval($value);
		switch (\strtoupper(\substr($value, -1))) {
			case 'G': $upload_max_filesize *= 1024;
			case 'M': $upload_max_filesize *= 1024;
			case 'K': $upload_max_filesize *= 1024;
		}

		$aResult = array(
			'Auth' => false,
			'AccountHash' => '',
			'AccountSignMe' => false,
			'MailToEmail' => '',
			'Email' => '',
			'DevEmail' => '',
			'DevPassword' => '',
			'Title' => $oConfig->Get('webmail', 'title', 'SnappyMail Webmail'),
			'LoadingDescription' => $oConfig->Get('webmail', 'loading_description', 'SnappyMail'),
			'FaviconUrl' => $oConfig->Get('webmail', 'favicon_url', ''),
			'LoginDefaultDomain' => $oConfig->Get('login', 'default_domain', ''),
			'DetermineUserLanguage' => (bool)$oConfig->Get('login', 'determine_user_language', true),
			'DetermineUserDomain' => (bool)$oConfig->Get('login', 'determine_user_domain', false),
			'StartupUrl' => \trim(\ltrim(\trim($oConfig->Get('labs', 'startup_url', '')), '#/')),
			'SieveAllowFileintoInbox' => (bool)$oConfig->Get('labs', 'sieve_allow_fileinto_inbox', false),
			'ContactsIsAllowed' => false,
			'Admin' => array(),
			'Capa' => array(),
			'Plugins' => array(),
			'System' => $this->AppDataSystem($bAdmin),

			'NewMoveToFolder' => (bool) $oConfig->Get('interface', 'new_move_to_folder_button', true),
			'AllowLanguagesOnSettings' => (bool) $oConfig->Get('webmail', 'allow_languages_on_settings', true),
			'AllowLanguagesOnLogin' => (bool) $oConfig->Get('login', 'allow_languages_on_login', true),
			'AttachmentLimit' => \min($upload_max_filesize, ((int) $oConfig->Get('webmail', 'attachment_size_limit', 10)) * 1024 * 1024),
			'SignMe' => (string) $oConfig->Get('login', 'sign_me_auto', Enumerations\SignMeType::DEFAULT_OFF),
			'UseLocalProxyForExternalImages' => (bool)$oConfig->Get('labs', 'use_local_proxy_for_external_images', false),

			// user
			'ShowImages' => (bool) $oConfig->Get('defaults', 'show_images', false),
			'RemoveColors' => (bool) $oConfig->Get('defaults', 'remove_colors', false),
			'MPP' => (int) $oConfig->Get('webmail', 'messages_per_page', 25),
			'SoundNotification' => false,
			'NotificationSound' => 'new-mail',
			'DesktopNotifications' => false,
			'Layout' => (int) $oConfig->Get('defaults', 'view_layout', Enumerations\Layout::SIDE_PREVIEW),
			'EditorDefaultType' => (string) $oConfig->Get('defaults', 'view_editor_type', ''),
			'UseCheckboxesInList' => (bool) $oConfig->Get('defaults', 'view_use_checkboxes', true),
			'AutoLogout' => (int) $oConfig->Get('defaults', 'autologout', 30),
			'UseThreads' => (bool) $oConfig->Get('defaults', 'mail_use_threads', false),
			'AllowDraftAutosave' => (bool) $oConfig->Get('defaults', 'allow_draft_autosave', true),
			'ReplySameFolder' => (bool) $oConfig->Get('defaults', 'mail_reply_same_folder', false),
			'ContactsAutosave' => (bool) $oConfig->Get('defaults', 'contacts_autosave', true),
			'HideUnsubscribed' => (bool) $oConfig->Get('labs', 'use_imap_list_subscribe', true),
			'ParentEmail' => '',
			'InterfaceAnimation' => true,
			'UserBackgroundName' => '',
			'UserBackgroundHash' => ''
		);

		$oSettings = null;

		$passfile = APP_PRIVATE_DATA.'admin_password.txt';
		$sPassword = $oConfig->Get('security', 'admin_password', '');
		if (!$sPassword) {
			$sPassword = \substr(\base64_encode(\random_bytes(16)), 0, 12);
			\file_put_contents($passfile, $sPassword);
			\chmod($passfile, 0600);
			$oConfig->SetPassword($sPassword);
			$oConfig->Save();
		}

		$sLanguage = $oConfig->Get('webmail', 'language', 'en');
		$UserLanguageRaw = $this->detectUserLanguage($bAdmin);

		if (!$bAdmin) {
			$oAccount = $this->getAccountFromToken(false);
			if ($oAccount) {
				$oAddressBookProvider = $this->AddressBookProvider($oAccount);

				$aResult['Auth'] = true;
				$aResult['Email'] = $oAccount->Email();
				$aResult['IncLogin'] = $oAccount->IncLogin();
				$aResult['OutLogin'] = $oAccount->OutLogin();
				$aResult['AccountHash'] = $oAccount->Hash();
				$aResult['AccountSignMe'] = $oAccount->SignMe();
				$aResult['ContactsIsAllowed'] = $oAddressBookProvider->IsActive();
				$aResult['ContactsSyncIsAllowed'] = (bool)$oConfig->Get('contacts', 'allow_sync', false);
				$aResult['ContactsSyncInterval'] = (int)$oConfig->Get('contacts', 'sync_interval', 20);

				$aResult['EnableContactsSync'] = false;
				$aResult['ContactsSyncUrl'] = '';
				$aResult['ContactsSyncUser'] = '';
				$aResult['ContactsSyncPassword'] = '';

				if ($aResult['ContactsIsAllowed'] && $aResult['ContactsSyncIsAllowed']) {
					$mData = $this->getContactsSyncData($oAccount);
					if (\is_array($mData)) {
						$aResult['EnableContactsSync'] = isset($mData['Enable']) ? !!$mData['Enable'] : false;
						$aResult['ContactsSyncUrl'] = isset($mData['Url']) ? \trim($mData['Url']) : '';
						$aResult['ContactsSyncUser'] = isset($mData['User']) ? \trim($mData['User']) : '';
						$aResult['ContactsSyncPassword'] = APP_DUMMY;
					}
				}

				if ($aResult['AccountSignMe']) {
					$sToken = Utils::GetCookie(self::AUTH_MAILTO_TOKEN_KEY, null);
					if (null !== $sToken) {
						Utils::ClearCookie(self::AUTH_MAILTO_TOKEN_KEY);

						$mMailToData = Utils::DecodeKeyValuesQ($sToken);
						if (!empty($mMailToData['MailTo']) &&
							'MailTo' === $mMailToData['MailTo'] && !empty($mMailToData['To'])) {
							$aResult['MailToEmail'] = $mMailToData['To'];
						}
					}
				}

				$oSettings = $this->SettingsProvider()->Load($oAccount);

				if (!empty($aResult['StartupUrl'])) {
					$aResult['StartupUrl'] = $this->compileLogParams($aResult['StartupUrl'], $oAccount, true);
				}

				$aResult['ParentEmail'] = $oAccount->ParentEmail();

				$oSettingsLocal = $this->SettingsProvider(true)->Load($oAccount);

				if ($oSettingsLocal instanceof Settings) {
					$aResult['SentFolder'] = (string)$oSettingsLocal->GetConf('SentFolder', '');
					$aResult['DraftFolder'] = (string)$oSettingsLocal->GetConf('DraftFolder', '');
					$aResult['SpamFolder'] = (string)$oSettingsLocal->GetConf('SpamFolder', '');
					$aResult['TrashFolder'] = (string)$oSettingsLocal->GetConf('TrashFolder', '');
					$aResult['ArchiveFolder'] = (string)$oSettingsLocal->GetConf('ArchiveFolder', '');
					$aResult['HideUnsubscribed'] = (bool)$oSettingsLocal->GetConf('HideUnsubscribed', $aResult['HideUnsubscribed']);
				}

				if ($this->GetCapa(false, Enumerations\Capa::SETTINGS, $oAccount)) {
					if ($oSettings instanceof Settings) {
						if ($oConfig->Get('webmail', 'allow_languages_on_settings', true)) {
							$sLanguage = (string)$oSettings->GetConf('Language', $sLanguage);
						}

						$aResult['EditorDefaultType'] = (string)$oSettings->GetConf('EditorDefaultType', $aResult['EditorDefaultType']);
						$aResult['ShowImages'] = (bool)$oSettings->GetConf('ShowImages', $aResult['ShowImages']);
						$aResult['RemoveColors'] = (bool)$oSettings->GetConf('RemoveColors', $aResult['RemoveColors']);
						$aResult['ContactsAutosave'] = (bool)$oSettings->GetConf('ContactsAutosave', $aResult['ContactsAutosave']);
						$aResult['MPP'] = (int)$oSettings->GetConf('MPP', $aResult['MPP']);
						$aResult['SoundNotification'] = (bool)$oSettings->GetConf('SoundNotification', $aResult['SoundNotification']);
						$aResult['NotificationSound'] = (string)$oSettings->GetConf('NotificationSound', $aResult['NotificationSound']);
						$aResult['DesktopNotifications'] = (bool)$oSettings->GetConf('DesktopNotifications', $aResult['DesktopNotifications']);
						$aResult['UseCheckboxesInList'] = (bool)$oSettings->GetConf('UseCheckboxesInList', $aResult['UseCheckboxesInList']);
						$aResult['AllowDraftAutosave'] = (bool)$oSettings->GetConf('AllowDraftAutosave', $aResult['AllowDraftAutosave']);
						$aResult['AutoLogout'] = (int)$oSettings->GetConf('AutoLogout', $aResult['AutoLogout']);
						$aResult['Layout'] = (int)$oSettings->GetConf('Layout', $aResult['Layout']);

						if (!$this->GetCapa(false, Enumerations\Capa::AUTOLOGOUT, $oAccount)) {
							$aResult['AutoLogout'] = 0;
						}

						if ($this->GetCapa(false, Enumerations\Capa::USER_BACKGROUND, $oAccount)) {
							$aResult['UserBackgroundName'] = (string)$oSettings->GetConf('UserBackgroundName', $aResult['UserBackgroundName']);
							$aResult['UserBackgroundHash'] = (string)$oSettings->GetConf('UserBackgroundHash', $aResult['UserBackgroundHash']);
						}
					}

					if ($oSettingsLocal instanceof Settings) {
						$aResult['UseThreads'] = (bool)$oSettingsLocal->GetConf('UseThreads', $aResult['UseThreads']);
						$aResult['ReplySameFolder'] = (bool)$oSettingsLocal->GetConf('ReplySameFolder', $aResult['ReplySameFolder']);
					}
				}
				$aResult['NewMailSounds'] = [];
				foreach (\glob(APP_VERSION_ROOT_PATH.'static/sounds/*.mp3') as $file) {
					$aResult['NewMailSounds'][] = \basename($file, '.mp3');
				}
			}
			else {
				if ($oConfig->Get('login', 'allow_languages_on_login', true)
					&& $oConfig->Get('login', 'determine_user_language', true)) {
					$sLanguage = $this->ValidateLanguage($UserLanguageRaw, $sLanguage, false);
				}

				$aResult['DevEmail'] = $oConfig->Get('labs', 'dev_email', '');
				$aResult['DevPassword'] = $oConfig->Get('labs', 'dev_password', '');

				$aResult['StartupUrl'] = '';

				if (empty($aResult['AdditionalLoginError'])) {
					$aResult['AdditionalLoginError'] = $this->GetSpecLogoutCustomMgsWithDeletion();
				}
			}

			$aResult['Capa'] = $this->Capa(false, $oAccount);
		} else {
			$aResult['Auth'] = $this->IsAdminLoggined(false);
			if ($aResult['Auth']) {
				$aResult['AdminDomain'] = APP_SITE;
				$aResult['AdminLogin'] = (string)$oConfig->Get('security', 'admin_login', '');
				$aResult['UseTokenProtection'] = (bool)$oConfig->Get('security', 'csrf_protection', true);
				$aResult['EnabledPlugins'] = (bool)$oConfig->Get('plugins', 'enable', false);

				$aResult['VerifySslCertificate'] = (bool)$oConfig->Get('ssl', 'verify_certificate', false);
				$aResult['AllowSelfSigned'] = (bool)$oConfig->Get('ssl', 'allow_self_signed', true);

				$aResult['supportedPdoDrivers'] = \RainLoop\Common\PdoAbstract::getAvailableDrivers();

				$aResult['ContactsEnable'] = (bool)$oConfig->Get('contacts', 'enable', false);
				$aResult['ContactsSync'] = (bool)$oConfig->Get('contacts', 'allow_sync', false);
				$aResult['ContactsPdoType'] = (string)$this->ValidateContactPdoType(\trim($this->Config()->Get('contacts', 'type', 'sqlite')));
				$aResult['ContactsPdoDsn'] = (string)$oConfig->Get('contacts', 'pdo_dsn', '');
				$aResult['ContactsPdoType'] = (string)$oConfig->Get('contacts', 'type', '');
				$aResult['ContactsPdoUser'] = (string)$oConfig->Get('contacts', 'pdo_user', '');
				$aResult['ContactsPdoPassword'] = (string)APP_DUMMY;

				$aResult['WeakPassword'] = \is_file($passfile);

				$aResult['PhpUploadSizes'] = array(
					'upload_max_filesize' => \ini_get('upload_max_filesize'),
					'post_max_size' => \ini_get('post_max_size')
				);
			}

			$aResult['Capa'] = $this->Capa(true);
		}

		$aResult['ProjectHash'] = \md5($aResult['AccountHash'] . APP_VERSION . $this->Plugins()->Hash());

		$sStaticCache = $this->StaticCache();

		$aResult['Theme'] = $this->GetTheme($bAdmin);

		$aResult['Language'] = $this->ValidateLanguage($sLanguage, '', false);
		$aResult['UserLanguage'] = $this->ValidateLanguage($UserLanguageRaw, '', false, true);
		if ($bAdmin) {
			$aResult['LanguageAdmin'] = $this->ValidateLanguage($oConfig->Get('webmail', 'language_admin', 'en'), '', true);
			$aResult['UserLanguageAdmin'] = $this->ValidateLanguage($UserLanguageRaw, '', true, true);
		}

		$aResult['PluginsLink'] = '';
		if (0 < $this->Plugins()->Count() && $this->Plugins()->HaveJs($bAdmin)) {
			$aResult['PluginsLink'] = './?/Plugins/0/' . ($bAdmin ? 'Admin' : 'User') . '/' . $sStaticCache . '/';
		}

		$bAppJsDebug = !!$this->Config()->Get('labs', 'use_app_debug_js', false);

		$aResult['StaticLibJsLink'] = $this->StaticPath('js/' . ($bAppJsDebug ? '' : 'min/') .
			'libs' . ($bAppJsDebug ? '' : '.min') . '.js');
		$aResult['StaticAppJsLink'] = $this->StaticPath('js/' . ($bAppJsDebug ? '' : 'min/') .
			($bAdmin ? 'admin' : 'app') . ($bAppJsDebug ? '' : '.min') . '.js');

		$aResult['EditorDefaultType'] = \in_array($aResult['EditorDefaultType'], array('Plain', 'Html', 'HtmlForced', 'PlainForced'))
			? $aResult['EditorDefaultType'] : 'Plain';

		// IDN
		$aResult['Email'] = \MailSo\Base\Utils::IdnToUtf8($aResult['Email']);
		$aResult['ParentEmail'] = \MailSo\Base\Utils::IdnToUtf8($aResult['ParentEmail']);
		$aResult['MailToEmail'] = \MailSo\Base\Utils::IdnToUtf8($aResult['MailToEmail']);
		$aResult['DevEmail'] = \MailSo\Base\Utils::IdnToUtf8($aResult['DevEmail']);

		$this->Plugins()->InitAppData($bAdmin, $aResult, $oAccount);

		return $aResult;
	}

	protected function requestSleep(int $iDelay = 1): void
	{
		$time = \microtime(true) - $_SERVER['REQUEST_TIME_FLOAT'];
		if ($iDelay > $time) {
			\usleep(($iDelay - $time) * 1000000);
		}
	}

	protected function loginErrorDelay(): void
	{
		$iDelay = (int)$this->Config()->Get('labs', 'login_fault_delay', 0);
		if (0 < $iDelay) {
			$this->requestSleep($iDelay);
		}
	}

	public function AuthToken(Model\Account $oAccount): void
	{
		$this->SetAuthToken($oAccount);

		$aAccounts = $this->GetAccounts($oAccount);
		if (isset($aAccounts[$oAccount->Email()])) {
			$aAccounts[$oAccount->Email()] = $oAccount->GetAuthToken();
			$this->SetAccounts($oAccount, $aAccounts);
		}
	}

	/**
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function CheckMailConnection(Model\Account $oAccount, bool $bAuthLog = false): void
	{
		try {
			$oAccount->IncConnectAndLoginHelper($this->Plugins(), $this->MailClient(), $this->Config());
		} catch (Exceptions\ClientException $oException) {
			throw $oException;
		} catch (\MailSo\Net\Exceptions\ConnectionException $oException) {
			throw new Exceptions\ClientException(Notifications::ConnectionError, $oException);
		} catch (\MailSo\Imap\Exceptions\LoginBadCredentialsException $oException) {
			if ($bAuthLog) {
				$this->LoggerAuthHelper($oAccount);
			}

			if ($this->Config()->Get('labs', 'imap_show_login_alert', true)) {
				throw new Exceptions\ClientException(Notifications::AuthError,
					$oException, $oException->getAlertFromStatus());
			} else {
				throw new Exceptions\ClientException(Notifications::AuthError, $oException);
			}
		} catch (\Throwable $oException) {
			throw new Exceptions\ClientException(Notifications::AuthError, $oException);
		}
	}

	private function getAdditionalLogParamsByUserLogin(string $sLogin, bool $bAdmin = false): array
	{
		$sHost = $bAdmin ? $this->Http()->GetHost(false, true, true) : \MailSo\Base\Utils::GetDomainFromEmail($sLogin);
		return array(
			'{imap:login}' => $sLogin,
			'{imap:host}' => $sHost,
			'{smtp:login}' => $sLogin,
			'{smtp:host}' => $sHost,
			'{user:email}' => $sLogin,
			'{user:login}' => \MailSo\Base\Utils::GetAccountNameFromEmail($sLogin),
			'{user:domain}' => $sHost,
		);
	}

	/**
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function LoginProcess(string &$sEmail, string &$sPassword, string $sSignMeToken = ''): Model\Account
	{
		$sInputEmail = $sEmail;

		$this->Plugins()->RunHook('login.credentials.step-1', array(&$sEmail));

		$sEmail = \MailSo\Base\Utils::Trim($sEmail);
		if ($this->Config()->Get('login', 'login_lowercase', true)) {
			$sEmail = \MailSo\Base\Utils::StrToLowerIfAscii($sEmail);
		}

		if (false === \strpos($sEmail, '@')) {
			$this->Logger()->Write('The email address "' . $sEmail . '" is not complete', \MailSo\Log\Enumerations\Type::INFO, 'LOGIN');

			if (false === \strpos($sEmail, '@') && !!$this->Config()->Get('login', 'determine_user_domain', false)) {
				$sUserHost = \trim($this->Http()->GetHost(false, true, true));
				$this->Logger()->Write('Determined user domain: ' . $sUserHost, \MailSo\Log\Enumerations\Type::INFO, 'LOGIN');

				$bAdded = false;

				$iLimit = 14;
				$aDomainParts = \explode('.', $sUserHost);

				$oDomainProvider = $this->DomainProvider();
				while (0 < \count($aDomainParts) && 0 < $iLimit) {
					$sLine = \trim(\implode('.', $aDomainParts), '. ');

					$oDomain = $oDomainProvider->Load($sLine, false);
					if ($oDomain) {
						$bAdded = true;
						$this->Logger()->Write('Check "' . $sLine . '": OK (' . $sEmail . ' > ' . $sEmail . '@' . $sLine . ')',
							\MailSo\Log\Enumerations\Type::INFO, 'LOGIN');

						$sEmail = $sEmail . '@' . $sLine;
						break;
					} else {
						$this->Logger()->Write('Check "' . $sLine . '": NO', \MailSo\Log\Enumerations\Type::INFO, 'LOGIN');
					}

					\array_shift($aDomainParts);
					$iLimit--;
				}

				if (!$bAdded) {
					$sLine = $sUserHost;
					$oDomain = $oDomainProvider->Load($sLine, true);
					if ($oDomain && $oDomain) {
						$bAdded = true;
						$this->Logger()->Write('Check "' . $sLine . '" with wildcard: OK (' . $sEmail . ' > ' . $sEmail . '@' . $sLine . ')',
							\MailSo\Log\Enumerations\Type::INFO, 'LOGIN');

						$sEmail = $sEmail . '@' . $sLine;
					} else {
						$this->Logger()->Write('Check "' . $sLine . '" with wildcard: NO', \MailSo\Log\Enumerations\Type::INFO, 'LOGIN');
					}
				}

				if (!$bAdded) {
					$this->Logger()->Write('Domain was not found!', \MailSo\Log\Enumerations\Type::INFO, 'LOGIN');
				}
			}

			$sDefDomain = \trim($this->Config()->Get('login', 'default_domain', ''));
			if (false === \strpos($sEmail, '@') && 0 < \strlen($sDefDomain)) {
				$this->Logger()->Write('Default domain "' . $sDefDomain . '" was used. (' . $sEmail . ' > ' . $sEmail . '@' . $sDefDomain . ')',
					\MailSo\Log\Enumerations\Type::INFO, 'LOGIN');

				$sEmail = $sEmail . '@' . $sDefDomain;
			}
		}

		$this->Plugins()->RunHook('login.credentials.step-2', array(&$sEmail, &$sPassword));

		if (false === \strpos($sEmail, '@') || 0 === \strlen($sPassword)) {
			$this->loginErrorDelay();

			throw new Exceptions\ClientException(Notifications::InvalidInputArgument);
		}

		$this->Logger()->AddSecret($sPassword);

		$sLogin = $sEmail;
		if ($this->Config()->Get('login', 'login_lowercase', true)) {
			$sLogin = \MailSo\Base\Utils::StrToLowerIfAscii($sLogin);
		}

		$this->Plugins()->RunHook('login.credentials', array(&$sEmail, &$sLogin, &$sPassword));

		$this->Logger()->AddSecret($sPassword);

		$oAccount = null;
		$sClientCert = \trim($this->Config()->Get('ssl', 'client_cert', ''));
		try {
			$oAccount = $this->LoginProvide($sEmail, $sLogin, $sPassword, $sSignMeToken, $sClientCert, true);

			if (!$oAccount) {
				throw new Exceptions\ClientException(Notifications::AuthError);
			}
		} catch (\Throwable $oException) {
			$this->loginErrorDelay();
			$this->LoggerAuthHelper($oAccount, $this->getAdditionalLogParamsByUserLogin($sInputEmail));
			throw $oException;
		}

		try {
			$this->CheckMailConnection($oAccount, true);
		} catch (\Throwable $oException) {
			$this->loginErrorDelay();

			throw $oException;
		}

		return $oAccount;
	}

	public function GetAccounts(Model\Account $oAccount): array
	{
		if ($this->GetCapa(false, Enumerations\Capa::ADDITIONAL_ACCOUNTS, $oAccount)) {
			$sAccounts = $this->StorageProvider()->Get($oAccount,
				Providers\Storage\Enumerations\StorageType::CONFIG,
				'accounts'
			);

			$aAccounts = array();
			if ('' !== $sAccounts && '{' === \substr($sAccounts, 0, 1)) {
				$aAccounts = \json_decode($sAccounts, true);
			}

			if (\is_array($aAccounts) && 0 < \count($aAccounts)) {
				if (1 === \count($aAccounts)) {
					$this->SetAccounts($oAccount, array());

				} else if (1 < \count($aAccounts)) {
					$sOrder = $this->StorageProvider()->Get($oAccount,
						Providers\Storage\Enumerations\StorageType::CONFIG,
						'accounts_identities_order'
					);

					$aOrder = empty($sOrder) ? array() : \json_decode($sOrder, true);
					if (isset($aOrder['Accounts']) && \is_array($aOrder['Accounts']) &&
						1 < \count($aOrder['Accounts'])) {
						$aAccounts = \array_merge(\array_flip($aOrder['Accounts']), $aAccounts);

						$aAccounts = \array_filter($aAccounts, function ($sHash) {
							return 5 < \strlen($sHash);
						});
					}
				}

				return $aAccounts;
			}
		}

		$aAccounts = array();
		if (!$oAccount->IsAdditionalAccount()) {
			$aAccounts[$oAccount->Email()] = $oAccount->GetAuthToken();
		}

		return $aAccounts;
	}

	public function GetIdentityByID(Model\Account $oAccount, string $sID, bool $bFirstOnEmpty = false): ?Model\Identity
	{
		$aIdentities = $this->GetIdentities($oAccount);

		foreach ($aIdentities as $oIdentity) {
			if ($oIdentity && $sID === $oIdentity->Id()) {
				return $oIdentity;
			}
		}

		return $bFirstOnEmpty && isset($aIdentities[0]) ? $aIdentities[0] : null;
	}

	public function SetAccounts(Model\Account $oAccount, array $aAccounts = array()): void
	{
		$sParentEmail = $oAccount->ParentEmailHelper();
		if (!$aAccounts ||
			(1 === \count($aAccounts) && !empty($aAccounts[$sParentEmail]))) {
			$this->StorageProvider()->Clear($oAccount,
				Providers\Storage\Enumerations\StorageType::CONFIG,
				'accounts'
			);
		} else {
			$this->StorageProvider()->Put($oAccount,
				Providers\Storage\Enumerations\StorageType::CONFIG,
				'accounts',
				\json_encode($aAccounts)
			);
		}
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function getAccountUnreadCountFromHash(string $sHash): int
	{
		$iResult = 0;

		$oAccount = $this->GetAccountFromCustomToken($sHash, false);
		if ($oAccount) {
			try {
				$oMailClient = new \MailSo\Mail\MailClient();
				$oMailClient->SetLogger($this->Logger());

				$oAccount->IncConnectAndLoginHelper($this->Plugins(), $oMailClient, $this->Config());

				$iResult = $oMailClient->InboxUnreadCount();

				$oMailClient->LogoutAndDisconnect();
			} catch (\Throwable $oException) {
				$this->Logger()->WriteException($oException);
			}
		}

		return $iResult;
	}

	public function setConfigFromParams(Config\Application $oConfig, string $sParamName, string $sConfigSector, string $sConfigName, string $sType = 'string', ?callable $mStringCallback = null): void
	{
		$sValue = $this->GetActionParam($sParamName, '');
		if ($this->HasActionParam($sParamName)) {
			switch ($sType) {
				default:
				case 'string':
					$sValue = (string)$sValue;
					if ($mStringCallback && is_callable($mStringCallback)) {
						$sValue = call_user_func($mStringCallback, $sValue);
					}

					$oConfig->Set($sConfigSector, $sConfigName, (string)$sValue);
					break;

				case 'dummy':
					$sValue = (string)$this->GetActionParam('ContactsPdoPassword', APP_DUMMY);
					if (APP_DUMMY !== $sValue) {
						$oConfig->Set($sConfigSector, $sConfigName, (string)$sValue);
					}
					break;

				case 'int':
					$iValue = (int)$sValue;
					$oConfig->Set($sConfigSector, $sConfigName, $iValue);
					break;

				case 'bool':
					$oConfig->Set($sConfigSector, $sConfigName, '1' === (string)$sValue);
					break;
			}
		}
	}

	public function DoNoop(): array
	{
		$this->initMailClientConnection();
		return $this->TrueResponse(__FUNCTION__);
	}

	public function DoPing(): array
	{
		return $this->DefaultResponse(__FUNCTION__, 'Pong');
	}

	public function DoVersion(): array
	{
		return $this->DefaultResponse(__FUNCTION__,
			APP_VERSION === (string)$this->GetActionParam('Version', ''));
	}

	public function MainClearFileName(string $sFileName, string $sContentType, string $sMimeIndex, int $iMaxLength = 250): string
	{
		$sFileName = 0 === \strlen($sFileName) ? \preg_replace('/[^a-zA-Z0-9]/', '.', (empty($sMimeIndex) ? '' : $sMimeIndex . '.') . $sContentType) : $sFileName;
		$sClearedFileName = \MailSo\Base\Utils::StripSpaces(\preg_replace('/[\.]+/', '.', $sFileName));
		$sExt = \MailSo\Base\Utils::GetFileExtension($sClearedFileName);

		if (10 < $iMaxLength && $iMaxLength < \strlen($sClearedFileName) - \strlen($sExt)) {
			$sClearedFileName = \substr($sClearedFileName, 0, $iMaxLength) . (empty($sExt) ? '' : '.' . $sExt);
		}

		return \MailSo\Base\Utils::ClearFileName(\MailSo\Base\Utils::Utf8Clear($sClearedFileName));
	}

	private function getUploadErrorMessageByCode(int $iError, int &$iClientError): string
	{
		$sError = '';
		$iClientError = UploadClientError::NORMAL;
		switch ($iError) {
			case UPLOAD_ERR_OK:
				break;
			case UPLOAD_ERR_INI_SIZE:
			case UPLOAD_ERR_FORM_SIZE:
			case UploadError::CONFIG_SIZE:
			case UploadError::EMPTY_FILES_DATA:
				$sError = 'File is too big';
				$iClientError = UploadClientError::FILE_IS_TOO_BIG;
				break;
			case UPLOAD_ERR_PARTIAL:
				$sError = 'File partially uploaded';
				$iClientError = UploadClientError::FILE_PARTIALLY_UPLOADED;
				break;
			case UPLOAD_ERR_NO_FILE:
				$sError = 'No file uploaded';
				$iClientError = UploadClientError::FILE_NO_UPLOADED;
				break;
			case UPLOAD_ERR_NO_TMP_DIR:
			case UPLOAD_ERR_CANT_WRITE:
			case UPLOAD_ERR_EXTENSION:
				$sError = 'Missing temp folder';
				$iClientError = UploadClientError::MISSING_TEMP_FOLDER;
				break;
			case UploadError::ON_SAVING:
				$sError = 'Error on saving file';
				$iClientError = UploadClientError::FILE_ON_SAVING_ERROR;
				break;
			case UploadError::FILE_TYPE:
				$sError = 'Invalid file type';
				$iClientError = UploadClientError::FILE_TYPE;
				break;
			case UploadError::UNKNOWN:
			default:
				$sError = 'Unknown error';
				$iClientError = UploadClientError::UNKNOWN;
				break;
		}

		return $sError;
	}

	public function Upload(): array
	{
		$oAccount = $this->getAccountFromToken();

		$aResponse = array();

		$aFile = $this->GetActionParam('File', null);
		$iError = $this->GetActionParam('Error', Enumerations\UploadError::UNKNOWN);

		if ($oAccount && UPLOAD_ERR_OK === $iError && \is_array($aFile)) {
			$sSavedName = 'upload-post-' . \md5($aFile['name'] . $aFile['tmp_name']);
			if (!$this->FilesProvider()->MoveUploadedFile($oAccount, $sSavedName, $aFile['tmp_name'])) {
				$iError = Enumerations\UploadError::ON_SAVING;
			} else {
				$sUploadName = $aFile['name'];
				$iSize = $aFile['size'];
				$sMimeType = $aFile['type'];

				$aResponse['Attachment'] = array(
					'Name' => $sUploadName,
					'TempName' => $sSavedName,
					'MimeType' => $sMimeType,
					'Size' => (int)$iSize
				);
			}
		}

		if (UPLOAD_ERR_OK !== $iError) {
			$iClientError = Enumerations\UploadClientError::NORMAL;
			$sError = $this->getUploadErrorMessageByCode($iError, $iClientError);

			if (!empty($sError)) {
				$aResponse['ErrorCode'] = $iClientError;
				$aResponse['Error'] = $sError;
			}
		}

		return $this->DefaultResponse(__FUNCTION__, $aResponse);
	}

	public function UploadBackground(): array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, Enumerations\Capa::USER_BACKGROUND, $oAccount)) {
			return $this->FalseResponse(__FUNCTION__);
		}

		$sName = '';
		$sHash = '';

		$aFile = $this->GetActionParam('File', null);
		$iError = $this->GetActionParam('Error', Enumerations\UploadError::UNKNOWN);

		if ($oAccount && UPLOAD_ERR_OK === $iError && \is_array($aFile)) {
			$sMimeType = \strtolower(\MailSo\Base\Utils::MimeContentType($aFile['name']));
			if (\in_array($sMimeType, array('image/png', 'image/jpg', 'image/jpeg'))) {
				$sSavedName = 'upload-post-' . \md5($aFile['name'] . $aFile['tmp_name']);
				if (!$this->FilesProvider()->MoveUploadedFile($oAccount, $sSavedName, $aFile['tmp_name'])) {
					$iError = Enumerations\UploadError::ON_SAVING;
				} else {
					$rData = $this->FilesProvider()->GetFile($oAccount, $sSavedName);
					if (\is_resource($rData)) {
						$sData = \stream_get_contents($rData);
						if (!empty($sData) && 0 < \strlen($sData)) {
							$sName = $aFile['name'];
							if (empty($sName)) {
								$sName = '_';
							}

							if ($this->StorageProvider()->Put($oAccount,
								Providers\Storage\Enumerations\StorageType::CONFIG,
								'background',
								\json_encode(array(
									'Name' => $aFile['name'],
									'ContentType' => $sMimeType,
									'Raw' => \base64_encode($sData)
								))
							)) {
								$oSettings = $this->SettingsProvider()->Load($oAccount);
								if ($oSettings) {
									$sHash = \MailSo\Base\Utils::Md5Rand($sName . APP_VERSION . APP_SALT);

									$oSettings->SetConf('UserBackgroundName', $sName);
									$oSettings->SetConf('UserBackgroundHash', $sHash);
									$this->SettingsProvider()->Save($oAccount, $oSettings);
								}
							}
						}

						unset($sData);
					}

					if (\is_resource($rData)) {
						\fclose($rData);
					}

					unset($rData);
				}

				$this->FilesProvider()->Clear($oAccount, $sSavedName);
			} else {
				$iError = Enumerations\UploadError::FILE_TYPE;
			}
		}

		if (UPLOAD_ERR_OK !== $iError) {
			$iClientError = Enumerations\UploadClientError::NORMAL;
			$sError = $this->getUploadErrorMessageByCode($iError, $iClientError);

			if (!empty($sError)) {
				return $this->FalseResponse(__FUNCTION__, $iClientError, $sError);
			}
		}

		return $this->DefaultResponse(__FUNCTION__, !empty($sName) && !empty($sHash) ? array(
			'Name' => $sName,
			'Hash' => $sHash
		) : false);
	}

	private function importContactsFromCsvFile(Model\Account $oAccount, /*resource*/ $rFile, string $sFileStart): int
	{
		$iCount = 0;
		$aHeaders = null;
		$aData = array();

		if ($oAccount && \is_resource($rFile)) {
			$oAddressBookProvider = $this->AddressBookProvider($oAccount);
			if ($oAddressBookProvider && $oAddressBookProvider->IsActive()) {
				$sDelimiter = ((int)\strpos($sFileStart, ',') > (int)\strpos($sFileStart, ';')) ? ',' : ';';

				\setlocale(LC_CTYPE, 'en_US.UTF-8');
				while (false !== ($mRow = \fgetcsv($rFile, 5000, $sDelimiter, '"'))) {
					if (null === $aHeaders) {
						if (3 >= \count($mRow)) {
							return 0;
						}

						$aHeaders = $mRow;

						foreach ($aHeaders as $iIndex => $sHeaderValue) {
							$aHeaders[$iIndex] = \MailSo\Base\Utils::Utf8Clear($sHeaderValue);
						}
					} else {
						$aNewItem = array();
						foreach ($aHeaders as $iIndex => $sHeaderValue) {
							$aNewItem[$sHeaderValue] = isset($mRow[$iIndex]) ? $mRow[$iIndex] : '';
						}

						$aData[] = $aNewItem;
					}
				}

				if (0 < \count($aData)) {
					$this->Logger()->Write('Import contacts from csv');
					$iCount = $oAddressBookProvider->ImportCsvArray($oAccount->ParentEmailHelper(), $aData);
				}
			}
		}

		return $iCount;
	}

	private function importContactsFromVcfFile(Model\Account $oAccount, /*resource*/ $rFile): int
	{
		$iCount = 0;
		if ($oAccount && \is_resource($rFile)) {
			$oAddressBookProvider = $this->AddressBookProvider($oAccount);
			if ($oAddressBookProvider && $oAddressBookProvider->IsActive()) {
				$sFile = \stream_get_contents($rFile);
				if (\is_resource($rFile)) {
					\fclose($rFile);
				}

				if (is_string($sFile) && 5 < \strlen($sFile)) {
					$this->Logger()->Write('Import contacts from vcf');
					$iCount = $oAddressBookProvider->ImportVcfFile($oAccount->ParentEmailHelper(), $sFile);
				}
			}
		}

		return $iCount;
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function Append(): bool
	{
		$oAccount = $this->initMailClientConnection();

		$sFolderFullNameRaw = $this->GetActionParam('Folder', '');

		$_FILES = isset($_FILES) ? $_FILES : null;
		if ($oAccount instanceof Model\Account &&
			$this->Config()->Get('labs', 'allow_message_append', false) &&
			isset($_FILES, $_FILES['AppendFile'], $_FILES['AppendFile']['name'],
				$_FILES['AppendFile']['tmp_name'], $_FILES['AppendFile']['size'])) {
			if (is_string($_FILES['AppendFile']['tmp_name']) && 0 < strlen($_FILES['AppendFile']['tmp_name'])) {
				if (\UPLOAD_ERR_OK === (int)$_FILES['AppendFile']['error'] && !empty($sFolderFullNameRaw)) {
					$sSavedName = 'append-post-' . md5($sFolderFullNameRaw . $_FILES['AppendFile']['name'] . $_FILES['AppendFile']['tmp_name']);

					if ($this->FilesProvider()->MoveUploadedFile($oAccount,
						$sSavedName, $_FILES['AppendFile']['tmp_name'])) {
						$iMessageStreamSize = $this->FilesProvider()->FileSize($oAccount, $sSavedName);
						$rMessageStream = $this->FilesProvider()->GetFile($oAccount, $sSavedName);

						$this->MailClient()->MessageAppendStream($rMessageStream, $iMessageStreamSize, $sFolderFullNameRaw);

						$this->FilesProvider()->Clear($oAccount, $sSavedName);
					}
				}
			}
		}

		return $this->DefaultResponse(__FUNCTION__, true);
	}

	public function Capa(bool $bAdmin, ?Model\Account $oAccount = null): array
	{
		$oConfig = $this->Config();

		$aResult = array();

		if ($oConfig->Get('capa', 'messagelist_actions', true)) {
			$aResult[] = Enumerations\Capa::MESSAGELIST_ACTIONS;

			if ($oConfig->Get('capa', 'dangerous_actions', true)) {
				$aResult[] = Enumerations\Capa::DANGEROUS_ACTIONS;
			}
		}

		if ($oConfig->Get('capa', 'reload', true)) {
			$aResult[] = Enumerations\Capa::RELOAD;
		}

		if ($oConfig->Get('capa', 'quota', true)) {
			$aResult[] = Enumerations\Capa::QUOTA;
		}

		if ($oConfig->Get('capa', 'settings', true)) {
			$aResult[] = Enumerations\Capa::SETTINGS;

			if ($oConfig->Get('webmail', 'allow_additional_accounts', false)) {
				$aResult[] = Enumerations\Capa::ADDITIONAL_ACCOUNTS;
			}

			if ($oConfig->Get('webmail', 'allow_additional_identities', false)) {
				$aResult[] = Enumerations\Capa::IDENTITIES;
			}

			if ($oConfig->Get('capa', 'x-templates', true)) {
				$aResult[] = Enumerations\Capa::TEMPLATES;
			}

			if ($oConfig->Get('webmail', 'allow_themes', false)) {
				$aResult[] = Enumerations\Capa::THEMES;
			}

			if ($oConfig->Get('webmail', 'allow_user_background', false)) {
				$aResult[] = Enumerations\Capa::USER_BACKGROUND;
			}

			if ($oConfig->Get('security', 'openpgp', false)) {
				$aResult[] = Enumerations\Capa::OPEN_PGP;
			}

			if ($bAdmin || ($oAccount && $oAccount->Domain()->UseSieve())) {
				$aResult[] = Enumerations\Capa::SIEVE;
			}
		}

		if ($oConfig->Get('capa', 'help', true)) {
			$aResult[] = Enumerations\Capa::HELP;
		}

		if ($oConfig->Get('capa', 'attachments_actions', false)) {
			$aResult[] = Enumerations\Capa::ATTACHMENTS_ACTIONS;
		}

		if ($oConfig->Get('capa', 'message_actions', true)) {
			$aResult[] = Enumerations\Capa::MESSAGE_ACTIONS;
		}

		if ($oConfig->Get('capa', 'composer', true)) {
			$aResult[] = Enumerations\Capa::COMPOSER;

			if ($oConfig->Get('capa', 'contacts', true)) {
				$aResult[] = Enumerations\Capa::CONTACTS;
			}
		}

		if ($oConfig->Get('capa', 'search', true)) {
			$aResult[] = Enumerations\Capa::SEARCH;

			if ($oConfig->Get('capa', 'search_adv', true)) {
				$aResult[] = Enumerations\Capa::SEARCH_ADV;
			}
		}

		if ($oConfig->Get('interface', 'show_attachment_thumbnail', true)) {
			$aResult[] = Enumerations\Capa::ATTACHMENT_THUMBNAILS;
		}

		if ($oConfig->Get('labs', 'allow_prefetch', false)) {
			$aResult[] = Enumerations\Capa::PREFETCH;
		}

		$aResult[] = Enumerations\Capa::AUTOLOGOUT;

		return $aResult;
	}

	public function GetCapa(bool $bAdmin, string $sName, ?Model\Account $oAccount = null): bool
	{
		return \in_array($sName, $this->Capa($bAdmin, $oAccount));
	}

	public function etag(string $sKey): string
	{
		return \md5('Etag:' . \md5($sKey . \md5($this->Config()->Get('cache', 'index', ''))));
	}

	public function cacheByKey(string $sKey, bool $bForce = false): bool
	{
		$bResult = false;
		if (!empty($sKey) && ($bForce || ($this->Config()->Get('cache', 'enable', true) && $this->Config()->Get('cache', 'http', true)))) {
			$iExpires = $this->Config()->Get('cache', 'http_expires', 3600);
			if (0 < $iExpires) {
				$this->Http()->ServerUseCache($this->etag($sKey), 1382478804, \time() + $iExpires);
				$bResult = true;
			}
		}

		if (!$bResult) {
			$this->Http()->ServerNoCache();
		}

		return $bResult;
	}

	public function verifyCacheByKey(string $sKey, bool $bForce = false): void
	{
		if (!empty($sKey) && ($bForce || $this->Config()->Get('cache', 'enable', true) && $this->Config()->Get('cache', 'http', true))) {
			$sIfNoneMatch = $this->Http()->GetHeader('If-None-Match', '');
			if ($this->etag($sKey) === $sIfNoneMatch) {
				\MailSo\Base\Http::StatusHeader(304);
				$this->cacheByKey($sKey);
				exit(0);
			}
		}
	}

	private function initMailClientConnection(): ?Model\Account
	{
		$oAccount = null;

		if (!$this->MailClient()->IsLoggined()) {
			$oAccount = $this->getAccountFromToken();

			try {
				$oAccount->IncConnectAndLoginHelper($this->Plugins(), $this->MailClient(), $this->Config());
			} catch (\MailSo\Net\Exceptions\ConnectionException $oException) {
				throw new Exceptions\ClientException(Notifications::ConnectionError, $oException);
			} catch (\Throwable $oException) {
				throw new Exceptions\ClientException(Notifications::AuthError, $oException);
			}

			$this->MailClient()->ImapClient()->__FORCE_SELECT_ON_EXAMINE__ = !!$this->Config()->Get('labs', 'use_imap_force_selection');
		}

		return $oAccount;
	}

	private function getDecodedRawKeyValue(string $sRawKey): array
	{
		return empty($sRawKey) ? array() : Utils::DecodeKeyValuesQ($sRawKey);
	}

	public function StaticCache(): string
	{
		static $sCache = null;
		if (!$sCache) {
			$sCache = \md5(APP_VERSION . $this->Plugins()->Hash());
		}
		return $sCache;
	}

	public function ValidateContactPdoType(string $sType): string
	{
		return \in_array($sType, \RainLoop\Common\PdoAbstract::getAvailableDrivers()) ? $sType : 'sqlite';
	}

	public function ProcessTemplate(string $sName, string $sHtml): string
	{
		$sHtml = \preg_replace('/<script/i', '<x-script', $sHtml);
		$sHtml = \preg_replace('/<\/script>/i', '</x-script>', $sHtml);

		return Utils::ClearHtmlOutput($sHtml);
	}

	public function SetActionParams(array $aCurrentActionParams, string $sMethodName = ''): self
	{
		$this->Plugins()->RunHook('filter.action-params', array($sMethodName, &$aCurrentActionParams));

		$this->aCurrentActionParams = $aCurrentActionParams;

		return $this;
	}

	/**
	 * @param mixed $mDefault = null
	 *
	 * @return mixed
	 */
	public function GetActionParam(string $sKey, $mDefault = null)
	{
		return \is_array($this->aCurrentActionParams) && isset($this->aCurrentActionParams[$sKey]) ?
			$this->aCurrentActionParams[$sKey] : $mDefault;
	}

	/**
	 * @return mixed
	 */
	public function GetActionParams()
	{
		return $this->aCurrentActionParams;
	}

	public function HasActionParam(string $sKey): bool
	{
		return isset($this->aCurrentActionParams[$sKey]);
	}

	public function Location(string $sUrl): void
	{
		$this->Logger()->Write('Location: ' . $sUrl);
		\header('Location: ' . $sUrl);
	}

	public function StaticPath(string $sPath): string
	{
		return Utils::WebStaticPath() . $sPath;
	}

}
