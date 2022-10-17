<?php

namespace OCA\SnappyMail\AppInfo;

use OCA\SnappyMail\Util\SnappyMailHelper;
use OCA\SnappyMail\Controller\FetchController;
use OCA\SnappyMail\Controller\PageController;
use OCA\SnappyMail\Search\Provider;

use OCP\AppFramework\App;
use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IRegistrationContext;
use OCP\AppFramework\Bootstrap\IBootContext;
use OCP\IL10N;
use OCP\IUser;

class Application extends App implements IBootstrap
{
	public const APP_ID = 'snappymail';

	public function __construct(array $urlParams = [])
	{
		parent::__construct(self::APP_ID, $urlParams);
	}

	public function register(IRegistrationContext $context): void
	{
		/**
		 * Controllers
		 */
		$context->registerService(
			'PageController', function($c) {
				return new PageController(
					$c->query('AppName'),
					$c->query('Request')
				);
			}
		);

		$context->registerService(
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
		$context->registerService(
			'SnappyMailHelper', function($c) {
				return new SnappyMailHelper();
			}
		);

		$context->registerSearchProvider(Provider::class);
	}

	public function boot(IBootContext $context): void
	{
		$container = $this->getContainer();
		$container->query('OCP\INavigationManager')->add(function () use ($container) {
			$urlGenerator = $container->query('OCP\IURLGenerator');
			return [
				'id' => 'snappymail',
				'order' => 10,
				'href' => $urlGenerator->linkToRoute('snappymail.page.index'),
				'icon' => $urlGenerator->imagePath('snappymail', 'logo-white-64x64.png'),
				'name' => \OCP\Util::getL10N('snappymail')->t('Email')
			];
		});

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
				\OC::$server->getSession()['snappymail-password'] = SnappyMailHelper::encodePassword($password, \md5($sEmail));
			}
		});

		$userSession->listen('\OC\User', 'logout', function($user) {
			$oSession = \OC::$server->getSession()['snappymail-password'] = '';
			SnappyMailHelper::startApp();
			\RainLoop\Api::LogoutCurrentLogginedUser();
		});
	}
}
