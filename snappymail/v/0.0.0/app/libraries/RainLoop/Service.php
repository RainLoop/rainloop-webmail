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

	function __construct()
	{
		$this->oHttp = \MailSo\Base\Http::SingletonInstance();
		$this->oActions = Api::Actions();

		$this->oServiceActions = new ServiceActions($this->oHttp, $this->oActions);
	}

	/**
	 * @staticvar bool $bOne
	 */
	public static function Handle() : bool
	{
		static $bOne = null;
		if (null === $bOne)
		{
			$bOne = (new self)->RunResult();
		}

		return $bOne;
	}

	public function RunResult() : bool
	{
		if ($this->oActions->Config()->Get('debug', 'enable', false))
		{
			\error_reporting(E_ALL);
			\ini_set('display_errors', 1);
			\ini_set('log_errors', 1);
		}

		$sServer = \trim($this->oActions->Config()->Get('security', 'custom_server_signature', ''));
		if (0 < \strlen($sServer))
		{
			\header('Server: '.$sServer, true);
		}

		\header('Referrer-Policy: no-referrer');
		\header('X-Content-Type-Options: nosniff');

		// Google FLoC
		\header('Permissions-Policy: interest-cohort=()');

		$sContentSecurityPolicy = \trim($this->oActions->Config()->Get('security', 'content_security_policy', '')) ?: APP_DEFAULT_CSP;
		if ($this->oActions->Config()->Get('security', 'use_local_proxy_for_external_images', '')) {
			$sContentSecurityPolicy = preg_replace('/(img-src[^;]+)\\shttps:(\\s|;|$)/D', '$1$2', $sContentSecurityPolicy);
			$sContentSecurityPolicy = preg_replace('/(img-src[^;]+)\\shttp:(\\s|;|$)/D', '$1$2', $sContentSecurityPolicy);
		}
		\header('Content-Security-Policy: '.$sContentSecurityPolicy, true);

		$sXFrameOptionsHeader = \trim($this->oActions->Config()->Get('security', 'x_frame_options_header', '')) ?: 'DENY';
		\header('X-Frame-Options: '.$sXFrameOptionsHeader, true);

		$sXssProtectionOptionsHeader = \trim($this->oActions->Config()->Get('security', 'x_xss_protection_header', '')) ?: '1; mode=block';
		\header('X-XSS-Protection: '.$sXssProtectionOptionsHeader, true);

		if ($this->oActions->Config()->Get('labs', 'force_https', false) && !$this->oHttp->IsSecure())
		{
			\header('Location: https://'.$this->oHttp->GetHost(false, false).$this->oHttp->GetUrl(), true);
			exit(0);
		}

		$sQuery = $this->oActions->ParseQueryString();

		$this->oActions->Plugins()->RunHook('filter.http-query', array(&$sQuery));
		$aPaths = \explode('/', $sQuery);
//		unset($aPaths[1]); // was the rlspecauth/AuthAccountHash token
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

		$bAdmin || $this->oActions->getAuthAccountHash();

		if ($this->oHttp->IsPost())
		{
			$this->oHttp->ServerNoCache();
		}

		if ($bAdmin && !$this->oActions->Config()->Get('security', 'allow_admin_panel', true))
		{
			\MailSo\Base\Http::StatusHeader(403);
			echo $this->oServiceActions->ErrorTemplates('Access Denied.',
				'Access to the SnappyMail Admin Panel is not allowed!', true);

			return $this;
		}

		$bIndex = true;
		$sResult = '';
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

		if ($bIndex)
		{
			\header('Content-Type: text/html; charset=utf-8');
			$this->oHttp->ServerNoCache();

			if (!\is_dir(APP_DATA_FOLDER_PATH) || !\is_writable(APP_DATA_FOLDER_PATH))
			{
				echo $this->oServiceActions->ErrorTemplates(
					'Permission denied!',
					'SnappyMail cannot access to the data folder "'.APP_DATA_FOLDER_PATH.'"'
				);

				return $this;
			}

			$sLanguage = $this->oActions->GetLanguage($bAdmin);

			$aTemplateParameters = $this->indexTemplateParameters($bAdmin);

			$sCacheFileName = '';
			if ($this->oActions->Config()->Get('labs', 'cache_system_data', true) && !empty($aTemplateParameters['{{BaseHash}}']))
			{
				$sCacheFileName = 'TMPL:'.$sLanguage.$aTemplateParameters['{{BaseHash}}'];
				$sResult = $this->oActions->Cacher()->Get($sCacheFileName);
			}

			if ($sResult) {
				$sResult .= '<!--cached-->';
			} else {
				$aTemplateParameters['{{BaseAppThemeCss}}'] = $this->oActions->compileCss($this->oActions->GetTheme($bAdmin), $bAdmin);
				$aTemplateParameters['{{BaseLanguage}}'] = $this->oActions->compileLanguage($sLanguage, $bAdmin);
				$aTemplateParameters['{{BaseTemplates}}'] = $this->oServiceActions->compileTemplates($bAdmin, false);
				$sResult = \strtr(\file_get_contents(APP_VERSION_ROOT_PATH.'app/templates/Index.html'), $aTemplateParameters);

				$sResult = Utils::ClearHtmlOutput($sResult);
				if ($sCacheFileName) {
					$this->oActions->Cacher()->Set($sCacheFileName, $sResult);
				}
			}
		}
		else if (!\headers_sent())
		{
			\header('X-XSS-Protection: 1; mode=block');
		}

		// Output result
		echo $sResult;
		unset($sResult);

		$this->oActions->BootEnd();

		return true;
	}

	private function staticPath(string $sPath) : string
	{
		return $this->oActions->StaticPath($sPath);
	}

	private function indexTemplateParameters(bool $bAdmin) : array
	{
		$oConfig = $this->oActions->Config();

		$bAppJsDebug = !!$oConfig->Get('labs', 'use_app_debug_js', false);
		$bAppCssDebug = !!$oConfig->Get('labs', 'use_app_debug_css', false);

		$sFaviconUrl = (string) $oConfig->Get('webmail', 'favicon_url', '');

		$sFaviconPngLink = $sFaviconUrl ? $sFaviconUrl : $this->staticPath('apple-touch-icon.png');
		$sAppleTouchLink = $sFaviconUrl ? '' : $this->staticPath('apple-touch-icon.png');

		$LoadingDescription = $oConfig->Get('webmail', 'loading_description', 'SnappyMail');

		$aTemplateParameters = array(
			'{{BaseAppFaviconPngLinkTag}}' => $sFaviconPngLink ? '<link type="image/png" rel="shortcut icon" href="'.$sFaviconPngLink.'" />' : '',
			'{{BaseAppFaviconTouchLinkTag}}' => $sAppleTouchLink ? '<link type="image/png" rel="apple-touch-icon" href="'.$sAppleTouchLink.'" />' : '',
			'{{BaseAppMainCssLink}}' => $this->staticPath('css/'.($bAdmin ? 'admin' : 'app').($bAppCssDebug ? '' : '.min').'.css'),
			'{{BaseAppThemeCssLink}}' => $this->oActions->ThemeLink($bAdmin),
			'{{BaseAppBootScript}}' => \file_get_contents(APP_VERSION_ROOT_PATH.'static/js/min/boot.min.js'),
			'{{BaseAppManifestLink}}' => $this->staticPath('manifest.json'),
			'{{BaseAppBootCss}}' => \file_get_contents(APP_VERSION_ROOT_PATH.'static/css/boot.min.css'),
			'{{LoadingDescriptionEsc}}' => \htmlspecialchars($LoadingDescription, ENT_QUOTES|ENT_IGNORE, 'UTF-8'),
			'{{BaseAppAdmin}}' => $bAdmin ? 1 : 0
		);

		$aTemplateParameters['{{BaseHash}}'] = \md5(
			\implode('~', array(
				$bAdmin ? '1' : '0',
				\md5($oConfig->Get('cache', 'index', '')),
				$this->oActions->Plugins()->Hash(),
				Utils::WebVersionPath(),
				APP_VERSION,
			)).
			\implode('~', $aTemplateParameters)
		);

		return $aTemplateParameters;
	}
}
