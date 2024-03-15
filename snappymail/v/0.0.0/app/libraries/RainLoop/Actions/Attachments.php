<?php

namespace RainLoop\Actions;

use RainLoop\Enumerations\Capa;
use RainLoop\Utils;

trait Attachments
{
	/**
	 * @throws \MailSo\RuntimeException
	 */
	public function DoAttachmentsActions() : array
	{
		$sAction = $this->GetActionParam('target', '');
		$sFolder = $this->GetActionParam('folder', '');
		$sFilename = \MailSo\Base\Utils::SecureFileName($this->GetActionParam('filename', ''));
		$aHashes = $this->GetActionParam('hashes', null);
		$oFilesProvider = $this->FilesProvider();
		if (empty($sAction) || !$this->GetCapa(Capa::ATTACHMENTS_ACTIONS) || !$oFilesProvider || !$oFilesProvider->IsActive()) {
			return $this->FalseResponse();
		}

		$oAccount = $this->initMailClientConnection();

		$bError = false;
		$aData = [];
		$mUIDs = [];

		if (\is_array($aHashes) && \count($aHashes)) {
			foreach ($aHashes as $sZipHash) {
				$aResult = $this->getMimeFileByHash($oAccount, $sZipHash);
				if (empty($aResult['data']) && empty($aResult['fileHash'])) {
					$bError = true;
					break;
				}
				$aData[] = $aResult;
				if (!empty($aResult['mimeIndex'])) {
					$mUIDs[$aResult['uid']] = $aResult['uid'];
				}
			}
		}
		$mUIDs = 1 < \count($mUIDs);

		if ($bError || !\count($aData)) {
			return $this->FalseResponse();
		}

		$mResult = false;
		switch (\strtolower($sAction))
		{
			case 'zip':

				$sZipHash = \MailSo\Base\Utils::Sha1Rand();
				$sZipFileName = $oFilesProvider->GenerateLocalFullFileName($oAccount, $sZipHash);

				if (!empty($sZipFileName)) {
					if (\class_exists('ZipArchive')) {
						$oZip = new \ZipArchive();
						$oZip->open($sZipFileName, \ZIPARCHIVE::CREATE | \ZIPARCHIVE::OVERWRITE);
						$oZip->setArchiveComment('SnappyMail/'.APP_VERSION);
						foreach ($aData as $aItem) {
							$sFileName = ($mUIDs ? "{$aItem['uid']}/" : ($sFolder ? "{$aItem['uid']}-" : '')) . $aItem['fileName'];
							if ($aItem['data']) {
								if (!$oZip->addFromString($sFileName, $aItem['data'])) {
									$bError = true;
								}
							} else {
								$sFullFileNameHash = $oFilesProvider->GetFileName($oAccount, $aItem['fileHash']);
								if (!$oZip->addFile($sFullFileNameHash, $sFileName)) {
									$bError = true;
								}
							}
						}

						if ($bError) {
							$oZip->close();
						} else {
							$bError = !$oZip->close();
						}
/*
					} else {
						@\unlink($sZipFileName);
						$oZip = new \SnappyMail\Stream\ZIP($sZipFileName);
//						$oZip->setArchiveComment('SnappyMail/'.APP_VERSION);
						foreach ($aData as $aItem) {
							if ($aItem['fileHash']) {
								$sFullFileNameHash = $oFilesProvider->GetFileName($oAccount, $aItem['fileHash']);
								if (!$oZip->addFile($sFullFileNameHash, $aItem['fileName'])) {
									$bError = true;
								}
							}
						}
						$oZip->close();
*/
					} else {
						@\unlink($sZipFileName);
						$oZip = new \PharData($sZipFileName . '.zip', 0, null, \Phar::ZIP);
						$oZip->compressFiles(\Phar::GZ);
						foreach ($aData as $aItem) {
							if ($aItem['data']) {
								if (!$oZip->addFromString($sFileName, \MailSo\Base\Utils::UrlSafeBase64Decode($aItem['data']))) {
									$bError = true;
								}
							} else {
								$oZip->addFile(
									$oFilesProvider->GetFileName($oAccount, $aItem['fileHash']),
									($mUIDs ? "{$aItem['uid']}/" : ($sFolder ? "{$aItem['uid']}-" : '')) . $aItem['fileName']
								);
							}
						}
						$oZip->compressFiles(\Phar::GZ);
						unset($oZip);
						\rename($sZipFileName . '.zip', $sZipFileName);
					}

					if (!$bError) {
						$mResult = array(
							'fileHash' => $this->encodeRawKey(array(
								'fileName' => ($sFilename ?: ($sFolder ? 'messages' : 'attachments')) . \date('-YmdHis') . '.zip',
								'mimeType' => 'application/zip',
								'fileHash' => $sZipHash
							))
						);
					}
				}
				break;

			default:
				$data = new \SnappyMail\AttachmentsAction;
				$data->action = $sAction;
				$data->items = $aData;
				$data->filesProvider = $oFilesProvider;
				$data->account = $oAccount;
				$this->Plugins()->RunHook('json.attachments', array($data));
				$mResult = $data->result;
				break;
		}

		foreach ($aData as $aItem) {
			$aItem['fileHash'] && $oFilesProvider->Clear($oAccount, $aItem['fileHash']);
		}

		return $this->DefaultResponse($bError ? false : $mResult);
	}

	private function getMimeFileByHash(\RainLoop\Model\Account $oAccount, string $sHash) : array
	{
		$aValues = $this->decodeRawKey($sHash);
		$aValues['fileName'] = empty($aValues['fileName']) ? 'file.dat' : (string) $aValues['fileName'];
		$aValues['fileHash'] = null;
		if (isset($aValues['data'])) {
			$aValues['data'] = \MailSo\Base\Utils::UrlSafeBase64Decode($aValues['data']);
		} else {
			$sFolder = isset($aValues['folder']) ? (string) $aValues['folder'] : '';
			$iUid = isset($aValues['uid']) ? (int) $aValues['uid'] : 0;
			$sMimeIndex = isset($aValues['mimeIndex']) ? (string) $aValues['mimeIndex'] : '';
			if ($sFolder && $iUid && $sMimeIndex) {
				$oFileProvider = $this->FilesProvider();
				$mResult = $this->MailClient()->MessageMimeStream(
					function ($rResource, $sContentType, $sFileName, $sMimeIndex = '')
					use ($oAccount, $oFileProvider, &$aValues) {
						unset($sContentType, $sFileName, $sMimeIndex);
						if (\is_resource($rResource)) {
							$sContentTypeIn = isset($aValues['mimeType']) ? (string) $aValues['mimeType'] : '';
							$sHash = \MailSo\Base\Utils::Sha1Rand($aValues['fileName'].'~'.$sContentTypeIn);
							$rTempResource = $oFileProvider->GetFile($oAccount, $sHash, 'wb+');
							if (\is_resource($rTempResource)) {
								if (-1 < \MailSo\Base\Utils::WriteStream($rResource, $rTempResource)) {
									$sResultHash = $sHash;
									$aValues['fileHash'] = $sHash;
								}
								\fclose($rTempResource);
							}
						}
					},
					$sFolder,
					$iUid,
					$sMimeIndex
				);
			}
		}

		return $aValues;
	}
}
