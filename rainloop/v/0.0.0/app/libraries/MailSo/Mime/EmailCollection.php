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
	protected function __construct(string $sEmailAddresses = '')
	{
		parent::__construct();

		$sEmailAddresses = \MailSo\Base\Utils::Trim($sEmailAddresses);
		if (0 < \strlen($sEmailAddresses))
		{
			$this->parseEmailAddresses($sEmailAddresses);
		}
	}

	public static function NewInstance(string $sEmailAddresses = '') : self
	{
		return new self($sEmailAddresses);
	}

	public static function Parse(string $sEmailAddresses) : self
	{
		return self::NewInstance($sEmailAddresses);
	}

	public function ToArray() : array
	{
		$aReturn = $aEmails = array();
		$aEmails =& $this->GetAsArray();
		foreach ($aEmails as /* @var $oEmail \MailSo\Mime\Email */ $oEmail)
		{
			$aReturn[] = $oEmail->ToArray();
		}

		return $aReturn;
	}

	public function MergeWithOtherCollection(EmailCollection $oEmails) : self
	{
		$aEmails =& $oEmails->GetAsArray();
		foreach ($aEmails as /* @var $oEmail \MailSo\Mime\Email */ $oEmail)
		{
			$this->Add($oEmail);
		}

		return $this;
	}

	public function Unique() : self
	{
		$aCache = array();
		$aReturn = array();

		$aEmails =& $this->GetAsArray();
		foreach ($aEmails as /* @var $oEmail \MailSo\Mime\Email */ $oEmail)
		{
			$sEmail = $oEmail->GetEmail();
			if (!isset($aCache[$sEmail]))
			{
				$aCache[$sEmail] = true;
				$aReturn[] = $oEmail;
			}
		}

		$this->SetAsArray($aReturn);

		return $this;
	}

	public function ToString(bool $bConvertSpecialsName = false, bool $bIdn = false) : string
	{
		$aReturn = $aEmails = array();
		$aEmails =& $this->GetAsArray();
		foreach ($aEmails as /* @var $oEmail \MailSo\Mime\Email */ $oEmail)
		{
			$aReturn[] = $oEmail->ToString($bConvertSpecialsName, $bIdn);
		}

		return \implode(', ', $aReturn);
	}

	private function parseEmailAddresses(string $sRawEmails) : self
	{
		$this->Clear();

		$sWorkingRecipients = \trim($sRawEmails);

		if (0 === \strlen($sWorkingRecipients))
		{
			return $this;
		}

		$iEmailStartPos = 0;
		$iEmailEndPos = 0;

		$bIsInQuotes = false;
		$sChQuote = '"';
		$bIsInAngleBrackets = false;
		$bIsInBrackets = false;

		$iCurrentPos = 0;

		$sWorkingRecipientsLen = \strlen($sWorkingRecipients);

		while ($iCurrentPos < $sWorkingRecipientsLen)
		{
			switch ($sWorkingRecipients[$iCurrentPos])
			{
				case '\'':
				case '"':
					if (!$bIsInQuotes)
					{
						$sChQuote = $sWorkingRecipients[$iCurrentPos];
						$bIsInQuotes = true;
					}
					else if ($sChQuote == $sWorkingRecipients[$iCurrentPos])
					{
						$bIsInQuotes = false;
					}
					break;

				case '<':
					if (!$bIsInAngleBrackets)
					{
						$bIsInAngleBrackets = true;
						if ($bIsInQuotes)
						{
							$bIsInQuotes = false;
						}
					}
					break;

				case '>':
					if ($bIsInAngleBrackets)
					{
						$bIsInAngleBrackets = false;
					}
					break;

				case '(':
					if (!$bIsInBrackets)
					{
						$bIsInBrackets = true;
					}
					break;

				case ')':
					if ($bIsInBrackets)
					{
						$bIsInBrackets = false;
					}
					break;

				case ',':
				case ';':
					if (!$bIsInAngleBrackets && !$bIsInBrackets && !$bIsInQuotes)
					{
						$iEmailEndPos = $iCurrentPos;

						try
						{
							$this->Add(
								\MailSo\Mime\Email::Parse(\substr($sWorkingRecipients, $iEmailStartPos, $iEmailEndPos - $iEmailStartPos))
							);

							$iEmailStartPos = $iCurrentPos + 1;
						}
						catch (\MailSo\Base\Exceptions\InvalidArgumentException $oException)
						{
						}
					}
					break;
			}

			$iCurrentPos++;
		}

		if ($iEmailStartPos < $iCurrentPos)
		{
			try
			{
				$this->Add(
					\MailSo\Mime\Email::Parse(\substr($sWorkingRecipients, $iEmailStartPos, $iCurrentPos - $iEmailStartPos))
				);
			}
			catch (\MailSo\Base\Exceptions\InvalidArgumentException $oException) {}
		}

		return $this;
	}
}
