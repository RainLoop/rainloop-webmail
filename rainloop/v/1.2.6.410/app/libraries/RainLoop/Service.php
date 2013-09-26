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

	public function LogPhpErrorHandler($errno, $errstr, $errfile, $errline)
	{
		$iType = \MailSo\Log\Enumerations\Type::NOTICE;
		switch ($errno)
		{
			 case E_USER_ERROR:
				 $iType = \MailSo\Log\Enumerations\Type::ERROR;
				 break;
			 case E_USER_WARNING:
				 $iType = \MailSo\Log\Enumerations\Type::WARNING;
				 break;
		}


		$this->oActions->Logger()->Write($errfile.' [line:'.$errline.', code:'.$errno.']', $iType, 'PHP');
		$this->oActions->Logger()->Write('Error: '.$errstr, $iType, 'PHP');
		
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

//		if (defined('APP_INSTALLED_START') && defined('APP_INSTALLED_VERSION') && APP_INSTALLED_START)
//		{
//			$this->oActions->KeenIO('CoreInstallation', array(
//				'previos-version' => false !== APP_INSTALLED_VERSION ? APP_INSTALLED_VERSION : ''
//			));
//		}

		$bCached = false;
		$sResult = '';
		$sQuery = \trim(\trim($this->oHttp->GetServer('QUERY_STRING', '')), ' /');
		$iPos = \strpos($sQuery, '&');
		if (0 < $iPos)
		{
			$sQuery = \substr($sQuery, 0, $iPos);
		}

		$this->oActions->Plugins()->RunHook('filter.http-query', array(&$sQuery));
		$aPaths = \explode('/', $sQuery);
		$this->oActions->Plugins()->RunHook('filter.http-paths', array(&$aPaths));

		if (0 < \count($aPaths) && !empty($aPaths[0]) && 'admin' !== \strtolower($aPaths[0]) && 'cp' !== \strtolower($aPaths[0]))
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
			$bAdmin = !empty($aPaths[0]) && ('admin' === \strtolower($aPaths[0]) || 'cp' === \strtolower($aPaths[0]));

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
				$sResult = \strtr(\file_get_contents(APP_VERSION_ROOT_PATH.'app/templates/Index.html'), array(
					'{{BaseTemplates}}' => \RainLoop\Utils::CompileTemplates(APP_VERSION_ROOT_PATH.'app/templates/Views', $this->oActions).
						$this->oActions->Plugins()->CompileTemplate($bAdmin),
					'{{BaseIndexFile}}' => APP_SHORT_INDEX_FILE_NAME,
					'{{BaseAppDataScriptLink}}' => APP_SHORT_INDEX_FILE_NAME.($bAdmin ? '?/AdminAppData/' : '?/AppData/'),
					'{{BaseAppFaviconFile}}' => $aData['FaviconLink'],
					'{{BaseAppMainCssLink}}' => $aData['AppCssLink'],
					'{{BaseAppJqueryScriptLink}}' => $aData['JqueryJsLink'],
					'{{BaseAppLibsScriptLink}}' => $aData['LibJsLink'],
					'{{BaseAppMainScriptLink}}' => $aData['AppJsLink'],
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
		return \md5(APP_WEB_PATH.APP_SHORT_INDEX_FILE_NAME.
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
			'FaviconLink' => $sStaticPrefix.'favicon.png',
			'AppCssLink' => $sStaticPrefix.'css/app.css',
			'JqueryJsLink' => $sStaticPrefix.'js/jquery.js',
			'LibJsLink' => $sStaticPrefix.'js/libs.js',
			'AppJsLink' => $sStaticPrefix.'js/'.($bAdmin ? 'admin' : 'app').($bAppJsDebug ? '' : '.min').'.js'
		);
	}
}
