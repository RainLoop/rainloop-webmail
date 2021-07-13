<?php

namespace RainLoop\Actions;

use \RainLoop\Enumerations\Capa;
use \RainLoop\Exceptions\ClientException;
use \RainLoop\Model\Account;
use \RainLoop\Model\Template;
use \RainLoop\Notifications;

trait Templates
{

	/**
	 * @throws \MailSo\Base\Exceptions\Exception
	 */
	public function DoTemplateSetup() : array
	{
		$oAccount = $this->getAccountFromToken();

		if (!$this->GetCapa(false, Capa::TEMPLATES, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		$oTemplate = new Template();
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

		if (!$this->GetCapa(false, Capa::TEMPLATES, $oAccount))
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

		if (!$this->GetCapa(false, Capa::TEMPLATES, $oAccount))
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

		if (!$this->GetCapa(false, Capa::TEMPLATES, $oAccount))
		{
			return $this->FalseResponse(__FUNCTION__);
		}

		return $this->DefaultResponse(__FUNCTION__, array(
			'Templates' => $this->GetTemplates($oAccount)
		));
	}

	private function GetTemplates(?Account $oAccount) : array
	{
		$aTemplates = array();
		if ($oAccount)
		{
			$aData = array();

			$sData = $this->StorageProvider(true)->Get($oAccount,
				\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
				'templates'
			);

			if ('' !== $sData && '[' === \substr($sData, 0, 1))
			{
				$aData = \json_decode($sData, true);
			}

			if (\is_array($aData) && 0 < \count($aData))
			{
				foreach ($aData as $aItem)
				{
					$oItem = new Template();
					$oItem->FromJSON($aItem);

					if ($oItem && $oItem->Validate())
					{
						\array_push($aTemplates, $oItem);
					}
				}
			}

			if (1 < \count($aTemplates))
			{
				$sOrder = $this->StorageProvider()->Get($oAccount,
					\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
					'templates_order'
				);

				$aOrder = empty($sOrder) ? array() : \json_decode($sOrder, true);
				if (\is_array($aOrder) && 1 < \count($aOrder))
				{
					\usort($aTemplates, function ($a, $b) use ($aOrder) {
						return \array_search($a->Id(), $aOrder) < \array_search($b->Id(), $aOrder) ? -1 : 1;
					});
				}
			}
		}

		return $aTemplates;
	}

	private function GetTemplateByID(Account $oAccount, string $sID) : ?\RainLoop\Model\Identity
	{
		$aTemplates = $this->GetTemplates($oAccount);
		foreach ($aTemplates as $oIdentity)
		{
			if ($oIdentity && $sID === $oIdentity->Id())
			{
				return $oIdentity;
			}
		}

		return isset($aTemplates[0]) ? $aTemplates[0] : null;
	}

	private function SetTemplates(Account $oAccount, array $aTemplates = array()) : array
	{
		$aResult = array();
		foreach ($aTemplates as $oItem)
		{
			$aResult[] = $oItem->ToSimpleJSON();
		}

		return $this->StorageProvider(true)->Put($oAccount,
			\RainLoop\Providers\Storage\Enumerations\StorageType::CONFIG,
			'templates',
			\json_encode($aResult)
		);
	}
}
