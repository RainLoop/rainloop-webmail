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
		$this->oActions = \RainLoop\Api::Actions();

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

		$sXFrameOptionsHeader = \trim($this->oActions->Config()->Get('security', 'x_frame_options_header', ''));
		if (0 < \strlen($sXFrameOptionsHeader))
		{
			@\header('X-Frame-Options: '.$sXFrameOptionsHeader, true);
		}

		if ($this->oActions->Config()->Get('labs', 'force_https', false) && !$this->oHttp->IsSecure())
		{
			@\header('Location: https://'.$this->oHttp->GetHost(false, false).$this->oHttp->GetUrl(), true);
			exit();
		}

		$this->localHandle();
	}

	/**
	 * @return bool
	 */
	public function RunResult()
	{
		return true;
	}

	/**
	 * @staticvar bool $bOne
	 * @return bool
	 */
	public static function Handle()
	{
		static $bOne = null;
		if (null === $bOne)
		{
			$oService = null;
			if (\class_exists('MailSo\Version'))
			{
				$oService = new self();
			}

			$bOne = $oService->RunResult();
		}

		return $bOne;
	}

	/**
	 * @return \RainLoop\Service
	 */
	private function localHandle()
	{
		if (!\class_exists('MailSo\Version'))
		{
			return $this;
		}

		$this->oActions->BootStart();

		$sResult = '';
		$bCached = false;

		$sQuery = $this->oActions->ParseQueryAuthString();

		$this->oActions->Plugins()->RunHook('filter.http-query', array(&$sQuery));
		$aPaths = \explode('/', $sQuery);
		$this->oActions->Plugins()->RunHook('filter.http-paths', array(&$aPaths));

		$bAdmin = false;
		$sAdminPanelHost = $this->oActions->Config()->Get('security', 'admin_panel_host', '');
		if (empty($sAdminPanelHost))
		{
			$bAdmin = !empty($aPaths[0]) && \in_array(\strtolower($aPaths[0]), array('admin', 'cp'));
		}
		else if (empty($aPaths[0]) &&
			\MailSo\Base\Utils::StrToLowerIfAscii($sAdminPanelHost) === \MailSo\Base\Utils::StrToLowerIfAscii($this->oHttp->GetHost()))
		{
			$bAdmin = true;
		}

		if ($this->oHttp->IsPost())
		{
			$this->oHttp->ServerNoCache();
		}

		if ($bAdmin && !$this->oActions->Config()->Get('security', 'allow_admin_panel', true))
		{
			echo $this->oServiceActions->ErrorTemplates('Access Denied.',
				'Access to the RainLoop Webmail Admin Panel is not allowed!', true);

			return $this;
		}

		$bIndex = true;
		if (0 < \count($aPaths) && !empty($aPaths[0]) && !$bAdmin && 'index' !== $aPaths[0])
		{
			$bIndex = false;
			$sMethodName = 'Service'.$aPaths[0];
			if (\method_exists($this->oServiceActions, $sMethodName) &&
				\is_callable(array($this->oServiceActions, $sMethodName)))
			{
				$this->oServiceActions->SetQuery($sQuery)->SetPaths($aPaths);
				$sResult = \call_user_func(array($this->oServiceActions, $sMethodName));
			}
			else if (!$this->oActions->Plugins()->RunAdditionalPart($aPaths[0], $aPaths))
			{
				$bIndex = true;
			}
		}

		if ($bIndex)
		{
			@\header('Content-Security-Policy:');
			@\header_remove('Content-Security-Policy');

			@header('Content-Type: text/html; charset=utf-8');
			$this->oHttp->ServerNoCache();

			if (!@\is_dir(APP_DATA_FOLDER_PATH) || !@\is_writable(APP_DATA_FOLDER_PATH))
			{
				echo $this->oServiceActions->ErrorTemplates(
					'Permission denied!',
					'RainLoop Webmail cannot access to the data folder "'.APP_DATA_FOLDER_PATH.'"'
				);

				return $this;
			}

			$aTemplateParameters = $this->indexTemplateParameters($bAdmin);

			$sCacheFileName = '';
			if ($this->oActions->Config()->Get('labs', 'cache_system_data', true))
			{
				$sCacheFileName = 'TMPL:'.$aTemplateParameters['{{BaseHash}}'];
				$sResult = $this->oActions->Cacher()->Get($sCacheFileName);
			}

			if (0 === \strlen($sResult))
			{
//				$aTemplateParameters['{{BaseTemplates}}'] = $this->oServiceActions->compileTemplates($bAdmin, false);
				$sResult = \strtr(\file_get_contents(APP_VERSION_ROOT_PATH.'app/templates/Index.html'), $aTemplateParameters);

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
			$sResult .= '][time:'.\substr(\microtime(true) - APP_START, 0, 6);
			$sResult .= '][cached:'.($bCached ? 'true' : 'false');
			$sResult .= '][hash:'.$aTemplateParameters['{{BaseHash}}'];
			$sResult .= '][session:'.\md5(\RainLoop\Utils::GetShortToken());

			if (\RainLoop\Utils::IsOwnCloud())
			{
				$sResult .= '][owncloud:true';
			}

			$sResult .= '] -->';
		}

		// Output result
		echo $sResult;
		unset($sResult);

		$this->oActions->BootEnd();
		return $this;
	}

	/**
	 * @param bool $bAdmin
	 *
	 * @return array
	 */
	private function indexTemplateParameters($bAdmin)
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

		$sStaticPrefix = \RainLoop\Utils::WebStaticPath();

		$aData = array(
			'Language' => $sLanguage,
			'Theme' => $sTheme,
			'FaviconIcoLink' => $sStaticPrefix.'favicon.ico',
			'FaviconPngLink' => $sStaticPrefix.'favicon.png',
			'AppleTouchLink' => $sStaticPrefix.'apple-touch-icon.png',
			'AppCssLink' => $sStaticPrefix.'css/app'.($bAppCssDebug ? '' : '.min').'.css',
			'BootJsLink' => $sStaticPrefix.'js/min/boot.js',
			'ComponentsJsLink' => $sStaticPrefix.'js/'.($bAppJsDebug ? '' : 'min/').'components.js',
			'LibJsLink' => $sStaticPrefix.'js/min/libs.js',
			'EditorJsLink' => $sStaticPrefix.'ckeditor/ckeditor.js',
			'OpenPgpJsLink' => $sStaticPrefix.'js/min/openpgp.min.js',
			'AppJsCommonLink' => $sStaticPrefix.'js/'.($bAppJsDebug ? '' : 'min/').'common.js',
			'AppJsLink' => $sStaticPrefix.'js/'.($bAppJsDebug ? '' : 'min/').($bAdmin ? 'admin' : 'app').'.js'
		);

		$aTemplateParameters =  array(
			'{{BaseAppDataScriptLink}}' => ($bAdmin ? './?/AdminAppData/' : './?/AppData/'),
			'{{BaseAppFaviconIcoFile}}' => $aData['FaviconIcoLink'],
			'{{BaseAppFaviconPngFile}}' => $aData['FaviconPngLink'],
			'{{BaseAppAppleTouchFile}}' => $aData['AppleTouchLink'],
			'{{BaseAppMainCssLink}}' => $aData['AppCssLink'],
			'{{BaseAppBootScriptLink}}' => $aData['BootJsLink'],
			'{{BaseAppComponentsScriptLink}}' => $aData['ComponentsJsLink'],
			'{{BaseAppLibsScriptLink}}' => $aData['LibJsLink'],
			'{{BaseAppEditorScriptLink}}' => $aData['EditorJsLink'],
			'{{BaseAppOpenPgpScriptLink}}' => $aData['OpenPgpJsLink'],
			'{{BaseAppMainCommonScriptLink}}' => $aData['AppJsCommonLink'],
			'{{BaseAppMainScriptLink}}' => $aData['AppJsLink'],
			'{{BaseDir}}' => \in_array($aData['Language'], array('ar', 'he', 'ur')) ? 'rtl' : 'ltr'
		);

		$aTemplateParameters['{{BaseHash}}'] = \md5(
			\implode('~', array(
				\md5($this->oActions->Config()->Get('cache', 'index', '')),
				$this->oActions->Plugins()->Hash(),
				\RainLoop\Utils::WebVersionPath(), APP_VERSION
			)).
			\implode('~', $aTemplateParameters)
		);

		return $aTemplateParameters;
	}
}
