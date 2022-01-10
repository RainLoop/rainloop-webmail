<?php

namespace RainLoop\Model;

use MailSo\Net\Enumerations\ConnectionSecurityType;

class Domain implements \JsonSerializable
{
	const DEFAULT_FORWARDED_FLAG = '$Forwarded';

	/**
	 * @var string
	 */
	private $sName;

	/**
	 * @var string
	 */
	private $sIncHost;

	/**
	 * @var int
	 */
	private $iIncPort;

	/**
	 * @var int
	 */
	private $iIncSecure;

	/**
	 * @var bool
	 */
	private $bIncShortLogin;

	/**
	 * @var string
	 */
	private $sOutHost;

	/**
	 * @var int
	 */
	private $iOutPort;

	/**
	 * @var int
	 */
	private $iOutSecure;

	/**
	 * @var bool
	 */
	private $bOutShortLogin;

	/**
	 * @var bool
	 */
	private $bOutAuth;

	/**
	 * @var bool
	 */
	private $bOutSetSender;

	/**
	 * @var bool
	 */
	private $bOutUsePhpMail;

	/**
	 * @var bool
	 */
	private $bUseSieve;

	/**
	 * @var string
	 */
	private $sSieveHost;

	/**
	 * @var int
	 */
	private $iSievePort;

	/**
	 * @var int
	 */
	private $iSieveSecure;

	/**
	 * @var string
	 */
	private $sWhiteList;

	/**
	 * @var string
	 */
	private $sAliasName = '';

	function __construct(string $sName)
	{
		$this->sName = $sName;
	}

	/**
	 * See ToIniString() for valid values
	 */
	public static function NewInstanceFromDomainConfigArray(string $sName, array $aDomain) : ?self
	{
		$oDomain = null;

		if (\strlen($sName) && \strlen($aDomain['imap_host']) && \strlen($aDomain['imap_port']))
		{
			$oDomain = new self($sName);

			$oDomain->sIncHost = (string) $aDomain['imap_host'];
			$oDomain->iIncPort = (int) $aDomain['imap_port'];
			$oDomain->iIncSecure = self::StrConnectionSecurityTypeToCons(empty($aDomain['imap_secure']) ? '' : $aDomain['imap_secure']);
			$oDomain->bIncShortLogin = !empty($aDomain['imap_short_login']);

			$oDomain->bUseSieve = !empty($aDomain['sieve_use']);
			$oDomain->sSieveHost = empty($aDomain['sieve_host']) ? '' : (string) $aDomain['sieve_host'];
			$oDomain->iSievePort = empty($aDomain['sieve_port']) ? 4190 : (int) $aDomain['sieve_port'];
			$oDomain->iSieveSecure = self::StrConnectionSecurityTypeToCons(empty($aDomain['sieve_secure']) ? '' : $aDomain['sieve_secure']);

			$oDomain->sOutHost = empty($aDomain['smtp_host']) ? '' : (string) $aDomain['smtp_host'];
			$oDomain->iOutPort = empty($aDomain['smtp_port']) ? 25 : (int) $aDomain['smtp_port'];
			$oDomain->iOutSecure = self::StrConnectionSecurityTypeToCons(empty($aDomain['smtp_secure']) ? '' : $aDomain['smtp_secure']);
			$oDomain->bOutShortLogin = !empty($aDomain['smtp_short_login']);
			$oDomain->bOutAuth = !empty($aDomain['smtp_auth']);
			$oDomain->bOutSetSender = !empty($aDomain['smtp_set_sender']);
			$oDomain->bOutUsePhpMail = !empty($aDomain['smtp_php_mail']);

			$oDomain->sWhiteList = (string) ($aDomain['white_list'] ?? '');
		}

		return $oDomain;
	}

	private function encodeIniString(string $sStr) : string
	{
		return str_replace('"', '\\"', $sStr);
	}

	public function Normalize()
	{
		$this->sIncHost = \trim($this->sIncHost);
		$this->sSieveHost = \trim($this->sSieveHost);
		$this->sOutHost = \trim($this->sOutHost);
		$this->sWhiteList = \trim($this->sWhiteList);

		if ($this->iIncPort <= 0)
		{
			$this->iIncPort = 143;
		}

		if ($this->iSievePort <= 0)
		{
			$this->iSievePort = 4190;
		}

		if ($this->iOutPort <= 0)
		{
			$this->iOutPort = 25;
		}
	}

