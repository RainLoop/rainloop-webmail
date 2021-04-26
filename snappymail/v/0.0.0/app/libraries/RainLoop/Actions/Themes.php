<?php

namespace RainLoop\Actions;

trait Themes
{
/*
		$sTheme = $oConfig->Get('webmail', 'theme', 'Default');
		if (!$bAdmin && $oAccount) {
			$oSettingsLocal = $this->SettingsProvider(true)->Load($oAccount);
			if ($this->GetCapa(false, Enumerations\Capa::SETTINGS, $oAccount)) {
				if ($oSettingsLocal instanceof Settings) {
					if ($this->GetCapa(false, Enumerations\Capa::THEMES, $oAccount)) {
						$sTheme = (string) $oSettingsLocal->GetConf('Theme', $sTheme);
		$sTheme = $this->ValidateTheme($sTheme);
		$aResult['Theme'] = $sTheme;
		$aResult['NewThemeLink'] = $this->ThemeLink($sTheme, $bAdmin);

			if ($oConfig->Get('webmail', 'allow_themes', false)) {
				$aResult[] = Enumerations\Capa::THEMES;
			}
*/

	public function GetTheme(bool $bAdmin): string
	{
		$sTheme = $this->Config()->Get('webmail', 'theme', 'Default');
		if (!$bAdmin) {
			if ($oAccount = $this->GetAccount()) {
				$oSettingsLocal = $this->SettingsProvider(true)->Load($oAccount);
				if ($oSettingsLocal instanceof Settings) {
					$sTheme = $oSettingsLocal->GetConf('Theme', $sTheme);
				}
			}
		}
		return $this->ValidateTheme($sTheme) ?: 'Default';
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
					if ('.' !== $sFile[0] && \is_dir($sDir . '/' . $sFile) && \file_exists($sDir . '/' . $sFile . '/styles.less')) {
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
					if ('.' !== $sFile[0] && \is_dir($sDir . '/' . $sFile) && \file_exists($sDir . '/' . $sFile . '/styles.less')) {
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

	public function ThemeLink(string $sTheme, bool $bAdmin): string
	{
		return './?/Css/0/' . ($bAdmin ? 'Admin' : 'User') . '/-/' . $sTheme . '/-/' . $this->StaticCache() . '/Hash/-/';
	}

	public function ValidateTheme(string $sTheme): string
	{
		return \in_array($sTheme, $this->GetThemes()) ?
			$sTheme : $this->Config()->Get('themes', 'default', 'Default');
	}
}
