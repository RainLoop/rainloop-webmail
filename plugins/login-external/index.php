<?php

class LoginExternalPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Login External',
		AUTHOR   = 'SnappyMail',
		URL      = 'https://snappymail.eu/',
		VERSION  = '1.4',
		RELEASE  = '2024-07-01',
		REQUIRED = '2.36.1',
		CATEGORY = 'Login',
		LICENSE  = 'MIT',
		DESCRIPTION = 'Login with $_POST["Email"] and $_POST["Password"] from anywhere';

	public function Init() : void
	{
		$this->addPartHook('ExternalLogin', 'ServiceExternalLogin');
	}

	public function ServiceExternalLogin() : bool
	{
		$oActions = \RainLoop\Api::Actions();
		$oActions->Http()->ServerNoCache();

		$oAccount = null;
		$oException = null;

		$sEmail = isset($_POST['Email']) ? $_POST['Email'] : '';
		$sPassword = isset($_POST['Password']) ? $_POST['Password'] : '';

		try
		{
			// Convert password to SensitiveString type
			$oPassword = new \SnappyMail\SensitiveString($sPassword);
			$oAccount = $oActions->LoginProcess($sEmail, $oPassword);
			if (!$oAccount instanceof \RainLoop\Model\MainAccount) {
				$oAccount = null;
				\SnappyMail\LOG::info(\get_class($this), 'LoginProcess failed');
			}
		}
		catch (\Throwable $oException)
		{
			$oLogger = $oActions->Logger();
			$oLogger && $oLogger->WriteException($oException);
		}

		if (isset($_POST['Output']) && 'json' === \strtolower($_POST['Output'])) {
			\header('Content-Type: application/json; charset=utf-8');
			$aResult = array(
				'Action' => 'ExternalLogin',
				'Result' => $oAccount ? true : false,
				'ErrorCode' => 0
			);
			if (!$oAccount) {
				if ($oException instanceof \RainLoop\Exceptions\ClientException) {
					$aResult['ErrorCode'] = $oException->getCode();
				} else {
					$aResult['ErrorCode'] = \RainLoop\Notifications::AuthError;
				}
			}
			echo \json_encode($aResult);
		} else {
			\MailSo\Base\Http::Location('./');
		}
		return true;
	}

}
