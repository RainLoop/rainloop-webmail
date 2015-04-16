<?php

namespace RainLoop;

class KeyPathHelper
{
	/**
	 * @param string $sHash
	 *
	 * @return string
	 */
	static public function PublicFile($sHash)
	{
		return '/Public/Files/'.sha1($sHash).'/Data/';
	}

	/**
	 * @param string $sSsoHash
	 *
	 * @return string
	 */
	static public function SsoCacherKey($sSsoHash)
	{
		return '/Sso/Data/'.$sSsoHash.'/Login/';
	}

	/**
	 * @param string $sHash
	 *
	 * @return string
	 */
	static public function RsaCacherKey($sHash)
	{
		return '/Rsa/Data/'.$sHash.'/';
	}

	/**
	 * @param string $sDomain
	 *
	 * @return string
	 */
	static public function LicensingDomainKeyValue($sDomain)
	{
		return '/Licensing/DomainKey/Value/'.$sDomain;
	}

	/**
	 * @param string $sDomain
	 *
	 * @return string
	 */
	static public function LicensingDomainKeyOtherValue($sDomain)
	{
		return '/Licensing/DomainKeyOther/Value/'.$sDomain;
	}

	/**
	 * @param string $sRepo
	 * @param string $sRepoFile
	 *
	 * @return string
	 */
	static public function RepositoryCacheFile($sRepo, $sRepoFile)
	{
		return '/RepositoryCache/Repo/'.$sRepo.'/File/'.$sRepoFile;
	}

	/**
	 * @param string $sRepo
	 *
	 * @return string
	 */
	static public function RepositoryCacheCore($sRepo)
	{
		return '/RepositoryCache/CoreRepo/'.$sRepo;
	}

	/**
	 * @param string $sEmail
	 * @param string $sFolderFullName
	 * @param string $sUid
	 *
	 * @return string
	 */
	static public function ReadReceiptCache($sEmail, $sFolderFullName, $sUid)
	{
		return '/ReadReceipt/'.$sEmail.'/'.$sFolderFullName.'/'.$sUid;
	}

	/**
	 * @param string $sLanguage
	 * @param bool $bAdmim
	 * @param string $sPluginsHash
	 *
	 * @return string
	 */
	static public function LangCache($sLanguage, $bAdmim, $sPluginsHash)
	{
		return '/LangCache/'.$sPluginsHash.'/'.$sLanguage.'/'.($bAdmim ? 'Admin' : 'App').'/'.APP_VERSION.'/';
	}

	/**
	 * @param bool $bAdmin
	 * @param string $sPluginsHash
	 *
	 * @return string
	 */
	static public function TemplatesCache($bAdmin, $sPluginsHash)
	{
		return '/TemplatesCache/'.$sPluginsHash.'/'.($bAdmin ? 'Admin' : 'App').'/'.APP_VERSION.'/';
	}

	/**
	 * @param string $sPluginsHash
	 *
	 * @return string
	 */
	static public function PluginsJsCache($sPluginsHash)
	{
		return '/PluginsJsCache/'.$sPluginsHash.'/'.APP_VERSION.'/';
	}

	/**
	 * @param string $sTheme
	 * @param string $sHash
	 * @param string $sPublickHash
	 *
	 * @return string
	 */
	static public function CssCache($sTheme, $sHash)
	{
		return '/CssCache/'.$sHash.'/'.$sTheme.'/'.APP_VERSION.'/';
	}

	/**
	 * @param string $sRand
	 *
	 * @return string
	 */
	static public function SessionAdminKey($sRand)
	{
		return '/Session/AdminKey/'.\md5($sRand).'/';
	}
}
