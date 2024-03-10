<?php

namespace RainLoop\Actions;

use RainLoop\Enumerations\Capa;

trait Themes
{
	public function GetTheme(bool $bAdmin): string
	{
		static $sTheme;
		if (!$sTheme) {
			$sTheme = $this->Config()->Get('webmail', 'theme', 'Default');
			if (!$bAdmin
			 && ($oAccount = $this->getAccountFromToken(false))
			 && $this->GetCapa(Capa::THEMES)
			 && ($oSettingsLocal = $this->SettingsProvider(true)->Load($oAccount))) {
				$sTheme = (string) $oSettingsLocal->GetConf('Theme', $sTheme);
			}
			$sTheme = $this->ValidateTheme($sTheme);
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
		if (\is_dir($sDir) && ($rDirH = \opendir($sDir))) {
			while (($sFile = \readdir($rDirH)) !== false) {
				if ('.' !== $sFile[0] && \is_dir($sDir . '/' . $sFile)
				 && (\file_exists("{$sDir}/{$sFile}/styles.css") || \file_exists("{$sDir}/{$sFile}/styles.less"))) {
					$aCache[] = $sFile . '@custom';
				}
			}
			\closedir($rDirH);
		}

		if (\class_exists('OC', false)) {
			$sDir = \OC::$SERVERROOT . '/themes'; // custom user themes
			if (\is_dir($sDir) && ($rDirH = \opendir($sDir))) {
				while (($sFile = \readdir($rDirH)) !== false) {
					if ('.' !== $sFile[0] && \is_dir("{$sDir}/{$sFile}") && \file_exists("{$sDir}/{$sFile}/snappymail/style.css")) {
						$aCache[] = $sFile . '@nextcloud';
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

	public function ValidateTheme(string $sTheme): string
	{
		if (!\in_array($sTheme, $this->GetThemes())) {
			$sTheme = $this->Config()->Get('webmail', 'theme', 'Default');
			if (!\in_array($sTheme, $this->GetThemes())) {
				$sTheme = 'Default';
			}
		}
		return $sTheme;
	}

	public function compileCss(string $sTheme, bool $bAdmin, bool $bMinified = false) : string
	{
		$mResult = array();
		$bLess = false;

		if ('@nextcloud' === \substr($sTheme, -10)) {
			$sBase = \OC::$WEBROOT . '/';
			$sThemeCSSFile = \OC::$SERVERROOT . '/themes/' . \str_replace('@nextcloud', '/snappymail/style.css', $sTheme);
		} else {
			$bCustomTheme = '@custom' === \substr($sTheme, -7);
			if ($bCustomTheme) {
				$sTheme = \substr($sTheme, 0, -7);
				$sBase = \RainLoop\Utils::WebPath();
			} else {
				$sBase = \RainLoop\Utils::WebVersionPath();
			}
			$sBase .= "themes/{$sTheme}/";
			$sThemeCSSFile = ($bCustomTheme ? APP_INDEX_ROOT_PATH : APP_VERSION_ROOT_PATH).'themes/'.$sTheme.'/styles.css';
			if (!\is_file($sThemeCSSFile)) {
				$sThemeCSSFile = \str_replace('styles.css', 'styles.less', $sThemeCSSFile);
				if (\is_file($sThemeCSSFile)) {
					$bLess = true;
					$mResult[] = "@base: \"{$sBase}\";";
					$mResult[] = \file_get_contents($sThemeCSSFile);
				}
			}
		}
		if (\is_file($sThemeCSSFile)) {
			$mResult[] = \file_get_contents($sThemeCSSFile);
		}

		$mResult[] = $this->Plugins()->CompileCss($bAdmin, $bLess, $bMinified);

		$mResult = \preg_replace('@(url\(["\']?)(\\./)?([a-z]+[^:a-z])@',
			"\$1{$sBase}\$3",
			\str_replace('@{base}', $sBase, \implode("\n", $mResult)));

		return $bLess ? (new \LessPHP\lessc())->compile($mResult) : $mResult;
//			: \str_replace(';}', '}', \preg_replace('/\\s*([:;{},])\\s*/', '\1', \preg_replace('/\\s+/', ' ', \preg_replace('#/\\*.*?\\*/#s', '', $mResult))));
	}

	public function UploadBackground(?array $aFile, int $iError): array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(Capa::USER_BACKGROUND)) {
			return $this->FalseResponse();
		}

		$sName = '';
		$sHash = '';

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
								// Used by RawUserBackground()
								\RainLoop\Utils::jsonEncode(array(
									'ContentType' => $sMimeType,
									'Raw' => \base64_encode($sData)
								))
							)) {
								$oSettings = $this->SettingsProvider()->Load($oAccount);
								if ($oSettings) {
									$sHash = \MailSo\Base\Utils::Sha1Rand($sName . APP_VERSION . APP_SALT);

									$oSettings->SetConf('UserBackgroundName', $sName);
									$oSettings->SetConf('UserBackgroundHash', $sHash);
									$oSettings->save();
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
			$iClientError = 0;
			$sError = \RainLoop\Enumerations\UploadError::getUserMessage($iError, $iClientError);
			if (!empty($sError)) {
				return $this->FalseResponse($iClientError, $sError);
			}
		}

		return $this->DefaultResponse(!empty($sName) && !empty($sHash) ? array(
			'name' => $sName,
			'hash' => $sHash
		) : false);
	}
}
