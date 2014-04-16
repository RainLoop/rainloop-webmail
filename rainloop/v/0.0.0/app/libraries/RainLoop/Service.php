<?php

namespace RainLoop;

class Service
{
	/**
	 * @var \MailSo\Base\Http
	 */
	private $oHttp;

	/**
	 * @var \RainLoop\Actions
	 */
	private $oActions;

	/**
	 * @var \RainLoop\ServiceActions
	 */
	private $oServiceActions;

	/**
	 * @return void
	 */
	private function __construct()
	{
		$this->oHttp = \MailSo\Base\Http::SingletonInstance();
		$this->oActions = Actions::NewInstance();

		\set_error_handler(array(&$this, 'LogPhpErrorHandler'));
		
		$this->oServiceActions = new \RainLoop\ServiceActions($this->oHttp, $this->oActions);

		if ($this->oActions->Config()->Get('debug', 'enable', false))
		{
			\error_reporting(E_ALL);
			\ini_set('display_errors', 1);
		}

		if ($this->oActions->Config()->Get('labs', 'disable_iconv_if_mbstring_supported') &&
			\class_exists('MailSo\Capa') && \MailSo\Base\Utils::IsMbStringSupported())
		{
			\MailSo\Capa::$ICONV = false;
		}

		$sServer = \trim($this->oActions->Config()->Get('security', 'custom_server_signature', ''));
		if (0 < \strlen($sServer))
		{
			@\header('Server: '.$sServer, true);
		}
	}

	/**
	 * @return \RainLoop\Service
	 */
	public static function NewInstance()
	{
		return new self();
	}

	/**
	 * @param int $iErrNo
	 * @param string $sErrStr
	 * @param string $sErrFile
	 * @param int $iErrLine
	 * 
	 * @return bool
	 */
	public function LogPhpErrorHandler($iErrNo, $sErrStr, $sErrFile, $iErrLine)
	{
		$iType = \MailSo\Log\Enumerations\Type::NOTICE;
		switch ($iErrNo)
		{
			 case E_USER_ERROR:
				 $iType = \MailSo\Log\Enumerations\Type::ERROR;
				 break;
			 case E_USER_WARNING:
				 $iType = \MailSo\Log\Enumerations\Type::WARNING;
				 break;
		}

		if (!\in_array($sErrStr, array('iconv(): Detected an illegal character in input string')))
		{
			$this->oActions->Logger()->Write($sErrFile.' [line:'.$iErrLine.', code:'.$iErrNo.']', $iType, 'PHP');
			$this->oActions->Logger()->Write('Error: '.$sErrStr, $iType, 'PHP');
		}
		
		return false;
	}

	/**
	 * @return \RainLoop\Service
	 */
	public function Handle()
	{
		if (!\class_exists('MailSo\Version'))
		{
			return $this;
		}
		
		$this->oActions->ParseQueryAuthString();

		if (defined('APP_INSTALLED_START') && defined('APP_INSTALLED_VERSION') &&
			APP_INSTALLED_START && !APP_INSTALLED_VERSION)
		{
			$this->oActions->KeenIO('Install');
		}

		$bCached = false;
		$sResult = '';
		$sPathInfo = \trim(\trim($this->oHttp->GetServer('PATH_INFO', '')), ' /');
		if (!empty($sPathInfo))
		{
			if ('dav' !== \substr($sPathInfo, 0, 3))
			{
				$sPathInfo = '';
			}
		}

		if (empty($sPathInfo))
		{
			$sQuery = \trim(\trim($this->oHttp->GetServer('QUERY_STRING', '')), ' /');
			$iPos = \strpos($sQuery, '&');
			if (0 < $iPos)
			{
				$sQuery = \substr($sQuery, 0, $iPos);
			}
		}
		else
		{
			$sQuery = $sPathInfo;
		}

		$this->oActions->Plugins()->RunHook('filter.http-query', array(&$sQuery));
		$aPaths = \explode('/', $sQuery);
		$this->oActions->Plugins()->RunHook('filter.http-paths', array(&$aPaths));

		$bAdmin = false;
		$sAdminPanelHost = $this->oActions->Config()->Get('security', 'admin_panel_host', '');
		if (empty($sAdminPanelHost))
		{
			$bAdmin = !empty($aPaths[0]) && \in_array(\strtolower($aPaths[0]), array('admin', 'cp'));
		}
		else if (empty($aPaths[0]) && \strtolower($sAdminPanelHost) === \strtolower($this->oHttp->GetHost()))
		{
			$bAdmin = true;
		}

		if ($bAdmin && !$this->oActions->Config()->Get('security', 'allow_admin_panel', true))
		{
			echo $this->oActions->ErrorTemplates('Access Denied.',
				'Access to the RainLoop Webmail Admin Panel is not allowed!', true);
			
			return $this;
		}

		if (0 < \count($aPaths) && !empty($aPaths[0]) && !$bAdmin && 'index' !== $aPaths[0])
		{
			$sMethodName = 'Service'.$aPaths[0];
			if (\method_exists($this->oServiceActions, $sMethodName) &&
				\is_callable(array($this->oServiceActions, $sMethodName)))
			{
				$this->oServiceActions->SetQuery($sQuery)->SetPaths($aPaths);
				$sResult = \call_user_func(array($this->oServiceActions, $sMethodName));
			}
			else if (!$this->oActions->Plugins()->RunAdditionalPart($aPaths[0], $aPaths))
			{
				$this->oActions->Logger()->Write('Unknown request', \MailSo\Log\Enumerations\Type::WARNING, 'RESPONSE');
			}
		}
		else
		{
			@header('Content-Type: text/html; charset=utf-8');

			$aData = $this->startUpData($bAdmin);

			$bCacheEnabled = $this->oActions->Config()->Get('labs', 'cache_system_data', true);

			$sCacheFileName = '';
			if ($bCacheEnabled)
			{
				$sCacheFileName = 'TMPL:'.$aData['Hash'];
				$sResult = $this->oActions->Cacher()->Get($sCacheFileName);
			}

			if (0 === \strlen($sResult))
			{
				$sJsBoot = \file_get_contents(APP_VERSION_ROOT_PATH.'static/js/boot.js');
				$sResult = \strtr(\file_get_contents(APP_VERSION_ROOT_PATH.'app/templates/Index.html'), array(
					'{{BaseRandHash}}' => \md5(\rand(1000, 9000).\microtime(true)),
					'{{BaseAppDataScriptLink}}' => ($bAdmin ? APP_INDEX_FILE.'?/AdminAppData/' : APP_INDEX_FILE.'?/AppData/'),
					'{{BaseAppIndexFile}}' => APP_INDEX_FILE,
					'{{BaseAppFaviconIcoFile}}' => $aData['FaviconIcoLink'],
					'{{BaseAppFaviconPngFile}}' => $aData['FaviconPngLink'],
					'{{BaseAppAppleTouchFile}}' => $aData['AppleTouchLink'],
					'{{BaseAppMainCssLink}}' => $aData['AppCssLink'],
					'{{BaseAppBootScriptSource}}' => $sJsBoot,
					'{{BaseAppLibsScriptLink}}' => $aData['LibJsLink'],
					'{{BaseAppEditorScriptLink}}' => $aData['EditorJsLink'],
					'{{BaseAppMainScriptLink}}' => $aData['AppJsLink'],
					'{{BaseAppLoadingDescription}}' => \htmlspecialchars($aData['LoadingDescription'], ENT_QUOTES|ENT_IGNORE, 'UTF-8'),
					'{{BaseDir}}' => \in_array($aData['Language'], array('ar', 'he', 'ur')) ? 'rtl' : 'ltr'
				));

				$sResult = \RainLoop\Utils::ClearHtmlOutput($sResult);
				if (0 < \strlen($sCacheFileName))
				{
					$this->oActions->Cacher()->Set($sCacheFileName, $sResult);
				}
			}
			else
			{
				$bCached = true;
			}

			$sResult .= '<!--';
			$sResult .= ' [version:'.APP_VERSION;
			$sResult .= '][time:'.substr(\microtime(true) - APP_START, 0, 6);
			$sResult .= '][cached:'.($bCached ? 'true' : 'false');
			$sResult .= '][session:'.md5(\RainLoop\Utils::GetShortToken());
			$sResult .= '] -->';
		}

		// Output result
		echo $sResult;
		unset($sResult);

		return $this;
	}

