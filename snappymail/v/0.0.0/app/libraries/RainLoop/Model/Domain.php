<?php

namespace RainLoop\Model;

use MailSo\Net\Enumerations\ConnectionSecurityType;

//	\SnappyMail\IDN::toAscii(
//	\SnappyMail\IDN::toUtf8(

class Domain implements \JsonSerializable
{
	private string $Name;

	private \MailSo\Imap\Settings $IMAP;

	private \MailSo\Smtp\Settings $SMTP;

	private \MailSo\Sieve\Settings $Sieve;

	private string $whiteList = '';

	private string $aliasName = '';

	function __construct(string $sName)
	{
		$this->Name = $sName;

		$this->IMAP = new \MailSo\Imap\Settings;
		$this->SMTP = new \MailSo\Smtp\Settings;
		$this->Sieve = new \MailSo\Sieve\Settings;
	}

	/**
	 * Used by old ToIniString()
	 */
	public static function fromIniArray(string $sName, array $aDomain) : ?self
	{
		$oDomain = null;
		if (\strlen($sName) && \strlen($aDomain['imap_host'])) {
			$oDomain = new self($sName);

			$oDomain->IMAP->host = \SnappyMail\IDN::toUtf8($aDomain['imap_host']);
			$oDomain->IMAP->port = (int) $aDomain['imap_port'];
			$oDomain->IMAP->type = self::StrConnectionSecurityTypeToCons($aDomain['imap_secure'] ?? '');
			$oDomain->IMAP->shortLogin = !empty($aDomain['imap_short_login']);

			$oDomain->Sieve->enabled = !empty($aDomain['sieve_use']);
			$oDomain->Sieve->host = \SnappyMail\IDN::toUtf8($aDomain['sieve_host']);
			$oDomain->Sieve->port = (int) ($aDomain['sieve_port'] ?? 4190);;
			$oDomain->Sieve->type = self::StrConnectionSecurityTypeToCons($aDomain['sieve_secure'] ?? '');

			$oDomain->SMTP->host = \SnappyMail\IDN::toUtf8($aDomain['smtp_host']);
			$oDomain->SMTP->port = (int) ($aDomain['smtp_port'] ?? 25);
			$oDomain->SMTP->type = self::StrConnectionSecurityTypeToCons($aDomain['smtp_secure'] ?? '');
			$oDomain->SMTP->shortLogin = !empty($aDomain['smtp_short_login']);
			$oDomain->SMTP->useAuth = !empty($aDomain['smtp_auth']);
			$oDomain->SMTP->setSender = !empty($aDomain['smtp_set_sender']);
			$oDomain->SMTP->usePhpMail = !empty($aDomain['smtp_php_mail']);

			$oDomain->whiteList = \trim($aDomain['white_list'] ?? '');

			$oDomain->Normalize();
		}
		return $oDomain;
	}

	public function Normalize()
	{
		$this->IMAP->host = \trim($this->IMAP->host);
		$this->Sieve->host = \trim($this->Sieve->host);
		$this->SMTP->host = \trim($this->SMTP->host);
		$this->whiteList = \trim($this->whiteList);
	}

