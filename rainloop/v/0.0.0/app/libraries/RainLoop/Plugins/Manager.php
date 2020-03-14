<?php

namespace RainLoop\Plugins;

class Manager
{
	/**
	 * @var \RainLoop\Actions
	 */
	private $oActions;

	/**
	 * @var array
	 */
	private $aHooks;

	/**
	 * @var array
	 */
	private $aJs;

	/**
	 * @var array
	 */
	private $aAdminJs;

	/**
	 * @var array
	 */
	private $aTemplates;

	/**
	 * @var array
	 */
	private $aAdminTemplates;

	/**
	 * @var array
	 */
	private $aProcessTemplate;

	/**
	 * @var array
	 */
	private $aAdditionalParts;

	/**
	 * @var array
	 */
	private $aAdditionalAjax;

	/**
	 * @var array
	 */
	private $aPlugins;

	/**
	 * @var bool
	 */
	private $bIsEnabled;

	/**
	 * @var \MailSo\Log\Logger
	 */
	private $oLogger;

	/**
	 * @param \RainLoop\Actions $oActions
	 */
	public function __construct(\RainLoop\Actions $oActions)
	{
		$this->oLogger = null;
		$this->oActions = $oActions;
		$this->aPlugins = array();

		$this->aHooks = array();
		$this->aJs = array();
		$this->aAdminJs = array();
		$this->aTemplates = array();
		$this->aAdminTemplates = array();

		$this->aAjaxFilters = array();
		$this->aAdditionalAjax = array();
		$this->aProcessTemplate = array();

		$this->bIsEnabled = (bool) $this->oActions->Config()->Get('plugins', 'enable', false);
		if ($this->bIsEnabled)
		{
			$sList = \strtolower($this->oActions->Config()->Get('plugins', 'enabled_list', ''));
			if (0 < \strlen($sList))
			{
				$aList = \explode(',', $sList);
				$aList = \array_map('trim', $aList);

				foreach ($aList as $sName)
				{
					if (0 < \strlen($sName))
					{
						$oPlugin = $this->CreatePluginByName($sName);
						if ($oPlugin)
						{
							$oPlugin->PreInit();
							$oPlugin->Init();

							$this->aPlugins[] = $oPlugin;
						}
					}
				}
			}

			$this->RunHook('api.bootstrap.plugins');
		}
	}

	/**
	 *
	 * @return \RainLoop\Plugins\AbstractPlugin|null
	 */
	public function CreatePluginByName(string $sName)
	{
		$oPlugin = null;
		if (\preg_match('/^[a-z0-9\-]+$/', $sName) &&
			\file_exists(APP_PLUGINS_PATH.$sName.'/index.php'))
		{
			$sClassName = $this->convertPluginFolderNameToClassName($sName);

			if (!\class_exists($sClassName))
			{
				include APP_PLUGINS_PATH.$sName.'/index.php';
			}

			if (\class_exists($sClassName))
			{
				$oPlugin = new $sClassName();
				if ($oPlugin instanceof \RainLoop\Plugins\AbstractPlugin)
				{
					$oPlugin
						->SetName($sName)
						->SetPath(APP_PLUGINS_PATH.$sName)
						->SetVersion(\file_exists(APP_PLUGINS_PATH.$sName.'/VERSION') ?
							\file_get_contents(APP_PLUGINS_PATH.$sName.'/VERSION') : '')
						->SetPluginManager($this)
						->SetPluginConfig(new \RainLoop\Config\Plugin($sName, $oPlugin->ConfigMap()))
					;
				}
				else
				{
					$oPlugin = null;
				}
			}
		}

		return $oPlugin;
	}

	public function InstalledPlugins() : array
	{
		$aList = array();

		$aGlob = @\glob(APP_PLUGINS_PATH.'*', GLOB_ONLYDIR|GLOB_NOSORT);
		if (\is_array($aGlob))
		{
			foreach ($aGlob as $sPathName)
			{
				$sName = \basename($sPathName);
				if (\preg_match('/^[a-z0-9\-]+$/', $sName) &&
					\file_exists($sPathName.'/index.php'))
				{
					$aList[] = array(
						$sName,
						\file_exists($sPathName.'/VERSION') ?
							\file_get_contents($sPathName.'/VERSION') : '0.0'
					);
				}
			}
		}
		else
		{
			$this->Actions()->Logger()->Write('Cannot get installed plugins from '.APP_PLUGINS_PATH,
				\MailSo\Log\Enumerations\Type::ERROR);
		}

		return $aList;
	}

	public function convertPluginFolderNameToClassName(string $sFolderName) : string
	{
		$aParts = \array_map('ucfirst', \array_map('strtolower',
			\explode(' ', \preg_replace('/[^a-z0-9]+/', ' ', $sFolderName))));

		return \implode($aParts).'Plugin';
	}

	/**
	 * @return \RainLoop\Actions
	 */
	public function Actions()
	{
		return $this->oActions;
	}

