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

use MailSo\Base\Utils;

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

		$this->sEmail = \SnappyMail\IDN::emailToAscii(Utils::Trim($sEmail));

		$this->sDisplayName = Utils::Trim($sDisplayName);
	}

	/**
	 * @throws \ValueError
	 */
	public static function Parse(string $sEmailAddress) : self
	{
		$sEmailAddress = Utils::Trim(Utils::DecodeHeaderValue($sEmailAddress));
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
						$sName = \substr($sEmailAddress, $iStartIndex + 1, $iCurrentIndex - $iStartIndex - 1);
						$sEmailAddress = \substr_replace($sEmailAddress, '', $iStartIndex, $iCurrentIndex - $iStartIndex + 1);
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
						$sEmail = \substr($sEmailAddress, $iStartIndex + 1, $iCurrentIndex - $iStartIndex - 1);
						$sEmailAddress = \substr_replace($sEmailAddress, '', $iStartIndex, $iCurrentIndex - $iStartIndex + 1);
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
						$sComment = \substr($sEmailAddress, $iStartIndex + 1, $iCurrentIndex - $iStartIndex - 1);
						$sEmailAddress = \substr_replace($sEmailAddress, '', $iStartIndex, $iCurrentIndex - $iStartIndex + 1);
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

	public function GetEmail(bool $bUtf8 = false) : string
	{
		return $bUtf8 ? \SnappyMail\IDN::emailToUtf8($this->sEmail) : $this->sEmail;
	}

	public function GetDisplayName() : string
	{
		return $this->sDisplayName;
	}

	public function getLocalPart() : string
	{
		return Utils::getEmailAddressLocalPart($this->sEmail);
	}

	public function GetDomain(bool $bIdn = false) : string
	{
		return Utils::getEmailAddressDomain($this->GetEmail($bIdn));
	}

	public function SetDkimStatus(string $sDkimStatus)
	{
		$this->sDkimStatus = Enumerations\DkimStatus::normalizeValue($sDkimStatus);
	}

	public function ToString(bool $bConvertSpecialsName = false, bool $bUtf8 = false) : string
	{
		$sReturn = '';
		if (\strlen($this->sEmail)) {
			$sReturn = $this->GetEmail($bUtf8);
			$sDisplayName = $this->sDisplayName;
			if (\strlen($sDisplayName)) {
				$sDisplayName = \str_replace('"', '\"', $sDisplayName);
				if ($bConvertSpecialsName) {
					$sDisplayName = Utils::EncodeHeaderValue($sDisplayName);
				}
				$sReturn = '"'.$sDisplayName.'" <'.$sReturn.'>';
			}
		}
		return $sReturn;
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
			'name' => Utils::Utf8Clear($this->sDisplayName),
			'email' => Utils::Utf8Clear($this->GetEmail(true)),
			'dkimStatus' => $this->sDkimStatus
		);
	}
}
