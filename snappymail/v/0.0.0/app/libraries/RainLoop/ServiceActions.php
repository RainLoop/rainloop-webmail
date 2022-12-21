<?php

namespace RainLoop;

class ServiceActions
{
	protected \MailSo\Base\Http $oHttp;

	protected Actions $oActions;

	protected array $aPaths = array();

	protected string $sQuery = '';

	public function __construct(\MailSo\Base\Http $oHttp, Actions $oActions)
	{
		$this->oHttp = $oHttp;
		$this->oActions = $oActions;
	}

	private function Logger() : \MailSo\Log\Logger
	{
		return $this->oActions->Logger();
	}

	private function Plugins() : Plugins\Manager
	{
		return $this->oActions->Plugins();
	}

	private function Config() : Config\Application
	{
		return $this->oActions->Config();
	}

	private function Cacher() : \MailSo\Cache\CacheClient
	{
		return $this->oActions->Cacher();
	}

	private function StorageProvider() : Providers\Storage
	{
		return $this->oActions->StorageProvider();
	}

	private function SettingsProvider() : Providers\Settings
	{
		return $this->oActions->SettingsProvider();
	}

	public function SetPaths(array $aPaths) : self
	{
		$this->aPaths = $aPaths;
		return $this;
	}

	public function SetQuery(string $sQuery) : self
	{
		$this->sQuery = $sQuery;
		return $this;
	}

/*
	public function ServiceBackup() : void
	{
		if (\method_exists($this->oActions, 'DoAdminBackup')) {
			$this->oActions->DoAdminBackup();
		}
		exit;
	}
*/

	public function ServiceJson() : string
	{
		\ob_start();

		$aResponse = null;
		$oException = null;

		$_POST = \json_decode(\file_get_contents('php://input'), true);

		$sAction = $_POST['Action'] ?? '';
		if (empty($sAction) && $this->oHttp->IsGet() && !empty($this->aPaths[2])) {
			$sAction = $this->aPaths[2];
		}

		$this->oActions->SetIsJson(true);

		try
		{
			if (empty($sAction)) {
				throw new Exceptions\ClientException(Notifications::InvalidInputArgument, null, 'Action unknown');
			}

			if ($this->oHttp->IsPost() &&
				$this->Config()->Get('security', 'csrf_protection', false) &&
				($_POST['XToken'] ?? '') !== Utils::GetCsrfToken())
			{
				throw new Exceptions\ClientException(Notifications::InvalidToken, null, 'CSRF failed');
			}

			if ($this->oActions instanceof ActionsAdmin && 0 === \stripos($sAction, 'Admin') && !\in_array($sAction, ['AdminLogin', 'AdminLogout'])) {
				$this->oActions->IsAdminLoggined();
			}

			$sMethodName = 'Do'.$sAction;

			$this->Logger()->Write('Action: '.$sMethodName, \LOG_INFO, 'JSON');

			$aPost = $_POST ?? null;
			if ($aPost) {
				$this->oActions->SetActionParams($aPost, $sMethodName);
				foreach ($aPost as $key => $value) {
					if (false !== \stripos($key, 'Password')) {
						$aPost[$key] = '*******';
					}
				}
/*
				switch ($sMethodName)
				{
					case 'DoLogin':
					case 'DoAdminLogin':
					case 'DoAccountAdd':
						$this->Logger()->AddSecret($this->oActions->GetActionParam('Password', ''));
						break;
				}
*/
				$this->Logger()->Write(Utils::jsonEncode($aPost), \LOG_INFO, 'POST', true);
			} else if (3 < \count($this->aPaths) && $this->oHttp->IsGet()) {
				$this->oActions->SetActionParams(array(
					'RawKey' => empty($this->aPaths[3]) ? '' : $this->aPaths[3]
				), $sMethodName);
			}

			if (\method_exists($this->oActions, $sMethodName) && \is_callable(array($this->oActions, $sMethodName))) {
				$this->Plugins()->RunHook("json.before-{$sAction}");
				$aResponse = $this->oActions->{$sMethodName}();
			} else if ($this->Plugins()->HasAdditionalJson($sMethodName)) {
				$this->Plugins()->RunHook("json.before-{$sAction}");
				$aResponse = $this->Plugins()->RunAdditionalJson($sMethodName);
			}

			if (\is_array($aResponse)) {
				$this->Plugins()->RunHook("json.after-{$sAction}", array(&$aResponse));
			}

			if (!\is_array($aResponse)) {
				throw new Exceptions\ClientException(Notifications::UnknownError);
			}
		}
		catch (\Throwable $oException)
		{
			\SnappyMail\Log::warning('SERVICE', "{$oException->getMessage()}\r\n{$oException->getTraceAsString()}");
			if ($e = $oException->getPrevious()) {
				\SnappyMail\Log::warning('SERVICE', "- {$e->getMessage()} @ {$e->getFile()}#{$e->getLine()}");
			}

			$aResponse = $this->oActions->ExceptionResponse($oException);
		}

		$aResponse['Action'] = $sAction ?: 'Unknown';

		if (\is_array($aResponse)) {
			$aResponse['Time'] = (int) ((\microtime(true) - $_SERVER['REQUEST_TIME_FLOAT']) * 1000);
		}

		if (!\headers_sent()) {
			\header('Content-Type: application/json; charset=utf-8');
		}

		$sResult = Utils::jsonEncode($aResponse);

		$sObResult = \ob_get_clean();

		if ($this->Logger()->IsEnabled()) {
			if (\strlen($sObResult)) {
				$this->Logger()->Write($sObResult, \LOG_ERR, 'OB-DATA');
			}

			if ($oException) {
				$this->Logger()->WriteException($oException, \LOG_ERR);
			}

			$iLimit = (int) $this->Config()->Get('labs', 'log_ajax_response_write_limit', 0);
			$this->Logger()->Write(0 < $iLimit && $iLimit < \strlen($sResult)
					? \substr($sResult, 0, $iLimit).'...' : $sResult, \LOG_INFO, 'JSON');
		}

		return $sResult;
	}

