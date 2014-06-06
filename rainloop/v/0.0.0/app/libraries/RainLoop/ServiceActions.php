<?php

namespace RainLoop;

class ServiceActions
{
	/**
	 * @var \MailSo\Base\Http
	 */
	protected $oHttp;

	/**
	 * @var \RainLoop\Actions
	 */
	protected $oActions;

	/**
	 * @var array
	 */
	protected $aPaths;

	/**
	 * @var string
	 */
	protected $sQuery;

	/**
	 * @param \MailSo\Base\Http $oHttp
	 * @param \RainLoop\Actions $oActions
	 *
	 * @return void
	 */
	public function __construct($oHttp, $oActions)
	{
		$this->oHttp = $oHttp;
		$this->oActions = $oActions;
		$this->aPaths = array();
		$this->sQuery = '';
	}

	/**
	 * @return \MailSo\Log\Logger
	 */
	public function Logger()
	{
		return $this->oActions->Logger();
	}

	/**
	 * @return \RainLoop\Plugins\Manager
	 */
	public function Plugins()
	{
		return $this->oActions->Plugins();
	}

	/**
	 * @return \RainLoop\Application
	 */
	public function Config()
	{
		return $this->oActions->Config();
	}

	/**
	 * @return \MailSo\Cache\CacheClient
	 */
	public function Cacher()
	{
		return $this->oActions->Cacher();
	}

	/**
	 * @return \RainLoop\Providers\Storage
	 */
	public function StorageProvider()
	{
		return $this->oActions->StorageProvider();
	}

	/**
	 * @param array $aPaths
	 *
	 * @return \RainLoop\ServiceActions
	 */
	public function SetPaths($aPaths)
	{
		$this->aPaths = \is_array($aPaths) ? $aPaths : array();
		return $this;
	}

	/**
	 * @param string $sQuery
	 *
	 * @return \RainLoop\ServiceActions
	 */
	public function SetQuery($sQuery)
	{
		$this->sQuery = $sQuery;
		return $this;
	}

