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
class Crypt
{
	/**
	 *
	 * @param string $sString
	 * @param string $sKey
	 *
	 * @return string
	 */
	public static function XxteaEncrypt($sString, $sKey)
	{
		if (0 === \strlen($sString))
		{
			return '';
		}

		$aV = self::str2long($sString, true);
		$aK = self::str2long($sKey, false);
		if (\count($aK) < 4)
		{
			for ($iIndex = \count($aK); $iIndex < 4; $iIndex++)
			{
				$aK[$iIndex] = 0;
			}
		}
		$iN = \count($aV) - 1;

		$iZ = $aV[$iN];
		$iY = $aV[0];
		$iDelta = 0x9E3779B9;
		$iQ = \floor(6 + 52 / ($iN + 1));
		$iSum = 0;
		while (0 < $iQ--)
		{
			$iSum = self::int32($iSum + $iDelta);
			$iE = $iSum >> 2 & 3;
			for ($iPIndex = 0; $iPIndex < $iN; $iPIndex++)
			{
				$iY = $aV[$iPIndex + 1];
				$iMx = self::int32((($iZ >> 5 & 0x07ffffff) ^ $iY << 2) +
					(($iY >> 3 & 0x1fffffff) ^ $iZ << 4)) ^ self::int32(($iSum ^ $iY) + ($aK[$iPIndex & 3 ^ $iE] ^ $iZ));
				$iZ = $aV[$iPIndex] = self::int32($aV[$iPIndex] + $iMx);
			}
			$iY = $aV[0];
			$iMx = self::int32((($iZ >> 5 & 0x07ffffff) ^ $iY << 2) +
				(($iY >> 3 & 0x1fffffff) ^ $iZ << 4)) ^ self::int32(($iSum ^ $iY) + ($aK[$iPIndex & 3 ^ $iE] ^ $iZ));
			$iZ = $aV[$iN] = self::int32($aV[$iN] + $iMx);
		}

		return self::long2str($aV, false);
	}

	/**
	 * @param string $sEncriptedString
	 * @param string $sKey
	 *
	 * @return string
	 */
	public static function XxteaDecrypt($sEncriptedString, $sKey)
	{
		if (0 === \strlen($sEncriptedString))
		{
			return '';
		}

		$aV = self::str2long($sEncriptedString, false);
		$aK = self::str2long($sKey, false);

		if (\count($aK) < 4)
		{
			for ($iIndex = \count($aK); $iIndex < 4; $iIndex++)
			{
				$aK[$iIndex] = 0;
			}
		}

		$iN = \count($aV) - 1;

		$iZ = $aV[$iN];
		$iY = $aV[0];
		$iDelta = 0x9E3779B9;
		$iQ = \floor(6 + 52 / ($iN + 1));
		$iSum = self::int32($iQ * $iDelta);
		while ($iSum != 0)
		{
			$iE = $iSum >> 2 & 3;
			for ($iPIndex = $iN; $iPIndex > 0; $iPIndex--)
			{
				$iZ = $aV[$iPIndex - 1];
				$iMx = self::int32((($iZ >> 5 & 0x07ffffff) ^ $iY << 2) +
					(($iY >> 3 & 0x1fffffff) ^ $iZ << 4)) ^ self::int32(($iSum ^ $iY) + ($aK[$iPIndex & 3 ^ $iE] ^ $iZ));
				$iY = $aV[$iPIndex] = self::int32($aV[$iPIndex] - $iMx);
			}
			$iZ = $aV[$iN];
			$iMx = self::int32((($iZ >> 5 & 0x07ffffff) ^ $iY << 2) +
				(($iY >> 3 & 0x1fffffff) ^ $iZ << 4)) ^ self::int32(($iSum ^ $iY) + ($aK[$iPIndex & 3 ^ $iE] ^ $iZ));
			$iY = $aV[0] = self::int32($aV[0] - $iMx);
			$iSum = self::int32($iSum - $iDelta);
		}

		return self::long2str($aV, true);
	}

	/**
	 * @param array $aV
	 * @param array $aW
	 *
	 * @return string
	 */
	private static function long2str($aV, $aW)
	{
		$iLen = \count($aV);
		$iN = ($iLen - 1) << 2;
		if ($aW)
		{
			$iM = $aV[$iLen - 1];
			if (($iM < $iN - 3) || ($iM > $iN))
			{
				return false;
			}
			$iN = $iM;
		}
		$aS = array();
		for ($iIndex = 0; $iIndex < $iLen; $iIndex++)
		{
			$aS[$iIndex] = \pack('V', $aV[$iIndex]);
		}
		if ($aW)
		{
			return \substr(\join('', $aS), 0, $iN);
		}
		else
		{
			return \join('', $aS);
		}
	}

	/**
	 * @param string $sS
	 * @param string $sW
	 *
	 * @return array
	 */
	private static function str2long($sS, $sW)
	{
		$aV = \unpack('V*', $sS . \str_repeat("\0", (4 - \strlen($sS) % 4) & 3));
		$aV = \array_values($aV);
		if ($sW)
		{
			$aV[\count($aV)] = \strlen($sS);
		}
		return $aV;
	}

	/**
	 * @param int $iN
	 *
	 * @return int
	 */
	private static function int32($iN)
	{
		while ($iN >= 2147483648)
		{
			$iN -= 4294967296;
		}
		while ($iN <= -2147483649)
		{
			$iN += 4294967296;
		}
		return (int) $iN;
	}
}