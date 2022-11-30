<?php

namespace RainLoop\Actions;

trait Themes
{
	public function GetTheme(bool $bAdmin): string
	{
		static $sTheme;
		if (!$sTheme) {
			$sTheme = $this->Config()->Get('webmail', 'theme', 'Default');
			if (!$bAdmin
			 && ($oAccount = $this->getAccountFromToken(false))
			 && $this->GetCapa(\RainLoop\Enumerations\Capa::THEMES)
			 && ($oSettingsLocal = $this->SettingsProvider(true)->Load($oAccount))) {
				$sTheme = (string) $oSettingsLocal->GetConf('Theme', $sTheme);
			}
			$sTheme = $this->ValidateTheme($sTheme) ?: 'Default';
		}
		return $sTheme;
	}

	/**
	 * @staticvar array $aCache
	 */
	public function GetThemes(): array
	{
		static $aCache = array();
		if ($aCache) {
			return $aCache;
		}

		$bClear = false;
		$bDefault = false;
		$aCache = array();
		$sDir = APP_VERSION_ROOT_PATH . 'themes';
		if (\is_dir($sDir)) {
			$rDirH = \opendir($sDir);
			if ($rDirH) {
				while (($sFile = \readdir($rDirH)) !== false) {
					if ('.' !== $sFile[0] && \is_dir($sDir . '/' . $sFile)
					 && (\file_exists("{$sDir}/{$sFile}/styles.css") || \file_exists("{$sDir}/{$sFile}/styles.less"))) {
						if ('Default' === $sFile) {
							$bDefault = true;
						} else if ('Clear' === $sFile) {
							$bClear = true;
						} else {
							$aCache[] = $sFile;
						}
					}
				}
				closedir($rDirH);
			}
		}

		$sDir = APP_INDEX_ROOT_PATH . 'themes'; // custom user themes
		if (\is_dir($sDir)) {
			$rDirH = \opendir($sDir);
			if ($rDirH) {
				while (($sFile = \readdir($rDirH)) !== false) {
					if ('.' !== $sFile[0] && \is_dir($sDir . '/' . $sFile)
					 && (\file_exists("{$sDir}/{$sFile}/styles.css") || \file_exists("{$sDir}/{$sFile}/styles.less"))) {
						$aCache[] = $sFile . '@custom';
					}
				}

				\closedir($rDirH);
			}
		}

		$aCache = \array_unique($aCache);
		\sort($aCache);

		if ($bDefault) {
			\array_unshift($aCache, 'Default');
		}

		if ($bClear) {
			\array_push($aCache, 'Clear');
		}

		return $aCache;
	}

	public function ThemeLink(bool $bAdmin): string
	{
		return './?/Css/0/' . ($bAdmin ? 'Admin' : 'User') . '/-/' . $this->GetTheme($bAdmin) . '/-/' . $this->StaticCache() . '/Hash/-/';
	}

	public function ValidateTheme(string $sTheme): string
	{
		return \in_array($sTheme, $this->GetThemes()) ? $sTheme : $this->Config()->Get('themes', 'default', 'Default');
	}

	public function compileCss(string $sTheme, bool $bAdmin, bool $bMinified = false) : string
	{
		$bCustomTheme = '@custom' === \substr($sTheme, -7);
		if ($bCustomTheme) {
			$sTheme = \substr($sTheme, 0, -7);
		}

		$mResult = array();

		$sBase = ($bCustomTheme ? \RainLoop\Utils::WebPath() : \RainLoop\Utils::WebVersionPath())
				. "themes/{$sTheme}/";

		$bLess = false;

		$sThemeCSSFile = ($bCustomTheme ? APP_INDEX_ROOT_PATH : APP_VERSION_ROOT_PATH).'themes/'.$sTheme.'/styles.css';
		if (\is_file($sThemeCSSFile)) {
			$mResult[] = \file_get_contents($sThemeCSSFile);
		} else {
			$sThemeCSSFile = \str_replace('styles.css', 'styles.less', $sThemeCSSFile);
			if (\is_file($sThemeCSSFile)) {
				$bLess = true;
				$mResult[] = "@base: \"{$sBase}\";";
				$mResult[] = \file_get_contents($sThemeCSSFile);
			}
		}

		$mResult[] = $this->Plugins()->CompileCss($bAdmin, $bLess, $bMinified);

		$mResult = \preg_replace('@(url\(["\']?)(\\./)?([a-z]+[^:a-z])@',
			"\$1{$sBase}\$3",
			\str_replace('@{base}', $sBase, \implode("\n", $mResult)));

		return $bLess ? (new \LessPHP\lessc())->compile($mResult) : $mResult;
//			: \str_replace(';}', '}', \preg_replace('/\\s*([:;{},])\\s*/', '\1', \preg_replace('/\\s+/', ' ', \preg_replace('#/\\*.*?\\*/#s', '', $mResult))));
	}

