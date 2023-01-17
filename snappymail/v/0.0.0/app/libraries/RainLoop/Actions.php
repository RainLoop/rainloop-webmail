<?php

namespace RainLoop;

use RainLoop\Enumerations\UploadError;

class Actions
{
	use Actions\Admin;
	use Actions\User;
	use Actions\UserAuth;
	use Actions\Raw;
	use Actions\Response;
	use Actions\Localization;
	use Actions\Themes;

	const AUTH_MAILTO_TOKEN_KEY = 'smmailtoauth';

	/**
	 * This 30 days cookie contains decrypt data,
	 * to decrypt a \RainLoop\Model\Account which is stored at
	 * /_data_/.../storage/DOMAIN/LOCAL/.sign_me/*
	 * Gets refreshed on each login
	 */
	const AUTH_SIGN_ME_TOKEN_KEY = 'smremember';

	/**
	 * This session cookie contains a \RainLoop\Model\Account
	 * Value is Base64 EncryptToJSON
	 */
	const AUTH_SPEC_TOKEN_KEY = 'smaccount';

	/**
	 * This session cookie optionally contains a \RainLoop\Model\AdditionalAccount
	 * Value is Base64 EncryptToJSON
	 */
	const AUTH_ADDITIONAL_TOKEN_KEY = 'smadditional';

	const AUTH_SPEC_LOGOUT_TOKEN_KEY = 'smspeclogout';
	const AUTH_SPEC_LOGOUT_CUSTOM_MSG_KEY = 'smspeclogoutcmk';

	const APP_DUMMY = '********';

	/**
	 * @var \MailSo\Base\Http
	 */
	protected $oHttp = null;

	/**
	 * @var array
	 */
	protected $aCurrentActionParams = array();

	/**
	 * @var \MailSo\Mail\MailClient
	 */
	protected $oMailClient = null;

	/**
	 * @var \RainLoop\Plugins\Manager
	 */
	protected $oPlugins = null;

	/**
	 * @var \MailSo\Log\Logger
	 */
	protected $oLogger = null;

	/**
	 * @var \MailSo\Log\Logger
	 */
	protected $oLoggerAuth;

	/**
	 * @var array of \MailSo\Cache\CacheClient
	 */
	protected $aCachers = array();

	/**
	 * @var \RainLoop\Providers\Storage
	 */
	protected $oStorageProvider = null;

	/**
	 * @var \RainLoop\Providers\Storage
	 */
	protected $oLocalStorageProvider = null;

	/**
	 * @var \RainLoop\Providers\Files
	 */
	protected $oFilesProvider = null;

	/**
	 * @var \RainLoop\Providers\Domain
	 */
	protected $oDomainProvider = null;

	/**
	 * @var \RainLoop\Providers\Settings
	 */
	protected $oSettingsProvider = null;

	/**
	 * @var \RainLoop\Providers\Settings
	 */
	protected $oLocalSettingsProvider = null;

	/**
	 * @var \RainLoop\Providers\AddressBook
	 */
	protected $oAddressBookProvider = null;

	/**
	 * @var \RainLoop\Config\Application
	 */
	protected $oConfig = null;

	/**
	 * @var bool
	 */
	protected $bIsJson = false;

	function __construct()
	{
		$this->oConfig = API::Config();

		$this->oLogger = API::Logger();
		if ($this->oConfig->Get('logs', 'enable', false) || $this->oConfig->Get('debug', 'enable', false)) {

			$oDriver = null;
			$sLogFileName = $this->oConfig->Get('logs', 'filename', '');
			if ('syslog' === $sLogFileName) {
				$oDriver = new \MailSo\Log\Drivers\Syslog();
			} else {
				$sLogFileFullPath = \trim($this->oConfig->Get('logs', 'path', '')) ?: \APP_PRIVATE_DATA . 'logs';
				\is_dir($sLogFileFullPath) || \mkdir($sLogFileFullPath, 0700, true);
				$oDriver = new \MailSo\Log\Drivers\File($sLogFileFullPath . '/' . $this->compileLogFileName($sLogFileName));
			}
			$this->oLogger->append($oDriver
				->SetTimeZone($this->oConfig->Get('logs', 'time_zone', 'UTC'))
			);

			$oHttp = $this->Http();

			$this->oLogger->Write(
				'[SM:' . APP_VERSION . '][IP:'
				. $oHttp->GetClientIp($this->oConfig->Get('labs', 'http_client_ip_check_proxy', false))
				. '][PID:' . (\MailSo\Base\Utils::FunctionCallable('getmypid') ? \getmypid() : 'unknown')
				. '][' . \MailSo\Base\Http::GetServer('SERVER_SOFTWARE', '~')
				. '][' . (\MailSo\Base\Utils::FunctionCallable('php_sapi_name') ? \php_sapi_name() : '~')
				. '][Streams:' . \implode(',', \stream_get_transports())
				. '][' . $oHttp->GetMethod() . ' ' . $oHttp->GetScheme() . '://' . $oHttp->GetHost(false, false) . \MailSo\Base\Http::GetServer('REQUEST_URI', '') . ']'
			);
		}

		$this->oPlugins = new Plugins\Manager($this);
		$this->oPlugins->SetLogger($this->oLogger);
		$this->oPlugins->RunHook('filter.application-config', array($this->oConfig));
	}

	public function SetIsJson(bool $bIsJson): self
	{
		$this->bIsJson = $bIsJson;

		return $this;
	}

	public function GetIsJson(): bool
	{
		return $this->bIsJson;
	}

	public function Config(): Config\Application
	{
		return $this->oConfig;
	}

