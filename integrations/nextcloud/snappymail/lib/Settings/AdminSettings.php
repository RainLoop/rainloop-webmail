<?php
namespace OCA\SnappyMail\Settings;

use OCA\SnappyMail\Util\SnappyMailHelper;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\IConfig;
use OCP\Settings\ISettings;

class AdminSettings implements ISettings
{
	private $config;

	public function __construct(IConfig $config)
	{
		$this->config = $config;
	}

	public function getForm()
	{
		$keys = [
			'snappymail-autologin',
			'snappymail-autologin-with-email',
			'snappymail-embed'
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

		\OCA\SnappyMail\Util\SnappyMailHelper::loadApp();
		$oConfig = \RainLoop\Api::Config();
		$passfile = APP_PRIVATE_DATA . 'admin_password.txt';
		$sPassword = $oConfig->Get('security', 'admin_password', '');
		if (!$sPassword) {
			$sPassword = \substr(\base64_encode(\random_bytes(16)), 0, 12);
			\RainLoop\Utils::saveFile($passfile, $sPassword . "\n");
			$oConfig->SetPassword($sPassword);
			$oConfig->Save();
		} else if (\is_file($passfile)) {
			$sPassword = \file_get_contents($passfile);
		} else {
			$sPassword = '';
		}
		if ($sPassword) {
			$parameters['snappymail-admin-panel-link'] .= SnappyMailHelper::getAppUrl().'?admin#/security';
		}
		$parameters['snappymail-admin-password'] = $sPassword;

		$parameters['snappymail-debug'] = $oConfig->Get('debug', 'enable', false);

		\OCP\Util::addScript('snappymail', 'snappymail');
		return new TemplateResponse('snappymail', 'admin-local', $parameters);
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
