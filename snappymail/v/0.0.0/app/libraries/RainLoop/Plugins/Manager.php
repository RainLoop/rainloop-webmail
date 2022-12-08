<?php

namespace RainLoop\Plugins;

class Manager
{
	/**
	 * @var \RainLoop\Actions
	 */
	private $oActions;

	private array
		$aHooks = array(),
		$aCss = array([], []),
		$aJs = array([], []),
		$aTemplates = array(),
		$aAdminTemplates = array(),
		$aAdditionalParts = array(),
		$aAdditionalJson = array(),
		$aPlugins = array();

	private bool $bIsEnabled;

	/**
	 * @var \MailSo\Log\Logger
	 */
	private $oLogger;

	public function __construct(\RainLoop\Actions $oActions)
	{
		$this->oLogger = null;
		$this->oActions = $oActions;

		$oConfig = $oActions->Config();
		$this->bIsEnabled = (bool) $oConfig->Get('plugins', 'enable', false);
		if ($this->bIsEnabled) {
			$sList = $oConfig->Get('plugins', 'enabled_list', '');
			if (\strlen($sList)) {
				$aList = \SnappyMail\Repository::getEnabledPackagesNames();
				foreach ($aList as $i => $sName) {
					if (!$this->loadPlugin($sName)) {
						unset($aList[$i]);
					}
				}
				$aList = \implode(',', \array_keys($this->aPlugins));
				if ($sList != $aList) {
					$oConfig->Set('plugins', 'enabled_list', $aList);
					$oConfig->Save();
				}
			}
		}
	}

	public function loadPlugin(string $sName) : bool
	{
		if (!isset($this->aPlugins[$sName])) {
			$oPlugin = $this->CreatePluginByName($sName);
			if ($oPlugin) {
				$oPlugin->Init();
				$this->aPlugins[$sName] = $oPlugin;
			}
		}
		return isset($this->aPlugins[$sName]);
	}

	protected static function getPluginPath(string $sName) : ?string
	{
		$sPath = APP_PLUGINS_PATH.$sName;
		if (\is_readable("{$sPath}/index.php")) {
			return $sPath;
		}
		if (\is_readable("{$sPath}.phar")) {
			return "phar://{$sPath}.phar";
		}
		return null;
	}

	public function CreatePluginByName(string $sName) : ?\RainLoop\Plugins\AbstractPlugin
	{
		$oPlugin = null;

		$sClassName = $this->loadPluginByName($sName);
		if ($sClassName) {
			$oPlugin = new $sClassName();
			$oPlugin
				->SetName($sName)
				->SetPath(static::getPluginPath($sName))
				->SetPluginManager($this)
				->SetPluginConfig(new \RainLoop\Config\Plugin($sName, $oPlugin->ConfigMap(true)))
			;
			if (\method_exists($oPlugin, 'SetLogger')) {
				$oPlugin->SetLogger($this->oLogger);
			}
		}

		return $oPlugin;
	}

	public function InstalledPlugins() : array
	{
		$aList = array();

		$aGlob = \glob(APP_PLUGINS_PATH.'*');
		if (\is_array($aGlob))
		{
			foreach ($aGlob as $sPathName)
			{
				if (\is_dir($sPathName)) {
					$sName = \basename($sPathName);
				} else if ('.phar' === \substr($sPathName, -5)) {
					$sName = \basename($sPathName, '.phar');
				} else {
					continue;
				}
				$sClassName = $this->loadPluginByName($sName);
				if ($sClassName) {
					$aList[] = array(
						$sName,
						$sClassName::VERSION,
						$sClassName::NAME,
						$sClassName::DESCRIPTION
					);
				}
			}
		}
		else
		{
			$this->oActions->Logger()->Write('Cannot get installed plugins from '.APP_PLUGINS_PATH,
				\LOG_ERR);
		}

		return $aList;
	}

	public function convertPluginFolderNameToClassName(string $sFolderName) : string
	{
		$aParts = \array_map('ucfirst', \array_map('strtolower',
			\explode(' ', \preg_replace('/[^a-z0-9]+/', ' ', $sFolderName))));

		return \implode($aParts).'Plugin';
	}

