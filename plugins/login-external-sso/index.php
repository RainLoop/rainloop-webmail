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
		DESCRIPTION = '';

	public function Init() : void
	{
		$this->addPartHook('ExternalSso', 'ServiceExternalSso');
	}

	public function ServiceExternalSso() : string
	{
		$oActions = \RainLoop\Api::Actions();
		$oActions->Http()->ServerNoCache();
		$sKey = $this->Config()->Get('plugin', 'key', '');
		$sEmail = $_POST['Email'];
		$sPassword = $_POST['Password'];
		if ($sEmail && $sPassword && $sKey && $_POST['SsoKey'] == $sKey) {
			$sResult = \RainLoop\Api::CreateUserSsoHash($sEmail, $sPassword);
			if ('json' == \strtolower($_POST['Output'] ?? 'Plain')) {
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
			Property::NewInstance('key')->SetLabel('SSO key')
				->SetDefaultValue(''),
		);
	}

}
