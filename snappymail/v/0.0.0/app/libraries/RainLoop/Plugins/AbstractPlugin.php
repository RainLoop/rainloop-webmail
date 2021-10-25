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
		LICENSE  = 'MIT',
		DESCRIPTION = '';

	/**
	 * @var \RainLoop\Plugins\Manager
	 */
	private $oPluginManager = null;

	/**
	 * @var \RainLoop\Config\Plugin
	 */
	private $oPluginConfig = null;

	/**
	 * @var bool
	 */
	private $bLangs = false;

	/**
	 * @var string
	 */
	private $sName;

	/**
	 * @var string
	 */
	private $sPath = '';

	/**
	 * @var array
	 */
	private $aConfigMap = null;

	public function __construct()
	{
		$this->sName = static::NAME;
	}

	public function Config() : \RainLoop\Config\Plugin
	{
		return $this->oPluginConfig;
	}

	public function Manager() : \RainLoop\Plugins\Manager
	{
		return $this->oPluginManager;
	}

	public function Path() : string
	{
		return $this->sPath;
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
		if (null !== $bLangs)
		{
			$this->bLangs = $bLangs;
		}

		return $this->bLangs;
	}

	protected function configMapping() : array
	{
		return array();
	}

	public function Hash() : string
	{
		return \md5($this->sName . '@' . static::VERSION);
	}

	public function Supported() : string
	{
		return '';
	}

	final public function ConfigMap() : array
	{
		if (null === $this->aConfigMap)
		{
			$this->aConfigMap = $this->configMapping();
		}

		return $this->aConfigMap;
	}

	public function SetPath(string $sPath) : self
	{
		$this->sPath = $sPath;

		return $this;
	}

	public function SetName(string $sName) : self
	{
		$this->sName = $sName;

		return $this;
	}

	public function SetVersion(string $sVersion) : self
	{
		if (0 < \strlen($sVersion))
		{
			$this->sVersion = $sVersion;
		}

		return $this;
	}

	public function SetPluginManager(\RainLoop\Plugins\Manager $oPluginManager) : self
	{
		$this->oPluginManager = $oPluginManager;

		return $this;
	}

	public function SetPluginConfig(\RainLoop\Config\Plugin $oPluginConfig) : self
	{
		$this->oPluginConfig = $oPluginConfig;
		if ($oPluginConfig->IsInited() && !$oPluginConfig->Load())
		{
			$oPluginConfig->Save();
		}
		return $this;
	}

	public function Init() : void
	{

	}

	public function FilterAppDataPluginSection(bool $bAdmin, bool $bAuth, array &$aConfig) : void
	{

	}

	protected function addHook(string $sHookName, string $sFunctionName) : self
	{
		if ($this->oPluginManager)
		{
			$this->oPluginManager->AddHook($sHookName, array($this, $sFunctionName));
		}

		return $this;
	}

	protected function addCss(string $sFile, bool $bAdminScope = false) : self
	{
		if ($this->oPluginManager)
		{
			$this->oPluginManager->AddCss($this->sPath.'/'.$sFile, $bAdminScope);
		}

		return $this;
	}

	protected function addJs(string $sFile, bool $bAdminScope = false) : self
	{
		if ($this->oPluginManager)
		{
			$this->oPluginManager->AddJs($this->sPath.'/'.$sFile, $bAdminScope);
		}

		return $this;
	}

	protected function addTemplate(string $sFile, bool $bAdminScope = false) : self
	{
		if ($this->oPluginManager)
		{
			$this->oPluginManager->AddTemplate($this->sPath.'/'.$sFile, $bAdminScope);
		}

		return $this;
	}

	protected function replaceTemplate(string $sFile, bool $bAdminScope = false) : self
	{
		if ($this->oPluginManager)
		{
			$this->oPluginManager->AddTemplate($this->sPath.'/'.$sFile, $bAdminScope);
		}

		return $this;
	}

	protected function addPartHook(string $sActionName, string $sFunctionName) : self
	{
		if ($this->oPluginManager)
		{
			$this->oPluginManager->AddAdditionalPartAction($sActionName, array($this, $sFunctionName));
		}

		return $this;
	}

	protected function addJsonHook(string $sActionName, string $sFunctionName) : self
	{
		if ($this->oPluginManager)
		{
			$this->oPluginManager->AddAdditionalJsonAction($sActionName, array($this, $sFunctionName));
		}

		return $this;
	}

	protected function addTemplateHook(string $sName, string $sPlace, string $sLocalTemplateName, bool $bPrepend = false) : self
	{
		if ($this->oPluginManager)
		{
			$this->oPluginManager->AddProcessTemplateAction($sName, $sPlace,
				'<!-- ko template: \''.$sLocalTemplateName.'\' --><!-- /ko -->', $bPrepend);
		}

		return $this;
	}

	/**
	 * @return mixed false|string|array
	 */
	protected function jsonResponse(string $sFunctionName, $mData)
	{
		if ($this->oPluginManager)
		{
			return $this->oPluginManager->JsonResponseHelper(
				$this->oPluginManager->convertPluginFolderNameToClassName($this->Name()).'::'.$sFunctionName, $mData);
		}

		return \json_encode($mData);
	}

	/**
	 * @param mixed $mDefault = null
	 *
	 * @return mixed
	 */
	public function jsonParam(string $sKey, $mDefault = null)
	{
		if ($this->oPluginManager)
		{
			return $this->oPluginManager->Actions()->GetActionParam($sKey, $mDefault);
		}

		return '';
	}

	public function getUserSettings() : array
	{
		if ($this->oPluginManager)
		{
			return $this->oPluginManager->GetUserPluginSettings($this->Name());
		}

		return array();
	}

	public function saveUserSettings(array $aSettings) : bool
	{
		if ($this->oPluginManager)
		{
			return $this->oPluginManager->SaveUserPluginSettings($this->Name(), $aSettings);
		}

		return false;
	}
}
