<?php

class ChangePasswordLdapDriver implements \RainLoop\Providers\ChangePassword\ChangePasswordInterface
{
	/**
	 * @var string
	 */
	private $sHostName = '127.0.0.1';

	/**
	 * @var int
	 */
	private $iHostPort = 389;

	/**
	 * @var string
	 */
	private $sUserDnFormat = '';

	/**
	 * @var string
	 */
	private $sPasswordField = 'userPassword';

	/**
	 * @var string
	 */
	private $sPasswordEncType = 'SHA';

	/**
	 * @var \MailSo\Log\Logger
	 */
	private $oLogger = null;

	/**
	 * @var string
	 */
	private $sAllowedEmails = '';

	/**
	 * @param string $sHostName
	 * @param int $iHostPort
	 * @param string $sUserDnFormat
	 * @param string $sPasswordField
	 * @param string $sPasswordEncType
	 *
	 * @return \ChangePasswordLdapDriver
	 */
	public function SetConfig($sHostName, $iHostPort, $sUserDnFormat, $sPasswordField, $sPasswordEncType)
	{
		$this->sHostName = $sHostName;
		$this->iHostPort = $iHostPort;
		$this->sUserDnFormat = $sUserDnFormat;
		$this->sPasswordField = $sPasswordField;
		$this->sPasswordEncType = $sPasswordEncType;

		return $this;
	}

	/**
	 * @param string $sAllowedEmails
	 *
	 * @return \ChangePasswordLdapDriver
	 */
	public function SetAllowedEmails($sAllowedEmails)
	{
		$this->sAllowedEmails = $sAllowedEmails;

		return $this;
	}

	/**
	 * @param \MailSo\Log\Logger $oLogger
	 *
	 * @return \ChangePasswordLdapDriver
	 */
	public function SetLogger($oLogger)
	{
		if ($oLogger instanceof \MailSo\Log\Logger)
		{
			$this->oLogger = $oLogger;
		}

		return $this;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 *
	 * @return bool
	 */
	public function PasswordChangePossibility($oAccount)
	{
		return $oAccount && $oAccount->Email() &&
			\RainLoop\Plugins\Helper::ValidateWildcardValues($oAccount->Email(), $this->sAllowedEmails);
	}

	/**
	 * @param \RainLoop\Model\Account $oAccount
	 * @param string $sPrevPassword
	 * @param string $sNewPassword
	 *
	 * @return bool
	 */
	public function ChangePassword(\RainLoop\Account $oAccount, $sPrevPassword, $sNewPassword)
	{
		$bResult = false;

		try
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
				'{gecos}' => function_exists('posix_getpwnam') ? posix_getpwnam($oAccount->Login()) : ''
			));

			$oCon = @\ldap_connect($this->sHostName, $this->iHostPort);
			if ($oCon)
			{
				if (!@\ldap_set_option($oCon, LDAP_OPT_PROTOCOL_VERSION, 3))
				{
					$this->oLogger->Write(
						'Failed to set LDAP Protocol version to 3, TLS not supported.',
						\MailSo\Log\Enumerations\Type::WARNING,
						'LDAP'
					);
				}
				else if (@!ldap_start_tls($oCon))
				{
					$this->oLogger->Write("ldap_start_tls failed: ".$oCon, \MailSo\Log\Enumerations\Type::WARNING, 'LDAP');
				}

				if (!@\ldap_bind($oCon, $sUserDn, $sPrevPassword))
				{
					if ($this->oLogger)
					{
						$sError = $oCon ? @\ldap_error($oCon) : '';
						$iErrno = $oCon ? @\ldap_errno($oCon) : 0;

						$this->oLogger->Write('ldap_bind error: '.$sError.' ('.$iErrno.')',
							\MailSo\Log\Enumerations\Type::WARNING, 'LDAP');
					}

					return false;
				}
			}
			else
			{
				return false;
			}

			$sSshaSalt = '';
			$sShaPrefix = '{SHA}';
			$sEncodedNewPassword = $sNewPassword;
			switch (\strtolower($this->sPasswordEncType))
			{
				case 'ssha':
					$sSshaSalt = $this->getSalt(4);
					$sShaPrefix = '{SSHA}';
				case 'sha':
					switch (true)
					{
						default:
						case \function_exists('sha1'):
							$sEncodedNewPassword = $sShaPrefix.\base64_encode(\sha1($sNewPassword.$sSshaSalt, true).$sSshaSalt);
							break;
						case \function_exists('hash'):
							$sEncodedNewPassword = $sShaPrefix.\base64_encode(\hash('sha1', $sNewPassword, true).$sSshaSalt);
							break;
						case \function_exists('mhash') && defined('MHASH_SHA1'):
							$sEncodedNewPassword = $sShaPrefix.\base64_encode(\mhash(MHASH_SHA1, $sNewPassword).$sSshaSalt);
							break;
					}
					break;
				case 'md5':
					$sEncodedNewPassword = '{MD5}'.\base64_encode(\pack('H*', \md5($sNewPassword)));
					break;
				case 'crypt':
					$sEncodedNewPassword = '{CRYPT}'.\crypt($sNewPassword, $this->getSalt(2));
					break;
			}

			$aEntry = array();
			$aEntry[$this->sPasswordField] = (string) $sEncodedNewPassword;

			if (!!@\ldap_modify($oCon, $sUserDn, $aEntry))
			{
				$bResult = true;
			}
			else
			{
				if ($this->oLogger)
				{
					$sError = $oCon ? @\ldap_error($oCon) : '';
					$iErrno = $oCon ? @\ldap_errno($oCon) : 0;

					$this->oLogger->Write('ldap_modify error: '.$sError.' ('.$iErrno.')',
						\MailSo\Log\Enumerations\Type::WARNING, 'LDAP');
				}
			}
		}
		catch (\Exception $oException)
		{
			if ($this->oLogger)
			{
				$this->oLogger->WriteException($oException,
					\MailSo\Log\Enumerations\Type::WARNING, 'LDAP');
			}

			$bResult = false;
		}

		return $bResult;
	}

	/**
	 * @param int $iLength
	 *
	 * @return string
	 */
	private function getSalt($iLength)
	{
		$sChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		$iCharsLength = \strlen($sChars);

		$sResult = '';
		while (\strlen($sResult) < $iLength)
		{
			$sResult .= \substr($sChars, \rand() % $iCharsLength, 1);
		}

		return $sResult;
	}
}
