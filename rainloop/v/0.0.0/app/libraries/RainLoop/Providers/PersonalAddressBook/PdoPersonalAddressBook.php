<?php

namespace RainLoop\Providers\PersonalAddressBook;

use \RainLoop\Providers\PersonalAddressBook\Enumerations\PropertyType;

class PdoPersonalAddressBook
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
		
		$this->bExplain = false;
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
		$this->Sync();
		$iUserID = $this->getUserId($oAccount->ParentEmailHelper());
		
		$iIdContact = \strlen($oContact->IdContact) && \is_numeric($oContact->IdContact) ? (int) $oContact->IdContact : 0;

		$bUpdate = 0 < $iIdContact;

		$oContact->UpdateDependentValues();
		$oContact->Changed = \time();

		if (\RainLoop\Providers\PersonalAddressBook\Enumerations\ScopeType::AUTO !== $oContact->ScopeType)
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
						'DELETE FROM rainloop_pab_contacts WHERE id_user = :id_user AND scope_type = :scope_type AND display_email IN ('.\implode(',', $aEmail).')',
						array(
							':scope_type' => array(\RainLoop\Providers\PersonalAddressBook\Enumerations\ScopeType::AUTO, \PDO::PARAM_INT),
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

				$sSql = 'UPDATE rainloop_pab_contacts SET display = :display, display_name = :display_name, display_email = :display_email, '.
					'scope_type = :scope_type, changed = :changed  WHERE id_user = :id_user AND id_contact = :id_contact';

				$this->prepareAndExecute($sSql,
					array(
						':id_user' => array($iUserID, \PDO::PARAM_INT),
						':id_contact' => array($iIdContact, \PDO::PARAM_INT),
						':display' => array($oContact->Display, \PDO::PARAM_STR),
						':display_name' => array($oContact->DisplayName, \PDO::PARAM_STR),
						':display_email' => array($oContact->DisplayEmail, \PDO::PARAM_STR),
						':scope_type' => array($oContact->ScopeType, \PDO::PARAM_INT),
						':changed' => array($oContact->Changed, \PDO::PARAM_INT),
					)
				);

				// clear previos props
				$this->prepareAndExecute(
					'DELETE FROM rainloop_pab_properties WHERE id_user = :id_user AND id_contact = :id_contact',
					array(
						':id_user' => array($iUserID, \PDO::PARAM_INT),
						':id_contact' => array($iIdContact, \PDO::PARAM_INT)
					)
				);
			}
			else
			{
				$sSql = 'INSERT INTO rainloop_pab_contacts '.
					'( id_user,  display,  display_name,  display_email,  scope_type,  changed) VALUES '.
					'(:id_user, :display, :display_name, :display_email, :scope_type, :changed)';

				$this->prepareAndExecute($sSql,
					array(
						':id_user' => array($iUserID, \PDO::PARAM_INT),
						':display' => array($oContact->Display, \PDO::PARAM_STR),
						':display_name' => array($oContact->DisplayName, \PDO::PARAM_STR),
						':display_email' => array($oContact->DisplayEmail, \PDO::PARAM_STR),
						':scope_type' => array($oContact->ScopeType, \PDO::PARAM_INT),
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
						':scope_type' => array($oContact->ScopeType, \PDO::PARAM_INT),
						':prop_type' => array($oProp->Type, \PDO::PARAM_INT),
						':prop_type_custom' => array($oProp->TypeCustom, \PDO::PARAM_STR),
						':prop_value' => array($oProp->Value, \PDO::PARAM_STR),
						':prop_value_custom' => array($oProp->ValueClear, \PDO::PARAM_STR),
						':prop_frec' => array($iFreq, \PDO::PARAM_INT),
					);
				}

				$sSql = 'INSERT INTO rainloop_pab_properties '.
					'( id_contact,  id_user,  prop_type,  prop_type_custom,  prop_value,  prop_value_custom,  scope_type,  prop_frec) VALUES '.
					'(:id_contact, :id_user, :prop_type, :prop_type_custom, :prop_value, :prop_value_custom, :scope_type, :prop_frec)';

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
		$this->Sync();
		$iUserID = $this->getUserId($oAccount->ParentEmailHelper());

		$aContactIds = \array_filter($aContactIds, function (&$mItem) {
			$mItem = (int) \trim($mItem);
			return 0 < $mItem;
		});

		if (0 === \count($aContactIds))
		{
			return false;
		}

		$sIDs = \implode(',', $aContactIds);
		$aParams = array(':id_user' => array($iUserID, \PDO::PARAM_INT));

		$this->prepareAndExecute('DELETE FROM rainloop_pab_tags_contacts WHERE id_contact IN ('.$sIDs.')');
		$this->prepareAndExecute('DELETE FROM rainloop_pab_properties WHERE id_user = :id_user AND id_contact IN ('.$sIDs.')', $aParams);
		$this->prepareAndExecute('DELETE FROM rainloop_pab_contacts WHERE id_user = :id_user AND id_contact IN ('.$sIDs.')', $aParams);

		return true;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param array $aTagsIds
	 *
	 * @return bool
	 */
	public function DeleteTags($oAccount, $aTagsIds)
	{
		$this->Sync();
		$iUserID = $this->getUserId($oAccount->ParentEmailHelper());

		$aTagsIds = \array_filter($aTagsIds, function (&$mItem) {
			$mItem = (int) \trim($mItem);
			return 0 < $mItem;
		});

		if (0 === \count($aTagsIds))
		{
			return false;
		}

		$sIDs = \implode(',', $aTagsIds);
		$aParams = array(':id_user' => array($iUserID, \PDO::PARAM_INT));

		$this->prepareAndExecute('DELETE FROM rainloop_pab_tags_contacts WHERE id_tag IN ('.$sIDs.')');
		$this->prepareAndExecute('DELETE FROM rainloop_pab_tags WHERE id_user = :id_user AND id_tag IN ('.$sIDs.')', $aParams);

		return true;
	}

	/**
	 * @param \RainLoop\Account $oAccount
	 * @param int $iOffset = 0
	 * @param int $iLimit = 20
	 * @param string $sSearch = ''
	 * @param bool $iScopeType = \RainLoop\Providers\PersonalAddressBook\Enumerations\ScopeType::DEFAULT_
	 * @param int $iResultCount = 0
	 * 
	 * @return array
	 */
	public function GetContacts($oAccount, $iOffset = 0, $iLimit = 20, $sSearch = '',
		$iScopeType = \RainLoop\Providers\PersonalAddressBook\Enumerations\ScopeType::DEFAULT_, &$iResultCount = 0)
	{
		$this->Sync();

		$iOffset = 0 <= $iOffset ? $iOffset : 0;
		$iLimit = 0 < $iLimit ? (int) $iLimit : 20;
		$sSearch = \trim($sSearch);

		$iUserID = $this->getUserId($oAccount->ParentEmailHelper());

		$iCount = 0;
		$aSearchIds = array();
		$aPropertyFromSearchIds = array();
		
		if (0 < \strlen($sSearch))
		{
			$sSql = 'SELECT id_prop, id_contact FROM rainloop_pab_properties WHERE id_user = :id_user AND scope_type = :scope_type AND prop_value LIKE :search ESCAPE \'=\' GROUP BY id_contact';
			$aParams = array(
				':id_user' => array($iUserID, \PDO::PARAM_INT),
				':scope_type' => array($iScopeType, \PDO::PARAM_INT),
				':search' => array($this->specialConvertSearchValue($sSearch, '='), \PDO::PARAM_STR)
			);

			$oStmt = $this->prepareAndExecute($sSql, $aParams);
			if ($oStmt)
			{
				$aFetch = $oStmt->fetchAll(\PDO::FETCH_ASSOC);
				if (\is_array($aFetch) && 0 < \count($aFetch))
				{
					foreach ($aFetch as $aItem)
					{
						$iIdContact = $aItem && isset($aItem['id_contact']) ? (int) $aItem['id_contact'] : 0;
						if (0 < $iIdContact)
						{
							$aSearchIds[] = $iIdContact;
							$aPropertyFromSearchIds[$iIdContact] = isset($aItem['id_prop']) ? (int) $aItem['id_prop'] : 0;
						}
					}
				}

				$iCount = \count($aSearchIds);
			}
		}
		else
		{
			$sSql = 'SELECT COUNT(DISTINCT id_contact) as contact_count FROM rainloop_pab_properties WHERE id_user = :id_user AND scope_type = :scope_type';
			$aParams = array(
				':id_user' => array($iUserID, \PDO::PARAM_INT),
				':scope_type' => array($iScopeType, \PDO::PARAM_INT)
			);

			$oStmt = $this->prepareAndExecute($sSql, $aParams);
			if ($oStmt)
			{
				$aFetch = $oStmt->fetchAll(\PDO::FETCH_ASSOC);
				if ($aFetch && isset($aFetch[0]['contact_count']) && is_numeric($aFetch[0]['contact_count']) && 0 < (int) $aFetch[0]['contact_count'])
				{
					$iCount = (int) $aFetch[0]['contact_count'];
				}
			}
		}

		$iResultCount = $iCount;

		if (0 < $iCount)
		{
			$sSql = 'SELECT * FROM rainloop_pab_contacts WHERE id_user = :id_user AND scope_type = :scope_type';
			$aParams = array(
				':id_user' => array($iUserID, \PDO::PARAM_INT),
				':scope_type' => array($iScopeType, \PDO::PARAM_INT)
			);

			if (0 < \count($aSearchIds))
			{
				$sSql .= ' AND id_contact IN ('.implode(',', $aSearchIds).')';
			}

			$sSql .= ' ORDER BY display ASC LIMIT :limit OFFSET :offset';
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
							$oContact->ScopeType = isset($aItem['scope_type']) ? (int) $aItem['scope_type'] :
								\RainLoop\Providers\PersonalAddressBook\Enumerations\ScopeType::DEFAULT_;
							$oContact->Changed = isset($aItem['changed']) ? (int) $aItem['changed'] : 0;

							$oContact->IdPropertyFromSearch = isset($aPropertyFromSearchIds[$iIdContact]) &&
								0 < $aPropertyFromSearchIds[$iIdContact] ? $aPropertyFromSearchIds[$iIdContact] : 0;

							$aContacts[$iIdContact] = $oContact;
						}
					}
				}

				unset($aFetch);

				if (0 < count($aIdContacts))
				{
					$oStmt->closeCursor();

					$sSql = 'SELECT * FROM rainloop_pab_properties WHERE id_user = :id_user AND id_contact IN ('.\implode(',', $aIdContacts).')';
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
								if ($aItem && isset($aItem['id_prop'], $aItem['id_contact'], $aItem['prop_type'], $aItem['prop_value']))
								{
									$iId = (int) $aItem['id_contact'];
									if (0 < $iId && isset($aContacts[$iId]))
									{
										$oProperty = new \RainLoop\Providers\PersonalAddressBook\Classes\Property();
										$oProperty->IdProperty = (int) $aItem['id_prop'];
										$oProperty->ScopeType = isset($aItem['scope_type']) ? (int) $aItem['scope_type'] :
											\RainLoop\Providers\PersonalAddressBook\Enumerations\ScopeType::DEFAULT_;
										$oProperty->Type = (int) $aItem['prop_type'];
										$oProperty->TypeCustom = isset($aItem['prop_type_custom']) ? (string) $aItem['prop_type_custom'] : '';
										$oProperty->Value = (string) $aItem['prop_value'];
										$oProperty->ValueClear = isset($aItem['prop_value_clear']) ? (string) $aItem['prop_value_clear'] : '';
										$oProperty->Frec = isset($aItem['prop_frec']) ? (int) $aItem['prop_frec'] : 0;

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

		$this->Sync();
		$iUserID = $this->getUserId($oAccount->ParentEmailHelper());

		$sTypes = implode(',', array(
			PropertyType::EMAIl_PERSONAL, PropertyType::EMAIl_BUSSINES, PropertyType::EMAIl_OTHER, PropertyType::FULLNAME
		));
		
		$sSql = 'SELECT id_contact, id_prop, prop_type, prop_value FROM rainloop_pab_properties '.
			'WHERE id_user = :id_user AND prop_type IN ('.$sTypes.') AND prop_value LIKE :search ESCAPE \'=\'';
		
		$aParams = array(
			':id_user' => array($iUserID, \PDO::PARAM_INT),
			':limit' => array($iLimit, \PDO::PARAM_INT),
			':search' => array($this->specialConvertSearchValue($sSearch, '='), \PDO::PARAM_STR)
		);

		$sSql .= ' ORDER BY prop_frec DESC';
		$sSql .= ' LIMIT :limit';

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
						$iType = isset($aItem['prop_type']) ? (int) $aItem['prop_type'] : PropertyType::UNKNOWN;
						
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
									'prop_value' => isset($aItem['prop_value']) ? (string) $aItem['prop_value'] : '',
									'prop_type' => $iType
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

				$sSql = 'SELECT id_prop, id_contact, prop_type, prop_value FROM rainloop_pab_properties '.
					'WHERE id_user = :id_user AND prop_type IN ('.$sTypes.') AND id_contact IN ('.\implode(',', $aIdContacts).')';

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
							if ($aItem && isset($aItem['id_prop'], $aItem['id_contact'], $aItem['prop_type'], $aItem['prop_value']))
							{
								$iIdContact = (int) $aItem['id_contact'];
								$iType = (int) $aItem['prop_type'];
								
								if (PropertyType::FULLNAME === $iType)
								{
									$aNames[$iIdContact] = $aItem['prop_value'];
								}
								else if (\in_array($iType,
									array(PropertyType::EMAIl_PERSONAL, PropertyType::EMAIl_BUSSINES, PropertyType::EMAIl_OTHER)))
								{
									if (!isset($aEmails[$iIdContact]))
									{
										$aEmails[$iIdContact] = array();
									}

									$aEmails[$iIdContact][] = $aItem['prop_value'];
								}
							}
						}

						foreach ($aFirstResult as $aItem)
						{
							if ($aItem && !empty($aItem['prop_value']))
							{
								$iIdContact = (int) $aItem['id_contact'];
								$iType = (int) $aItem['prop_type'];
								
								if (PropertyType::FULLNAME === $iType)
								{
									if (isset($aEmails[$iIdContact]) && \is_array($aEmails[$iIdContact]))
									{
										foreach ($aEmails[$iIdContact] as $sEmail)
										{
											if (!empty($sEmail))
											{
												$aResult[] = array($sEmail, (string) $aItem['prop_value']);
											}
										}
									}
								}
								else if (\in_array($iType,
									array(PropertyType::EMAIl_PERSONAL, PropertyType::EMAIl_BUSSINES, PropertyType::EMAIl_OTHER)))
								{
									$aResult[] = array((string) $aItem['prop_value'],
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
	 * @param bool $bCreateAuto = true
	 *
	 * @return bool
	 */
	public function IncFrec($oAccount, $aEmails, $bCreateAuto = true)
	{
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

		$this->Sync();
		$iUserID = $this->getUserId($oAccount->ParentEmailHelper());

		$sTypes = \implode(',', array(
			PropertyType::EMAIl_PERSONAL, PropertyType::EMAIl_BUSSINES, PropertyType::EMAIl_OTHER
		));

		$aExists = array();
		$aEmailsToCreate = array();
		$aEmailsToUpdate = array();

		if ($bCreateAuto)
		{
			$sSql = 'SELECT prop_value FROM rainloop_pab_properties WHERE id_user = :id_user AND prop_type IN ('.$sTypes.')';
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
						if ($aItem && !empty($aItem['prop_value']))
						{
							$aExists[] = \strtolower(\trim($aItem['prop_value']));
						}
					}
				}
			}
		
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
		}
		else
		{
			foreach ($aEmailsObjects as $oItem)
			{
				if ($oItem)
				{
					$sEmail = \strtolower(\trim($oItem->GetEmail()));
					if (0 < \strlen($sEmail))
					{
						$aEmailsToUpdate[] = $sEmail;
					}
				}
			}
		}
		
		unset($aEmails, $aEmailsObjects);

		if (0 < \count($aEmailsToCreate))
		{
			$oContact = new \RainLoop\Providers\PersonalAddressBook\Classes\Contact();
			foreach ($aEmailsToCreate as $oEmail)
			{
				$oContact->ScopeType = \RainLoop\Providers\PersonalAddressBook\Enumerations\ScopeType::AUTO;

				if ('' !== \trim($oEmail->GetEmail()))
				{
					$oPropEmail = new \RainLoop\Providers\PersonalAddressBook\Classes\Property();
					$oPropEmail->ScopeType = $oContact->ScopeType;
					$oPropEmail->Type = \RainLoop\Providers\PersonalAddressBook\Enumerations\PropertyType::EMAIl_PERSONAL;
					$oPropEmail->Value = \strtolower(\trim($oEmail->GetEmail()));

					$oContact->Properties[] = $oPropEmail;
				}

				if ('' !== \trim($oEmail->GetDisplayName()))
				{
					$oPropName = new \RainLoop\Providers\PersonalAddressBook\Classes\Property();
					$oPropName->ScopeType = $oContact->ScopeType;
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
		
		$sSql = 'UPDATE rainloop_pab_properties SET prop_frec = prop_frec + 1 WHERE id_user = :id_user AND prop_type IN ('.$sTypes;

		$aEmailsQuoted = \array_map(function ($mItem) use ($self) {
			return $self->quoteValue($mItem);
		}, $aEmailsToUpdate);
		
		if (1 === \count($aEmailsQuoted))
		{
			$sSql .= ') AND prop_value = '.$aEmailsQuoted[0];
		}
		else
		{
			$sSql .= ') AND prop_value IN ('.\implode(',', $aEmailsQuoted).')';
		}

		return !!$this->prepareAndExecute($sSql, array(
			':id_user' => array($iUserID, \PDO::PARAM_INT),
		));
	}

	/**
	 * @return string
	 */
	public function Test()
	{
		$this->Sync();
		return 0 < $this->getVersion('mysql-pab-version');
	}

	/**
	 * @return bool
	 */
	public function Sync()
	{
		return $this->dataBaseUpgrade('mysql-pab-version', array(
			1 => array(

// -- rainloop_pab_contacts --
'CREATE TABLE IF NOT EXISTS rainloop_pab_contacts (
	
	id_contact		int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
	id_user			int(11) UNSIGNED NOT NULL,
	scope_type		int(4) UNSIGNED NOT NULL DEFAULT 0,
	display_name	varchar(255) NOT NULL DEFAULT \'\',
	display_email	varchar(255) NOT NULL DEFAULT \'\',
	display			varchar(255) NOT NULL DEFAULT \'\',
	changed			int(11) UNSIGNED NOT NULL DEFAULT 0,

	PRIMARY KEY(id_contact),
	INDEX id_user_scope_type_index (id_user, scope_type)

)/*!40000 ENGINE=INNODB *//*!40101 CHARACTER SET utf8 COLLATE utf8_general_ci */;',

// -- rainloop_pab_properties --
'CREATE TABLE IF NOT EXISTS rainloop_pab_properties (
	
	id_prop			int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
	id_contact		int(11) UNSIGNED NOT NULL,
	id_user			int(11) UNSIGNED NOT NULL,
	scope_type		int(4) UNSIGNED NOT NULL DEFAULT 0,
	prop_type		int(11) UNSIGNED NOT NULL,
	prop_type_custom	varchar(50) /*!40101 CHARACTER SET ascii COLLATE ascii_general_ci */ NOT NULL DEFAULT \'\',
	prop_value			varchar(255) NOT NULL DEFAULT \'\',
	prop_value_custom	varchar(255) NOT NULL DEFAULT \'\',
	prop_frec			int(11) UNSIGNED NOT NULL DEFAULT 0,

	PRIMARY KEY(id_prop),
	INDEX id_user_index (id_user),
	INDEX id_user_id_contact_scope_type_index (id_user, id_contact, scope_type)

)/*!40000 ENGINE=INNODB *//*!40101 CHARACTER SET utf8 COLLATE utf8_general_ci */;',

// -- rainloop_pab_tags --
'CREATE TABLE IF NOT EXISTS rainloop_pab_tags (
	
	id_tag		int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
	id_user		int(11) UNSIGNED NOT NULL,
	tag_name	varchar(255) NOT NULL,

	PRIMARY KEY(id_tag),
	INDEX id_user_index (id_user),
	INDEX id_user_name_index (id_user, tag_name)
		
)/*!40000 ENGINE=INNODB *//*!40101 CHARACTER SET utf8 COLLATE utf8_general_ci */;',

// -- rainloop_pab_tags_contacts --
'CREATE TABLE IF NOT EXISTS rainloop_pab_tags_contacts (
	
	id_tag		int(11) UNSIGNED NOT NULL,
	id_contact	int(11) UNSIGNED NOT NULL,

	INDEX id_tag_index (id_tag),
	INDEX id_contact_index (id_contact)

)/*!40000 ENGINE=INNODB *//*!40101 CHARACTER SET utf8 COLLATE utf8_general_ci */;'
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

		$sSql = 'SELECT prop_value, prop_frec FROM rainloop_pab_properties WHERE id_user = :id_user AND id_contact = :id_contact AND prop_type IN ('.$sTypes.')';
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
					if ($aItem && !empty($aItem['prop_value']) && !empty($aItem['prop_frec']))
					{
						$aResult[$aItem['prop_value']] = (int) $aItem['prop_frec'];
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