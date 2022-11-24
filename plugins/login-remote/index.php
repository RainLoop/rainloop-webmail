<?php

class LoginRemotePlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Login Remote',
		AUTHOR   = 'SnappyMail',
		URL      = 'https://snappymail.eu/',
		VERSION  = '1.0',
		RELEASE  = '2022-11-11',
		REQUIRED = '2.21.0',
		CATEGORY = 'Login',
		LICENSE  = 'MIT',
		DESCRIPTION = 'Tries to login using the $_ENV["REMOTE_*"] variables';

	public function Init() : void
	{
		$this->addPartHook('RemoteAutoLogin', 'ServiceRemoteAutoLogin');
		$this->addHook('filter.app-data', 'FilterAppData');
	}

	public function FilterAppData($bAdmin, &$aResult)
	{
		if (!$bAdmin && \is_array($aResult) && empty($aResult['Auth']) && isset($_ENV['REMOTE_USER'])) {
			$aResult['DevEmail'] = $this->Config()->Get('plugin', 'email', $_ENV['REMOTE_USER']);
		}
	}

	public function ServiceRemoteAutoLogin() : bool
	{
		$oActions = \RainLoop\Api::Actions();

		$oException = null;
		$oAccount = null;

		$sEmail = $_ENV['REMOTE_USER'] ?? '';
		$sPassword = $_ENV['REMOTE_PASSWORD'] ?? '';

		if (\strlen($sEmail) && \strlen($sPassword))
		{
			try
			{
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

}