	public function ServiceAppend() : string
	{
		\ob_start();
		$bResponse = false;
		$oException = null;
		try
		{
			if (\method_exists($this->oActions, 'Append') && \is_callable(array($this->oActions, 'Append'))) {
				isset($_POST) && $this->oActions->SetActionParams($_POST, 'Append');
				$bResponse = $this->oActions->Append();
			}
		}
		catch (\Throwable $oException)
		{
			$bResponse = false;
		}

		\header('Content-Type: text/plain; charset=utf-8');
		$sResult = true === $bResponse ? '1' : '0';

		$sObResult = \ob_get_clean();
		if (\strlen($sObResult)) {
			$this->Logger()->Write($sObResult, \LOG_ERR, 'OB-DATA');
		}

		if ($oException) {
			$this->Logger()->WriteException($oException, \LOG_ERR);
		}

		$this->Logger()->Write($sResult, \LOG_INFO, 'APPEND');

		return $sResult;
	}

	private function privateUpload(string $sAction, int $iSizeLimit = 0) : string
	{
		$oConfig = $this->Config();

		\ob_start();
		$aResponse = null;
		try
		{
			$aFile = null;
			$sInputName = 'uploader';
			$iError = Enumerations\UploadError::UNKNOWN;
			$iSizeLimit = (0 < $iSizeLimit ? $iSizeLimit : ((int) $oConfig->Get('webmail', 'attachment_size_limit', 0))) * 1024 * 1024;

			$iError = UPLOAD_ERR_OK;
			$_FILES = isset($_FILES) ? $_FILES : null;
			if (isset($_FILES[$sInputName], $_FILES[$sInputName]['name'], $_FILES[$sInputName]['tmp_name'], $_FILES[$sInputName]['size'])) {
				$iError = (isset($_FILES[$sInputName]['error'])) ? (int) $_FILES[$sInputName]['error'] : UPLOAD_ERR_OK;
//				\is_uploaded_file($_FILES[$sInputName]['tmp_name'])

				if (UPLOAD_ERR_OK === $iError && 0 < $iSizeLimit && $iSizeLimit < (int) $_FILES[$sInputName]['size']) {
					$iError = Enumerations\UploadError::CONFIG_SIZE;
				}

				if (UPLOAD_ERR_OK === $iError) {
					$aFile = $_FILES[$sInputName];
				}
			} else if (empty($_FILES)) {
				$iError = UPLOAD_ERR_INI_SIZE;
			} else {
				$iError = Enumerations\UploadError::EMPTY_FILES_DATA;
			}

			if (\method_exists($this->oActions, $sAction) && \is_callable(array($this->oActions, $sAction))) {
				$aActionParams = isset($_GET) && \is_array($_GET) ? $_GET : null;

				$aActionParams['File'] = $aFile;
				$aActionParams['Error'] = $iError;

				$this->oActions->SetActionParams($aActionParams, $sAction);

				$aResponse = $this->oActions->{$sAction}();
			}

			if (!is_array($aResponse)) {
				throw new Exceptions\ClientException(Notifications::UnknownError);
			}

			$this->Plugins()->RunHook('filter.upload-response', array(&$aResponse));
		}
		catch (\Throwable $oException)
		{
			$aResponse = $this->oActions->ExceptionResponse($oException);
		}

		$aResponse['Action'] = $sAction ?: 'Unknown';

		\header('Content-Type: application/json; charset=utf-8');

		$sResult = Utils::jsonEncode($aResponse);

		$sObResult = \ob_get_clean();
		if (\strlen($sObResult)) {
			$this->Logger()->Write($sObResult, \LOG_ERR, 'OB-DATA');
		}

		$this->Logger()->Write($sResult, \LOG_INFO, 'UPLOAD');

		return $sResult;
	}

