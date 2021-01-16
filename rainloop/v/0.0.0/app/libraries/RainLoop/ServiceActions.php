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
	 * @return \RainLoop\Providers\Settings
	 */
	public function SettingsProvider()
	{
		return $this->oActions->SettingsProvider();
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

		$this->oActions->SetIsAjax(true);

		try
		{
			if ($this->oHttp->IsPost() &&
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

			if (\is_array($aResponseItem) && $oException instanceof \RainLoop\Exceptions\ClientException)
			{
				if ('Folders' === $sAction)
				{
					$aResponseItem['ClearAuth'] = true;
				}

				if ($oException->getLogoutOnException())
				{
					$aResponseItem['Logout'] = true;
					if ($oException->getAdditionalMessage())
					{
						$this->oActions->SetSpecLogoutCustomMgsWithDeletion($oException->getAdditionalMessage());
					}
				}
			}
		}

		if (\is_array($aResponseItem))
		{
			$aResponseItem['Time'] = (int) ((\microtime(true) - APP_START) * 1000);

			$sUpdateToken = $this->oActions->GetUpdateAuthToken();
			if ($sUpdateToken)
			{
				$aResponseItem['UpdateToken'] = $sUpdateToken;
			}
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
	public function ServiceOwnCloudAuth()
	{
		$this->oHttp->ServerNoCache();

		if (!\RainLoop\Utils::IsOwnCloud() ||
			!isset($_ENV['___rainloop_owncloud_email']) ||
			!isset($_ENV['___rainloop_owncloud_password']) ||
			empty($_ENV['___rainloop_owncloud_email'])
		)
		{
			$this->oActions->SetAuthLogoutToken();
			$this->oActions->Location('./');
			return '';
		}

		$bLogout = true;

		$sEmail = $_ENV['___rainloop_owncloud_email'];
		$sPassword = $_ENV['___rainloop_owncloud_password'];

		try
		{
			$oAccount = $this->oActions->LoginProcess($sEmail, $sPassword);
			$this->oActions->AuthToken($oAccount);

			$bLogout = !($oAccount instanceof \RainLoop\Model\Account);
		}
		catch (\Exception $oException)
		{
			$this->oActions->Logger()->WriteException($oException);
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
	 * @param int $iSizeLimit = 0
	 *
	 * @return string
	 */
	private function privateUpload($sAction, $iSizeLimit = 0)
	{
		$oConfig = $this->Config();

		@\ob_start();
		$aResponseItem = null;
		try
		{
			$aFile = null;
			$sInputName = 'uploader';
			$iError = \RainLoop\Enumerations\UploadError::UNKNOWN;
			$iSizeLimit = (0 < $iSizeLimit ? $iSizeLimit : ((int) $oConfig->Get('webmail', 'attachment_size_limit', 0))) * 1024 * 1024;

			$iError = UPLOAD_ERR_OK;
			$_FILES = isset($_FILES) ? $_FILES : null;
			if (isset($_FILES, $_FILES[$sInputName], $_FILES[$sInputName]['name'], $_FILES[$sInputName]['tmp_name'], $_FILES[$sInputName]['size']))
			{
				$iError = (isset($_FILES[$sInputName]['error'])) ? (int) $_FILES[$sInputName]['error'] : UPLOAD_ERR_OK;

				if (UPLOAD_ERR_OK === $iError && 0 < $iSizeLimit && $iSizeLimit < (int) $_FILES[$sInputName]['size'])
				{
					$iError = \RainLoop\Enumerations\UploadError::CONFIG_SIZE;
				}

				if (UPLOAD_ERR_OK === $iError)
				{
					$aFile = $_FILES[$sInputName];
				}
			}
			else if (!isset($_FILES) || !is_array($_FILES) || 0 === count($_FILES))
			{
				$iError = UPLOAD_ERR_INI_SIZE;
			}
			else
			{
				$iError = \RainLoop\Enumerations\UploadError::EMPTY_FILES_DATA;
			}

			if (\method_exists($this->oActions, $sAction) &&
				\is_callable(array($this->oActions, $sAction)))
			{
				$aActionParams = $this->oHttp->GetQueryAsArray();

				$aActionParams['File'] = $aFile;
				$aActionParams['Error'] = $iError;

				$this->oActions->SetActionParams($aActionParams, $sAction);

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
		return $this->privateUpload('UploadContacts', 5);
	}

	/**
	 * @return string
	 */
	public function ServiceUploadBackground()
	{
		return $this->privateUpload('UploadBackground', 1);
	}

	/**
	 * @return string
	 */
	public function ServiceProxyExternal()
	{
		$bResult = false;
		$sData = empty($this->aPaths[1]) ? '' : $this->aPaths[1];
		if (!empty($sData) && $this->oActions->Config()->Get('labs', 'use_local_proxy_for_external_images', false))
		{
			$this->oActions->verifyCacheByKey($sData);

			$aData = \RainLoop\Utils::DecodeKeyValuesQ($sData);
			if (\is_array($aData) && !empty($aData['Token']) && !empty($aData['Url']) && $aData['Token'] === \RainLoop\Utils::GetConnectionToken())
			{
				$iCode = 404;
				$sContentType = '';
				$mResult = $this->oHttp->GetUrlAsString($aData['Url'], 'RainLoop External Proxy', $sContentType, $iCode);

				if (false !== $mResult && 200 === $iCode &&
					\in_array($sContentType, array('image/png', 'image/jpeg', 'image/jpg', 'image/bmp', 'image/gif')))
				{
					$bResult = true;

					$this->oActions->cacheByKey($sData);

					\header('Content-Type: '.$sContentType);
					echo $mResult;
				}
			}
		}

		if (!$bResult)
		{
			$this->oHttp->StatusHeader(404);
		}

		return '';
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
					@\header('X-Raw-Action: '.$sMethodName, true);
					@\header('Content-Security-Policy: script-src \'none\'; child-src \'none\'', true);

					$sRawError = '';
					$this->oActions->SetActionParams(array(
						'RawKey' => empty($this->aPaths[3]) ? '' : $this->aPaths[3],
						'Params' => $this->aPaths
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
				else
				{
					$sRawError = 'Unknown action "'.$sAction.'"';
				}
			}
			else
			{
				$sRawError = 'Empty action';
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
			$this->oActions->Logger()->WriteDump($this->aPaths, \MailSo\Log\Enumerations\Type::ERROR, 'PATHS');
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
//		sleep(2);
		$sResult = '';
		@\header('Content-Type: application/javascript; charset=utf-8');

		if (!empty($this->aPaths[3]))
		{
			$bAdmim =  'Admin' === (isset($this->aPaths[2]) ? (string) $this->aPaths[2] : 'App');
			$sLanguage = $this->oActions->ValidateLanguage($this->aPaths[3], '', $bAdmim);

			$bCacheEnabled = $this->Config()->Get('labs', 'cache_system_data', true);
			if (!empty($sLanguage) && $bCacheEnabled)
			{
				$this->oActions->verifyCacheByKey($this->sQuery);
			}

			$sCacheFileName = '';
			if ($bCacheEnabled)
			{
				$sCacheFileName = \RainLoop\KeyPathHelper::LangCache(
					$sLanguage, $bAdmim, $this->oActions->Plugins()->Hash());

				$sResult = $this->Cacher()->Get($sCacheFileName);
			}

			if (0 === \strlen($sResult))
			{
				$sResult = $this->compileLanguage($sLanguage, $bAdmim, false);
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
			$sCacheFileName = \RainLoop\KeyPathHelper::TemplatesCache($bAdmin, $this->oActions->Plugins()->Hash());
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
			$sCacheFileName = \RainLoop\KeyPathHelper::PluginsJsCache($this->oActions->Plugins()->Hash());
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
		$bJson = !empty($this->aPaths[9]) && 'Json' === $this->aPaths[9];

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
				$sCacheFileName = \RainLoop\KeyPathHelper::CssCache($sTheme, $this->oActions->Plugins()->Hash());
				$sResult = $this->Cacher()->Get($sCacheFileName);
			}

			if (0 === \strlen($sResult))
			{
				try
				{
					include_once APP_VERSION_ROOT_PATH.'app/libraries/lessphp/ctype.php';
					include_once APP_VERSION_ROOT_PATH.'app/libraries/lessphp/lessc.inc.php';

					$oLess = new \RainLoopVendor\lessc();
					$oLess->setFormatter('compressed');

					$aResult = array();

					$sThemeFile = ($bCustomTheme ? APP_INDEX_ROOT_PATH : APP_VERSION_ROOT_PATH).'themes/'.$sRealTheme.'/styles.less';
					$sThemeExtFile = ($bCustomTheme ? APP_INDEX_ROOT_PATH : APP_VERSION_ROOT_PATH).'themes/'.$sRealTheme.'/ext.less';

					$sThemeValuesFile = APP_VERSION_ROOT_PATH.'app/templates/Themes/values.less';
					$sThemeTemplateFile = APP_VERSION_ROOT_PATH.'app/templates/Themes/template.less';

					if (\file_exists($sThemeFile) && \file_exists($sThemeTemplateFile) && \file_exists($sThemeValuesFile))
					{
						$aResult[] = '@base: "'.
							($bCustomTheme ? \RainLoop\Utils::WebPath() : \RainLoop\Utils::WebVersionPath()).
							'themes/'.$sRealTheme.'/";';

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
		$bXAuth = '1' === (string) $this->oHttp->GetQuery('xauth', '0');
		return $this->oActions->Social()->GooglePopupService($bXAuth);
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
	public function ServiceAppData($sAdd = '')
	{
		return $this->localAppData(false, $sAdd);
	}

	/**
	 * @return string
	 */
	public function ServiceAdminAppData($sAdd = '')
	{
		return $this->localAppData(true, $sAdd);
	}

	/**
	 * @return string
	 */
	public function ServiceMobileVersion()
	{
		\RainLoop\Utils::SetCookie(\RainLoop\Actions::RL_MOBILE_TYPE, 'mobile');
		$this->oActions->Location('./');
		return '';
	}

	/**
	 * @return string
	 */
	public function ServiceDesktopVersion()
	{
		\RainLoop\Utils::SetCookie(\RainLoop\Actions::RL_MOBILE_TYPE, 'desktop');
		$this->oActions->Location('./');
		return '';
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
			'{{BaseWebStaticPath}}' => \RainLoop\Utils::WebStaticPath(),
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
		$this->oHttp->ServerNoCache();

		$sTo = \trim($this->oHttp->GetQuery('to', ''));
		if (!empty($sTo) && \preg_match('/^mailto:/i', $sTo))
		{
			$oAccount = $this->oActions->GetAccountFromSignMeToken();
			if ($oAccount)
			{
				$this->oActions->SetMailtoRequest($sTo);
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
		$this->oHttp->ServerNoCache();

		@\header('Content-Type: text/plain; charset=utf-8');
		$this->oActions->Logger()->Write('Pong', \MailSo\Log\Enumerations\Type::INFO, 'PING');
		return 'Pong';
	}

	/**
	 * @return string
	 */
	public function ServiceInfo()
	{
		$this->oHttp->ServerNoCache();

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
		$this->oHttp->ServerNoCache();

		$oException = null;
		$oAccount = null;
		$bLogout = true;

		$sSsoHash = $this->oHttp->GetRequest('hash', '');
		if (!empty($sSsoHash))
		{
			$mData = null;

			$sSsoSubData = $this->Cacher()->Get(\RainLoop\KeyPathHelper::SsoCacherKey($sSsoHash));
			if (!empty($sSsoSubData))
			{
				$mData = \RainLoop\Utils::DecodeKeyValuesQ($sSsoSubData);
				$this->Cacher()->Delete(\RainLoop\KeyPathHelper::SsoCacherKey($sSsoHash));

				if (\is_array($mData) && !empty($mData['Email']) && isset($mData['Password'], $mData['Time']) &&
					(0 === $mData['Time'] || \time() - 10 < $mData['Time']))
				{
					$sEmail = \trim($mData['Email']);
					$sPassword = $mData['Password'];

					$aAdditionalOptions = isset($mData['AdditionalOptions']) && \is_array($mData['AdditionalOptions']) &&
						0 < \count($mData['AdditionalOptions']) ? $mData['AdditionalOptions'] : null;

					try
					{
						$oAccount = $this->oActions->LoginProcess($sEmail, $sPassword);

						if ($oAccount instanceof \RainLoop\Model\Account && $aAdditionalOptions)
						{
							$bNeedToSettings = false;

							$oSettings = $this->SettingsProvider()->Load($oAccount);
							if ($oSettings)
							{
								$sLanguage = isset($aAdditionalOptions['Language']) ?
									$aAdditionalOptions['Language'] : '';

								if ($sLanguage)
								{
									$sLanguage = $this->oActions->ValidateLanguage($sLanguage);
									if ($sLanguage !== $oSettings->GetConf('Language', ''))
									{
										$bNeedToSettings = true;
										$oSettings->SetConf('Language', $sLanguage);
									}
								}
							}

							if ($bNeedToSettings)
							{
								$this->SettingsProvider()->Save($oAccount, $oSettings);
							}
						}

						$this->oActions->AuthToken($oAccount);

						$bLogout = !($oAccount instanceof \RainLoop\Model\Account);
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
		$sPassword = $this->oHttp->GetEnv('REMOTE_PASSWORD', '');

		if (0 < \strlen($sEmail) && 0 < \strlen(\trim($sPassword)))
		{
			try
			{
				$oAccount = $this->oActions->LoginProcess($sEmail, $sPassword);
				$this->oActions->AuthToken($oAccount);
				$bLogout = !($oAccount instanceof \RainLoop\Model\Account);
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
		$this->oHttp->ServerNoCache();

		$oException = null;
		$oAccount = null;
		$bLogout = true;

		if ($this->oActions->Config()->Get('labs', 'allow_external_login', false))
		{
			$sEmail = \trim($this->oHttp->GetRequest('Email', ''));
			$sPassword = $this->oHttp->GetRequest('Password', '');

			try
			{
				$oAccount = $this->oActions->LoginProcess($sEmail, $sPassword);
				$this->oActions->AuthToken($oAccount);
				$bLogout = !($oAccount instanceof \RainLoop\Model\Account);
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
					'Result' => $oAccount instanceof \RainLoop\Model\Account ? true : false,
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
		$this->oHttp->ServerNoCache();

		$sResult = '';
		$bLogout = true;
		$sKey = $this->oActions->Config()->Get('labs', 'external_sso_key', '');
		if ($this->oActions->Config()->Get('labs', 'allow_external_sso', false) &&
			!empty($sKey) && $sKey === \trim($this->oHttp->GetRequest('SsoKey', '')))
		{
			$sEmail = \trim($this->oHttp->GetRequest('Email', ''));
			$sPassword = $this->oHttp->GetRequest('Password', '');

			$sResult = \RainLoop\Api::GetUserSsoHash($sEmail, $sPassword);
			$bLogout = 0 === \strlen($sResult);

			switch (\strtolower($this->oHttp->GetRequest('Output', 'Plain')))
			{
				case 'plain':
					@\header('Content-Type: text/plain');
					break;

				case 'json':
					@\header('Content-Type: application/json; charset=utf-8');
					$sResult = \MailSo\Base\Utils::Php2js(array(
						'Action' => 'ExternalSso',
						'Result' => $sResult
					), $this->Logger());
					break;
			}
		}

		if ($bLogout)
		{
			$this->oActions->SetAuthLogoutToken();
		}

		return $sResult;
	}

	private function changeAction()
	{
		$this->oHttp->ServerNoCache();

		$oAccount = $this->oActions->GetAccount();

		if ($oAccount && $this->oActions->GetCapa(false, false, \RainLoop\Enumerations\Capa::ADDITIONAL_ACCOUNTS, $oAccount))
		{
			$oAccountToLogin = null;
			$sEmail = empty($this->aPaths[2]) ? '' : \urldecode(\trim($this->aPaths[2]));
			if (!empty($sEmail))
			{
				$sEmail = \MailSo\Base\Utils::IdnToAscii($sEmail);

				$aAccounts = $this->oActions->GetAccounts($oAccount);
				if (isset($aAccounts[$sEmail]))
				{
					$oAccountToLogin = $this->oActions->GetAccountFromCustomToken($aAccounts[$sEmail], false, false);
				}
			}

			if ($oAccountToLogin)
			{
				$this->oActions->AuthToken($oAccountToLogin);
			}
		}
	}

	/**
	 * @return string
	 */
	public function ServiceChange()
	{
		$this->changeAction();
		$this->oActions->Location('./');
		return '';
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
			'{{BaseWebStaticPath}}' => \RainLoop\Utils::WebStaticPath(),
			'{{ErrorTitle}}' => $sTitle,
			'{{ErrorHeader}}' => $sTitle,
			'{{ErrorDesc}}' => $sDesc,
			'{{BackLinkVisibilityStyle}}' => $bShowBackLink ? 'display:inline-block' : 'display:none',
			'{{BackLink}}' => $this->oActions->StaticI18N('STATIC/BACK_LINK'),
			'{{BackHref}}' => './'
		));
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
		return $this->ErrorTemplates($sTitle, \nl2br($sDesc));
	}

	/**
	 * @param bool $bAdmin = true
	 * @param string $sAdd = ''
	 *
	 * @return string
	 */
	private function localAppData($bAdmin = false, $sAdd = '')
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

						$this->oActions->AuthToken($oAccount);

						$sAuthAccountHash = $this->oActions->GetSpecAuthToken();
					}
					catch (\Exception $oException)
					{
						$oException = null;
						$this->oActions->ClearSignMeData($oAccount);
					}
				}
			}

			$this->oActions->SetSpecAuthToken($sAuthAccountHash);
		}

		$sResult = $this->compileAppData($this->oActions->AppData($bAdmin,
			0 === \strpos($sAdd, 'mobile'), '1' === \substr($sAdd, -1),
			$sAuthAccountHash), false);

		$this->Logger()->Write($sResult, \MailSo\Log\Enumerations\Type::INFO, 'APPDATA');

		return $sResult;
	}

	/**
	 * @param bool $bAdmin = false
	 * @param bool $bJsOutput = true
	 *
	 * @return string
	 */
	public function compileTemplates($bAdmin = false, $bJsOutput = true)
	{
		$aTemplates = array();

		\RainLoop\Utils::CompileTemplates($aTemplates, APP_VERSION_ROOT_PATH.'app/templates/Views/Components', 'Component');
		\RainLoop\Utils::CompileTemplates($aTemplates, APP_VERSION_ROOT_PATH.'app/templates/Views/'.($bAdmin ? 'Admin' : 'User'));
		\RainLoop\Utils::CompileTemplates($aTemplates, APP_VERSION_ROOT_PATH.'app/templates/Views/Common');

		$this->oActions->Plugins()->CompileTemplate($aTemplates, $bAdmin);

		$sHtml = '<script id="rainloop-templates-id"></script>';
		foreach ($aTemplates as $sName => $sFile)
		{
			$sName = \preg_replace('/[^a-zA-Z0-9]/', '', $sName);
			$sHtml .= '<script id="'.$sName.'" type="text/html" data-cfasync="false">'.
				$this->oActions->ProcessTemplate($sName, \file_get_contents($sFile)).'</script>';
		}

		unset($aTemplates);

		return $bJsOutput ? 'window.rainloopTEMPLATES='.\MailSo\Base\Utils::Php2js(array($sHtml), $this->Logger()).';' : $sHtml;
	}

	/**
	 * @param string $sLanguage
	 *
	 * @return string
	 */
	private function convertLanguageNameToMomentLanguageName($sLanguage)
	{
		$aHelper = array('en_gb' => 'en-gb', 'fr_ca' => 'fr-ca', 'pt_br' => 'pt-br',
			'uk_ua' => 'ua', 'zh_cn' => 'zh-cn', 'zh_tw' => 'zh-tw', 'fa_ir' => 'fa');

		return isset($aHelper[$sLanguage]) ? $aHelper[$sLanguage] : \substr($sLanguage, 0, 2);
	}

	/**
	 * @param string $sLanguage
	 * @param bool $bAdmin = false
	 * @param bool $bWrapByScriptTag = true
	 *
	 * @return string
	 */
	private function compileLanguage($sLanguage, $bAdmin = false, $bWrapByScriptTag = true)
	{
		$aResultLang = array();

		$sMoment = 'window.moment && window.moment.locale && window.moment.locale(\'en\');';
		$sMomentFileName = APP_VERSION_ROOT_PATH.'app/localization/moment/'.
			$this->convertLanguageNameToMomentLanguageName($sLanguage).'.js';

		if (\file_exists($sMomentFileName))
		{
			$sMoment = \file_get_contents($sMomentFileName);
			$sMoment = \preg_replace('/\/\/[^\n]+\n/', '', $sMoment);
		}

		\RainLoop\Utils::ReadAndAddLang(APP_VERSION_ROOT_PATH.'app/localization/langs.yml', $aResultLang);
		\RainLoop\Utils::ReadAndAddLang(APP_VERSION_ROOT_PATH.'app/localization/'.
			($bAdmin ? 'admin' : 'webmail').'/_source.en.yml', $aResultLang);
		\RainLoop\Utils::ReadAndAddLang(APP_VERSION_ROOT_PATH.'app/localization/'.
			($bAdmin ? 'admin' : 'webmail').'/'.$sLanguage.'.yml', $aResultLang);

		$this->Plugins()->ReadLang($sLanguage, $aResultLang);

		$sLangJs = '';
		$aLangKeys = \array_keys($aResultLang);
		foreach ($aLangKeys as $sKey)
		{
			$sString = isset($aResultLang[$sKey]) ? $aResultLang[$sKey] : $sKey;
			if (\is_array($sString))
			{
				$sString = \implode("\n", $sString);
			}

			$sLangJs .= '"'.\str_replace('"', '\\"', \str_replace('\\', '\\\\', $sKey)).'":'
				.'"'.\str_replace(array("\r", "\n", "\t"), array('\r', '\n', '\t'),
					\str_replace('"', '\\"', \str_replace('\\', '\\\\', $sString))).'",';
		}

		$sResult = empty($sLangJs) ? 'null' : '{'.\substr($sLangJs, 0, -1).'}';

		return
			($bWrapByScriptTag ? '<script data-cfasync="false">' : '').
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
			'if(window.__initAppData){window.__initAppData('.\json_encode($aAppData).');}'.
			($bWrapByScriptTag ? '</script>' : '')
		;
	}
}
