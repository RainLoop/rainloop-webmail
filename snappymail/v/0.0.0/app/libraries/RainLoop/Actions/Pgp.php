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
			$tmpdir = \sys_get_temp_dir() . '/snappymail';
			if (\is_dir($tmpdir) || \mkdir($tmpdir, 0700, true)) {
				$link = $tmpdir . '/' . \md5($homedir);
				if (\is_link($link) || \symlink($homedir, $link)) {
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
		return $GPG
			? $this->DefaultResponse(__FUNCTION__, $GPG->keyInfo(''))
			: $this->FalseResponse(__FUNCTION__);
	}

	public function DoGnupgGenerateKey() : array
	{
		$fingerprint = false;
		$GPG = $this->GnuPG();
		if ($GPG) {
			$sName = $this->GetActionParam('Name', '');
			$sEmail = $this->GetActionParam('Email', '');
			$fingerprint = $GPG->generateKey(
				$sName ? "{$sName} <{$sEmail}>" : $sEmail,
				$this->GetActionParam('Passphrase', '')
			);
		}
		return $fingerprint
			? $this->DefaultResponse(__FUNCTION__, $fingerprint)
			: $this->FalseResponse(__FUNCTION__);
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
