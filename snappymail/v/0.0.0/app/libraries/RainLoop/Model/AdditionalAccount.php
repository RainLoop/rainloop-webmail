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
		return \sha1(parent::Hash() . $this->ParentEmail());
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
		if (!empty($aData['smtp']['pass'])) {
			$aData['smtp']['pass'] = \SnappyMail\Crypt::EncryptUrlSafe($aData['smtp']['pass'], $sHash);
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
			if ($sPasswordHMAC) {
				if ($sPasswordHMAC === \hash_hmac('sha1', $aAccountHash['pass'], $sHash)) {
					$aAccountHash['pass'] = \SnappyMail\Crypt::DecryptUrlSafe($aAccountHash['pass'], $sHash);
					if (!empty($aData['smtp']['pass'])) {
						$aAccountHash['smtp']['pass'] = \SnappyMail\Crypt::DecryptUrlSafe($aAccountHash['smtp']['pass'], $sHash);
					}
				} else {
					$aAccountHash['pass'] = '';
					if (!empty($aData['smtp']['pass'])) {
						$aAccountHash['smtp']['pass'] = '';
					}
				}
			}
			return parent::NewInstanceFromTokenArray($oActions, $aAccountHash, $bThrowExceptionOnFalse);
		}
		return null;
	}

}
