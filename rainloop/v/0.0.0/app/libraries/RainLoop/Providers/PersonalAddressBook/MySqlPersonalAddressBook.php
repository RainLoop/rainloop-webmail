<?php

namespace RainLoop\Providers\PersonalAddressBook;

use
	\RainLoop\Providers\PersonalAddressBook\Enumerations\PropertyType,
	\RainLoop\Providers\PersonalAddressBook\Enumerations\ContactType
;

class MySqlPersonalAddressBook 
	extends \RainLoop\Common\PdoAbstract
	implements \RainLoop\Providers\PersonalAddressBook\PersonalAddressBookInterface
{
	/**
	 * @return bool
	 */
	public function IsSupported()
	{
		$aDrivers = \class_exists('PDO') ? \PDO::getAvailableDrivers() : array();
		return \is_array($aDrivers) ? \in_array('mysql', $aDrivers) : false;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param int $iIdContact
	 *
	 * @return \RainLoop\Providers\PersonalAddressBook\Classes\Contact|null
	 */
	public function GetContactById($oAccount, $iIdContact)
	{
		return null;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param \RainLoop\Providers\PersonalAddressBook\Classes\Contact $oContact
	 *
	 * @return bool
	 */
	public function CreateContact($oAccount, &$oContact)
	{
		return false;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param \RainLoop\Providers\PersonalAddressBook\Classes\Contact $oContact
	 *
	 * @return bool
	 */
	public function UpdateContact($oAccount, &$oContact)
	{
		return false;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param array $aContactIds
	 *
	 * @return bool
	 */
	public function DeleteContacts($oAccount, $aContactIds)
	{
		$iUserID = $this->getUserId($oAccount);

		$aContactIds = \array_filter($aContactIds, function (&$mItem) {
			$mItem = (int) $mItem;
			return 0 < $mItem;
		});

		if (0 === \count($aContactIds))
		{
			return false;
		}

		return !!$this->prepareAndExecute($oAccount,
			'DELETE FROM `rainloop_pab_contacts` WHERE id_user = :id_user AND `id_contact` IN ('.\implode(',', $aContactIds).')',
			array(':id_user' => array($iUserID, \PDO::PARAM_INT)));
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param int $iType = \RainLoop\Providers\PersonalAddressBook\Enumerations\ContactType::DEFAULT_
	 * @param int $iOffset = 0
	 * @param type $iLimit = 20
	 * @param string $sSearch = ''
	 * 
	 * @return array
	 */
	public function GetContacts($oAccount,
		$iType = \RainLoop\Providers\PersonalAddressBook\Enumerations\ContactType::DEFAULT_,
		$iOffset = 0, $iLimit = 20, $sSearch = '')
	{
		$iOffset = 0 <= $iOffset ? $iOffset : 0;
		$iLimit = 0 < $iLimit ? (int) $iLimit : 20;
		$sSearch = \trim($sSearch);

		$iUserID = $this->getUserId($oAccount);
		
		if (!\in_array($iType, array(ContactType::SHARE, ContactType::AUTO)))
		{
			$iType = ContactType::DEFAULT_;
		}

		$sSql = 'SELECT * FROM `rainloop_pab_contacts` WHERE id_user = :id_user AND `type` = :type';
		$aParams = array(
			':id_user' => array($iUserID, \PDO::PARAM_INT),
			':type' => array($iType, \PDO::PARAM_INT)
		);
		
		if (0 < \strlen($sSearch))
		{
			$sSql .= ' AND `id_contact` IN ('.
				'SELECT DISTINCT `id_contact` FROM `rainloop_pab_prop` WHERE id_user = :id_user AND `value` LIKE :search'.
			')';

			$aParams[':search'] = array($this->convertSearchValue($sSearch), \PDO::PARAM_STR);
		}

		$sSql .= ' ORDER BY `display_in_list` ASC LIMIT :limit OFFSET :offset';
		$aParams[':limit'] = array($iLimit, \PDO::PARAM_INT);
		$aParams[':offset'] = array($iOffset, \PDO::PARAM_INT);

		return array();
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param string $sSearch
	 *
	 * @return array
	 *
	 * @throws \InvalidArgumentException
	 */
	public function GetSuggestions($oAccount, $sSearch)
	{
		$iLimit = 20;
		
		$sSearch = \trim($sSearch);
		if (0 === \strlen($sSearch))
		{
			throw new \InvalidArgumentException('$sSearch');
		}

		$iUserID = $this->getUserId($oAccount);

		$sTypes = implode(',', array(
			PropertyType::EMAIl_PERSONAL, PropertyType::EMAIl_BUSSINES, PropertyType::EMAIl_OTHER, PropertyType::FULLNAME
		));
		
		$sSql = 'SELECT DISTINCT `id_contact` FROM `rainloop_pab_prop` '.
			'WHERE id_user = :id_user AND `type` IN ('.$sTypes.') AND `value` LIKE :search';
		
		$aParams = array(
			':id_user' => array($iUserID, \PDO::PARAM_INT),
			':limit' => array($iLimit, \PDO::PARAM_INT),
			':search' => array($this->convertSearchValue($sSearch), \PDO::PARAM_STR)
		);

		$sSql .= ' ORDER BY `frec` ASC LIMIT :limit';

		$oStmt = $this->prepareAndExecute($oAccount, $sSql, $aParams);
		if ($oStmt)
		{
			$aFetch = $oStmt->fetchAll(\PDO::FETCH_ASSOC);
			$aIdContacts = array();
			if (\is_array($aFetch) && 0 < \count($aFetch))
			{
				foreach ($aFetch as $aItem)
				{
					$iIdContact = $aItem && isset($aItem['id_contact']) ? (int) $aItem['id_contact'] : 0;
					if (0 < $iIdContact)
					{
						$aIdContacts[] = $iIdContact;
					}
				}
			}

			unset($aFetch);

			if (0 < count($aIdContacts))
			{
				$oStmt->closeCursor();
				
				$sTypes = implode(',', array(
					PropertyType::EMAIl_PERSONAL, PropertyType::EMAIl_BUSSINES, PropertyType::EMAIl_OTHER, PropertyType::FULLNAME
				));

				$sSql = 'SELECT `id_contact`, `type`, `value` FROM `rainloop_pab_prop` '.
					'WHERE id_user = :id_user AND `type` IN ('.$sTypes.') AND `id_contact` IN ('.\implode(',', $aIdContacts).')';

				$oStmt = $this->prepareAndExecute($oAccount, $sSql, array(
					':id_user' => array($iUserID, \PDO::PARAM_INT)
				));

				if ($oStmt)
				{
					$aFetch = $oStmt->fetchAll(\PDO::FETCH_ASSOC);
					$aResult = array();
					if (\is_array($aFetch) && 0 < \count($aFetch))
					{
						foreach ($aFetch as $aItem)
						{
							if ($aItem && isset($aItem['id_contact'], $aItem['type'], $aItem['value']))
							{
								$iId = $aItem['id_contact'];
								if (!isset($aResult[$iId]))
								{
									$aResult[$iId] = array('', '');
								}

								if ('' === $aResult[$iId][0] && \in_array((int) $aItem['type'],
									array(PropertyType::EMAIl_PERSONAL, PropertyType::EMAIl_BUSSINES, PropertyType::EMAIl_OTHER)))
								{
									$aResult[$iId][0] = $aItem['value'];
								}
								else if ('' === $aResult[$iId][1] &&\in_array((int) $aItem['type'], array(PropertyType::FULLNAME)))
								{
									$aResult[$iId][1] = $aItem['value'];
								}
							}
						}

						$aResult = array_filter($aResult, function ($aItem) {
							return '' !== $aItem[0];
						});
					}

					unset($aFetch);

					return \array_values($aResult);
				}
			}
		}

		return array();
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param array $aEmail
	 *
	 * @return bool
	 */
	public function IncFrec($oAccount, $aEmail)
	{
		$iUserID = $this->getUserId($oAccount);

		$self = $this;
		$aEmail = \array_filter($aEmail, function (&$mItem) use ($self) {
			$mItem = \strtolower(\trim($mItem));
			if (0 < \strlen($mItem))
			{
				$mItem = $self->quoteValue($mItem);
				return true;
			}
			return false;
		});
		
		if (0 === \count($aEmail))
		{
			throw new \InvalidArgumentException('$aEmail');
		}
		
		$sTypes = implode(',', array(
			PropertyType::EMAIl_PERSONAL, PropertyType::EMAIl_BUSSINES, PropertyType::EMAIl_OTHER
		));

		$sSql = 'UPDATE `rainloop_pab_prop` SET `frec` = `frec` + 1 WHERE id_user = :id_user AND `type` IN ('.$sTypes;

		if (1 === \count($aEmail))
		{
			$sSql .= ') AND `value` = '.$aEmail[0];
		}
		else
		{
			$sSql .= ') AND `value` IN ('.\implode(',', $aEmail).')';
		}

		return !!$this->prepareAndExecute($oAccount, $sSql, array(
			':id_user' => array($iUserID, \PDO::PARAM_INT),
		));
	}
}