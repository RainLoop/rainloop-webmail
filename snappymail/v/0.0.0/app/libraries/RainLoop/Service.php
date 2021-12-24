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

		$oConfig = $this->oActions->Config();

		$sServer = \trim($oConfig->Get('security', 'custom_server_signature', ''));
		if (\strlen($sServer))
		{
			\header('Server: '.$sServer);
		}

		\header('Referrer-Policy: no-referrer');
		\header('X-Content-Type-Options: nosniff');

		// Google FLoC
		\header('Permissions-Policy: interest-cohort=()');

		$this->setCSP();

		$sXFrameOptionsHeader = \trim($oConfig->Get('security', 'x_frame_options_header', '')) ?: 'DENY';
		\header('X-Frame-Options: '.$sXFrameOptionsHeader);

		$sXssProtectionOptionsHeader = \trim($oConfig->Get('security', 'x_xss_protection_header', '')) ?: '1; mode=block';
		\header('X-XSS-Protection: '.$sXssProtectionOptionsHeader);

		if ($oConfig->Get('labs', 'force_https', false) && !$this->oHttp->IsSecure())
		{
			\header('Location: https://'.$this->oHttp->GetHost(false, false).$this->oHttp->GetUrl());
			exit(0);
		}

		$sQuery = \trim($_SERVER['QUERY_STRING'] ?? '');
		$iPos = \strpos($sQuery, '&');
		if (0 < $iPos) {
			$sQuery = \substr($sQuery, 0, $iPos);
		}
		$sQuery = \trim(\trim($sQuery), ' /');
		$aSubQuery = $_GET['q'] ?? null;
		if (\is_array($aSubQuery)) {
			$aSubQuery = \array_map(function ($sS) {
				return \trim(\trim($sS), ' /');
			}, $aSubQuery);

			if (\count($aSubQuery)) {
				$sQuery .= '/' . \implode('/', $aSubQuery);
			}
		}

		$this->oActions->Plugins()->RunHook('filter.http-query', array(&$sQuery));
		$aPaths = \explode('/', $sQuery);
