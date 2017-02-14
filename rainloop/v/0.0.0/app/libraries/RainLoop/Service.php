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
			exit(0);
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
			$sAdminPanelKey = \strtolower($this->oActions->Config()->Get('security', 'admin_panel_key', 'admin'));
			$bAdmin = !empty($aPaths[0]) && \strtolower($aPaths[0]) === $sAdminPanelKey;
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
		if (0 < \count($aPaths) && !empty($aPaths[0]) && !$bAdmin && 'index' !== \strtolower($aPaths[0]))
		{
			$bIndex = false;
			$sMethodName = 'Service'.\preg_replace('/@.+$/', '', $aPaths[0]);
			$sMethodExtra = 0 < \strpos($aPaths[0], '@') ? \preg_replace('/^[^@]+@/', '', $aPaths[0]) : '';

			if (\method_exists($this->oServiceActions, $sMethodName) &&
				\is_callable(array($this->oServiceActions, $sMethodName)))
			{
				$this->oServiceActions->SetQuery($sQuery)->SetPaths($aPaths);
				$sResult = \call_user_func(array($this->oServiceActions, $sMethodName), $sMethodExtra);
			}
			else if (!$this->oActions->Plugins()->RunAdditionalPart($aPaths[0], $aPaths))
			{
				$bIndex = true;
			}
		}

		$bMobile = false;
		$bMobileDevice = false;

		if ($this->oActions->Config()->Get('labs', 'allow_mobile_version', false))
		{
			$oMobileDetect = new \Detection\MobileDetect();
			$bMobileDevice = $oMobileDetect->isMobile() && !$oMobileDetect->isTablet();

			$bMobile = (0 < \count($aPaths) && !empty($aPaths[0]) && 'mobile' === \strtolower($aPaths[0]));
		}

		if ($bIndex && !$bMobile)
		{
			$iMobileKey = (int) \RainLoop\Utils::GetCookie(\RainLoop\Actions::RL_SKIP_MOBILE_KEY, 0);
			if (1 !== $iMobileKey)
			{
				if ($bMobileDevice)
				{
					$this->oActions->Location('./?/Mobile/');
					return $this;
				}
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

			$aTemplateParameters = $this->indexTemplateParameters($bAdmin, $bMobile, $bMobileDevice);

			$sCacheFileName = '';
			if ($this->oActions->Config()->Get('labs', 'cache_system_data', true) && !empty($aTemplateParameters['{{BaseHash}}']))
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
			$sResult .= '[time:'.\substr(\microtime(true) - APP_START, 0, 6);

//			$sResult .= '][version:'.APP_VERSION;
			if ($this->oActions->IsOpen())
			{
				$sResult .= '][AGPLv3';
			}

			$sResult .= '][cached:'.($bCached ? 'true' : 'false');
//			$sResult .= '][hash:'.$aTemplateParameters['{{BaseHash}}'];
//			$sResult .= '][session:'.\md5(\RainLoop\Utils::GetShortToken());

			if ($bMobile)
			{
				$sResult .= '][mobile:true';
			}

			if (\RainLoop\Utils::IsOwnCloud())
			{
				$sResult .= '][cloud:true';
			}

			$sResult .= ']-->';
		}

		// Output result
		echo $sResult;
		unset($sResult);

		$this->oActions->BootEnd();
		return $this;
	}

	/**
	 * @param string $sPath
	 *
	 * @return string
	 */
	private function staticPath($sPath)
	{
		return $this->oActions->StaticPath($sPath);
	}

	/**
	 * @param bool $bAdmin = false
	 * @param bool $bMobile = false
	 * @param bool $bMobileDevice = false
	 *
	 * @return array
	 */
	private function indexTemplateParameters($bAdmin = false, $bMobile = false, $bMobileDevice = false)
	{
		$sLanguage = 'en';
		$sTheme = 'Default';

		list($sLanguage, $sTheme) = $this->oActions->GetLanguageAndTheme($bAdmin, $bMobile);

		$bAppJsDebug = !!$this->oActions->Config()->Get('labs', 'use_app_debug_js', false);
		$bAppCssDebug = !!$this->oActions->Config()->Get('labs', 'use_app_debug_css', false);

		$sFaviconUrl = (string) $this->oActions->Config()->Get('webmail', 'favicon_url', '');

		$sFaviconPngLink = $sFaviconUrl ? $sFaviconUrl : $this->staticPath('apple-touch-icon.png');
		$sAppleTouchLink = $sFaviconUrl ? '' : $this->staticPath('apple-touch-icon.png');

		$sContentSecurityPolicy = $this->oActions->Config()->Get('security', 'content_security_policy', '');

		$aTemplateParameters = array(
			'{{BaseAppFaviconPngLinkTag}}' => $sFaviconPngLink ? '<link type="image/png" rel="shortcut icon" href="'.$sFaviconPngLink.'" />' : '',
			'{{BaseAppFaviconTouchLinkTag}}' => $sAppleTouchLink ? '<link type="image/png" rel="apple-touch-icon" href="'.$sAppleTouchLink.'" />' : '',
			'{{BaseAppMainCssLink}}' => $this->staticPath('css/app'.($bAppCssDebug ? '' : '.min').'.css'),
			'{{BaseAppThemeCssLink}}' => $this->oActions->ThemeLink($sTheme, $bAdmin),
			'{{BaseAppBootScriptLink}}' => $this->staticPath('js/'.($bAppJsDebug ? '' : 'min/').'boot'.($bAppJsDebug ? '' : '.min').'.js'),
			'{{BaseViewport}}' => $bMobile ? 'width=device-width,initial-scale=1,user-scalable=no' : 'width=950,maximum-scale=2',
			'{{BaseContentSecurityPolicy}}' => $sContentSecurityPolicy ?
				'<meta http-equiv="Content-Security-Policy" content="'.$sContentSecurityPolicy.'" />' : '',
			'{{BaseDir}}' => false && \in_array($sLanguage, array('ar', 'he', 'ur')) ? 'rtl' : 'ltr',
			'{{BaseAppManifestLink}}' => $this->staticPath('manifest.json')
		);

		$aTemplateParameters['{{RainloopBootData}}'] = \json_encode(array(
			'admin' => $bAdmin,
			'language' => $sLanguage,
			'theme' => $sTheme,
			'mobile' => $bMobile,
			'mobileDevice' => $bMobileDevice
		));

		$aTemplateParameters['{{BaseHash}}'] = \md5(
			\implode('~', array(
				$bAdmin ? '1' : '0',
				\md5($this->oActions->Config()->Get('cache', 'index', '')),
				$this->oActions->Plugins()->Hash(),
				\RainLoop\Utils::WebVersionPath(),
				APP_VERSION,
			)).
			\implode('~', $aTemplateParameters)
		);

		return $aTemplateParameters;
	}
}
