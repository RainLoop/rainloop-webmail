<?php

namespace RainLoop;

use RainLoop\Enumerations\UploadError;
use RainLoop\Enumerations\UploadClientError;

class Actions
{
	use Actions\Admin;

	const AUTH_TFA_SIGN_ME_TOKEN_KEY = 'rltfasmauth';
	const AUTH_SIGN_ME_TOKEN_KEY = 'rlsmauth';
	const AUTH_MAILTO_TOKEN_KEY = 'rlmailtoauth';
	const AUTH_SPEC_TOKEN_KEY = 'rlspecauth';
	const AUTH_SPEC_LOGOUT_TOKEN_KEY = 'rlspeclogout';
	const AUTH_SPEC_LOGOUT_CUSTOM_MSG_KEY = 'rlspeclogoutcmk';
	const RL_MOBILE_TYPE = 'rlmobiletype';

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
	 * @var \RainLoop\Providers\Filters
	 */
	private $oFiltersProvider;

	/**
	 * @var \RainLoop\Providers\AddressBook
	 */
	private $oAddressBookProvider;

	/**
	 * @var \RainLoop\Providers\Suggestions
	 */
	private $oSuggestionsProvider;

	/**
	 * @var \RainLoop\Providers\TwoFactorAuth
	 */
	private $oTwoFactorAuthProvider;

	/**
	 * @var \RainLoop\Config\Application
	 */
	private $oConfig;

	/**
	 * @var string
	 */
	private $sSpecAuthToken;

	/**
	 * @var string
	 */
	private $sUpdateAuthToken;

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
		$this->oFiltersProvider = null;
		$this->oDomainProvider = null;
		$this->oAddressBookProvider = null;
		$this->oSuggestionsProvider = null;
		$this->oTwoFactorAuthProvider = null;

		$this->sSpecAuthToken = '';
		$this->sUpdateAuthToken = '';
		$this->bIsAjax = false;

		$oConfig = $this->Config();
		$this->Plugins()->RunHook('filter.application-config', array($oConfig));

