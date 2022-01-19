<?php

namespace RainLoop\Actions;

trait Pgp
{
	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function GnuPG() : ?\SnappyMail\PGP\GnuPG
	{
		$pgp_dir = \dirname($this->StorageProvider()->GenerateFilePath(
			$this->getAccountFromToken(),
			\RainLoop\Providers\Storage\Enumerations\StorageType::PGP
		));
		return \SnappyMail\PGP\GnuPG::getInstance($pgp_dir);
	}

	public function DoGnupgGetKeysEmails() : array
	{
		$GPG = $this->GnuPG();
		if ($GPG) {
			$keys = [];
			foreach ($GPG->keyInfo('') as $info) {
				if (!$info['disabled'] && !$info['expired'] && !$info['revoked']) {
					foreach ($info['uids'] as $uid)  {
						$id = $uid['email'];
						if (isset($keys[$id])) {
							$keys[$id]['can_sign'] = $keys[$id]['can_sign'] || $info['can_sign'];
							$keys[$id]['can_encrypt'] = $keys[$id]['can_encrypt'] || $info['can_encrypt'];
						} else {
							$keys[$id] = [
								'name' => $uid['name'],
								'email' => $uid['email'],
								'can_sign' => $info['can_sign'],
								'can_encrypt' => $info['can_encrypt']
							];
						}
					}
					/*
					foreach ($info['subkeys'] as $key)  {
						$key['can_authenticate'] = true
						​​​​​​$key['can_certify'] = true
						​​​​​​$key['can_encrypt'] = true
						​​​​​​$key['can_sign'] = true
						​​​​​​$key['disabled'] = false
						​​​​​​$key['expired'] = false
						​​​​​​$key['expires'] = 0
						​​​​​​$key['fingerprint'] = "99BBB6F2FDDE9E20CD78B98DC85B364A5A6CCF52"
						​​​​​​$key['invalid'] = false
						​​​​​​$key['is_cardkey'] = false
						​​​​​​$key['is_de_vs'] = true
						​​​​​​$key['is_qualified'] = false
						​​​​​​$key['is_secret'] = false
						​​​​​​$key['keygrip'] = "CBCCF45D4F6D300417F044A08E08F8F14522BABE"
						​​​​​​$key['keyid'] = "C85B364A5A6CCF52"
						​​​​​​$key['length'] = 4096
						​​​​​​$key['pubkey_algo'] = 1
						​​​​​​$key['revoked'] = false
						​​​​​​$key['timestamp'] = 1428449321
					}
					*/
				}
			}
			return $this->DefaultResponse(__FUNCTION__, $keys);
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
