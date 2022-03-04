<?php

namespace SnappyMail;

abstract class Repository
{
	// snappyMailRepo
	const BASE_URL = 'https://snappymail.eu/repository/v2/';

	private static function get(string $path, string $proxy, string $proxy_auth) : string
	{
		$oHTTP = HTTP\Request::factory(/*'socket' or 'curl'*/);
		$oHTTP->proxy = $proxy;
		$oHTTP->proxy_auth = $proxy_auth;
		$oHTTP->max_response_kb = 0;
		$oHTTP->timeout = 15; // timeout in seconds.
		$oResponse = $oHTTP->doRequest('GET', static::BASE_URL . $path);
		if (!$oResponse) {
			throw new \Exception('No HTTP response from repository');
		}
		if (200 !== $oResponse->status) {
			throw new \Exception(static::body2plain($oResponse->body), $oResponse->status);
		}
		return $oResponse->body;
	}

//	$aRep = \json_decode($sRep);

	private static function download(string $path, string $proxy, string $proxy_auth) : string
	{
		$sTmp = APP_PRIVATE_DATA . \md5(\microtime(true).$path) . \preg_replace('/^.*?(\\.[a-z\\.]+)$/Di', '$1', $path);
		$pDest = \fopen($sTmp, 'w+b');
		if (!$pDest) {
			throw new \Exception('Cannot create temp file: '.$sTmp);
		}
		$oHTTP = HTTP\Request::factory(/*'socket' or 'curl'*/);
		$oHTTP->proxy = $proxy;
		$oHTTP->proxy_auth = $proxy_auth;
		$oHTTP->max_response_kb = 0;
		$oHTTP->timeout = 15; // timeout in seconds.
		$oHTTP->streamBodyTo($pDest);
		\set_time_limit(120);
		$oResponse = $oHTTP->doRequest('GET', static::BASE_URL . $path);
		\fclose($pDest);
		if (!$oResponse) {
			\unlink($sTmp);
			throw new \Exception('No HTTP response from repository');
		}
		if (200 !== $oResponse->status) {
			$body = \file_get_contents($sTmp);
			\unlink($sTmp);
			throw new \Exception(static::body2plain($body), $oResponse->status);
		}
		return $sTmp;
	}

	private static function body2plain(string $body) : string
	{
		return \trim(\strip_tags(
			\preg_match('@<body[^>]*>(.*)</body@si', $body, $match) ? $match[1] : $body
		));
	}

	private static function getRepositoryDataByUrl(bool &$bReal = false) : array
	{
		$bReal = false;
		$aRep = null;

		$sRep = '';
		$sRepoFile = 'packages.json';
		$iRepTime = 0;

		$oCache = \RainLoop\Api::Actions()->Cacher();

		$sCacheKey = \RainLoop\KeyPathHelper::RepositoryCacheFile(static::BASE_URL, $sRepoFile);
		$sRep = $oCache->Get($sCacheKey);
		if ('' !== $sRep)
		{
			$iRepTime = $oCache->GetTimer($sCacheKey);
		}

		if ('' === $sRep || 0 === $iRepTime || \time() - 3600 > $iRepTime)
		{
			$sRep = static::get($sRepoFile,
				\RainLoop\Api::Config()->Get('labs', 'curl_proxy', ''),
				\RainLoop\Api::Config()->Get('labs', 'curl_proxy_auth', '')
			);
			if ($sRep)
			{
				$aRep = \json_decode($sRep);
				$bReal = \is_array($aRep) && \count($aRep);

				if ($bReal)
				{
					$oCache->Set($sCacheKey, $sRep);
					$oCache->SetTimer($sCacheKey);
				}
			}
			else
			{
				throw new \Exception('Cannot read remote repository file: '.$sRepoFile);
			}
		}
		else if ('' !== $sRep)
		{
			$aRep = \json_decode($sRep, false, 10);
			$bReal = \is_array($aRep) && \count($aRep);
		}

		return \is_array($aRep) ? $aRep : [];
	}