	/**
	 * Use by old fromIniArray()
	 */
	public static function StrConnectionSecurityTypeToCons(string $sType) : int
	{
		$iSecurityType = ConnectionSecurityType::NONE;
		switch (\strtoupper($sType))
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
	 * deprecated
	 */
	public function SetConfig(
		string $sIncHost, int $iIncPort, int $iIncSecure, bool $bIncShortLogin,
		bool $bUseSieve, string $sSieveHost, int $iSievePort, int $iSieveSecure,
		string $sOutHost, int $iOutPort, int $iOutSecure, bool $bOutShortLogin,
		bool $bOutAuth, bool $bOutSetSender, bool $bOutUsePhpMail,
		string $sWhiteList = '') : self
	{
		$this->IMAP->host = $sIncHost;
		$this->IMAP->port = $iIncPort;
		$this->IMAP->type = $iIncSecure;
		$this->IMAP->shortLogin = $bIncShortLogin;

		$this->SMTP->host = $sOutHost;
		$this->SMTP->port = $iOutPort;
		$this->SMTP->type = $iOutSecure;
		$this->SMTP->shortLogin = $bOutShortLogin;
		$this->SMTP->useAuth = $bOutAuth;
		$this->SMTP->setSender = $bOutSetSender;
		$this->SMTP->usePhpMail = $bOutUsePhpMail;

		$this->Sieve->enabled = $bUseSieve;
		$this->Sieve->host = $sSieveHost;
		$this->Sieve->port = $iSievePort;
		$this->Sieve->type = $iSieveSecure;

		$this->whiteList = \trim($sWhiteList);

		$this->Normalize();

		return $this;
	}

	public function Name() : string
	{
		return $this->Name;
	}

	public function IncHost() : string
	{
		return $this->IMAP->host;
	}

	public function IncPort() : int
	{
		return $this->IMAP->port;
	}

	public function IncShortLogin() : bool
	{
		return $this->IMAP->shortLogin;
	}

	public function UseSieve() : bool
	{
		return $this->Sieve->enabled;
	}

	public function OutHost() : string
	{
		return $this->SMTP->host;
	}

	public function OutPort() : int
	{
		return $this->SMTP->port;
	}

	public function OutShortLogin() : bool
	{
		return $this->SMTP->shortLogin;
	}

	public function OutSetSender() : bool
	{
		return $this->SMTP->setSender;
	}

	public function OutUsePhpMail() : bool
	{
		return $this->SMTP->usePhpMail;
	}

	public function SetAliasName(string $sAliasName) : void
	{
		$this->aliasName = $sAliasName;
	}

	public function ValidateWhiteList(string $sEmail, string $sLogin = '') : bool
	{
		$sW = \trim($this->whiteList);
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

	public function ImapSettings() : \MailSo\Imap\Settings
	{
		return $this->IMAP;
	}

	public function SmtpSettings() : \MailSo\Smtp\Settings
	{
		return $this->SMTP;
	}

	public function SieveSettings() : \MailSo\Sieve\Settings
	{
		return $this->Sieve;
	}

	/**
	 * See jsonSerialize() for valid values
	 */
	public static function fromArray(string $sName, array $aDomain) : ?self
	{
		if (!\strlen($sName)) {
			return null;
		}
		$oDomain = new self($sName);
		if (!empty($aDomain['IMAP'])) {
			$oDomain->IMAP = \MailSo\Imap\Settings::fromArray($aDomain['IMAP']);
			$oDomain->SMTP = \MailSo\Smtp\Settings::fromArray($aDomain['SMTP']);
			$oDomain->Sieve = \MailSo\Sieve\Settings::fromArray($aDomain['Sieve']);
			$oDomain->whiteList = (string) $aDomain['whiteList'];
		} else if (\strlen($aDomain['imapHost'])) {
			$oDomain->IMAP->host = $aDomain['imapHost'];
			$oDomain->IMAP->port = (int) $aDomain['imapPort'];
			$oDomain->IMAP->type = (int) $aDomain['imapSecure'];
			$oDomain->IMAP->shortLogin = !empty($aDomain['imapShortLogin']);

			$oDomain->Sieve->enabled = !empty($aDomain['useSieve']);
			$oDomain->Sieve->host = $aDomain['sieveHost'];
			$oDomain->Sieve->port = (int) $aDomain['sievePort'];
			$oDomain->Sieve->type = (int) $aDomain['sieveSecure'];

			$oDomain->SMTP->host = $aDomain['smtpHost'];
			$oDomain->SMTP->port = (int) $aDomain['smtpPort'];
			$oDomain->SMTP->type = (int) $aDomain['smtpSecure'];
			$oDomain->SMTP->shortLogin = !empty($aDomain['smtpShortLogin']);
			$oDomain->SMTP->useAuth = !empty($aDomain['smtpAuth']);
			$oDomain->SMTP->setSender = !empty($aDomain['smtpSetSender']);
			$oDomain->SMTP->usePhpMail = !empty($aDomain['smtpPhpMail']);

			$oDomain->whiteList = (string) $aDomain['whiteList'];
		} else {
			return null;
		}
		$oDomain->Normalize();
		return $oDomain;
	}

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
		$aResult = array(
//			'@Object' => 'Object/Domain',
			'name' => $this->Name,
			'IMAP' => $this->IMAP,
			'SMTP' => $this->SMTP,
			'Sieve' => $this->Sieve,
			'whiteList' => $this->whiteList
		);
		if ($this->aliasName) {
			$aResult['aliasName'] = $this->aliasName;
		}
		return $aResult;
	}
}
