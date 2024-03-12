<?php

use MailSo\Net\ConnectSettings;

class ChangePasswordHMailServerDriver
{
	const
		NAME        = 'hMailServer',
		DESCRIPTION = 'Change passwords using hMailServer. The PHP extension COM must be installed to use this plugin';

	private
		$oConfig = null;

	function __construct(\RainLoop\Config\Plugin $oConfig, \MailSo\Log\Logger $oLogger)
	{
		$this->oConfig = $oConfig;
		$this->oLogger = $oLogger;
	}

	public static function isSupported() : bool
	{
		return \class_exists('COM');
	}

	public static function configMapping() : array
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('hmailserver_login')->SetLabel('Admin Login')
				->SetDefaultValue('Administrator'),
			\RainLoop\Plugins\Property::NewInstance('hmailserver_password')->SetLabel('Admin Password')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::PASSWORD)
				->SetDefaultValue(''),
			\RainLoop\Plugins\Property::NewInstance('hmailserver_emails')->SetLabel('Allowed emails')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('Allowed emails, space as delimiter, wildcard supported. Example: user1@domain1.net user2@domain1.net *@domain2.net')
				->SetDefaultValue('*')
		);
	}

	public function ChangePassword(\RainLoop\Model\Account $oAccount, string $sPrevPassword, string $sNewPassword) : bool
	{
		if (!\RainLoop\Plugins\Helper::ValidateWildcardValues($oAccount->Email(), $this->oConfig->Get('plugin', 'hmailserver_emails', ''))) {
			return false;
		}

		$this->oLogger && $this->oLogger->Write('hMailServer: Try to change password for '.$oAccount->Email());

		$bResult = false;

		try
		{
			$oHmailApp = new \COM('hMailServer.Application');
			$oHmailApp->Connect();

			if ($oHmailApp->Authenticate(
				$this->oConfig->Get('plugin', 'hmailserver_login', ''),
				$this->oConfig->Get('plugin', 'hmailserver_password', '')
			)) {
				$sEmail = $oAccount->Email();
				$sDomain = \MailSo\Base\Utils::getEmailAddressDomain($sEmail);
				$oHmailDomain = $oHmailApp->Domains->ItemByName($sDomain);
				if ($oHmailDomain) {
					$oHmailAccount = $oHmailDomain->Accounts->ItemByAddress($sEmail);
					if ($oHmailAccount) {
						$oHmailAccount->Password = $sNewPassword;
						$oHmailAccount->Save();
						$bResult = true;
					} else {
						$this->oLogger && $this->oLogger->Write('hMailServer: Unknown account ('.$sEmail.')', \LOG_ERROR);
					}
				} else {
					$this->oLogger && $this->oLogger->Write('hMailServer: Unknown domain ('.$sDomain.')', \LOG_ERROR);
				}
			} else {
				$this->oLogger && $this->oLogger->Write('hMailServer: Auth error', \LOG_ERROR);
			}
		}
		catch (\Exception $oException)
		{
			$this->oLogger && $this->oLogger->WriteException($oException);
		}

		return $bResult;
	}
}
