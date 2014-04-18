<?php

namespace RainLoop\Providers\AddressBook;

use \RainLoop\Providers\AddressBook\Enumerations\PropertyType;

class PdoAddressBook
	extends \RainLoop\Common\PdoAbstract
	implements \RainLoop\Providers\AddressBook\AddressBookInterface
{
	/**
	 * @var string
	 */
	private $sDsn;

	/**
	 * @var string
	 */
	private $sDsnType;
	
	/**
	 * @var string
	 */
	private $sUser;

	/**
	 * @var string
	 */
	private $sPassword;

	public function __construct($sDsn, $sUser = '', $sPassword = '', $sDsnType = 'mysql')
	{
		$this->sDsn = $sDsn;
		$this->sUser = $sUser;
		$this->sPassword = $sPassword;
		$this->sDsnType = $sDsnType;

		$this->bExplain = false; // debug
	}

	/**
	 * @return bool
	 */
	public function IsSupported()
	{
		$aDrivers = \class_exists('PDO') ? \PDO::getAvailableDrivers() : array();
		return \is_array($aDrivers) ? \in_array($this->sDsnType, $aDrivers) : false;
	}

	/**
	 * @param string $sEmail
	 * @param \RainLoop\Providers\AddressBook\Classes\Contact $oContact
	 *
	 * @return bool
	 */
	public function ContactSave($sEmail, &$oContact)
	{
		$this->Sync();
		$iUserID = $this->getUserId($sEmail);
		
		$iIdContact = 0 < \strlen($oContact->IdContact) && \is_numeric($oContact->IdContact) ? (int) $oContact->IdContact : 0;

		$bUpdate = 0 < $iIdContact;

		$oContact->UpdateDependentValues();
		$oContact->Changed = \time();
		
		try
		{
			if ($this->isTransactionSupported())
			{
				$this->beginTransaction();
			}

			$aFreq = array();
			if ($bUpdate)
			{
				$aFreq = $this->getContactFreq($iUserID, $iIdContact);

				$sSql = 'UPDATE rainloop_ab_contacts SET id_contact_str = :id_contact_str, display = :display, changed = :changed, hash = :hash '.
					'WHERE id_user = :id_user AND id_contact = :id_contact';

				$this->prepareAndExecute($sSql,
					array(
						':id_user' => array($iUserID, \PDO::PARAM_INT),
						':id_contact' => array($iIdContact, \PDO::PARAM_INT),
						':id_contact_str' => array($oContact->IdContactStr, \PDO::PARAM_STR),
						':display' => array($oContact->Display, \PDO::PARAM_STR),
						':changed' => array($oContact->Changed, \PDO::PARAM_INT),
						':hash' => array($oContact->Hash, \PDO::PARAM_STR)
					)
				);

				// clear previos props
				$this->prepareAndExecute(
					'DELETE FROM rainloop_ab_properties WHERE id_user = :id_user AND id_contact = :id_contact',
					array(
						':id_user' => array($iUserID, \PDO::PARAM_INT),
						':id_contact' => array($iIdContact, \PDO::PARAM_INT)
					)
				);
			}
			else
			{
				$sSql = 'INSERT INTO rainloop_ab_contacts '.
					'( id_user,  id_contact_str,  display,  changed,  hash) VALUES '.
					'(:id_user, :id_contact_str, :display, :changed, :hash)';

				$this->prepareAndExecute($sSql,
					array(
						':id_user' => array($iUserID, \PDO::PARAM_INT),
						':id_contact_str' => array($oContact->IdContactStr, \PDO::PARAM_STR),
						':display' => array($oContact->Display, \PDO::PARAM_STR),
						':changed' => array($oContact->Changed, \PDO::PARAM_INT),
						':hash' => array($oContact->Hash, \PDO::PARAM_STR)
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
				foreach ($oContact->Properties as /* @var $oProp \RainLoop\Providers\AddressBook\Classes\Property */ $oProp)
				{
					$iFreq = $oProp->Frec;
					if ($oProp->IsEmail() && isset($aFreq[$oProp->Value]))
					{
						$iFreq = $aFreq[$oProp->Value];
					}

					$aParams[] = array(
						':id_contact' => array($iIdContact, \PDO::PARAM_INT),
						':id_user' => array($iUserID, \PDO::PARAM_INT),
						':prop_type' => array($oProp->Type, \PDO::PARAM_INT),
						':prop_type_custom' => array($oProp->TypeCustom, \PDO::PARAM_STR),
						':prop_value' => array($oProp->Value, \PDO::PARAM_STR),
						':prop_value_custom' => array($oProp->ValueCustom, \PDO::PARAM_STR),
						':prop_frec' => array($iFreq, \PDO::PARAM_INT),
					);
				}

				$sSql = 'INSERT INTO rainloop_ab_properties '.
					'( id_contact,  id_user,  prop_type,  prop_type_custom,  prop_value,  prop_value_custom,  prop_frec) VALUES '.
					'(:id_contact, :id_user, :prop_type, :prop_type_custom, :prop_value, :prop_value_custom, :prop_frec)';

				$this->prepareAndExecute($sSql, $aParams, true);
			}
		}
		catch (\Exception $oException)
		{
			if ($this->isTransactionSupported())
			{
				$this->rollBack();
			}

			throw $oException;
		}

		if ($this->isTransactionSupported())
		{
			$this->commit();
		}

		return 0 < $iIdContact;
	}

	/**
	 * @param string $sEmail
	 * @param array $aContactIds
	 *
	 * @return bool
	 */
	public function DeleteContacts($sEmail, $aContactIds)
	{
		$this->Sync();
		$iUserID = $this->getUserId($sEmail);

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

		$this->prepareAndExecute('DELETE FROM rainloop_ab_properties WHERE id_user = :id_user AND id_contact IN ('.$sIDs.')', $aParams);
		$this->prepareAndExecute('DELETE FROM rainloop_ab_contacts WHERE id_user = :id_user AND id_contact IN ('.$sIDs.')', $aParams);

		return true;
	}

	/**
	 * @param string $sEmail
	 * @param int $iOffset = 0
	 * @param int $iLimit = 20
	 * @param string $sSearch = ''
	 * @param int $iResultCount = 0
	 * 
	 * @return array
	 */
	public function GetContacts($sEmail, $iOffset = 0, $iLimit = 20, $sSearch = '', &$iResultCount = 0)
	{
		$this->Sync();

		$iOffset = 0 <= $iOffset ? $iOffset : 0;
		$iLimit = 0 < $iLimit ? (int) $iLimit : 20;
		$sSearch = \trim($sSearch);

		$iUserID = $this->getUserId($sEmail);

		$iCount = 0;
		$aSearchIds = array();
		$aPropertyFromSearchIds = array();
		
		if (0 < \strlen($sSearch))
		{
			$sCustomSearch = $this->specialConvertSearchValueCustomPhone($sSearch);
			if ('%%' === $sCustomSearch)
			{
				// TODO fix this
				$sCustomSearch = '';
			}
			
			$sSql = 'SELECT id_user, id_prop, id_contact FROM rainloop_ab_properties '.
				'WHERE (id_user = :id_user) AND (prop_value LIKE :search ESCAPE \'=\''.
					(0 < \strlen($sCustomSearch) ? ' OR (prop_type IN ('.\implode(',', array(
						PropertyType::PHONE_PERSONAL, PropertyType::PHONE_BUSSINES, PropertyType::PHONE_OTHER,
						PropertyType::MOBILE_PERSONAL, PropertyType::MOBILE_BUSSINES, PropertyType::MOBILE_OTHER,
						PropertyType::FAX_PERSONAL, PropertyType::FAX_BUSSINES, PropertyType::FAX_OTHER
					)).') AND prop_value_custom <> \'\' AND prop_value_custom LIKE :search_custom_phone)' : '').
				') GROUP BY id_contact, id_prop';

			$aParams = array(
				':id_user' => array($iUserID, \PDO::PARAM_INT),
				':search' => array($this->specialConvertSearchValue($sSearch, '='), \PDO::PARAM_STR)
			);

			if (0 < \strlen($sCustomSearch))
			{
				$aParams[':search_custom_phone'] = array($sCustomSearch, \PDO::PARAM_STR);
			}

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

				$aSearchIds = \array_unique($aSearchIds);
				$iCount = \count($aSearchIds);
			}
		}
		else
		{
			$sSql = 'SELECT COUNT(DISTINCT id_contact) as contact_count FROM rainloop_ab_properties '.
				'WHERE id_user = :id_user';
			
			$aParams = array(
				':id_user' => array($iUserID, \PDO::PARAM_INT)
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
			$sSql = 'SELECT * FROM rainloop_ab_contacts WHERE id_user = :id_user';
			
			$aParams = array(
				':id_user' => array($iUserID, \PDO::PARAM_INT)
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
							$oContact = new \RainLoop\Providers\AddressBook\Classes\Contact();

							$oContact->IdContact = (string) $iIdContact;
							$oContact->IdContactStr = isset($aItem['id_contact_str']) ? (string) $aItem['id_contact_str'] : '';
							$oContact->Display = isset($aItem['display']) ? (string) $aItem['display'] : '';
							$oContact->Changed = isset($aItem['changed']) ? (int) $aItem['changed'] : 0;
							$oContact->ReadOnly = $iUserID !== (isset($aItem['id_user']) ? (int) $aItem['id_user'] : 0);

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

					$sSql = 'SELECT * FROM rainloop_ab_properties WHERE id_contact IN ('.\implode(',', $aIdContacts).')';
					$oStmt = $this->prepareAndExecute($sSql);

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
										$oProperty = new \RainLoop\Providers\AddressBook\Classes\Property();
										$oProperty->IdProperty = (int) $aItem['id_prop'];
										$oProperty->Type = (int) $aItem['prop_type'];
										$oProperty->TypeCustom = isset($aItem['prop_type_custom']) ? (string) $aItem['prop_type_custom'] : '';
										$oProperty->Value = (string) $aItem['prop_value'];
										$oProperty->ValueCustom = isset($aItem['prop_value_custom']) ? (string) $aItem['prop_value_custom'] : '';
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
	 * @param string $sEmail
	 * @param string $mID
	 * @param bool $bIsStrID = false
	 *
	 * @return \RainLoop\Providers\AddressBook\Classes\Contact|null
	 */
	public function GetContactByID($sEmail, $mID, $bIsStrID = false)
	{
		$this->Sync();

		$mID = \trim($mID);

		$iUserID = $this->getUserId($sEmail);

		$sSql = 'SELECT * FROM rainloop_ab_contacts WHERE id_user = :id_user';

		$aParams = array(
			':id_user' => array($iUserID, \PDO::PARAM_INT)
		);

		if ($bIsStrID)
		{
			$sSql .= ' AND id_contact_str = :id_contact_str';
			$aParams[':id_contact_str'] = array($mID, \PDO::PARAM_STR);
		}
		else
		{
			$sSql .= ' AND id_contact = :id_contact';
			$aParams[':id_contact'] = array($mID, \PDO::PARAM_INT);
		}

		$sSql .= ' LIMIT 1';

		$oContact = null;
		$iIdContact = 0;

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
						$oContact = new \RainLoop\Providers\AddressBook\Classes\Contact();

						$oContact->IdContact = (string) $iIdContact;
						$oContact->IdContactStr = isset($aItem['id_contact_str']) ? (string) $aItem['id_contact_str'] : '';
						$oContact->Display = isset($aItem['display']) ? (string) $aItem['display'] : '';
						$oContact->Changed = isset($aItem['changed']) ? (int) $aItem['changed'] : 0;
						$oContact->ReadOnly = $iUserID !== (isset($aItem['id_user']) ? (int) $aItem['id_user'] : 0);
						$oContact->Hash = empty($aItem['hash']) ? '' : (string) $aItem['hash'];
					}
				}
			}

			unset($aFetch);

			if (0 < $iIdContact && $oContact)
			{
				$oStmt->closeCursor();

				$sSql = 'SELECT * FROM rainloop_ab_properties WHERE id_contact = '.$iIdContact;
				$oStmt = $this->prepareAndExecute($sSql);

				if ($oStmt)
				{
					$aFetch = $oStmt->fetchAll(\PDO::FETCH_ASSOC);
					if (\is_array($aFetch) && 0 < \count($aFetch))
					{
						foreach ($aFetch as $aItem)
						{
							if ($aItem && isset($aItem['id_prop'], $aItem['id_contact'], $aItem['prop_type'], $aItem['prop_value']))
							{
								if ((string) $oContact->IdContact === (string) $aItem['id_contact'])
								{
									$oProperty = new \RainLoop\Providers\AddressBook\Classes\Property();
									$oProperty->IdProperty = (int) $aItem['id_prop'];
									$oProperty->Type = (int) $aItem['prop_type'];
									$oProperty->TypeCustom = isset($aItem['prop_type_custom']) ? (string) $aItem['prop_type_custom'] : '';
									$oProperty->Value = (string) $aItem['prop_value'];
									$oProperty->ValueCustom = isset($aItem['prop_value_custom']) ? (string) $aItem['prop_value_custom'] : '';
									$oProperty->Frec = isset($aItem['prop_frec']) ? (int) $aItem['prop_frec'] : 0;

									$oContact->Properties[] = $oProperty;
								}
							}
						}
					}

					unset($aFetch);

					$oContact->UpdateDependentValues();
				}
			}
		}

		return $oContact;
	}

	/**
	 * @param string $sEmail
	 * @param string $sSearch
	 * @param int $iLimit = 20
	 *
	 * @return array
	 *
	 * @throws \InvalidArgumentException
	 */
	public function GetSuggestions($sEmail, $sSearch, $iLimit = 20)
	{
		$sSearch = \trim($sSearch);
		if (0 === \strlen($sSearch))
		{
			throw new \InvalidArgumentException('Empty Search argument');
		}

		$this->Sync();
		
		$iUserID = $this->getUserId($sEmail);

		$sTypes = implode(',', array(
			PropertyType::EMAIl_PERSONAL, PropertyType::EMAIl_BUSSINES, PropertyType::EMAIl_OTHER, PropertyType::FIRST_NAME, PropertyType::LAST_NAME
		));

		$sSql = 'SELECT id_contact, id_prop, prop_type, prop_value FROM rainloop_ab_properties '.
			'WHERE (id_user = :id_user) AND prop_type IN ('.$sTypes.') AND prop_value LIKE :search ESCAPE \'=\'';
		
		$aParams = array(
			':id_user' => array($iUserID, \PDO::PARAM_INT),
			':limit' => array($iLimit, \PDO::PARAM_INT),
			':search' => array($this->specialConvertSearchValue($sSearch, '='), \PDO::PARAM_STR)
		);

		$sSql .= ' ORDER BY prop_frec DESC';
		$sSql .= ' LIMIT :limit';

		$aResult = array();
		
		$oStmt = $this->prepareAndExecute($sSql, $aParams);
		if ($oStmt)
		{
			$aIdContacts = array();
			$aIdProps = array();
			$aContactAllAccess = array();

			$aFetch = $oStmt->fetchAll(\PDO::FETCH_ASSOC);
			if (\is_array($aFetch) && 0 < \count($aFetch))
			{
				foreach ($aFetch as $aItem)
				{
					$iIdContact = $aItem && isset($aItem['id_contact']) ? (int) $aItem['id_contact'] : 0;
					$iIdProp = $aItem && isset($aItem['id_prop']) ? (int) $aItem['id_prop'] : 0;
					$iType = $aItem && isset($aItem['prop_type']) ? (int) $aItem['prop_type'] : 0;
					
					if (0 < $iIdContact && 0 < $iIdProp)
					{
						$aIdContacts[$iIdContact] = $iIdContact;
						$aIdProps[$iIdProp] = $iIdProp;

						if (\in_array($iType, array(PropertyType::LAST_NAME, PropertyType::FIRST_NAME)))
						{
							$aContactAllAccess[$iIdContact] = $iIdContact;
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
					PropertyType::EMAIl_PERSONAL, PropertyType::EMAIl_BUSSINES, PropertyType::EMAIl_OTHER, PropertyType::FIRST_NAME, PropertyType::LAST_NAME
				));

				$sSql = 'SELECT id_prop, id_contact, prop_type, prop_value FROM rainloop_ab_properties '.
					'WHERE prop_type IN ('.$sTypes.') AND id_contact IN ('.\implode(',', $aIdContacts).')';

				$oStmt = $this->prepareAndExecute($sSql);
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
								$iIdProp = (int) $aItem['id_prop'];
								$iType = (int) $aItem['prop_type'];

								if (\in_array($iType, array(PropertyType::LAST_NAME, PropertyType::FIRST_NAME)))
								{
									if (!isset($aNames[$iIdContact]))
									{
										$aNames[$iIdContact] = array('', '');
									}

									$aNames[$iIdContact][PropertyType::LAST_NAME === $iType ? 0 : 1] = $aItem['prop_value'];
								}
								else if ((isset($aIdProps[$iIdProp]) || isset($aContactAllAccess[$iIdContact]))&&
									\in_array($iType, array(PropertyType::EMAIl_PERSONAL, PropertyType::EMAIl_BUSSINES)))
								{
									if (!isset($aEmails[$iIdContact]))
									{
										$aEmails[$iIdContact] = array();
									}

									$aEmails[$iIdContact][] = $aItem['prop_value'];
								}
							}
						}

						foreach ($aEmails as $iId => $aItems)
						{
							$aNameItem = isset($aNames[$iId]) && \is_array($aNames[$iId]) ? $aNames[$iId] : array('', '');
							$sNameItem = \trim($aNameItem[0].' '.$aNameItem[1]);

							foreach ($aItems as $sEmail)
							{
								$aResult[] = array($sEmail, $sNameItem);
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
	 * @param string $sEmail
	 * @param array $aEmails
	 * @param bool $bCreateAuto = true
	 *
	 * @return bool
	 */
	public function IncFrec($sEmail, $aEmails, $bCreateAuto = true)
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

		$aEmailsObjects = \array_filter($aEmailsObjects, function ($oItem) {
			return !!$oItem;
		});
		
		if (0 === \count($aEmailsObjects))
		{
			throw new \InvalidArgumentException('Empty Emails argument');
		}

		$this->Sync();
		$iUserID = $this->getUserId($sEmail);

		$sTypes = \implode(',', array(
			PropertyType::EMAIl_PERSONAL, PropertyType::EMAIl_BUSSINES, PropertyType::EMAIl_OTHER
		));

		$aExists = array();
		$aEmailsToCreate = array();
		$aEmailsToUpdate = array();

		if ($bCreateAuto)
		{
			$sSql = 'SELECT prop_value FROM rainloop_ab_properties WHERE id_user = :id_user AND prop_type IN ('.$sTypes.')';
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
					$sEmailUpdate = \strtolower(\trim($oItem->GetEmail()));
					if (0 < \strlen($sEmailUpdate))
					{
						$aEmailsToUpdate[] = $sEmailUpdate;
					}
				}
			}
		}
		
		unset($aEmails, $aEmailsObjects);

		if (0 < \count($aEmailsToCreate))
		{
			$oContact = new \RainLoop\Providers\AddressBook\Classes\Contact();
			foreach ($aEmailsToCreate as $oEmail)
			{
				if ('' !== \trim($oEmail->GetEmail()))
				{
					$oPropEmail = new \RainLoop\Providers\AddressBook\Classes\Property();
					$oPropEmail->Type = \RainLoop\Providers\AddressBook\Enumerations\PropertyType::EMAIl_PERSONAL;
					$oPropEmail->Value = \strtolower(\trim($oEmail->GetEmail()));

					$oContact->Properties[] = $oPropEmail;
				}

				if ('' !== \trim($oEmail->GetDisplayName()))
				{
					$sFirst = $sLast = '';
					$sFullName = $oEmail->GetDisplayName();
					if (false !== \strpos($sFullName, ' '))
					{
						$aNames = explode(' ', $sFullName, 2);
						$sFirst = isset($aNames[0]) ? $aNames[0] : '';
						$sLast = isset($aNames[1]) ? $aNames[1] : '';
					}
					else
					{
						$sFirst = $sFullName;
					}

					if (0 < \strlen($sFirst))
					{
						$oPropName = new \RainLoop\Providers\AddressBook\Classes\Property();
						$oPropName->Type = \RainLoop\Providers\AddressBook\Enumerations\PropertyType::FIRST_NAME;
						$oPropName->Value = \trim($sFirst);

						$oContact->Properties[] = $oPropName;
					}
					
					if (0 < \strlen($sLast))
					{
						$oPropName = new \RainLoop\Providers\AddressBook\Classes\Property();
						$oPropName->Type = \RainLoop\Providers\AddressBook\Enumerations\PropertyType::LAST_NAME;
						$oPropName->Value = \trim($sLast);

						$oContact->Properties[] = $oPropName;
					}
				}

				if (0 < \count($oContact->Properties))
				{
					$this->ContactSave($sEmail, $oContact);
				}
				
				$oContact->Clear();
			}
		}
		
		$sSql = 'UPDATE rainloop_ab_properties SET prop_frec = prop_frec + 1 WHERE id_user = :id_user AND prop_type IN ('.$sTypes;

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
		$sResult = '';
		try
		{
			$this->Sync();
			if (0 >= $this->getVersion($this->sDsnType.'-ab-version'))
			{
				$sResult = 'Unknown database error';
			}
		}
		catch (\Exception $oException)
		{
			$sResult = $oException->getMessage();
			if (!empty($sResult) && !\MailSo\Base\Utils::IsAscii($sResult) && !\MailSo\Base\Utils::IsUtf8($sResult))
			{
				$sResult = @\utf8_encode($sResult);
			}

			if (!\is_string($sResult) || empty($sResult))
			{
				$sResult = 'Unknown database error';
			}
		}

		return $sResult;
	}

	private function getInitialTablesArray($sDbType)
	{
		switch ($sDbType)
		{
			case 'mysql':
				$sInitial = <<<MYSQLINITIAL

CREATE TABLE IF NOT EXISTS rainloop_ab_contacts (

	id_contact		bigint UNSIGNED NOT NULL AUTO_INCREMENT,
	id_contact_str	varchar(128) NOT NULL DEFAULT \'\',
	id_user			int UNSIGNED NOT NULL,
	display_name	varchar(255) NOT NULL DEFAULT '',
	display_email	varchar(255) NOT NULL DEFAULT '',
	display			varchar(255) NOT NULL DEFAULT '',
	changed			int UNSIGNED NOT NULL DEFAULT 0,
	hash			varchar(128) NOT NULL DEFAULT \'\',

	PRIMARY KEY(id_contact),
	INDEX id_user_rainloop_ab_contacts_index (id_user)

)/*!40000 ENGINE=INNODB *//*!40101 CHARACTER SET utf8 COLLATE utf8_general_ci */;

CREATE TABLE IF NOT EXISTS rainloop_ab_properties (

	id_prop			bigint UNSIGNED NOT NULL AUTO_INCREMENT,
	id_contact		bigint UNSIGNED NOT NULL,
	id_user			int UNSIGNED NOT NULL,
	prop_type		tinyint UNSIGNED NOT NULL,
	prop_type_custom	varchar(50) /*!40101 CHARACTER SET ascii COLLATE ascii_general_ci */ NOT NULL DEFAULT '',
	prop_value			varchar(255) NOT NULL DEFAULT '',
	prop_value_custom	varchar(255) NOT NULL DEFAULT '',
	prop_frec			int UNSIGNED NOT NULL DEFAULT 0,

	PRIMARY KEY(id_prop),
	INDEX id_user_rainloop_ab_properties_index (id_user),
	INDEX id_user_id_contact_rainloop_ab_properties_index (id_user, id_contact)

)/*!40000 ENGINE=INNODB *//*!40101 CHARACTER SET utf8 COLLATE utf8_general_ci */;
MYSQLINITIAL;
				break;

			case 'pgsql':
				$sInitial = <<<POSTGRESINITIAL

CREATE TABLE rainloop_ab_contacts (
	id_contact		bigserial PRIMARY KEY,
	id_user			integer NOT NULL,
	display_name	varchar(128) NOT NULL DEFAULT '',
	display_email	varchar(128) NOT NULL DEFAULT '',
	display			varchar(128) NOT NULL DEFAULT '',
	changed			integer NOT NULL default 0.
	hash			varchar(128) NOT NULL DEFAULT ''
);

CREATE INDEX id_user_rainloop_ab_contacts_index ON rainloop_ab_contacts (id_user);

CREATE TABLE rainloop_ab_properties (
	id_prop			bigserial PRIMARY KEY,
	id_contact		integer NOT NULL,
	id_user			integer NOT NULL,
	prop_type		integer NOT NULL,
	prop_type_custom	varchar(50) NOT NULL DEFAULT '',
	prop_value			varchar(128) NOT NULL DEFAULT '',
	prop_value_custom	varchar(128) NOT NULL DEFAULT '',
	prop_frec			integer NOT NULL default 0
);

CREATE INDEX id_user_rainloop_ab_properties_index ON rainloop_ab_properties (id_user);
CREATE INDEX id_user_id_contact_rainloop_ab_properties_index ON rainloop_ab_properties (id_user, id_contact);

POSTGRESINITIAL;
				break;

			case 'sqlite':
				$sInitial = <<<SQLITEINITIAL

CREATE TABLE rainloop_ab_contacts (
	id_contact		integer NOT NULL PRIMARY KEY,
	id_user			integer NOT NULL,
	display_name	text NOT NULL DEFAULT '',
	display_email	text NOT NULL DEFAULT '',
	display			text NOT NULL DEFAULT '',
	changed			integer NOT NULL DEFAULT 0,
	hash			text NOT NULL DEFAULT ''
);

CREATE INDEX id_user_rainloop_ab_contacts_index ON rainloop_ab_contacts (id_user);

CREATE TABLE rainloop_ab_properties (
	id_prop			integer NOT NULL PRIMARY KEY,
	id_contact		integer NOT NULL,
	id_user			integer NOT NULL,
	prop_type		integer NOT NULL,
	prop_type_custom	text NOT NULL DEFAULT '',
	prop_value			text NOT NULL DEFAULT '',
	prop_value_custom	text NOT NULL DEFAULT '',
	prop_frec			integer NOT NULL DEFAULT 0
);

CREATE INDEX id_user_rainloop_ab_properties_index ON rainloop_ab_properties (id_user);
CREATE INDEX id_user_id_contact_rainloop_ab_properties_index ON rainloop_ab_properties (id_user, id_contact);

SQLITEINITIAL;
				break;
		}

		if (0 < strlen($sInitial))
		{
			$aList = \explode(';', \trim($sInitial));
			foreach ($aList as $sV)
			{
				$sV = \trim($sV);
				if (0 < \strlen($sV))
				{
					$aResult[] = $sV;
				}
			}
		}

		return $aResult;
	}

	/**
	 * @return bool
	 */
	public function Sync()
	{
		switch ($this->sDsnType)
		{
			case 'mysql':
				return $this->dataBaseUpgrade($this->sDsnType.'-ab-version', array(
					1 => $this->getInitialTablesArray($this->sDsnType)
				));
			case 'pgsql':
				return $this->dataBaseUpgrade($this->sDsnType.'-ab-version', array(
					1 => $this->getInitialTablesArray($this->sDsnType)
				));
			case 'sqlite':
				return $this->dataBaseUpgrade($this->sDsnType.'-ab-version', array(
					1 => $this->getInitialTablesArray($this->sDsnType)
				));
		}

		return false;
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
			PropertyType::EMAIl_PERSONAL, PropertyType::EMAIl_BUSSINES
		));

		$sSql = 'SELECT prop_value, prop_frec FROM rainloop_ab_properties WHERE id_user = :id_user AND id_contact = :id_contact AND prop_type IN ('.$sTypes.')';
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
	 * @param string $sEscapeSign = '='
	 *
	 * @return string
	 */
	private function specialConvertSearchValue($sSearch, $sEscapeSign = '=')
	{
		return '%'.\str_replace(array($sEscapeSign, '_', '%'),
			array($sEscapeSign.$sEscapeSign, $sEscapeSign.'_', $sEscapeSign.'%'), $sSearch).'%';
	}

	/**
	 * @param string $sSearch
	 *
	 * @return string
	 */
	private function specialConvertSearchValueCustomPhone($sSearch)
	{
		return '%'.\preg_replace('/[^\d]/', '', $sSearch).'%';
	}

	/**
	 * @return array
	 */
	protected function getPdoAccessData()
	{
		return array($this->sDsnType, $this->sDsn, $this->sUser, $this->sPassword);
	}
}