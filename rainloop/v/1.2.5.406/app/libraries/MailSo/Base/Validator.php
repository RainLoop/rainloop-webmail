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
		$bResult = false;
		if (self::NotEmptyString($sEmail))
		{
			$bResult = (bool) \preg_match('/^[a-zA-Z0-9][a-zA-Z0-9\.\+\-_]*@[a-zA-Z0-9][a-zA-Z0-9\.\+\-_]*$/', $sEmail);
		}

		return $bResult;
	}

	/**
	 * @param string $sString
	 * @param bool $bTrim = false
	 *
	 * @return bool
	 */
	public static function NotEmptyString($sString, $bTrim = false)
	{
		$bResult = false;
		if (\is_string($sString))
		{
			if ($bTrim)
			{
				$sString = \trim($sString);
			}

			$bResult = 0 < \strlen($sString);
		}

		return $bResult;
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
		$bResult = false;
		if (\is_int($iNumber))
		{
			$bResult = true;
			if ($bResult && null !== $iMin)
			{
				$bResult = $iNumber >= $iMin;
			}

			if ($bResult && null !== $iMax)
			{
				$bResult = $iNumber <= $iMax;
			}
		}

		return $bResult;
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
