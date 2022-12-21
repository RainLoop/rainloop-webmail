<?php

namespace RainLoop\Actions;

trait Pgp
{
	/**
	 * Also see trait Messages::DoMessagePgpVerify
	 */

	/**
	 * @throws \MailSo\RuntimeException
	 */
	public function GnuPG() : ?\SnappyMail\PGP\GnuPG
	{
		$oAccount = $this->getMainAccountFromToken();
		if (!$oAccount) {
			return null;
		}

		$homedir = \rtrim($this->StorageProvider()->GenerateFilePath(
			$oAccount,
			\RainLoop\Providers\Storage\Enumerations\StorageType::ROOT
		), '/') . '/.gnupg';

		if (!\is_dir($homedir)) {
			\mkdir($homedir, 0700, true);
		}
		if (!\is_writable($homedir)) {
			throw new \Exception("gpg homedir '{$homedir}' not writable");
		}

		/**
		 * Workaround error: socket name for '/very/long/path/to/.gnupg/S.gpg-agent.extra' is too long
		 * BSD 4.4 max length = 104
		 */
		if (80 < \strlen($homedir)) {
			\clearstatcache();
			// First try a symbolic link
			$tmpdir = \sys_get_temp_dir() . '/snappymail';
//			if (\RainLoop\Utils::inOpenBasedir($tmpdir) &&
			is_dir($tmpdir) || \mkdir($tmpdir, 0700);
			if (\is_dir($tmpdir) && \is_writable($tmpdir)) {
				$link = $tmpdir . '/' . \md5($homedir);
				if (\is_link($link) || \symlink($homedir, $link)) {
					$homedir = $link;
				} else {
					\error_log("symlink('{$homedir}', '{$link}') failed");
				}
			}
			// Else try ~/.gnupg/ + hash(email address)
			if (80 < \strlen($homedir)) {
				$tmpdir = ($_SERVER['HOME'] ?: \exec('echo ~') ?: \dirname(\getcwd())) . '/.gnupg/';
				if ($oAccount instanceof \RainLoop\Model\AdditionalAccount) {
					$tmpdir .= \sha1($oAccount->ParentEmail());
				} else {
					$tmpdir .= \sha1($oAccount->Email());
				}
//				if (\RainLoop\Utils::inOpenBasedir($tmpdir) &&
				if (\is_dir($tmpdir) || \is_link($tmpdir) || \symlink($homedir, $tmpdir) || \mkdir($tmpdir, 0700, true)) {
					$homedir = $tmpdir;
				}
			}

			if (104 <= \strlen($homedir . '/S.gpg-agent.extra')) {
				throw new \Exception("socket name for '{$homedir}/S.gpg-agent.extra' is too long");
			}
		}

		return \SnappyMail\PGP\GnuPG::getInstance($homedir);
	}

	public function DoGnupgDecrypt() : array
	{
		$GPG = $this->GnuPG();
		if (!$GPG) {
			return $this->FalseResponse();
		}

		$GPG->addDecryptKey(
			$this->GetActionParam('KeyId', ''),
			$this->GetActionParam('Passphrase', '')
		);

		$sData = $this->GetActionParam('Data', '');
		$oPart = null;
		$result = [
			'data' => '',
			'signatures' => []
		];
		if ($sData) {
			$result = $GPG->decrypt($sData);
//			$oPart = \MailSo\Mime\Part::FromString($result);
		} else {
			$this->initMailClientConnection();
			$this->MailClient()->MessageMimeStream(
				function ($rResource) use ($GPG, &$result, &$oPart) {
					if (\is_resource($rResource)) {
						$result['data'] = $GPG->decryptStream($rResource);
//						$oPart = \MailSo\Mime\Part::FromString($result);
//						$GPG->decryptStream($rResource, $rStreamHandle);
//						$oPart = \MailSo\Mime\Part::FromStream($rStreamHandle);
					}
				},
				$this->GetActionParam('Folder', ''),
				(int) $this->GetActionParam('Uid', ''),
				$this->GetActionParam('PartId', '')
			);
		}

		if ($oPart && $oPart->IsPgpSigned()) {
//			$GPG->verifyStream($oPart->SubParts[0]->Body, \stream_get_contents($oPart->SubParts[1]->Body));
//			$result['signatures'] = $oPart->SubParts[0];
		}

		return $this->DefaultResponse($result);
	}

	public function DoGnupgGetKeys() : array
	{
		$GPG = $this->GnuPG();
		return $this->DefaultResponse($GPG ? $GPG->keyInfo('') : false);
	}

