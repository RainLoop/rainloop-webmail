<?php

namespace OCA\SnappyMail\Controller;

use OCA\SnappyMail\Util\SnappyMailHelper;

use OCP\App\IAppManager;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\ContentSecurityPolicy;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\IConfig;
use OCP\IRequest;
use OCP\ISession;

class PageController extends Controller {
	private $userId;
	private $config;
	private $appManager;
	private $appPath;
	private $session;

	public function __construct($AppName, IRequest $request, IAppManager $appManager, IConfig $config, ISession $session) {
		parent::__construct($AppName, $request);
		$this->appPath = $appManager->getAppPath('snappymail');
		$this->config = $config;
		$this->appManager = $appManager;
		$this->session = $session;
	}

	/**
	 * @NoAdminRequired
	 * @NoCSRFRequired
	 */
	public function index() {
		\OC::$server->getNavigationManager()->setActiveEntry('snappymail');

		\OCP\Util::addStyle('snappymail', 'style');

		$sUrl = SnappyMailHelper::normalizeUrl(SnappyMailHelper::getAppUrl());

		$params = [
			'snappymail-iframe-url' => SnappyMailHelper::normalizeUrl($sUrl).'?OwnCloudAuth'
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
	public function appGet() {
		$this->app();
	}

	/**
	 * @NoAdminRequired
	 * @NoCSRFRequired
	 */
	public function appPost() {
		$this->app();
	}

	public function app() {

		SnappyMailHelper::regSnappyMailDataFunction();

		if (isset($_GET['OwnCloudAuth'])) {
			$sEmail = '';
			$sEncodedPassword = '';

			$sUser = \OC::$server->getUserSession()->getUser()->getUID();

			if ($this->config->getAppValue('snappymail', 'snappymail-autologin', false)) {
				$sEmail = $sUser;
				$sPasswordSalt = $sUser;
				$sEncodedPassword = $this->session['snappymail-autologin-password'];
			} else if ($this->config->getAppValue('snappymail', 'snappymail-autologin-with-email', false)) {
				$sEmail = $this->config->getUserValue($sUser, 'settings', 'email', '');
				$sPasswordSalt = $sUser;
				$sEncodedPassword = $this->session['snappymail-autologin-password'];
			}

			// If the user has set credentials for SnappyMail in their personal
			// settings, override everything before and use those instead.
			$sIndividualEmail = $this->config->getUserValue($sUser, 'snappymail', 'snappymail-email', '');
			if ($sIndividualEmail) {
				$sEmail = $sIndividualEmail;
				$sPasswordSalt = $sEmail;
				$sEncodedPassword = $this->config->getUserValue($sUser, 'snappymail', 'snappymail-password', '');
			}

			$sDecodedPassword = SnappyMailHelper::decodePassword($sEncodedPassword, md5($sPasswordSalt));

			$_ENV['___snappymail_owncloud_email'] = $sEmail;
			$_ENV['___snappymail_owncloud_password'] = $sDecodedPassword;
		}

		include $this->appPath . '/app/index.php';

	}

}

