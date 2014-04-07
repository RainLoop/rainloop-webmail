<?php

namespace RainLoop;

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
	 * @var string
	 */
	private $sWhiteList;

	/**
	 * @var bool
	 */
	private $bDisabled;

	/**
	 * @param string $sName
	 * @param string $sIncHost
	 * @param int $iIncPort
	 * @param int $iIncSecure
	 * @param bool $bIncShortLogin
	 * @param string $sOutHost
	 * @param int $iOutPort
	 * @param int $iOutSecure
	 * @param bool $bOutShortLogin
	 * @param bool $bOutAuth
	 * @param string $sWhiteList = ''
	 */
	private function __construct($sName, $sIncHost, $iIncPort, $iIncSecure, $bIncShortLogin,
		$sOutHost, $iOutPort, $iOutSecure, $bOutShortLogin, $bOutAuth, $sWhiteList = '')
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
		$this->sWhiteList = \trim($sWhiteList);
		$this->bDisabled = false;
	}

	/**
	 * @param string $sName
	 * @param string $sIncHost
	 * @param int $iIncPort
	 * @param int $iIncSecure
	 * @param bool $bIncShortLogin
	 * @param string $sOutHost
	 * @param int $iOutPort
	 * @param int $iOutSecure
	 * @param bool $bOutShortLogin
	 * @param bool $bOutAuth
	 * @param string $sWhiteList = ''
	 *
	 * @return \RainLoop\Domain
	 */
	public static function NewInstance($sName,
		$sIncHost, $iIncPort, $iIncSecure, $bIncShortLogin,
		$sOutHost, $iOutPort, $iOutSecure, $bOutShortLogin, $bOutAuth,
		$sWhiteList = '')
	{
		return new self($sName,
			$sIncHost, $iIncPort, $iIncSecure, $bIncShortLogin,
			$sOutHost, $iOutPort, $iOutSecure, $bOutShortLogin, $bOutAuth,
			$sWhiteList);
	}

	/**
	 * @param array $aDomain
	 *
	 * @return \RainLoop\Domain|null
	 */
	public static function NewInstanceFromDomainConfigArray($sName, $aDomain)
	{
		$oDomain = null;

		if (0 < \strlen($sName) && \is_array($aDomain) && 0 < \strlen($aDomain['imap_host']) && 0 < \strlen($aDomain['imap_port']) &&
			0 < \strlen($aDomain['smtp_host']) && 0 < \strlen($aDomain['smtp_port']))
		{
			$sIncHost = (string) $aDomain['imap_host'];
			$iIncPort = (int) $aDomain['imap_port'];
			$iIncSecure = self::StrConnectionSecurityTypeToCons(
				!empty($aDomain['imap_secure']) ? $aDomain['imap_secure'] : '');

			$sOutHost = (string) $aDomain['smtp_host'];
			$iOutPort = (int) $aDomain['smtp_port'];
			$iOutSecure = self::StrConnectionSecurityTypeToCons(
				!empty($aDomain['smtp_secure']) ? $aDomain['smtp_secure'] : '');

			$bOutAuth = isset($aDomain['smtp_auth']) ? (bool) $aDomain['smtp_auth'] : true;
			$sWhiteList = (string) (isset($aDomain['white_list']) ? $aDomain['white_list'] : '');

			$bIncShortLogin = isset($aDomain['imap_short_login']) ? (bool) $aDomain['imap_short_login'] : false;
			$bOutShortLogin = isset($aDomain['smtp_short_login']) ? (bool) $aDomain['smtp_short_login'] : false;

			$oDomain = self::NewInstance($sName,
				$sIncHost, $iIncPort, $iIncSecure, $bIncShortLogin,
				$sOutHost, $iOutPort, $iOutSecure, $bOutShortLogin, $bOutAuth,
				$sWhiteList);
		}

		return $oDomain;
	}

	/**
	 * @param string $sStr
	 *
	 * @return string
	 */
	private function encodeIniString($sStr)
	{
		return str_replace('"', '\\"', $sStr);
	}

	/**
	 * @param bool0 $bDisabled
	 */
	public function SetDisabled($bDisabled)
	{
		$this->bDisabled = (bool) $bDisabled;
	}

	public function Normalize()
	{
		$this->sIncHost = \trim($this->sIncHost);
		$this->sOutHost = \trim($this->sOutHost);
		$this->sWhiteList = \trim($this->sWhiteList);
		
		if ($this->iIncPort <= 0)
		{
			$this->iIncPort = 143;
		}

		if ($this->iOutPort <= 0)
		{
			$this->iOutPort = 25;
		}
	}
	
	/**
	 * @return string
	 */
	public function ToIniString()
	{
		$this->Normalize();
		return implode("\n", array(
			'imap_host = "'.$this->encodeIniString($this->sIncHost).'"',
			'imap_port = '.$this->iIncPort,
			'imap_secure = "'.self::ConstConnectionSecurityTypeToStr($this->iIncSecure).'"',
			'imap_short_login = '.($this->bIncShortLogin ? 'On' : 'Off'),
			'smtp_host = "'.$this->encodeIniString($this->sOutHost).'"',
			'smtp_port = '.$this->iOutPort,
			'smtp_secure = "'.self::ConstConnectionSecurityTypeToStr($this->iOutSecure).'"',
			'smtp_short_login = '.($this->bOutShortLogin ? 'On' : 'Off'),
			'smtp_auth = '.($this->bOutAuth ? 'On' : 'Off'),
			'white_list = "'.$this->encodeIniString($this->sWhiteList).'"'
		));
	}

	/**
	 * @param string $sType
	 *
	 * @return int
	 */
	public static function StrConnectionSecurityTypeToCons($sType)
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

	/**
	 * @param int $iSecurityType
	 *
	 * @return string
	 */
	public static function ConstConnectionSecurityTypeToStr($iSecurityType)
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

	/**
	 * @param string $sIncHost
	 * @param int $iIncPort
	 * @param int $iIncSecure
	 * @param bool $bIncShortLogin
	 * @param string $sOutHost
	 * @param int $iOutPort
	 * @param int $iOutSecure
	 * @param bool $bOutShortLogin
	 * @param bool $bOutAuth
	 * @param string $sWhiteList = ''
	 *
	 * @return \RainLoop\Domain
	 */
	public function UpdateInstance(
		$sIncHost, $iIncPort, $iIncSecure, $bIncShortLogin,
		$sOutHost, $iOutPort, $iOutSecure, $bOutShortLogin, $bOutAuth,
		$sWhiteList = '')
	{
		$this->sIncHost = $sIncHost;
		$this->iIncPort = $iIncPort;
		$this->iIncSecure = $iIncSecure;
		$this->bIncShortLogin = $bIncShortLogin;
		$this->sOutHost = $sOutHost;
		$this->iOutPort = $iOutPort;
		$this->iOutSecure = $iOutSecure;
		$this->bOutShortLogin = $bOutShortLogin;
		$this->bOutAuth = $bOutAuth;
		$this->sWhiteList = \trim($sWhiteList);

		return $this;
	}

	/**
	 * @return string
	 */
	public function Name()
	{
		return $this->sName;
	}

	/**
	 * @return string
	 */
	public function IncHost()
	{
		return $this->sIncHost;
	}

	/**
	 * @return int
	 */
	public function IncPort()
	{
		return $this->iIncPort;
	}

	/**
	 * @return int
	 */
	public function IncSecure()
	{
		return $this->iIncSecure;
	}

	/**
	 * @return bool
	 */
	public function IncShortLogin()
	{
		return $this->bIncShortLogin;
	}

	/**
	 * @return string
	 */
	public function OutHost()
	{
		return $this->sOutHost;
	}

	/**
	 * @return int
	 */
	public function OutPort()
	{
		return $this->iOutPort;
	}

	/**
	 * @return int
	 */
	public function OutSecure()
	{
		return $this->iOutSecure;
	}

	/**
	 * @return bool
	 */
	public function OutShortLogin()
	{
		return $this->bOutShortLogin;
	}

	/**
	 * @return bool
	 */
	public function OutAuth()
	{
		return $this->bOutAuth;
	}

	/**
	 * @return string
	 */
	public function WhiteList()
	{
		return $this->sWhiteList;
	}

	/**
	 * @return bool
	 */
	public function Disabled()
	{
		return $this->bDisabled;
	}

	/**
	 * @param string $sEmail
	 * @param string $sLogin = ''
	 *
	 * @return bool
	 */
	public function ValidateWhiteList($sEmail, $sLogin = '')
	{
		$sW = \trim($this->sWhiteList);
		if (0 < strlen($sW))
		{
			$sW = \preg_replace('/([^\s]+)@[^\s]*/', '$1', $sW);
			$sW = ' '.\strtolower(\trim(\preg_replace('/[\s;,\r\n\t]+/', ' ', $sW))).' ';

			$sUserPart = \strtolower(\MailSo\Base\Utils::GetAccountNameFromEmail(0 < \strlen($sLogin) ? $sLogin : $sEmail));
			return false !== \strpos($sW, ' '.$sUserPart.' ');
		}

		return true;
	}

	/**
	 * @return array
	 */
	public function ToSimpleJSON()
	{
		return array(
			'Name' => $this->Name(),
			'IncHost' => $this->IncHost(),
			'IncPort' => $this->IncPort(),
			'IncSecure' => $this->IncSecure(),
			'IncShortLogin' => $this->IncShortLogin(),
			'OutHost' => $this->OutHost(),
			'OutPort' => $this->OutPort(),
			'OutSecure' => $this->OutSecure(),
			'OutShortLogin' => $this->OutShortLogin(),
			'OutAuth' => $this->OutAuth(),
			'WhiteList' => $this->WhiteList()
		);
	}
}