	public function loadPluginByName(string $sName) : ?string
	{
		if (\preg_match('/^[a-z0-9\\-]+$/', $sName)) {
			$sClassName = $this->convertPluginFolderNameToClassName($sName);
			if (!\class_exists($sClassName)) {
				$sPath = static::getPluginPath($sName);
				if (\is_readable($sPath.'/index.php')) {
					include_once $sPath.'/index.php';
				}
			}
			if (\class_exists($sClassName) && \is_subclass_of($sClassName, 'RainLoop\\Plugins\\AbstractPlugin')) {
				return $sClassName;
			}
			\trigger_error("Invalid plugin class {$sClassName}");
		}

		return null;
	}

	public function Actions() : \RainLoop\Actions
	{
		return $this->oActions;
	}

	public function Hash() : string
	{
		return \md5(
			\array_reduce($this->aPlugins, function($sResult, $oPlugin){
				return $sResult . "|{$oPlugin->Hash()}";
			}, APP_VERSION)
			.implode('',$this->aJs[1]).implode('',$this->aJs[0])
			.implode('',$this->aCss[1]).implode('',$this->aCss[0])
		);
	}

	public function HaveJs(bool $bAdminScope = false) : bool
	{
		return $this->bIsEnabled && \count($this->aJs[$bAdminScope ? 1 : 0]);
	}

	public function CompileCss(bool $bAdminScope, bool &$bLess, bool $bMinified) : string
	{
		$aResult = array();
		if ($this->bIsEnabled) {
			foreach ($this->aCss[$bAdminScope ? 1 : 0] as $sFile) {
				if ($bMinified) {
					$sMinFile = \str_replace('.css', '.min.css', $sFile);
					if (\is_readable($sMinFile)) {
						$sFile = $sMinFile;
					}
				}
				if (\is_readable($sFile)) {
					$aResult[] = \file_get_contents($sFile);
					$bLess = $bLess || \str_ends_with($sFile, '.less');
				}
			}
		}
		return \implode("\n", $aResult);
	}

	public function CompileJs(bool $bAdminScope = false, bool $bMinified = false) : string
	{
		$aResult = array();
		if ($this->bIsEnabled) {
			foreach ($this->aJs[$bAdminScope ? 1 : 0] as $sFile) {
				if ($bMinified) {
					$sMinFile = \str_replace('.js', '.min.js', $sFile);
					if (\is_readable($sMinFile)) {
						$sFile = $sMinFile;
					}
				}
				if (\is_readable($sFile)) {
					$aResult[] = \file_get_contents($sFile);
				}
			}
		}

		return \implode("\n", $aResult);
	}

	public function CompileTemplate(array &$aList, bool $bAdminScope = false) : void
	{
		if ($this->bIsEnabled)
		{
			$aTemplates = $bAdminScope ? $this->aAdminTemplates : $this->aTemplates;
			foreach ($aTemplates as $sFile)
			{
				if (\is_readable($sFile))
				{
					$sTemplateName = \substr(\basename($sFile), 0, -5);
					$aList[$sTemplateName] = $sFile;
				}
			}
		}
	}

	public function InitAppData(bool $bAdmin, array &$aAppData, ?\RainLoop\Model\Account $oAccount = null) : self
	{
		if ($this->bIsEnabled && isset($aAppData['Plugins']) && \is_array($aAppData['Plugins']))
		{
			$bAuth = !empty($aAppData['Auth']);
			foreach ($this->aPlugins as $oPlugin)
			{
				if ($oPlugin)
				{
					$aConfig = array();
					$aMap = $oPlugin->ConfigMap(true);
					if (\is_array($aMap))
					{
						foreach ($aMap as /* @var $oPluginProperty \RainLoop\Plugins\Property */ $oPluginProperty)
						{
							if ($oPluginProperty && $oPluginProperty->AllowedInJs())
							{
								$aConfig[$oPluginProperty->Name()] =
									$oPlugin->Config()->Get('plugin',
										$oPluginProperty->Name(),
										$oPluginProperty->DefaultValue());
							}
						}
					}

					$oPlugin->FilterAppDataPluginSection($bAdmin, $bAuth, $aConfig);

					if (\count($aConfig))
					{
						$aAppData['Plugins'][$oPlugin->Name()] = $aConfig;
					}
				}
			}

			$this->RunHook('filter.app-data', array($bAdmin, &$aAppData));
		}

		return $this;
	}

