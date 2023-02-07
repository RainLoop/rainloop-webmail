<?php

namespace SnappyMail;

use RainLoop\Providers\Storage\Enumerations\StorageType;

abstract class Upgrade
{

	public static function FileStorage(string $sDataPath)
	{
		// /cfg/ex/example@example.com
		foreach (\glob("{$sDataPath}/cfg/*", GLOB_ONLYDIR) as $sOldDir) {
			foreach (\glob("{$sOldDir}/*", GLOB_ONLYDIR) as $sDomainDir) {
				$aEmail = \explode('@', \basename($sDomainDir));
				$sDomain = \trim(1 < \count($aEmail) ? \array_pop($aEmail) : '');
				$sNewDir = $sDataPath
					.'/'.\MailSo\Base\Utils::SecureFileName($sDomain ?: 'unknown.tld')
					.'/'.\MailSo\Base\Utils::SecureFileName(\implode('@', $aEmail) ?: '.unknown');
				if (\is_dir($sNewDir) || \mkdir($sNewDir, 0700, true)) {
					foreach (\glob("{$sDomainDir}/*") as $sItem) {
						$sName = \basename($sItem);
						if ('sign_me' === $sName) {
							// Security issue
							// https://github.com/RainLoop/rainloop-webmail/issues/2133
							\unlink($sItem);
						} else {
							\rename($sItem, "{$sNewDir}/{$sName}");
						}
					}
					\MailSo\Base\Utils::RecRmDir($sDomainDir);
				}
			}
		}
		\MailSo\Base\Utils::RecRmDir("{$sDataPath}/cfg");
		\MailSo\Base\Utils::RecRmDir("{$sDataPath}/data");
		\MailSo\Base\Utils::RecRmDir("{$sDataPath}/files");
	}

	/**
	 * Attempt to convert the old less secure data into better secured data
	 */
	public static function ConvertInsecureAccounts(\RainLoop\Actions $oActions, \RainLoop\Model\MainAccount $oMainAccount) : array
	{
		$oStorage = $oActions->StorageProvider();
		$sAccounts = $oStorage->Get($oMainAccount, StorageType::CONFIG, 'accounts');
		if (!$sAccounts || '{' !== $sAccounts[0]) {
			return [];
		}

		$aAccounts = \json_decode($sAccounts, true);
		if (!$aAccounts || !\is_array($aAccounts)) {
			return [];
		}

		$aNewAccounts = [];
		if (1 < \count($aAccounts)) {
			$sOrder = $oStorage->Get($oMainAccount, StorageType::CONFIG, 'accounts_identities_order');
			$aOrder = $sOrder ? \json_decode($sOrder, true) : [];
			if (!empty($aOrder['Accounts']) && \is_array($aOrder['Accounts']) && 1 < \count($aOrder['Accounts'])) {
				$aAccounts = \array_filter(\array_merge(
					\array_fill_keys($aOrder['Accounts'], null),
					$aAccounts
				));
			}
			$sHash = $oMainAccount->CryptKey();
			foreach ($aAccounts as $sEmail => $sToken) {
				if ($oMainAccount->Email() == $sEmail) {
					continue;
				}
				try {
					$aNewAccounts[$sEmail] = [
						'account',
						$sEmail,
						$sEmail, // sLogin
						'',      // sPassword
						'',      // sClientCert
						'',      // sProxyAuthUser
						'',      // sProxyAuthPassword
						\hash_hmac('sha1', '', $sHash)
					];
					if (!$sToken) {
						\SnappyMail\Log::warning('UPGRADE', "ConvertInsecureAccount {$sEmail} no token");
						continue;
					}
					$aAccountHash = static::DecodeKeyValues($sToken);
					if (empty($aAccountHash[0]) || 'token' !== $aAccountHash[0] // simple token validation
						|| 8 > \count($aAccountHash) // length checking
					) {
						\SnappyMail\Log::warning('UPGRADE', "ConvertInsecureAccount {$sEmail} invalid aAccountHash: " . \print_r($aAccountHash,1));
						continue;
					}
					$aAccountHash[3] = Crypt::EncryptUrlSafe($aAccountHash[3], $sHash);
					$aNewAccounts[$sEmail] = [
						'account',
						$aAccountHash[1],
						$aAccountHash[2],
						$aAccountHash[3],
						$aAccountHash[11],
						$aAccountHash[8],
						$aAccountHash[9],
						$oMainAccount->Email(),
						\hash_hmac('sha1', $aAccountHash[3], $sHash)
					];
				} catch (\Throwable $e) {
					\SnappyMail\Log::warning('UPGRADE', "ConvertInsecureAccount {$sEmail} failed");
				}
			}

			$oActions->SetAccounts($oMainAccount, $aNewAccounts);
		}

		$oStorage->Clear($oMainAccount, StorageType::CONFIG, 'accounts');

		return $aNewAccounts;
	}

