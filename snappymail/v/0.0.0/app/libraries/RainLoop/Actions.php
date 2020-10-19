<?php

namespace RainLoop;

use RainLoop\Enumerations\UploadError;
use RainLoop\Enumerations\UploadClientError;

class Actions
{
	use Actions\Admin;
	use Actions\User;
	use Actions\Response;

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
		if ($this->Config()->Get('logs', 'auth_logging', false) && \openlog('snappymail', 0, \LOG_AUTHPRIV))
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

			$aResult[] = $oItem->ToSimpleJSON();
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
			$aResult[] = $oItem->ToSimpleJSON();
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
						\MailSo\Imap\Enumerations\FolderType::INBOX,
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
						\MailSo\Imap\Enumerations\FolderType::INBOX,
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

}
