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
	 * @param int $iUserID
	 * @param int $iIdContact
	 * @return array
	 */
	private function getContactFreq($iUserID, $iIdContact)
	{
		$aResult = array();

		$sTypes = \implode(',', array(
			PropertyType::EMAIl_PERSONAL, PropertyType::EMAIl_BUSSINES, PropertyType::EMAIl_OTHER
		));

		$sSql = 'SELECT `value`, `frec` FROM `rainloop_pab_prop` WHERE id_user = :id_user AND `id_contact` = :id_contact AND `type` IN ('.$sTypes.')';
		$aParams = array(
			':id_user' => array($iUserID, \PDO::PARAM_INT),
			':id_contact' => array($iIdContact, \PDO::PARAM_INT)
		);

		$oStmt = $this->prepareAndExecute($sSql, $aParams);
		if ($oStmt)
		{
			$aFetch = $oStmt->fetchAll(\PDO::FETCH_ASSOC);
			if (\is_array($aFetch))
			{
				foreach ($aFetch as $aItem)
				{
					if ($aItem && !empty($aItem['value']) && !empty($aItem['frec']))
					{
						$aResult[$aItem['value']] = (int) $aItem['frec'];
					}
				}
			}
		}

		return $aResult;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param \RainLoop\Providers\PersonalAddressBook\Classes\Contact $oContact
	 *
	 * @return bool
	 */
	public function SetContact($oAccount, &$oContact)
	{
		$iUserID = $this->getUserId($oAccount->ParentEmailHelper());
		$bUpdate = 0 < $oContact->IdContact;

		$oContact->UpdateDependentValues();
		$oContact->Changed = \time();

		if (\RainLoop\Providers\PersonalAddressBook\Enumerations\ContactType::AUTO != $oContact->Type)
		{
			$aEmail = $oContact->GetEmails();
			if (0 < \count($aEmail))
			{
				$aEmail = \array_map(function ($mItem) {
					return \strtolower(\trim($mItem));
				}, $aEmail);
				
				$aEmail = \array_filter($aEmail, function ($mItem) {
					return !empty($mItem);
				});

				if (0 < \strlen($aEmail))
				{
					// clear autocreated contacts
					$this->prepareAndExecute(
						'DELETE FROM `rainloop_pab_contacts` WHERE `id_user` = :id_user AND `type` = :type AND `display_in_list` IN ('.\implode(',', $aEmail).')',
						array(
							':id_user' => array($iUserID, \PDO::PARAM_INT),
							':type' => array(\RainLoop\Providers\PersonalAddressBook\Enumerations\ContactType::AUTO, \PDO::PARAM_INT)
						)
					);
				}
			}
		}

		try
		{
			$this->beginTransaction();

			$aFreq = array();
			if ($bUpdate)
			{
				$aFreq = $this->getContactFreq($iUserID, $oContact->IdContact);

				$sSql = 'UPDATE `rainloop_pab_contacts` SET `display_in_list` = :display_in_list, '.
					'`type` = :type, `changed` = :changed  WHERE id_user = :id_user AND `id_contact` = :id_contact';

				$this->prepareAndExecute($sSql,
					array(
						':id_user' => array($iUserID, \PDO::PARAM_INT),
						':id_contact' => array($oContact->IdContact, \PDO::PARAM_INT),
						':display_in_list' => array($oContact->DisplayInList, \PDO::PARAM_STR),
						':type' => array($oContact->Type, \PDO::PARAM_INT),
						':changed' => array($oContact->Changed, \PDO::PARAM_INT),
					)
				);

				// clear previos props
				$this->prepareAndExecute(
					'DELETE FROM `rainloop_pab_prop` WHERE `id_user` = :id_user AND `id_contact` = :id_contact',
					array(
						':id_user' => array($iUserID, \PDO::PARAM_INT),
						':id_contact' => array($oContact->IdContact, \PDO::PARAM_INT)
					)
				);
			}
			else
			{
				$sSql = 'INSERT INTO `rainloop_pab_contacts` '.
					'(`id_user`, `display_in_list`, `type`, `changed`) VALUES '.
					'(:id_user,  :display_in_list,  :type,  :changed)';

				$this->prepareAndExecute($sSql,
					array(
						':id_user' => array($iUserID, \PDO::PARAM_INT),
						':display_in_list' => array($oContact->DisplayInList, \PDO::PARAM_STR),
						':type' => array($oContact->Type, \PDO::PARAM_INT),
						':changed' => array($oContact->Changed, \PDO::PARAM_INT)
					)
				);

				$sLast = $this->lastInsertId('id_contact');
				if (\is_numeric($sLast) && 0 < (int) $sLast)
				{
					$oContact->IdContact = (int) $sLast;
				}
			}

			if (0 < $oContact->IdContact)
			{
				$aParams = array();
				foreach ($oContact->Properties as /* @var $oProp \RainLoop\Providers\PersonalAddressBook\Classes\Property */ $oProp)
				{
					$iFreq = $oProp->Frec;
					if ($oProp->IsEmail() && isset($aFreq[$oProp->Value]))
					{
						$iFreq = $aFreq[$oProp->Value];
					}

					$aParams[] = array(
						':id_contact' => array($oContact->IdContact, \PDO::PARAM_INT),
						':id_user' => array($iUserID, \PDO::PARAM_INT),
						':type' => array($oProp->Type, \PDO::PARAM_INT),
						':type_custom' => array($oProp->TypeCustom, \PDO::PARAM_STR),
						':value' => array($oProp->Value, \PDO::PARAM_STR),
						':value_custom' => array($oProp->ValueClear, \PDO::PARAM_STR),
						':frec' => array($iFreq, \PDO::PARAM_INT),
					);
				}

				$sSql = 'INSERT INTO `rainloop_pab_prop` '.
					'(`id_contact`, `id_user`, `type`, `type_custom`, `value`, `value_custom`, `frec`) VALUES '.
					'(:id_contact,  :id_user,  :type,  :type_custom,  :value,  :value_custom,  :frec)';

				$this->prepareAndExecute($sSql, $aParams, true);
			}
		}
		catch (\Exception $oException)
		{
			$this->rollBack();
			throw $oException;
		}

		$this->commit();

		return 0 < $oContact->IdContact;
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

		$sSql .= ' ORDER BY `frec` DESC LIMIT :limit';

		$aResult = array();
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
						$aResult[$iIdContact] = array('', '');
					}
				}
			}

			unset($aFetch);

			if (0 < count($aIdContacts))
			{
				$oStmt->closeCursor();
				
				$sTypes = \implode(',', array(
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
					if (\is_array($aFetch) && 0 < \count($aFetch))
					{
						foreach ($aFetch as $aItem)
						{
							if ($aItem && isset($aItem['id_contact'], $aItem['type'], $aItem['value']))
							{
								$iId = $aItem['id_contact'];
								if (isset($aResult[$iId]))
								{
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
		$aEmails = \array_map(function ($mItem) {
			return \strtolower(\trim($mItem));
		}, $aEmails);

		$aEmails = \array_filter($aEmails, function ($mItem) {
			return 0 < \strlen($mItem);
		});
		
		if (0 === \count($aEmails))
		{
			throw new \InvalidArgumentException('Empty Emails argument');
		}

		$sTypes = \implode(',', array(
			PropertyType::EMAIl_PERSONAL, PropertyType::EMAIl_BUSSINES, PropertyType::EMAIl_OTHER
		));

		$sSql = 'SELECT `value` FROM `rainloop_pab_prop` WHERE id_user = :id_user AND `type` IN ('.$sTypes.')';
		$oStmt = $this->prepareAndExecute($sSql, array(
			':id_user' => array($iUserID, \PDO::PARAM_INT)
		));
	
		$aExists = array();
		if ($oStmt)
		{
			$aFetch = $oStmt->fetchAll(\PDO::FETCH_ASSOC);
			if (\is_array($aFetch) && 0 < \count($aFetch))
			{
				foreach ($aFetch as $aItem)
				{
					if ($aItem && !empty($aItem['value']))
					{
						$aExists[] = \strtolower(\trim($aItem['value']));
					}
				}
			}
		}

		$aEmailsToCreate = \array_diff($aEmails, $aExists);
		if (0 < \count($aEmailsToCreate))
		{
			$oContact = new \RainLoop\Providers\PersonalAddressBook\Classes\Contact();
			foreach ($aEmailsToCreate as $sEmailToCreate)
			{
				$oContact->Type = \RainLoop\Providers\PersonalAddressBook\Enumerations\ContactType::AUTO;

				$oProp = new \RainLoop\Providers\PersonalAddressBook\Classes\Property();
				$oProp->Type = \RainLoop\Providers\PersonalAddressBook\Enumerations\PropertyType::EMAIl_PERSONAL;
				$oProp->Value = $sEmailToCreate;

				$oContact->Properties[] = $oProp;

				$this->SetContact($oAccount, $oContact);
				$oContact->Clear();
			}
		}
		
		$sSql = 'UPDATE `rainloop_pab_prop` SET `frec` = `frec` + 1 WHERE id_user = :id_user AND `type` IN ('.$sTypes;

		$aEmailsQuoted = \array_map(function ($mItem) use ($self) {
			return $self->quoteValue($mItem);
		}, $aEmails);
		
		if (1 === \count($aEmailsQuoted))
		{
			$sSql .= ') AND `value` = '.$aEmailsQuoted[0];
		}
		else
		{
			$sSql .= ') AND `value` IN ('.\implode(',', $aEmailsQuoted).')';
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