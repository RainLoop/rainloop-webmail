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
		\OC::$server->getNavigationManager()->setActiveEntry('snappymail');

		\OCP\Util::addStyle('snappymail', 'style');

		$query = '';
		// If the user has set credentials for SnappyMail in their personal
		// settings, override everything before and use those instead.
		$config = \OC::$server->getConfig();
		$sUID = \OC::$server->getUserSession()->getUser()->getUID();
		$sEmail = $config->getUserValue($sUID, 'snappymail', 'snappymail-email', '');
		if ($sEmail) {
			$password = SnappyMailHelper::decodePassword(
				$config->getUserValue($sUID, 'snappymail', 'snappymail-password', ''),
				\md5($sEmail)
			);
			if ($password) {
				$query = '?sso&hash=' . \RainLoop\Api::CreateUserSsoHash($sEmail, $password);
			}
		}
		if (!$query) {
			$session = \OC::$server->getSession();
			if (!empty($session['snappymail-sso-hash'])) {
				$query = '?sso&hash=' . $session['snappymail-sso-hash'];
			}
		}

		$params = [
			'snappymail-iframe-url' => SnappyMailHelper::normalizeUrl(SnappyMailHelper::getAppUrl()) . $query
		];

		$response = new TemplateResponse('snappymail', 'index', $params);

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
		SnappyMailHelper::startApp();
	}

	/**
	 * @NoAdminRequired
	 * @NoCSRFRequired
	 */
	public function appPost()
	{
		SnappyMailHelper::startApp();
	}
}

