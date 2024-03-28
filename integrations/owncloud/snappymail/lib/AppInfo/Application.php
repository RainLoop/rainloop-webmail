<?php

namespace OCA\SnappyMail\AppInfo;

use OCA\SnappyMail\Util\SnappyMailHelper;
use OCA\SnappyMail\Controller\FetchController;
use OCA\SnappyMail\Controller\PageController;
use OCA\SnappyMail\Search\Provider;

use OCP\AppFramework\App;
use OCP\IL10N;
use OCP\IUser;
use OCP\User\Events\PostLoginEvent;
use OCP\User\Events\BeforeUserLoggedOutEvent;
use OCP\IContainer;

class Application extends App
{
	public const APP_ID = 'snappymail';

	public function __construct(array $urlParams = [])
	{
		parent::__construct(self::APP_ID, $urlParams);

		$container = $this->getContainer();
		$server = $container->getServer();

		/**
		 * Controllers
		 *//*
		$container->registerService(
			'PageController', function(IContainer $c) {
				return new PageController(
					$c->query('AppName'),
					$c->query('Request')
				);
			}
		);

		$container->registerService(
			'FetchController', function(IContainer $c) {
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
		 *//*
		$container->registerService(
			'SnappyMailHelper', function(IContainer $c) {
				return new SnappyMailHelper();
			}
		);
*/
//		$container->registerSearchProvider(Provider::class);
	}
/*
	public function boot(IBootContext $context): void
	{
		if (!\is_dir(\rtrim(\trim(\OC::$server->getSystemConfig()->getValue('datadirectory', '')), '\\/') . '/appdata_snappymail')) {
			return;
		}

		$dispatcher = $context->getAppContainer()->query('OCP\EventDispatcher\IEventDispatcher');
		$dispatcher->addListener(PostLoginEvent::class, function (PostLoginEvent $Event) {
			$config = \OC::$server->getConfig();
			// Only store the user's password in the current session if they have
			// enabled auto-login using ownCloud username or email address.
			if ($config->getAppValue('snappymail', 'snappymail-autologin', false)
			 || $config->getAppValue('snappymail', 'snappymail-autologin-with-email', false)) {
				$sUID = $Event->getUser()->getUID();
				\OC::$server->getSession()['snappymail-nc-uid'] = $sUID;
				\OC::$server->getSession()['snappymail-password'] = SnappyMailHelper::encodePassword($Event->getPassword(), $sUID);
			}
		});

		$dispatcher->addListener(BeforeUserLoggedOutEvent::class, function (BeforeUserLoggedOutEvent $Event) {
			\OC::$server->getSession()['snappymail-password'] = '';
			SnappyMailHelper::loadApp();
			\RainLoop\Api::Actions()->Logout(true);
		});

		// https://github.com/nextcloud/impersonate/issues/179
		// https://github.com/nextcloud/impersonate/pull/180
		$class = 'OCA\Impersonate\Events\BeginImpersonateEvent';
		if (\class_exists($class)) {
			$dispatcher->addListener($class, function ($Event) {
				\OC::$server->getSession()['snappymail-password'] = '';
				SnappyMailHelper::loadApp();
				\RainLoop\Api::Actions()->Logout(true);
			});
			$dispatcher->addListener('OCA\Impersonate\Events\EndImpersonateEvent', function ($Event) {
				\OC::$server->getSession()['snappymail-password'] = '';
				SnappyMailHelper::loadApp();
				\RainLoop\Api::Actions()->Logout(true);
			});
		}
	}
*/
}
