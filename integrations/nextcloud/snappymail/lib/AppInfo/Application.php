<?php

namespace OCA\SnappyMail\AppInfo;

use OCA\SnappyMail\Util\SnappyMailHelper;
use OCA\SnappyMail\Controller\AjaxController;
use OCA\SnappyMail\Controller\PageController;

use OCP\AppFramework\App;
use OCP\IL10N;
use OCP\IUser;

class Application extends App {

	public function __construct(array $urlParams = []) {
		parent::__construct('snappymail', $urlParams);

		$container = $this->getContainer();
		$server = $container->getServer();
		$config = $server->getConfig();

		/**
		 * Controllers
		 */
		$container->registerService(
			'PageController', function($c) {
				return new PageController(
					$c->query('AppName'),
					$c->query('Request'),
					$c->getServer()->getAppManager(),
					$c->query('ServerContainer')->getConfig(),
					$c->getServer()->getSession()
				);
			}
		);

		$container->registerService(
			'AjaxController', function($c) {
				return new AjaxController(
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
				return new SnappyMailHelper(
					$c->getServer()->getConfig(),
					$c->getServer()->getUserSession(),
					$c->getServer()->getAppManager(),
					$c->getServer()->getSession()
				);
			}
		);

		// Add script js/snappymail.js
		\OCP\Util::addScript('snappymail', 'snappymail');
	}

	public function registerNavigation() {
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

	public function registerPersonalSettings() {
		\OCP\App::registerPersonal('snappymail', 'templates/personal');
	}

}

