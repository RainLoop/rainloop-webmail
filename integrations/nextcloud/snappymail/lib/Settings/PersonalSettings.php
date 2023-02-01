<?php
namespace OCA\SnappyMail\Settings;

use OCA\SnappyMail\Util\SnappyMailHelper;

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

	public function getForm()
	{
		$uid = \OC::$server->getUserSession()->getUser()->getUID();
		$sEmail = $this->config->getUserValue($uid, 'snappymail', 'snappymail-email');
		if (!$sEmail) {
			$sEmail = $this->config->getUserValue($uid, 'rainloop', 'rainloop-email');
			if ($sEmail) {
				$this->config->setUserValue($uid, 'rainloop', 'rainloop-email'. $sEmail);
				$sPassword = $this->config->getUserValue($uid, 'rainloop', 'rainloop-password');
				if ($sPassword) {
					require_once \dirname(__DIR__) . '/Util/SnappyMailHelper.php';
					$sPassword = SnappyMailHelper::decodeRainLoopPassword($sPassword, md5($sEmail));
				}
				if ($sPassword) {
					$this->config->setUserValue($uid, 'snappymail', 'snappymail-password', SnappyMailHelper::encodePassword($sPassword, \md5($sEmail)));
				}
			}
		}
		$parameters = [
			'snappymail-email' => $sEmail,
			'snappymail-password' => $this->config->getUserValue($uid, 'snappymail', 'snappymail-password') ? '******' : ''
		];
		\OCP\Util::addScript('snappymail', 'snappymail');
		return new TemplateResponse('snappymail', 'personal_settings', $parameters, '');
	}

	public function getSection()
	{
		return 'additional';
	}

	public function getPriority()
	{
		return 50;
	}
}
