<?php

namespace RainLoop\Actions;

use RainLoop\Exceptions\ClientException;
use RainLoop\KeyPathHelper;
use RainLoop\Notifications;
use RainLoop\Utils;

trait Admin
{
	protected static string $AUTH_ADMIN_TOKEN_KEY = 'smadmin';

	public function IsAdminLoggined(bool $bThrowExceptionOnFalse = true) : bool
	{
		if ($this->Config()->Get('security', 'allow_admin_panel', true)) {
			// [PATCH ronzz.org] OIDC bridge: nginx auth_request (webmail-admin.ronzz.org)
			// sets X-NC-Admin after validating the Nextcloud session. Honored only on the
			// dedicated admin host (admin_panel.host); the header is stripped/overridden
			// at nginx for any other path.
			if (!empty($_SERVER['HTTP_X_NC_ADMIN'])
				&& \strtolower((string) $this->Config()->Get('admin_panel', 'host', '')) === \strtolower($this->Http()->GetHost()))
			{
				return true;
			}
			$sAdminKey = $this->getAdminAuthKey();
			if ($sAdminKey && $this->Cacher(null, true)->Get(KeyPathHelper::SessionAdminKey($sAdminKey))) {
				return true;
			}
		}

		if ($bThrowExceptionOnFalse) {
			throw new ClientException(Notifications::AuthError);
		}

		return false;
	}

	protected function getAdminAuthKey() : string
	{
		$cookie = \SnappyMail\Cookies::get(static::$AUTH_ADMIN_TOKEN_KEY);
		if ($cookie) {
			$aAdminHash = Utils::DecodeKeyValuesQ($cookie);
			if (!empty($aAdminHash[1]) && 'token' === $aAdminHash[0]) {
				return $aAdminHash[1];
			}
			\SnappyMail\Cookies::clear(static::$AUTH_ADMIN_TOKEN_KEY);
		}
		return '';
	}
}
