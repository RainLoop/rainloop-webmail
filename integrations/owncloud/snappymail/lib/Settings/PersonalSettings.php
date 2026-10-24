<?php
namespace OCA\SnappyMail\Settings;

use OCP\AppFramework\Http\TemplateResponse;
use OCP\IConfig;
use OCP\Settings\ISettings;

class PersonalSettings implements ISettings
{
	private $config;

	public function __construct(IConfig $config)
	{
		$this->config = $config;
	}

	public function getPanel()
	{
		$uid = \OC::$server->getUserSession()->getUser()->getUID();
		$parameters = [
			'snappymail-email' => $this->config->getUserValue($uid, 'snappymail', 'snappymail-email'),
			'snappymail-password' => $this->config->getUserValue($uid, 'snappymail', 'snappymail-password') ? '******' : ''
		];
		\OCP\Util::addScript('snappymail', 'snappymail');
		return new TemplateResponse('snappymail', 'personal_settings', $parameters, '');
	}

	public function getSectionID()
	{
		return 'additional';
	}

	public function getPriority()
	{
		return 50;
	}
}