	/**
	 * @return mixed
	 */
	protected function fabrica(string $sName, ?Model\Account $oAccount = null)
	{
		$mResult = null;
		$this->oPlugins->RunHook('main.fabrica', array($sName, &$mResult), false);

		if (null === $mResult) {
			switch ($sName) {
				case 'files':
					// RainLoop\Providers\Files\IFiles
					$mResult = new Providers\Files\FileStorage(APP_PRIVATE_DATA . 'storage');
					break;
				case 'storage':
				case 'storage-local':
					// RainLoop\Providers\Storage\IStorage
					$mResult = new Providers\Storage\FileStorage(
						APP_PRIVATE_DATA . 'storage', 'storage-local' === $sName);
					break;
				case 'settings':
					// RainLoop\Providers\Settings\ISettings
					$mResult = new Providers\Settings\DefaultSettings($this->StorageProvider());
					break;
				case 'settings-local':
					// RainLoop\Providers\Settings\ISettings
					$mResult = new Providers\Settings\DefaultSettings($this->LocalStorageProvider());
					break;
				case 'login':
					// Providers\Login\LoginInterface
					$mResult = new Providers\Login\DefaultLogin();
					break;
				case 'domain':
					// Providers\Domain\DomainInterface
					$mResult = new Providers\Domain\DefaultDomain(APP_PRIVATE_DATA . 'domains', $this->Cacher());
					break;
				case 'filters':
					// Providers\Filters\FiltersInterface
					$mResult = new Providers\Filters\SieveStorage(
						$this->oPlugins, $this->oConfig
					);
					break;
				case 'address-book':
					// Providers\AddressBook\AddressBookInterface
					$mResult = new Providers\AddressBook\PdoAddressBook();
					break;
				case 'identities':
				case 'suggestions':
					$mResult = [];
					break;
			}
		}

		// Always give the file provider as last for identities, it is the override
		if ('identities' === $sName) {
			$mResult[] = new Providers\Identities\FileIdentities($this->LocalStorageProvider());
		}

		foreach (\is_array($mResult) ? $mResult : array($mResult) as $oItem) {
			if ($oItem && \method_exists($oItem, 'SetLogger')) {
				$oItem->SetLogger($this->oLogger);
			}
		}

		$this->oPlugins->RunHook('filter.fabrica', array($sName, &$mResult, $oAccount), false);

		return $mResult;
	}

	public function BootEnd(): void
	{
		try {
			if ($this->MailClient()->IsLoggined()) {
				$this->MailClient()->Disconnect();
			}
		} catch (\Throwable $oException) {
			unset($oException);
		}
	}

