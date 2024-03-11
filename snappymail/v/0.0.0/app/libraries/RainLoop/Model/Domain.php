<?php
/**
 * Domain name is handled in lowercase punycode.
 * Because internationalized domain names can have uppercase or titlecase characters.
 */

namespace RainLoop\Model;

use MailSo\Net\Enumerations\ConnectionSecurityType;

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
		$this->Name = \strtolower(\idn_to_ascii($sName));
		$this->IMAP = new \MailSo\Imap\Settings;
		$this->SMTP = new \MailSo\Smtp\Settings;
		$this->Sieve = new \MailSo\Sieve\Settings;
	}

	private function Normalize()
	{
		$this->IMAP->host = \trim($this->IMAP->host);
		$this->Sieve->host = \trim($this->Sieve->host);
		$this->SMTP->host = \trim($this->SMTP->host);
		$this->whiteList = \trim($this->whiteList);
	}

	public function Name() : string
	{
		return $this->Name;
	}

	/**
	 * @deprecated
	 */
	public function IncHost() : string
	{
		\trigger_error('Deprecated function called.', \E_USER_DEPRECATED);
		return $this->IMAP->host;
	}

	/**
	 * @deprecated
	 */
	public function IncPort() : int
	{
		\trigger_error('Deprecated function called.', \E_USER_DEPRECATED);
		return $this->IMAP->port;
	}

	/**
	 * @deprecated
	 */
	public function IncShortLogin() : bool
	{
		\trigger_error('Deprecated function called.', \E_USER_DEPRECATED);
		return $this->IMAP->shortLogin;
	}

	/**
	 * @deprecated
	 */
	public function UseSieve() : bool
	{
		\trigger_error('Deprecated function called.', \E_USER_DEPRECATED);
		return $this->Sieve->enabled;
	}

	/**
	 * @deprecated
	 */
	public function OutHost() : string
	{
		\trigger_error('Deprecated function called.', \E_USER_DEPRECATED);
		return $this->SMTP->host;
	}

	/**
	 * @deprecated
	 */
	public function OutPort() : int
	{
		\trigger_error('Deprecated function called.', \E_USER_DEPRECATED);
		return $this->SMTP->port;
	}

	public function SetAliasName(string $sAliasName) : void
	{
		$this->aliasName = \strtolower(\idn_to_ascii($sAliasName));
	}

	public function ValidateWhiteList(string $sEmail, string $sLogin) : bool
	{
		$sW = \trim($this->whiteList);
		if ($sW) {
			$sEmail = \mb_strtolower($sEmail);
			$sLogin = \mb_strtolower($sLogin);
			$sUserPart = \MailSo\Base\Utils::GetAccountNameFromEmail($sLogin ?: $sEmail);
			$sItem = \strtok($sW, " ;,\n");
			while (false !== $sItem) {
				$sItem = \mb_strtolower(\idn_to_ascii(\trim($sItem)));
				if ($sItem && (
					$sLogin === $sItem || $sEmail === $sItem
					|| $sUserPart === $sItem || \str_starts_with($sItem, "{$sUserPart}@")
				)) {
					return true;
				}
				$sItem = \strtok(" ;,\n");
			}
			return false;
		}
		return true;
	}

	public function ImapSettings() : \MailSo\Imap\Settings
	{
		return $this->IMAP;
	}

	public function SieveSettings() : \MailSo\Sieve\Settings
	{
		return $this->Sieve;
	}

	public function SmtpSettings() : \MailSo\Smtp\Settings
	{
		return $this->SMTP;
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
			// Old way
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
			$oDomain->SMTP->authPlainLine = !empty($aDomain['smtpAuthPlainLine']);
			$oDomain->SMTP->usePhpMail = !empty($aDomain['smtpPhpMail']);

			$oDomain->whiteList = (string) $aDomain['whiteList'];
		} else {
			return null;
		}
		$oDomain->Normalize();
		return $oDomain;
	}

	/**
	 * Used by old RainLoop ToIniString()
	 */
	public static function fromIniArray(string $sName, array $aDomain) : ?self
	{
		$oDomain = null;
		if (\strlen($sName) && \strlen($aDomain['imap_host'])) {
			$oDomain = new self($sName);

			$oDomain->IMAP->host = \idn_to_utf8($aDomain['imap_host']);
			$oDomain->IMAP->port = (int) $aDomain['imap_port'];
			$oDomain->IMAP->type = self::StrConnectionSecurityTypeToCons($aDomain['imap_secure'] ?? '');
			$oDomain->IMAP->shortLogin = !empty($aDomain['imap_short_login']);

			$oDomain->Sieve->enabled = !empty($aDomain['sieve_use']);
			$oDomain->Sieve->host = \idn_to_utf8($aDomain['sieve_host']);
			$oDomain->Sieve->port = (int) ($aDomain['sieve_port'] ?? 4190);;
			$oDomain->Sieve->type = self::StrConnectionSecurityTypeToCons($aDomain['sieve_secure'] ?? '');

			$oDomain->SMTP->host = \idn_to_utf8($aDomain['smtp_host']);
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

	/**
	 * Use by old RainLoop fromIniArray()
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

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
		$aResult = array(
//			'@Object' => 'Object/Domain',
			'name' => \idn_to_utf8($this->Name),
			'IMAP' => $this->IMAP,
			'SMTP' => $this->SMTP,
			'Sieve' => $this->Sieve,
			'whiteList' => $this->whiteList
		);
		if ($this->aliasName) {
			$aResult['aliasName'] = \idn_to_utf8($this->aliasName);
		}
		return $aResult;
	}
}