	public function UploadBackground(): array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(\RainLoop\Enumerations\Capa::USER_BACKGROUND)) {
			return $this->FalseResponse(__FUNCTION__);
		}

		$sName = '';
		$sHash = '';

		$aFile = $this->GetActionParam('File', null);
		$iError = $this->GetActionParam('Error', \RainLoop\Enumerations\UploadError::UNKNOWN);

		if ($oAccount && UPLOAD_ERR_OK === $iError && \is_array($aFile)) {
			$sMimeType = \SnappyMail\File\MimeType::fromFile($aFile['tmp_name'], $aFile['name'])
				?: \SnappyMail\File\MimeType::fromFilename($aFile['name'])
				?: $aFile['type'];
			if (\in_array($sMimeType, array('image/png', 'image/jpg', 'image/jpeg', 'image/webp'))) {
				$sSavedName = 'upload-post-' . \md5($aFile['name'] . $aFile['tmp_name'])
					. \SnappyMail\File\MimeType::toExtension($sMimeType);
				if (!$this->FilesProvider()->MoveUploadedFile($oAccount, $sSavedName, $aFile['tmp_name'])) {
					$iError = \RainLoop\Enumerations\UploadError::ON_SAVING;
				} else {
					$rData = $this->FilesProvider()->GetFile($oAccount, $sSavedName);
					if (\is_resource($rData)) {
						$sData = \stream_get_contents($rData);
						if (!empty($sData) && \strlen($sData)) {
							$sName = $aFile['name'];
							if (empty($sName)) {
								$sName = '_';
							}

							if ($this->StorageProvider()->Put($oAccount,
								\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
								'background',
								\RainLoop\Utils::jsonEncode(array(
									'Name' => $aFile['name'],
									'ContentType' => $sMimeType,
									'Raw' => \base64_encode($sData)
								))
							)) {
								$oSettings = $this->SettingsProvider()->Load($oAccount);
								if ($oSettings) {
									$sHash = \MailSo\Base\Utils::Sha1Rand($sName . APP_VERSION . APP_SALT);

									$oSettings->SetConf('UserBackgroundName', $sName);
									$oSettings->SetConf('UserBackgroundHash', $sHash);
									$this->SettingsProvider()->Save($oAccount, $oSettings);
								}
							}
						}

						unset($sData);
					}

					if (\is_resource($rData)) {
						\fclose($rData);
					}

					unset($rData);
				}

				$this->FilesProvider()->Clear($oAccount, $sSavedName);
			} else {
				$iError = \RainLoop\Enumerations\UploadError::FILE_TYPE;
			}
		}

		if (UPLOAD_ERR_OK !== $iError) {
			$iClientError = \RainLoop\Enumerations\UploadError::NORMAL;
			$sError = $this->getUploadErrorMessageByCode($iError, $iClientError);

			if (!empty($sError)) {
				return $this->FalseResponse(__FUNCTION__, $iClientError, $sError);
			}
		}

		return $this->DefaultResponse(__FUNCTION__, !empty($sName) && !empty($sHash) ? array(
			'Name' => $sName,
			'Hash' => $sHash
		) : false);
	}
}
