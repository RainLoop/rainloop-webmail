<?php

namespace RainLoop\Model;

use RainLoop\Utils;
use RainLoop\Exceptions\ClientException;

class AdditionalAccount extends Account
{
	/**
	 * @var string
	 */
	private $sParentEmail = '';

	public function ParentEmail() : string
	{
		return $this->sParentEmail;
	}

	public function SetParentEmail(string $sParentEmail) : void
	{
		$this->sParentEmail = \trim(\MailSo\Base\Utils::IdnToAscii($sParentEmail, true));
	}

	public function PasswordHash() : string
	{
		throw new \LogicException('Not allowed on AdditionalAccount');
	}

	public function Hash() : string
	{
		return \md5(parent::Hash() . $this->sParentEmail);
	}

	public function jsonSerialize()
	{
		$aData = parent::jsonSerialize();
		$aData[] = $this->sParentEmail;
		return $aData;
	}

	public function asTokenArray(Account $oMainAccount) : array
	{
		$sHash = $oMainAccount->PasswordHash();
		$aData = $this->jsonSerialize();
		$aData[3] = \SnappyMail\Crypt::EncryptUrlSafe($aData[3], $sHash);
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
			$sHash = $oActions->getMainAccountFromToken()->PasswordHash();
			$sPasswordHMAC = (8 < $iCount) ? \array_pop($aAccountHash) : null;
			$sParentEmail = \array_pop($aAccountHash);
			if ($sPasswordHMAC && $sPasswordHMAC === \hash_hmac('sha1', $aAccountHash[3], $sHash)) {
				$aAccountHash[3] = \SnappyMail\Crypt::DecryptUrlSafe($aAccountHash[3], $sHash);
			}
			$oAccount = parent::NewInstanceFromTokenArray($oActions, $aAccountHash, $bThrowExceptionOnFalse);
			if ($oAccount) {
				$oAccount->SetParentEmail($sParentEmail);
				return $oAccount;
			}
		}
		return null;
	}

}
