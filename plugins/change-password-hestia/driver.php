<?php

class ChangePasswordHestiaDriver
{
	const
		NAME        = 'Hestia',
		DESCRIPTION = 'Change passwords in Hestia.';

	/**
	 * @var \RainLoop\Config\Plugin
	 */
	private $oConfig = null;

	/**
	 * @var \MailSo\Log\Logger
	 */
	protected $oLogger = null;

	function __construct(\RainLoop\Config\Plugin $oConfig, \MailSo\Log\Logger $oLogger)
	{
		$this->oConfig = $oConfig;
		$this->oLogger = $oLogger;
	}

	public static function isSupported() : bool
	{
		return true;
	}

	public static function configMapping() : array
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('hestia_host')->SetLabel('Hestia Host')
				->SetDefaultValue('')
				->SetDescription('Ex: localhost or domain.com'),
			\RainLoop\Plugins\Property::NewInstance('hestia_port')->SetLabel('Hestia Port')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::INT)
				->SetDefaultValue(8083)
		);
	}

	public function ChangePassword(\RainLoop\Model\Account $oAccount, string $sPrevPassword, string $sNewPassword) : bool
	{
		if (!\RainLoop\Plugins\Helper::ValidateWildcardValues($oAccount->Email(), $this->oConfig->Get('plugin', 'hestia_allowed_emails', ''))) {
			return false;
		}

		$sHost = $this->oConfig->Get('plugin', 'hestia_login');
		$sPort = $this->oConfig->Get('plugin', 'hestia_port');

		$HTTP = \SnappyMail\HTTP\Request::factory();
		$postvars = array(
			'email'    => $oAccount->Email(),
			'password' => $sPrevPassword,
			'new'      => $sNewPassword,
		);
		$cRequest = $HTTP->doRequest('POST','https://'.$sHost.':'.$sPort.'/reset/mail/',http_build_query($postvars));
		return '==ok==' == $cRequest->body;
	}
}