	/**
	 * @return string
	 */
	public function ServiceAjax()
	{
		@\ob_start();

		$aResponseItem = null;
		$oException = null;

		$sAction = $this->oHttp->GetPost('Action', null);
		if (empty($sAction) && $this->oHttp->IsGet() && !empty($this->aPaths[2]))
		{
			$sAction = $this->aPaths[2];
		}

		try
		{
			if ($this->oHttp->IsPost() && !in_array($sAction, array('JsInfo', 'JsError')) &&
				$this->Config()->Get('security', 'csrf_protection', false) &&
				$this->oHttp->GetPost('XToken', '') !== \RainLoop\Utils::GetCsrfToken())
			{
				throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::InvalidToken);
			}
			else if (!empty($sAction))
			{
				$sMethodName = 'Do'.$sAction;

				$this->Logger()->Write('Action: '.$sMethodName, \MailSo\Log\Enumerations\Type::NOTE, 'AJAX');

				$aPost = $this->oHttp->GetPostAsArray();
				if (\is_array($aPost) && 0 < \count($aPost))
				{
					$this->oActions->SetActionParams($aPost, $sMethodName);
					switch ($sMethodName)
					{
						case 'DoLogin':
						case 'DoAdminLogin':
						case 'DoAccountAdd':
							$this->Logger()->AddSecret($this->oActions->GetActionParam('Password', ''));
							break;
						case 'DoChangePassword':
							$this->Logger()->AddSecret($this->oActions->GetActionParam('PrevPassword', ''));
							$this->Logger()->AddSecret($this->oActions->GetActionParam('NewPassword', ''));
							break;
					}

					$this->Logger()->Write(\MailSo\Base\Utils::Php2js($aPost, $this->Logger()),
						\MailSo\Log\Enumerations\Type::INFO, 'POST', true);
				}
				else if (3 < \count($this->aPaths) && $this->oHttp->IsGet())
				{
					$this->oActions->SetActionParams(array(
						'RawKey' => empty($this->aPaths[3]) ? '' : $this->aPaths[3]
					), $sMethodName);
				}

				if (\method_exists($this->oActions, $sMethodName) &&
					\is_callable(array($this->oActions, $sMethodName)))
				{
					$this->Plugins()->RunHook('ajax.action-pre-call', array($sAction));
					$aResponseItem = \call_user_func(array($this->oActions, $sMethodName));
					$this->Plugins()->RunHook('ajax.action-post-call', array($sAction, &$aResponseItem));
				}
				else if ($this->Plugins()->HasAdditionalAjax($sMethodName))
				{
					$this->Plugins()->RunHook('ajax.action-pre-call', array($sAction));
					$aResponseItem = $this->Plugins()->RunAdditionalAjax($sMethodName);
					$this->Plugins()->RunHook('ajax.action-post-call', array($sAction, &$aResponseItem));
				}
			}

			if (!\is_array($aResponseItem))
			{
				throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::UnknownError);
			}
		}
		catch (\Exception $oException)
		{
			$aResponseItem = $this->oActions->ExceptionResponse(
				empty($sAction) ? 'Unknown' : $sAction, $oException);

			if (\is_array($aResponseItem) && 'Folders' === $sAction && $oException instanceof \RainLoop\Exceptions\ClientException)
			{
				$aResponseItem['Logout'] = true;
			}
		}

		if (\is_array($aResponseItem))
		{
			$aResponseItem['Time'] = (int) ((\microtime(true) - APP_START) * 1000);
		}

		$this->Plugins()->RunHook('filter.ajax-response', array($sAction, &$aResponseItem));

		@\header('Content-Type: application/json; charset=utf-8');
		$sResult = \MailSo\Base\Utils::Php2js($aResponseItem, $this->Logger());

		$sObResult = @\ob_get_clean();

		if ($this->Logger()->IsEnabled())
		{
			if (0 < \strlen($sObResult))
			{
				$this->Logger()->Write($sObResult, \MailSo\Log\Enumerations\Type::ERROR, 'OB-DATA');
			}

			if ($oException)
			{
				$this->Logger()->WriteException($oException, \MailSo\Log\Enumerations\Type::ERROR);
			}

			$iLimit = (int) $this->Config()->Get('labs', 'log_ajax_response_write_limit', 0);
			$this->Logger()->Write(0 < $iLimit && $iLimit < \strlen($sResult)
					? \substr($sResult, 0, $iLimit).'...' : $sResult, \MailSo\Log\Enumerations\Type::INFO, 'AJAX');
		}

		return $sResult;
	}

	/**
	 * @return string
	 */
	public function ServiceAppend()
	{
		@\ob_start();
		$bResponse = false;
		$oException = null;
		try
		{
			if (\method_exists($this->oActions, 'Append') &&
				\is_callable(array($this->oActions, 'Append')))
			{
				$this->oActions->SetActionParams($this->oHttp->GetPostAsArray(), 'Append');
				$bResponse = \call_user_func(array($this->oActions, 'Append'));
			}
		}
		catch (\Exception $oException)
		{
			$bResponse = false;
		}

		@\header('Content-Type: text/plain; charset=utf-8');
		$sResult = true === $bResponse ? '1' : '0';

		$sObResult = @\ob_get_clean();
		if (0 < \strlen($sObResult))
		{
			$this->Logger()->Write($sObResult, \MailSo\Log\Enumerations\Type::ERROR, 'OB-DATA');
		}

		if ($oException)
		{
			$this->Logger()->WriteException($oException, \MailSo\Log\Enumerations\Type::ERROR);
		}

		$this->Logger()->Write($sResult, \MailSo\Log\Enumerations\Type::INFO, 'APPEND');

		return $sResult;
	}

	/**
	 * @param string $sAction
	 *
	 * @return string
	 */
	private function privateUpload($sAction)
	{
		@\ob_start();
		$aResponseItem = null;
		try
		{
			if (\method_exists($this->oActions, $sAction) &&
				\is_callable(array($this->oActions, $sAction)))
			{
				$this->oActions->SetActionParams($this->oHttp->GetQueryAsArray(), $sAction);

				$aResponseItem = \call_user_func(array($this->oActions, $sAction));
			}

			if (!is_array($aResponseItem))
			{
				throw new \RainLoop\Exceptions\ClientException(\RainLoop\Notifications::UnknownError);
			}
		}
		catch (\Exception $oException)
		{
			$aResponseItem = $this->oActions->ExceptionResponse($sAction, $oException);
		}

		if ('iframe' === $this->oHttp->GetPost('jua-post-type', ''))
		{
			@\header('Content-Type: text/html; charset=utf-8');
		}
		else
		{
			@\header('Content-Type: application/json; charset=utf-8');
		}

		$this->Plugins()->RunHook('filter.upload-response', array(&$aResponseItem));
		$sResult = \MailSo\Base\Utils::Php2js($aResponseItem, $this->Logger());

		$sObResult = @\ob_get_clean();
		if (0 < \strlen($sObResult))
		{
			$this->Logger()->Write($sObResult, \MailSo\Log\Enumerations\Type::ERROR, 'OB-DATA');
		}

		$this->Logger()->Write($sResult, \MailSo\Log\Enumerations\Type::INFO, 'UPLOAD');

		return $sResult;
	}

	/**
	 * @return string
	 */
	public function ServiceUpload()
	{
		return $this->privateUpload('Upload');
	}

	/**
	 * @return string
	 */
	public function ServiceUploadContacts()
	{
		return $this->privateUpload('UploadContacts');
	}

	/**
	 * @return string
	 */
	public function ServiceUploadBackground()
	{
		return $this->privateUpload('UploadBackground');
	}

	/**
	 * @return string
	 */
	public function ServiceRaw()
	{
		$sResult = '';
		$sRawError = '';
		$sAction = empty($this->aPaths[2]) ? '' : $this->aPaths[2];
		$oException = null;

		try
		{
			$sRawError = 'Invalid action';
			if (0 !== \strlen($sAction))
			{
				$sMethodName = 'Raw'.$sAction;
				if (\method_exists($this->oActions, $sMethodName))
				{
					$sRawError = '';
					$this->oActions->SetActionParams(array(
						'RawKey' => empty($this->aPaths[3]) ? '' : $this->aPaths[3]
					), $sMethodName);

					if (!\call_user_func(array($this->oActions, $sMethodName)))
					{
						$sRawError = 'False result';
					}
					else
					{
						$sRawError = '';
					}
				}
			}
		}
		catch (\RainLoop\Exceptions\ClientException $oException)
		{
			$sRawError = 'Exception as result';
			switch ($oException->getCode())
			{
				case \RainLoop\Notifications::AuthError:
					$sRawError = 'Authentication failed';
					break;
			}
		}
		catch (\Exception $oException)
		{
			$sRawError = 'Exception as result';
		}

		if (0 < \strlen($sRawError))
		{
			$this->oActions->Logger()->Write($sRawError, \MailSo\Log\Enumerations\Type::ERROR);
		}

		if ($oException)
		{
			$this->Logger()->WriteException($oException, \MailSo\Log\Enumerations\Type::ERROR, 'RAW');
		}

		return $sResult;
	}

	/**
	 * @return string
	 */
	public function ServiceLang()
	{
		$sResult = '';
		@\header('Content-Type: application/javascript; charset=utf-8');

		if (!empty($this->aPaths[2]))
		{
			$sLanguage = $this->oActions->ValidateLanguage($this->aPaths[2]);

			$bCacheEnabled = $this->Config()->Get('labs', 'cache_system_data', true);
			if (!empty($sLanguage) && $bCacheEnabled)
			{
				$this->oActions->verifyCacheByKey($this->sQuery);
			}

			$sCacheFileName = '';
			if ($bCacheEnabled)
			{
				$sCacheFileName = 'LANG:'.$this->oActions->Plugins()->Hash().$sLanguage.APP_VERSION;
				$sResult = $this->Cacher()->Get($sCacheFileName);
			}

			if (0 === \strlen($sResult))
			{
				$sResult = $this->compileLanguage($sLanguage, false);
				if ($bCacheEnabled && 0 < \strlen($sCacheFileName))
				{
					$this->Cacher()->Set($sCacheFileName, $sResult);
				}
			}

			if ($bCacheEnabled)
			{
				$this->oActions->cacheByKey($this->sQuery);
			}
		}

		return $sResult;
	}

	/**
	 * @return string
	 */
	public function ServiceTemplates()
	{
		$sResult = '';
		@\header('Content-Type: application/javascript; charset=utf-8');

		$bCacheEnabled = $this->Config()->Get('labs', 'cache_system_data', true);
		if ($bCacheEnabled)
		{
			$this->oActions->verifyCacheByKey($this->sQuery);
		}

		$bAdmin = false !== \strpos($this->sQuery, 'Admin');

		$sCacheFileName = '';
		if ($bCacheEnabled)
		{
			$sCacheFileName = 'TEMPLATES:'.($bAdmin ? 'Admin/' : 'App/').$this->oActions->Plugins()->Hash().APP_VERSION;
			$sResult = $this->Cacher()->Get($sCacheFileName);
		}

		if (0 === \strlen($sResult))
		{
			$sResult = $this->compileTemplates($bAdmin);
			if ($bCacheEnabled && 0 < \strlen($sCacheFileName))
			{
				$this->Cacher()->Set($sCacheFileName, $sResult);
			}
		}

		if ($bCacheEnabled)
		{
			$this->oActions->cacheByKey($this->sQuery);
		}

		return $sResult;
	}

	/**
	 * @return string
	 */
	public function ServicePlugins()
	{
		$sResult = '';
		$bAdmin = !empty($this->aPaths[2]) && 'Admin' === $this->aPaths[2];

		@\header('Content-Type: application/javascript; charset=utf-8');

		$bCacheEnabled = $this->Config()->Get('labs', 'cache_system_data', true);
		if ($bCacheEnabled)
		{
			$this->oActions->verifyCacheByKey($this->sQuery);
		}

		$sCacheFileName = '';
		if ($bCacheEnabled)
		{
			$sCacheFileName = 'PLUGIN:'.$this->oActions->Plugins()->Hash().APP_VERSION;
			$sResult = $this->Cacher()->Get($sCacheFileName);
		}

		if (0 === strlen($sResult))
		{
			$sResult = $this->Plugins()->CompileJs($bAdmin);
			if ($bCacheEnabled && 0 < \strlen($sCacheFileName))
			{
				$this->Cacher()->Set($sCacheFileName, $sResult);
			}
		}

		if ($bCacheEnabled)
		{
			$this->oActions->cacheByKey($this->sQuery);
		}

		return $sResult;
	}

	/**
	 * @return string
	 */
	public function ServiceCss()
	{
		$sResult = '';

		$bAdmin = !empty($this->aPaths[2]) && 'Admin' === $this->aPaths[2];
		$bJson = !empty($this->aPaths[7]) && 'Json' === $this->aPaths[7];

		if ($bJson)
		{
			@\header('Content-Type: application/json; charset=utf-8');
		}
		else
		{
			@\header('Content-Type: text/css; charset=utf-8');
		}

		$sTheme = '';
		if (!empty($this->aPaths[4]))
		{
			$sTheme = $this->oActions->ValidateTheme($this->aPaths[4]);
			$sRealTheme = $sTheme;

			$bCustomTheme = '@custom' === \substr($sTheme, -7);
			if ($bCustomTheme)
			{
				$sRealTheme = \substr($sTheme, 0, -7);
			}

			$bCacheEnabled = $this->Config()->Get('labs', 'cache_system_data', true);
			if ($bCacheEnabled)
			{
				$this->oActions->verifyCacheByKey($this->sQuery);
			}

			$sCacheFileName = '';
			if ($bCacheEnabled)
			{
				$sCacheFileName = 'THEMES/PLUGINS:'.$sTheme.':'.$this->Plugins()->Hash();
				$sResult = $this->Cacher()->Get($sCacheFileName);
			}

			if (0 === \strlen($sResult))
			{
				try
				{
					include_once APP_VERSION_ROOT_PATH.'app/libraries/lessphp/ctype.php';
					include_once APP_VERSION_ROOT_PATH.'app/libraries/lessphp/lessc.inc.php';

					$oLess = new \lessc();
					$oLess->setFormatter('compressed');

					$aResult = array();

					$sThemeFile = ($bCustomTheme ? APP_INDEX_ROOT_PATH : APP_VERSION_ROOT_PATH).'themes/'.$sRealTheme.'/styles.less';
					$sThemeExtFile = ($bCustomTheme ? APP_INDEX_ROOT_PATH : APP_VERSION_ROOT_PATH).'themes/'.$sRealTheme.'/ext.less';

					$sThemeValuesFile = APP_VERSION_ROOT_PATH.'app/templates/Themes/values.less';
					$sThemeTemplateFile = APP_VERSION_ROOT_PATH.'app/templates/Themes/template.less';

					if (\file_exists($sThemeFile) && \file_exists($sThemeTemplateFile) && \file_exists($sThemeValuesFile))
					{
						$aResult[] = '@base: "'.($bCustomTheme ? '' : APP_WEB_PATH).'themes/'.$sRealTheme.'/";';
						$aResult[] = \file_get_contents($sThemeValuesFile);
						$aResult[] = \file_get_contents($sThemeFile);
						$aResult[] = \file_get_contents($sThemeTemplateFile);

						if (\file_exists($sThemeExtFile))
						{
							$aResult[] = \file_get_contents($sThemeExtFile);
						}
					}

					$aResult[] = $this->Plugins()->CompileCss($bAdmin);

					$sResult = $oLess->compile(\implode("\n", $aResult));

					if ($bCacheEnabled)
					{
						if (0 < \strlen($sCacheFileName))
						{
							$this->Cacher()->Set($sCacheFileName, $sResult);
						}
					}
				}
				catch (\Exception $oException)
				{
					$this->Logger()->WriteException($oException, \MailSo\Log\Enumerations\Type::ERROR, 'LESS');
				}
			}

			if ($bCacheEnabled)
			{
				$this->oActions->cacheByKey($this->sQuery);
			}
		}

		return $bJson ? \MailSo\Base\Utils::Php2js(array($sTheme, $sResult), $this->Logger()) : $sResult;
	}

	/**
	 * @return string
	 */
	public function ServiceSocialGoogle()
	{
		return $this->oActions->Social()->GooglePopupService();
	}

	/**
	 * @return string
	 */
	public function ServiceSocialFacebook()
	{
		return $this->oActions->Social()->FacebookPopupService();
	}

	/**
	 * @return string
	 */
	public function ServiceSocialTwitter()
	{
		return $this->oActions->Social()->TwitterPopupService();
	}

	/**
	 * @return string
	 */
	public function ServiceAppData()
	{
		return $this->localAppData(false);
	}

	/**
	 * @return string
	 */
	public function ServiceAdminAppData()
	{
		return $this->localAppData(true);
	}

	/**
	 * @return string
	 */
	public function ServiceNoScript()
	{
		return $this->localError($this->oActions->StaticI18N('STATIC/NO_SCRIPT_TITLE'), $this->oActions->StaticI18N('STATIC/NO_SCRIPT_DESC'));
	}

	/**
	 * @return string
	 */
	public function ServiceNoCookie()
	{
		return $this->localError($this->oActions->StaticI18N('STATIC/NO_COOKIE_TITLE'), $this->oActions->StaticI18N('STATIC/NO_COOKIE_DESC'));
	}

	/**
	 * @return string
	 */
	public function ServiceBadBrowser()
	{
		$sTitle = $this->oActions->StaticI18N('STATIC/BAD_BROWSER_TITLE');
		$sDesc = \nl2br($this->oActions->StaticI18N('STATIC/BAD_BROWSER_DESC'));

		@\header('Content-Type: text/html; charset=utf-8');
		return \strtr(\file_get_contents(APP_VERSION_ROOT_PATH.'app/templates/BadBrowser.html'), array(
			'{{BaseWebStaticPath}}' => APP_WEB_STATIC_PATH,
			'{{ErrorTitle}}' => $sTitle,
			'{{ErrorHeader}}' => $sTitle,
			'{{ErrorDesc}}' => $sDesc
		));
	}

	/**
	 * @return string
	 */
	public function ServiceMailto()
	{
		$sTo = \trim($this->oHttp->GetQuery('to', ''));
		if (!empty($sTo) && \preg_match('/^mailto:/i', $sTo))
		{
			$oAccount = $this->oActions->GetAccountFromSignMeToken();
			if ($oAccount)
			{
				$this->oActions->SetMailtoRequest(\MailSo\Base\Utils::StrToLowerIfAscii($sTo));
			}
		}

		$this->oActions->Location('./');
		return '';
	}

	/**
	 * @return string
	 */
	public function ServicePing()
	{
		@\header('Content-Type: text/plain; charset=utf-8');
		$this->oActions->Logger()->Write('Pong', \MailSo\Log\Enumerations\Type::INFO, 'PING');
		return 'Pong';
	}

	/**
	 * @return string
	 */
	public function ServiceInfo()
	{
		if ($this->oActions->IsAdminLoggined(false))
		{
			@\header('Content-Type: text/html; charset=utf-8');
			\phpinfo();
		}
	}

	/**
	 * @return string
	 */
	public function ServiceSso()
	{
		$oException = null;
		$oAccount = null;
		$bLogout = true;

		$sSsoHash = $this->oHttp->GetRequest('hash', '');
		if (!empty($sSsoHash))
		{
			$mData = null;
			$sSsoKey = $this->oActions->BuildSsoCacherKey($sSsoHash);

			$sSsoSubData = $this->Cacher()->Get($sSsoKey);
			if (!empty($sSsoSubData))
			{
				$mData = \RainLoop\Utils::DecodeKeyValues($sSsoSubData);
				$this->Cacher()->Delete($sSsoKey);

				if (\is_array($mData) && !empty($mData['Email']) && isset($mData['Password'], $mData['Time']) &&
					(0 === $mData['Time'] || \time() - 10 < $mData['Time']))
				{
					$sEmail = \trim($mData['Email']);
					$sPassword = $mData['Password'];
					$sLogin = isset($mData['Login']) ? $mData['Login'] : '';

					try
					{
						$this->oActions->Logger()->AddSecret($sPassword);

						$oAccount = $this->oActions->LoginProcess($sEmail, $sLogin, $sPassword);
						$this->oActions->AuthProcess($oAccount);
						$bLogout = !($oAccount instanceof \RainLoop\Account);
					}
					catch (\Exception $oException)
					{
						$this->oActions->Logger()->WriteException($oException);
					}
				}
			}
		}

		if ($bLogout)
		{
			$this->oActions->SetAuthLogoutToken();
		}

		$this->oActions->Location('./');
		return '';
	}

	/**
	 * @return string
	 */
	public function ServiceRemoteAutoLogin()
	{
		$oException = null;
		$oAccount = null;
		$bLogout = true;

		$sEmail = $this->oHttp->GetEnv('REMOTE_USER', '');
		$sLogin = '';
		$sPassword = $this->oHttp->GetEnv('REMOTE_PASSWORD', '');

		if (0 < \strlen($sEmail) && 0 < \strlen(\trim($sPassword)))
		{
			try
			{
				$this->oActions->Logger()->AddSecret($sPassword);

				$oAccount = $this->oActions->LoginProcess($sEmail, $sLogin, $sPassword);
				$this->oActions->AuthProcess($oAccount);
				$bLogout = !($oAccount instanceof \RainLoop\Account);
			}
			catch (\Exception $oException)
			{
				$this->oActions->Logger()->WriteException($oException);
			}
		}

		if ($bLogout)
		{
			$this->oActions->SetAuthLogoutToken();
		}

		$this->oActions->Location('./');
		return '';
	}

	/**
	 * @return string
	 */
	public function ServiceExternalLogin()
	{
		$oException = null;
		$oAccount = null;
		$bLogout = true;

		if ($this->oActions->Config()->Get('labs', 'allow_external_login', false))
		{
			$sEmail = \trim($this->oHttp->GetRequest('Email', ''));
			$sLogin = \trim($this->oHttp->GetRequest('Login', ''));
			$sPassword = $this->oHttp->GetRequest('Password', '');

			try
			{
				$this->oActions->Logger()->AddSecret($sPassword);

				$oAccount = $this->oActions->LoginProcess($sEmail, $sLogin, $sPassword);
				$this->oActions->AuthProcess($oAccount);
				$bLogout = !($oAccount instanceof \RainLoop\Account);
			}
			catch (\Exception $oException)
			{
				$this->oActions->Logger()->WriteException($oException);
			}

			if ($bLogout)
			{
				$this->oActions->SetAuthLogoutToken();
			}
		}

		switch (\strtolower($this->oHttp->GetRequest('Output', 'Redirect')))
		{
			case 'json':

				@\header('Content-Type: application/json; charset=utf-8');

				$aResult = array(
					'Action' => 'ExternalLogin',
					'Result' => $oAccount instanceof \RainLoop\Account ? true : false,
					'ErrorCode' => 0
				);

				if (!$aResult['Result'])
				{
					if ($oException instanceof \RainLoop\Exceptions\ClientException)
					{
						$aResult['ErrorCode'] = $oException->getCode();
					}
					else
					{
						$aResult['ErrorCode'] = \RainLoop\Notifications::AuthError;
					}
				}

				return \MailSo\Base\Utils::Php2js($aResult, $this->Logger());

			case 'redirect':
			default:
				$this->oActions->Location('./');
				break;
		}

		return '';
	}

	/**
	 * @return string
	 */
	public function ServiceExternalSso()
	{
		$sKey = $this->oActions->Config()->Get('labs', 'external_sso_key', '');
		if ($this->oActions->Config()->Get('labs', 'allow_external_sso', false) &&
			!empty($sKey) && $sKey === \trim($this->oHttp->GetRequest('SsoKey', '')))
		{
			$sEmail = \trim($this->oHttp->GetRequest('Email', ''));
			$sLogin = \trim($this->oHttp->GetRequest('Login', ''));
			$sPassword = $this->oHttp->GetRequest('Password', '');

			\RainLoop\Api::Handle();
			$sResult = \RainLoop\Api::GetUserSsoHash($sEmail, $sPassword, $sLogin);
			$bLogout = 0 === \strlen($sResult);

			switch (\strtolower($this->oHttp->GetRequest('Output', 'Plain')))
			{
				case 'plain':
					@\header('Content-Type: text/plain');
					return $sResult;

				case 'json':
					@\header('Content-Type: application/json; charset=utf-8');
					return \MailSo\Base\Utils::Php2js(array(
						'Action' => 'ExternalSso',
						'Result' => $sResult
					), $this->Logger());
			}
		}

		return '';
	}

	/**
	 * @return string
	 */
	public function ServiceChange()
	{
		if ($this->Config()->Get('webmail', 'allow_additional_accounts', true))
		{
			$oAccountToLogin = null;
			$sEmail = empty($this->aPaths[2]) ? '' : \urldecode(\trim($this->aPaths[2]));
			if (!empty($sEmail))
			{
				$sEmail = \MailSo\Base\Utils::IdnToAscii($sEmail);

				$oAccount = $this->oActions->GetAccount();
				if ($oAccount)
				{
					$aAccounts = $this->oActions->GetAccounts($oAccount);
					if (isset($aAccounts[$sEmail]))
					{
						$oAccountToLogin = $this->oActions->GetAccountFromCustomToken($aAccounts[$sEmail], false, false);
					}
				}
			}

			if ($oAccountToLogin)
			{
				$this->oActions->AuthProcess($oAccountToLogin);
			}
		}

		$this->oActions->Location('./');
		return '';
	}

	/**
	 * @param string $sTitle
	 * @param string $sDesc
	 *
	 * @return string
	 */
	private function localError($sTitle, $sDesc)
	{
		@header('Content-Type: text/html; charset=utf-8');
		return $this->oActions->ErrorTemplates($sTitle, \nl2br($sDesc));
	}

	/**
	 * @param bool $bAdmin = true
	 *
	 * @return string
	 */
	private function localAppData($bAdmin = false)
	{
		@\header('Content-Type: application/javascript; charset=utf-8');
		$this->oHttp->ServerNoCache();

		$sAuthAccountHash = '';
		if (!$bAdmin && 0 === \strlen($this->oActions->GetSpecAuthLogoutTokenWithDeletion()))
		{
			$sAuthAccountHash = $this->oActions->GetSpecAuthTokenWithDeletion();
			if (empty($sAuthAccountHash))
			{
				$sAuthAccountHash = $this->oActions->GetSpecAuthToken();
			}

			if (empty($sAuthAccountHash))
			{
				$oAccount = $this->oActions->GetAccountFromSignMeToken();
				if ($oAccount)
				{
					try
					{
						$this->oActions->CheckMailConnection($oAccount);

						$this->oActions->AuthProcess($oAccount);

						$sAuthAccountHash = $this->oActions->GetSpecAuthToken();
					}
					catch (\Exception $oException)
					{
						$this->oActions->ClearSignMeData($oAccount);
					}
				}
			}

			$this->oActions->SetSpecAuthToken($sAuthAccountHash);
		}

		$sResult = $this->compileAppData($this->oActions->AppData($bAdmin, $sAuthAccountHash), false);

		$this->Logger()->Write($sResult, \MailSo\Log\Enumerations\Type::INFO, 'APPDATA');

		return $sResult;
	}

	/**
	 * @param bool $bAdmin = false
	 *
	 * @return string
	 */
	private function compileTemplates($bAdmin = false)
	{
		$sHtml = \RainLoop\Utils::CompileTemplates(APP_VERSION_ROOT_PATH.'app/templates/Views/'.($bAdmin ? 'Admin' : 'App'), $this->oActions).
			\RainLoop\Utils::CompileTemplates(APP_VERSION_ROOT_PATH.'app/templates/Views/Common', $this->oActions).
			$this->oActions->Plugins()->CompileTemplate($bAdmin);

		return 'window.rainloopTEMPLATES='.\MailSo\Base\Utils::Php2js(array($sHtml), $this->Logger()).';';
	}

	/**
	 * @param string $sLanguage
	 * @param bool $bWrapByScriptTag = true
	 *
	 * @return string
	 */
	private function compileLanguage($sLanguage, $bWrapByScriptTag = true)
	{
		$aResultLang = array();

		$sMoment = 'window.moment && window.moment.lang && window.moment.lang(\'en\');';
		$sMomentFileName = APP_VERSION_ROOT_PATH.'app/i18n/moment/'.$sLanguage.'.js';
		if (\file_exists($sMomentFileName))
		{
			$sMoment = \file_get_contents($sMomentFileName);
			$sMoment = \preg_replace('/\/\/[^\n]+\n/', '', $sMoment);
		}

		\RainLoop\Utils::ReadAndAddLang(APP_VERSION_ROOT_PATH.'app/i18n/langs.ini', $aResultLang);
		\RainLoop\Utils::ReadAndAddLang(APP_VERSION_ROOT_PATH.'langs/'.$sLanguage.'.ini', $aResultLang);

		$this->Plugins()->ReadLang($sLanguage, $aResultLang);

		$sLangJs = '';
		$aLangKeys = \array_keys($aResultLang);
		foreach ($aLangKeys as $sKey)
		{
			$sString = isset($aResultLang[$sKey]) ? $aResultLang[$sKey] : $sKey;

			$sLangJs .= '"'.\str_replace('"', '\\"', \str_replace('\\', '\\\\', $sKey)).'":'
				.'"'.\str_replace(array("\r", "\n", "\t"), array('\r', '\n', '\t'),
					\str_replace('"', '\\"', \str_replace('\\', '\\\\', $sString))).'",';
		}

		$sResult = empty($sLangJs) ? 'null' : '{'.\substr($sLangJs, 0, -1).'}';

		return
			($bWrapByScriptTag ? '<script type="text/javascript" data-cfasync="false">' : '').
			'window.rainloopI18N='.$sResult.';'.$sMoment.
			($bWrapByScriptTag ? '</script>' : '')
		;
	}

	/**
	 * @param array $aAppData
	 * @param bool $bWrapByScriptTag = true
	 *
	 * @return string
	 */
	private function compileAppData($aAppData, $bWrapByScriptTag = true)
	{
		return
			($bWrapByScriptTag ? '<script type="text/javascript" data-cfasync="false">' : '').
			'window.rainloopAppData='.\json_encode($aAppData).';'.
			'if(window.__rlah_set){__rlah_set()};'.
			($bWrapByScriptTag ? '</script>' : '')
		;
	}
}
