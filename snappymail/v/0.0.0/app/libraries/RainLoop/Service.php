<?php

namespace RainLoop;

abstract class Service
{
	/**
	 * @staticvar bool $bOne
	 */
	public static function Handle() : bool
	{
		static $bOne = null;
		if (null === $bOne) {
			$bOne = static::RunResult();
		}

		return $bOne;
	}

	private static function RunResult() : bool
	{
		$oConfig = Api::Config();

		$sServer = \trim($oConfig->Get('security', 'custom_server_signature', ''));
		if (\strlen($sServer)) {
			\header('Server: '.$sServer);
		}

		\header('Referrer-Policy: no-referrer');
		\header('X-Content-Type-Options: nosniff');

		// Google FLoC, obsolete
//		\header('Permissions-Policy: interest-cohort=()');

		static::setCSP();

		$sXssProtectionOptionsHeader = \trim($oConfig->Get('security', 'x_xss_protection_header', '')) ?: '1; mode=block';
		\header('X-XSS-Protection: '.$sXssProtectionOptionsHeader);

		$oHttp = \MailSo\Base\Http::SingletonInstance();
		if ($oConfig->Get('security', 'force_https', false) && !$oHttp->IsSecure()) {
			\MailSo\Base\Http::Location('https://'.$oHttp->GetHost(false).$oHttp->GetUrl());
			return true;
		}

		// See https://github.com/kjdev/php-ext-brotli
		if (!empty($_SERVER['HTTP_ACCEPT_ENCODING'])
		 && $oConfig->Get('webmail', 'compress_output', false)
		 && !\ini_get('zlib.output_compression')
		 && !\ini_get('brotli.output_compression')
		) {
			if (\is_callable('brotli_compress_add') && false !== \stripos($_SERVER['HTTP_ACCEPT_ENCODING'], 'br')) {
				\ob_start(function(string $buffer, int $phase){
					static $resource;
					if ($phase & PHP_OUTPUT_HANDLER_START) {
						\header('Content-Encoding: br');
						$resource = \brotli_compress_init(/*int $quality = 11, int $mode = BROTLI_GENERIC*/);
					}
					return \brotli_compress_add($resource, $buffer, ($phase & PHP_OUTPUT_HANDLER_FINAL) ? BROTLI_FINISH : BROTLI_PROCESS);
				});
			} else {
				\ob_start('ob_gzhandler');
			}
		} else {
			\ob_start();
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

		$aPaths = \explode('/', $sQuery);

		$bAdmin = false;
		$sAdminPanelHost = $oConfig->Get('security', 'admin_panel_host', '');
		if (empty($sAdminPanelHost)) {
			$bAdmin = !empty($aPaths[0]) && ($oConfig->Get('security', 'admin_panel_key', '') ?: 'admin') === $aPaths[0];
			$bAdmin && \array_shift($aPaths);
		} else if (empty($aPaths[0]) && \mb_strtolower($sAdminPanelHost) === \mb_strtolower($oHttp->GetHost())) {
			$bAdmin = true;
		}

		$oActions = $bAdmin ? new ActionsAdmin() : Api::Actions();

		$oActions->Plugins()->RunHook('filter.http-paths', array(&$aPaths));

		if ($oHttp->IsPost()) {
			$oHttp->ServerNoCache();
		}

		$oServiceActions = new ServiceActions($oHttp, $oActions);

		if ($bAdmin && !$oConfig->Get('security', 'allow_admin_panel', true)) {
			\MailSo\Base\Http::StatusHeader(403);
			echo $oServiceActions->ErrorTemplates('Access Denied.',
				'Access to the SnappyMail Admin Panel is not allowed!');

			return false;
		}

		$bIndex = true;
		if (\count($aPaths) && !empty($aPaths[0]) && 'index' !== \strtolower($aPaths[0])) {
			if ('mailto' !== \strtolower($aPaths[0]) && !\SnappyMail\HTTP\SecFetch::matchAnyRule($oConfig->Get('security', 'secfetch_allow', ''))) {
				\MailSo\Base\Http::StatusHeader(403);
				echo $oServiceActions->ErrorTemplates('Access Denied.',
					"Disallowed Sec-Fetch
					Dest: " . ($_SERVER['HTTP_SEC_FETCH_DEST'] ?? '') . "
					Mode: " . ($_SERVER['HTTP_SEC_FETCH_MODE'] ?? '') . "
					Site: " . ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') . "
					User: " . (\SnappyMail\HTTP\SecFetch::user() ? 'true' : 'false'));
				return false;
			}

			$sMethodName = 'Service'.\preg_replace('/@.+$/', '', $aPaths[0]);
			$sMethodExtra = \strpos($aPaths[0], '@') ? \preg_replace('/^[^@]+@/', '', $aPaths[0]) : '';

			if (\method_exists($oServiceActions, $sMethodName) && \is_callable(array($oServiceActions, $sMethodName))) {
				$bIndex = false;
				$oServiceActions->SetQuery($sQuery)->SetPaths($aPaths);
				echo $oServiceActions->{$sMethodName}($sMethodExtra);
			} else if ($oActions->Plugins()->RunAdditionalPart($aPaths[0], $aPaths)) {
				$bIndex = false;
			}
		}

		if ($bIndex) {
			if (!$bAdmin) {
				$login = $oConfig->Get('labs', 'custom_login_link', '');
				if ($login && !$oActions->getAccountFromToken(false)) {
					$oHttp->ServerNoCache();
					\MailSo\Base\Http::Location($login);
					return true;
				}
			}

//			if (!\SnappyMail\HTTP\SecFetch::isEntering()) {
			\header('Content-Type: text/html; charset=utf-8');

			if (!\is_dir(APP_DATA_FOLDER_PATH) || !\is_writable(APP_DATA_FOLDER_PATH)) {
				$oHttp->ServerNoCache();
				echo $oServiceActions->ErrorTemplates(
					'Permission denied!',
					'SnappyMail can not access the data folder "'.APP_DATA_FOLDER_PATH.'"'
				);
				return false;
			}

			$sLanguage = $oActions->GetLanguage($bAdmin);

			$bAppDebug = $oConfig->Get('debug', 'enable', false);
			$sAppJsMin = $bAppDebug || $oConfig->Get('debug', 'javascript', false) ? '' : '.min';
			$sAppCssMin = $bAppDebug || $oConfig->Get('debug', 'css', false) ? '' : '.min';

			$sFaviconUrl = (string) $oConfig->Get('webmail', 'favicon_url', '');

			$sFaviconPngLink = $sFaviconUrl ?: Utils::WebStaticPath('apple-touch-icon.png');
			$sAppleTouchLink = $sFaviconUrl ? '' : Utils::WebStaticPath('apple-touch-icon.png');

			$oActions = Api::Actions();

			$sThemeName = $oActions->GetTheme($bAdmin);

			$aTemplateParameters = array(
				'{{BaseAppThemeName}}' => $sThemeName,
				'{{BaseAppFaviconPngLinkTag}}' => $sFaviconPngLink ? '<link type="image/png" rel="shortcut icon" href="'.$sFaviconPngLink.'">' : '',
				'{{BaseAppFaviconTouchLinkTag}}' => $sAppleTouchLink ? '<link type="image/png" rel="apple-touch-icon" href="'.$sAppleTouchLink.'">' : '',
				'{{BaseAppManifestLink}}' => Utils::WebStaticPath('manifest.json'),
				'{{BaseFavIconSvg}}' => $sFaviconUrl ? '' : Utils::WebStaticPath('favicon.svg'),
				'{{LoadingDescriptionEsc}}' => \htmlspecialchars($oConfig->Get('webmail', 'loading_description', 'SnappyMail'), ENT_QUOTES|ENT_IGNORE, 'UTF-8'),
				'{{BaseAppAdmin}}' => $bAdmin ? 1 : 0
			);

			$sCacheFileName = 'TMPL:' . \sha1(
				Utils::jsonEncode(array(
					$sLanguage,
					$oConfig->Get('cache', 'index', ''),
					$oActions->Plugins()->Hash(),
					$sAppJsMin,
					$sAppCssMin,
					$aTemplateParameters,
					APP_VERSION
				))
			);

			// https://github.com/the-djmaze/snappymail/issues/1024
//			$oActions->verifyCacheByKey($sCacheFileName);

			if ($oConfig->Get('cache', 'system_data', true)) {
				$sResult = $oActions->Cacher()->Get($sCacheFileName);
			} else {
				$sResult = '';
			}

			if ($sResult) {
				$sResult .= '<!--cached-->';
			} else {
				$aTemplateParameters['{{BaseAppBootCss}}'] = \file_get_contents(APP_VERSION_ROOT_PATH.'static/css/boot'.$sAppCssMin.'.css');
				$aTemplateParameters['{{BaseAppBootScript}}'] = \file_get_contents(APP_VERSION_ROOT_PATH.'static/js'.($sAppJsMin ? '/min' : '').'/boot'.$sAppJsMin.'.js');
				$aTemplateParameters['{{BaseAppMainCssLink}}'] = Utils::WebStaticPath('css/'.($bAdmin ? 'admin' : 'app').$sAppCssMin.'.css');
				$aTemplateParameters['{{BaseAppThemeCss}}'] = \preg_replace('/\\s*([:;{},]+)\\s*/s', '$1', $oActions->compileCss($sThemeName, $bAdmin));
				$aTemplateParameters['{{BaseLanguage}}'] = $oActions->compileLanguage($sLanguage, $bAdmin);
				$aTemplateParameters['{{BaseTemplates}}'] = Utils::ClearHtmlOutput($oServiceActions->compileTemplates($bAdmin));
				$aTemplateParameters['{{NO_SCRIPT_DESC}}'] = \nl2br($oActions->StaticI18N('NO_SCRIPT_TITLE') . "\n" . $oActions->StaticI18N('NO_SCRIPT_DESC'));
				$aTemplateParameters['{{NO_COOKIE_TITLE}}'] = $oActions->StaticI18N('NO_COOKIE_TITLE');
				$aTemplateParameters['{{NO_COOKIE_DESC}}'] = $oActions->StaticI18N('NO_COOKIE_DESC');
				$aTemplateParameters['{{BAD_BROWSER_TITLE}}'] = $oActions->StaticI18N('BAD_BROWSER_TITLE');
				$aTemplateParameters['{{BAD_BROWSER_DESC}}'] = \nl2br($oActions->StaticI18N('BAD_BROWSER_DESC'));
				$sResult = Utils::ClearHtmlOutput(\file_get_contents(APP_VERSION_ROOT_PATH.'app/templates/Index.html'));
				$sResult = \strtr($sResult, $aTemplateParameters);
				if ($sCacheFileName) {
					$oActions->Cacher()->Set($sCacheFileName, $sResult);
				}
			}

			$SameSite = \strtolower($oConfig->Get('security', 'cookie_samesite', 'Strict'));
			$Secure = (isset($_SERVER['HTTPS']) || 'none' == $SameSite) ? ';secure' : '';
			$sResult = \str_replace('samesite=strict', "samesite={$SameSite}{$Secure}", $sResult);

			$sScriptNonce = \SnappyMail\UUID::generate();
			static::setCSP($sScriptNonce);
			$sResult = \str_replace('nonce=""', 'nonce="'.$sScriptNonce.'"', $sResult);
/*
			\preg_match('<script[^>]+>(.+)</script>', $sResult, $script);
			$sScriptHash = 'sha256-'.\base64_encode(\hash('sha256', $script[1], true));
			static::setCSP(null, $sScriptHash);
*/
			// https://github.com/the-djmaze/snappymail/issues/1024
//			$oActions->cacheByKey($sCacheFileName);

			echo $sResult;
			unset($sResult);
		} else if (!\headers_sent()) {
			\header('X-XSS-Protection: 1; mode=block');
		}

		$oActions->BootEnd();

		return true;
	}

	private static function setCSP(string $sScriptNonce = null) : void
	{
		Api::getCSP($sScriptNonce)->setHeaders();
	}
}