	/**
	 * Attempt to convert the old less secure data into better secured data
	 */
	public static function ConvertInsecureContactsSync(\RainLoop\Actions $oActions, \RainLoop\Model\Account $oAccount) : ?array
	{
		$sData = $oActions->StorageProvider()->Get($oAccount,
			\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
			'contacts_sync'
		);

		if (!empty($sData)) {
			$aData = \json_decode($sData, true);
			if (!$aData) {
				$aData = static::DecodeKeyValues($sData);
				if ($aData) {
					$oActions->setContactsSyncData($oAccount, $aData);
					return array(
						'Mode' => empty($aData['Enable']) ? 0 : 1,
						'Url' => isset($aData['Url']) ? \trim($aData['Url']) : '',
						'User' => isset($aData['User']) ? \trim($aData['User']) : '',
						'Password' => isset($aData['Password']) ? $aData['Password'] : ''
					);
				}
			}
		}
		return null;
	}

	/**
	 * Decodes old less secure data
	 */
	private static function DecodeKeyValues(string $sData) : array
	{
		$sData = \MailSo\Base\Utils::UrlSafeBase64Decode($sData);
		if (!\strlen($sData)) {
			return '';
		}
		$sKey = \md5(APP_SALT);
		$sData = \is_callable('xxtea_decrypt')
			? \xxtea_decrypt($sData, $sKey)
			: \MailSo\Base\Xxtea::decrypt($sData, $sKey);
		try {
			return \json_decode($sData, true, 512, JSON_THROW_ON_ERROR) ?: array();
		} catch (\Throwable $e) {
			return \unserialize($sData) ?: array();
		}
	}

	public static function backup() : string
	{
		if (!\class_exists('PharData')) {
			throw new \Exception('PHP Phar is disabled, you must enable it');
		}
//		$tar_destination = APP_DATA_FOLDER_PATH . APP_VERSION . '.tar';
		$tar_destination = APP_DATA_FOLDER_PATH . 'backup-' . \date('YmdHis') . '.tar';
		$tar = new \PharData($tar_destination);
		$files = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator(APP_DATA_FOLDER_PATH . '_data_'), \RecursiveIteratorIterator::SELF_FIRST);
		$l = \strlen(APP_DATA_FOLDER_PATH);
		foreach ($files as $file) {
			$file = \str_replace('\\', '/', $file);
			if (\is_file($file) && !\strpos($file, '/cache/')) {
				$tar->addFile($file, \substr($file, $l));
			}
		}
		$tar->compress(\Phar::GZ);
		\unlink($tar_destination);
		return $tar_destination . '.gz';
	}

	public static function core() : bool
	{
		$bResult = false;
		if (Repository::canUpdateCore()) {
			$sTmp = null;
			try {
				static::backup();

				$sTmp = Repository::downloadCore();
				if (!$sTmp) {
					throw new \Exception('Failed to download latest SnappyMail');
				}
				$target = \rtrim(APP_INDEX_ROOT_PATH, '\\/');
				if (\class_exists('PharData')) {
					$oArchive = new \PharData($sTmp, 0, null, \Phar::GZ);
				} else {
					$oArchive = new \SnappyMail\TAR($sTmp);
				}
				\error_log('Extract to ' . $target);
//				$bResult = $oArchive->extractTo($target, null, true);
				$bResult = $oArchive->extractTo($target, 'snappymail/')
					&& $oArchive->extractTo($target, 'index.php', true);
				if (!$bResult) {
					throw new \Exception('Extract core files failed');
				}

				static::fixPermissions();

				\error_log('Update success');
				// opcache_reset is a terrible solution
//				\is_callable('opcache_reset') && \opcache_reset();
				\is_callable('opcache_invalidate') && \opcache_invalidate($target.'/index.php', true);
			} finally {
				$sTmp && \unlink($sTmp);
			}
		}
		return $bResult;
	}

	// Prevents Apache access error due to directories being 0700
	public static function fixPermissions($mode = 0755) : void
	{
		\umask(0022);
		$target = \rtrim(APP_INDEX_ROOT_PATH, '\\/');
		// Prevent Apache access error due to directories being 0700
		foreach (\glob("{$target}/snappymail/v/*",  \GLOB_ONLYDIR) as $dir) {
			\chmod($dir, 0755);
			foreach (['static','themes'] as $folder) {
				$iterator = new \RecursiveIteratorIterator(
					new \RecursiveDirectoryIterator("{$dir}/{$folder}", \FilesystemIterator::SKIP_DOTS),
					\RecursiveIteratorIterator::SELF_FIRST
				);
				foreach ($items as $item) {
					if ($item->isDir()) {
						\chmod($item, 0755);
					} else if ($item->isFile()) {
						\chmod($item, 0644);
					}
				}
			}
		}
	}

}
