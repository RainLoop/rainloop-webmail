<?php

namespace RainLoop\Plugins;

abstract class AbstractPlugin
{
	const
		NAME     = '',
		AUTHOR   = 'SnappyMail',
		URL      = 'https://snappymail.eu/',
		VERSION  = '0.0',
		RELEASE  = '2020-11-01',
		REQUIRED = '2.0.0',
		CATEGORY = 'General',
		LICENSE  = 'AGPL v3',
		DESCRIPTION = '';

	/**
	 * @var \RainLoop\Plugins\Manager
	 */
	private $oPluginManager = null;

	/**
	 * @var \RainLoop\Config\Plugin
	 */
	private $oPluginConfig = null;

	private bool $bLangs = false;

	private string $sName;

	private string $sPath = '';

	private ?array $aConfigMap = null;

	public function __construct()
	{
		$this->sName = static::NAME;
	}

	public function Name() : string
	{
		return $this->sName;
	}

	public function Description() : string
	{
		$sFile = $this->Path().'/README';
		return \is_readable($sFile) ? \file_get_contents($sFile) : static::DESCRIPTION;
	}

	public function UseLangs(?bool $bLangs = null) : bool
	{
		if (null !== $bLangs) {
			$this->bLangs = $bLangs;
		}

		return $this->bLangs;
	}

	protected function configMapping() : array
	{
		return array();
	}

	public function Supported() : string
	{
		return '';
	}

	public function Init() : void
	{

	}

	public function FilterAppDataPluginSection(bool $bAdmin, bool $bAuth, array &$aConfig) : void
	{

	}

	final public function Hash() : string
	{
		return static::class . '@' . static::VERSION;
	}

	final public function Config() : \RainLoop\Config\Plugin
	{
		return $this->oPluginConfig;
	}

	final public function Manager() : \RainLoop\Plugins\Manager
	{
		return $this->oPluginManager;
	}

	final public function Path() : string
	{
		return $this->sPath;
	}

	final public function ConfigMap(bool $flatten = false) : array
	{
		if (null === $this->aConfigMap) {
			$this->aConfigMap = $this->configMapping();
		}

		if ($flatten) {
			$result = [];
			foreach ($this->aConfigMap as $oItem) {
				if ($oItem) {
					if ($oItem instanceof \RainLoop\Plugins\Property) {
						$result[] = $oItem;
					} else if ($oItem instanceof \RainLoop\Plugins\PropertyCollection) {
						foreach ($oItem as $oSubItem) {
							if ($oSubItem && $oSubItem instanceof \RainLoop\Plugins\Property) {
								$result[] = $oSubItem;
							}
						}
					}
				}
			}
			return $result;
		}

		return $this->aConfigMap;
	}

	final public function SetPath(string $sPath) : self
	{
		$this->sPath = $sPath;

		return $this;
	}

	final public function SetName(string $sName) : self
	{
		$this->sName = $sName;

		return $this;
	}

	final public function SetPluginManager(\RainLoop\Plugins\Manager $oPluginManager) : self
	{
		$this->oPluginManager = $oPluginManager;

		return $this;
	}

	final public function SetPluginConfig(\RainLoop\Config\Plugin $oPluginConfig) : self
	{
		$this->oPluginConfig = $oPluginConfig;
		if ($oPluginConfig->IsInited() && !$oPluginConfig->Load()) {
			$oPluginConfig->Save();
		}
		return $this;
	}

	final protected function addHook(string $sHookName, string $sFunctionName) : self
	{
		if ($this->oPluginManager) {
			$this->oPluginManager->AddHook($sHookName, array($this, $sFunctionName));
		}

		return $this;
	}

	final protected function addCss(string $sFile, bool $bAdminScope = false) : self
	{
		if ($this->oPluginManager) {
			$this->oPluginManager->AddCss($this->sPath.'/'.$sFile, $bAdminScope);
		}

		return $this;
	}

	final protected function addJs(string $sFile, bool $bAdminScope = false) : self
	{
		if ($this->oPluginManager) {
			$this->oPluginManager->AddJs($this->sPath.'/'.$sFile, $bAdminScope);
		}

		return $this;
	}

	final protected function addTemplate(string $sFile, bool $bAdminScope = false) : self
	{
		if ($this->oPluginManager) {
			$this->oPluginManager->AddTemplate($this->sPath.'/'.$sFile, $bAdminScope);
		}

		return $this;
	}

	final protected function replaceTemplate(string $sFile, bool $bAdminScope = false) : self
	{
		if ($this->oPluginManager) {
			$this->oPluginManager->AddTemplate($this->sPath.'/'.$sFile, $bAdminScope);
		}

		return $this;
	}

	final protected function addPartHook(string $sActionName, string $sFunctionName) : self
	{
		if ($this->oPluginManager) {
			$this->oPluginManager->AddAdditionalPartAction($sActionName, array($this, $sFunctionName));
		}

		return $this;
	}

	final protected function addJsonHook(string $sActionName, string $sFunctionName) : self
	{
		if ($this->oPluginManager) {
			$this->oPluginManager->AddAdditionalJsonAction($sActionName, array($this, $sFunctionName));
		}

		return $this;
	}

	/**
	 * @return mixed false|string|array
	 */
	final protected function jsonResponse(string $sFunctionName, $mData)
	{
		return $this->oPluginManager
			? $this->oPluginManager->JsonResponseHelper(
				$this->oPluginManager->convertPluginFolderNameToClassName($this->Name()).'::'.$sFunctionName, $mData)
			: \json_encode($mData);
	}

	/**
	 * @param mixed $mDefault = null
	 *
	 * @return mixed
	 */
	final public function jsonParam(string $sKey, $mDefault = null)
	{
		return $this->oPluginManager
			? $this->oPluginManager->Actions()->GetActionParam($sKey, $mDefault)
			: $mDefault;
	}

	final public function getUserSettings() : array
	{
		return $this->oPluginManager
			? $this->oPluginManager->GetUserPluginSettings($this->Name())
			: array();
	}

	final public function saveUserSettings(array $aSettings) : bool
	{
		return $this->oPluginManager
			&& $this->oPluginManager->SaveUserPluginSettings($this->Name(), $aSettings);
	}
}
