<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Base;

/**
 * @category MailSo
 * @package Base
 */
class Validator
{
	/**
	 * @param string $sEmail
	 * @param array $aAllowedInternalDomains = array('localhost')
	 *
	 * @return bool
	 */
	public static function EmailString($sEmail, $aAllowedInternalDomains = array('localhost'))
	{
		$bResult = false;
		if (\MailSo\Base\Validator::NotEmptyString($sEmail, true))
		{
			$bResult = false !== \filter_var($sEmail, FILTER_VALIDATE_EMAIL);
			if (!$bResult)
			{
				$aSplit = \explode("@", $sEmail);
				$bResult = 2 === \count($aSplit) &&
					\in_array($aSplit[1], $aAllowedInternalDomains) &&
					false !== \filter_var(($aSplit[0].'@example.com'), FILTER_VALIDATE_EMAIL);
			}
		}

		return $bResult;
	}

	/**
	 * @param string $sEmail
	 *
	 * @return bool
	 */
	public static function SimpleEmailString($sEmail)
	{
		return \MailSo\Base\Validator::NotEmptyString($sEmail, true) &&
			!!\preg_match('/^[a-zA-Z0-9][a-zA-Z0-9\.\+\-_]*@[a-zA-Z0-9][a-zA-Z0-9\.\+\-_]*$/', $sEmail);
	}

	/**
	 * @param string $sString
	 * @param bool $bTrim = false
	 *
	 * @return bool
	 */
	public static function NotEmptyString($sString, $bTrim = false)
	{
		return \is_string($sString) &&
			(0 < \strlen($bTrim ? \trim($sString) : $sString));
	}

	/**
	 * @param array $aList
	 *
	 * @return bool
	 */
	public static function NotEmptyArray($aList)
	{
		return \is_array($aList) && 0 < \count($aList);
	}

	/**
	 * @param int $iNumber
	 * @param int $iMin = null
	 * @param int $iMax = null
	 *
	 * @return bool
	 */
	public static function RangeInt($iNumber, $iMin = null, $iMax = null)
	{
		return \is_int($iNumber) &&
		   (null !== $iMin && $iNumber >= $iMin || null === $iMin) &&
		   (null !== $iMax && $iNumber <= $iMax || null === $iMax);
	}

	/**
	 * @param int $iPort
	 *
	 * @return bool
	 */
	public static function PortInt($iPort)
	{
		return \MailSo\Base\Validator::RangeInt($iPort, 0, 65535);
	}
}
