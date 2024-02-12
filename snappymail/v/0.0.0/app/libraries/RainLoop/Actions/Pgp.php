<?php

namespace RainLoop\Actions;

use SnappyMail\PGP\Backup;
use SnappyMail\PGP\Keyservers;
use SnappyMail\PGP\GnuPG;

trait Pgp
{
	/**
	 * Also see trait Messages::DoMessagePgpVerify
	 */

	public function DoGetPGPKeys() : array
	{
		$result = [];

		$keys = Backup::getKeys();
		foreach ($keys['public'] as $key) {
			$result[] = $key['value'];
		}
		foreach ($keys['private'] as $key) {
			$result[] = $key['value'];
		}

		$GPG = $this->GnuPG();
		if ($GPG) {
			$keys = $GPG->keyInfo('');
			foreach ($keys['public'] as $key) {
				$key = $GPG->export($key['subkeys'][0]['fingerprint'] ?: $key['subkeys'][0]['keyid']);
				if ($key) {
					$result[] = $key;
				}
			}
		}

		return $this->DefaultResponse(\array_values(\array_unique($result)));
	}

	public function DoSearchPGPKey() : array
	{
		$result = Keyservers::get(
			$this->GetActionParam('query', '')
		);
		return $this->DefaultResponse($result ?: false);
	}

	/**
	 * @throws \MailSo\RuntimeException
	 */
	public function GnuPG() : ?GnuPG
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

		return GnuPG::getInstance($homedir);
	}

	public function DoGnupgDecrypt() : array
	{
		$GPG = $this->GnuPG();
		if (!$GPG) {
			return $this->FalseResponse();
		}

		$GPG->addDecryptKey(
			$this->GetActionParam('keyId', ''),
			$this->GetActionParam('passphrase', '')
		);

		$sData = $this->GetActionParam('data', '');
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
				$this->GetActionParam('folder', ''),
				(int) $this->GetActionParam('uid', ''),
				$this->GetActionParam('partId', '')
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
			$this->GetActionParam('keyId', ''),
			$this->GetActionParam('passphrase', '')
		) : false);
	}

	public function DoGnupgGenerateKey() : array
	{
		$fingerprint = false;
		$GPG = $this->GnuPG();
		if ($GPG) {
			$sName = $this->GetActionParam('name', '');
			$sEmail = $this->GetActionParam('email', '');
			$fingerprint = $GPG->generateKey(
				$sName ? "{$sName} <{$sEmail}>" : $sEmail,
				$this->GetActionParam('passphrase', '')
			);
		}
		return $this->DefaultResponse($fingerprint);
	}

	public function DoGnupgDeleteKey() : array
	{
		$GPG = $this->GnuPG();
		$sKeyId = $this->GetActionParam('keyId', '');
		$bPrivate = !!$this->GetActionParam('isPrivate', 0);
		return $this->DefaultResponse($GPG ? $GPG->deleteKey($sKeyId, $bPrivate) : false);
	}

	public function DoPgpImportKey() : array
	{
		$sKey = $this->GetActionParam('key', '');
		$sKeyId = $this->GetActionParam('keyId', '');
		$sEmail = $this->GetActionParam('email', '');

		if (!$sKey) {
			try {
				if (!$sKeyId) {
					if (\preg_match('/[^\\s<>]+@[^\\s<>]+/', $sEmail, $aMatch)) {
						$sEmail = $aMatch[0];
					}
					if ($sEmail) {
						$aKeys = Keyservers::index($sEmail);
						if ($aKeys) {
							$sKeyId = $aKeys[0]['keyid'];
						}
					}
				}
				if ($sKeyId) {
					$sKey = Keyservers::get($sKeyId);
				}
			} catch (\Throwable $e) {
				// ignore
			}
		}

		$result = false;
		if ($sKey) {
			$sKey = \trim($sKey);
			if ($this->GetActionParam('backup', '')) {
				$result = $result || Backup::PGPKey($sKey);
			}
			if ($this->GetActionParam('gnuPG', '') && ($GPG = $this->GnuPG())) {
				$result = $result || $GPG->import($sKey);
			}
		}

		return $this->DefaultResponse($result);
	}

	/**
	 * Used to import keys in OpenPGP.js
	 * Handy when using multiple browsers
	 */
	public function DoGetStoredPGPKeys() : array
	{
		return $this->DefaultResponse(Backup::getKeys());
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
			'onServer' => [false, false],
			'inGnuPG'  => [false, false]
		];

		$onServer = (int) $this->GetActionParam('onServer', 0);
		if ($publicKey && $onServer & 1) {
			$result['onServer'][0] = Backup::PGPKey($publicKey);
		}
		if ($privateKey && $onServer & 2) {
			$result['onServer'][1] = Backup::PGPKey($privateKey);
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
		$key = $this->GetActionParam('key', '');
		$keyId = $this->GetActionParam('keyId', '');
		return $this->DefaultResponse(($key && $keyId && Backup::PGPKey($key, $keyId)));
	}
}
