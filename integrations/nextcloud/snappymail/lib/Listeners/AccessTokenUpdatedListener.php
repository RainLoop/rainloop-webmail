<?php

declare(strict_types=1);

namespace OCA\SnappyMail\Listeners;

use OCA\OIDCLogin\Events\AccessTokenUpdatedEvent;
use OCP\App\IAppManager;
use OCP\EventDispatcher\Event;
use OCP\EventDispatcher\IEventListener;
use OCP\ISession;
use OCP\IUserSession;

class AccessTokenUpdatedListener implements IEventListener {
	private IUserSession $userSession;
	private ISession $session;
	private IAppManager $appManager;

	private const SNAPPYMAIL_APP_ID = 'snappymail';
	private const OIDC_LOGIN_APP_ID = 'oidc_login';


	public function __construct(IUserSession $userSession, ISession $session, IAppManager $appManager) {
		$this->userSession = $userSession;
		$this->session = $session;
		$this->appManager = $appManager;
	}

	public function handle(Event $event): void {
		if (!($event instanceof AccessTokenUpdatedEvent) || !$this->userSession->isLoggedIn() || !$this->session->exists('is_oidc')) {
			return;
		}
		// just-in-case checks(also maybe useful for selfhosters)
		if (!$this->appManager->isEnabledForUser(self::SNAPPYMAIL_APP_ID) || !$this->appManager->isEnabledForUser(self::OIDC_LOGIN_APP_ID)) {
			return;
		}
		$accessToken = $event->getAccessToken();
		if (!$accessToken) {
			return;
		}

		$username = $this->userSession->getUser()->getUID();
		$this->session->set('snappymail-nc-uid', $username);
	}
}