	public function ServiceUpload() : string
	{
		return $this->privateUpload('Upload');
	}

	public function ServiceUploadContacts() : string
	{
		return $this->privateUpload('UploadContacts', 5);
	}

	public function ServiceUploadBackground() : string
	{
		return $this->privateUpload('UploadBackground', 1);
	}

	public function ServiceProxyExternal() : string
	{
		$sData = empty($this->aPaths[1]) ? '' : $this->aPaths[1];
		if ($sData && $this->Config()->Get('labs', 'use_local_proxy_for_external_images', false)) {
			$this->oActions->verifyCacheByKey($sData);
			$sUrl = \MailSo\Base\Utils::UrlSafeBase64Decode($sData);
			if (!empty($sUrl)) {
				\header('X-Content-Location: '.$sUrl);
				$tmp = \tmpfile();
				$HTTP = \SnappyMail\HTTP\Request::factory();
				$HTTP->max_redirects = 2;
				$HTTP->streamBodyTo($tmp);
				$oResponse = $HTTP->doRequest('GET', $sUrl);
				if ($oResponse && 200 === $oResponse->status
					&& \str_starts_with($oResponse->getHeader('content-type'), 'image/')
				) try {
					$this->oActions->cacheByKey($sData);
					\header('Content-Type: ' . $oResponse->getHeader('content-type'));
					\header('Cache-Control: public');
					\header('Expires: '.\gmdate('D, j M Y H:i:s', 2592000 + \time()).' UTC');
					\header('X-Content-Redirect-Location: '.$oResponse->final_uri);
					\rewind($tmp);
					\fpassthru($tmp);
					exit;
				} catch (\Throwable $e) {
					$msg = \get_class($HTTP) . ': ' . $e->getMessage();
					\SnappyMail\Log::error('Proxy', $msg);
//					\error_log(\get_class($HTTP) . ': ' . $e->getMessage());
				}
			}
		}

		\MailSo\Base\Http::StatusHeader(404);
		return '';
	}

	public function ServiceCspReport() : void
	{
		\SnappyMail\HTTP\CSP::logReport();
	}

