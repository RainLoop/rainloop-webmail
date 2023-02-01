<?php

class LoginOverridePlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME = 'Login Override',
		VERSION = '2.0',
		RELEASE = '2023-02-01',
		REQUIRED = '2.25.2',
		CATEGORY = 'Filters',
		DESCRIPTION = 'Override IMAP/SMTP login credentials for specific users.';

	public function Init() : void
	{
		$this->addHook('imap.before-login', 'MapImapCredentials');
		$this->addHook('smtp.before-login', 'MapSmtpCredentials');
	}

	public function MapImapCredentials(\RainLoop\Model\Account $oAccount, \MailSo\Imap\ImapClient $oSmtpClient, \MailSo\Imap\Settings $oSettings)
	{
		static::MapCredentials($oAccount, $oSettings, $this->Config()->getDecrypted('plugin', 'imap_mapping', ''));
	}

	public function MapSmtpCredentials(\RainLoop\Model\Account $oAccount, \MailSo\Smtp\SmtpClient $oSmtpClient, \MailSo\Smtp\Settings $oSettings)
	{
		static::MapCredentials($oAccount, $oSettings, $this->Config()->getDecrypted('plugin', 'smtp_mapping', ''));
	}

	private static function MapCredentials(\RainLoop\Model\Account $oAccount, \MailSo\Net\ConnectSettings $oSettings, string $mapping)
	{
		$sEmail = $oAccount->Email();
		$aList = \preg_split('/\\R/', $mapping);
		foreach ($aList as $line) {
			$line = \explode(':', $line, 3);
			if (!empty($line[0]) && $line[0] === $sEmail) {
				if (!empty($line[1])) {
					$oSettings->Login = $line[1];
				}
				if (!empty($line[2])) {
					$oSettings->Password = $line[2];
				}
			}
		}
	}

	protected function configMapping() : array
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('imap_mapping')
				->SetLabel('IMAP mapping')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('Each line as email:loginname:password, loginname or password may be empty to use default')
				->SetDefaultValue('user@example.com:user1:password1')
				->SetEncrypted(),
			\RainLoop\Plugins\Property::NewInstance('smtp_mapping')
				->SetLabel('SMTP mapping')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('Each line as email:loginname:password, loginname or password may be empty to use default')
				->SetDefaultValue('user@example.com:user1:password1')
				->SetEncrypted()
		);
	}
}
