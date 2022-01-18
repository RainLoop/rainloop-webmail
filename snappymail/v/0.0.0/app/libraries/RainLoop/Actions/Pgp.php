<?php

namespace RainLoop\Actions;

trait Pgp
{
	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function GnuPG() : ?\gnupg
	{
		if (\class_exists('gnupg')) {
			$pgp_dir = $this->StorageProvider()->GenerateFilePath(
				$this->getAccountFromToken(),
				\RainLoop\Providers\Storage\Enumerations\StorageType::PGP
			);
			return new \gnupg(['home_dir' => \dirname($pgp_dir) . '/.gnupg']);
		}
		return null;
	}

	public function DoImportKey() : array
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

		return $sPublicKey
			? $this->DefaultResponse(__FUNCTION__, $this->GnuPG()->import($sPublicKey))
			: $this->FalseResponse(__FUNCTION__);
	}
}
