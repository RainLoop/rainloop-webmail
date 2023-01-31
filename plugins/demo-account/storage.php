<?php

use RainLoop\Providers\Storage\Enumerations\StorageType;

class DemoStorage extends \RainLoop\Providers\Storage\FileStorage
{
	private static $gc_done;

	/**
	 * @param \RainLoop\Model\Account|string|null $mAccount
	 */
	public function GenerateFilePath($mAccount, int $iStorageType, bool $bMkDir = false) : string
	{
		$sEmail = '';
		if ($mAccount instanceof \RainLoop\Model\MainAccount) {
			$sEmail = $mAccount->Email();
		} else if (\is_string($mAccount)) {
			$sEmail = $mAccount;
		}
		if ($sEmail != $this->sDemoEmail) {
			return parent::GenerateFilePath($mAccount, $iStorageType, $bMkDir);
		}

		$sDataPath = "{$this->sDataPath}/demo";

		// Garbage collection
		if (!static::$gc_done) {
			static::$gc_done = true;
			if (!\random_int(0, \max(50, \ini_get('session.gc_divisor')))) {
				\MailSo\Base\Utils::RecTimeDirRemove($sDataPath, 3600 * 3); // 3 hours
			}
		}

		$sDataPath .= '/' . \MailSo\Base\Utils::SecureFileName(\RainLoop\Utils::GetConnectionToken());
		if (!\is_dir($sDataPath) && \mkdir($sDataPath, 0700, true)) {
			\file_put_contents("{$sDataPath}/settings",'{"RemoveColors":true,"ListInlineAttachments":true}');
			if (\mkdir($sDataPath.'/.gnupg/private-keys-v1.d', 0700, true)) {
				// AES
				\file_put_contents("{$sDataPath}/.gnupg/private-keys-v1.d/3106F4281F98D820114228FEF16B5BA0D78AA005.key",file_get_contents("{$this->sDataPath}/demo.pgp/.gnupg/private-keys-v1.d/3106F4281F98D820114228FEF16B5BA0D78AA005.key"));
				\file_put_contents("{$sDataPath}/.gnupg/private-keys-v1.d/82CA239C482423D364BFD6DFC3E400B3B98AD66F.key",file_get_contents("{$this->sDataPath}/demo.pgp/.gnupg/private-keys-v1.d/82CA239C482423D364BFD6DFC3E400B3B98AD66F.key"));
				// ECC
				\file_put_contents("{$sDataPath}/.gnupg/private-keys-v1.d/5A1A6C7310D0508C68E8E74F15068301E83FD1AE.key",file_get_contents("{$this->sDataPath}/demo.pgp/.gnupg/private-keys-v1.d/5A1A6C7310D0508C68E8E74F15068301E83FD1AE.key"));
				\file_put_contents("{$sDataPath}/.gnupg/private-keys-v1.d/886921A7E06BE56F8E8C51797BB476BB26DF21BF.key",file_get_contents("{$this->sDataPath}/demo.pgp/.gnupg/private-keys-v1.d/886921A7E06BE56F8E8C51797BB476BB26DF21BF.key"));

				\file_put_contents("{$sDataPath}/.gnupg/pubring.kbx",file_get_contents("{$this->sDataPath}/demo.pgp/.gnupg/pubring.kbx"));
				\file_put_contents("{$sDataPath}/.gnupg/trustdb.gpg",file_get_contents("{$this->sDataPath}/demo.pgp/.gnupg/trustdb.gpg"));
			}
		}

		if (StorageType::SIGN_ME === $iStorageType) {
			$sDataPath .= '/.sign_me';
		} else if (StorageType::SESSION === $iStorageType) {
			$sDataPath .= '/.sessions';
		} else if (StorageType::PGP === $iStorageType) {
			$sDataPath .= '/.pgp';
			$sDataPath = "{$this->sDataPath}/demo.pgp/.pgp";
			$bMkDir = true;
		}

		if ($bMkDir && !\is_dir($sDataPath) && !\mkdir($sDataPath, 0700, true))
		{
			throw new \RainLoop\Exceptions\Exception('Can\'t make storage directory "'.$sDataPath.'"');
		}

		return $sDataPath . '/';
	}

	private $sDemoEmail;
	public function setDemoEmail(string $sEmail)
	{
		$this->sDemoEmail = $sEmail;
	}
}
