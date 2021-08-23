<?php

class ChangePasswordDriverLDAP
{
	const
		NAME        = 'LDAP',
		DESCRIPTION = 'Change passwords in LDAP.';

	private
		$sLdapUri = 'ldap://localhost:389',
		$bUseStartTLS = True,
		$sUserDnFormat = '',
		$sPasswordField = 'userPassword',
		$sPasswordEncType = 'SHA';

	/**
	 * @var \MailSo\Log\Logger
	 */
	private $oLogger = null;

	function __construct(\RainLoop\Config\Plugin $oConfig, \MailSo\Log\Logger $oLogger)
	{
		$this->oLogger = $oLogger;
		$this->sLdapUri = \trim($oConfig->Get('plugin', 'ldap_uri', ''));
		$this->bUseStartTLS = (bool) \trim($oConfig->Get('plugin', 'ldap_use_start_tls', ''));
		$this->sUserDnFormat = \trim($oConfig->Get('plugin', 'ldap_user_dn_format', ''));
		$this->sPasswordField = \trim($oConfig->Get('plugin', 'ldap_password_field', ''));
		$this->sPasswordEncType = \trim($oConfig->Get('plugin', 'ldap_password_enc_type', ''));
	}

	public static function isSupported() : bool
	{
		// 'The LDAP PHP extension must be installed to use this plugin';
		return \function_exists('ldap_connect');
	}

	public static function configMapping() : array
	{
		return array(
			\RainLoop\Plugins\Property::NewInstance('ldap_uri')->SetLabel('LDAP URI')
				->SetDefaultValue('ldap://localhost:389')
				->SetDescription('LDAP server URI(s), space separated'),
			\RainLoop\Plugins\Property::NewInstance('ldap_use_start_tls')->SetLabel('Use StartTLS')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetDefaultValue(True),
			\RainLoop\Plugins\Property::NewInstance('ldap_user_dn_format')->SetLabel('User DN format')
				->SetDescription('LDAP user dn format. Supported tokens: {email}, {email:user}, {email:domain}, {login}, {domain}, {domain:dc}, {imap:login}, {imap:host}, {imap:port}, {gecos}')
				->SetDefaultValue('uid={imap:login},ou=Users,{domain:dc}'),
			\RainLoop\Plugins\Property::NewInstance('ldap_password_field')->SetLabel('Password field')
				->SetDefaultValue('userPassword'),
			\RainLoop\Plugins\Property::NewInstance('ldap_password_enc_type')->SetLabel('Encryption type')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::SELECTION)
				->SetDefaultValue(array('SHA', 'SSHA', 'MD5', 'Crypt', 'Clear'))
				->SetDescription('In what way do you want the passwords to be encrypted?')
		);
	}

	public function ChangePassword(\RainLoop\Model\Account $oAccount, string $sPrevPassword, string $sNewPassword) : bool
	{
		$sDomain = \MailSo\Base\Utils::GetDomainFromEmail($oAccount->Email());
		$sUserDn = \strtr($this->sUserDnFormat, array(
			'{domain}' => $sDomain,
			'{domain:dc}' => 'dc='.\strtr($sDomain, array('.' => ',dc=')),
			'{email}' => $oAccount->Email(),
			'{email:user}' => \MailSo\Base\Utils::GetAccountNameFromEmail($oAccount->Email()),
			'{email:domain}' => $sDomain,
			'{login}' => $oAccount->Login(),
			'{imap:login}' => $oAccount->Login(),
			'{imap:host}' => $oAccount->DomainIncHost(),
			'{imap:port}' => $oAccount->DomainIncPort(),
			'{gecos}' => \function_exists('posix_getpwnam') ? \posix_getpwnam($oAccount->Login()) : ''
		));

		$oCon = \ldap_connect($this->sLdapUri);
		if (!$oCon) {
			return false;
		}

		if (!\ldap_set_option($oCon, LDAP_OPT_PROTOCOL_VERSION, 3)) {
			$this->oLogger->Write(
				'Failed to set LDAP Protocol version to 3, TLS not supported.',
				\MailSo\Log\Enumerations\Type::WARNING,
				'LDAP'
			);
		}

		if ($this->bUseStartTLS && !@\ldap_start_tls($oCon))
		{
			throw new \Exception('ldap_start_tls error '.\ldap_errno($oCon).': '.\ldap_error($oCon));
		}

		if (!\ldap_bind($oCon, $sUserDn, $sPrevPassword)) {
			throw new \Exception('ldap_bind error '.\ldap_errno($oCon).': '.\ldap_error($oCon));
		}

		$sSshaSalt = '';
		$sPrefix = '{'.\strtoupper($this->sPasswordEncType).'}';
		$sEncodedNewPassword = $sNewPassword;
		switch ($sPrefix)
		{
			case '{SSHA}':
				$sSshaSalt = $this->getSalt(4);
			case '{SHA}':
				$sEncodedNewPassword = $sPrefix.\base64_encode(\hash('sha1', $sNewPassword.$sSshaSalt, true).$sSshaSalt);
				break;
			case '{MD5}':
				$sEncodedNewPassword = $sPrefix.\base64_encode(\md5($sNewPassword, true));
				break;
			case '{CRYPT}':
				$sEncodedNewPassword = $sPrefix.\crypt($sNewPassword, $this->getSalt(2));
				break;
		}

		$aEntry = array();
		$aEntry[$this->sPasswordField] = $sEncodedNewPassword;

		if (!\ldap_mod_replace($oCon, $sUserDn, $aEntry)) {
			throw new \Exception('ldap_mod_replace error '.\ldap_errno($oCon).': '.\ldap_error($oCon));
		}

		return true;
	}

	private function getSalt(int $iLength) : string
	{
		return \substr(\preg_replace('#+/=#', '', \base64_encode(\random_bytes($iLength))), 0, $iLength);
	}
}
