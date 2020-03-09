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
 * @deprecated
 * @category MailSo
 * @package Mime
 */
class EmailDep
{
	/**
	 * @var string
	 */
	private $sDisplayName;

	/**
	 * @var string
	 */
	private $sEmail;

	/**
	 * @var string
	 */
	private $sRemark;

	/**
	 * @var string
	 */
	private $sDkimStatus;

	/**
	 * @var string
	 */
	private $sDkimValue;

	/**
	 * @access private
	 *
	 * @param string $sEmail
	 * @param string $sDisplayName = ''
	 * @param string $sRemark = ''
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	private function __construct($sEmail, $sDisplayName = '', $sRemark = '')
	{
		if (!\MailSo\Base\Validator::NotEmptyString($sEmail, true))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException();
		}

		$this->sEmail = \MailSo\Base\Utils::IdnToAscii(
			\MailSo\Base\Utils::Trim($sEmail), true);

		$this->sDisplayName = \MailSo\Base\Utils::Trim($sDisplayName);
		$this->sRemark = \MailSo\Base\Utils::Trim($sRemark);

		$this->sDkimStatus = \MailSo\Mime\Enumerations\DkimStatus::NONE;
		$this->sDkimValue = '';
	}

	/**
	 * @param string $sEmail
	 * @param string $sDisplayName = ''
	 * @param string $sRemark = ''
	 *
	 * @return \MailSo\Mime\Email
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public static function NewInstance($sEmail, $sDisplayName = '', $sRemark = '')
	{
		return new self($sEmail, $sDisplayName, $sRemark);
	}

	/**
	 * @param string $sEmailAddress
	 * @return \MailSo\Mime\Email
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public static function Parse($sEmailAddress)
	{
		$sEmailAddress = \MailSo\Base\Utils::Trim($sEmailAddress);
		if (!\MailSo\Base\Validator::NotEmptyString($sEmailAddress, true))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException();
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

		while ($iCurrentIndex < \strlen($sEmailAddress))
		{
			switch ($sEmailAddress{$iCurrentIndex})
			{
//				case '\'':
				case '"':
//					$sQuoteChar = $sEmailAddress{$iCurrentIndex};
					if ((!$bInName) && (!$bInAddress) && (!$bInComment))
					{
						$bInName = true;
						$iStartIndex = $iCurrentIndex;
					}
					else if ((!$bInAddress) && (!$bInComment))
					{
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
					if ((!$bInName) && (!$bInAddress) && (!$bInComment))
					{
						if ($iCurrentIndex > 0 && \strlen($sName) === 0)
						{
							$sName = \substr($sEmailAddress, 0, $iCurrentIndex);
						}

						$bInAddress = true;
						$iStartIndex = $iCurrentIndex;
					}
					break;
				case '>':
					if ($bInAddress)
					{
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
					if ((!$bInName) && (!$bInAddress) && (!$bInComment))
					{
						$bInComment = true;
						$iStartIndex = $iCurrentIndex;
					}
					break;
				case ')':
					if ($bInComment)
					{
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
					$iCurrentIndex++;
					break;
			}

			$iCurrentIndex++;
		}

		if (\strlen($sEmail) === 0)
		{
			$aRegs = array('');
			if (\preg_match('/[^@\s]+@\S+/i', $sEmailAddress, $aRegs) && isset($aRegs[0]))
			{
				$sEmail = $aRegs[0];
			}
			else
			{
				$sName = $sEmailAddress;
			}
		}

		if ((\strlen($sEmail) > 0) && (\strlen($sName) == 0) && (\strlen($sComment) == 0))
		{
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

		return Email::NewInstance($sEmail, $sName, $sComment);
	}

	/**
	 * @param bool $bIdn = false
	 *
	 * @return string
	 */
	public function GetEmail($bIdn = false)
	{
		return $bIdn ? \MailSo\Base\Utils::IdnToUtf8($this->sEmail) : $this->sEmail;
	}

	/**
	 * @return string
	 */
	public function GetDisplayName()
	{
		return $this->sDisplayName;
	}

	/**
	 * @return string
	 */
	public function GetRemark()
	{
		return $this->sRemark;
	}

	/**
	 * @return string
	 */
	public function GetDkimStatus()
	{
		return $this->sDkimStatus;
	}

	/**
	 * @return string
	 */
	public function GetDkimValue()
	{
		return $this->sDkimValue;
	}

	/**
	 * @return string
	 */
	public function GetAccountName()
	{
		return \MailSo\Base\Utils::GetAccountNameFromEmail($this->GetEmail(false));
	}

	/**
	 * @param bool $bIdn = false
	 *
	 * @return string
	 */
	public function GetDomain($bIdn = false)
	{
		return \MailSo\Base\Utils::GetDomainFromEmail($this->GetEmail($bIdn));
	}

	/**
	 * @param string $sDkimStatus
	 * @param string $sDkimValue = ''
	 */
	public function SetDkimStatusAndValue($sDkimStatus, $sDkimValue = '')
	{
		$this->sDkimStatus = \MailSo\Mime\Enumerations\DkimStatus::normalizeValue($sDkimStatus);
		$this->sDkimValue = $sDkimValue;
	}

	/**
	 * @param bool $bIdn = false
	 * @param bool $bDkim = true
	 *
	 * @return array
	 */
	public function ToArray($bIdn = false, $bDkim = true)
	{
		return $bDkim ? array($this->sDisplayName, $this->GetEmail($bIdn), $this->sRemark, $this->sDkimStatus, $this->sDkimValue) :
			array($this->sDisplayName, $this->GetEmail($bIdn), $this->sRemark);
	}

	/**
	 * @param bool $bConvertSpecialsName = false
	 * @param bool $bIdn = false
	 *
	 * @return string
	 */
	public function ToString($bConvertSpecialsName = false, $bIdn = false)
	{
		$sReturn = '';

		$sRemark = \str_replace(')', '\)', $this->sRemark);
		$sDisplayName = \str_replace('"', '\"', $this->sDisplayName);

		if ($bConvertSpecialsName)
		{
			$sDisplayName = 0 === \strlen($sDisplayName) ? '' : \MailSo\Base\Utils::EncodeUnencodedValue(
				\MailSo\Base\Enumerations\Encoding::BASE64_SHORT,
				$sDisplayName);

			$sRemark = 0 === \strlen($sRemark) ? '' : \MailSo\Base\Utils::EncodeUnencodedValue(
				\MailSo\Base\Enumerations\Encoding::BASE64_SHORT,
				$sRemark);
		}

		$sDisplayName = 0 === \strlen($sDisplayName) ? '' : '"'.$sDisplayName.'"';
		$sRemark = 0 === \strlen($sRemark) ? '' : '('.$sRemark.')';

		if (0 < \strlen($this->sEmail))
		{
			$sReturn = $this->GetEmail($bIdn);
			if (0 < \strlen($sDisplayName.$sRemark))
			{
				$sReturn = $sDisplayName.' <'.$sReturn.'> '.$sRemark;
			}
		}

		return \trim($sReturn);
	}
}
