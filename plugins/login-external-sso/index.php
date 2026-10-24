<?php

class LoginExternalSsoPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Login External SSO',
		AUTHOR   = 'SnappyMail',
		URL      = 'https://snappymail.eu/',
		VERSION  = '1.0',
		RELEASE  = '2022-11-11',
		REQUIRED = '2.21.0',
		CATEGORY = 'Login',
		LICENSE  = 'MIT',
		DESCRIPTION = 'Login with $_POST "Email", "Password" and "SsoKey". It returns an SSO hash to use with "?Sso&hash="';

	public function Init() : void
	{
		$this->addPartHook('ExternalSso', 'ServiceExternalSso');
	}

	public function ServiceExternalSso() : string
	{
		$oActions = \RainLoop\Api::Actions();
		$oActions->Http()->ServerNoCache();
		$sKey = $this->Config()->Get('plugin', 'key', '');
		$sEmail = isset($_POST['Email']) ? $_POST['Email'] : '';
		$sPassword = isset($_POST['Password']) ? $_POST['Password'] : '';
		if ($sEmail && $sPassword && $sKey && isset($_POST['SsoKey']) && $_POST['SsoKey'] == $sKey) {
			$sResult = \RainLoop\Api::CreateUserSsoHash($sEmail, $sPassword);
			if (isset($_POST['Output']) && 'json' === \strtolower($_POST['Output'])) {
				\header('Content-Type: application/json; charset=utf-8');
				echo \json_encode(array(
					'Action' => 'ExternalSso',
					'Result' => $sResult
				));
			} else {
				\header('Content-Type: text/plain');
				echo $sResult;
			}
		}
		return true;
	}

	/**
	 * @return array
	 */
	public function configMapping() : array
	{
		return array(
			// Was application.ini external_sso_key
			\RainLoop\Plugins\Property::NewInstance('key')->SetLabel('SSO key')
				->SetDefaultValue(''),
		);
	}

}