	protected function compileLogParams(string $sLine, ?Model\Account $oAccount = null, bool $bUrlEncode = false, array $aAdditionalParams = array()): string
	{
		$aClear = array();

		if (false !== \strpos($sLine, '{date:')) {
			$oConfig = $this->oConfig;
			$sLine = \preg_replace_callback('/\{date:([^}]+)\}/', function ($aMatch) use ($oConfig, $bUrlEncode) {
				return Utils::UrlEncode((new \DateTime('now', new \DateTimeZone($oConfig->Get('logs', 'time_zone', 'UTC'))))->format($aMatch[1]), $bUrlEncode);
			}, $sLine);

			$aClear['/\{date:([^}]*)\}/'] = 'date';
		}

		if (false !== \strpos($sLine, '{imap:') || false !== \strpos($sLine, '{smtp:')) {
			if (!$oAccount) {
				$oAccount = $this->getAccountFromToken(false);
			}

			if ($oAccount) {
				$sLine = \str_replace('{imap:login}', Utils::UrlEncode($oAccount->IncLogin(), $bUrlEncode), $sLine);
				$sLine = \str_replace('{imap:host}', Utils::UrlEncode($oAccount->Domain()->IncHost(), $bUrlEncode), $sLine);
				$sLine = \str_replace('{imap:port}', Utils::UrlEncode($oAccount->Domain()->IncPort(), $bUrlEncode), $sLine);

				$sLine = \str_replace('{smtp:login}', Utils::UrlEncode($oAccount->OutLogin(), $bUrlEncode), $sLine);
				$sLine = \str_replace('{smtp:host}', Utils::UrlEncode($oAccount->Domain()->OutHost(), $bUrlEncode), $sLine);
				$sLine = \str_replace('{smtp:port}', Utils::UrlEncode($oAccount->Domain()->OutPort(), $bUrlEncode), $sLine);
			}

			$aClear['/\{imap:([^}]*)\}/i'] = 'imap';
			$aClear['/\{smtp:([^}]*)\}/i'] = 'smtp';
		}

		if (false !== \strpos($sLine, '{request:')) {
			if (false !== \strpos($sLine, '{request:ip}')) {
				$sLine = \str_replace('{request:ip}', Utils::UrlEncode($this->Http()->GetClientIp(
					$this->oConfig->Get('labs', 'http_client_ip_check_proxy', false)), $bUrlEncode), $sLine);
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
						\crc32(Utils::GetConnectionToken())), 10, 32), $bUrlEncode),
					$sLine
				);
			}

			if (false !== \strpos($sLine, '{user:ip}')) {
				$sLine = \str_replace('{user:ip}', Utils::UrlEncode($this->Http()->GetClientIp(
					$this->oConfig->Get('labs', 'http_client_ip_check_proxy', false)), $bUrlEncode), $sLine);
			}

			if (\preg_match('/\{user:(email|login|domain)\}/i', $sLine)) {
				if (!$oAccount) {
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

	protected function compileLogFileName(string $sFileName): string
	{
		$sFileName = \trim($sFileName);

		if (\strlen($sFileName)) {
			$sFileName = $this->compileLogParams($sFileName);

			$sFileName = \preg_replace('/[\/]+/', '/', \preg_replace('/[.]+/', '.', $sFileName));
			$sFileName = \preg_replace('/[^a-zA-Z0-9@_+=\-\.\/!()\[\]]/', '', $sFileName);
		}

		if (!\strlen($sFileName)) {
			$sFileName = 'snappymail-log.txt';
		}

		return $sFileName;
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
			$this->oMailClient->SetLogger($this->oLogger);
		}

		return $this->oMailClient;
	}

	public function ImapClient(): \MailSo\Imap\ImapClient
	{
//		$this->initMailClientConnection();
		return $this->MailClient()->ImapClient();
	}

	// Stores data in AdditionalAccount else MainAccount
	public function LocalStorageProvider(): Providers\Storage
	{
		if (!$this->oLocalStorageProvider) {
			$this->oLocalStorageProvider = new Providers\Storage($this->fabrica('storage-local'));
		}
		return $this->oLocalStorageProvider;
	}

	// Stores data in MainAccount
	public function StorageProvider(): Providers\Storage
	{
		if (!$this->oStorageProvider) {
			$this->oStorageProvider = new Providers\Storage($this->fabrica('storage'));
		}
		return $this->oStorageProvider;
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
				$this->fabrica('domain'), $this->oPlugins);
		}

		return $this->oDomainProvider;
	}

	public function AddressBookProvider(?Model\Account $oAccount = null): Providers\AddressBook
	{
		if (null === $this->oAddressBookProvider) {
			$oDriver = null;
			try {
//				if ($this->oConfig->Get('contacts', 'enable', false)) {
				if ($this->GetCapa(Enumerations\Capa::CONTACTS)) {
					$oDriver = $this->fabrica('address-book', $oAccount);
				}
				if ($oAccount && $oDriver) {
					$oDriver->SetEmail($this->GetMainEmail($oAccount));
					$oDriver->setDAVClientConfig($this->getContactsSyncData($oAccount));
				}
			} catch (\Throwable $e) {
				\SnappyMail\LOG::error('AddressBook', $e->getMessage()."\n".$e->getTraceAsString());
				$oDriver = null;
//				$oDriver = new Providers\AddressBook\PdoAddressBook();
			}
			$this->oAddressBookProvider = new Providers\AddressBook($oDriver);
			$this->oAddressBookProvider->SetLogger($this->oLogger);
		}

		return $this->oAddressBookProvider;
	}

	public function Cacher(?Model\Account $oAccount = null, bool $bForceFile = false): \MailSo\Cache\CacheClient
	{
		$sKey = '';
		if ($oAccount) {
			$sKey = $this->GetMainEmail($oAccount);
		}

		$sIndexKey = empty($sKey) ? '_default_' : $sKey;
		if ($bForceFile) {
			$sIndexKey .= '/_files_';
		}

		if (!isset($this->aCachers[$sIndexKey])) {
			$this->aCachers[$sIndexKey] = new \MailSo\Cache\CacheClient();

			$oDriver = null;
			$sDriver = \strtoupper(\trim($this->oConfig->Get('cache', 'fast_cache_driver', 'files')));

			switch (true) {
				default:
				case $bForceFile:
					$oDriver = new \MailSo\Cache\Drivers\File(
						\trim($this->oConfig->Get('cache', 'path', '')) ?: APP_PRIVATE_DATA . 'cache',
						$sKey
					);
					break;

				case ('APCU' === $sDriver) &&
					\MailSo\Base\Utils::FunctionsCallable(array(
						'apcu_store', 'apcu_fetch', 'apcu_delete', 'apcu_clear_cache')):

					$oDriver = new \MailSo\Cache\Drivers\APCU($sKey);
					break;

				case ('MEMCACHE' === $sDriver || 'MEMCACHED' === $sDriver) &&
					(\class_exists('Memcache',false) || \class_exists('Memcached',false)):
					$oDriver = new \MailSo\Cache\Drivers\Memcache(
						$this->oConfig->Get('labs', 'fast_cache_memcache_host', '127.0.0.1'),
						(int) $this->oConfig->Get('labs', 'fast_cache_memcache_port', 11211),
						43200,
						$sKey
					);
					break;

				case 'REDIS' === $sDriver && \class_exists('Predis\Client'):
					$oDriver = new \MailSo\Cache\Drivers\Redis(
						$this->oConfig->Get('labs', 'fast_cache_redis_host', '127.0.0.1'),
						(int) $this->oConfig->Get('labs', 'fast_cache_redis_port', 6379),
						43200,
						$sKey
					);
					break;
			}

			if ($oDriver) {
				$this->aCachers[$sIndexKey]->SetDriver($oDriver);
			}

			$this->aCachers[$sIndexKey]->SetCacheIndex($this->oConfig->Get('cache', 'fast_cache_index', ''));
		}

		return $this->aCachers[$sIndexKey];
	}

	public function Plugins(): Plugins\Manager
	{
		return $this->oPlugins;
	}

	public function Logger(): \MailSo\Log\Logger
	{
		return $this->oLogger;
	}

	public function LoggerAuth(): \MailSo\Log\Logger
	{
		if (!$this->oLoggerAuth) {
			$this->oLoggerAuth = new \MailSo\Log\Logger(false);
			if ($this->oConfig->Get('logs', 'auth_logging', false)) {
//				$this->oLoggerAuth->SetLevel(\LOG_WARNING);

				$sAuthLogFileFullPath = (\trim($this->oConfig->Get('logs', 'path', '') ?: \APP_PRIVATE_DATA . 'logs'))
					. '/' . $this->compileLogFileName($this->oConfig->Get('logs', 'auth_logging_filename', ''));
				$sLogFileDir = \dirname($sAuthLogFileFullPath);
				\is_dir($sLogFileDir) || \mkdir($sLogFileDir, 0755, true);
				$this->oLoggerAuth->append(
					(new \MailSo\Log\Drivers\File($sAuthLogFileFullPath))
						->DisableTimePrefix()
						->DisableGuidPrefix()
						->DisableTypedPrefix()
				);
			}
		}
		return $this->oLoggerAuth;
	}

	protected function LoggerAuthHelper(?Model\Account $oAccount = null, array $aAdditionalParams = array(), bool $admin = false): void
	{
		$sLine = $this->oConfig->Get('logs', 'auth_logging_format', '');
		if (!empty($sLine)) {
			$this->LoggerAuth()->Write($this->compileLogParams($sLine, $oAccount, false, $aAdditionalParams), \LOG_WARNING);
		}
		if (($this->oConfig->Get('logs', 'auth_logging', false) || $this->oConfig->Get('logs', 'auth_syslog', false))
		 && \openlog('snappymail', 0, \LOG_AUTHPRIV)) {
			\syslog(\LOG_ERR, $this->compileLogParams(
				$admin ? 'Admin Auth failed: ip={request:ip} user={user:login}' : 'Auth failed: ip={request:ip} user={imap:login}',
				$oAccount, false, $aAdditionalParams
			));
			\closelog();
		}
	}

	public function AppData(bool $bAdmin): array
	{
		$oAccount = null;
		$oConfig = $this->oConfig;

		$aResult = array(
			'Auth' => false,
			'Title' => $oConfig->Get('webmail', 'title', 'SnappyMail Webmail'),
			'LoadingDescription' => $oConfig->Get('webmail', 'loading_description', 'SnappyMail'),
			'Plugins' => array(),
			'System' => \array_merge(
				array(
					'version' => APP_VERSION,
					'token' => $oConfig->Get('security', 'csrf_protection', true) ? Utils::GetCsrfToken() : '',
					'languages' => \SnappyMail\L10n::getLanguages(false),
					'webPath' => \RainLoop\Utils::WebPath(),
					'webVersionPath' => \RainLoop\Utils::WebVersionPath()
				), $bAdmin ? array(
					'adminHostUse' => '' !== $oConfig->Get('security', 'admin_panel_host', ''),
					'adminPath' => $oConfig->Get('security', 'admin_panel_key', '') ?: 'admin',
					'adminAllowed' => (bool)$oConfig->Get('security', 'allow_admin_panel', true)
				) : array()
			),
			'AllowLanguagesOnLogin' => (bool) $oConfig->Get('login', 'allow_languages_on_login', true)
		);

		$sLanguage = $oConfig->Get('webmail', 'language', 'en');
		$UserLanguageRaw = $this->detectUserLanguage($bAdmin);

		if ($bAdmin) {
			$aResult['Auth'] = $this->IsAdminLoggined(false);
			if ($aResult['Auth']) {
				$aResult['AdminLogin'] = (string)$oConfig->Get('security', 'admin_login', '');
				$aResult['AdminTOTP'] = (string)$oConfig->Get('security', 'admin_totp', '');
				$aResult['EnabledPlugins'] = (bool)$oConfig->Get('plugins', 'enable', false);

				$aResult['LoginDefaultDomain'] = $oConfig->Get('login', 'default_domain', '');
				$aResult['DetermineUserLanguage'] = (bool)$oConfig->Get('login', 'determine_user_language', true);
				$aResult['DetermineUserDomain'] = (bool)$oConfig->Get('login', 'determine_user_domain', false);

				$aResult['supportedPdoDrivers'] = \RainLoop\Common\PdoAbstract::getAvailableDrivers();

				$aResult['ContactsEnable'] = (bool)$oConfig->Get('contacts', 'enable', false);
				$aResult['ContactsSync'] = (bool)$oConfig->Get('contacts', 'allow_sync', false);
				$aResult['ContactsPdoType'] = Providers\AddressBook\PdoAddressBook::validPdoType($this->oConfig->Get('contacts', 'type', 'sqlite'));
				$aResult['ContactsPdoDsn'] = (string)$oConfig->Get('contacts', 'pdo_dsn', '');
				$aResult['ContactsPdoType'] = (string)$oConfig->Get('contacts', 'type', '');
				$aResult['ContactsPdoUser'] = (string)$oConfig->Get('contacts', 'pdo_user', '');
				$aResult['ContactsPdoPassword'] = static::APP_DUMMY;
				$aResult['ContactsSuggestionsLimit'] = (int)$oConfig->Get('contacts', 'suggestions_limit', 20);

				$aResult['FaviconUrl'] = $oConfig->Get('webmail', 'favicon_url', '');

				$aResult['WeakPassword'] = \is_file(APP_PRIVATE_DATA.'admin_password.txt');

				$aResult['System']['languagesAdmin'] = \SnappyMail\L10n::getLanguages(true);
				$aResult['LanguageAdmin'] = $this->ValidateLanguage($oConfig->Get('webmail', 'language_admin', 'en'), '', true);
				$aResult['UserLanguageAdmin'] = $this->ValidateLanguage($UserLanguageRaw, '', true, true);
			} else {
				$passfile = APP_PRIVATE_DATA.'admin_password.txt';
				$sPassword = $oConfig->Get('security', 'admin_password', '');
				if (!$sPassword) {
					$sPassword = \substr(\base64_encode(\random_bytes(16)), 0, 12);
					Utils::saveFile($passfile, $sPassword . "\n");
//					\chmod($passfile, 0600);
					$oConfig->SetPassword($sPassword);
					$oConfig->Save();
				}
			}
		} else {
			$oAccount = $this->getAccountFromToken(false);
			if ($oAccount) {
				$aResult = \array_merge($aResult, [
					'Auth' => true,
					'Email' => \MailSo\Base\Utils::IdnToUtf8($oAccount->Email()),
					'AccountHash' => $oAccount->Hash(),
					'AccountSignMe' => isset($_COOKIE[self::AUTH_SIGN_ME_TOKEN_KEY]),
					'MainEmail' => \MailSo\Base\Utils::IdnToUtf8($this->getMainAccountFromToken()->Email()),
					'MailToEmail' => '',

					'ContactsIsAllowed' => $this->AddressBookProvider($oAccount)->IsActive(),

					'ViewHTML' => (bool) $oConfig->Get('defaults', 'view_html', true),
					'ShowImages' => (bool) $oConfig->Get('defaults', 'show_images', false),
					'RemoveColors' => (bool) $oConfig->Get('defaults', 'remove_colors', false),
					'ListInlineAttachments' => false,
					'simpleAttachmentsList' => false,
					'listGrouped' => false,
					'MessagesPerPage' => (int) $oConfig->Get('webmail', 'messages_per_page', 25),
					'MessageReadDelay' => (int) $oConfig->Get('webmail', 'message_read_delay', 5),
					'MsgDefaultAction' => 1,
					'SoundNotification' => true,
					'NotificationSound' => 'new-mail',
					'DesktopNotifications' => true,
					'Layout' => (int) $oConfig->Get('defaults', 'view_layout', Enumerations\Layout::SIDE_PREVIEW),
					'EditorDefaultType' => \str_replace('Forced', '', $oConfig->Get('defaults', 'view_editor_type', '')),
					'UseCheckboxesInList' => (bool) $oConfig->Get('defaults', 'view_use_checkboxes', true),
					'AutoLogout' => (int) $oConfig->Get('defaults', 'autologout', 30),
					'UseThreads' => (bool) $oConfig->Get('defaults', 'mail_use_threads', false),
					'AllowDraftAutosave' => (bool) $oConfig->Get('defaults', 'allow_draft_autosave', true),
					'ReplySameFolder' => (bool) $oConfig->Get('defaults', 'mail_reply_same_folder', false),
					'ContactsAutosave' => (bool) $oConfig->Get('defaults', 'contacts_autosave', true),
					'HideUnsubscribed' => false,
					'HideDeleted' => true,
					'ShowUnreadCount' => false,
					'UnhideKolabFolders' => false,
					'UserBackgroundName' => '',
					'UserBackgroundHash' => '',
					'SieveAllowFileintoInbox' => (bool)$oConfig->Get('labs', 'sieve_allow_fileinto_inbox', false)
				]);

				$aAttachmentsActions = array();
				if ($this->GetCapa(Enumerations\Capa::ATTACHMENTS_ACTIONS)) {
					if (\class_exists('PharData') || \class_exists('ZipArchive')) {
						$aAttachmentsActions[] = 'zip';
					}
				}
				$aResult['System'] = \array_merge(
					$aResult['System'], array(
						'allowHtmlEditorBitiButtons' => (bool)$oConfig->Get('labs', 'allow_html_editor_biti_buttons', false),
						'allowCtrlEnterOnCompose' => (bool)$oConfig->Get('labs', 'allow_ctrl_enter_on_compose', false),
						'useImapThread' => (bool)$oConfig->Get('imap', 'use_thread', true),
						'allowAppendMessage' => (bool)$oConfig->Get('labs', 'allow_message_append', false),
						'folderSpecLimit' => (int)$oConfig->Get('labs', 'folders_spec_limit', 50),
						'listPermanentFiltered' => '' !== \trim($oConfig->Get('imap', 'message_list_permanent_filter', '')),
						'attachmentsActions' => $aAttachmentsActions,
						'customLogoutLink' => $oConfig->Get('labs', 'custom_logout_link', ''),
					)
				);

				if ($aResult['ContactsIsAllowed'] && $oConfig->Get('contacts', 'allow_sync', false)) {
					$aData = $this->getContactsSyncData($oAccount) ?: [
						'Mode' => 0,
						'Url' => '',
						'User' => ''
					];
					$aData['Password'] = empty($aData['Password']) ? '' : static::APP_DUMMY;
					$aData['Interval'] = \max(20, \min(320, (int) $oConfig->Get('contacts', 'sync_interval', 20)));
					$aResult['ContactsSync'] = $aData;
				}

				$sToken = Utils::GetCookie(self::AUTH_MAILTO_TOKEN_KEY);
				if (null !== $sToken) {
					Utils::ClearCookie(self::AUTH_MAILTO_TOKEN_KEY);

					$mMailToData = Utils::DecodeKeyValuesQ($sToken);
					if (!empty($mMailToData['MailTo']) && 'MailTo' === $mMailToData['MailTo'] && !empty($mMailToData['To'])) {
						$aResult['MailToEmail'] = \MailSo\Base\Utils::IdnToUtf8($mMailToData['To']);
					}
				}

				$oSettingsLocal = $this->SettingsProvider(true)->Load($oAccount);
				if ($oSettingsLocal instanceof Settings) {
					$aResult['SentFolder'] = (string)$oSettingsLocal->GetConf('SentFolder', '');
					$aResult['DraftsFolder'] = (string)$oSettingsLocal->GetConf('DraftFolder', '');
					$aResult['JunkFolder'] = (string)$oSettingsLocal->GetConf('SpamFolder', '');
					$aResult['TrashFolder'] = (string)$oSettingsLocal->GetConf('TrashFolder', '');
					$aResult['ArchiveFolder'] = (string)$oSettingsLocal->GetConf('ArchiveFolder', '');
					$aResult['HideUnsubscribed'] = (bool)$oSettingsLocal->GetConf('HideUnsubscribed', $aResult['HideUnsubscribed']);
					$aResult['UseThreads'] = (bool)$oSettingsLocal->GetConf('UseThreads', $aResult['UseThreads']);
					$aResult['ReplySameFolder'] = (bool)$oSettingsLocal->GetConf('ReplySameFolder', $aResult['ReplySameFolder']);
					$aResult['HideDeleted'] = (bool)$oSettingsLocal->GetConf('HideDeleted', $aResult['HideDeleted']);
					$aResult['ShowUnreadCount'] = (bool)$oSettingsLocal->GetConf('ShowUnreadCount', $aResult['ShowUnreadCount']);
					$aResult['UnhideKolabFolders'] = (bool)$oSettingsLocal->GetConf('UnhideKolabFolders', $aResult['UnhideKolabFolders']);
				}

				if ($oConfig->Get('login', 'determine_user_language', true)) {
					$sLanguage = $this->ValidateLanguage($UserLanguageRaw, $sLanguage, false);
				}

				$oSettings = $this->SettingsProvider()->Load($oAccount);
				if ($oSettings instanceof Settings) {
					if ($oConfig->Get('webmail', 'allow_languages_on_settings', true)) {
						$sLanguage = (string) $oSettings->GetConf('Language', $sLanguage);
					}
					$aResult['hourCycle'] = $oSettings->GetConf('hourCycle', '');

					if (!$oSettings->GetConf('MessagesPerPage')) {
						$oSettings->SetConf('MessagesPerPage', $oSettings->GetConf('MPP', $aResult['MessagesPerPage']));
					}

					$aResult['EditorDefaultType'] = \str_replace('Forced', '', $oSettings->GetConf('EditorDefaultType', $aResult['EditorDefaultType']));
					$aResult['requestReadReceipt'] = (bool) $oSettings->GetConf('requestReadReceipt', false);
					$aResult['requestDsn'] = (bool) $oSettings->GetConf('requestDsn', false);
					$aResult['pgpSign'] = (bool) $oSettings->GetConf('pgpSign', false);
					$aResult['pgpEncrypt'] = (bool) $oSettings->GetConf('pgpEncrypt', false);
					$aResult['allowSpellcheck'] = (bool) $oSettings->GetConf('allowSpellcheck', false);

					$aResult['ViewHTML'] = (bool)$oSettings->GetConf('ViewHTML', $aResult['ViewHTML']);
					$aResult['ShowImages'] = (bool)$oSettings->GetConf('ShowImages', $aResult['ShowImages']);
					$aResult['RemoveColors'] = (bool)$oSettings->GetConf('RemoveColors', $aResult['RemoveColors']);
					$aResult['ListInlineAttachments'] = (bool)$oSettings->GetConf('ListInlineAttachments', $aResult['ListInlineAttachments']);
					$aResult['simpleAttachmentsList'] = (bool)$oSettings->GetConf('simpleAttachmentsList', $aResult['simpleAttachmentsList']);
					$aResult['listGrouped'] = (bool)$oSettings->GetConf('listGrouped', $aResult['listGrouped']);
					$aResult['ContactsAutosave'] = (bool)$oSettings->GetConf('ContactsAutosave', $aResult['ContactsAutosave']);
					$aResult['MessagesPerPage'] = (int)$oSettings->GetConf('MessagesPerPage', $aResult['MessagesPerPage']);
					$aResult['MessageReadDelay'] = (int)$oSettings->GetConf('MessageReadDelay', $aResult['MessageReadDelay']);
					$aResult['MsgDefaultAction'] = (int)$oSettings->GetConf('MsgDefaultAction', $aResult['MsgDefaultAction']);
					$aResult['SoundNotification'] = (bool)$oSettings->GetConf('SoundNotification', $aResult['SoundNotification']);
					$aResult['NotificationSound'] = (string)$oSettings->GetConf('NotificationSound', $aResult['NotificationSound']);
					$aResult['DesktopNotifications'] = (bool)$oSettings->GetConf('DesktopNotifications', $aResult['DesktopNotifications']);
					$aResult['UseCheckboxesInList'] = (bool)$oSettings->GetConf('UseCheckboxesInList', $aResult['UseCheckboxesInList']);
					$aResult['AllowDraftAutosave'] = (bool)$oSettings->GetConf('AllowDraftAutosave', $aResult['AllowDraftAutosave']);
					$aResult['AutoLogout'] = (int)$oSettings->GetConf('AutoLogout', $aResult['AutoLogout']);
					$aResult['Layout'] = (int)$oSettings->GetConf('Layout', $aResult['Layout']);
					$aResult['Resizer4Width'] = (int)$oSettings->GetConf('Resizer4Width', 0);
					$aResult['Resizer5Width'] = (int)$oSettings->GetConf('Resizer5Width', 0);
					$aResult['Resizer5Height'] = (int)$oSettings->GetConf('Resizer5Height', 0);

					$aResult['fontSansSerif'] = $oSettings->GetConf('fontSansSerif', '');
					$aResult['fontSerif'] = $oSettings->GetConf('fontSerif', '');
					$aResult['fontMono'] = $oSettings->GetConf('fontMono', '');

					if ($this->GetCapa(Enumerations\Capa::USER_BACKGROUND)) {
						$aResult['UserBackgroundName'] = (string)$oSettings->GetConf('UserBackgroundName', $aResult['UserBackgroundName']);
						$aResult['UserBackgroundHash'] = (string)$oSettings->GetConf('UserBackgroundHash', $aResult['UserBackgroundHash']);
					}
				}

				$aResult['NewMailSounds'] = [];
				foreach (\glob(APP_VERSION_ROOT_PATH.'static/sounds/*.mp3') as $file) {
					$aResult['NewMailSounds'][] = \basename($file, '.mp3');
				}
			}
			else {
				if ($oConfig->Get('login', 'allow_languages_on_login', true) && $oConfig->Get('login', 'determine_user_language', true)) {
					$sLanguage = $this->ValidateLanguage($UserLanguageRaw, $sLanguage, false);
				}

				if (SNAPPYMAIL_DEV) {
					$aResult['DevEmail'] = $oConfig->Get('labs', 'dev_email', '');
					$aResult['DevPassword'] = $oConfig->Get('labs', 'dev_password', '');
				} else {
					$aResult['DevEmail'] = '';
					$aResult['DevPassword'] = '';
				}

				$aResult['SignMe'] = (string) $oConfig->Get('login', 'sign_me_auto', Enumerations\SignMeType::DEFAULT_OFF);

				$aResult['AdditionalLoginError'] = $this->GetSpecLogoutCustomMgsWithDeletion();
			}
		}

		if ($aResult['Auth']) {
			$aResult['UseLocalProxyForExternalImages'] = (bool)$oConfig->Get('labs', 'use_local_proxy_for_external_images', false);
			$aResult['AllowLanguagesOnSettings'] = (bool) $oConfig->Get('webmail', 'allow_languages_on_settings', true);
			$aResult['Capa'] = $this->Capa($bAdmin, $oAccount);
			$value = \ini_get('upload_max_filesize');
			$upload_max_filesize = \intval($value);
			switch (\strtoupper(\substr($value, -1))) {
				case 'G': $upload_max_filesize *= 1024;
				case 'M': $upload_max_filesize *= 1024;
				case 'K': $upload_max_filesize *= 1024;
			}
			$aResult['AttachmentLimit'] = \min($upload_max_filesize, ((int) $oConfig->Get('webmail', 'attachment_size_limit', 10)) * 1024 * 1024);
			$aResult['PhpUploadSizes'] = array(
				'upload_max_filesize' => $value,
				'post_max_size' => \ini_get('post_max_size')
			);
			$aResult['System']['themes'] = $this->GetThemes();
		}

		$sStaticCache = $this->StaticCache();

		$aResult['Theme'] = $this->GetTheme($bAdmin);

		$aResult['Language'] = $this->ValidateLanguage($sLanguage, '', false);
		$aResult['UserLanguage'] = $this->ValidateLanguage($UserLanguageRaw, '', false, true);

		$aResult['PluginsLink'] = $this->oPlugins->HaveJs($bAdmin)
			? './?/Plugins/0/' . ($bAdmin ? 'Admin' : 'User') . '/' . $sStaticCache . '/'
			: '';

		$bAppJsDebug = $this->oConfig->Get('debug', 'javascript', false)
			|| $this->oConfig->Get('debug', 'enable', false);

		$aResult['StaticLibsJs'] = Utils::WebStaticPath('js/' . ($bAppJsDebug ? '' : 'min/') .
			'libs' . ($bAppJsDebug ? '' : '.min') . '.js');

		$this->oPlugins->InitAppData($bAdmin, $aResult, $oAccount);

		return $aResult;
	}

	protected function requestSleep(int $iDelay = 1): void
	{
		$time = \microtime(true) - $_SERVER['REQUEST_TIME_FLOAT'];
		if ($iDelay > $time) {
			\usleep(\intval(($iDelay - $time) * 1000000));
		}
	}

	protected function loginErrorDelay(): void
	{
		$iDelay = (int)$this->oConfig->Get('labs', 'login_fault_delay', 0);
		if (0 < $iDelay) {
			$this->requestSleep($iDelay);
		}
	}

	protected function getAdditionalLogParamsByUserLogin(string $sLogin, bool $bAdmin = false): array
	{
		$sHost = $bAdmin ? $this->Http()->GetHost(false, true, true) : \MailSo\Base\Utils::GetDomainFromEmail($sLogin);
		return array(
			'{imap:login}' => $sLogin,
			'{imap:host}' => $sHost,
			'{smtp:login}' => $sLogin,
			'{smtp:host}' => $sHost,
			'{user:email}' => $sLogin,
			'{user:login}' => $bAdmin ? $sLogin : \MailSo\Base\Utils::GetAccountNameFromEmail($sLogin),
			'{user:domain}' => $sHost,
		);
	}

	public function DoPing(): array
	{
		return $this->DefaultResponse('Pong');
	}

	public function DoVersion(): array
	{
		return $this->DefaultResponse(APP_VERSION === (string)$this->GetActionParam('Version', ''));
	}

	public function MainClearFileName(string $sFileName, string $sContentType, string $sMimeIndex, int $iMaxLength = 250): string
	{
		$sFileName = !\strlen($sFileName) ? \preg_replace('/[^a-zA-Z0-9]/', '.', (empty($sMimeIndex) ? '' : $sMimeIndex . '.') . $sContentType) : $sFileName;
		$sClearedFileName = \MailSo\Base\Utils::StripSpaces(\preg_replace('/[\.]+/', '.', $sFileName));
		$sExt = \MailSo\Base\Utils::GetFileExtension($sClearedFileName);

		if (10 < $iMaxLength && $iMaxLength < \strlen($sClearedFileName) - \strlen($sExt)) {
			$sClearedFileName = \substr($sClearedFileName, 0, $iMaxLength) . (empty($sExt) ? '' : '.' . $sExt);
		}

		return \MailSo\Base\Utils::SecureFileName(\MailSo\Base\Utils::Utf8Clear($sClearedFileName));
	}

	protected function getUploadErrorMessageByCode(int $iError, int &$iClientError): string
	{
		$sError = '';
		$iClientError = UploadError::NORMAL;
		switch ($iError) {
			case UPLOAD_ERR_OK:
				break;
			case UPLOAD_ERR_INI_SIZE:
			case UPLOAD_ERR_FORM_SIZE:
			case UploadError::CONFIG_SIZE:
			case UploadError::EMPTY_FILES_DATA:
				$sError = 'File is too big';
				$iClientError = UploadError::FILE_IS_TOO_BIG;
				break;
			case UPLOAD_ERR_PARTIAL:
				$sError = 'File partially uploaded';
				$iClientError = UploadError::FILE_PARTIALLY_UPLOADED;
				break;
			case UPLOAD_ERR_NO_FILE:
				$sError = 'No file uploaded';
				$iClientError = UploadError::FILE_NO_UPLOADED;
				break;
			case UPLOAD_ERR_NO_TMP_DIR:
			case UPLOAD_ERR_CANT_WRITE:
			case UPLOAD_ERR_EXTENSION:
				$sError = 'Missing temp folder';
				$iClientError = UploadError::MISSING_TEMP_FOLDER;
				break;
			case UploadError::ON_SAVING:
				$sError = 'Error on saving file';
				$iClientError = UploadError::FILE_ON_SAVING_ERROR;
				break;
			case UploadError::FILE_TYPE:
				$sError = 'Invalid file type';
				$iClientError = UploadError::FILE_TYPE;
				break;
			case UploadError::UNKNOWN:
			default:
				$sError = 'Unknown error';
				$iClientError = UploadError::UNKNOWN;
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

			// Detect content-type
			$type = \SnappyMail\File\MimeType::fromFile($aFile['tmp_name'], $aFile['name'])
				?: \SnappyMail\File\MimeType::fromFilename($aFile['name']);
			if ($type) {
				$aFile['type'] = $type;
				$sSavedName .= \SnappyMail\File\MimeType::toExtension($type);
			}

			if (!$this->FilesProvider()->MoveUploadedFile($oAccount, $sSavedName, $aFile['tmp_name'])) {
				$iError = Enumerations\UploadError::ON_SAVING;
			} else {
				$aResponse['Attachment'] = array(
					'Name' => $aFile['name'],
					'TempName' => $sSavedName,
					'MimeType' => $aFile['type'],
					'Size' => (int) $aFile['size']
				);
			}
		}

		if (UPLOAD_ERR_OK !== $iError) {
			$iClientError = Enumerations\UploadError::NORMAL;
			$sError = $this->getUploadErrorMessageByCode($iError, $iClientError);

			if (!empty($sError)) {
				$aResponse['ErrorCode'] = $iClientError;
				$aResponse['Error'] = $sError;
			}
		}

		return $this->DefaultResponse($aResponse);
	}

	public function Capa(bool $bAdmin, ?Model\Account $oAccount = null): array
	{
		static $aResult;
		if (!$aResult) {
			$oConfig = $this->oConfig;
			$aResult = array(
				'AdditionalAccounts'   => (bool) $oConfig->Get('webmail', 'allow_additional_accounts', false),
				'AttachmentThumbnails' => (bool) $oConfig->Get('interface', 'show_attachment_thumbnail', true),
				'AttachmentsActions'   => (bool) $oConfig->Get('capa', 'attachments_actions', false),
				'Contacts'             => (bool) $oConfig->Get('contacts', 'enable', false),
				'DangerousActions'     => (bool) $oConfig->Get('capa', 'dangerous_actions', true),
				'GnuPG'                => (bool) $oConfig->Get('security', 'openpgp', false) && \SnappyMail\PGP\GnuPG::isSupported(),
				'Identities'           => (bool) $oConfig->Get('webmail', 'allow_additional_identities', false),
				'Kolab'                => false, // See Kolab plugin
				'OpenPGP'              => (bool) $oConfig->Get('security', 'openpgp', false),
				'Quota'                => (bool) $oConfig->Get('capa', 'quota', true),
				'Sieve'                => false,
				'Themes'               => (bool) $oConfig->Get('webmail', 'allow_themes', false),
				'UserBackground'       => (bool) $oConfig->Get('webmail', 'allow_user_background', false)
			);
		}
		$aResult['Sieve'] = $bAdmin || ($oAccount && $oAccount->Domain()->UseSieve());
		return $aResult;
	}

	public function GetCapa(string $sName, ?Model\Account $oAccount = null): bool
	{
		return !empty($this->Capa(false, $oAccount)[$sName]);
	}

	public function etag(string $sKey): string
	{
		return \md5($sKey . $this->oConfig->Get('cache', 'index', ''));
	}

	public function cacheByKey(string $sKey): bool
	{
		if ($sKey && $this->oConfig->Get('cache', 'enable', true) && $this->oConfig->Get('cache', 'http', true)) {
			\MailSo\Base\Http::ServerUseCache(
				$this->etag($sKey),
				1382478804,
				$this->oConfig->Get('cache', 'http_expires', 3600)
			);
			return true;
		}
		$this->Http()->ServerNoCache();
		return false;
	}

	public function verifyCacheByKey(string $sKey): void
	{
		if ($sKey && $this->oConfig->Get('cache', 'enable', true) && $this->oConfig->Get('cache', 'http', true)) {
			\MailSo\Base\Http::checkETag($this->etag($sKey));
//			\MailSo\Base\Http::checkLastModified(1382478804);
		}
	}

	/**
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	protected function initMailClientConnection(): ?Model\Account
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->MailClient()->IsLoggined()) {
			try {
				$oAccount->ImapConnectAndLogin($this->oPlugins, $this->MailClient()->ImapClient(), $this->oConfig);
			} catch (\MailSo\Net\Exceptions\ConnectionException $oException) {
				throw new Exceptions\ClientException(Notifications::ConnectionError, $oException);
			} catch (\Throwable $oException) {
				throw new Exceptions\ClientException(Notifications::AuthError, $oException);
			}
		}

		return $oAccount;
	}

	protected function encodeRawKey(?Model\Account $oAccount, array $aValues): string
	{
		return \SnappyMail\Crypt::EncryptUrlSafe($aValues, \sha1(APP_SALT . ($oAccount ? $oAccount->Hash() : '')));
	}

	protected function decodeRawKey(?Model\Account $oAccount, string $sRawKey): array
	{
		return empty($sRawKey) ? []
			: (\SnappyMail\Crypt::DecryptUrlSafe($sRawKey, \sha1(APP_SALT . ($oAccount ? $oAccount->Hash() : ''))) ?: []);
	}

	public function StaticCache(): string
	{
		static $sCache = null;
		if (!$sCache) {
			$sCache = \md5(APP_VERSION . $this->oPlugins->Hash());
		}
		return $sCache;
	}

	public function SetActionParams(array $aCurrentActionParams, string $sMethodName = ''): self
	{
		$this->oPlugins->RunHook('filter.action-params', array($sMethodName, &$aCurrentActionParams));

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
		return isset($this->aCurrentActionParams[$sKey]) ?
			$this->aCurrentActionParams[$sKey] : $mDefault;
	}

	public function GetActionParams(): array
	{
		return $this->aCurrentActionParams;
	}

	public function HasActionParam(string $sKey): bool
	{
		return isset($this->aCurrentActionParams[$sKey]);
	}

	public function Location(string $sUrl): void
	{
		$this->oLogger->Write('Location: ' . $sUrl);
		\header('Location: ' . $sUrl);
	}

}
