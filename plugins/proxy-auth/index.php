<?php

class ProxyAuthPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Proxy Auth',
		AUTHOR   = 'Philipp',
		URL      = 'https://www.mundhenk.org/',
		VERSION  = '0.3',
		RELEASE  = '2024-03-27',
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

	/* by https://gist.github.com/tott/7684443 */
	/**
 	 * Check if a given ip is in a network
 	 * @param  string $ip    IP to check in IPV4 format eg. 127.0.0.1
 	 * @param  string $range IP/CIDR netmask eg. 127.0.0.0/24, also 127.0.0.1 is accepted and /32 assumed
 	 * @return boolean true if the ip is in this range / false if not.
 	 */
	private function ip_in_range( $ip, $range ) {
		if ( strpos( $range, '/' ) == false ) {
			$range .= '/32';
		}
		// $range is in IP/CIDR format eg 127.0.0.1/24
		list( $range, $netmask ) = explode( '/', $range, 2 );
		$range_decimal = ip2long( $range );
		$ip_decimal = ip2long( $ip );
		$wildcard_decimal = pow( 2, ( 32 - $netmask ) ) - 1;
		$netmask_decimal = ~ $wildcard_decimal;
		return ( ( $ip_decimal & $netmask_decimal ) == ( $range_decimal & $netmask_decimal ) );
	}

	public function MapEmailAddress(string &$sEmail, string &$sLogin, string &$sPassword)
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

		$sProxyIP = $this->Config()->getDecrypted('plugin', 'proxy_ip', '');
		$sMsg = "ProxyIP: " . $sProxyIP;
		$oLogger->Write($sMsg, $sLevel, $sPrefix);

		$sProxyCheck = $this->Config()->getDecrypted('plugin', 'proxy_check', '');
		$sClientIPs = $this->Manager()->Actions()->Http()->GetClientIP(true);

		/* make sure that remote user is only set by authorized proxy to avoid security risks */
		if ($sProxyCheck) {
			$sProxyRequest = false;
			$sMsg = "checking client IPs: " . $sClientIPs;
			$oLogger->Write($sMsg, $sLevel, $sPrefix);

			$sClientIPs = explode(", ", $sClientIPs);
			if (is_array($sClientIPs)) {
				foreach ($sClientIPs as &$sIP) {
					$sMsg = "checking client IP: " . $sIP;
					$oLogger->Write($sMsg, $sLevel, $sPrefix);

					if ($this->ip_in_range($sIP, $sProxyIP)) {
						$sProxyRequest = true;
					}
				}
			} else {
				$sMsg = "checking client IP: " . $sClientIPs;
				$oLogger->Write($sMsg, $sLevel, $sPrefix);

				if ($this->ip_in_range($sClientIPs, $sProxyIP)) {
					$sProxyRequest = true;
				}
			}
		} else {
			$sProxyRequest = true;
		}

		if ($sProxyRequest) {
			/* create master user login from remote user header and settings */
			$sEmail = $sRemoteUser . $sMasterSeparator . $sMasterUser;
			$sPassword = \trim($this->Config()->getDecrypted('plugin', 'master_password', ''));

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
			\RainLoop\Plugins\Property::NewInstance('check_proxy')
				->SetLabel('Check Proxy')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetDescription('Activates check if proxy is connecting')
				->SetDefaultValue(true)
				->SetEncrypted(),
			\RainLoop\Plugins\Property::NewInstance('proxy_ip')
				->SetLabel('Proxy IPNet')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('IP or Subnet of proxy, auth header will only be accepted from this address')
				->SetDefaultValue('10.1.0.0/24')
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
