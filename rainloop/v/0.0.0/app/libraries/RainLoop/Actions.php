<?php

namespace RainLoop;

use RainLoop\Enumerations\UploadError;
use RainLoop\Enumerations\UploadClientError;

define('RL_CONTACTS_PER_PAGE', 30);
define('RL_CONTACTS_MAX', 300);

class Actions
{
	const AUTH_TFA_SIGN_ME_TOKEN_KEY = 'rltfasmauth';
	const AUTH_SIGN_ME_TOKEN_KEY = 'rlsmauth';
	const AUTH_MAILTO_TOKEN_KEY = 'rlmailtoauth';
	const AUTH_SPEC_TOKEN_KEY = 'rlspecauth';
	const AUTH_ADMIN_TOKEN_KEY = 'rlaauth';
	const AUTH_LAST_ERROR = 'rllasterrorcode';

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
	 * @var \RainLoop\Social
	 */
	private $oSocial;

	/**
	 * @var \MailSo\Cache\CacheClient
	 */
	private $oCacher;

	/**
	 * @var \RainLoop\Providers\Storage
	 */
	private $oStorageProvider;

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
	 * @var \RainLoop\Providers\AddressBook
	 */
	private $oAddressBookProvider;

	/**
	 * @var \RainLoop\Providers\PersonalAddressBook
	 */
	private $oPersonalAddressBookProvider;

	/**
	 * @var \RainLoop\Providers\Suggestions
	 */
	private $oSuggestionsProvider;

	/**
	 * @var \RainLoop\Providers\ChangePassword
	 */
	private $oChangePasswordProvider;

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
	 * @access private
	 */
	private function __construct()
	{
		$this->aCurrentActionParams = array();

		$this->oHttp = null;
		$this->oLogger = null;
		$this->oPlugins = null;
		$this->oMailClient = null;
		$this->oSocial = null;
		$this->oConfig = null;
		$this->oCacher = null;

		$this->oStorageProvider = null;
		$this->oFilesProvider = null;
		$this->oSettingsProvider = null;
		$this->oDomainProvider = null;
		$this->oAddressBookProvider = null;
		$this->oPersonalAddressBookProvider = null;
		$this->oSuggestionsProvider = null;
		$this->oChangePasswordProvider = null;
		$this->oTwoFactorAuthProvider = null;

		$this->sSpecAuthToken = '';

		$oConfig = $this->Config();
		$this->Plugins()->RunHook('filter.application-config', array(&$oConfig));
	}

	/**
	 * @return \RainLoop\Actions
	 */
	public static function NewInstance()
	{
		return new self();
	}

	/**
	 * @param string $sSpecAuthToken
	 * 
	 * @return \RainLoop\Application
	 */
	public function SetSpecAuthToken($sSpecAuthToken)
	{
		$this->sSpecAuthToken = $sSpecAuthToken;
		
		return $this;
	}

	/**
	 * @return string
	 */
	public function GetSpecAuthToken()
	{
		return $this->sSpecAuthToken;
	}

	/**
	 * @return string
	 */
	public function BuildSsoCacherKey($sSsoHash)
	{
		return '/Sso/Data/'.$sSsoHash.'/Login/';
	}

	/**
	 * @return \RainLoop\Application
	 */
	public function Config()
	{
		if (null === $this->oConfig)
		{
			$this->oConfig = new \RainLoop\Config\Application();

			$bSave = defined('APP_INSTALLED_START');
			if (!$this->oConfig->Load())
			{
				$bSave = true;
			}
			else if (!$bSave)
			{
				$bSave = APP_VERSION !== $this->oConfig->Get('version', 'current');
			}

			if ($bSave)
			{
				$this->oConfig->Save();
			}
		}

		return $this->oConfig;
	}

	/**
	 * @param string $sName
	 * @param \RainLoop\Account $oAccount = null
	 *
	 * @return mixed
	 */
	private function fabrica($sName, $oAccount = null)
	{
		$oResult = null;
		$this->Plugins()
			->RunHook('main.fabrica', array($sName, &$oResult), false)
			->RunHook('main.fabrica[2]', array($sName, &$oResult, $oAccount), false)
		;

		if (null === $oResult)
		{
			switch ($sName)
			{
				case 'files':
					// RainLoop\Providers\Files\FilesInterface
					$oResult = new \RainLoop\Providers\Files\DefaultStorage(APP_PRIVATE_DATA.'storage/files');
					break;
				case 'storage':
					// RainLoop\Providers\Storage\StorageInterface
					$oResult = new \RainLoop\Providers\Storage\DefaultStorage(APP_PRIVATE_DATA.'storage');
					break;
				case 'settings':
					// RainLoop\Providers\Settings\SettingsInterface
					$oResult = new \RainLoop\Providers\Settings\DefaultSettings($this->StorageProvider());
					break;
				case 'login':
					// \RainLoop\Providers\Login\LoginInterface
					$oResult = new \RainLoop\Providers\Login\DefaultLogin();
					break;
				case 'domain':
					// \RainLoop\Providers\Domain\DomainSimpleInterface
					// \RainLoop\Providers\Domain\DomainAdminInterface
					$oResult = new \RainLoop\Providers\Domain\DefaultDomain(APP_PRIVATE_DATA.'domains',
						$this->Cacher());
					break;
				case 'personal-address-book':
					// \RainLoop\Providers\PersonalAddressBook\PersonalAddressBookInterface
					
					$sDsn = \trim($this->Config()->Get('contacts', 'pdo_dsn', ''));
					$sUser = \trim($this->Config()->Get('contacts', 'pdo_user', ''));
					$sPassword = (string) $this->Config()->Get('contacts', 'pdo_password', '');

					$sDsnType = $this->ValidateContactPdoType(\trim($this->Config()->Get('contacts', 'type', 'sqlite')));
					if ('sqlite' === $sDsnType)
					{
						$oResult = new \RainLoop\Providers\PersonalAddressBook\PdoPersonalAddressBook(
							'sqlite:'.APP_PRIVATE_DATA.'PersonalAddressBook.sqlite', '', '', 'sqlite');
					}
					else
					{
						$oResult = new \RainLoop\Providers\PersonalAddressBook\PdoPersonalAddressBook($sDsn, $sUser, $sPassword, $sDsnType);
					}

					$oResult->SetLogger($this->Logger());
					break;
				case 'address-book':
					// \RainLoop\Providers\AddressBook\AddressBookInterface

					$sDsn = \trim($this->Config()->Get('contacts', 'pdo_dsn', ''));
					$sUser = \trim($this->Config()->Get('contacts', 'pdo_user', ''));
					$sPassword = (string) $this->Config()->Get('contacts', 'pdo_password', '');

					$sDsnType = $this->ValidateContactPdoType(\trim($this->Config()->Get('contacts', 'type', 'sqlite')));
					if ('sqlite' === $sDsnType)
					{
						$oResult = new \RainLoop\Providers\AddressBook\PdoAddressBook(
							'sqlite:'.APP_PRIVATE_DATA.'AddressBook.sqlite', '', '', 'sqlite');
					}
					else
					{
						$oResult = new \RainLoop\Providers\AddressBook\PdoAddressBook($sDsn, $sUser, $sPassword, $sDsnType);
					}

					$oResult->SetLogger($this->Logger());
					break;
				case 'suggestions':
					// \RainLoop\Providers\Suggestions\SuggestionsInterface
					break;
				case 'change-password':
					// \RainLoop\Providers\ChangePassword\ChangePasswordInterface
					break;
				case 'two-factor-auth':
					// \RainLoop\Providers\TwoFactorAuth\TwoFactorAuthInterface
					$oResult = new \RainLoop\Providers\TwoFactorAuth\GoogleTwoFactorAuth();
					break;
			}
		}

		$this->Plugins()->RunHook('filter.fabrica', array($sName, &$oResult, $oAccount), false);

		return $oResult;
	}

	/**
	 * @return string
	 */
	public function ParseQueryAuthString()
	{
		if ('' === $this->GetSpecAuthToken())
		{
			$sQuery = \trim(\trim($this->Http()->GetServer('QUERY_STRING', '')), ' /');
			$iPos = \strpos($sQuery, '&');
			if (0 < $iPos)
			{
				$sQuery = \substr($sQuery, 0, $iPos);
			}

			$aPaths = \explode('/', $sQuery);
			if (!empty($aPaths[0]) && !empty($aPaths[1]) && '_' === substr($aPaths[1], 0, 1))
			{
				$this->SetSpecAuthToken($aPaths[1]);
			}
		}
	}
	