//		unset($aPaths[1]); // was the rlspecauth/AuthAccountHash token
		$this->oActions->Plugins()->RunHook('filter.http-paths', array(&$aPaths));

		$bAdmin = false;
		$sAdminPanelHost = $oConfig->Get('security', 'admin_panel_host', '');
		if (empty($sAdminPanelHost))
		{
			$sAdminPanelKey = \strtolower($oConfig->Get('security', 'admin_panel_key', 'admin'));
			$bAdmin = !empty($aPaths[0]) && \strtolower($aPaths[0]) === $sAdminPanelKey;
		}
		else if (empty($aPaths[0]) &&
			\mb_strtolower($sAdminPanelHost) === \mb_strtolower($this->oHttp->GetHost()))
		{
			$bAdmin = true;
		}

		if ($this->oHttp->IsPost())
		{
			$this->oHttp->ServerNoCache();
		}

		if ($bAdmin && !$oConfig->Get('security', 'allow_admin_panel', true))
		{
			\MailSo\Base\Http::StatusHeader(403);
			echo $this->oServiceActions->ErrorTemplates('Access Denied.',
				'Access to the SnappyMail Admin Panel is not allowed!');

			return false;
		}

		$bIndex = true;
		$sResult = '';
		if (\count($aPaths) && !empty($aPaths[0]) && !$bAdmin && 'index' !== \strtolower($aPaths[0]))
		{
			if (!\SnappyMail\HTTP\SecFetch::isSameOrigin()) {
				\MailSo\Base\Http::StatusHeader(403);
				echo $this->oServiceActions->ErrorTemplates('Access Denied.',
					"Disallowed Sec-Fetch
					Dest: " . ($_SERVER['HTTP_SEC_FETCH_DEST'] ?? '') . "
					Mode: " . ($_SERVER['HTTP_SEC_FETCH_MODE'] ?? '') . "
					Site: " . ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') . "
					User: " . (\SnappyMail\HTTP\SecFetch::user() ? 'true' : 'false'));
				return false;
			}

			$bIndex = false;
			$sMethodName = 'Service'.\preg_replace('/@.+$/', '', $aPaths[0]);
			$sMethodExtra = \strpos($aPaths[0], '@') ? \preg_replace('/^[^@]+@/', '', $aPaths[0]) : '';

			if (\method_exists($this->oServiceActions, $sMethodName) &&
				\is_callable(array($this->oServiceActions, $sMethodName)))
			{
				$this->oServiceActions->SetQuery($sQuery)->SetPaths($aPaths);
				$sResult = $this->oServiceActions->{$sMethodName}($sMethodExtra);
			}
			else if (!$this->oActions->Plugins()->RunAdditionalPart($aPaths[0], $aPaths))
			{
				$bIndex = true;
			}
		}

		if ($bIndex)
		{
//			if (!\SnappyMail\HTTP\SecFetch::isEntering()) {
			\header('Content-Type: text/html; charset=utf-8');
			$this->oHttp->ServerNoCache();

			if (!\is_dir(APP_DATA_FOLDER_PATH) || !\is_writable(APP_DATA_FOLDER_PATH))
			{
				echo $this->oServiceActions->ErrorTemplates(
					'Permission denied!',
					'SnappyMail can not access the data folder "'.APP_DATA_FOLDER_PATH.'"'
				);

				return false;
			}

			$sLanguage = $this->oActions->GetLanguage($bAdmin);

			$sAppJsMin = $oConfig->Get('labs', 'use_app_debug_js', false) ? '' : '.min';
			$sAppCssMin = $oConfig->Get('labs', 'use_app_debug_css', false) ? '' : '.min';

			$sFaviconUrl = (string) $oConfig->Get('webmail', 'favicon_url', '');

			$sFaviconPngLink = $sFaviconUrl ? $sFaviconUrl : $this->oActions->StaticPath('apple-touch-icon.png');
			$sAppleTouchLink = $sFaviconUrl ? '' : $this->oActions->StaticPath('apple-touch-icon.png');

			$aTemplateParameters = array(
				'{{BaseAppFaviconPngLinkTag}}' => $sFaviconPngLink ? '<link type="image/png" rel="shortcut icon" href="'.$sFaviconPngLink.'" />' : '',
				'{{BaseAppFaviconTouchLinkTag}}' => $sAppleTouchLink ? '<link type="image/png" rel="apple-touch-icon" href="'.$sAppleTouchLink.'" />' : '',
				'{{BaseAppMainCssLink}}' => $this->oActions->StaticPath('css/'.($bAdmin ? 'admin' : 'app').$sAppCssMin.'.css'),
				'{{BaseAppThemeCssLink}}' => $this->oActions->ThemeLink($bAdmin),
				'{{BaseAppManifestLink}}' => $this->oActions->StaticPath('manifest.json'),
				'{{LoadingDescriptionEsc}}' => \htmlspecialchars($oConfig->Get('webmail', 'loading_description', 'SnappyMail'), ENT_QUOTES|ENT_IGNORE, 'UTF-8'),
				'{{BaseAppAdmin}}' => $bAdmin ? 1 : 0
			);

			$sCacheFileName = '';
			if ($oConfig->Get('labs', 'cache_system_data', true))
			{
				$sCacheFileName = 'TMPL:' . $sLanguage . \md5(
					\json_encode(array(
						$oConfig->Get('cache', 'index', ''),
						$this->oActions->Plugins()->Hash(),
						$sAppJsMin,
						$sAppCssMin,
						$aTemplateParameters,
						APP_VERSION
					))
				);
				$sResult = $this->oActions->Cacher()->Get($sCacheFileName);
			}

			if ($sResult) {
				$sResult .= '<!--cached-->';
			} else {
				$aTemplateParameters['{{BaseAppThemeCss}}'] = $this->oActions->compileCss($this->oActions->GetTheme($bAdmin), $bAdmin);
				$aTemplateParameters['{{BaseLanguage}}'] = $this->oActions->compileLanguage($sLanguage, $bAdmin);
				$aTemplateParameters['{{BaseTemplates}}'] = $this->oServiceActions->compileTemplates($bAdmin);
				$aTemplateParameters['{{BaseAppBootCss}}'] = \file_get_contents(APP_VERSION_ROOT_PATH.'static/css/boot'.$sAppCssMin.'.css');
				$aTemplateParameters['{{BaseAppBootScript}}'] = \file_get_contents(APP_VERSION_ROOT_PATH.'static/js'.($sAppJsMin ? '/min' : '').'/boot'.$sAppJsMin.'.js');
				$sResult = \strtr(\file_get_contents(APP_VERSION_ROOT_PATH.'app/templates/Index.html'), $aTemplateParameters);

				if ($sAppJsMin || $sAppCssMin) {
					$sResult = \preg_replace(
						['@\\s*/>@', '/\\s*&nbsp;/i', '/&nbsp;\\s*/i', '/>\\s+</'],
						['>', "\xC2\xA0", "\xC2\xA0", '><'],
						\trim($sResult)
					);
				} else {
					$sResult = Utils::ClearHtmlOutput($sResult);
				}
				if ($sCacheFileName) {
					$this->oActions->Cacher()->Set($sCacheFileName, $sResult);
				}
			}

			$sScriptNonce = \SnappyMail\UUID::generate();
			$this->setCSP($sScriptNonce);
			$sResult = \str_replace('nonce=""', 'nonce="'.$sScriptNonce.'"', $sResult);
/*
			\preg_match('<script[^>]+>(.+)</script>', $sResult, $script);
			$sScriptHash = 'sha256-'.\base64_encode(\hash('sha256', $script[1], true));
			$this->setCSP(null, $sScriptHash);
*/
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

	private function setCSP(string $sScriptNonce = null) : void
	{
		// "img-src https:" is allowed due to remote images in e-mails
		$sContentSecurityPolicy = \trim($this->oActions->Config()->Get('security', 'content_security_policy', ''))
			?: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' data: https: http:; style-src 'self' 'unsafe-inline'";
		if ($this->oActions->Config()->Get('security', 'use_local_proxy_for_external_images', '')) {
			$sContentSecurityPolicy = \preg_replace('/(img-src[^;]+)\\shttps:(\\s|;|$)/D', '$1$2', $sContentSecurityPolicy);
			$sContentSecurityPolicy = \preg_replace('/(img-src[^;]+)\\shttp:(\\s|;|$)/D', '$1$2', $sContentSecurityPolicy);
		}
		// Internet Explorer does not support 'nonce'
		if (!$_SERVER['HTTP_USER_AGENT'] || (!\strpos($_SERVER['HTTP_USER_AGENT'], 'Trident/') && !\strpos($_SERVER['HTTP_USER_AGENT'], 'Edge/1'))) {
			if ($sScriptNonce) {
				$sContentSecurityPolicy = \str_replace('script-src', "script-src 'nonce-{$sScriptNonce}'", $sContentSecurityPolicy);
			}
			// Knockout.js requires unsafe-inline?
			$sContentSecurityPolicy = \preg_replace("/(script-src[^;]+)'unsafe-inline'/", '$1', $sContentSecurityPolicy);
			// Knockout.js requires eval() for observable binding purposes
			//$sContentSecurityPolicy = \preg_replace("/(script-src[^;]+)'unsafe-eval'/", '$1', $sContentSecurityPolicy);
		}
		\header('Content-Security-Policy: '.$sContentSecurityPolicy);
	}
}