	public function ServiceRaw() : string
	{
		$sResult = '';
		$sRawError = '';
		$sAction = empty($this->aPaths[2]) ? '' : $this->aPaths[2];
		$oException = null;

		try
		{
			$sRawError = 'Invalid action';
			if (\strlen($sAction)) {
				try {
					$sMethodName = 'Raw'.$sAction;
					if (\method_exists($this->oActions, $sMethodName)) {
						\header('X-Raw-Action: '.$sMethodName);
						\header('Content-Security-Policy: script-src \'none\'; child-src \'none\'');

						$sRawError = '';
						$this->oActions->SetActionParams(array(
							'RawKey' => empty($this->aPaths[3]) ? '' : $this->aPaths[3],
							'Params' => $this->aPaths
						), $sMethodName);

						if (!$this->oActions->{$sMethodName}()) {
							$sRawError = 'False result';
						}
					} else {
						$sRawError = 'Unknown action "'.$sAction.'"';
					}
				} catch (\Throwable $e) {
//					error_log(print_r($e,1));
					$sRawError = $e->getMessage();
				}
			} else {
				$sRawError = 'Empty action';
			}
		}
		catch (Exceptions\ClientException $oException)
		{
			$sRawError = Notifications::AuthError == $oException->getCode()
				? 'Authentication failed'
				: 'Exception as result';
		}
		catch (\Throwable $oException)
		{
			$sRawError = 'Exception as result';
		}

		if (\strlen($sRawError)) {
			$this->Logger()->Write($sRawError, \LOG_ERR);
			$this->Logger()->WriteDump($this->aPaths, \LOG_ERR, 'PATHS');
		}

		if ($oException) {
			$this->Logger()->WriteException($oException, \LOG_ERR, 'RAW');
		}

		return $sResult;
	}

	public function ServiceLang() : string
	{
//		sleep(2);
		$sResult = '';
		\header('Content-Type: application/javascript; charset=utf-8');

		if (!empty($this->aPaths[3])) {
			$bAdmin = 'Admin' === (isset($this->aPaths[2]) ? (string) $this->aPaths[2] : 'App');
			$sLanguage = $this->oActions->ValidateLanguage($this->aPaths[3], '', $bAdmin);

			$bCacheEnabled = $this->Config()->Get('labs', 'cache_system_data', true);
			if (!empty($sLanguage) && $bCacheEnabled) {
				$this->oActions->verifyCacheByKey($this->sQuery);
			}

			$sCacheFileName = '';
			if ($bCacheEnabled) {
				$sCacheFileName = KeyPathHelper::LangCache(
					$sLanguage, $bAdmin, $this->oActions->Plugins()->Hash());

				$sResult = $this->Cacher()->Get($sCacheFileName);
			}

			if (!\strlen($sResult)) {
				$sResult = $this->oActions->compileLanguage($sLanguage, $bAdmin);
				if ($bCacheEnabled && \strlen($sCacheFileName)) {
					$this->Cacher()->Set($sCacheFileName, $sResult);
				}
			}

			if ($bCacheEnabled) {
				$this->oActions->cacheByKey($this->sQuery);
			}
		}

		return $sResult;
	}

	public function ServicePlugins() : string
	{
		$sResult = '';
		$bAdmin = !empty($this->aPaths[2]) && 'Admin' === $this->aPaths[2];

		\header('Content-Type: application/javascript; charset=utf-8');

		$bAppDebug = $this->Config()->Get('debug', 'enable', false);
		$sMinify = ($bAppDebug || $this->Config()->Get('labs', 'use_app_debug_js', false)) ? '' : 'min';

		$bCacheEnabled = !$bAppDebug && $this->Config()->Get('labs', 'cache_system_data', true);
		if ($bCacheEnabled) {
			$this->oActions->verifyCacheByKey($this->sQuery . $sMinify);
		}

		$sCacheFileName = '';
		if ($bCacheEnabled) {
			$sCacheFileName = KeyPathHelper::PluginsJsCache($this->oActions->Plugins()->Hash()) . $sMinify;
			$sResult = $this->Cacher()->Get($sCacheFileName);
		}

		if (!$sResult) {
			$sResult = $this->Plugins()->CompileJs($bAdmin, !!$sMinify);
			if ($sCacheFileName) {
				$this->Cacher()->Set($sCacheFileName, $sResult);
			}
		}

		if ($bCacheEnabled) {
			$this->oActions->cacheByKey($this->sQuery . $sMinify);
		}

		return $sResult;
	}

