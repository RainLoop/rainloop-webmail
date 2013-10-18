<?php

namespace RainLoop;

use RainLoop\Providers\Storage\Enumerations\StorageType;
use RainLoop\Providers\Storage\Enumerations\UploadError;
use RainLoop\Providers\Storage\Enumerations\UploadClientError;

define('RL_CONTACTS_PER_PAGE', 30);
define('RL_CONTACTS_MAX', 300);

class Actions
{
	const AUTH_TOKEN_KEY = 'rlauth';
	const AUTH_SIGN_ME_TOKEN_KEY = 'rlsmauth';
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
	 * @var \MailSo\Cache\CacheClient
	 */
	private $oCacherFile;

	/**
	 * @var \RainLoop\Providers\Storage
	 */
	private $oStorageProvider;

	/**
	 * @var \RainLoop\Providers\Domain
	 */
	private $oDomainProvider;

	/**
	 * @var \RainLoop\Providers\Settings
	 */
	private $oSettingsProvider;

	/**
	 * @var \RainLoop\Providers\Login
	 */
	private $oLoginProvider;

	/**
	 * @var \RainLoop\Providers\Contacts
	 */
	private $oContactsProvider;

	/**
	 * @var \RainLoop\Providers\Suggestions
	 */
	private $oSuggestionsProvider;

	/**
	 * @var \RainLoop\Providers\ChangePassword
	 */
	private $oChangePasswordProvider;

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
		$this->oCacherFile = null;