	/**
	 * @param mixed $mCallbak
	 */
	public function AddHook(string $sHookName, $mCallbak) : self
	{
		if ($this->bIsEnabled && \is_callable($mCallbak)) {
			$sHookName = \strtolower($sHookName);
			if (!isset($this->aHooks[$sHookName])) {
				$this->aHooks[$sHookName] = array();
			}
			$this->aHooks[$sHookName][] = $mCallbak;
		}
		return $this;
	}

	public function AddCss(string $sFile, bool $bAdminScope = false) : self
	{
		if ($this->bIsEnabled) {
			$this->aCss[$bAdminScope ? 1 : 0][] = $sFile;
		}
		return $this;
	}

	public function AddJs(string $sFile, bool $bAdminScope = false) : self
	{
		if ($this->bIsEnabled) {
			$this->aJs[$bAdminScope ? 1 : 0][$sFile] = $sFile;
		}

		return $this;
	}

	public function AddTemplate(string $sFile, bool $bAdminScope = false) : self
	{
		if ($this->bIsEnabled)
		{
			if ($bAdminScope)
			{
				$this->aAdminTemplates[$sFile] = $sFile;
			}
			else
			{
				$this->aTemplates[$sFile] = $sFile;
			}
		}

		return $this;
	}

	public function RunHook(string $sHookName, array $aArg = array(), bool $bLogHook = true) : self
	{
		if ($this->bIsEnabled) {
			$sHookName = \strtolower($sHookName);
			if (isset($this->aHooks[$sHookName])) {
				if ($bLogHook) {
					$this->WriteLog('Hook: '.$sHookName, \LOG_INFO);
				}
				foreach ($this->aHooks[$sHookName] as $mCallback) {
					$mCallback(...$aArg);
				}
			}
		}
		return $this;
	}

	/**
	 * @param mixed $mCallbak
	 */
	public function AddAdditionalPartAction(string $sActionName, $mCallbak) : self
	{
		if ($this->bIsEnabled && \is_callable($mCallbak))
		{
			$sActionName = \strtolower($sActionName);
			if (!isset($this->aAdditionalParts[$sActionName]))
			{
				$this->aAdditionalParts[$sActionName] = array();
			}

			$this->aAdditionalParts[$sActionName][] = $mCallbak;
		}

		return $this;
	}

	public function RunAdditionalPart(string $sActionName, array $aParts = array()) : bool
	{
		$bResult = false;
		if ($this->bIsEnabled)
		{
			$sActionName = \strtolower($sActionName);
			if (isset($this->aAdditionalParts[$sActionName]))
			{
				foreach ($this->aAdditionalParts[$sActionName] as $mCallbak)
				{
					$bResult = !!$mCallbak(...$aParts) || $bResult;
				}
			}
		}

		return $bResult;
	}

	public function AddAdditionalJsonAction(string $sActionName, callable $mCallback) : self
	{
		$sActionName = "DoPlugin{$sActionName}";
		if ($this->bIsEnabled && \strlen($sActionName) && !isset($this->aAdditionalJson[$sActionName])) {
			$this->aAdditionalJson[$sActionName] = $mCallback;
		}
		return $this;
	}

	public function HasAdditionalJson(string $sActionName) : bool
	{
		return $this->bIsEnabled && isset($this->aAdditionalJson[$sActionName]);
	}

	/**
	 * @return mixed
	 */
	public function RunAdditionalJson(string $sActionName)
	{
		return $this->HasAdditionalJson($sActionName) ? $this->aAdditionalJson[$sActionName]() : false;
	}

