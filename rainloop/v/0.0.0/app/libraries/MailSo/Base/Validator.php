<?php

namespace MailSo\Base;

/**
 * @category MailSo
 * @package Base
 */
class Validator
{
	/**
	 * @param string $sEmail
	 *
	 * @return bool
	 */
	public static function EmailString($sEmail)
	{
		return self::NotEmptyString($sEmail) && 
			\filter_var($sEmail, FILTER_VALIDATE_EMAIL);
	}

	/**
	 * @param string $sString
	 * @param bool $bTrim = false
	 *
	 * @return bool
	 */
	public static function NotEmptyString($sString, $bTrim = false)
	{
		return is_string($sString) &&
			(0 < \strlen($bTrim?\trim($sString):$sString));
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
		return self::RangeInt($iPort, 0, 65535);
	}
}