		$this->oStorageProvider = null;
		$this->oSettingsProvider = null;
		$this->oDomainProvider = null;
		$this->oLoginProvider = null;
		$this->oSuggestionsProvider = null;
		$this->oChangePasswordProvider = null;

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
	 *
	 * @return mixed
	 */
	private function fabrica($sName)
	{
		$oResult = null;
		$this->Plugins()->RunHook('main.fabrica', array($sName, &$oResult), false);

		if (null === $oResult)
		{
			switch ($sName)
			{
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
					$oResult = new \RainLoop\Providers\Domain\DefaultDomain(APP_PRIVATE_DATA.'domains');
					break;
				case 'contacts':
					// \RainLoop\Providers\Contacts\ContactsInterface
					$oResult = new \RainLoop\Providers\Contacts\DefaultContacts($this->Logger());
					break;
				case 'suggestions':
					// \RainLoop\Providers\Suggestions\SuggestionsInterface
					break;
				case 'change-password':
					// \RainLoop\Providers\ChangePassword\ChangePasswordInterface
					break;
			}
		}

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
				$sFileName = \str_replace('{user:email}', \strtolower($oAccount->Email()), $sFileName);
				$sFileName = \str_replace('{user:login}', $oAccount->Login(), $sFileName);
				$sFileName = \str_replace('{user:domain}', \strtolower($oAccount->Domain()->Name()), $sFileName);
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

	private function generateSpecAuthKey()
	{
		return 'Account/SpecAuthToken/'.$this->GetSpecAuthToken().'/'.\RainLoop\Utils::GetConnectionToken().'/'.self::AUTH_TOKEN_KEY.'/';
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param bool $bRandomToken = false
	 * 
	 * @return void
	 */
	public function SetAuthToken($oAccount, $bRandomToken = false)
	{
		if ($oAccount)
		{
			$sSpecAuthToken = '_'.\md5(APP_SALT.\RainLoop\Utils::GetConnectionToken().$oAccount->Email().
				($bRandomToken ? microtime(true).rand(1000, 9999) : '').APP_SALT);

			$this->SetSpecAuthToken($sSpecAuthToken);
			$this->CacherFile()->Set($this->generateSpecAuthKey(), $oAccount->GetAuthToken());

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
		return $this->CacherFile()->Get($this->generateSpecAuthKey());
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
	public function ClearAuthToken()
	{
		$this->CacherFile()->Delete($this->generateSpecAuthKey());
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
	 * @return \RainLoop\Providers\Contacts
	 */
	public function ContactsProvider()
	{
		if (null === $this->oContactsProvider)
		{
			$this->oContactsProvider = new \RainLoop\Providers\Contacts(
				$this->Config()->Get('labs', 'allow_contacts', true) ?
					$this->fabrica('contacts') : null);
		}

		return $this->oContactsProvider;
	}

	/**
	 * @return \RainLoop\Providers\Login
	 */
	public function LoginProvider()
	{
		if (null === $this->oLoginProvider)
		{
			$this->oLoginProvider = new \RainLoop\Providers\Login(
				$this->fabrica('login'), $this->DomainProvider());
		}

		return $this->oLoginProvider;
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
	public function CacherFile()
	{
		if (null === $this->oCacherFile)
		{
			$this->oCacherFile = \MailSo\Cache\CacheClient::NewInstance();
			$this->oCacherFile->SetDriver(\MailSo\Cache\Drivers\File::NewInstance(APP_PRIVATE_DATA.'cache'));
			$this->oCacherFile->SetCacheIndex($this->Config()->Get('cache', 'index', ''));
		}

		return $this->oCacherFile;
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
					@mkdir($sLogFileDir, 0777, true);
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
					$oHttp->GetMethod().': '.$oHttp->GetHost().$oHttp->GetServer('REQUEST_URI', ''),
					\MailSo\Log\Enumerations\Type::NOTE, 'REQUEST');
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

		return $bResult;
	}

	/**
	 * @param string $sToken
	 * @param bool $bThrowExceptionOnFalse = true
	 *
	 * @return \RainLoop\Account|bool
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function GetAccountFromCustomToken($sToken, $bThrowExceptionOnFalse = true)
	{
		$oResult = false;
		if (!empty($sToken))
		{
			$aAccountHash = \RainLoop\Utils::DecodeKeyValues($sToken);
			if (!empty($aAccountHash[0]) && 'token' === $aAccountHash[0] && 8 === \count($aAccountHash))
			{
				$oAccount = $this->LoginProvider()->Provide(
					$aAccountHash[1], $aAccountHash[2], $aAccountHash[3], empty($aAccountHash[5]) ? '' : $aAccountHash[5]);

				if ($oAccount instanceof \RainLoop\Account)
				{
					$this->Logger()->AddSecret($oAccount->Password());
					
					$oAccount->SetParentEmail($aAccountHash[6]);
					$oResult = $oAccount;
				}
				else
				{
					$oDomain = $this->DomainProvider()->Load(\MailSo\Base\Utils::GetDomainFromEmail($aAccountHash[1]));
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
		$oConfig = $this->Config();

		$aResult = array(
			'Version' => APP_VERSION,
			'Auth' => false,
			'AccountHash' => '',
			'AuthAccountHash' => '',
			'Email' => '',
			'Title' => $oConfig->Get('webmail', 'title', ''),
			'Token' => $oConfig->Get('security', 'csrf_protection', false) ? \RainLoop\Utils::GetCsrfToken() : '',
			'InIframe' => $oConfig->Get('labs', 'in_iframe', false),
			'CustomLoginLink' => $oConfig->Get('labs', 'custom_login_link', ''),
			'CustomLogoutLink' => $oConfig->Get('labs', 'custom_logout_link', ''),
			'AllowAdditionalAccounts' => !!$oConfig->Get('webmail', 'allow_additional_accounts', true),
			'AllowCustomTheme' => !!$oConfig->Get('webmail', 'allow_custom_theme', true),
			'SuggestionsLimit' => $oConfig->Get('labs', 'suggestions_limit', 50),
			'RemoteChangePassword' => false,
			'ContactsIsSupported' => (bool) $this->ContactsProvider()->IsSupported(),
			'ContactsIsAllowed' => (bool) $this->ContactsProvider()->IsActive(),
			'JsHash' => \md5(\RainLoop\Utils::GetConnectionToken()),
			'UseImapThread' => (bool) $oConfig->Get('labs', 'use_imap_thread', false),
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
				$aResult['Email'] = $oAccount->Email();
				$aResult['Login'] = $oAccount->Login();
				$aResult['Auth'] = true;
				$aResult['AccountHash'] = $oAccount->Hash();
				$aResult['RemoteChangePassword'] = $this->ChangePasswordProvider()->PasswordChangePossibility($oAccount);

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
			$aResult['AdminLogin'] = $oConfig->Get('security', 'admin_login', '');
			$aResult['AdminDomain'] = APP_SITE;
			$aResult['UseTokenProtection'] = (bool) $oConfig->Get('security', 'csrf_protection', true);
			$aResult['UsageStatistics'] = (bool) $oConfig->Get('labs', 'usage_statistics', true);
			$aResult['EnabledPlugins'] = (bool) $oConfig->Get('plugins', 'enable', false);

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
		}

		$aResult['ProjectHash'] = \md5($aResult['AccountHash'].APP_VERSION.$this->Plugins()->Hash());

		$sLanguage = $oConfig->Get('webmail', 'language', 'en');
		$sTheme = $oConfig->Get('webmail', 'theme', 'Default');

//		$aResult['Domains'] = $this->DomainProvider()->GetList(1);
		$aResult['Themes'] = $this->GetThemes($bAdmin);
		$aResult['Languages'] = $this->GetLanguages();
		$aResult['AllowCustomLogin'] = (bool) $oConfig->Get('login', 'allow_custom_login', false);
		$aResult['AttachmentLimit'] = ((int) $oConfig->Get('webmail', 'attachment_size_limit', 10)) * 1024 * 1024;
		$aResult['SignMe'] = (string) $oConfig->Get('login', 'sign-me', \RainLoop\Enumerations\SignMeType::DEFAILT_OFF);

		// user
		$aResult['EditorDefaultType'] = (string) $oConfig->Get('webmail', 'editor_default_type', '');
		$aResult['ShowImages'] = (bool) $oConfig->Get('webmail', 'show_images', false);
		$aResult['IgnoreFolderSubscribe'] = (bool) $oConfig->Get('labs', 'ignore_folders_subscription', false);
		$aResult['MPP'] = (int) $oConfig->Get('webmail', 'messages_per_page', 25);
		$aResult['DesktopNotifications'] = false;
		$aResult['ShowAnimation'] = true;
		$aResult['UseThreads'] = false;
		$aResult['ReplySameFolder'] = false;
		$aResult['UsePreviewPane'] = true;
		$aResult['UseCheckboxesInList'] = true;
		$aResult['DisplayName'] = '';
		$aResult['ReplyTo'] = '';
		$aResult['Signature'] = '';
		$aResult['ParentEmail'] = '';
		$aResult['CustomThemeType'] = \RainLoop\Enumerations\CustomThemeType::LIGHT;
		$aResult['CustomThemeImg'] = '';
		
		if (!$bAdmin && $oSettings instanceof \RainLoop\Settings)
		{
			$sLanguage = $oSettings->GetConf('Language', $sLanguage);
			$sTheme = $oSettings->GetConf('Theme', $sTheme);

			$aResult['SentFolder'] = $oSettings->GetConf('SentFolder', '');
			$aResult['DraftFolder'] = $oSettings->GetConf('DraftFolder', '');
			$aResult['SpamFolder'] = $oSettings->GetConf('SpamFolder', '');
			$aResult['TrashFolder'] = $oSettings->GetConf('TrashFolder', '');
			$aResult['EditorDefaultType'] = $oSettings->GetConf('EditorDefaultType', $aResult['EditorDefaultType']);
			$aResult['ShowImages'] = (bool) $oSettings->GetConf('ShowImages', $aResult['ShowImages']);
			$aResult['MPP'] = (int) $oSettings->GetConf('MPP', $aResult['MPP']);
			$aResult['DesktopNotifications'] = (bool) $oSettings->GetConf('DesktopNotifications', $aResult['DesktopNotifications']);
			$aResult['ShowAnimation'] = (bool) $oSettings->GetConf('ShowAnimation', $aResult['ShowAnimation']);
			$aResult['UseThreads'] = (bool) $oSettings->GetConf('UseThreads', $aResult['UseThreads']);
			$aResult['ReplySameFolder'] = (bool) $oSettings->GetConf('ReplySameFolder', $aResult['ReplySameFolder']);
			$aResult['UsePreviewPane'] = (bool) $oSettings->GetConf('UsePreviewPane', $aResult['UsePreviewPane']);
			$aResult['UseCheckboxesInList'] = (bool) $oSettings->GetConf('UseCheckboxesInList', $aResult['UseCheckboxesInList']);
			$aResult['CustomThemeType'] = (string) $oSettings->GetConf('CustomThemeType', $aResult['CustomThemeType']);
			$aResult['CustomThemeImg'] = (string) $oSettings->GetConf('CustomThemeImg', $aResult['CustomThemeImg']);

			$aResult['DisplayName'] = $oSettings->GetConf('DisplayName', $aResult['DisplayName']);
			$aResult['ReplyTo'] = $oSettings->GetConf('ReplyTo', $aResult['ReplyTo']);
			$aResult['Signature'] = $oSettings->GetConf('Signature', $aResult['Signature']);

			$aResult['ParentEmail'] = $oAccount->ParentEmail();
		}
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

		$aResult['Theme'] = $this->ValidateTheme($sTheme);
		$aResult['Language'] = $this->ValidateLanguage($sLanguage);
		$aResult['PluginsLink'] = './?/Plugins/0/'.
			($bAdmin ? 'Admin' : 'User').'/'.$sStaticCache.'/';
		$aResult['NewThemeLink'] = './?/Css/0/'.
			($bAdmin ? 'Admin' : 'User').'/-/'.($bAdmin ? 'Default' : $aResult['Theme']).'/-/'.$sStaticCache.'/';
		$aResult['LangLink'] = './?/Lang/0/'.
			($bAdmin ? 'en' : $aResult['Language']).'/'.$sStaticCache.'/';
		$aResult['EditorDefaultType'] = 'Html' === $aResult['EditorDefaultType'] ? 'Html' : 'Plain';

		$this->Plugins()->InitAppData($bAdmin, $aResult);

		return $aResult;
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
	 * @param bool $bRandomToken = false
	 */
	public function AuthProcess($oAccount, $bRandomToken = false)
	{
		$this->SetAuthToken($oAccount, $bRandomToken);

		if ($oAccount instanceof \RainLoop\Account)
		{
			$aAccounts = $this->GetAccounts($oAccount);
			if (isset($aAccounts[$oAccount->Email()]))
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
	 *
	 * @return \RainLoop\Account
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function LoginProcess($sEmail, $sLogin, $sPassword, $sSignMeToken = '')
	{
		$sSpecAuthToken = '_'.\md5(APP_SALT.\RainLoop\Utils::GetConnectionToken().$sEmail.APP_SALT);
		$this->SetSpecAuthToken($sSpecAuthToken);

		$this->Plugins()->RunHook('filter.login-params', array(&$sEmail, &$sLogin, &$sPassword));

		$oAccount = $this->LoginProvider()->Provide($sEmail, $sLogin, $sPassword, $sSignMeToken);
		if (!($oAccount instanceof \RainLoop\Account))
		{
			$this->loginErrorDelay();

			$oDomain = $this->DomainProvider()->Load(\MailSo\Base\Utils::GetDomainFromEmail($sEmail));
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

		try
		{
			$this->MailClient()
				->Connect($oAccount->Domain()->IncHost(), $oAccount->Domain()->IncPort(), $oAccount->Domain()->IncSecure())
				->Login($oAccount->Login(), $oAccount->Password())
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
		$sEmail = trim($this->GetActionParam('Email', ''));
		$sLogin = trim($this->GetActionParam('Login', ''));
		$sPassword = $this->GetActionParam('Password', '');
		$bSignMe = '1' === $this->GetActionParam('SignMe', '0');

		if (!$this->Config()->Get('login', 'allow_custom_login', false) || 0 === strlen($sLogin))
		{
			$sLogin = $sEmail;
		}

		$sSignMeToken = '';
		if ($bSignMe)
		{
			$sSignMeToken = \md5(\microtime(true).APP_SALT.\rand(10000, 99999).$sEmail);
		}

		$this->Logger()->AddSecret($sPassword);

		$oAccount = $this->LoginProcess($sEmail, $sLogin, $sPassword, $sSignMeToken);
		$this->AuthProcess($oAccount);

		return $this->TrueResponse(__FUNCTION__);
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * 
	 * @return array
	 */
	public function GetAccounts($oAccount)
	{
		$sParentEmail = 0 < \strlen($oAccount->ParentEmail()) ? $oAccount->ParentEmail() : $oAccount->Email();

		$sAccounts = $this->StorageProvider()->Get(null, \RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
			'Webmail/Accounts/'.$sParentEmail.'/Array', null);

		$aAccounts = $sAccounts ? @\unserialize($sAccounts) : array();

		if (\is_array($aAccounts) && 0 < \count($aAccounts))
		{
			return $aAccounts;
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
	 * @param array $aAccounts = array()
	 *
	 * @return array
	 */
	public function SetAccounts($oAccount, $aAccounts = array())
	{
		$sParentEmail = 0 < \strlen($oAccount->ParentEmail()) ? $oAccount->ParentEmail() : $oAccount->Email();
		if (!\is_array($aAccounts) || 0 === \count($aAccounts))
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
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoAccountAdd()
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->Config()->Get('webmail', 'allow_additional_accounts', true))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$sEmail = \trim($this->GetActionParam('Email', ''));
		$sLogin = \trim($this->GetActionParam('Login', ''));
		$sPassword = $this->GetActionParam('Password', '');

		if (!$this->Config()->Get('login', 'allow_custom_login', false) || 0 === strlen($sLogin))
		{
			$sLogin = $sEmail;
		}

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
		$oAccount = $this->getAccountFromToken();

		if (!$this->Config()->Get('webmail', 'allow_additional_accounts', true))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$sParentEmail = 0 < \strlen($oAccount->ParentEmail()) ? $oAccount->ParentEmail() : $oAccount->Email();
		$sEmailToDelete = \strtolower(\trim($this->GetActionParam('EmailToDelete', '')));

		$aAccounts = $this->GetAccounts($oAccount);

		if (0 < \strlen($sEmailToDelete) && $sEmailToDelete !== $sParentEmail && \is_array($aAccounts) && isset($aAccounts[$sEmailToDelete]))
		{
			unset($aAccounts[$sEmailToDelete]);

			if (1 === count($aAccounts) && isset($aAccounts[$sParentEmail]))
			{
				$aAccounts = array();
			}

			$this->SetAccounts($oAccount, $aAccounts);
			return $this->TrueResponse(__FUNCTION__);
		}
		
		return $this->FalseResponse(__FUNCTION__);
	}
	
	/**
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoAccounts()
	{
		$oAccount = $this->getAccountFromToken();

		if ($this->Config()->Get('webmail', 'allow_additional_accounts', true))
		{
			$aAccounts = $this->GetAccounts($oAccount);
			$aAccounts = \array_keys($aAccounts);

			return $this->DefaultResponse(__FUNCTION__, $aAccounts);
		}

		return $this->FalseResponse(__FUNCTION__);
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

		$this->ClearAuthToken();

		return $this->TrueResponse(__FUNCTION__);
	}

	/**
	 * @return array
	 */
	public function DoAppDelayStart()
	{
//		$oAccount = $this->getAccountFromToken();

		\RainLoop\Utils::UpdateConnectionToken();

		$bUserCache = false;
		$bMainCache = false;

		if ($this->CacherFile()->IsInited())
		{
			$iTime = $this->CacherFile()->GetTimer('Cache/LastMainCache');
			if (0 === $iTime || $iTime + 60 * 60 * 24 < \time())
			{
				if ($this->CacherFile()->SetTimer('Cache/LastMainCache'))
				{
					$bUserCache = true;
				}
			}

			if ($this->Config()->Get('labs', 'usage_statistics', true))
			{
				$iTime = $this->CacherFile()->GetTimer('Statistic/Activity') ;
				if (0 === $iTime || $iTime + 60 * 60 * 24 < \time())
				{
					if ($this->CacherFile()->SetTimer('Statistic/Activity'))
					{
						$this->KeenIO('Statistic', array(
							'rainloop' => $this->setupInformation()
						));
					}
				}
			}

			$iTime = $this->CacherFile()->GetTimer('Cache/LastUserCache');
			if (0 === $iTime || $iTime + 60 * 60 * 24 < \time())
			{
				if ($this->CacherFile()->SetTimer('Cache/LastUserCache'))
				{
					$bMainCache = true;
				}
			}
		}

		$mData = array(
			'Version' => APP_VERSION,
			'Debug' => !!$this->Config()->Get('debug', 'enable', false),
			'UserCache' => $bUserCache ? $this->StorageProvider()->GC(48) : false,
			'MainCache' => $bMainCache ? $this->CacherFile()->GC(48) : false
		);

		$mData = true;
		return $this->DefaultResponse(__FUNCTION__, $mData);
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
		$oSettings->SetConf('TrashFolder', $this->GetActionParam('TrashFolder', ''));
		$oSettings->SetConf('SpamFolder', $this->GetActionParam('SpamFolder', ''));

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
		$this->IsAdminLoggined();

		$oConfig = $this->Config();

		$self = $this;

		$this->setConfigFromParams($oConfig, 'Language', 'webmail', 'language', 'string', function ($sLanguage) use ($self) {
			return $self->ValidateLanguage($sLanguage);
		});

		$this->setConfigFromParams($oConfig, 'Theme', 'webmail', 'theme', 'string', function ($sTheme) use ($self) {
			return $self->ValidateTheme($sTheme);
		});

		$this->setConfigFromParams($oConfig, 'AllowCustomTheme', 'webmail', 'allow_custom_theme', 'bool');
		$this->setConfigFromParams($oConfig, 'AllowAdditionalAccounts', 'webmail', 'allow_additional_accounts', 'bool');

		$this->setConfigFromParams($oConfig, 'Title', 'webmail', 'title', 'string');
		$this->setConfigFromParams($oConfig, 'TokenProtection', 'security', 'csrf_protection', 'bool');
		$this->setConfigFromParams($oConfig, 'UsageStatistics', 'labs', 'usage_statistics', 'bool');
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
					'RainLoop',	$sContentType, $iCode, $this->Logger());

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
				'RainLoop',	$sContentType, $iCode, $this->Logger());

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
		return @file_exists(APP_INDEX_ROOT_PATH.'index.php') && @is_writable(APP_INDEX_ROOT_PATH.'index.php');
	}

	private function rainLoopCoreAccess()
	{
		return $this->Http()->CheckLocalhost(APP_SITE) || APP_SITE === APP_CORE_INSTALL_ACCESS_SITE;
	}

	private function getRepositoryDataByUrl($sRepo, &$bReal = false)
	{
		$bReal = false;
		$aRep = null;

		$sRep = '';
		$iRepTime = 0;

		$oHttp = \MailSo\Base\Http::SingletonInstance();

		$sCacheKey = 'UPDATER/('.$sRepo.')/repository.json';
		$sRep = $this->Cacher()->Get($sCacheKey);
		if ('' !== $sRep)
		{
			$iRepTime = $this->Cacher()->GetTimer($sCacheKey);
		}

		if ('' === $sRep || 0 === $iRepTime || time() - 3600 > $iRepTime)
		{
			$iCode = 0;
			$sContentType = '';
			
			$sRepPath = $sRepo.'repository.json';
			$sRep = '' !== $sRepo ? $oHttp->GetUrlAsString($sRepPath, 'RainLoop', $sContentType, $iCode, $this->Logger()) : false;
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
			$aAddData = $this->getRepositoryDataByUrl($sAddRepo);
			if (\is_array($aAddData) && 0 < \count($aAddData))
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

			if (!$bRainLoopUpdatable && 'plugin' !== $aItem['type'])
			{
				$aItem['canBeUpdated'] = false;
				$aItem['compare'] = false;
			}
		}

//		if (!$bReal)
//		{
//			$iTime = $this->CacherFile()->GetTimer('Statistic/PackagesRepositoryUnreal') ;
//			if (0 === $iTime || $iTime + 60 * 60 * 24 < \time())
//			{
//				$this->CacherFile()->SetTimer('Statistic/PackagesRepositoryUnreal');
//				$this->KeenIO('PackagesRepositoryUnreal');
//			}
//		}

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
			$pSrc = @fopen($sUrl, 'rb');
			if ($pSrc)
			{
				$sTmp = APP_PRIVATE_DATA.md5(microtime(true).$sRealFile).'.zip';
				$pDest = @fopen($sTmp, 'w+b');
				if ($pDest)
				{
					$iCopy = stream_copy_to_stream($pSrc, $pDest);
					
					$bResult = is_int($iCopy) && 0 < $iCopy;

					if (!$bResult)
					{
						$this->Logger()->Write('Cannot copy remote stream to local: '.$pDest, \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
					}

					@fclose($pDest);
				}
				else
				{
					$this->Logger()->Write('Cannot create temp file: '.$pDest, \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
				}
				
				@fclose($pSrc);
			}
			else
			{
				$this->Logger()->Write('Can not open remote file: '.$sUrl, \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
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

				mkdir($sTmpFolder);
				if (is_dir($sTmpFolder))
				{
					$bResult = 0 !== $oArchive->extract(PCLZIP_OPT_PATH, $sTmpFolder);
					if (!$bResult)
					{
						$this->Logger()->Write('Cannot extract package files: '.$oArchive->errorInfo(), \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
					}

					if ($bResult && file_exists($sTmpFolder.'/index.php') &&
						is_writable(APP_INDEX_ROOT_PATH.'rainloop/') &&
						file_exists($sTmpFolder.'/data/VERSION') &&
						is_dir($sTmpFolder.'/rainloop/'))
					{
						\MailSo\Base\Utils::CopyDir($sTmpFolder.'/rainloop/', APP_INDEX_ROOT_PATH.'rainloop/');
						
						copy($sTmpFolder.'/data/VERSION', APP_DATA_FOLDER_PATH.'VERSION');
						copy($sTmpFolder.'/index.php', APP_INDEX_ROOT_PATH.'index.php');

						$bResult = true;
					}
					else if ($bResult)
					{
						$this->Logger()->Write('Cannot validate package files', \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
					}

					\MailSo\Base\Utils::RecRmDir($sTmpFolder);
				}
			}
			else
			{
				$bResult = true;
				if (is_dir(APP_PLUGINS_PATH.$sId))
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
			
			@unlink($sTmp);
		}

//		$this->KeenIO('PackagesInstallation', array(
//			'type' => $sType,
//			'name' => $sId,
//			'file' => $sFile,
//			'repo-available' => $bReal ? 1 : 0,
//			'core-updatable' => $bRainLoopUpdatable ? 1 : 0,
//			'result' => $bResult ? 1 : 0
//		));

		return $this->DefaultResponse(__FUNCTION__, $bResult ? (
				'plugin' !== $sType ? array('Reload' => true) : true
			) : false);
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

		$this->setSettingsFromParams($oSettings, 'Language', 'string', function ($sLanguage) use ($self) {
			return $self->ValidateLanguage($sLanguage);
		});

		$this->setSettingsFromParams($oSettings, 'Theme', 'string', function ($sTheme) use ($self) {
			return $self->ValidateTheme($sTheme);
		});

		$this->setSettingsFromParams($oSettings, 'CustomThemeType', 'string', function ($sCustomThemeType) {
			return in_array($sCustomThemeType, array(
				\RainLoop\Enumerations\CustomThemeType::LIGHT, \RainLoop\Enumerations\CustomThemeType::DARK)) ?
					$sCustomThemeType : \RainLoop\Enumerations\CustomThemeType::LIGHT;
		});

		$this->setSettingsFromParams($oSettings, 'MPP', 'int', function ($iMpp) {
			return (int) (in_array($iMpp, array(10, 20, 30, 50, 100, 150, 200, 300)) ? $iMpp : 20);
		});

		$this->setSettingsFromParams($oSettings, 'EditorDefaultType', 'string');
		$this->setSettingsFromParams($oSettings, 'ShowImages', 'bool');
		$this->setSettingsFromParams($oSettings, 'ShowAnimation', 'bool');
		$this->setSettingsFromParams($oSettings, 'DesktopNotifications', 'bool');
		$this->setSettingsFromParams($oSettings, 'UseThreads', 'bool');
		$this->setSettingsFromParams($oSettings, 'ReplySameFolder', 'bool');

		$this->setSettingsFromParams($oSettings, 'UsePreviewPane', 'bool');
		$this->setSettingsFromParams($oSettings, 'UseCheckboxesInList', 'bool');

		$this->setSettingsFromParams($oSettings, 'DisplayName', 'string');
		$this->setSettingsFromParams($oSettings, 'ReplyTo', 'string');
		$this->setSettingsFromParams($oSettings, 'Signature', 'string');

		$this->setSettingsFromParams($oSettings, 'CustomThemeImg', 'string');
		
		if ('' === $oSettings->GetConf('CustomThemeImg', ''))
		{
			$this->StorageProvider()->Clear($oAccount, StorageType::USER, 'CustomThemeBackground');
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
	public function DoJsError()
	{
		$sMessage = $this->GetActionParam('Message', '');
		if (0 < strlen($sMessage))
		{
			$sFileName = $this->GetActionParam('FileName', '');
			$iLineNo = $this->GetActionParam('LineNo', '');
			$sLocation = $this->GetActionParam('Location', '');
			$sHtmlCapa = $this->GetActionParam('HtmlCapa', '');

			$oHttp = $this->Http();

			$this->Logger()->Write($sMessage.' ('.$sFileName.' ~ '.$iLineNo.')', \MailSo\Log\Enumerations\Type::ERROR, 'JS');
			$this->Logger()->WriteDump(array(
				'Location' => $sLocation,
				'Capability' => $sHtmlCapa,
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

	private function systemFoldersNames()
	{
		static $aCache = null;
		if (null === $aCache)
		{
			$aCache = array(
				'Sent' => \MailSo\Imap\Enumerations\FolderType::SENT,
				'Send' => \MailSo\Imap\Enumerations\FolderType::SENT,
				'Sent Items' => \MailSo\Imap\Enumerations\FolderType::SENT,
				'Send Items' => \MailSo\Imap\Enumerations\FolderType::SENT,
				'Sent Mail' => \MailSo\Imap\Enumerations\FolderType::SENT,
				'Drafts' => \MailSo\Imap\Enumerations\FolderType::DRAFTS,
				'Spam' => \MailSo\Imap\Enumerations\FolderType::SPAM,
				'Junk' => \MailSo\Imap\Enumerations\FolderType::SPAM,
				'Trash' => \MailSo\Imap\Enumerations\FolderType::TRASH,
				'Bin' => \MailSo\Imap\Enumerations\FolderType::TRASH
			);
		}

		return $aCache;
	}

	/**
	 * @param \MailSo\Mail\FolderCollection $oFolders
	 * @param array $aResult
	 */
	private function recFoldersTypes($oFolders, &$aResult, $bXList = true)
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
							\MailSo\Imap\Enumerations\FolderType::TRASH
						)))
						{
							$aResult[$iFolderXListType] = $oFolder->FullNameRaw();
						}

						$oSub = $oFolder->SubFolders();
						if ($oSub && 0 < $oSub->Count())
						{
							$this->recFoldersTypes($oSub, $aResult, true);
						}
					}
				}

				$aMap = $this->systemFoldersNames();
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
							\MailSo\Imap\Enumerations\FolderType::TRASH
						)))
						{
							$aResult[$iFolderType] = $oFolder->FullNameRaw();
						}
					}

					$oSub = $oFolder->SubFolders();
					if ($oSub && 0 < $oSub->Count())
					{
						$this->recFoldersTypes($oSub, $aResult, false);
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

		$this->initMailClientConnection();

		$oFolderCollection = $this->MailClient()->Folders('', '*', 
			!!$this->Config()->Get('labs', 'use_imap_list_status', false));

		if ($oFolderCollection instanceof \MailSo\Mail\FolderCollection)
		{
			$oFolderCollection->FoldersHash = \md5(\implode("\x0", $this->recFoldersNames($oFolderCollection)));

			$aSystemFolders = array();
			$this->recFoldersTypes($oFolderCollection, $aSystemFolders);
			$oFolderCollection->SystemFolders = $aSystemFolders;

			$this->cacheByKey($sRawKey);
		}

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

			$this->MailClient()->FolderCreate($sFolderNameInUtf, $sFolderParentFullNameRaw);
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
			$this->MailClient()->FolderRename($sPrevFolderFullNameRaw, $sNewTopFolderNameInUtf);
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
			$this->MailClient()->FolderDelete($sFolderFullNameRaw);
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
			$aFlagsUids = explode(',', (string) $this->GetActionParam('FlagsUids', ''));
			$aFlagsFilteredUids = array_filter($aFlagsUids, function (&$sUid) {
				$sUid = (int) trim($sUid);
				return 0 < (int) trim($sUid);
			});
		}

		$oAccount = $this->initMailClientConnection();

		$sForwardedFlag = $oAccount ? strtolower($oAccount->Domain()->ForwardFlag()) : '';

		try
		{
			$aInboxInformation = $this->MailClient()->FolderInformation($sFolder, $sPrevUidNext, $aFlagsFilteredUids);
			foreach ($aInboxInformation['Flags'] as $iUid => $aFlags)
			{
				$aLowerFlags = array_map('strtolower', $aFlags);
				$aInboxInformation['Flags'][$iUid] = array(
					'IsSeen' => in_array('\\seen', $aLowerFlags),
					'IsFlagged' => in_array('\\flagged', $aLowerFlags),
					'IsAnswered' => in_array('\\answered', $aLowerFlags),
					'IsForwarded' => 0 < strlen($sForwardedFlag) && in_array(strtolower($sForwardedFlag), $aLowerFlags)
				);
			}
		}
		catch (\Exception $oException)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::MailServerError, $oException);
		}

		return $this->DefaultResponse(__FUNCTION__, $aInboxInformation);
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
	 * @param string $sMessageID = ''
	 *
	 * @return \MailSo\Mime\Message
	 */
	private function buildMessage($oAccount, $bWithDraftInfo = true, $sMessageID = '')
	{
		$sTo = $this->GetActionParam('To', '');
		$sCc = $this->GetActionParam('Cc', '');
		$sBcc = $this->GetActionParam('Bcc', '');
		$sSubject = $this->GetActionParam('Subject', '');
		$bTextIsHtml = '1' === $this->GetActionParam('TextIsHtml', '0');
		$sText = $this->GetActionParam('Text', '');
		$aAttachments = $this->GetActionParam('Attachments', null);

		$aDraftInfo = $this->GetActionParam('DraftInfo', null);
		$sInReplyTo = $this->GetActionParam('InReplyTo', '');
		$sReferences = $this->GetActionParam('References', '');

		$oMessage = \MailSo\Mime\Message::NewInstance();
		if (empty($sMessageID))
		{
			$oMessage->RegenerateMessageId();
		}
		else
		{
			$oMessage->SetMessageId($sMessageID);
		}
		
		$oMessage->SetXMailer('RainLoop/'.APP_VERSION);

		$oSettings = $this->SettingsProvider()->Load($oAccount);
		$sDisplayName = \trim($oSettings->GetConf('DisplayName', ''));
		$sReplyTo = \trim($oSettings->GetConf('ReplyTo', ''));

		$oMessage
			->SetFrom(\MailSo\Mime\Email::NewInstance($oAccount->Email(), $sDisplayName))
			->SetSubject($sSubject)
		;

		if (!empty($sReplyTo))
		{
			$oReplyTo = \MailSo\Mime\EmailCollection::NewInstance($sReplyTo);
			if ($oReplyTo && $oReplyTo->Count())
			{
				$oMessage->SetReplyTo($oReplyTo);
			}
		}
		
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

		if ($bWithDraftInfo && is_array($aDraftInfo) && !empty($aDraftInfo[0]) && !empty($aDraftInfo[1]) && !empty($aDraftInfo[2]))
		{
			$oMessage->SetDraftInfo($aDraftInfo[0], $aDraftInfo[1], $aDraftInfo[2]);
		}

		if (0 < strlen($sInReplyTo))
		{
			$oMessage->SetInReplyTo($sInReplyTo);
		}

		if (0 < strlen($sReferences))
		{
			$oMessage->SetReferences($sReferences);
		}

		$aFoundedCids = array();
		$mFoundDataURL = array();
		$oMessage->AddText($bTextIsHtml ?
			\MailSo\Base\HtmlUtils::BuildHtml($sText, $aFoundedCids, $mFoundDataURL) : $sText, $bTextIsHtml);

		if (is_array($aAttachments))
		{
			foreach ($aAttachments as $sTempName => $aData)
			{
				$sFileName = (string) $aData[0];
				$bIsInline = (bool) $aData[1];
				$sCID = (string) $aData[2];

				$rResource = $this->StorageProvider()->GetFile($oAccount, StorageType::TEMP, $sTempName);
				if (is_resource($rResource))
				{
					$iFileSize = $this->StorageProvider()->FileSize($oAccount, StorageType::TEMP, $sTempName);

					$oMessage->Attachments()->Add(
						\MailSo\Mime\Attachment::NewInstance($rResource, $sFileName, $iFileSize, $bIsInline,
							in_array(trim(trim($sCID), '<>'), $aFoundedCids), $sCID)
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
		$sMessageID = $this->GetActionParam('MessageID', '');

		$sDraftFolder = $this->GetActionParam('DraftFolder', '');
		if (0 === strlen($sDraftFolder))
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::UnknownError);
		}

		$oMessage = $this->buildMessage($oAccount, true, $sMessageID);

		$this->Plugins()->RunHook('filter.save-message', array(&$oMessage));

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
						'NewUid' => $iNewUid,
						'NewID' => $sMessageId
					);
				}
			}
		}

		return $this->DefaultResponse(__FUNCTION__, $mResult);
	}

	/**
	 * @return array
	 */
	public function DoSendMessage()
	{
		$oAccount = $this->initMailClientConnection();

		$sDraftFolder = $this->GetActionParam('MessageFolder', '');
		$sDraftUid = $this->GetActionParam('MessageUid', '');
		$sMessageID = $this->GetActionParam('MessageID', '');
		$sSentFolder = $this->GetActionParam('SentFolder', '');
		$aDraftInfo = $this->GetActionParam('DraftInfo', null);

		$oMessage = $this->buildMessage($oAccount, false, $sMessageID);

		$this->Plugins()->RunHook('filter.send-message', array(&$oMessage));

		$mResult = false;
		try
		{
			if ($oMessage)
			{
				$rMessageStream = \MailSo\Base\ResourceRegistry::CreateMemoryResource();

				$iMessageStreamSize = \MailSo\Base\Utils::MultipleStreamWriter(
					$oMessage->ToStream(true), array($rMessageStream), 8192, true, true);

				if (false !== $iMessageStreamSize)
				{
					rewind($rMessageStream);

					$oRcpt = $oMessage->GetRcpt();
					if ($oRcpt && 0 < $oRcpt->Count())
					{
						try
						{
							$sHostName = \function_exists('gethostname') ? \gethostname() : 'localhost';

							$oSmtpClient = \MailSo\Smtp\SmtpClient::NewInstance()->SetLogger($this->Logger());

							$oSmtpClient->Connect($oAccount->Domain()->OutHost(), $oAccount->Domain()->OutPort(),
								$sHostName, $oAccount->Domain()->OutSecure());

							if ($oAccount->Domain()->OutAuth())
							{
								$oSmtpClient->Login($oAccount->Login(), $oAccount->Password());
							}

							$oSmtpClient->MailFrom($oAccount->Email());

							$aRcpt =& $oRcpt->GetAsArray();
							foreach ($aRcpt as /* @var $oEmail \MailSo\Mime\Email */ $oEmail)
							{
								$oSmtpClient->Rcpt($oEmail->GetEmail());
							}

							$oSmtpClient->DataWithStream($rMessageStream);

							$oSmtpClient->LogoutAndDisconnect();
						}
						catch (\MailSo\Net\Exceptions\ConnectionException $oException)
						{
							throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::ConnectionError, $oException);
						}
						catch (\MailSo\Smtp\Exceptions\LoginException $oException)
						{
							throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AuthError, $oException);
						}

						rewind($rMessageStream);

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
										$sForwardFlag = $oAccount->Domain()->ForwardFlag();
										if (0 < strlen($sForwardFlag))
										{
											$this->MailClient()->MessageSetFlag($sDraftInfoFolder, array($sDraftInfoUid), true,
												$sForwardFlag, true);
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
								$this->MailClient()->MessageAppendStream(
									$rMessageStream, $iMessageStreamSize, $sSentFolder, array(
										\MailSo\Imap\Enumerations\MessageFlag::SEEN
									));
							}
							catch (\Exception $oException)
							{
								throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CantSaveMessage, $oException);
							}
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
					else
					{
						throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::InvalidRecipients);
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

//		if ($oMessage && $this->ContactsProvider()->IsActive())
//		{
//			$oToCollection = $oMessage->GetTo();
//			$oTo = $oToCollection->GetByIndex(0);
//			if ($oTo)
//			{
//				$oContact = new \RainLoop\Providers\Contacts\Classes\Contact();
//				/* @var $oTo \MailSo\Mime\Email */
//				$oContact->Name = $oTo->GetDisplayName();
//
//				$i = 30;
//				while ($i > 0)
//				{
//					$i--;
//					$oContact->Emails = array('u'.$i.'-'.$oTo->GetEmail());
//					$this->ContactsProvider()->CreateContact($oAccount, $oContact);
//				}
//			}
//
//		}

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

	/**
	 * @return array
	 */
	public function DoContacts()
	{
		$oAccount = $this->getAccountFromToken();
		$sSearch = \trim($this->GetActionParam('Search', ''));

		$bMore = false;
		$mResult = false;
		if ($this->ContactsProvider()->IsActive())
		{
			$mResult = $this->ContactsProvider()->GetContacts($oAccount, 0, RL_CONTACTS_MAX + 1, $sSearch);
			if (is_array($mResult))
			{
				$bMore = RL_CONTACTS_MAX < \count($mResult);
				if ($bMore)
				{
					$mResult = \array_slice($mResult, 0, RL_CONTACTS_MAX);
				}
			}
		}

		return $this->DefaultResponse(__FUNCTION__, array(
			'Limit' => RL_CONTACTS_MAX,
			'More' => $bMore,
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
		if ($this->ContactsProvider()->IsActive())
		{
			$bResult = $this->ContactsProvider()->DeleteContacts($oAccount, $aFilteredUids);
		}

		return $this->DefaultResponse(__FUNCTION__, $bResult);
	}

	/**
	 * @return array
	 */
	public function DoContactSave()
	{
		sleep(1);
		$oAccount = $this->getAccountFromToken();

		$bResult = false;
		$sResultID = '';

		$sRequestUid = \trim($this->GetActionParam('RequestUid', ''));
		if ($this->ContactsProvider()->IsActive() && 0 < \strlen($sRequestUid))
		{
			$sUid = \trim($this->GetActionParam('Uid', ''));
			$sName = \trim($this->GetActionParam('Name', ''));
			$sEmail = \trim($this->GetActionParam('Email', ''));

			$sImageData = \trim($this->GetActionParam('ImageData', ''));

			$oContact = null;
			if (0 < \strlen($sUid))
			{
				if (\is_numeric($sUid))
				{
					$oContact = $this->ContactsProvider()->GetContactById($oAccount, (int) $sUid);
				}
			}
			else
			{
				$oContact = new \RainLoop\Providers\Contacts\Classes\Contact();
			}

			if ($oContact)
			{
				$oContact->Name = $sName;
				$oContact->Emails = array($sEmail);

				if (0 < \strlen($sImageData) && 'data:image/' === substr($sImageData, 0, 11))
				{
					$oContact->ImageHash = \md5($sImageData);
				}

				if (0 < $oContact->IdContact)
				{
					$bResult = $this->ContactsProvider()->UpdateContact($oAccount, $oContact);
				}
				else
				{
					$bResult = $this->ContactsProvider()->CreateContact($oAccount, $oContact);
				}

				if ($bResult && 0 < $oContact->IdContact)
				{
					$sResultID = $oContact->IdContact;
					$aMatches = array();
					if ($bResult && $oContact && 0 < $oContact->IdContact && 0 < \strlen($oContact->ImageHash) &&
						0 < \strlen($sImageData) &&
						\preg_match('/^data:(image\/(jpeg|jpg|png|bmp));base64,(.+)$/i', $sImageData, $aMatches) &&
						!empty($aMatches[1]) && !empty($aMatches[3]))
					{
						$this->StorageProvider()->Put($oAccount, StorageType::USER,
							'contacts/'.$oContact->ImageHash, $aMatches[1].'|||'.$aMatches[3]);
					}
				}
				else
				{
					$bResult = false;
				}
			}
		}

		return $this->DefaultResponse(__FUNCTION__, array(
			'RequestUid' => $sRequestUid,
			'ResultID' => $sResultID,
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
		$iPage = (int) $this->GetActionParam('Page', 0);

		$bMore = false;
		$aResult = array();
		if (0 < \strlen($sQuery) && 0 < $iPage && $this->ContactsProvider()->IsActive())
		{
			$mResult = $this->ContactsProvider()->GetContacts($oAccount, ($iPage - 1) * RL_CONTACTS_PER_PAGE, RL_CONTACTS_PER_PAGE + 1, $sQuery);
			if (\is_array($mResult) && 0 < \count($mResult))
			{
				$bMore = RL_CONTACTS_PER_PAGE < \count($mResult);
				if ($bMore)
				{
					$mResult = \array_slice($mResult, 0, RL_CONTACTS_PER_PAGE);
				}

				foreach ($mResult as $oItem)
				{
					/* @var $oItem \RainLoop\Providers\Contacts\Classes\Contact */
					$aEmails = $oItem->Emails;
					if (0 < \count($aEmails))
					{
						foreach ($aEmails as $sEmail)
						{
							if (0 < \strlen($sEmail))
							{
								$aResult[] = array($sEmail, $oItem->Name);
							}
						}
					}
				}
			}
		}

		return $this->DefaultResponse(__FUNCTION__, array(
			'More' => $bMore,
			'List' => $aResult
		));
		
		$oAccount = $this->getAccountFromToken();

		$aResult = array();
		$sQuery = \trim($this->GetActionParam('Query', ''));
		if (0 < \strlen($sQuery) && $oAccount)
		{
			$aResult = $this->SuggestionsProvider()->Process($oAccount, $sQuery);

			if (0 === count($aResult) && false !== \strpos(strtolower($oAccount->Email()), \strtolower($sQuery)))
			{
				$aResult[] = array($oAccount->Email(), $oAccount->Name());
			}
		}

		return $this->DefaultResponse(__FUNCTION__, $aResult);
	}

	/**
	 * @return array
	 */
	public function DoEmailsPicsHashes()
	{
		$oAccount = $this->getAccountFromToken();
		
		$aResult = array();
		if ($this->ContactsProvider()->IsActive())
		{
			$mResult = $this->ContactsProvider()->GetContactsImageHashes($oAccount);
			if (\is_array($mResult) && 0 < \count($mResult))
			{
				$aResult = $mResult;
			}
		}

		return $this->DefaultResponse(__FUNCTION__, $aResult);
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
		$aUids = explode(',', (string) $this->GetActionParam('Uids', ''));
		$aFilteredUids = array_filter($aUids, function (&$sUid) {
			$sUid = (int) trim($sUid);
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

		$this->initMailClientConnection();

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
			$this->Plugins()->RunHook('filter.result-message', array(&$oMessage));

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
						if (!$this->StorageProvider()->FileExists($oAccount, StorageType::TEMP, $sTempName))
						{
							$this->MailClient()->MessageMimeStream(
								function($rResource, $sContentType, $sFileName, $sMimeIndex = '') use ($oAccount, &$mResult, $sTempName, $sAttachment, $self) {
									if (is_resource($rResource))
									{
										$sContentType = (empty($sFileName)) ? 'text/plain' : \MailSo\Base\Utils::MimeContentType($sFileName);
										$sFileName = $self->MainClearFileName($sFileName, $sContentType, $sMimeIndex);

										if ($self->StorageProvider()->PutFile($oAccount, StorageType::TEMP, $sTempName, $rResource))
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

				$rFile = $this->StorageProvider()->GetFile($oAccount, StorageType::TEMP, $sTempName, 'wb+');
				if ($rFile && $oHttp->SaveUrlToFile($sUrl, $rFile, '', $sContentType, $iCode, $this->Logger()))
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
					if (!$this->StorageProvider()->MoveUploadedFile($oAccount, StorageType::TEMP,
							$sSavedName, $_FILES[$sInputName]['tmp_name']))
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
					if (!$this->StorageProvider()->MoveUploadedFile($oAccount, StorageType::TEMP,
							$sSavedName, $_FILES[$sInputName]['tmp_name']))
					{
						$iError = UploadError::ON_SAVING;
					}

					$mData = $this->StorageProvider()->Get($oAccount, StorageType::TEMP, $sSavedName);
					if (!empty($mData))
					{
						$this->StorageProvider()->Put($oAccount, StorageType::USER, 'CustomThemeBackground',
							'data:'.$_FILES[$sInputName]['type'].';base64,'.base64_encode($mData)
						);
					}
					
					unset($mData);
					$this->StorageProvider()->Clear($oAccount, StorageType::TEMP, $sSavedName);

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
				return $this->FalseResponse($sSavedName, $iClientError, $sError);
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

					if ($this->StorageProvider()->MoveUploadedFile($oAccount,
						\RainLoop\Providers\Storage\Enumerations\StorageType::TEMP,
						$sSavedName, $_FILES['AppendFile']['tmp_name']))
					{
						$iMessageStreamSize = $this->StorageProvider()->FileSize($oAccount, \RainLoop\Providers\Storage\Enumerations\StorageType::TEMP, $sSavedName);
						$rMessageStream = $this->StorageProvider()->GetFile($oAccount, \RainLoop\Providers\Storage\Enumerations\StorageType::TEMP, $sSavedName);

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
			$iUtcTimeStamp = \time();
			$iExpireTime = 3600 * 24 * 5;

			header('Cache-Control: private', true);
			header('Pragma: private', true);
			header('Etag: '.\md5('Etag:'.\md5($sKey.\md5($this->Config()->Get('cache', 'index', '')))), true);
			header('Last-Modified: '.\gmdate('D, d M Y H:i:s', $iUtcTimeStamp - $iExpireTime).' UTC', true);
			header('Expires: '.\gmdate('D, j M Y H:i:s', $iUtcTimeStamp + $iExpireTime).' UTC', true);
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
			if (!empty($sIfModifiedSince))
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
		
		$sData = $this->StorageProvider()->Get($oAccount, StorageType::USER, 'contacts/'.$sRawKey);
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
					->Login($oAccount->Login(), $oAccount->Password(), !!$this->Config()->Get('labs', 'use_imap_auth_plain'))
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
		return in_array($sTheme, $this->GetThemes()) ?
			$sTheme : $this->Config()->Get('themes', 'default', 'Default');
	}

	/**
	 * @param $sLanguage $sLanguage
	 *
	 * @return $sLanguage
	 */
	public function ValidateLanguage($sLanguage)
	{
		return in_array($sLanguage, $this->GetLanguages()) ?
			$sLanguage : $this->Config()->Get('i18n', 'default', 'en');
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
		if (is_array($aCache))
		{
			return $aCache;
		}

		$sList = array();
		$sDir = APP_VERSION_ROOT_PATH.'langs/';
		if (@is_dir($sDir))
		{
			$rDirH = opendir($sDir);
			if ($rDirH)
			{
				while (($sFile = readdir($rDirH)) !== false)
				{
					if ('.' !== $sFile{0} && is_file($sDir.'/'.$sFile) && '.ini' === substr($sFile, -4))
					{
						$sLang = strtolower(substr($sFile, 0, -4));
						if (0 < strlen($sLang) && 'always' !== $sLang)
						{
							if (\in_array($sLang, array('en')))
							{
								\array_unshift($sList, $sLang);
							}
							else
							{
								\array_push($sList, $sLang);
							}
						}
					}
				}

				@closedir($rDirH);
			}
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
	 * @return array
	 */
	private function setupInformation()
	{
		$aResult = array(
			'version-full' => APP_VERSION,
		);

		$sV = APP_VERSION;
		$aMatch = array();
		if (\preg_match('/([\d]+\.[\d]+\.[\d]+).*/', APP_VERSION, $aMatch) && !empty($aMatch[1]))
		{
			$sV = $aMatch[1];
		}

		$mPdoDrivers = \class_exists('PDO') ? \PDO::getAvailableDrivers() : null;

		$aResult['version'] = $sV;
		$aResult['software'] = array(
			'mailso' => \MailSo\Version::AppVersion(),
			'capa' => array(
				'pdo' => \is_array($mPdoDrivers),
				'pdo-sqlite' => \is_array($mPdoDrivers) ? \in_array('sqlite', $mPdoDrivers) : false,
				'pdo-mysql' => \is_array($mPdoDrivers) ? \in_array('mysql', $mPdoDrivers) : false
			),
			'php' => \phpversion()
		);
		
		$aResult['settings'] = array(
			'lang' => $this->Config()->Get('webmail', 'language', ''),
			'theme' => $this->Config()->Get('webmail', 'theme', ''),
			'multiply' => !!APP_MULTIPLY,
			'cache' => $this->Config()->Get('cache', 'fast_cache_driver', ''),
			'preview-pane' => !!$this->Config()->Get('webmail', 'use_preview_pane', true),
			'social' => array(
				'google' => !!$this->Config()->Get('social', 'google_enable', false),
				'twitter' => !!$this->Config()->Get('social', 'twitter_enable', false),
				'dropbox' => !!$this->Config()->Get('social', 'dropbox_enable', false),
				'facebook' => !!$this->Config()->Get('social', 'fb_enable', false)
			)
		);

		$aResult['plugins'] = array();
		$aResult['plugins']['@enabled'] = !!$this->Config()->Get('plugins', 'enable', false);

		$aEnabledPlugins = \explode(',', \strtolower($this->Config()->Get('plugins', 'enabled_list', '')));
		$aEnabledPlugins = \array_map('trim', $aEnabledPlugins);

		$aList = $this->Plugins()->InstalledPlugins();
		foreach ($aList as $aItem)
		{
			if (!empty($aItem[0]))
			{
				$aResult['plugins'][$aItem[0]] = \in_array(\strtolower($aItem[0]), $aEnabledPlugins) ? true : false;
			}
		}

		return $aResult;
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
				'uid' => \md5(APP_SITE.APP_SALT),
				'date' => array(
					'month' => \gmdate('m.Y'),
					'day' => \gmdate('d.m.Y')
				)
			))),
			CURLOPT_TIMEOUT => 10
		);

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
	 *
	 * @return array
	 */
	private function mainDefaultResponse($sActionName, $mResult = false)
	{
		$sActionName = 'Do' === substr($sActionName, 0, 2) ? substr($sActionName, 2) : $sActionName;

		$aResult = array(
			'Action' => $sActionName,
			'Result' => $this->responseObject($mResult, $sActionName)
		);

		return $aResult;
	}
	/**
	 * @param string $sActionName
	 * @param mixed $mResult = false
	 *
	 * @return array
	 */
	public function DefaultResponse($sActionName, $mResult = false)
	{
		$aResponseItem = $this->mainDefaultResponse($sActionName, $mResult);
		$this->Plugins()->RunHook('main.default-response', array($sActionName, &$aResponseItem));
		return $aResponseItem;
	}

	/**
	 * @param string $sActionName
	 *
	 * @return array
	 */
	public function TrueResponse($sActionName)
	{
		$aResponseItem = $this->mainDefaultResponse($sActionName, true);
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
		$aResponseItem = $this->mainDefaultResponse($sActionName, false);

		if (null !== $iErrorCode)
		{
			$aResponseItem['ErrorCode'] = (int) $iErrorCode;
			$aResponseItem['ErrorMessage'] = null === $sErrorMessage ? '' : (string) $sErrorMessage;
		}

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

		return $this->FalseResponse($sActionName, $iErrorCode);
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
	 * @param mixed $mDefaul = null
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
			'{{BackLinkVisibility}}' => $bShowBackLink ? 'inline-block' : 'none',
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
//		return \in_array(\strtolower($sFolderFullName), array('inbox', 'sent', 'send', 'drafts', 'spam', 'junk', 'bin', 'trash')) ?
//			\ucfirst(\strtolower($sFolderFullName)) :
//				\RainLoop\Utils::CustomBaseConvert(\sprintf('%u', \crc32(md5($sFolderFullName).$sFolderFullName)), '0123456789',
//					'0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');

		return \in_array(\strtolower($sFolderFullName), array('inbox', 'sent', 'send', 'drafts', 'spam', 'junk', 'bin', 'trash')) ?
			\ucfirst(\strtolower($sFolderFullName)) : \md5($sFolderFullName);

		return \preg_match('/^[a-zA-Z0-9]+$/', $sFolderFullName) ? $sFolderFullName : \md5($sFolderFullName);
		return \preg_match('/^[a-zA-Z0-9]+$/', $sFolderFullName) ? $sFolderFullName : \rtrim(\base_convert(\md5($sFolderFullName), 16, 32), '0');
		return 'INBOX' === $sFolderFullName ? $sFolderFullName : \base_convert(\sprintf('%u', \crc32(\md5($sFolderFullName))), 10, 32);
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
		if (is_object($mResponse))
		{
			$sClassName = get_class($mResponse);
			if ('MailSo\Mail\Message' === $sClassName)
			{
				$oAccount = $this->getAccountFromToken(false);

				$mResult = array_merge($this->objectData($mResponse, $sParent, $aParameters), array(
					'Folder' => $mResponse->Folder(),
					'Uid' => (string) $mResponse->Uid(),
					'Subject' => \MailSo\Base\Utils::Utf8Clear($mResponse->Subject()),
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
					'Sensitivity' => $mResponse->Sensitivity()
//					'ReadingConfirmation' => $mResponse->ReadingConfirmation(),
				));

				$oAttachments = $mResponse->Attachments();
				$mResult['HasAttachments'] = $oAttachments && 0 < $oAttachments->NonInlineCount();

				$mResult['RequestHash'] = \RainLoop\Utils::EncodeKeyValues(array(
					'V' => APP_VERSION,
					'Account' => $oAccount ? md5($oAccount->Hash()) : '',
					'Folder' => $mResult['Folder'],
					'Uid' => $mResult['Uid'],
					'MimeType' => 'message/rfc822',
					'FileName' => $mResult['Subject'].'.eml'
				));

				// Flags
				$aFlags = $mResponse->FlagsLowerCase();
				$mResult['IsSeen'] = in_array('\\seen', $aFlags);
				$mResult['IsFlagged'] = in_array('\\flagged', $aFlags);
				$mResult['IsAnswered'] = in_array('\\answered', $aFlags);

				$sForwardedFlag = $oAccount ? strtolower($oAccount->Domain()->ForwardFlag()) : '';
				$mResult['IsForwarded'] = 0 < strlen($sForwardedFlag) && in_array(strtolower($sForwardedFlag), $aFlags);

				if ('Message' === $sParent)
				{
					$oAttachments = $mResponse->Attachments();

					$bHasExternals = false;
					$aFoundedCIDs = array();

					$mResult['DraftInfo'] = $mResponse->DraftInfo();
					$mResult['InReplyTo'] = $mResponse->InReplyTo();
					$mResult['References'] = $mResponse->References();
					$mResult['Html'] = \MailSo\Base\HtmlUtils::ClearHtml($mResponse->Html(), $bHasExternals, $aFoundedCIDs);
					$mResult['Plain'] = \MailSo\Base\HtmlUtils::ConvertPlainToHtml($mResponse->Plain());

					$mResult['HasExternals'] = $bHasExternals;
					$mResult['HasInternals'] = \is_array($aFoundedCIDs) && 0 < \count($aFoundedCIDs);
					$mResult['FoundedCIDs'] = $aFoundedCIDs;
					$mResult['Attachments'] = $this->responseObject($oAttachments, $sParent, array_merge($aParameters, array(
						'FoundedCIDs' => $aFoundedCIDs
					)));
				}
			}
			else if ('MailSo\Mime\Email' === $sClassName)
			{
				$mResult = array_merge($this->objectData($mResponse, $sParent, $aParameters), array(
					'Name' => \MailSo\Base\Utils::Utf8Clear($mResponse->GetDisplayName()),
					'Email' => \MailSo\Base\Utils::Utf8Clear($mResponse->GetEmail())
				));
			}
			else if ('RainLoop\Providers\Contacts\Classes\Contact' === $sClassName)
			{
				$mResult = array_merge($this->objectData($mResponse, $sParent, $aParameters), array(
					'IdContact' => $mResponse->IdContact,
					'ImageHash' => $mResponse->ImageHash,
					'ListName' => \MailSo\Base\Utils::Utf8Clear($mResponse->ListName),
					'Name' => \MailSo\Base\Utils::Utf8Clear($mResponse->Name),
					'Emails' => $mResponse->Emails
				));
			}
			else if ('RainLoop\Domain' === $sClassName)
			{
				$mResult = array_merge($this->objectData($mResponse, $sParent, $aParameters), array(
					'Name' => $mResponse->Name(),
					'IncHost' => $mResponse->IncHost(),
					'IncPort' => $mResponse->IncPort(),
					'IncSecure' => $mResponse->IncSecure(),
					'OutHost' => $mResponse->OutHost(),
					'OutPort' => $mResponse->OutPort(),
					'OutSecure' => $mResponse->OutSecure(),
					'OutAuth' => $mResponse->OutAuth(),
					'WhiteList' => $mResponse->WhiteList()
				));
			}
			else if ('MailSo\Mail\Attachment' === $sClassName)
			{
				$oAccount = $this->getAccountFromToken(false);

				$aFoundedCIDs = isset($aParameters['FoundedCIDs']) && is_array($aParameters['FoundedCIDs'])
					? $aParameters['FoundedCIDs'] : array();

				$mResult = array_merge($this->objectData($mResponse, $sParent, $aParameters), array(
					'Folder' => $mResponse->Folder(),
					'Uid' => (string) $mResponse->Uid(),
					'MimeIndex' => (string) $mResponse->MimeIndex(),
					'MimeType' => $mResponse->MimeType(),
					'FileName' => $mResponse->FileName(true),
					'EstimatedSize' => $mResponse->EstimatedSize(),
					'CID' => $mResponse->Cid(),
					'IsInline' => $mResponse->IsInline(),
					'IsLinked' => in_array(trim(trim($mResponse->Cid()), '<>'), $aFoundedCIDs)
				));

				$mResult['Download'] = \RainLoop\Utils::EncodeKeyValues(array(
					'V' => APP_VERSION,
					'Account' => $oAccount ? md5($oAccount->Hash()) : '',
					'Folder' => $mResult['Folder'],
					'Uid' => $mResult['Uid'],
					'MimeIndex' => $mResult['MimeIndex'],
					'MimeType' => $mResult['MimeType'],
					'FileName' => $mResult['FileName']
				));
			}
			else if ('MailSo\Mail\Folder' === $sClassName)
			{
				$bIgnoreFolderSubscribe = (bool) $this->Config()->Get('labs', 'ignore_folders_subscription', false);

				$aExtended = null;
				$mStatus = $mResponse->Status();
				if (is_array($mStatus) && isset($mStatus['MESSAGES'], $mStatus['UNSEEN'], $mStatus['UIDNEXT']))
				{
					$aExtended = array(
						'MessageCount' => (int) $mStatus['MESSAGES'],
						'MessageUnseenCount' => (int) $mStatus['UNSEEN'],
						'UidNext' => (string) $mStatus['UIDNEXT'],
						'Hash' => \MailSo\Mail\MailClient::GenerateHash(
							$mResponse->FullNameRaw(), $mStatus['MESSAGES'], $mStatus['UNSEEN'], $mStatus['UIDNEXT'])
					);
				}

				$mResult = array_merge($this->objectData($mResponse, $sParent, $aParameters), array(
					'Name' => $mResponse->Name(),
					'FullName' => $mResponse->FullName(),
					'FullNameRaw' => $mResponse->FullNameRaw(),
					'FullNameHash' => $this->hashFolderFullName($mResponse->FullNameRaw(), $mResponse->FullName()),
					'Delimiter' => (string) $mResponse->Delimiter(),
					'HasVisibleSubFolders' => $mResponse->HasVisibleSubFolders(),
					'IsSubscribed' => $bIgnoreFolderSubscribe ? true : $mResponse->IsSubscribed(),
					'IsExisten' => $mResponse->IsExisten(),
					'IsSelectable' => $mResponse->IsSelectable(),
					'Flags' => $mResponse->FlagsLowerCase(),
					'Extended' => $aExtended,
					'SubFolders' => $this->responseObject($mResponse->SubFolders(), $sParent, $aParameters)
				));
			}
			else if ('MailSo\Mail\MessageCollection' === $sClassName)
			{
				$mResult = array_merge($this->objectData($mResponse, $sParent, $aParameters), array(
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
				$mResult = array_merge($this->objectData($mResponse, $sParent, $aParameters), array(
					'InlineCount' => $mResponse->InlineCount()
				));
			}
			else if ('MailSo\Mail\FolderCollection' === $sClassName)
			{
				$mResult = array_merge($this->objectData($mResponse, $sParent, $aParameters), array(
					'Namespace' => $mResponse->GetNamespace(),
					'FoldersHash' => isset($mResponse->FoldersHash) ? $mResponse->FoldersHash : '',
					'SystemFolders' => isset($mResponse->SystemFolders) && \is_array($mResponse->SystemFolders) ? $mResponse->SystemFolders : array()
				));
			}
			else if ($mResponse instanceof \MailSo\Base\Collection)
			{
				$aList =& $mResponse->GetAsArray();
				$mResult = $this->responseObject($aList, $sParent, $aParameters);
			}
			else
			{
				$mResult = '['.get_class($mResponse).']';
			}
		}
		else if (is_array($mResponse))
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