	public function ToIniString() : string
	{
		$this->Normalize();
		return \implode("\n", array(
			'imap_host = "'.$this->encodeIniString($this->sIncHost).'"',
			'imap_port = '.$this->iIncPort,
			'imap_secure = "'.self::ConstConnectionSecurityTypeToStr($this->iIncSecure).'"',
			'imap_short_login = '.($this->bIncShortLogin ? 'On' : 'Off'),
			'sieve_use = '.($this->bUseSieve ? 'On' : 'Off'),
			'sieve_host = "'.$this->encodeIniString($this->sSieveHost).'"',
			'sieve_port = '.$this->iSievePort,
			'sieve_secure = "'.self::ConstConnectionSecurityTypeToStr($this->iSieveSecure).'"',
			'smtp_host = "'.$this->encodeIniString($this->sOutHost).'"',
			'smtp_port = '.$this->iOutPort,
			'smtp_secure = "'.self::ConstConnectionSecurityTypeToStr($this->iOutSecure).'"',
			'smtp_short_login = '.($this->bOutShortLogin ? 'On' : 'Off'),
			'smtp_auth = '.($this->bOutAuth ? 'On' : 'Off'),
			'smtp_set_sender = '.($this->bOutSetSender ? 'On' : 'Off'),
			'smtp_php_mail = '.($this->bOutUsePhpMail ? 'On' : 'Off'),
			'white_list = "'.$this->encodeIniString($this->sWhiteList).'"'
		));
	}

	public static function StrConnectionSecurityTypeToCons(string $sType) : int
	{
		$iSecurityType = ConnectionSecurityType::NONE;
		switch (strtoupper($sType))
		{
			case 'SSL':
				$iSecurityType = ConnectionSecurityType::SSL;
				break;
			case 'TLS':
				$iSecurityType = ConnectionSecurityType::STARTTLS;
				break;
		}
		return $iSecurityType;
	}

	public static function ConstConnectionSecurityTypeToStr(int $iSecurityType) : string
	{
		$sType = 'None';
		switch ($iSecurityType)
		{
			case ConnectionSecurityType::SSL:
				$sType = 'SSL';
				break;
			case ConnectionSecurityType::STARTTLS:
				$sType = 'TLS';
				break;
		}

		return $sType;
	}

	public function SetConfig(
		string $sIncHost, int $iIncPort, int $iIncSecure, bool $bIncShortLogin,
		bool $bUseSieve, string $sSieveHost, int $iSievePort, int $iSieveSecure,
		string $sOutHost, int $iOutPort, int $iOutSecure, bool $bOutShortLogin,
		bool $bOutAuth, bool $bOutSetSender, bool $bOutUsePhpMail,
		string $sWhiteList = '') : self
	{
		$this->sIncHost = $sIncHost;
		$this->iIncPort = $iIncPort;
		$this->iIncSecure = $iIncSecure;
		$this->bIncShortLogin = $bIncShortLogin;

		$this->bUseSieve = $bUseSieve;
		$this->sSieveHost = $sSieveHost;
		$this->iSievePort = $iSievePort;
		$this->iSieveSecure = $iSieveSecure;

		$this->sOutHost = $sOutHost;
		$this->iOutPort = $iOutPort;
		$this->iOutSecure = $iOutSecure;
		$this->bOutShortLogin = $bOutShortLogin;
		$this->bOutAuth = $bOutAuth;
		$this->bOutSetSender = $bOutSetSender;
		$this->bOutUsePhpMail = $bOutUsePhpMail;

		$this->sWhiteList = \trim($sWhiteList);

		return $this;
	}

	public function Name() : string
	{
		return $this->sName;
	}

	public function IncHost() : string
	{
		return $this->sIncHost;
	}

	public function IncPort() : int
	{
		return $this->iIncPort;
	}

	public function IncSecure() : int
	{
		return $this->iIncSecure;
	}

	public function IncShortLogin() : bool
	{
		return $this->bIncShortLogin;
	}

	public function UseSieve() : bool
	{
		return $this->bUseSieve;
	}

	public function SieveHost() : string
	{
		return $this->sSieveHost;
	}

	public function SievePort() : int
	{
		return $this->iSievePort;
	}

	public function SieveSecure() : int
	{
		return $this->iSieveSecure;
	}

	public function OutHost() : string
	{
		return $this->sOutHost;
	}

	public function OutPort() : int
	{
		return $this->iOutPort;
	}

	public function OutSecure() : int
	{
		return $this->iOutSecure;
	}

	public function OutShortLogin() : bool
	{
		return $this->bOutShortLogin;
	}

	public function OutAuth() : bool
	{
		return $this->bOutAuth;
	}