	/**
	 * @param bool $bAppJsDebug
	 * @param bool $bAdmin
	 *
	 * @return string
	 */
	private function generateIndexCacheHash($bAppJsDebug, $bAdmin)
	{
		return \md5(APP_WEB_PATH.
			$this->oActions->Config()->Get('webmail', 'loading_description', 'RainLoop').
			$this->oActions->Config()->Get('labs', 'cdn_static_domain', '').
			\md5($this->oActions->Config()->Get('cache', 'index', '')).
			$this->oActions->Plugins()->Hash().
			APP_VERSION.($bAppJsDebug ? 'd' : 'm').($bAdmin ? 'a' : 'w'));
	}

	/**
	 * @param bool $bAdmin
	 *
	 * @return array
	 */
	private function startUpData($bAdmin)
	{
		$sLanguage = 'en';
		$sTheme = 'Default';

		if (!$bAdmin)
		{
			list($sLanguage, $sTheme) = $this->oActions->GetLanguageAndTheme();
		}

		$sLanguage = $this->oActions->ValidateLanguage($sLanguage);
		$sTheme = $this->oActions->ValidateTheme($sTheme);

		$bAppJsDebug = !!$this->oActions->Config()->Get('labs', 'use_app_debug_js', false);
		$bAppCssDebug = !!$this->oActions->Config()->Get('labs', 'use_app_debug_css', false);
		$sCdnStaticDomain = $this->oActions->Config()->Get('labs', 'cdn_static_domain', '');

		$sStaticPrefix = APP_WEB_STATIC_PATH;
		if (0 < \strlen($sCdnStaticDomain))
		{
			$sStaticPrefix = \trim($sCdnStaticDomain, ' /\\').'/'.APP_VERSION.'/static/';
		}

		return array(
			'Language' => $sLanguage,
			'Theme' => $sTheme,
			'Hash' => $this->generateIndexCacheHash($bAppJsDebug, $bAdmin),
			'LoadingDescription' => $this->oActions->Config()->Get('webmail', 'loading_description', 'RainLoop'),
			'FaviconIcoLink' => $sStaticPrefix.'favicon.ico',
			'FaviconPngLink' => $sStaticPrefix.'favicon.png',
			'AppleTouchLink' => $sStaticPrefix.'apple-touch-icon.png',
			'AppCssLink' => $sStaticPrefix.'css/app'.($bAppCssDebug ? '' : '.min').'.css',
			'LibJsLink' => $sStaticPrefix.'js/libs.js',
			'EditorJsLink' => $sStaticPrefix.'ckeditor/ckeditor.js',
			'AppJsLink' => $sStaticPrefix.'js/'.($bAdmin ? 'admin' : 'app').($bAppJsDebug ? '' : '.min').'.js'
		);
	}
}
