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

	public function getPanel()
	{
		\OCA\SnappyMail\Util\SnappyMailHelper::loadApp();

		$keys = [
			'snappymail-autologin',
			'snappymail-autologin-with-email',
			'snappymail-no-embed'
		];
		$parameters = [];
		foreach ($keys as $k) {
			$v = $this->config->getAppValue('snappymail', $k);
			$parameters[$k] = $v;
		}
		$uid = \OC::$server->getUserSession()->getUser()->getUID();
		if (\OC_User::isAdminUser($uid)) {
//			$parameters['snappymail-admin-panel-link'] = SnappyMailHelper::getAppUrl().'?admin';
			SnappyMailHelper::loadApp();
			$parameters['snappymail-admin-panel-link'] =
				\OC::$server->getURLGenerator()->linkToRoute('snappymail.page.index')
				. '?' . \RainLoop\Api::Config()->Get('security', 'admin_panel_key', 'admin');
		}

		$oConfig = \RainLoop\Api::Config();
		$passfile = APP_PRIVATE_DATA . 'admin_password.txt';
		$sPassword = '';
		if (\is_file($passfile)) {
			$sPassword = \file_get_contents($passfile);
			$parameters['snappymail-admin-panel-link'] .= '#/security';
		}
		$parameters['snappymail-admin-password'] = $sPassword;

		$parameters['can-import-rainloop'] = $sPassword && \is_dir(
			\rtrim(\trim(\OC::$server->getSystemConfig()->getValue('datadirectory', '')), '\\/')
			. '/rainloop-storage'
		);

		$parameters['snappymail-debug'] = $oConfig->Get('debug', 'enable', false);

		// Check for owncloud plugin update, if so then update
		foreach (\SnappyMail\Repository::getPackagesList()['List'] as $plugin) {
			if ('owncloud' == $plugin['id'] && $plugin['canBeUpdated']) {
				\SnappyMail\Repository::installPackage('plugin', 'owncloud');
			}
		}

		\OCP\Util::addScript('snappymail', 'snappymail');
		return new TemplateResponse('snappymail', 'admin-local', $parameters);
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
