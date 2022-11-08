<?php

namespace RainLoop\Model;

use RainLoop\Utils;
use RainLoop\Exceptions\ClientException;

class AdditionalAccount extends Account
{
	public function ParentEmail() : string
	{
		return \trim(\MailSo\Base\Utils::IdnToAscii(\RainLoop\Api::Actions()->getMainAccountFromToken()->Email(), true));
	}

	public function Hash() : string
	{
		return \md5(parent::Hash() . $this->ParentEmail());
	}

	public static function convertArray(array $aAccount) : array
	{
		$aResult = parent::convertArray($aAccount);
		$iCount = \count($aAccount);
		if ($aResult && 7 < $iCount && 9 >= $iCount) {
			$aResult['hmac'] = \array_pop($aAccount);
		}
		return $aResult;
	}

	public function asTokenArray(MainAccount $oMainAccount) : array
	{
		$sHash = $oMainAccount->CryptKey();
		$aData = $this->jsonSerialize();
		$aData['pass'] = \SnappyMail\Crypt::EncryptUrlSafe($aData['pass'], $sHash); // sPassword
		if (isset($aAccountHash['proxy'])) {
			$aData['proxy']['pass'] = \SnappyMail\Crypt::EncryptUrlSafe($aData['proxy']['pass'], $sHash); // sProxyAuthPassword
		}
		$aData['hmac'] = \hash_hmac('sha1', $aData['pass'], $sHash);
		return $aData;
	}

	public static function NewInstanceFromTokenArray(
		\RainLoop\Actions $oActions,
		array $aAccountHash,
		bool $bThrowExceptionOnFalse = false) : ?Account /* PHP7.4: ?self*/
	{
		$aAccountHash = static::convertArray($aAccountHash);
		if (!empty($aAccountHash['email'])) {
			$sHash = $oActions->getMainAccountFromToken()->CryptKey();
			// hmac only set when asTokenArray() was used
			$sPasswordHMAC = $aAccountHash['hmac'] ?? null;
			if ($sPasswordHMAC && $sPasswordHMAC === \hash_hmac('sha1', $aAccountHash['pass'], $sHash)) {
				$aAccountHash['pass'] = \SnappyMail\Crypt::DecryptUrlSafe($aAccountHash['pass'], $sHash);
				if (isset($aAccountHash['proxy'])) {
					$aAccountHash['proxy']['pass'] = \SnappyMail\Crypt::DecryptUrlSafe($aAccountHash['proxy']['pass'], $sHash);
				}
			}
			return parent::NewInstanceFromTokenArray($oActions, $aAccountHash, $bThrowExceptionOnFalse);
		}
		return null;
	}

}
