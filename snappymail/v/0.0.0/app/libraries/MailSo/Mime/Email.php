<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Mime;

/**
 * @category MailSo
 * @package Mime
 */
class Email implements \JsonSerializable
{
	/**
	 * display-name https://datatracker.ietf.org/doc/html/rfc2822#section-3.4
	 */
	private string $sDisplayName;

	/**
	 * addr-spec https://datatracker.ietf.org/doc/html/rfc2822#section-3.4.1
	 */
	private string $sEmail;

	private string $sDkimStatus = Enumerations\DkimStatus::NONE;

	/**
	 * @throws \ValueError
	 */
	function __construct(string $sEmail, string $sDisplayName = '')
	{
		if (!\strlen(\trim($sEmail)) && !\strlen(\trim($sDisplayName))) {
			throw new \ValueError;
		}

		$this->sEmail = \SnappyMail\IDN::emailToAscii(\MailSo\Base\Utils::Trim($sEmail));

		$this->sDisplayName = \MailSo\Base\Utils::Trim($sDisplayName);
	}

	/**
	 * @throws \ValueError
	 */
	public static function Parse(string $sEmailAddress) : self
	{
		$sEmailAddress = \MailSo\Base\Utils::DecodeHeaderValue($sEmailAddress);
		$sEmailAddress = \MailSo\Base\Utils::Trim($sEmailAddress);
		if (!\strlen(\trim($sEmailAddress))) {
			throw new \ValueError;
		}

		$sName = '';
		$sEmail = '';
		$sComment = '';

		$bInName = false;
		$bInAddress = false;
		$bInComment = false;

		$iStartIndex = 0;
		$iEndIndex = 0;
		$iCurrentIndex = 0;

		while ($iCurrentIndex < \strlen($sEmailAddress)) {
			switch ($sEmailAddress[$iCurrentIndex])
			{
//				case '\'':
				case '"':
//					$sQuoteChar = $sEmailAddress[$iCurrentIndex];
					if (!$bInName && !$bInAddress && !$bInComment) {
						$bInName = true;
						$iStartIndex = $iCurrentIndex;
					} else if (!$bInAddress && !$bInComment) {
						$iEndIndex = $iCurrentIndex;
						$sName = \substr($sEmailAddress, $iStartIndex + 1, $iEndIndex - $iStartIndex - 1);
						$sEmailAddress = \substr_replace($sEmailAddress, '', $iStartIndex, $iEndIndex - $iStartIndex + 1);
						$iEndIndex = 0;
						$iCurrentIndex = 0;
						$iStartIndex = 0;
						$bInName = false;
					}
					break;
				case '<':
					if (!$bInName && !$bInAddress && !$bInComment) {
						if ($iCurrentIndex > 0 && !\strlen($sName)) {
							$sName = \substr($sEmailAddress, 0, $iCurrentIndex);
						}

						$bInAddress = true;
						$iStartIndex = $iCurrentIndex;
					}
					break;
				case '>':
					if ($bInAddress) {
						$iEndIndex = $iCurrentIndex;
						$sEmail = \substr($sEmailAddress, $iStartIndex + 1, $iEndIndex - $iStartIndex - 1);
						$sEmailAddress = \substr_replace($sEmailAddress, '', $iStartIndex, $iEndIndex - $iStartIndex + 1);
						$iEndIndex = 0;
						$iCurrentIndex = 0;
						$iStartIndex = 0;
						$bInAddress = false;
					}
					break;
				case '(':
					if (!$bInName && !$bInAddress && !$bInComment) {
						$bInComment = true;
						$iStartIndex = $iCurrentIndex;
					}
					break;
				case ')':
					if ($bInComment) {
						$iEndIndex = $iCurrentIndex;
						$sComment = \substr($sEmailAddress, $iStartIndex + 1, $iEndIndex - $iStartIndex - 1);
						$sEmailAddress = \substr_replace($sEmailAddress, '', $iStartIndex, $iEndIndex - $iStartIndex + 1);
						$iEndIndex = 0;
						$iCurrentIndex = 0;
						$iStartIndex = 0;
						$bInComment = false;
					}
					break;
				case '\\':
					++$iCurrentIndex;
					break;
			}

			++$iCurrentIndex;
		}

		if (!\strlen($sEmail)) {
			$aRegs = array('');
			if (\preg_match('/[^@\s]+@\S+/i', $sEmailAddress, $aRegs) && isset($aRegs[0])) {
				$sEmail = $aRegs[0];
			} else {
				$sName = $sEmailAddress;
			}
		}

		if (\strlen($sEmail) && !\strlen($sName) && !\strlen($sComment)) {
			$sName = \str_replace($sEmail, '', $sEmailAddress);
		}

		$sEmail = \trim(\trim($sEmail), '<>');
		$sEmail = \rtrim(\trim($sEmail), '.');
		$sEmail = \trim($sEmail);

		$sName = \trim(\trim($sName), '"');
		$sName = \trim($sName, '\'');
		$sComment = \trim(\trim($sComment), '()');

		// Remove backslash
		$sName = \preg_replace('/\\\\(.)/s', '$1', $sName);
		$sComment = \preg_replace('/\\\\(.)/s', '$1', $sComment);

		return new self($sEmail, $sName);
	}

	public function GetEmail(bool $bIdn = false) : string
	{
		return $bIdn ? \SnappyMail\IDN::emailToUtf8($this->sEmail) : $this->sEmail;
	}

	public function GetDisplayName() : string
	{
		return $this->sDisplayName;
	}

	public function getLocalPart() : string
	{
		return \MailSo\Base\Utils::getEmailAddressLocalPart($this->sEmail);
	}

	public function GetDomain(bool $bIdn = false) : string
	{
		return \MailSo\Base\Utils::getEmailAddressDomain($this->GetEmail($bIdn));
	}

	public function SetDkimStatus(string $sDkimStatus)
	{
		$this->sDkimStatus = Enumerations\DkimStatus::normalizeValue($sDkimStatus);
	}

	public function ToString(bool $bConvertSpecialsName = false, bool $bIdn = false) : string
	{
		$sReturn = '';

		$sDisplayName = \str_replace('"', '\"', $this->sDisplayName);
		if ($bConvertSpecialsName) {
			$sDisplayName = \strlen($sDisplayName) ? \MailSo\Base\Utils::EncodeHeaderValue($sDisplayName) : '';
		}

		$sDisplayName = \strlen($sDisplayName) ? '"'.$sDisplayName.'"' : '';
		if (\strlen($this->sEmail)) {
			$sReturn = $this->GetEmail($bIdn);
			if (\strlen($sDisplayName)) {
				$sReturn = $sDisplayName.' <'.$sReturn.'>';
			}
		}

		return \trim($sReturn);
	}

	public function __toString() : string
	{
		return $this->ToString();
	}

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
		return array(
			'@Object' => 'Object/Email',
			'name' => \MailSo\Base\Utils::Utf8Clear($this->GetDisplayName()),
			'email' => \MailSo\Base\Utils::Utf8Clear($this->GetEmail(true)),
			'dkimStatus' => $this->sDkimStatus
		);
	}
}
