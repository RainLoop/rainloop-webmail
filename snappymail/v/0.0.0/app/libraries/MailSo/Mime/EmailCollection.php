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
class EmailCollection extends \MailSo\Base\Collection
{
	function __construct($mEmailAddresses = '')
	{
		if (\is_string($mEmailAddresses)) {
			parent::__construct();
			$this->parseEmailAddresses($mEmailAddresses);
		} else {
			parent::__construct($mEmailAddresses);
		}
	}

	public function append($oEmail, bool $bToTop = false) : void
	{
		assert($oEmail instanceof Email);
		parent::append($oEmail, $bToTop);
	}

	public function MergeWithOtherCollection(EmailCollection $oEmails) : self
	{
		foreach ($oEmails as $oEmail) {
			$this->append($oEmail);
		}

		return $this;
	}

	public function Unique() : self
	{
		$aReturn = array();

		foreach ($this as $oEmail) {
			$sEmail = $oEmail->GetEmail();
			if (!isset($aReturn[$sEmail])) {
				$aReturn[$sEmail] = $oEmail;
			}
		}

		return new static($aReturn);
	}

	public function ToString(bool $bConvertSpecialsName = false, bool $bIdn = false) : string
	{
		$aReturn = array();
		foreach ($this as $oEmail) {
			$aReturn[] = $oEmail->ToString($bConvertSpecialsName, $bIdn);
		}

		return \implode(', ', $aReturn);
	}

	private function parseEmailAddresses(string $sRawEmails) : void
	{
//		$sRawEmails = \MailSo\Base\Utils::Trim($sRawEmails);
		$sRawEmails = \trim($sRawEmails);

		$sWorkingRecipientsLen = \strlen($sRawEmails);
		if (!$sWorkingRecipientsLen) {
			return;
		}

		$iEmailStartPos = 0;
		$iEmailEndPos = 0;

		$bIsInQuotes = false;
		$sChQuote = '"';
		$bIsInAngleBrackets = false;
		$bIsInBrackets = false;

		$iCurrentPos = 0;

		while ($iCurrentPos < $sWorkingRecipientsLen) {
			switch ($sRawEmails[$iCurrentPos])
			{
				case '\'':
				case '"':
					if (!$bIsInQuotes) {
						$sChQuote = $sRawEmails[$iCurrentPos];
						$bIsInQuotes = true;
					} else if ($sChQuote == $sRawEmails[$iCurrentPos]) {
						$bIsInQuotes = false;
					}
					break;

				case '<':
					if (!$bIsInAngleBrackets) {
						$bIsInAngleBrackets = true;
						if ($bIsInQuotes) {
							$bIsInQuotes = false;
						}
					}
					break;

				case '>':
					if ($bIsInAngleBrackets) {
						$bIsInAngleBrackets = false;
					}
					break;

				case '(':
					if (!$bIsInBrackets) {
						$bIsInBrackets = true;
					}
					break;

				case ')':
					if ($bIsInBrackets) {
						$bIsInBrackets = false;
					}
					break;

				case ',':
				case ';':
					if (!$bIsInAngleBrackets && !$bIsInBrackets && !$bIsInQuotes) {
						$iEmailEndPos = $iCurrentPos;

						try
						{
							$this->append(
								Email::Parse(\substr($sRawEmails, $iEmailStartPos, $iEmailEndPos - $iEmailStartPos))
							);

							$iEmailStartPos = $iCurrentPos + 1;
						}
						catch (\InvalidArgumentException $oException)
						{
						}
					}
					break;
			}

			++$iCurrentPos;
		}

		if ($iEmailStartPos < $iCurrentPos) {
			try
			{
				$this->append(
					Email::Parse(\substr($sRawEmails, $iEmailStartPos, $iCurrentPos - $iEmailStartPos))
				);
			}
			catch (\InvalidArgumentException $oException) {}
		}
	}
}
