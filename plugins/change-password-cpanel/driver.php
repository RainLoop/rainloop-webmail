<?php
/**
 * TODO: convert to https://api.docs.cpanel.net/openapi/cpanel/operation/passwd_pop/
 * https://github.com/CpanelInc/xmlapi-php
 */

use SnappyMail\SensitiveString;

class ChangePasswordCPanelDriver
{
	const
		NAME        = 'cPanel',
		DESCRIPTION = 'Change passwords in cPanel.';

	private \RainLoop\Config\Plugin $oConfig;

	private \MailSo\Log\Logger $oLogger;

	function __construct(\RainLoop\Config\Plugin $oConfig, \MailSo\Log\Logger $oLogger)
	{
		$this->oConfig = $oConfig;
		$this->oLogger = $oLogger;
	}

	public static function isSupported() : bool
	{
		return !empty($_ENV['CPANEL']) && \is_readable('/usr/local/cpanel/php/cpanel.php');
	}

	public static function configMapping() : array
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('cpanel_host')->SetLabel('cPanel Host')
				->SetDefaultValue('127.0.0.1'),
			\RainLoop\Plugins\Property::NewInstance('cpanel_port')->SetLabel('cPanel Port')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::INT)
				->SetDefaultValue(2087),
			\RainLoop\Plugins\Property::NewInstance('cpanel_ssl')->SetLabel('Use SSL')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetDefaultValue(false),
			\RainLoop\Plugins\Property::NewInstance('cpanel_user')->SetLabel('cPanel User')
				->SetDefaultValue(''),
			\RainLoop\Plugins\Property::NewInstance('cpanel_pass')->SetLabel('cPanel Password')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::PASSWORD)
				->SetDefaultValue(''),
			\RainLoop\Plugins\Property::NewInstance('cpanel_allowed_emails')->SetLabel('Allowed emails')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('Allowed emails, space as delimiter, wildcard supported. Example: user1@domain1.net user2@domain1.net *@domain2.net')
				->SetDefaultValue('*')
		);
	}

	public function ChangePassword(\RainLoop\Model\Account $oAccount, SensitiveString $oPrevPassword, SensitiveString $oNewPassword) : bool
	{
		if (!\RainLoop\Plugins\Helper::ValidateWildcardValues($oAccount->Email(), $this->oConfig->Get('plugin', 'cpanel_allowed_emails', ''))) {
			return false;
		}

		$this->oLogger->Write('CPANEL: Try to change password for '.$oAccount->Email());

		if (!\class_exists('cPanel\\jsonapi')) {
			require_once __DIR__ . '/jsonapi.php';
		}

		$sHost = $this->oConfig->Get('plugin', 'cpanel_host', '127.0.0.1');
		$iPort = $this->oConfig->Get('plugin', 'cpanel_port', 2087);
		$sUser = $this->oConfig->Get('plugin', 'cpanel_user', '');
		$sPassword = $this->oConfig->Get('plugin', 'cpanel_pass', '');

		if (empty($sHost) || 1 > $iPort || !\strlen($sUser) || !\strlen($sPassword)) {
			$this->oLogger->Write('CPANEL: Incorrent configuration data', \MailSo\Log\Enumerations\Type::ERROR);
			return false;
		}

		$sEmail = $oAccount->Email();
		$sEmailUser = \MailSo\Base\Utils::getEmailAddressLocalPart($sEmail);
		$sEmailDomain = \MailSo\Base\Utils::getEmailAddressDomain($sEmail);

		$sHost = \str_replace('{user:domain}', $sEmailDomain, $sHost);
		$sUser = \str_replace('{user:email}', $sEmail, $sUser);
		$sUser = \str_replace('{user:login}', $sEmailUser, $sUser);
		$sPassword = \str_replace('{user:password}', (string) $oPrevPassword, $sPassword);

		$bResult = false;
		try
		{
			$oJSONApi = new \cPanel\jsonapi($sHost);
			$oJSONApi->set_port($iPort);
			$oJSONApi->set_protocol($this->oConfig->Get('plugin', 'cpanel_ssl', false) ? 'https' : 'http');
			$oJSONApi->set_debug(false);
//			$oJSONApi->set_http_client('fopen');
//			$oJSONApi->set_http_client('curl');
			$oJSONApi->password_auth($sUser, $sPassword);

			$aArgs = array(
				'email' => $sEmailUser,
				'domain' => $sEmailDomain,
				'password' => $sNewPassword
			);

			$sResult = $oJSONApi->api2_query($sUser, 'Email', 'passwdpop', $aArgs);
			if ($sResult) {
				$this->oLogger->Write('CPANEL: '.$sResult, \MailSo\Log\Enumerations\Type::INFO);

				$aResult = \json_decode($sResult, true);
				$bResult = isset($aResult['cpanelresult']['data'][0]['result']) &&
					!!$aResult['cpanelresult']['data'][0]['result'];
			}

			if (!$bResult) {
				$this->oLogger->Write('CPANEL: '.$sResult, \MailSo\Log\Enumerations\Type::ERROR);
			}
		}
		catch (\Exception $oException)
		{
			$this->oLogger->WriteException($oException);
		}

		return $bResult;
	}
}