	public function ServiceCss() : string
	{
		$sResult = '';
		$bAdmin = !empty($this->aPaths[2]) && 'Admin' === $this->aPaths[2];
		$bJson = !empty($this->aPaths[9]) && 'Json' === $this->aPaths[9];

		if ($bJson) {
			\header('Content-Type: application/json; charset=utf-8');
		} else {
			\header('Content-Type: text/css; charset=utf-8');
		}

		$sTheme = '';
		if (!empty($this->aPaths[4])) {
			$sTheme = $this->oActions->ValidateTheme($this->aPaths[4]);

			$bAppDebug = $this->Config()->Get('debug', 'enable', false);
			$sMinify = ($bAppDebug || $this->Config()->Get('labs', 'use_app_debug_css', false)) ? '' : 'min';

			$bCacheEnabled = !$bAppDebug && $this->Config()->Get('labs', 'cache_system_data', true);
			if ($bCacheEnabled) {
				$this->oActions->verifyCacheByKey($this->sQuery . $sMinify);
			}

			$sCacheFileName = '';
			if ($bCacheEnabled) {
				$sCacheFileName = KeyPathHelper::CssCache($sTheme, $this->oActions->Plugins()->Hash()) . $sMinify;
				$sResult = $this->Cacher()->Get($sCacheFileName);
			}

			if (!$sResult) {
				try
				{
					$sResult = $this->oActions->compileCss($sTheme, $bAdmin);
					if ($sCacheFileName) {
						$this->Cacher()->Set($sCacheFileName, $sResult);
					}
				}
				catch (\Throwable $oException)
				{
					$this->Logger()->WriteException($oException, \LOG_ERR, 'LESS');
				}
			}

			if ($bCacheEnabled) {
				$this->oActions->cacheByKey($this->sQuery . $sMinify);
			}
		}

		return $bJson ? Utils::jsonEncode(array($sTheme, $sResult)) : $sResult;
	}

	public function ServiceAppData() : string
	{
		return $this->localAppData(false);
	}

	public function ServiceAdminAppData() : string
	{
		return $this->localAppData(true);
	}

	public function ServiceNoScript() : string
	{
		return $this->localError($this->oActions->StaticI18N('NO_SCRIPT_TITLE'), $this->oActions->StaticI18N('NO_SCRIPT_DESC'));
	}

	public function ServiceNoCookie() : string
	{
		return $this->localError($this->oActions->StaticI18N('NO_COOKIE_TITLE'), $this->oActions->StaticI18N('NO_COOKIE_DESC'));
	}

	public function ServiceBadBrowser() : string
	{
		$sTitle = $this->oActions->StaticI18N('BAD_BROWSER_TITLE');
		$sDesc = \nl2br($this->oActions->StaticI18N('BAD_BROWSER_DESC'));

		\header('Content-Type: text/html; charset=utf-8');
		return \strtr(\file_get_contents(APP_VERSION_ROOT_PATH.'app/templates/BadBrowser.html'), array(
			'{{ErrorTitle}}' => $sTitle,
			'{{ErrorHeader}}' => $sTitle,
			'{{ErrorDesc}}' => $sDesc
		));
	}

	public function ServiceMailto() : string
	{
		$this->oHttp->ServerNoCache();
		$sTo = \trim($_GET['to'] ?? '');
		if (!empty($sTo) && \preg_match('/^mailto:/i', $sTo)) {
			Utils::SetCookie(
				Actions::AUTH_MAILTO_TOKEN_KEY,
				Utils::EncodeKeyValuesQ(array(
					'Time' => \microtime(true),
					'MailTo' => 'MailTo',
					'To' => $sTo
				))
			);
		}
		$this->oActions->Location('./');
		return '';
	}

	public function ServicePing() : string
	{
		$this->oHttp->ServerNoCache();

		\header('Content-Type: text/plain; charset=utf-8');
		$this->oActions->Logger()->Write('Pong', \LOG_INFO, 'PING');
		return 'Pong';
	}