	/**
	 * @return string
	 */
	private function compileLogFileName()
	{
		$sFileName = (string) $this->Config()->Get('logs', 'filename', '');

		if (false !== \strpos($sFileName, '{date:'))
		{
			$sFileName = \preg_replace_callback('/\{date:([^}]+)\}/', function ($aMatch) {
				return \gmdate($aMatch[1]);
			}, $sFileName);

			$sFileName = \preg_replace('/\{date:([^}]*)\}/', 'date', $sFileName);
		}

		if (false !== \strpos($sFileName, '{user:'))
		{
			if (false !== \strpos($sFileName, '{user:uid}'))
			{
				$sFileName = \str_replace('{user:uid}',
					\base_convert(\sprintf('%u', \crc32(md5(\RainLoop\Utils::GetConnectionToken()))), 10, 32),
					$sFileName
				);
			}
			
			$this->ParseQueryAuthString();

			$oAccount = $this->getAccountFromToken(false);
			if ($oAccount)
			{
				$sEmail = \strtolower($oAccount->Email());
				$sFileName = \str_replace('{user:email}', $sEmail, $sFileName);
				$sFileName = \str_replace('{user:login}', \MailSo\Base\Utils::GetAccountNameFromEmail($sEmail), $sFileName);
				$sFileName = \str_replace('{user:domain}', \MailSo\Base\Utils::GetDomainFromEmail($sEmail), $sFileName);
			}

			$sFileName = \preg_replace('/\{user:([^}]*)\}/', 'unknown', $sFileName);
		}

		if (false !== \strpos($sFileName, '{labs:'))
		{
			$sFileName = \preg_replace_callback('/\{labs:rand:([1-9])\}/', function ($aMatch) {
				return \rand(\pow(10, $aMatch[1] - 1), \pow(10, $aMatch[1]) - 1);
			}, $sFileName);

			$sFileName = \preg_replace('/\{labs:([^}]*)\}/', 'labs', $sFileName);
		}

		if (0 === strlen($sFileName))
		{
			$sFileName = 'rainloop-log.txt';
		}

		$sFileName = \preg_replace('/[\/]+/', '/', \preg_replace('/[.]+/', '.', $sFileName));
		$sFileName = \preg_replace('/[^a-zA-Z0-9@_+=\-\.\/!()\[\]]/', '', $sFileName);

		return $sFileName;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * 
	 * @return void
	 */
	public function SetAuthToken($oAccount)
	{
		if ($oAccount)
		{
			$sSpecAuthToken = '_'.$oAccount->GetAuthToken();

			$this->SetSpecAuthToken($sSpecAuthToken);
			\RainLoop\Utils::SetCookie(self::AUTH_SPEC_TOKEN_KEY, $sSpecAuthToken, 0, '/', null, null, true);
			
			if ($oAccount->SignMe() && 0 < \strlen($oAccount->SignMeToken()))
			{
				\RainLoop\Utils::SetCookie(self::AUTH_SIGN_ME_TOKEN_KEY, $oAccount->SignMeToken(),
					\time() + 60 * 60 * 24 * 30, '/', null, null, true);
				
				$this->StorageProvider()->Put(null,
					\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
					'SignMe/UserToken/'.$oAccount->SignMeToken(),
					$oAccount->GetAuthToken());
			}
		}
	}
	
	/**
	 * @return string
	 */
	public function GetSpecAuthTokenWithDeletion()
	{
		$sResult = \RainLoop\Utils::GetCookie(self::AUTH_SPEC_TOKEN_KEY, '');
		if (0 < strlen($sResult))
		{
			\RainLoop\Utils::ClearCookie(self::AUTH_SPEC_TOKEN_KEY);
		}

		return $sResult;
	}

	/**
	 * @return void
	 */
	private function setAdminAuthToken($sToken)
	{
		\RainLoop\Utils::SetCookie(self::AUTH_ADMIN_TOKEN_KEY, $sToken, 0, '/', null, null, true);
	}

	/**
	 * @return string
	 */
	private function getAuthToken()
	{
		$sToken = $this->GetSpecAuthToken();
		return $sToken && '_' === \substr($sToken, 0, 1) ? \substr($sToken, 1) : '';
	}

	/**
	 * @return string
	 */
	private function getAdminAuthToken()
	{
		return \RainLoop\Utils::GetCookie(self::AUTH_ADMIN_TOKEN_KEY, '');
	}

	/**
	 * @return void
	 */
	public function ClearAdminAuthToken()
	{
		\RainLoop\Utils::ClearCookie(self::AUTH_ADMIN_TOKEN_KEY);
	}

	/**
	 * @param bool $bThrowExceptionOnFalse = false
	 *
	 * @return \RainLoop\Account|bool
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function GetAccount($bThrowExceptionOnFalse = false)
	{
		return $this->getAccountFromToken($bThrowExceptionOnFalse);
	}

	/**
	 * @return \MailSo\Base\Http
	 */
	public function Http()
	{
		if (null === $this->oHttp)
		{
			$this->oHttp = \MailSo\Base\Http::SingletonInstance();
		}

		return $this->oHttp;
	}
	
	/**
	 * @return \RainLoop\Social
	 */
	public function Social()
	{
		if (null === $this->oSocial)
		{
			$this->oSocial = new \RainLoop\Social($this->Http(), $this);
		}

		return $this->oSocial;
	}

	/**
	 * @return \MailSo\Mail\MailClient
	 */
	public function MailClient()
	{
		if (null === $this->oMailClient)
		{
			$this->oMailClient = \MailSo\Mail\MailClient::NewInstance();
			$this->oMailClient->SetLogger($this->Logger());
		}

		return $this->oMailClient;
	}

	/**
	 * @return \RainLoop\Providers\Settings
	 */
	public function SettingsProvider()
	{
		if (null === $this->oSettingsProvider)
		{
			$this->oSettingsProvider = new \RainLoop\Providers\Settings(
				$this->fabrica('settings'));
		}

		return $this->oSettingsProvider;
	}

	/**
	 * @return \RainLoop\Providers\ChangePassword
	 */
	public function ChangePasswordProvider()
	{
		if (null === $this->oChangePasswordProvider)
		{
			$this->oChangePasswordProvider = new \RainLoop\Providers\ChangePassword(
				$this, $this->fabrica('change-password')
			);
		}

		return $this->oChangePasswordProvider;
	}

	/**
	 * @return \RainLoop\Providers\TwoFactorAuth
	 */
	public function TwoFactorAuthProvider()
	{
		if (null === $this->oTwoFactorAuthProvider)
		{
			$this->oTwoFactorAuthProvider = new \RainLoop\Providers\TwoFactorAuth(
				$this->Config()->Get('security', 'allow_two_factor_auth', false) ? $this->fabrica('two-factor-auth') : null
			);
		}

		return $this->oTwoFactorAuthProvider;
	}

	/**
	 * @return \RainLoop\Providers\Storage
	 */
	public function StorageProvider()
	{
		if (null === $this->oStorageProvider)
		{
			$this->oStorageProvider = new \RainLoop\Providers\Storage(
				$this->fabrica('storage'));
		}

		return $this->oStorageProvider;
	}

	/**
	 * @return \RainLoop\Providers\Files
	 */
	public function FilesProvider()
	{
		if (null === $this->oFilesProvider)
		{
			$this->oFilesProvider = new \RainLoop\Providers\Files(
				$this->fabrica('files'));
		}

		return $this->oFilesProvider;
	}

	/**
	 * @return \RainLoop\Providers\Domain
	 */
	public function DomainProvider()
	{
		if (null === $this->oDomainProvider)
		{
			$this->oDomainProvider = new \RainLoop\Providers\Domain(
				$this->fabrica('domain'));
		}

		return $this->oDomainProvider;
	}

	/**
	 * @return \RainLoop\Providers\Suggestions
	 */
	public function SuggestionsProvider()
	{
		if (null === $this->oSuggestionsProvider)
		{
			$this->oSuggestionsProvider = new \RainLoop\Providers\Suggestions($this->fabrica('suggestions'));
		}

		return $this->oSuggestionsProvider;
	}
	
	/**
	 * @param \RainLoop\Account $oAccount = null
	 * @param bool $bForceEnable = false
	 *
	 * @return \RainLoop\Providers\AddressBook
	 */
	public function AddressBookProvider($oAccount = null, $bForceEnable = false)
	{
		if (null === $this->oAddressBookProvider)
		{
			$this->oAddressBookProvider = new \RainLoop\Providers\AddressBook(
				$this->Config()->Get('contacts', 'enable', false) || $bForceEnable ? $this->fabrica('address-book', $oAccount) : null);

			$this->oAddressBookProvider->SetLogger($this->Logger());
		}

		return $this->oAddressBookProvider;
	}

	/**
	 * @param \RainLoop\Account $oAccount = null
	 * @param bool $bForceEnable = false
	 *
	 * @return \RainLoop\Providers\PersonalAddressBook
	 */
	public function PersonalAddressBookProvider($oAccount = null, $bForceEnable = false)
	{
		if (null === $this->oPersonalAddressBookProvider)
		{
			$this->oPersonalAddressBookProvider = new \RainLoop\Providers\PersonalAddressBook(
				$this->Config()->Get('contacts', 'enable', false) || $bForceEnable ? $this->fabrica('personal-address-book', $oAccount) : null);

			$this->oPersonalAddressBookProvider->SetLogger($this->Logger());

			$this->oPersonalAddressBookProvider->ConsiderShare(
				!!$this->Config()->Get('contacts', 'allow_sharing', false));
		}
		else if ($oAccount && $this->oPersonalAddressBookProvider->IsSupported())
		{
			$this->oPersonalAddressBookProvider->SetAccount($oAccount);
		}

		return $this->oPersonalAddressBookProvider;
	}

	/**
	 * @return \OAuth2\Client|null
	 */
	public function GoogleConnector()
	{
		$oGoogle = false;
		$oConfig = $this->Config();
		if ($oConfig->Get('social', 'google_enable', false) &&
			'' !== \trim($oConfig->Get('social', 'google_client_id', '')) &&
			'' !== \trim($oConfig->Get('social', 'google_client_secret', '')))
		{
			include_once APP_VERSION_ROOT_PATH.'app/libraries/PHP-OAuth2/Client.php';
			include_once APP_VERSION_ROOT_PATH.'app/libraries/PHP-OAuth2/GrantType/IGrantType.php';
			include_once APP_VERSION_ROOT_PATH.'app/libraries/PHP-OAuth2/GrantType/AuthorizationCode.php';
			include_once APP_VERSION_ROOT_PATH.'app/libraries/PHP-OAuth2/GrantType/RefreshToken.php';

			try
			{
				$oGoogle = new \OAuth2\Client(
					\trim($oConfig->Get('social', 'google_client_id', '')),
					\trim($oConfig->Get('social', 'google_client_secret', '')));
			}
			catch (\Exception $oException)
			{
				$this->Logger()->WriteException($oException, \MailSo\Log\Enumerations\Type::ERROR);
			}
		}

		return false === $oGoogle ? null : $oGoogle;
	}

	/**
	 * @return \tmhOAuth|null
	 */
	public function TwitterConnector()
	{
		$oTwitter = false;
		$oConfig = $this->Config();
		if ($oConfig->Get('social', 'twitter_enable', false) &&
			'' !== \trim($oConfig->Get('social', 'twitter_consumer_key', '')) &&
			'' !== \trim($oConfig->Get('social', 'twitter_consumer_secret', '')))
		{
			include_once APP_VERSION_ROOT_PATH.'app/libraries/tmhOAuth/tmhOAuth.php';
			include_once APP_VERSION_ROOT_PATH.'app/libraries/tmhOAuth/tmhUtilities.php';

			$oTwitter = new \tmhOAuth(array(
				'consumer_key' => \trim($oConfig->Get('social', 'twitter_consumer_key', '')),
				'consumer_secret' => \trim($oConfig->Get('social', 'twitter_consumer_secret', ''))
			));
		}

		return false === $oTwitter ? null : $oTwitter;
	}

	/**
	 * @param \RainLoop\Account|null $oAccount = null
	 *
	 * @return \Facebook|null
	 */
	public function FacebookConnector($oAccount = null)
	{
		$oFacebook = false;
		$oConfig = $this->Config();
		if ($oConfig->Get('social', 'fb_enable', false) &&
			'' !== \trim($oConfig->Get('social', 'fb_app_id', '')) &&
			'' !== \trim($oConfig->Get('social', 'fb_app_secret', '')))
		{
			include_once APP_VERSION_ROOT_PATH.'app/libraries/facebook/facebook.php';

			$oFacebook = new \RainLoopFacebook(array(
				'rlAccount' => $oAccount,
				'rlUserHash' => \RainLoop\Utils::GetConnectionToken(),
				'rlStorageProvaider' => $this->StorageProvider(),
				'appId'  => \trim($oConfig->Get('social', 'fb_app_id', '')),
				'secret' => \trim($oConfig->Get('social', 'fb_app_secret', '')),
				'fileUpload' => false,
				'cookie' => true
			));
		}

		return false === $oFacebook ? null : $oFacebook;
	}

	/**
	 * @return \MailSo\Cache\CacheClient
	 */
	public function Cacher()
	{
		if (null === $this->oCacher)
		{
			$this->oCacher = \MailSo\Cache\CacheClient::NewInstance();

			$oDriver = null;
			$sDriver = \strtoupper(\trim($this->Config()->Get('cache', 'fast_cache_driver', 'files')));

			switch (true)
			{
				case 'APC' === $sDriver && \MailSo\Base\Utils::FunctionExistsAndEnabled('apc_store'):
					$oDriver = \MailSo\Cache\Drivers\APC::NewInstance();
					break;
				case 'MEMCACHE' === $sDriver && \MailSo\Base\Utils::FunctionExistsAndEnabled('memcache_connect'):
				case 'MEMCACHED' === $sDriver && \MailSo\Base\Utils::FunctionExistsAndEnabled('memcache_connect'):
					$oDriver = \MailSo\Cache\Drivers\Memcache::NewInstance(
						$this->Config()->Get('labs', 'fast_cache_memcache_host', '127.0.0.1'),
						(int) $this->Config()->Get('labs', 'fast_cache_memcache_port', 11211)
					);
					break;
				default:
					$oDriver = \MailSo\Cache\Drivers\File::NewInstance(APP_PRIVATE_DATA.'cache');
					break;
			}

			if ($oDriver)
			{
				$this->oCacher->SetDriver($oDriver);
			}
			
			$this->oCacher->SetCacheIndex($this->Config()->Get('cache', 'fast_cache_index', ''));
		}

		return $this->oCacher;
	}

	/**
	 * @return \RainLoop\Plugins\Manager
	 */
	public function Plugins()
	{
		if (null === $this->oPlugins)
		{
			$this->oPlugins = new \RainLoop\Plugins\Manager($this);
			$this->oPlugins->SetLogger($this->Logger());
		}

		return $this->oPlugins;
	}

	/**
	 * @return \MailSo\Log\Logger
	 */
	public function Logger()
	{
		if (null === $this->oLogger)
		{
			$this->oLogger = \MailSo\Log\Logger::SingletonInstance();

			if (!!$this->Config()->Get('logs', 'enable', true))
			{
				$sLogFileFullPath = \APP_PRIVATE_DATA.'logs/'.$this->compileLogFileName();
				$sLogFileDir = dirname($sLogFileFullPath);

				if (!@is_dir($sLogFileDir))
				{
					@mkdir($sLogFileDir, 0755, true);
				}

				$this->oLogger->Add(\MailSo\Log\Drivers\File::NewInstance($sLogFileFullPath)
					->WriteOnErrorOnly($this->Config()->Get('logs', 'write_on_error_only', true)));

				if (!$this->Config()->Get('debug', 'enable', false))
				{
					$this->oLogger->AddForbiddenType(\MailSo\Log\Enumerations\Type::TIME);
				}

				$this->oLogger->WriteEmptyLine();

				$oHttp = $this->Http();
				$this->oLogger->Write(
					$oHttp->GetMethod().': '.$oHttp->GetHost(false, false).$oHttp->GetServer('REQUEST_URI', ''),
					\MailSo\Log\Enumerations\Type::NOTE, 'REQUEST');

				$this->oLogger->Write('[PHP:'.PHP_VERSION.'][RL:'.APP_VERSION.'][DATE:'.\gmdate('d.m.y').']');
			}
		}

		return $this->oLogger;
	}

	/**
	 * @return array
	 */
	private function getAdminToken()
	{
		return \RainLoop\Utils::EncodeKeyValues(array('token', \md5(APP_SALT)));
	}

	/**
	 * @param bool $bThrowExceptionOnFalse = true
	 *
	 * @return bool
	 */
	public function IsAdminLoggined($bThrowExceptionOnFalse = true)
	{
		$bResult = false;
		if ($this->Config()->Get('security', 'allow_admin_panel', true))
		{
			$aAdminHash = \RainLoop\Utils::DecodeKeyValues($this->getAdminAuthToken());
			if ((!empty($aAdminHash[0]) && !empty($aAdminHash[1]) &&
				'token' === $aAdminHash[0] && \md5(APP_SALT) === $aAdminHash[1]))
			{
				$bResult = true;
			}
			else if ($bThrowExceptionOnFalse)
			{
				throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AuthError);
			}
		}
		else if ($bThrowExceptionOnFalse)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AuthError);
		}

		return $bResult;
	}

	/**
	 * @param string $sTo
	 */
	public function SetMailtoRequest($sTo)
	{
		if (!empty($sTo))
		{
			\RainLoop\Utils::SetCookie(self::AUTH_MAILTO_TOKEN_KEY,
				\RainLoop\Utils::EncodeKeyValues(array(
					'Time' => microtime(true),
					'MailTo' => 'MailTo',
					'To' => $sTo
				)), 0, '/', null, null, true);
		}
	}
	
	/**
	 * @param string $sEmail
	 * @param string $sLogin
	 * @param string $sPassword
	 * @param bool $sSignMeToken = ''
	 *
	 * @return \RainLoop\Account|null
	 */
	public function LoginProvide($sEmail, $sLogin, $sPassword, $sSignMeToken = '')
	{
		$oResult = null;
		if (0 < \strlen($sEmail) && 0 < \strlen($sLogin) && 0 < \strlen($sPassword))
		{
			$oDomain = $this->DomainProvider()->Load(\MailSo\Base\Utils::GetDomainFromEmail($sEmail), true);
			if ($oDomain instanceof \RainLoop\Domain && !$oDomain->Disabled() && $oDomain->ValidateWhiteList($sEmail, $sLogin))
			{
				$oResult = \RainLoop\Account::NewInstance($sEmail, $sLogin, $sPassword, $oDomain, $sSignMeToken);
			}
		}

		return $oResult;
	}

	/**
	 * @param string $sToken
	 * @param bool $bThrowExceptionOnFalse = true
	 * @param bool $bValidateShortToken = true
	 *
	 * @return \RainLoop\Account|bool
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function GetAccountFromCustomToken($sToken, $bThrowExceptionOnFalse = true, $bValidateShortToken = true)
	{
		$oResult = false;
		if (!empty($sToken))
		{
			$aAccountHash = \RainLoop\Utils::DecodeKeyValues($sToken);
			if (!empty($aAccountHash[0]) && 'token' === $aAccountHash[0] && 8 === \count($aAccountHash) &&
//				!empty($aAccountHash[4]) && \RainLoop\Utils::Fingerprint() === $aAccountHash[4] &&
				!empty($aAccountHash[7]) && (!$bValidateShortToken || \RainLoop\Utils::GetShortToken() === $aAccountHash[7])
			)
			{
				$oAccount = $this->LoginProvide($aAccountHash[1], $aAccountHash[2], $aAccountHash[3],
					empty($aAccountHash[5]) ? '' : $aAccountHash[5]);

				if ($oAccount instanceof \RainLoop\Account)
				{
					$this->Logger()->AddSecret($oAccount->Password());
					
					$oAccount->SetParentEmail($aAccountHash[6]);
					$oResult = $oAccount;
				}
				else
				{
					$oDomain = $this->DomainProvider()->Load(\MailSo\Base\Utils::GetDomainFromEmail($aAccountHash[1]), true);
					if ($bThrowExceptionOnFalse)
					{
						if (!($oDomain instanceof \RainLoop\Domain) || $oDomain->Disabled())
						{
							throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::DomainNotAllowed);
						}
						else if (!$oDomain->ValidateWhiteList($aAccountHash[1], $aAccountHash[2]))
						{
							throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AccountNotAllowed);
						}
					}
				}
			}
			else if ($bThrowExceptionOnFalse)
			{
				throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AuthError);
			}
		}

		if ($bThrowExceptionOnFalse && !($oResult instanceof \RainLoop\Account))
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AuthError);
		}

		return $oResult;
	}
	
	/**
	 * @return \RainLoop\Account|bool
	 */
	public function GetAccountFromSignMeToken()
	{
		$oAccount = false;

		$sSignMeToken = \RainLoop\Utils::GetCookie(\RainLoop\Actions::AUTH_SIGN_ME_TOKEN_KEY, '');
		if (!empty($sSignMeToken))
		{
			$oAccount = $this->GetAccountFromCustomToken($this->StorageProvider()->Get(null,
				\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
				'SignMe/UserToken/'.$sSignMeToken
			), false, false);
		}

		return $oAccount;
	}
	
	/**
	 * @param bool $bThrowExceptionOnFalse = true
	 *
	 * @return \RainLoop\Account|bool
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	private function getAccountFromToken($bThrowExceptionOnFalse = true)
	{
		return $this->GetAccountFromCustomToken($this->getAuthToken(), $bThrowExceptionOnFalse);
	}

	/**
	 * @param bool $bAdmin
	 * @param string $sAuthAccountHash = ''
	 *
	 * @return array
	 */
	public function AppData($bAdmin, $sAuthAccountHash = '')
	{
		if (0 < \strlen($sAuthAccountHash) && \preg_match('/[^_\-\.a-zA-Z0-9]/', $sAuthAccountHash))
		{
			$sAuthAccountHash = '';
		}

		$oConfig = $this->Config();

		$aResult = array(
			'Version' => APP_VERSION,
			'IndexFile' => APP_INDEX_FILE,
			'Auth' => false,
			'AccountHash' => '',
			'AccountSignMe' => false,
			'AuthAccountHash' => '',
			'MailToEmail' => '',
			'Email' => '',
			'Title' => $oConfig->Get('webmail', 'title', ''),
			'LoadingDescription' => $oConfig->Get('webmail', 'loading_description', ''),
			'LoginLogo' => $oConfig->Get('branding', 'login_logo', ''),
			'LoginDescription' => $oConfig->Get('branding', 'login_desc', ''),
			'LoginCss' => $oConfig->Get('branding', 'login_css', ''),
			'Token' => $oConfig->Get('security', 'csrf_protection', false) ? \RainLoop\Utils::GetCsrfToken() : '',
			'OpenPGP' => $oConfig->Get('security', 'openpgp', false),
			'AllowTwoFactorAuth' => (bool) $oConfig->Get('security', 'allow_two_factor_auth', false),
			'InIframe' => (bool) $oConfig->Get('labs', 'in_iframe', false),
			'AllowAdminPanel' => (bool) $oConfig->Get('security', 'allow_admin_panel', true),
			'AllowHtmlEditorSourceButton' => (bool) $oConfig->Get('labs', 'allow_html_editor_source_button', false),
			'CustomLoginLink' => $oConfig->Get('labs', 'custom_login_link', ''),
			'CustomLogoutLink' => $oConfig->Get('labs', 'custom_logout_link', ''),
			'AllowAdditionalAccounts' => (bool) $oConfig->Get('webmail', 'allow_additional_accounts', true),
			'AllowIdentities' => (bool) $oConfig->Get('webmail', 'allow_identities', true),
			'DetermineUserLanguage' => (bool) $oConfig->Get('labs', 'determine_user_language', false),
			'AllowPrefetch' => (bool) $oConfig->Get('labs', 'allow_prefetch', true),
			'AllowCustomLogin' => (bool) $oConfig->Get('login', 'allow_custom_login', false),
			'LoginDefaultDomain' => $oConfig->Get('login', 'default_domain', ''),
			'AllowThemes' => (bool) $oConfig->Get('webmail', 'allow_themes', true),
			'AllowCustomTheme' => (bool) $oConfig->Get('webmail', 'allow_custom_theme', true),
			'ChangePasswordIsAllowed' => false,
			'ContactsIsAllowed' => false,
			'JsHash' => \md5(\RainLoop\Utils::GetConnectionToken()),
			'UseImapThread' => (bool) $oConfig->Get('labs', 'use_imap_thread', false),
			'UseImapSubscribe' => (bool) $oConfig->Get('labs', 'use_imap_list_subscribe', true),
			'AllowAppendMessage' => (bool) $oConfig->Get('labs', 'allow_message_append', false),
			'CdnStaticDomain' => $oConfig->Get('labs', 'cdn_static_domain', ''),
			'Plugins' => array()
		);

		if (0 < \strlen($sAuthAccountHash))
		{
			$aResult['AuthAccountHash'] = $sAuthAccountHash;
		}

		$oSettings = null;
		if (!$bAdmin)
		{
			$oAccount = $this->getAccountFromToken(false);
			if ($oAccount instanceof \RainLoop\Account)
			{
				$oPab = $this->PersonalAddressBookProvider($oAccount);
				
				$aResult['Auth'] = true;
				$aResult['Email'] = $oAccount->Email();
				$aResult['IncLogin'] = $oAccount->IncLogin();
				$aResult['OutLogin'] = $oAccount->OutLogin();
				$aResult['AccountHash'] = $oAccount->Hash();
				$aResult['AccountSignMe'] = $oAccount->SignMe();
				$aResult['ChangePasswordIsAllowed'] = $this->ChangePasswordProvider()->PasswordChangePossibility($oAccount);
				$aResult['ContactsIsAllowed'] = $oPab->IsActive();
				$aResult['ContactsSharingIsAllowed'] = $oPab->IsSharingAllowed();
				
				$aResult['ContactsSyncIsAllowed'] = (bool) $oConfig->Get('contacts', 'allow_sync', false);
				$aResult['ContactsSyncServer'] = '';
				$aResult['ContactsSyncUser'] = '';
				$aResult['ContactsSyncPassword'] = '';
				$aResult['ContactsSyncPabUrl'] = '';

				if ($aResult['ContactsSyncIsAllowed'])
				{
					$sDavDomain = (string) $oConfig->Get('labs', 'sync_dav_domain', '');
					if (empty($sDavDomain))
					{
						$aResult['ContactsSyncServer'] = $this->Http()->GetHost(false, true, true);
					}
					else
					{
						$sDavDomain = \rtrim($sDavDomain, '/\\ ');
						$sDavDomainWithoutScheme = \preg_replace('/https?:\/\//i', '', \trim($sDavDomain));

						$aResult['ContactsSyncServer'] = $sDavDomainWithoutScheme;
					}

					$aResult['ContactsSyncUser'] = $oAccount->ParentEmailHelper();

					try
					{
						$aResult['ContactsSyncPassword'] = $oPab->GetUserHashByEmail($aResult['ContactsSyncUser'], true);
					}
					catch (\Exception $oException)
					{
						$this->Logger()->WriteException($oException);
					}

					if (empty($sDavDomain))
					{
						$sUrl = \rtrim(\trim($this->Http()->GetScheme().'://'.$this->Http()->GetHost(true, false).$this->Http()->GetPath()), '/\\');
						$sUrl = \preg_replace('/index\.php(.*)$/i', '', $sUrl);

						$aResult['ContactsSyncPabUrl'] = $sUrl.'/index.php/dav/';
					}
					else
					{
						$aResult['ContactsSyncPabUrl'] = \preg_match('/^https?:\/\//i', $sDavDomain) ? $sDavDomain : 'http://'.$sDavDomain;
					}

					if (!empty($aResult['ContactsSyncPabUrl']))
					{
						$aResult['ContactsSyncPabUrl'] .= '/addressbooks/'.$oAccount->ParentEmailHelper().'/default/';
					}
				}

				if ($aResult['AccountSignMe'])
				{
					$sToken = \RainLoop\Utils::GetCookie(self::AUTH_MAILTO_TOKEN_KEY, null);
					if (null !== $sToken)
					{
						\RainLoop\Utils::ClearCookie(self::AUTH_MAILTO_TOKEN_KEY);
						$mMailToData = \RainLoop\Utils::DecodeKeyValues($sToken);
						if (\is_array($mMailToData) && !empty($mMailToData['MailTo']) && 'MailTo' === $mMailToData['MailTo'] &&
							!empty($mMailToData['To']))
						{
							$aResult['MailToEmail'] = $mMailToData['To'];
						}
					}
				}

				$oSettings = $this->SettingsProvider()->Load($oAccount);
			}
			else
			{
				$aResult['DevEmail'] = $oConfig->Get('labs', 'dev_email', '');
				$aResult['DevLogin'] = $oConfig->Get('labs', 'dev_login', '');
				$aResult['DevPassword'] = $oConfig->Get('labs', 'dev_password', '');
			}

			$aResult['AllowGoogleSocial'] = (bool) $oConfig->Get('social', 'google_enable', false);
			if ($aResult['AllowGoogleSocial'] && (
				'' === \trim($oConfig->Get('social', 'google_client_id', '')) || '' === \trim($oConfig->Get('social', 'google_client_secret', ''))))
			{
				$aResult['AllowGoogleSocial'] = false;
			}
			
			$aResult['AllowFacebookSocial'] = (bool) $oConfig->Get('social', 'fb_enable', false);
			if ($aResult['AllowFacebookSocial'] && (
				'' === \trim($oConfig->Get('social', 'fb_app_id', '')) || '' === \trim($oConfig->Get('social', 'fb_app_secret', ''))))
			{
				$aResult['AllowFacebookSocial'] = false;
			}

			$aResult['AllowTwitterSocial'] = (bool) $oConfig->Get('social', 'twitter_enable', false);
			if ($aResult['AllowTwitterSocial'] && (
				'' === \trim($oConfig->Get('social', 'twitter_consumer_key', '')) || '' === \trim($oConfig->Get('social', 'twitter_consumer_secret', ''))))
			{
				$aResult['AllowTwitterSocial'] = false;
			}

			$aResult['AllowDropboxSocial'] = (bool) $oConfig->Get('social', 'dropbox_enable', false);
			$aResult['DropboxApiKey'] = \trim($oConfig->Get('social', 'dropbox_api_key', ''));
			if (!$aResult['AllowDropboxSocial'])
			{
				$aResult['DropboxApiKey'] = '';
			}
			else if (0 === strlen($aResult['DropboxApiKey']))
			{
				$aResult['AllowDropboxSocial'] = false;
			}
		}
		else
		{
			$aResult['Auth'] = $this->IsAdminLoggined(false);
			if ($aResult['Auth'])
			{
				$aResult['AdminLogin'] = $oConfig->Get('security', 'admin_login', '');
				$aResult['AdminDomain'] = APP_SITE;
				$aResult['UseTokenProtection'] = (bool) $oConfig->Get('security', 'csrf_protection', true);
				$aResult['EnabledPlugins'] = (bool) $oConfig->Get('plugins', 'enable', false);

				$aDrivers = \class_exists('PDO') ? \PDO::getAvailableDrivers() : array();
				$aResult['MySqlIsSupported'] = \is_array($aDrivers) ? \in_array('mysql', $aDrivers) : false;
				$aResult['SQLiteIsSupported'] = \is_array($aDrivers) ? \in_array('sqlite', $aDrivers) : false;
				$aResult['PostgreSqlIsSupported'] = \is_array($aDrivers) ? \in_array('pgsql', $aDrivers) : false;

				$aResult['ContactsEnable'] = (bool) $oConfig->Get('contacts', 'enable', false);
				$aResult['ContactsSharing'] = (bool) $oConfig->Get('contacts', 'allow_sharing', false);
				$aResult['ContactsSync'] = (bool) $oConfig->Get('contacts', 'allow_sync', false);
				$aResult['ContactsPdoType'] = $this->ValidateContactPdoType(\trim($this->Config()->Get('contacts', 'type', 'sqlite')));
				$aResult['ContactsPdoDsn'] = (string) $oConfig->Get('contacts', 'pdo_dsn', '');
				$aResult['ContactsPdoType'] = (string) $oConfig->Get('contacts', 'type', '');
				$aResult['ContactsPdoUser'] = (string) $oConfig->Get('contacts', 'pdo_user', '');
				$aResult['ContactsPdoPassword'] = APP_DUMMY;

				$aResult['AllowGoogleSocial'] = (bool) $oConfig->Get('social', 'google_enable', false);
				$aResult['GoogleClientID'] = (string) $oConfig->Get('social', 'google_client_id', '');
				$aResult['GoogleClientSecret'] = (string) $oConfig->Get('social', 'google_client_secret', '');

				$aResult['AllowFacebookSocial'] = (bool) $oConfig->Get('social', 'fb_enable', false);
				$aResult['FacebookAppID'] = (string) $oConfig->Get('social', 'fb_app_id', '');
				$aResult['FacebookAppSecret'] = (string) $oConfig->Get('social', 'fb_app_secret', '');

				$aResult['AllowTwitterSocial'] = (bool) $oConfig->Get('social', 'twitter_enable', false);
				$aResult['TwitterConsumerKey'] = (string) $oConfig->Get('social', 'twitter_consumer_key', '');
				$aResult['TwitterConsumerSecret'] = (string) $oConfig->Get('social', 'twitter_consumer_secret', '');

				$aResult['AllowDropboxSocial'] = (bool) $oConfig->Get('social', 'dropbox_enable', false);
				$aResult['DropboxApiKey'] = (string) $oConfig->Get('social', 'dropbox_api_key', '');

				$aResult['SubscriptionEnabled'] = \MailSo\Base\Utils::ValidateDomain($aResult['AdminDomain']);

				$aResult['WeakPassword'] = $oConfig->ValidatePassword('12345');
			}
		}

		$aResult['ProjectHash'] = \md5($aResult['AccountHash'].APP_VERSION.$this->Plugins()->Hash());

		$sLanguage = $oConfig->Get('webmail', 'language', 'en');
		$sTheme = $oConfig->Get('webmail', 'theme', 'Default');

		$aResult['Themes'] = $this->GetThemes($bAdmin);
		$aResult['Languages'] = $this->GetLanguages();
		$aResult['AllowLanguagesOnSettings'] = (bool) $oConfig->Get('webmail', 'allow_languages_on_settings', true);
		$aResult['AllowLanguagesOnLogin'] = (bool) $oConfig->Get('login', 'allow_languages_on_login', true);
		$aResult['AllowCustomLogin'] = (bool) $oConfig->Get('login', 'allow_custom_login', false);
		$aResult['AttachmentLimit'] = ((int) $oConfig->Get('webmail', 'attachment_size_limit', 10)) * 1024 * 1024;
		$aResult['SignMe'] = (string) $oConfig->Get('login', 'sign_me_auto', \RainLoop\Enumerations\SignMeType::DEFAILT_OFF);

		// user
		$aResult['EditorDefaultType'] = (string) $oConfig->Get('webmail', 'editor_default_type', '');
		$aResult['ShowImages'] = (bool) $oConfig->Get('webmail', 'show_images', false);
		$aResult['ContactsAutosave'] = true;
		$aResult['MPP'] = (int) $oConfig->Get('webmail', 'messages_per_page', 25);
		$aResult['DesktopNotifications'] = false;
		$aResult['UseThreads'] = false;
		$aResult['ReplySameFolder'] = false;
		$aResult['Layout'] = \RainLoop\Enumerations\Layout::SIDE_PREVIEW;
		$aResult['UseCheckboxesInList'] = true;
		$aResult['DisplayName'] = '';
		$aResult['ReplyTo'] = '';
		$aResult['Signature'] = '';
		$aResult['SignatureToAll'] = false;
		$aResult['EnableTwoFactor'] = false;
		$aResult['ParentEmail'] = '';
		$aResult['InterfaceAnimation'] = \RainLoop\Enumerations\InterfaceAnimation::NORMAL;
		$aResult['CustomThemeType'] = \RainLoop\Enumerations\CustomThemeType::LIGHT;
		$aResult['CustomThemeImg'] = '';
		
		if (!$bAdmin && $oSettings instanceof \RainLoop\Settings)
		{
			if ($oConfig->Get('webmail', 'allow_languages_on_settings', true))
			{
				$sLanguage = $oSettings->GetConf('Language', $sLanguage);
			}
			
			if ($oConfig->Get('webmail', 'allow_themes', true))
			{
				$sTheme = $oSettings->GetConf('Theme', $sTheme);
			}

			$aResult['SentFolder'] = $oSettings->GetConf('SentFolder', '');
			$aResult['DraftFolder'] = $oSettings->GetConf('DraftFolder', '');
			$aResult['SpamFolder'] = $oSettings->GetConf('SpamFolder', '');
			$aResult['TrashFolder'] = $oSettings->GetConf('TrashFolder', '');
			$aResult['ArchiveFolder'] = $oSettings->GetConf('ArchiveFolder', '');
			$aResult['NullFolder'] = $oSettings->GetConf('NullFolder', '');
			$aResult['EditorDefaultType'] = $oSettings->GetConf('EditorDefaultType', $aResult['EditorDefaultType']);
			$aResult['ShowImages'] = (bool) $oSettings->GetConf('ShowImages', $aResult['ShowImages']);
			$aResult['ContactsAutosave'] = (bool) $oSettings->GetConf('ContactsAutosave', $aResult['ContactsAutosave']);
			$aResult['MPP'] = (int) $oSettings->GetConf('MPP', $aResult['MPP']);
			$aResult['DesktopNotifications'] = (bool) $oSettings->GetConf('DesktopNotifications', $aResult['DesktopNotifications']);
			$aResult['UseThreads'] = (bool) $oSettings->GetConf('UseThreads', $aResult['UseThreads']);
			$aResult['ReplySameFolder'] = (bool) $oSettings->GetConf('ReplySameFolder', $aResult['ReplySameFolder']);
			$aResult['Layout'] = (int) $oSettings->GetConf('Layout', $aResult['Layout']);
			$aResult['UseCheckboxesInList'] = (bool) $oSettings->GetConf('UseCheckboxesInList', $aResult['UseCheckboxesInList']);
			$aResult['InterfaceAnimation'] = (string) $oSettings->GetConf('InterfaceAnimation', $aResult['InterfaceAnimation']);
			$aResult['CustomThemeType'] = (string) $oSettings->GetConf('CustomThemeType', $aResult['CustomThemeType']);
			$aResult['CustomThemeImg'] = (string) $oSettings->GetConf('CustomThemeImg', $aResult['CustomThemeImg']);

			$aResult['DisplayName'] = $oSettings->GetConf('DisplayName', $aResult['DisplayName']);
			$aResult['ReplyTo'] = $oSettings->GetConf('ReplyTo', $aResult['ReplyTo']);
			$aResult['Signature'] = $oSettings->GetConf('Signature', $aResult['Signature']);
			$aResult['SignatureToAll'] = !!$oSettings->GetConf('SignatureToAll', $aResult['SignatureToAll']);
			$aResult['EnableTwoFactor'] = !!$oSettings->GetConf('EnableTwoFactor', $aResult['EnableTwoFactor']);

			$aResult['ParentEmail'] = $oAccount->ParentEmail();
		}

		$aResult['InterfaceAnimation'] = \RainLoop\Enumerations\InterfaceAnimation::NONE === $aResult['InterfaceAnimation']
			? $aResult['InterfaceAnimation'] : \RainLoop\Enumerations\InterfaceAnimation::NORMAL;

		if (!in_array($aResult['CustomThemeType'], array(
			\RainLoop\Enumerations\CustomThemeType::LIGHT, \RainLoop\Enumerations\CustomThemeType::DARK
		)))
		{
			$aResult['CustomThemeType'] = \RainLoop\Enumerations\CustomThemeType::LIGHT;
		}
		
		if (0 < \strlen($aResult['ParentEmail']))
		{
			$aResult['AllowGoogleSocial'] = false;
			$aResult['AllowFacebookSocial'] = false;
			$aResult['AllowTwitterSocial'] = false;
		}

		$sStaticCache = \md5(APP_VERSION.$this->Plugins()->Hash());

		$sTheme = $this->ValidateTheme($sTheme);
		$sNewThemeLink =  APP_INDEX_FILE.'?/Css/0/'.($bAdmin ? 'Admin' : 'User').'/-/'.($bAdmin ? 'Default' : $sTheme).'/-/'.$sStaticCache.'/';
		if (!$bAdmin && 0 < \strlen($sAuthAccountHash) && 'Custom' === $sTheme)
		{
			$sNewThemeLink = \str_replace('/Css/0/User/-/Custom/-/', '/Css/'.$sAuthAccountHash.'/User/-/Custom/-/', $sNewThemeLink);
		}

		$bUserLanguage = false;
		if (!$bAdmin && !$aResult['Auth'] && !empty($_COOKIE['rllang']) &&
			$oConfig->Get('webmail', 'allow_languages_on_login', true))
		{
			$sLanguage = $_COOKIE['rllang'];
		}
		else if (!$bAdmin && !$aResult['Auth'])
		{
			$sUserLanguage = '';
			if (!$bAdmin && !$aResult['Auth'] &&
				$oConfig->Get('labs', 'determine_user_language', false))
			{
				$sUserLanguage = $this->detectUserLanguage();
			}

			$sLanguage = $this->ValidateLanguage($sLanguage);
			if (0 < \strlen($sUserLanguage) && $sLanguage !== $sUserLanguage)
			{
				$sLanguage = $sUserLanguage;
				$bUserLanguage = true;
			}
		}

		$sPluginsLink = '';
		if (0 < $this->Plugins()->Count())
		{
			$sPluginsLink = APP_INDEX_FILE.'?/Plugins/0/'.($bAdmin ? 'Admin' : 'User').'/'.$sStaticCache.'/';
		}

		$aResult['Theme'] = $sTheme;
		$aResult['NewThemeLink'] = $sNewThemeLink;
		$aResult['Language'] = $this->ValidateLanguage($sLanguage);
		$aResult['UserLanguage'] = $bUserLanguage;
		$aResult['LangLink'] = APP_INDEX_FILE.'?/Lang/0/'.($bAdmin ? 'en' : $aResult['Language']).'/'.$sStaticCache.'/';
		$aResult['TemplatesLink'] = APP_INDEX_FILE.'?/Templates/0/'.$sStaticCache.'/';
		$aResult['PluginsLink'] = $sPluginsLink;
		$aResult['EditorDefaultType'] = 'Html' === $aResult['EditorDefaultType'] ? 'Html' : 'Plain';

		$this->Plugins()->InitAppData($bAdmin, $aResult);

		return $aResult;
	}

	private function detectUserLanguage()
	{
		$sLang = '';
		$sAcceptLang = $this->Http()->GetServer('HTTP_ACCEPT_LANGUAGE', 'en');
		if (false !== \strpos($sAcceptLang, ','))
		{
			$aParts = \explode(',', $sAcceptLang, 2);
			$sLang = !empty($aParts[0]) ? \strtolower($aParts[0]) : '';
		}

		if (!empty($sLang))
		{
			$sLang = \preg_replace('/[^a-zA-Z0-9]+/', '-', $sLang);
			if ($sLang !== $this->ValidateLanguage($sLang))
			{
				if (2 < strlen($sLang))
				{
					$sLang = \substr($sLang, 0, 2);
				}
			}
		}

		return $this->ValidateLanguage($sLang);
	}

	private function loginErrorDelay()
	{
		$iDelay = (int) $this->Config()->Get('labs', 'login_fault_delay', 0);
		if (0 < $iDelay)
		{
			\sleep($iDelay);
		}
	}
	/**
	 * @param \RainLoop\Account $oAccount
	 */
	public function AuthProcess($oAccount)
	{
		if ($oAccount instanceof \RainLoop\Account)
		{
			$this->SetAuthToken($oAccount);

			$aAccounts = $this->GetAccounts($oAccount);
			if (\is_array($aAccounts) && isset($aAccounts[$oAccount->Email()]))
			{
				$aAccounts[$oAccount->Email()] = $oAccount->GetAuthToken();
				$this->SetAccounts($oAccount, $aAccounts);
			}
		}
	}

	/**
	 * @param string $sEmail
	 * @param string $sLogin
	 * @param string $sPassword
	 * @param string $sSignMeToken = ''
	 * @param string $sAdditionalCode = ''
	 * @param string $bAdditionalCodeSignMeSignMe = false
	 *
	 * @return \RainLoop\Account
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function LoginProcess(&$sEmail, &$sLogin, &$sPassword, $sSignMeToken = '',
		$sAdditionalCode = '', $bAdditionalCodeSignMeSignMe = false)
	{
		if (false === \strpos($sEmail, '@') && 0 < \strlen(\trim($this->Config()->Get('login', 'default_domain', ''))))
		{
			$sEmail = $sEmail.'@'.\trim(\trim($this->Config()->Get('login', 'default_domain', '')), ' @');
		}

		if (!$this->Config()->Get('login', 'allow_custom_login', false) || 0 === \strlen($sLogin))
		{
			$sLogin = $sEmail;
		}

		if (0 === \strlen($sLogin))
		{
			$sLogin = $sEmail;
		}

		$this->Plugins()->RunHook('filter.login-credentials', array(&$sEmail, &$sLogin, &$sPassword));

		$oAccount = $this->LoginProvide($sEmail, $sLogin, $sPassword, $sSignMeToken);
		if (!($oAccount instanceof \RainLoop\Account))
		{
			$this->loginErrorDelay();

			$oDomain = $this->DomainProvider()->Load(\MailSo\Base\Utils::GetDomainFromEmail($sEmail), true);
			if (!($oDomain instanceof \RainLoop\Domain) || $oDomain->Disabled())
			{
				throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::DomainNotAllowed);
			}
			else if (!$oDomain->ValidateWhiteList($sEmail, $sLogin))
			{
				throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AccountNotAllowed);
			}
			else
			{
				throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AuthError);
			}
		}

		if ($oAccount && $this->TwoFactorAuthProvider()->IsActive())
		{
			$aData = $this->getTwoFactorInfo($oAccount->ParentEmailHelper());
			if ($aData && isset($aData['IsSet'], $aData['Enable']) && !empty($aData['Secret']) && $aData['IsSet'] && $aData['Enable'])
			{
				$sSecretHash = \md5(APP_SALT.$aData['Secret'].\RainLoop\Utils::Fingerprint());
				$sSecretCookieHash = \RainLoop\Utils::GetCookie(self::AUTH_TFA_SIGN_ME_TOKEN_KEY, '');

				if (empty($sSecretCookieHash) || $sSecretHash !== $sSecretCookieHash)
				{
					$sAdditionalCode = \trim($sAdditionalCode);
					if (empty($sAdditionalCode))
					{
						$this->Logger()->Write('TFA: Required Code for '.$oAccount->ParentEmailHelper().' account.');
						throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AccountTwoFactorAuthRequired);
					}
					else
					{
						$this->Logger()->Write('TFA: Verify Code for '.$oAccount->ParentEmailHelper().' account.');

						$bGood = false;
						if (6 < \strlen($sAdditionalCode) && !empty($aData['BackupCodes']))
						{
							$aBackupCodes = \explode(' ', \trim(\preg_replace('/[^\d]+/', ' ', $aData['BackupCodes'])));
							$bGood = \in_array($sAdditionalCode, $aBackupCodes);

							if ($bGood)
							{
								$this->removeBackupCodeFromTwoFactorInfo($oAccount->ParentEmailHelper(), $sAdditionalCode);
							}
						}

						if ($bAdditionalCodeSignMeSignMe)
						{
							\RainLoop\Utils::SetCookie(self::AUTH_TFA_SIGN_ME_TOKEN_KEY, $sSecretHash,
								\time() + 60 * 60 * 24 * 14, '/', null, null, true);
						}

						if (!$bGood && !$this->TwoFactorAuthProvider()->VerifyCode($aData['Secret'], $sAdditionalCode))
						{
							$this->loginErrorDelay();
							throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AccountTwoFactorAuthError);
						}
					}
				}
			}
		}

		try
		{
			$this->MailClient()
				->Connect($oAccount->Domain()->IncHost(), $oAccount->Domain()->IncPort(), $oAccount->Domain()->IncSecure())
				->Login($oAccount->IncLogin(), $oAccount->Password())
			;
		}
		catch (\RainLoop\Exceptions\ClientException $oException)
		{
			$this->loginErrorDelay();
			throw $oException;
		}
		catch (\MailSo\Net\Exceptions\ConnectionException $oException)
		{
			$this->loginErrorDelay();
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::ConnectionError, $oException);
		}
		catch (\Exception $oException)
		{
			$this->loginErrorDelay();
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AuthError, $oException);
		}
		
		return $oAccount;
	}

	/**
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoLogin()
	{
		$sEmail = \trim($this->GetActionParam('Email', ''));
		$sLogin = \trim($this->GetActionParam('Login', ''));
		$sPassword = $this->GetActionParam('Password', '');
		$sLanguage = $this->GetActionParam('Language', '');
		$bSignMe = '1' === (string) $this->GetActionParam('SignMe', '0');
		
		$sAdditionalCode = $this->GetActionParam('AdditionalCode', '');
		$bAdditionalCodeSignMe = '1' === (string) $this->GetActionParam('AdditionalCodeSignMe', '0');

		$this->Logger()->AddSecret($sPassword);

		$oAccount = null;
		
		try
		{
			$oAccount = $this->LoginProcess($sEmail, $sLogin, $sPassword,
				$bSignMe ? \md5(\microtime(true).APP_SALT.\rand(10000, 99999).$sEmail) : '',
				$sAdditionalCode, $bAdditionalCodeSignMe);
		}
		catch (\RainLoop\Exceptions\ClientException $oException)
		{
			if ($oException &&
				\RainLoop\Notifications::AccountTwoFactorAuthRequired === $oException->getCode())
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

		$this->AuthProcess($oAccount);

		if ($oAccount && 0 < \strlen($sLanguage))
		{
			$oSettings = $this->SettingsProvider()->Load($oAccount);
			if ($oSettings)
			{
				$oSettings->SetConf('Language', $this->ValidateLanguage($sLanguage));
				$this->SettingsProvider()->Save($oAccount, $oSettings);
			}
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * 
	 * @return array
	 */
	public function GetAccounts($oAccount)
	{
		$sParentEmail = $oAccount->ParentEmailHelper();

		if ($this->Config()->Get('webmail', 'allow_additional_accounts', true))
		{
			$sAccounts = $this->StorageProvider()->Get(null,
				\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
				'Webmail/Accounts/'.$sParentEmail.'/Array', null);

			$aAccounts = $sAccounts ? @\unserialize($sAccounts) : array();

			if (\is_array($aAccounts) && 0 < \count($aAccounts))
			{
				if (1 === \count($aAccounts))
				{
					$this->SetAccounts($oAccount, array());
				}

				return $aAccounts;
			}
		}

		$aAccounts = array();
		if ($sParentEmail === $oAccount->Email())
		{
			$aAccounts[$oAccount->Email()] = $oAccount->GetAuthToken();
		}

		return $aAccounts;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 *
	 * @return array
	 */
	public function GetIdentities($oAccount)
	{
		$aIdentities = array();
		if ($oAccount)
		{
			$aSubIdentities = array();
			$oSettings = $this->SettingsProvider()->Load($oAccount);
			if ($oSettings)
			{
				$sData = $oSettings->GetConf('Identities', '');
				if ('' !== $sData && '[' === \substr($sData, 0, 1))
				{
					$aSubIdentities = @\json_decode($sData, true);
					$aSubIdentities = \is_array($aSubIdentities) ? $aSubIdentities : array();
				}
			}

			if (0 < \count($aSubIdentities))
			{
				foreach ($aSubIdentities as $aItem)
				{
					if (isset($aItem['Id'], $aItem['Email'], $aItem['Name'], $aItem['ReplyTo'], $aItem['Bcc']) &&
						$aItem['Id'] !== $oAccount->Email())
					{
						$oItem = \RainLoop\Identity::NewInstance($aItem['Id'], $aItem['Email'],
							$aItem['Name'], $aItem['ReplyTo'], $aItem['Bcc']);
						
						$aIdentities[] = $oItem;
					}
				}
			}
		}

		return $aIdentities;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param array $aAccounts = array()
	 *
	 * @return array
	 */
	public function SetAccounts($oAccount, $aAccounts = array())
	{
		$sParentEmail = $oAccount->ParentEmailHelper();
		if (!\is_array($aAccounts) || 0 >= \count($aAccounts) ||
			(1 === \count($aAccounts) && !empty($aAccounts[$sParentEmail])))
		{
			$this->StorageProvider()->Clear(null, \RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
				'Webmail/Accounts/'.$sParentEmail.'/Array');
		}
		else
		{
			$this->StorageProvider()->Put(null, \RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
				'Webmail/Accounts/'.$sParentEmail.'/Array', @\serialize($aAccounts));
		}
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param array $aIdentities = array()
	 *
	 * @return array
	 */
	public function SetIdentities($oAccount, $aIdentities = array())
	{
		$oSettings = $this->SettingsProvider()->Load($oAccount);
		if ($oSettings)
		{
			$aResult = array();
			foreach ($aIdentities as $oItem)
			{
				$aResult[] = $oItem->ToSimpleJSON();
			}

			$oSettings->SetConf('Identities', @\json_encode($aResult));
			return $this->SettingsProvider()->Save($oAccount, $oSettings);
		}

		return false;
	}

	/**
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoAccountAdd()
	{
		if (!$this->Config()->Get('webmail', 'allow_additional_accounts', true))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$oAccount = $this->getAccountFromToken();

		$sEmail = \trim($this->GetActionParam('Email', ''));
		$sLogin = \trim($this->GetActionParam('Login', ''));
		$sPassword = $this->GetActionParam('Password', '');

		$this->Logger()->AddSecret($sPassword);

		$sParentEmail = 0 < \strlen($oAccount->ParentEmail()) ? $oAccount->ParentEmail() : $oAccount->Email();

		$sEmail = \strtolower($sEmail);
		if ($oAccount->Email() === $sEmail || $sParentEmail === $sEmail)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AccountAlreadyExists);
		}

		$oNewAccount = $this->LoginProcess($sEmail, $sLogin, $sPassword);
		$oNewAccount->SetParentEmail($sParentEmail);

		$aAccounts = $this->GetAccounts($oAccount);
		if (\is_array($aAccounts))
		{
			if (isset($aAccounts[$oNewAccount->Email()]))
			{
				throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AccountAlreadyExists);
			}
			else
			{
				$aAccounts[$oNewAccount->Email()] = $oNewAccount->GetAuthToken();
			}
		}
		else
		{
			$aAccounts = array();
		}

		if (0 === \strlen($oAccount->ParentEmail()))
		{
			$aAccounts[$oAccount->Email()] = $oAccount->GetAuthToken();
		}

		$this->SetAccounts($oAccount, $aAccounts);
		return $this->TrueResponse(__FUNCTION__);
	}
	
	/**
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoAccountDelete()
	{
		if (!$this->Config()->Get('webmail', 'allow_additional_accounts', true))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$oAccount = $this->getAccountFromToken();

		$sParentEmail = $oAccount->ParentEmailHelper();
		$sEmailToDelete = \strtolower(\trim($this->GetActionParam('EmailToDelete', '')));

		$aAccounts = $this->GetAccounts($oAccount);

		if (0 < \strlen($sEmailToDelete) && $sEmailToDelete !== $sParentEmail && \is_array($aAccounts) && isset($aAccounts[$sEmailToDelete]))
		{
			unset($aAccounts[$sEmailToDelete]);

			$oAccountToChange = null;
			if ($oAccount->Email() === $sEmailToDelete && !empty($aAccounts[$sParentEmail]))
			{
				$oAccountToChange = $this->GetAccountFromCustomToken($aAccounts[$sParentEmail], false, false);
				if ($oAccountToChange)
				{
					$this->AuthProcess($oAccountToChange);
				}
			}
			
			$this->SetAccounts($oAccount, $aAccounts);
			return $this->TrueResponse(__FUNCTION__, array('Reload' => !!$oAccountToChange));
		}
		
		return $this->FalseResponse(__FUNCTION__);
	}

	/**
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoIdentityUpdate()
	{
		if (!$this->Config()->Get('webmail', 'allow_identities', true))
		{
			return $this->FalseResponse(__FUNCTION__);
		}
		
		$oAccount = $this->getAccountFromToken();

		$sId = \trim($this->GetActionParam('Id', ''));
		$sEmail = \trim($this->GetActionParam('Email', ''));
		$sName = \trim($this->GetActionParam('Name', ''));
		$sReplyTo = \trim($this->GetActionParam('ReplyTo', ''));
		$sBcc = \trim($this->GetActionParam('Bcc', ''));

		if (empty($sEmail))
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::UnknownError);
		}

		$oEditIdentity = null;
		$aIdentities = $this->GetIdentities($oAccount);
		if (0 < \strlen($sId))
		{
			foreach ($aIdentities as &$oItem)
			{
				if ($oItem && $sId === $oItem->Id())
				{
					$oEditIdentity =& $oItem;
					break;
				}
			}
		}
		else
		{
			$sId = \md5($sEmail.\microtime(true));
		}

		if (!$oEditIdentity)
		{
			$aIdentities[] = \RainLoop\Identity::NewInstance($sId, $sEmail, $sName, $sReplyTo, $sBcc);
		}
		else
		{
			$oEditIdentity
				->SetEmail($sEmail)
				->SetName($sName)
				->SetReplyTo($sReplyTo)
				->SetBcc($sBcc)
			;
		}

		return $this->DefaultResponse(__FUNCTION__, $this->SetIdentities($oAccount, $aIdentities));
	}

	/**
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoIdentityDelete()
	{
		if (!$this->Config()->Get('webmail', 'allow_identities', true))
		{
			return $this->FalseResponse(__FUNCTION__);
		}
		
		$oAccount = $this->getAccountFromToken();

		$sId = \trim($this->GetActionParam('IdToDelete', ''));
		if (empty($sId))
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::UnknownError);
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
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoAccountsAndIdentities()
	{
		$oAccount = $this->getAccountFromToken();

		$mAccounts = false;
		if ($this->Config()->Get('webmail', 'allow_additional_accounts', true))
		{
			$mAccounts = $this->GetAccounts($oAccount);
			$mAccounts = \array_keys($mAccounts);
		}

		$mIdentities = false;
		if ($this->Config()->Get('webmail', 'allow_identities', true))
		{
			$mIdentities = $this->GetIdentities($oAccount);
		}

		return $this->DefaultResponse(__FUNCTION__, array(
			'Accounts' => $mAccounts,
			'Identities' => $mIdentities
		));
	}

	/**
	 * @return array
	 */
	public function DoLogout()
	{
		$oAccount = $this->getAccountFromToken(false);
		if ($oAccount && $oAccount->SignMe())
		{
			\RainLoop\Utils::ClearCookie(\RainLoop\Actions::AUTH_SIGN_ME_TOKEN_KEY);
			
			$this->StorageProvider()->Clear(null,
				\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
				'SignMe/UserToken/'.$oAccount->SignMeToken());
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	/**
	 * @return array
	 */
	public function DoAppDelayStart()
	{
		$this->Plugins()->RunHook('service.app-delay-start-begin');
		
		\RainLoop\Utils::UpdateConnectionToken();

		$bMainCache = false;
		$bFilesCache = false;
		$bPing = false;

		$iOneDay1 = 60 * 60 * 23;
		$iOneDay2 = 60 * 60 * 25;
		
		$sTimers = $this->StorageProvider()->Get(null,
			\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY, 'Cache/Timers', '');

		$aTimers = \explode(',', $sTimers);

		$iMainCacheTime = !empty($aTimers[0]) && \is_numeric($aTimers[0]) ? (int) $aTimers[0] : 0;
		$iFilesCacheTime = !empty($aTimers[1]) && \is_numeric($aTimers[1]) ? (int) $aTimers[1] : 0;
		$iPingTime = !empty($aTimers[2]) && \is_numeric($aTimers[2]) ? (int) $aTimers[2] : 0;

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

		if (0 === $iPingTime || $iPingTime + $iOneDay1 < \time())
		{
			$bPing = true;
			$iPingTime = \time();
		}

		if ($bMainCache || $bFilesCache || $bPing)
		{
			if (!$this->StorageProvider()->Put(null,
				\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY, 'Cache/Timers',
				\implode(',', array($iMainCacheTime, $iFilesCacheTime, $iPingTime))))
			{
				$bMainCache = $bFilesCache = $bPing = false;
			}
		}

		if ($bMainCache)
		{
			$this->Logger()->Write('Cacher GC: Begin');
			$this->Cacher()->GC(48);
			$this->Logger()->Write('Cacher GC: End');
		}

		if ($bFilesCache)
		{
			$this->Logger()->Write('Files GC: Begin');
			$this->FilesProvider()->GC(48);
			$this->Logger()->Write('Files GC: End');
		}

		if ($bPing)
		{
			$this->KeenIO('Ping');
		}

		$this->Plugins()->RunHook('service.app-delay-start-end');

		return $this->TrueResponse(__FUNCTION__);
	}

	/**
	 * @return array
	 */
	public function DoSystemFoldersUpdate()
	{
		$oAccount = $this->getAccountFromToken();

		$oSettings = $this->SettingsProvider()->Load($oAccount);

		$oSettings->SetConf('SentFolder', $this->GetActionParam('SentFolder', ''));
		$oSettings->SetConf('DraftFolder', $this->GetActionParam('DraftFolder', ''));
		$oSettings->SetConf('SpamFolder', $this->GetActionParam('SpamFolder', ''));
		$oSettings->SetConf('TrashFolder', $this->GetActionParam('TrashFolder', ''));
		$oSettings->SetConf('ArchiveFolder', $this->GetActionParam('ArchiveFolder', ''));
		$oSettings->SetConf('NullFolder', $this->GetActionParam('NullFolder', ''));

		return $this->DefaultResponse(__FUNCTION__,
			$this->SettingsProvider()->Save($oAccount, $oSettings));
	}

	/**
	 * @param \RainLoop\Config\Application $oConfig
	 * @param string $sParamName
	 * @param string $sConfigSector
	 * @param string $sConfigName
	 * @param string $sType = 'string'
	 * @param callable|null $mStringCallback = null
	 */
	private function setConfigFromParams(&$oConfig, $sParamName, $sConfigSector, $sConfigName, $sType = 'string', $mStringCallback = null)
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

	/**
	 * @param \RainLoop\Settings $oSettings
	 * @param string $sConfigName
	 * @param string $sType = 'string'
	 * @param callable|null $mStringCallback = null
	 */
	private function setSettingsFromParams(&$oSettings, $sConfigName, $sType = 'string', $mStringCallback = null)
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

	/**
	 * @return array
	 */
	public function DoAdminSettingsUpdate()
	{
//		return $this->DefaultResponse(__FUNCTION__, false);

		$this->IsAdminLoggined();

		$oConfig = $this->Config();

		$self = $this;

		$this->setConfigFromParams($oConfig, 'Language', 'webmail', 'language', 'string', function ($sLanguage) use ($self) {
			return $self->ValidateLanguage($sLanguage);
		});

		$this->setConfigFromParams($oConfig, 'Theme', 'webmail', 'theme', 'string', function ($sTheme) use ($self) {
			return $self->ValidateTheme($sTheme);
		});

		$this->setConfigFromParams($oConfig, 'AllowThemes', 'webmail', 'allow_themes', 'bool');
		$this->setConfigFromParams($oConfig, 'AllowCustomTheme', 'webmail', 'allow_custom_theme', 'bool');
		$this->setConfigFromParams($oConfig, 'AllowLanguagesOnSettings', 'webmail', 'allow_languages_on_settings', 'bool');
		$this->setConfigFromParams($oConfig, 'AllowLanguagesOnLogin', 'login', 'allow_languages_on_login', 'bool');
		$this->setConfigFromParams($oConfig, 'AllowCustomLogin', 'login', 'allow_custom_login', 'bool');
		$this->setConfigFromParams($oConfig, 'LoginDefaultDomain', 'login', 'default_domain', 'string');

		$this->setConfigFromParams($oConfig, 'ContactsEnable', 'contacts', 'enable', 'bool');
		$this->setConfigFromParams($oConfig, 'ContactsSharing', 'contacts', 'allow_sharing', 'bool');
		$this->setConfigFromParams($oConfig, 'ContactsSync', 'contacts', 'allow_sync', 'bool');
		$this->setConfigFromParams($oConfig, 'ContactsPdoDsn', 'contacts', 'pdo_dsn', 'string');
		$this->setConfigFromParams($oConfig, 'ContactsPdoUser', 'contacts', 'pdo_user', 'string');
		$this->setConfigFromParams($oConfig, 'ContactsPdoPassword', 'contacts', 'pdo_password', 'dummy');

		$this->setConfigFromParams($oConfig, 'ContactsPdoType', 'contacts', 'type', 'string', function ($sType) use ($self) {
			return $self->ValidateContactPdoType($sType);
		});

		$this->setConfigFromParams($oConfig, 'AllowAdditionalAccounts', 'webmail', 'allow_additional_accounts', 'bool');
		$this->setConfigFromParams($oConfig, 'AllowIdentities', 'webmail', 'allow_identities', 'bool');

		$this->setConfigFromParams($oConfig, 'DetermineUserLanguage', 'labs', 'determine_user_language', 'bool');

		$this->setConfigFromParams($oConfig, 'Title', 'webmail', 'title', 'string');
		$this->setConfigFromParams($oConfig, 'LoadingDescription', 'webmail', 'loading_description', 'string');

		$this->setConfigFromParams($oConfig, 'LoginLogo', 'branding', 'login_logo', 'string');
		$this->setConfigFromParams($oConfig, 'LoginDescription', 'branding', 'login_desc', 'string');
		$this->setConfigFromParams($oConfig, 'LoginCss', 'branding', 'login_css', 'string');

		$this->setConfigFromParams($oConfig, 'TokenProtection', 'security', 'csrf_protection', 'bool');
		$this->setConfigFromParams($oConfig, 'OpenPGP', 'security', 'openpgp', 'bool');
		$this->setConfigFromParams($oConfig, 'AllowTwoFactorAuth', 'security', 'allow_two_factor_auth', 'bool');
		$this->setConfigFromParams($oConfig, 'EnabledPlugins', 'plugins', 'enable', 'bool');

		$this->setConfigFromParams($oConfig, 'GoogleEnable', 'social', 'google_enable', 'bool');
		$this->setConfigFromParams($oConfig, 'GoogleClientID', 'social', 'google_client_id', 'string');
		$this->setConfigFromParams($oConfig, 'GoogleClientSecret', 'social', 'google_client_secret', 'string');

		$this->setConfigFromParams($oConfig, 'FacebookEnable', 'social', 'fb_enable', 'bool');
		$this->setConfigFromParams($oConfig, 'FacebookAppID', 'social', 'fb_app_id', 'string');
		$this->setConfigFromParams($oConfig, 'FacebookAppSecret', 'social', 'fb_app_secret', 'string');

		$this->setConfigFromParams($oConfig, 'TwitterEnable', 'social', 'twitter_enable', 'bool');
		$this->setConfigFromParams($oConfig, 'TwitterConsumerKey', 'social', 'twitter_consumer_key', 'string');
		$this->setConfigFromParams($oConfig, 'TwitterConsumerSecret', 'social', 'twitter_consumer_secret', 'string');

		$this->setConfigFromParams($oConfig, 'DropboxEnable', 'social', 'dropbox_enable', 'bool');
		$this->setConfigFromParams($oConfig, 'DropboxApiKey', 'social', 'dropbox_api_key', 'string');

		return $this->DefaultResponse(__FUNCTION__, $oConfig->Save());
	}

	/**
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoAdminLogin()
	{
		$sLogin = trim($this->GetActionParam('Login', ''));
		$sPassword = $this->GetActionParam('Password', '');

		$this->Logger()->AddSecret($sPassword);

		if (0 === strlen($sLogin) || 0 === strlen($sPassword) ||
			!$this->Config()->Get('security', 'allow_admin_panel', true) ||
			$sLogin !== $this->Config()->Get('security', 'admin_login', '') ||
			!$this->Config()->ValidatePassword($sPassword))
		{
			$this->loginErrorDelay();
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AuthError);
		}

		$this->setAdminAuthToken($this->getAdminToken());

		return $this->TrueResponse(__FUNCTION__);
	}

	/**
	 * @return array
	 */
	public function DoAdminLogout()
	{
		$this->ClearAdminAuthToken();
		return $this->TrueResponse(__FUNCTION__);
	}

	/**
	 * @return array
	 */
	public function DoAdminPing()
	{
		$this->IsAdminLoggined();

		return $this->DefaultResponse(__FUNCTION__, true);
	}

	/**
	 * @return array
	 */
	public function DoAdminContactsTest()
	{
		$this->IsAdminLoggined();

		$oConfig = $this->Config();

		$this->setConfigFromParams($oConfig, 'ContactsPdoDsn', 'contacts', 'pdo_dsn', 'string');
		$this->setConfigFromParams($oConfig, 'ContactsPdoUser', 'contacts', 'pdo_user', 'string');
		$this->setConfigFromParams($oConfig, 'ContactsPdoPassword', 'contacts', 'pdo_password', 'dummy');

		$self = $this;
		$this->setConfigFromParams($oConfig, 'ContactsPdoType', 'contacts', 'type', 'string', function ($sType) use ($self) {
			return $self->ValidateContactPdoType($sType);
		});

		$sTestMessage = $this->PersonalAddressBookProvider(null, true)->Test();
		return $this->DefaultResponse(__FUNCTION__, array(
			'Result' => '' === $sTestMessage,
			'Message' => \MailSo\Base\Utils::Utf8Clear($sTestMessage, '?')
		));
	}

	/**
	 * @return array
	 */
	public function DoAdminLicensing()
	{
		$iStart = \time();
		$this->IsAdminLoggined();

		$sForce = '1' === (string) $this->GetActionParam('Force', '0');

		$mResult = false;
		$iErrorCode = -1;

		$oHttp = \MailSo\Base\Http::SingletonInstance();
		if ($oHttp->CheckLocalhost(APP_SITE))
		{
			return $this->DefaultResponse(__FUNCTION__, $mResult);
		}

		$sDomain = APP_SITE;
		if (2 < \strlen($sDomain))
		{
			$sValue = '';
			$iTime = $this->Cacher()->GetTimer('Licensing/DomainKey/Value/'.$sDomain);
			if (!$sForce && $iTime + 60 * 5 > \time())
			{
				$sValue = $this->Cacher()->Get('Licensing/DomainKey/Value/'.$sDomain);
			}

			if (0 === \strlen($sValue))
			{
				$iCode = 0;
				$sContentType = '';
				
				$sValue = $oHttp->GetUrlAsString(APP_API_PATH.'status/'.\urlencode($sDomain),
					'RainLoop',	$sContentType, $iCode, $this->Logger(), 10,
					$this->Config()->Get('labs', 'curl_proxy', ''), $this->Config()->Get('labs', 'curl_proxy_auth', ''));

				if (200 !== $iCode)
				{
					$sValue = '';
				}

				if ($iStart === \time())
				{
					\sleep(1);
				}

				$this->Cacher()->Set('Licensing/DomainKey/Value/'.$sDomain, $sValue);
				$this->Cacher()->SetTimer('Licensing/DomainKey/Value/'.$sDomain);
			}

			$aMatch = array();
			if (5 < \strlen($sValue) && \preg_match('/^EXPIRED:([\d]+)$/', $sValue, $aMatch))
			{
				$mResult = array(
					'Banned' => false,
					'Expired' => (int) $aMatch[1],
				);
			}
			else if ($sValue === 'NO')
			{
				$iErrorCode = -1;
			}
			else if ($sValue === 'TOO_MANY_CONNECTIONS')
			{
				$iErrorCode = -1;
			}
			else
			{
				$iErrorCode = \RainLoop\Notifications::LicensingServerIsUnavailable;
			}
		}

		if (0 < $iErrorCode && !$mResult)
		{
			throw new \RainLoop\Exceptions\ClientException($iErrorCode);
		}

		return $this->DefaultResponse(__FUNCTION__, $mResult);
	}

	/**
	 * @return array
	 */
	public function DoAdminLicensingActivate()
	{
		$iStart = \time();
		$this->IsAdminLoggined();

		$sDomain = (string) $this->GetActionParam('Domain', '');
		$sKey = (string) $this->GetActionParam('Key', '');

		$mResult = false;
		$iErrorCode = -1;

		if (2 < \strlen($sDomain) && 2 < \strlen($sKey) && $sDomain === APP_SITE)
		{
			$iCode = 0;
			$sContentType = '';

			$oHttp = \MailSo\Base\Http::SingletonInstance();

			\sleep(1);
			$sValue = $oHttp->GetUrlAsString(APP_API_PATH.'activate/'.\urlencode($sDomain).'/'.\urlencode($sKey),
				'RainLoop',	$sContentType, $iCode, $this->Logger(), 10,
				$this->Config()->Get('labs', 'curl_proxy', ''), $this->Config()->Get('labs', 'curl_proxy_auth', ''));

			if (200 !== $iCode)
			{
				$sValue = '';
			}

			if ($iStart + 2 > \time())
			{
				\sleep(1);
			}

			$aMatch = array();
			if ('OK' === $sValue)
			{
				$mResult = true;
			}
			else if ('TOO_MANY_CONNECTIONS' === $sValue)
			{
				$mResult = 'Too many connections. Please try again later.';
			}
			else if (\preg_match('/^ERROR:(.+)$/', $sValue, $aMatch) && !empty($aMatch[1]))
			{
				$mResult = trim($aMatch[1]);
				$this->Logger()->Write('Activation error for: '.$sKey.' ('.$sDomain.')', \MailSo\Log\Enumerations\Type::ERROR);
				$this->Logger()->Write($mResult, \MailSo\Log\Enumerations\Type::ERROR);
			}
			else
			{
				$iErrorCode = \RainLoop\Notifications::LicensingServerIsUnavailable;
			}
		}

		if (0 < $iErrorCode && !$mResult)
		{
			throw new \RainLoop\Exceptions\ClientException($iErrorCode);
		}

		return $this->DefaultResponse(__FUNCTION__, $mResult);
	}

	/**
	 * @return array
	 */
	public function DoAdminPasswordUpdate()
	{
		$this->IsAdminLoggined();

		$bResult = false;
		$oConfig = $this->Config();

		$sPassword = $this->GetActionParam('Password', '');
		$sNewPassword = $this->GetActionParam('NewPassword', '');

		if ($oConfig->ValidatePassword($sPassword))
		{
			$bResult = true;
			$oConfig->SetPassword($sNewPassword);
		}

		return $this->DefaultResponse(__FUNCTION__, $bResult ? $oConfig->Save() : false);
	}

	/**
	 * @return array
	 */
	public function DoAdminDomainLoad()
	{
		$this->IsAdminLoggined();

		return $this->DefaultResponse(__FUNCTION__,
			$this->DomainProvider()->Load($this->GetActionParam('Name', '')));
	}

	/**
	 * @return array
	 */
	public function DoAdminDomainList()
	{
		$this->IsAdminLoggined();

		$iOffset = (int) $this->GetActionParam('Offset', 0);
		$iLimit = (int) $this->GetActionParam('Limit', 20);
		$sSearch = (string) $this->GetActionParam('Search', '');

		$iOffset = 0;
		$iLimit = 99;
		$sSearch = '';

		return $this->DefaultResponse(__FUNCTION__,
			$this->DomainProvider()->GetList($iOffset, $iLimit, $sSearch));
	}

	/**
	 * @return array
	 */
	public function DoAdminDomainDelete()
	{
		$this->IsAdminLoggined();

		return $this->DefaultResponse(__FUNCTION__,
			$this->DomainProvider()->Delete((string) $this->GetActionParam('Name', '')));
	}

	/**
	 * @return array
	 */
	public function DoAdminDomainDisable()
	{
		$this->IsAdminLoggined();

		return $this->DefaultResponse(__FUNCTION__, $this->DomainProvider()->Disable(
			(string) $this->GetActionParam('Name', ''),
			'1' === (string) $this->GetActionParam('Disabled', '0')
		));
	}

	/**
	 * @return array
	 */
	public function DoAdminDomainSave()
	{
		$this->IsAdminLoggined();

		$oDomain = $this->DomainProvider()->LoadOrCreateNewFromAction($this);

		return $this->DefaultResponse(__FUNCTION__,
			$oDomain instanceof \RainLoop\Domain ? $this->DomainProvider()->Save($oDomain) : false);
	}

	/**
	 * @return array
	 */
	public function DoAdminDomainTest()
	{
		$this->IsAdminLoggined();

		$bImapResult = false;
		$bSmtpResult = false;

		$iImapTime = 0;
		$iSmtpTime = 0;

		$oDomain = $this->DomainProvider()->LoadOrCreateNewFromAction($this, 'domain-test-connection.de');
		if ($oDomain)
		{
			try
			{
				$oImapClient = \MailSo\Imap\ImapClient::NewInstance()->SetLogger($this->Logger());
				$oImapClient->SetTimeOuts(5);

				$iTime = microtime(true);
				$oImapClient->Connect($oDomain->IncHost(), $oDomain->IncPort(), $oDomain->IncSecure());
				$iImapTime = microtime(true) - $iTime;
				$oImapClient->Disconnect();
				$bImapResult = true;
			}
			catch (\Exception $oException)
			{
				$this->Logger()->WriteException($oException, \MailSo\Log\Enumerations\Type::ERROR);
			}

			try
			{
				$oSmtpClient = \MailSo\Smtp\SmtpClient::NewInstance()->SetLogger($this->Logger());
				$oSmtpClient->SetTimeOuts(5);

				$iTime = microtime(true);
				$oSmtpClient->Connect($oDomain->OutHost(), $oDomain->OutPort(), '127.0.0.1', $oDomain->OutSecure());
				$iSmtpTime = microtime(true) - $iTime;
				$oSmtpClient->Disconnect();
				$bSmtpResult = true;
			}
			catch (\Exception $oException)
			{
				$this->Logger()->WriteException($oException, \MailSo\Log\Enumerations\Type::ERROR);
			}
		}

		return $this->DefaultResponse(__FUNCTION__, array(
			'Imap' => $bImapResult ? $iImapTime : false,
			'Smtp' => $bSmtpResult ? $iSmtpTime : false
		));
	}
	
	/**
	 * @param bool $bAdditionalOnly = false
	 *
	 * @return string
	 */
	private function rainloopRepo($bAdditionalOnly = false)
	{
		if ($bAdditionalOnly)
		{
			$sUrl = $this->Config()->Get('labs', 'additional_repo', '');
		}
		else
		{
			$sUrl = $this->Config()->Get('labs', 'custom_repo', '');
			if (0 === \strlen($sUrl))
			{
				$sUrl = APP_REP_PATH;
			}
		}

		if ('' !== $sUrl)
		{
			$sUrl = rtrim($sUrl, '\\/').'/';
		}
		
		return $sUrl;
	}
	
	private function rainLoopUpdatable()
	{
		return @file_exists(APP_INDEX_ROOT_PATH.'index.php') &&
			@is_writable(APP_INDEX_ROOT_PATH.'index.php') &&
			@is_writable(APP_INDEX_ROOT_PATH.'rainloop/');
	}

	private function rainLoopCoreAccess()
	{
		$sCoreAccess = \strtolower(\preg_replace('/[\s,;]+/', ' ',
			$this->Config()->Get('security', 'core_install_access_domains', '')));

		return '' === $sCoreAccess || APP_SITE === $sCoreAccess;
	}

	/**
	 * @param string $sRepo
	 * @param bool $bReal = false
	 * @param bool $bMain = true
	 * @return array
	 */
	private function getRepositoryDataByUrl($sRepo, &$bReal = false, $bMain = true)
	{
		$bReal = false;
		$aRep = null;

		$sRep = '';
		$sRepoFile = 'repository.json';
		$iRepTime = 0;

		if ($bMain)
		{
			switch (\strtolower(\trim($this->Config()->Get('labs', 'repo_type', 'stable'))))
			{
				case 'dev':
				case 'nightly':
				case 'beta':
					$sRepoFile = 'beta.repository.json';
					break;
				case 'stable':
				default:
					$sRepoFile = 'repository.json';
					break;
			}
		}

		$oHttp = \MailSo\Base\Http::SingletonInstance();

		$sCacheKey = 'UPDATER/('.$sRepo.')/'.$sRepoFile;
		$sRep = $this->Cacher()->Get($sCacheKey);
		if ('' !== $sRep)
		{
			$iRepTime = $this->Cacher()->GetTimer($sCacheKey);
		}

		if ('' === $sRep || 0 === $iRepTime || time() - 3600 > $iRepTime)
		{
			$iCode = 0;
			$sContentType = '';

			$sRepPath = $sRepo.$sRepoFile;
			$sRep = '' !== $sRepo ? $oHttp->GetUrlAsString($sRepPath, 'RainLoop', $sContentType, $iCode, $this->Logger(), 10,
				$this->Config()->Get('labs', 'curl_proxy', ''), $this->Config()->Get('labs', 'curl_proxy_auth', '')) : false;
			
			if (false !== $sRep)
			{
				$aRep = @\json_decode($sRep);
				$bReal = \is_array($aRep) && 0 < \count($aRep);

				if ($bReal)
				{
					$this->Cacher()->Set($sCacheKey, $sRep);
					$this->Cacher()->SetTimer($sCacheKey);
				}
			}
			else
			{
				$this->Logger()->Write('Cannot read remote repository file: '.$sRepPath, \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
			}
		}
		else if ('' !== $sRep)
		{
			$aRep = @\json_decode($sRep, false, 10);
			$bReal = \is_array($aRep) && 0 < \count($aRep);
		}

		$bCoreAccess = $this->rainLoopCoreAccess();
		
		$aResult = array();
		if (\is_array($aRep))
		{
			foreach ($aRep as $oItem)
			{
				if ($oItem && isset($oItem->type, $oItem->id, $oItem->name,
					$oItem->version, $oItem->release, $oItem->file, $oItem->description))
				{
					if (!empty($oItem->required) && APP_DEV_VERSION !== APP_VERSION && version_compare(APP_VERSION, $oItem->required, '<'))
					{
						continue;
					}

					if (!empty($oItem->depricated) && APP_DEV_VERSION !== APP_VERSION && version_compare(APP_VERSION, $oItem->depricated, '>='))
					{
						continue;
					}

					if ('core' === $oItem->type)
					{
						if ($bCoreAccess)
						{
							$aResult[] = array(
								'type' => $oItem->type,
								'id' => $oItem->id,
								'name' => $oItem->name,
								'installed' => APP_VERSION,
								'version' => $oItem->version,
								'file' => $oItem->file,
								'release' => $oItem->release,
								'release_notes' => isset($oItem->{'release_notes'}) ? $oItem->{'release_notes'} : '',
								'desc' => $oItem->description
							);
						}
					}
					else if ('plugin' === $oItem->type)
					{
						$aResult[] = array(
							'type' => $oItem->type,
							'id' => $oItem->id,
							'name' => $oItem->name,
							'installed' => '',
							'version' => $oItem->version,
							'file' => $oItem->file,
							'release' => $oItem->release,
							'release_notes' => isset($oItem->{'release_notes'}) ? $oItem->{'release_notes'} : '',
							'desc' => $oItem->description
						);
					}
				}
			}
		}

		return $aResult;
	}
	
	private function getRepositoryData(&$bReal, &$bRainLoopUpdatable)
	{
		$bRainLoopUpdatable = $this->rainLoopUpdatable();
		$bCoreAccess = $this->rainLoopCoreAccess();

		$aResult = $this->getRepositoryDataByUrl($this->rainloopRepo(), $bReal);

		$sAddRepo = $this->rainloopRepo(true);
		if (0 < \strlen($sAddRepo))
		{
			$bFakeReal = false;
			$aAddData = $this->getRepositoryDataByUrl($sAddRepo, $bFakeReal, false);
			if ($bFakeReal && \is_array($aAddData) && 0 < \count($aAddData))
			{
				$aResult = \array_merge($aResult, $aAddData);
			}
		}

		$bAddCore = false;
		foreach ($aResult as $aItem)
		{
			if ($aItem && 'core' === $aItem['type'])
			{
				$bAddCore = true;
				break;
			}
		}

		if ($bCoreAccess && !$bAddCore)
		{
			\array_unshift($aResult, array(
				'type' => 'core',
				'id' => 'rainloop',
				'name' => 'RainLoop Webmail (core)',
				'installed' => APP_VERSION,
				'version' => '',
				'file' => '',
				'release' => '',
				'release_notes' => '',
				'desc' => ''
			));
		}

		$aInstalled = $this->Plugins()->InstalledPlugins();
		if (\is_array($aInstalled))
		{
			foreach ($aResult as &$aItem)
			{
				if ('plugin' === $aItem['type'])
				{
					foreach ($aInstalled as &$aSubItem)
					{
						if (\is_array($aSubItem) && isset($aSubItem[0]) && $aSubItem[0] === $aItem['id'])
						{
							$aSubItem[2] = true;
							$aItem['installed'] = $aSubItem[1];
						}
					}
				}
			}

			foreach ($aInstalled as $aSubItemSec)
			{
				if ($aSubItemSec && !isset($aSubItemSec[2]))
				{
					\array_push($aResult, array(
						'type' => 'plugin',
						'id' => $aSubItemSec[0],
						'name' => $aSubItemSec[0],
						'installed' => $aSubItemSec[1],
						'version' => '',
						'file' => '',
						'release' => '',
						'release_notes' => '',
						'desc' => ''
					));
				}
			}
		}

		foreach ($aResult as &$aItem)
		{
			$aItem['compare'] = \version_compare($aItem['installed'], $aItem['version'], '<');
			$aItem['canBeDeleted'] = '' !== $aItem['installed'] && 'plugin' === $aItem['type'];
			$aItem['canBeUpdated'] = $aItem['compare'];
			$aItem['canBeInstalled'] = true;

			if ('plugin' !== $aItem['type'])
			{
				if (!$bRainLoopUpdatable)
				{
					$aItem['canBeInstalled'] = false;
					$aItem['canBeUpdated'] = false;
					$aItem['compare'] = false;
				}
				else if (APP_VERSION === APP_DEV_VERSION)
				{
					$aItem['canBeUpdated'] = false;
				}
			}
		}

		return $aResult;
	}
	
	/**
	 * @return array
	 */
	public function DoAdminPackagesList()
	{
		$this->IsAdminLoggined();
				
		$bReal = false;
		$bRainLoopUpdatable = false;
		$aList = $this->getRepositoryData($bReal, $bRainLoopUpdatable);

		return $this->DefaultResponse(__FUNCTION__, array(
			 'Real' => $bReal,
			 'MainUpdatable' => $bRainLoopUpdatable,
			 'List' => $aList
		));
	}
	
	/**
	 * @return array
	 */
	public function DoAdminPackageDelete()
	{
		$this->IsAdminLoggined();
		
		$sId = $this->GetActionParam('Id', '');
	
		$bReal = false;
		$bRainLoopUpdatable = false;
		$aList = $this->getRepositoryData($bReal, $bRainLoopUpdatable);
		
		$sResultId = '';
		foreach ($aList as $oItem)
		{
			if ($oItem && 'plugin' === $oItem['type'] && $sId === $oItem['id'])
			{
				$sResultId = $sId;
				break;
			}
		}
		
		$bResult = false;
		if ('' !== $sResultId)
		{
			$bResult = \MailSo\Base\Utils::RecRmDir(APP_PLUGINS_PATH.$sResultId);
			if ($bResult)
			{
				$this->pluginEnable($sResultId, false);
			}
		}
		
		return $this->DefaultResponse(__FUNCTION__, $bResult);
	}
	
	/**
	 * @return array
	 */
	public function DoAdminPackageInstall()
	{
		$this->IsAdminLoggined();
		
		$sType = $this->GetActionParam('Type', '');
		$sId = $this->GetActionParam('Id', '');
		$sFile = $this->GetActionParam('File', '');

		$this->Logger()->Write('Start package install: '.$sFile.' ('.$sType.')', \MailSo\Log\Enumerations\Type::INFO, 'INSTALLER');
		
		$sRealFile = '';
		
		$bReal = false;
		$bRainLoopUpdatable = false;
		$aList = $this->getRepositoryData($bReal, $bRainLoopUpdatable);
		
		if (('plugin' !== $sType && $bRainLoopUpdatable) || 'plugin' === $sType)
		{
			foreach ($aList as $oItem)
			{
				if ($oItem && $sFile === $oItem['file'] && $sId === $oItem['id'])
				{
					$sRealFile = $sFile;
					break;
				}
			}
		}

		$sTmp = '';
		$bResult = false;
		if ('' !== $sRealFile)
		{
			$sUrl = $this->rainloopRepo().$sRealFile;
			$sTmp = APP_PRIVATE_DATA.md5(microtime(true).$sRealFile).'.zip';
			$pDest = @fopen($sTmp, 'w+b');
			if ($pDest)
			{
				$iCode = 0;
				$sContentType = '';

				@\set_time_limit(60);

				$oHttp = \MailSo\Base\Http::SingletonInstance();
				$bResult = $oHttp->SaveUrlToFile($sUrl, $pDest, $sTmp, $sContentType, $iCode, $this->Logger(), 60,
					$this->Config()->Get('labs', 'curl_proxy', ''), $this->Config()->Get('labs', 'curl_proxy_auth', ''));
				
				if (!$bResult)
				{
					$this->Logger()->Write('Cannot save url to temp file: ', \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
					$this->Logger()->Write($sUrl.' -> '.$sTmp, \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
				}

				@\fclose($pDest);
			}
			else
			{
				$this->Logger()->Write('Cannot create temp file: '.$sTmp, \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
			}
		}
		
		if ($bResult && '' !== $sTmp)
		{
			include_once APP_VERSION_ROOT_PATH.'app/libraries/pclzip/pclzip.lib.php';

			$oArchive = new \PclZip($sTmp);
			if ('plugin' !== $sType)
			{
				$bResult = false;
				
				$sTmpFolder = APP_PRIVATE_DATA.\md5($sTmp);

				\mkdir($sTmpFolder);
				if (\is_dir($sTmpFolder))
				{
					$bResult = 0 !== $oArchive->extract(PCLZIP_OPT_PATH, $sTmpFolder);
					if (!$bResult)
					{
						$this->Logger()->Write('Cannot extract package files: '.$oArchive->errorInfo(), \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
					}

					if ($bResult && \file_exists($sTmpFolder.'/index.php') &&
						\is_writable(APP_INDEX_ROOT_PATH.'rainloop/') &&
						\file_exists($sTmpFolder.'/data/VERSION') &&
						\is_dir($sTmpFolder.'/rainloop/'))
					{
						$sNewVersion = \file_get_contents($sTmpFolder.'/data/VERSION');
						if ($sNewVersion && !\is_dir(APP_INDEX_ROOT_PATH.'rainloop/v/'.$sNewVersion))
						{
							\MailSo\Base\Utils::CopyDir($sTmpFolder.'/rainloop/', APP_INDEX_ROOT_PATH.'rainloop/');

							if (\is_dir(APP_INDEX_ROOT_PATH.'rainloop/v/'.$sNewVersion) &&
								\copy($sTmpFolder.'/data/VERSION', APP_DATA_FOLDER_PATH.'VERSION'))
							{
								if (\md5_file($sTmpFolder.'/index.php') !== \md5_file(APP_INDEX_ROOT_PATH.'index.php'))
								{
									\copy($sTmpFolder.'/index.php', APP_INDEX_ROOT_PATH.'index.php');
								}

								$bResult = true;
							}
							else
							{
								$this->Logger()->Write('Cannot copy new package files', \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
								$this->Logger()->Write($sTmpFolder.'/rainloop/ -> '.APP_INDEX_ROOT_PATH.'rainloop/', \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
							}
						}
						else
						{
							$this->Logger()->Write($sNewVersion.' version already installed', \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
						}
					}
					else if ($bResult)
					{
						$this->Logger()->Write('Cannot validate package files', \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
					}

					\MailSo\Base\Utils::RecRmDir($sTmpFolder);
				}
				else
				{
					$this->Logger()->Write('Cannot create tmp folder: '.$sTmpFolder, \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
				}
			}
			else
			{
				$bResult = true;
				if (\is_dir(APP_PLUGINS_PATH.$sId))
				{
					$bResult = \MailSo\Base\Utils::RecRmDir(APP_PLUGINS_PATH.$sId);
					if (!$bResult)
					{
						$this->Logger()->Write('Cannot remove previous plugin folder: '.$sId, \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
					}
				}
				
				if ($bResult)
				{
					$bResult = 0 !== $oArchive->extract(PCLZIP_OPT_PATH, APP_PLUGINS_PATH);
					if (!$bResult)
					{
						$this->Logger()->Write('Cannot extract package files: '.$oArchive->errorInfo(), \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
					}
				}
			}
			
			@\unlink($sTmp);
		}

		return $this->DefaultResponse(__FUNCTION__, $bResult ?
			('plugin' !== $sType ? array('Reload' => true) : true) : false);
	}
	
	/**
	 * @return array
	 */
	public function DoAdminPluginList()
	{
		$this->IsAdminLoggined();
		
		$aResult = array();
		
		$sEnabledPlugins = $this->Config()->Get('plugins', 'enabled_list', '');
		$aEnabledPlugins = \explode(',', \strtolower($sEnabledPlugins));
		$aEnabledPlugins = \array_map('trim', $aEnabledPlugins);
		
		$aList = $this->Plugins()->InstalledPlugins();
		foreach ($aList as $aItem)
		{
			$aResult[] = array(
				'Name' => $aItem[0],
				'Enabled' => \in_array(\strtolower($aItem[0]), $aEnabledPlugins),
				'Configured' => false
			);
		}
		
		return $this->DefaultResponse(__FUNCTION__, $aResult);
	}

	/**
	 * @param string $sName
	 * @param bool $bEnable = true
	 * @return bool
	 */
	private function pluginEnable($sName, $bEnable = true)
	{
		if (0 === \strlen($sName))
		{
			return false;
		}

		$oConfig = $this->Config();
		
		$sEnabledPlugins = $oConfig->Get('plugins', 'enabled_list', '');
		$aEnabledPlugins = \explode(',', \strtolower($sEnabledPlugins));
		$aEnabledPlugins = \array_map('trim', $aEnabledPlugins);

		$aNewEnabledPlugins = array();
		if ($bEnable)
		{
			$aNewEnabledPlugins = $aEnabledPlugins;
			$aNewEnabledPlugins[] = $sName;
		}
		else
		{
			foreach ($aEnabledPlugins as $sPlugin)
			{
				if ($sName !== $sPlugin && 0 < \strlen($sPlugin))
				{
					$aNewEnabledPlugins[] = $sPlugin;
				}
			}
		}

		$aNewEnabledPlugins = \array_unique($aNewEnabledPlugins);
		$oConfig->Set('plugins', 'enabled_list', \trim(\implode(',', $aNewEnabledPlugins), ' ,'));

		return $oConfig->Save();
	}

	/**
	 * @return array
	 */
	public function DoAdminPluginDisable()
	{
		$this->IsAdminLoggined();
		
		$sName = (string) $this->GetActionParam('Name', '');
		$bDisable = '1' === (string) $this->GetActionParam('Disabled', '1');
		
		if (!$bDisable)
		{
			$oPlugin = $this->Plugins()->CreatePluginByName($sName);
			if ($oPlugin instanceof \RainLoop\Plugins\AbstractPlugin)
			{
				$sValue = $oPlugin->Supported();
				if (0 < \strlen($sValue))
				{
					return $this->FalseResponse(__FUNCTION__, \RainLoop\Notifications::UnsupportedPluginPackage, $sValue);
				}
			}
			else
			{
				return $this->FalseResponse(__FUNCTION__, \RainLoop\Notifications::InvalidPluginPackage);
			}
		}
		
		return $this->DefaultResponse(__FUNCTION__, $this->pluginEnable($sName, !$bDisable));
	}
	
	/**
	 * @return array
	 */
	public function DoAdminPluginLoad()
	{
		$this->IsAdminLoggined();
		
		$mResult = false;
		$sName = (string) $this->GetActionParam('Name', '');

		if (!empty($sName))
		{
			$oPlugin = $this->Plugins()->CreatePluginByName($sName);
			if ($oPlugin)
			{
				$mResult = array(
					 'Name' => $sName,
					 'Readme' => file_exists($oPlugin->Path().'/README') ? file_get_contents($oPlugin->Path().'/README') : '',
					 'Config' => array()
				);

				$aMap = $oPlugin->ConfigMap();
				$oConfig = $oPlugin->Config();
				if (is_array($aMap) && 0 < count($aMap))
				{
					foreach ($aMap as $oItem)
					{
						if ($oItem && $oItem instanceof \RainLoop\Plugins\Property)
						{
							$aItem = $oItem->ToArray();
							$aItem[0] = $oConfig->Get('plugin', $oItem->Name(), '');
							if (\RainLoop\Enumerations\PluginPropertyType::PASSWORD === $oItem->Type())
							{
								$aItem[0] = APP_DUMMY;
							}
							
							$mResult['Config'][] = $aItem;
						}
					}
				}
			}
		}
		
		return $this->DefaultResponse(__FUNCTION__, $mResult);
	}
	
	/**
	 * @return array
	 */
	public function DoAdminPluginSettingsUpdate()
	{
		$this->IsAdminLoggined();
		
		$mResult = false;
		$sName = (string) $this->GetActionParam('Name', '');
		
		if (!empty($sName))
		{
			$oPlugin = $this->Plugins()->CreatePluginByName($sName);
			if ($oPlugin)
			{
				$oConfig = $oPlugin->Config();
				$aMap = $oPlugin->ConfigMap();
				if (is_array($aMap) && 0 < count($aMap))
				{
					foreach ($aMap as $oItem)
					{
						$sValue = $this->GetActionParam('_'.$oItem->Name(), $oConfig->Get('plugin', $oItem->Name()));
						if (\RainLoop\Enumerations\PluginPropertyType::PASSWORD !== $oItem->Type() || APP_DUMMY !== $sValue)
						{
							$mResultValue = null;
							switch ($oItem->Type()) {
								case \RainLoop\Enumerations\PluginPropertyType::INT:
									$mResultValue  = (int) $sValue;
									break;
								case \RainLoop\Enumerations\PluginPropertyType::BOOL:
									$mResultValue  = '1' === (string) $sValue;
									break;
								case \RainLoop\Enumerations\PluginPropertyType::SELECTION:
									if (is_array($oItem->DefaultValue()) && in_array($sValue, $oItem->DefaultValue()))
									{
										$mResultValue = (string) $sValue;
									}
									break;
								case \RainLoop\Enumerations\PluginPropertyType::PASSWORD:
								case \RainLoop\Enumerations\PluginPropertyType::STRING:
								case \RainLoop\Enumerations\PluginPropertyType::STRING_TEXT:
									$mResultValue = (string) $sValue;
									break;
							}
							
							if (null !== $mResultValue)
							{
								$oConfig->Set('plugin', $oItem->Name(), $mResultValue);
							}
						}
					}
				}
				
				$mResult = $oConfig->Save();
			}
		}
		
		if (!$mResult)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CantSavePluginSettings);
		}
		
		return $this->DefaultResponse(__FUNCTION__, true);
	}

	/**
	 * @return array
	 */
	public function DoSettingsUpdate()
	{
		$oAccount = $this->getAccountFromToken();

		$oSettings = $this->SettingsProvider()->Load($oAccount);

		$self = $this;

		$oConfig = $this->Config();

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

		if ($oConfig->Get('webmail', 'allow_themes', true))
		{
			$this->setSettingsFromParams($oSettings, 'Theme', 'string', function ($sTheme) use ($self) {
				return $self->ValidateTheme($sTheme);
			});
		}
		else
		{
			$oSettings->SetConf('Theme', $this->ValidateLanguage($oConfig->Get('webmail', 'theme', 'Default')));
		}

		$this->setSettingsFromParams($oSettings, 'CustomThemeType', 'string', function ($sCustomThemeType) {
			return \in_array($sCustomThemeType, array(
				\RainLoop\Enumerations\CustomThemeType::LIGHT, \RainLoop\Enumerations\CustomThemeType::DARK)) ?
					$sCustomThemeType : \RainLoop\Enumerations\CustomThemeType::LIGHT;
		});

		$this->setSettingsFromParams($oSettings, 'MPP', 'int', function ($iValue) {
			return (int) (\in_array($iValue, array(10, 20, 30, 50, 100, 150, 200, 300)) ? $iValue : 20);
		});
		
		$this->setSettingsFromParams($oSettings, 'Layout', 'int', function ($iValue) {
			return (int) (\in_array((int) $iValue, array(\RainLoop\Enumerations\Layout::NO_PREVIW,
				\RainLoop\Enumerations\Layout::SIDE_PREVIEW, \RainLoop\Enumerations\Layout::BOTTOM_PREVIEW)) ?
					$iValue : \RainLoop\Enumerations\Layout::SIDE_PREVIEW);
		});

		$this->setSettingsFromParams($oSettings, 'EditorDefaultType', 'string');
		$this->setSettingsFromParams($oSettings, 'ShowImages', 'bool');
		$this->setSettingsFromParams($oSettings, 'ContactsAutosave', 'bool');
		$this->setSettingsFromParams($oSettings, 'InterfaceAnimation', 'string', function ($sValue) {
			return (\in_array($sValue,
				array(\RainLoop\Enumerations\InterfaceAnimation::NONE,
					\RainLoop\Enumerations\InterfaceAnimation::NORMAL,
					\RainLoop\Enumerations\InterfaceAnimation::FULL)) ? $sValue :
						\RainLoop\Enumerations\InterfaceAnimation::FULL);
		});
		$this->setSettingsFromParams($oSettings, 'DesktopNotifications', 'bool');
		$this->setSettingsFromParams($oSettings, 'UseThreads', 'bool');
		$this->setSettingsFromParams($oSettings, 'ReplySameFolder', 'bool');
		$this->setSettingsFromParams($oSettings, 'UseCheckboxesInList', 'bool');

		$this->setSettingsFromParams($oSettings, 'DisplayName', 'string');
		$this->setSettingsFromParams($oSettings, 'ReplyTo', 'string');
		$this->setSettingsFromParams($oSettings, 'Signature', 'string');
		$this->setSettingsFromParams($oSettings, 'SignatureToAll', 'bool');
		$this->setSettingsFromParams($oSettings, 'EnableTwoFactor', 'bool');

		$this->setSettingsFromParams($oSettings, 'CustomThemeImg', 'string');
		
		if ('' === $oSettings->GetConf('CustomThemeImg', ''))
		{
			$this->StorageProvider()->Clear($oAccount, 
				\RainLoop\Providers\Storage\Enumerations\StorageType::USER, 'CustomThemeBackground');
		}
		
		return $this->DefaultResponse(__FUNCTION__,
			$this->SettingsProvider()->Save($oAccount, $oSettings));
	}

	/**
	 * @return array
	 */
	public function DoNoop()
	{
		$this->initMailClientConnection();
		return $this->TrueResponse(__FUNCTION__);
	}

	/**
	 * @return array
	 */
	public function DoPing()
	{
		return $this->DefaultResponse(__FUNCTION__, 'Pong');
	}

	/**
	 * @return array
	 */
	public function DoChangePassword()
	{
		$bResult = false;
		$oAccount = $this->getAccountFromToken();
		
		if ($oAccount)
		{
			$bResult = $this->ChangePasswordProvider()->ChangePassword(
				$oAccount,
				$this->GetActionParam('PrevPassword', ''),
				$this->GetActionParam('NewPassword', '')
			);

			if (!$bResult)
			{
				$this->loginErrorDelay();
				$this->Logger()->Write('Error: Can\'t change password for '.$oAccount->Email().' account.', \MailSo\Log\Enumerations\Type::NOTICE);
			}
		}

		return $this->DefaultResponse(__FUNCTION__, $bResult);
	}

	/**
	 * @return array
	 */
	public function DoJsInfo()
	{
		$bIsError = '1' === (string) $this->GetActionParam('IsError', '0');
		$mData = $this->GetActionParam('Data', null);

		$this->Logger()->WriteDump(is_array($mData) ? $mData : array(),
			$bIsError ? \MailSo\Log\Enumerations\Type::ERROR : \MailSo\Log\Enumerations\Type::INFO, 'JS-INFO');

		return $this->DefaultResponse(__FUNCTION__, true);
	}

	/**
	 * @return array
	 */
	public function DoVersion()
	{
		return $this->DefaultResponse(__FUNCTION__,
			APP_VERSION === (string) $this->GetActionParam('Version', ''));
	}

	/**
	 * @return array
	 */
	public function DoJsError()
	{
		$sMessage = $this->GetActionParam('Message', '');
		if (0 < strlen($sMessage))
		{
			$sFileName = $this->GetActionParam('FileName', '');
			$sLineNo = $this->GetActionParam('LineNo', '');
			$sLocation = $this->GetActionParam('Location', '');
			$sHtmlCapa = $this->GetActionParam('HtmlCapa', '');
			$sTimeOnPage = $this->GetActionParam('TimeOnPage', '');

			$oHttp = $this->Http();

			$this->Logger()->Write($sMessage.' ('.$sFileName.' ~ '.$sLineNo.')', \MailSo\Log\Enumerations\Type::ERROR, 'JS');
			$this->Logger()->WriteDump(array(
				'Location' => $sLocation,
				'Capability' => $sHtmlCapa,
				'TimeOnPage' => $sTimeOnPage,
				'HTTP_USER_AGENT' => $oHttp->GetServer('HTTP_USER_AGENT', ''),
				'HTTP_ACCEPT_ENCODING' => $oHttp->GetServer('HTTP_ACCEPT_ENCODING', ''),
				'HTTP_ACCEPT_LANGUAGE' => $oHttp->GetServer('HTTP_ACCEPT_LANGUAGE', '')
			));
		}

		return $this->DefaultResponse(__FUNCTION__, true);
	}

	/**
	 * @param \MailSo\Mail\FolderCollection $oFolders
	 * @return array
	 */
	private function recFoldersNames($oFolders)
	{
		$aResult = array();
		if ($oFolders)
		{
			$aFolders =& $oFolders->GetAsArray();

			foreach ($aFolders as $oFolder)
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
	 * @param \RainLoop\Account $oAccount
	 * 
	 * @return array
	 */
	private function systemFoldersNames($oAccount)
	{
		static $aCache = null;
		if (null === $aCache)
		{
			$aCache = array(
				
				'Sent' => \MailSo\Imap\Enumerations\FolderType::SENT,

				'Send' => \MailSo\Imap\Enumerations\FolderType::SENT,
				'Sent Item' => \MailSo\Imap\Enumerations\FolderType::SENT,
				'Sent Items' => \MailSo\Imap\Enumerations\FolderType::SENT,
				'Send Item' => \MailSo\Imap\Enumerations\FolderType::SENT,
				'Send Items' => \MailSo\Imap\Enumerations\FolderType::SENT,
				'Sent Mail' => \MailSo\Imap\Enumerations\FolderType::SENT,
				'Sent Mails' => \MailSo\Imap\Enumerations\FolderType::SENT,
				'Send Mail' => \MailSo\Imap\Enumerations\FolderType::SENT,
				'Send Mails' => \MailSo\Imap\Enumerations\FolderType::SENT,

				'Draft' => \MailSo\Imap\Enumerations\FolderType::DRAFTS,

				'Drafts' => \MailSo\Imap\Enumerations\FolderType::DRAFTS,
				'Draft Mail' => \MailSo\Imap\Enumerations\FolderType::DRAFTS,
				'Draft Mails' => \MailSo\Imap\Enumerations\FolderType::DRAFTS,
				'Drafts Mail' => \MailSo\Imap\Enumerations\FolderType::DRAFTS,
				'Drafts Mails' => \MailSo\Imap\Enumerations\FolderType::DRAFTS,

				'Spam' => \MailSo\Imap\Enumerations\FolderType::SPAM,

				'Junk' => \MailSo\Imap\Enumerations\FolderType::SPAM,
				'Bulk Mail' => \MailSo\Imap\Enumerations\FolderType::SPAM,
				'Bulk Mails' => \MailSo\Imap\Enumerations\FolderType::SPAM,

				'Trash' => \MailSo\Imap\Enumerations\FolderType::TRASH,
				'Deleted' => \MailSo\Imap\Enumerations\FolderType::TRASH,
				'Bin' => \MailSo\Imap\Enumerations\FolderType::TRASH,

				'Archive' => \MailSo\Imap\Enumerations\FolderType::ARCHIVE,
				
				'All' => \MailSo\Imap\Enumerations\FolderType::ARCHIVE,
				'All Mail' => \MailSo\Imap\Enumerations\FolderType::ARCHIVE,
				'All Mails' => \MailSo\Imap\Enumerations\FolderType::ARCHIVE,
				'AllMail' => \MailSo\Imap\Enumerations\FolderType::ARCHIVE,
				'AllMails' => \MailSo\Imap\Enumerations\FolderType::ARCHIVE,
			);

			$this->Plugins()->RunHook('filter.system-folders-names', array($oAccount, &$aCache));
		}

		return $aCache;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param \MailSo\Mail\FolderCollection $oFolders
	 * @param array $aResult
	 * @param bool $bXList = true
	 */
	private function recFoldersTypes($oAccount, $oFolders, &$aResult, $bXList = true)
	{
		if ($oFolders)
		{
			$aFolders =& $oFolders->GetAsArray();
			if (\is_array($aFolders) && 0 < \count($aFolders))
			{
				if ($bXList)
				{
					foreach ($aFolders as $oFolder)
					{
						$iFolderXListType = $oFolder->GetFolderXListType();
						if (!isset($aResult[$iFolderXListType]) && \in_array($iFolderXListType, array(
							\MailSo\Imap\Enumerations\FolderType::SENT,
							\MailSo\Imap\Enumerations\FolderType::DRAFTS,
							\MailSo\Imap\Enumerations\FolderType::SPAM,
							\MailSo\Imap\Enumerations\FolderType::TRASH,
							\MailSo\Imap\Enumerations\FolderType::ARCHIVE
						)))
						{
							$aResult[$iFolderXListType] = $oFolder->FullNameRaw();
						}

						$oSub = $oFolder->SubFolders();
						if ($oSub && 0 < $oSub->Count())
						{
							$this->recFoldersTypes($oAccount, $oSub, $aResult, true);
						}
					}
				}

				$aMap = $this->systemFoldersNames($oAccount);
				foreach ($aFolders as $oFolder)
				{
					$sName = $oFolder->Name();
					if (isset($aMap[$sName]))
					{
						$iFolderType = $aMap[$sName];
						if (!isset($aResult[$iFolderType]) && \in_array($iFolderType, array(
							\MailSo\Imap\Enumerations\FolderType::SENT,
							\MailSo\Imap\Enumerations\FolderType::DRAFTS,
							\MailSo\Imap\Enumerations\FolderType::SPAM,
							\MailSo\Imap\Enumerations\FolderType::TRASH,
							\MailSo\Imap\Enumerations\FolderType::ARCHIVE
						)))
						{
							$aResult[$iFolderType] = $oFolder->FullNameRaw();
						}
					}

					$oSub = $oFolder->SubFolders();
					if ($oSub && 0 < $oSub->Count())
					{
						$this->recFoldersTypes($oAccount, $oSub, $aResult, false);
					}
				}
			}
		}
	}

	/**
	 * @return array
	 */
	public function DoFolders()
	{
		$sRawKey = (string) $this->GetActionParam('RawKey', '');
		if (0 < \strlen($sRawKey))
		{
			$this->verifyCacheByKey($sRawKey);
		}

		$oAccount = $this->initMailClientConnection();

		$oFolderCollection = null;
		$this->Plugins()->RunHook('filter.folders-before', array($oAccount, &$oFolderCollection));

		if (null === $oFolderCollection)
		{
			$oFolderCollection = $this->MailClient()->Folders('', '*',
				!!$this->Config()->Get('labs', 'use_imap_list_subscribe', true)
			);
		}

		$this->Plugins()->RunHook('filter.folders-post', array($oAccount, &$oFolderCollection));

		if ($oFolderCollection instanceof \MailSo\Mail\FolderCollection)
		{
			$aSystemFolders = array();
			
			$this->recFoldersTypes($oAccount, $oFolderCollection, $aSystemFolders);
			$oFolderCollection->SystemFolders = $aSystemFolders;

			if ($this->Config()->Get('labs', 'autocreate_system_folders', true))
			{
				$bDoItAgain = false;
				$sNamespace = $oFolderCollection->GetNamespace();
				$sNamespace = empty($sNamespace) ? '' : \substr($sNamespace, 0, -1);

				$aList = array();
				$aMap = $this->systemFoldersNames($oAccount);
				if ('' === $this->GetActionParam('SentFolder', ''))
				{
					$aList[] = \MailSo\Imap\Enumerations\FolderType::SENT;
				}
				if ('' === $this->GetActionParam('DraftFolder', ''))
				{
					$aList[] = \MailSo\Imap\Enumerations\FolderType::DRAFTS;
				}
				if ('' === $this->GetActionParam('SpamFolder', ''))
				{
					$aList[] = \MailSo\Imap\Enumerations\FolderType::SPAM;
				}
				if ('' === $this->GetActionParam('TrashFolder', ''))
				{
					$aList[] = \MailSo\Imap\Enumerations\FolderType::TRASH;
				}
				if ('' === $this->GetActionParam('ArchiveFolder', ''))
				{
					$aList[] = \MailSo\Imap\Enumerations\FolderType::ARCHIVE;
				}

				$this->Plugins()->RunHook('filter.folders-system-types', array($oAccount, &$aList));

				foreach ($aList as $iType)
				{
					if (!isset($aSystemFolders[$iType]))
					{
						$mFolderNameToCreate = \array_search($iType, $aMap);
						if (!empty($mFolderNameToCreate))
						{
							if ($this->MailClient()->FolderCreate($mFolderNameToCreate, $sNamespace))
							{
								$bDoItAgain = true;
							}
						}
					}
				}

				if ($bDoItAgain)
				{
					$oFolderCollection = $this->MailClient()->Folders('', '*',
						!!$this->Config()->Get('labs', 'use_imap_list_subscribe', true)
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

				$this->cacheByKey($sRawKey);
			}
		}

		$this->Plugins()->RunHook('filter.folders-complete', array($oAccount, &$oFolderCollection));

		return $this->DefaultResponse(__FUNCTION__, $oFolderCollection);
	}

	/**
	 * @return array
	 */
	public function DoFolderCreate()
	{
		$this->initMailClientConnection();

		try
		{
			$sFolderNameInUtf = $this->GetActionParam('Folder', '');
			$sFolderParentFullNameRaw = $this->GetActionParam('Parent', '');

			$this->MailClient()->FolderCreate($sFolderNameInUtf, $sFolderParentFullNameRaw,
				!!$this->Config()->Get('labs', 'use_imap_list_subscribe', true));
		}
		catch (\Exception $oException)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CantCreateFolder, $oException);
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	/**
	 * @return array
	 */
	public function DoFolderSubscribe()
	{
		$this->initMailClientConnection();

		$sFolderNameInUtf = $this->GetActionParam('Folder', '');
		$bSubscribe = '1' === (string) $this->GetActionParam('Subscribe', '0');

		try
		{
			$this->MailClient()->FolderSubscribe($sFolderNameInUtf, !!$bSubscribe);
		}
		catch (\Exception $oException)
		{
			if ($bSubscribe)
			{
				throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CantSubscribeFolder, $oException);
			}
			else
			{
				throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CantUnsubscribeFolder, $oException);
			}
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	/**
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoFolderRename()
	{
		$this->initMailClientConnection();

		$sPrevFolderFullNameRaw = $this->GetActionParam('Folder', '');
		$sNewTopFolderNameInUtf = $this->GetActionParam('NewFolderName', '');

		try
		{
			$this->MailClient()->FolderRename($sPrevFolderFullNameRaw, $sNewTopFolderNameInUtf,
				!!$this->Config()->Get('labs', 'use_imap_list_subscribe', true));
		}
		catch (\Exception $oException)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CantRenameFolder, $oException);
		}

		return $this->TrueResponse(__FUNCTION__);
	}
	
	/**
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoFolderDelete()
	{
		$this->initMailClientConnection();

		$sFolderFullNameRaw = $this->GetActionParam('Folder', '');

		try
		{
			$this->MailClient()->FolderDelete($sFolderFullNameRaw,
				!!$this->Config()->Get('labs', 'use_imap_list_subscribe', true));
		}
		catch (\MailSo\Mail\Exceptions\NonEmptyFolder $oException)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CantDeleteNonEmptyFolder, $oException);
		}
		catch (\Exception $oException)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CantDeleteFolder, $oException);
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	/**
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoFolderClear()
	{
		$this->initMailClientConnection();

		$sFolderFullNameRaw = $this->GetActionParam('Folder', '');

		try
		{
			$this->MailClient()->FolderClear($sFolderFullNameRaw);
		}
		catch (\Exception $oException)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::MailServerError, $oException);
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	/**
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoFolderInformation()
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
			$aInboxInformation = $this->MailClient()->FolderInformation($sFolder, $sPrevUidNext, $aFlagsFilteredUids);
			if (\is_array($aInboxInformation) && isset($aInboxInformation['Flags']) && \is_array($aInboxInformation['Flags']))
			{
				foreach ($aInboxInformation['Flags'] as $iUid => $aFlags)
				{
					$aLowerFlags = array_map('strtolower', $aFlags);
					$aInboxInformation['Flags'][$iUid] = array(
						'IsSeen' => in_array('\\seen', $aLowerFlags),
						'IsFlagged' => in_array('\\flagged', $aLowerFlags),
						'IsAnswered' => in_array('\\answered', $aLowerFlags),
						'IsForwarded' => 0 < strlen($sForwardedFlag) && in_array(strtolower($sForwardedFlag), $aLowerFlags),
						'IsReadReceipt' => 0 < strlen($sReadReceiptFlag) && in_array(strtolower($sReadReceiptFlag), $aLowerFlags)
					);
				}
			}
		}
		catch (\Exception $oException)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::MailServerError, $oException);
		}

		if (\is_array($aInboxInformation))
		{
			$aInboxInformation['Version'] = APP_VERSION;
		}

		return $this->DefaultResponse(__FUNCTION__, $aInboxInformation);
	}

	/**
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoFolderInformationMultiply()
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
						$aInboxInformation = $this->MailClient()->FolderInformation($sFolder);
						if (\is_array($aInboxInformation) && isset($aInboxInformation['Folder']))
						{
							$aResult['List'][] = $aInboxInformation;
						}
					}
					catch (\Exception $oException)
					{
						$this->Logger()->WriteException($oException);
					}
				}
			}
		}

		return $this->DefaultResponse(__FUNCTION__, $aResult);
	}

	/**
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoMessageList()
	{
//		throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CantGetMessageList);
		
		$sFolder = '';
		$iOffset = 0;
		$iLimit = 20;
		$sSearch = '';
		$sUidNext = '';
		$bUseThreads = false;
		$sExpandedThreadUid = '';

		$sRawKey = $this->GetActionParam('RawKey', '');
		$aValues = $this->getDecodedClientRawKeyValue($sRawKey, 9);
		if (is_array($aValues) && 9 === count($aValues))
		{
			$sFolder =(string) $aValues[0];
			$iOffset = (int) $aValues[1];
			$iLimit = (int) $aValues[2];
			$sSearch = (string) $aValues[3];
			$sUidNext = (string) $aValues[6];
			$bUseThreads = (bool) $aValues[7];
			$sExpandedThreadUid = (string) $aValues[8];

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
			$sExpandedThreadUid = (string) $this->GetActionParam('ExpandedThreadUid', '');
		}

		if (0 === strlen($sFolder))
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CantGetMessageList);
		}

		$this->initMailClientConnection();

		try
		{
			if (!$this->Config()->Get('labs', 'use_imap_thread', false))
			{
				$bUseThreads = false;
				$sExpandedThreadUid = '';
			}

			$aExpandedThreadUid = array();
			if (0 < \strlen($sExpandedThreadUid))
			{
				$aExpandedThreadUid = \explode(',', $sExpandedThreadUid);
				
				$aExpandedThreadUid = \array_map(function ($sValue) {
					$sValue = \trim($sValue);
					return is_numeric($sValue) ? (int) $sValue : 0;
				}, $aExpandedThreadUid);

				$aExpandedThreadUid = \array_filter($aExpandedThreadUid, function ($iValue) {
					return 0 < $iValue;
				});
			}
			
			$oMessageList = $this->MailClient()->MessageList(
				$sFolder, $iOffset, $iLimit, $sSearch, $sUidNext,
				($this->Config()->Get('cache', 'enable', true) && $this->Config()->Get('cache', 'server_uids', false)) ? $this->Cacher() : null,
				!!$this->Config()->Get('labs', 'use_imap_sort', false),
				$bUseThreads,
				$aExpandedThreadUid
			);
		}
		catch (\Exception $oException)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CantGetMessageList, $oException);
		}

		if ($oMessageList instanceof \MailSo\Mail\MessageCollection)
		{
			$this->cacheByKey($sRawKey);
		}

		return $this->DefaultResponse(__FUNCTION__, $oMessageList);
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param bool $bWithDraftInfo = true
	 *
	 * @return \MailSo\Mime\Message
	 */
	private function buildMessage($oAccount, $bWithDraftInfo = true)
	{
		$sFrom = $this->GetActionParam('From', '');
		$sTo = $this->GetActionParam('To', '');
		$sCc = $this->GetActionParam('Cc', '');
		$sBcc = $this->GetActionParam('Bcc', '');
		$sSubject = $this->GetActionParam('Subject', '');
		$bTextIsHtml = '1' === $this->GetActionParam('TextIsHtml', '0');
		$bReadReceiptRequest = '1' === $this->GetActionParam('ReadReceiptRequest', '0');
		$sText = $this->GetActionParam('Text', '');
		$aAttachments = $this->GetActionParam('Attachments', null);

		$aDraftInfo = $this->GetActionParam('DraftInfo', null);
		$sInReplyTo = $this->GetActionParam('InReplyTo', '');
		$sReferences = $this->GetActionParam('References', '');

		$oMessage = \MailSo\Mime\Message::NewInstance();
		$oMessage->RegenerateMessageId();
		
		$oMessage->SetXMailer('RainLoop/'.APP_VERSION);

		$oSettings = $this->SettingsProvider()->Load($oAccount);

		if ($this->Config()->Get('webmail', 'allow_identities', true))
		{
			$oMessage->SetFrom(\MailSo\Mime\Email::Parse($sFrom));
		}
		else
		{
			$sDisplayName = \trim($oSettings->GetConf('DisplayName', ''));
			$sReplyTo = \trim($oSettings->GetConf('ReplyTo', ''));
			
			$oMessage->SetFrom(\MailSo\Mime\Email::NewInstance($oAccount->Email(), $sDisplayName));

			if (!empty($sReplyTo))
			{
				$oReplyTo = \MailSo\Mime\EmailCollection::NewInstance($sReplyTo);
				if ($oReplyTo && $oReplyTo->Count())
				{
					$oMessage->SetReplyTo($oReplyTo);
				}
			}
		}

		if ($bReadReceiptRequest)
		{
			$oMessage->SetReadReceipt($oAccount->Email());
		}

		$oMessage->SetSubject($sSubject);
		
		$oToEmails = \MailSo\Mime\EmailCollection::NewInstance($sTo);
		if ($oToEmails && $oToEmails->Count())
		{
			$oMessage->SetTo($oToEmails);
		}

		$oCcEmails = \MailSo\Mime\EmailCollection::NewInstance($sCc);
		if ($oCcEmails && $oCcEmails->Count())
		{
			$oMessage->SetCc($oCcEmails);
		}

		$oBccEmails = \MailSo\Mime\EmailCollection::NewInstance($sBcc);
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
			array($oAccount, &$oMessage, &$sTextToAdd));
		
		if ($bTextIsHtml && 0 < \strlen($sTextToAdd))
		{
			$sTextConverted = \MailSo\Base\HtmlUtils::ConvertHtmlToPlain($sTextToAdd);
			$this->Plugins()->RunHook('filter.message-plain', array($oAccount, &$oMessage, &$sTextConverted));
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

					$oMessage->Attachments()->Add(
						\MailSo\Mime\Attachment::NewInstance($rResource, $sFileName, $iFileSize, $bIsInline,
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

						$oMessage->Attachments()->Add(
							\MailSo\Mime\Attachment::NewInstance($rResource, $sFileName, $iFileSize, true, true, $sCID)
						);
					}
				}
			}
		}

		$this->Plugins()->RunHook('filter.build-message', array(&$oMessage));
		$this->Plugins()->RunHook('filter.build-message[2]', array(&$oMessage, $oAccount));

		return $oMessage;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 *
	 * @return \MailSo\Mime\Message
	 */
	private function buildReadReceiptMessage($oAccount)
	{
		$sReadReceipt = $this->GetActionParam('ReadReceipt', '');
		$sSubject = $this->GetActionParam('Subject', '');
		$sText = $this->GetActionParam('Text', '');

		if (empty($sReadReceipt) || empty($sSubject) || empty($sText))
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::UnknownError);
		}

		$oMessage = \MailSo\Mime\Message::NewInstance();
		$oMessage->RegenerateMessageId();

		$oMessage->SetXMailer('RainLoop/'.APP_VERSION);

		$oSettings = $this->SettingsProvider()->Load($oAccount);

		$sDisplayName = \trim($oSettings->GetConf('DisplayName', ''));
		$sReplyTo = \trim($oSettings->GetConf('ReplyTo', ''));

		$oMessage->SetFrom(\MailSo\Mime\Email::NewInstance($oAccount->Email(), $sDisplayName));

		if (!empty($sReplyTo))
		{
			$oReplyTo = \MailSo\Mime\EmailCollection::NewInstance($sReplyTo);
			if ($oReplyTo && $oReplyTo->Count())
			{
				$oMessage->SetReplyTo($oReplyTo);
			}
		}

		$oMessage->SetSubject($sSubject);

		$oToEmails = \MailSo\Mime\EmailCollection::NewInstance($sReadReceipt);
		if ($oToEmails && $oToEmails->Count())
		{
			$oMessage->SetTo($oToEmails);
		}

		$this->Plugins()->RunHook('filter.read-receipt-message-plain', array($oAccount, &$oMessage, &$sText));

		$oMessage->AddText($sText, false);

		$this->Plugins()->RunHook('filter.build-read-receipt-message', array(&$oMessage, $oAccount));

		return $oMessage;
	}

	/**
	 * @return array
	 */
	public function DoSaveMessage()
	{
		$oAccount = $this->initMailClientConnection();

		$sMessageFolder = $this->GetActionParam('MessageFolder', '');
		$sMessageUid = $this->GetActionParam('MessageUid', '');

		$sDraftFolder = $this->GetActionParam('DraftFolder', '');
		if (0 === strlen($sDraftFolder))
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::UnknownError);
		}

		$oMessage = $this->buildMessage($oAccount, true);

		$this->Plugins()
			->RunHook('filter.save-message', array(&$oMessage))
			->RunHook('filter.save-message[2]', array(&$oMessage, $oAccount))
		;

		$mResult = false;
		if ($oMessage)
		{
			$rMessageStream = \MailSo\Base\ResourceRegistry::CreateMemoryResource();

			$iMessageStreamSize = \MailSo\Base\Utils::MultipleStreamWriter(
				$oMessage->ToStream(false), array($rMessageStream), 8192, true, true);

			if (false !== $iMessageStreamSize)
			{
				$sMessageId = $oMessage->MessageId();
				
				rewind($rMessageStream);

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

	private function smtpSendMessage($oAccount, $oMessage, $rMessageStream, $bAddHiddenRcpt = true)
	{
		$oRcpt = $oMessage->GetRcpt();
		if ($oRcpt && 0 < $oRcpt->Count())
		{
			$this->Plugins()->RunHook('filter.message-rcpt', array($oAccount, &$oRcpt));

			try
			{
				$oSmtpClient = \MailSo\Smtp\SmtpClient::NewInstance()->SetLogger($this->Logger());

				$oFrom = $oMessage->GetFrom();
				$sFrom = $oFrom instanceof \MailSo\Mime\Email ? $oFrom->GetEmail() : '';

				$aSmtpCredentials = array(
					'Ehlo' => \MailSo\Smtp\SmtpClient::EhloHelper(),
					'Host' => $oAccount->Domain()->OutHost(),
					'Port' => $oAccount->Domain()->OutPort(),
					'Secure' => $oAccount->Domain()->OutSecure(),
					'UseAuth' => $oAccount->Domain()->OutAuth(),
					'From' => empty($sFrom) ? $oAccount->Email() : $sFrom,
					'Login' => $oAccount->OutLogin(),
					'Password' => $oAccount->Password(),
					'HiddenRcpt' => array()
				);

				$this->Plugins()->RunHook('filter.smtp-credentials', array($oAccount, &$aSmtpCredentials));

				if (!$bAddHiddenRcpt)
				{
					$aSmtpCredentials['HiddenRcpt'] = array();
				}

				$bHookConnect = $bHookAuth = $bHookFrom = $bHookFrom = $bHookTo = $bHookData = $bHookLogoutAndDisconnect = false;
				$this->Plugins()->RunHook('filter.smtp-connect', array($oAccount, $aSmtpCredentials,
					&$oSmtpClient, $oMessage, &$oRcpt,
					&$bHookConnect, &$bHookAuth, &$bHookFrom, &$bHookTo, &$bHookData, &$bHookLogoutAndDisconnect));

				if (!$bHookConnect)
				{
					$oSmtpClient->Connect($aSmtpCredentials['Host'], $aSmtpCredentials['Port'],
						$aSmtpCredentials['Ehlo'], $aSmtpCredentials['Secure']);
				}

				if (!$bHookAuth)
				{
					if ($aSmtpCredentials['UseAuth'])
					{
						$oSmtpClient->Login($aSmtpCredentials['Login'], $aSmtpCredentials['Password']);
					}
				}

				if (!$bHookFrom)
				{
					$oSmtpClient->MailFrom($aSmtpCredentials['From']);
				}

				if (!$bHookTo)
				{
					$aRcpt =& $oRcpt->GetAsArray();
					foreach ($aRcpt as /* @var $oEmail \MailSo\Mime\Email */ $oEmail)
					{
						$oSmtpClient->Rcpt($oEmail->GetEmail());
					}

					if (isset($aSmtpCredentials['HiddenRcpt']) && is_array($aSmtpCredentials['HiddenRcpt']))
					{
						foreach ($aSmtpCredentials['HiddenRcpt'] as $sEmail)
						{
							if (\preg_match('/^[^@\s]+@[^@\s]+$/', $sEmail))
							{
								$oSmtpClient->Rcpt($sEmail);
							}
						}
					}
				}

				if (!$bHookData)
				{
					$oSmtpClient->DataWithStream($rMessageStream);
				}

				if (!$bHookLogoutAndDisconnect)
				{
					$oSmtpClient->LogoutAndDisconnect();
				}
			}
			catch (\MailSo\Net\Exceptions\ConnectionException $oException)
			{
				if ($this->Config()->Get('labs', 'smtp_show_server_errors'))
				{
					throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::ClientViewError, $oException);
				}
				else
				{
					throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::ConnectionError, $oException);
				}
			}
			catch (\MailSo\Smtp\Exceptions\LoginException $oException)
			{
				throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AuthError, $oException);
			}
			catch (\Exception $oException)
			{
				if ($this->Config()->Get('labs', 'smtp_show_server_errors'))
				{
					throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::ClientViewError, $oException);
				}
				else
				{
					throw $oException;
				}
			}
		}
		else
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::InvalidRecipients);
		}
	}

	/**
	 * @return array
	 */
	public function DoSendMessage()
	{
		$oAccount = $this->initMailClientConnection();

		$sDraftFolder = $this->GetActionParam('MessageFolder', '');
		$sDraftUid = $this->GetActionParam('MessageUid', '');
		$sSentFolder = $this->GetActionParam('SentFolder', '');
		$aDraftInfo = $this->GetActionParam('DraftInfo', null);

		$oMessage = $this->buildMessage($oAccount, false);

		$this->Plugins()
			->RunHook('filter.send-message', array(&$oMessage))
			->RunHook('filter.send-message[2]', array(&$oMessage, $oAccount))
		;

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
					$this->smtpSendMessage($oAccount, $oMessage, $rMessageStream);
					
					if (is_array($aDraftInfo) && 3 === count($aDraftInfo))
					{
						$sDraftInfoType = $aDraftInfo[0];
						$sDraftInfoUid = $aDraftInfo[1];
						$sDraftInfoFolder = $aDraftInfo[2];

						try
						{
							switch (strtolower($sDraftInfoType))
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
						catch (\Exception $oException)
						{
							$this->Logger()->WriteException($oException, \MailSo\Log\Enumerations\Type::ERROR);
						}
					}

					if (0 < strlen($sSentFolder))
					{
						try
						{
							if (!$oMessage->GetBcc())
							{
								if (\is_resource($rMessageStream))
								{
									\rewind($rMessageStream);
								}

								$this->MailClient()->MessageAppendStream(
									$rMessageStream, $iMessageStreamSize, $sSentFolder, array(
										\MailSo\Imap\Enumerations\MessageFlag::SEEN
									));
							}
							else
							{
								$rAppendMessageStream = \MailSo\Base\ResourceRegistry::CreateMemoryResource();

								$iAppendMessageStreamSize = \MailSo\Base\Utils::MultipleStreamWriter(
									$oMessage->ToStream(false), array($rAppendMessageStream), 8192, true, true, true);

								$this->MailClient()->MessageAppendStream(
									$rAppendMessageStream, $iAppendMessageStreamSize, $sSentFolder, array(
										\MailSo\Imap\Enumerations\MessageFlag::SEEN
									));

								if (is_resource($rAppendMessageStream))
								{
									@fclose($rAppendMessageStream);
								}
							}
						}
						catch (\Exception $oException)
						{
							throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CantSaveMessage, $oException);
						}
					}

					if (\is_resource($rMessageStream))
					{
						@\fclose($rMessageStream);
					}

					if (0 < strlen($sDraftFolder) && 0 < strlen($sDraftUid))
					{
						try
						{
							$this->MailClient()->MessageDelete($sDraftFolder, array($sDraftUid), true, true);
						}
						catch (\Exception $oException)
						{
							$this->Logger()->WriteException($oException, \MailSo\Log\Enumerations\Type::ERROR);
						}
					}

					$mResult = true;
				}
			}
		}
		catch (\RainLoop\Exceptions\ClientException $oException)
		{
			throw $oException;
		}
		catch (\Exception $oException)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CantSendMessage, $oException);
		}

		if (false === $mResult)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CantSendMessage);
		}

		if ($oMessage && $this->PersonalAddressBookProvider($oAccount)->IsActive())
		{
			$aArrayToFrec = array();
			$oToCollection = $oMessage->GetTo();
			if ($oToCollection)
			{
				$aTo =& $oToCollection->GetAsArray();
				foreach ($aTo as /* @var $oEmail \MailSo\Mime\Email */ $oEmail)
				{
					$aArrayToFrec[$oEmail->GetEmail()] = $oEmail->ToString();
				}
			}

			if (0 < \count($aArrayToFrec))
			{
				$oSettings = $this->SettingsProvider()->Load($oAccount);
				
				$this->PersonalAddressBookProvider($oAccount)->IncFrec(
					$oAccount->ParentEmailHelper(), \array_values($aArrayToFrec), !!$oSettings->GetConf('ContactsAutosave', true));
			}
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	/**
	 * @return array
	 */
	public function DoSendReadReceiptMessage()
	{
		$oAccount = $this->initMailClientConnection();

		$oMessage = $this->buildReadReceiptMessage($oAccount);

		$this->Plugins()->RunHook('filter.send-read-receipt-message', array(&$oMessage, $oAccount));

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
					$this->smtpSendMessage($oAccount, $oMessage, $rMessageStream);

					if (\is_resource($rMessageStream))
					{
						@\fclose($rMessageStream);
					}

					$mResult = true;

					$sReadReceiptFlag = $this->Config()->Get('labs', 'imap_read_receipt_flag', '');
					if (!empty($sReadReceiptFlag))
					{
						$sFolderFullName = $this->GetActionParam('MessageFolder', '');
						$sUid = $this->GetActionParam('MessageUid', '');

						$this->Cacher()->Set('/ReadReceipt/'.$oAccount->Email().'/'.$sFolderFullName.'/'.$sUid, '1');

						if (0 < \strlen($sFolderFullName) && 0 < \strlen($sUid))
						{
							try
							{
								$this->MailClient()->MessageSetFlag($sFolderFullName, array($sUid), true, $sReadReceiptFlag, true, true);
							}
							catch (\Exception $oException) {}
						}
					}
				}
			}
		}
		catch (\RainLoop\Exceptions\ClientException $oException)
		{
			throw $oException;
		}
		catch (\Exception $oException)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CantSendMessage, $oException);
		}

		if (false === $mResult)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CantSendMessage);
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	/**
	 * @return array
	 */
	public function DoQuota()
	{
		$this->initMailClientConnection();

		try
		{
			$aQuota = $this->MailClient()->Quota();
		}
		catch (\Exception $oException)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::MailServerError, $oException);
		}

		return $this->DefaultResponse(__FUNCTION__, $aQuota);
	}

	private function getTwoFactorInfo($sEmail, $bRemoveSecret = false)
	{
		$mData = null;
		
		$aResult = array(
			'User' => '',
			'IsSet' => false,
			'Enable' => false,
			'Secret' => '',
			'Url' => '',
			'BackupCodes' => ''
		);

		if (!empty($sEmail))
		{
			$aResult['User'] = $sEmail;

			$sData = $this->StorageProvider()->Get(null,
				\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
				'TwoFactorAuth/User/'.$sEmail.'/Data/'
			);

			if ($sData)
			{
				$mData = \RainLoop\Utils::DecodeKeyValues($sData);
			}
		}

		if (\is_array($mData) && !empty($aResult['User']) &&
			!empty($mData['User']) && !empty($mData['Secret']) &&
			!empty($mData['BackupCodes']) && $sEmail === $mData['User'])
		{
			$aResult['IsSet'] = true;
			$aResult['Enable'] = isset($mData['Enable']) ? !!$mData['Enable'] : false;
			$aResult['Secret'] = $mData['Secret'];
			$aResult['BackupCodes'] = $mData['BackupCodes'];

			$aResult['Url'] = $this->TwoFactorAuthProvider()->GetQRCodeGoogleUrl(
				$aResult['User'], $aResult['Secret'], $this->Config()->Get('webmail', 'title', ''));
		}

		if ($bRemoveSecret)
		{
			if (isset($aResult['Secret']))
			{
				unset($aResult['Secret']);
			}

			if (isset($aResult['Url']))
			{
				unset($aResult['Url']);
			}

			if (isset($aResult['BackupCodes']))
			{
				unset($aResult['BackupCodes']);
			}
		}

		return $aResult;
	}

	/**
	 * @param string $sEmail
	 * @param string $sCode
	 * 
	 * @return bool
	 */
	private function removeBackupCodeFromTwoFactorInfo($sEmail, $sCode)
	{
		if (empty($sEmail) || empty($sCode))
		{
			return false;
		}

		$sData = $this->StorageProvider()->Get(null,
			\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
			'TwoFactorAuth/User/'.$sEmail.'/Data/'
		);

		if ($sData)
		{
			$mData = \RainLoop\Utils::DecodeKeyValues($sData);

			if (!empty($mData['BackupCodes']))
			{
				$sBackupCodes = \preg_replace('/[^\d]+/', ' ', ' '.$mData['BackupCodes'].' ');
				$sBackupCodes = \str_replace(' '.$sCode.' ', '', $sBackupCodes);
				
				$mData['BackupCodes'] = \trim(\preg_replace('/[^\d]+/', ' ', $sBackupCodes));

				return $this->StorageProvider()->Put(null,
					\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
					'TwoFactorAuth/User/'.$sEmail.'/Data/',
					\RainLoop\Utils::EncodeKeyValues($mData)
				);
			}
		}

		return false;
	}

	/**
	 * @return array
	 */
	public function DoGetTwoFactorInfo()
	{
		if (!$this->TwoFactorAuthProvider()->IsActive())
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$oAccount = $this->getAccountFromToken();
		
		return $this->DefaultResponse(__FUNCTION__,
			$this->getTwoFactorInfo($oAccount->ParentEmailHelper(), true));
	}

	/**
	 * @return array
	 */
	public function DoCreateTwoFactorSecret()
	{
		if (!$this->TwoFactorAuthProvider()->IsActive())
		{
			return $this->FalseResponse(__FUNCTION__);
		}
		
		$oAccount = $this->getAccountFromToken();
		$sEmail = $oAccount->ParentEmailHelper();

		$sSecret = $this->TwoFactorAuthProvider()->CreateSecret();

		$aCodes = array();
		for ($iIndex = 9; $iIndex > 0; $iIndex--)
		{
			$aCodes[] = \rand(100000000, 900000000);
		}

		$this->StorageProvider()->Put(null,
			\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
			'TwoFactorAuth/User/'.$sEmail.'/Data/',
			\RainLoop\Utils::EncodeKeyValues(array(
				'User' => $sEmail,
				'Enable' => false,
				'Secret' => $sSecret,
				'BackupCodes' => \implode(' ', $aCodes)
			))
		);

		\sleep(1);
		return $this->DefaultResponse(__FUNCTION__,
			$this->getTwoFactorInfo($sEmail));
	}

	/**
	 * @return array
	 */
	public function DoShowTwoFactorSecret()
	{
		if (!$this->TwoFactorAuthProvider()->IsActive())
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$oAccount = $this->getAccountFromToken();
		$sEmail = $oAccount->ParentEmailHelper();

		$aResult = $this->getTwoFactorInfo($sEmail);
		if (\is_array($aResult))
		{
			unset($aResult['BackupCodes']);
		}

		return $this->DefaultResponse(__FUNCTION__, $aResult);
	}

	/**
	 * @return array
	 */
	public function DoEnableTwoFactor()
	{
		if (!$this->TwoFactorAuthProvider()->IsActive())
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$oAccount = $this->getAccountFromToken();
		$sEmail = $oAccount->ParentEmailHelper();

		$bResult = false;
		$mData = $this->getTwoFactorInfo($sEmail);
		if (isset($mData['Secret'], $mData['BackupCodes']))
		{
			$bResult = $this->StorageProvider()->Put(null,
				\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
				'TwoFactorAuth/User/'.$sEmail.'/Data/',
				\RainLoop\Utils::EncodeKeyValues(array(
					'User' => $sEmail,
					'Enable' => '1' === \trim($this->GetActionParam('Enable', '0')),
					'Secret' => $mData['Secret'],
					'BackupCodes' => $mData['BackupCodes']
				))
			);
		}
		
		return $this->DefaultResponse(__FUNCTION__, $bResult);
	}

	/**
	 * @return array
	 */
	public function DoTestTwoFactorInfo()
	{
		if (!$this->TwoFactorAuthProvider()->IsActive())
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$oAccount = $this->getAccountFromToken();

		$sCode = \trim($this->GetActionParam('Code', ''));

		$oData = $this->getTwoFactorInfo($oAccount->ParentEmailHelper());
		$sSecret = !empty($oData['Secret']) ? $oData['Secret'] : '';

		\sleep(1);
		return $this->DefaultResponse(__FUNCTION__,
			$this->TwoFactorAuthProvider()->VerifyCode($sSecret, $sCode));
	}

	/**
	 * @return array
	 */
	public function DoClearTwoFactorInfo()
	{
		if (!$this->TwoFactorAuthProvider()->IsActive())
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$oAccount = $this->getAccountFromToken();

		$this->StorageProvider()->Clear(null,
			\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
			'TwoFactorAuth/User/'.$oAccount->ParentEmailHelper().'/Data/'
		);

		return $this->DefaultResponse(__FUNCTION__,
			$this->getTwoFactorInfo($oAccount->ParentEmailHelper(), true));
	}

	/**
	 * @return array
	 */
	public function DoContacts()
	{
		$oAccount = $this->getAccountFromToken();
		
		$sSearch = \trim($this->GetActionParam('Search', ''));
		$iOffset = (int) $this->GetActionParam('Offset', 0);
		$iLimit = (int) $this->GetActionParam('Limit', 20);
		$iOffset = 0 > $iOffset ? 0 : $iOffset;
		$iLimit = 0 > $iLimit ? 20 : $iLimit;

		$iResultCount = 0;
		if ($this->PersonalAddressBookProvider($oAccount)->IsActive())
		{
			$iResultCount = 0;
			$mResult = $this->PersonalAddressBookProvider($oAccount)->GetContacts($oAccount->ParentEmailHelper(),
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
	
	/**
	 * @return array
	 */
	public function DoContactsDelete()
	{
		$oAccount = $this->getAccountFromToken();
		$aUids = \explode(',', (string) $this->GetActionParam('Uids', ''));

		$aFilteredUids = \array_filter($aUids, function (&$mUid) {
			$mUid = (int) \trim($mUid);
			return 0 < $mUid;
		});

		$bResult = false;
		if (0 < \count($aFilteredUids) && $this->PersonalAddressBookProvider($oAccount)->IsActive())
		{
			$bResult = $this->PersonalAddressBookProvider($oAccount)->DeleteContacts($oAccount->ParentEmailHelper(), $aFilteredUids);
		}

		return $this->DefaultResponse(__FUNCTION__, $bResult);
	}

	/**
	 * @return array
	 */
	public function DoContactSave()
	{
		$oAccount = $this->getAccountFromToken();

		$bResult = false;

		$oPab = $this->PersonalAddressBookProvider($oAccount);
		$sRequestUid = \trim($this->GetActionParam('RequestUid', ''));
		if ($oPab && $oPab->IsActive() && 0 < \strlen($sRequestUid))
		{
			$sUid = \trim($this->GetActionParam('Uid', ''));
			$sUidStr = \trim($this->GetActionParam('UidStr', ''));
			$iScopeType = (int) $this->GetActionParam('ScopeType', null);
			if (!in_array($iScopeType, array(
				\RainLoop\Providers\PersonalAddressBook\Enumerations\ScopeType::DEFAULT_,
				\RainLoop\Providers\PersonalAddressBook\Enumerations\ScopeType::SHARE_ALL)))
			{
				$iScopeType = \RainLoop\Providers\PersonalAddressBook\Enumerations\ScopeType::DEFAULT_;
			}

			$oContact = null;
			if (0 < \strlen($sUid))
			{
				$oContact = $oPab->GetContactByID($oAccount->ParentEmailHelper(), $sUid);
			}

			if (!$oContact)
			{
				$oContact = new \RainLoop\Providers\PersonalAddressBook\Classes\Contact();
				if (0 < \strlen($sUid))
				{
					$oContact->IdContact = $sUid;
				}
			}
			
			if (0 < \strlen($sUidStr))
			{
				$oContact->IdContactStr = $sUidStr;
			}

			$oContact->ScopeType = $iScopeType;
			$oContact->Properties = array();

			$aProperties = $this->GetActionParam('Properties', array());
			if (\is_array($aProperties))
			{
				foreach ($aProperties as $aItem)
				{
					if ($aItem && isset($aItem[0], $aItem[1]) &&
						\is_numeric($aItem[0]))
					{
						$oProp = new \RainLoop\Providers\PersonalAddressBook\Classes\Property();
						$oProp->Type = (int) $aItem[0];
						$oProp->Value = $aItem[1];
						$oProp->ScopeType = $iScopeType;

						$oContact->Properties[] = $oProp;
					}
				}
			}

			$bResult = $oPab->ContactSave($oAccount->ParentEmailHelper(), $oContact);
		}

		return $this->DefaultResponse(__FUNCTION__, array(
			'RequestUid' => $sRequestUid,
			'ResultID' => $bResult ? $oContact->IdContact : '',
			'ResultIDStr' => $bResult ? $oContact->IdContactStr : '',
			'Result' => $bResult
		));
	}

	/**
	 * @return array
	 */
	public function DoSuggestions()
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
			// Personal Address Book
			$oPab = $this->PersonalAddressBookProvider($oAccount);
			if ($oPab && $oPab->IsActive())
			{
				$aSuggestions = $oPab->GetSuggestions($oAccount->ParentEmailHelper(), $sQuery, $iLimit);
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

		if ($iLimit < \count($aResult))
		{
			$aResult = \array_slice($aResult, 0, $iLimit);
		}

		// Plugins
		$this->Plugins()->RunHook('ajax.suggestions-post', array(&$aResult, $sQuery, $oAccount, $iLimit));

		if ($iLimit < \count($aResult))
		{
			$aResult = \array_slice($aResult, 0, $iLimit);
		}

		return $this->DefaultResponse(__FUNCTION__, $aResult);
	}

	/**
	 * @return array
	 */
	public function DoEmailsPicsHashes()
	{
//		$oAccount = $this->getAccountFromToken();
		return $this->DefaultResponse(__FUNCTION__, array());
	}

	/**
	 * @return array
	 */
	public function DoServicesPics()
	{
		$aData = \RainLoop\Utils::ServicesPics();
		$aResult = array();

		foreach ($aData as $sDomain => $sPic)
		{
			$aResult[$sDomain] = APP_WEB_STATIC_PATH.'services/'.$sPic;
		}

		return $this->DefaultResponse(__FUNCTION__, $aResult);
	}

	/**
	 * @return array
	 */
	private function messageSetFlag($sActionFunction, $sResponseFunction)
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
			$this->MailClient()->{$sActionFunction}($sFolder, $aFilteredUids, true, $bSetAction);
		}
		catch (\Exception $oException)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::MailServerError, $oException);
		}

		return $this->TrueResponse($sResponseFunction);
	}

	/**
	 * @return array
	 */
	public function DoMessageSetSeen()
	{
		return $this->messageSetFlag('MessageSetSeen', __FUNCTION__);
	}

	/**
	 * @return array
	 */
	public function DoMessageSetSeenToAll()
	{
		$this->initMailClientConnection();

		$sFolder = $this->GetActionParam('Folder', '');
		$bSetAction = '1' === (string) $this->GetActionParam('SetAction', '0');

		try
		{
			$this->MailClient()->MessageSetSeenToAll($sFolder, $bSetAction);
		}
		catch (\Exception $oException)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::MailServerError, $oException);
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	/**
	 * @return array
	 */
	public function DoMessageSetFlagged()
	{
		return $this->messageSetFlag('MessageSetFlagged', __FUNCTION__);
	}

	/**
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoMessage()
	{
		$sRawKey = (string) $this->GetActionParam('RawKey', '');

		$sFolder = '';
		$iUid = 0;

		$aValues = $this->getDecodedClientRawKeyValue($sRawKey, 4);
		if (is_array($aValues) && 4 === count($aValues))
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
				!!$this->Config()->Get('labs', 'use_imap_thread', false) ? $this->Cacher() : null);
		}
		catch (\Exception $oException)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CantGetMessage, $oException);
		}

		if ($oMessage instanceof \MailSo\Mail\Message)
		{
			$this->Plugins()
				->RunHook('filter.result-message', array(&$oMessage))
				->RunHook('filter.result-message[2]', array(&$oMessage, $oAccount))
			;

			$this->cacheByKey($sRawKey);
		}

		return $this->DefaultResponse(__FUNCTION__, $oMessage);
	}

	/**
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoMessageDelete()
	{
		$this->initMailClientConnection();

		$sFolder = $this->GetActionParam('Folder', '');
		$aUids = explode(',', (string) $this->GetActionParam('Uids', ''));

		$aFilteredUids = array_filter($aUids, function (&$sUid) {
			$sUid = (int) trim($sUid);
			return 0 < $sUid;
		});

		try
		{
			$this->MailClient()->MessageDelete($sFolder, $aFilteredUids, true);
			$sHash = $this->MailClient()->FolderHash($sFolder);
		}
		catch (\Exception $oException)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CantDeleteMessage, $oException);
		}

		return $this->DefaultResponse(__FUNCTION__, '' === $sHash ? false : array($sFolder, $sHash));
	}

	/**
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoMessageMove()
	{
		$this->initMailClientConnection();

		$sFromFolder = $this->GetActionParam('FromFolder', '');
		$sToFolder = $this->GetActionParam('ToFolder', '');
		$aUids = explode(',', (string) $this->GetActionParam('Uids', ''));

		$aFilteredUids = array_filter($aUids, function (&$mUid) {
			$mUid = (int) trim($mUid);
			return 0 < $mUid;
		});

		try
		{
			$this->MailClient()->MessageMove($sFromFolder, $sToFolder,
				$aFilteredUids, true, $this->Config()->Get('labs', 'use_imap_move', true));
			
			$sHash = $this->MailClient()->FolderHash($sFromFolder);
		}
		catch (\Exception $oException)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CantMoveMessage, $oException);
		}

		return $this->DefaultResponse(__FUNCTION__,
			'' === $sHash ? false : array($sFromFolder, $sHash));
	}

	/**
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoMessageCopy()
	{
		$this->initMailClientConnection();

		$sFromFolder = $this->GetActionParam('FromFolder', '');
		$sToFolder = $this->GetActionParam('ToFolder', '');
		$aUids = explode(',', (string) $this->GetActionParam('Uids', ''));

		$aFilteredUids = array_filter($aUids, function (&$mUid) {
			$mUid = (int) trim($mUid);
			return 0 < $mUid;
		});

		try
		{
			$this->MailClient()->MessageCopy($sFromFolder, $sToFolder,
				$aFilteredUids, true);

			$sHash = $this->MailClient()->FolderHash($sFromFolder);
		}
		catch (\Exception $oException)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CantCopyMessage, $oException);
		}

		return $this->DefaultResponse(__FUNCTION__,
			'' === $sHash ? false : array($sFromFolder, $sHash));
	}

	/**
	 * @param string $sFileName
	 * @param string $sContentType
	 * @param string $sMimeIndex
	 *
	 * @return string
	 */
	public function MainClearFileName($sFileName, $sContentType, $sMimeIndex)
	{
		$sFileName = 0 === strlen($sFileName) ? preg_replace('/[^a-zA-Z0-9]/', '.', (empty($sMimeIndex) ? '' : $sMimeIndex.'.').$sContentType) : $sFileName;
		$sClearedFileName = preg_replace('/[\s]+/', ' ', preg_replace('/[\.]+/', '.', $sFileName));
		$sExt = \MailSo\Base\Utils::GetFileExtension($sClearedFileName);

		$iSize = 50;
		if ($iSize < strlen($sClearedFileName) - strlen($sExt))
		{
			$sClearedFileName = substr($sClearedFileName, 0, $iSize).(empty($sExt) ? '' : '.'.$sExt);
		}

		return \MailSo\Base\Utils::ClearFileName(\MailSo\Base\Utils::Utf8Clear($sClearedFileName));
	}

	/**
	 * @return array
	 */
	public function DoMessageUploadAttachments()
	{
		$oAccount = $this->initMailClientConnection();

		$mResult = false;
		$self = $this;

		try
		{
			$aAttachments = $this->GetActionParam('Attachments', array());
			if (is_array($aAttachments) && 0 < count($aAttachments))
			{
				$mResult = array();
				foreach ($aAttachments as $sAttachment)
				{
					$aValues = \RainLoop\Utils::DecodeKeyValues($sAttachment);
					if (is_array($aValues))
					{
						$sFolder = isset($aValues['Folder']) ? $aValues['Folder'] : '';
						$iUid = (int) isset($aValues['Uid']) ? $aValues['Uid'] : 0;
						$sMimeIndex = (string) isset($aValues['MimeIndex']) ? $aValues['MimeIndex'] : '';

						$sTempName = md5($sAttachment);
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
		catch (\Exception $oException)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::MailServerError, $oException);
		}

		return $this->DefaultResponse(__FUNCTION__, $mResult);
	}

	/**
	 * @return array
	 */
	public function DoComposeUploadExternals()
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
					@\fclose($rFile);
				}
			}
		}

		return $this->DefaultResponse(__FUNCTION__, $mResult);
	}

	/**
	 * @return array
	 */
	public function DoSocialUsers()
	{
		$oAccount = $this->getAccountFromToken();

		$oSettings = $this->SettingsProvider()->Load($oAccount);

		$aData = array(
			'Google' => '',
			'Facebook' => '',
			'Twitter' => ''
		);

		if ($oSettings)
		{
			$aData['Google'] = $oSettings->GetConf('GoogleSocialName', '');
			$aData['Facebook'] = $oSettings->GetConf('FacebookSocialName', '');
			$aData['Twitter'] = $oSettings->GetConf('TwitterSocialName', '');
		}

		return $this->DefaultResponse(__FUNCTION__, $aData);
	}

	/**
	 * @return array
	 */
	public function DoSocialGoogleDisconnect()
	{
		$oAccount = $this->getAccountFromToken();
		return $this->DefaultResponse(__FUNCTION__, $this->Social()->GoogleDisconnect($oAccount));
	}
	
	/**
	 * @return array
	 */
	public function DoSocialTwitterDisconnect()
	{
		$oAccount = $this->getAccountFromToken();
		return $this->DefaultResponse(__FUNCTION__, $this->Social()->TwitterDisconnect($oAccount));
	}

	/**
	 * @return array
	 */
	public function DoSocialFacebookDisconnect()
	{
		$oAccount = $this->getAccountFromToken();
		return $this->DefaultResponse(__FUNCTION__, $this->Social()->FacebookDisconnect($oAccount));
	}

	/**
	 * @param int $iError
	 * @param int $iClientError
	 *
	 * @return string
	 */
	private function getUploadErrorMessageByCode($iError, &$iClientError)
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

	/**
	 * @return array
	 */
	public function Upload()
	{
		$oAccount = $this->getAccountFromToken();
		$oConfig = $this->Config();

		$sInputName = 'uploader';
		$aResponse = array();

		$iError = UploadError::UNKNOWN;
		$iSizeLimit = ((int) $oConfig->Get('webmail', 'attachment_size_limit', 0)) * 1024 * 1024;
		if ($oAccount)
		{
			$iError = UPLOAD_ERR_OK;
			$_FILES = isset($_FILES) ? $_FILES : null;
			if (isset($_FILES, $_FILES[$sInputName], $_FILES[$sInputName]['name'], $_FILES[$sInputName]['tmp_name'], $_FILES[$sInputName]['size']))
			{
				$iError = (isset($_FILES[$sInputName]['error'])) ? (int) $_FILES[$sInputName]['error'] : UPLOAD_ERR_OK;

				if (UPLOAD_ERR_OK === $iError && 0 < $iSizeLimit && $iSizeLimit < (int) $_FILES[$sInputName]['size'])
				{
					$iError = UploadError::CONFIG_SIZE;
				}

				$sSavedName = 'upload-post-'.md5($_FILES[$sInputName]['name'].$_FILES[$sInputName]['tmp_name']);

				if (UPLOAD_ERR_OK === $iError)
				{
					if (!$this->FilesProvider()->MoveUploadedFile($oAccount, $sSavedName, $_FILES[$sInputName]['tmp_name']))
					{
						$iError = UploadError::ON_SAVING;
					}
				}

				$sUploadName = $_FILES[$sInputName]['name'];
				$iSize = $_FILES[$sInputName]['size'];
				$sMimeType = $_FILES[$sInputName]['type'];

				$aResponse['Attachment'] = array(
					'Name' => $sUploadName,
					'TempName' => $sSavedName,
					'MimeType' => $sMimeType,
					'Size' =>  (int) $iSize
				);
			}
			else if (!isset($_FILES) || !is_array($_FILES) || 0 === count($_FILES))
			{
				$iError = UPLOAD_ERR_INI_SIZE;
			}
			else
			{
				$iError = UploadError::EMPTY_FILES_DATA;
			}
		}

		if (UPLOAD_ERR_OK !== $iError)
		{
			$iClientError = UploadClientError::NORMAL;
			$sError = $this->getUploadErrorMessageByCode($iError, $iClientError);
			if (!empty($sError))
			{
				$aResponse['ErrorCode'] = $iClientError;
				$aResponse['Error'] = $sError;
			}
		}

		return $this->DefaultResponse(__FUNCTION__, $aResponse);
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param resource $rFile
	 * @param string $sFileStart
	 *
	 * @return int
	 */
	private function importContactsFromCsvFile($oAccount, $rFile, $sFileStart)
	{
		$iCount = 0;
		$aHeaders = null;
		$aData = array();
		
		if ($oAccount && \is_resource($rFile))
		{
			$oPab = $this->PersonalAddressBookProvider($oAccount);
			if ($oPab && $oPab->IsActive())
			{
				$sDelimiter = ((int) \strpos($sFileStart, ',') > (int) \strpos($sFileStart, ';')) ? ',' : ';';

				@\setlocale(LC_CTYPE, 'en_US.UTF-8');
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

				if (\is_array($aData) && 0 < \count($aData))
				{
					$this->Logger()->Write('Import contacts from csv');
					$iCount = $oPab->ImportCsvArray($oAccount->ParentEmailHelper(), $aData);
				}
			}
		}

		return $iCount;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param resource $rFile
	 * @param string $sFileStart
	 *
	 * @return int
	 */
	private function importContactsFromVcfFile($oAccount, $rFile, $sFileStart)
	{
		$iCount = 0;
		if ($oAccount && \is_resource($rFile))
		{
			$oPab = $this->PersonalAddressBookProvider($oAccount);
			if ($oPab && $oPab->IsActive())
			{
				$sFile = \stream_get_contents($rFile);
				if (\is_resource($rFile))
				{
					@\fclose($rFile);
				}

				if (is_string($sFile) && 5 < \strlen($sFile))
				{
					$this->Logger()->Write('Import contacts from vcf');
					$iCount = $oPab->ImportVcfFile($oAccount->ParentEmailHelper(), $sFile);
				}
			}
		}

		return $iCount;
	}
	
	/**
	 * @return array
	 */
	public function UploadContacts()
	{
		$oAccount = $this->getAccountFromToken();
		$oConfig = $this->Config();

		$sInputName = 'uploader';
		$mResponse = false;

		$iError = UploadError::UNKNOWN;
		$iSizeLimit = ((int) $oConfig->Get('webmail', 'attachment_size_limit', 0)) * 1024 * 1024;
		
		if ($oAccount)
		{
			$oPab = $this->PersonalAddressBookProvider($oAccount);
			if ($oPab)
			{
				$iError = UPLOAD_ERR_OK;
				$_FILES = isset($_FILES) ? $_FILES : null;
				if (isset($_FILES, $_FILES[$sInputName], $_FILES[$sInputName]['name'], $_FILES[$sInputName]['tmp_name'], $_FILES[$sInputName]['size']))
				{
					$iError = (isset($_FILES[$sInputName]['error'])) ? (int) $_FILES[$sInputName]['error'] : UPLOAD_ERR_OK;

					if (UPLOAD_ERR_OK === $iError && 0 < $iSizeLimit && $iSizeLimit < (int) $_FILES[$sInputName]['size'])
					{
						$iError = UploadError::CONFIG_SIZE;
					}

					$sSavedName = 'upload-post-'.md5($_FILES[$sInputName]['name'].$_FILES[$sInputName]['tmp_name']);

					if (UPLOAD_ERR_OK === $iError)
					{
						if (!$this->FilesProvider()->MoveUploadedFile($oAccount, $sSavedName, $_FILES[$sInputName]['tmp_name']))
						{
							$iError = UploadError::ON_SAVING;
						}

						@\ini_set('auto_detect_line_endings', true);
						$mData = $this->FilesProvider()->GetFile($oAccount, $sSavedName);
						if ($mData)
						{
							$sFileStart = @\fread($mData, 20);
							\rewind($mData);

							if (false !== $sFileStart)
							{
								$sFileStart = \trim($sFileStart);
								if (false !== \strpos($sFileStart, 'BEGIN:VCARD'))
								{
									$mResponse = $this->importContactsFromVcfFile($oAccount, $mData, $sFileStart);
								}
								else if (false !== \strpos($sFileStart, ',') || false !== \strpos($sFileStart, ';'))
								{
									$mResponse = $this->importContactsFromCsvFile($oAccount, $mData, $sFileStart);
								}
							}
						}

						if (\is_resource($mData))
						{
							@\fclose($mData);
						}

						unset($mData);
						$this->FilesProvider()->Clear($oAccount, $sSavedName);

						@\ini_set('auto_detect_line_endings', false);
					}
				}
				else if (!isset($_FILES) || !is_array($_FILES) || 0 === count($_FILES))
				{
					$iError = UPLOAD_ERR_INI_SIZE;
				}
				else
				{
					$iError = UploadError::EMPTY_FILES_DATA;
				}
			}
		}

		if (UPLOAD_ERR_OK !== $iError)
		{
			$iClientError = UploadClientError::NORMAL;
			$sError = $this->getUploadErrorMessageByCode($iError, $iClientError);
			
			if (!empty($sError))
			{
				return $this->FalseResponse(__FUNCTION__, $iClientError, $sError);
			}
		}

		return $this->DefaultResponse(__FUNCTION__, $mResponse);
	}

	/**
	 * @return array
	 */
	public function UploadBackground()
	{
		$oAccount = $this->getAccountFromToken();
		
		$sInputName = 'uploader';
		$mResponse = false;

		$iError = UploadError::UNKNOWN;
		$iSizeLimit = 1024 * 1024;
		if ($oAccount)
		{
			$iError = UPLOAD_ERR_OK;
			$_FILES = isset($_FILES) ? $_FILES : null;
			if (isset($_FILES, $_FILES[$sInputName], $_FILES[$sInputName]['name'], $_FILES[$sInputName]['tmp_name'], $_FILES[$sInputName]['size']))
			{
				$iError = (isset($_FILES[$sInputName]['error'])) ? (int) $_FILES[$sInputName]['error'] : UPLOAD_ERR_OK;

				if (UPLOAD_ERR_OK === $iError && 0 < $iSizeLimit && $iSizeLimit < (int) $_FILES[$sInputName]['size'])
				{
					$iError = UploadError::CONFIG_SIZE;
				}

				if (UPLOAD_ERR_OK === $iError && !\in_array(\strtolower($_FILES[$sInputName]['type']), array('image/png', 'image/jpg', 'image/jpeg')))
				{
					$iError = UploadError::FILE_TYPE;
				}

				$sSavedName = 'upload-post-'.md5($_FILES[$sInputName]['name'].$_FILES[$sInputName]['tmp_name']);

				if (UPLOAD_ERR_OK === $iError)
				{
					if (!$this->FilesProvider()->MoveUploadedFile($oAccount, $sSavedName, $_FILES[$sInputName]['tmp_name']))
					{
						$iError = UploadError::ON_SAVING;
					}

					$mData = $this->FilesProvider()->GetFile($oAccount, $sSavedName);
					if ($mData)
					{
						$this->StorageProvider()->Put($oAccount,
							\RainLoop\Providers\Storage\Enumerations\StorageType::USER, 'CustomThemeBackground',
							'data:'.$_FILES[$sInputName]['type'].';base64,'.base64_encode(
								\stream_get_contents($mData)
							)
						);
					}

					if (\is_resource($mData))
					{
						\fclose($mData);
					}
					
					unset($mData);
					$this->FilesProvider()->Clear($oAccount, $sSavedName);

					$mResponse = $_FILES[$sInputName]['name'];
				}

			}
			else if (!isset($_FILES) || !is_array($_FILES) || 0 === count($_FILES))
			{
				$iError = UPLOAD_ERR_INI_SIZE;
			}
			else
			{
				$iError = UploadError::EMPTY_FILES_DATA;
			}
		}

		if (UPLOAD_ERR_OK !== $iError)
		{
			$iClientError = UploadClientError::NORMAL;
			$sError = $this->getUploadErrorMessageByCode($iError, $iClientError);
			if (!empty($sError))
			{
				return $this->FalseResponse(__FUNCTION__, $iClientError, $sError);
			}
		}

		return $this->DefaultResponse(__FUNCTION__, $mResponse);
	}

	/**
	 * @return bool
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function RawViewAsPlain()
	{
		$this->initMailClientConnection();

		$sRawKey = (string) $this->GetActionParam('RawKey', '');
		$aValues = $this->getDecodedRawKeyValue($sRawKey);

		$sFolder = isset($aValues['Folder']) ? $aValues['Folder'] : '';
		$iUid = (int) (isset($aValues['Uid']) ? $aValues['Uid'] : 0);
		$sMimeIndex = (string) (isset($aValues['MimeIndex']) ? $aValues['MimeIndex'] : '');

		header('Content-Type: text/plain', true);

		return $this->MailClient()->MessageMimeStream(function ($rResource) {
			if (is_resource($rResource))
			{
				\MailSo\Base\Utils::FpassthruWithTimeLimitReset($rResource);
			}
		}, $sFolder, $iUid, true, $sMimeIndex);
	}

	/**
	 * @return bool
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function Append()
	{
		$oAccount = $this->initMailClientConnection();

		$sFolderFullNameRaw = $this->GetActionParam('Folder', '');

		$_FILES = isset($_FILES) ? $_FILES : null;
		if ($oAccount instanceof \RainLoop\Account &&
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
					}
				}
			}
		}

		return $this->DefaultResponse(__FUNCTION__, true);
	}

	/**
	 * @param string $sKey
	 * @param bool $bForce = false
	 *
	 * @return bool
	 */
	public function cacheByKey($sKey, $bForce = false)
	{
		$bResult = false;
		if (!empty($sKey) && ($bForce || $this->Config()->Get('cache', 'enable', true) && $this->Config()->Get('cache', 'http', true)))
		{
			$iLast = 1382478804;
			$iExpires = 2002478804;

			header('Cache-Control: private', true);
			header('ETag: '.\md5('Etag:'.\md5($sKey.\md5($this->Config()->Get('cache', 'index', '')))), true);
			header('Last-Modified: '.\gmdate('D, d M Y H:i:s', $iLast).' UTC', true);
			header('Expires: '.\gmdate('D, j M Y H:i:s', $iExpires).' UTC', true);
			header('Connection: close');
			
			$bResult = true;
		}

		return $bResult;
	}

	/**
	 * @param string $sKey
	 * @param bool $bForce = false
	 *
	 * @return void
	 */
	public function verifyCacheByKey($sKey, $bForce = false)
	{
		if (!empty($sKey) && ($bForce || $this->Config()->Get('cache', 'enable', true) && $this->Config()->Get('cache', 'http', true)))
		{
			$sIfModifiedSince = $this->Http()->GetHeader('If-Modified-Since', '');
			$sIfNoneMatch = $this->Http()->GetHeader('If-None-Match', '');
			if (!empty($sIfModifiedSince) || !empty($sIfNoneMatch))
			{
				$this->Http()->StatusHeader(304);
				$this->cacheByKey($sKey);
				exit();
			}
		}
	}
	
	/**
	 * @param bool $bDownload
	 *
	 * @return bool
	 */
	private function rawSmart($bDownload)
	{
		$sRawKey = (string) $this->GetActionParam('RawKey', '');
		$aValues = $this->getDecodedRawKeyValue($sRawKey);

		$sFolder = isset($aValues['Folder']) ? $aValues['Folder'] : '';
		$iUid = (int) isset($aValues['Uid']) ? $aValues['Uid'] : 0;
		$sMimeIndex = (string) isset($aValues['MimeIndex']) ? $aValues['MimeIndex'] : '';

		$sContentTypeIn = (string) isset($aValues['MimeType']) ? $aValues['MimeType'] : '';
		$sFileNameIn = (string) isset($aValues['FileName']) ? $aValues['FileName'] : '';

		if (!empty($sFolder) && 0 < $iUid)
		{
			$this->verifyCacheByKey($sRawKey);
		}

		$this->initMailClientConnection();

		$self = $this;
		return $this->MailClient()->MessageMimeStream(
			function($rResource, $sContentType, $sFileName, $sMimeIndex = '') use ($self, $sRawKey, $sContentTypeIn, $sFileNameIn, $bDownload) {
				if (is_resource($rResource))
				{
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

					header('Content-Type: '.$sContentTypeOut);
					header('Content-Disposition: '.($bDownload ? 'attachment' : 'inline').'; filename="'.$sFileNameOut.'"; charset=utf-8', true);
					header('Accept-Ranges: none', true);
					header('Content-Transfer-Encoding: binary');

					$self->cacheByKey($sRawKey);

					\MailSo\Base\Utils::FpassthruWithTimeLimitReset($rResource);
				}
			}, $sFolder, $iUid, true, $sMimeIndex);
	}

	/**
	 * @return bool
	 */
	public function RawDownload()
	{
		return $this->rawSmart(true);
	}

	/**
	 * @return bool
	 */
	public function RawView()
	{
		return $this->rawSmart(false);
	}

	/**
	 * @return bool
	 */
	public function RawUserPic()
	{
		$sRawKey = (string) $this->GetActionParam('RawKey', '');
		if (!empty($sRawKey))
		{
			$this->verifyCacheByKey($sRawKey);
		}

		$oAccount = $this->getAccountFromToken();
		
		$sData = $this->StorageProvider()->Get($oAccount, 
			\RainLoop\Providers\Storage\Enumerations\StorageType::USER, 'contacts/'.$sRawKey);
		if ($sData)
		{
			$aData = \explode('|||', $sData, 2);
			if (\is_array($aData) && 2 === \count($aData) && !empty($aData[0]) && !empty($aData[1]))
			{
				header('Content-Type: '.$aData[0]);
				header('Content-Disposition: inline; filename="'.\preg_replace('/[^a-zA-Z0-9]+/', '.', $aData[0]).'"', true);
				header('Accept-Ranges: none', true);
				header('Content-Transfer-Encoding: binary');

				$this->cacheByKey($sRawKey);

				echo \MailSo\Base\Utils::Base64Decode($aData[1]);

				return true;
			}
		}
		
		return false;
	}

	/**
	 * @return \RainLoop\Account|bool
	 */
	private function initMailClientConnection()
	{
		$oAccount = null;

		if (!$this->MailClient()->IsLoggined())
		{
			$oAccount = $this->getAccountFromToken();

			try
			{
				$this->MailClient()
					->Connect($oAccount->Domain()->IncHost(), $oAccount->Domain()->IncPort(), $oAccount->Domain()->IncSecure())
					->Login($oAccount->IncLogin(), $oAccount->Password(), !!$this->Config()->Get('labs', 'use_imap_auth_plain'))
				;
			}
			catch (\MailSo\Net\Exceptions\ConnectionException $oException)
			{
				throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::ConnectionError, $oException);
			}
			catch (\Exception $oException)
			{
				throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AuthError, $oException);
			}

			$this->MailClient()->ImapClient()->__FORCE_SELECT_ON_EXAMINE__ = !!$this->Config()->Get('labs', 'use_imap_force_selection');
		}

		return $oAccount;
	}

	/**
	 * @param string $sRawKey
	 *
	 * @return array | false
	 */
	private function getDecodedRawKeyValue($sRawKey)
	{
		$bResult = false;
		if (!empty($sRawKey))
		{
			$aValues = \RainLoop\Utils::DecodeKeyValues($sRawKey);
			if (is_array($aValues))
			{
				$bResult = $aValues;
			}
		}

		return $bResult;
	}

	/**
	 * @param string $sRawKey
	 * @param int | null $iLenCache
	 * @return array | bool
	 */
	private function getDecodedClientRawKeyValue($sRawKey, $iLenCache = null)
	{
		$mResult = false;
		if (!empty($sRawKey))
		{
			$sRawKey = \MailSo\Base\Utils::UrlSafeBase64Decode($sRawKey);
			$aValues = explode("\x0", $sRawKey);

			if (is_array($aValues) && (null === $iLenCache || $iLenCache  === count($aValues)))
			{
				$mResult = $aValues;
			}
		}

		return $mResult;
	}

	/**
	 * @param string $sTheme
	 *
	 * @return string
	 */
	public function ValidateTheme($sTheme)
	{
		return \in_array($sTheme, $this->GetThemes()) ?
			$sTheme : $this->Config()->Get('themes', 'default', 'Default');
	}

	/**
	 * @param string $sLanguage
	 *
	 * @return string
	 */
	public function ValidateLanguage($sLanguage)
	{
		return \in_array($sLanguage, $this->GetLanguages()) ?
			$sLanguage : $this->Config()->Get('i18n', 'default', 'en');
	}

	/**
	 * @param string $sType
	 *
	 * @return string
	 */
	public function ValidateContactPdoType($sType)
	{
		return \in_array($sType, array('mysql', 'pgsql', 'sqlite')) ? $sType : 'sqlite';
	}

	/**
	 * @staticvar array $aCache
	 * @param bool $bAdmin = false
	 *
	 * @return array
	 */
	public function GetThemes($bAdmin = false)
	{
		static $aCache = null;
		if (is_array($aCache))
		{
			return $aCache;
		}

		$bClear = false;
		$bDefault = false;
		$sList = array();
		$sDir = APP_VERSION_ROOT_PATH.'themes';
		if (@is_dir($sDir))
		{
			$rDirH = opendir($sDir);
			if ($rDirH)
			{
				while (($sFile = readdir($rDirH)) !== false)
				{
					if ('.' !== $sFile{0} && is_dir($sDir.'/'.$sFile) && file_exists($sDir.'/'.$sFile.'/styles.less'))
					{
						if ('Default' !== $sFile && 'Clear' !== $sFile && 'Custom' !== $sFile)
						{
							$sList[] = $sFile;
						}
						else
						{
							if ('Default' === $sFile)
							{
								$bDefault = true;
							}
							else if ('Clear' === $sFile)
							{
								$bClear = true;
							}
						}
					}
				}
				@closedir($rDirH);
			}
		}

		sort($sList);
		if ($bDefault)
		{
			array_unshift($sList, 'Default');
		}
		
		if ($bClear)
		{
			array_push($sList, 'Clear');
		}

		if (!$bAdmin && $this->Config()->Get('webmail', 'allow_custom_theme', true))
		{
			array_push($sList, 'Custom');
		}

		$aCache = $sList;
		return $sList;
	}

	/**
	 * @staticvar array $aCache
	 *
	 * @return array
	 */
	public function GetLanguages()
	{
		static $aCache = null;
		if (\is_array($aCache))
		{
			return $aCache;
		}

		$bEn = false;
		$sList = array();
		$sDir = APP_VERSION_ROOT_PATH.'langs/';
		if (@\is_dir($sDir))
		{
			$rDirH = opendir($sDir);
			if ($rDirH)
			{
				while (($sFile = \readdir($rDirH)) !== false)
				{
					if ('.' !== $sFile{0} && \is_file($sDir.'/'.$sFile) && '.ini' === \substr($sFile, -4))
					{
						$sLang = \strtolower(\substr($sFile, 0, -4));
						if (0 < \strlen($sLang) && 'always' !== $sLang)
						{
							if (\in_array($sLang, array('en')))
							{
								$bEn = true;
							}
							else
							{
								\array_push($sList, $sLang);
							}
						}
					}
				}

				@\closedir($rDirH);
			}
		}

		\sort($sList);
		if ($bEn)
		{
			\array_unshift($sList, 'en');
		}

		$aCache = $sList;
		return $sList;
	}

	/**
	 * @param string $sName
	 * @param string $sHtml
	 *
	 * @return string
	 */
	public function ProcessTemplate($sName, $sHtml)
	{
		$sHtml = $this->Plugins()->ProcessTemplate($sName, $sHtml);
		$sHtml = \preg_replace('/\{\{INCLUDE\/([a-zA-Z]+)\/PLACE\}\}/', '', $sHtml);

		return \RainLoop\Utils::ClearHtmlOutput($sHtml);
	}

	/**
	 * @staticvar bool $bOnce
	 * @param string $sName
	 * @param array $aData = array()
	 *
	 * @return bool
	 */
	public function KeenIO($sName, $aData = array())
	{
		static $bOnce = null;
		if (false === $bOnce)
		{
			return false;
		}

		if (APP_VERSION === APP_DEV_VERSION ||
			\in_array(APP_SITE, \explode(' ', \base64_decode('bG9jYWxob3N0IHJhaW5sb29wLmRlIHJhaW5sb29wLm5ldCBkZW1vLnJhaW5sb29wLm5ldCBkZW1vLnJhaW5sb29wLmRl'))))
		{
			return true;
		}

		if (null === $bOnce && (!\MailSo\Base\Utils::FunctionExistsAndEnabled('curl_init') ||
				!\MailSo\Base\Utils::FunctionExistsAndEnabled('json_encode')))
		{
			$bOnce = false;
			return false;
		}

		$aOptions = array(
			CURLOPT_URL => \base64_decode('aHR0cHM6Ly9hcGkua2Vlbi5pby8zLjAvcHJvamVjdHMvNTE2NmRmOGUzODQzMzE3Y2QzMDAwMDA2L2V2ZW50cy8=').$sName,
			CURLOPT_HEADER => false,
			CURLOPT_FAILONERROR => true,
			CURLOPT_SSL_VERIFYPEER => false,
			CURLOPT_RETURNTRANSFER => true,
			CURLOPT_HTTPHEADER => array(
				'Content-Type: application/json'
			),
			CURLOPT_POST => true,
			CURLOPT_POSTFIELDS => \json_encode(\array_merge($aData, array(
				'version' => APP_VERSION,
				'uid' => \md5(APP_SITE.APP_SALT),
				'site' => APP_SITE,
				'date' => array(
					'month' => \gmdate('m.Y'),
					'day' => \gmdate('d.m.Y')
				)
			))),
			CURLOPT_TIMEOUT => 10
		);

		$sProxy = $this->Config()->Get('labs', 'curl_proxy', '');
		if (0 < \strlen($sProxy))
		{
			$aOptions[CURLOPT_PROXY] = $sProxy;

			$sProxyAuth = $this->Config()->Get('labs', 'curl_proxy_auth', '');
			if (0 < \strlen($sProxyAuth))
			{
				$aOptions[CURLOPT_PROXYUSERPWD] = $sProxyAuth;
			}
		}

		$oCurl = \curl_init();
		\curl_setopt_array($oCurl, $aOptions);
		$mResult = \curl_exec($oCurl);

		if (\is_resource($oCurl))
		{
			\curl_close($oCurl);
		}

		return !!$mResult;
	}

	/**
	 * @param string $sActionName
	 * @param mixed $mResult = false
	 * @param array $aAdditionalParams = array()
	 *
	 * @return array
	 */
	private function mainDefaultResponse($sActionName, $mResult = false, $aAdditionalParams = array())
	{
		$sActionName = 'Do' === substr($sActionName, 0, 2) ? substr($sActionName, 2) : $sActionName;

		$aResult = array(
			'Action' => $sActionName,
			'Result' => $this->responseObject($mResult, $sActionName)
		);

		if (\is_array($aAdditionalParams))
		{
			foreach ($aAdditionalParams as $sKey => $mValue)
			{
				$aResult[$sKey] = $mValue;
			}
		}

		return $aResult;
	}
	/**
	 * @param string $sActionName
	 * @param mixed $mResult = false
	 * @param array $aAdditionalParams = array()
	 *
	 * @return array
	 */
	public function DefaultResponse($sActionName, $mResult = false, $aAdditionalParams = array())
	{
		$this->Plugins()->RunHook('main.default-response-data', array($sActionName, &$mResult));
		$aResponseItem = $this->mainDefaultResponse($sActionName, $mResult, $aAdditionalParams);
		$this->Plugins()->RunHook('main.default-response', array($sActionName, &$aResponseItem));
		return $aResponseItem;
	}

	/**
	 * @param string $sActionName
	 * @param array $aAdditionalParams = array()
	 *
	 * @return array
	 */
	public function TrueResponse($sActionName, $aAdditionalParams = array())
	{
		$mResult = true;
		$this->Plugins()->RunHook('main.default-response-data', array($sActionName, &$mResult));
		$aResponseItem = $this->mainDefaultResponse($sActionName, $mResult, $aAdditionalParams);
		$this->Plugins()->RunHook('main.default-response', array($sActionName, &$aResponseItem));
		return $aResponseItem;
	}

	/**
	 * @param string $sActionName
	 * @param int $iErrorCode = null
	 * @param string $sErrorMessage = null
	 *
	 * @return array
	 */
	public function FalseResponse($sActionName, $iErrorCode = null, $sErrorMessage = null)
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
		}
		
		$aResponseItem = $this->mainDefaultResponse($sActionName, $mResult, $aAdditionalParams);

		$this->Plugins()->RunHook('main.default-response', array($sActionName, &$aResponseItem));
		return $aResponseItem;
	}

	/**
	 * @param string $sActionName
	 * @param \Exception $oException
	 *
	 * @return array
	 */
	public function ExceptionResponse($sActionName, $oException)
	{
		$iErrorCode = null;
		$sErrorMessage = null;

		if ($oException instanceof \RainLoop\Exceptions\ClientException)
		{
			$iErrorCode = $oException->getCode();
			$sErrorMessage = null;
			if ($iErrorCode === \RainLoop\Notifications::ClientViewError)
			{
				$sErrorMessage = $oException->getMessage();
			}
		}
		else
		{
			$iErrorCode = \RainLoop\Notifications::UnknownError;
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

		return $this->FalseResponse($sActionName, $iErrorCode, $sErrorMessage);
	}

	/**
	 * @param array $aCurrentActionParams
	 * @param string $sMethodName = ''
	 *
	 * @return \RainLoop\Actions
	 */
	public function SetActionParams($aCurrentActionParams, $sMethodName = '')
	{
		$this->Plugins()->RunHook('filter.action-params', array($sMethodName, &$aCurrentActionParams));

		$this->aCurrentActionParams = $aCurrentActionParams;

		return $this;
	}

	/**
	 * @param string $sKey
	 * @param mixed $mDefault = null
	 *
	 * @return mixed
	 */
	public function GetActionParam($sKey, $mDefault = null)
	{
		return is_array($this->aCurrentActionParams) && isset($this->aCurrentActionParams[$sKey]) ?
			$this->aCurrentActionParams[$sKey] : $mDefault;
	}

	/**
	 * @param string $sKey
	 *
	 * @return bool
	 */
	public function HasActionParam($sKey)
	{
		return isset($this->aCurrentActionParams[$sKey]);
	}

	/**
	 * @param string $sUrl
	 */
	public function Location($sUrl)
	{
		$this->Logger()->Write('Location: '.$sUrl);
		@\header('Location: '.$sUrl);
	}

	/**
	 * @param string $sTitle
	 * @param string $sDesc
	 *
	 * @return mixed
	 */
	public function ErrorTemplates($sTitle, $sDesc, $bShowBackLink = true)
	{
		return strtr(file_get_contents(APP_VERSION_ROOT_PATH.'app/templates/Error.html'), array(
			'{{BaseWebStaticPath}}' => APP_WEB_STATIC_PATH,
			'{{ErrorTitle}}' => $sTitle,
			'{{ErrorHeader}}' => $sTitle,
			'{{ErrorDesc}}' => $sDesc,
			'{{BackLinkVisibilityStyle}}' => $bShowBackLink ? 'display:inline-block' : 'display:none',
			'{{BackLink}}' => $this->StaticI18N('STATIC/BACK_LINK'),
			'{{BackHref}}' => './'
		));
	}

	/**
	 * @param object $oData
	 * @param string $sParent
	 * @param array $aParameters = array()
	 *
	 * @return array | false
	 */
	private function objectData($oData, $sParent, $aParameters = array())
	{
		$mResult = false;
		if (is_object($oData))
		{
			$aNames = explode('\\', get_class($oData));
			$mResult = array(
//				'@Action' => $sParent,
				'@Object' => end($aNames)
			);

			if ($oData instanceof \MailSo\Base\Collection)
			{
				$mResult['@Object'] = 'Collection/'.$mResult['@Object'];
				$mResult['@Count'] = $oData->Count();
				$mResult['@Collection'] = $this->responseObject($oData->GetAsArray(), $sParent, $aParameters);
			}
			else
			{
				$mResult['@Object'] = 'Object/'.$mResult['@Object'];
			}
		}

		return $mResult;
	}

	/**
	 * @param string $sFolderFullName
	 *
	 * @return string
	 */
	private function hashFolderFullName($sFolderFullName)
	{
		return \in_array(\strtolower($sFolderFullName), array('inbox', 'sent', 'send', 'drafts', 
			'spam', 'junk', 'bin', 'trash', 'archive', 'allmail')) ?
				\ucfirst(\strtolower($sFolderFullName)) : \md5($sFolderFullName);

//		return \in_array(\strtolower($sFolderFullName), array('inbox', 'sent', 'send', 'drafts', 'spam', 'junk', 'bin', 'trash')) ?
//			\ucfirst(\strtolower($sFolderFullName)) :
//				\RainLoop\Utils::CustomBaseConvert(\sprintf('%u', \crc32(md5($sFolderFullName).$sFolderFullName)), '0123456789',
//					'0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
//		return \preg_match('/^[a-zA-Z0-9]+$/', $sFolderFullName) ? $sFolderFullName : \md5($sFolderFullName);
//		return \preg_match('/^[a-zA-Z0-9]+$/', $sFolderFullName) ? $sFolderFullName : \rtrim(\base_convert(\md5($sFolderFullName), 16, 32), '0');
//		return 'INBOX' === $sFolderFullName ? $sFolderFullName : \base_convert(\sprintf('%u', \crc32(\md5($sFolderFullName))), 10, 32);
	}

	/**
	 * @return array
	 */
	public function GetLanguageAndTheme()
	{
		$oAccount = $this->GetAccount();
		$oSettings = $oAccount instanceof \RainLoop\Account ? $this->SettingsProvider()->Load($oAccount) : null;

		$sLanguage = $this->Config()->Get('webmail', 'language', 'en');
		$sTheme = $this->Config()->Get('webmail', 'theme', 'Default');

		if ($oSettings instanceof \RainLoop\Settings)
		{
			$sLanguage = $oSettings->GetConf('Language', $sLanguage);
			$sTheme = $oSettings->GetConf('Theme', $sTheme);
		}

		$sLanguage = $this->ValidateLanguage($sLanguage);
		$sTheme = $this->ValidateTheme($sTheme);

		return array($sLanguage, $sTheme);
	}

	/**
	 * @param string $sKey
	 *
	 * @return string
	 */
	public function StaticI18N($sKey)
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
			$aLang = array();
			\RainLoop\Utils::ReadAndAddLang(APP_VERSION_ROOT_PATH.'app/i18n/langs.ini', $aLang);
			\RainLoop\Utils::ReadAndAddLang(APP_VERSION_ROOT_PATH.'langs/'.$sLang.'.ini', $aLang);

			$this->Plugins()->ReadLang($sLang, $aLang);
		}

		return isset($aLang[$sKey]) ? $aLang[$sKey] : $sKey;
	}

	/**
	 * @param mixed $mResponse
	 * @param string $sParent
	 * @param array $aParameters = array()
	 *
	 * @return mixed
	 */
	protected function responseObject($mResponse, $sParent = '', $aParameters = array())
	{
		$mResult = $mResponse;
		if (\is_object($mResponse))
		{
			$bHook = true;
			$sClassName = \get_class($mResponse);
			$bHasSimpleJsonFunc = \method_exists($mResponse, 'ToSimpleJSON');
			
			if ($bHasSimpleJsonFunc)
			{
				$mResult = \array_merge($this->objectData($mResponse, $sParent, $aParameters), $mResponse->ToSimpleJSON());
			}
			else if ('MailSo\Mail\Message' === $sClassName)
			{
				$oAccount = $this->getAccountFromToken(false);

				$mResult = \array_merge($this->objectData($mResponse, $sParent, $aParameters), array(
					'Folder' => $mResponse->Folder(),
					'Uid' => (string) $mResponse->Uid(),
					'Subject' => \trim(\MailSo\Base\Utils::Utf8Clear($mResponse->Subject())),
					'MessageId' => $mResponse->MessageId(),
					'Size' => $mResponse->Size(),
					'DateTimeStampInUTC' => !!$this->Config()->Get('labs', 'date_from_headers', false)
						? $mResponse->HeaderTimeStampInUTC() : $mResponse->InternalTimeStampInUTC(),
					'ReplyTo' => $this->responseObject($mResponse->ReplyTo(), $sParent, $aParameters),
					'From' => $this->responseObject($mResponse->From(), $sParent, $aParameters),
					'To' => $this->responseObject($mResponse->To(), $sParent, $aParameters),
					'Cc' => $this->responseObject($mResponse->Cc(), $sParent, $aParameters),
					'Bcc' => $this->responseObject($mResponse->Bcc(), $sParent, $aParameters),
					'Sender' => $this->responseObject($mResponse->Sender(), $sParent, $aParameters),
					'Priority' => $mResponse->Priority(),
					'Threads' => $mResponse->Threads(),
					'ThreadsLen' => $mResponse->ThreadsLen(),
					'ParentThread' => $mResponse->ParentThread(),
					'Sensitivity' => $mResponse->Sensitivity(),
					'ReadReceipt' => ''
				));

				$oAttachments = $mResponse->Attachments();
				$iAttachmentsCount = $oAttachments ? $oAttachments->Count() : 0;

				$mResult['HasAttachments'] = 0 < $iAttachmentsCount;
				$mResult['AttachmentsMainType'] = '';
				if (0 < $iAttachmentsCount)
				{
					switch (true)
					{
						case $iAttachmentsCount === $oAttachments->ImageCount():
							$mResult['AttachmentsMainType'] = 'image';
							break;
						case $iAttachmentsCount === $oAttachments->ArchiveCount():
							$mResult['AttachmentsMainType'] = 'archive';
							break;
						case $iAttachmentsCount === $oAttachments->PdfCount():
							$mResult['AttachmentsMainType'] = 'pdf';
							break;
						case $iAttachmentsCount === $oAttachments->DocCount():
							$mResult['AttachmentsMainType'] = 'doc';
							break;
					}
				}

				$sSubject = $mResult['Subject'];
				$mResult['Hash'] = \md5($mResult['Folder'].$mResult['Uid']);
				$mResult['RequestHash'] = \RainLoop\Utils::EncodeKeyValues(array(
					'V' => APP_VERSION,
					'Account' => $oAccount ? \md5($oAccount->Hash()) : '',
					'Folder' => $mResult['Folder'],
					'Uid' => $mResult['Uid'],
					'MimeType' => 'message/rfc822',
					'FileName' => (0 === \strlen($sSubject) ? 'message-'.$mResult['Uid'] : $sSubject).'.eml'
				));

				// Flags
				$aFlags = $mResponse->FlagsLowerCase();
				$mResult['IsSeen'] = \in_array('\\seen', $aFlags);
				$mResult['IsFlagged'] = \in_array('\\flagged', $aFlags);
				$mResult['IsAnswered'] = \in_array('\\answered', $aFlags);

				$sForwardedFlag = $this->Config()->Get('labs', 'imap_forwarded_flag', '');
				$sReadReceiptFlag = $this->Config()->Get('labs', 'imap_read_receipt_flag', '');
				
				$mResult['IsForwarded'] = 0 < \strlen($sForwardedFlag) && \in_array(\strtolower($sForwardedFlag), $aFlags);
				$mResult['IsReadReceipt'] = 0 < \strlen($sReadReceiptFlag) && \in_array(\strtolower($sReadReceiptFlag), $aFlags);

				if ('Message' === $sParent)
				{
					$oAttachments = /* @var \MailSo\Mail\AttachmentCollection */  $mResponse->Attachments();

					$bHasExternals = false;
					$mFoundedCIDs = array();
					$aContentLocationUrls = array();
					$mFoundedContentLocationUrls = array();

					if ($oAttachments && 0 < $oAttachments->Count())
					{
						$aList =& $oAttachments->GetAsArray();
						foreach ($aList as /* @var \MailSo\Mail\Attachment */ $oAttachment)
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
					$bRtl = false;
					
					if (0 === \strlen($sHtml))
					{
						$sPlain = \trim($mResponse->Plain());
						$bRtl = \MailSo\Base\Utils::IsRTL($sPlain);
					}
					else
					{
						$bRtl = \MailSo\Base\Utils::IsRTL($sHtml);
					}

					$mResult['DraftInfo'] = $mResponse->DraftInfo();
					$mResult['InReplyTo'] = $mResponse->InReplyTo();
					$mResult['References'] = $mResponse->References();
					$mResult['Html'] = 0 === \strlen($sHtml) ? '' : \MailSo\Base\HtmlUtils::ClearHtml(
						$sHtml, $bHasExternals, $mFoundedCIDs, $aContentLocationUrls, $mFoundedContentLocationUrls, false,
						!!$this->Config()->Get('labs', 'allow_smart_html_links', true));

					$mResult['PlainRaw'] = $sPlain;
					$mResult['Plain'] = 0 === \strlen($sPlain) ? '' : \MailSo\Base\HtmlUtils::ConvertPlainToHtml($sPlain);
					$mResult['Rtl'] = $bRtl;

					$mResult['TextHash'] = \md5($mResult['Html'].$mResult['Plain'].$mResult['PlainRaw']);

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
								if (!$oReadReceipt || ($oReadReceipt && \strtolower($oAccount->Email()) === \strtolower($oReadReceipt->GetEmail())))
								{
									$mResult['ReadReceipt'] = '';
								}
							}
							catch (\Exception $oException) {}
						}

						if (0 < \strlen($mResult['ReadReceipt']) && '1' === $this->Cacher()->Get(
							'/ReadReceipt/'.$oAccount->Email().'/'.$mResult['Folder'].'/'.$mResult['Uid'], '0'))
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
					'Email' => \MailSo\Base\Utils::Utf8Clear($mResponse->GetEmail())
				));
			}
			else if ('RainLoop\Providers\PersonalAddressBook\Classes\Contact' === $sClassName)
			{
				$mResult = \array_merge($this->objectData($mResponse, $sParent, $aParameters), array(
					/* @var $mResponse \RainLoop\Providers\PersonalAddressBook\Classes\Contact */
					'IdContact' => $mResponse->IdContact,
					'IdContactStr' => $mResponse->IdContactStr,
					'Display' => \MailSo\Base\Utils::Utf8Clear($mResponse->Display),
					'ReadOnly' => $mResponse->ReadOnly,
					'ScopeType' => $mResponse->ScopeType,
					'IdPropertyFromSearch' => $mResponse->IdPropertyFromSearch,
					'Properties' => $this->responseObject($mResponse->Properties, $sParent, $aParameters)
				));
			}
			else if ('RainLoop\Providers\PersonalAddressBook\Classes\Property' === $sClassName)
			{
				$mResult = \array_merge($this->objectData($mResponse, $sParent, $aParameters), array(
					/* @var $mResponse \RainLoop\Providers\PersonalAddressBook\Classes\Property */
					'IdProperty' => $mResponse->IdProperty,
					'Type' => $mResponse->Type,
					'TypeCustom' => $mResponse->TypeCustom,
					'Value' => \MailSo\Base\Utils::Utf8Clear($mResponse->Value),
					'ValueCustom' => \MailSo\Base\Utils::Utf8Clear($mResponse->ValueCustom)
				));
			}
			else if ('MailSo\Mail\Attachment' === $sClassName)
			{
				$oAccount = $this->getAccountFromToken(false);

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
					'MimeIndex' => (string) $mResponse->MimeIndex(),
					'MimeType' => $mResponse->MimeType(),
					'FileName' => $mResponse->FileName(true),
					'EstimatedSize' => $mResponse->EstimatedSize(),
					'CID' => $mResponse->Cid(),
					'ContentLocation' => $mResponse->ContentLocation(),
					'IsInline' => $mResponse->IsInline(),
					'IsLinked' => ($mFoundedCIDs && \in_array(\trim(\trim($mResponse->Cid()), '<>'), $mFoundedCIDs)) ||
						($mFoundedContentLocationUrls && \in_array(\trim($mResponse->ContentLocation()), $mFoundedContentLocationUrls))
				));

				$mResult['Download'] = \RainLoop\Utils::EncodeKeyValues(array(
					'V' => APP_VERSION,
					'Account' => $oAccount ? \md5($oAccount->Hash()) : '',
					'Folder' => $mResult['Folder'],
					'Uid' => $mResult['Uid'],
					'MimeIndex' => $mResult['MimeIndex'],
					'MimeType' => $mResult['MimeType'],
					'FileName' => $mResult['FileName']
				));
			}
			else if ('MailSo\Mail\Folder' === $sClassName)
			{
				$aExtended = null;
				$mStatus = $mResponse->Status();
				if (\is_array($mStatus) && isset($mStatus['MESSAGES'], $mStatus['UNSEEN'], $mStatus['UIDNEXT']))
				{
					$aExtended = array(
						'MessageCount' => (int) $mStatus['MESSAGES'],
						'MessageUnseenCount' => (int) $mStatus['UNSEEN'],
						'UidNext' => (string) $mStatus['UIDNEXT'],
						'Hash' => \MailSo\Mail\MailClient::GenerateHash(
							$mResponse->FullNameRaw(), $mStatus['MESSAGES'], $mStatus['UNSEEN'], $mStatus['UIDNEXT'])
					);
				}

				$mResult = \array_merge($this->objectData($mResponse, $sParent, $aParameters), array(
					'Name' => $mResponse->Name(),
					'FullName' => $mResponse->FullName(),
					'FullNameRaw' => $mResponse->FullNameRaw(),
					'FullNameHash' => $this->hashFolderFullName($mResponse->FullNameRaw(), $mResponse->FullName()),
					'Delimiter' => (string) $mResponse->Delimiter(),
					'HasVisibleSubFolders' => $mResponse->HasVisibleSubFolders(),
					'IsSubscribed' => $mResponse->IsSubscribed(),
					'IsExisten' => $mResponse->IsExisten(),
					'IsSelectable' => $mResponse->IsSelectable(),
					'Flags' => $mResponse->FlagsLowerCase(),
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
					'NewMessages' => $this->responseObject($mResponse->NewMessages),
					'LastCollapsedThreadUids' => $mResponse->LastCollapsedThreadUids,
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
					'SystemFolders' => isset($mResponse->SystemFolders) && \is_array($mResponse->SystemFolders) ? $mResponse->SystemFolders : array()
				));
			}
			else if ($mResponse instanceof \MailSo\Base\Collection)
			{
				$aList =& $mResponse->GetAsArray();
				if (100 < \count($aList) && $mResponse instanceof \MailSo\Mime\EmailCollection)
				{
					$aList = \array_slice($aList, 0, 100);
				}
				
				$mResult = $this->responseObject($aList, $sParent, $aParameters);
				$bHook = false;
			}
			else
			{
				$mResult = '['.\get_class($mResponse).']';
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

		unset($mResponse);
		return $mResult;
	}
}
