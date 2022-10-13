<?php

namespace OCA\SnappyMail\AppInfo;

use OCA\SnappyMail\Util\SnappyMailHelper;
use OCA\SnappyMail\Controller\FetchController;
use OCA\SnappyMail\Controller\PageController;

use OCP\AppFramework\App;
use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IRegistrationContext;
use OCP\AppFramework\Bootstrap\IBootContext;
use OCP\IL10N;
use OCP\IUser;

class Application extends App implements IBootstrap
{

	public function register(IRegistrationContext $context): void
	{
	}

	public function boot(IBootContext $context): void
	{
		$this->registerNavigation();

		$userSession = \OC::$server->getUserSession();
		$userSession->listen('\OC\User', 'postLogin', function($user, $loginName, $password, $isTokenLogin) {
			$config = \OC::$server->getConfig();
			$sEmail = '';
			// Only store the user's password in the current session if they have
			// enabled auto-login using Nextcloud username or email address.
			if ($config->getAppValue('snappymail', 'snappymail-autologin', false)) {
				$sEmail = $user->getUID();
			} else if ($config->getAppValue('snappymail', 'snappymail-autologin-with-email', false)) {
				$sEmail = $config->getUserValue($user->getUID(), 'settings', 'email', '');
			}
			if ($sEmail) {
				SnappyMailHelper::startApp(true);
				\OC::$server->getSession()['snappymail-sso-hash'] = \RainLoop\Api::CreateUserSsoHash($sEmail, $password/*, array $aAdditionalOptions = array(), bool $bUseTimeout = true*/);
			}
		});

		$userSession->listen('\OC\User', 'logout', function($user) {
			\OC::$server->getSession()['snappymail-sso-hash'] = '';
			SnappyMailHelper::startApp(true);
			\RainLoop\Api::LogoutCurrentLogginedUser();
		});
	}

//	public function __construct(string $appName, array $urlParams = [])
	public function __construct()
	{
		parent::__construct('snappymail');

		$container = $this->getContainer();

		/**
		 * Controllers
		 */
		$container->registerService(
			'PageController', function($c) {
				return new PageController(
					$c->query('AppName'),
					$c->query('Request')
				);
			}
		);

		$container->registerService(
			'FetchController', function($c) {
				return new FetchController(
					$c->query('AppName'),
					$c->query('Request'),
					$c->getServer()->getAppManager(),
					$c->query('ServerContainer')->getConfig(),
					$c->query(IL10N::class)
				);
			}
		);

		/**
		 * Utils
		 */
		$container->registerService(
			'SnappyMailHelper', function($c) {
				return new SnappyMailHelper();
			}
		);

		// Add script js/snappymail.js
		\OCP\Util::addScript('snappymail', 'snappymail');
	}

	public function registerNavigation()
	{
		$container = $this->getContainer();

		$container->query('OCP\INavigationManager')->add(function () use ($container) {
			$urlGenerator = $container->query('OCP\IURLGenerator');
			return [
				'id' => 'snappymail',
				'order' => 10,
				'href' => $urlGenerator->linkToRoute('snappymail.page.index'),
				'icon' => $urlGenerator->imagePath('snappymail', 'logo-64x64.png'),
				'name' => \OCP\Util::getL10N('snappymail')->t('Email')
			];
		});
	}

}