	public function Hash() : string
	{
		$sResult = \md5(APP_VERSION);
		foreach ($this->aPlugins as $oPlugin)
		{
			$sResult = \md5($sResult.$oPlugin->Path().$oPlugin->Hash());
		}

		return $sResult;
	}

	public function HaveJs(bool $bAdminScope = false) : bool
	{
		$bResult = false;

		if ($this->bIsEnabled)
		{
			$bResult = $bAdminScope ? 0 < \count($this->aAdminJs) : 0 < \count($this->aJs);
		}

		return $bResult;
	}

	public function CompileJs(bool $bAdminScope = false) : string
	{
		$aResult = array();
		if ($this->bIsEnabled)
		{
			$aJs = $bAdminScope ? $this->aAdminJs : $this->aJs;
			foreach ($aJs as $sFile)
			{
				if (\file_exists($sFile))
				{
					$aResult[] = \file_get_contents($sFile);
				}
			}
		}

		return \implode("\n", $aResult);
	}

	/**
	 * @todo
	 *
	 */
	public function CompileCss(bool $bAdminScope = false) : string
	{
		return '';
	}

	public function CompileTemplate(array &$aList, bool $bAdminScope = false) : string
	{
		if ($this->bIsEnabled)
		{
			$aTemplates = $bAdminScope ? $this->aAdminTemplates : $this->aTemplates;
			foreach ($aTemplates as $sFile)
			{
				if (\file_exists($sFile))
				{
					$sTemplateName = \substr(\basename($sFile), 0, -5);
					$aList[$sTemplateName] = $sFile;
				}
			}
		}
	}

	/**
	 * @param \RainLoop\Model\Account|null $oAccount = null
	 *
	 * @return \RainLoop\Plugins\Manager
	 */
	public function InitAppData(bool $bAdmin, array &$aAppData, $oAccount = null)
	{
		if ($this->bIsEnabled && isset($aAppData['Plugins']) && \is_array($aAppData['Plugins']))
		{
			$bAuth = isset($aAppData['Auth']) && !!$aAppData['Auth'];
			foreach ($this->aPlugins as $oPlugin)
			{
				if ($oPlugin)
				{
					$aConfig = array();
					$aMap = $oPlugin->ConfigMap();
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

					if (0 < \count($aConfig))
					{
						$aAppData['Plugins'][$oPlugin->Name()] = $aConfig;
					}
				}
			}

			$this->RunHook('filter.app-data', array($bAdmin, &$aAppData));

			$this->RunHook('filter.app-data[2]', array(
				'IsAdmin' => $bAdmin,
				'AppData' => &$aAppData,
				'Account' => $oAccount
			));
		}

		return $this;
	}

	/**
	 * @param mixed $mCallbak
	 *
	 * @return \RainLoop\Plugins\Manager
	 */
	public function AddHook(string $sHookName, $mCallbak)
	{
		if ($this->bIsEnabled && \is_callable($mCallbak))
		{
			if (!isset($this->aHooks[$sHookName]))
			{
				$this->aHooks[$sHookName] = array();
			}

			$this->aHooks[$sHookName][] = $mCallbak;
		}

		return $this;
	}

	/**
	 *
	 * @return \RainLoop\Plugins\Manager
	 */
	public function AddJs(string $sFile, bool $bAdminScope = false)
	{
		if ($this->bIsEnabled)
		{
			if ($bAdminScope)
			{
				$this->aAdminJs[$sFile] = $sFile;
			}
			else
			{
				$this->aJs[$sFile] = $sFile;
			}
		}

		return $this;
	}

	/**
	 *
	 * @return \RainLoop\Plugins\Manager
	 */
	public function AddTemplate(string $sFile, bool $bAdminScope = false)
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

	/**
	 *
	 * @return \RainLoop\Plugins\Manager
	 */
	public function RunHook(string $sHookName, array $aArg = array(), bool $bLogHook = true)
	{
		if ($this->bIsEnabled)
		{
			if (isset($this->aHooks[$sHookName]))
			{
				if ($bLogHook)
				{
					$this->WriteLog('Hook: '.$sHookName, \MailSo\Log\Enumerations\Type::NOTE);
				}

				foreach ($this->aHooks[$sHookName] as $mCallback)
				{
					\call_user_func_array($mCallback, $aArg);
				}
			}
		}

		return $this;
	}

	/**
	 * @param mixed $mCallbak
	 *
	 * @return \RainLoop\Plugins\Manager
	 */
	public function AddAdditionalPartAction(string $sActionName, $mCallbak)
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