	/**
	 * Login with the \RainLoop\API::CreateUserSsoHash() generated hash
	 */
	public function ServiceSso() : string
	{
		$this->oHttp->ServerNoCache();

		$oException = null;
		$oAccount = null;

		$sSsoHash = $_REQUEST['hash'] ?? '';
		if (!empty($sSsoHash)) {
			$mData = null;

			$sSsoSubData = $this->Cacher()->Get(KeyPathHelper::SsoCacherKey($sSsoHash));
			if (!empty($sSsoSubData)) {
				$aData = \SnappyMail\Crypt::DecryptFromJSON($sSsoSubData, $sSsoHash);

				$this->Cacher()->Delete(KeyPathHelper::SsoCacherKey($sSsoHash));

				if (\is_array($aData) && !empty($aData['Email']) && isset($aData['Password'], $aData['Time']) &&
					(0 === $aData['Time'] || \time() - 10 < $aData['Time']))
				{
					$sEmail = \trim($aData['Email']);
					$sPassword = $aData['Password'];

					$aAdditionalOptions = (isset($aData['AdditionalOptions']) && \is_array($aData['AdditionalOptions']))
						? $aData['AdditionalOptions'] : [];

					try
					{
						$oAccount = $this->oActions->LoginProcess($sEmail, $sPassword);

						if ($aAdditionalOptions) {
							$bNeedToSettings = false;

							$oSettings = $this->SettingsProvider()->Load($oAccount);
							if ($oSettings) {
								$sLanguage = isset($aAdditionalOptions['Language']) ?
									$aAdditionalOptions['Language'] : '';

								if ($sLanguage) {
									$sLanguage = $this->oActions->ValidateLanguage($sLanguage);
									if ($sLanguage !== $oSettings->GetConf('Language', '')) {
										$bNeedToSettings = true;
										$oSettings->SetConf('Language', $sLanguage);
									}
								}
							}

							if ($bNeedToSettings) {
								$this->SettingsProvider()->Save($oAccount, $oSettings);
							}
						}

						if ($oAccount instanceof Model\MainAccount) {
							$this->oActions->SetAuthToken($oAccount);
						}
					}
					catch (\Throwable $oException)
					{
						$this->Logger()->WriteException($oException);
					}
				}
			}
		}

		$this->oActions->Location('./');
		return '';
	}

	public function ErrorTemplates(string $sTitle, string $sDesc, bool $bShowBackLink = true) : string
	{
		return \strtr(\file_get_contents(APP_VERSION_ROOT_PATH.'app/templates/Error.html'), array(
			'{{ErrorTitle}}' => $sTitle,
			'{{ErrorHeader}}' => $sTitle,
			'{{ErrorDesc}}' => $sDesc,
			'{{BackLinkVisibilityStyle}}' => $bShowBackLink ? 'display:inline-block' : 'display:none',
			'{{BackLink}}' => $this->oActions->StaticI18N('BACK_LINK'),
			'{{BackHref}}' => './'
		));
	}

	private function localError(string $sTitle, string $sDesc) : string
	{
		\header('Content-Type: text/html; charset=utf-8');
		return $this->ErrorTemplates($sTitle, \nl2br($sDesc));
	}

	private function localAppData(bool $bAdmin = false) : string
	{
		\header('Content-Type: application/javascript; charset=utf-8');
		$this->oHttp->ServerNoCache();
		try {
			$sResult = 'rl.initData('
				. Utils::jsonEncode($this->oActions->AppData($bAdmin))
				. ');';

			$this->Logger()->Write($sResult, \LOG_INFO, 'APPDATA');

			return $sResult;
		} catch (\Throwable $e) {
			return 'alert(' . \json_encode('ERROR: ' . $e->getMessage()) . ');';
		}
	}

	public function compileTemplates(bool $bAdmin = false) : string
	{
		$aTemplates = array();

		foreach (['Components', ($bAdmin ? 'Admin' : 'User'), 'Common'] as $dir) {
			$sNameSuffix = ('Components' === $dir) ? 'Component' : '';
			foreach (\glob(APP_VERSION_ROOT_PATH."app/templates/Views/{$dir}/*.html") as $file) {
				$sTemplateName = \basename($file, '.html') . $sNameSuffix;
				$aTemplates[$sTemplateName] = $file;
			}
		}

		$this->oActions->Plugins()->CompileTemplate($aTemplates, $bAdmin);

		$sHtml = '';
		foreach ($aTemplates as $sName => $sFile) {
			$sName = \preg_replace('/[^a-zA-Z0-9]/', '', $sName);
			$sHtml .= '<template id="'.$sName.'">'
				. \preg_replace('/<(\/?)script/i', '<$1x-script', \file_get_contents($sFile))
				. '</template>';
		}

		return \str_replace('&nbsp;', "\xC2\xA0", $sHtml);
	}
}
