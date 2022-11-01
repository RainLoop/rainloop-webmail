<?php

namespace OCA\SnappyMail\Controller;

use OCA\SnappyMail\Util\SnappyMailHelper;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\ContentSecurityPolicy;
use OCP\AppFramework\Http\TemplateResponse;

class PageController extends Controller
{
	/**
	 * @NoAdminRequired
	 * @NoCSRFRequired
	 */
	public function index()
	{
		$config = \OC::$server->getConfig();

		$bAdmin = false;
		if (!empty($_SERVER['QUERY_STRING'])) {
			SnappyMailHelper::loadApp();
			$bAdmin = \RainLoop\Api::Config()->Get('security', 'admin_panel_key', 'admin') == $_SERVER['QUERY_STRING'];
			if (!$bAdmin) {
				SnappyMailHelper::startApp(true);
				return;
			}
		}

		if ($bAdmin || $config->getAppValue('snappymail', 'snappymail-embed')) {
			return static::index_embed($bAdmin);
		}

		\OC::$server->getNavigationManager()->setActiveEntry('snappymail');

		\OCP\Util::addScript('snappymail', 'snappymail');
		\OCP\Util::addStyle('snappymail', 'style');

		SnappyMailHelper::startApp();

		$response = new TemplateResponse('snappymail', 'index', [
			'snappymail-iframe-url' => SnappyMailHelper::normalizeUrl(SnappyMailHelper::getAppUrl())
				. (empty($_GET['target']) ? '' : "#{$_GET['target']}")
		]);

		$csp = new ContentSecurityPolicy();
		$csp->addAllowedFrameDomain("'self'");
		$response->setContentSecurityPolicy($csp);

		return $response;
	}

	/**
	 * @NoAdminRequired
	 * @NoCSRFRequired
	 */
	public function appGet()
	{
		SnappyMailHelper::startApp(true);
		exit;
	}

	/**
	 * @NoAdminRequired
	 * @NoCSRFRequired
	 */
	public function appPost()
	{
		SnappyMailHelper::startApp(true);
	}

	/**
	 * @NoAdminRequired
	 * @NoCSRFRequired
	 */
	public function indexPost()
	{
		SnappyMailHelper::startApp(true);
	}

	/**
	 * Draft code to run without using an iframe
	 */
	private static function index_embed(bool $bAdmin)
	{
		\OC::$server->getNavigationManager()->setActiveEntry('snappymail');

		\OCP\Util::addStyle('snappymail', 'embed');

		SnappyMailHelper::startApp();
		$oConfig = \RainLoop\Api::Config();
		$oActions = $bAdmin ? new \RainLoop\ActionsAdmin() : \RainLoop\Api::Actions();
		$oHttp = \MailSo\Base\Http::SingletonInstance();
		$oServiceActions = new \RainLoop\ServiceActions($oHttp, $oActions);
		$sAppJsMin = $oConfig->Get('labs', 'use_app_debug_js', false) ? '' : '.min';
		$sAppCssMin = $oConfig->Get('labs', 'use_app_debug_css', false) ? '' : '.min';
		$sLanguage = $oActions->GetLanguage(false);

		$sScriptNonce = \OC::$server->getContentSecurityPolicyNonceManager()->getNonce();
//		$sScriptNonce = \SnappyMail\UUID::generate();
//		\RainLoop\Service::setCSP($sScriptNonce);

		$params = [
			'Admin' => $bAdmin ? 1 : 0,
			'LoadingDescriptionEsc' => \htmlspecialchars($oConfig->Get('webmail', 'loading_description', 'SnappyMail'), ENT_QUOTES|ENT_IGNORE, 'UTF-8'),
			'BaseTemplates' => \RainLoop\Utils::ClearHtmlOutput($oServiceActions->compileTemplates($bAdmin)),
			'BaseAppBootScript' => \file_get_contents(APP_VERSION_ROOT_PATH.'static/js'.($sAppJsMin ? '/min' : '').'/boot'.$sAppJsMin.'.js'),
			'BaseAppBootScriptNonce' => $sScriptNonce,
			'BaseLanguage' => $oActions->compileLanguage($sLanguage, $bAdmin),
			'BaseAppBootCss' => \file_get_contents(APP_VERSION_ROOT_PATH.'static/css/boot'.$sAppCssMin.'.css'),
			'BaseAppThemeCssLink' => $oActions->ThemeLink($bAdmin),
			'BaseAppThemeCss' => \preg_replace(
				'/\\s*([:;{},]+)\\s*/s',
				'$1',
				$oActions->compileCss($oActions->GetTheme($bAdmin), $bAdmin)
			)
		];

		// Nextcloud html encodes, so addHeader('style') is not possible
//		\OCP\Util::addHeader('style', ['id'=>'app-boot-css'], \file_get_contents(APP_VERSION_ROOT_PATH.'static/css/boot'.$sAppCssMin.'.css'));
		\OCP\Util::addHeader('link', ['type'=>'text/css','rel'=>'stylesheet','href'=>\RainLoop\Utils::WebStaticPath('css/'.($bAdmin?'admin':'app').$sAppCssMin.'.css')], '');
//		\OCP\Util::addHeader('style', ['id'=>'app-theme-style','data-href'=>$params['BaseAppThemeCssLink']], $params['BaseAppThemeCss']);

		$response = new TemplateResponse('snappymail', 'index_embed', $params);

		$csp = new ContentSecurityPolicy();
		$csp->addAllowedScriptDomain("'self'");
		$csp->useStrictDynamic(true);
		$csp->allowEvalScript(true); // $csp->addAllowedScriptDomain("'unsafe-eval'");
		$csp->addAllowedStyleDomain("'self'");
		$response->setContentSecurityPolicy($csp);

		return $response;
	}

}