	public function OutSetSender() : bool
	{
		return $this->bOutSetSender;
	}

	public function OutUsePhpMail() : bool
	{
		return $this->bOutUsePhpMail;
	}

	public function WhiteList() : string
	{
		return $this->sWhiteList;
	}

	public function AliasName() : string
	{
		return $this->sAliasName;
	}

	public function SetAliasName(string $sAliasName) : self
	{
		$this->sAliasName = $sAliasName;

		return $this;
	}

	public function ValidateWhiteList(string $sEmail, string $sLogin = '') : bool
	{
		$sW = \trim($this->sWhiteList);
		if (\strlen($sW))
		{
			$sEmail = \MailSo\Base\Utils::IdnToUtf8($sEmail, true);
			$sLogin = \MailSo\Base\Utils::IdnToUtf8($sLogin, true);

			$sW = \preg_replace('/([^\s]+)@[^\s]*/', '$1', $sW);
			$sW = ' '.\trim(\preg_replace('/[\s;,\r\n\t]+/', ' ', $sW)).' ';

			$sUserPart = \MailSo\Base\Utils::GetAccountNameFromEmail(\strlen($sLogin) ? $sLogin : $sEmail);
			return false !== \stripos($sW, ' '.$sUserPart.' ');
		}

		return true;
	}

	public function ImapSettings() : array
	{
		return array(
			'UseConnect' => true,
			'UseAuth' => true,
			'Host' => $this->sIncHost,
			'Port' => $this->iIncPort,
			'Secure' => $this->iIncSecure,
		);
	}

	public function SmtpSettings() : array
	{
		return array(
			'UseConnect' => !$this->bOutUsePhpMail,
			'UseAuth' => $this->bOutAuth,
			'Host' => $this->sOutHost,
			'Port' => $this->iOutPort,
			'Secure' => $this->iOutSecure,
			'Ehlo' => \MailSo\Smtp\SmtpClient::EhloHelper(),
			'UsePhpMail' => $this->bOutUsePhpMail
		);
	}

	public function SieveSettings() : array
	{
		return array(
			'UseConnect' => true,
			'UseAuth' => true,
			'Host' => $this->sSieveHost,
			'Port' => $this->iSievePort,
			'Secure' => $this->iSieveSecure
		);
	}

	public function ToSimpleJSON() : array
	{
		return array(
			'Name' => $this->sName,
			'IncHost' => $this->sIncHost,
			'IncPort' => $this->iIncPort,
			'IncSecure' => $this->iIncSecure,
			'IncShortLogin' => $this->bIncShortLogin,
			'UseSieve' => $this->bUseSieve,
			'SieveHost' => $this->sSieveHost,
			'SievePort' => $this->iSievePort,
			'SieveSecure' => $this->iSieveSecure,
			'OutHost' => $this->sOutHost,
			'OutPort' => $this->iOutPort,
			'OutSecure' => $this->iOutSecure,
			'OutShortLogin' => $this->bOutShortLogin,
			'OutAuth' => $this->bOutAuth,
			'OutSetSender' => $this->bOutSetSender,
			'OutUsePhpMail' => $this->bOutUsePhpMail,
			'WhiteList' => $this->sWhiteList,
			'AliasName' => $this->sAliasName
		);
	}

	public function jsonSerialize()
	{
		return array(
//			'@Object' => 'Object/Domain',
			'Name' => \MailSo\Base\Utils::IdnToUtf8($this->sName),
			'IncHost' => \MailSo\Base\Utils::IdnToUtf8($this->sIncHost),
			'IncPort' => $this->iIncPort,
			'IncSecure' => $this->iIncSecure,
			'IncShortLogin' => $this->bIncShortLogin,
			'UseSieve' => $this->bUseSieve,
			'SieveHost' => \MailSo\Base\Utils::IdnToUtf8($this->sSieveHost),
			'SievePort' => $this->iSievePort,
			'SieveSecure' => $this->iSieveSecure,
			'OutHost' => \MailSo\Base\Utils::IdnToUtf8($this->sOutHost),
			'OutPort' => $this->iOutPort,
			'OutSecure' => $this->iOutSecure,
			'OutShortLogin' => $this->bOutShortLogin,
			'OutAuth' => $this->bOutAuth,
			'OutSetSender' => $this->bOutSetSender,
			'OutUsePhpMail' => $this->bOutUsePhpMail,
			'WhiteList' => $this->sWhiteList,
			'AliasName' => $this->sAliasName
		);
	}
}
