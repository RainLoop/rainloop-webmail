<?php

class ChangePasswordDriverExample
{
	const
		NAME        = 'Example',
		DESCRIPTION = 'Example driver to change the email account passwords.';

	private
		$sHostName = '';

	/**
	 * @var \MailSo\Log\Logger
	 */
	private $oLogger = null;

	function __construct(\RainLoop\Config\Plugin $oConfig, \MailSo\Log\Logger $oLogger)
	{
		$this->oLogger = $oLogger;
//		$this->sHostName = $oConfig->Get('plugin', 'example_hostname', '');
	}

	public static function isSupported() : bool
	{
		return false;
	}

	public static function configMapping() : array
	{
		return array();
	}

	public function ChangePassword(\RainLoop\Model\Account $oAccount, string $sPrevPassword, string $sNewPassword) : bool
	{
		return false;
	}
}