	/**
	 * @param mixed $mData
	 */
	public function JsonResponseHelper(string $sFunctionName, $mData) : array
	{
		return $this->oActions->DefaultResponse($sFunctionName, $mData);
	}

	public function GetUserPluginSettings(string $sPluginName) : array
	{
		$oAccount = $this->oActions->GetAccount();
		if ($oAccount)
		{
			$oSettings = $this->oActions->SettingsProvider()->Load($oAccount);
			if ($oSettings)
			{
				$aData = $oSettings->GetConf('Plugins', array());
				if (isset($aData[$sPluginName]) && \is_array($aData[$sPluginName]))
				{
					return $aData[$sPluginName];
				}
			}
		}

		return array();
	}

	public function SaveUserPluginSettings(string $sPluginName, array $aSettings) : bool
	{
		$oAccount = $this->oActions->GetAccount();
		if ($oAccount)
		{
			$oSettings = $this->oActions->SettingsProvider()->Load($oAccount);
			if ($oSettings)
			{
				$aData = $oSettings->GetConf('Plugins', array());
				if (!\is_array($aData))
				{
					$aData = array();
				}

				$aPluginSettings = array();
				if (isset($aData[$sPluginName]) && \is_array($aData[$sPluginName]))
				{
					$aPluginSettings = $aData[$sPluginName];
				}

				foreach ($aSettings as $sKey => $mValue)
				{
					$aPluginSettings[$sKey] = $mValue;
				}

				$aData[$sPluginName] = $aPluginSettings;
				$oSettings->SetConf('Plugins',$aData);

				return $this->oActions->SettingsProvider()->Save($oAccount, $oSettings);
			}
		}

		return false;
	}

	public function ReadLang(string $sLang, array &$aLang) : void
	{
		if ($this->bIsEnabled) {
			foreach ($this->aPlugins as $oPlugin) {
				if ($oPlugin->UseLangs()) {
					$sPath = $oPlugin->Path().'/langs/';
					$aPLang = [];

					// First get english
					if (\is_file("{$sPath}en.ini")) {
						$aPLang = \parse_ini_file("{$sPath}en.ini", true);
					} else if (\is_file("{$sPath}en.json")) {
						$aPLang = \json_decode(\file_get_contents("{$sPath}en.json"), true);
					}
					if ($aPLang) {
						$aLang = \array_replace_recursive($aLang, $aPLang);
					}

					// Now get native
					if ('en' !== $sLang) {
						$aPLang = [];
						if (\is_file("{$sPath}{$sLang}.ini")) {
							$aPLang = \parse_ini_file("{$sPath}{$sLang}.ini", true);
						} else if (\is_file($sPath.\strtr($sLang,'-','_').'.ini')) {
							$aPLang = \parse_ini_file($sPath.\strtr($sLang,'-','_').'.ini', true);
						} else if (\is_file("{$sPath}{$sLang}.json")) {
							$aPLang = \json_decode(\file_get_contents("{$sPath}{$sLang}.json"), true);
						}
						if ($aPLang) {
							$aLang = \array_replace_recursive($aLang, $aPLang);
						}
					}
				}
			}
		}
	}

	public function IsEnabled() : bool
	{
		return $this->bIsEnabled;
	}

	public function Count() : int
	{
		return $this->bIsEnabled ? \count($this->aPlugins) : 0;
	}

	public function SetLogger(\MailSo\Log\Logger $oLogger) : self
	{
		$this->oLogger = $oLogger;

		return $this;
	}

	public function WriteLog(string $sDesc, int $iType = \LOG_INFO) : void
	{
		if ($this->oLogger)
		{
			$this->oLogger->Write($sDesc, $iType, 'PLUGIN');
		}
	}

	public function WriteException(string $sDesc, int $iType = \LOG_INFO) : void
	{
		if ($this->oLogger)
		{
			$this->oLogger->WriteException($sDesc, $iType, 'PLUGIN');
		}
	}
}
