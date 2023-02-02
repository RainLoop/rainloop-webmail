<?php

namespace OCA\SnappyMail\Controller;

use OCA\SnappyMail\Util\SnappyMailHelper;

use OCP\App\IAppManager;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\JSONResponse;
use OCP\IConfig;
use OCP\IL10N;
use OCP\IRequest;

class FetchController extends Controller {
	private $config;
	private $appManager;

	public function __construct(string $appName, IRequest $request, IAppManager $appManager, IConfig $config, IL10N $l) {
		parent::__construct($appName, $request);
		$this->config = $config;
		$this->appManager = $appManager;
		$this->l = $l;
	}

	public function upgrade(): JSONResponse {
		$error = 'Upgrade failed';
		try {
			SnappyMailHelper::loadApp();
			if (\SnappyMail\Upgrade::core()) {
				return new JSONResponse([
					'status' => 'success',
					'Message' => $this->l->t('Upgraded successfully')
				]);
			}
		} catch (Exception $e) {
			$error .= ': ' . $e->getMessage();
		}
		return new JSONResponse([
			'status' => 'error',
			'Message' => $error
		]);
	}

	public function setAdmin(): JSONResponse {
		try {
			$sUrl = '';
			$sPath = '';

			if (isset($_POST['appname']) && 'snappymail' === $_POST['appname']) {
				$this->config->setAppValue('snappymail', 'snappymail-autologin',
					isset($_POST['snappymail-autologin']) ? '1' === $_POST['snappymail-autologin'] : false);
				$this->config->setAppValue('snappymail', 'snappymail-autologin-with-email',
					isset($_POST['snappymail-autologin']) ? '2' === $_POST['snappymail-autologin'] : false);
				$this->config->setAppValue('snappymail', 'snappymail-no-embed', isset($_POST['snappymail-no-embed']));
			} else {
				return new JSONResponse([
					'status' => 'error',
					'Message' => $this->l->t('Invalid argument(s)')
				]);
			}

			if (!empty($_POST['import-rainloop'])) {
				return new JSONResponse([
					'status' => 'success',
					'Message' => \implode("\n", \OCA\SnappyMail\Util\RainLoop::import())
				]);
			}

			SnappyMailHelper::loadApp();
			$debug = !empty($_POST['snappymail-debug']);
			$oConfig = \RainLoop\Api::Config();
			if ($debug != $oConfig->Get('debug', 'enable', false)) {
				$oConfig->Set('debug', 'enable', $debug);
				$oConfig->Save();
			}

			return new JSONResponse([
				'status' => 'success',
				'Message' => $this->l->t('Saved successfully')
			]);
		} catch (Exception $e) {
			return new JSONResponse([
				'status' => 'error',
				'Message' => $e->getMessage()
			]);
		}
	}

	/**
	 * @NoAdminRequired
	 */
	public function setPersonal(): JSONResponse {
		try {
			$sEmail = '';
			if (isset($_POST['appname'], $_POST['snappymail-password'], $_POST['snappymail-email']) && 'snappymail' === $_POST['appname']) {
				$sUser =  \OC::$server->getUserSession()->getUser()->getUID();

				$sEmail = $_POST['snappymail-email'];
				$this->config->setUserValue($sUser, 'snappymail', 'snappymail-email', $sEmail);

				$sPass = $_POST['snappymail-password'];
				if ('******' !== $sPass) {
					$this->config->setUserValue($sUser, 'snappymail', 'snappymail-password',
						$sPass ? SnappyMailHelper::encodePassword($sPass, \md5($sEmail)) : '');
				}
			} else {
				return new JSONResponse([
					'status' => 'error',
					'Message' => $this->l->t('Invalid argument(s)'),
					'Email' => $sEmail
				]);
			}

			return new JSONResponse([
				'status' => 'success',
				'Message' => $this->l->t('Saved successfully'),
				'Email' => $sEmail
			]);
		} catch (Exception $e) {
			return new JSONResponse([
				'status' => 'error',
				'Message' => $e->getMessage()
			]);
		}
	}
}

