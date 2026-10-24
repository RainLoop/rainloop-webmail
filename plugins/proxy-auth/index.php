<?php

class ProxyAuthPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Proxy Auth',
		AUTHOR   = 'Philipp',
		URL      = 'https://www.mundhenk.org/',
		VERSION  = '0.7',
		RELEASE  = '2026-05-17',
		REQUIRED = '2.36.1',
		CATEGORY = 'Login',
		LICENSE  = 'MIT',
		DESCRIPTION = 'Uses HTTP Remote-User and (Dovecot) master user for login';

	public function Init() : void
	{
		$this->addJs('js/auto-login.js');
		$this->addPartHook('ProxyAuth', 'ServiceProxyAuth');
		$this->addPartHook('UserHeaderSet', 'ServiceUserHeaderSet');
		$this->addHook('login.credentials', 'MapEmailAddress');
	}

	public function MapEmailAddress(string &$sEmail, string &$sImapUser, string &$sPassword, string &$sSmtpUser)
	{
		$oActions = \RainLoop\Api::Actions();
		$oLogger = $oActions->Logger();
		$sPrefix = "ProxyAuth";
		$sLevel = LOG_DEBUG;
		$sMsg = "sEmail= " . $sEmail;
		$oLogger->Write($sMsg, $sLevel, $sPrefix);

		$sMasterUser = \trim($this->Config()->getDecrypted('plugin', 'master_user', ''));
		$sMasterSeparator = \trim($this->Config()->getDecrypted('plugin', 'master_separator', ''));

		/* remove superuser from email for proper UI */
		if (static::$login) {
			$sEmail = str_replace($sMasterUser, "", $sEmail);
			$sEmail = str_replace($sMasterSeparator, "", $sEmail);
		}
	}

	private static bool $login = false;
	public function ServiceProxyAuth() : bool
	{
		$oActions = \RainLoop\Api::Actions();

		$oException = null;
		$oAccount = null;

		$oLogger = $oActions->Logger();
		$sLevel = LOG_DEBUG;
		$sPrefix = "ProxyAuth";

		$sMasterUser = \trim($this->Config()->getDecrypted('plugin', 'master_user', ''));
		$sMasterSeparator = \trim($this->Config()->getDecrypted('plugin', 'master_separator', ''));
		$sHeaderName = \trim($this->Config()->getDecrypted('plugin', 'header_name', ''));

		$sRemoteUser = $this->Manager()->Actions()->Http()->GetHeader($sHeaderName);
		$sMsg = "Remote User: " . $sRemoteUser;
		$oLogger->Write($sMsg, $sLevel, $sPrefix);

		/* create master user login from remote user header and settings */
		$sEmail = $sRemoteUser . $sMasterSeparator . $sMasterUser;
		$sPassword = new \SnappyMail\SensitiveString(\trim($this->Config()->getDecrypted('plugin', 'master_password', '')));

		try
		{
			static::$login = true;
			$oAccount = $oActions->LoginProcess($sEmail, $sPassword);
		}
		catch (\Throwable $oException)
		{
			$oLogger = $oActions->Logger();
			$oLogger && $oLogger->WriteException($oException);
		}

		\MailSo\Base\Http::Location('./');
		return true;
	}

	public function ServiceUserHeaderSet() : bool
	{
		$oActions = \RainLoop\Api::Actions();

		$oLogger = $oActions->Logger();
		$sLevel = LOG_DEBUG;
		$sPrefix = "ProxyAuth";

		$sHeaderName = \trim($this->Config()->getDecrypted('plugin', 'header_name', ''));

		$sRemoteUser = $this->Manager()->Actions()->Http()->GetHeader($sHeaderName);
		$sMsg = "Remote User: " . $sRemoteUser;
		$oLogger->Write($sMsg, $sLevel, $sPrefix);

		if (strlen($sRemoteUser) > 0) {
			\MailSo\Base\Http::StatusHeader('200');
		} else {
			\MailSo\Base\Http::StatusHeader('401');
		}
		return true;
	}

	protected function configMapping() : array
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('master_separator')
				->SetLabel('Master User separator')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('Sets the master user separator (format: <username><separator><master username>)')
				->SetDefaultValue('*')
				->SetEncrypted(),
			\RainLoop\Plugins\Property::NewInstance('master_user')
				->SetLabel('Master User')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('Username of master user')
				->SetDefaultValue('admin')
				->SetEncrypted(),
			\RainLoop\Plugins\Property::NewInstance('master_password')
				->SetLabel('Master Password')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('Password for master user')
				->SetDefaultValue('adminpassword')
				->SetEncrypted(),
			\RainLoop\Plugins\Property::NewInstance('header_name')
				->SetLabel('Header Name')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('Name of header containing username')
				->SetDefaultValue('Remote-User')
				->SetEncrypted(),
			\RainLoop\Plugins\Property::NewInstance('auto_login')
				->SetAllowedInJs(true)
				->SetLabel('Activate automatic login')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetDescription('Activates automatic login, if User Header is set (note: Use custom_logout_link to enable logout, see plugin README)')
				->SetDefaultValue(true)
		);
	}
}
