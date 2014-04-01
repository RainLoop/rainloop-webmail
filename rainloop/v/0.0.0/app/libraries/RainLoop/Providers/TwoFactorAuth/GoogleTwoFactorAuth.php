<?php

namespace RainLoop\Providers\TwoFactorAuth;

class GoogleTwoFactorAuth 
	extends \RainLoop\Providers\TwoFactorAuth\AbstractTwoFactorAuth
	implements \RainLoop\Providers\TwoFactorAuth\TwoFactorAuthInterface
{
	private $iCodeLength = 6;

	/**
	 * @return string
	 */
	public function Label()
	{
		return 'Google Authenticator Code';
	}

	/**
	 * Get QR-Code URL for image, from google charts
	 *
	 * Function from PHP Class for handling Google Authenticator 2-factor authentication
	 *
	 * @author Michael Kliewe
	 * @copyright 2012 Michael Kliewe
	 * @license http://www.opensource.org/licenses/bsd-license.php BSD License
	 * @link http://www.phpgangsta.de/
	 *
	 * @param string $sName
	 * @param string $sSecret
	 * @param string $sTitle
	 * @return string
	 */
	private function getQRCodeGoogleUrl($sName, $sSecret, $sTitle = null)
	{
		$sUrlEncoded = \urlencode('otpauth://totp/'.$sName.'?secret='.$sSecret.'');
		if(null !== $sTitle)
		{
			$sUrlEncoded .= \urlencode('&issuer='.$sTitle);
		}

		return 'https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl='.$sUrlEncoded.'';
	}

	/**
     * Get array with all 32 characters for decoding from/encoding to base32
	 *
	 * Function from PHP Class for handling Google Authenticator 2-factor authentication
	 *
	 * @author Michael Kliewe
	 * @copyright 2012 Michael Kliewe
	 * @license http://www.opensource.org/licenses/bsd-license.php BSD License
	 * @link http://www.phpgangsta.de/
     *
     * @return array
     */
    private function getBase32LookupTable()
    {
        return array(
            'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', //  7
            'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', // 15
            'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', // 23
            'Y', 'Z', '2', '3', '4', '5', '6', '7', // 31
            '='  // padding char
        );
    }

    /**
     * Helper class to decode base32
	 *
	 * Function from PHP Class for handling Google Authenticator 2-factor authentication
	 *
	 * @author Michael Kliewe
	 * @copyright 2012 Michael Kliewe
	 * @license http://www.opensource.org/licenses/bsd-license.php BSD License
	 * @link http://www.phpgangsta.de/
     *
     * @param $sSecret
	 *
     * @return bool|string
     */
    private function base32Decode($sSecret)
    {
        if (empty($sSecret))
		{
			return '';
		}

        $aBase32chars = $this->getBase32LookupTable();
        $aBase32charsFlipped = \array_flip($aBase32chars);

        $iPaddingCharCount = \substr_count($sSecret, $aBase32chars[32]);
        $aAllowedValues = array(6, 4, 3, 1, 0);

        if (!\in_array($iPaddingCharCount, $aAllowedValues))
		{
			return false;
		}

        for ($iIndex = 0; $iIndex < 4; $iIndex++)
		{
            if ($iPaddingCharCount === $aAllowedValues[$iIndex] &&
                \substr($sSecret, -($aAllowedValues[$iIndex])) !== \str_repeat($aBase32chars[32], $aAllowedValues[$iIndex]))
			{
				return false;
			}
        }

        $sSecret = \str_replace('=', '', $sSecret);
        $sSecret = \str_split($sSecret);

        $sBinaryString = '';

        for ($iIndex = 0; $iIndex < \count($sSecret); $iIndex = $iIndex + 8)
		{
            $sX = '';
            if (!\in_array($sSecret[$iIndex], $aBase32chars))
			{
				return false;
			}

            for ($iJ = 0; $iJ < 8; $iJ++)
			{
                $sX .= \str_pad(\base_convert(@$aBase32charsFlipped[@$sSecret[$iIndex + $iJ]], 10, 2), 5, '0', STR_PAD_LEFT);
            }

            $eightBits = \str_split($sX, 8);
            for ($iZ = 0; $iZ < \count($eightBits); $iZ++)
			{
                $sBinaryString .= (($y = \chr(\base_convert($eightBits[$iZ], 2, 10))) || ord($y) == 48 ) ? $y : '';
            }
        }

        return $sBinaryString;
    }
	

	/**
     * Calculate the code, with given secret and point in time
	 *
	 * Function from PHP Class for handling Google Authenticator 2-factor authentication
	 *
	 * @author Michael Kliewe
	 * @copyright 2012 Michael Kliewe
	 * @license http://www.opensource.org/licenses/bsd-license.php BSD License
	 * @link http://www.phpgangsta.de/
     *
     * @param string $sSecret
     * @param int|null $mTimeSlice
	 *
     * @return string
     */
    private function getCode($sSecret, $mTimeSlice = null)
    {
        if (null === $mTimeSlice)
		{
            $mTimeSlice = \floor(\time() / 30);
        }

        $sSecretKey = $this->base32Decode($sSecret);

        // Pack time into binary string
        $sTime = \chr(0).\chr(0).\chr(0).\chr(0).\pack('N*', $mTimeSlice);
        // Hash it with users secret key
        $sHm = \hash_hmac('SHA1', $sTime, $sSecretKey, true);
        // Use last nipple of result as index/offset
        $iOffset = \ord(\substr($sHm, -1)) & 0x0F;
        // grab 4 bytes of the result
        $sHashPart = \substr($sHm, $iOffset, 4);

        // Unpak binary value
        $sValue = \unpack('N', $sHashPart);
		$sValue = $sValue{1};
        // Only 32 bits
        $sValue = $sValue & 0x7FFFFFFF;

        $iMod = \pow(10, $this->iCodeLength);
		
        return \str_pad($sValue % $iMod, $this->iCodeLength, '0', STR_PAD_LEFT);
    }

	/**
	 * Check if the code is correct. This will accept codes starting
	 * from $iDiscrepancy * 30sec ago to $iDiscrepancy * 30sec from now
	 * 
	 * @param string $sSecret
	 * @param string $sCode
	 * 
	 * @return bool
	 */
	public function VerifyCode($sSecret, $sCode)
	{
		$iDiscrepancy = 1;
		$iTimeSlice = \floor(\time() / 30);

        for ($iIndex = -$iDiscrepancy; $iIndex <= $iDiscrepancy; $iIndex++)
		{
            if ($this->getCode($sSecret, $iTimeSlice + $iIndex) === $sCode)
			{
                return true;
            }
        }

        return false;
	}
}
