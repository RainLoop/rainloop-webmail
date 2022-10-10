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

		$session = \OC::$server->getSession();
		$params = [
			'snappymail-iframe-url' => SnappyMailHelper::normalizeUrl(SnappyMailHelper::getAppUrl())
				. (empty($session['snappymail-sso-hash']) ? '' : '?sso&hash=' . $session['snappymail-sso-hash'])
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

