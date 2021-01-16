<?php

namespace RainLoop;

use RainLoop\Enumerations\UploadError;
use RainLoop\Enumerations\UploadClientError;

class Actions
{
	const AUTH_TFA_SIGN_ME_TOKEN_KEY = 'rltfasmauth';
	const AUTH_SIGN_ME_TOKEN_KEY = 'rlsmauth';
	const AUTH_MAILTO_TOKEN_KEY = 'rlmailtoauth';
	const AUTH_SPEC_TOKEN_KEY = 'rlspecauth';
	const AUTH_SPEC_LOGOUT_TOKEN_KEY = 'rlspeclogout';
	const AUTH_SPEC_LOGOUT_CUSTOM_MSG_KEY = 'rlspeclogoutcmk';
	const AUTH_ADMIN_TOKEN_KEY = 'rlaauth';
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
	 * @var \RainLoop\Social
	 */
	private $oSocial;

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
	 * @var \RainLoop\Providers\ChangePassword
	 */
	private $oChangePasswordProvider;

	/**
	 * @var \RainLoop\Providers\TwoFactorAuth
	 */
	private $oTwoFactorAuthProvider;

	/**
	 * @var \RainLoop\Providers\Prem
	 */
	private $oPremProvider;

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
	private function __construct()
	{
		$this->aCurrentActionParams = array();

		$this->oHttp = null;
		$this->oLogger = null;
		$this->oPlugins = null;
		$this->oMailClient = null;
		$this->oSocial = null;
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
		$this->oChangePasswordProvider = null;
		$this->oTwoFactorAuthProvider = null;
		$this->oPremProvider = null;

		$this->sSpecAuthToken = '';
		$this->sUpdateAuthToken = '';
		$this->bIsAjax = false;

		$oConfig = $this->Config();
		$this->Plugins()->RunHook('filter.application-config', array(&$oConfig));

		$this->Logger()->Ping();
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
	 * @param string $sUpdateAuthToken
	 *
	 * @return \RainLoop\Application
	 */
	public function SetUpdateAuthToken($sUpdateAuthToken)
	{
		$this->sUpdateAuthToken = $sUpdateAuthToken;

		return $this;
	}

	/**
	 * @param string $bIsAjax
	 *
	 * @return \RainLoop\Application
	 */
	public function SetIsAjax($bIsAjax)
	{
		$this->bIsAjax = $bIsAjax;

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
	public function GetUpdateAuthToken()
	{
		return $this->sUpdateAuthToken;
	}

	/**
	 * @return boolean
	 */
	public function GetIsAjax()
	{
		return $this->bIsAjax;
	}

	/**
	 * @return string
	 */
	public function GetShortLifeSpecAuthToken($iLife = 60)
	{
		$aAccountHash = \RainLoop\Utils::DecodeKeyValues($this->getLocalAuthToken());
		if (!empty($aAccountHash[0]) && 'token' === $aAccountHash[0] && \is_array($aAccountHash))
		{
			$aAccountHash[10] = \time() + $iLife;
			return \RainLoop\Utils::EncodeKeyValues($aAccountHash);
		}

		return '';
	}

	/**
	 * @return \RainLoop\Application
	 */
	public function Config()
	{
		if (null === $this->oConfig)
		{
			$this->oConfig = new \RainLoop\Config\Application();
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
	 * @param string $sName
	 * @param \RainLoop\Model\Account $oAccount = null
	 *
	 * @return mixed
	 */
	private function fabrica($sName, $oAccount = null)
	{
		$mResult = null;
		$this->Plugins()
			->RunHook('main.fabrica', array($sName, &$mResult), false)
			->RunHook('main.fabrica[2]', array($sName, &$mResult, $oAccount), false)
		;

		if (null === $mResult)
		{
			switch ($sName)
			{
				case 'files':
					// RainLoop\Providers\Files\IFiles
					$mResult = new \RainLoop\Providers\Files\FileStorage(APP_PRIVATE_DATA.'storage/files');
					break;
				case 'storage':
				case 'storage-local':
					// RainLoop\Providers\Storage\IStorage
					$mResult = new \RainLoop\Providers\Storage\FileStorage(
						APP_PRIVATE_DATA.'storage', 'storage-local' === $sName);
					break;
				case 'settings':
				case 'settings-local':
					// RainLoop\Providers\Settings\ISettings
					$mResult = new \RainLoop\Providers\Settings\DefaultSettings(
						$this->StorageProvider('settings-local' === $sName));
					break;
				case 'login':
					// \RainLoop\Providers\Login\LoginInterface
					$mResult = new \RainLoop\Providers\Login\DefaultLogin();
					break;
				case 'domain':
					// \RainLoop\Providers\Domain\DomainAdminInterface
					$mResult = new \RainLoop\Providers\Domain\DefaultDomain(APP_PRIVATE_DATA.'domains', $this->Cacher());
					break;
				case 'filters':
					// \RainLoop\Providers\Filters\FiltersInterface
					$mResult = new \RainLoop\Providers\Filters\SieveStorage(
						$this->Plugins(), $this->Config()
					);
					break;
				case 'address-book':
					// \RainLoop\Providers\AddressBook\AddressBookInterface

					$sDsn = \trim($this->Config()->Get('contacts', 'pdo_dsn', ''));
					$sUser = \trim($this->Config()->Get('contacts', 'pdo_user', ''));
					$sPassword = (string) $this->Config()->Get('contacts', 'pdo_password', '');

					$sDsnType = $this->ValidateContactPdoType(\trim($this->Config()->Get('contacts', 'type', 'sqlite')));
					if ('sqlite' === $sDsnType)
					{
						$mResult = new \RainLoop\Providers\AddressBook\PdoAddressBook(
							'sqlite:'.APP_PRIVATE_DATA.'AddressBook.sqlite', '', '', 'sqlite');
					}
					else
					{
						$mResult = new \RainLoop\Providers\AddressBook\PdoAddressBook($sDsn, $sUser, $sPassword, $sDsnType);
					}
					break;
				case 'suggestions':

					if (null === $mResult)
					{
						$mResult = array();
					}

					if (\is_array($mResult) && \RainLoop\Utils::IsOwnCloud() && $this->Config()->Get('labs', 'owncloud_suggestions', true))
					{
						// \RainLoop\Providers\Suggestions\ISuggestions
						$mResult[] = new \RainLoop\Providers\Suggestions\OwnCloudSuggestions();
					}

					break;
				case 'change-password':
					// \RainLoop\Providers\ChangePassword\ChangePasswordInterface
					break;
				case 'two-factor-auth':
					// \RainLoop\Providers\TwoFactorAuth\TwoFactorAuthInterface
					$mResult = new \RainLoop\Providers\TwoFactorAuth\GoogleTwoFactorAuth();
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

	/**
	 * @return void
	 */
	public function BootEnd()
	{
		try
		{
			if ($this->MailClient()->IsLoggined())
			{
				$this->MailClient()->LogoutAndDisconnect();
			}
		}
		catch (\Exception $oException) { unset($oException); }
	}

	/**
	 * @return string
	 */
	public function ParseQueryAuthString()
	{
		$sQuery = \trim($this->Http()->GetQueryString());

		$iPos = \strpos($sQuery, '&');
		if (0 < $iPos)
		{
			$sQuery = \substr($sQuery, 0, $iPos);
		}

		$sQuery = \trim(\trim($sQuery), ' /');

		$aSubQuery = $this->Http()->GetQuery('q', null);
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

	/**
	 * @param string $sLine
	 * @param \RainLoop\Model\Account $oAccount = null
	 * @param bool $bUrlEncode = false
	 * @param array $aAdditionalParams = array()
	 *
	 * @return string
	 */
	private function compileLogParams($sLine, $oAccount = null, $bUrlEncode = false, $aAdditionalParams = array())
	{
		$aClear = array();

		if (false !== \strpos($sLine, '{date:'))
		{
			$sTimeOffset = (string) $this->Config()->Get('logs', 'time_offset', '0');
			$sLine = \preg_replace_callback('/\{date:([^}]+)\}/', function ($aMatch) use ($sTimeOffset, $bUrlEncode) {
				return \RainLoop\Utils::UrlEncode(\MailSo\Log\Logger::DateHelper($aMatch[1], $sTimeOffset), $bUrlEncode);
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
				$sLine = \str_replace('{imap:login}', \RainLoop\Utils::UrlEncode($oAccount->IncLogin(), $bUrlEncode), $sLine);
				$sLine = \str_replace('{imap:host}', \RainLoop\Utils::UrlEncode($oAccount->DomainIncHost(), $bUrlEncode), $sLine);
				$sLine = \str_replace('{imap:port}', \RainLoop\Utils::UrlEncode($oAccount->DomainIncPort(), $bUrlEncode), $sLine);

				$sLine = \str_replace('{smtp:login}', \RainLoop\Utils::UrlEncode($oAccount->OutLogin(), $bUrlEncode), $sLine);
				$sLine = \str_replace('{smtp:host}', \RainLoop\Utils::UrlEncode($oAccount->DomainOutHost(), $bUrlEncode), $sLine);
				$sLine = \str_replace('{smtp:port}', \RainLoop\Utils::UrlEncode($oAccount->DomainOutPort(), $bUrlEncode), $sLine);
			}

			$aClear['/\{imap:([^}]*)\}/i'] = 'imap';
			$aClear['/\{smtp:([^}]*)\}/i'] = 'smtp';
		}

		if (false !== \strpos($sLine, '{request:'))
		{
			if (false !== \strpos($sLine, '{request:ip}'))
			{
				$sLine = \str_replace('{request:ip}', \RainLoop\Utils::UrlEncode($this->Http()->GetClientIp(
					$this->Config()->Get('labs', 'http_client_ip_check_proxy', false)), $bUrlEncode), $sLine);
			}

			if (false !== \strpos($sLine, '{request:domain}'))
			{
				$sLine = \str_replace('{request:domain}',
					\RainLoop\Utils::UrlEncode($this->Http()->GetHost(false, true, true), $bUrlEncode), $sLine);
			}

			if (false !== \strpos($sLine, '{request:domain-clear}'))
			{
				$sLine = \str_replace('{request:domain-clear}',
					\RainLoop\Utils::UrlEncode(
						\MailSo\Base\Utils::GetClearDomainName($this->Http()->GetHost(false, true, true)), $bUrlEncode), $sLine);
			}

			$aClear['/\{request:([^}]*)\}/i'] = 'request';
		}

		if (false !== \strpos($sLine, '{user:'))
		{
			if (false !== \strpos($sLine, '{user:uid}'))
			{
				$sLine = \str_replace('{user:uid}',
					\RainLoop\Utils::UrlEncode(\base_convert(\sprintf('%u',
						\crc32(\md5(\RainLoop\Utils::GetConnectionToken()))), 10, 32), $bUrlEncode),
					$sLine
				);
			}

			if (false !== \strpos($sLine, '{user:ip}'))
			{
				$sLine = \str_replace('{user:ip}', \RainLoop\Utils::UrlEncode($this->Http()->GetClientIp(
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

					$sLine = \str_replace('{user:email}', \RainLoop\Utils::UrlEncode($sEmail, $bUrlEncode), $sLine);
					$sLine = \str_replace('{user:login}', \RainLoop\Utils::UrlEncode(
						\MailSo\Base\Utils::GetAccountNameFromEmail($sEmail), $bUrlEncode), $sLine);
					$sLine = \str_replace('{user:domain}', \RainLoop\Utils::UrlEncode(
						\MailSo\Base\Utils::GetDomainFromEmail($sEmail), $bUrlEncode), $sLine);
					$sLine = \str_replace('{user:domain-clear}', \RainLoop\Utils::UrlEncode(
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

		if (\is_array($aAdditionalParams) && 0 < \count($aAdditionalParams))
		{
			foreach ($aAdditionalParams as $sKey => $sValue)
			{
				$sLine = \str_replace($sKey, $sValue, $sLine);
			}
		}

		if (0 < \count($aClear))
		{
			foreach ($aClear as $sKey => $sValue)
			{
				$sLine = \preg_replace($sKey, $sValue, $sLine);
			}
		}

		return $sLine;
	}

	/**
	 * @param string $sFileName
	 *
	 * @return string
	 */
	private function compileLogFileName($sFileName)
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

	/**
	 * @return void
	 */
	public function SetAuthLogoutToken()
	{
		@\header('X-RainLoop-Action: Logout');
		\RainLoop\Utils::SetCookie(self::AUTH_SPEC_LOGOUT_TOKEN_KEY, \md5(APP_START_TIME), 0);
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 *
	 * @return void
	 */
	public function SetAuthToken($oAccount)
	{
		if ($oAccount)
		{
			$sSpecAuthToken = '_'.$oAccount->GetAuthTokenQ();

			$this->SetSpecAuthToken($sSpecAuthToken);
			\RainLoop\Utils::SetCookie(self::AUTH_SPEC_TOKEN_KEY, $sSpecAuthToken, 0);

			if ($oAccount->SignMe() && 0 < \strlen($oAccount->SignMeToken()))
			{
				\RainLoop\Utils::SetCookie(self::AUTH_SIGN_ME_TOKEN_KEY,
					\RainLoop\Utils::EncodeKeyValuesQ(array(
						'e' => $oAccount->Email(),
						't' => $oAccount->SignMeToken()
					)),
					\time() + 60 * 60 * 24 * 30);

				$this->StorageProvider()->Put($oAccount,
					\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
					'sign_me',
					\RainLoop\Utils::EncodeKeyValuesQ(array(
						'Time' => \time(),
						'AuthToken' => $oAccount->GetAuthTokenQ(),
						'SignMetToken' => $oAccount->SignMeToken()
					))
				);
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
	 * @return string
	 */
	public function GetSpecAuthLogoutTokenWithDeletion()
	{
		$sResult = \RainLoop\Utils::GetCookie(self::AUTH_SPEC_LOGOUT_TOKEN_KEY, '');
		if (0 < strlen($sResult))
		{
			\RainLoop\Utils::ClearCookie(self::AUTH_SPEC_LOGOUT_TOKEN_KEY);
		}

		return $sResult;
	}

	/**
	 * @return string
	 */
	public function GetSpecLogoutCustomMgsWithDeletion()
	{
		$sResult = \RainLoop\Utils::GetCookie(self::AUTH_SPEC_LOGOUT_CUSTOM_MSG_KEY, '');
		if (0 < strlen($sResult))
		{
			\RainLoop\Utils::ClearCookie(self::AUTH_SPEC_LOGOUT_CUSTOM_MSG_KEY);
		}

		return $sResult;
	}

	/**
	 * @return string
	 */
	public function SetSpecLogoutCustomMgsWithDeletion($sMessage)
	{
		\RainLoop\Utils::SetCookie(self::AUTH_SPEC_LOGOUT_CUSTOM_MSG_KEY, $sMessage, 0);
	}

	/**
	 * @return void
	 */
	private function setAdminAuthToken($sToken)
	{
		\RainLoop\Utils::SetCookie(self::AUTH_ADMIN_TOKEN_KEY, $sToken, 0);
	}

	/**
	 * @return string
	 */
	private function getLocalAuthToken()
	{
		$sToken = $this->GetSpecAuthToken();
		return !empty($sToken) && '_' === \substr($sToken, 0, 1) ? \substr($sToken, 1) : '';
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
		$aAdminHash = \RainLoop\Utils::DecodeKeyValuesQ($this->getAdminAuthToken());
		if (
			!empty($aAdminHash[0]) && !empty($aAdminHash[1]) && !empty($aAdminHash[2]) &&
			'token' === $aAdminHash[0] && \md5(APP_SALT) === $aAdminHash[1]
		)
		{
			$this->Cacher(null, true)->Delete(\RainLoop\KeyPathHelper::SessionAdminKey($aAdminHash[2]));
		}

		\RainLoop\Utils::ClearCookie(self::AUTH_ADMIN_TOKEN_KEY);
	}

	/**
	 * @param bool $bThrowExceptionOnFalse = false
	 *
	 * @return \RainLoop\Model\Account|bool
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
	 * @return \RainLoop\Providers\Filters
	 */
	public function FiltersProvider()
	{
		if (null === $this->oFiltersProvider)
		{
			$this->oFiltersProvider = new \RainLoop\Providers\Filters(
				$this->fabrica('filters'));
		}

		return $this->oFiltersProvider;
	}

	/**
	 * @return \RainLoop\Providers\ChangePassword
	 */
	public function ChangePasswordProvider()
	{
		if (null === $this->oChangePasswordProvider)
		{
			$this->oChangePasswordProvider = new \RainLoop\Providers\ChangePassword(
				$this, $this->fabrica('change-password'), !!$this->Config()->Get('labs', 'check_new_password_strength', true)
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
	 * @return \RainLoop\Providers\Prem
	 */
	public function PremProvider()
	{
		if (null === $this->oPremProvider)
		{
			if (\file_exists(APP_VERSION_ROOT_PATH.'app/libraries/RainLoop/Providers/Prem.php'))
			{
				$this->oPremProvider = new \RainLoop\Providers\Prem(
					$this->Config(), $this->Logger(), $this->Cacher(null, true)
				);
			}
			else
			{
				$this->oPremProvider = false;
			}
		}

		return $this->oPremProvider;
	}

	/**
	 * @param bool $bLocal = false
	 *
	 * @return \RainLoop\Providers\Storage
	 */
	public function StorageProvider($bLocal = false)
	{
		if ($bLocal)
		{
			if (null === $this->oLocalStorageProvider)
			{
				$this->oLocalStorageProvider = new \RainLoop\Providers\Storage(
					$this->fabrica('storage-local'));
			}

			return $this->oLocalStorageProvider;
		}
		else
		{
			if (null === $this->oStorageProvider)
			{
				$this->oStorageProvider = new \RainLoop\Providers\Storage(
					$this->fabrica('storage'));
			}

			return $this->oStorageProvider;
		}

		return null;
	}

	/**
	 * @return \RainLoop\Providers\Settings
	 */
	public function SettingsProvider($bLocal = false)
	{
		if ($bLocal)
		{
			if (null === $this->oLocalSettingsProvider)
			{
				$this->oLocalSettingsProvider = new \RainLoop\Providers\Settings(
					$this->fabrica('settings-local'));
			}

			return $this->oLocalSettingsProvider;
		}
		else
		{
			if (null === $this->oSettingsProvider)
			{
				$this->oSettingsProvider = new \RainLoop\Providers\Settings(
					$this->fabrica('settings'));
			}

			return $this->oSettingsProvider;
		}

		return null;
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
				$this->fabrica('domain'), $this->Plugins());
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
			$this->oSuggestionsProvider = new \RainLoop\Providers\Suggestions(
				$this->fabrica('suggestions'));
		}

		return $this->oSuggestionsProvider;
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount = null
	 * @param bool $bForceEnable = false
	 *
	 * @return \RainLoop\Providers\AddressBook
	 */
	public function AddressBookProvider($oAccount = null, $bForceEnable = false)
	{
		if (null === $this->oAddressBookProvider)
		{
			$oDriver = null;
			if ($this->GetCapa(false, false, \RainLoop\Enumerations\Capa::CONTACTS, $oAccount))
			{
				if ($this->Config()->Get('contacts', 'enable', false) || $bForceEnable)
				{
					$oDriver = $this->fabrica('address-book', $oAccount);
				}
			}

			$this->oAddressBookProvider = new \RainLoop\Providers\AddressBook($oDriver);
			$this->oAddressBookProvider->SetLogger($this->Logger());
		}

		return $this->oAddressBookProvider;
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount = null
	 * @param bool $bForceFile = false
	 *
	 * @return \MailSo\Cache\CacheClient
	 */
	public function Cacher($oAccount = null, $bForceFile = false)
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
			$this->aCachers[$sIndexKey] = \MailSo\Cache\CacheClient::NewInstance();

			$oDriver = null;
			$sDriver = \strtoupper(\trim($this->Config()->Get('cache', 'fast_cache_driver', 'files')));

			switch (true)
			{
				default:
				case $bForceFile:
					$oDriver = \MailSo\Cache\Drivers\File::NewInstance(APP_PRIVATE_DATA.'cache', $sKey);
					break;

				case ('APC' === $sDriver || 'APCU' === $sDriver) &&
					\MailSo\Base\Utils::FunctionExistsAndEnabled(array(
						'apc_store', 'apc_fetch', 'apc_delete', 'apc_clear_cache')):

					$oDriver = \MailSo\Cache\Drivers\APC::NewInstance($sKey);
					break;

				case ('MEMCACHE' === $sDriver || 'MEMCACHED' === $sDriver) &&
					\MailSo\Base\Utils::FunctionExistsAndEnabled('memcache_connect'):

					$oDriver = \MailSo\Cache\Drivers\Memcache::NewInstance(
						$this->Config()->Get('labs', 'fast_cache_memcache_host', '127.0.0.1'),
						(int) $this->Config()->Get('labs', 'fast_cache_memcache_port', 11211),
						43200,
						$sKey
					);
					break;

				case 'REDIS' === $sDriver && \class_exists('Predis\Client'):
					$oDriver = \MailSo\Cache\Drivers\Redis::NewInstance(
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

			if (!!$this->Config()->Get('logs', 'enable', false))
			{
				$sSessionFilter = (string) $this->Config()->Get('logs', 'session_filter', '');
				if (!empty($sSessionFilter))
				{
					$aSessionParts = \explode(':', $sSessionFilter, 2);

					if (empty($aSessionParts[0]) || empty($aSessionParts[1]) ||
						(string) $aSessionParts[1] !== (string) \RainLoop\Utils::GetCookie($aSessionParts[0], ''))
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
					$oDriver = \MailSo\Log\Drivers\Syslog::NewInstance();
				}
				else
				{
					$sLogFileFullPath = \APP_PRIVATE_DATA.'logs/'.$this->compileLogFileName($sLogFileName);
					$sLogFileDir = \dirname($sLogFileFullPath);

					if (!@is_dir($sLogFileDir))
					{
						@mkdir($sLogFileDir, 0755, true);
					}

					$oDriver = \MailSo\Log\Drivers\File::NewInstance($sLogFileFullPath);
				}

				$this->oLogger->Add($oDriver
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
					'APC:'.(\MailSo\Base\Utils::FunctionExistsAndEnabled('apc_fetch') ? 'on' : 'off').
					'][MB:'.(\MailSo\Base\Utils::FunctionExistsAndEnabled('mb_convert_encoding') ? 'on' : 'off').
					'][PDO:'.$sPdo.
					(\RainLoop\Utils::IsOwnCloud() ? '][cloud:true' : '').
					'][Streams:'.\implode(',', \stream_get_transports()).
				']');

				$this->oLogger->Write(
					'['.$oHttp->GetMethod().'] '.$oHttp->GetScheme().'://'.$oHttp->GetHost(false, false).$oHttp->GetServer('REQUEST_URI', ''),
					\MailSo\Log\Enumerations\Type::NOTE, 'REQUEST');
			}
		}

		return $this->oLogger;
	}

	/**
	 * @return \MailSo\Log\Logger
	 */
	public function LoggerAuth()
	{
		if (null === $this->oLoggerAuth)
		{
			$this->oLoggerAuth = \MailSo\Log\Logger::NewInstance(false);

			if (!!$this->Config()->Get('logs', 'auth_logging', false))
			{
				$sAuthLogFileFullPath = \APP_PRIVATE_DATA.'logs/'.$this->compileLogFileName(
					$this->Config()->Get('logs', 'auth_logging_filename', ''));

				$sLogFileDir = \dirname($sAuthLogFileFullPath);

				if (!@is_dir($sLogFileDir))
				{
					@mkdir($sLogFileDir, 0755, true);
				}

				$this->oLoggerAuth->AddForbiddenType(\MailSo\Log\Enumerations\Type::MEMORY);
				$this->oLoggerAuth->AddForbiddenType(\MailSo\Log\Enumerations\Type::TIME);
				$this->oLoggerAuth->AddForbiddenType(\MailSo\Log\Enumerations\Type::TIME_DELTA);

				$oDriver = \MailSo\Log\Drivers\File::NewInstance($sAuthLogFileFullPath);

				$oDriver->DisableTimePrefix();
				$oDriver->DisableGuidPrefix();
				$oDriver->DisableTypedPrefix();

				$this->oLoggerAuth->Add($oDriver);
			}
		}

		return $this->oLoggerAuth;
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount = null
	 * @param array $aAdditionalParams = array()
	 */
	public function LoggerAuthHelper($oAccount = null, $aAdditionalParams = array())
	{
		$sLine = $this->Config()->Get('logs', 'auth_logging_format', '');
		if (!empty($sLine))
		{
			$this->LoggerAuth()->Write($this->compileLogParams($sLine, $oAccount, false, $aAdditionalParams));
		}
	}

	/**
	 * @return string
	 */
	private function getAdminToken()
	{
		$sRand = \MailSo\Base\Utils::Md5Rand();
		if (!$this->Cacher(null, true)->Set(\RainLoop\KeyPathHelper::SessionAdminKey($sRand), \time()))
		{
			$this->oLogger->Write('Cannot store an admin token',
				\MailSo\Log\Enumerations\Type::WARNING);

			$sRand = '';
		}

		return '' === $sRand ? '' : \RainLoop\Utils::EncodeKeyValuesQ(array('token', \md5(APP_SALT), $sRand));
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
			$aAdminHash = \RainLoop\Utils::DecodeKeyValuesQ($this->getAdminAuthToken());
			if (!empty($aAdminHash[0]) && !empty($aAdminHash[1]) && !empty($aAdminHash[2]) &&
				'token' === $aAdminHash[0] && \md5(APP_SALT) === $aAdminHash[1] &&
				'' !== $this->Cacher(null, true)->Get(\RainLoop\KeyPathHelper::SessionAdminKey($aAdminHash[2]), '')
			)
			{
				$bResult = true;
			}
		}

		if (!$bResult && $bThrowExceptionOnFalse)
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
				\RainLoop\Utils::EncodeKeyValuesQ(array(
					'Time' => \microtime(true),
					'MailTo' => 'MailTo',
					'To' => $sTo
				)), 0);
		}
	}

	/**
	 * @param string $sEmail
	 * @param string $sLogin
	 * @param string $sPassword
	 * @param string $sSignMeToken = ''
	 * @param string $sClientCert = ''
	 * @param bool $bThrowProvideException = false
	 *
	 * @return \RainLoop\Model\Account|null
	 */
	public function LoginProvide($sEmail, $sLogin, $sPassword, $sSignMeToken = '', $sClientCert = '', $bThrowProvideException = false)
	{
		$oAccount = null;
		if (0 < \strlen($sEmail) && 0 < \strlen($sLogin) && 0 < \strlen($sPassword))
		{
			$oDomain = $this->DomainProvider()->Load(\MailSo\Base\Utils::GetDomainFromEmail($sEmail), true);
			if ($oDomain instanceof \RainLoop\Model\Domain)
			{
				if ($oDomain->ValidateWhiteList($sEmail, $sLogin))
				{
					$oAccount = \RainLoop\Model\Account::NewInstance($sEmail, $sLogin, $sPassword, $oDomain, $sSignMeToken, '', '', $sClientCert);
					$this->Plugins()->RunHook('filter.acount', array(&$oAccount));

					if ($bThrowProvideException && !($oAccount instanceof \RainLoop\Model\Account))
					{
						throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AuthError);
					}
				}
				else if ($bThrowProvideException)
				{
					throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AccountNotAllowed);
				}
			}
			else if ($bThrowProvideException)
			{
				throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::DomainNotAllowed);
			}
		}

		return $oAccount;
	}

	/**
	 * @param string $sToken
	 * @param bool $bThrowExceptionOnFalse = true
	 * @param bool $bValidateShortToken = true
	 * @param bool $bQ = false
	 *
	 * @return \RainLoop\Model\Account|bool
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function GetAccountFromCustomToken($sToken, $bThrowExceptionOnFalse = true, $bValidateShortToken = true, $bQ = false)
	{
		$oResult = false;
		if (!empty($sToken))
		{
			$aAccountHash = $bQ ? \RainLoop\Utils::DecodeKeyValuesQ($sToken) : \RainLoop\Utils::DecodeKeyValues($sToken);
			if (!empty($aAccountHash[0]) && 'token' === $aAccountHash[0] && // simple token validation
				8 <= \count($aAccountHash) && // length checking
				!empty($aAccountHash[7]) && // does short token exist
				(!$bValidateShortToken || \RainLoop\Utils::GetShortToken() === $aAccountHash[7] ||  // check short token if needed
					(isset($aAccountHash[10]) && 0 < $aAccountHash[10] && \time() < $aAccountHash[10]))
			)
			{
				$oAccount = $this->LoginProvide($aAccountHash[1], $aAccountHash[2], $aAccountHash[3],
					empty($aAccountHash[5]) ? '' : $aAccountHash[5], empty($aAccountHash[11]) ? '' : $aAccountHash[11], $bThrowExceptionOnFalse);

				if ($oAccount instanceof \RainLoop\Model\Account)
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
				throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AuthError);
			}
		}

		if ($bThrowExceptionOnFalse && !($oResult instanceof \RainLoop\Model\Account))
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AuthError);
		}

		return $oResult;
	}

	/**
	 * @return \RainLoop\Model\Account|bool
	 */
	public function GetAccountFromSignMeToken()
	{
		$oAccount = false;

		$sSignMeToken = \RainLoop\Utils::GetCookie(\RainLoop\Actions::AUTH_SIGN_ME_TOKEN_KEY, '');
		if (!empty($sSignMeToken))
		{
			$aTokenData = \RainLoop\Utils::DecodeKeyValuesQ($sSignMeToken);
			if (\is_array($aTokenData) && !empty($aTokenData['e']) && !empty($aTokenData['t']))
			{
				$sTokenSettings = $this->StorageProvider()->Get($aTokenData['e'],
					\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
					'sign_me'
				);

				if (!empty($sTokenSettings))
				{
					$aSignMeData = \RainLoop\Utils::DecodeKeyValuesQ($sTokenSettings);
					if (\is_array($aSignMeData) &&
						!empty($aSignMeData['AuthToken']) &&
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
			\RainLoop\Utils::ClearCookie(\RainLoop\Actions::AUTH_SIGN_ME_TOKEN_KEY);
		}

		return $oAccount;
	}

	/**
	 * @param bool $bThrowExceptionOnFalse = true
	 *
	 * @return \RainLoop\Model\Account|bool
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function getAccountFromToken($bThrowExceptionOnFalse = true)
	{
		return $this->GetAccountFromCustomToken($this->getLocalAuthToken(), $bThrowExceptionOnFalse, true, true);
	}

	/**
	 * @return bool
	 */
	public function IsOpen()
	{
		return !$this->PremProvider();
	}

	/**
	 * @param bool $bAdmin = false
	 * @param bool $bMobile = false
	 * @param bool $bMobileDevice = false
	 *
	 * @return array
	 */
	public function AppDataSystem($bAdmin = false, $bMobile = false, $bMobileDevice = false)
	{
		$oConfig = $this->Config();

		$aAttachmentsActions = array();
		if ($this->GetCapa(false, $bMobile, \RainLoop\Enumerations\Capa::ATTACHMENTS_ACTIONS))
		{
			if (!!\class_exists('ZipArchive'))
			{
				$aAttachmentsActions[] = 'zip';
			}

			if (\RainLoop\Utils::IsOwnCloudLoggedIn() && \class_exists('OCP\Files'))
			{
				$aAttachmentsActions[] = 'owncloud';
			}

			if ($oConfig->Get('social', 'dropbox_enable', false) && 0 < \strlen(\trim($oConfig->Get('social', 'dropbox_api_key', ''))))
			{
				$aAttachmentsActions[] = 'dropbox';
			}
		}

		return \array_merge(array(
			'version' => APP_VERSION,
			'admin' => $bAdmin,
			'mobile' => $bMobile,
			'mobileDevice' => $bMobileDevice,
			'webPath' => \RainLoop\Utils::WebPath(),
			'webVersionPath' => \RainLoop\Utils::WebVersionPath(),
			'token' => $oConfig->Get('security', 'csrf_protection', false) ? \RainLoop\Utils::GetCsrfToken() : '',
			'inIframe' => (bool) $oConfig->Get('labs', 'in_iframe', false),
			'allowHtmlEditorSourceButton' => (bool) $oConfig->Get('labs', 'allow_html_editor_source_button', false),
			'allowHtmlEditorBitiButtons' => (bool) $oConfig->Get('labs', 'allow_html_editor_biti_buttons', false),
			'allowCtrlEnterOnCompose' => (bool) $oConfig->Get('labs', 'allow_ctrl_enter_on_compose', false),
			'customLoginLink' => $oConfig->Get('labs', 'custom_login_link', ''),
			'customLogoutLink' => $oConfig->Get('labs', 'custom_logout_link', ''),
			'forgotPasswordLinkUrl' => \trim($oConfig->Get('login', 'forgot_password_link_url', '')),
			'registrationLinkUrl' => \trim($oConfig->Get('login', 'registration_link_url', '')),
			'hideSubmitButton' => (bool) $oConfig->Get('login', 'hide_submit_button', true),
			'jsHash' => \md5(\RainLoop\Utils::GetConnectionToken()),
			'useImapThread' => (bool) $oConfig->Get('labs', 'use_imap_thread', false),
			'useImapSubscribe' => (bool) $oConfig->Get('labs', 'use_imap_list_subscribe', true),
			'allowAppendMessage' => (bool) $oConfig->Get('labs', 'allow_message_append', false),
			'materialDesign' => (bool) $oConfig->Get('labs', 'use_material_design', true),
			'folderSpecLimit' => (int) $oConfig->Get('labs', 'folders_spec_limit', 50),
			'faviconStatus' => (bool) $oConfig->Get('labs', 'favicon_status', true),
			'allowCmdInterface' => (bool) $oConfig->Get('labs', 'allow_cmd', false),
			'useNativeScrollbars' => (bool) $oConfig->Get('interface', 'use_native_scrollbars', false),
			'listPermanentFiltered' => '' !== \trim(\RainLoop\Api::Config()->Get('labs', 'imap_message_list_permanent_filter', '')),
			'themes' => $this->GetThemes($bMobile, false),
			'languages' => $this->GetLanguages(false),
			'languagesAdmin' => $this->GetLanguages(true),
			'appVersionType' => APP_VERSION_TYPE,
			'attachmentsActions' => $aAttachmentsActions
		), $bAdmin ? array(
			'adminHostUse' => '' !== $oConfig->Get('security', 'admin_panel_host', ''),
			'adminPath' => \strtolower($oConfig->Get('security', 'admin_panel_key', 'admin')),
			'allowAdminPanel' => (bool) $oConfig->Get('security', 'allow_admin_panel', true),
		) : array());
	}

	/**
	 * @param bool $bAdmin
	 * @param bool $bMobile = false
	 * @param string $sAuthAccountHash = ''
	 *
	 * @return array
	 */
	public function AppData($bAdmin, $bMobile = false, $bMobileDevice = false, $sAuthAccountHash = '')
	{
		if (0 < \strlen($sAuthAccountHash) && \preg_match('/[^_\-\.a-zA-Z0-9]/', $sAuthAccountHash))
		{
			$sAuthAccountHash = '';
		}

		$oAccount = null;
		$oConfig = $this->Config();

/*
required by Index.html and rl.js:
NewThemeLink IncludeCss LoadingDescriptionEsc LangLink IncludeBackground PluginsLink AuthAccountHash
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
			'Title' => $oConfig->Get('webmail', 'title', 'RainLoop Webmail'),
			'LoadingDescription' => $oConfig->Get('webmail', 'loading_description', 'RainLoop'),
			'LoadingDescriptionEsc' => 'RainLoop',
			'FaviconUrl' => $oConfig->Get('webmail', 'favicon_url', ''),
			'LoginDescription' => '',
			'LoginLogo' => '',
			'LoginBackground' => '',
			'LoginCss' => '',
			'UserLogo' => '',
			'UserLogoTitle' => '',
			'UserLogoMessage' => '',
			'UserCss' => '',
			'WelcomePageUrl' => '',
			'WelcomePageDisplay' => 'none',
			'IncludeCss' => '',
			'IncludeBackground' => '',
			'LoginDefaultDomain' => $oConfig->Get('login', 'default_domain', ''),
			'DetermineUserLanguage' => (bool) $oConfig->Get('login', 'determine_user_language', true),
			'DetermineUserDomain' => (bool) $oConfig->Get('login', 'determine_user_domain', false),
			'UseLoginWelcomePage' => (bool) $oConfig->Get('login', 'welcome_page', false),
			'StartupUrl' => \trim(\ltrim(\trim($oConfig->Get('labs', 'startup_url', '')), '#/')),
			'SieveAllowFileintoInbox' => (bool) $oConfig->Get('labs', 'sieve_allow_fileinto_inbox', false),
			'ContactsIsAllowed' => false,
			'ChangePasswordIsAllowed' => false,
			'RequireTwoFactor' => false,
			'Community' => true,
			'PremType' => false,
			'Admin' => array(),
			'Capa' => array(),
			'Plugins' => array(),
			'System' => $this->AppDataSystem($bAdmin, $bMobile, $bMobileDevice)
		);

		if (0 < \strlen($sAuthAccountHash))
		{
			$aResult['AuthAccountHash'] = $sAuthAccountHash;
		}

		$oPremProvider = $this->PremProvider();
		if ($oPremProvider)
		{
			$oPremProvider->PopulateAppData($aResult);
		}

		if ('' !== $aResult['LoadingDescription'] && 'RainLoop' !== $aResult['LoadingDescription'])
		{
			$aResult['LoadingDescriptionEsc'] = @\htmlspecialchars($aResult['LoadingDescription'], ENT_QUOTES|ENT_IGNORE, 'UTF-8');
		}

		$oSettings = null;

		if (!$bAdmin)
		{
			$oAccount = $this->getAccountFromToken(false);
			if ($oAccount instanceof \RainLoop\Model\Account)
			{
				$aResult['IncludeCss'] = $aResult['UserCss'];

				$oAddressBookProvider = $this->AddressBookProvider($oAccount);

				$aResult['Auth'] = true;
				$aResult['Email'] = $oAccount->Email();
				$aResult['IncLogin'] = $oAccount->IncLogin();
				$aResult['OutLogin'] = $oAccount->OutLogin();
				$aResult['AccountHash'] = $oAccount->Hash();
				$aResult['AccountSignMe'] = $oAccount->SignMe();
				$aResult['ChangePasswordIsAllowed'] = $this->ChangePasswordProvider()->PasswordChangePossibility($oAccount);
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
					$sToken = \RainLoop\Utils::GetCookie(self::AUTH_MAILTO_TOKEN_KEY, null);
					if (null !== $sToken)
					{
						\RainLoop\Utils::ClearCookie(self::AUTH_MAILTO_TOKEN_KEY);

						$mMailToData = \RainLoop\Utils::DecodeKeyValuesQ($sToken);
						if (\is_array($mMailToData) && !empty($mMailToData['MailTo']) &&
							'MailTo' === $mMailToData['MailTo'] && !empty($mMailToData['To']))
						{
							$aResult['MailToEmail'] = $mMailToData['To'];
						}
					}
				}

				$oSettings = $this->SettingsProvider()->Load($oAccount);

				if (!$oAccount->IsAdditionalAccount() && !empty($aResult['WelcomePageUrl']) &&
					('once' === $aResult['WelcomePageDisplay'] || 'always' === $aResult['WelcomePageDisplay']))
				{
					if ('once' === $aResult['WelcomePageDisplay'])
					{
						if ($aResult['WelcomePageUrl'] === $oSettings->GetConf('LastWelcomePage', ''))
						{
							$aResult['WelcomePageUrl'] = '';
							$aResult['WelcomePageDisplay'] = '';
						}
					}
				}
				else
				{
					$aResult['WelcomePageUrl'] = '';
					$aResult['WelcomePageDisplay'] = '';
				}

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
				$oAccount = null;

				$aResult['IncludeBackground'] = $aResult['LoginBackground'];
				$aResult['IncludeCss'] = $aResult['LoginCss'];

				$aResult['DevEmail'] = $oConfig->Get('labs', 'dev_email', '');
				$aResult['DevPassword'] = $oConfig->Get('labs', 'dev_password', '');

				$aResult['WelcomePageUrl'] = '';
				$aResult['WelcomePageDisplay'] = '';

				$aResult['StartupUrl'] = '';

				if (empty($aResult['AdditionalLoginError']))
				{
					$aResult['AdditionalLoginError'] = $this->GetSpecLogoutCustomMgsWithDeletion();
				}
			}

			$aResult['AllowGoogleSocial'] = (bool) $oConfig->Get('social', 'google_enable', false);
			$aResult['AllowGoogleSocialAuth'] = (bool) $oConfig->Get('social', 'google_enable_auth', true);
			$aResult['AllowGoogleSocialAuthGmail'] = (bool) $oConfig->Get('social', 'google_enable_auth_gmail', true);
			$aResult['AllowGoogleSocialDrive'] = (bool) $oConfig->Get('social', 'google_enable_drive', true);
			$aResult['AllowGoogleSocialPreview'] = (bool) $oConfig->Get('social', 'google_enable_preview', true);

			$aResult['GoogleClientID'] = \trim($oConfig->Get('social', 'google_client_id', ''));
			$aResult['GoogleApiKey'] = \trim($oConfig->Get('social', 'google_api_key', ''));

			if (!$aResult['AllowGoogleSocial'] || ($aResult['AllowGoogleSocial'] && (
				'' === \trim($oConfig->Get('social', 'google_client_id', '')) || '' === \trim($oConfig->Get('social', 'google_client_secret', '')))))
			{
				$aResult['AllowGoogleSocialAuth'] = false;
				$aResult['AllowGoogleSocialAuthGmail'] = false;
				$aResult['AllowGoogleSocialDrive'] = false;
				$aResult['GoogleClientID'] = '';
				$aResult['GoogleApiKey'] = '';
			}

			if (!$aResult['AllowGoogleSocial'])
			{
				$aResult['AllowGoogleSocialPreview'] = false;
			}

			if ($aResult['AllowGoogleSocial'] &&
				!$aResult['AllowGoogleSocialAuth'] && !$aResult['AllowGoogleSocialAuthGmail'] &&
				!$aResult['AllowGoogleSocialDrive'] && !$aResult['AllowGoogleSocialPreview'])
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

			$aResult['Capa'] = $this->Capa(false, $bMobile, $oAccount);

			if ($aResult['Auth'] && !$aResult['RequireTwoFactor'])
			{
				if ($this->GetCapa(false, $bMobile, \RainLoop\Enumerations\Capa::TWO_FACTOR, $oAccount) &&
					$this->GetCapa(false, $bMobile, \RainLoop\Enumerations\Capa::TWO_FACTOR_FORCE, $oAccount) &&
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

				$aDrivers = \class_exists('PDO') ? \PDO::getAvailableDrivers() : null;
				$aResult['MySqlIsSupported'] = \is_array($aDrivers) ? \in_array('mysql', $aDrivers) : false;
				$aResult['SQLiteIsSupported'] = \is_array($aDrivers) ? \in_array('sqlite', $aDrivers) : false;
				$aResult['PostgreSqlIsSupported'] = \is_array($aDrivers) ? \in_array('pgsql', $aDrivers) : false;

				$aResult['ContactsEnable'] = (bool) $oConfig->Get('contacts', 'enable', false);
				$aResult['ContactsSync'] = (bool) $oConfig->Get('contacts', 'allow_sync', false);
				$aResult['ContactsPdoType'] = (string) $this->ValidateContactPdoType(\trim($this->Config()->Get('contacts', 'type', 'sqlite')));
				$aResult['ContactsPdoDsn'] = (string) $oConfig->Get('contacts', 'pdo_dsn', '');
				$aResult['ContactsPdoType'] = (string) $oConfig->Get('contacts', 'type', '');
				$aResult['ContactsPdoUser'] = (string) $oConfig->Get('contacts', 'pdo_user', '');
				$aResult['ContactsPdoPassword'] = (string) APP_DUMMY;

				$aResult['AllowGoogleSocial'] = (bool) $oConfig->Get('social', 'google_enable', false);
				$aResult['AllowGoogleSocialAuth'] = (bool) $oConfig->Get('social', 'google_enable_auth', true);
				$aResult['AllowGoogleSocialAuthGmail'] = (bool) $oConfig->Get('social', 'google_enable_auth_gmail', true);
				$aResult['AllowGoogleSocialDrive'] = (bool) $oConfig->Get('social', 'google_enable_drive', true);
				$aResult['AllowGoogleSocialPreview'] = (bool) $oConfig->Get('social', 'google_enable_preview', true);

				$aResult['GoogleClientID'] = (string) $oConfig->Get('social', 'google_client_id', '');
				$aResult['GoogleClientSecret'] = (string) $oConfig->Get('social', 'google_client_secret', '');
				$aResult['GoogleApiKey'] = (string) $oConfig->Get('social', 'google_api_key', '');

				$aResult['AllowFacebookSocial'] = (bool) $oConfig->Get('social', 'fb_enable', false);
				$aResult['FacebookAppID'] = (string) $oConfig->Get('social', 'fb_app_id', '');
				$aResult['FacebookAppSecret'] = (string) $oConfig->Get('social', 'fb_app_secret', '');

				$aResult['AllowTwitterSocial'] = (bool) $oConfig->Get('social', 'twitter_enable', false);
				$aResult['TwitterConsumerKey'] = (string) $oConfig->Get('social', 'twitter_consumer_key', '');
				$aResult['TwitterConsumerSecret'] = (string) $oConfig->Get('social', 'twitter_consumer_secret', '');

				$aResult['AllowDropboxSocial'] = (bool) $oConfig->Get('social', 'dropbox_enable', false);
				$aResult['DropboxApiKey'] = (string) $oConfig->Get('social', 'dropbox_api_key', '');

				$aResult['SubscriptionEnabled'] = (bool) \MailSo\Base\Utils::ValidateDomain($aResult['AdminDomain'], true);
//					|| \MailSo\Base\Utils::ValidateIP($aResult['AdminDomain']);

				$aResult['WeakPassword'] = (bool) $oConfig->ValidatePassword('12345');
				$aResult['CoreAccess'] = (bool) $this->rainLoopCoreAccess();

				$aResult['PhpUploadSizes'] = array(
					'upload_max_filesize' => \ini_get('upload_max_filesize'),
					'post_max_size' => \ini_get('post_max_size')
				);
			}

			$aResult['Capa'] = $this->Capa(true, $bMobile);
		}

		$aResult['SupportedFacebookSocial'] = (bool) \version_compare(PHP_VERSION, '5.4.0', '>=');
		if (!$aResult['SupportedFacebookSocial'])
		{
			$aResult['AllowFacebookSocial'] = false;
			$aResult['FacebookAppID'] = '';
			$aResult['FacebookAppSecret'] = '';
		}

		$aResult['ProjectHash'] = \md5($aResult['AccountHash'].APP_VERSION.$this->Plugins()->Hash());

		$sLanguage = $oConfig->Get('webmail', 'language', 'en');
		$sLanguageAdmin = $oConfig->Get('webmail', 'language_admin', 'en');
		$sTheme = $oConfig->Get('webmail', 'theme', 'Default');

		$aResult['NewMoveToFolder'] = (bool) $oConfig->Get('interface', 'new_move_to_folder_button', true);
		$aResult['AllowLanguagesOnSettings'] = (bool) $oConfig->Get('webmail', 'allow_languages_on_settings', true);
		$aResult['AllowLanguagesOnLogin'] = (bool) $oConfig->Get('login', 'allow_languages_on_login', true);
		$aResult['AttachmentLimit'] = ((int) $oConfig->Get('webmail', 'attachment_size_limit', 10)) * 1024 * 1024;
		$aResult['SignMe'] = (string) $oConfig->Get('login', 'sign_me_auto', \RainLoop\Enumerations\SignMeType::DEFAULT_OFF);
		$aResult['UseLocalProxyForExternalImages'] = (bool) $oConfig->Get('labs', 'use_local_proxy_for_external_images', false);

		// user
		$aResult['ShowImages'] = (bool) $oConfig->Get('defaults', 'show_images', false);
		$aResult['MPP'] = (int) $oConfig->Get('webmail', 'messages_per_page', 25);
		$aResult['SoundNotification'] = false;
		$aResult['DesktopNotifications'] = false;
		$aResult['Layout'] = (int) $oConfig->Get('defaults', 'view_layout', \RainLoop\Enumerations\Layout::SIDE_PREVIEW);
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

		if (!$bAdmin && $oAccount instanceof \RainLoop\Model\Account)
		{
			$aResult['ParentEmail'] = $oAccount->ParentEmail();

			$oSettingsLocal = $this->SettingsProvider(true)->Load($oAccount);

			if ($oSettingsLocal instanceof \RainLoop\Settings)
			{
//				if ($this->GetCapa(false, $bMobile, \RainLoop\Enumerations\Capa::FOLDERS, $oAccount))

				$aResult['SentFolder'] = (string) $oSettingsLocal->GetConf('SentFolder', '');
				$aResult['DraftFolder'] = (string) $oSettingsLocal->GetConf('DraftFolder', '');
				$aResult['SpamFolder'] = (string) $oSettingsLocal->GetConf('SpamFolder', '');
				$aResult['TrashFolder'] = (string) $oSettingsLocal->GetConf('TrashFolder', '');
				$aResult['ArchiveFolder'] = (string) $oSettingsLocal->GetConf('ArchiveFolder', '');
				$aResult['NullFolder'] = (string) $oSettingsLocal->GetConf('NullFolder', '');
			}

			if ($this->GetCapa(false, $bMobile, \RainLoop\Enumerations\Capa::SETTINGS, $oAccount))
			{
				if ($oSettings instanceof \RainLoop\Settings)
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

					if (!$this->GetCapa(false, $bMobile, \RainLoop\Enumerations\Capa::AUTOLOGOUT, $oAccount))
					{
						$aResult['AutoLogout'] = 0;
					}

					if ($this->GetCapa(false, $bMobile, \RainLoop\Enumerations\Capa::USER_BACKGROUND, $oAccount))
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

				if ($oSettingsLocal instanceof \RainLoop\Settings)
				{
					$aResult['UseThreads'] = (bool) $oSettingsLocal->GetConf('UseThreads', $aResult['UseThreads']);
					$aResult['ReplySameFolder'] = (bool) $oSettingsLocal->GetConf('ReplySameFolder', $aResult['ReplySameFolder']);

					if ($this->GetCapa(false, $bMobile, \RainLoop\Enumerations\Capa::THEMES, $oAccount))
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

		$bAppJsDebug = !!$this->Config()->Get('labs', 'use_app_debug_js', false);

		$aResult['StaticLibJsLink'] = $this->StaticPath('js/'.($bAppJsDebug ? '' : 'min/').
			'libs'.($bAppJsDebug ? '' : '.min').'.js');
		$aResult['StaticAppJsLink'] = $this->StaticPath('js/'.($bAppJsDebug ? '' : 'min/').
			($bAdmin ? 'admin' : 'app').($bAppJsDebug ? '' : '.min').'.js');

		$aResult['StaticAppJsNextLink'] = $this->StaticPath('js/'.($bAdmin ? 'admin' : 'app').'.next.js');
		$aResult['StaticEditorJsLink'] = $this->StaticPath('ckeditor/ckeditor.js');

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
			$aResult['Layout'] = \RainLoop\Enumerations\Layout::NO_PREVIEW;

			$aResult['SoundNotification'] = false;
			$aResult['DesktopNotifications'] = false;
			$aResult['UseCheckboxesInList'] = true;

			$aResult['UserBackgroundName'] = '';
			$aResult['UserBackgroundHash'] = '';
		}

		$this->Plugins()->InitAppData($bAdmin, $aResult, $oAccount);

		return $aResult;
	}

	/**
	 * @return array
	 */
	private function getUserLanguagesFromHeader()
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

	public function googleStoreTokens($oCache, $sAccessToken, $sRefreshToken)
	{
		$sCacheKey = 'tokens='.\md5($sRefreshToken);
		$oCache->Set($sCacheKey, $sAccessToken);
		$oCache->SetTimer($sCacheKey);
	}

	/**
	 * @return string
	 */
	public function googleRefreshTokenCallback($sAccessToken, $sRefreshToken)
	{
		$oAccount = $this->getAccountFromToken(false);
		if ($oAccount && $this->GetIsAjax())
		{
			$oCache = $this->Cacher($oAccount);
			$sCacheKey = 'tokens='.\md5($sRefreshToken);

			$sCachedAccessToken = $oCache->Get($sCacheKey);
			$iTime = $oCache->GetTimer($sCacheKey);

			if ($sCachedAccessToken === '' || $iTime === 0)
			{
				$this->googleStoreTokens($oCache, $sAccessToken, $sRefreshToken);
			}
			else if (\time() - 60 * 10 * 2 > $iTime) // 20min
			{
				$sCachedAccessToken = $this->Social()->GoogleRefreshToken($sAccessToken, $sRefreshToken);
				if ($sCachedAccessToken !== $sAccessToken) {
					$this->googleStoreTokens($oCache, $sCachedAccessToken, $sRefreshToken);

					$oAccount->SetPassword(\RainLoop\Model\Account::GenerateTokensPassword($sCachedAccessToken, $sRefreshToken));
					$this->AuthToken($oAccount);
					$this->SetUpdateAuthToken($this->GetSpecAuthToken());
				}
			}

			if ($sCachedAccessToken) {
				return $sCachedAccessToken;
			}
		}

		return $sAccessToken;
	}

	/**
	 * @return string
	 */
	public function detectUserLanguage($bAdmin = false)
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

	/**
	 * @param int $iWait = 1
	 * @param int $iDelay = 1
	 */
	private function requestSleep($iWait = 1, $iDelay = 1)
	{
		if (0 < $iDelay && 0 < $iWait)
		{
			if ($iWait > \time() - APP_START_TIME)
			{
				\sleep($iDelay);
			}
		}
	}

	private function loginErrorDelay()
	{
		$iDelay = (int) $this->Config()->Get('labs', 'login_fault_delay', 0);
		if (0 < $iDelay)
		{
			$this->requestSleep(1, $iDelay);
		}
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 */
	public function AuthToken($oAccount)
	{
		if ($oAccount instanceof \RainLoop\Model\Account)
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
	 * @param \RainLoop\Model\Account $oAccount
	 * @param bool $bAuthLog = false
	 *
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function CheckMailConnection($oAccount, $bAuthLog = false)
	{
		try
		{
			$oAccount->IncConnectAndLoginHelper($this->Plugins(), $this->MailClient(), $this->Config(), array($this, 'googleRefreshTokenCallback'));
		}
		catch (\RainLoop\Exceptions\ClientException $oException)
		{
			throw $oException;
		}
		catch (\MailSo\Net\Exceptions\ConnectionException $oException)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::ConnectionError, $oException);
		}
		catch (\MailSo\Imap\Exceptions\LoginBadCredentialsException $oException)
		{
			if ($bAuthLog)
			{
				$this->LoggerAuthHelper($oAccount);
			}

			if ($this->Config()->Get('labs', 'imap_show_login_alert', true))
			{
				throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AuthError,
					$oException, $oException->getAlertFromStatus());
			}
			else
			{
				throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AuthError, $oException);
			}
		}
		catch (\Exception $oException)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AuthError, $oException);
		}
	}

	/**
	 * @param string $sLogin
	 * @param bool $bAdmin = false
	 * @return array
	 */
	private function getAdditionalLogParamsByUserLogin($sLogin, $bAdmin = false)
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
	 * @param string $sEmail
	 * @param string $sPassword
	 * @param string $sSignMeToken = ''
	 * @param string $sAdditionalCode = ''
	 * @param string $bAdditionalCodeSignMe = false
	 * @param string $bSkipTwoFactorAuth = false
	 *
	 * @return \RainLoop\Model\Account
	 * @throws \RainLoop\Exceptions\ClientException
	 */
	public function LoginProcess(&$sEmail, &$sPassword, $sSignMeToken = '',
		$sAdditionalCode = '', $bAdditionalCodeSignMe = false, $bSkipTwoFactorAuth = false)
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
					if ($oDomain && $oDomain instanceof \RainLoop\Model\Domain)
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
					if ($oDomain && $oDomain instanceof \RainLoop\Model\Domain)
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

			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::InvalidInputArgument);
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

			if (!($oAccount instanceof \RainLoop\Model\Account))
			{
				throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AuthError);
			}

			$this->Plugins()->RunHook('event.login-post-login-provide', array(&$oAccount));

			if (!($oAccount instanceof \RainLoop\Model\Account))
			{
				throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AuthError);
			}
		}
		catch (\Exception $oException)
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

							throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AccountTwoFactorAuthError);
						}

						if ($bAdditionalCodeSignMe)
						{
							\RainLoop\Utils::SetCookie(self::AUTH_TFA_SIGN_ME_TOKEN_KEY, $sSecretHash,
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
		catch (\Exception $oException)
		{
			$this->loginErrorDelay();

			throw $oException;
		}

		return $oAccount;
	}

	/**
	 * @param string $sEmail
	 *
	 * @return string
	 */
	private function generateSignMeToken($sEmail)
	{
		return \MailSo\Base\Utils::Md5Rand(APP_SALT.$sEmail);
	}

	/**
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoLogin()
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
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AuthError);
		}

		try
		{
			$oAccount = $this->LoginProcess($sEmail, $sPassword,
				$bSignMe ? $this->generateSignMeToken($sEmail) : '',
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

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 *
	 * @return array
	 */
	public function GetAccounts($oAccount)
	{
		if ($this->GetCapa(false, false, \RainLoop\Enumerations\Capa::ADDITIONAL_ACCOUNTS, $oAccount))
		{
			$sAccounts = $this->StorageProvider()->Get($oAccount,
				\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
				'accounts'
			);

			$aAccounts = array();
			if ('' !== $sAccounts && '{' === \substr($sAccounts, 0, 1))
			{
				$aAccounts = @\json_decode($sAccounts, true);
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
						\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
						'accounts_identities_order'
					);

					$aOrder = empty($sOrder) ? array() : @\json_decode($sOrder, true);
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

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 *
	 * @return array
	 */
	public function GetTemplates($oAccount)
	{
		$aTemplates = array();
		if ($oAccount)
		{
			$aData = array();

			$sData = $this->StorageProvider(true)->Get($oAccount,
				\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
				'templates'
			);

			if ('' !== $sData && '[' === \substr($sData, 0, 1))
			{
				$aData = @\json_decode($sData, true);
			}

			if (\is_array($aData) && 0 < \count($aData))
			{
				foreach ($aData as $aItem)
				{
					$oItem = \RainLoop\Model\Template::NewInstance();
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
					\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
					'templates_order'
				);

				$aOrder = empty($sOrder) ? array() : @\json_decode($sOrder, true);
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

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sID
	 *
	 * @return \RainLoop\Model\Identity
	 */
	public function GetTemplateByID($oAccount, $sID)
	{
		$aTemplates = $this->GetTemplates($oAccount);
		if (\is_array($aTemplates))
		{
			foreach ($aTemplates as $oIdentity)
			{
				if ($oIdentity && $sID === $oIdentity->Id())
				{
					return $oIdentity;
				}
			}
		}

		return isset($aTemplates[0]) ? $aTemplates[0] : null;
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 *
	 * @return array
	 */
	public function GetIdentities($oAccount)
	{
		$bAllowIdentities = $this->GetCapa(false, false,
			\RainLoop\Enumerations\Capa::IDENTITIES, $oAccount);

		$aIdentities = array();
		if ($oAccount)
		{
			$aSubIdentities = array();

			$sData = $this->StorageProvider(true)->Get($oAccount,
				\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
				'identities'
			);

			if ('' !== $sData && '[' === \substr($sData, 0, 1))
			{
				$aSubIdentities = @\json_decode($sData, true);
			}

			$bHasAccountIdentity = false;

			if (\is_array($aSubIdentities) && 0 < \count($aSubIdentities))
			{
				foreach ($aSubIdentities as $aItem)
				{
					$oItem = \RainLoop\Model\Identity::NewInstance();
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
					\RainLoop\Model\Identity::NewInstanceFromAccount($oAccount));
			}

			if (1 < \count($aIdentities) && $bAllowIdentities)
			{
				$sOrder = $this->StorageProvider()->Get($oAccount,
					\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
					'accounts_identities_order'
				);

				$aOrder = empty($sOrder) ? array() : @\json_decode($sOrder, true);
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

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sID
	 * @param bool $bFirstOnEmpty = false
	 *
	 * @return \RainLoop\Model\Identity
	 */
	public function GetIdentityByID($oAccount, $sID, $bFirstOnEmpty = false)
	{
		$aIdentities = $this->GetIdentities($oAccount);

		if (\is_array($aIdentities))
		{
			foreach ($aIdentities as $oIdentity)
			{
				if ($oIdentity && $sID === $oIdentity->Id())
				{
					return $oIdentity;
				}
			}
		}

		return $bFirstOnEmpty && \is_array($aIdentities) && isset($aIdentities[0]) ? $aIdentities[0] : null;
	}
	/**
	 * @param \RainLoop\Model\Account $oAccount
	 *
	 * @return \RainLoop\Model\Identity
	 */
	public function GetAccountIdentity($oAccount)
	{
		return $this->GetIdentityByID($oAccount, '', true);
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
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
			$this->StorageProvider()->Clear($oAccount,
				\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
				'accounts'
			);
		}
		else
		{
			$this->StorageProvider()->Put($oAccount,
				\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
				'accounts',
				@\json_encode($aAccounts)
			);
		}
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param array $aIdentities = array()
	 *
	 * @return array
	 */
	public function SetIdentities($oAccount, $aIdentities = array())
	{
		$bAllowIdentities = $this->GetCapa(false, false, \RainLoop\Enumerations\Capa::IDENTITIES, $oAccount);

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
			\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
			'identities',
			@\json_encode($aResult)
		);
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param array $aTemplates = array()
	 *
	 * @return array
	 */
	public function SetTemplates($oAccount, $aTemplates = array())
	{
		$aResult = array();
		foreach ($aTemplates as $oItem)
		{
			$aResult[] = $oItem->ToSimpleJSON(false);
		}

		return $this->StorageProvider(true)->Put($oAccount,
			\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
			'templates',
			@\json_encode($aResult)
		);
	}

	/**
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoFilters()
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, false, \RainLoop\Enumerations\Capa::FILTERS, $oAccount))
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
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoFiltersSave()
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, false, \RainLoop\Enumerations\Capa::FILTERS, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$aIncFilters = $this->GetActionParam('Filters', array());

		$sRaw = $this->GetActionParam('Raw', '');
		$bRawIsActive = '1' === (string) $this->GetActionParam('RawIsActive', '0');

		$aFilters = array();
		foreach ($aIncFilters as $aFilter)
		{
			if ($aFilter)
			{
				$oFilter = new \RainLoop\Providers\Filters\Classes\Filter();
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
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoAccountSetup()
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, false, \RainLoop\Enumerations\Capa::ADDITIONAL_ACCOUNTS, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$sParentEmail = $oAccount->ParentEmailHelper();

		$aAccounts = $this->GetAccounts($oAccount);
		if (!\is_array($aAccounts))
		{
			$aAccounts = array();
		}

		$sEmail = \trim($this->GetActionParam('Email', ''));
		$sPassword = $this->GetActionParam('Password', '');
		$bNew = '1' === (string) $this->GetActionParam('New', '1');

		$sEmail = \MailSo\Base\Utils::IdnToAscii($sEmail, true);
		if ($bNew && ($oAccount->Email() === $sEmail || $sParentEmail === $sEmail || isset($aAccounts[$sEmail])))
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AccountAlreadyExists);
		}
		else if (!$bNew && !isset($aAccounts[$sEmail]))
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AccountDoesNotExist);
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
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoAccountDelete()
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, false, \RainLoop\Enumerations\Capa::ADDITIONAL_ACCOUNTS, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$sParentEmail = $oAccount->ParentEmailHelper();
		$sEmailToDelete = \trim($this->GetActionParam('EmailToDelete', ''));
		$sEmailToDelete = \MailSo\Base\Utils::IdnToAscii($sEmailToDelete, true);

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
					$this->AuthToken($oAccountToChange);
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
	public function DoAttachmentsActions()
	{
		if (!$this->GetCapa(false, false, \RainLoop\Enumerations\Capa::ATTACHMENTS_ACTIONS))
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
				if (\is_array($aResult) && !empty($aResult['FileHash']))
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
							$oZip->setArchiveComment('RainLoop/'.APP_VERSION);

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
									'Hash' => \RainLoop\Utils::EncodeKeyValuesQ(array(
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

				case 'owncloud':

					$mResult = false;

					if (\RainLoop\Utils::IsOwnCloudLoggedIn() && \class_exists('OCP\Files'))
					{
						$sSaveFolder = $this->Config()->Get('labs', 'owncloud_save_folder', '');
						if (empty($sSaveFolder))
						{
							$sSaveFolder = 'Attachments';
						}

						$oFiles = \OCP\Files::getStorage('files');

						if ($oFilesProvider && $oFiles && $oFilesProvider->IsActive() &&
							\method_exists($oFiles, 'file_put_contents'))
						{
							if (!$oFiles->is_dir($sSaveFolder))
							{
								$oFiles->mkdir($sSaveFolder);
							}

							$mResult = true;
							foreach ($aData as $aItem)
							{
								$sSavedFileName = isset($aItem['FileName']) ? $aItem['FileName'] : 'file.dat';
								$sSavedFileHash = !empty($aItem['FileHash']) ? $aItem['FileHash'] : '';

								if (!empty($sSavedFileHash))
								{
									$fFile = $oFilesProvider->GetFile($oAccount, $sSavedFileHash, 'rb');
									if (\is_resource($fFile))
									{
										$sSavedFileNameFull = \MailSo\Base\Utils::SmartFileExists($sSaveFolder.'/'.$sSavedFileName, function ($sPath) use ($oFiles) {
											return $oFiles->file_exists($sPath);
										});

										if (!$oFiles->file_put_contents($sSavedFileNameFull, $fFile))
										{
											$mResult = false;
										}

										if (\is_resource($fFile))
										{
											@\fclose($fFile);
										}
									}
								}
							}
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

					break;

				case 'dropbox':

					$mResult = array(
						'ShortLife' => '_'.$this->GetShortLifeSpecAuthToken(),
						'Url' => \preg_replace('/\?(.*)$/', '', $this->Http()->GetFullUrl()),
						'Files' => array()
					);

					foreach ($aData as $aItem)
					{
						$mResult['Files'][] = array(
							'FileName' => isset($aItem['FileName']) ? $aItem['FileName'] : 'file.dat',
							'Hash' => \RainLoop\Utils::EncodeKeyValuesQ($aItem)
						);
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
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoIdentityUpdate()
	{
		$oAccount = $this->getAccountFromToken();

		$oIdentity = \RainLoop\Model\Identity::NewInstance();
		if (!$oIdentity->FromJSON($this->GetActionParams(), true))
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::InvalidInputArgument);
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
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoIdentityDelete()
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, false, \RainLoop\Enumerations\Capa::IDENTITIES, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

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
	public function DoTemplateSetup()
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, false, \RainLoop\Enumerations\Capa::TEMPLATES, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$oTemplate = \RainLoop\Model\Template::NewInstance();
		if (!$oTemplate->FromJSON($this->GetActionParams(), true))
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::InvalidInputArgument);
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
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoTemplateDelete()
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, false, \RainLoop\Enumerations\Capa::TEMPLATES, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$sId = \trim($this->GetActionParam('IdToDelete', ''));
		if (empty($sId))
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::UnknownError);
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
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoTemplateGetByID()
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, false, \RainLoop\Enumerations\Capa::TEMPLATES, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$sId = \trim($this->GetActionParam('ID', ''));
		if (empty($sId))
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::UnknownError);
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
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoAccountsAndIdentitiesSortOrder()
	{
		$oAccount = $this->getAccountFromToken();

		$aAccounts = $this->GetActionParam('Accounts', null);
		$aIdentities = $this->GetActionParam('Identities', null);

		if (!\is_array($aAccounts) && !\is_array($aIdentities))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		return $this->DefaultResponse(__FUNCTION__, $this->StorageProvider()->Put($oAccount,
			\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG, 'accounts_identities_order',
			\json_encode(array(
				'Accounts' => \is_array($aAccounts) ? $aAccounts : array(),
				'Identities' => \is_array($aIdentities) ? $aIdentities : array()
			))
		));
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

		if ($this->GetCapa(false, false, \RainLoop\Enumerations\Capa::ADDITIONAL_ACCOUNTS, $oAccount))
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
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoTemplates()
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, false, \RainLoop\Enumerations\Capa::TEMPLATES, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		return $this->DefaultResponse(__FUNCTION__, array(
			'Templates' => $this->GetTemplates($oAccount)
		));
	}

	/**
	 * @param string $sHash
	 *
	 * @return int
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function getAccountUnreadCountFromHash($sHash)
	{
		$iResult = 0;

		$oAccount = $this->GetAccountFromCustomToken($sHash, false);
		if ($oAccount)
		{
			try
			{
				$oMailClient = \MailSo\Mail\MailClient::NewInstance();
				$oMailClient->SetLogger($this->Logger());

				$oAccount->IncConnectAndLoginHelper($this->Plugins(), $oMailClient, $this->Config(), array($this, 'googleRefreshTokenCallback'));

				$iResult = $oMailClient->InboxUnreadCount();

				$oMailClient->LogoutAndDisconnect();
			}
			catch (\Exception $oException)
			{
				$this->Logger()->WriteException($oException);
			}
		}

		return $iResult;
	}

	/**
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoAccountsCounts()
	{
		$oAccount = $this->getAccountFromToken();

		$bComplete = true;
		$aCounts = array();

		if ($this->GetCapa(false, false, \RainLoop\Enumerations\Capa::ADDITIONAL_ACCOUNTS, $oAccount))
		{
			$iLimit = 7;
			$mAccounts = $this->GetAccounts($oAccount);
			if (\is_array($mAccounts) && 0 < \count($mAccounts))
			{
				if ($iLimit > \count($mAccounts))
				{
					$mAccounts = \array_slice($mAccounts, 0, $iLimit);
				}
				else
				{
					$bComplete = false;
				}

				if (0 < \count($mAccounts))
				{
					foreach ($mAccounts as $sEmail => $sHash)
					{
						$aCounts[] = array(\MailSo\Base\Utils::IdnToUtf8($sEmail),
							$oAccount->Email() === $sEmail ? 0 : $this->getAccountUnreadCountFromHash($sHash));
					}
				}
			}
		}
		else
		{
			$aCounts[] = array(\MailSo\Base\Utils::IdnToUtf8($oAccount->Email()), 0);
		}

		return $this->DefaultResponse(__FUNCTION__, array(
			'Complete' => $bComplete,
			'Counts' => $aCounts
		));
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 */
	public function ClearSignMeData($oAccount)
	{
		if ($oAccount)
		{
			\RainLoop\Utils::ClearCookie(\RainLoop\Actions::AUTH_SIGN_ME_TOKEN_KEY);

			$this->StorageProvider()->Clear($oAccount,
				\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
				'sign_me'
			);
		}
	}

	/**
	 * @return array
	 */
	public function DoLogout()
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
				\RainLoop\Utils::ClearCookie(\RainLoop\Actions::AUTH_SPEC_TOKEN_KEY);
			}
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
		$bVersionsCache = false;

		$iOneDay1 = 60 * 60 * 23;
		$iOneDay2 = 60 * 60 * 25;
		$iOneDay3 = 60 * 60 * 30;

		$sTimers = $this->StorageProvider()->Get(null,
			\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY, 'Cache/Timers', '');

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
				\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY, 'Cache/Timers',
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
		else if ($bVersionsCache)
		{
			$oPremProvider = $this->PremProvider();
			if ($oPremProvider)
			{
				$oPremProvider->ClearOldVersion();
			}
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

	/**
	 * @param \RainLoop\Config\Application $oConfig
	 * @param string $sParamName
	 * @param string $sConfigSector
	 * @param string $sConfigName
	 * @param string $sType = 'string'
	 * @param callable|null $mStringCallback = null
	 */
	public function setConfigFromParams(&$oConfig, $sParamName, $sConfigSector, $sConfigName, $sType = 'string', $mStringCallback = null)
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
	 * @param \RainLoop\Config\Application $oConfig
	 * @param string $sParamName
	 * @param string $sCapa
	 */
	private function setCapaFromParams(&$oConfig, $sParamName, $sCapa)
	{
		switch ($sCapa)
		{
			case \RainLoop\Enumerations\Capa::ADDITIONAL_ACCOUNTS:
				$this->setConfigFromParams($oConfig, $sParamName, 'webmail', 'allow_additional_accounts', 'bool');
				break;
			case \RainLoop\Enumerations\Capa::IDENTITIES:
				$this->setConfigFromParams($oConfig, $sParamName, 'webmail', 'allow_additional_identities', 'bool');
				break;
			case \RainLoop\Enumerations\Capa::TEMPLATES:
				$this->setConfigFromParams($oConfig, $sParamName, 'capa', 'x-templates', 'bool');
				break;
			case \RainLoop\Enumerations\Capa::TWO_FACTOR:
				$this->setConfigFromParams($oConfig, $sParamName, 'security', 'allow_two_factor_auth', 'bool');
				break;
			case \RainLoop\Enumerations\Capa::TWO_FACTOR_FORCE:
				$this->setConfigFromParams($oConfig, $sParamName, 'security', 'force_two_factor_auth', 'bool');
				break;
			case \RainLoop\Enumerations\Capa::GRAVATAR:
				$this->setConfigFromParams($oConfig, $sParamName, 'labs', 'allow_gravatar', 'bool');
				break;
			case \RainLoop\Enumerations\Capa::ATTACHMENT_THUMBNAILS:
				$this->setConfigFromParams($oConfig, $sParamName, 'interface', 'show_attachment_thumbnail', 'bool');
				break;
			case \RainLoop\Enumerations\Capa::THEMES:
				$this->setConfigFromParams($oConfig, $sParamName, 'webmail', 'allow_themes', 'bool');
				break;
			case \RainLoop\Enumerations\Capa::USER_BACKGROUND:
				$this->setConfigFromParams($oConfig, $sParamName, 'webmail', 'allow_user_background', 'bool');
				break;
			case \RainLoop\Enumerations\Capa::OPEN_PGP:
				$this->setConfigFromParams($oConfig, $sParamName, 'security', 'openpgp', 'bool');
				break;
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
//		sleep(3);
//		return $this->DefaultResponse(__FUNCTION__, false);

		$this->IsAdminLoggined();

		$oConfig = $this->Config();

		$self = $this;

		$this->setConfigFromParams($oConfig, 'Language', 'webmail', 'language', 'string', function ($sLanguage) use ($self) {
			return $self->ValidateLanguage($sLanguage, '', false);
		});

		$this->setConfigFromParams($oConfig, 'LanguageAdmin', 'webmail', 'language_admin', 'string', function ($sLanguage) use ($self) {
			return $self->ValidateLanguage($sLanguage, '', true);
		});

		$this->setConfigFromParams($oConfig, 'Theme', 'webmail', 'theme', 'string', function ($sTheme) use ($self) {
			return $self->ValidateTheme($sTheme);
		});

		$this->setConfigFromParams($oConfig, 'VerifySslCertificate', 'ssl', 'verify_certificate', 'bool');
		$this->setConfigFromParams($oConfig, 'AllowSelfSigned', 'ssl', 'allow_self_signed', 'bool');

		$this->setConfigFromParams($oConfig, 'UseLocalProxyForExternalImages', 'labs', 'use_local_proxy_for_external_images', 'bool');

		$this->setConfigFromParams($oConfig, 'NewMoveToFolder', 'interface', 'new_move_to_folder_button', 'bool');

		$this->setConfigFromParams($oConfig, 'AllowLanguagesOnSettings', 'webmail', 'allow_languages_on_settings', 'bool');
		$this->setConfigFromParams($oConfig, 'AllowLanguagesOnLogin', 'login', 'allow_languages_on_login', 'bool');
		$this->setConfigFromParams($oConfig, 'AttachmentLimit', 'webmail', 'attachment_size_limit', 'int');

		$this->setConfigFromParams($oConfig, 'LoginDefaultDomain', 'login', 'default_domain', 'string');

		$this->setConfigFromParams($oConfig, 'ContactsEnable', 'contacts', 'enable', 'bool');
		$this->setConfigFromParams($oConfig, 'ContactsSync', 'contacts', 'allow_sync', 'bool');
		$this->setConfigFromParams($oConfig, 'ContactsPdoDsn', 'contacts', 'pdo_dsn', 'string');
		$this->setConfigFromParams($oConfig, 'ContactsPdoUser', 'contacts', 'pdo_user', 'string');
		$this->setConfigFromParams($oConfig, 'ContactsPdoPassword', 'contacts', 'pdo_password', 'dummy');

		$this->setConfigFromParams($oConfig, 'ContactsPdoType', 'contacts', 'type', 'string', function ($sType) use ($self) {
			return $self->ValidateContactPdoType($sType);
		});

		$this->setCapaFromParams($oConfig, 'CapaAdditionalAccounts', \RainLoop\Enumerations\Capa::ADDITIONAL_ACCOUNTS);
		$this->setCapaFromParams($oConfig, 'CapaIdentities', \RainLoop\Enumerations\Capa::IDENTITIES);
		$this->setCapaFromParams($oConfig, 'CapaTemplates', \RainLoop\Enumerations\Capa::TEMPLATES);
		$this->setCapaFromParams($oConfig, 'CapaTwoFactorAuth', \RainLoop\Enumerations\Capa::TWO_FACTOR);
		$this->setCapaFromParams($oConfig, 'CapaTwoFactorAuthForce', \RainLoop\Enumerations\Capa::TWO_FACTOR_FORCE);
		$this->setCapaFromParams($oConfig, 'CapaOpenPGP', \RainLoop\Enumerations\Capa::OPEN_PGP);
		$this->setCapaFromParams($oConfig, 'CapaGravatar', \RainLoop\Enumerations\Capa::GRAVATAR);
		$this->setCapaFromParams($oConfig, 'CapaThemes', \RainLoop\Enumerations\Capa::THEMES);
		$this->setCapaFromParams($oConfig, 'CapaUserBackground', \RainLoop\Enumerations\Capa::USER_BACKGROUND);
		$this->setCapaFromParams($oConfig, 'CapaAttachmentThumbnails', \RainLoop\Enumerations\Capa::ATTACHMENT_THUMBNAILS);

		$this->setConfigFromParams($oConfig, 'DetermineUserLanguage', 'login', 'determine_user_language', 'bool');
		$this->setConfigFromParams($oConfig, 'DetermineUserDomain', 'login', 'determine_user_domain', 'bool');

		$this->setConfigFromParams($oConfig, 'Title', 'webmail', 'title', 'string');
		$this->setConfigFromParams($oConfig, 'LoadingDescription', 'webmail', 'loading_description', 'string');
		$this->setConfigFromParams($oConfig, 'FaviconUrl', 'webmail', 'favicon_url', 'string');

		$this->setConfigFromParams($oConfig, 'TokenProtection', 'security', 'csrf_protection', 'bool');
		$this->setConfigFromParams($oConfig, 'EnabledPlugins', 'plugins', 'enable', 'bool');

		$this->setConfigFromParams($oConfig, 'GoogleEnable', 'social', 'google_enable', 'bool');
		$this->setConfigFromParams($oConfig, 'GoogleEnableAuth', 'social', 'google_enable_auth', 'bool');
		$this->setConfigFromParams($oConfig, 'GoogleEnableAuthGmail', 'social', 'google_enable_auth_gmail', 'bool');
		$this->setConfigFromParams($oConfig, 'GoogleEnableDrive', 'social', 'google_enable_drive', 'bool');
		$this->setConfigFromParams($oConfig, 'GoogleEnablePreview', 'social', 'google_enable_preview', 'bool');
		$this->setConfigFromParams($oConfig, 'GoogleClientID', 'social', 'google_client_id', 'string');
		$this->setConfigFromParams($oConfig, 'GoogleClientSecret', 'social', 'google_client_secret', 'string');
		$this->setConfigFromParams($oConfig, 'GoogleApiKey', 'social', 'google_api_key', 'string');

		$this->setConfigFromParams($oConfig, 'FacebookEnable', 'social', 'fb_enable', 'bool');
		$this->setConfigFromParams($oConfig, 'FacebookAppID', 'social', 'fb_app_id', 'string');
		$this->setConfigFromParams($oConfig, 'FacebookAppSecret', 'social', 'fb_app_secret', 'string');

		$this->setConfigFromParams($oConfig, 'TwitterEnable', 'social', 'twitter_enable', 'bool');
		$this->setConfigFromParams($oConfig, 'TwitterConsumerKey', 'social', 'twitter_consumer_key', 'string');
		$this->setConfigFromParams($oConfig, 'TwitterConsumerSecret', 'social', 'twitter_consumer_secret', 'string');

		$this->setConfigFromParams($oConfig, 'DropboxEnable', 'social', 'dropbox_enable', 'bool');
		$this->setConfigFromParams($oConfig, 'DropboxApiKey', 'social', 'dropbox_api_key', 'string');

		$oPremProvider = $this->PremProvider();
		if ($oPremProvider)
		{
			$oPremProvider->PremSection($this, $oConfig);
		}

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
			$this->LoggerAuthHelper(null, $this->getAdditionalLogParamsByUserLogin($sLogin, true));
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::AuthError);
		}

		$sToken = $this->getAdminToken();
		$this->setAdminAuthToken($sToken);

		return $this->DefaultResponse(__FUNCTION__, $sToken ? true : false);
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

		$sTestMessage = $this->AddressBookProvider(null, true)->Test();
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
		$this->IsAdminLoggined();

		$bForce = '1' === (string) $this->GetActionParam('Force', '0');

		$mResult = false;
		$iErrorCode = -1;

		$oPremProvider = $this->PremProvider();

		if ($oPremProvider && 2 < \strlen(APP_SITE))
		{
			$sValue = $oPremProvider->Fetcher($bForce);

			$this->requestSleep();

			$iExpired = 0;
			if ($oPremProvider->Parser($sValue, $iExpired))
			{
				$mResult = array(
					'Banned' => false,
					'Expired' => $iExpired,
				);
			}
			else if ($sValue === 'NO' || \preg_match('/^EXPIRED:[\d]+$/', $sValue))
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
		$this->IsAdminLoggined();

		$sDomain = (string) $this->GetActionParam('Domain', '');
		$sKey = (string) $this->GetActionParam('Key', '');

		$mResult = false;
		$iErrorCode = -1;

		$oPrem = $this->PremProvider();

		if ($oPrem && 2 < \strlen($sDomain) && 2 < \strlen($sKey) && $sDomain === APP_SITE)
		{
			$iCode = 0;
			$sValue = $oPrem->Activate($sDomain, $sKey, $iCode);

			$this->requestSleep();

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

		$sLogin = \trim($this->GetActionParam('Login', ''));
		$sPassword = $this->GetActionParam('Password', '');
		$this->Logger()->AddSecret($sPassword);

		$sNewPassword = $this->GetActionParam('NewPassword', '');
		if (0 < \strlen(\trim($sNewPassword)))
		{
			$this->Logger()->AddSecret($sNewPassword);
		}

		if ($oConfig->ValidatePassword($sPassword))
		{
			if (0 < \strlen($sLogin))
			{
				$oConfig->Set('security', 'admin_login', $sLogin);
			}

			if (0 < \strlen(\trim($sNewPassword)))
			{
				$oConfig->SetPassword($sNewPassword);
			}

			$bResult = true;
		}

		return $this->DefaultResponse(__FUNCTION__, $bResult ?
			($oConfig->Save() ? array('Weak' => $oConfig->ValidatePassword('12345')) : false) : false);
	}

	/**
	 * @return array
	 */
	public function DoAdminDomainLoad()
	{
		$this->IsAdminLoggined();

		return $this->DefaultResponse(__FUNCTION__,
			$this->DomainProvider()->Load($this->GetActionParam('Name', ''), false, false));
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
		$bIncludeAliases = '1' === (string) $this->GetActionParam('IncludeAliases', '1');

		$iOffset = 0;
		$sSearch = '';
		$iLimit = $this->Config()->Get('labs', 'domain_list_limit', 99);

		return $this->DefaultResponse(__FUNCTION__,
			$this->DomainProvider()->GetList($iOffset, $iLimit, $sSearch, $bIncludeAliases));
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
			$oDomain instanceof \RainLoop\Model\Domain ? $this->DomainProvider()->Save($oDomain) : false);
	}

	/**
	 * @return array
	 */
	public function DoAdminDomainAliasSave()
	{
		$this->IsAdminLoggined();

		return $this->DefaultResponse(__FUNCTION__, $this->DomainProvider()->SaveAlias(
			(string) $this->GetActionParam('Name', ''),
			(string) $this->GetActionParam('Alias', '')
		));
	}

	/**
	 * @return array
	 */
	public function DoAdminDomainTest()
	{
		$this->IsAdminLoggined();

		$bImapResult = false;
		$sImapErrorDesc = '';
		$bSmtpResult = false;
		$sSmtpErrorDesc = '';
		$bSieveResult = false;
		$sSieveErrorDesc = '';

		$iImapTime = 0;
		$iSmtpTime = 0;
		$iSieveTime = 0;

		$iConnectionTimeout = 5;

		$oDomain = $this->DomainProvider()->LoadOrCreateNewFromAction($this, 'domain-test-connection.de');
		if ($oDomain)
		{
			try
			{
				$oImapClient = \MailSo\Imap\ImapClient::NewInstance()->SetLogger($this->Logger());
				$oImapClient->SetTimeOuts($iConnectionTimeout);

				$iTime = \microtime(true);
				$oImapClient->Connect($oDomain->IncHost(), $oDomain->IncPort(), $oDomain->IncSecure(),
					!!$this->Config()->Get('ssl', 'verify_certificate', false),
					!!$this->Config()->Get('ssl', 'allow_self_signed', true),
					$this->Config()->Get('ssl', 'client_cert', '')
				);

				$iImapTime = \microtime(true) - $iTime;
				$oImapClient->Disconnect();
				$bImapResult = true;
			}
			catch (\MailSo\Net\Exceptions\SocketCanNotConnectToHostException $oException)
			{
				$this->Logger()->WriteException($oException, \MailSo\Log\Enumerations\Type::ERROR);
				$sImapErrorDesc = $oException->getSocketMessage();
				if (empty($sImapErrorDesc))
				{
					$sImapErrorDesc = $oException->getMessage();
				}
			}
			catch (\Exception $oException)
			{
				$this->Logger()->WriteException($oException, \MailSo\Log\Enumerations\Type::ERROR);
				$sImapErrorDesc = $oException->getMessage();
			}

			if ($oDomain->OutUsePhpMail())
			{
				$bSmtpResult = \MailSo\Base\Utils::FunctionExistsAndEnabled('mail');
				if (!$bSmtpResult)
				{
					$sSmtpErrorDesc = 'PHP: mail() function is undefined';
				}
			}
			else
			{
				try
				{
					$oSmtpClient = \MailSo\Smtp\SmtpClient::NewInstance()->SetLogger($this->Logger());
					$oSmtpClient->SetTimeOuts($iConnectionTimeout);

					$iTime = \microtime(true);
					$oSmtpClient->Connect($oDomain->OutHost(), $oDomain->OutPort(),
						\MailSo\Smtp\SmtpClient::EhloHelper(), $oDomain->OutSecure(),
						!!$this->Config()->Get('ssl', 'verify_certificate', false),
						!!$this->Config()->Get('ssl', 'allow_self_signed', true)
					);

					$iSmtpTime = \microtime(true) - $iTime;
					$oSmtpClient->Disconnect();
					$bSmtpResult = true;
				}
				catch (\MailSo\Net\Exceptions\SocketCanNotConnectToHostException $oException)
				{
					$this->Logger()->WriteException($oException, \MailSo\Log\Enumerations\Type::ERROR);
					$sSmtpErrorDesc = $oException->getSocketMessage();
					if (empty($sSmtpErrorDesc))
					{
						$sSmtpErrorDesc = $oException->getMessage();
					}
				}
				catch (\Exception $oException)
				{
					$this->Logger()->WriteException($oException, \MailSo\Log\Enumerations\Type::ERROR);
					$sSmtpErrorDesc = $oException->getMessage();
				}
			}

			if ($oDomain->UseSieve())
			{
				try
				{
					$oSieveClient = \MailSo\Sieve\ManageSieveClient::NewInstance()->SetLogger($this->Logger());
					$oSieveClient->SetTimeOuts($iConnectionTimeout);
					$oSieveClient->__USE_INITIAL_AUTH_PLAIN_COMMAND = !!$this->Config()->Get('labs', 'sieve_auth_plain_initial', true);

					$iTime = \microtime(true);
					$oSieveClient->Connect($oDomain->SieveHost(), $oDomain->SievePort(), $oDomain->SieveSecure(),
						!!$this->Config()->Get('ssl', 'verify_certificate', false),
						!!$this->Config()->Get('ssl', 'allow_self_signed', true)
					);

					$iSieveTime = \microtime(true) - $iTime;
					$oSieveClient->Disconnect();
					$bSieveResult = true;
				}
				catch (\MailSo\Net\Exceptions\SocketCanNotConnectToHostException $oException)
				{
					$this->Logger()->WriteException($oException, \MailSo\Log\Enumerations\Type::ERROR);
					$sSieveErrorDesc = $oException->getSocketMessage();
					if (empty($sSieveErrorDesc))
					{
						$sSieveErrorDesc = $oException->getMessage();
					}
				}
				catch (\Exception $oException)
				{
					$this->Logger()->WriteException($oException, \MailSo\Log\Enumerations\Type::ERROR);
					$sSieveErrorDesc = $oException->getMessage();
				}
			}
			else
			{
				$bSieveResult = true;
			}
		}

		return $this->DefaultResponse(__FUNCTION__, array(
			'Imap' => $bImapResult ? true : $sImapErrorDesc,
			'Smtp' => $bSmtpResult ? true : $sSmtpErrorDesc,
			'Sieve' => $bSieveResult ? true : $sSieveErrorDesc
		));
	}

	/**
	 * @return string
	 */
	private function rainLoopRepo()
	{
		$sUrl = APP_REPOSITORY_PATH;
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
			@is_writable(APP_INDEX_ROOT_PATH.'rainloop/') &&
			APP_VERSION !== APP_DEV_VERSION
		;
	}

	private function rainLoopCoreAccess()
	{
		$sCoreAccess = \strtolower(\preg_replace('/[\s,;]+/', ' ',
			$this->Config()->Get('security', 'core_install_access_domain', '')));

		return '' === $sCoreAccess || '*' === $sCoreAccess || APP_SITE === $sCoreAccess;
	}

	/**
	 * @param string $sRepo
	 * @param bool $bReal = false
	 *
	 * @return array
	 */
	private function getRepositoryDataByUrl($sRepo, &$bReal = false)
	{
		$bReal = false;
		$aRep = null;

		$sRep = '';
		$sRepoFile = 'repository.json';
		$iRepTime = 0;

		$oHttp = \MailSo\Base\Http::SingletonInstance();

		$sCacheKey = \RainLoop\KeyPathHelper::RepositoryCacheFile($sRepo, $sRepoFile);
		$sRep = $this->Cacher()->Get($sCacheKey);
		if ('' !== $sRep)
		{
			$iRepTime = $this->Cacher()->GetTimer($sCacheKey);
		}

		if ('' === $sRep || 0 === $iRepTime || \time() - 3600 > $iRepTime)
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

					if ('plugin' === $oItem->type)
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

	/**
	 * @return string
	 */
	private function getCoreChannel()
	{
		$sChannel = \trim(\strtolower($this->Config()->Get('labs', 'update_channel', 'stable')));
		if (empty($sChannel) || !\in_array($sChannel, array('stable', 'beta')))
		{
			$sChannel = 'stable';
		}

		return $sChannel;
	}

	private function getCoreData(&$bReal)
	{
		$bReal = false;

		$sChannel = $this->getCoreChannel();

		$sRepo = \str_replace('{{channel}}', $sChannel, APP_REPO_CORE_FILE);

		$oHttp = \MailSo\Base\Http::SingletonInstance();

		$sCacheKey = \RainLoop\KeyPathHelper::RepositoryCacheCore($sRepo);
		$sRep = $this->Cacher()->Get($sCacheKey);
		if ('' !== $sRep)
		{
			$iRepTime = $this->Cacher()->GetTimer($sCacheKey);
		}

		if ('' === $sRep || 0 === $iRepTime || \time() - 3600 > $iRepTime)
		{
			$iCode = 0;
			$sContentType = '';

			$sRep = '' !== $sRepo ? $oHttp->GetUrlAsString($sRepo, 'RainLoop', $sContentType, $iCode, $this->Logger(), 10,
				$this->Config()->Get('labs', 'curl_proxy', ''), $this->Config()->Get('labs', 'curl_proxy_auth', '')) : false;

			if (false !== $sRep)
			{
				$aRep = @\json_decode($sRep, true, 10);
				$bReal = \is_array($aRep) && 0 < \count($aRep) && isset($aRep['id']) && 'rainloop' === $aRep['id'];

				if ($bReal)
				{
					$this->Cacher()->Set($sCacheKey, $sRep);
					$this->Cacher()->SetTimer($sCacheKey);
				}
			}
			else
			{
				$this->Logger()->Write('Cannot read remote repository file: '.$sRepo, \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
			}
		}
		else if ('' !== $sRep)
		{
			$aRep = @\json_decode($sRep, true, 10);
			$bReal = \is_array($aRep) && 0 < \count($aRep) && isset($aRep['id']) && 'rainloop' === $aRep['id'];
		}

		return $bReal ? $aRep : false;
	}

	private function getRepositoryData(&$bReal, &$bRainLoopUpdatable)
	{
		$bRainLoopUpdatable = $this->rainLoopUpdatable();

		$aResult = $this->getRepositoryDataByUrl($this->rainLoopRepo(), $bReal);

		$aSub = array();
		if (\is_array($aResult))
		{
			foreach ($aResult as $aItem)
			{
				if ('plugin' === $aItem['type'])
				{
					$aSub[] = $aItem;
				}
			}

			$aResult = $aSub;
			unset($aSub);
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
			$aItem['canBeInstalled'] = true;
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
	public function DoAdminCoreData()
	{
		$this->IsAdminLoggined();

		$bReal = false;
		$aData = array();

		$bRainLoopUpdatable = $this->rainLoopUpdatable();
		$bRainLoopAccess = $this->rainLoopCoreAccess();

		if ($bRainLoopAccess)
		{
			$aData = $this->getCoreData($bReal);
		}

		$sVersion = empty($aData['version']) ? '' : $aData['version'];
		$sType = empty($aData['channel']) ? 'stable' : $aData['channel'];

		$sWarnings = empty($aData['warnings']) ? '' : $aData['warnings'];
		$aWarnings = $sWarnings ? explode('|', $sWarnings) : array();

		$sCurrentVersion = APP_VERSION;

		$bShowWarning = false;
		if ($sCurrentVersion !== APP_DEV_VERSION)
		{
			foreach ($aWarnings as $sWarningVersion)
			{
				$sWarningVersion = \trim($sWarningVersion);

				if (\version_compare($sCurrentVersion, $sWarningVersion, '<') &&
					\version_compare($sVersion, $sWarningVersion, '>='))
				{
					$bShowWarning = true;
					break;
				}
			}
		}

		return $this->DefaultResponse(__FUNCTION__, array(
			 'Real' => $bReal,
			 'Access' => $bRainLoopAccess,
			 'Updatable' => $bRainLoopUpdatable,
			 'Warning' => $bShowWarning,
			 'Channel' => $this->getCoreChannel(),
			 'Type' => $sType,
			 'Version' => $sCurrentVersion,
			 'RemoteVersion' => $sVersion,
			 'RemoteRelease' => empty($aData['release']) ? '' : $aData['release'],
			 'VersionCompare' => \version_compare($sCurrentVersion, $sVersion)
		));
	}

	/**
	 * @return array
	 */
	public function DoAdminUpdateCoreData()
	{
		$this->IsAdminLoggined();

		$bReal = false;

		$bRainLoopUpdatable = $this->rainLoopUpdatable();
		$bRainLoopAccess = $this->rainLoopCoreAccess();
		$oPremProvider = $this->PremProvider();

		$aData = array();
		if ($bRainLoopUpdatable && $bRainLoopAccess)
		{
			$aData = $this->getCoreData($bReal);
		}

		$bResult = false;
		if ($bReal && $oPremProvider && !empty($aData['file']))
		{
			$bResult = $oPremProvider->UpdateCore($this, $aData['file']);
		}

		return $this->DefaultResponse(__FUNCTION__, $bResult);
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
	 * @param string $sUrl
	 *
	 * @return string
	 */
	public function downloadRemotePackageByUrl($sUrl)
	{
		$bResult = false;
		$sTmp = APP_PRIVATE_DATA.\md5(\microtime(true).$sUrl).'.zip';
		$pDest = @\fopen($sTmp, 'w+b');
		if ($pDest)
		{
			$iCode = 0;
			$sContentType = '';

			@\set_time_limit(120);

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

		return $bResult ? $sTmp : '';
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

		if ('plugin' === $sType)
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
			$sUrl = $this->rainLoopRepo().$sRealFile;
			$sTmp = $this->downloadRemotePackageByUrl($sUrl);
		}

		if ('' !== $sTmp)
		{
			include_once APP_VERSION_ROOT_PATH.'app/libraries/pclzip/pclzip.lib.php';

			$oArchive = new \PclZip($sTmp);
			if ('plugin' === $sType)
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
			if ($oPlugin && ($oPlugin instanceof \RainLoop\Plugins\AbstractPlugin))
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
						if ($oItem && ($oItem instanceof \RainLoop\Plugins\Property))
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
		if (!$this->GetCapa(false, false, \RainLoop\Enumerations\Capa::SETTINGS, $oAccount))
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

		if ($this->GetCapa(false, false, \RainLoop\Enumerations\Capa::THEMES, $oAccount))
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
			return (int) (\in_array((int) $iValue, array(\RainLoop\Enumerations\Layout::NO_PREVIEW,
				\RainLoop\Enumerations\Layout::SIDE_PREVIEW, \RainLoop\Enumerations\Layout::BOTTOM_PREVIEW)) ?
					$iValue : \RainLoop\Enumerations\Layout::SIDE_PREVIEW);
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
		$mResult = false;

		$oAccount = $this->getAccountFromToken();
		if ($oAccount)
		{
			try
			{
				$mResult = $this->ChangePasswordProvider()->ChangePassword(
					$oAccount,
					$this->GetActionParam('PrevPassword', ''),
					$this->GetActionParam('NewPassword', '')
				);
			}
			catch (\Exception $oException)
			{
				$this->loginErrorDelay();
				$this->Logger()->Write('Error: Can\'t change password for '.$oAccount->Email().' account.', \MailSo\Log\Enumerations\Type::NOTICE);

				throw $oException;
			}
		}

		return $this->DefaultResponse(__FUNCTION__, $mResult);
	}

	/**
	 * @return array
	 */
	public function DoWelcomeClose()
	{
		$oAccount = $this->getAccountFromToken();
		if ($oAccount && !$oAccount->IsAdditionalAccount())
		{
			$oSettings = $this->SettingsProvider()->Load($oAccount);
			$oSettings->SetConf('LastWelcomePage',
				$this->Config()->Get('branding', 'welcome_page_url', ''));

			return $this->DefaultResponse(__FUNCTION__,
				$this->SettingsProvider()->Save($oAccount, $oSettings));
		}

		return $this->FalseResponse(__FUNCTION__);
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
	 * @param \RainLoop\Model\Account $oAccount
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

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param \MailSo\Mail\FolderCollection $oFolders
	 * @param array $aResult
	 * @param bool $bListFolderTypes = true
	 */
	private function recFoldersTypes($oAccount, $oFolders, &$aResult, $bListFolderTypes = true)
	{
		if ($oFolders)
		{
			$aFolders =& $oFolders->GetAsArray();
			if (\is_array($aFolders) && 0 < \count($aFolders))
			{
				if ($bListFolderTypes)
				{
					foreach ($aFolders as $oFolder)
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

					foreach ($aFolders as $oFolder)
					{
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

				foreach ($aFolders as $oFolder)
				{
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
		$oAccount = $this->initMailClientConnection();

		$oFolderCollection = null;
		$this->Plugins()->RunHook('filter.folders-before', array($oAccount, &$oFolderCollection));

		$bUseFolders = $this->GetCapa(false, false, \RainLoop\Enumerations\Capa::FOLDERS, $oAccount);

		if (null === $oFolderCollection)
		{
			$oFolderCollection = $this->MailClient()->Folders('',
				$bUseFolders ? '*' : 'INBOX',
				!!$this->Config()->Get('labs', 'use_imap_list_subscribe', true),
				(int) $this->Config()->Get('labs', 'imap_folder_list_limit', 200)
			);
		}

		$this->Plugins()->RunHook('filter.folders-post', array($oAccount, &$oFolderCollection));

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
								catch (\Exception $oException)
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

		$this->Plugins()->RunHook('filter.folders-complete', array($oAccount, &$oFolderCollection));

		return $this->DefaultResponse(__FUNCTION__, $oFolderCollection);
	}

	/**
	 * @return array
	 */
	public function DoFolderCreate()
	{
		$oAccount = $this->initMailClientConnection();

		if (!$this->GetCapa(false, false, \RainLoop\Enumerations\Capa::FOLDERS, $oAccount))
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
		$oAccount = $this->initMailClientConnection();

		if (!$this->GetCapa(false, false, \RainLoop\Enumerations\Capa::FOLDERS, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$sFolderFullNameRaw = $this->GetActionParam('Folder', '');
		$bSubscribe = '1' === (string) $this->GetActionParam('Subscribe', '0');

		try
		{
			$this->MailClient()->FolderSubscribe($sFolderFullNameRaw, !!$bSubscribe);
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
	 */
	public function DoFolderCheckable()
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, false, \RainLoop\Enumerations\Capa::FOLDERS, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$sFolderFullNameRaw = $this->GetActionParam('Folder', '');
		$bCheckable = '1' === (string) $this->GetActionParam('Checkable', '0');

		$oSettingsLocal = $this->SettingsProvider(true)->Load($oAccount);

		$sCheckableFolder = $oSettingsLocal->GetConf('CheckableFolder', '[]');
		$aCheckableFolder = @\json_decode($sCheckableFolder);

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

		$oSettingsLocal->SetConf('CheckableFolder', @\json_encode($aCheckableFolder));

		return $this->DefaultResponse(__FUNCTION__,
			$this->SettingsProvider(true)->Save($oAccount, $oSettingsLocal));
	}

	/**
	 * @return array
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoFolderRename()
	{
		$oAccount = $this->initMailClientConnection();

		if (!$this->GetCapa(false, false, \RainLoop\Enumerations\Capa::FOLDERS, $oAccount))
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
		$oAccount = $this->initMailClientConnection();

		if (!$this->GetCapa(false, false, \RainLoop\Enumerations\Capa::FOLDERS, $oAccount))
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
			$aInboxInformation = $this->MailClient()->FolderInformation(
				$sFolder, $sPrevUidNext, $aFlagsFilteredUids
			);

			if (\is_array($aInboxInformation) && isset($aInboxInformation['Flags']) && \is_array($aInboxInformation['Flags']))
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
						$aInboxInformation = $this->MailClient()->FolderInformation($sFolder, '', array());
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
//		\sleep(1);
//		throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CantGetMessageList);

		$sFolder = '';
		$iOffset = 0;
		$iLimit = 20;
		$sSearch = '';
		$sUidNext = '';
		$bUseThreads = false;
		$sThreadUid = '';

		$sRawKey = $this->GetActionParam('RawKey', '');
		$aValues = $this->getDecodedClientRawKeyValue($sRawKey, 9);

		if (\is_array($aValues) && 7 < \count($aValues))
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
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CantGetMessageList);
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
	 * @param \RainLoop\Model\Account $oAccount
	 * @param bool $bWithDraftInfo = true
	 *
	 * @return \MailSo\Mime\Message
	 */
	private function buildMessage($oAccount, $bWithDraftInfo = true)
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

		$oMessage = \MailSo\Mime\Message::NewInstance();

		if (!$this->Config()->Get('security', 'hide_x_mailer_header', false))
		{
			$oMessage->SetXMailer('RainLoop/'.APP_VERSION);
		} else {
			$oMessage->DoesNotAddDefaultXMailer();
		}

		$oFromIdentity = $this->GetIdentityByID($oAccount, $sIdentityID);
		if ($oFromIdentity)
		{
			$oMessage->SetFrom(\MailSo\Mime\Email::NewInstance(
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
			$oReplyTo = \MailSo\Mime\EmailCollection::NewInstance($sReplyTo);
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
	 * @param \RainLoop\Model\Account $oAccount
	 *
	 * @return void
	 */
	private function deleteMessageAttachmnets($oAccount)
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

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 *
	 * @return \MailSo\Mime\Message
	 */
	private function buildReadReceiptMessage($oAccount)
	{
		$sReadReceipt = $this->GetActionParam('ReadReceipt', '');
		$sSubject = $this->GetActionParam('Subject', '');
		$sText = $this->GetActionParam('Text', '');

		$oIdentity = $this->GetAccountIdentity($oAccount);

		if (empty($sReadReceipt) || empty($sSubject) || empty($sText) || !$oIdentity)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::UnknownError);
		}

		$oMessage = \MailSo\Mime\Message::NewInstance();

		if (!$this->Config()->Get('security', 'hide_x_mailer_header', false))
		{
			$oMessage->SetXMailer('RainLoop/'.APP_VERSION);
		}

		$oMessage->SetFrom(\MailSo\Mime\Email::NewInstance($oIdentity->Email(), $oIdentity->Name()));

		$oFrom = $oMessage->GetFrom();
		$oMessage->RegenerateMessageId($oFrom ? $oFrom->GetDomain() : '');

		$sReplyTo = $oIdentity->ReplyTo();
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

		if (!$this->GetCapa(false, false, \RainLoop\Enumerations\Capa::COMPOSER, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

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
	 *
	 * @param \RainLoop\Model\Account $oAccount
	 * @param \MailSo\Mime\Message $oMessage
	 * @param resource $rMessageStream
	 * @param bool $bDsn = false
	 * @param bool $bAddHiddenRcpt = true
	 *
	 * @throws \RainLoop\Exceptions\ClientException
	 * @throws \MailSo\Net\Exceptions\ConnectionException
	 */
	private function smtpSendMessage($oAccount, $oMessage,
		&$rMessageStream, &$iMessageStreamSize, $bDsn = false, $bAddHiddenRcpt = true)
	{
		$oRcpt = $oMessage->GetRcpt();
		if ($oRcpt && 0 < $oRcpt->Count())
		{
			$this->Plugins()->RunHook('filter.smtp-message-stream',
				array($oAccount, &$rMessageStream, &$iMessageStreamSize));

			$this->Plugins()->RunHook('filter.message-rcpt', array($oAccount, &$oRcpt));

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

				$oSmtpClient = \MailSo\Smtp\SmtpClient::NewInstance()->SetLogger($this->Logger());
				$oSmtpClient->SetTimeOuts(10, (int) \RainLoop\Api::Config()->Get('labs', 'smtp_timeout', 60));

				$bLoggined = $oAccount->OutConnectAndLoginHelper(
					$this->Plugins(), $oSmtpClient, $this->Config(), array($this, 'googleRefreshTokenCallback'), $bUsePhpMail
				);

				if ($bUsePhpMail)
				{
					if (\MailSo\Base\Utils::FunctionExistsAndEnabled('mail'))
					{
						$aToCollection = $oMessage->GetTo();
						if ($aToCollection && $oFrom)
						{
							$sRawBody = @\stream_get_contents($rMessageStream);
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
									throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CantSendMessage);
								}
							}
						}
					}
					else
					{
						throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CantSendMessage);
					}
				}
				else if ($oSmtpClient->IsConnected())
				{
					if (!empty($sFrom))
					{
						$oSmtpClient->MailFrom($sFrom, '', $bDsn);
					}

					$aRcpt =& $oRcpt->GetAsArray();
					foreach ($aRcpt as /* @var $oEmail \MailSo\Mime\Email */ $oEmail)
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

		if (!$this->GetCapa(false, false, \RainLoop\Enumerations\Capa::COMPOSER, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$oConfig = $this->Config();

		$sDraftFolder = $this->GetActionParam('MessageFolder', '');
		$sDraftUid = $this->GetActionParam('MessageUid', '');
		$sSentFolder = $this->GetActionParam('SentFolder', '');
		$aDraftInfo = $this->GetActionParam('DraftInfo', null);
		$bDsn = '1' === (string) $this->GetActionParam('Dsn', '0');

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
						catch (\Exception $oException)
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

								$this->Plugins()->RunHook('filter.sent-message-stream',
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

								$this->Plugins()->RunHook('filter.sent-message-stream',
									array($oAccount, &$rAppendMessageStream, &$iAppendMessageStreamSize));

								$this->MailClient()->MessageAppendStream(
									$rAppendMessageStream, $iAppendMessageStreamSize, $sSentFolder, array(
										\MailSo\Imap\Enumerations\MessageFlag::SEEN
									));

								if (\is_resource($rAppendMessageStream))
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

					$this->deleteMessageAttachmnets($oAccount);

					if (0 < \strlen($sDraftFolder) && 0 < \strlen($sDraftUid))
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

		try
		{
			if ($oMessage && $this->AddressBookProvider($oAccount)->IsActive())
			{
				$aArrayToFrec = array();
				$oToCollection = $oMessage->GetTo();
				if ($oToCollection)
				{
					$aTo =& $oToCollection->GetAsArray();
					foreach ($aTo as /* @var $oEmail \MailSo\Mime\Email */ $oEmail)
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
		catch (\Exception $oException)
		{
			$this->Logger()->WriteException($oException);
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	/**
	 * @return array
	 */
	public function DoSendReadReceiptMessage()
	{
		$oAccount = $this->initMailClientConnection();

		if (!$this->GetCapa(false, false, \RainLoop\Enumerations\Capa::COMPOSER, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

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
					$this->smtpSendMessage($oAccount, $oMessage, $rMessageStream, $iMessageStreamSize, false, false);

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

						$this->Cacher($oAccount)->Set(\RainLoop\KeyPathHelper::ReadReceiptCache($oAccount->Email(), $sFolderFullName, $sUid), '1');

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
		$oAccount = $this->initMailClientConnection();

		if (!$this->GetCapa(false, false, \RainLoop\Enumerations\Capa::QUOTA, $oAccount))
		{
			return $this->DefaultResponse(__FUNCTION__, array(0, 0, 0, 0));
		}

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

	private function getContactsSyncData($oAccount)
	{
		$mResult = null;

		$sData = $this->StorageProvider()->Get($oAccount,
			\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
			'contacts_sync'
		);

		if (!empty($sData))
		{
			$mData = \RainLoop\Utils::DecodeKeyValues($sData);
			if (\is_array($mData))
			{
				$mResult = array(
					'Enable' => isset($mData['Enable']) ? !!$mData['Enable'] : false,
					'Url' => isset($mData['Url']) ? \trim($mData['Url']) : '',
					'User' => isset($mData['User']) ? \trim($mData['User']) : '',
					'Password' => isset($mData['Password']) ? $mData['Password'] : ''
				);
			}
		}

		return $mResult;
	}

	/**
	 * @return array
	 */
	public function DoSaveContactsSyncData()
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
			\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
			'contacts_sync',
			\RainLoop\Utils::EncodeKeyValues(array(
				'Enable' => $bEnabled,
				'User' => $sUser,
				'Password' => APP_DUMMY === $sPassword && isset($mData['Password']) ?
					$mData['Password'] : (APP_DUMMY === $sPassword ? '' : $sPassword),
				'Url' => $sUrl
			))
		);

		return $this->DefaultResponse(__FUNCTION__, $bResult);
	}

	/**
	 * @return array
	 */
	public function DoContactsSync()
	{
		$bResult = false;
		$oAccount = $this->getAccountFromToken();

		$oAddressBookProvider = $this->AddressBookProvider($oAccount);
		if ($oAddressBookProvider && $oAddressBookProvider->IsActive())
		{
			$mData = $this->getContactsSyncData($oAccount);
			if (\is_array($mData) && isset($mData['Enable'], $mData['User'], $mData['Password'], $mData['Url']) && $mData['Enable'])
			{
				$bResult = $oAddressBookProvider->Sync(
					$oAccount->ParentEmailHelper(),
					$mData['Url'], $mData['User'], $mData['Password']);
			}
		}

		if (!$bResult)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::ContactsSyncError);
		}

		return $this->TrueResponse(__FUNCTION__);
	}

	private function getTwoFactorInfo($oAccount, $bRemoveSecret = false)
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
				\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
				'two_factor'
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

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sCode
	 *
	 * @return bool
	 */
	private function removeBackupCodeFromTwoFactorInfo($oAccount, $sCode)
	{
		if (!$oAccount || empty($sCode))
		{
			return false;
		}

		$sData = $this->StorageProvider()->Get($oAccount,
			\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
			'two_factor'
		);

		if ($sData)
		{
			$mData = \RainLoop\Utils::DecodeKeyValues($sData);

			if (!empty($mData['BackupCodes']))
			{
				$sBackupCodes = \preg_replace('/[^\d]+/', ' ', ' '.$mData['BackupCodes'].' ');
				$sBackupCodes = \str_replace(' '.$sCode.' ', '', $sBackupCodes);

				$mData['BackupCodes'] = \trim(\preg_replace('/[^\d]+/', ' ', $sBackupCodes));

				return $this->StorageProvider()->Put($oAccount,
					\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
					'two_factor',
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
		$oAccount = $this->getAccountFromToken();

		if (!$this->TwoFactorAuthProvider()->IsActive() ||
			!$this->GetCapa(false, false, \RainLoop\Enumerations\Capa::TWO_FACTOR, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		return $this->DefaultResponse(__FUNCTION__,
			$this->getTwoFactorInfo($oAccount, true));
	}

	/**
	 * @return array
	 */
	public function DoCreateTwoFactorSecret()
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->TwoFactorAuthProvider()->IsActive() ||
			!$this->GetCapa(false, false, \RainLoop\Enumerations\Capa::TWO_FACTOR, $oAccount))
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
			\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
			'two_factor',
			\RainLoop\Utils::EncodeKeyValues(array(
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

	/**
	 * @return array
	 */
	public function DoShowTwoFactorSecret()
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->TwoFactorAuthProvider()->IsActive() ||
			!$this->GetCapa(false, false, \RainLoop\Enumerations\Capa::TWO_FACTOR, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$aResult = $this->getTwoFactorInfo($oAccount);
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
		$oAccount = $this->getAccountFromToken();

		if (!$this->TwoFactorAuthProvider()->IsActive() ||
			!$this->GetCapa(false, false, \RainLoop\Enumerations\Capa::TWO_FACTOR, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$sEmail = $oAccount->ParentEmailHelper();

		$bResult = false;
		$mData = $this->getTwoFactorInfo($oAccount);
		if (isset($mData['Secret'], $mData['BackupCodes']))
		{
			$bResult = $this->StorageProvider()->Put($oAccount,
				\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
				'two_factor',
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
		$oAccount = $this->getAccountFromToken();

		if (!$this->TwoFactorAuthProvider()->IsActive() ||
			!$this->GetCapa(false, false, \RainLoop\Enumerations\Capa::TWO_FACTOR, $oAccount))
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

	/**
	 * @return array
	 */
	public function DoClearTwoFactorInfo()
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->TwoFactorAuthProvider()->IsActive() ||
			!$this->GetCapa(false, false, \RainLoop\Enumerations\Capa::TWO_FACTOR, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$this->StorageProvider()->Clear($oAccount,
			\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
			'two_factor'
		);

		return $this->DefaultResponse(__FUNCTION__,
			$this->getTwoFactorInfo($oAccount, true));
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
		if (0 < \count($aFilteredUids) && $this->AddressBookProvider($oAccount)->IsActive())
		{
			$bResult = $this->AddressBookProvider($oAccount)->DeleteContacts($oAccount->ParentEmailHelper(), $aFilteredUids);
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
				$oContact = new \RainLoop\Providers\AddressBook\Classes\Contact();
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
						$oProp = new \RainLoop\Providers\AddressBook\Classes\Property();
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
			catch (\Exception $oException)
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

		$aResult = \RainLoop\Utils::RemoveSuggestionDuplicates($aResult);
		if ($iLimit < \count($aResult))
		{
			$aResult = \array_slice($aResult, 0, $iLimit);
		}

		$this->Plugins()->RunHook('ajax.suggestions-post', array(&$aResult, $sQuery, $oAccount, $iLimit));

		$aResult = \RainLoop\Utils::RemoveSuggestionDuplicates($aResult);
		if ($iLimit < \count($aResult))
		{
			$aResult = \array_slice($aResult, 0, $iLimit);
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
			$this->MailClient()->{$sActionFunction}($sFolder, $aFilteredUids, true, $bSetAction, true);
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
		$sThreadUids = \trim($this->GetActionParam('ThreadUids', ''));

		try
		{
			$this->MailClient()->MessageSetSeenToAll($sFolder, $bSetAction,
				!empty($sThreadUids) ? explode(',', $sThreadUids) : null);
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
				$this->cacherForThreads(),
				(int) $this->Config()->Get('labs', 'imap_body_text_limit', 0)
			);
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
		catch (\Exception $oException)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CantDeleteMessage, $oException);
		}

		if ($this->Config()->Get('labs', 'use_imap_unselect', true))
		{
			try
			{
				$this->MailClient()->FolderUnSelect();
			}
			catch (\Exception $oException)
			{
				unset($oException);
			}
		}

		$sHash = '';

		try
		{
			$sHash = $this->MailClient()->FolderHash($sFolder);
		}
		catch (\Exception $oException)
		{
			unset($oException);
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
			catch (\Exception $oException)
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
		catch (\Exception $oException)
		{
			throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::CantMoveMessage, $oException);
		}

		if ($this->Config()->Get('labs', 'use_imap_unselect', true))
		{
			try
			{
				$this->MailClient()->FolderUnSelect();
			}
			catch (\Exception $oException)
			{
				unset($oException);
			}
		}

		$sHash = '';

		try
		{
			$sHash = $this->MailClient()->FolderHash($sFromFolder);
		}
		catch (\Exception $oException)
		{
			unset($oException);
		}

		return $this->DefaultResponse(__FUNCTION__, '' === $sHash ? false : array($sFromFolder, $sHash));
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
	 * @param int $iMaxLength = 250
	 *
	 * @return string
	 */
	public function MainClearFileName($sFileName, $sContentType, $sMimeIndex, $iMaxLength = 250)
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
			if (\is_array($aAttachments) && 0 < \count($aAttachments))
			{
				$mResult = array();
				foreach ($aAttachments as $sAttachment)
				{
					$aValues = \RainLoop\Utils::DecodeKeyValuesQ($sAttachment);
					if (\is_array($aValues))
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
	public function DoComposeUploadDrive()
	{
		$oAccount = $this->getAccountFromToken();

		$mResult = false;

		$sUrl = $this->GetActionParam('Url', '');
		$sAccessToken = $this->GetActionParam('AccessToken', '');
		$sGoogleApiKey = (string) $this->Config()->Get('social', 'google_api_key', '');

		if (0 < \strlen($sUrl) && 0 < \strlen($sAccessToken) && 0 < \strlen($sGoogleApiKey))
		{
			$oHttp = \MailSo\Base\Http::SingletonInstance();

			$mResult[$sUrl] = false;

			$sTempName = \md5($sUrl);

			$iCode = 0;
			$sContentType = '';

			$rFile = $this->FilesProvider()->GetFile($oAccount, $sTempName, 'wb+');
			if ($rFile && $oHttp->SaveUrlToFile($sUrl.'&key='.$sGoogleApiKey, $rFile, '', $sContentType, $iCode, $this->Logger(), 60,
					$this->Config()->Get('labs', 'curl_proxy', ''), $this->Config()->Get('labs', 'curl_proxy_auth', ''),
					array('Authorization: Bearer '.$sAccessToken)))
			{
				$mResult[$sUrl] = array($sTempName, 0);
			}

			if (\is_resource($rFile))
			{
				@\fclose($rFile);
			}

			if (isset($mResult[$sUrl][1]))
			{
				$mResult[$sUrl][1] = $rFile = $this->FilesProvider()->FileSize($oAccount, $sTempName);
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

		$aResponse = array();

		$aFile = $this->GetActionParam('File', null);
		$iError = $this->GetActionParam('Error', \RainLoop\Enumerations\UploadError::UNKNOWN);

		if ($oAccount && UPLOAD_ERR_OK === $iError && \is_array($aFile))
		{
			$sSavedName = 'upload-post-'.\md5($aFile['name'].$aFile['tmp_name']);
			if (!$this->FilesProvider()->MoveUploadedFile($oAccount, $sSavedName, $aFile['tmp_name']))
			{
				$iError = \RainLoop\Enumerations\UploadError::ON_SAVING;
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
			$iClientError = \RainLoop\Enumerations\UploadClientError::NORMAL;
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
	public function DoClearUserBackground()
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, false, \RainLoop\Enumerations\Capa::USER_BACKGROUND, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$oSettings = $this->SettingsProvider()->Load($oAccount);
		if ($oAccount && $oSettings)
		{
			$this->StorageProvider()->Clear($oAccount,
				\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
				'background'
			);

			$oSettings->SetConf('UserBackgroundName', '');
			$oSettings->SetConf('UserBackgroundHash', '');
		}

		return $this->DefaultResponse(__FUNCTION__, $oAccount && $oSettings ?
			$this->SettingsProvider()->Save($oAccount, $oSettings) : false);
	}

	/**
	 * @return array
	 */
	public function UploadBackground()
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, false, \RainLoop\Enumerations\Capa::USER_BACKGROUND, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$sName = '';
		$sHash = '';

		$aFile = $this->GetActionParam('File', null);
		$iError = $this->GetActionParam('Error', \RainLoop\Enumerations\UploadError::UNKNOWN);

		if ($oAccount && UPLOAD_ERR_OK === $iError && \is_array($aFile))
		{
			$sMimeType = \strtolower(\MailSo\Base\Utils::MimeContentType($aFile['name']));
			if (\in_array($sMimeType, array('image/png', 'image/jpg', 'image/jpeg')))
			{
				$sSavedName = 'upload-post-'.\md5($aFile['name'].$aFile['tmp_name']);
				if (!$this->FilesProvider()->MoveUploadedFile($oAccount, $sSavedName, $aFile['tmp_name']))
				{
					$iError = \RainLoop\Enumerations\UploadError::ON_SAVING;
				}
				else
				{
					$rData = $this->FilesProvider()->GetFile($oAccount, $sSavedName);
					if (@\is_resource($rData))
					{
						$sData = @\stream_get_contents($rData);
						if (!empty($sData) && 0 < \strlen($sData))
						{
							$sName = $aFile['name'];
							if (empty($sName))
							{
								$sName = '_';
							}

							if ($this->StorageProvider()->Put($oAccount,
								\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
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

					if (@\is_resource($rData))
					{
						@\fclose($rData);
					}

					unset($rData);
				}

				$this->FilesProvider()->Clear($oAccount, $sSavedName);
			}
			else
			{
				$iError = \RainLoop\Enumerations\UploadError::FILE_TYPE;
			}
		}

		if (UPLOAD_ERR_OK !== $iError)
		{
			$iClientError = \RainLoop\Enumerations\UploadClientError::NORMAL;
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

	/**
	 * @return array
	 */
	public function UploadContacts()
	{
		$oAccount = $this->getAccountFromToken();

		$mResponse = false;

		$aFile = $this->GetActionParam('File', null);
		$iError = $this->GetActionParam('Error', \RainLoop\Enumerations\UploadError::UNKNOWN);

		if ($oAccount && UPLOAD_ERR_OK === $iError && \is_array($aFile))
		{
			$sSavedName = 'upload-post-'.\md5($aFile['name'].$aFile['tmp_name']);
			if (!$this->FilesProvider()->MoveUploadedFile($oAccount, $sSavedName, $aFile['tmp_name']))
			{
				$iError = \RainLoop\Enumerations\UploadError::ON_SAVING;
			}
			else
			{
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
					@\fclose($mData);
				}

				unset($mData);
				$this->FilesProvider()->Clear($oAccount, $sSavedName);

				@\ini_set('auto_detect_line_endings', false);
			}
		}

		if (UPLOAD_ERR_OK !== $iError)
		{
			$iClientError = \RainLoop\Enumerations\UploadClientError::NORMAL;
			$sError = $this->getUploadErrorMessageByCode($iError, $iClientError);

			if (!empty($sError))
			{
				return $this->FalseResponse(__FUNCTION__, $iClientError, $sError);
			}
		}

		return $this->DefaultResponse(__FUNCTION__, $mResponse);
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
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
			$oAddressBookProvider = $this->AddressBookProvider($oAccount);
			if ($oAddressBookProvider && $oAddressBookProvider->IsActive())
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
					$iCount = $oAddressBookProvider->ImportCsvArray($oAccount->ParentEmailHelper(), $aData);
				}
			}
		}

		return $iCount;
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param resource $rFile
	 *
	 * @return int
	 */
	private function importContactsFromVcfFile($oAccount, $rFile)
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

		\header('Content-Type: text/plain', true);

		return $this->MailClient()->MessageMimeStream(function ($rResource) {
			if (\is_resource($rResource))
			{
				\MailSo\Base\Utils::FpassthruWithTimeLimitReset($rResource);
			}
		}, $sFolder, $iUid, true, $sMimeIndex);
	}

	/**
	 * @return string
	 */
	public function RawFramedView()
	{
		$oAccount = $this->getAccountFromToken(false);
		if ($oAccount)
		{
			$sRawKey = (string) $this->GetActionParam('RawKey', '');
			$aParams = $this->GetActionParam('Params', null);
			$this->Http()->ServerNoCache();

			$aData = \RainLoop\Utils::DecodeKeyValuesQ($sRawKey);
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

						@\header('Content-Type: text/html; charset=utf-8');
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
	 * @return bool
	 *
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function Append()
	{
		$oAccount = $this->initMailClientConnection();

		$sFolderFullNameRaw = $this->GetActionParam('Folder', '');

		$_FILES = isset($_FILES) ? $_FILES : null;
		if ($oAccount instanceof \RainLoop\Model\Account &&
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

	/**
	 * @param bool $bAdmin
	 * @param bool $bMobile = false
	 * @param \RainLoop\Model\Account $oAccount = null
	 *
	 * @return array
	 */
	public function Capa($bAdmin, $bMobile = false, $oAccount = null)
	{
		$oConfig = $this->Config();

		$aResult = array();

		if ($oConfig->Get('capa', 'folders', true))
		{
			$aResult[] = \RainLoop\Enumerations\Capa::FOLDERS;

			if ($oConfig->Get('capa', 'messagelist_actions', true))
			{
				$aResult[] = \RainLoop\Enumerations\Capa::MESSAGELIST_ACTIONS;

				if ($oConfig->Get('capa', 'dangerous_actions', true))
				{
					$aResult[] = \RainLoop\Enumerations\Capa::DANGEROUS_ACTIONS;
				}
			}
		}

		if ($oConfig->Get('capa', 'reload', true))
		{
			$aResult[] = \RainLoop\Enumerations\Capa::RELOAD;
		}

		if ($oConfig->Get('capa', 'quota', true))
		{
			$aResult[] = \RainLoop\Enumerations\Capa::QUOTA;
		}

		if ($oConfig->Get('capa', 'settings', true))
		{
			$aResult[] = \RainLoop\Enumerations\Capa::SETTINGS;

			if ($oConfig->Get('webmail', 'allow_additional_accounts', false))
			{
				$aResult[] = \RainLoop\Enumerations\Capa::ADDITIONAL_ACCOUNTS;
			}

			if ($oConfig->Get('webmail', 'allow_additional_identities', false))
			{
				$aResult[] = \RainLoop\Enumerations\Capa::IDENTITIES;
			}

			if ($oConfig->Get('capa', 'x-templates', true) && !$bMobile)
			{
				$aResult[] = \RainLoop\Enumerations\Capa::TEMPLATES;
			}

			if ($oConfig->Get('webmail', 'allow_themes', false) && !$bMobile)
			{
				$aResult[] = \RainLoop\Enumerations\Capa::THEMES;
			}

			if ($oConfig->Get('webmail', 'allow_user_background', false) && !$bMobile)
			{
				$aResult[] = \RainLoop\Enumerations\Capa::USER_BACKGROUND;
			}

			if ($oConfig->Get('security', 'openpgp', false) && !$bMobile)
			{
				$aResult[] = \RainLoop\Enumerations\Capa::OPEN_PGP;
			}

			if ($oConfig->Get('capa', 'filters', false))
			{
				$aResult[] = \RainLoop\Enumerations\Capa::FILTERS;
				if ($bAdmin || ($oAccount && $oAccount->Domain()->UseSieve()))
				{
					$aResult[] = \RainLoop\Enumerations\Capa::SIEVE;
				}
			}
		}

		if ($oConfig->Get('security', 'allow_two_factor_auth', false) &&
			($bAdmin || ($oAccount && !$oAccount->IsAdditionalAccount())))
		{
			$aResult[] = \RainLoop\Enumerations\Capa::TWO_FACTOR;

			if ($oConfig->Get('security', 'force_two_factor_auth', false) &&
				($bAdmin || ($oAccount && !$oAccount->IsAdditionalAccount())))
			{
				$aResult[] = \RainLoop\Enumerations\Capa::TWO_FACTOR_FORCE;
			}
		}

		if ($oConfig->Get('capa', 'help', true) && !$bMobile)
		{
			$aResult[] = \RainLoop\Enumerations\Capa::HELP;
		}

		if ($oConfig->Get('capa', 'attachments_actions', false))
		{
			$aResult[] = \RainLoop\Enumerations\Capa::ATTACHMENTS_ACTIONS;
		}

		if ($oConfig->Get('capa', 'message_actions', true))
		{
			$aResult[] = \RainLoop\Enumerations\Capa::MESSAGE_ACTIONS;
		}

		if ($oConfig->Get('capa', 'composer', true))
		{
			$aResult[] = \RainLoop\Enumerations\Capa::COMPOSER;

			if ($oConfig->Get('capa', 'contacts', true))
			{
				$aResult[] = \RainLoop\Enumerations\Capa::CONTACTS;
			}
		}

		if ($oConfig->Get('capa', 'search', true))
		{
			$aResult[] = \RainLoop\Enumerations\Capa::SEARCH;

			if ($oConfig->Get('capa', 'search_adv', true) && !$bMobile)
			{
				$aResult[] = \RainLoop\Enumerations\Capa::SEARCH_ADV;
			}
		}

		if ($oConfig->Get('labs', 'allow_gravatar', false))
		{
			$aResult[] = \RainLoop\Enumerations\Capa::GRAVATAR;
		}

		if ($oConfig->Get('interface', 'show_attachment_thumbnail', true))
		{
			$aResult[] = \RainLoop\Enumerations\Capa::ATTACHMENT_THUMBNAILS;
		}

		if ($oConfig->Get('labs', 'allow_prefetch', false) && !$bMobile)
		{
			$aResult[] = \RainLoop\Enumerations\Capa::PREFETCH;
		}

		if (!\RainLoop\Utils::IsOwnCloud())
		{
			$aResult[] = \RainLoop\Enumerations\Capa::AUTOLOGOUT;
		}

		return $aResult;
	}

	/**
	 * @param bool $bAdmin
	 * @param bool $bMobile
	 * @param string $sName
	 * @param \RainLoop\Model\Account $oAccount = null
	 *
	 * @return bool
	 */
	public function GetCapa($bAdmin, $bMobile, $sName, $oAccount = null)
	{
		return \in_array($sName, $this->Capa($bAdmin, $bMobile, $oAccount));
	}

	/**
	 * @param string $sKey
	 *
	 * @return string
	 */
	public function etag($sKey)
	{
		return \md5('Etag:'.\md5($sKey.\md5($this->Config()->Get('cache', 'index', ''))));
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
			$sIfNoneMatch = $this->Http()->GetHeader('If-None-Match', '');
			if ($this->etag($sKey) === $sIfNoneMatch)
			{
				$this->Http()->StatusHeader(304);
				$this->cacheByKey($sKey);
				exit(0);
			}
		}
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sHash
	 *
	 * @return array
	 */
	private function getMimeFileByHash($oAccount, $sHash)
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

					if (@\is_resource($rTempResource))
					{
						if (false !== \MailSo\Base\Utils::MultipleStreamWriter($rResource, array($rTempResource)))
						{
							$sResultHash = $sHash;
						}

						@\fclose($rTempResource);
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

	/**
	 * @param \Imagine\Image\AbstractImage $oImage
	 * @param int $iOrientation
	 */
	private function rotateImageByOrientation(&$oImage, $iOrientation)
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

	/**
	 * @param \Imagine\Image\AbstractImage $oImage
	 */
	public function correctImageOrientation($oImage, $bDetectImageOrientation = true, $iThumbnailBoxSize = null)
	{
		$iOrientation = 1;
		if ($bDetectImageOrientation && \MailSo\Base\Utils::FunctionExistsAndEnabled('exif_read_data') &&
			\MailSo\Base\Utils::FunctionExistsAndEnabled('gd_info'))
		{
			$oMetadata = $oImage->metadata(new \Imagine\Image\Metadata\ExifMetadataReader());
			$iOrientation = isset($oMetadata['ifd0.Orientation']) &&
				is_numeric($oMetadata['ifd0.Orientation']) ? (int) $oMetadata['ifd0.Orientation'] : 1;
		}

		if ($iThumbnailBoxSize && 0 < $iThumbnailBoxSize)
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

	/**
	 * @param bool $bDownload
	 * @param bool $bThumbnail = false
	 *
	 * @return bool
	 */
	private function rawSmart($bDownload, $bThumbnail = false)
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
				$sFileNameOut = \MailSo\Base\Utils::ConvertEncoding(
					$sFileNameOut, \MailSo\Base\Enumerations\Charset::UTF_8,
						\MailSo\Base\Enumerations\Charset::CP858);

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
							catch (\Exception $oException)
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
							catch (\Exception $oException)
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
	public function RawViewThumbnail()
	{
		return $this->rawSmart(false, true);
	}

	/**
	 * @return bool
	 */
	public function RawUserBackground()
	{
		$sRawKey = (string) $this->GetActionParam('RawKey', '');
		$this->verifyCacheByKey($sRawKey);

		$oAccount = $this->getAccountFromToken();

		$sData = $this->StorageProvider()->Get($oAccount,
			\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
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

				@\header('Content-Type: '.$aData['ContentType']);
				echo \base64_decode($aData['Raw']);
				unset($aData);

				return true;
			}
		}

		return false;
	}

	/**
	 * @return bool
	 */
	public function RawPublic()
	{
		$sRawKey = (string) $this->GetActionParam('RawKey', '');
		$this->verifyCacheByKey($sRawKey);

		$sHash = $sRawKey;
		$sData = '';

		if (!empty($sHash))
		{
			$sData = $this->StorageProvider()->Get(null,
				\RainLoop\Providers\Storage\Enumerations\StorageType::NOBODY,
				\RainLoop\KeyPathHelper::PublicFile($sHash)
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

				@\header('Content-Type: '.$sContentType);
				echo \preg_replace('/^data:[^:]+:/', '', $sData);
				unset($sData);

				return true;
			}
		}

		return false;
	}

	/**
	 * @param string $sFileName
	 *
	 * @return bool
	 */
	public function isFileHasFramedPreview($sFileName)
	{
		$sExt = \MailSo\Base\Utils::GetFileExtension($sFileName);
		return \in_array($sExt, array('doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'));
	}

	/**
	 * @param string $sFileName
	 *
	 * @return bool
	 */
	public function isFileHasThumbnail($sFileName)
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

	/**
	 * @return bool
	 */
	public function RawAvatar()
	{
		$sData = '';

		$sRawKey = (string) $this->GetActionParam('RawKey', '');
		$sRawKey = \urldecode($sRawKey);

		$this->verifyCacheByKey($sRawKey);

		if (0 < \strlen($sRawKey) && \preg_match('/^[^@]+@([^@]+)$/', $sRawKey))
		{
			$sEmail = \MailSo\Base\Utils::IdnToAscii($sRawKey, true);

			$iCode = 0;
			$sContentType = '';

			$sGravatarUrl = 'http://gravatar.com/avatar/'.\md5(strtolower($sEmail)).'.jpg?s=80&d=404';

			$this->Logger()->Write('gravatar: '.$sGravatarUrl);

			$sData = $this->Http()->GetUrlAsString($sGravatarUrl, null, $sContentType, $iCode, null, 5,
				$this->Config()->Get('labs', 'curl_proxy', ''), $this->Config()->Get('labs', 'curl_proxy_auth', ''));

			$sContentType = \strtolower(\trim($sContentType));
			if (200 !== $iCode || empty($sData) || !\in_array($sContentType, array('image/jpeg', 'image/jpg', 'image/png')))
			{
				$this->Logger()->Write('gravatar: code: '.$iCode.', content-type: '.$sContentType);

				$sData = '';

				$aMatch = array();
				if (\preg_match('/^[^@]+@([a-z0-9\-\.]+)$/', $sEmail, $aMatch) && !empty($aMatch[1]))
				{
					$sDomain = $aMatch[1];
					if (\file_exists(APP_VERSION_ROOT_PATH.'app/resources/images/services/'.$sDomain.'.png'))
					{
						$sContentType = 'image/png';
						$sData = \file_get_contents(APP_VERSION_ROOT_PATH.'app/resources/images/services/'.$sDomain.'.png');
					}
				}
			}
		}

		if (empty($sData) || empty($sContentType))
		{
			$sContentType = 'image/png';
			$sData = \file_get_contents(APP_VERSION_ROOT_PATH.'app/resources/images/empty-contact.png');
		}

		$this->cacheByKey($sRawKey);
		\header('Content-Type: '.$sContentType);
		echo $sData;
		return true;
	}

	/**
	 * @return bool
	 */
	public function RawContactsVcf()
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

	/**
	 * @return bool
	 */
	public function RawContactsCsv()
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

	/**
	 * @return \RainLoop\Model\Account|bool
	 */
	private function initMailClientConnection()
	{
		$oAccount = null;

		if (!$this->MailClient()->IsLoggined())
		{
			$oAccount = $this->getAccountFromToken();

			try
			{
				$oAccount->IncConnectAndLoginHelper($this->Plugins(), $this->MailClient(), $this->Config(), array($this, 'googleRefreshTokenCallback'));
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
			$aValues = \RainLoop\Utils::DecodeKeyValuesQ($sRawKey);
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
	 * @return string
	 */
	public function StaticCache()
	{
		static $sCache = null;
		if (!$sCache)
		{
			$sCache = \md5(APP_VERSION.$this->Plugins()->Hash());
		}
		return $sCache;
	}

	/**
	 * @param string $sTheme
	 *
	 * @return string
	 */
	public function ThemeLink($sTheme, $bAdmin)
	{
		return './?/Css/0/'.($bAdmin ? 'Admin' : 'User').'/-/'.$sTheme.'/-/'.$this->StaticCache().'/Hash/-/';
	}

	/**
	 * @param string $sTheme
	 *
	 * @return string
	 */
	public function ValidateTheme($sTheme, $bMobile = false)
	{
		if ($bMobile)
		{
			return 'Mobile';
		}

		return \in_array($sTheme, $this->GetThemes($bMobile)) ?
			$sTheme : $this->Config()->Get('themes', 'default', $bMobile ? 'Mobile' : 'Default');
	}

	/**
	 * @param string $sLanguage
	 * @param string  $sDefault = ''
	 * @param bool $bAdmin = false
	 * @param bool $bAllowEmptyResult = false
	 *
	 * @return string
	 */
	public function ValidateLanguage($sLanguage, $sDefault = '', $bAdmin = false, $bAllowEmptyResult = false)
	{
		$sResult = '';
		$aLang = $this->GetLanguages($bAdmin);

		if (\is_array($aLang))
		{
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
		}

		return $sResult;
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
	 *
	 * @return array
	 */
	public function GetThemes($bMobile = false, $bIncludeMobile = true)
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
		if (@\is_dir($sDir))
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
				@closedir($rDirH);
			}
		}

		$sDir = APP_INDEX_ROOT_PATH.'themes'; // custom user themes
		if (@\is_dir($sDir))
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

				@\closedir($rDirH);
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
	 * @param bool $bAdmin = false
	 *
	 * @return array
	 */
	public function GetLanguages($bAdmin = false)
	{
		static $aCache = array();
		$sDir = APP_VERSION_ROOT_PATH.'app/localization/'.($bAdmin ? 'admin' : 'webmail').'/';

		if (isset($aCache[$sDir]))
		{
			return $aCache[$sDir];
		}

		$aTop = array();
		$aList = array();

		if (@\is_dir($sDir))
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

				@\closedir($rDirH);
			}
		}

		\sort($aTop);
		\sort($aList);

		$aCache[$sDir] = \array_merge($aTop, $aList);
		return $aCache[$sDir];
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

		$sHtml = \preg_replace('/<script/i', '<x-script', $sHtml);
		$sHtml = \preg_replace('/<\/script>/i', '</x-script>', $sHtml);

		return \RainLoop\Utils::ClearHtmlOutput($sHtml);
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
		$sActionName = 'Do' === \substr($sActionName, 0, 2) ? \substr($sActionName, 2) : $sActionName;
		$sActionName = \preg_replace('/[^a-zA-Z0-9_]+/', '', $sActionName);

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
	 * @param string $sAdditionalErrorMessage = null
	 *
	 * @return array
	 */
	public function FalseResponse($sActionName, $iErrorCode = null, $sErrorMessage = null, $sAdditionalErrorMessage = null)
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
		$sErrorMessageAdditional = null;

		if ($oException instanceof \RainLoop\Exceptions\ClientException)
		{
			$iErrorCode = $oException->getCode();
			$sErrorMessage = null;

			if ($iErrorCode === \RainLoop\Notifications::ClientViewError)
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

		return $this->FalseResponse($sActionName, $iErrorCode, $sErrorMessage, $sErrorMessageAdditional);
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
	 * @param array $aKeys
	 *
	 * @return bool
	 */
	public function HasOneOfActionParams($aKeys)
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

	/**
	 * @param string $sUrl
	 */
	public function Location($sUrl)
	{
		$this->Logger()->Write('Location: '.$sUrl);
		@\header('Location: '.$sUrl);
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
			'spam', 'junk', 'bin', 'trash', 'archive', 'allmail', 'all')) ?
				$sFolderFullName : \md5($sFolderFullName);
	}

	/**
	 * @param bool $bAdmin = false
	 * @param bool $bMobile = false
	 *
	 * @return array
	 */
	public function GetLanguageAndTheme($bAdmin = false, $bMobile = false)
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

			if ($oAccount instanceof \RainLoop\Model\Account)
			{
				$oSettings = $this->SettingsProvider()->Load($oAccount);
				if ($oSettings instanceof \RainLoop\Settings)
				{
					$sLanguage = $oSettings->GetConf('Language', $sLanguage);
				}

				$oSettingsLocal = $this->SettingsProvider(true)->Load($oAccount);
				if ($oSettingsLocal instanceof \RainLoop\Settings)
				{
					$sTheme = $oSettingsLocal->GetConf('Theme', $sTheme);
				}
			}
		}

		$sLanguage = $this->ValidateLanguage($sLanguage, '', $bAdmin);
		$sTheme = $this->ValidateTheme($sTheme, $bMobile);

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
			$sLang = $this->ValidateLanguage($sLang, 'en');

			$aLang = array();
//			\RainLoop\Utils::ReadAndAddLang(APP_VERSION_ROOT_PATH.'app/i18n/langs.ini', $aLang);
//			\RainLoop\Utils::ReadAndAddLang(APP_VERSION_ROOT_PATH.'langs/'.$sLang.'.ini', $aLang);
			\RainLoop\Utils::ReadAndAddLang(APP_VERSION_ROOT_PATH.'app/localization/langs.yml', $aLang);
			\RainLoop\Utils::ReadAndAddLang(APP_VERSION_ROOT_PATH.'app/localization/webmail/'.$sLang.'.yml', $aLang);

			$this->Plugins()->ReadLang($sLang, $aLang);
		}

		return isset($aLang[$sKey]) ? $aLang[$sKey] : $sKey;
	}

	/**
	 * @param string $sPath
	 *
	 * @return string
	 */
	public function StaticPath($sPath)
	{
		$sKey = defined('APP_VERSION_TYPE') && 0 < strlen(APP_VERSION_TYPE) ? APP_VERSION_TYPE :
			($this->IsOpen() ? 'community' : 'standard');

		$sResult = \RainLoop\Utils::WebStaticPath().$sPath;
		return $sResult.(false === \strpos($sResult, '?') ? '?' : '&').$sKey;
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

	/**
	 * @param string $sSubject
	 *
	 * @return array
	 */
	private function explodeSubject($sSubject)
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
			$self = $this;
			$sClassName = \get_class($mResponse);
			$bHasSimpleJsonFunc = \method_exists($mResponse, 'ToSimpleJSON');
			$bThumb = $this->GetCapa(false, false, \RainLoop\Enumerations\Capa::ATTACHMENT_THUMBNAILS);

			$oAccountCache = null;
			$fGetAccount = function () use ($self, &$oAccountCache) {
				if (null === $oAccountCache)
				{
					$oAccount = $self->getAccountFromToken(false);
					$oAccountCache = $oAccount;
				}

				return $oAccountCache;
			};

			$aCheckableFoldersCache = null;
			$fGetCheckableFolder = function () use ($self, &$aCheckableFoldersCache) {
				if (null === $aCheckableFoldersCache)
				{
					$oAccount = $self->getAccountFromToken(false);

					$oSettingsLocal = $self->SettingsProvider(true)->Load($oAccount);
					$sCheckable = $oSettingsLocal->GetConf('CheckableFolder', '[]');
					$aCheckable = @\json_decode($sCheckable);
					if (!\is_array($aCheckable))
					{
						$aCheckable = array();
					}

					$aCheckableFoldersCache = $aCheckable;
				}

				return $aCheckableFoldersCache;
			};

			if ($bHasSimpleJsonFunc)
			{
				$mResult = \array_merge($this->objectData($mResponse, $sParent, $aParameters), $mResponse->ToSimpleJSON(true));
			}
			else if ('MailSo\Mail\Message' === $sClassName)
			{
				$oAccount = \call_user_func($fGetAccount);

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
				$mResult['RequestHash'] = \RainLoop\Utils::EncodeKeyValuesQ(array(
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

				if (!$this->GetCapa(false, false, \RainLoop\Enumerations\Capa::COMPOSER, $oAccount))
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
							return './?/ProxyExternal/'.\RainLoop\Utils::EncodeKeyValuesQ(array(
								'Rnd' => \md5(\microtime(true)),
								'Token' => \RainLoop\Utils::GetConnectionToken(),
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
							catch (\Exception $oException) { unset($oException); }
						}

						if (0 < \strlen($mResult['ReadReceipt']) && '1' === $this->Cacher($oAccount)->Get(
							\RainLoop\KeyPathHelper::ReadReceiptCache($oAccount->Email(), $mResult['Folder'], $mResult['Uid']), '0'))
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
					/* @var $mResponse \RainLoop\Providers\AddressBook\Classes\Contact */
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
					/* @var $mResponse \RainLoop\Providers\AddressBook\Classes\Tag */
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
					/* @var $mResponse \RainLoop\Providers\AddressBook\Classes\Property */
					'IdProperty' => $mResponse->IdProperty,
					'Type' => $mResponse->Type,
					'TypeStr' => $mResponse->TypeStr,
					'Value' => \MailSo\Base\Utils::Utf8Clear($mResponse->Value)
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
					'Framed' => false,
					'MimeIndex' => (string) $mResponse->MimeIndex(),
					'MimeType' => $mResponse->MimeType(),
					'FileName' => \MailSo\Base\Utils::ClearFileName(
						\MailSo\Base\Utils::ClearXss($mResponse->FileName(true))),
					'EstimatedSize' => $mResponse->EstimatedSize(),
					'CID' => $mResponse->Cid(),
					'ContentLocation' => $mResponse->ContentLocation(),
					'IsInline' => $mResponse->IsInline(),
					'IsThumbnail' => $bThumb,
					'IsLinked' => ($mFoundedCIDs && \in_array(\trim(\trim($mResponse->Cid()), '<>'), $mFoundedCIDs)) ||
						($mFoundedContentLocationUrls && \in_array(\trim($mResponse->ContentLocation()), $mFoundedContentLocationUrls))
				));

				$mResult['Framed'] = $this->isFileHasFramedPreview($mResult['FileName']);

				if ($mResult['IsThumbnail'])
				{
					$mResult['IsThumbnail'] = $this->isFileHasThumbnail($mResult['FileName']);
				}

				$mResult['Download'] = \RainLoop\Utils::EncodeKeyValuesQ(array(
					'V' => APP_VERSION,
					'Account' => $oAccount ? \md5($oAccount->Hash()) : '',
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

				$aCheckableFolder = \call_user_func($fGetCheckableFolder);
				if (!\is_array($aCheckableFolder))
				{
					$aCheckableFolder = array();
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
					'Checkable' => \in_array($mResponse->FullNameRaw(), $aCheckableFolder),
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
				$mResult = '["'.\get_class($mResponse).'"]';
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
