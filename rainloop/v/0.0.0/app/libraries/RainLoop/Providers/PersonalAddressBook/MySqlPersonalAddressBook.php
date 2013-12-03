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
		$iUserID = $this->getUserId($oAccount->ParentEmailHelper());

		$aContactIds = \array_filter($aContactIds, function (&$mItem) {
			$mItem = (int) $mItem;
			return 0 < $mItem;
		});

		if (0 === \count($aContactIds))
		{
			return false;
		}

		return !!$this->prepareAndExecute(
			'DELETE FROM `rainloop_pab_contacts` WHERE `id_user` = :id_user AND `id_contact` IN ('.\implode(',', $aContactIds).')',
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

		$iUserID = $this->getUserId($oAccount->ParentEmailHelper());
		
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
				'SELECT DISTINCT `id_contact` FROM `rainloop_pab_prop` WHERE id_user = :id_user AND `value` LIKE :search ESCAPE \'=\''.
			')';

			$aParams[':search'] = array($this->specialConvertSearchValue($sSearch, '='), \PDO::PARAM_STR);
		}

		$sSql .= ' ORDER BY `display_in_list` ASC LIMIT :limit OFFSET :offset';
		$aParams[':limit'] = array($iLimit, \PDO::PARAM_INT);
		$aParams[':offset'] = array($iOffset, \PDO::PARAM_INT);

		$oStmt = $this->prepareAndExecute($sSql, $aParams);
		if ($oStmt)
		{
			$aFetch = $oStmt->fetchAll(\PDO::FETCH_ASSOC);

			$aContacts = array();
			$aIdContacts = array();
			if (\is_array($aFetch) && 0 < \count($aFetch))
			{
				foreach ($aFetch as $aItem)
				{
					$iIdContact = $aItem && isset($aItem['id_contact']) ? (int) $aItem['id_contact'] : 0;
					if (0 < $iIdContact)
					{
						$aIdContacts[] = $iIdContact;
						$oContact = new \RainLoop\Providers\PersonalAddressBook\Classes\Contact();

						$oContact->IdContact = $iIdContact;
						$oContact->IdUser = $iUserID;
						$oContact->DisplayInList = isset($aItem['display_in_list']) ? (string) $aItem['display_in_list'] : '';
						$oContact->Type = isset($aItem['type']) ? (int) $aItem['type'] : 
							\RainLoop\Providers\PersonalAddressBook\Enumerations\ContactType::DEFAULT_;
						$oContact->Changed = isset($aItem['changed']) ? (int) $aItem['changed'] : 0;
						$oContact->CanBeChanged = true;

						$aContacts[$iIdContact] = $oContact;
					}
				}
			}

			unset($aFetch);

			if (0 < count($aIdContacts))
			{
				$oStmt->closeCursor();

				$sSql = 'SELECT * FROM `rainloop_pab_prop` WHERE id_user = :id_user AND `id_contact` IN ('.\implode(',', $aIdContacts).')';
				$oStmt = $this->prepareAndExecute($sSql, array(
					':id_user' => array($iUserID, \PDO::PARAM_INT)
				));

				if ($oStmt)
				{
					$aFetch = $oStmt->fetchAll(\PDO::FETCH_ASSOC);
					if (\is_array($aFetch) && 0 < \count($aFetch))
					{
						foreach ($aFetch as $aItem)
						{
							if ($aItem && isset($aItem['id_prop'], $aItem['id_contact'], $aItem['type'], $aItem['value']))
							{
								$iId = (int) $aItem['id_contact'];
								if (0 < $iId && isset($aContacts[$iIdContact]))
								{
									$oProperty = new \RainLoop\Providers\PersonalAddressBook\Classes\Property();

									$oProperty->IdProperty = (int) $aItem['id_prop'];
									$oProperty->IdContact = $iIdContact;
									$oProperty->IdUser = $iUserID;
									$oProperty->Type = (int) $aItem['type'];
									$oProperty->TypeCustom = isset($aItem['type_custom']) ? (string) $aItem['type_custom'] : '';
									$oProperty->Value = (string) $aItem['value'];
									$oProperty->ValueClear = isset($aItem['value_clear']) ? (string) $aItem['value_clear'] : '';
									$oProperty->Frec = isset($aItem['frec']) ? (int) $aItem['frec'] : 0;

									$aContacts[$iIdContact]->Properties[] = $oProperty;
								}
							}
						}
					}

					unset($aFetch);

					return \array_values($aContacts);
				}
			}
		}

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
			throw new \InvalidArgumentException('Empty Search argument');
		}

		$iUserID = $this->getUserId($oAccount->ParentEmailHelper());

		$sTypes = implode(',', array(
			PropertyType::EMAIl_PERSONAL, PropertyType::EMAIl_BUSSINES, PropertyType::EMAIl_OTHER, PropertyType::FULLNAME
		));
		
		$sSql = 'SELECT DISTINCT `id_contact` FROM `rainloop_pab_prop` '.
			'WHERE id_user = :id_user AND `type` IN ('.$sTypes.') AND `value` LIKE :search ESCAPE \'=\'';
		
		$aParams = array(
			':id_user' => array($iUserID, \PDO::PARAM_INT),
			':limit' => array($iLimit, \PDO::PARAM_INT),
			':search' => array($this->specialConvertSearchValue($sSearch, '='), \PDO::PARAM_STR)
		);

		$sSql .= ' ORDER BY `frec` ASC LIMIT :limit';

		$oStmt = $this->prepareAndExecute($sSql, $aParams);
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

				$oStmt = $this->prepareAndExecute($sSql, array(
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
								else if ('' === $aResult[$iId][1] && \in_array((int) $aItem['type'], array(PropertyType::FULLNAME)))
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
	 * @param array $aEmails
	 *
	 * @return bool
	 */
	public function IncFrec($oAccount, $aEmails)
	{
		$iUserID = $this->getUserId($oAccount->ParentEmailHelper());

		$self = $this;
		$aEmails = \array_filter($aEmails, function (&$mItem) use ($self) {
			$mItem = \strtolower(\trim($mItem));
			if (0 < \strlen($mItem))
			{
				$mItem = $self->quoteValue($mItem);
				return true;
			}
			return false;
		});
		
		if (0 === \count($aEmails))
		{
			throw new \InvalidArgumentException('Empty Emails argument');
		}
		
		$sSql = 'UPDATE `rainloop_pab_prop` SET `frec` = `frec` + 1 WHERE id_user = :id_user AND `type` IN ('.
			\implode(',', array(PropertyType::EMAIl_PERSONAL, PropertyType::EMAIl_BUSSINES, PropertyType::EMAIl_OTHER));

		if (1 === \count($aEmails))
		{
			$sSql .= ') AND `value` = '.$aEmails[0];
		}
		else
		{
			$sSql .= ') AND `value` IN ('.\implode(',', $aEmails).')';
		}

		return !!$this->prepareAndExecute($sSql, array(
			':id_user' => array($iUserID, \PDO::PARAM_INT),
		));
	}
	
	/**
	 * @return bool
	 */
	public function SynchronizeStorage()
	{
		return $this->dataBaseUpgrade('mysql-pab-version', array(
			1 => array(

// -- rainloop_pab_contacts --
'CREATE TABLE IF NOT EXISTS `rainloop_pab_contacts` (
	
	`id_contact` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
	`id_user` int(11) UNSIGNED NOT NULL,
	`display_in_list` varchar(255) NOT NULL DEFAULT \'\',
	`type` int(11) UNSIGNED NOT NULL DEFAULT \'0\',
	`changed` int(11) UNSIGNED NOT NULL DEFAULT \'0\',

	PRIMARY KEY(`id_contact`),
	CONSTRAINT `id_user_fk_rainloop_pab_contacts` FOREIGN KEY (`id_user`)
		REFERENCES `rainloop_users` (`id_user`) ON DELETE CASCADE ON UPDATE CASCADE

) /*!40000 ENGINE=INNODB */ /*!40101 CHARACTER SET utf8 COLLATE utf8_general_ci */;',

// -- rainloop_pab_prop --
'CREATE TABLE IF NOT EXISTS `rainloop_pab_prop` (
	
	`id_prop` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
	`id_contact` int(11) UNSIGNED NOT NULL,
	`id_user` int(11) UNSIGNED NOT NULL,
	`type` int(11) UNSIGNED NOT NULL,
	`type_custom` varchar(50) /*!40101 CHARACTER SET ascii COLLATE ascii_general_ci */ NOT NULL DEFAULT \'\',
	`value` varchar(255) NOT NULL DEFAULT \'\',
	`value_custom` varchar(255) NOT NULL DEFAULT \'\',
	`frec` int(11) UNSIGNED NOT NULL DEFAULT \'0\',

	PRIMARY KEY(`id_prop`),
	INDEX `id_user_id_contact_index` (`id_user`, `id_contact`),
	INDEX `id_user_value_index` (`id_user`, `value`),
	CONSTRAINT `id_contact_fk_rainloop_pab_prop` FOREIGN KEY (`id_contact`)
		REFERENCES `rainloop_pab_contacts` (`id_contact`) ON DELETE CASCADE ON UPDATE CASCADE

) /*!40000 ENGINE=INNODB */ /*!40101 CHARACTER SET utf8 COLLATE utf8_general_ci */;',

// -- rainloop_pab_tags --
'CREATE TABLE IF NOT EXISTS `rainloop_pab_tags` (
	
	`id_tag` int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
	`id_contact` int(11) UNSIGNED NOT NULL,
	`id_user` int(11) UNSIGNED NOT NULL,
	`name` varchar(255) NOT NULL,

	PRIMARY KEY(`id_tag`),
	UNIQUE `id_user_name_unique` (`id_user`, `name`),
	CONSTRAINT `id_user_fk_rainloop_pab_tags` FOREIGN KEY (`id_user`)
		REFERENCES `rainloop_users` (`id_user`) ON DELETE CASCADE ON UPDATE CASCADE
		
) /*!40000 ENGINE=INNODB */ /*!40101 CHARACTER SET utf8 COLLATE utf8_general_ci */;',

// -- rainloop_pab_tags_contacts --
'CREATE TABLE IF NOT EXISTS `rainloop_pab_tags_contacts` (
	
	`id_tag` int(11) UNSIGNED NOT NULL,
	`id_contact` int(11) UNSIGNED NOT NULL,

	CONSTRAINT `id_contact_fk_rainloop_tags_contacts` FOREIGN KEY (`id_contact`)
		REFERENCES `rainloop_pab_contacts` (`id_contact`) ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT `id_tag_fk_rainloop_tags_contacts` FOREIGN KEY (`id_tag`)
		REFERENCES `rainloop_pab_tags` (`id_tag`) ON DELETE CASCADE ON UPDATE CASCADE

) /*!40000 ENGINE=INNODB */ /*!40101 CHARACTER SET utf8 COLLATE utf8_general_ci */;'
		)));
	}

	/**
	 * @param string $sSearch
	 *
	 * @return string
	 */
	protected function specialConvertSearchValue($sSearch, $sEscapeSign = '=')
	{
		return '%'.\str_replace(array($sEscapeSign, '_', '%'),
			array($sEscapeSign.$sEscapeSign, $sEscapeSign.'_', $sEscapeSign.'%'), $sSearch).'%';
	}
}