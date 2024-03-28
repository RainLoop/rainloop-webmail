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
class Xxtea
{

	public static function Encrypt(string $sString, string $sKey) : string
	{
		$aV = self::str2long($sString, true);
		$aK = self::str2long($sKey, false);
		if (\count($aK) < 4) {
			for ($iIndex = \count($aK); $iIndex < 4; $iIndex++) {
				$aK[$iIndex] = 0;
			}
		}
		$iN = \count($aV) - 1;

		$iZ = $aV[$iN];
		$iY = $aV[0];
		$iDelta = 0x9E3779B9;
		$iQ = \floor(6 + 52 / ($iN + 1));
		$iSum = 0;
		while (0 < $iQ--) {
			$iSum = self::int32($iSum + $iDelta);
			$iE = $iSum >> 2 & 3;
			for ($iPIndex = 0; $iPIndex < $iN; ++$iPIndex) {
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

	public static function Decrypt(string $sEncryptedString, string $sKey) : string
	{
		$aV = self::str2long($sEncryptedString, false);
		$aK = self::str2long($sKey, false);

		if (\count($aK) < 4) {
			for ($iIndex = \count($aK); $iIndex < 4; ++$iIndex) {
				$aK[$iIndex] = 0;
			}
		}

		$iN = \count($aV) - 1;

		$iZ = $aV[$iN];
		$iY = $aV[0];
		$iDelta = 0x9E3779B9;
		$iQ = \floor(6 + 52 / ($iN + 1));
		$iSum = self::int32($iQ * $iDelta);
		while ($iSum != 0) {
			$iE = $iSum >> 2 & 3;
			for ($iPIndex = $iN; $iPIndex > 0; --$iPIndex) {
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

	private static function long2str(array $aV, bool $aW) : string
	{
		$iLen = \count($aV);
		$iN = ($iLen - 1) << 2;
		if ($aW) {
			$iM = $aV[$iLen - 1];
			if (($iM < $iN - 3) || ($iM > $iN)) {
				return false;
			}
			$iN = $iM;
		}
		$aS = array();
		for ($iIndex = 0; $iIndex < $iLen; ++$iIndex) {
			$aS[$iIndex] = \pack('V', $aV[$iIndex]);
		}
		return $aW ? \substr(\join('', $aS), 0, $iN) : \join('', $aS);
	}

	private static function str2long(string $sS, string $sW) : array
	{
		$aV = \unpack('V*', $sS . \str_repeat("\0", (4 - \strlen($sS) % 4) & 3));
		$aV = \array_values($aV);
		if ($sW) {
			$aV[\count($aV)] = \strlen($sS);
		}
		return $aV;
	}

	private static function int32($iN) : int
	{
		return $iN & 0xffffffff;
	}
}
