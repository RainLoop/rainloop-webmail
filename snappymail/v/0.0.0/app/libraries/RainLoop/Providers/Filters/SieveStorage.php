<?php

namespace RainLoop\Providers\Filters;

class SieveStorage implements FiltersInterface
{
	const SIEVE_FILE_NAME = 'rainloop.user';

	/**
	 * @var \MailSo\Log\Logger
	 */
	private $oLogger;

	/**
	 * @var \RainLoop\Plugins\Manager
	 */
	private $oPlugins;

	/**
	 * @var \RainLoop\Config\Application
	 */
	private $oConfig;

	public function __construct($oPlugins, $oConfig)
	{
		$this->oLogger = null;

		$this->oPlugins = $oPlugins;
		$this->oConfig = $oConfig;
	}

	protected function getConnection(\RainLoop\Model\Account $oAccount) : ?\MailSo\Sieve\ManageSieveClient
	{
		$oSieveClient = new \MailSo\Sieve\ManageSieveClient();
		$oSieveClient->SetLogger($this->oLogger);
		$oSieveClient->SetTimeOuts(10, (int) \RainLoop\Api::Config()->Get('labs', 'sieve_timeout', 10));
		return $oAccount->SieveConnectAndLoginHelper($this->oPlugins, $oSieveClient, $this->oConfig)
			 ? $oSieveClient
			 : null;
	}

	public function Load(\RainLoop\Model\Account $oAccount) : array
	{
		$aModules = array();
		$aScripts = array();

		$oSieveClient = $this->getConnection($oAccount);
		if ($oSieveClient) {
			$aModules = $oSieveClient->Modules();
			\sort($aModules);

			$aList = $oSieveClient->ListScripts();

			foreach ($aList as $name => $active) {
				$aScripts[$name] = array(
					'@Object' => 'Object/SieveScript',
					'name' => $name,
					'active' => $active,
					'body' => $oSieveClient->GetScript($name)
				);
			}

			$oSieveClient->Disconnect();

			if (!isset($aList[self::SIEVE_FILE_NAME])) {
				$aScripts[self::SIEVE_FILE_NAME] = array(
					'@Object' => 'Object/SieveScript',
					'name' => self::SIEVE_FILE_NAME,
					'active' => false,
					'body' => '',
					'filters' => []
				);
			}
		}

		\ksort($aScripts);

		return array(
			'Capa' => $aModules,
			'Scripts' => $aScripts
		);
	}

	public function Save(\RainLoop\Model\Account $oAccount, string $sScriptName, array $aFilters, string $sRaw = '') : bool
	{
		if ($aFilters && !$sRaw) {
			Sieve::$bUtf8FolderName = !!$this->oConfig->Get('labs', 'sieve_utf8_folder_name', true);
			$sRaw = Sieve::collectionToFileString($aFilters);
		}
		$oSieveClient = $this->getConnection($oAccount);
		if ($oSieveClient) {
			if (empty($sRaw)) {
				$aList = $oSieveClient->ListScripts();
				if (isset($aList[$sScriptName])) {
					$oSieveClient->DeleteScript($sScriptName);
				}
			} else {
				$oSieveClient->PutScript($sScriptName, $sRaw);
			}
			$oSieveClient->Disconnect();
			return true;
		}
		return false;
	}

	/**
	 * If $sScriptName is the empty string (i.e., ""), then any active script is disabled.
	 */
	public function Activate(\RainLoop\Model\Account $oAccount, string $sScriptName) : bool
	{
		$oSieveClient = $this->getConnection($oAccount);
		if ($oSieveClient) {
			$oSieveClient->SetActiveScript(\trim($sScriptName));
			return true;
		}
		return false;
	}
/*
	public function Check(\RainLoop\Model\Account $oAccount, string $sScript) : bool
	{
		$oSieveClient = $this->getConnection($oAccount);
		if ($oSieveClient) {
			$oSieveClient->CheckScript($sScript);
			return true;
		}
		return false;
	}
*/
	public function Delete(\RainLoop\Model\Account $oAccount, string $sScriptName) : bool
	{
		$oSieveClient = $this->getConnection($oAccount);
		if ($oSieveClient) {
			$oSieveClient->DeleteScript(\trim($sScriptName));
			return true;
		}
		return false;
	}

	public function SetLogger(?\MailSo\Log\Logger $oLogger)
	{
		$this->oLogger = $oLogger;
	}
}