		$this->Logger()->Ping();
	}

	public function SetSpecAuthToken(string $sSpecAuthToken) : self
	{
		$this->sSpecAuthToken = $sSpecAuthToken;

		return $this;
	}

	public function SetUpdateAuthToken(string $sUpdateAuthToken) : self
	{
		$this->sUpdateAuthToken = $sUpdateAuthToken;

		return $this;
	}

	public function SetIsAjax(bool $bIsAjax) : self
	{
		$this->bIsAjax = $bIsAjax;

		return $this;
	}

	public function GetSpecAuthToken() : string
	{
		return $this->sSpecAuthToken;
	}

	public function GetUpdateAuthToken() : string
	{
		return $this->sUpdateAuthToken;
	}

	public function GetIsAjax() : bool
	{
		return $this->bIsAjax;
	}

	public function GetShortLifeSpecAuthToken(int $iLife = 60) : string
	{
		$aAccountHash = Utils::DecodeKeyValues($this->getLocalAuthToken());
		if (!empty($aAccountHash[0]) && 'token' === $aAccountHash[0])
		{
			$aAccountHash[10] = \time() + $iLife;
			return Utils::EncodeKeyValues($aAccountHash);
		}

		return '';
	}

	public function Config() : Config\Application
	{
		if (null === $this->oConfig)
		{
			$this->oConfig = new Config\Application();
			if (!$this->oConfig->Load())
			{
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

		if (null === $mResult)
		{
			switch ($sName)
			{
				case 'files':
					// RainLoop\Providers\Files\IFiles
					$mResult = new Providers\Files\FileStorage(APP_PRIVATE_DATA.'storage/files');
					break;
				case 'storage':
				case 'storage-local':
					// RainLoop\Providers\Storage\IStorage
					$mResult = new Providers\Storage\FileStorage(
						APP_PRIVATE_DATA.'storage', 'storage-local' === $sName);
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
					$mResult = new Providers\Domain\DefaultDomain(APP_PRIVATE_DATA.'domains', $this->Cacher());
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
					$sPassword = (string) $this->Config()->Get('contacts', 'pdo_password', '');

					$sDsnType = $this->ValidateContactPdoType(\trim($this->Config()->Get('contacts', 'type', 'sqlite')));
					if ('sqlite' === $sDsnType)
					{
						$mResult = new Providers\AddressBook\PdoAddressBook(
							'sqlite:'.APP_PRIVATE_DATA.'AddressBook.sqlite', '', '', 'sqlite');
					}
					else
					{
						$mResult = new Providers\AddressBook\PdoAddressBook($sDsn, $sUser, $sPassword, $sDsnType);
					}
					break;
				case 'suggestions':

					if (null === $mResult)
					{
						$mResult = array();
					}

					break;
				case 'two-factor-auth':
					// Providers\TwoFactorAuth\TwoFactorAuthInterface
					$mResult = new Providers\TwoFactorAuth\TotpTwoFactorAuth();
					break;
			}
		}

		foreach (\is_array($mResult) ? $mResult : array($mResult) as $oItem)
		{
			if ($oItem && \method_exists($oItem, 'SetLogger'))
			{
				$oItem->SetLogger($this->Logger());
			}
		}

		$this->Plugins()->RunHook('filter.fabrica', array($sName, &$mResult, $oAccount), false);

		return $mResult;
	}

	public function BootEnd() : void
	{
		try
		{
			if ($this->MailClient()->IsLoggined())
			{
				$this->MailClient()->LogoutAndDisconnect();
			}
		}
		catch (\Throwable $oException) { unset($oException); }
	}

	public function ParseQueryAuthString() : string
	{
		$sQuery = \trim($this->Http()->GetQueryString());

		$iPos = \strpos($sQuery, '&');
		if (0 < $iPos)
		{
			$sQuery = \substr($sQuery, 0, $iPos);
		}

		$sQuery = \trim(\trim($sQuery), ' /');

		$aSubQuery = $this->Http()->GetQuery('q');
		if (\is_array($aSubQuery))
		{
			$aSubQuery = \array_map(function ($sS) {
				return \trim(\trim($sS), ' /');
			}, $aSubQuery);

			if (0 < \count($aSubQuery))
			{
				$sQuery .= '/'.\implode('/', $aSubQuery);
			}
		}

		if ('' === $this->GetSpecAuthToken())
		{
			$aPaths = \explode('/', $sQuery);
			if (!empty($aPaths[0]) && !empty($aPaths[1]) && '_' === substr($aPaths[1], 0, 1))
			{
				$this->SetSpecAuthToken($aPaths[1]);
			}
		}

		return $sQuery;
	}

	private function compileLogParams(string $sLine, ?Model\Account $oAccount = null, bool $bUrlEncode = false, array $aAdditionalParams = array()) : string
	{
		$aClear = array();

		if (false !== \strpos($sLine, '{date:'))
		{
			$sTimeOffset = (string) $this->Config()->Get('logs', 'time_offset', '0');
			$sLine = \preg_replace_callback('/\{date:([^}]+)\}/', function ($aMatch) use ($sTimeOffset, $bUrlEncode) {
				return Utils::UrlEncode(\MailSo\Log\Logger::DateHelper($aMatch[1], $sTimeOffset), $bUrlEncode);
			}, $sLine);

			$aClear['/\{date:([^}]*)\}/'] = 'date';
		}

		if (false !== \strpos($sLine, '{imap:') || false !== \strpos($sLine, '{smtp:'))
		{
			if (!$oAccount)
			{
				$this->ParseQueryAuthString();
				$oAccount = $this->getAccountFromToken(false);
			}

			if ($oAccount)
			{
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

		if (false !== \strpos($sLine, '{request:'))
		{
			if (false !== \strpos($sLine, '{request:ip}'))
			{
				$sLine = \str_replace('{request:ip}', Utils::UrlEncode($this->Http()->GetClientIp(
					$this->Config()->Get('labs', 'http_client_ip_check_proxy', false)), $bUrlEncode), $sLine);
			}

			if (false !== \strpos($sLine, '{request:domain}'))
			{
				$sLine = \str_replace('{request:domain}',
					Utils::UrlEncode($this->Http()->GetHost(false, true, true), $bUrlEncode), $sLine);
			}

			if (false !== \strpos($sLine, '{request:domain-clear}'))
			{
				$sLine = \str_replace('{request:domain-clear}',
					Utils::UrlEncode(
						\MailSo\Base\Utils::GetClearDomainName($this->Http()->GetHost(false, true, true)), $bUrlEncode), $sLine);
			}

			$aClear['/\{request:([^}]*)\}/i'] = 'request';
		}

		if (false !== \strpos($sLine, '{user:'))
		{
			if (false !== \strpos($sLine, '{user:uid}'))
			{
				$sLine = \str_replace('{user:uid}',
					Utils::UrlEncode(\base_convert(\sprintf('%u',
						\crc32(\md5(Utils::GetConnectionToken()))), 10, 32), $bUrlEncode),
					$sLine
				);
			}

			if (false !== \strpos($sLine, '{user:ip}'))
			{
				$sLine = \str_replace('{user:ip}', Utils::UrlEncode($this->Http()->GetClientIp(
					$this->Config()->Get('labs', 'http_client_ip_check_proxy', false)), $bUrlEncode), $sLine);
			}

			if (\preg_match('/\{user:(email|login|domain)\}/i', $sLine))
			{
				if (!$oAccount)
				{
					$this->ParseQueryAuthString();
					$oAccount = $this->getAccountFromToken(false);
				}

				if ($oAccount)
				{
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

		if (false !== \strpos($sLine, '{labs:'))
		{
			$sLine = \preg_replace_callback('/\{labs:rand:([1-9])\}/', function ($aMatch) {
				return \rand(\pow(10, $aMatch[1] - 1), \pow(10, $aMatch[1]) - 1);
			}, $sLine);

			$aClear['/\{labs:([^}]*)\}/'] = 'labs';
		}

		foreach ($aAdditionalParams as $sKey => $sValue)
		{
			$sLine = \str_replace($sKey, $sValue, $sLine);
		}

		foreach ($aClear as $sKey => $sValue)
		{
			$sLine = \preg_replace($sKey, $sValue, $sLine);
		}

		return $sLine;
	}

	private function compileLogFileName(string $sFileName) : string
	{
		$sFileName = \trim($sFileName);

		if (0 !== \strlen($sFileName))
		{
			$sFileName = $this->compileLogParams($sFileName);

			$sFileName = \preg_replace('/[\/]+/', '/', \preg_replace('/[.]+/', '.', $sFileName));
			$sFileName = \preg_replace('/[^a-zA-Z0-9@_+=\-\.\/!()\[\]]/', '', $sFileName);
		}

		if (0 === \strlen($sFileName))
		{
			$sFileName = 'rainloop-log.txt';
		}

		return $sFileName;
	}

	public function SetAuthLogoutToken() : void
	{
		\header('X-RainLoop-Action: Logout');
		Utils::SetCookie(self::AUTH_SPEC_LOGOUT_TOKEN_KEY, \md5($_SERVER['REQUEST_TIME_FLOAT']), 0);
	}

	public function SetAuthToken(Model\Account $oAccount) : void
	{
		$sSpecAuthToken = '_'.$oAccount->GetAuthTokenQ();

		$this->SetSpecAuthToken($sSpecAuthToken);
		Utils::SetCookie(self::AUTH_SPEC_TOKEN_KEY, $sSpecAuthToken, 0);

		if ($oAccount->SignMe() && 0 < \strlen($oAccount->SignMeToken()))
		{
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

	public function GetSpecAuthTokenWithDeletion() : string
	{
		$sResult = Utils::GetCookie(self::AUTH_SPEC_TOKEN_KEY, '');
		if (0 < strlen($sResult))
		{
			Utils::ClearCookie(self::AUTH_SPEC_TOKEN_KEY);
		}

		return $sResult;
	}

	public function GetSpecAuthLogoutTokenWithDeletion() : string
	{
		$sResult = Utils::GetCookie(self::AUTH_SPEC_LOGOUT_TOKEN_KEY, '');
		if (0 < strlen($sResult))
		{
			Utils::ClearCookie(self::AUTH_SPEC_LOGOUT_TOKEN_KEY);
		}

		return $sResult;
	}

	public function GetSpecLogoutCustomMgsWithDeletion() : string
	{
		$sResult = Utils::GetCookie(self::AUTH_SPEC_LOGOUT_CUSTOM_MSG_KEY, '');
		if (0 < strlen($sResult))
		{
			Utils::ClearCookie(self::AUTH_SPEC_LOGOUT_CUSTOM_MSG_KEY);
		}

		return $sResult;
	}

	public function SetSpecLogoutCustomMgsWithDeletion(string $sMessage) : string
	{
		Utils::SetCookie(self::AUTH_SPEC_LOGOUT_CUSTOM_MSG_KEY, $sMessage, 0);
	}

	private function getLocalAuthToken() : string
	{
		$sToken = $this->GetSpecAuthToken();
		return !empty($sToken) && '_' === \substr($sToken, 0, 1) ? \substr($sToken, 1) : '';
	}

	/**
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function GetAccount(bool $bThrowExceptionOnFalse = false) : ?Model\Account
	{
		return $this->getAccountFromToken($bThrowExceptionOnFalse);
	}

	public function Http() : \MailSo\Base\Http
	{
		if (null === $this->oHttp)
		{
			$this->oHttp = \MailSo\Base\Http::SingletonInstance();
		}

		return $this->oHttp;
	}

	public function MailClient() : \MailSo\Mail\MailClient
	{
		if (null === $this->oMailClient)
		{
			$this->oMailClient = new \MailSo\Mail\MailClient();
			$this->oMailClient->SetLogger($this->Logger());
		}

		return $this->oMailClient;
	}

	public function FiltersProvider() : Providers\Filters
	{
		if (null === $this->oFiltersProvider)
		{
			$this->oFiltersProvider = new Providers\Filters(
				$this->fabrica('filters'));
		}

		return $this->oFiltersProvider;
	}

	public function TwoFactorAuthProvider() : Providers\TwoFactorAuth
	{
		if (null === $this->oTwoFactorAuthProvider)
		{
			$this->oTwoFactorAuthProvider = new Providers\TwoFactorAuth(
				$this->Config()->Get('security', 'allow_two_factor_auth', false) ? $this->fabrica('two-factor-auth') : null
			);
		}

		return $this->oTwoFactorAuthProvider;
	}

	public function StorageProvider(bool $bLocal = false) : Providers\Storage
	{
		if ($bLocal)
		{
			if (null === $this->oLocalStorageProvider)
			{
				$this->oLocalStorageProvider = new Providers\Storage(
					$this->fabrica('storage-local'));
			}

			return $this->oLocalStorageProvider;
		}
		else
		{
			if (null === $this->oStorageProvider)
			{
				$this->oStorageProvider = new Providers\Storage(
					$this->fabrica('storage'));
			}

			return $this->oStorageProvider;
		}

		return null;
	}

	public function SettingsProvider(bool $bLocal = false) : Providers\Settings
	{
		if ($bLocal)
		{
			if (null === $this->oLocalSettingsProvider)
			{
				$this->oLocalSettingsProvider = new Providers\Settings(
					$this->fabrica('settings-local'));
			}

			return $this->oLocalSettingsProvider;
		}
		else
		{
			if (null === $this->oSettingsProvider)
			{
				$this->oSettingsProvider = new Providers\Settings(
					$this->fabrica('settings'));
			}

			return $this->oSettingsProvider;
		}

		return null;
	}

	public function FilesProvider() : Providers\Files
	{
		if (null === $this->oFilesProvider)
		{
			$this->oFilesProvider = new Providers\Files(
				$this->fabrica('files'));
		}

		return $this->oFilesProvider;
	}

	public function DomainProvider() : Providers\Domain
	{
		if (null === $this->oDomainProvider)
		{
			$this->oDomainProvider = new Providers\Domain(
				$this->fabrica('domain'), $this->Plugins());
		}

		return $this->oDomainProvider;
	}

	public function SuggestionsProvider() : Providers\Suggestions
	{
		if (null === $this->oSuggestionsProvider)
		{
			$this->oSuggestionsProvider = new Providers\Suggestions(
				$this->fabrica('suggestions'));
		}

		return $this->oSuggestionsProvider;
	}

	public function AddressBookProvider(?Model\Account $oAccount = null, bool $bForceEnable = false) : Providers\AddressBook
	{
		if (null === $this->oAddressBookProvider)
		{
			$oDriver = null;
			if ($this->GetCapa(false, false, Enumerations\Capa::CONTACTS, $oAccount))
			{
				if ($this->Config()->Get('contacts', 'enable', false) || $bForceEnable)
				{
					$oDriver = $this->fabrica('address-book', $oAccount);
				}
			}

			$this->oAddressBookProvider = new Providers\AddressBook($oDriver);
			$this->oAddressBookProvider->SetLogger($this->Logger());
		}

		return $this->oAddressBookProvider;
	}

	public function Cacher(?Model\Account $oAccount = null, bool $bForceFile = false) : \MailSo\Cache\CacheClient
	{
		$sKey = '';
		if ($oAccount)
		{
			$sKey = $oAccount->ParentEmailHelper();
		}

		$sIndexKey = empty($sKey) ? '_default_' : $sKey;
		if ($bForceFile)
		{
			$sIndexKey .= '/_files_';
		}

		if (!isset($this->aCachers[$sIndexKey]))
		{
			$this->aCachers[$sIndexKey] = new \MailSo\Cache\CacheClient();

			$oDriver = null;
			$sDriver = \strtoupper(\trim($this->Config()->Get('cache', 'fast_cache_driver', 'files')));

			switch (true)
			{
				default:
				case $bForceFile:
					$oDriver = new \MailSo\Cache\Drivers\File(APP_PRIVATE_DATA.'cache', $sKey);
					break;

				case ('APC' === $sDriver || 'APCU' === $sDriver) &&
					\MailSo\Base\Utils::FunctionExistsAndEnabled(array(
						'apc_store', 'apc_fetch', 'apc_delete', 'apc_clear_cache')):

					$oDriver = new \MailSo\Cache\Drivers\APC($sKey);
					break;

				case ('MEMCACHE' === $sDriver || 'MEMCACHED' === $sDriver) &&
					\MailSo\Base\Utils::FunctionExistsAndEnabled('memcache_connect'):

					$oDriver = new \MailSo\Cache\Drivers\Memcache(
						$this->Config()->Get('labs', 'fast_cache_memcache_host', '127.0.0.1'),
						(int) $this->Config()->Get('labs', 'fast_cache_memcache_port', 11211),
						43200,
						$sKey
					);
					break;

				case 'REDIS' === $sDriver && \class_exists('Predis\Client'):
					$oDriver = new \MailSo\Cache\Drivers\Redis(
						$this->Config()->Get('labs', 'fast_cache_redis_host', '127.0.0.1'),
						(int) $this->Config()->Get('labs', 'fast_cache_redis_port', 6379),
						43200,
						$sKey
					);
					break;
			}

			if ($oDriver)
			{
				$this->aCachers[$sIndexKey]->SetDriver($oDriver);
			}

			$this->aCachers[$sIndexKey]->SetCacheIndex($this->Config()->Get('cache', 'fast_cache_index', ''));
		}

		return $this->aCachers[$sIndexKey];
	}

	public function Plugins() : Plugins\Manager
	{
		if (null === $this->oPlugins)
		{
			$this->oPlugins = new Plugins\Manager($this);
			$this->oPlugins->SetLogger($this->Logger());
		}

		return $this->oPlugins;
	}

	public function Logger() : \MailSo\Log\Logger
	{
		if (null === $this->oLogger)
		{
			$this->oLogger = \MailSo\Log\Logger::SingletonInstance();

			if (!!$this->Config()->Get('logs', 'enable', false))
			{
				$sSessionFilter = (string) $this->Config()->Get('logs', 'session_filter', '');
				if (!empty($sSessionFilter))
				{
					$aSessionParts = \explode(':', $sSessionFilter, 2);

					if (empty($aSessionParts[0]) || empty($aSessionParts[1]) ||
						(string) $aSessionParts[1] !== (string) Utils::GetCookie($aSessionParts[0], ''))
					{
						return $this->oLogger;
					}
				}

				$sTimeOffset = (string) $this->Config()->Get('logs', 'time_offset', '0');

				$this->oLogger->SetShowSecter(!$this->Config()->Get('logs', 'hide_passwords', true));

				$sLogFileName = $this->Config()->Get('logs', 'filename', '');

				$oDriver = null;
				if ('syslog' === $sLogFileName)
				{
					$oDriver = new \MailSo\Log\Drivers\Syslog();
				}
				else
				{
					$sLogFileFullPath = \APP_PRIVATE_DATA.'logs/'.$this->compileLogFileName($sLogFileName);
					$sLogFileDir = \dirname($sLogFileFullPath);

					if (!is_dir($sLogFileDir))
					{
						mkdir($sLogFileDir, 0755, true);
					}

					$oDriver = new \MailSo\Log\Drivers\File($sLogFileFullPath);
				}

				$this->oLogger->append($oDriver
					->WriteOnErrorOnly($this->Config()->Get('logs', 'write_on_error_only', false))
					->WriteOnPhpErrorOnly($this->Config()->Get('logs', 'write_on_php_error_only', false))
					->WriteOnTimeoutOnly($this->Config()->Get('logs', 'write_on_timeout_only', 0))
					->SetTimeOffset($sTimeOffset)
				);

				if (!$this->Config()->Get('debug', 'enable', false))
				{
					$this->oLogger->AddForbiddenType(\MailSo\Log\Enumerations\Type::TIME);
				}

				$this->oLogger->WriteEmptyLine();

				$oHttp = $this->Http();

				$this->oLogger->Write('[DATE:'.\MailSo\Log\Logger::DateHelper('d.m.y', $sTimeOffset).
					(0 !== $sTimeOffset ? '][OFFSET:'.(0 < $sTimeOffset ? '+' : '-').
						\str_pad((string) \abs($sTimeOffset), 2, '0', STR_PAD_LEFT) : '').
					'][RL:'.APP_VERSION.'][PHP:'.PHP_VERSION.'][IP:'.
					$oHttp->GetClientIp($this->Config()->Get('labs', 'http_client_ip_check_proxy', false)).'][PID:'.
					(\MailSo\Base\Utils::FunctionExistsAndEnabled('getmypid') ? \getmypid() : 'unknown').']['.
					$oHttp->GetServer('SERVER_SOFTWARE', '~').']['.
					(\MailSo\Base\Utils::FunctionExistsAndEnabled('php_sapi_name') ? \php_sapi_name() : '~' ).']'
				);

				$sPdo = (\class_exists('PDO') ? \implode(',', \PDO::getAvailableDrivers()) : 'off');
				$sPdo = empty($sPdo) ? '~' : $sPdo;

				$this->oLogger->Write('['.
					'Suhosin:'.(\extension_loaded('suhosin') || \ini_get('suhosin.get.max_value_length') ? 'on' : 'off').
					'][APC:'.(\MailSo\Base\Utils::FunctionExistsAndEnabled('apc_fetch') ? 'on' : 'off').
					'][MB:'.(\MailSo\Base\Utils::FunctionExistsAndEnabled('mb_convert_encoding') ? 'on' : 'off').
					'][PDO:'.$sPdo.
					'][Streams:'.\implode(',', \stream_get_transports()).
				']');

				$this->oLogger->Write(
					'['.$oHttp->GetMethod().'] '.$oHttp->GetScheme().'://'.$oHttp->GetHost(false, false).$oHttp->GetServer('REQUEST_URI', ''),
					\MailSo\Log\Enumerations\Type::NOTE, 'REQUEST');
			}
		}

		return $this->oLogger;
	}

	public function LoggerAuth() : \MailSo\Log\Logger
	{
		if (null === $this->oLoggerAuth)
		{
			$this->oLoggerAuth = new \MailSo\Log\Logger(false);

			if (!!$this->Config()->Get('logs', 'auth_logging', false))
			{
				$sAuthLogFileFullPath = \APP_PRIVATE_DATA.'logs/'.$this->compileLogFileName(
					$this->Config()->Get('logs', 'auth_logging_filename', ''));

				$sLogFileDir = \dirname($sAuthLogFileFullPath);

				if (!is_dir($sLogFileDir))
				{
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

	public function LoggerAuthHelper(?Model\Account $oAccount = null, array $aAdditionalParams = array()) : void
	{
		$sLine = $this->Config()->Get('logs', 'auth_logging_format', '');
		if (!empty($sLine))
		{
			$this->LoggerAuth()->Write($this->compileLogParams($sLine, $oAccount, false, $aAdditionalParams));
		}
		if ($this->Config()->Get('logs', 'auth_logging', false) && \openlog('rainloop', 0, \LOG_AUTHPRIV))
		{
			\syslog(\LOG_ERR, $this->compileLogParams('Auth failed: ip={request:ip} user={imap:login}', $oAccount, false, $aAdditionalParams));
			\closelog();
		}
	}

	public function SetMailtoRequest(string $sTo) : void
	{
		if (!empty($sTo))
		{
			Utils::SetCookie(self::AUTH_MAILTO_TOKEN_KEY,
				Utils::EncodeKeyValuesQ(array(
					'Time' => \microtime(true),
					'MailTo' => 'MailTo',
					'To' => $sTo
				)), 0);
		}
	}

	public function LoginProvide(string $sEmail, string $sLogin, string $sPassword, string $sSignMeToken = '', string $sClientCert = '', bool $bThrowProvideException = false) : ?Model\Account
	{
		$oAccount = null;
		if (0 < \strlen($sEmail) && 0 < \strlen($sLogin) && 0 < \strlen($sPassword))
		{
			$oDomain = $this->DomainProvider()->Load(\MailSo\Base\Utils::GetDomainFromEmail($sEmail), true);
			if ($oDomain)
			{
				if ($oDomain->ValidateWhiteList($sEmail, $sLogin))
				{
					$oAccount = new Model\Account($sEmail, $sLogin, $sPassword, $oDomain, $sSignMeToken, '', '', $sClientCert);
					$this->Plugins()->RunHook('filter.acount', array($oAccount));

					if ($bThrowProvideException && !$oAccount)
					{
						throw new Exceptions\ClientException(Notifications::AuthError);
					}
				}
				else if ($bThrowProvideException)
				{
					throw new Exceptions\ClientException(Notifications::AccountNotAllowed);
				}
			}
			else if ($bThrowProvideException)
			{
				throw new Exceptions\ClientException(Notifications::DomainNotAllowed);
			}
		}

		return $oAccount;
	}

	/**
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function GetAccountFromCustomToken(string $sToken, bool $bThrowExceptionOnFalse = true, bool $bValidateShortToken = true, bool $bQ = false) : ?Model\Account
	{
		$oResult = null;
		if (!empty($sToken))
		{
			$aAccountHash = $bQ ? Utils::DecodeKeyValuesQ($sToken) : Utils::DecodeKeyValues($sToken);
			if (!empty($aAccountHash[0]) && 'token' === $aAccountHash[0] && // simple token validation
				8 <= \count($aAccountHash) && // length checking
				!empty($aAccountHash[7]) && // does short token exist
				(!$bValidateShortToken || Utils::GetShortToken() === $aAccountHash[7] ||  // check short token if needed
					(isset($aAccountHash[10]) && 0 < $aAccountHash[10] && \time() < $aAccountHash[10]))
			)
			{
				$oAccount = $this->LoginProvide($aAccountHash[1], $aAccountHash[2], $aAccountHash[3],
					empty($aAccountHash[5]) ? '' : $aAccountHash[5], empty($aAccountHash[11]) ? '' : $aAccountHash[11], $bThrowExceptionOnFalse);

				if ($oAccount)
				{
					if (!empty($aAccountHash[8]) && !empty($aAccountHash[9])) // init proxy user/password
					{
						$oAccount->SetProxyAuthUser($aAccountHash[8]);
						$oAccount->SetProxyAuthPassword($aAccountHash[9]);
					}

					$this->Logger()->AddSecret($oAccount->Password());
					$this->Logger()->AddSecret($oAccount->ProxyAuthPassword());

					$oAccount->SetParentEmail($aAccountHash[6]);
					$oResult = $oAccount;
				}
			}
			else if ($bThrowExceptionOnFalse)
			{
				throw new Exceptions\ClientException(Notifications::AuthError);
			}
		}

		if ($bThrowExceptionOnFalse && !$oResult)
		{
			throw new Exceptions\ClientException(Notifications::AuthError);
		}

		return $oResult;
	}

	public function GetAccountFromSignMeToken() : ?Model\Account
	{
		$oAccount = null;

		$sSignMeToken = Utils::GetCookie(Actions::AUTH_SIGN_ME_TOKEN_KEY, '');
		if (!empty($sSignMeToken))
		{
			$aTokenData = Utils::DecodeKeyValuesQ($sSignMeToken);
			if (!empty($aTokenData['e']) && !empty($aTokenData['t']))
			{
				$sTokenSettings = $this->StorageProvider()->Get($aTokenData['e'],
					Providers\Storage\Enumerations\StorageType::CONFIG,
					'sign_me'
				);

				if (!empty($sTokenSettings))
				{
					$aSignMeData = Utils::DecodeKeyValuesQ($sTokenSettings);
					if (!empty($aSignMeData['AuthToken']) &&
						!empty($aSignMeData['SignMetToken']) &&
						$aSignMeData['SignMetToken'] === $aTokenData['t'])
					{
						$oAccount = $this->GetAccountFromCustomToken($aSignMeData['AuthToken'], false, false, true);
					}
				}
			}
		}
		else
		{
			Utils::ClearCookie(Actions::AUTH_SIGN_ME_TOKEN_KEY);
		}

		return $oAccount;
	}

	/**
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function getAccountFromToken(bool $bThrowExceptionOnFalse = true) : ?Model\Account
	{
		return $this->GetAccountFromCustomToken($this->getLocalAuthToken(), $bThrowExceptionOnFalse, true, true);
	}

	public function AppDataSystem(bool $bAdmin = false, bool $bMobile = false, bool $bMobileDevice = false) : array
	{
		$oConfig = $this->Config();

		$aAttachmentsActions = array();
		if ($this->GetCapa(false, $bMobile, Enumerations\Capa::ATTACHMENTS_ACTIONS))
		{
			if (!!\class_exists('ZipArchive'))
			{
				$aAttachmentsActions[] = 'zip';
			}
		}

		return \array_merge(array(
			'version' => APP_VERSION,
			'admin' => $bAdmin,
			'mobile' => $bMobile,
			'mobileDevice' => $bMobileDevice,
			'webPath' => Utils::WebPath(),
			'webVersionPath' => Utils::WebVersionPath(),
			'token' => $oConfig->Get('security', 'csrf_protection', false) ? Utils::GetCsrfToken() : '',
			'inIframe' => (bool) $oConfig->Get('labs', 'in_iframe', false),
			'allowHtmlEditorSourceButton' => (bool) $oConfig->Get('labs', 'allow_html_editor_source_button', false),
			'allowHtmlEditorBitiButtons' => (bool) $oConfig->Get('labs', 'allow_html_editor_biti_buttons', false),
			'allowCtrlEnterOnCompose' => (bool) $oConfig->Get('labs', 'allow_ctrl_enter_on_compose', false),
			'forgotPasswordLinkUrl' => \trim($oConfig->Get('login', 'forgot_password_link_url', '')),
			'registrationLinkUrl' => \trim($oConfig->Get('login', 'registration_link_url', '')),
			'hideSubmitButton' => (bool) $oConfig->Get('login', 'hide_submit_button', true),
			'useImapThread' => (bool) $oConfig->Get('labs', 'use_imap_thread', false),
			'useImapSubscribe' => (bool) $oConfig->Get('labs', 'use_imap_list_subscribe', true),
			'allowAppendMessage' => (bool) $oConfig->Get('labs', 'allow_message_append', false),
			'materialDesign' => (bool) $oConfig->Get('labs', 'use_material_design', true),
			'folderSpecLimit' => (int) $oConfig->Get('labs', 'folders_spec_limit', 50),
			'faviconStatus' => (bool) $oConfig->Get('labs', 'favicon_status', true),
			'listPermanentFiltered' => '' !== \trim(Api::Config()->Get('labs', 'imap_message_list_permanent_filter', '')),
			'themes' => $this->GetThemes($bMobile, false),
			'languages' => $this->GetLanguages(false),
			'languagesAdmin' => $this->GetLanguages(true),
			'attachmentsActions' => $aAttachmentsActions
		), $bAdmin ? array(
			'adminHostUse' => '' !== $oConfig->Get('security', 'admin_panel_host', ''),
			'adminPath' => \strtolower($oConfig->Get('security', 'admin_panel_key', 'admin')),
			'allowAdminPanel' => (bool) $oConfig->Get('security', 'allow_admin_panel', true),
		) : array());
	}

	public function AppData(bool $bAdmin, bool $bMobile = false, bool $bMobileDevice = false, string $sAuthAccountHash = '') : array
	{
		if (0 < \strlen($sAuthAccountHash) && \preg_match('/[^_\-\.a-zA-Z0-9]/', $sAuthAccountHash))
		{
			$sAuthAccountHash = '';
		}

		$oAccount = null;
		$oConfig = $this->Config();

/*
required by Index.html and rl.js:
NewThemeLink IncludeCss TemplatesLink LangLink IncludeBackground PluginsLink AuthAccountHash
*/

		$aResult = array(
			'Auth' => false,
			'AccountHash' => '',
			'AccountSignMe' => false,
			'AuthAccountHash' => '',
			'MailToEmail' => '',
			'Email' => '',
			'DevEmail' => '',
			'DevPassword' => '',
			'Title' => $oConfig->Get('webmail', 'title', 'SnappyMail Webmail'),
			'LoadingDescription' => $oConfig->Get('webmail', 'loading_description', 'SnappyMail'),
			'FaviconUrl' => $oConfig->Get('webmail', 'favicon_url', ''),
			'LoginDescription' => '',
			'LoginLogo' => '',
			'LoginBackground' => '',
			'LoginCss' => '',
			'UserLogo' => '',
			'UserLogoTitle' => '',
			'UserLogoMessage' => '',
			'UserCss' => '',
			'IncludeCss' => '',
			'IncludeBackground' => '',
			'LoginDefaultDomain' => $oConfig->Get('login', 'default_domain', ''),
			'DetermineUserLanguage' => (bool) $oConfig->Get('login', 'determine_user_language', true),
			'DetermineUserDomain' => (bool) $oConfig->Get('login', 'determine_user_domain', false),
			'UseLoginWelcomePage' => (bool) $oConfig->Get('login', 'welcome_page', false),
			'StartupUrl' => \trim(\ltrim(\trim($oConfig->Get('labs', 'startup_url', '')), '#/')),
			'SieveAllowFileintoInbox' => (bool) $oConfig->Get('labs', 'sieve_allow_fileinto_inbox', false),
			'ContactsIsAllowed' => false,
			'RequireTwoFactor' => false,
			'Admin' => array(),
			'Capa' => array(),
			'Plugins' => array(),
			'System' => $this->AppDataSystem($bAdmin, $bMobile, $bMobileDevice)
/*
			'LoginLogo' => $oConfig->Get('branding', 'login_logo', ''),
			'LoginBackground' => $oConfig->Get('branding', 'login_background', ''),
			'LoginCss' => $oConfig->Get('branding', 'login_css', ''),
			'LoginDescription' => $oConfig->Get('branding', 'login_desc', ''),
			'UserLogo' => $oConfig->Get('branding', 'user_logo', ''),
			'UserLogoTitle' => $oConfig->Get('branding', 'user_logo_title', ''),
			'UserLogoMessage' => $oConfig->Get('branding', 'user_logo_message', ''),
			'UserIframeMessage' => $oConfig->Get('branding', 'user_iframe_message', ''),
			'UserCss' => $oConfig->Get('branding', 'user_css', ''),
*/
		);

		if (0 < \strlen($sAuthAccountHash))
		{
			$aResult['AuthAccountHash'] = $sAuthAccountHash;
		}

		$oSettings = null;

		if (!$bAdmin)
		{
			$oAccount = $this->getAccountFromToken(false);
			if ($oAccount)
			{
				$aResult['IncludeCss'] = $aResult['UserCss'];

				$oAddressBookProvider = $this->AddressBookProvider($oAccount);

				$aResult['Auth'] = true;
				$aResult['Email'] = $oAccount->Email();
				$aResult['IncLogin'] = $oAccount->IncLogin();
				$aResult['OutLogin'] = $oAccount->OutLogin();
				$aResult['AccountHash'] = $oAccount->Hash();
				$aResult['AccountSignMe'] = $oAccount->SignMe();
				$aResult['ContactsIsAllowed'] = $oAddressBookProvider->IsActive();
				$aResult['ContactsSyncIsAllowed'] = (bool) $oConfig->Get('contacts', 'allow_sync', false);
				$aResult['ContactsSyncInterval'] = (int) $oConfig->Get('contacts', 'sync_interval', 20);

				$aResult['EnableContactsSync'] = false;
				$aResult['ContactsSyncUrl'] = '';
				$aResult['ContactsSyncUser'] = '';
				$aResult['ContactsSyncPassword'] = '';

				if ($aResult['ContactsIsAllowed'] && $aResult['ContactsSyncIsAllowed'])
				{
					$mData = $this->getContactsSyncData($oAccount);
					if (\is_array($mData))
					{
						$aResult['EnableContactsSync'] = isset($mData['Enable']) ? !!$mData['Enable'] : false;
						$aResult['ContactsSyncUrl'] = isset($mData['Url']) ? \trim($mData['Url']) : '';
						$aResult['ContactsSyncUser'] = isset($mData['User']) ? \trim($mData['User']) : '';
						$aResult['ContactsSyncPassword'] = APP_DUMMY;
					}
				}

				if ($aResult['AccountSignMe'])
				{
					$sToken = Utils::GetCookie(self::AUTH_MAILTO_TOKEN_KEY, null);
					if (null !== $sToken)
					{
						Utils::ClearCookie(self::AUTH_MAILTO_TOKEN_KEY);

						$mMailToData = Utils::DecodeKeyValuesQ($sToken);
						if (!empty($mMailToData['MailTo']) &&
							'MailTo' === $mMailToData['MailTo'] && !empty($mMailToData['To']))
						{
							$aResult['MailToEmail'] = $mMailToData['To'];
						}
					}
				}

				$oSettings = $this->SettingsProvider()->Load($oAccount);

				if (!empty($aResult['StartupUrl']))
				{
					$aResult['StartupUrl'] = $this->compileLogParams($aResult['StartupUrl'], $oAccount, true);
				}

				if (!empty($aResult['UserIframeMessage']))
				{
					$aResult['UserIframeMessage'] = $this->compileLogParams($aResult['UserIframeMessage'], $oAccount, true);
				}
			}
			else
			{
				$aResult['IncludeBackground'] = $aResult['LoginBackground'];
				$aResult['IncludeCss'] = $aResult['LoginCss'];

				$aResult['DevEmail'] = $oConfig->Get('labs', 'dev_email', '');
				$aResult['DevPassword'] = $oConfig->Get('labs', 'dev_password', '');

				$aResult['StartupUrl'] = '';

				if (empty($aResult['AdditionalLoginError']))
				{
					$aResult['AdditionalLoginError'] = $this->GetSpecLogoutCustomMgsWithDeletion();
				}
			}

			$aResult['Capa'] = $this->Capa(false, $bMobile, $oAccount);

			if ($aResult['Auth'] && !$aResult['RequireTwoFactor'])
			{
				if ($this->GetCapa(false, $bMobile, Enumerations\Capa::TWO_FACTOR, $oAccount) &&
					$this->GetCapa(false, $bMobile, Enumerations\Capa::TWO_FACTOR_FORCE, $oAccount) &&
					$this->TwoFactorAuthProvider()->IsActive())
				{
					$aData = $this->getTwoFactorInfo($oAccount, true);

					$aResult['RequireTwoFactor'] = !$aData ||
						!isset($aData['User'], $aData['IsSet'], $aData['Enable']) ||
						!($aData['IsSet'] && $aData['Enable']);
				}
			}
		}
		else
		{
			$aResult['Auth'] = $this->IsAdminLoggined(false);
			if ($aResult['Auth'])
			{
				$aResult['AdminDomain'] = APP_SITE;
				$aResult['AdminLogin'] = (string) $oConfig->Get('security', 'admin_login', '');
				$aResult['UseTokenProtection'] = (bool) $oConfig->Get('security', 'csrf_protection', true);
				$aResult['EnabledPlugins'] = (bool) $oConfig->Get('plugins', 'enable', false);

				$aResult['VerifySslCertificate'] = (bool) $oConfig->Get('ssl', 'verify_certificate', false);
				$aResult['AllowSelfSigned'] = (bool) $oConfig->Get('ssl', 'allow_self_signed', true);

				$aResult['supportedPdoDrivers'] = \class_exists('PDO') ? \PDO::getAvailableDrivers() : [];

				$aResult['ContactsEnable'] = (bool) $oConfig->Get('contacts', 'enable', false);
				$aResult['ContactsSync'] = (bool) $oConfig->Get('contacts', 'allow_sync', false);
				$aResult['ContactsPdoType'] = (string) $this->ValidateContactPdoType(\trim($this->Config()->Get('contacts', 'type', 'sqlite')));
				$aResult['ContactsPdoDsn'] = (string) $oConfig->Get('contacts', 'pdo_dsn', '');
				$aResult['ContactsPdoType'] = (string) $oConfig->Get('contacts', 'type', '');
				$aResult['ContactsPdoUser'] = (string) $oConfig->Get('contacts', 'pdo_user', '');
				$aResult['ContactsPdoPassword'] = (string) APP_DUMMY;

				$aResult['WeakPassword'] = (bool) $oConfig->ValidatePassword('12345');

				$aResult['PhpUploadSizes'] = array(
					'upload_max_filesize' => \ini_get('upload_max_filesize'),
					'post_max_size' => \ini_get('post_max_size')
				);
			}

			$aResult['Capa'] = $this->Capa(true, $bMobile);
		}

		$aResult['ProjectHash'] = \md5($aResult['AccountHash'].APP_VERSION.$this->Plugins()->Hash());

		$sLanguage = $oConfig->Get('webmail', 'language', 'en');
		$sLanguageAdmin = $oConfig->Get('webmail', 'language_admin', 'en');
		$sTheme = $oConfig->Get('webmail', 'theme', 'Default');

		$aResult['NewMoveToFolder'] = (bool) $oConfig->Get('interface', 'new_move_to_folder_button', true);
		$aResult['AllowLanguagesOnSettings'] = (bool) $oConfig->Get('webmail', 'allow_languages_on_settings', true);
		$aResult['AllowLanguagesOnLogin'] = (bool) $oConfig->Get('login', 'allow_languages_on_login', true);
		$aResult['AttachmentLimit'] = ((int) $oConfig->Get('webmail', 'attachment_size_limit', 10)) * 1024 * 1024;
		$aResult['SignMe'] = (string) $oConfig->Get('login', 'sign_me_auto', Enumerations\SignMeType::DEFAILT_OFF);
		$aResult['UseLocalProxyForExternalImages'] = (bool) $oConfig->Get('labs', 'use_local_proxy_for_external_images', false);

		// user
		$aResult['ShowImages'] = (bool) $oConfig->Get('defaults', 'show_images', false);
		$aResult['MPP'] = (int) $oConfig->Get('webmail', 'messages_per_page', 25);
		$aResult['SoundNotification'] = false;
		$aResult['DesktopNotifications'] = false;
		$aResult['Layout'] = (int) $oConfig->Get('defaults', 'view_layout', Enumerations\Layout::SIDE_PREVIEW);
		$aResult['EditorDefaultType'] = (string) $oConfig->Get('defaults', 'view_editor_type', '');
		$aResult['UseCheckboxesInList'] = (bool) $oConfig->Get('defaults', 'view_use_checkboxes', true);
		$aResult['AutoLogout'] = (int) $oConfig->Get('defaults', 'autologout', 30);
		$aResult['UseThreads'] = (bool) $oConfig->Get('defaults', 'mail_use_threads', false);
		$aResult['AllowDraftAutosave'] = (bool) $oConfig->Get('defaults', 'allow_draft_autosave', true);
		$aResult['ReplySameFolder'] = (bool) $oConfig->Get('defaults', 'mail_reply_same_folder', false);
		$aResult['ContactsAutosave'] = (bool) $oConfig->Get('defaults', 'contacts_autosave', true);
		$aResult['EnableTwoFactor'] = false;
		$aResult['ParentEmail'] = '';
		$aResult['InterfaceAnimation'] = true;
		$aResult['UserBackgroundName'] = '';
		$aResult['UserBackgroundHash'] = '';

		if (!$bAdmin && $oAccount)
		{
			$aResult['ParentEmail'] = $oAccount->ParentEmail();

			$oSettingsLocal = $this->SettingsProvider(true)->Load($oAccount);

			if ($oSettingsLocal instanceof Settings)
			{
//				if ($this->GetCapa(false, $bMobile, Enumerations\Capa::FOLDERS, $oAccount))

				$aResult['SentFolder'] = (string) $oSettingsLocal->GetConf('SentFolder', '');
				$aResult['DraftFolder'] = (string) $oSettingsLocal->GetConf('DraftFolder', '');
				$aResult['SpamFolder'] = (string) $oSettingsLocal->GetConf('SpamFolder', '');
				$aResult['TrashFolder'] = (string) $oSettingsLocal->GetConf('TrashFolder', '');
				$aResult['ArchiveFolder'] = (string) $oSettingsLocal->GetConf('ArchiveFolder', '');
				$aResult['NullFolder'] = (string) $oSettingsLocal->GetConf('NullFolder', '');
			}

			if ($this->GetCapa(false, $bMobile, Enumerations\Capa::SETTINGS, $oAccount))
			{
				if ($oSettings instanceof Settings)
				{
					if ($oConfig->Get('webmail', 'allow_languages_on_settings', true))
					{
						$sLanguage = (string) $oSettings->GetConf('Language', $sLanguage);
					}

					$aResult['EditorDefaultType'] = (string) $oSettings->GetConf('EditorDefaultType', $aResult['EditorDefaultType']);
					$aResult['ShowImages'] = (bool) $oSettings->GetConf('ShowImages', $aResult['ShowImages']);
					$aResult['ContactsAutosave'] = (bool) $oSettings->GetConf('ContactsAutosave', $aResult['ContactsAutosave']);
					$aResult['MPP'] = (int) $oSettings->GetConf('MPP', $aResult['MPP']);
					$aResult['SoundNotification'] = (bool) $oSettings->GetConf('SoundNotification', $aResult['SoundNotification']);
					$aResult['DesktopNotifications'] = (bool) $oSettings->GetConf('DesktopNotifications', $aResult['DesktopNotifications']);
					$aResult['UseCheckboxesInList'] = (bool) $oSettings->GetConf('UseCheckboxesInList', $aResult['UseCheckboxesInList']);
					$aResult['AllowDraftAutosave'] = (bool) $oSettings->GetConf('AllowDraftAutosave', $aResult['AllowDraftAutosave']);
					$aResult['AutoLogout'] = (int) $oSettings->GetConf('AutoLogout', $aResult['AutoLogout']);
					$aResult['Layout'] = (int) $oSettings->GetConf('Layout', $aResult['Layout']);

					if (!$this->GetCapa(false, $bMobile, Enumerations\Capa::AUTOLOGOUT, $oAccount))
					{
						$aResult['AutoLogout'] = 0;
					}

					if ($this->GetCapa(false, $bMobile, Enumerations\Capa::USER_BACKGROUND, $oAccount))
					{
						$aResult['UserBackgroundName'] = (string) $oSettings->GetConf('UserBackgroundName', $aResult['UserBackgroundName']);
						$aResult['UserBackgroundHash'] = (string) $oSettings->GetConf('UserBackgroundHash', $aResult['UserBackgroundHash']);
//						if (!empty($aResult['UserBackgroundName']) && !empty($aResult['UserBackgroundHash']))
//						{
//							$aResult['IncludeBackground'] = './?/Raw/&q[]=/{{USER}}/UserBackground/&q[]=/'.
//								$aResult['UserBackgroundHash'].'/';
//						}
					}

					$aResult['EnableTwoFactor'] = (bool) $oSettings->GetConf('EnableTwoFactor', $aResult['EnableTwoFactor']);
				}

				if ($oSettingsLocal instanceof Settings)
				{
					$aResult['UseThreads'] = (bool) $oSettingsLocal->GetConf('UseThreads', $aResult['UseThreads']);
					$aResult['ReplySameFolder'] = (bool) $oSettingsLocal->GetConf('ReplySameFolder', $aResult['ReplySameFolder']);

					if ($this->GetCapa(false, $bMobile, Enumerations\Capa::THEMES, $oAccount))
					{
						$sTheme = (string) $oSettingsLocal->GetConf('Theme', $sTheme);
					}
				}
			}
		}

		if (!$aResult['Auth'])
		{
			if (!$bAdmin)
			{
				if ($oConfig->Get('login', 'allow_languages_on_login', true) &&
					$oConfig->Get('login', 'determine_user_language', true))
				{
					$sLanguage = $this->ValidateLanguage(
						$this->detectUserLanguage($bAdmin), $sLanguage, false);
				}
			}
		}

		$sTheme = $this->ValidateTheme($sTheme, $bMobile);
		$sStaticCache = $this->StaticCache();

		$aResult['Theme'] = $sTheme;
		$aResult['NewThemeLink'] = $this->ThemeLink($sTheme, $bAdmin);

		$aResult['Language'] = $this->ValidateLanguage($sLanguage, '', false);
		$aResult['LanguageAdmin'] = $this->ValidateLanguage($sLanguageAdmin, '', true);

		$aResult['UserLanguageRaw'] = $this->detectUserLanguage($bAdmin);

		$aResult['UserLanguage'] = $this->ValidateLanguage($aResult['UserLanguageRaw'], '', false, true);
		$aResult['UserLanguageAdmin'] = $this->ValidateLanguage($aResult['UserLanguageRaw'], '', true, true);

		$aResult['PluginsLink'] = '';
		if (0 < $this->Plugins()->Count() && $this->Plugins()->HaveJs($bAdmin))
		{
			$aResult['PluginsLink'] = './?/Plugins/0/'.($bAdmin ? 'Admin' : 'User').'/'.$sStaticCache.'/';
		}

		$aResult['LangLink'] = './?/Lang/0/'.($bAdmin ? 'Admin' : 'App').'/'.
			($bAdmin ? $aResult['LanguageAdmin'] : $aResult['Language']).'/'.$sStaticCache.'/';

		// $aResult['TemplatesLink'] = './?/Templates/0/'.($bAdmin ? 'Admin' : 'App').'/'.$sStaticCache.'/';
		$aResult['TemplatesLink'] = './?/Templates/0/'.($bAdmin ? 'Admin' : 'App').'/'.$sStaticCache.'/';

		$bAppJsDebug = !!$this->Config()->Get('labs', 'use_app_debug_js', false);

		$aResult['StaticLibJsLink'] = $this->StaticPath('js/'.($bAppJsDebug ? '' : 'min/').
			'libs'.($bAppJsDebug ? '' : '.min').'.js');
		$aResult['StaticAppJsLink'] = $this->StaticPath('js/'.($bAppJsDebug ? '' : 'min/').
			($bAdmin ? 'admin' : 'app').($bAppJsDebug ? '' : '.min').'.js');

		if ($this->Config()->Get('labs', 'use_ck_html_editor', false)) {
			$aResult['StaticEditorJsLink'] = $this->StaticPath('ckeditor/ckeditor.js');
		}

		$aResult['EditorDefaultType'] = \in_array($aResult['EditorDefaultType'], array('Plain', 'Html', 'HtmlForced', 'PlainForced')) ?
			$aResult['EditorDefaultType'] : 'Plain';

		// IDN
		$aResult['Email'] = \MailSo\Base\Utils::IdnToUtf8($aResult['Email']);
		$aResult['ParentEmail'] = \MailSo\Base\Utils::IdnToUtf8($aResult['ParentEmail']);
		$aResult['MailToEmail'] = \MailSo\Base\Utils::IdnToUtf8($aResult['MailToEmail']);
		$aResult['DevEmail'] = \MailSo\Base\Utils::IdnToUtf8($aResult['DevEmail']);

		// Mobile override
		if ($bMobile)
		{
			$aResult['Layout'] = Enumerations\Layout::NO_PREVIW;

			$aResult['SoundNotification'] = false;
			$aResult['DesktopNotifications'] = false;
			$aResult['UseCheckboxesInList'] = true;

			$aResult['UserBackgroundName'] = '';
			$aResult['UserBackgroundHash'] = '';
		}

		$this->Plugins()->InitAppData($bAdmin, $aResult, $oAccount);

		return $aResult;
	}

	private function getUserLanguagesFromHeader() : array
	{
		$aResult = $aList = array();
		$sAcceptLang = \strtolower($this->Http()->GetServer('HTTP_ACCEPT_LANGUAGE', 'en'));
		if (!empty($sAcceptLang) && \preg_match_all('/([a-z]{1,8}(?:-[a-z]{1,8})?)(?:;q=([0-9.]+))?/', $sAcceptLang, $aList))
		{
			$aResult = \array_combine($aList[1], $aList[2]);
			foreach ($aResult as $n => $v)
			{
				$aResult[$n] = $v ? $v : 1;
			}

			\arsort($aResult, SORT_NUMERIC);
		}

		return $aResult;
	}

	public function detectUserLanguage(bool $bAdmin = false) : string
	{
		$sResult = '';
		$aLangs = $this->getUserLanguagesFromHeader();

		foreach (\array_keys($aLangs) as $sLang)
		{
			$sLang = $this->ValidateLanguage($sLang, '', $bAdmin, true);
			if (!empty($sLang))
			{
				$sResult = $sLang;
				break;
			}
		}

		return $sResult;
	}

	private function requestSleep(int $iWait = 1, int $iDelay = 1) : void
	{
		if (0 < $iDelay && 0 < $iWait)
		{
			if ($iWait > \time() - $_SERVER['REQUEST_TIME_FLOAT'])
			{
				\sleep($iDelay);
			}
		}
	}

	private function loginErrorDelay() : void
	{
		$iDelay = (int) $this->Config()->Get('labs', 'login_fault_delay', 0);
		if (0 < $iDelay)
		{
			$this->requestSleep(1, $iDelay);
		}
	}

	public function AuthToken(Model\Account $oAccount) : void
	{
		$this->SetAuthToken($oAccount);

		$aAccounts = $this->GetAccounts($oAccount);
		if (isset($aAccounts[$oAccount->Email()]))
		{
			$aAccounts[$oAccount->Email()] = $oAccount->GetAuthToken();
			$this->SetAccounts($oAccount, $aAccounts);
		}
	}

	/**
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function CheckMailConnection(Model\Account $oAccount, bool $bAuthLog = false) : void
	{
		try
		{
			$oAccount->IncConnectAndLoginHelper($this->Plugins(), $this->MailClient(), $this->Config());
		}
		catch (Exceptions\ClientException $oException)
		{
			throw $oException;
		}
		catch (\MailSo\Net\Exceptions\ConnectionException $oException)
		{
			throw new Exceptions\ClientException(Notifications::ConnectionError, $oException);
		}
		catch (\MailSo\Imap\Exceptions\LoginBadCredentialsException $oException)
		{
			if ($bAuthLog)
			{
				$this->LoggerAuthHelper($oAccount);
			}

			if ($this->Config()->Get('labs', 'imap_show_login_alert', true))
			{
				throw new Exceptions\ClientException(Notifications::AuthError,
					$oException, $oException->getAlertFromStatus());
			}
			else
			{
				throw new Exceptions\ClientException(Notifications::AuthError, $oException);
			}
		}
		catch (\Throwable $oException)
		{
			throw new Exceptions\ClientException(Notifications::AuthError, $oException);
		}
	}

	private function getAdditionalLogParamsByUserLogin(string $sLogin, bool $bAdmin = false) : array
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
	public function LoginProcess(string &$sEmail, string &$sPassword, string $sSignMeToken = '',
		string $sAdditionalCode = '', bool $bAdditionalCodeSignMe = false, bool $bSkipTwoFactorAuth = false) : Model\Account
	{
		$sInputEmail = $sEmail;

		$this->Plugins()->RunHook('filter.login-credentials.step-1', array(&$sEmail, &$sPassword));

		$sEmail = \MailSo\Base\Utils::Trim($sEmail);
		if ($this->Config()->Get('login', 'login_lowercase', true))
		{
			$sEmail = \MailSo\Base\Utils::StrToLowerIfAscii($sEmail);
		}

		if (false === \strpos($sEmail, '@'))
		{
			$this->Logger()->Write('The email address "'.$sEmail.'" is not complete', \MailSo\Log\Enumerations\Type::INFO, 'LOGIN');

			if (false === \strpos($sEmail, '@') && !!$this->Config()->Get('login', 'determine_user_domain', false))
			{
				$sUserHost = \trim($this->Http()->GetHost(false, true, true));
				$this->Logger()->Write('Determined user domain: '.$sUserHost, \MailSo\Log\Enumerations\Type::INFO, 'LOGIN');

				$bAdded = false;

				$iLimit = 14;
				$aDomainParts = \explode('.', $sUserHost);

				$oDomainProvider = $this->DomainProvider();
				while (0 < \count($aDomainParts) && 0 < $iLimit)
				{
					$sLine = \trim(\implode('.', $aDomainParts), '. ');

					$oDomain = $oDomainProvider->Load($sLine, false);
					if ($oDomain)
					{
						$bAdded = true;
						$this->Logger()->Write('Check "'.$sLine.'": OK ('.$sEmail.' > '.$sEmail.'@'.$sLine.')',
							\MailSo\Log\Enumerations\Type::INFO, 'LOGIN');

						$sEmail = $sEmail.'@'.$sLine;
						break;
					}
					else
					{
						$this->Logger()->Write('Check "'.$sLine.'": NO', \MailSo\Log\Enumerations\Type::INFO, 'LOGIN');
					}

					\array_shift($aDomainParts);
					$iLimit--;
				}

				if (!$bAdded)
				{
					$sLine = $sUserHost;
					$oDomain = $oDomainProvider->Load($sLine, true);
					if ($oDomain && $oDomain)
					{
						$bAdded = true;
						$this->Logger()->Write('Check "'.$sLine.'" with wildcard: OK ('.$sEmail.' > '.$sEmail.'@'.$sLine.')',
							\MailSo\Log\Enumerations\Type::INFO, 'LOGIN');

						$sEmail = $sEmail.'@'.$sLine;
					}
					else
					{
						$this->Logger()->Write('Check "'.$sLine.'" with wildcard: NO', \MailSo\Log\Enumerations\Type::INFO, 'LOGIN');
					}
				}

				if (!$bAdded)
				{
					$this->Logger()->Write('Domain was not found!', \MailSo\Log\Enumerations\Type::INFO, 'LOGIN');
				}
			}

			$sDefDomain = \trim($this->Config()->Get('login', 'default_domain', ''));
			if (false === \strpos($sEmail, '@') && 0 < \strlen($sDefDomain))
			{
				$this->Logger()->Write('Default domain "'.$sDefDomain.'" was used. ('.$sEmail.' > '.$sEmail.'@'.$sDefDomain.')',
					\MailSo\Log\Enumerations\Type::INFO, 'LOGIN');

				$sEmail = $sEmail.'@'.$sDefDomain;
			}
		}

		$this->Plugins()->RunHook('filter.login-credentials.step-2', array(&$sEmail, &$sPassword));

		if (false === \strpos($sEmail, '@') || 0 === \strlen($sPassword))
		{
			$this->loginErrorDelay();

			throw new Exceptions\ClientException(Notifications::InvalidInputArgument);
		}

		$this->Logger()->AddSecret($sPassword);

		$sLogin = $sEmail;
		if ($this->Config()->Get('login', 'login_lowercase', true))
		{
			$sLogin = \MailSo\Base\Utils::StrToLowerIfAscii($sLogin);
		}

		$this->Plugins()->RunHook('filter.login-credentials', array(&$sEmail, &$sLogin, &$sPassword));

		$this->Logger()->AddSecret($sPassword);

		$this->Plugins()->RunHook('event.login-pre-login-provide', array());

		$oAccount = null;
		$sClientCert = \trim($this->Config()->Get('ssl', 'client_cert', ''));
		try
		{
			$oAccount = $this->LoginProvide($sEmail, $sLogin, $sPassword, $sSignMeToken, $sClientCert, true);

			if (!$oAccount)
			{
				throw new Exceptions\ClientException(Notifications::AuthError);
			}

			$this->Plugins()->RunHook('event.login-post-login-provide', array($oAccount));
		}
		catch (\Throwable $oException)
		{
			$this->loginErrorDelay();
			$this->LoggerAuthHelper($oAccount, $this->getAdditionalLogParamsByUserLogin($sInputEmail));
			throw $oException;
		}

		// 2FA
		if (!$bSkipTwoFactorAuth && $this->TwoFactorAuthProvider()->IsActive())
		{
			$aData = $this->getTwoFactorInfo($oAccount);
			if ($aData && isset($aData['IsSet'], $aData['Enable']) && !empty($aData['Secret']) && $aData['IsSet'] && $aData['Enable'])
			{
				$sSecretHash = \md5(APP_SALT.$aData['Secret'].Utils::Fingerprint());
				$sSecretCookieHash = Utils::GetCookie(self::AUTH_TFA_SIGN_ME_TOKEN_KEY, '');

				if (empty($sSecretCookieHash) || $sSecretHash !== $sSecretCookieHash)
				{
					$sAdditionalCode = \trim($sAdditionalCode);
					if (empty($sAdditionalCode))
					{
						$this->Logger()->Write('TFA: Required Code for '.$oAccount->ParentEmailHelper().' account.');

						throw new Exceptions\ClientException(Notifications::AccountTwoFactorAuthRequired);
					}
					else
					{
						$this->Logger()->Write('TFA: Verify Code for '.$oAccount->ParentEmailHelper().' account.');

						$bUseBackupCode = false;
						if (6 < \strlen($sAdditionalCode) && !empty($aData['BackupCodes']))
						{
							$aBackupCodes = \explode(' ', \trim(\preg_replace('/[^\d]+/', ' ', $aData['BackupCodes'])));
							$bUseBackupCode = \in_array($sAdditionalCode, $aBackupCodes);

							if ($bUseBackupCode)
							{
								$this->removeBackupCodeFromTwoFactorInfo($oAccount->ParentEmailHelper(), $sAdditionalCode);
							}
						}

						if (!$bUseBackupCode && !$this->TwoFactorAuthProvider()->VerifyCode($aData['Secret'], $sAdditionalCode))
						{
							$this->loginErrorDelay();

							$this->LoggerAuthHelper($oAccount);

							throw new Exceptions\ClientException(Notifications::AccountTwoFactorAuthError);
						}

						if ($bAdditionalCodeSignMe)
						{
							Utils::SetCookie(self::AUTH_TFA_SIGN_ME_TOKEN_KEY, $sSecretHash,
								\time() + 60 * 60 * 24 * 14);
						}
					}
				}
			}
		}

		try
		{
			$this->CheckMailConnection($oAccount, true);
		}
		catch (\Throwable $oException)
		{
			$this->loginErrorDelay();

			throw $oException;
		}

		return $oAccount;
	}

	private function generateSignMeToken(string $sEmail) : string
	{
		return \MailSo\Base\Utils::Md5Rand(APP_SALT.$sEmail);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoLogin() : array
	{
		$sEmail = \MailSo\Base\Utils::Trim($this->GetActionParam('Email', ''));
		$sPassword = $this->GetActionParam('Password', '');
		$sLanguage = $this->GetActionParam('Language', '');
		$bSignMe = '1' === (string) $this->GetActionParam('SignMe', '0');

		$sAdditionalCode = $this->GetActionParam('AdditionalCode', '');
		$bAdditionalCodeSignMe = '1' === (string) $this->GetActionParam('AdditionalCodeSignMe', '0');

		$oAccount = null;

		$this->Logger()->AddSecret($sPassword);

		if ('sleep@sleep.dev' === $sEmail && 0 < \strlen($sPassword) &&
			\is_numeric($sPassword) && $this->Config()->Get('debug', 'enable', false) &&
			0 < (int) $sPassword && 30 > (int) $sPassword
		)
		{
			\sleep((int) $sPassword);
			throw new Exceptions\ClientException(Notifications::AuthError);
		}

		try
		{
			$oAccount = $this->LoginProcess($sEmail, $sPassword,
				$bSignMe ? $this->generateSignMeToken($sEmail) : '',
				$sAdditionalCode, $bAdditionalCodeSignMe);
		}
		catch (Exceptions\ClientException $oException)
		{
			if ($oException &&
				Notifications::AccountTwoFactorAuthRequired === $oException->getCode())
			{
				return $this->DefaultResponse(__FUNCTION__, true, array(
					'TwoFactorAuth' => true
				));
			}
			else
			{
				throw $oException;
			}
		}

		$this->AuthToken($oAccount);

		if ($oAccount && 0 < \strlen($sLanguage))
		{
			$oSettings = $this->SettingsProvider()->Load($oAccount);
			if ($oSettings)
			{
				$sLanguage = $this->ValidateLanguage($sLanguage);
				$sCurrentLanguage = $oSettings->GetConf('Language', '');

				if ($sCurrentLanguage !== $sLanguage)
				{
					$oSettings->SetConf('Language', $sLanguage);
					$this->SettingsProvider()->Save($oAccount, $oSettings);
				}
			}
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	public function GetAccounts(Model\Account $oAccount) : array
	{
		if ($this->GetCapa(false, false, Enumerations\Capa::ADDITIONAL_ACCOUNTS, $oAccount))
		{
			$sAccounts = $this->StorageProvider()->Get($oAccount,
				Providers\Storage\Enumerations\StorageType::CONFIG,
				'accounts'
			);

			$aAccounts = array();
			if ('' !== $sAccounts && '{' === \substr($sAccounts, 0, 1))
			{
				$aAccounts = \json_decode($sAccounts, true);
			}

			if (\is_array($aAccounts) && 0 < \count($aAccounts))
			{
				if (1 === \count($aAccounts))
				{
					$this->SetAccounts($oAccount, array());

				}
				else if (1 < \count($aAccounts))
				{
					$sOrder = $this->StorageProvider()->Get($oAccount,
						Providers\Storage\Enumerations\StorageType::CONFIG,
						'accounts_identities_order'
					);

					$aOrder = empty($sOrder) ? array() : \json_decode($sOrder, true);
					if (isset($aOrder['Accounts']) && \is_array($aOrder['Accounts']) &&
						1 < \count($aOrder['Accounts']))
					{
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
		if (!$oAccount->IsAdditionalAccount())
		{
			$aAccounts[$oAccount->Email()] = $oAccount->GetAuthToken();
		}

		return $aAccounts;
	}

	public function GetTemplates(?Model\Account $oAccount) : array
	{
		$aTemplates = array();
		if ($oAccount)
		{
			$aData = array();

			$sData = $this->StorageProvider(true)->Get($oAccount,
				Providers\Storage\Enumerations\StorageType::CONFIG,
				'templates'
			);

			if ('' !== $sData && '[' === \substr($sData, 0, 1))
			{
				$aData = \json_decode($sData, true);
			}

			if (\is_array($aData) && 0 < \count($aData))
			{
				foreach ($aData as $aItem)
				{
					$oItem = new Model\Template();
					$oItem->FromJSON($aItem);

					if ($oItem && $oItem->Validate())
					{
						\array_push($aTemplates, $oItem);
					}
				}
			}

			if (1 < \count($aTemplates))
			{
				$sOrder = $this->StorageProvider()->Get($oAccount,
					Providers\Storage\Enumerations\StorageType::CONFIG,
					'templates_order'
				);

				$aOrder = empty($sOrder) ? array() : \json_decode($sOrder, true);
				if (\is_array($aOrder) && 1 < \count($aOrder))
				{
					\usort($aTemplates, function ($a, $b) use ($aOrder) {
						return \array_search($a->Id(), $aOrder) < \array_search($b->Id(), $aOrder) ? -1 : 1;
					});
				}
			}
		}

		return $aTemplates;
	}

	public function GetTemplateByID(Model\Account $oAccount, string $sID) : ?Model\Identity
	{
		$aTemplates = $this->GetTemplates($oAccount);
		foreach ($aTemplates as $oIdentity)
		{
			if ($oIdentity && $sID === $oIdentity->Id())
			{
				return $oIdentity;
			}
		}

		return isset($aTemplates[0]) ? $aTemplates[0] : null;
	}

	public function GetIdentities(Model\Account $oAccount) : array
	{
		$bAllowIdentities = $this->GetCapa(false, false,
			Enumerations\Capa::IDENTITIES, $oAccount);

		$aIdentities = array();
		if ($oAccount)
		{
			$aSubIdentities = array();

			$sData = $this->StorageProvider(true)->Get($oAccount,
				Providers\Storage\Enumerations\StorageType::CONFIG,
				'identities'
			);

			if ('' !== $sData && '[' === \substr($sData, 0, 1))
			{
				$aSubIdentities = \json_decode($sData, true);
			}

			$bHasAccountIdentity = false;

			if (\is_array($aSubIdentities) && 0 < \count($aSubIdentities))
			{
				foreach ($aSubIdentities as $aItem)
				{
					$oItem = new Model\Identity();
					$oItem->FromJSON($aItem);

					if ($oItem && $oItem->Validate())
					{
						if ($oItem->IsAccountIdentities())
						{
							$oItem->SetEmail($oAccount->Email());
							$bHasAccountIdentity = true;

							\array_push($aIdentities, $oItem);
						}
						else if ($bAllowIdentities)
						{
							\array_push($aIdentities, $oItem);
						}
					}
				}
			}

			if (!$bHasAccountIdentity)
			{
				\array_unshift($aIdentities,
					new Model\Identity('', $oAccount->Email()));
			}

			if (1 < \count($aIdentities) && $bAllowIdentities)
			{
				$sOrder = $this->StorageProvider()->Get($oAccount,
					Providers\Storage\Enumerations\StorageType::CONFIG,
					'accounts_identities_order'
				);

				$aOrder = empty($sOrder) ? array() : \json_decode($sOrder, true);
				if (isset($aOrder['Identities']) && \is_array($aOrder['Identities']) &&
					1 < \count($aOrder['Identities']))
				{
					$aList = $aOrder['Identities'];
					foreach ($aList as $iIndex => $sItem)
					{
						if ('' === $sItem)
						{
							$aList[$iIndex] = '---';
						}
					}

					\usort($aIdentities, function ($a, $b) use ($aList) {
						return \array_search($a->Id(true), $aList) < \array_search($b->Id(true), $aList) ? -1 : 1;
					});
				}
			}
		}

		return $aIdentities;
	}

	public function GetIdentityByID(Model\Account $oAccount, string $sID, bool $bFirstOnEmpty = false) : ?Model\Identity
	{
		$aIdentities = $this->GetIdentities($oAccount);

		foreach ($aIdentities as $oIdentity)
		{
			if ($oIdentity && $sID === $oIdentity->Id())
			{
				return $oIdentity;
			}
		}

		return $bFirstOnEmpty && isset($aIdentities[0]) ? $aIdentities[0] : null;
	}

	public function GetAccountIdentity(Model\Account $oAccount) : ?Model\Identity
	{
		return $this->GetIdentityByID($oAccount, '', true);
	}

	public function SetAccounts(Model\Account $oAccount, array $aAccounts = array()) : void
	{
		$sParentEmail = $oAccount->ParentEmailHelper();
		if (!$aAccounts ||
			(1 === \count($aAccounts) && !empty($aAccounts[$sParentEmail])))
		{
			$this->StorageProvider()->Clear($oAccount,
				Providers\Storage\Enumerations\StorageType::CONFIG,
				'accounts'
			);
		}
		else
		{
			$this->StorageProvider()->Put($oAccount,
				Providers\Storage\Enumerations\StorageType::CONFIG,
				'accounts',
				\json_encode($aAccounts)
			);
		}
	}

	public function SetIdentities(Model\Account $oAccount, array $aIdentities = array()) : bool
	{
		$bAllowIdentities = $this->GetCapa(false, false, Enumerations\Capa::IDENTITIES, $oAccount);

		$aResult = array();
		foreach ($aIdentities as $oItem)
		{
			if (!$bAllowIdentities && $oItem && !$oItem->IsAccountIdentities())
			{
				continue;
			}

			$aResult[] = $oItem->ToSimpleJSON(false);
		}

		return $this->StorageProvider(true)->Put($oAccount,
			Providers\Storage\Enumerations\StorageType::CONFIG,
			'identities',
			\json_encode($aResult)
		);
	}

	public function SetTemplates(Model\Account $oAccount, array $aTemplates = array()) : array
	{
		$aResult = array();
		foreach ($aTemplates as $oItem)
		{
			$aResult[] = $oItem->ToSimpleJSON(false);
		}

		return $this->StorageProvider(true)->Put($oAccount,
			Providers\Storage\Enumerations\StorageType::CONFIG,
			'templates',
			\json_encode($aResult)
		);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoFilters() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, false, Enumerations\Capa::FILTERS, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$aFakeFilters = null;

		$this->Plugins()
			->RunHook('filter.filters-fake', array($oAccount, &$aFakeFilters))
		;

		if ($aFakeFilters)
		{
			return $this->DefaultResponse(__FUNCTION__, $aFakeFilters);
		}

		return $this->DefaultResponse(__FUNCTION__,
			$this->FiltersProvider()->Load($oAccount, $oAccount->DomainSieveAllowRaw()));
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoFiltersSave() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, false, Enumerations\Capa::FILTERS, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$aIncFilters = $this->GetActionParam('Filters', array());

		$sRaw = $this->GetActionParam('Raw', '');
		$bRawIsActive = '1' === (string) $this->GetActionParam('RawIsActive', '0');

		$aFilters = array();
		foreach ($aIncFilters as $aFilter)
		{
			if (is_array($aFilter))
			{
				$oFilter = new Providers\Filters\Classes\Filter();
				if ($oFilter->FromJSON($aFilter))
				{
					$aFilters[] = $oFilter;
				}
			}
		}

		$this->Plugins()
			->RunHook('filter.filters-save', array($oAccount, &$aFilters, &$sRaw, &$bRawIsActive))
		;

		return $this->DefaultResponse(__FUNCTION__, $this->FiltersProvider()->Save($oAccount,
			$aFilters, $sRaw, $bRawIsActive));
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoAccountSetup() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, false, Enumerations\Capa::ADDITIONAL_ACCOUNTS, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$sParentEmail = $oAccount->ParentEmailHelper();

		$aAccounts = $this->GetAccounts($oAccount);

		$sEmail = \trim($this->GetActionParam('Email', ''));
		$sPassword = $this->GetActionParam('Password', '');
		$bNew = '1' === (string) $this->GetActionParam('New', '1');

		$sEmail = \MailSo\Base\Utils::IdnToAscii($sEmail, true);
		if ($bNew && ($oAccount->Email() === $sEmail || $sParentEmail === $sEmail || isset($aAccounts[$sEmail])))
		{
			throw new Exceptions\ClientException(Notifications::AccountAlreadyExists);
		}
		else if (!$bNew && !isset($aAccounts[$sEmail]))
		{
			throw new Exceptions\ClientException(Notifications::AccountDoesNotExist);
		}

		$oNewAccount = $this->LoginProcess($sEmail, $sPassword, '', '', false, true);
		$oNewAccount->SetParentEmail($sParentEmail);

		$aAccounts[$oNewAccount->Email()] = $oNewAccount->GetAuthToken();
		if (!$oAccount->IsAdditionalAccount())
		{
			$aAccounts[$oAccount->Email()] = $oAccount->GetAuthToken();
		}

		$this->SetAccounts($oAccount, $aAccounts);
		return $this->TrueResponse(__FUNCTION__);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoAccountDelete() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, false, Enumerations\Capa::ADDITIONAL_ACCOUNTS, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$sParentEmail = $oAccount->ParentEmailHelper();
		$sEmailToDelete = \trim($this->GetActionParam('EmailToDelete', ''));
		$sEmailToDelete = \MailSo\Base\Utils::IdnToAscii($sEmailToDelete, true);

		$aAccounts = $this->GetAccounts($oAccount);

		if (0 < \strlen($sEmailToDelete) && $sEmailToDelete !== $sParentEmail && isset($aAccounts[$sEmailToDelete]))
		{
			unset($aAccounts[$sEmailToDelete]);

			$oAccountToChange = null;
			if ($oAccount->Email() === $sEmailToDelete && !empty($aAccounts[$sParentEmail]))
			{
				$oAccountToChange = $this->GetAccountFromCustomToken($aAccounts[$sParentEmail], false, false);
				if ($oAccountToChange)
				{
					$this->AuthToken($oAccountToChange);
				}
			}

			$this->SetAccounts($oAccount, $aAccounts);
			return $this->TrueResponse(__FUNCTION__, array('Reload' => !!$oAccountToChange));
		}

		return $this->FalseResponse(__FUNCTION__);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoAttachmentsActions() : array
	{
		if (!$this->GetCapa(false, false, Enumerations\Capa::ATTACHMENTS_ACTIONS))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$oAccount = $this->initMailClientConnection();

		$sAction = $this->GetActionParam('Do', '');
		$aHashes = $this->GetActionParam('Hashes', null);

		$mResult = false;
		$bError = false;
		$aData = false;

		if (\is_array($aHashes) && 0 < \count($aHashes))
		{
			$aData = array();
			foreach ($aHashes as $sZipHash)
			{
				$aResult = $this->getMimeFileByHash($oAccount, $sZipHash);
				if (!empty($aResult['FileHash']))
				{
					$aData[] = $aResult;
				}
				else
				{
					$bError = true;
					break;
				}
			}
		}

		$oFilesProvider = $this->FilesProvider();
		if (!empty($sAction) && !$bError && \is_array($aData) && 0 < \count($aData) &&
			$oFilesProvider && $oFilesProvider->IsActive())
		{
			$bError = false;
			switch (\strtolower($sAction))
			{
				case 'zip':

					if (\class_exists('ZipArchive'))
					{
						$sZipHash = \MailSo\Base\Utils::Md5Rand();
						$sZipFileName = $oFilesProvider->GenerateLocalFullFileName($oAccount, $sZipHash);

						if (!empty($sZipFileName))
						{
							$oZip = new \ZipArchive();
							$oZip->open($sZipFileName, \ZIPARCHIVE::CREATE | \ZIPARCHIVE::OVERWRITE);
							$oZip->setArchiveComment('SnappyMail/'.APP_VERSION);

							foreach ($aData as $aItem)
							{
								$sFileName = (string) (isset($aItem['FileName']) ? $aItem['FileName'] : 'file.dat');
								$sFileHash = (string) (isset($aItem['FileHash']) ? $aItem['FileHash'] : '');

								if (!empty($sFileHash))
								{
									$sFullFileNameHash = $oFilesProvider->GetFileName($oAccount, $sFileHash);
									if (!$oZip->addFile($sFullFileNameHash, $sFileName))
									{
										$bError = true;
									}
								}
							}

							if (!$bError)
							{
								$bError = !$oZip->close();
							}
							else
							{
								$oZip->close();
							}
						}

						foreach ($aData as $aItem)
						{
							$sFileHash = (string) (isset($aItem['FileHash']) ? $aItem['FileHash'] : '');
							if (!empty($sFileHash))
							{
								$oFilesProvider->Clear($oAccount, $sFileHash);
							}
						}

						if (!$bError)
						{
							$mResult = array(
								'Files' => array(array(
									'FileName' => 'attachments.zip',
									'Hash' => Utils::EncodeKeyValuesQ(array(
										'V' => APP_VERSION,
										'Account' => $oAccount ? \md5($oAccount->Hash()) : '',
										'FileName' => 'attachments.zip',
										'MimeType' => 'application/zip',
										'FileHash' => $sZipHash
									))
								))
							);
						}
					}
					break;
			}
		}
		else
		{
			$bError = true;
		}

		$this->requestSleep();
		return $this->DefaultResponse(__FUNCTION__, $bError ? false : $mResult);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoIdentityUpdate() : array
	{
		$oAccount = $this->getAccountFromToken();

		$oIdentity = new Model\Identity();
		if (!$oIdentity->FromJSON($this->GetActionParams(), true))
		{
			throw new Exceptions\ClientException(Notifications::InvalidInputArgument);
		}

		$aIdentities = $this->GetIdentities($oAccount);

		$bAdded = false;
		$aIdentitiesForSave = array();
		foreach ($aIdentities as $oItem)
		{
			if ($oItem)
			{
				if ($oItem->Id() === $oIdentity->Id())
				{
					$aIdentitiesForSave[] = $oIdentity;
					$bAdded = true;
				}
				else
				{
					$aIdentitiesForSave[] = $oItem;
				}
			}
		}

		if (!$bAdded)
		{
			$aIdentitiesForSave[] = $oIdentity;
		}

		return $this->DefaultResponse(__FUNCTION__, $this->SetIdentities($oAccount, $aIdentitiesForSave));
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoIdentityDelete() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, false, Enumerations\Capa::IDENTITIES, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$sId = \trim($this->GetActionParam('IdToDelete', ''));
		if (empty($sId))
		{
			throw new Exceptions\ClientException(Notifications::UnknownError);
		}

		$aNew = array();
		$aIdentities = $this->GetIdentities($oAccount);

		foreach ($aIdentities as $oItem)
		{
			if ($oItem && $sId !== $oItem->Id())
			{
				$aNew[] = $oItem;
			}
		}

		return $this->DefaultResponse(__FUNCTION__, $this->SetIdentities($oAccount, $aNew));
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoTemplateSetup() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, false, Enumerations\Capa::TEMPLATES, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$oTemplate = new Model\Template();
		if (!$oTemplate->FromJSON($this->GetActionParams(), true))
		{
			throw new Exceptions\ClientException(Notifications::InvalidInputArgument);
		}

		if ('' === $oTemplate->Id())
		{
			$oTemplate->GenerateID();
		}

		$aTemplatesForSave = array();
		$aTemplates = $this->GetTemplates($oAccount);


		foreach ($aTemplates as $oItem)
		{
			if ($oItem && $oItem->Id() !== $oTemplate->Id())
			{
				$aTemplatesForSave[] = $oItem;
			}
		}

		$aTemplatesForSave[] = $oTemplate;

		return $this->DefaultResponse(__FUNCTION__, $this->SetTemplates($oAccount, $aTemplatesForSave));
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoTemplateDelete() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, false, Enumerations\Capa::TEMPLATES, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$sId = \trim($this->GetActionParam('IdToDelete', ''));
		if (empty($sId))
		{
			throw new Exceptions\ClientException(Notifications::UnknownError);
		}

		$aNew = array();
		$aTemplates = $this->GetTemplates($oAccount);
		foreach ($aTemplates as $oItem)
		{
			if ($oItem && $sId !== $oItem->Id())
			{
				$aNew[] = $oItem;
			}
		}

		return $this->DefaultResponse(__FUNCTION__, $this->SetTemplates($oAccount, $aNew));
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoTemplateGetByID() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, false, Enumerations\Capa::TEMPLATES, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$sId = \trim($this->GetActionParam('ID', ''));
		if (empty($sId))
		{
			throw new Exceptions\ClientException(Notifications::UnknownError);
		}

		$oTemplate = false;
		$aTemplates = $this->GetTemplates($oAccount);

		foreach ($aTemplates as $oItem)
		{
			if ($oItem && $sId === $oItem->Id())
			{
				$oTemplate = $oItem;
				break;
			}
		}

		$oTemplate->SetPopulateAlways(true);
		return $this->DefaultResponse(__FUNCTION__, $oTemplate);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoAccountsAndIdentitiesSortOrder() : array
	{
		$oAccount = $this->getAccountFromToken();

		$aAccounts = $this->GetActionParam('Accounts', null);
		$aIdentities = $this->GetActionParam('Identities', null);

		if (!\is_array($aAccounts) && !\is_array($aIdentities))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		return $this->DefaultResponse(__FUNCTION__, $this->StorageProvider()->Put($oAccount,
			Providers\Storage\Enumerations\StorageType::CONFIG, 'accounts_identities_order',
			\json_encode(array(
				'Accounts' => \is_array($aAccounts) ? $aAccounts : array(),
				'Identities' => \is_array($aIdentities) ? $aIdentities : array()
			))
		));
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoAccountsAndIdentities() : array
	{
		$oAccount = $this->getAccountFromToken();

		$mAccounts = false;

		if ($this->GetCapa(false, false, Enumerations\Capa::ADDITIONAL_ACCOUNTS, $oAccount))
		{
			$mAccounts = $this->GetAccounts($oAccount);
			$mAccounts = \array_keys($mAccounts);

			foreach ($mAccounts as $iIndex => $sName)
			{
				$mAccounts[$iIndex] = \MailSo\Base\Utils::IdnToUtf8($sName);
			}
		}

		return $this->DefaultResponse(__FUNCTION__, array(
			'Accounts' => $mAccounts,
			'Identities' => $this->GetIdentities($oAccount)
		));
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoTemplates() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, false, Enumerations\Capa::TEMPLATES, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		return $this->DefaultResponse(__FUNCTION__, array(
			'Templates' => $this->GetTemplates($oAccount)
		));
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function getAccountUnreadCountFromHash(string $sHash) : int
	{
		$iResult = 0;

		$oAccount = $this->GetAccountFromCustomToken($sHash, false);
		if ($oAccount)
		{
			try
			{
				$oMailClient = new \MailSo\Mail\MailClient();
				$oMailClient->SetLogger($this->Logger());

				$oAccount->IncConnectAndLoginHelper($this->Plugins(), $oMailClient, $this->Config());

				$iResult = $oMailClient->InboxUnreadCount();

				$oMailClient->LogoutAndDisconnect();
			}
			catch (\Throwable $oException)
			{
				$this->Logger()->WriteException($oException);
			}
		}

		return $iResult;
	}

	public function ClearSignMeData(Model\Account $oAccount) : void
	{
		if ($oAccount)
		{
			Utils::ClearCookie(Actions::AUTH_SIGN_ME_TOKEN_KEY);

			$this->StorageProvider()->Clear($oAccount,
				Providers\Storage\Enumerations\StorageType::CONFIG,
				'sign_me'
			);
		}
	}

	public function DoLogout() : array
	{
		$oAccount = $this->getAccountFromToken(false);
		if ($oAccount)
		{
			if ($oAccount->SignMe())
			{
				$this->ClearSignMeData($oAccount);
			}

			if (!$oAccount->IsAdditionalAccount())
			{
				Utils::ClearCookie(Actions::AUTH_SPEC_TOKEN_KEY);
			}
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	public function DoAppDelayStart() : array
	{
		$this->Plugins()->RunHook('service.app-delay-start-begin');

		Utils::UpdateConnectionToken();

		$bMainCache = false;
		$bFilesCache = false;
		$bVersionsCache = false;

		$iOneDay1 = 60 * 60 * 23;
		$iOneDay2 = 60 * 60 * 25;
		$iOneDay3 = 60 * 60 * 30;

		$sTimers = $this->StorageProvider()->Get(null,
			Providers\Storage\Enumerations\StorageType::NOBODY, 'Cache/Timers', '');

		$aTimers = \explode(',', $sTimers);

		$iMainCacheTime = !empty($aTimers[0]) && \is_numeric($aTimers[0]) ? (int) $aTimers[0] : 0;
		$iFilesCacheTime = !empty($aTimers[1]) && \is_numeric($aTimers[1]) ? (int) $aTimers[1] : 0;
		$iVersionsCacheTime = !empty($aTimers[2]) && \is_numeric($aTimers[2]) ? (int) $aTimers[2] : 0;

		if (0 === $iMainCacheTime || $iMainCacheTime + $iOneDay1 < \time())
		{
			$bMainCache = true;
			$iMainCacheTime = \time();
		}

		if (0 === $iFilesCacheTime || $iFilesCacheTime + $iOneDay2 < \time())
		{
			$bFilesCache = true;
			$iFilesCacheTime = \time();
		}

		if (0 === $iVersionsCacheTime || $iVersionsCacheTime + $iOneDay3 < \time())
		{
			$bVersionsCache = true;
			$iVersionsCacheTime = \time();
		}

		if ($bMainCache || $bFilesCache || $bVersionsCache)
		{
			if (!$this->StorageProvider()->Put(null,
				Providers\Storage\Enumerations\StorageType::NOBODY, 'Cache/Timers',
				\implode(',', array($iMainCacheTime, $iFilesCacheTime, $iVersionsCacheTime))))
			{
				$bMainCache = $bFilesCache = $bVersionsCache = false;
			}
		}

		if ($bMainCache)
		{
			$this->Logger()->Write('Cacher GC: Begin');
			$this->Cacher()->GC(48);
			$this->Logger()->Write('Cacher GC: End');
		}
		else if ($bFilesCache)
		{
			$this->Logger()->Write('Files GC: Begin');
			$this->FilesProvider()->GC(48);
			$this->Logger()->Write('Files GC: End');
		}

		$this->Plugins()->RunHook('service.app-delay-start-end');

		return $this->TrueResponse(__FUNCTION__);
	}

	public function DoSystemFoldersUpdate() : array
	{
		$oAccount = $this->getAccountFromToken();

		$oSettingsLocal = $this->SettingsProvider(true)->Load($oAccount);

		$oSettingsLocal->SetConf('SentFolder', $this->GetActionParam('SentFolder', ''));
		$oSettingsLocal->SetConf('DraftFolder', $this->GetActionParam('DraftFolder', ''));
		$oSettingsLocal->SetConf('SpamFolder', $this->GetActionParam('SpamFolder', ''));
		$oSettingsLocal->SetConf('TrashFolder', $this->GetActionParam('TrashFolder', ''));
		$oSettingsLocal->SetConf('ArchiveFolder', $this->GetActionParam('ArchiveFolder', ''));
		$oSettingsLocal->SetConf('NullFolder', $this->GetActionParam('NullFolder', ''));

		return $this->DefaultResponse(__FUNCTION__,
			$this->SettingsProvider(true)->Save($oAccount, $oSettingsLocal));
	}

	public function setConfigFromParams(Config\Application $oConfig, string $sParamName, string $sConfigSector, string $sConfigName, string $sType = 'string', ?callable $mStringCallback = null) : void
	{
		$sValue = $this->GetActionParam($sParamName, '');
		if ($this->HasActionParam($sParamName))
		{
			switch ($sType)
			{
				default:
				case 'string':
					$sValue = (string) $sValue;
					if ($mStringCallback && is_callable($mStringCallback))
					{
						$sValue = call_user_func($mStringCallback, $sValue);
					}

					$oConfig->Set($sConfigSector, $sConfigName, (string) $sValue);
					break;

				case 'dummy':
					$sValue = (string) $this->GetActionParam('ContactsPdoPassword', APP_DUMMY);
					if (APP_DUMMY !== $sValue)
					{
						$oConfig->Set($sConfigSector, $sConfigName, (string) $sValue);
					}
					break;

				case 'int':
					$iValue = (int) $sValue;
					$oConfig->Set($sConfigSector, $sConfigName, $iValue);
					break;

				case 'bool':
					$oConfig->Set($sConfigSector, $sConfigName, '1' === (string) $sValue);
					break;
			}
		}
	}

	private function setSettingsFromParams(Settings $oSettings, string $sConfigName, string $sType = 'string', ?callable $mStringCallback = null) : void
	{
		if ($this->HasActionParam($sConfigName))
		{
			$sValue = $this->GetActionParam($sConfigName, '');
			switch ($sType)
			{
				default:
				case 'string':
					$sValue = (string) $sValue;
					if ($mStringCallback && is_callable($mStringCallback))
					{
						$sValue = call_user_func($mStringCallback, $sValue);
					}

					$oSettings->SetConf($sConfigName, (string) $sValue);
					break;

				case 'int':
					$iValue = (int) $sValue;
					$oSettings->SetConf($sConfigName, $iValue);
					break;

				case 'bool':
					$oSettings->SetConf($sConfigName, '1' === (string) $sValue);
					break;
			}
		}
	}

	public function DoSettingsUpdate() : array
	{
		$oAccount = $this->getAccountFromToken();
		if (!$this->GetCapa(false, false, Enumerations\Capa::SETTINGS, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$self = $this;
		$oConfig = $this->Config();

		$oSettings = $this->SettingsProvider()->Load($oAccount);
		$oSettingsLocal = $this->SettingsProvider(true)->Load($oAccount);

		if ($oConfig->Get('webmail', 'allow_languages_on_settings', true))
		{
			$this->setSettingsFromParams($oSettings, 'Language', 'string', function ($sLanguage) use ($self) {
				return $self->ValidateLanguage($sLanguage);
			});
		}
		else
		{
			$oSettings->SetConf('Language', $this->ValidateLanguage($oConfig->Get('webmail', 'language', 'en')));
		}

		if ($this->GetCapa(false, false, Enumerations\Capa::THEMES, $oAccount))
		{
			$this->setSettingsFromParams($oSettingsLocal, 'Theme', 'string', function ($sTheme) use ($self) {
				return $self->ValidateTheme($sTheme);
			});
		}
		else
		{
			$oSettingsLocal->SetConf('Theme', $this->ValidateTheme($oConfig->Get('webmail', 'theme', 'Default')));
		}

		$this->setSettingsFromParams($oSettings, 'MPP', 'int', function ($iValue) {
			return (int) (\in_array($iValue, array(10, 20, 30, 50, 100, 150, 200, 300)) ? $iValue : 20);
		});

		$this->setSettingsFromParams($oSettings, 'Layout', 'int', function ($iValue) {
			return (int) (\in_array((int) $iValue, array(Enumerations\Layout::NO_PREVIW,
				Enumerations\Layout::SIDE_PREVIEW, Enumerations\Layout::BOTTOM_PREVIEW)) ?
					$iValue : Enumerations\Layout::SIDE_PREVIEW);
		});

		$this->setSettingsFromParams($oSettings, 'EditorDefaultType', 'string');
		$this->setSettingsFromParams($oSettings, 'ShowImages', 'bool');
		$this->setSettingsFromParams($oSettings, 'ContactsAutosave', 'bool');
		$this->setSettingsFromParams($oSettings, 'DesktopNotifications', 'bool');
		$this->setSettingsFromParams($oSettings, 'SoundNotification', 'bool');
		$this->setSettingsFromParams($oSettings, 'UseCheckboxesInList', 'bool');
		$this->setSettingsFromParams($oSettings, 'AllowDraftAutosave', 'bool');
		$this->setSettingsFromParams($oSettings, 'AutoLogout', 'int');

		$this->setSettingsFromParams($oSettings, 'EnableTwoFactor', 'bool');

		$this->setSettingsFromParams($oSettingsLocal, 'UseThreads', 'bool');
		$this->setSettingsFromParams($oSettingsLocal, 'ReplySameFolder', 'bool');

		return $this->DefaultResponse(__FUNCTION__,
			$this->SettingsProvider()->Save($oAccount, $oSettings) &&
			$this->SettingsProvider(true)->Save($oAccount, $oSettingsLocal));
	}

	public function DoNoop() : array
	{
		$this->initMailClientConnection();
		return $this->TrueResponse(__FUNCTION__);
	}

	public function DoPing() : array
	{
		return $this->DefaultResponse(__FUNCTION__, 'Pong');
	}

	public function DoVersion() : array
	{
		return $this->DefaultResponse(__FUNCTION__,
			APP_VERSION === (string) $this->GetActionParam('Version', ''));
	}

	private function recFoldersNames(\MailSo\Mail\FolderCollection $oFolders) : array
	{
		$aResult = array();
		if ($oFolders)
		{
			foreach ($oFolders as $oFolder)
			{
				$aResult[] = $oFolder->FullNameRaw()."|".
					implode("|", $oFolder->Flags()).($oFolder->IsSubscribed() ? '1' : '0');

				$oSub = $oFolder->SubFolders();
				if ($oSub && 0 < $oSub->Count())
				{
					$aResult = \array_merge($aResult, $this->recFoldersNames($oSub));
				}
			}
		}

		return $aResult;
	}

	/**
	 * @staticvar array $aCache
	 */
	private function systemFoldersNames(Model\Account $oAccount) : array
	{
		static $aCache = null;
		if (null === $aCache)
		{
			$aCache = array(

				'Sent' => \MailSo\Imap\Enumerations\FolderType::SENT,
				'Send' => \MailSo\Imap\Enumerations\FolderType::SENT,

				'Outbox' => \MailSo\Imap\Enumerations\FolderType::SENT,
				'Out box' => \MailSo\Imap\Enumerations\FolderType::SENT,

				'Sent Item' => \MailSo\Imap\Enumerations\FolderType::SENT,
				'Sent Items' => \MailSo\Imap\Enumerations\FolderType::SENT,
				'Send Item' => \MailSo\Imap\Enumerations\FolderType::SENT,
				'Send Items' => \MailSo\Imap\Enumerations\FolderType::SENT,
				'Sent Mail' => \MailSo\Imap\Enumerations\FolderType::SENT,
				'Sent Mails' => \MailSo\Imap\Enumerations\FolderType::SENT,
				'Send Mail' => \MailSo\Imap\Enumerations\FolderType::SENT,
				'Send Mails' => \MailSo\Imap\Enumerations\FolderType::SENT,

				'Drafts' => \MailSo\Imap\Enumerations\FolderType::DRAFTS,

				'Draft' => \MailSo\Imap\Enumerations\FolderType::DRAFTS,
				'Draft Mail' => \MailSo\Imap\Enumerations\FolderType::DRAFTS,
				'Draft Mails' => \MailSo\Imap\Enumerations\FolderType::DRAFTS,
				'Drafts Mail' => \MailSo\Imap\Enumerations\FolderType::DRAFTS,
				'Drafts Mails' => \MailSo\Imap\Enumerations\FolderType::DRAFTS,

				'Junk E-mail' => \MailSo\Imap\Enumerations\FolderType::JUNK,

				'Spam' => \MailSo\Imap\Enumerations\FolderType::JUNK,
				'Spams' => \MailSo\Imap\Enumerations\FolderType::JUNK,

				'Junk' => \MailSo\Imap\Enumerations\FolderType::JUNK,
				'Bulk Mail' => \MailSo\Imap\Enumerations\FolderType::JUNK,
				'Bulk Mails' => \MailSo\Imap\Enumerations\FolderType::JUNK,

				'Deleted Items' => \MailSo\Imap\Enumerations\FolderType::TRASH,

				'Trash' => \MailSo\Imap\Enumerations\FolderType::TRASH,
				'Deleted' => \MailSo\Imap\Enumerations\FolderType::TRASH,
				'Bin' => \MailSo\Imap\Enumerations\FolderType::TRASH,

				'Archive' => \MailSo\Imap\Enumerations\FolderType::ALL,
				'Archives' => \MailSo\Imap\Enumerations\FolderType::ALL,

				'All' => \MailSo\Imap\Enumerations\FolderType::ALL,
				'All Mail' => \MailSo\Imap\Enumerations\FolderType::ALL,
				'All Mails' => \MailSo\Imap\Enumerations\FolderType::ALL,
			);

			$aNewCache = array();
			foreach ($aCache as $sKey => $iType)
			{
				$aNewCache[$sKey] = $iType;
				$aNewCache[\str_replace(' ', '', $sKey)] = $iType;
			}

			$aCache = $aNewCache;

			$this->Plugins()->RunHook('filter.system-folders-names', array($oAccount, &$aCache));
		}

		return $aCache;
	}

	private function recFoldersTypes(Model\Account $oAccount, \MailSo\Mail\FolderCollection $oFolders, array &$aResult, bool $bListFolderTypes = true) : void
	{
		if ($oFolders && $oFolders->Count())
		{
			if ($bListFolderTypes)
			{
				foreach ($oFolders as $oFolder)
				{
					$iFolderListType = $oFolder->GetFolderListType();
					if (!isset($aResult[$iFolderListType]) && \in_array($iFolderListType, array(
						\MailSo\Imap\Enumerations\FolderType::SENT,
						\MailSo\Imap\Enumerations\FolderType::DRAFTS,
						\MailSo\Imap\Enumerations\FolderType::JUNK,
						\MailSo\Imap\Enumerations\FolderType::TRASH,
						\MailSo\Imap\Enumerations\FolderType::ALL
					)))
					{
						$aResult[$iFolderListType] = $oFolder->FullNameRaw();
					}
				}

				foreach ($oFolders as $oFolder)
				{
					$oSub = $oFolder->SubFolders();
					if ($oSub && 0 < $oSub->Count())
					{
						$this->recFoldersTypes($oAccount, $oSub, $aResult, true);
					}
				}
			}

			$aMap = $this->systemFoldersNames($oAccount);
			foreach ($oFolders as $oFolder)
			{
				$sName = $oFolder->Name();
				$sFullName = $oFolder->FullName();

				if (isset($aMap[$sName]) || isset($aMap[$sFullName]))
				{
					$iFolderType = isset($aMap[$sName]) ? $aMap[$sName] : $aMap[$sFullName];
					if (!isset($aResult[$iFolderType]) && \in_array($iFolderType, array(
						\MailSo\Imap\Enumerations\FolderType::SENT,
						\MailSo\Imap\Enumerations\FolderType::DRAFTS,
						\MailSo\Imap\Enumerations\FolderType::JUNK,
						\MailSo\Imap\Enumerations\FolderType::TRASH,
						\MailSo\Imap\Enumerations\FolderType::ALL
					)))
					{
						$aResult[$iFolderType] = $oFolder->FullNameRaw();
					}
				}
			}

			foreach ($oFolders as $oFolder)
			{
				$oSub = $oFolder->SubFolders();
				if ($oSub && 0 < $oSub->Count())
				{
					$this->recFoldersTypes($oAccount, $oSub, $aResult, false);
				}
			}
		}
	}

	public function DoFolders() : array
	{
		$oAccount = $this->initMailClientConnection();

		$oFolderCollection = null;
		$this->Plugins()->RunHook('filter.folders-before', array($oAccount, $oFolderCollection));

		$bUseFolders = $this->GetCapa(false, false, Enumerations\Capa::FOLDERS, $oAccount);

		if (null === $oFolderCollection)
		{
			$oFolderCollection = $this->MailClient()->Folders('',
				$bUseFolders ? '*' : 'INBOX',
				!!$this->Config()->Get('labs', 'use_imap_list_subscribe', true),
				(int) $this->Config()->Get('labs', 'imap_folder_list_limit', 200)
			);
		}

		$this->Plugins()->RunHook('filter.folders-post', array($oAccount, $oFolderCollection));

		if ($oFolderCollection instanceof \MailSo\Mail\FolderCollection)
		{
			$oSettingsLocal = $this->SettingsProvider(true)->Load($oAccount);

			$aSystemFolders = array();
			$this->recFoldersTypes($oAccount, $oFolderCollection, $aSystemFolders);
			$oFolderCollection->SystemFolders = $aSystemFolders;

			if ($bUseFolders && $this->Config()->Get('labs', 'autocreate_system_folders', true))
			{
				$bDoItAgain = false;

				$sNamespace = $oFolderCollection->GetNamespace();
				$sParent = empty($sNamespace) ? '' : \substr($sNamespace, 0, -1);

				$sDelimiter = $oFolderCollection->FindDelimiter();

				$aList = array();
				$aMap = $this->systemFoldersNames($oAccount);

				if ('' === $oSettingsLocal->GetConf('SentFolder', ''))
				{
					$aList[] = \MailSo\Imap\Enumerations\FolderType::SENT;
				}

				if ('' === $oSettingsLocal->GetConf('DraftFolder', ''))
				{
					$aList[] = \MailSo\Imap\Enumerations\FolderType::DRAFTS;
				}

				if ('' === $oSettingsLocal->GetConf('SpamFolder', ''))
				{
					$aList[] = \MailSo\Imap\Enumerations\FolderType::JUNK;
				}

				if ('' === $oSettingsLocal->GetConf('TrashFolder', ''))
				{
					$aList[] = \MailSo\Imap\Enumerations\FolderType::TRASH;
				}

				if ('' === $oSettingsLocal->GetConf('ArchiveFolder', ''))
				{
					$aList[] = \MailSo\Imap\Enumerations\FolderType::ALL;
				}

				$this->Plugins()->RunHook('filter.folders-system-types', array($oAccount, &$aList));

				foreach ($aList as $iType)
				{
					if (!isset($aSystemFolders[$iType]))
					{
						$mFolderNameToCreate = \array_search($iType, $aMap);
						if (!empty($mFolderNameToCreate))
						{
							$iPos = \strrpos($mFolderNameToCreate, $sDelimiter);
							if (false !== $iPos)
							{
								$mNewParent = \substr($mFolderNameToCreate, 0, $iPos);
								$mNewFolderNameToCreate = \substr($mFolderNameToCreate, $iPos + 1);
								if (0 < \strlen($mNewFolderNameToCreate))
								{
									$mFolderNameToCreate = $mNewFolderNameToCreate;
								}

								if (0 < \strlen($mNewParent))
								{
									$sParent = 0 < \strlen($sParent) ? $sParent.$sDelimiter.$mNewParent : $mNewParent;
								}
							}

							$sFullNameToCheck = \MailSo\Base\Utils::ConvertEncoding($mFolderNameToCreate,
								\MailSo\Base\Enumerations\Charset::UTF_8, \MailSo\Base\Enumerations\Charset::UTF_7_IMAP);

							if (0 < \strlen(\trim($sParent)))
							{
								$sFullNameToCheck = $sParent.$sDelimiter.$sFullNameToCheck;
							}

							if (!$oFolderCollection->GetByFullNameRaw($sFullNameToCheck))
							{
								try
								{
									if ($this->MailClient()->FolderCreate($mFolderNameToCreate, $sParent, true, $sDelimiter))
									{
										$bDoItAgain = true;
									}
								}
								catch (\Throwable $oException)
								{
									$this->Logger()->WriteException($oException);
								}
							}
						}
					}
				}

				if ($bDoItAgain)
				{
					$oFolderCollection = $this->MailClient()->Folders('', '*',
						!!$this->Config()->Get('labs', 'use_imap_list_subscribe', true),
						(int) $this->Config()->Get('labs', 'imap_folder_list_limit', 200)
					);

					if ($oFolderCollection)
					{
						$aSystemFolders = array();
						$this->recFoldersTypes($oAccount, $oFolderCollection, $aSystemFolders);
						$oFolderCollection->SystemFolders = $aSystemFolders;
					}
				}
			}

			if ($oFolderCollection)
			{
				$oFolderCollection->FoldersHash = \md5(\implode("\x0", $this->recFoldersNames($oFolderCollection)));
			}
		}

		$this->Plugins()->RunHook('filter.folders-complete', array($oAccount, $oFolderCollection));

		return $this->DefaultResponse(__FUNCTION__, $oFolderCollection);
	}

	public function DoFolderCreate() : array
	{
		$oAccount = $this->initMailClientConnection();

		if (!$this->GetCapa(false, false, Enumerations\Capa::FOLDERS, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		try
		{
			$sFolderNameInUtf = $this->GetActionParam('Folder', '');
			$sFolderParentFullNameRaw = $this->GetActionParam('Parent', '');

			$this->MailClient()->FolderCreate($sFolderNameInUtf, $sFolderParentFullNameRaw,
				!!$this->Config()->Get('labs', 'use_imap_list_subscribe', true));
		}
		catch (\Throwable $oException)
		{
			throw new Exceptions\ClientException(Notifications::CantCreateFolder, $oException);
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	public function DoFolderSubscribe() : array
	{
		$oAccount = $this->initMailClientConnection();

		if (!$this->GetCapa(false, false, Enumerations\Capa::FOLDERS, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$sFolderFullNameRaw = $this->GetActionParam('Folder', '');
		$bSubscribe = '1' === (string) $this->GetActionParam('Subscribe', '0');

		try
		{
			$this->MailClient()->FolderSubscribe($sFolderFullNameRaw, !!$bSubscribe);
		}
		catch (\Throwable $oException)
		{
			if ($bSubscribe)
			{
				throw new Exceptions\ClientException(Notifications::CantSubscribeFolder, $oException);
			}
			else
			{
				throw new Exceptions\ClientException(Notifications::CantUnsubscribeFolder, $oException);
			}
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	public function DoFolderCheckable() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, false, Enumerations\Capa::FOLDERS, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$sFolderFullNameRaw = $this->GetActionParam('Folder', '');
		$bCheckable = '1' === (string) $this->GetActionParam('Checkable', '0');

		$oSettingsLocal = $this->SettingsProvider(true)->Load($oAccount);

		$sCheckableFolder = $oSettingsLocal->GetConf('CheckableFolder', '[]');
		$aCheckableFolder = \json_decode($sCheckableFolder);

		if (!\is_array($aCheckableFolder))
		{
			$aCheckableFolder = array();
		}

		if ($bCheckable)
		{
			$aCheckableFolder[] = $sFolderFullNameRaw;
		}
		else
		{
			$aCheckableFolderNew = array();
			foreach ($aCheckableFolder as $sFolder)
			{
				if ($sFolder !== $sFolderFullNameRaw)
				{
					$aCheckableFolderNew[] = $sFolder;
				}
			}
			$aCheckableFolder = $aCheckableFolderNew;
		}

		$aCheckableFolder = \array_unique($aCheckableFolder);

		$oSettingsLocal->SetConf('CheckableFolder', \json_encode($aCheckableFolder));

		return $this->DefaultResponse(__FUNCTION__,
			$this->SettingsProvider(true)->Save($oAccount, $oSettingsLocal));
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoFolderRename() : array
	{
		$oAccount = $this->initMailClientConnection();

		if (!$this->GetCapa(false, false, Enumerations\Capa::FOLDERS, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$sPrevFolderFullNameRaw = $this->GetActionParam('Folder', '');
		$sNewTopFolderNameInUtf = $this->GetActionParam('NewFolderName', '');

		try
		{
			$this->MailClient()->FolderRename($sPrevFolderFullNameRaw, $sNewTopFolderNameInUtf,
				!!$this->Config()->Get('labs', 'use_imap_list_subscribe', true));
		}
		catch (\Throwable $oException)
		{
			throw new Exceptions\ClientException(Notifications::CantRenameFolder, $oException);
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoFolderDelete() : array
	{
		$oAccount = $this->initMailClientConnection();

		if (!$this->GetCapa(false, false, Enumerations\Capa::FOLDERS, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$sFolderFullNameRaw = $this->GetActionParam('Folder', '');

		try
		{
			$this->MailClient()->FolderDelete($sFolderFullNameRaw,
				!!$this->Config()->Get('labs', 'use_imap_list_subscribe', true));
		}
		catch (\MailSo\Mail\Exceptions\NonEmptyFolder $oException)
		{
			throw new Exceptions\ClientException(Notifications::CantDeleteNonEmptyFolder, $oException);
		}
		catch (\Throwable $oException)
		{
			throw new Exceptions\ClientException(Notifications::CantDeleteFolder, $oException);
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoFolderClear() : array
	{
		$this->initMailClientConnection();

		$sFolderFullNameRaw = $this->GetActionParam('Folder', '');

		try
		{
			$this->MailClient()->FolderClear($sFolderFullNameRaw);
		}
		catch (\Throwable $oException)
		{
			throw new Exceptions\ClientException(Notifications::MailServerError, $oException);
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoFolderInformation() : array
	{
		$sFolder = $this->GetActionParam('Folder', '');
		$sPrevUidNext = $this->GetActionParam('UidNext', '');
		$aFlagsUids = array();
		$sFlagsUids = (string) $this->GetActionParam('FlagsUids', '');

		$aFlagsFilteredUids = array();
		if (0 < strlen($sFlagsUids))
		{
			$aFlagsUids = explode(',', $sFlagsUids);
			$aFlagsFilteredUids = array_filter($aFlagsUids, function (&$sUid) {
				$sUid = (int) trim($sUid);
				return 0 < (int) trim($sUid);
			});
		}

		$this->initMailClientConnection();

		$sForwardedFlag = $this->Config()->Get('labs', 'imap_forwarded_flag', '');
		$sReadReceiptFlag = $this->Config()->Get('labs', 'imap_read_receipt_flag', '');
		try
		{
			$aInboxInformation = $this->MailClient()->FolderInformation(
				$sFolder, $sPrevUidNext, $aFlagsFilteredUids
			);

			if (isset($aInboxInformation['Flags']) && \is_array($aInboxInformation['Flags']))
			{
				foreach ($aInboxInformation['Flags'] as $iUid => $aFlags)
				{
					$aLowerFlags = array_map('strtolower', $aFlags);
					$aInboxInformation['Flags'][$iUid] = array(
						'IsSeen' => in_array('\\seen', $aLowerFlags),
						'IsFlagged' => in_array('\\flagged', $aLowerFlags),
						'IsAnswered' => in_array('\\answered', $aLowerFlags),
						'IsDeleted' => in_array('\\deleted', $aLowerFlags),
						'IsForwarded' => 0 < strlen($sForwardedFlag) && in_array(strtolower($sForwardedFlag), $aLowerFlags),
						'IsReadReceipt' => 0 < strlen($sReadReceiptFlag) && in_array(strtolower($sReadReceiptFlag), $aLowerFlags)
					);
				}
			}
		}
		catch (\Throwable $oException)
		{
			throw new Exceptions\ClientException(Notifications::MailServerError, $oException);
		}

		$aInboxInformation['Version'] = APP_VERSION;

		return $this->DefaultResponse(__FUNCTION__, $aInboxInformation);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoFolderInformationMultiply() : array
	{
		$aResult = array(
			'List' => array(),
			'Version' => APP_VERSION
		);

		$aFolders = $this->GetActionParam('Folders', null);
		if (\is_array($aFolders))
		{
			$this->initMailClientConnection();

			$aFolders = \array_unique($aFolders);
			foreach ($aFolders as $sFolder)
			{
				if (0 < \strlen(\trim($sFolder)) && 'INBOX' !== \strtoupper($sFolder))
				{
					try
					{
						$aInboxInformation = $this->MailClient()->FolderInformation($sFolder, '', array());
						if (isset($aInboxInformation['Folder']))
						{
							$aResult['List'][] = $aInboxInformation;
						}
					}
					catch (\Throwable $oException)
					{
						$this->Logger()->WriteException($oException);
					}
				}
			}
		}

		return $this->DefaultResponse(__FUNCTION__, $aResult);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoMessageList() : array
	{
//		\sleep(1);
//		throw new Exceptions\ClientException(Notifications::CantGetMessageList);

		$sFolder = '';
		$iOffset = 0;
		$iLimit = 20;
		$sSearch = '';
		$sUidNext = '';
		$bUseThreads = false;
		$sThreadUid = '';

		$sRawKey = $this->GetActionParam('RawKey', '');
		$aValues = $this->getDecodedClientRawKeyValue($sRawKey, 9);

		if ($aValues && 7 < \count($aValues))
		{
			$sFolder =(string) $aValues[0];
			$iOffset = (int) $aValues[1];
			$iLimit = (int) $aValues[2];
			$sSearch = (string) $aValues[3];
			$sUidNext = (string) $aValues[6];
			$bUseThreads = (bool) $aValues[7];

			if ($bUseThreads)
			{
				$sThreadUid = isset($aValues[8]) ? (string) $aValues[8] : '';
			}

			$this->verifyCacheByKey($sRawKey);
		}
		else
		{
			$sFolder = $this->GetActionParam('Folder', '');
			$iOffset = (int) $this->GetActionParam('Offset', 0);
			$iLimit = (int) $this->GetActionParam('Limit', 10);
			$sSearch = $this->GetActionParam('Search', '');
			$sUidNext = $this->GetActionParam('UidNext', '');
			$bUseThreads = '1' === (string) $this->GetActionParam('UseThreads', '0');

			if ($bUseThreads)
			{
				$sThreadUid = (string) $this->GetActionParam('ThreadUid', '');
			}
		}

		if (0 === strlen($sFolder))
		{
			throw new Exceptions\ClientException(Notifications::CantGetMessageList);
		}

		$this->initMailClientConnection();

		try
		{
			if (!$this->Config()->Get('labs', 'use_imap_thread', false))
			{
				$bUseThreads = false;
			}

			$oMessageList = $this->MailClient()->MessageList(
				$sFolder, $iOffset, $iLimit, $sSearch, $sUidNext,
				$this->cacherForUids(),
				!!$this->Config()->Get('labs', 'use_imap_sort', false),
				$bUseThreads,
				$sThreadUid,
				''
			);
		}
		catch (\Throwable $oException)
		{
			throw new Exceptions\ClientException(Notifications::CantGetMessageList, $oException);
		}

		if ($oMessageList)
		{
			$this->cacheByKey($sRawKey);
		}

		return $this->DefaultResponse(__FUNCTION__, $oMessageList);
	}

	private function buildMessage(Model\Account $oAccount, bool $bWithDraftInfo = true) : \MailSo\Mime\Message
	{
		$sIdentityID = $this->GetActionParam('IdentityID', '');
		$sTo = $this->GetActionParam('To', '');
		$sCc = $this->GetActionParam('Cc', '');
		$sBcc = $this->GetActionParam('Bcc', '');
		$sReplyTo = $this->GetActionParam('ReplyTo', '');
		$sSubject = $this->GetActionParam('Subject', '');
		$bTextIsHtml = '1' === $this->GetActionParam('TextIsHtml', '0');
		$bReadReceiptRequest = '1' === $this->GetActionParam('ReadReceiptRequest', '0');
		$bMarkAsImportant = '1' === $this->GetActionParam('MarkAsImportant', '0');
		$sText = $this->GetActionParam('Text', '');
		$aAttachments = $this->GetActionParam('Attachments', null);

		$aDraftInfo = $this->GetActionParam('DraftInfo', null);
		$sInReplyTo = $this->GetActionParam('InReplyTo', '');
		$sReferences = $this->GetActionParam('References', '');

		$oMessage = new \MailSo\Mime\Message();

		if (!$this->Config()->Get('security', 'hide_x_mailer_header', true))
		{
			$oMessage->SetXMailer('SnappyMail/'.APP_VERSION);
		} else {
			$oMessage->DoesNotAddDefaultXMailer();
		}

		$oFromIdentity = $this->GetIdentityByID($oAccount, $sIdentityID);
		if ($oFromIdentity)
		{
			$oMessage->SetFrom(new \MailSo\Mime\Email(
				$oFromIdentity->Email(), $oFromIdentity->Name()));
		}
		else
		{
			$oMessage->SetFrom(\MailSo\Mime\Email::Parse($oAccount->Email()));
		}

		$oFrom = $oMessage->GetFrom();
		$oMessage->RegenerateMessageId($oFrom ? $oFrom->GetDomain() : '');

		if (!empty($sReplyTo))
		{
			$oReplyTo = new \MailSo\Mime\EmailCollection($sReplyTo);
			if ($oReplyTo && 0 < $oReplyTo->Count())
			{
				$oMessage->SetReplyTo($oReplyTo);
			}
		}

		if ($bReadReceiptRequest)
		{
			$oMessage->SetReadReceipt($oAccount->Email());
		}

		if ($bMarkAsImportant)
		{
			$oMessage->SetPriority(\MailSo\Mime\Enumerations\MessagePriority::HIGH);
		}

		$oMessage->SetSubject($sSubject);

		$oToEmails = new \MailSo\Mime\EmailCollection($sTo);
		if ($oToEmails && $oToEmails->Count())
		{
			$oMessage->SetTo($oToEmails);
		}

		$oCcEmails = new \MailSo\Mime\EmailCollection($sCc);
		if ($oCcEmails && $oCcEmails->Count())
		{
			$oMessage->SetCc($oCcEmails);
		}

		$oBccEmails = new \MailSo\Mime\EmailCollection($sBcc);
		if ($oBccEmails && $oBccEmails->Count())
		{
			$oMessage->SetBcc($oBccEmails);
		}

		if ($bWithDraftInfo && \is_array($aDraftInfo) && !empty($aDraftInfo[0]) && !empty($aDraftInfo[1]) && !empty($aDraftInfo[2]))
		{
			$oMessage->SetDraftInfo($aDraftInfo[0], $aDraftInfo[1], $aDraftInfo[2]);
		}

		if (0 < \strlen($sInReplyTo))
		{
			$oMessage->SetInReplyTo($sInReplyTo);
		}

		if (0 < \strlen($sReferences))
		{
			$oMessage->SetReferences($sReferences);
		}

		$aFoundedCids = array();
		$mFoundDataURL = array();
		$aFoundedContentLocationUrls = array();

		$sTextToAdd = $bTextIsHtml ?
			\MailSo\Base\HtmlUtils::BuildHtml($sText, $aFoundedCids, $mFoundDataURL, $aFoundedContentLocationUrls) : $sText;

		$this->Plugins()->RunHook($bTextIsHtml ? 'filter.message-html' : 'filter.message-plain',
			array($oAccount, $oMessage, &$sTextToAdd));

		if ($bTextIsHtml && 0 < \strlen($sTextToAdd))
		{
			$sTextConverted = \MailSo\Base\HtmlUtils::ConvertHtmlToPlain($sTextToAdd);
			$this->Plugins()->RunHook('filter.message-plain', array($oAccount, $oMessage, &$sTextConverted));
			$oMessage->AddText($sTextConverted, false);
		}

		$oMessage->AddText($sTextToAdd, $bTextIsHtml);

		if (\is_array($aAttachments))
		{
			foreach ($aAttachments as $sTempName => $aData)
			{
				$sFileName = (string) $aData[0];
				$bIsInline = (bool) $aData[1];
				$sCID = (string) $aData[2];
				$sContentLocation = isset($aData[3]) ? (string) $aData[3] : '';

				$rResource = $this->FilesProvider()->GetFile($oAccount, $sTempName);
				if (\is_resource($rResource))
				{
					$iFileSize = $this->FilesProvider()->FileSize($oAccount, $sTempName);

					$oMessage->Attachments()->append(
						new \MailSo\Mime\Attachment($rResource, $sFileName, $iFileSize, $bIsInline,
							\in_array(trim(trim($sCID), '<>'), $aFoundedCids),
							$sCID, array(), $sContentLocation
						)
					);
				}
			}
		}

		if ($mFoundDataURL && \is_array($mFoundDataURL) && 0 < \count($mFoundDataURL))
		{
			foreach ($mFoundDataURL as $sCidHash => $sDataUrlString)
			{
				$aMatch = array();
				$sCID = '<'.$sCidHash.'>';
				if (\preg_match('/^data:(image\/[a-zA-Z0-9]+);base64,(.+)$/i', $sDataUrlString, $aMatch) &&
					!empty($aMatch[1]) && !empty($aMatch[2]))
				{
					$sRaw = \MailSo\Base\Utils::Base64Decode($aMatch[2]);
					$iFileSize = \strlen($sRaw);
					if (0 < $iFileSize)
					{
						$sFileName = \preg_replace('/[^a-z0-9]+/i', '.', $aMatch[1]);
						$rResource = \MailSo\Base\ResourceRegistry::CreateMemoryResourceFromString($sRaw);

						$sRaw = '';
						unset($sRaw);
						unset($aMatch);

						$oMessage->Attachments()->append(
							new \MailSo\Mime\Attachment($rResource, $sFileName, $iFileSize, true, true, $sCID)
						);
					}
				}
			}
		}

		$this->Plugins()->RunHook('filter.build-message', array($oMessage));

		return $oMessage;
	}

	private function deleteMessageAttachmnets(Model\Account $oAccount) : void
	{
		$aAttachments = $this->GetActionParam('Attachments', null);

		if (\is_array($aAttachments))
		{
			foreach (\array_keys($aAttachments) as $sTempName)
			{
				if ($this->FilesProvider()->FileExists($oAccount, $sTempName))
				{
					$this->FilesProvider()->Clear($oAccount, $sTempName);
				}
			}
		}
	}

	private function buildReadReceiptMessage(Model\Account $oAccount) : \MailSo\Mime\Message
	{
		$sReadReceipt = $this->GetActionParam('ReadReceipt', '');
		$sSubject = $this->GetActionParam('Subject', '');
		$sText = $this->GetActionParam('Text', '');

		$oIdentity = $this->GetAccountIdentity($oAccount);

		if (empty($sReadReceipt) || empty($sSubject) || empty($sText) || !$oIdentity)
		{
			throw new Exceptions\ClientException(Notifications::UnknownError);
		}

		$oMessage = new \MailSo\Mime\Message();

		if (!$this->Config()->Get('security', 'hide_x_mailer_header', true))
		{
			$oMessage->SetXMailer('SnappyMail/'.APP_VERSION);
		}

		$oMessage->SetFrom(new \MailSo\Mime\Email($oIdentity->Email(), $oIdentity->Name()));

		$oFrom = $oMessage->GetFrom();
		$oMessage->RegenerateMessageId($oFrom ? $oFrom->GetDomain() : '');

		$sReplyTo = $oIdentity->ReplyTo();
		if (!empty($sReplyTo))
		{
			$oReplyTo = new \MailSo\Mime\EmailCollection($sReplyTo);
			if ($oReplyTo && $oReplyTo->Count())
			{
				$oMessage->SetReplyTo($oReplyTo);
			}
		}

		$oMessage->SetSubject($sSubject);

		$oToEmails = new \MailSo\Mime\EmailCollection($sReadReceipt);
		if ($oToEmails && $oToEmails->Count())
		{
			$oMessage->SetTo($oToEmails);
		}

		$this->Plugins()->RunHook('filter.read-receipt-message-plain', array($oAccount, $oMessage, &$sText));

		$oMessage->AddText($sText, false);

		$this->Plugins()->RunHook('filter.build-read-receipt-message', array($oMessage, $oAccount));

		return $oMessage;
	}

	public function DoSaveMessage() : array
	{
		$oAccount = $this->initMailClientConnection();

		if (!$this->GetCapa(false, false, Enumerations\Capa::COMPOSER, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$sMessageFolder = $this->GetActionParam('MessageFolder', '');
		$sMessageUid = $this->GetActionParam('MessageUid', '');

		$sDraftFolder = $this->GetActionParam('SaveFolder', '');
		if (0 === strlen($sDraftFolder))
		{
			throw new Exceptions\ClientException(Notifications::UnknownError);
		}

		$oMessage = $this->buildMessage($oAccount, true);

		$this->Plugins()->RunHook('filter.save-message', array($oMessage));

		$mResult = false;
		if ($oMessage)
		{
			$rMessageStream = \MailSo\Base\ResourceRegistry::CreateMemoryResource();

			$iMessageStreamSize = \MailSo\Base\Utils::MultipleStreamWriter(
				$oMessage->ToStream(false), array($rMessageStream), 8192, true, true);

			if (false !== $iMessageStreamSize)
			{
				$sMessageId = $oMessage->MessageId();

				\rewind($rMessageStream);

				$iNewUid = 0;
				$this->MailClient()->MessageAppendStream(
					$rMessageStream, $iMessageStreamSize, $sDraftFolder, array(
						\MailSo\Imap\Enumerations\MessageFlag::SEEN
					), $iNewUid);

				if (!empty($sMessageId) && (null === $iNewUid || 0 === $iNewUid))
				{
					$iNewUid = $this->MailClient()->FindMessageUidByMessageId($sDraftFolder, $sMessageId);
				}

				$mResult = true;

				if (0 < strlen($sMessageFolder) && 0 < strlen($sMessageUid))
				{
					$this->MailClient()->MessageDelete($sMessageFolder, array($sMessageUid), true, true);
				}

				if (null !== $iNewUid && 0 < $iNewUid)
				{
					$mResult = array(
						'NewFolder' => $sDraftFolder,
						'NewUid' => $iNewUid
					);
				}
			}
		}

		return $this->DefaultResponse(__FUNCTION__, $mResult);
	}

	/**
	 * @throws \RainLoop\Exceptions\ClientException
	 * @throws \MailSo\Net\Exceptions\ConnectionException
	 */
	private function smtpSendMessage(Model\Account $oAccount, \MailSo\Mime\Message $oMessage,
		/*resource*/ &$rMessageStream, int &$iMessageStreamSize, bool $bDsn = false, bool $bAddHiddenRcpt = true)
	{
		$oRcpt = $oMessage->GetRcpt();
		if ($oRcpt && 0 < $oRcpt->Count())
		{
			$this->Plugins()->RunHook('filter.smtp-message-stream',
				array($oAccount, &$rMessageStream, &$iMessageStreamSize));

			$this->Plugins()->RunHook('filter.message-rcpt', array($oAccount, $oRcpt));

			try
			{
				$oFrom = $oMessage->GetFrom();
				$sFrom = $oFrom instanceof \MailSo\Mime\Email ? $oFrom->GetEmail() : '';
				$sFrom = empty($sFrom) ? $oAccount->Email() : $sFrom;

				$this->Plugins()->RunHook('filter.smtp-from', array($oAccount, $oMessage, &$sFrom));

				$aHiddenRcpt = array();
				if ($bAddHiddenRcpt)
				{
					$this->Plugins()->RunHook('filter.smtp-hidden-rcpt', array($oAccount, $oMessage, &$aHiddenRcpt));
				}

				$bUsePhpMail = $oAccount->Domain()->OutUsePhpMail();

				$oSmtpClient = new \MailSo\Smtp\SmtpClient();
				$oSmtpClient->SetLogger($this->Logger());
				$oSmtpClient->SetTimeOuts(10, (int) Api::Config()->Get('labs', 'smtp_timeout', 60));

				$bLoggined = $oAccount->OutConnectAndLoginHelper(
					$this->Plugins(), $oSmtpClient, $this->Config(), null, $bUsePhpMail
				);

				if ($bUsePhpMail)
				{
					if (\MailSo\Base\Utils::FunctionExistsAndEnabled('mail'))
					{
						$aToCollection = $oMessage->GetTo();
						if ($aToCollection && $oFrom)
						{
							$sRawBody = \stream_get_contents($rMessageStream);
							if (!empty($sRawBody))
							{
								$sMailTo = \trim($aToCollection->ToString(true));
								$sMailSubject = \trim($oMessage->GetSubject());
								$sMailSubject = 0 === \strlen($sMailSubject) ? '' : \MailSo\Base\Utils::EncodeUnencodedValue(
									\MailSo\Base\Enumerations\Encoding::BASE64_SHORT, $sMailSubject);

								$sMailHeaders = $sMailBody = '';
								list($sMailHeaders, $sMailBody) = \explode("\r\n\r\n", $sRawBody, 2);
								unset($sRawBody);

								if ($this->Config()->Get('labs', 'mail_func_clear_headers', true))
								{
									$sMailHeaders = \MailSo\Base\Utils::RemoveHeaderFromHeaders($sMailHeaders, array(
										\MailSo\Mime\Enumerations\Header::TO_,
										\MailSo\Mime\Enumerations\Header::SUBJECT
									));
								}

								if ($this->Config()->Get('debug', 'enable', false))
								{
									$this->Logger()->WriteDump(array(
										$sMailTo, $sMailSubject, $sMailBody, $sMailHeaders
									));
								}

								$bR = $this->Config()->Get('labs', 'mail_func_additional_parameters', false) ?
									\mail($sMailTo, $sMailSubject, $sMailBody, $sMailHeaders, '-f'.$oFrom->GetEmail()) :
									\mail($sMailTo, $sMailSubject, $sMailBody, $sMailHeaders);

								if (!$bR)
								{
									throw new Exceptions\ClientException(Notifications::CantSendMessage);
								}
							}
						}
					}
					else
					{
						throw new Exceptions\ClientException(Notifications::CantSendMessage);
					}
				}
				else if ($oSmtpClient->IsConnected())
				{
					if (!empty($sFrom))
					{
						$oSmtpClient->MailFrom($sFrom, '', $bDsn);
					}

					foreach ($oRcpt as /* @var $oEmail \MailSo\Mime\Email */ $oEmail)
					{
						$oSmtpClient->Rcpt($oEmail->GetEmail(), $bDsn);
					}

					if ($bAddHiddenRcpt && \is_array($aHiddenRcpt) && 0 < \count($aHiddenRcpt))
					{
						foreach ($aHiddenRcpt as $sEmail)
						{
							if (\preg_match('/^[^@\s]+@[^@\s]+$/', $sEmail))
							{
								$oSmtpClient->Rcpt($sEmail);
							}
						}
					}

					$oSmtpClient->DataWithStream($rMessageStream);

					if ($bLoggined)
					{
						$oSmtpClient->Logout();
					}

					$oSmtpClient->Disconnect();
				}
			}
			catch (\MailSo\Net\Exceptions\ConnectionException $oException)
			{
				if ($this->Config()->Get('labs', 'smtp_show_server_errors'))
				{
					throw new Exceptions\ClientException(Notifications::ClientViewError, $oException);
				}
				else
				{
					throw new Exceptions\ClientException(Notifications::ConnectionError, $oException);
				}
			}
			catch (\MailSo\Smtp\Exceptions\LoginException $oException)
			{
				throw new Exceptions\ClientException(Notifications::AuthError, $oException);
			}
			catch (\Throwable $oException)
			{
				if ($this->Config()->Get('labs', 'smtp_show_server_errors'))
				{
					throw new Exceptions\ClientException(Notifications::ClientViewError, $oException);
				}
				else
				{
					throw $oException;
				}
			}
		}
		else
		{
			throw new Exceptions\ClientException(Notifications::InvalidRecipients);
		}
	}

	public function DoSendMessage() : array
	{
		$oAccount = $this->initMailClientConnection();

		if (!$this->GetCapa(false, false, Enumerations\Capa::COMPOSER, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$oConfig = $this->Config();

		$sDraftFolder = $this->GetActionParam('MessageFolder', '');
		$sDraftUid = $this->GetActionParam('MessageUid', '');
		$sSentFolder = $this->GetActionParam('SaveFolder', '');
		$aDraftInfo = $this->GetActionParam('DraftInfo', null);
		$bDsn = '1' === (string) $this->GetActionParam('Dsn', '0');

		$oMessage = $this->buildMessage($oAccount, false);

		$this->Plugins()->RunHook('filter.send-message', array($oMessage));

		$mResult = false;
		try
		{
			if ($oMessage)
			{
				$rMessageStream = \MailSo\Base\ResourceRegistry::CreateMemoryResource();

				$iMessageStreamSize = \MailSo\Base\Utils::MultipleStreamWriter(
					$oMessage->ToStream(true), array($rMessageStream), 8192, true, true, true);

				if (false !== $iMessageStreamSize)
				{
					$this->smtpSendMessage($oAccount, $oMessage, $rMessageStream, $iMessageStreamSize, $bDsn, true);

					if (\is_array($aDraftInfo) && 3 === \count($aDraftInfo))
					{
						$sDraftInfoType = $aDraftInfo[0];
						$sDraftInfoUid = $aDraftInfo[1];
						$sDraftInfoFolder = $aDraftInfo[2];

						try
						{
							switch (\strtolower($sDraftInfoType))
							{
								case 'reply':
								case 'reply-all':
									$this->MailClient()->MessageSetFlag($sDraftInfoFolder, array($sDraftInfoUid), true,
										\MailSo\Imap\Enumerations\MessageFlag::ANSWERED, true);
									break;
								case 'forward':
									$sForwardedFlag = $this->Config()->Get('labs', 'imap_forwarded_flag', '');
									if (0 < strlen($sForwardedFlag))
									{
										$this->MailClient()->MessageSetFlag($sDraftInfoFolder, array($sDraftInfoUid), true,
											$sForwardedFlag, true);
									}
									break;
							}
						}
						catch (\Throwable $oException)
						{
							$this->Logger()->WriteException($oException, \MailSo\Log\Enumerations\Type::ERROR);
						}
					}

					if (0 < \strlen($sSentFolder))
					{
						try
						{
							if (!$oMessage->GetBcc())
							{
								if (\is_resource($rMessageStream))
								{
									\rewind($rMessageStream);
								}

								$this->Plugins()->RunHook('filter.send-message-stream',
									array($oAccount, &$rMessageStream, &$iMessageStreamSize));

								$this->MailClient()->MessageAppendStream(
									$rMessageStream, $iMessageStreamSize, $sSentFolder, array(
										\MailSo\Imap\Enumerations\MessageFlag::SEEN
									)
								);
							}
							else
							{
								$rAppendMessageStream = \MailSo\Base\ResourceRegistry::CreateMemoryResource();

								$iAppendMessageStreamSize = \MailSo\Base\Utils::MultipleStreamWriter(
									$oMessage->ToStream(false), array($rAppendMessageStream), 8192, true, true, true);

								$this->Plugins()->RunHook('filter.send-message-stream',
									array($oAccount, &$rAppendMessageStream, &$iAppendMessageStreamSize));

								$this->MailClient()->MessageAppendStream(
									$rAppendMessageStream, $iAppendMessageStreamSize, $sSentFolder, array(
										\MailSo\Imap\Enumerations\MessageFlag::SEEN
									));

								if (\is_resource($rAppendMessageStream))
								{
									fclose($rAppendMessageStream);
								}
							}
						}
						catch (\Throwable $oException)
						{
							throw new Exceptions\ClientException(Notifications::CantSaveMessage, $oException);
						}
					}

					if (\is_resource($rMessageStream))
					{
						\fclose($rMessageStream);
					}

					$this->deleteMessageAttachmnets($oAccount);

					if (0 < \strlen($sDraftFolder) && 0 < \strlen($sDraftUid))
					{
						try
						{
							$this->MailClient()->MessageDelete($sDraftFolder, array($sDraftUid), true, true);
						}
						catch (\Throwable $oException)
						{
							$this->Logger()->WriteException($oException, \MailSo\Log\Enumerations\Type::ERROR);
						}
					}

					$mResult = true;
				}
			}
		}
		catch (Exceptions\ClientException $oException)
		{
			throw $oException;
		}
		catch (\Throwable $oException)
		{
			throw new Exceptions\ClientException(Notifications::CantSendMessage, $oException);
		}

		if (false === $mResult)
		{
			throw new Exceptions\ClientException(Notifications::CantSendMessage);
		}

		try
		{
			if ($oMessage && $this->AddressBookProvider($oAccount)->IsActive())
			{
				$aArrayToFrec = array();
				$oToCollection = $oMessage->GetTo();
				if ($oToCollection)
				{
					foreach ($oToCollection as /* @var $oEmail \MailSo\Mime\Email */ $oEmail)
					{
						$aArrayToFrec[$oEmail->GetEmail(true)] = $oEmail->ToString(false, true);
					}
				}

				if (0 < \count($aArrayToFrec))
				{
					$oSettings = $this->SettingsProvider()->Load($oAccount);

					$this->AddressBookProvider($oAccount)->IncFrec(
						$oAccount->ParentEmailHelper(), \array_values($aArrayToFrec),
							!!$oSettings->GetConf('ContactsAutosave',
								!!$oConfig->Get('defaults', 'contacts_autosave', true)));
				}
			}
		}
		catch (\Throwable $oException)
		{
			$this->Logger()->WriteException($oException);
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	public function DoSendReadReceiptMessage() : array
	{
		$oAccount = $this->initMailClientConnection();

		if (!$this->GetCapa(false, false, Enumerations\Capa::COMPOSER, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$oMessage = $this->buildReadReceiptMessage($oAccount);

		$this->Plugins()->RunHook('filter.send-read-receipt-message', array($oMessage, $oAccount));

		$mResult = false;
		try
		{
			if ($oMessage)
			{
				$rMessageStream = \MailSo\Base\ResourceRegistry::CreateMemoryResource();

				$iMessageStreamSize = \MailSo\Base\Utils::MultipleStreamWriter(
					$oMessage->ToStream(true), array($rMessageStream), 8192, true, true, true);

				if (false !== $iMessageStreamSize)
				{
					$this->smtpSendMessage($oAccount, $oMessage, $rMessageStream, $iMessageStreamSize, false, false);

					if (\is_resource($rMessageStream))
					{
						\fclose($rMessageStream);
					}

					$mResult = true;

					$sReadReceiptFlag = $this->Config()->Get('labs', 'imap_read_receipt_flag', '');
					if (!empty($sReadReceiptFlag))
					{
						$sFolderFullName = $this->GetActionParam('MessageFolder', '');
						$sUid = $this->GetActionParam('MessageUid', '');

						$this->Cacher($oAccount)->Set(KeyPathHelper::ReadReceiptCache($oAccount->Email(), $sFolderFullName, $sUid), '1');

						if (0 < \strlen($sFolderFullName) && 0 < \strlen($sUid))
						{
							try
							{
								$this->MailClient()->MessageSetFlag($sFolderFullName, array($sUid), true, $sReadReceiptFlag, true, true);
							}
							catch (\Throwable $oException) {}
						}
					}
				}
			}
		}
		catch (Exceptions\ClientException $oException)
		{
			throw $oException;
		}
		catch (\Throwable $oException)
		{
			throw new Exceptions\ClientException(Notifications::CantSendMessage, $oException);
		}

		if (false === $mResult)
		{
			throw new Exceptions\ClientException(Notifications::CantSendMessage);
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	public function DoQuota() : array
	{
		$oAccount = $this->initMailClientConnection();

		if (!$this->GetCapa(false, false, Enumerations\Capa::QUOTA, $oAccount))
		{
			return $this->DefaultResponse(__FUNCTION__, array(0, 0, 0, 0));
		}

		try
		{
			$aQuota = $this->MailClient()->Quota();
		}
		catch (\Throwable $oException)
		{
			throw new Exceptions\ClientException(Notifications::MailServerError, $oException);
		}

		return $this->DefaultResponse(__FUNCTION__, $aQuota);
	}

	private function getContactsSyncData(Model\Account $oAccount) : ?array
	{
		$mResult = null;

		$sData = $this->StorageProvider()->Get($oAccount,
			Providers\Storage\Enumerations\StorageType::CONFIG,
			'contacts_sync'
		);

		if (!empty($sData))
		{
			$aData = Utils::DecodeKeyValues($sData);
			if ($aData)
			{
				$mResult = array(
					'Enable' => isset($aData['Enable']) ? !!$aData['Enable'] : false,
					'Url' => isset($aData['Url']) ? \trim($aData['Url']) : '',
					'User' => isset($aData['User']) ? \trim($aData['User']) : '',
					'Password' => isset($aData['Password']) ? $aData['Password'] : ''
				);
			}
		}

		return $mResult;
	}

	public function DoSaveContactsSyncData() : array
	{
		$oAccount = $this->getAccountFromToken();

		$oAddressBookProvider = $this->AddressBookProvider($oAccount);
		if (!$oAddressBookProvider || !$oAddressBookProvider->IsActive())
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$bEnabled = '1' === (string) $this->GetActionParam('Enable', '0');
		$sUrl = $this->GetActionParam('Url', '');
		$sUser = $this->GetActionParam('User', '');
		$sPassword = $this->GetActionParam('Password', '');

		$mData = $this->getContactsSyncData($oAccount);

		$bResult = $this->StorageProvider()->Put($oAccount,
			Providers\Storage\Enumerations\StorageType::CONFIG,
			'contacts_sync',
			Utils::EncodeKeyValues(array(
				'Enable' => $bEnabled,
				'User' => $sUser,
				'Password' => APP_DUMMY === $sPassword && isset($mData['Password']) ?
					$mData['Password'] : (APP_DUMMY === $sPassword ? '' : $sPassword),
				'Url' => $sUrl
			))
		);

		return $this->DefaultResponse(__FUNCTION__, $bResult);
	}

	public function DoContactsSync() : array
	{
		$bResult = false;
		$oAccount = $this->getAccountFromToken();

		$oAddressBookProvider = $this->AddressBookProvider($oAccount);
		if ($oAddressBookProvider && $oAddressBookProvider->IsActive())
		{
			$mData = $this->getContactsSyncData($oAccount);
			if (isset($mData['Enable'], $mData['User'], $mData['Password'], $mData['Url']) && $mData['Enable'])
			{
				$bResult = $oAddressBookProvider->Sync(
					$oAccount->ParentEmailHelper(),
					$mData['Url'], $mData['User'], $mData['Password']);
			}
		}

		if (!$bResult)
		{
			throw new Exceptions\ClientException(Notifications::ContactsSyncError);
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	private function getTwoFactorInfo(Model\Account $oAccount, bool $bRemoveSecret = false) : array
	{
		$sEmail = $oAccount->ParentEmailHelper();

		$mData = null;

		$aResult = array(
			'User' => '',
			'IsSet' => false,
			'Enable' => false,
			'Secret' => '',
			'UrlTitle' => '',
			'BackupCodes' => ''
		);

		if (!empty($sEmail))
		{
			$aResult['User'] = $sEmail;

			$sData = $this->StorageProvider()->Get($oAccount,
				Providers\Storage\Enumerations\StorageType::CONFIG,
				'two_factor'
			);

			if ($sData)
			{
				$mData = Utils::DecodeKeyValues($sData);
			}
		}

		if (!empty($aResult['User']) &&
			!empty($mData['User']) && !empty($mData['Secret']) &&
			!empty($mData['BackupCodes']) && $sEmail === $mData['User'])
		{
			$aResult['IsSet'] = true;
			$aResult['Enable'] = isset($mData['Enable']) ? !!$mData['Enable'] : false;
			$aResult['Secret'] = $mData['Secret'];
			$aResult['BackupCodes'] = $mData['BackupCodes'];
			$aResult['UrlTitle'] = $this->Config()->Get('webmail', 'title', '');
		}

		if ($bRemoveSecret)
		{
			if (isset($aResult['Secret']))
			{
				unset($aResult['Secret']);
			}

			if (isset($aResult['UrlTitle']))
			{
				unset($aResult['UrlTitle']);
			}

			if (isset($aResult['BackupCodes']))
			{
				unset($aResult['BackupCodes']);
			}
		}

		return $aResult;
	}

	private function removeBackupCodeFromTwoFactorInfo(Model\Account $oAccount, string $sCode) : bool
	{
		if (!$oAccount || empty($sCode))
		{
			return false;
		}

		$sData = $this->StorageProvider()->Get($oAccount,
			Providers\Storage\Enumerations\StorageType::CONFIG,
			'two_factor'
		);

		if ($sData)
		{
			$mData = Utils::DecodeKeyValues($sData);

			if (!empty($mData['BackupCodes']))
			{
				$sBackupCodes = \preg_replace('/[^\d]+/', ' ', ' '.$mData['BackupCodes'].' ');
				$sBackupCodes = \str_replace(' '.$sCode.' ', '', $sBackupCodes);

				$mData['BackupCodes'] = \trim(\preg_replace('/[^\d]+/', ' ', $sBackupCodes));

				return $this->StorageProvider()->Put($oAccount,
					Providers\Storage\Enumerations\StorageType::CONFIG,
					'two_factor',
					Utils::EncodeKeyValues($mData)
				);
			}
		}

		return false;
	}

	public function DoGetTwoFactorInfo() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->TwoFactorAuthProvider()->IsActive() ||
			!$this->GetCapa(false, false, Enumerations\Capa::TWO_FACTOR, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		return $this->DefaultResponse(__FUNCTION__,
			$this->getTwoFactorInfo($oAccount, true));
	}

	public function DoCreateTwoFactorSecret() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->TwoFactorAuthProvider()->IsActive() ||
			!$this->GetCapa(false, false, Enumerations\Capa::TWO_FACTOR, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$sEmail = $oAccount->ParentEmailHelper();

		$sSecret = $this->TwoFactorAuthProvider()->CreateSecret();

		$aCodes = array();
		for ($iIndex = 9; $iIndex > 0; $iIndex--)
		{
			$aCodes[] = \rand(100000000, 900000000);
		}

		$this->StorageProvider()->Put($oAccount,
			Providers\Storage\Enumerations\StorageType::CONFIG,
			'two_factor',
			Utils::EncodeKeyValues(array(
				'User' => $sEmail,
				'Enable' => false,
				'Secret' => $sSecret,
				'BackupCodes' => \implode(' ', $aCodes)
			))
		);

		$this->requestSleep();

		return $this->DefaultResponse(__FUNCTION__,
			$this->getTwoFactorInfo($oAccount));
	}

	public function DoShowTwoFactorSecret() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->TwoFactorAuthProvider()->IsActive() ||
			!$this->GetCapa(false, false, Enumerations\Capa::TWO_FACTOR, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$aResult = $this->getTwoFactorInfo($oAccount);
		unset($aResult['BackupCodes']);

		return $this->DefaultResponse(__FUNCTION__, $aResult);
	}

	public function DoEnableTwoFactor() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->TwoFactorAuthProvider()->IsActive() ||
			!$this->GetCapa(false, false, Enumerations\Capa::TWO_FACTOR, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$sEmail = $oAccount->ParentEmailHelper();

		$bResult = false;
		$mData = $this->getTwoFactorInfo($oAccount);
		if (isset($mData['Secret'], $mData['BackupCodes']))
		{
			$bResult = $this->StorageProvider()->Put($oAccount,
				Providers\Storage\Enumerations\StorageType::CONFIG,
				'two_factor',
				Utils::EncodeKeyValues(array(
					'User' => $sEmail,
					'Enable' => '1' === \trim($this->GetActionParam('Enable', '0')),
					'Secret' => $mData['Secret'],
					'BackupCodes' => $mData['BackupCodes']
				))
			);
		}

		return $this->DefaultResponse(__FUNCTION__, $bResult);
	}

	public function DoTestTwoFactorInfo() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->TwoFactorAuthProvider()->IsActive() ||
			!$this->GetCapa(false, false, Enumerations\Capa::TWO_FACTOR, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$sCode = \trim($this->GetActionParam('Code', ''));

		$aData = $this->getTwoFactorInfo($oAccount);
		$sSecret = !empty($aData['Secret']) ? $aData['Secret'] : '';

//		$this->Logger()->WriteDump(array(
//			$sCode, $sSecret, $aData,
//			$this->TwoFactorAuthProvider()->VerifyCode($sSecret, $sCode)
//		));

		$this->requestSleep();

		return $this->DefaultResponse(__FUNCTION__,
			$this->TwoFactorAuthProvider()->VerifyCode($sSecret, $sCode));
	}

	public function DoClearTwoFactorInfo() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->TwoFactorAuthProvider()->IsActive() ||
			!$this->GetCapa(false, false, Enumerations\Capa::TWO_FACTOR, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$this->StorageProvider()->Clear($oAccount,
			Providers\Storage\Enumerations\StorageType::CONFIG,
			'two_factor'
		);

		return $this->DefaultResponse(__FUNCTION__,
			$this->getTwoFactorInfo($oAccount, true));
	}

	public function DoContacts() : array
	{
		$oAccount = $this->getAccountFromToken();

		$sSearch = \trim($this->GetActionParam('Search', ''));
		$iOffset = (int) $this->GetActionParam('Offset', 0);
		$iLimit = (int) $this->GetActionParam('Limit', 20);
		$iOffset = 0 > $iOffset ? 0 : $iOffset;
		$iLimit = 0 > $iLimit ? 20 : $iLimit;

		$iResultCount = 0;
		$mResult = array();

		$oAbp = $this->AddressBookProvider($oAccount);
		if ($oAbp->IsActive())
		{
			$iResultCount = 0;
			$mResult = $oAbp->GetContacts($oAccount->ParentEmailHelper(),
				$iOffset, $iLimit, $sSearch, $iResultCount);
		}

		return $this->DefaultResponse(__FUNCTION__, array(
			'Offset' => $iOffset,
			'Limit' => $iLimit,
			'Count' => $iResultCount,
			'Search' => $sSearch,
			'List' => $mResult
		));
	}

	public function DoContactsDelete() : array
	{
		$oAccount = $this->getAccountFromToken();
		$aUids = \explode(',', (string) $this->GetActionParam('Uids', ''));

		$aFilteredUids = \array_filter($aUids, function (&$mUid) {
			$mUid = (int) \trim($mUid);
			return 0 < $mUid;
		});

		$bResult = false;
		if (0 < \count($aFilteredUids) && $this->AddressBookProvider($oAccount)->IsActive())
		{
			$bResult = $this->AddressBookProvider($oAccount)->DeleteContacts($oAccount->ParentEmailHelper(), $aFilteredUids);
		}

		return $this->DefaultResponse(__FUNCTION__, $bResult);
	}

	public function DoContactSave() : array
	{
		$oAccount = $this->getAccountFromToken();

		$bResult = false;

		$oAddressBookProvider = $this->AddressBookProvider($oAccount);
		$sRequestUid = \trim($this->GetActionParam('RequestUid', ''));
		if ($oAddressBookProvider && $oAddressBookProvider->IsActive() && 0 < \strlen($sRequestUid))
		{
			$sUid = \trim($this->GetActionParam('Uid', ''));

			$oContact = null;
			if (0 < \strlen($sUid))
			{
				$oContact = $oAddressBookProvider->GetContactByID($oAccount->ParentEmailHelper(), $sUid);
			}

			if (!$oContact)
			{
				$oContact = new Providers\AddressBook\Classes\Contact();
				if (0 < \strlen($sUid))
				{
					$oContact->IdContact = $sUid;
				}
			}

			$oContact->Properties = array();
			$aProperties = $this->GetActionParam('Properties', array());
			if (\is_array($aProperties))
			{
				foreach ($aProperties as $aItem)
				{
					if ($aItem && isset($aItem[0], $aItem[1]) && \is_numeric($aItem[0]))
					{
						$oProp = new Providers\AddressBook\Classes\Property();
						$oProp->Type = (int) $aItem[0];
						$oProp->Value = $aItem[1];
						$oProp->TypeStr = empty($aItem[2]) ? '': $aItem[2];

						$oContact->Properties[] = $oProp;
					}
				}
			}

			if (!empty($oContact->Etag))
			{
				$oContact->Etag = \md5($oContact->ToVCard());
			}

			$oContact->PopulateDisplayAndFullNameValue(true);

			$bResult = $oAddressBookProvider->ContactSave($oAccount->ParentEmailHelper(), $oContact);
		}

		return $this->DefaultResponse(__FUNCTION__, array(
			'RequestUid' => $sRequestUid,
			'ResultID' => $bResult ? $oContact->IdContact : '',
			'Result' => $bResult
		));
	}

	public function DoSuggestions() : array
	{
		$oAccount = $this->getAccountFromToken();

		$sQuery = \trim($this->GetActionParam('Query', ''));
		$iLimit = (int) $this->Config()->Get('contacts', 'suggestions_limit', 20);

		$aResult = array();

		$this->Plugins()->RunHook('ajax.suggestions-input-parameters', array(&$sQuery, &$iLimit, $oAccount));

		$iLimit = (int) $iLimit;
		if (5 > $iLimit)
		{
			$iLimit = 5;
		}

		$this->Plugins()->RunHook('ajax.suggestions-pre', array(&$aResult, $sQuery, $oAccount, $iLimit));

		if ($iLimit > \count($aResult) && 0 < \strlen($sQuery))
		{
			try
			{
				// Address Book
				$oAddressBookProvider = $this->AddressBookProvider($oAccount);
				if ($oAddressBookProvider && $oAddressBookProvider->IsActive())
				{
					$aSuggestions = $oAddressBookProvider->GetSuggestions($oAccount->ParentEmailHelper(), $sQuery, $iLimit);
					if (0 === \count($aResult))
					{
						$aResult = $aSuggestions;
					}
					else
					{
						$aResult = \array_merge($aResult, $aSuggestions);
					}
				}
			}
			catch (\Throwable $oException)
			{
				$this->Logger()->WriteException($oException);
			}
		}

		if ($iLimit > \count($aResult) && 0 < \strlen($sQuery))
		{
			$oSuggestionsProvider = $this->SuggestionsProvider();
			if ($oSuggestionsProvider && $oSuggestionsProvider->IsActive())
			{
				$aSuggestionsProviderResult = $oSuggestionsProvider->Process($oAccount, $sQuery, $iLimit);
				if (\is_array($aSuggestionsProviderResult) && 0 < \count($aSuggestionsProviderResult))
				{
					$aResult = \array_merge($aResult, $aSuggestionsProviderResult);
				}
			}

		}

		$aResult = Utils::RemoveSuggestionDuplicates($aResult);
		if ($iLimit < \count($aResult))
		{
			$aResult = \array_slice($aResult, 0, $iLimit);
		}

		$this->Plugins()->RunHook('ajax.suggestions-post', array(&$aResult, $sQuery, $oAccount, $iLimit));

		$aResult = Utils::RemoveSuggestionDuplicates($aResult);
		if ($iLimit < \count($aResult))
		{
			$aResult = \array_slice($aResult, 0, $iLimit);
		}

		return $this->DefaultResponse(__FUNCTION__, $aResult);
	}

	private function messageSetFlag(string $sActionFunction, string $sResponseFunction) : array
	{
		$this->initMailClientConnection();

		$sFolder = $this->GetActionParam('Folder', '');
		$bSetAction = '1' === (string) $this->GetActionParam('SetAction', '0');
		$aUids = \explode(',', (string) $this->GetActionParam('Uids', ''));
		$aFilteredUids = \array_filter($aUids, function (&$sUid) {
			$sUid = (int) \trim($sUid);
			return 0 < $sUid;
		});

		try
		{
			$this->MailClient()->{$sActionFunction}($sFolder, $aFilteredUids, true, $bSetAction, true);
		}
		catch (\Throwable $oException)
		{
			throw new Exceptions\ClientException(Notifications::MailServerError, $oException);
		}

		return $this->TrueResponse($sResponseFunction);
	}

	public function DoMessageSetSeen() : array
	{
		return $this->messageSetFlag('MessageSetSeen', __FUNCTION__);
	}

	public function DoMessageSetSeenToAll() : array
	{
		$this->initMailClientConnection();

		$sFolder = $this->GetActionParam('Folder', '');
		$bSetAction = '1' === (string) $this->GetActionParam('SetAction', '0');
		$sThreadUids = \trim($this->GetActionParam('ThreadUids', ''));

		try
		{
			$this->MailClient()->MessageSetSeenToAll($sFolder, $bSetAction,
				!empty($sThreadUids) ? explode(',', $sThreadUids) : null);
		}
		catch (\Throwable $oException)
		{
			throw new Exceptions\ClientException(Notifications::MailServerError, $oException);
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	public function DoMessageSetFlagged() : array
	{
		return $this->messageSetFlag('MessageSetFlagged', __FUNCTION__);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoMessage() : array
	{
		$sRawKey = (string) $this->GetActionParam('RawKey', '');

		$sFolder = '';
		$iUid = 0;

		$aValues = $this->getDecodedClientRawKeyValue($sRawKey, 4);
		if ($aValues && 4 === count($aValues))
		{
			$sFolder = (string) $aValues[0];
			$iUid = (int) $aValues[1];

			$this->verifyCacheByKey($sRawKey);
		}
		else
		{
			$sFolder = $this->GetActionParam('Folder', '');
			$iUid = (int) $this->GetActionParam('Uid', 0);
		}

		$oAccount = $this->initMailClientConnection();

		try
		{
			$oMessage = $this->MailClient()->Message($sFolder, $iUid, true,
				$this->cacherForThreads(),
				(int) $this->Config()->Get('labs', 'imap_body_text_limit', 0)
			);
		}
		catch (\Throwable $oException)
		{
			throw new Exceptions\ClientException(Notifications::CantGetMessage, $oException);
		}

		if ($oMessage)
		{
			$this->Plugins()->RunHook('filter.result-message', array($oMessage));

			$this->cacheByKey($sRawKey);
		}

		return $this->DefaultResponse(__FUNCTION__, $oMessage);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoMessageDelete() : array
	{
		$this->initMailClientConnection();

		$sFolder = $this->GetActionParam('Folder', '');
		$aUids = \explode(',', (string) $this->GetActionParam('Uids', ''));

		$aFilteredUids = \array_filter($aUids, function (&$sUid) {
			$sUid = (int) \trim($sUid);
			return 0 < $sUid;
		});

		try
		{
			$this->MailClient()->MessageDelete($sFolder, $aFilteredUids, true, true,
				!!$this->Config()->Get('labs', 'use_imap_expunge_all_on_delete', false));
		}
		catch (\Throwable $oException)
		{
			throw new Exceptions\ClientException(Notifications::CantDeleteMessage, $oException);
		}

		if ($this->Config()->Get('labs', 'use_imap_unselect', true))
		{
			try
			{
				$this->MailClient()->FolderUnSelect();
			}
			catch (\Throwable $oException)
			{
				unset($oException);
			}
		}

		$sHash = '';

		try
		{
			$sHash = $this->MailClient()->FolderHash($sFolder);
		}
		catch (\Throwable $oException)
		{
			unset($oException);
		}

		return $this->DefaultResponse(__FUNCTION__, '' === $sHash ? false : array($sFolder, $sHash));
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoMessageMove() : array
	{
		$this->initMailClientConnection();

		$sFromFolder = $this->GetActionParam('FromFolder', '');
		$sToFolder = $this->GetActionParam('ToFolder', '');
		$aUids = \explode(',', (string) $this->GetActionParam('Uids', ''));
		$bMarkAsRead = '1' === (string) $this->GetActionParam('MarkAsRead', '0');

		$aFilteredUids = \array_filter($aUids, function (&$mUid) {
			$mUid = (int) \trim($mUid);
			return 0 < $mUid;
		});

		if ($bMarkAsRead)
		{
			try
			{
				$this->MailClient()->MessageSetSeen($sFromFolder, $aFilteredUids, true, true);
			}
			catch (\Throwable $oException)
			{
				unset($oException);
			}
		}

		try
		{
			$this->MailClient()->MessageMove($sFromFolder, $sToFolder, $aFilteredUids, true,
				!!$this->Config()->Get('labs', 'use_imap_move', true),
				!!$this->Config()->Get('labs', 'use_imap_expunge_all_on_delete', false)
			);
		}
		catch (\Throwable $oException)
		{
			throw new Exceptions\ClientException(Notifications::CantMoveMessage, $oException);
		}

		if ($this->Config()->Get('labs', 'use_imap_unselect', true))
		{
			try
			{
				$this->MailClient()->FolderUnSelect();
			}
			catch (\Throwable $oException)
			{
				unset($oException);
			}
		}

		$sHash = '';

		try
		{
			$sHash = $this->MailClient()->FolderHash($sFromFolder);
		}
		catch (\Throwable $oException)
		{
			unset($oException);
		}

		return $this->DefaultResponse(__FUNCTION__, '' === $sHash ? false : array($sFromFolder, $sHash));
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoMessageCopy() : array
	{
		$this->initMailClientConnection();

		$sFromFolder = $this->GetActionParam('FromFolder', '');
		$sToFolder = $this->GetActionParam('ToFolder', '');
		$aUids = \explode(',', (string) $this->GetActionParam('Uids', ''));

		$aFilteredUids = \array_filter($aUids, function (&$mUid) {
			$mUid = (int) \trim($mUid);
			return 0 < $mUid;
		});

		try
		{
			$this->MailClient()->MessageCopy($sFromFolder, $sToFolder,
				$aFilteredUids, true);

			$sHash = $this->MailClient()->FolderHash($sFromFolder);
		}
		catch (\Throwable $oException)
		{
			throw new Exceptions\ClientException(Notifications::CantCopyMessage, $oException);
		}

		return $this->DefaultResponse(__FUNCTION__,
			'' === $sHash ? false : array($sFromFolder, $sHash));
	}

	public function MainClearFileName(string $sFileName, string $sContentType, string $sMimeIndex, int $iMaxLength = 250) : string
	{
		$sFileName = 0 === \strlen($sFileName) ? \preg_replace('/[^a-zA-Z0-9]/', '.', (empty($sMimeIndex) ? '' : $sMimeIndex.'.').$sContentType) : $sFileName;
		$sClearedFileName = \MailSo\Base\Utils::StripSpaces(\preg_replace('/[\.]+/', '.', $sFileName));
		$sExt = \MailSo\Base\Utils::GetFileExtension($sClearedFileName);

		if (10 < $iMaxLength && $iMaxLength < \strlen($sClearedFileName) - \strlen($sExt))
		{
			$sClearedFileName = \substr($sClearedFileName, 0, $iMaxLength).(empty($sExt) ? '' : '.'.$sExt);
		}

		return \MailSo\Base\Utils::ClearFileName(\MailSo\Base\Utils::Utf8Clear($sClearedFileName));
	}

	public function DoMessageUploadAttachments() : array
	{
		$oAccount = $this->initMailClientConnection();

		$mResult = false;
		$self = $this;

		try
		{
			$aAttachments = $this->GetActionParam('Attachments', array());
			if (\is_array($aAttachments) && 0 < \count($aAttachments))
			{
				$mResult = array();
				foreach ($aAttachments as $sAttachment)
				{
					if ($aValues = Utils::DecodeKeyValuesQ($sAttachment))
					{
						$sFolder = isset($aValues['Folder']) ? $aValues['Folder'] : '';
						$iUid = (int) isset($aValues['Uid']) ? $aValues['Uid'] : 0;
						$sMimeIndex = (string) isset($aValues['MimeIndex']) ? $aValues['MimeIndex'] : '';

						$sTempName = \md5($sAttachment);
						if (!$this->FilesProvider()->FileExists($oAccount, $sTempName))
						{
							$this->MailClient()->MessageMimeStream(
								function($rResource, $sContentType, $sFileName, $sMimeIndex = '') use ($oAccount, &$mResult, $sTempName, $sAttachment, $self) {
									if (is_resource($rResource))
									{
										$sContentType = (empty($sFileName)) ? 'text/plain' : \MailSo\Base\Utils::MimeContentType($sFileName);
										$sFileName = $self->MainClearFileName($sFileName, $sContentType, $sMimeIndex);

										if ($self->FilesProvider()->PutFile($oAccount, $sTempName, $rResource))
										{
											$mResult[$sTempName] = $sAttachment;
										}
									}
								}, $sFolder, $iUid, true, $sMimeIndex);
						}
						else
						{
							$mResult[$sTempName] = $sAttachment;
						}
					}
				}
			}
		}
		catch (\Throwable $oException)
		{
			throw new Exceptions\ClientException(Notifications::MailServerError, $oException);
		}

		return $this->DefaultResponse(__FUNCTION__, $mResult);
	}

	public function DoComposeUploadExternals() : array
	{
		$oAccount = $this->getAccountFromToken();

		$mResult = false;
		$aExternals = $this->GetActionParam('Externals', array());
		if (\is_array($aExternals) && 0 < \count($aExternals))
		{
			$oHttp = \MailSo\Base\Http::SingletonInstance();

			$mResult = array();
			foreach ($aExternals as $sUrl)
			{
				$mResult[$sUrl] = '';

				$sTempName = \md5($sUrl);

				$iCode = 0;
				$sContentType = '';

				$rFile = $this->FilesProvider()->GetFile($oAccount, $sTempName, 'wb+');
				if ($rFile && $oHttp->SaveUrlToFile($sUrl, $rFile, '', $sContentType, $iCode, $this->Logger(), 60,
						$this->Config()->Get('labs', 'curl_proxy', ''), $this->Config()->Get('labs', 'curl_proxy_auth', '')))
				{
					$mResult[$sUrl] = $sTempName;
				}

				if (\is_resource($rFile))
				{
					\fclose($rFile);
				}
			}
		}

		return $this->DefaultResponse(__FUNCTION__, $mResult);
	}

	private function getUploadErrorMessageByCode(int $iError, int &$iClientError) : string
	{
		$sError = '';
		$iClientError = UploadClientError::NORMAL;
		switch($iError)
		{
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

	public function Upload() : array
	{
		$oAccount = $this->getAccountFromToken();

		$aResponse = array();

		$aFile = $this->GetActionParam('File', null);
		$iError = $this->GetActionParam('Error', Enumerations\UploadError::UNKNOWN);

		if ($oAccount && UPLOAD_ERR_OK === $iError && \is_array($aFile))
		{
			$sSavedName = 'upload-post-'.\md5($aFile['name'].$aFile['tmp_name']);
			if (!$this->FilesProvider()->MoveUploadedFile($oAccount, $sSavedName, $aFile['tmp_name']))
			{
				$iError = Enumerations\UploadError::ON_SAVING;
			}
			else
			{
				$sUploadName = $aFile['name'];
				$iSize = $aFile['size'];
				$sMimeType = $aFile['type'];

				$aResponse['Attachment'] = array(
					'Name' => $sUploadName,
					'TempName' => $sSavedName,
					'MimeType' => $sMimeType,
					'Size' =>  (int) $iSize
				);
			}
		}

		if (UPLOAD_ERR_OK !== $iError)
		{
			$iClientError = Enumerations\UploadClientError::NORMAL;
			$sError = $this->getUploadErrorMessageByCode($iError, $iClientError);

			if (!empty($sError))
			{
				$aResponse['ErrorCode'] = $iClientError;
				$aResponse['Error'] = $sError;
			}
		}

		return $this->DefaultResponse(__FUNCTION__, $aResponse);
	}

	public function DoClearUserBackground() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, false, Enumerations\Capa::USER_BACKGROUND, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$oSettings = $this->SettingsProvider()->Load($oAccount);
		if ($oAccount && $oSettings)
		{
			$this->StorageProvider()->Clear($oAccount,
				Providers\Storage\Enumerations\StorageType::CONFIG,
				'background'
			);

			$oSettings->SetConf('UserBackgroundName', '');
			$oSettings->SetConf('UserBackgroundHash', '');
		}

		return $this->DefaultResponse(__FUNCTION__, $oAccount && $oSettings ?
			$this->SettingsProvider()->Save($oAccount, $oSettings) : false);
	}

	public function UploadBackground() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, false, Enumerations\Capa::USER_BACKGROUND, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$sName = '';
		$sHash = '';

		$aFile = $this->GetActionParam('File', null);
		$iError = $this->GetActionParam('Error', Enumerations\UploadError::UNKNOWN);

		if ($oAccount && UPLOAD_ERR_OK === $iError && \is_array($aFile))
		{
			$sMimeType = \strtolower(\MailSo\Base\Utils::MimeContentType($aFile['name']));
			if (\in_array($sMimeType, array('image/png', 'image/jpg', 'image/jpeg')))
			{
				$sSavedName = 'upload-post-'.\md5($aFile['name'].$aFile['tmp_name']);
				if (!$this->FilesProvider()->MoveUploadedFile($oAccount, $sSavedName, $aFile['tmp_name']))
				{
					$iError = Enumerations\UploadError::ON_SAVING;
				}
				else
				{
					$rData = $this->FilesProvider()->GetFile($oAccount, $sSavedName);
					if (\is_resource($rData))
					{
						$sData = \stream_get_contents($rData);
						if (!empty($sData) && 0 < \strlen($sData))
						{
							$sName = $aFile['name'];
							if (empty($sName))
							{
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
							))
							{
								$oSettings = $this->SettingsProvider()->Load($oAccount);
								if ($oSettings)
								{
									$sHash = \MailSo\Base\Utils::Md5Rand($sName.APP_VERSION.APP_SALT);

									$oSettings->SetConf('UserBackgroundName', $sName);
									$oSettings->SetConf('UserBackgroundHash', $sHash);
									$this->SettingsProvider()->Save($oAccount, $oSettings);
								}
							}
						}

						unset($sData);
					}

					if (\is_resource($rData))
					{
						\fclose($rData);
					}

					unset($rData);
				}

				$this->FilesProvider()->Clear($oAccount, $sSavedName);
			}
			else
			{
				$iError = Enumerations\UploadError::FILE_TYPE;
			}
		}

		if (UPLOAD_ERR_OK !== $iError)
		{
			$iClientError = Enumerations\UploadClientError::NORMAL;
			$sError = $this->getUploadErrorMessageByCode($iError, $iClientError);

			if (!empty($sError))
			{
				return $this->FalseResponse(__FUNCTION__, $iClientError, $sError);
			}
		}

		return $this->DefaultResponse(__FUNCTION__, !empty($sName) && !empty($sHash) ? array(
			'Name' => $sName,
			'Hash' => $sHash
		) : false);
	}

	public function UploadContacts() : array
	{
		$oAccount = $this->getAccountFromToken();

		$mResponse = false;

		$aFile = $this->GetActionParam('File', null);
		$iError = $this->GetActionParam('Error', Enumerations\UploadError::UNKNOWN);

		if ($oAccount && UPLOAD_ERR_OK === $iError && \is_array($aFile))
		{
			$sSavedName = 'upload-post-'.\md5($aFile['name'].$aFile['tmp_name']);
			if (!$this->FilesProvider()->MoveUploadedFile($oAccount, $sSavedName, $aFile['tmp_name']))
			{
				$iError = Enumerations\UploadError::ON_SAVING;
			}
			else
			{
				\ini_set('auto_detect_line_endings', true);
				$mData = $this->FilesProvider()->GetFile($oAccount, $sSavedName);
				if ($mData)
				{
					$sFileStart = \fread($mData, 20);
					\rewind($mData);

					if (false !== $sFileStart)
					{
						$sFileStart = \trim($sFileStart);
						if (false !== \strpos($sFileStart, 'BEGIN:VCARD'))
						{
							$mResponse = $this->importContactsFromVcfFile($oAccount, $mData);
						}
						else if (false !== \strpos($sFileStart, ',') || false !== \strpos($sFileStart, ';'))
						{
							$mResponse = $this->importContactsFromCsvFile($oAccount, $mData, $sFileStart);
						}
					}
				}

				if (\is_resource($mData))
				{
					\fclose($mData);
				}

				unset($mData);
				$this->FilesProvider()->Clear($oAccount, $sSavedName);

				\ini_set('auto_detect_line_endings', false);
			}
		}

		if (UPLOAD_ERR_OK !== $iError)
		{
			$iClientError = Enumerations\UploadClientError::NORMAL;
			$sError = $this->getUploadErrorMessageByCode($iError, $iClientError);

			if (!empty($sError))
			{
				return $this->FalseResponse(__FUNCTION__, $iClientError, $sError);
			}
		}

		return $this->DefaultResponse(__FUNCTION__, $mResponse);
	}

	private function importContactsFromCsvFile(Model\Account $oAccount, /*resource*/ $rFile, string $sFileStart) : int
	{
		$iCount = 0;
		$aHeaders = null;
		$aData = array();

		if ($oAccount && \is_resource($rFile))
		{
			$oAddressBookProvider = $this->AddressBookProvider($oAccount);
			if ($oAddressBookProvider && $oAddressBookProvider->IsActive())
			{
				$sDelimiter = ((int) \strpos($sFileStart, ',') > (int) \strpos($sFileStart, ';')) ? ',' : ';';

				\setlocale(LC_CTYPE, 'en_US.UTF-8');
				while (false !== ($mRow = \fgetcsv($rFile, 5000, $sDelimiter, '"')))
				{
					if (null === $aHeaders)
					{
						if (3 >= \count($mRow))
						{
							return 0;
						}

						$aHeaders = $mRow;

						foreach ($aHeaders as $iIndex => $sHeaderValue)
						{
							$aHeaders[$iIndex] = \MailSo\Base\Utils::Utf8Clear($sHeaderValue);
						}
					}
					else
					{
						$aNewItem = array();
						foreach ($aHeaders as $iIndex => $sHeaderValue)
						{
							$aNewItem[$sHeaderValue] = isset($mRow[$iIndex]) ? $mRow[$iIndex] : '';
						}

						$aData[] = $aNewItem;
					}
				}

				if (0 < \count($aData))
				{
					$this->Logger()->Write('Import contacts from csv');
					$iCount = $oAddressBookProvider->ImportCsvArray($oAccount->ParentEmailHelper(), $aData);
				}
			}
		}

		return $iCount;
	}

	private function importContactsFromVcfFile(Model\Account $oAccount, /*resource*/ $rFile) : int
	{
		$iCount = 0;
		if ($oAccount && \is_resource($rFile))
		{
			$oAddressBookProvider = $this->AddressBookProvider($oAccount);
			if ($oAddressBookProvider && $oAddressBookProvider->IsActive())
			{
				$sFile = \stream_get_contents($rFile);
				if (\is_resource($rFile))
				{
					\fclose($rFile);
				}

				if (is_string($sFile) && 5 < \strlen($sFile))
				{
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
	public function RawViewAsPlain() : bool
	{
		$this->initMailClientConnection();

		$sRawKey = (string) $this->GetActionParam('RawKey', '');
		$aValues = $this->getDecodedRawKeyValue($sRawKey);

		$sFolder = isset($aValues['Folder']) ? $aValues['Folder'] : '';
		$iUid = (int) (isset($aValues['Uid']) ? $aValues['Uid'] : 0);
		$sMimeIndex = (string) (isset($aValues['MimeIndex']) ? $aValues['MimeIndex'] : '');

		\header('Content-Type: text/plain', true);

		return $this->MailClient()->MessageMimeStream(function ($rResource) {
			if (\is_resource($rResource))
			{
				\MailSo\Base\Utils::FpassthruWithTimeLimitReset($rResource);
			}
		}, $sFolder, $iUid, true, $sMimeIndex);
	}

	public function RawFramedView() : string
	{
		$oAccount = $this->getAccountFromToken(false);
		if ($oAccount)
		{
			$sRawKey = (string) $this->GetActionParam('RawKey', '');
			$aParams = $this->GetActionParam('Params', null);
			$this->Http()->ServerNoCache();

			$aData = Utils::DecodeKeyValuesQ($sRawKey);
			if (isset($aParams[0], $aParams[1], $aParams[2]) &&
				'Raw' === $aParams[0] && 'FramedView' === $aParams[2] && isset($aData['Framed']) && $aData['Framed'] && $aData['FileName'])
			{
				if ($this->isFileHasFramedPreview($aData['FileName']))
				{
					$sNewSpecAuthToken = $this->GetShortLifeSpecAuthToken();
					if (!empty($sNewSpecAuthToken))
					{
						$aParams[1] = '_'.$sNewSpecAuthToken;
						$aParams[2] = 'View';

						\array_shift($aParams);
						$sLast = \array_pop($aParams);

						$sUrl = $this->Http()->GetFullUrl().'?/Raw/&q[]=/'.\implode('/', $aParams).'/&q[]=/'.$sLast;
						$sFullUrl = 'https://docs.google.com/viewer?embedded=true&url='.\urlencode($sUrl);

						\header('Content-Type: text/html; charset=utf-8');
						echo '<html style="height: 100%; width: 100%; margin: 0; padding: 0"><head></head>'.
							'<body style="height: 100%; width: 100%; margin: 0; padding: 0">'.
							'<iframe style="height: 100%; width: 100%; margin: 0; padding: 0; border: 0" src="'.$sFullUrl.'"></iframe>'.
							'</body></html>';
					}
				}
			}
		}


		return true;

	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function Append() : bool
	{
		$oAccount = $this->initMailClientConnection();

		$sFolderFullNameRaw = $this->GetActionParam('Folder', '');

		$_FILES = isset($_FILES) ? $_FILES : null;
		if ($oAccount instanceof Model\Account &&
			$this->Config()->Get('labs', 'allow_message_append', false) &&
			isset($_FILES, $_FILES['AppendFile'], $_FILES['AppendFile']['name'],
				$_FILES['AppendFile']['tmp_name'], $_FILES['AppendFile']['size']))
		{
			if (is_string($_FILES['AppendFile']['tmp_name']) && 0 < strlen($_FILES['AppendFile']['tmp_name']))
			{
				if (\UPLOAD_ERR_OK === (int) $_FILES['AppendFile']['error'] && !empty($sFolderFullNameRaw))
				{
					$sSavedName = 'append-post-'.md5($sFolderFullNameRaw.$_FILES['AppendFile']['name'].$_FILES['AppendFile']['tmp_name']);

					if ($this->FilesProvider()->MoveUploadedFile($oAccount,
						$sSavedName, $_FILES['AppendFile']['tmp_name']))
					{
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

	public function Capa(bool $bAdmin, bool $bMobile = false, ?Model\Account $oAccount = null) : array
	{
		$oConfig = $this->Config();

		$aResult = array();

		if ($oConfig->Get('capa', 'folders', true))
		{
			$aResult[] = Enumerations\Capa::FOLDERS;

			if ($oConfig->Get('capa', 'messagelist_actions', true))
			{
				$aResult[] = Enumerations\Capa::MESSAGELIST_ACTIONS;

				if ($oConfig->Get('capa', 'dangerous_actions', true))
				{
					$aResult[] = Enumerations\Capa::DANGEROUS_ACTIONS;
				}
			}
		}

		if ($oConfig->Get('capa', 'reload', true))
		{
			$aResult[] = Enumerations\Capa::RELOAD;
		}

		if ($oConfig->Get('capa', 'quota', true))
		{
			$aResult[] = Enumerations\Capa::QUOTA;
		}

		if ($oConfig->Get('capa', 'settings', true))
		{
			$aResult[] = Enumerations\Capa::SETTINGS;

			if ($oConfig->Get('webmail', 'allow_additional_accounts', false))
			{
				$aResult[] = Enumerations\Capa::ADDITIONAL_ACCOUNTS;
			}

			if ($oConfig->Get('webmail', 'allow_additional_identities', false))
			{
				$aResult[] = Enumerations\Capa::IDENTITIES;
			}

			if ($oConfig->Get('capa', 'x-templates', true) && !$bMobile)
			{
				$aResult[] = Enumerations\Capa::TEMPLATES;
			}

			if ($oConfig->Get('webmail', 'allow_themes', false) && !$bMobile)
			{
				$aResult[] = Enumerations\Capa::THEMES;
			}

			if ($oConfig->Get('webmail', 'allow_user_background', false) && !$bMobile)
			{
				$aResult[] = Enumerations\Capa::USER_BACKGROUND;
			}

			if ($oConfig->Get('security', 'openpgp', false) && !$bMobile)
			{
				$aResult[] = Enumerations\Capa::OPEN_PGP;
			}

			if ($oConfig->Get('capa', 'filters', false))
			{
				$aResult[] = Enumerations\Capa::FILTERS;
				if ($bAdmin || ($oAccount && $oAccount->Domain()->UseSieve()))
				{
					$aResult[] = Enumerations\Capa::SIEVE;
				}
			}
		}

		if ($oConfig->Get('security', 'allow_two_factor_auth', false) &&
			($bAdmin || ($oAccount && !$oAccount->IsAdditionalAccount())))
		{
			$aResult[] = Enumerations\Capa::TWO_FACTOR;

			if ($oConfig->Get('security', 'force_two_factor_auth', false) &&
				($bAdmin || ($oAccount && !$oAccount->IsAdditionalAccount())))
			{
				$aResult[] = Enumerations\Capa::TWO_FACTOR_FORCE;
			}
		}

		if ($oConfig->Get('capa', 'help', true) && !$bMobile)
		{
			$aResult[] = Enumerations\Capa::HELP;
		}

		if ($oConfig->Get('capa', 'attachments_actions', false))
		{
			$aResult[] = Enumerations\Capa::ATTACHMENTS_ACTIONS;
		}

		if ($oConfig->Get('capa', 'message_actions', true))
		{
			$aResult[] = Enumerations\Capa::MESSAGE_ACTIONS;
		}

		if ($oConfig->Get('capa', 'composer', true))
		{
			$aResult[] = Enumerations\Capa::COMPOSER;

			if ($oConfig->Get('capa', 'contacts', true))
			{
				$aResult[] = Enumerations\Capa::CONTACTS;
			}
		}

		if ($oConfig->Get('capa', 'search', true))
		{
			$aResult[] = Enumerations\Capa::SEARCH;

			if ($oConfig->Get('capa', 'search_adv', true) && !$bMobile)
			{
				$aResult[] = Enumerations\Capa::SEARCH_ADV;
			}
		}

		if ($oConfig->Get('interface', 'show_attachment_thumbnail', true))
		{
			$aResult[] = Enumerations\Capa::ATTACHMENT_THUMBNAILS;
		}

		if ($oConfig->Get('labs', 'allow_prefetch', false) && !$bMobile)
		{
			$aResult[] = Enumerations\Capa::PREFETCH;
		}

		$aResult[] = Enumerations\Capa::AUTOLOGOUT;

		return $aResult;
	}

	public function GetCapa(bool $bAdmin, bool $bMobile, string $sName, ?Model\Account $oAccount = null) : bool
	{
		return \in_array($sName, $this->Capa($bAdmin, $bMobile, $oAccount));
	}

	public function etag(string $sKey) : string
	{
		return \md5('Etag:'.\md5($sKey.\md5($this->Config()->Get('cache', 'index', ''))));
	}

	public function cacheByKey(string $sKey, bool $bForce = false) : bool
	{
		$bResult = false;
		if (!empty($sKey) && ($bForce || ($this->Config()->Get('cache', 'enable', true) && $this->Config()->Get('cache', 'http', true))))
		{
			$iExpires = $this->Config()->Get('cache', 'http_expires', 3600);
			if (0 < $iExpires)
			{
				$this->oHttp->ServerUseCache($this->etag($sKey), 1382478804, \time() + $iExpires);
				$bResult = true;
			}
		}

		if (!$bResult)
		{
			$this->oHttp->ServerNoCache();
		}

		return $bResult;
	}

	public function verifyCacheByKey(string $sKey, bool $bForce = false) : void
	{
		if (!empty($sKey) && ($bForce || $this->Config()->Get('cache', 'enable', true) && $this->Config()->Get('cache', 'http', true)))
		{
			$sIfNoneMatch = $this->Http()->GetHeader('If-None-Match', '');
			if ($this->etag($sKey) === $sIfNoneMatch)
			{
				$this->Http()->StatusHeader(304);
				$this->cacheByKey($sKey);
				exit(0);
			}
		}
	}

	private function getMimeFileByHash(Model\Account $oAccount, string $sHash) : array
	{
		$aValues = $this->getDecodedRawKeyValue($sHash);

		$sFolder = isset($aValues['Folder']) ? $aValues['Folder'] : '';
		$iUid = (int) isset($aValues['Uid']) ? $aValues['Uid'] : 0;
		$sMimeIndex = (string) isset($aValues['MimeIndex']) ? $aValues['MimeIndex'] : '';

		$sContentTypeIn = (string) isset($aValues['MimeType']) ? $aValues['MimeType'] : '';
		$sFileNameIn = (string) isset($aValues['FileName']) ? $aValues['FileName'] : '';

		$oFileProvider = $this->FilesProvider();

		$sResultHash = '';

		$mResult = $this->MailClient()->MessageMimeStream(function($rResource, $sContentType, $sFileName, $sMimeIndex = '')
			use ($oAccount, $oFileProvider, $sFileNameIn, $sContentTypeIn, &$sResultHash) {

				unset($sContentType, $sFileName, $sMimeIndex);

				if ($oAccount && \is_resource($rResource))
				{
					$sHash = \MailSo\Base\Utils::Md5Rand($sFileNameIn.'~'.$sContentTypeIn);
					$rTempResource = $oFileProvider->GetFile($oAccount, $sHash, 'wb+');

					if (\is_resource($rTempResource))
					{
						if (false !== \MailSo\Base\Utils::MultipleStreamWriter($rResource, array($rTempResource)))
						{
							$sResultHash = $sHash;
						}

						\fclose($rTempResource);
					}
				}

			}, $sFolder, $iUid, true, $sMimeIndex);

		$aValues['FileHash'] = '';
		if ($mResult)
		{
			$aValues['FileHash'] = $sResultHash;
		}

		return $aValues;
	}

	private function rotateImageByOrientation(\Imagine\Image\AbstractImage $oImage, int $iOrientation) : void
	{
		if (0 < $iOrientation)
		{
			switch ($iOrientation)
			{
				default:
				case 1:
					break;

				case 2: // flip horizontal
					$oImage->flipHorizontally();
					break;

				case 3: // rotate 180
					$oImage->rotate(180);
					break;

				case 4: // flip vertical
					$oImage->flipVertically();
					break;

				case 5: // vertical flip + 90 rotate
					$oImage->flipVertically();
					$oImage->rotate(90);
					break;

				case 6: // rotate 90
					$oImage->rotate(90);
					break;

				case 7: // horizontal flip + 90 rotate
					$oImage->flipHorizontally();
					$oImage->rotate(90);
					break;

				case 8: // rotate 270
					$oImage->rotate(270);
					break;
			}
		}
	}

	public function correctImageOrientation(\Imagine\Image\AbstractImage $oImage, bool $bDetectImageOrientation = true, int $iThumbnailBoxSize = 0) : \Imagine\Image\AbstractImage
	{
		$iOrientation = 1;
		if ($bDetectImageOrientation && \MailSo\Base\Utils::FunctionExistsAndEnabled('exif_read_data') &&
			\MailSo\Base\Utils::FunctionExistsAndEnabled('gd_info'))
		{
			$oMetadata = $oImage->metadata(new \Imagine\Image\Metadata\ExifMetadataReader());
			$iOrientation = isset($oMetadata['ifd0.Orientation']) &&
				is_numeric($oMetadata['ifd0.Orientation']) ? (int) $oMetadata['ifd0.Orientation'] : 1;
		}

		if (0 < $iThumbnailBoxSize)
		{
			$oImage = $oImage->thumbnail(
				new \Imagine\Image\Box($iThumbnailBoxSize, $iThumbnailBoxSize),
				\Imagine\Image\ImageInterface::THUMBNAIL_OUTBOUND);

			$this->rotateImageByOrientation($oImage, $iOrientation);
		}
		else
		{
			$this->rotateImageByOrientation($oImage, $iOrientation);
		}

		return $oImage;
	}

	private function rawSmart(bool $bDownload, bool $bThumbnail = false) : bool
	{
		$sRawKey = (string) $this->GetActionParam('RawKey', '');
		$aValues = $this->getDecodedRawKeyValue($sRawKey);

		$sRange = $this->Http()->GetHeader('Range');

		$aMatch = array();
		$sRangeStart = $sRangeEnd = '';
		$bIsRangeRequest = false;

		if (!empty($sRange) && 'bytes=0-' !== \strtolower($sRange) && \preg_match('/^bytes=([0-9]+)-([0-9]*)/i', \trim($sRange), $aMatch))
		{
			$sRangeStart = $aMatch[1];
			$sRangeEnd = $aMatch[2];

			$bIsRangeRequest = true;
		}

		$sFolder = isset($aValues['Folder']) ? $aValues['Folder'] : '';
		$iUid = isset($aValues['Uid']) ? (int) $aValues['Uid'] : 0;
		$sMimeIndex = isset($aValues['MimeIndex']) ? (string) $aValues['MimeIndex'] : '';

		$sContentTypeIn = isset($aValues['MimeType']) ? (string) $aValues['MimeType'] : '';
		$sFileNameIn = isset($aValues['FileName']) ? (string) $aValues['FileName'] : '';
		$sFileHashIn = isset($aValues['FileHash']) ? (string) $aValues['FileHash'] : '';

		$bDetectImageOrientation = !!$this->Config()->Get('labs', 'detect_image_exif_orientation', true);

		if (!empty($sFileHashIn))
		{
			$this->verifyCacheByKey($sRawKey);

			$oAccount = $this->getAccountFromToken();

			$sContentTypeOut = empty($sContentTypeIn) ?
				\MailSo\Base\Utils::MimeContentType($sFileNameIn) : $sContentTypeIn;

			$sFileNameOut = $this->MainClearFileName($sFileNameIn, $sContentTypeIn, $sMimeIndex);

			$rResource = $this->FilesProvider()->GetFile($oAccount, $sFileHashIn);
			if (\is_resource($rResource))
			{
				\header('Content-Type: '.$sContentTypeOut);
				\header('Content-Disposition: attachment; '.
					\trim(\MailSo\Base\Utils::EncodeHeaderUtf8AttributeValue('filename', $sFileNameOut)), true);

				\header('Accept-Ranges: none', true);
				\header('Content-Transfer-Encoding: binary');

				\MailSo\Base\Utils::FpassthruWithTimeLimitReset($rResource);
				return true;
			}

			return false;
		}
		else
		{
			if (!empty($sFolder) && 0 < $iUid)
			{
				$this->verifyCacheByKey($sRawKey);
			}
		}

		$oAccount = $this->initMailClientConnection();

		$self = $this;
		return $this->MailClient()->MessageMimeStream(
			function($rResource, $sContentType, $sFileName, $sMimeIndex = '') use (
				$self, $oAccount, $sRawKey, $sContentTypeIn, $sFileNameIn, $bDownload, $bThumbnail, $bDetectImageOrientation,
				$bIsRangeRequest, $sRangeStart, $sRangeEnd
			) {
				if ($oAccount && \is_resource($rResource))
				{
					\MailSo\Base\Utils::ResetTimeLimit();

					$sContentTypeOut = $sContentTypeIn;
					if (empty($sContentTypeOut))
					{
						$sContentTypeOut = $sContentType;
						if (empty($sContentTypeOut))
						{
							$sContentTypeOut = (empty($sFileName)) ? 'text/plain' : \MailSo\Base\Utils::MimeContentType($sFileName);
						}
					}

					$sFileNameOut = $sFileNameIn;
					if (empty($sFileNameOut))
					{
						$sFileNameOut = $sFileName;
					}

					$sFileNameOut = $self->MainClearFileName($sFileNameOut, $sContentTypeOut, $sMimeIndex);

					$self->cacheByKey($sRawKey);

					$sLoadedData = null;
					if (!$bDownload)
					{
						if ($bThumbnail)
						{
							try
							{
								$oImagine = new \Imagine\Gd\Imagine();

								$oImage = $oImagine->load(\stream_get_contents($rResource));

								$oImage = $self->correctImageOrientation($oImage, $bDetectImageOrientation, 60);

								\header('Content-Disposition: inline; '.
									\trim(\MailSo\Base\Utils::EncodeHeaderUtf8AttributeValue('filename', $sFileNameOut.'_thumb60x60.png')), true);

								$oImage->show('png');
							}
							catch (\Throwable $oException)
							{
								$self->Logger()->WriteExceptionShort($oException);
							}
						}
						else if ($bDetectImageOrientation &&
							\in_array($sContentTypeOut, array('image/png', 'image/jpeg', 'image/jpg')) &&
							\MailSo\Base\Utils::FunctionExistsAndEnabled('gd_info'))
						{
							try
							{
								$oImagine = new \Imagine\Gd\Imagine();

								$sLoadedData = \stream_get_contents($rResource);

								$oImage = $oImagine->load($sLoadedData);

								$oImage = $self->correctImageOrientation($oImage, $bDetectImageOrientation);

								\header('Content-Disposition: inline; '.
									\trim(\MailSo\Base\Utils::EncodeHeaderUtf8AttributeValue('filename', $sFileNameOut)), true);

								$oImage->show($sContentTypeOut === 'image/png' ? 'png' : 'jpg');
							}
							catch (\Throwable $oException)
							{
								$self->Logger()->WriteExceptionShort($oException);
							}
						}
						else
						{
							$sLoadedData = \stream_get_contents($rResource);
						}
					}

					if ($bDownload || $sLoadedData)
					{
						if (!headers_sent()) {
							\header('Content-Type: '.$sContentTypeOut);
							\header('Content-Disposition: '.($bDownload ? 'attachment' : 'inline').'; '.
							\trim(\MailSo\Base\Utils::EncodeHeaderUtf8AttributeValue('filename', $sFileNameOut)), true);

							\header('Accept-Ranges: bytes');
							\header('Content-Transfer-Encoding: binary');
						}

						if ($bIsRangeRequest && !$sLoadedData)
						{
							$sLoadedData = \stream_get_contents($rResource);
						}

						\MailSo\Base\Utils::ResetTimeLimit();

						if ($sLoadedData)
						{
							if ($bIsRangeRequest && (0 < \strlen($sRangeStart) || 0 < \strlen($sRangeEnd)))
							{
								$iFullContentLength = \strlen($sLoadedData);

								$self->Http()->StatusHeader(206);

								$iRangeStart = (int) $sRangeStart;
								$iRangeEnd = (int) $sRangeEnd;

								if ('' === $sRangeEnd)
								{
									$sLoadedData = 0 < $iRangeStart ? \substr($sLoadedData, $iRangeStart) : $sLoadedData;
								}
								else
								{
									if ($iRangeStart < $iRangeEnd)
									{
										$sLoadedData = \substr($sLoadedData, $iRangeStart, $iRangeEnd - $iRangeStart);
									}
									else
									{
										$sLoadedData = 0 < $iRangeStart ? \substr($sLoadedData, $iRangeStart) : $sLoadedData;
									}
								}

								$iContentLength = \strlen($sLoadedData);

								if (0 < $iContentLength)
								{
									\header('Content-Length: '.$iContentLength, true);
									\header('Content-Range: bytes '.$sRangeStart.'-'.(0 < $iRangeEnd ? $iRangeEnd : $iFullContentLength - 1).'/'.$iFullContentLength);
								}

								echo $sLoadedData;
							}
							else
							{
								echo $sLoadedData;
							}

							unset($sLoadedData);
						}
						else
						{
							\MailSo\Base\Utils::FpassthruWithTimeLimitReset($rResource);
						}
					}
				}
			}, $sFolder, $iUid, true, $sMimeIndex);
	}

	public function RawDownload() : bool
	{
		return $this->rawSmart(true);
	}

	public function RawView() : bool
	{
		return $this->rawSmart(false);
	}

	public function RawViewThumbnail() : bool
	{
		return $this->rawSmart(false, true);
	}

	public function RawUserBackground() : bool
	{
		$sRawKey = (string) $this->GetActionParam('RawKey', '');
		$this->verifyCacheByKey($sRawKey);

		$oAccount = $this->getAccountFromToken();

		$sData = $this->StorageProvider()->Get($oAccount,
			Providers\Storage\Enumerations\StorageType::CONFIG,
			'background'
		);

		if (!empty($sData))
		{
			$aData = \json_decode($sData, true);
			unset($sData);

			if (!empty($aData['ContentType']) && !empty($aData['Raw']) &&
				\in_array($aData['ContentType'], array('image/png', 'image/jpg', 'image/jpeg')))
			{
				$this->cacheByKey($sRawKey);

				\header('Content-Type: '.$aData['ContentType']);
				echo \base64_decode($aData['Raw']);
				unset($aData);

				return true;
			}
		}

		return false;
	}

	public function RawPublic() : bool
	{
		$sRawKey = (string) $this->GetActionParam('RawKey', '');
		$this->verifyCacheByKey($sRawKey);

		$sHash = $sRawKey;
		$sData = '';

		if (!empty($sHash))
		{
			$sData = $this->StorageProvider()->Get(null,
				Providers\Storage\Enumerations\StorageType::NOBODY,
				KeyPathHelper::PublicFile($sHash)
			);
		}

		$aMatch = array();
		if (!empty($sData) && 0 === \strpos($sData, 'data:') &&
			\preg_match('/^data:([^:]+):/', $sData, $aMatch) && !empty($aMatch[1]))
		{
			$sContentType = \trim($aMatch[1]);
			if (\in_array($sContentType, array('image/png', 'image/jpg', 'image/jpeg')))
			{
				$this->cacheByKey($sRawKey);

				\header('Content-Type: '.$sContentType);
				echo \preg_replace('/^data:[^:]+:/', '', $sData);
				unset($sData);

				return true;
			}
		}

		return false;
	}

	public function isFileHasFramedPreview(string $sFileName) : bool
	{
		$sExt = \MailSo\Base\Utils::GetFileExtension($sFileName);
		return \in_array($sExt, array('doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'));
	}

	public function isFileHasThumbnail(string $sFileName) : bool
	{
		static $aCache = array();

		$sExt = \MailSo\Base\Utils::GetFileExtension($sFileName);
		if (isset($aCache[$sExt]))
		{
			return $aCache[$sExt];
		}

		$bResult = \function_exists('gd_info');
		if ($bResult)
		{
			$bResult = false;
			switch ($sExt)
			{
				case 'png':
					$bResult = \function_exists('imagecreatefrompng');
					break;
				case 'gif':
					$bResult = \function_exists('imagecreatefromgif');
					break;
				case 'jpg':
				case 'jpeg':
					$bResult = \function_exists('imagecreatefromjpeg');
					break;
			}
		}

		$aCache[$sExt] = $bResult;

		return $bResult;
	}

	public function RawContactsVcf() : bool
	{
		$oAccount = $this->getAccountFromToken();

		\header('Content-Type: text/x-vcard; charset=UTF-8');
		\header('Content-Disposition: attachment; filename="contacts.vcf"', true);
		\header('Accept-Ranges: none', true);
		\header('Content-Transfer-Encoding: binary');

		$this->oHttp->ServerNoCache();

		return $this->AddressBookProvider($oAccount)->IsActive() ?
			$this->AddressBookProvider($oAccount)->Export($oAccount->ParentEmailHelper(), 'vcf') : false;
	}

	public function RawContactsCsv() : bool
	{
		$oAccount = $this->getAccountFromToken();

		\header('Content-Type: text/csv; charset=UTF-8');
		\header('Content-Disposition: attachment; filename="contacts.csv"', true);
		\header('Accept-Ranges: none', true);
		\header('Content-Transfer-Encoding: binary');

		$this->oHttp->ServerNoCache();

		return $this->AddressBookProvider($oAccount)->IsActive() ?
			$this->AddressBookProvider($oAccount)->Export($oAccount->ParentEmailHelper(), 'csv') : false;
	}

	private function initMailClientConnection() : ?Model\Account
	{
		$oAccount = null;

		if (!$this->MailClient()->IsLoggined())
		{
			$oAccount = $this->getAccountFromToken();

			try
			{
				$oAccount->IncConnectAndLoginHelper($this->Plugins(), $this->MailClient(), $this->Config());
			}
			catch (\MailSo\Net\Exceptions\ConnectionException $oException)
			{
				throw new Exceptions\ClientException(Notifications::ConnectionError, $oException);
			}
			catch (\Throwable $oException)
			{
				throw new Exceptions\ClientException(Notifications::AuthError, $oException);
			}

			$this->MailClient()->ImapClient()->__FORCE_SELECT_ON_EXAMINE__ = !!$this->Config()->Get('labs', 'use_imap_force_selection');
		}

		return $oAccount;
	}

	private function getDecodedRawKeyValue(string $sRawKey) : array
	{
		return empty($sRawKey) ? array() : Utils::DecodeKeyValuesQ($sRawKey);
	}

	private function getDecodedClientRawKeyValue(string $sRawKey, ?int $iLenCache = null) : ?array
	{
		if (!empty($sRawKey))
		{
			$sRawKey = \MailSo\Base\Utils::UrlSafeBase64Decode($sRawKey);
			$aValues = explode("\x0", $sRawKey);

			if (null === $iLenCache || $iLenCache  === count($aValues))
			{
				return $aValues;
			}
		}

		return null;
	}

	public function StaticCache() : string
	{
		static $sCache = null;
		if (!$sCache)
		{
			$sCache = \md5(APP_VERSION.$this->Plugins()->Hash());
		}
		return $sCache;
	}

	public function ThemeLink(string $sTheme, bool $bAdmin) : string
	{
		return './?/Css/0/'.($bAdmin ? 'Admin' : 'User').'/-/'.$sTheme.'/-/'.$this->StaticCache().'/Hash/-/';
	}

	public function ValidateTheme(string $sTheme, bool $bMobile = false) : string
	{
		if ($bMobile)
		{
			return 'Mobile';
		}

		return \in_array($sTheme, $this->GetThemes($bMobile)) ?
			$sTheme : $this->Config()->Get('themes', 'default', $bMobile ? 'Mobile' : 'Default');
	}

	public function ValidateLanguage(string $sLanguage, string $sDefault = '', bool $bAdmin = false, bool $bAllowEmptyResult = false) : string
	{
		$sResult = '';
		$aLang = $this->GetLanguages($bAdmin);

		$aHelper = array('en' => 'en_us', 'ar' => 'ar_sa', 'cs' => 'cs_cz', 'no' => 'nb_no', 'ua' => 'uk_ua',
			'cn' => 'zh_cn', 'zh' => 'zh_cn', 'tw' => 'zh_tw', 'fa' => 'fa_ir');

		$sLanguage = isset($aHelper[$sLanguage]) ? $aHelper[$sLanguage] : $sLanguage;
		$sDefault = isset($aHelper[$sDefault]) ? $aHelper[$sDefault] : $sDefault;

		$sLanguage = \strtolower(\str_replace('-', '_', $sLanguage));
		if (2 === strlen($sLanguage))
		{
			$sLanguage = $sLanguage.'_'.$sLanguage;
		}

		$sDefault = \strtolower(\str_replace('-', '_', $sDefault));
		if (2 === strlen($sDefault))
		{
			$sDefault = $sDefault.'_'.$sDefault;
		}

		$sLanguage = \preg_replace_callback('/_([a-zA-Z0-9]{2})$/', function ($aData) {
			return \strtoupper($aData[0]);
		}, $sLanguage);

		$sDefault = \preg_replace_callback('/_([a-zA-Z0-9]{2})$/', function ($aData) {
			return \strtoupper($aData[0]);
		}, $sDefault);

		if (\in_array($sLanguage, $aLang))
		{
			$sResult = $sLanguage;
		}

		if (empty($sResult) && !empty($sDefault) && \in_array($sDefault, $aLang))
		{
			$sResult = $sDefault;
		}

		if (empty($sResult) && !$bAllowEmptyResult)
		{
			$sResult = $this->Config()->Get('webmail', $bAdmin ? 'language_admin' : 'language', 'en_US');
			$sResult = \in_array($sResult, $aLang) ? $sResult : 'en_US';
		}

		return $sResult;
	}

	public function ValidateContactPdoType(string $sType) : string
	{
		return \in_array($sType, array('mysql', 'pgsql', 'sqlite')) ? $sType : 'sqlite';
	}

	/**
	 * @staticvar array $aCache
	 */
	public function GetThemes(bool $bMobile = false, bool $bIncludeMobile = true) : array
	{
		if ($bMobile)
		{
			return array('Mobile');
		}

		static $aCache = array('full' => null, 'mobile' => null);
		if ($bIncludeMobile && \is_array($aCache['full']))
		{
			return $aCache['full'];
		}
		else if ($bIncludeMobile && \is_array($aCache['mobile']))
		{
			return $aCache['mobile'];
		}

		$bClear = false;
		$bDefault = false;
		$sList = array();
		$sDir = APP_VERSION_ROOT_PATH.'themes';
		if (\is_dir($sDir))
		{
			$rDirH = \opendir($sDir);
			if ($rDirH)
			{
				while (($sFile = \readdir($rDirH)) !== false)
				{
					if ('.' !== $sFile[0] && \is_dir($sDir.'/'.$sFile) && \file_exists($sDir.'/'.$sFile.'/styles.less'))
					{
						if ('Default' === $sFile)
						{
							$bDefault = true;
						}
						else if ('Clear' === $sFile)
						{
							$bClear = true;
						}
						else if ($bIncludeMobile || 'Mobile' !== $sFile)
						{
							$sList[] = $sFile;
						}
					}
				}
				closedir($rDirH);
			}
		}

		$sDir = APP_INDEX_ROOT_PATH.'themes'; // custom user themes
		if (\is_dir($sDir))
		{
			$rDirH = \opendir($sDir);
			if ($rDirH)
			{
				while (($sFile = \readdir($rDirH)) !== false)
				{
					if ('.' !== $sFile[0] && \is_dir($sDir.'/'.$sFile) && \file_exists($sDir.'/'.$sFile.'/styles.less'))
					{
						$sList[] = $sFile.'@custom';
					}
				}

				\closedir($rDirH);
			}
		}

		$sList = \array_unique($sList);
		\sort($sList);

		if ($bDefault)
		{
			\array_unshift($sList, 'Default');
		}

		if ($bClear)
		{
			\array_push($sList, 'Clear');
		}

		$aCache[$bIncludeMobile ? 'full' : 'mobile'] = $sList;
		return $sList;
	}

	/**
	 * @staticvar array $aCache
	 */
	public function GetLanguages(bool $bAdmin = false) : array
	{
		static $aCache = array();
		$sDir = APP_VERSION_ROOT_PATH.'app/localization/'.($bAdmin ? 'admin' : 'webmail').'/';

		if (isset($aCache[$sDir]))
		{
			return $aCache[$sDir];
		}

		$aTop = array();
		$aList = array();

		if (\is_dir($sDir))
		{
			$rDirH = \opendir($sDir);
			if ($rDirH)
			{
				while (($sFile = \readdir($rDirH)) !== false)
				{
					if ('.' !== $sFile[0] && \is_file($sDir.'/'.$sFile) && '.yml' === \substr($sFile, -4))
					{
						$sLang = \substr($sFile, 0, -4);
						if (0 < \strlen($sLang) && 'always' !== $sLang && '_source.en' !== $sLang)
						{
							\array_push($aList, $sLang);
						}
					}
				}

				\closedir($rDirH);
			}
		}

		\sort($aTop);
		\sort($aList);

		$aCache[$sDir] = \array_merge($aTop, $aList);
		return $aCache[$sDir];
	}

	public function ProcessTemplate(string $sName, string $sHtml) : string
	{
		$sHtml = $this->Plugins()->ProcessTemplate($sName, $sHtml);
		$sHtml = \preg_replace('/\{\{INCLUDE\/([a-zA-Z]+)\/PLACE\}\}/', '', $sHtml);

		$sHtml = \preg_replace('/<script/i', '<x-script', $sHtml);
		$sHtml = \preg_replace('/<\/script>/i', '</x-script>', $sHtml);

		return Utils::ClearHtmlOutput($sHtml);
	}

	/**
	 * @param mixed $mResult = false
	 */
	private function mainDefaultResponse(string $sActionName, $mResult = false, array $aAdditionalParams = array()) : array
	{
		$sActionName = 'Do' === \substr($sActionName, 0, 2) ? \substr($sActionName, 2) : $sActionName;
		$sActionName = \preg_replace('/[^a-zA-Z0-9_]+/', '', $sActionName);

		$aResult = array(
			'Action' => $sActionName,
			'Result' => $this->responseObject($mResult, $sActionName)
		);

		foreach ($aAdditionalParams as $sKey => $mValue)
		{
			$aResult[$sKey] = $mValue;
		}

		return $aResult;
	}
	/**
	 * @param mixed $mResult = false
	 */
	public function DefaultResponse(string $sActionName, $mResult = false, array $aAdditionalParams = array()) : array
	{
		$this->Plugins()->RunHook('main.default-response-data', array($sActionName, &$mResult));
		$aResponseItem = $this->mainDefaultResponse($sActionName, $mResult, $aAdditionalParams);
		$this->Plugins()->RunHook('main.default-response', array($sActionName, &$aResponseItem));
		return $aResponseItem;
	}

	public function TrueResponse(string $sActionName, array $aAdditionalParams = array()) : array
	{
		$mResult = true;
		$this->Plugins()->RunHook('main.default-response-data', array($sActionName, &$mResult));
		$aResponseItem = $this->mainDefaultResponse($sActionName, $mResult, $aAdditionalParams);
		$this->Plugins()->RunHook('main.default-response', array($sActionName, &$aResponseItem));
		return $aResponseItem;
	}

	public function FalseResponse(string $sActionName, ?int $iErrorCode = null, ?string $sErrorMessage = null, ?string $sAdditionalErrorMessage = null) : array
	{
		$mResult = false;
		$this->Plugins()
			->RunHook('main.default-response-data', array($sActionName, &$mResult))
			->RunHook('main.default-response-error-data', array($sActionName, &$iErrorCode, &$sErrorMessage))
		;

		$aAdditionalParams = array();
		if (null !== $iErrorCode)
		{
			$aAdditionalParams['ErrorCode'] = (int) $iErrorCode;
			$aAdditionalParams['ErrorMessage'] = null === $sErrorMessage ? '' : (string) $sErrorMessage;
			$aAdditionalParams['ErrorMessageAdditional'] = null === $sAdditionalErrorMessage ? '' : (string) $sAdditionalErrorMessage;
		}

		$aResponseItem = $this->mainDefaultResponse($sActionName, $mResult, $aAdditionalParams);

		$this->Plugins()->RunHook('main.default-response', array($sActionName, &$aResponseItem));
		return $aResponseItem;
	}

	public function ExceptionResponse(string $sActionName, \Throwable $oException) : array
	{
		$iErrorCode = null;
		$sErrorMessage = null;
		$sErrorMessageAdditional = null;

		if ($oException instanceof Exceptions\ClientException)
		{
			$iErrorCode = $oException->getCode();
			$sErrorMessage = null;

			if ($iErrorCode === Notifications::ClientViewError)
			{
				$sErrorMessage = $oException->getMessage();
			}

			$sErrorMessageAdditional = $oException->getAdditionalMessage();
			if (empty($sErrorMessageAdditional))
			{
				$sErrorMessageAdditional = null;
			}
		}
		else
		{
			$iErrorCode = Notifications::UnknownError;
			$sErrorMessage = $oException->getCode().' - '.$oException->getMessage();
		}

		$oPrevious = $oException->getPrevious();
		if ($oPrevious)
		{
			$this->Logger()->WriteException($oPrevious);
		}
		else
		{
			$this->Logger()->WriteException($oException);
		}

		return $this->FalseResponse($sActionName, $iErrorCode, $sErrorMessage, $sErrorMessageAdditional);
	}

	public function SetActionParams(array $aCurrentActionParams, string $sMethodName = '') : self
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

	public function HasActionParam(string $sKey) : bool
	{
		return isset($this->aCurrentActionParams[$sKey]);
	}

	public function HasOneOfActionParams(array $aKeys) : bool
	{
		foreach ($aKeys as $sKey)
		{
			if ($this->HasActionParam($sKey))
			{
				return true;
			}
		}

		return false;
	}

	public function Location(string $sUrl) : void
	{
		$this->Logger()->Write('Location: '.$sUrl);
		\header('Location: '.$sUrl);
	}

	private function objectData(object $oData, string $sParent, array $aParameters = array()) : array
	{
		$mResult = array();
		if (is_object($oData))
		{
			$aNames = explode('\\', get_class($oData));
			$mResult = array(
				'@Object' => end($aNames)
			);

			if ($oData instanceof \MailSo\Base\Collection)
			{
				$mResult['@Object'] = 'Collection/'.$mResult['@Object'];
				$mResult['@Count'] = $oData->Count();
				$mResult['@Collection'] = $this->responseObject($oData->getArrayCopy(), $sParent, $aParameters);
			}
			else
			{
				$mResult['@Object'] = 'Object/'.$mResult['@Object'];
			}
		}

		return $mResult;
	}

	private function hashFolderFullName(string $sFolderFullName) : string
	{
		return \in_array(\strtolower($sFolderFullName), array('inbox', 'sent', 'send', 'drafts',
			'spam', 'junk', 'bin', 'trash', 'archive', 'allmail', 'all')) ?
				$sFolderFullName : \md5($sFolderFullName);
	}

	public function GetLanguageAndTheme(bool $bAdmin = false, bool $bMobile = false) : array
	{
		$sTheme = $this->Config()->Get('webmail', 'theme', 'Default');

		if ($bAdmin)
		{
			$sLanguage = $this->Config()->Get('webmail', 'language_admin', 'en');
		}
		else
		{
			$oAccount = $this->GetAccount();

			$sLanguage = $this->Config()->Get('webmail', 'language', 'en');

			if ($oAccount)
			{
				$oSettings = $this->SettingsProvider()->Load($oAccount);
				if ($oSettings instanceof Settings)
				{
					$sLanguage = $oSettings->GetConf('Language', $sLanguage);
				}

				$oSettingsLocal = $this->SettingsProvider(true)->Load($oAccount);
				if ($oSettingsLocal instanceof Settings)
				{
					$sTheme = $oSettingsLocal->GetConf('Theme', $sTheme);
				}
			}
		}

		$sLanguage = $this->ValidateLanguage($sLanguage, '', $bAdmin);
		$sTheme = $this->ValidateTheme($sTheme, $bMobile);

		return array($sLanguage, $sTheme);
	}

	public function StaticI18N(string $sKey) : string
	{
		static $sLang = null;
		static $aLang = null;

		if (null === $sLang)
		{
			$aList = $this->GetLanguageAndTheme();
			$sLang = $aList[0];
		}

		if (null === $aLang)
		{
			$sLang = $this->ValidateLanguage($sLang, 'en');

			$aLang = array();
//			Utils::ReadAndAddLang(APP_VERSION_ROOT_PATH.'app/i18n/langs.ini', $aLang);
//			Utils::ReadAndAddLang(APP_VERSION_ROOT_PATH.'langs/'.$sLang.'.ini', $aLang);
			Utils::ReadAndAddLang(APP_VERSION_ROOT_PATH.'app/localization/langs.yml', $aLang);
			Utils::ReadAndAddLang(APP_VERSION_ROOT_PATH.'app/localization/webmail/'.$sLang.'.yml', $aLang);

			$this->Plugins()->ReadLang($sLang, $aLang);
		}

		return isset($aLang[$sKey]) ? $aLang[$sKey] : $sKey;
	}

	public function StaticPath(string $sPath) : string
	{
		return Utils::WebStaticPath().$sPath;
	}

	/**
	 * @return MailSo\Cache\CacheClient|null
	 */
	private function cacherForUids()
	{
		$oAccount = $this->getAccountFromToken(false);
		return ($this->Config()->Get('cache', 'enable', true) &&
			$this->Config()->Get('cache', 'server_uids', false)) ? $this->Cacher($oAccount) : null;
	}

	/**
	 * @return MailSo\Cache\CacheClient|null
	 */
	private function cacherForThreads()
	{
		$oAccount = $this->getAccountFromToken(false);
		return !!$this->Config()->Get('labs', 'use_imap_thread', false) ? $this->Cacher($oAccount) : null;
	}

	private function explodeSubject(string $sSubject) : array
	{
		$aResult = array('', '');
		if (0 < \strlen($sSubject))
		{
			$bDrop = false;
			$aPrefix = array();
			$aSuffix = array();

			$aParts = \explode(':', $sSubject);
			foreach ($aParts as $sPart)
			{
				if (!$bDrop &&
					(\preg_match('/^(RE|FWD)$/i', \trim($sPart)) || \preg_match('/^(RE|FWD)[\[\(][\d]+[\]\)]$/i', \trim($sPart))))
				{
					$aPrefix[] = $sPart;
				}
				else
				{
					$aSuffix[] = $sPart;
					$bDrop = true;
				}
			}

			if (0 < \count($aPrefix))
			{
				$aResult[0] = \rtrim(\trim(\implode(':', $aPrefix)), ':').': ';
			}

			if (0 < \count($aSuffix))
			{
				$aResult[1] = \trim(\implode(':', $aSuffix));
			}

			if (0 === \strlen($aResult[1]))
			{
				$aResult = array('', $sSubject);
			}
		}

		return $aResult;
	}

	/**
	 * @param mixed $mResponse
	 *
	 * @return mixed
	 */
	protected $oAccount = null;
	protected $aCheckableFolder = null;
	protected function responseObject($mResponse, string $sParent = '', array $aParameters = array())
	{
		if (\is_object($mResponse))
		{
			$bHook = true;
			$sClassName = \get_class($mResponse);
			if (\method_exists($mResponse, 'ToSimpleJSON'))
			{
				$mResult = \array_merge($this->objectData($mResponse, $sParent, $aParameters), $mResponse->ToSimpleJSON(true));
			}
			else if ('MailSo\Mail\Message' === $sClassName)
			{
				if (null === $this->oAccount) {
					$this->oAccount = $this->getAccountFromToken(false);
				}
				$oAccount = $this->oAccount;

				$iDateTimeStampInUTC = $mResponse->InternalTimeStampInUTC();
				if (0 === $iDateTimeStampInUTC || !!$this->Config()->Get('labs', 'date_from_headers', false))
				{
					$iDateTimeStampInUTC = $mResponse->HeaderTimeStampInUTC();
					if (0 === $iDateTimeStampInUTC)
					{
						$iDateTimeStampInUTC = $mResponse->InternalTimeStampInUTC();
					}
				}

				$mResult = \array_merge($this->objectData($mResponse, $sParent, $aParameters), array(
					'Folder' => $mResponse->Folder(),
					'Uid' => (string) $mResponse->Uid(),
					'Subject' => \trim(\MailSo\Base\Utils::Utf8Clear($mResponse->Subject())),
					'MessageId' => $mResponse->MessageId(),
					'Size' => $mResponse->Size(),
					'DateTimeStampInUTC' => $iDateTimeStampInUTC,
					'ReplyTo' => $this->responseObject($mResponse->ReplyTo(), $sParent, $aParameters),
					'From' => $this->responseObject($mResponse->From(), $sParent, $aParameters),
					'To' => $this->responseObject($mResponse->To(), $sParent, $aParameters),
					'Cc' => $this->responseObject($mResponse->Cc(), $sParent, $aParameters),
					'Bcc' => $this->responseObject($mResponse->Bcc(), $sParent, $aParameters),
					'Sender' => $this->responseObject($mResponse->Sender(), $sParent, $aParameters),
					'DeliveredTo' => $this->responseObject($mResponse->DeliveredTo(), $sParent, $aParameters),
					'Priority' => $mResponse->Priority(),
					'Threads' => $mResponse->Threads(),
					'Sensitivity' => $mResponse->Sensitivity(),
					'UnsubsribeLinks' => $mResponse->UnsubsribeLinks(),
					'ExternalProxy' => false,
					'ReadReceipt' => ''
				));

				$mResult['SubjectParts'] = $this->explodeSubject($mResult['Subject']);

				$oAttachments = $mResponse->Attachments();
				$iAttachmentsCount = $oAttachments ? $oAttachments->Count() : 0;

				$mResult['HasAttachments'] = 0 < $iAttachmentsCount;
				$mResult['AttachmentsSpecData'] = $mResult['HasAttachments'] ? $oAttachments->SpecData() : array();

				$sSubject = $mResult['Subject'];
				$mResult['Hash'] = \md5($mResult['Folder'].$mResult['Uid']);
				$mResult['RequestHash'] = Utils::EncodeKeyValuesQ(array(
					'V' => APP_VERSION,
					'Account' => $oAccount ? \md5($oAccount->Hash()) : '',
					'Folder' => $mResult['Folder'],
					'Uid' => $mResult['Uid'],
					'MimeType' => 'message/rfc822',
					'FileName' => (0 === \strlen($sSubject) ? 'message-'.$mResult['Uid'] : \MailSo\Base\Utils::ClearXss($sSubject)).'.eml'
				));

				// Flags
				$aFlags = $mResponse->FlagsLowerCase();
				$mResult['IsSeen'] = \in_array('\\seen', $aFlags);
				$mResult['IsFlagged'] = \in_array('\\flagged', $aFlags);
				$mResult['IsAnswered'] = \in_array('\\answered', $aFlags);
				$mResult['IsDeleted'] = \in_array('\\deleted', $aFlags);

				$sForwardedFlag = $this->Config()->Get('labs', 'imap_forwarded_flag', '');
				$sReadReceiptFlag = $this->Config()->Get('labs', 'imap_read_receipt_flag', '');

				$mResult['IsForwarded'] = 0 < \strlen($sForwardedFlag) && \in_array(\strtolower($sForwardedFlag), $aFlags);
				$mResult['IsReadReceipt'] = 0 < \strlen($sReadReceiptFlag) && \in_array(\strtolower($sReadReceiptFlag), $aFlags);

				if (!$this->GetCapa(false, false, Enumerations\Capa::COMPOSER, $oAccount))
				{
					$mResult['IsReadReceipt'] = true;
				}

				$mResult['TextPartIsTrimmed'] = false;

				if ('Message' === $sParent)
				{
					$oAttachments = /* @var \MailSo\Mail\AttachmentCollection */  $mResponse->Attachments();

					$bHasExternals = false;
					$mFoundedCIDs = array();
					$aContentLocationUrls = array();
					$mFoundedContentLocationUrls = array();

					if ($oAttachments && 0 < $oAttachments->Count())
					{
						foreach ($oAttachments as /* @var \MailSo\Mail\Attachment */ $oAttachment)
						{
							if ($oAttachment)
							{
								$sContentLocation = $oAttachment->ContentLocation();
								if ($sContentLocation && 0 < \strlen($sContentLocation))
								{
									$aContentLocationUrls[] = $oAttachment->ContentLocation();
								}
							}
						}
					}

					$sPlain = '';
					$sHtml = \trim($mResponse->Html());

					if (0 === \strlen($sHtml))
					{
						$sPlain = \trim($mResponse->Plain());
					}

					$mResult['DraftInfo'] = $mResponse->DraftInfo();
					$mResult['InReplyTo'] = $mResponse->InReplyTo();
					$mResult['UnsubsribeLinks'] = $mResponse->UnsubsribeLinks();
					$mResult['References'] = $mResponse->References();

					$fAdditionalExternalFilter = null;
					if (!!$this->Config()->Get('labs', 'use_local_proxy_for_external_images', false))
					{
						$fAdditionalExternalFilter = function ($sUrl) {
							return './?/ProxyExternal/'.Utils::EncodeKeyValuesQ(array(
								'Rnd' => \md5(\microtime(true)),
								'Token' => Utils::GetConnectionToken(),
								'Url' => $sUrl
							)).'/';
						};
					}

					$sHtml = \preg_replace_callback('/(<pre[^>]*>)([\s\S\r\n\t]*?)(<\/pre>)/mi', function ($aMatches) {
						return \preg_replace('/[\r\n]+/', '<br />', $aMatches[1].\trim($aMatches[2]).$aMatches[3]);
					}, $sHtml);

					$mResult['Html'] = 0 === \strlen($sHtml) ? '' : \MailSo\Base\HtmlUtils::ClearHtml(
						$sHtml, $bHasExternals, $mFoundedCIDs, $aContentLocationUrls, $mFoundedContentLocationUrls, false, false,
						$fAdditionalExternalFilter, null, !!$this->Config()->Get('labs', 'try_to_detect_hidden_images', false)
					);

					$mResult['ExternalProxy'] = null !== $fAdditionalExternalFilter;

					$mResult['Plain'] = $sPlain;
//					$mResult['Plain'] = 0 === \strlen($sPlain) ? '' : \MailSo\Base\HtmlUtils::ConvertPlainToHtml($sPlain);

					$mResult['TextHash'] = \md5($mResult['Html'].$mResult['Plain']);

					$mResult['TextPartIsTrimmed'] = $mResponse->TextPartIsTrimmed();

					$mResult['PgpSigned'] = $mResponse->PgpSigned();
					$mResult['PgpEncrypted'] = $mResponse->PgpEncrypted();
					$mResult['PgpSignature'] = $mResponse->PgpSignature();

					unset($sHtml, $sPlain);

					$mResult['HasExternals'] = $bHasExternals;
					$mResult['HasInternals'] = (\is_array($mFoundedCIDs) && 0 < \count($mFoundedCIDs)) ||
						(\is_array($mFoundedContentLocationUrls) && 0 < \count($mFoundedContentLocationUrls));
					$mResult['FoundedCIDs'] = $mFoundedCIDs;
					$mResult['Attachments'] = $this->responseObject($oAttachments, $sParent, \array_merge($aParameters, array(
						'FoundedCIDs' => $mFoundedCIDs,
						'FoundedContentLocationUrls' => $mFoundedContentLocationUrls
					)));

					$mResult['ReadReceipt'] = $mResponse->ReadReceipt();
					if (0 < \strlen($mResult['ReadReceipt']) && !$mResult['IsReadReceipt'])
					{
						if (0 < \strlen($mResult['ReadReceipt']))
						{
							try
							{
								$oReadReceipt = \MailSo\Mime\Email::Parse($mResult['ReadReceipt']);
								if (!$oReadReceipt)
								{
									$mResult['ReadReceipt'] = '';
								}
							}
							catch (\Throwable $oException) { unset($oException); }
						}

						if (0 < \strlen($mResult['ReadReceipt']) && '1' === $this->Cacher($oAccount)->Get(
							KeyPathHelper::ReadReceiptCache($oAccount->Email(), $mResult['Folder'], $mResult['Uid']), '0'))
						{
							$mResult['ReadReceipt'] = '';
						}
					}
				}
			}
			else if ('MailSo\Mime\Email' === $sClassName)
			{
				$mResult = \array_merge($this->objectData($mResponse, $sParent, $aParameters), array(
					'Name' => \MailSo\Base\Utils::Utf8Clear($mResponse->GetDisplayName()),
					'Email' => \MailSo\Base\Utils::Utf8Clear($mResponse->GetEmail(true)),
					'DkimStatus' => $mResponse->GetDkimStatus(),
					'DkimValue' => $mResponse->GetDkimValue()
				));
			}
			else if ('RainLoop\Providers\AddressBook\Classes\Contact' === $sClassName)
			{
				$mResult = \array_merge($this->objectData($mResponse, $sParent, $aParameters), array(
					/* @var $mResponse Providers\AddressBook\Classes\Contact */
					'IdContact' => $mResponse->IdContact,
					'Display' => \MailSo\Base\Utils::Utf8Clear($mResponse->Display),
					'ReadOnly' => $mResponse->ReadOnly,
					'IdPropertyFromSearch' => $mResponse->IdPropertyFromSearch,
					'Properties' => $this->responseObject($mResponse->Properties, $sParent, $aParameters)
				));
			}
			else if ('RainLoop\Providers\AddressBook\Classes\Tag' === $sClassName)
			{
				$mResult = \array_merge($this->objectData($mResponse, $sParent, $aParameters), array(
					/* @var $mResponse Providers\AddressBook\Classes\Tag */
					'IdContactTag' => $mResponse->IdContactTag,
					'Name' => \MailSo\Base\Utils::Utf8Clear($mResponse->Name),
					'ReadOnly' => $mResponse->ReadOnly
				));
			}
			else if ('RainLoop\Providers\AddressBook\Classes\Property' === $sClassName)
			{
				// Simple hack
				if ($mResponse && $mResponse->IsWeb())
				{
					$mResponse->Value = \preg_replace('/(skype|ftp|http[s]?)\\\:\/\//i', '$1://', $mResponse->Value);
				}

				$mResult = \array_merge($this->objectData($mResponse, $sParent, $aParameters), array(
					/* @var $mResponse Providers\AddressBook\Classes\Property */
					'IdProperty' => $mResponse->IdProperty,
					'Type' => $mResponse->Type,
					'TypeStr' => $mResponse->TypeStr,
					'Value' => \MailSo\Base\Utils::Utf8Clear($mResponse->Value)
				));
			}
			else if ('MailSo\Mail\Attachment' === $sClassName)
			{
				if (null === $this->oAccount) {
					$this->oAccount = $this->getAccountFromToken(false);
				}

				$mFoundedCIDs = isset($aParameters['FoundedCIDs']) && \is_array($aParameters['FoundedCIDs']) &&
					0 < \count($aParameters['FoundedCIDs']) ?
						$aParameters['FoundedCIDs'] : null;

				$mFoundedContentLocationUrls = isset($aParameters['FoundedContentLocationUrls']) &&
					\is_array($aParameters['FoundedContentLocationUrls']) &&
					0 < \count($aParameters['FoundedContentLocationUrls']) ?
						$aParameters['FoundedContentLocationUrls'] : null;

				if ($mFoundedCIDs || $mFoundedContentLocationUrls)
				{
					$mFoundedCIDs = \array_merge($mFoundedCIDs ? $mFoundedCIDs : array(),
						$mFoundedContentLocationUrls ? $mFoundedContentLocationUrls : array());

					$mFoundedCIDs = 0 < \count($mFoundedCIDs) ? $mFoundedCIDs : null;
				}

				$mResult = \array_merge($this->objectData($mResponse, $sParent, $aParameters), array(
					'Folder' => $mResponse->Folder(),
					'Uid' => (string) $mResponse->Uid(),
					'Framed' => false,
					'MimeIndex' => (string) $mResponse->MimeIndex(),
					'MimeType' => $mResponse->MimeType(),
					'FileName' => \MailSo\Base\Utils::ClearFileName(
						\MailSo\Base\Utils::ClearXss($mResponse->FileName(true))),
					'EstimatedSize' => $mResponse->EstimatedSize(),
					'CID' => $mResponse->Cid(),
					'ContentLocation' => $mResponse->ContentLocation(),
					'IsInline' => $mResponse->IsInline(),
					'IsThumbnail' => $this->GetCapa(false, false, Enumerations\Capa::ATTACHMENT_THUMBNAILS),
					'IsLinked' => ($mFoundedCIDs && \in_array(\trim(\trim($mResponse->Cid()), '<>'), $mFoundedCIDs)) ||
						($mFoundedContentLocationUrls && \in_array(\trim($mResponse->ContentLocation()), $mFoundedContentLocationUrls))
				));

				$mResult['Framed'] = $this->isFileHasFramedPreview($mResult['FileName']);

				if ($mResult['IsThumbnail'])
				{
					$mResult['IsThumbnail'] = $this->isFileHasThumbnail($mResult['FileName']);
				}

				$mResult['Download'] = Utils::EncodeKeyValuesQ(array(
					'V' => APP_VERSION,
					'Account' => $this->oAccount ? \md5($this->oAccount->Hash()) : '',
					'Folder' => $mResult['Folder'],
					'Uid' => $mResult['Uid'],
					'MimeIndex' => $mResult['MimeIndex'],
					'MimeType' => $mResult['MimeType'],
					'FileName' => $mResult['FileName'],
					'Framed' => $mResult['Framed']
				));
			}
			else if ('MailSo\Mail\Folder' === $sClassName)
			{
				$aExtended = null;

//				$mStatus = $mResponse->Status();
//				if (\is_array($mStatus) && isset($mStatus['MESSAGES'], $mStatus['UNSEEN'], $mStatus['UIDNEXT']))
//				{
//					$aExtended = array(
//						'MessageCount' => (int) $mStatus['MESSAGES'],
//						'MessageUnseenCount' => (int) $mStatus['UNSEEN'],
//						'UidNext' => (string) $mStatus['UIDNEXT'],
//						'Hash' => $this->MailClient()->GenerateFolderHash(
//							$mResponse->FullNameRaw(), $mStatus['MESSAGES'], $mStatus['UNSEEN'], $mStatus['UIDNEXT'],
//								empty($mStatus['HIGHESTMODSEQ']) ? '' : $mStatus['HIGHESTMODSEQ'])
//					);
//				}

				if (null === $this->aCheckableFolder)
				{
					if (null === $this->oAccount) {
						$this->oAccount = $this->getAccountFromToken(false);
					}
					$aCheckable = \json_decode(
						$this->SettingsProvider(true)
						->Load($this->oAccount)
						->GetConf('CheckableFolder', '[]')
					);
					$this->aCheckableFolder = \is_array($aCheckable) ? $aCheckable : array();
				}

				$mResult = \array_merge($this->objectData($mResponse, $sParent, $aParameters), array(
					'Name' => $mResponse->Name(),
					'FullName' => $mResponse->FullName(),
					'FullNameRaw' => $mResponse->FullNameRaw(),
					'FullNameHash' => $this->hashFolderFullName($mResponse->FullNameRaw(), $mResponse->FullName()),
					'Delimiter' => (string) $mResponse->Delimiter(),
					'HasVisibleSubFolders' => $mResponse->HasVisibleSubFolders(),
					'IsSubscribed' => $mResponse->IsSubscribed(),
					'IsExists' => $mResponse->IsExists(),
					'IsSelectable' => $mResponse->IsSelectable(),
					'Flags' => $mResponse->FlagsLowerCase(),
					'Checkable' => \in_array($mResponse->FullNameRaw(), $this->aCheckableFolder),
					'Extended' => $aExtended,
					'SubFolders' => $this->responseObject($mResponse->SubFolders(), $sParent, $aParameters)
				));
			}
			else if ('MailSo\Mail\MessageCollection' === $sClassName)
			{
				$mResult = \array_merge($this->objectData($mResponse, $sParent, $aParameters), array(
					'MessageCount' => $mResponse->MessageCount,
					'MessageUnseenCount' => $mResponse->MessageUnseenCount,
					'MessageResultCount' => $mResponse->MessageResultCount,
					'Folder' => $mResponse->FolderName,
					'FolderHash' => $mResponse->FolderHash,
					'UidNext' => $mResponse->UidNext,
					'ThreadUid' => $mResponse->ThreadUid,
					'NewMessages' => $this->responseObject($mResponse->NewMessages),
					'Filtered' => $mResponse->Filtered,
					'Offset' => $mResponse->Offset,
					'Limit' => $mResponse->Limit,
					'Search' => $mResponse->Search
				));
			}
			else if ('MailSo\Mail\AttachmentCollection' === $sClassName)
			{
				$mResult = \array_merge($this->objectData($mResponse, $sParent, $aParameters), array(
					'InlineCount' => $mResponse->InlineCount()
				));
			}
			else if ('MailSo\Mail\FolderCollection' === $sClassName)
			{
				$mResult = \array_merge($this->objectData($mResponse, $sParent, $aParameters), array(
					'Namespace' => $mResponse->GetNamespace(),
					'FoldersHash' => isset($mResponse->FoldersHash) ? $mResponse->FoldersHash : '',
					'IsThreadsSupported' => $mResponse->IsThreadsSupported,
					'Optimized' => $mResponse->Optimized,
					'CountRec' => $mResponse->CountRec(),
					'SystemFolders' => isset($mResponse->SystemFolders) && \is_array($mResponse->SystemFolders) ?
						$mResponse->SystemFolders : array()
				));
			}
			else if ('MailSo\Mime\EmailCollection' === $sClassName)
			{
				$mResult = array();
				if (100 < \count($mResponse)) {
					$mResponse = $mResponse->Slice(0, 100);
				}
				foreach ($mResponse as $iKey => $oItem) {
					$mResult[$iKey] = $this->responseObject($oItem, $sParent, $aParameters);
				}
				$bHook = false;
			}
			else if ($mResponse instanceof \MailSo\Base\Collection)
			{
				$mResult = array();
				foreach ($mResponse as $iKey => $oItem) {
					$mResult[$iKey] = $this->responseObject($oItem, $sParent, $aParameters);
				}
				$bHook = false;
			}
			else
			{
				$mResult = '["'.$sClassName.'"]';
				$bHook = false;
			}

			if ($bHook)
			{
				$this->Plugins()->RunHook('filter.response-object', array($sClassName, $mResult), false);
			}
		}
		else if (\is_array($mResponse))
		{
			foreach ($mResponse as $iKey => $oItem)
			{
				$mResponse[$iKey] = $this->responseObject($oItem, $sParent, $aParameters);
			}

			$mResult = $mResponse;
		}
		else
		{
			$mResult = $mResponse;
		}

		unset($mResponse);
		return $mResult;
	}
}
