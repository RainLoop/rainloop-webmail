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

	public function jsonSerialize()
	{
		$aData = parent::jsonSerialize();
		$aData[] = ''; // was ParentEmail
		return $aData;
	}

	public function asTokenArray(MainAccount $oMainAccount) : array
	{
		$sHash = $oMainAccount->CryptKey();
		$aData = $this->jsonSerialize();
		$aData[3] = \SnappyMail\Crypt::EncryptUrlSafe($aData[3], $sHash); // sPassword
		$aData[6] = \SnappyMail\Crypt::EncryptUrlSafe($aData[6], $sHash); // sProxyAuthPassword
		$aData[] = \hash_hmac('sha1', $aData[3], $sHash);
		return $aData;
	}

	public static function NewInstanceFromTokenArray(
		\RainLoop\Actions $oActions,
		array $aAccountHash,
		bool $bThrowExceptionOnFalse = false) : ?Account /* PHP7.4: ?self*/
	{
		$iCount = \count($aAccountHash);
		if (!empty($aAccountHash[0]) && 'account' === $aAccountHash[0] && 8 <= $iCount && 9 >= $iCount) {
			$sHash = $oActions->getMainAccountFromToken()->CryptKey();
			$sPasswordHMAC = (8 < $iCount) ? \array_pop($aAccountHash) : null;
			if ($sPasswordHMAC && $sPasswordHMAC === \hash_hmac('sha1', $aAccountHash[3], $sHash)) {
				$aAccountHash[3] = \SnappyMail\Crypt::DecryptUrlSafe($aAccountHash[3], $sHash);
				$aAccountHash[6] = \SnappyMail\Crypt::DecryptUrlSafe($aAccountHash[6], $sHash);
			}
			return parent::NewInstanceFromTokenArray($oActions, $aAccountHash, $bThrowExceptionOnFalse);
		}
		return null;
	}

}
