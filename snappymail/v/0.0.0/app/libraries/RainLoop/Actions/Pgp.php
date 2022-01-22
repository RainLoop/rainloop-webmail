<?php

namespace RainLoop\Actions;

trait Pgp
{
	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function GnuPG() : ?\SnappyMail\PGP\GnuPG
	{
		$oAccount = $this->getAccountFromToken();
		if (!$oAccount) {
			return null;
		}

		$homedir = \dirname($this->StorageProvider()->GenerateFilePath(
			$oAccount,
			\RainLoop\Providers\Storage\Enumerations\StorageType::PGP
		)) . '/.gnupg';

		/**
		 * Workaround error: socket name for '/very/long/path/to/.gnupg/S.gpg-agent.extra' is too long
		 * BSD 4.4 max length = 104
		 */
		if (80 < \strlen($homedir)) {
			// First try a symbolic link
			$link = \sys_get_temp_dir() . '/snappymail';
			if (\is_dir($link) || \mkdir($link, 0700, true)) {
				$link = $tmpdir . '/' . \md5($homedir);
				if (\is_link($homedir) || \symlink($homedir, $link)) {
					$homedir = $link;
				}
			}
			// Else try ~/.gnupg/ + hash(email address)
			if (80 < \strlen($homedir)) {
				$homedir = ($_SERVER['HOME'] ?: \exec('echo ~')) . '/.gnupg/';
				if ($oAccount instanceof \RainLoop\Model\AdditionalAccount) {
					$homedir .= \sha1($oAccount->ParentEmail());
				} else {
					$homedir .= \sha1($oAccount->Email());
				}
			}
		}

		return \SnappyMail\PGP\GnuPG::getInstance($homedir);
	}

	public function DoGnupgGetKeys() : array
	{
		$GPG = $this->GnuPG();
		if ($GPG) {
			$keys = [];
			/**
			 * PECL GnuPG can't list private
			 *
			 * gpg --list-secret-keys
			 * gpg --list-public-keys
			 */
			foreach ($GPG->keyInfo('') as $info) {
				if (!$info['disabled'] && !$info['expired'] && !$info['revoked']) {
					$info['can_verify'] = $info['can_sign'];
					$info['can_sign'] = $info['can_decrypt'] = false;
					foreach ($info['subkeys'] as $key)  {
						$hasKey = $GPG->hasPrivateKey($key['keygrip']);
						$info['can_sign'] = $info['can_sign'] || ($info['can_verify'] && $hasKey);
						$info['can_decrypt'] = $info['can_decrypt'] || ($info['can_encrypt'] && $hasKey);
					}
					foreach ($info['uids'] as $uid)  {
						$id = $uid['email'];
						if (isset($keys[$id])) {
							// Public Key tasks
							$keys[$id]['can_verify'] = $keys[$id]['can_verify'] || $info['can_verify'];
							$keys[$id]['can_encrypt'] = $keys[$id]['can_encrypt'] || $info['can_encrypt'];
							// Private Key tasks
							$keys[$id]['can_sign'] = $keys[$id]['can_sign'] || $info['can_sign'];
							$keys[$id]['can_decrypt'] = $keys[$id]['can_decrypt'] || $info['can_decrypt'];
						} else {
							$keys[$id] = [
								'name' => $uid['name'],
								'email' => $uid['email'],
								// Public Key tasks
								'can_verify' => $info['can_sign'],
								'can_encrypt' => $info['can_encrypt'],
								// Private Key tasks
								'can_sign' => $info['can_sign'],
								'can_decrypt' => $info['can_decrypt']
							];
						}
					}
				}
			}
			return $this->DefaultResponse(__FUNCTION__, $keys);
		}
		return $this->FalseResponse(__FUNCTION__);
	}

	public function DoGnupgImportKey() : array
	{
		$sKey = $this->GetActionParam('Key', '');
		$sKeyId = $this->GetActionParam('KeyId', '');
		$sEmail = $this->GetActionParam('Email', '');

		if (!$sKey) {
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
					$sKey = \SnappyMail\PGP\Keyservers::get($sKeyId);
				}
			} catch (\Throwable $e) {
				// ignore
			}
		}

		$GPG = $sKey ? $this->GnuPG() : null;
		return $GPG
			? $this->DefaultResponse(__FUNCTION__, $GPG->import($sKey))
			: $this->FalseResponse(__FUNCTION__);
	}
}
