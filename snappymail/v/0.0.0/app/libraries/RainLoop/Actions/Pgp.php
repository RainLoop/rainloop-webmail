<?php

namespace RainLoop\Actions;

use SnappyMail\PGP\Backup;
use SnappyMail\PGP\Keyservers;
use SnappyMail\PGP\GnuPG;
use MailSo\Imap\Enumerations\FetchType;
use MailSo\Mime\Enumerations\Header as MimeEnumHeader;

trait Pgp
{
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

	public function DoPgpSearchKey() : array
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
			\is_dir($tmpdir) || \mkdir($tmpdir, 0700);
			if (\is_dir($tmpdir) && \is_writable($tmpdir)) {
				$link = $tmpdir . '/' . \md5($homedir);
				if (\is_link($link) || \symlink($homedir, $link)) {
					$homedir = $link;
				} else {
					$this->logWrite("symlink('{$homedir}', '{$link}') failed", \LOG_WARNING, 'GnuPG');
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

		$oPassphrase = new \SnappyMail\SensitiveString($this->GetActionParam('passphrase', ''));

		$GPG->addDecryptKey($this->GetActionParam('keyId', ''), $oPassphrase);

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

		if ($oPart && $oPart->isPgpSigned()) {
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
		$oPassphrase = $this->GetActionParam('isPrivate', '')
			? new \SnappyMail\SensitiveString($this->GetActionParam('passphrase', ''))
			: null;
		$GPG = $this->GnuPG();
		return $this->DefaultResponse($GPG ? $GPG->export(
			$this->GetActionParam('keyId', ''),
			$oPassphrase
		) : false);
	}

	public function DoGnupgGenerateKey() : array
	{
		$fingerprint = false;
		$GPG = $this->GnuPG();
		if ($GPG) {
			$sName = $this->GetActionParam('name', '');
			$sEmail = $this->GetActionParam('email', '');
			$oPassphrase = new \SnappyMail\SensitiveString($this->GetActionParam('passphrase', ''));
			$fingerprint = $GPG->generateKey(
				$sName ? "{$sName} <{$sEmail}>" : $sEmail,
				$oPassphrase
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

		$result = [];
		if ($sKey) {
			$sKey = \trim($sKey);
			$result['backup'] = $this->GetActionParam('backup', '') && Backup::PGPKey($sKey);
			$result['gnuPG'] = $this->GetActionParam('gnuPG', '') && ($GPG = $this->GnuPG()) && $GPG->import($sKey);
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

	/**
	 * https://datatracker.ietf.org/doc/html/rfc3156#section-5
	 */
	public function DoPgpVerifyMessage() : array
	{
		$sBodyPart = $this->GetActionParam('bodyPart', '');
		if ($sBodyPart) {
			$result = [
				'text' => \preg_replace('/\\r?\\n/su', "\r\n", $sBodyPart),
				'signature' => $this->GetActionParam('sigPart', '')
			];
		} else {
			$sFolderName = $this->GetActionParam('folder', '');
			$iUid = (int) $this->GetActionParam('uid', 0);
			$sBodyPartId = $this->GetActionParam('bodyPartId', '');
			$sSigPartId = $this->GetActionParam('sigPartId', '');
//			$sMicAlg = $this->GetActionParam('micAlg', '');

			$this->initMailClientConnection();
			$oImapClient = $this->ImapClient();
			$oImapClient->FolderExamine($sFolderName);

			$aParts = [
				FetchType::BODY_PEEK.'['.$sBodyPartId.']',
				// An empty section specification refers to the entire message, including the header.
				// But Dovecot does not return it with BODY.PEEK[1], so we also use BODY.PEEK[1.MIME].
				FetchType::BODY_PEEK.'['.$sBodyPartId.'.MIME]'
			];
			if ($sSigPartId) {
				$aParts[] = FetchType::BODY_PEEK.'['.$sSigPartId.']';
			}

			$oFetchResponse = $oImapClient->Fetch($aParts, $iUid, true)[0];

			$sBodyMime = $oFetchResponse->GetFetchValue(FetchType::BODY.'['.$sBodyPartId.'.MIME]');
			if ($sSigPartId) {
				$result = [
					'text' => \preg_replace('/\\r?\\n/su', "\r\n",
						$sBodyMime . $oFetchResponse->GetFetchValue(FetchType::BODY.'['.$sBodyPartId.']')
					),
					'signature' => preg_replace('/[^\x00-\x7F]/', '',
						$oFetchResponse->GetFetchValue(FetchType::BODY.'['.$sSigPartId.']')
					)
				];
			} else {
				// clearsigned text
				$result = [
					'text' => $oFetchResponse->GetFetchValue(FetchType::BODY.'['.$sBodyPartId.']'),
					'signature' => ''
				];
				$decode = (new \MailSo\Mime\HeaderCollection($sBodyMime))->ValueByName(MimeEnumHeader::CONTENT_TRANSFER_ENCODING);
				if ('base64' === $decode) {
					$result['text'] = \base64_decode($result['text']);
				} else if ('quoted-printable' === $decode) {
					$result['text'] = \quoted_printable_decode($result['text']);
				}
			}
		}

		// Try by default as OpenPGP.js sets useGnuPG to 0
		if ($this->GetActionParam('tryGnuPG', 1)) {
			$GPG = $this->GnuPG();
			if ($GPG) {
				$info = $this->GnuPG()->verify($result['text'], $result['signature']);
//				$info = $this->GnuPG()->verifyStream($fp, $result['signature']);
				if (empty($info[0])) {
					$result = false;
				} else {
					$info = $info[0];

					/**
					* https://code.woboq.org/qt5/include/gpg-error.h.html
					* status:
						0 = GPG_ERR_NO_ERROR
						1 = GPG_ERR_GENERAL
						9 = GPG_ERR_NO_PUBKEY
						117440513 = General error
						117440520 = Bad signature
					*/

					$summary = \defined('GNUPG_SIGSUM_VALID') ? [
						GNUPG_SIGSUM_VALID => 'The signature is fully valid.',
						GNUPG_SIGSUM_GREEN => 'The signature is good but one might want to display some extra information. Check the other bits.',
						GNUPG_SIGSUM_RED => 'The signature is bad. It might be useful to check other bits and display more information, i.e. a revoked certificate might not render a signature invalid when the message was received prior to the cause for the revocation.',
						GNUPG_SIGSUM_KEY_REVOKED => 'The key or at least one certificate has been revoked.',
						GNUPG_SIGSUM_KEY_EXPIRED => 'The key or one of the certificates has expired. It is probably a good idea to display the date of the expiration.',
						GNUPG_SIGSUM_SIG_EXPIRED => 'The signature has expired.',
						GNUPG_SIGSUM_KEY_MISSING => 'Can’t verify due to a missing key or certificate.',
						GNUPG_SIGSUM_CRL_MISSING => 'The CRL (or an equivalent mechanism) is not available.',
						GNUPG_SIGSUM_CRL_TOO_OLD => 'Available CRL is too old.',
						GNUPG_SIGSUM_BAD_POLICY => 'A policy requirement was not met.',
						GNUPG_SIGSUM_SYS_ERROR => 'A system error occurred.',
//						GNUPG_SIGSUM_TOFU_CONFLICT = 'A TOFU conflict was detected.',
					] : [];

					// Verified, so no need to return $result['text'] and $result['signature']
					$result = [
						'fingerprint' => $info['fingerprint'],
						'validity' => $info['validity'],
						'status' => $info['status'],
						'summary' => $info['summary'],
						'message' => \implode("\n", \array_filter($summary, function($k) use ($info) {
							return $info['summary'] & $k;
						}, ARRAY_FILTER_USE_KEY))
					];
				}
			} else {
				$result = false;
			}
		}

		return $this->DefaultResponse($result);
	}
}
