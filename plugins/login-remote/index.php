<?php

class LoginRemotePlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Login Remote',
		AUTHOR   = 'SnappyMail',
		URL      = 'https://snappymail.eu/',
		VERSION  = '1.2',
		RELEASE  = '2022-11-24',
		REQUIRED = '2.21.0',
		CATEGORY = 'Login',
		LICENSE  = 'MIT',
		DESCRIPTION = 'Tries to login using the $_ENV["REMOTE_*"] variables';

	public function Init() : void
	{
		$this->addPartHook('RemoteAutoLogin', 'ServiceRemoteAutoLogin');
		$this->addHook('filter.app-data', 'FilterAppData');
		$this->addHook('login.credentials', 'FilterLoginCredentials');
	}

	public function FilterAppData($bAdmin, &$aResult)
	{
		if (!$bAdmin && \is_array($aResult) && empty($aResult['Auth']) && isset($_ENV['REMOTE_USER'])) {
			$aResult['DevEmail'] = $_ENV['REMOTE_USER'];
//			$aResult['DevPassword'] = $_ENV['REMOTE_PASSWORD'];
		}
	}

	private static bool $login = false;
	public function ServiceRemoteAutoLogin() : bool
	{
		$oActions = \RainLoop\Api::Actions();

		$oException = null;
		$oAccount = null;

		$sEmail = $_ENV['REMOTE_USER'] ?? '';
		$sPassword = $_ENV['REMOTE_PASSWORD'] ?? '';

		if (\strlen($sEmail) && \strlen($sPassword)) {
			try
			{
				static::$login = true;
				$oAccount = $oActions->LoginProcess($sEmail, $sPassword);
				if ($oAccount instanceof \RainLoop\Model\MainAccount) {
					$oActions->SetAuthToken($oAccount);
				}
			}
			catch (\Throwable $oException)
			{
				$oLogger = $oActions->Logger();
				$oLogger && $oLogger->WriteException($oException);
			}
		}

		$oActions->Location('./');
		return true;
	}

	public function FilterLoginCredentials(&$sEmail, &$sLogin, &$sPassword)
	{
		// cPanel https://github.com/the-djmaze/snappymail/issues/697
//		 && !empty($_ENV['CPANEL'])
		if (static::$login/* && $sLogin == $_ENV['REMOTE_USER']*/) {
			if (empty($_ENV['REMOTE_TEMP_USER'])) {
				$iPos = \strpos($sPassword, '[::cpses::]');
				if ($iPos) {
					$_ENV['REMOTE_TEMP_USER'] = \substr($sPassword, 0, $iPos);
				}
			}
			if (!empty($_ENV['REMOTE_TEMP_USER'])) {
				$sLogin = $_ENV['REMOTE_USER'] . '/' . $_ENV['REMOTE_TEMP_USER'];
			}
		}
	}

}