	public function DoGnupgExportKey() : array
	{
		$GPG = $this->GnuPG();
		return $this->DefaultResponse($GPG ? $GPG->export(
			$this->GetActionParam('KeyId', ''),
			$this->GetActionParam('Passphrase', '')
		) : false);
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
		return $this->DefaultResponse($fingerprint);
	}

	public function DoGnupgDeleteKey() : array
	{
		$GPG = $this->GnuPG();
		$sKeyId = $this->GetActionParam('KeyId', '');
		$bPrivate = !!$this->GetActionParam('isPrivate', 0);
		return $this->DefaultResponse($GPG ? $GPG->deleteKey($sKeyId, $bPrivate) : false);
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
		return $this->DefaultResponse($GPG ? $GPG->import($sKey) : false);
	}

	/**
	 * Used to import keys in OpenPGP.js
	 * Handy when using multiple browsers
	 */
	public function DoGetStoredPGPKeys() : array
	{
		$oAccount = $this->getMainAccountFromToken();
		if (!$oAccount) {
			return null;
		}

		$dir = $this->StorageProvider()->GenerateFilePath(
			$oAccount,
			\RainLoop\Providers\Storage\Enumerations\StorageType::PGP
		);

		$keys = [];
		foreach (\glob("{$dir}/*") as $file) {
			if (\is_file($file)) {
				if ('.asc' === \substr($file, -4)) {
					$keys[] = \file_get_contents($file);
				} else if ('.key' === \substr($file, -4)) {
					$key = \json_decode(\file_get_contents($file), true);
					$mac = \array_pop($key);
					$hash = $oAccount->CryptKey();
					if ($mac === \hash_hmac('sha1', $key[2], $hash)) {
						$key[1] = \base64_decode($key[1]);
						$key[2] = \base64_decode($key[2]);
						$keys[] = \SnappyMail\Crypt::Decrypt($key, $hash);
					}
				}
			}
		}

		return $this->DefaultResponse($keys);
	}

	/**
	 * Used to store generated armored key pair from OpenPGP.js
	 * Handy when using multiple browsers
	 */
	public function DoPgpStoreKeyPair() : array
	{
		$publicKey  = $this->GetActionParam('publicKey', '');
		$privateKey = $this->GetActionParam('privateKey', '');

		$result = [
			'onServer' => [false, false, false],
			'inGnuPG'  => [false, false, false]
		];

		$onServer = (int) $this->GetActionParam('onServer', 0);
		if ($publicKey && $onServer & 1) {
			$result['onServer'][0] = $this->StorePGPKey($publicKey);
		}
		if ($privateKey && $onServer & 2) {
			$result['onServer'][1] = $this->StorePGPKey($privateKey);
		}

		$inGnuPG = (int) $this->GetActionParam('inGnuPG', 0);
		if ($inGnuPG) {
			$GPG = $this->GnuPG();
			if ($publicKey && $inGnuPG & 1) {
				$result['inGnuPG'][0] = $GPG->import($publicKey);
			}
			if ($privateKey && $inGnuPG & 2) {
				$result['inGnuPG'][1] = $GPG->import($privateKey);
			}
		}

//		$revocationCertificate = $this->GetActionParam('revocationCertificate', '');
		return $this->DefaultResponse($result);
	}

	/**
	 * Used to store key from OpenPGP.js
	 * Handy when using multiple browsers
	 */
	public function DoStorePGPKey() : array
	{
		$key = $this->GetActionParam('Key', '');
		$keyId = $this->GetActionParam('KeyId', '');
		return $this->DefaultResponse(($key && $keyId && $this->StorePGPKey($key, $keyId)));
	}

	private function StorePGPKey(string $key, string $keyId = '') : bool
	{
		$oAccount = $this->getMainAccountFromToken();
		if ($oAccount) {
			$keyId = $keyId ? "0x{$keyId}" : \sha1($key);
			$dir = $this->StorageProvider()->GenerateFilePath(
				$oAccount,
				\RainLoop\Providers\Storage\Enumerations\StorageType::PGP,
				true
			);
			if (\str_contains($key, 'PGP PRIVATE KEY')) {
				$hash = $oAccount->CryptKey();
				$key = \SnappyMail\Crypt::Encrypt($key, $hash);
				$key[1] = \base64_encode($key[1]);
				$key[2] = \base64_encode($key[2]);
				$key[] = \hash_hmac('sha1', $key[2], $hash);
				return !!\file_put_contents("{$dir}{$keyId}.key", \json_encode($key));
			}
			if (\str_contains($key, 'PGP PUBLIC KEY')) {
				return !!\file_put_contents("{$dir}{$keyId}_public.asc", $key);
			}
		}
		return false;
	}

}
