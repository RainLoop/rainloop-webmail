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

	public static function EmailString(string $sEmail, array $aAllowedInternalDomains = array('localhost')) : bool
	{
		$bResult = false;
		if (static::NotEmptyString($sEmail, true))
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

	public static function SimpleEmailString(string $sEmail) : bool
	{
		return static::NotEmptyString($sEmail, true) &&
			!!\preg_match('/^[a-zA-Z0-9][a-zA-Z0-9\.\+\-_]*@[a-zA-Z0-9][a-zA-Z0-9\.\+\-_]*$/', $sEmail);
	}

	public static function NotEmptyString(string $sString, bool $bTrim = false) : bool
	{
		return \is_string($sString) &&
			(0 < \strlen($bTrim ? \trim($sString) : $sString));
	}

	public static function NotEmptyArray(array $aList) : bool
	{
		return \is_array($aList) && 0 < \count($aList);
	}

	public static function RangeInt(int $iNumber, int $iMin = null, int $iMax = null) : bool
	{
		return \is_int($iNumber) &&
		   (null !== $iMin && $iNumber >= $iMin || null === $iMin) &&
		   (null !== $iMax && $iNumber <= $iMax || null === $iMax);
	}

	public static function PortInt(int $iPort) : bool
	{
		return static::RangeInt($iPort, 0, 65535);
	}
}
