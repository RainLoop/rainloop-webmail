<?php

namespace RainLoop\Plugins;

abstract class AbstractPlugin
{
	/**
	 * @var \RainLoop\Plugins\Manager
	 */
	private $oPluginManager;

	/**
	 * @var \RainLoop\Config\Plugin
	 */
	private $oPluginConfig;

	/**
	 * @var bool
	 */
	private $bLangs;

	/**
	 * @var string
	 */
	private $sName;

	/**
	 * @var string
	 */
	private $sPath;

	/**
	 * @var string
	 */
	private $sVersion;

	/**
	 * @var array
	 */
	private $aConfigMap;

	/**
	 * @var bool
	 */
	private $bPluginConfigLoaded;

	public function __construct()
	{
		$this->sName = '';
		$this->sPath = '';
		$this->sVersion = '0.0';
		$this->aConfigMap = null;

		$this->oPluginManager = null;
		$this->oPluginConfig = null;
		$this->bPluginConfigLoaded = false;
		$this->bLangs = false;
	}

	/**
	 * @return \RainLoop\Config\Plugin
	 */
	public function Config()
	{
		if (!$this->bPluginConfigLoaded && $this->oPluginConfig)
		{
			$this->bPluginConfigLoaded = true;
			if ($this->oPluginConfig->IsInited())
			{
				if (!$this->oPluginConfig->Load())
				{
					$this->oPluginConfig->Save();
				}
			}
		}

		return $this->oPluginConfig;
	}

	/**
	 * @return \RainLoop\Plugins\Manager
	 */
	public function Manager()
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

	public function Version() : string
	{
		return $this->sVersion;
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
		return \md5($this->sName.'@'.$this->sVersion);
	}

	public function Supported() : string
	{
		return '';
	}

	/**
	 * @final
	 */
	final public function ConfigMap() : array
	{
		if (null === $this->aConfigMap)
		{
			$this->aConfigMap = $this->configMapping();
			if (!is_array($this->aConfigMap))
			{
				$this->aConfigMap = array();
			}
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

		return $this;
	}

	/**
	 * @return void
	 */
	public function PreInit()
	{

	}

	/**
	 * @return void
	 */
	public function Init()
	{

	}

	/**
	 * @return void
	 */
	public function FilterAppDataPluginSection(bool $bAdmin, bool $bAuth, array &$aConfig)
	{

	}

	protected function addHook(string $sHookName, string $sFunctionName) : self
	{
		if ($this->oPluginManager)
		{
			$this->oPluginManager->AddHook($sHookName, array(&$this, $sFunctionName));
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
			$this->oPluginManager->AddAdditionalPartAction($sActionName, array(&$this, $sFunctionName));
		}

		return $this;
	}

	protected function addAjaxHook(string $sActionName, string $sFunctionName) : self
	{
		if ($this->oPluginManager)
		{
			$this->oPluginManager->AddAdditionalAjaxAction($sActionName, array(&$this, $sFunctionName));
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

	protected function ajaxResponse(string $sFunctionName, array $aData) : self
	{
		if ($this->oPluginManager)
		{
			return $this->oPluginManager->AjaxResponseHelper(
				$this->oPluginManager->convertPluginFolderNameToClassName($this->Name()).'::'.$sFunctionName, $aData);
		}

		return \json_encode($aData);
	}

	/**
	 * @param mixed $mDefault = null
	 *
	 * @return mixed
	 */
	public function ajaxParam(string $sKey, $mDefault = null)
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
		if ($this->oPluginManager && \is_array($aSettings))
		{
			return $this->oPluginManager->SaveUserPluginSettings($this->Name(), $aSettings);
		}

		return false;
	}
}
