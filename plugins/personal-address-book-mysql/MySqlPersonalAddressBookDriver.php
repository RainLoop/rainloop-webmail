<?php

use \RainLoop\Providers\PersonalAddressBook\Enumerations\PropertyType;

class MySqlPersonalAddressBookDriver
	extends \RainLoop\Common\PdoAbstract
	implements \RainLoop\Providers\PersonalAddressBook\PersonalAddressBookInterface
{
	/**
	 * @var string
	 */
	private $sDsn;
	
	/**
	 * @var string
	 */
	private $sUser;

	/**
	 * @var string
	 */
	private $sPassword;

	public function __construct($sDsn, $sUser, $sPassword)
	{
		$this->sDsn = $sDsn;
		$this->sUser = $sUser;
		$this->sPassword = $sPassword;
	}

	/**
	 * @return string
	 */
	public function Version()
	{
		return 'MySqlPersonalAddressBookDriver-v1';
	}

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
	 * @param \RainLoop\Providers\PersonalAddressBook\Classes\Contact $oContact
	 *
	 * @return bool
	 */
	public function ContactSave($oAccount, &$oContact)
	{
		$iUserID = $this->getUserId($oAccount->ParentEmailHelper());
		$iIdContact = \strlen($oContact->IdContact) && \is_numeric($oContact->IdContact) ? (int) $oContact->IdContact : 0;

		$bUpdate = 0 < $iIdContact;

		$oContact->UpdateDependentValues();
		$oContact->Changed = \time();

		if (!$oContact->Auto)
		{
			$aEmail = $oContact->GetEmails();
			if (0 < \count($aEmail))
			{
				$aEmail = \array_map(function ($sValue) {
					return \strtolower(\trim($sValue));
				}, $aEmail);
				
				$aEmail = \array_filter($aEmail, function ($sValue) {
					return !empty($sValue);
				});

				if (0 < \count($aEmail))
				{
					$self = $this;
					$aEmail = \array_map(function ($sValue) use ($self) {
						return $self->quoteValue($sValue);
					}, $aEmail);


					// clear autocreated contacts
					$this->prepareAndExecute(
						'DELETE FROM `rainloop_pab_contacts` WHERE `id_user` = :id_user AND `auto` = 1 AND `display_email` IN ('.\implode(',', $aEmail).')',
						array(
							':id_user' => array($iUserID, \PDO::PARAM_INT)
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
				$aFreq = $this->getContactFreq($iUserID, $iIdContact);

				$sSql = 'UPDATE `rainloop_pab_contacts` SET `display` = :display, `display_name` = :display_name, `display_email` = :display_email, '.
					'`auto` = :auto, `changed` = :changed  WHERE id_user = :id_user AND `id_contact` = :id_contact';

				$this->prepareAndExecute($sSql,
					array(
						':id_user' => array($iUserID, \PDO::PARAM_INT),
						':id_contact' => array($iIdContact, \PDO::PARAM_INT),
						':display' => array($oContact->Display, \PDO::PARAM_STR),
						':display_name' => array($oContact->DisplayName, \PDO::PARAM_STR),
						':display_email' => array($oContact->DisplayEmail, \PDO::PARAM_STR),
						':auto' => array($oContact->Auto, \PDO::PARAM_INT),
						':changed' => array($oContact->Changed, \PDO::PARAM_INT),
					)
				);

				// clear previos props
				$this->prepareAndExecute(
					'DELETE FROM `rainloop_pab_prop` WHERE `id_user` = :id_user AND `id_contact` = :id_contact',
					array(
						':id_user' => array($iUserID, \PDO::PARAM_INT),
						':id_contact' => array($iIdContact, \PDO::PARAM_INT)
					)
				);
			}
			else
			{
				$sSql = 'INSERT INTO `rainloop_pab_contacts` '.
					'(`id_user`, `display`, `display_name`, `display_email`, `auto`, `changed`) VALUES '.
					'(:id_user,  :display,  :display_name,  :display_email,  :auto,  :changed)';

				$this->prepareAndExecute($sSql,
					array(
						':id_user' => array($iUserID, \PDO::PARAM_INT),
						':display' => array($oContact->Display, \PDO::PARAM_STR),
						':display_name' => array($oContact->DisplayName, \PDO::PARAM_STR),
						':display_email' => array($oContact->DisplayEmail, \PDO::PARAM_STR),
						':auto' => array($oContact->Auto, \PDO::PARAM_INT),
						':changed' => array($oContact->Changed, \PDO::PARAM_INT)
					)
				);

				$sLast = $this->lastInsertId('id_contact');
				if (\is_numeric($sLast) && 0 < (int) $sLast)
				{
					$iIdContact = (int) $sLast;
					$oContact->IdContact = (string) $iIdContact;
				}
			}

			if (0 < $iIdContact)
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
						':id_contact' => array($iIdContact, \PDO::PARAM_INT),
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

		return 0 < $iIdContact;
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
			$mItem = (int) \trim($mItem);
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
	 * @param int $iOffset = 0
	 * @param int $iLimit = 20
	 * @param string $sSearch = ''
	 * @param bool $bAutoOnly = false
	 * 
	 * @return array
	 */
	public function GetContacts($oAccount, $iOffset = 0, $iLimit = 20, $sSearch = '', $bAutoOnly = false)
	{
		$iOffset = 0 <= $iOffset ? $iOffset : 0;
		$iLimit = 0 < $iLimit ? (int) $iLimit : 20;
		$sSearch = \trim($sSearch);

		$iUserID = $this->getUserId($oAccount->ParentEmailHelper());
		
		$sSql = 'SELECT * FROM `rainloop_pab_contacts` WHERE id_user = :id_user AND `auto` = :auto';
		$aParams = array(
			':id_user' => array($iUserID, \PDO::PARAM_INT),
			':auto' => array($bAutoOnly ? 1 : 0, \PDO::PARAM_INT)
		);
		
		if (0 < \strlen($sSearch))
		{
			$sSql .= ' AND `id_contact` IN ('.
				'SELECT DISTINCT `id_contact` FROM `rainloop_pab_prop` WHERE id_user = :id_user AND `value` LIKE :search ESCAPE \'=\''.
			')';

			$aParams[':search'] = array($this->specialConvertSearchValue($sSearch, '='), \PDO::PARAM_STR);
		}

		$sSql .= ' ORDER BY `display` ASC LIMIT :limit OFFSET :offset';
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

						$oContact->IdContact = (string) $iIdContact;
						$oContact->Display = isset($aItem['display']) ? (string) $aItem['display'] : '';
						$oContact->DisplayName = isset($aItem['display_name']) ? (string) $aItem['display_name'] : '';
						$oContact->DisplayEmail = isset($aItem['display_email']) ? (string) $aItem['display_email'] : '';
						$oContact->Auto = isset($aItem['auto']) ? (bool) $aItem['auto'] : false;
						$oContact->Changed = isset($aItem['changed']) ? (int) $aItem['changed'] : 0;

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
								if (0 < $iId && isset($aContacts[$iId]))
								{
									$oProperty = new \RainLoop\Providers\PersonalAddressBook\Classes\Property();
									$oProperty->Type = (int) $aItem['type'];
									$oProperty->TypeCustom = isset($aItem['type_custom']) ? (string) $aItem['type_custom'] : '';
									$oProperty->Value = (string) $aItem['value'];
									$oProperty->ValueClear = isset($aItem['value_clear']) ? (string) $aItem['value_clear'] : '';
									$oProperty->Frec = isset($aItem['frec']) ? (int) $aItem['frec'] : 0;

									$aContacts[$iId]->Properties[] = $oProperty;
								}
							}
						}
					}

					unset($aFetch);

					foreach ($aContacts as &$oItem)
					{
						$oItem->UpdateDependentValues();
					}

					return \array_values($aContacts);
				}
			}
		}

		return array();
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param string $sSearch
	 * @param int $iLimit = 20
	 *
	 * @return array
	 *
	 * @throws \InvalidArgumentException
	 */
	public function GetSuggestions($oAccount, $sSearch, $iLimit = 20)
	{
		$sSearch = \trim($sSearch);
		if (0 === \strlen($sSearch))
		{
			throw new \InvalidArgumentException('Empty Search argument');
		}

		$iUserID = $this->getUserId($oAccount->ParentEmailHelper());

		$sTypes = implode(',', array(
			PropertyType::EMAIl_PERSONAL, PropertyType::EMAIl_BUSSINES, PropertyType::EMAIl_OTHER, PropertyType::FULLNAME
		));
		
		$sSql = 'SELECT `id_contact`, `id_prop`, `type`, `value` FROM `rainloop_pab_prop` '.
			'WHERE id_user = :id_user AND `type` IN ('.$sTypes.') AND `value` LIKE :search ESCAPE \'=\'';
		
		$aParams = array(
			':id_user' => array($iUserID, \PDO::PARAM_INT),
			':limit' => array($iLimit, \PDO::PARAM_INT),
			':search' => array($this->specialConvertSearchValue($sSearch, '='), \PDO::PARAM_STR)
		);

		$sSql .= ' ORDER BY `frec` DESC LIMIT :limit';

		$aResult = array();
		$aFirstResult = array();
		$aSkipIds = array();
		
		$oStmt = $this->prepareAndExecute($sSql, $aParams);
		if ($oStmt)
		{
			$aIdContacts = array();
			$aFetch = $oStmt->fetchAll(\PDO::FETCH_ASSOC);
			if (\is_array($aFetch) && 0 < \count($aFetch))
			{
				foreach ($aFetch as $aItem)
				{
					$iIdContact = $aItem && isset($aItem['id_contact']) ? (int) $aItem['id_contact'] : 0;
					if (0 < $iIdContact)
					{
						$aIdContacts[$iIdContact] = $iIdContact;
						$iType = isset($aItem['type']) ? (int) $aItem['type'] : PropertyType::UNKNOWN;
						
						if (\in_array($iType, array(PropertyType::EMAIl_PERSONAL, PropertyType::EMAIl_BUSSINES, PropertyType::EMAIl_OTHER, PropertyType::FULLNAME)))
						{
							if (!\in_array($iIdContact, $aSkipIds))
							{
								if (PropertyType::FULLNAME === $iType)
								{
									$aSkipIds[] = $iIdContact;
								}

								$aFirstResult[] = array(
									'id_prop' => isset($aItem['id_prop']) ? (int) $aItem['id_prop'] : 0,
									'id_contact' => $iIdContact,
									'value' => isset($aItem['value']) ? (string) $aItem['value'] : '',
									'type' => $iType
								);
							}
						}
					}
				}
			}

			unset($aFetch);

			$aIdContacts = \array_values($aIdContacts);
			if (0 < count($aIdContacts))
			{
				$oStmt->closeCursor();
				
				$sTypes = \implode(',', array(
					PropertyType::EMAIl_PERSONAL, PropertyType::EMAIl_BUSSINES, PropertyType::EMAIl_OTHER, PropertyType::FULLNAME
				));

				$sSql = 'SELECT `id_prop`, `id_contact`, `type`, `value` FROM `rainloop_pab_prop` '.
					'WHERE id_user = :id_user AND `type` IN ('.$sTypes.') AND `id_contact` IN ('.\implode(',', $aIdContacts).')';

				$oStmt = $this->prepareAndExecute($sSql, array(
					':id_user' => array($iUserID, \PDO::PARAM_INT)
				));

				if ($oStmt)
				{
					$aFetch = $oStmt->fetchAll(\PDO::FETCH_ASSOC);
					if (\is_array($aFetch) && 0 < \count($aFetch))
					{
						$aNames = array();
						$aEmails = array();

						foreach ($aFetch as $aItem)
						{
							if ($aItem && isset($aItem['id_prop'], $aItem['id_contact'], $aItem['type'], $aItem['value']))
							{
								$iIdContact = (int) $aItem['id_contact'];
								$iType = (int) $aItem['type'];
								
								if (PropertyType::FULLNAME === $iType)
								{
									$aNames[$iIdContact] = $aItem['value'];
								}
								else if (\in_array($iType,
									array(PropertyType::EMAIl_PERSONAL, PropertyType::EMAIl_BUSSINES, PropertyType::EMAIl_OTHER)))
								{
									if (!isset($aEmails[$iIdContact]))
									{
										$aEmails[$iIdContact] = array();
									}

									$aEmails[$iIdContact][] = $aItem['value'];
								}
							}
						}

						foreach ($aFirstResult as $aItem)
						{
							if ($aItem && !empty($aItem['value']))
							{
								$iIdContact = (int) $aItem['id_contact'];
								$iType = (int) $aItem['type'];
								
								if (PropertyType::FULLNAME === $iType)
								{
									if (isset($aEmails[$iIdContact]) && \is_array($aEmails[$iIdContact]))
									{
										foreach ($aEmails[$iIdContact] as $sEmail)
										{
											if (!empty($sEmail))
											{
												$aResult[] = array($sEmail, (string) $aItem['value']);
											}
										}
									}
								}
								else if (\in_array($iType,
									array(PropertyType::EMAIl_PERSONAL, PropertyType::EMAIl_BUSSINES, PropertyType::EMAIl_OTHER)))
								{
									$aResult[] = array((string) $aItem['value'],
										isset($aNames[$iIdContact]) ? (string) $aNames[$iIdContact] : '');
								}
							}
						}
					}

					unset($aFetch);

					if ($iLimit < \count($aResult))
					{
						$aResult = \array_slice($aResult, 0, $iLimit);
					}
					
					return $aResult;
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
		$aEmailsObjects = \array_map(function ($mItem) {
			$oResult = null;
			try
			{
				$oResult = \MailSo\Mime\Email::Parse(\trim($mItem));
			}
			catch (\Exception $oException) {}
			return $oResult;
		}, $aEmails);
		
		if (0 === \count($aEmailsObjects))
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

		$aEmailsToUpdate = array();
		$aEmailsToCreate = \array_filter($aEmailsObjects, function ($oItem) use ($aExists, &$aEmailsToUpdate) {
			if ($oItem)
			{
				$sEmail = \strtolower(\trim($oItem->GetEmail()));
				if (0 < \strlen($sEmail))
				{
					$aEmailsToUpdate[] = $sEmail;
					return !\in_array($sEmail, $aExists);
				}
			}
			
			return false;
		});
		
		unset($aEmails, $aEmailsObjects);

		if (0 < \count($aEmailsToCreate))
		{
			$oContact = new \RainLoop\Providers\PersonalAddressBook\Classes\Contact();
			foreach ($aEmailsToCreate as $oEmail)
			{
				$oContact->Auto = true;

				if ('' !== \trim($oEmail->GetEmail()))
				{
					$oPropEmail = new \RainLoop\Providers\PersonalAddressBook\Classes\Property();
					$oPropEmail->Type = \RainLoop\Providers\PersonalAddressBook\Enumerations\PropertyType::EMAIl_PERSONAL;
					$oPropEmail->Value = \strtolower(\trim($oEmail->GetEmail()));

					$oContact->Properties[] = $oPropEmail;
				}

				if ('' !== \trim($oEmail->GetDisplayName()))
				{
					$oPropName = new \RainLoop\Providers\PersonalAddressBook\Classes\Property();
					$oPropName->Type = \RainLoop\Providers\PersonalAddressBook\Enumerations\PropertyType::FULLNAME;
					$oPropName->Value = \trim($oEmail->GetDisplayName());

					$oContact->Properties[] = $oPropName;
				}

				if (0 < \count($oContact->Properties))
				{
					$this->ContactSave($oAccount, $oContact);
				}
				
				$oContact->Clear();
			}
		}
		
		$sSql = 'UPDATE `rainloop_pab_prop` SET `frec` = `frec` + 1 WHERE id_user = :id_user AND `type` IN ('.$sTypes;

		$aEmailsQuoted = \array_map(function ($mItem) use ($self) {
			return $self->quoteValue($mItem);
		}, $aEmailsToUpdate);
		
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
	`display` varchar(255) NOT NULL DEFAULT \'\',
	`display_name` varchar(255) NOT NULL DEFAULT \'\',
	`display_email` varchar(255) NOT NULL DEFAULT \'\',
	`auto` int(1) UNSIGNED NOT NULL DEFAULT \'0\',
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
	 * @param string $sSearch
	 *
	 * @return string
	 */
	private function specialConvertSearchValue($sSearch, $sEscapeSign = '=')
	{
		return '%'.\str_replace(array($sEscapeSign, '_', '%'),
			array($sEscapeSign.$sEscapeSign, $sEscapeSign.'_', $sEscapeSign.'%'), $sSearch).'%';
	}

	/**
	 * @return array
	 */
	protected function getPdoAccessData()
	{
		return array('mysql', $this->sDsn, $this->sUser, $this->sPassword);
	}
}