	/**
	 *
	 * @return \RainLoop\Plugins\Manager
	 */
	public function RunAdditionalPart(string $sActionName, array $aParts = array())
	{
		$bResult = false;
		if ($this->bIsEnabled)
		{
			$sActionName = \strtolower($sActionName);
			if (isset($this->aAdditionalParts[$sActionName]))
			{
				foreach ($this->aAdditionalParts[$sActionName] as $mCallbak)
				{
					$bCallResult = \call_user_func_array($mCallbak, $aParts);
					if ($bCallResult && !$bResult)
					{
						$bResult = true;
					}
				}
			}
		}

		return $bResult;
	}

	/**
	 *
	 * @return \RainLoop\Plugins\Manager
	 */
	public function AddProcessTemplateAction(string $sName, string $sPlace, string $sHtml, bool $bPrepend = false)
	{
		if ($this->bIsEnabled)
		{
			if (!isset($this->aProcessTemplate[$sName]))
			{
				$this->aProcessTemplate[$sName] = array();
			}

			if (!isset($this->aProcessTemplate[$sName][$sPlace]))
			{
				$this->aProcessTemplate[$sName][$sPlace] = array();
			}

			if ($bPrepend)
			{
				\array_unshift($this->aProcessTemplate[$sName][$sPlace], $sHtml);
			}
			else
			{
				\array_push($this->aProcessTemplate[$sName][$sPlace], $sHtml);
			}
		}

		return $this;
	}

	/**
	 * @param mixed $mCallback
	 *
	 * @return \RainLoop\Plugins\Manager
	 */
	public function AddAdditionalAjaxAction(string $sActionName, $mCallback)
	{
		if ($this->bIsEnabled && \is_callable($mCallback) && 0 < \strlen($sActionName))
		{
			$sActionName = 'DoPlugin'.$sActionName;

			if (!isset($this->aAdditionalAjax[$sActionName]))
			{
				$this->aAdditionalAjax[$sActionName] = $mCallback;
			}
		}

		return $this;
	}

	public function HasAdditionalAjax(string $sActionName) : bool
	{
		return $this->bIsEnabled && isset($this->aAdditionalAjax[$sActionName]);
	}

	/**
	 *
	 * @return mixed
	 */
	public function RunAdditionalAjax(string $sActionName)
	{
		if ($this->bIsEnabled)
		{
			if (isset($this->aAdditionalAjax[$sActionName]))
			{
				return \call_user_func($this->aAdditionalAjax[$sActionName]);
			}
		}

		return false;
	}

	/**
	 * @param mixed $mData
	 *
	 * @return mixed
	 */
	public function AjaxResponseHelper(string $sFunctionName, $mData)
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
		if ($oAccount && \is_array($aSettings))
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

	/**
	 *
	 * @return \RainLoop\Plugins\Manager
	 */
	public function ReadLang(string $sLang, array &$aLang)
	{
		if ($this->bIsEnabled)
		{
			foreach ($this->aPlugins as $oPlugin)
			{
				if ($oPlugin->UseLangs())
				{
					$sPath = $oPlugin->Path();

					\RainLoop\Utils::ReadAndAddLang($sPath.'/langs/en.ini', $aLang);
					if ('en' !== $sLang)
					{
						\RainLoop\Utils::ReadAndAddLang($sPath.'/langs/'.$sLang.'.ini', $aLang);
					}
				}
			}
		}

		return $this;
	}

	public function ProcessTemplate(string $sName, string $sHtml) : string
	{
		if (isset($this->aProcessTemplate[$sName]))
		{
			foreach ($this->aProcessTemplate[$sName] as $sPlace => $aAddHtml)
			{
				if (\is_array($aAddHtml) && 0 < \count($aAddHtml))
				{
					foreach ($aAddHtml as $sAddHtml)
					{
						$sHtml = \str_replace('{{INCLUDE/'.$sPlace.'/PLACE}}', $sAddHtml.'{{INCLUDE/'.$sPlace.'/PLACE}}', $sHtml);
					}
				}
			}
		}

		return $sHtml;
	}

	public function bIsEnabled() : bool
	{
		return $this->bIsEnabled;
	}

	public function Count() : int
	{
		return $this->bIsEnabled ? \count($this->aPlugins) : 0;
	}

	/**
	 * @param \MailSo\Log\Logger $oLogger
	 *
	 * @return \RainLoop\Plugins\Manager
	 *
	 * @throws \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public function SetLogger($oLogger)
	{
		if (!($oLogger instanceof \MailSo\Log\Logger))
		{
			throw new \MailSo\Base\Exceptions\InvalidArgumentException();
		}

		$this->oLogger = $oLogger;

		return $this;
	}

	public function WriteLog(string $sDesc, int $iType = \MailSo\Log\Enumerations\Type::INFO) : void
	{
		if ($this->oLogger)
		{
			$this->oLogger->Write($sDesc, $iType, 'PLUGIN');
		}
	}

	public function WriteException(string $sDesc, int $iType = \MailSo\Log\Enumerations\Type::INFO) : void
	{
		if ($this->oLogger)
		{
			$this->oLogger->WriteException($sDesc, $iType, 'PLUGIN');
		}
	}
}
