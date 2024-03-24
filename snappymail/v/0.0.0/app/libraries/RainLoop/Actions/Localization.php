<?php

namespace RainLoop\Actions;

trait Localization
{
	public function GetLanguage(bool $bAdmin = false): string
	{
		$oConfig = $this->Config();
		if ($bAdmin) {
			$sLanguage = $oConfig->Get('admin_panel', 'language', 'en');
		} else {
			$sLanguage = $oConfig->Get('webmail', 'language', 'en');
			if ($oAccount = $this->getAccountFromToken(false)) {
				if ($oConfig->Get('login', 'determine_user_language', true)) {
					$sLanguage = $this->ValidateLanguage($this->detectClientLanguage($bAdmin), $sLanguage, false);
				}
				if ($oConfig->Get('webmail', 'allow_languages_on_settings', true)
				 && ($oSettings = $this->SettingsProvider()->Load($oAccount))) {
					$sLanguage = $oSettings->GetConf('language', $sLanguage);
				}
			} else if ($oConfig->Get('login', 'allow_languages_on_login', true) && $oConfig->Get('login', 'determine_user_language', true)) {
				$sLanguage = $this->ValidateLanguage($this->detectClientLanguage($bAdmin), $sLanguage, false);
			}
		}
		$sHookLanguage = $sLanguage = $this->ValidateLanguage($sLanguage, '', $bAdmin) ?: 'en';
		$this->Plugins()->RunHook('filter.language', array(&$sHookLanguage, $bAdmin));
		return $this->ValidateLanguage($sHookLanguage, $sLanguage, $bAdmin);
	}

	public function ValidateLanguage(string $sLanguage, string $sDefault = '', bool $bAdmin = false, bool $bAllowEmptyResult = false): string
	{
		$aLang = \SnappyMail\L10n::getLanguages($bAdmin);

		$aHelper = array(
			'ar' => 'ar-SA',
			'be' => 'be-BY',
			'cn' => 'zh-CN',
			'cs' => 'cs-CZ',
			'da' => 'da-DK',
			'el' => 'el-GR',
			'et' => 'et-EE',
			'fa' => 'fa-IR',
			'ja' => 'ja-JP',
			'ko' => 'ko-KR',
			'nb' => 'nb-NO',
			'no' => 'nb-NO',
			'sl' => 'sl-SI',
			'sv' => 'sv-SE',
			'tw' => 'zh-TW',
			'ua' => 'uk-UA',
			'uk' => 'uk-UA',
			'vi' => 'vi-VN',
			'zh' => 'zh-CN'
		);

		$sLanguage = isset($aHelper[$sLanguage]) ? $aHelper[$sLanguage] : \strtr($sLanguage, '_', '-');
		$sDefault  = isset($aHelper[$sDefault])  ? $aHelper[$sDefault]  : \strtr($sDefault, '_', '-');

		if (\in_array($sLanguage, $aLang)) {
			return $sLanguage;
		}

		if (\str_contains($sLanguage, '-')) {
			$sLanguage = \strtok($sLanguage, '-');
			if (isset($aHelper[$sLanguage])) {
				$sLanguage = $aHelper[$sLanguage];
			}
			if (\in_array($sLanguage, $aLang)) {
				return $sLanguage;
			}
		}

		if (\in_array($sDefault, $aLang)) {
			return $sDefault;
		}
		if (\str_contains($sDefault, '-')) {
			$sDefault = \strtok($sDefault, '-');
			if (isset($aHelper[$sDefault])) {
				$sDefault = $aHelper[$sDefault];
			}
			if (\in_array($sDefault, $aLang)) {
				return $sDefault;
			}
		}

		if ($bAllowEmptyResult) {
			return '';
		}

		$sResult = $this->Config()->Get($bAdmin ? 'admin_panel' : 'webmail', 'language', 'en');
		return \in_array($sResult, $aLang) ? $sResult : 'en';
	}

	public function detectClientLanguage(bool $bAdmin): string
	{
		$aLangs = $aList = array();

		$sAcceptLang = \strtolower(\MailSo\Base\Http::GetServer('HTTP_ACCEPT_LANGUAGE', 'en'));
		if (!empty($sAcceptLang) && \preg_match_all('/([a-z]{1,8}(?:-[a-z]{1,8})?)(?:;q=([0-9.]+))?/', $sAcceptLang, $aList)) {
			$aLangs = \array_combine($aList[1], $aList[2]);
			foreach ($aLangs as $n => $v) {
				$aLangs[$n] = $v ? $v : 1;
			}

			\arsort($aLangs, SORT_NUMERIC);
		}

		foreach (\array_keys($aLangs) as $sLang) {
			$sLang = $this->ValidateLanguage($sLang, '', $bAdmin, true);
			if (!empty($sLang)) {
				return $sLang;
			}
		}

		return '';
	}

	public function StaticI18N(string $sKey): string
	{
		static $sLang = null;
		static $aLang = null;

		if (null === $sLang) {
			$sLang = $this->GetLanguage();
		}

		if (null === $aLang) {
			$sLang = $this->ValidateLanguage($sLang, 'en');
			$aLang = \SnappyMail\L10n::load($sLang, 'static');
			$this->Plugins()->ReadLang($sLang, $aLang);
		}

		return $aLang[$sKey] ?? $sKey;
	}

	public function compileLanguage(string $sLanguage, bool $bAdmin = false) : string
	{
		$sLanguage = \strtr($sLanguage, '_', '-');

		$aResultLang = \json_decode(\file_get_contents(APP_VERSION_ROOT_PATH.'app/localization/langs.json'), true);
		$langs = \array_flip(\SnappyMail\L10n::getLanguages($bAdmin));
		$aResultLang['LANGS_NAMES'] = \array_intersect_key($aResultLang['LANGS_NAMES'], $langs);
		$aResultLang['LANGS_NAMES_EN'] = \array_intersect_key($aResultLang['LANGS_NAMES_EN'], $langs);

		$aResultLang = \array_replace_recursive(
			$aResultLang,
			\SnappyMail\L10n::load($sLanguage, ($bAdmin ? 'admin' : 'user'))
		);

		$this->Plugins()->ReadLang($sLanguage, $aResultLang);

		$sResult = \json_encode($aResultLang, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_NUMERIC_CHECK);

		$sTimeFormat = '';
		$options = [$sLanguage, \substr($sLanguage, 0, 2), 'en'];
		foreach ($options as $lang) {
			$sFileName = APP_VERSION_ROOT_PATH.'app/localization/'.$lang.'/relativetimeformat.js';
			if (\is_file($sFileName)) {
				$sTimeFormat = \preg_replace('/^\\s+/', '', \file_get_contents($sFileName));
				break;
			}
		}

		return "document.documentElement.lang = '{$sLanguage}';\nrl.I18N={$sResult};\nrl.relativeTime = {$sTimeFormat};";
	}
}
