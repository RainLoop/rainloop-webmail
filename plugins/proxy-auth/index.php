<?php

class ProxyAuthPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Proxy Auth',
		AUTHOR   = 'Philipp',
		URL      = 'https://www.mundhenk.org/',
		VERSION  = '0.1',
		RELEASE  = '2023-01-14',
		REQUIRED = '2.27.0',
		CATEGORY = 'Login',
		LICENSE  = 'MIT',
		DESCRIPTION = 'Uses HTTP Remote-User and (Dovecot) master user for login';

	public function Init() : void
	{
		$this->addPartHook('ProxyAuth', 'ServiceProxyAuth');
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
		$sPrefix = "ProxyAuthCREDENTIALS";
		$sLevel = LOG_DEBUG;
		$sMsg = "sEmail= " . $sEmail;
		$oLogger->Write($sMsg, $sLevel, $sPrefix);
		
		$sMasterUser = \trim($this->Config()->Get('plugin', 'master_user', ''));
		$sMasterSeparator = \trim($this->Config()->Get('plugin', 'master_separator', ''));
		
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

		$sMasterUser = \trim($this->Config()->Get('plugin', 'master_user', ''));
		$sMasterSeparator = \trim($this->Config()->Get('plugin', 'master_separator', ''));
		$sHeaderName = \trim($this->Config()->Get('plugin', 'header_name', ''));

		$sRemoteUser = $this->Manager()->Actions()->Http()->GetHeader($sHeaderName);
		$sMsg = "Remote User: " . $sRemoteUser;
		$oLogger->Write($sMsg, $sLevel, $sPrefix);

		$sProxyIP = $this->Config()->Get('plugin', 'proxy_ip', '');
		$sMsg = "ProxyIP: " . $sProxyIP;
		$oLogger->Write($sMsg, $sLevel, $sPrefix);

		$sProxyCheck = $this->Config()->Get('plugin', 'proxy_check', '');
		$sClientIPs = $this->Manager()->Actions()->Http()->GetClientIP(true);
		
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
			$sEmail = $sRemoteUser . $sMasterSeparator . $sMasterUser;
			$sPassword = \trim($this->Config()->Get('plugin', 'master_password', ''));

			try
			{
				static::$login = true;
				$oAccount = $oActions->LoginProcess($sEmail, $sPassword);
				if ($oAccount instanceof \RainLoop\Model\MainAccount) {
					$oActions->SetAuthToken($oAccount);
				}
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

	protected function configMapping() : array
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('master_separator')
				->SetLabel('Master User separator')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('Sets the master user separator (format: <username><separator><master username>)')
				->SetDefaultValue('*'),
			\RainLoop\Plugins\Property::NewInstance('master_user')
				->SetLabel('Master User')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('Username of master user')
				->SetDefaultValue('admin'),
			\RainLoop\Plugins\Property::NewInstance('master_password')
				->SetLabel('Master Password')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('Password for master user')
				->SetDefaultValue('adminpassword'),
			\RainLoop\Plugins\Property::NewInstance('header_name')
				->SetLabel('Header Name')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('Name of header containing username')
				->SetDefaultValue('Remote-User'),
			\RainLoop\Plugins\Property::NewInstance('check_proxy')
				->SetLabel('Check Proxy')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetDescription('Activates check if proxy is connecting')
				->SetDefaultValue(true),
			\RainLoop\Plugins\Property::NewInstance('proxy_ip')
				->SetLabel('Proxy IPNet')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::STRING_TEXT)
				->SetDescription('IP or Subnet of proxy, auth header will only be accepted from this address')
				->SetDefaultValue('10.1.0.0/24')
		);
	}
}
