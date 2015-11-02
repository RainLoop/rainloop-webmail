<?php

\define('IS_ADMIN', isset($_GET['admin']) && '1' === (string) $_GET['admin']);
\define('LANGS_PATH', __DIR__.'/../rainloop/v/0.0.0/langs'.(IS_ADMIN ? '/admin' : ''));

function getLangStructure($sLangFile)
{
	$sEngLang = \file_get_contents(LANGS_PATH.'/'.$sLangFile);
	return $sEngLang ? \parse_ini_string($sEngLang, true) : null;
}

function mergeLangStructure($aFromLang, $aEngLang, &$iCount = 0)
{
	$iCount = 0;
	foreach ($aEngLang as $sSectionKey => $aSectionValue)
	{
		foreach (\array_keys($aSectionValue) as $sParamKey)
		{
			if (isset($aFromLang[$sSectionKey][$sParamKey]))
			{
				$aEngLang[$sSectionKey][$sParamKey] = $aFromLang[$sSectionKey][$sParamKey];
			}
			else
			{
				echo $sSectionKey.'/'.$sParamKey.','."\n";
				$iCount++;
			}
		}
	}

	return $aEngLang;
}

function saveLangStructure($sLangFile, $aLang)
{
	$aResultLines = array();
//	$aResultLines[] = '; '.$sLangFile;

	foreach ($aLang as $sSectionKey => $aSectionValue)
	{
		$aResultLines[] = '';
		$aResultLines[] = '['.$sSectionKey.']';

		foreach ($aSectionValue as $sParamKey => $sParamValue)
		{
			$aResultLines[] = $sParamKey.' = "'.
				\str_replace(array('\\', '"'), array('\\\\', '\\"'), \trim($sParamValue)).'"';
		}
	}

	\file_put_contents(LANGS_PATH.'/'.$sLangFile, implode("\n", $aResultLines)."\n");
}

$sNL = "\n";
$aEngLang = \getLangStructure('en.ini');

$aFiles = \glob(LANGS_PATH.'/*.ini');
foreach ($aFiles as $sFile)
{
	$iCount = 0;
	$sFileName = \basename($sFile);

	$aNextLang = \getLangStructure($sFileName);
	$aNewLang = \mergeLangStructure($aNextLang, $aEngLang, $iCount);

	if (0 === $iCount)
	{
		echo $sFileName.': ok'.$sNL;
	}
	else
	{
		echo $sFileName.': changed ('.$iCount.')'.$sNL;
	}

//	\saveLangStructure($sFileName, $aNewLang);
}