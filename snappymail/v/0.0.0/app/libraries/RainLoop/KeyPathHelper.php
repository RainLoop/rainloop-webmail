<?php

namespace RainLoop;

class KeyPathHelper
{

	static public function PublicFile(string $sHash) : string
	{
		return '/Public/Files/'.sha1($sHash).'/Data/';
	}

	static public function SsoCacherKey(string $sSsoHash) : string
	{
		return '/Sso/Data/'.$sSsoHash.'/Login/';
	}

	static public function RsaCacherKey(string $sHash) : string
	{
		return '/Rsa/Data/'.$sHash.'/';
	}

	static public function RepositoryCacheFile(string $sRepo, string $sRepoFile) : string
	{
		return '/RepositoryCache/Repo/'.$sRepo.'/File/'.$sRepoFile;
	}

	static public function RepositoryCacheCore(string $sRepo) : string
	{
		return '/RepositoryCache/CoreRepo/'.$sRepo;
	}

	static public function ReadReceiptCache(string $sEmail, string $sFolderFullName, int $iUid) : string
	{
		return '/ReadReceipt/'.$sEmail.'/'.$sFolderFullName.'/'.$iUid;
	}

	static public function LangCache(string $sLanguage, bool $bAdmim, string $sPluginsHash) : string
	{
		return '/LangCache/'.$sPluginsHash.'/'.$sLanguage.'/'.($bAdmim ? 'Admin' : 'App').'/'.APP_VERSION.'/';
	}

	static public function TemplatesCache(bool $bAdmin, string $sPluginsHash) : string
	{
		return '/TemplatesCache/'.$sPluginsHash.'/'.($bAdmin ? 'Admin' : 'App').'/'.APP_VERSION.'/';
	}

	static public function PluginsJsCache(string $sPluginsHash) : string
	{
		return '/PluginsJsCache/'.$sPluginsHash.'/'.APP_VERSION.'/';
	}

	static public function CssCache(string $sTheme, string $sHash) : string
	{
		return '/CssCache/'.$sHash.'/'.$sTheme.'/'.APP_VERSION.'/';
	}

	static public function SessionAdminKey(string $sRand) : string
	{
		return '/Session/AdminKey/'.\md5($sRand).'/';
	}
}
