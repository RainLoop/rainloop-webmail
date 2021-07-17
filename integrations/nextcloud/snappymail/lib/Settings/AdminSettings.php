<?php
namespace OCA\SnappyMail\Settings;

use OCA\SnappyMail\Util\SnappyMailHelper;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\IConfig;
use OCP\Settings\ISettings;

class AdminSettings implements ISettings {

	private $config;

	public function __construct(IConfig $config) {
		$this->config = $config;
	}

	public function getForm() {
		$keys = [
			'snappymail-autologin',
			'snappymail-autologin-with-email'
		];

		$parameters = [];
		foreach ($keys as $k) {
			$v = $this->config->getAppValue('snappymail', $k);
			$parameters[$k] = $v;
		}

		$uid = \OC::$server->getUserSession()->getUser()->getUID();
		if (\OC_User::isAdminUser($uid)) {
			$parameters['snappymail-admin-panel-link'] = SnappyMailHelper::getAppUrl().'?admin';
		}

		return new TemplateResponse('snappymail', 'admin-local', $parameters);
	}

	public function getSection() {
		return 'additional';
	}

	public function getPriority() {
		return 50;
	}

}
