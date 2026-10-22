<?php

class LoginHttpPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Login HTTP',
		AUTHOR   = 'Alterative Editions',
		URL      = 'https://alterative.fr/',
		VERSION  = '1.0',
		RELEASE  = '2026-02-09',
		REQUIRED = '2.21.0',
		CATEGORY = 'Login',
		LICENSE  = 'MIT',
		DESCRIPTION = 'Automatic HTTP Login : uses PHP_AUTH_USER & PHP_AUTH_PW for IMAP connection';

	public function Init() : void
	{
		$this->addPartHook('ExternalHTTP', 'ServiceExternalHTTP');
	}

	public function ServiceExternalHTTP() : string
	{
		$oActions = \RainLoop\Api::Actions();
		$oActions->Http()->ServerNoCache();
		$sUser=$_SERVER['PHP_AUTH_USER'] ?? '';
		$sPassword=$_SERVER['PHP_AUTH_PW'] ?? '';
		try {
                	$oAccount = $oActions->LoginProcess($sUser, new \SnappyMail\SensitiveString($sPassword));
                if ($oAccount) {
                    \MailSo\Base\Http::Location('./');
                    return true;
                }
            } catch (\Throwable $e) {
                // Log l'erreur si besoin
            }
                \MailSo\Base\Http::Location('./?ExternalHTTP');
		return true;
	}
}
