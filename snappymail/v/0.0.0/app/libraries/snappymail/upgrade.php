<?php

namespace SnappyMail;

use RainLoop\Providers\Storage\Enumerations\StorageType;

abstract class Upgrade
{

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
				try {
					$aNewAccounts[$sEmail] = [
						'account',
						$sEmail,
						$sEmail,
						'',
						'',
						'',
						'',
						$oMainAccount->Email(),
						\hash_hmac('sha1', '', $sHash)
					];
					if (!$sToken) {
						\error_log("ConvertInsecureAccount {$sEmail} no token");
						continue;
					}
					$aAccountHash = \RainLoop\Utils::DecodeKeyValues($sToken);
					if (empty($aAccountHash[0]) || 'token' !== $aAccountHash[0] // simple token validation
						|| 8 > \count($aAccountHash) // length checking
					) {
						\error_log("ConvertInsecureAccount {$sEmail} invalid aAccountHash: " . \print_r($aAccountHash,1));
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
					\error_log("ConvertInsecureAccount {$sEmail} failed");
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
			$aData = \json_decode($sData);
			if (!$aData) {
				$aData = \RainLoop\Utils::DecodeKeyValues($sData);
				if ($aData) {
					$oActions->setContactsSyncData($oAccount, $aData);
					return array(
						'Enable' => isset($aData['Enable']) ? !!$aData['Enable'] : false,
						'Url' => isset($aData['Url']) ? \trim($aData['Url']) : '',
						'User' => isset($aData['User']) ? \trim($aData['User']) : '',
						'Password' => isset($aData['Password']) ? $aData['Password'] : ''
					);
				}
			}
		}
		return null;
	}

}
