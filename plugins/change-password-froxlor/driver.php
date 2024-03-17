<?php

use SnappyMail\SensitiveString;

class ChangePasswordFroxlorDriver
{
	const
		NAME        = 'Froxlor',
		DESCRIPTION = 'Change passwords in Froxlor.';

	/**
	 * @var \RainLoop\Config\Plugin
	 */
	private $oConfig = null;

	/**
	 * @var \MailSo\Log\Logger
	 */
	private $oLogger = null;

	function __construct(\RainLoop\Config\Plugin $oConfig, \MailSo\Log\Logger $oLogger)
	{
		$this->oConfig = $oConfig;
		$this->oLogger = $oLogger;
	}

	public static function isSupported() : bool
	{
		return \class_exists('PDO', false)
			// The PHP extension PDO (mysql) must be installed to use this plugin
			&& \in_array('mysql', \PDO::getAvailableDrivers());
	}

	public static function configMapping() : array
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('froxlor_dsn')->SetLabel('Froxlor PDO dsn')
				->SetDefaultValue('mysql:host=localhost;dbname=froxlor;charset=utf8'),
			\RainLoop\Plugins\Property::NewInstance('froxlor_user')->SetLabel('User'),
			\RainLoop\Plugins\Property::NewInstance('froxlor_password')->SetLabel('Password')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::PASSWORD),
			\RainLoop\Plugins\Property::NewInstance('froxlor_allowed_emails')->SetLabel('Allowed emails')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('Allowed emails, space as delimiter, wildcard supported. Example: user1@domain1.net user2@domain1.net *@domain2.net')
				->SetDefaultValue('*')
		);
	}

	public function ChangePassword(\RainLoop\Model\Account $oAccount, SensitiveString $oPrevPassword, SensitiveString $oNewPassword) : bool
	{
		if (!\RainLoop\Plugins\Helper::ValidateWildcardValues($oAccount->Email(), $this->oConfig->Get('plugin', 'froxlor_allowed_emails', ''))) {
			return false;
		}

		try
		{
			if ($this->oLogger) {
				$this->oLogger->Write('froxlor: Try to change password for '.$oAccount->Email());
			}

			$oPdo = new \PDO(
				$this->oConfig->Get('plugin', 'froxlor_dsn', ''),
				$this->oConfig->Get('plugin', 'froxlor_user', ''),
				$this->oConfig->Get('plugin', 'froxlor_password', ''),
				array(
					\PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION
				)
			);

			$oStmt = $oPdo->prepare('SELECT password_enc, id FROM mail_users WHERE username = ? LIMIT 1');

			if ($oStmt->execute(array($oAccount->IncLogin()))) {
				$aFetchResult = $oStmt->fetch(\PDO::FETCH_ASSOC);
				if (!empty($aFetchResult['id'])) {
					$sDbPassword = $aFetchResult['password_enc'];
					$sDbSalt = \substr($sDbPassword, 0, \strrpos($sDbPassword, '$'));
					if (\crypt($oPrevPassword, $sDbSalt) === $sDbPassword) {

						$oStmt = $oPdo->prepare('UPDATE mail_users SET password_enc = ? WHERE id = ?');

						return !!$oStmt->execute(array(
							$this->cryptPassword($oNewPassword),
							$aFetchResult['id']
						));
					}
				}
			}
		}
		catch (\Exception $oException)
		{
			if ($this->oLogger) {
				$this->oLogger->WriteException($oException);
			}
		}
		return false;
	}

	private function cryptPassword(SensitiveString $oPassword) : string
	{
		if (\defined('CRYPT_SHA512') && CRYPT_SHA512) {
			$sSalt = '$6$rounds=5000$' . \bin2hex(\random_bytes(8)) . '$';
		} elseif (\defined('CRYPT_SHA256') && CRYPT_SHA256) {
			$sSalt = '$5$rounds=5000$' . \bin2hex(\random_bytes(8)) . '$';
		} else {
			$sSalt = '$1$' . \bin2hex(\random_bytes(6)) . '$';
		}
		return \crypt($oPassword, $sSalt);
	}
}