	private static function getRepositoryData(bool &$bReal, string &$sError) : array
	{
		$aResult = array();
		try {
			$notDev = '0.0.0' !== APP_VERSION;
			foreach (static::getRepositoryDataByUrl($bReal) as $oItem) {
				if ($oItem && isset($oItem->type, $oItem->id, $oItem->name,
					$oItem->version, $oItem->release, $oItem->file, $oItem->description))
				{
					if ((!empty($oItem->required) && $notDev && \version_compare(APP_VERSION, $oItem->required, '<'))
					 || (!empty($oItem->deprecated) && $notDev && \version_compare(APP_VERSION, $oItem->deprecated, '>='))
					 || (isset($aResult[$oItem->id]) && \version_compare($aResult[$oItem->id]['version'], $oItem->version, '>'))
					) {
						continue;
					}

					if ('plugin' === $oItem->type) {
						$aResult[$oItem->id] = array(
							'type' => $oItem->type,
							'id' => $oItem->id,
							'name' => $oItem->name,
							'installed' => '',
							'enabled' => true,
							'version' => $oItem->version,
							'file' => $oItem->file,
							'release' => $oItem->release,
							'desc' => $oItem->description,
							'canBeDeleted' => false,
							'canBeUpdated' => true
						);
					}
				}
			}
		} catch (\Throwable $e) {
			$sError = "{$e->getCode()} {$e->getMessage()}";
			\RainLoop\Api::Logger()->Write($sError, \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
		}
		return $aResult;
	}

	public static function getPackagesList() : array
	{
		\RainLoop\Api::Actions()->IsAdminLoggined();

		$bReal = false;
		$sError = '';
		$aList = static::getRepositoryData($bReal, $sError);

		$aEnabledPlugins = \array_map('trim',
			\explode(',', \strtolower(\RainLoop\Api::Config()->Get('plugins', 'enabled_list', '')))
		);

		$aInstalled = \RainLoop\Api::Actions()->Plugins()->InstalledPlugins();
		foreach ($aInstalled as $aItem) {
			if ($aItem) {
				if (isset($aList[$aItem[0]])) {
					$aList[$aItem[0]]['installed'] = $aItem[1];
					$aList[$aItem[0]]['enabled'] = \in_array(\strtolower($aItem[0]), $aEnabledPlugins);
					$aList[$aItem[0]]['canBeDeleted'] = true;
					$aList[$aItem[0]]['canBeUpdated'] = \version_compare($aItem[1], $aList[$aItem[0]]['version'], '<');
				} else {
					\array_push($aList, array(
						'type' => 'plugin',
						'id' => $aItem[0],
						'name' => $aItem[0],
						'installed' => $aItem[1],
						'enabled' => \in_array(\strtolower($aItem[0]), $aEnabledPlugins),
						'version' => '',
						'file' => '',
						'release' => '',
						'desc' => '',
						'canBeDeleted' => true,
						'canBeUpdated' => false
					));
				}
			}
		}

//		\uksort($aList, static function($a, $b){return \strcasecmp($a['name'], $b['name']);});

		return array(
			 'Real' => $bReal,
			 'List' => \array_values($aList),
			 'Error' => $sError
		);
	}

	public static function deletePackage(string $sId) : bool
	{
		\RainLoop\Api::Actions()->IsAdminLoggined();
		return static::deletePackageDir($sId);
	}

	private static function deletePackageDir(string $sId) : bool
	{
		$sPath = APP_PLUGINS_PATH.$sId;
		return (!\is_dir($sPath) || \MailSo\Base\Utils::RecRmDir($sPath))
			&& (!\is_file("{$sPath}.phar") || \unlink("{$sPath}.phar"));
	}

	public static function installPackage(string $sType, string $sId, string $sFile) : bool
	{
		\RainLoop\Api::Actions()->IsAdminLoggined();

		\RainLoop\Api::Logger()->Write('Start package install: '.$sFile.' ('.$sType.')', \MailSo\Log\Enumerations\Type::INFO, 'INSTALLER');

		$sRealFile = '';

		$bResult = false;
		$sTmp = null;
		try {
			if ('plugin' === $sType) {
				$bReal = false;
				$sError = '';
				$aList = static::getRepositoryData($bReal, $sError);
				if ($sError) {
					throw new \Exception($sError);
				}
				if (isset($aList[$sId]) && $sFile === $aList[$sId]['file']) {
					$sRealFile = $sFile;
					$sTmp = static::download($sFile,
						\RainLoop\Api::Config()->Get('labs', 'curl_proxy', ''),
						\RainLoop\Api::Config()->Get('labs', 'curl_proxy_auth', '')
					);
				}
			}

			if ($sTmp) {
				$oArchive = new \PharData($sTmp, 0, $sRealFile);
				if (static::deletePackageDir($sId)) {
					if ('.phar' === \substr($sRealFile, -5)) {
						$bResult = \copy($sTmp, APP_PLUGINS_PATH . \basename($sRealFile));
					} else {
						$bResult = $oArchive->extractTo(\rtrim(APP_PLUGINS_PATH, '\\/'));
					}
					if (!$bResult) {
						throw new \Exception('Cannot extract package files: '.$oArchive->getStatusString());
					}
				} else {
					throw new \Exception('Cannot remove previous plugin folder: '.$sId);
				}
			}
		} catch (\Throwable $e) {
			\RainLoop\Api::Logger()->Write("Install package {$sRealFile} failed: {$e->getMessage()}", \MailSo\Log\Enumerations\Type::ERROR, 'INSTALLER');
			throw $e;
		} finally {
			$sTmp && \unlink($sTmp);
		}

		return $bResult;
	}

}
