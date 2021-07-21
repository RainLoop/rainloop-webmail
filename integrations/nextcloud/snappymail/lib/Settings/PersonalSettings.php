<?php
namespace OCA\SnappyMail\Settings;

use OCP\AppFramework\Http\TemplateResponse;
use OCP\IConfig;

class PersonalSettings {
	private $config;

	public function __construct(IConfig $config) {
		$this->config = $config;
	}

	public function getForm() {
		$uid = \OC::$server->getUserSession()->getUser()->getUID();

		$keys = [
			'snappymail-email',
			'snappymail-password'
		];

		$parameters = [];
		foreach ($keys as $k) {
			$v = $this->config->getUserValue($uid, 'snappymail', $k);
			$parameters[$k] = $v;
		}

		return new TemplateResponse('snappymail', 'personal_settings', $parameters, '');
	}

}

