<?php

namespace RainLoop\Actions;

trait Pgp
{
	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function GnuPG() : ?\SnappyMail\PGP\GnuPG
	{
		$pgp_dir = $this->StorageProvider()->GenerateFilePath(
			$this->getAccountFromToken(),
			\RainLoop\Providers\Storage\Enumerations\StorageType::PGP
		);
		return \SnappyMail\PGP\GnuPG::getInstance($pgp_dir);
	}

	public function DoPgpGetKeysEmails() : array
	{
		$GPG = $this->GnuPG();
		if ($GPG) {
			$sign = $encrypt = $keys = [];
			foreach ($GPG->keyInfo('') as $info) {
				if (!$info['disabled'] && !$info['expired'] && !$info['revoked']) {
					if ($info['can_sign']) {
						foreach ($info['uids'] as $uid)  {
							$private[] = $info['email'];
						}
					}
					if ($info['can_encrypt']) {
						foreach ($info['uids'] as $uid)  {
							$public[] = $info['email'];
						}
					}
				}
				$keys[] = $info;
			}
			return $this->DefaultResponse(__FUNCTION__, [
				'sign' => $sign,
				'encrypt' => $encrypt,
				'keys' => $keys,
				'info' => $GPG->getEngineInfo()
			]);
		}
		return $this->FalseResponse(__FUNCTION__);
	}

	public function DoPgpImportKey() : array
	{
		$sKeyId = $this->GetActionParam('KeyId', '');
		$sPublicKey = $this->GetActionParam('PublicKey', '');
		$sEmail = $this->GetActionParam('Email', '');

		if (!$sPublicKey) {
			try {
				if (!$sKeyId) {
					if (\preg_match('/[^\\s<>]+@[^\\s<>]+/', $sEmail, $aMatch)) {
						$sEmail = $aMatch[0];
					}
					if ($sEmail) {
						/** https://wiki.gnupg.org/WKD
							DNS:
								openpgpkey.example.org. 300     IN      CNAME   wkd.keys.openpgp.org.

							https://openpgpkey.example.com/.well-known/openpgpkey/example.com/hu/
							else       https://example.com/.well-known/openpgpkey/hu/

							An example: https://example.com/.well-known/openpgpkey/hu/it5sewh54rxz33fwmr8u6dy4bbz8itz4
							is the direct method URL for "bernhard.reiter@example.com"
						*/
						$aKeys = \SnappyMail\PGP\Keyservers::index($sEmail);
						if ($aKeys) {
							$sKeyId = $aKeys[0]['keyid'];
						}
					}
				}
				if ($sKeyId) {
					$sPublicKey = \SnappyMail\PGP\Keyservers::get($sKeyId);
				}
			} catch (\Throwable $e) {
				// ignore
			}
		}

		$GPG = $sPublicKey ? $this->GnuPG() : null;
		return $GPG
			? $this->DefaultResponse(__FUNCTION__, $GPG->import($sPublicKey))
			: $this->FalseResponse(__FUNCTION__);
	}
}
