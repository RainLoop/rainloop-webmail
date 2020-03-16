<?php

namespace RainLoop\Model;

use MailSo\Net\Enumerations\ConnectionSecurityType;

class Domain
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
	 * @var bool
	 */
	private $bSieveAllowRaw;

	/**
	 * @var string
	 */
	private $sWhiteList;

	/**
	 * @var string
	 */
	private $sAliasName;

	private function __construct(string $sName,
		string $sIncHost, int $iIncPort, int $iIncSecure, bool $bIncShortLogin,
		bool $bUseSieve, string $sSieveHost, int $iSievePort, int $iSieveSecure,
		string $sOutHost, int $iOutPort, int $iOutSecure, bool $bOutShortLogin, bool $bOutAuth, bool $bOutUsePhpMail = false,
		string $sWhiteList = '')
	{
		$this->sName = $sName;
		$this->sIncHost = $sIncHost;
		$this->iIncPort = $iIncPort;
		$this->iIncSecure = $iIncSecure;
		$this->bIncShortLogin = $bIncShortLogin;

		$this->sOutHost = $sOutHost;
		$this->iOutPort = $iOutPort;
		$this->iOutSecure = $iOutSecure;
		$this->bOutShortLogin = $bOutShortLogin;
		$this->bOutAuth = $bOutAuth;
		$this->bOutUsePhpMail = $bOutUsePhpMail;

		$this->bUseSieve = $bUseSieve;
		$this->sSieveHost = $sSieveHost;
		$this->iSievePort = $iSievePort;
		$this->iSieveSecure = $iSieveSecure;

		$this->bSieveAllowRaw = false;

		$this->sWhiteList = \trim($sWhiteList);
		$this->sAliasName = '';
	}

	public static function NewInstance(string $sName,
		string $sIncHost, int $iIncPort, int $iIncSecure, bool $bIncShortLogin,
		bool $bUseSieve, string $sSieveHost, int $iSievePort, int $iSieveSecure,
		string $sOutHost, int $iOutPort, int $iOutSecure, bool $bOutShortLogin, bool $bOutAuth, bool $bOutUsePhpMail,
		string $sWhiteList = '') : self
	{
		return new self($sName,
			$sIncHost, $iIncPort, $iIncSecure, $bIncShortLogin,
			$bUseSieve, $sSieveHost, $iSievePort, $iSieveSecure,
			$sOutHost, $iOutPort, $iOutSecure, $bOutShortLogin, $bOutAuth, $bOutUsePhpMail,
			$sWhiteList);
	}

	public static function NewInstanceFromDomainConfigArray(string $sName, array $aDomain) : ?self
	{
		$oDomain = null;

		if (0 < \strlen($sName) && \is_array($aDomain) && 0 < \strlen($aDomain['imap_host']) && 0 < \strlen($aDomain['imap_port']))
		{
			$sIncHost = (string) $aDomain['imap_host'];
			$iIncPort = (int) $aDomain['imap_port'];
			$iIncSecure = self::StrConnectionSecurityTypeToCons(
				!empty($aDomain['imap_secure']) ? $aDomain['imap_secure'] : '');

			$bUseSieve = !empty($aDomain['sieve_use']);
			$bSieveAllowRaw = !empty($aDomain['sieve_allow_raw']);

			$sSieveHost = empty($aDomain['sieve_host']) ? '' : (string) $aDomain['sieve_host'];
			$iSievePort = empty($aDomain['sieve_port']) ? 4190 : (int) $aDomain['sieve_port'];
			$iSieveSecure = self::StrConnectionSecurityTypeToCons(
				!empty($aDomain['sieve_secure']) ? $aDomain['sieve_secure'] : '');

			$sOutHost = empty($aDomain['smtp_host']) ? '' : (string) $aDomain['smtp_host'];
			$iOutPort = empty($aDomain['smtp_port']) ? 25 : (int) $aDomain['smtp_port'];
			$iOutSecure = self::StrConnectionSecurityTypeToCons(
				!empty($aDomain['smtp_secure']) ? $aDomain['smtp_secure'] : '');

			$bOutAuth = !empty($aDomain['smtp_auth']);
			$bOutUsePhpMail = !empty($aDomain['smtp_php_mail']);
			$sWhiteList = (string) ($aDomain['white_list'] ?? '');

			$bIncShortLogin = !empty($aDomain['imap_short_login']);
			$bOutShortLogin = !empty($aDomain['smtp_short_login']);

			$oDomain = self::NewInstance($sName,
				$sIncHost, $iIncPort, $iIncSecure, $bIncShortLogin,
				$bUseSieve, $sSieveHost, $iSievePort, $iSieveSecure,
				$sOutHost, $iOutPort, $iOutSecure, $bOutShortLogin, $bOutAuth, $bOutUsePhpMail,
				$sWhiteList);

			$oDomain->SetSieveAllowRaw($bSieveAllowRaw);
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
			'sieve_allow_raw = '.($this->bSieveAllowRaw ? 'On' : 'Off'),
			'sieve_host = "'.$this->encodeIniString($this->sSieveHost).'"',
			'sieve_port = '.$this->iSievePort,
			'sieve_secure = "'.self::ConstConnectionSecurityTypeToStr($this->iSieveSecure).'"',
			'smtp_host = "'.$this->encodeIniString($this->sOutHost).'"',
			'smtp_port = '.$this->iOutPort,
			'smtp_secure = "'.self::ConstConnectionSecurityTypeToStr($this->iOutSecure).'"',
			'smtp_short_login = '.($this->bOutShortLogin ? 'On' : 'Off'),
			'smtp_auth = '.($this->bOutAuth ? 'On' : 'Off'),
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

	public function UpdateInstance(
		string $sIncHost, int $iIncPort, int $iIncSecure, bool $bIncShortLogin,
		bool $bUseSieve, string $sSieveHost, int $iSievePort, int $iSieveSecure,
		string $sOutHost, int $iOutPort, int $iOutSecure, bool $bOutShortLogin, bool $bOutAuth, bool $bOutUsePhpMail,
		string $sWhiteList = '') : self
	{
		$this->sIncHost = \MailSo\Base\Utils::IdnToAscii($sIncHost);
		$this->iIncPort = $iIncPort;
		$this->iIncSecure = $iIncSecure;
		$this->bIncShortLogin = $bIncShortLogin;

		$this->bUseSieve = $bUseSieve;
		$this->sSieveHost = \MailSo\Base\Utils::IdnToAscii($sSieveHost);
		$this->iSievePort = $iSievePort;
		$this->iSieveSecure = $iSieveSecure;

		$this->sOutHost = \MailSo\Base\Utils::IdnToAscii($sOutHost);
		$this->iOutPort = $iOutPort;
		$this->iOutSecure = $iOutSecure;
		$this->bOutShortLogin = $bOutShortLogin;
		$this->bOutAuth = $bOutAuth;
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

	public function SieveAllowRaw() : bool
	{
		return $this->bSieveAllowRaw;
	}

	public function SetSieveAllowRaw(bool $bSieveAllowRaw)
	{
		$this->bSieveAllowRaw = $bSieveAllowRaw;
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
		if (0 < strlen($sW))
		{
			$sEmail = \MailSo\Base\Utils::IdnToUtf8($sEmail, true);
			$sLogin = \MailSo\Base\Utils::IdnToUtf8($sLogin, true);

			$sW = \preg_replace('/([^\s]+)@[^\s]*/', '$1', $sW);
			$sW = ' '.\trim(\preg_replace('/[\s;,\r\n\t]+/', ' ', $sW)).' ';

			$sUserPart = \MailSo\Base\Utils::GetAccountNameFromEmail(0 < \strlen($sLogin) ? $sLogin : $sEmail);
			return false !== \stripos($sW, ' '.$sUserPart.' ');
		}

		return true;
	}

	public function ToSimpleJSON(bool $bAjax = false) : array
	{
		return array(
			'Name' => $bAjax ? \MailSo\Base\Utils::IdnToUtf8($this->Name()) : $this->Name(),
			'IncHost' => $bAjax ? \MailSo\Base\Utils::IdnToUtf8($this->IncHost()) : $this->IncHost(),
			'IncPort' => $this->IncPort(),
			'IncSecure' => $this->IncSecure(),
			'IncShortLogin' => $this->IncShortLogin(),
			'UseSieve' => $this->UseSieve(),
			'SieveHost' => $bAjax ? \MailSo\Base\Utils::IdnToUtf8($this->SieveHost()) : $this->SieveHost(),
			'SievePort' => $this->SievePort(),
			'SieveSecure' => $this->SieveSecure(),
			'SieveAllowRaw' => $this->SieveAllowRaw(),
			'OutHost' => $bAjax ? \MailSo\Base\Utils::IdnToUtf8($this->OutHost()) : $this->OutHost(),
			'OutPort' => $this->OutPort(),
			'OutSecure' => $this->OutSecure(),
			'OutShortLogin' => $this->OutShortLogin(),
			'OutAuth' => $this->OutAuth(),
			'OutUsePhpMail' => $this->OutUsePhpMail(),
			'WhiteList' => $this->WhiteList(),
			'AliasName' => $this->AliasName()
		);
	}
}
