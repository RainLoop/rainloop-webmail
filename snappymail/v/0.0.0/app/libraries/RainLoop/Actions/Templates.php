<?php

namespace RainLoop\Actions;

use \RainLoop\Enumerations\Capa;
use \RainLoop\Exceptions\ClientException;
use \RainLoop\Notifications;

trait Templates
{

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoTemplateSetup() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, false, Capa::TEMPLATES, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$oTemplate = new \RainLoop\Model\Template();
		if (!$oTemplate->FromJSON($this->GetActionParams(), true))
		{
			throw new ClientException(Notifications::InvalidInputArgument);
		}

		if ('' === $oTemplate->Id())
		{
			$oTemplate->GenerateID();
		}

		$aTemplatesForSave = array();
		$aTemplates = $this->GetTemplates($oAccount);


		foreach ($aTemplates as $oItem)
		{
			if ($oItem && $oItem->Id() !== $oTemplate->Id())
			{
				$aTemplatesForSave[] = $oItem;
			}
		}

		$aTemplatesForSave[] = $oTemplate;

		return $this->DefaultResponse(__FUNCTION__, $this->SetTemplates($oAccount, $aTemplatesForSave));
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoTemplateDelete() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, false, Capa::TEMPLATES, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$sId = \trim($this->GetActionParam('IdToDelete', ''));
		if (empty($sId))
		{
			throw new ClientException(Notifications::UnknownError);
		}

		$aNew = array();
		$aTemplates = $this->GetTemplates($oAccount);
		foreach ($aTemplates as $oItem)
		{
			if ($oItem && $sId !== $oItem->Id())
			{
				$aNew[] = $oItem;
			}
		}

		return $this->DefaultResponse(__FUNCTION__, $this->SetTemplates($oAccount, $aNew));
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoTemplateGetByID() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, false, Capa::TEMPLATES, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$sId = \trim($this->GetActionParam('ID', ''));
		if (empty($sId))
		{
			throw new ClientException(Notifications::UnknownError);
		}

		$oTemplate = false;
		$aTemplates = $this->GetTemplates($oAccount);

		foreach ($aTemplates as $oItem)
		{
			if ($oItem && $sId === $oItem->Id())
			{
				$oTemplate = $oItem;
				break;
			}
		}

		$oTemplate->SetPopulateAlways(true);
		return $this->DefaultResponse(__FUNCTION__, $oTemplate);
	}

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoTemplates() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, false, Capa::TEMPLATES, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		return $this->DefaultResponse(__FUNCTION__, array(
			'Templates' => $this->GetTemplates($oAccount)
		));
	}
}
