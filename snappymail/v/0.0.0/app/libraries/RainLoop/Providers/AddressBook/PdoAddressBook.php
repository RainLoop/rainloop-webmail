<?php

namespace RainLoop\Providers\AddressBook;

use \RainLoop\Providers\AddressBook\Enumerations\PropertyType;

class PdoAddressBook
	extends \RainLoop\Common\PdoAbstract
	implements \RainLoop\Providers\AddressBook\AddressBookInterface
{
	use CardDAV;

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

	public function __construct(string $sDsn, string $sUser = '', string $sPassword = '', string $sDsnType = 'mysql')
	{
		$this->sDsn = $sDsn;
		$this->sUser = $sUser;
		$this->sPassword = $sPassword;
		$this->sDsnType = $sDsnType;

		$this->bExplain = false; // debug
	}

	public function IsSupported() : bool
	{
		$aDrivers = static::getAvailableDrivers();
		return \is_array($aDrivers) && \in_array($this->sDsnType, $aDrivers);
	}

	public function IsSharingAllowed() : bool
	{
		return $this->IsSupported() && false; // TODO
	}

	private function flushDeletedContacts(int $iUserID) : bool
	{
		return !!$this->prepareAndExecute('DELETE FROM rainloop_ab_contacts WHERE id_user = :id_user AND deleted = 1', array(
			':id_user' => array($iUserID, \PDO::PARAM_INT)
		));
	}

	private function updateContactEtagAndTime(int $iUserID, int $iID, string $sEtag, int $iChanged) : bool
	{
		return !!$this->prepareAndExecute('UPDATE rainloop_ab_contacts SET changed = :changed, etag = :etag '.
			'WHERE id_user = :id_user AND id_contact = :id_contact', array(
				':id_user' => array($iUserID, \PDO::PARAM_INT),
				':id_contact' => array($iID, \PDO::PARAM_INT),
				':changed' => array($iChanged, \PDO::PARAM_INT),
				':etag' => array($sEtag, \PDO::PARAM_STR)
			)
		);
	}

	private function prepearDatabaseSyncData(int $iUserID) : array
	{
		$aResult = array();
		$oStmt = $this->prepareAndExecute('SELECT id_contact, id_contact_str, changed, deleted, etag FROM rainloop_ab_contacts WHERE id_user = :id_user', array(
			':id_user' => array($iUserID, \PDO::PARAM_INT)
		));

		if ($oStmt)
		{
			$aFetch = $oStmt->fetchAll(\PDO::FETCH_ASSOC);
			if (\is_array($aFetch) && 0 < \count($aFetch))
			{
				foreach ($aFetch as $aItem)
				{
					if ($aItem && isset($aItem['id_contact'], $aItem['id_contact_str'], $aItem['changed'], $aItem['deleted'], $aItem['etag']) &&
						!empty($aItem['id_contact_str']))
					{
						$sKeyID = $aItem['id_contact_str'];

						$aResult[$sKeyID] = array(
							'deleted' => '1' === (string) $aItem['deleted'],
							'id_contact' => $aItem['id_contact'],
							'uid' => $sKeyID,
							'etag' => $aItem['etag'],
							'changed' => (int) $aItem['changed'],
						);

						$aResult[$sKeyID]['changed_'] = \gmdate('c', $aResult[$sKeyID]['changed']);
					}
				}
			}
		}

		return $aResult;
	}

	public function Sync(string $sEmail, string $sUrl, string $sUser, string $sPassword, string $sProxy = '') : bool
	{
		$this->SyncDatabase();

		$iUserID = $this->getUserId($sEmail);
		if (0 >= $iUserID)
		{
			return false;
		}

		$oClient = $this->getDavClient($sUrl, $sUser, $sPassword, $sProxy);
		if (!$oClient)
		{
			return false;
		}

		$sPath = $oClient->__UrlPath__;

		$aRemoteSyncData = $this->prepareDavSyncData($oClient, $sPath);
		if (false === $aRemoteSyncData)
		{
			return false;
		}

		$aDatabaseSyncData = $this->prepearDatabaseSyncData($iUserID);

//		$this->oLogger->WriteDump($aRemoteSyncData);
//		$this->oLogger->WriteDump($aDatabaseSyncData);

		//+++del (from carddav)
		foreach ($aDatabaseSyncData as $sKey => $aData)
		{
			if ($aData['deleted'] &&
				isset($aRemoteSyncData[$sKey], $aRemoteSyncData[$sKey]['vcf']))
			{
				$this->davClientRequest($oClient, 'DELETE', $sPath.$aRemoteSyncData[$sKey]['vcf']);
			}
		}
		//---del

		//+++del (from db)
		$aIdsForDeletedion = array();
		foreach ($aDatabaseSyncData as $sKey => $aData)
		{
			if (!$aData['deleted'] && !empty($aData['etag']) && !isset($aRemoteSyncData[$sKey]))
			{
				$aIdsForDeletedion[] = $aData['id_contact'];
			}
		}

		if (0 < \count($aIdsForDeletedion))
		{
			$this->DeleteContacts($sEmail, $aIdsForDeletedion, false);
		}
		//---del

		$this->flushDeletedContacts($iUserID);

		//+++new or newer (from db)
		foreach ($aDatabaseSyncData as $sKey => $aData)
		{
			if (!$aData['deleted'] &&
				(empty($aData['etag']) && !isset($aRemoteSyncData[$sKey])) // new
					||
				(!empty($aData['etag']) && isset($aRemoteSyncData[$sKey]) && // newer
					$aRemoteSyncData[$sKey]['etag'] !== $aData['etag'] &&
					$aRemoteSyncData[$sKey]['changed'] < $aData['changed']
				)
			)
			{
				$mID = $aData['id_contact'];
				$oContact = $this->GetContactByID($sEmail, $mID, false);
				if ($oContact)
				{
					$sExsistensBody = '';
					$mExsistenRemoteID = isset($aRemoteSyncData[$sKey]['vcf']) && !empty($aData['etag']) ? $aRemoteSyncData[$sKey]['vcf'] : '';
					if (0 < \strlen($mExsistenRemoteID))
					{
						$oResponse = $this->davClientRequest($oClient, 'GET', $sPath.$mExsistenRemoteID);
						if ($oResponse)
						{
							$sExsistensBody = \trim($oResponse->body);
						}

//						$this->oLogger->WriteDump($sExsistensBody);
					}

					$oResponse = $this->davClientRequest($oClient, 'PUT',
						$sPath.(0 < \strlen($mExsistenRemoteID) ? $mExsistenRemoteID : $oContact->CardDavNameUri()),
						$oContact->ToVCard($sExsistensBody, $this->oLogger)."\r\n\r\n");
					if ($oResponse)
					{
						$sEtag = \trim(\trim($oResponse->getHeader('etag')), '"\'');
						$sDate = \trim($oResponse->getHeader('date'));
						if (!empty($sEtag))
						{
							$iChanged = empty($sDate) ? \time() : \MailSo\Base\DateTimeHelper::ParseRFC2822DateString($sDate);
							$this->updateContactEtagAndTime($iUserID, $mID, $sEtag, $iChanged);
						}
					}
				}

				unset($oContact);
			}
		}
		//---new

		//+++new or newer (from carddav)
		foreach ($aRemoteSyncData as $sKey => $aData)
		{
			if (!isset($aDatabaseSyncData[$sKey]) // new
					 ||
				($aDatabaseSyncData[$sKey]['etag'] !== $aData['etag'] && // newer
					$aDatabaseSyncData[$sKey]['changed'] < $aData['changed'])
			)
			{
				$mExsistenContactID = isset($aDatabaseSyncData[$sKey]['id_contact']) ?
					$aDatabaseSyncData[$sKey]['id_contact'] : '';

				$oResponse = $this->davClientRequest($oClient, 'GET', $sPath.$aData['vcf']);
				if ($oResponse)
				{
					$sBody = \trim($oResponse->body);

					// Remove UTF-8 BOM
					if ("\xef\xbb\xbf" === \substr($sBody, 0, 3))
					{
						$sBody = \substr($sBody, 3);
					}

					if (!empty($sBody))
					{
						$oVCard = null;
						try
						{
							$oVCard = \Sabre\VObject\Reader::read($sBody);
						}
						catch (\Throwable $oExc)
						{
							if ($this->oLogger)
							{
								$this->oLogger->WriteException($oExc);
								$this->oLogger->WriteDump($sBody);
							}
						}

						if ($oVCard instanceof \Sabre\VObject\Component\VCard)
						{
							$oVCard->UID = $aData['uid'];

							$oContact = null;
							if ($mExsistenContactID)
							{
								$oContact = $this->GetContactByID($sEmail, $mExsistenContactID);
							}
							if (!$oContact)
							{
								$oContact = new Classes\Contact();
							}

							$oContact->PopulateByVCard(
								$oVCard,
								\trim(\trim($oResponse->getHeader('etag')), '"\'')
							);

							$this->ContactSave($sEmail, $oContact);
							unset($oContact);
//						} else if ($this->oLogger) {
//							$this->oLogger->WriteDump($sBody);
						}
					}
				}
			}
		}

		return true;
	}

	public function Export(string $sEmail, string $sType = 'vcf') : bool
	{
		$this->SyncDatabase();

		$iUserID = $this->getUserId($sEmail);
		if (0 >= $iUserID)
		{
			return false;
		}

		$bVcf = 'vcf' === $sType;
		$bCsvHeader = true;

		$aDatabaseSyncData = $this->prepearDatabaseSyncData($iUserID);
		if (\is_array($aDatabaseSyncData) && 0 < \count($aDatabaseSyncData))
		{
			foreach ($aDatabaseSyncData as $mData)
			{
				if ($mData && isset($mData['id_contact'], $mData['deleted']) && !$mData['deleted'])
				{
					$oContact = $this->GetContactByID($sEmail, $mData['id_contact']);
					if ($oContact)
					{
						if ($bVcf)
						{
							echo $oContact->ToVCard();
						}
						else
						{
							echo $oContact->ToCsv($bCsvHeader);
							$bCsvHeader = false;
						}
					}
				}
			}
		}

		return true;
	}

	public function ContactSave(string $sEmail, Classes\Contact $oContact, bool $bSyncDb = true) : bool
	{
		if ($bSyncDb)
		{
			$this->SyncDatabase();
		}

		$iUserID = $this->getUserId($sEmail);

		$iIdContact = 0 < \strlen($oContact->IdContact) && \is_numeric($oContact->IdContact) ? (int) $oContact->IdContact : 0;

		$bUpdate = 0 < $iIdContact;

		$oContact->UpdateDependentValues();
		$oContact->Changed = \time();

		try
		{
			$aFreq = array();
			if ($bUpdate)
			{
				$aFreq = $this->getContactFreq($iUserID, $iIdContact);

				$sSql = 'UPDATE rainloop_ab_contacts SET id_contact_str = :id_contact_str, display = :display, changed = :changed, etag = :etag '.
					'WHERE id_user = :id_user AND id_contact = :id_contact';

				$this->prepareAndExecute($sSql,
					array(
						':id_user' => array($iUserID, \PDO::PARAM_INT),
						':id_contact' => array($iIdContact, \PDO::PARAM_INT),
						':id_contact_str' => array($oContact->IdContactStr, \PDO::PARAM_STR),
						':display' => array($oContact->Display, \PDO::PARAM_STR),
						':changed' => array($oContact->Changed, \PDO::PARAM_INT),
						':etag' => array($oContact->Etag, \PDO::PARAM_STR)
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
					'( id_user,  id_contact_str,  display,  changed,  etag)'.
					' VALUES '.
					'(:id_user, :id_contact_str, :display, :changed, :etag)';

				$this->prepareAndExecute($sSql,
					array(
						':id_user' => array($iUserID, \PDO::PARAM_INT),
						':id_contact_str' => array($oContact->IdContactStr, \PDO::PARAM_STR),
						':display' => array($oContact->Display, \PDO::PARAM_STR),
						':changed' => array($oContact->Changed, \PDO::PARAM_INT),
						':etag' => array($oContact->Etag, \PDO::PARAM_STR)
					)
				);

				$sLast = $this->lastInsertId('rainloop_ab_contacts', 'id_contact');
				if (\is_numeric($sLast) && 0 < (int) $sLast)
				{
					$iIdContact = (int) $sLast;
					$oContact->IdContact = (string) $iIdContact;
				}
			}

			if (0 < $iIdContact)
			{
				$aParams = array();
				foreach ($oContact->Properties as /* @var $oProp Classes\Property */ $oProp)
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
						':prop_type_str' => array($oProp->TypeStr, \PDO::PARAM_STR),
						':prop_value' => array($oProp->Value, \PDO::PARAM_STR),
						':prop_value_lower' => array($oProp->ValueLower, \PDO::PARAM_STR),
						':prop_value_custom' => array($oProp->ValueCustom, \PDO::PARAM_STR),
						':prop_frec' => array($iFreq, \PDO::PARAM_INT),
					);
				}

				if (0 < \count($aParams))
				{
					$sSql = 'INSERT INTO rainloop_ab_properties '.
						'( id_contact,  id_user,  prop_type,  prop_type_str,  prop_value,  prop_value_lower, prop_value_custom,  prop_frec)'.
						' VALUES '.
						'(:id_contact, :id_user, :prop_type, :prop_type_str, :prop_value, :prop_value_lower, :prop_value_custom, :prop_frec)';

					$this->prepareAndExecute($sSql, $aParams, true);
				}
			}
		}
		catch (\Throwable $oException)
		{
			throw $oException;
		}

		return 0 < $iIdContact;
	}

	public function DeleteContacts(string $sEmail, array $aContactIds, bool $bSyncDb = true) : bool
	{
		if ($bSyncDb)
		{
			$this->SyncDatabase();
		}

		$iUserID = $this->getUserId($sEmail);

		$aContactIds = \array_filter(\array_map('intval', $aContactIds));

		if (0 === \count($aContactIds))
		{
			return false;
		}

		$sIDs = \implode(',', $aContactIds);
		$aParams = array(':id_user' => array($iUserID, \PDO::PARAM_INT));

		$this->prepareAndExecute('DELETE FROM rainloop_ab_properties WHERE id_user = :id_user AND id_contact IN ('.$sIDs.')', $aParams);

		$aParams = array(
			':id_user' => array($iUserID, \PDO::PARAM_INT),
			':changed' => array(\time(), \PDO::PARAM_INT)
		);

		$this->prepareAndExecute('UPDATE rainloop_ab_contacts SET deleted = 1, changed = :changed '.
			'WHERE id_user = :id_user AND id_contact IN ('.$sIDs.')', $aParams);

		return true;
	}

	public function DeleteAllContacts(string $sEmail, bool $bSyncDb = true) : bool
	{
		if ($bSyncDb)
		{
			$this->SyncDatabase();
		}

		$iUserID = $this->getUserId($sEmail);

		$aParams = array(':id_user' => array($iUserID, \PDO::PARAM_INT));

		$this->prepareAndExecute('DELETE FROM rainloop_ab_properties WHERE id_user = :id_user', $aParams);
		$this->prepareAndExecute('DELETE FROM rainloop_ab_contacts WHERE id_user = :id_user', $aParams);

		return true;
	}

	public function GetContacts(string $sEmail, int $iOffset = 0, int $iLimit = 20, string $sSearch = '', int &$iResultCount = 0) : array
	{
		$this->SyncDatabase();

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
			$sLowerSearch = $this->specialConvertSearchValueLower($sSearch, '=');

			$sSearchTypes = \implode(',', array(
				PropertyType::EMAIl, PropertyType::FIRST_NAME, PropertyType::LAST_NAME, PropertyType::NICK_NAME,
				PropertyType::PHONE, PropertyType::WEB_PAGE
			));

			$sSql = 'SELECT id_user, id_prop, id_contact FROM rainloop_ab_properties '.
				'WHERE (id_user = :id_user) AND prop_type IN ('.$sSearchTypes.') AND ('.
				'prop_value LIKE :search ESCAPE \'=\''.
(0 < \strlen($sLowerSearch) ? ' OR (prop_value_lower <> \'\' AND prop_value_lower LIKE :search_lower ESCAPE \'=\')' : '').
(0 < \strlen($sCustomSearch) ? ' OR (prop_type = '.PropertyType::PHONE.' AND prop_value_custom <> \'\' AND prop_value_custom LIKE :search_custom_phone)' : '').
				') GROUP BY id_contact, id_prop';

			$aParams = array(
				':id_user' => array($iUserID, \PDO::PARAM_INT),
				':search' => array($this->specialConvertSearchValue($sSearch, '='), \PDO::PARAM_STR)
			);

			if (0 < \strlen($sLowerSearch))
			{
				$aParams[':search_lower'] = array($sLowerSearch, \PDO::PARAM_STR);
			}

			if (0 < \strlen($sCustomSearch))
			{
				$aParams[':search_custom_phone'] = array($sCustomSearch, \PDO::PARAM_STR);
			}

			$oStmt = $this->prepareAndExecute($sSql, $aParams, false, true);
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

		$aResult = array();
		if (0 < $iCount)
		{
			$sSql = 'SELECT * FROM rainloop_ab_contacts WHERE deleted = 0 AND id_user = :id_user';

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
							$oContact = new Classes\Contact();

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
										$oProperty = new Classes\Property();
										$oProperty->IdProperty = (int) $aItem['id_prop'];
										$oProperty->Type = (int) $aItem['prop_type'];
										$oProperty->TypeStr = isset($aItem['prop_type_str']) ? (string) $aItem['prop_type_str'] : '';
										$oProperty->Value = (string) $aItem['prop_value'];
										$oProperty->ValueLower = isset($aItem['prop_value_lower']) ? (string) $aItem['prop_value_lower'] : '';
										$oProperty->ValueCustom = isset($aItem['prop_value_custom']) ? (string) $aItem['prop_value_custom'] : '';
										$oProperty->Frec = isset($aItem['prop_frec']) ? (int) $aItem['prop_frec'] : 0;

										$aContacts[$iId]->Properties[] = $oProperty;
									}
								}
							}
						}

						unset($aFetch);

						foreach ($aContacts as $oItem)
						{
							$oItem->UpdateDependentValues();
						}

						$aResult = \array_values($aContacts);
					}
				}
			}
		}

		return $aResult;
	}

	/**
	 * @param mixed $mID
	 */
	public function GetContactByID(string $sEmail, $mID, bool $bIsStrID = false) : ?Classes\Contact
	{
		$mID = \trim($mID);

		$iUserID = $this->getUserId($sEmail);

		$sSql = 'SELECT * FROM rainloop_ab_contacts WHERE deleted = 0 AND id_user = :id_user';

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
						$oContact = new Classes\Contact();

						$oContact->IdContact = (string) $iIdContact;
						$oContact->IdContactStr = isset($aItem['id_contact_str']) ? (string) $aItem['id_contact_str'] : '';
						$oContact->Display = isset($aItem['display']) ? (string) $aItem['display'] : '';
						$oContact->Changed = isset($aItem['changed']) ? (int) $aItem['changed'] : 0;
						$oContact->ReadOnly = $iUserID !== (isset($aItem['id_user']) ? (int) $aItem['id_user'] : 0);
						$oContact->Etag = empty($aItem['etag']) ? '' : (string) $aItem['etag'];
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
									$oProperty = new Classes\Property();
									$oProperty->IdProperty = (int) $aItem['id_prop'];
									$oProperty->Type = (int) $aItem['prop_type'];
									$oProperty->TypeStr = isset($aItem['prop_type_str']) ? (string) $aItem['prop_type_str'] : '';
									$oProperty->Value = (string) $aItem['prop_value'];
									$oProperty->ValueLower = isset($aItem['prop_value_lower']) ? (string) $aItem['prop_value_lower'] : '';
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
	 * @throws \InvalidArgumentException
	 */
	public function GetSuggestions(string $sEmail, string $sSearch, int $iLimit = 20) : array
	{
		$sSearch = \trim($sSearch);
		if (0 === \strlen($sSearch))
		{
			throw new \InvalidArgumentException('Empty Search argument');
		}

		$this->SyncDatabase();

		$iUserID = $this->getUserId($sEmail);

		$sTypes = implode(',', array(
			PropertyType::EMAIl, PropertyType::FIRST_NAME, PropertyType::LAST_NAME, PropertyType::NICK_NAME
		));

		$sLowerSearch = $this->specialConvertSearchValueLower($sSearch);

		$sSql = 'SELECT id_contact, id_prop, prop_type, prop_value FROM rainloop_ab_properties '.
			'WHERE (id_user = :id_user) AND prop_type IN ('.$sTypes.') AND ('.
			'prop_value LIKE :search ESCAPE \'=\''.
(0 < \strlen($sLowerSearch) ? ' OR (prop_value_lower <> \'\' AND prop_value_lower LIKE :search_lower ESCAPE \'=\')' : '').
			')'
		;

		$aParams = array(
			':id_user' => array($iUserID, \PDO::PARAM_INT),
			':limit' => array($iLimit, \PDO::PARAM_INT),
			':search' => array($this->specialConvertSearchValue($sSearch, '='), \PDO::PARAM_STR)
		);

		if (0 < \strlen($sLowerSearch))
		{
			$aParams[':search_lower'] = array($sLowerSearch, \PDO::PARAM_STR);
		}

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

						if (\in_array($iType, array(PropertyType::LAST_NAME, PropertyType::FIRST_NAME, PropertyType::NICK_NAME)))
						{
							if (!isset($aContactAllAccess[$iIdContact]))
							{
								$aContactAllAccess[$iIdContact] = array();
							}

							$aContactAllAccess[$iIdContact][] = $iType;
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
					PropertyType::EMAIl, PropertyType::FIRST_NAME, PropertyType::LAST_NAME, PropertyType::NICK_NAME
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

								if (PropertyType::NICK_NAME === $iType)
								{
									$aNicks[$iIdContact] = $aItem['prop_value'];
								}
								else if (\in_array($iType, array(PropertyType::LAST_NAME, PropertyType::FIRST_NAME)))
								{
									if (!isset($aNames[$iIdContact]))
									{
										$aNames[$iIdContact] = array('', '');
									}

									$aNames[$iIdContact][PropertyType::FIRST_NAME === $iType ? 0 : 1] = $aItem['prop_value'];
								}
								else if ((isset($aIdProps[$iIdProp]) || isset($aContactAllAccess[$iIdContact])) &&
									PropertyType::EMAIl === $iType)
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
							if (isset($aContactAllAccess[$iId]))
							{
								$bName = \in_array(PropertyType::FIRST_NAME, $aContactAllAccess[$iId]) || \in_array(PropertyType::LAST_NAME, $aContactAllAccess[$iId]);
								$bNick = \in_array(PropertyType::NICK_NAME, $aContactAllAccess[$iId]);

								$aNameItem = isset($aNames[$iId]) && \is_array($aNames[$iId]) ? $aNames[$iId] : array('', '');
								$sNameItem = \trim($aNameItem[0].' '.$aNameItem[1]);

								$sNickItem = isset($aNicks[$iId]) ? $aNicks[$iId] : '';

								foreach ($aItems as $sEmail)
								{
									if ($sEmail)
									{
										if ($bName)
										{
											$aResult[] = array($sEmail, $sNameItem);
										}
										else if ($bNick)
										{
											$aResult[] = array($sEmail, $sNickItem);
										}
										else
										{
											$aResult[] = array($sEmail, '');
										}
									}
								}
							}
							else
							{
								$aNameItem = isset($aNames[$iId]) && \is_array($aNames[$iId]) ? $aNames[$iId] : array('', '');
								$sNameItem = \trim($aNameItem[0].' '.$aNameItem[1]);
								if (0 === \strlen($sNameItem))
								{
									$sNameItem = isset($aNicks[$iId]) ? $aNicks[$iId] : '';
								}

								foreach ($aItems as $sEmail)
								{
									$aResult[] = array($sEmail, $sNameItem);
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

	public function IncFrec(string $sEmail, array $aEmails, bool $bCreateAuto = true) : bool
	{
		$self = $this;
		$aEmailsObjects = \array_map(function ($mItem) {
			$oResult = null;
			try
			{
				$oResult = \MailSo\Mime\Email::Parse(\trim($mItem));
			}
			catch (\Throwable $oException) { unset($oException); }
			return $oResult;
		}, $aEmails);

		$aEmailsObjects = \array_filter($aEmailsObjects, function ($oItem) {
			return !!$oItem;
		});

		if (0 === \count($aEmailsObjects))
		{
			throw new \InvalidArgumentException('Empty Emails argument');
		}

		$this->SyncDatabase();
		$iUserID = $this->getUserId($sEmail);

		$aExists = array();
		$aEmailsToCreate = array();
		$aEmailsToUpdate = array();

		if ($bCreateAuto)
		{
			$sSql = 'SELECT prop_value FROM rainloop_ab_properties WHERE id_user = :id_user AND prop_type = :prop_type';
			$oStmt = $this->prepareAndExecute($sSql, array(
				':id_user' => array($iUserID, \PDO::PARAM_INT),
				':prop_type' => array(PropertyType::EMAIl, \PDO::PARAM_INT)
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
							$aExists[] = \MailSo\Base\Utils::StrToLowerIfAscii(\trim($aItem['prop_value']));
						}
					}
				}
			}

			$aEmailsToCreate = \array_filter($aEmailsObjects, function ($oItem) use ($aExists, &$aEmailsToUpdate) {
				if ($oItem)
				{
					$sEmail = \trim($oItem->GetEmail(true));
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
					$sEmailUpdate = \trim($oItem->GetEmail(true));
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
			$oContact = new Classes\Contact();
			foreach ($aEmailsToCreate as $oEmail)
			{
				if ('' !== \trim($oEmail->GetEmail()))
				{
					$oPropEmail = new Classes\Property();
					$oPropEmail->Type = Enumerations\PropertyType::EMAIl;
					$oPropEmail->Value = \trim($oEmail->GetEmail(true));

					$oContact->Properties[] = $oPropEmail;
				}

				if ('' !== \trim($oEmail->GetDisplayName()))
				{
					$sFirst = $sLast = '';
					$sFullName = $oEmail->GetDisplayName();
					if (false !== \strpos($sFullName, ' '))
					{
						$aNames = \explode(' ', $sFullName, 2);
						$sFirst = isset($aNames[0]) ? $aNames[0] : '';
						$sLast = isset($aNames[1]) ? $aNames[1] : '';
					}
					else
					{
						$sFirst = $sFullName;
					}

					if (0 < \strlen($sFirst))
					{
						$oPropName = new Classes\Property();
						$oPropName->Type = Enumerations\PropertyType::FIRST_NAME;
						$oPropName->Value = \trim($sFirst);

						$oContact->Properties[] = $oPropName;
					}

					if (0 < \strlen($sLast))
					{
						$oPropName = new Classes\Property();
						$oPropName->Type = Enumerations\PropertyType::LAST_NAME;
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

		$sSql = 'UPDATE rainloop_ab_properties SET prop_frec = prop_frec + 1 WHERE id_user = :id_user AND prop_type = :prop_type';

		$aEmailsQuoted = \array_map(function ($mItem) use ($self) {
			return $self->quoteValue($mItem);
		}, $aEmailsToUpdate);

		if (1 === \count($aEmailsQuoted))
		{
			$sSql .= ' AND prop_value = '.$aEmailsQuoted[0];
		}
		else
		{
			$sSql .= ' AND prop_value IN ('.\implode(',', $aEmailsQuoted).')';
		}

		return !!$this->prepareAndExecute($sSql, array(
			':id_user' => array($iUserID, \PDO::PARAM_INT),
			':prop_type' => array(PropertyType::EMAIl, \PDO::PARAM_INT)
		));
	}

	public function Test() : string
	{
		$sResult = '';
		try
		{
			$this->SyncDatabase();
			if (0 >= $this->getVersion($this->sDsnType.'-ab-version'))
			{
				$sResult = 'Unknown database error';
			}
		}
		catch (\Throwable $oException)
		{
			$sResult = $oException->getMessage();
			if (!empty($sResult) && !\MailSo\Base\Utils::IsAscii($sResult) && !\MailSo\Base\Utils::IsUtf8($sResult))
			{
				$sResult = \utf8_encode($sResult);
			}

			if (!\is_string($sResult) || empty($sResult))
			{
				$sResult = 'Unknown database error';
			}
		}

		return $sResult;
	}

	private function getInitialTablesArray(string $sDbType) : array
	{
		switch ($sDbType)
		{
			case 'mysql':
				$sInitial = <<<MYSQLINITIAL

CREATE TABLE IF NOT EXISTS rainloop_ab_contacts (

	id_contact     bigint UNSIGNED  NOT NULL AUTO_INCREMENT,
	id_contact_str varchar(128)     NOT NULL DEFAULT '',
	id_user        int UNSIGNED     NOT NULL,
	display        varchar(255)     NOT NULL DEFAULT '',
	changed        int UNSIGNED     NOT NULL DEFAULT 0,
	deleted        tinyint UNSIGNED NOT NULL DEFAULT 0,
	etag           varchar(128)     CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',

	PRIMARY KEY(id_contact),
	INDEX id_user_rainloop_ab_contacts_index (id_user)

) ENGINE=INNODB CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS rainloop_ab_properties (

	id_prop           bigint UNSIGNED  NOT NULL AUTO_INCREMENT,
	id_contact        bigint UNSIGNED  NOT NULL,
	id_user           int UNSIGNED     NOT NULL,
	prop_type         tinyint UNSIGNED NOT NULL,
	prop_type_str     varchar(255)     CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
	prop_value        varchar(255)     NOT NULL DEFAULT '',
	prop_value_custom varchar(255)     NOT NULL DEFAULT '',
	prop_frec         int UNSIGNED     NOT NULL DEFAULT 0,

	PRIMARY KEY(id_prop),
	INDEX id_user_rainloop_ab_properties_index (id_user),
	INDEX id_user_id_contact_rainloop_ab_properties_index (id_user, id_contact),
	INDEX id_contact_prop_type_rainloop_ab_properties_index (id_contact, prop_type)

) ENGINE=INNODB CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

MYSQLINITIAL;
				break;

			case 'pgsql':
				$sInitial = <<<POSTGRESINITIAL

CREATE TABLE rainloop_ab_contacts (
	id_contact     bigserial    PRIMARY KEY,
	id_contact_str varchar(128) NOT NULL DEFAULT '',
	id_user        integer      NOT NULL,
	display        varchar(255) NOT NULL DEFAULT '',
	changed        integer      NOT NULL default 0,
	deleted        integer      NOT NULL default 0,
	etag           varchar(128) NOT NULL DEFAULT ''
);

CREATE INDEX id_user_rainloop_ab_contacts_index ON rainloop_ab_contacts (id_user);

CREATE TABLE rainloop_ab_properties (
	id_prop           bigserial    PRIMARY KEY,
	id_contact        integer      NOT NULL,
	id_user           integer      NOT NULL,
	prop_type         integer      NOT NULL,
	prop_type_str     varchar(255) NOT NULL DEFAULT '',
	prop_value        text         NOT NULL DEFAULT '',
	prop_value_custom text         NOT NULL DEFAULT '',
	prop_frec         integer      NOT NULL default 0
);

CREATE INDEX id_user_rainloop_ab_properties_index ON rainloop_ab_properties (id_user);
CREATE INDEX id_user_id_contact_rainloop_ab_properties_index ON rainloop_ab_properties (id_user, id_contact);

POSTGRESINITIAL;
				break;

			case 'sqlite':
				$sInitial = <<<SQLITEINITIAL

CREATE TABLE rainloop_ab_contacts (
	id_contact     integer NOT NULL PRIMARY KEY,
	id_contact_str text    NOT NULL DEFAULT '',
	id_user        integer NOT NULL,
	display        text    NOT NULL DEFAULT '',
	changed        integer NOT NULL DEFAULT 0,
	deleted        integer NOT NULL DEFAULT 0,
	etag           text    NOT NULL DEFAULT ''
);

CREATE INDEX id_user_rainloop_ab_contacts_index ON rainloop_ab_contacts (id_user);

CREATE TABLE rainloop_ab_properties (
	id_prop           integer NOT NULL PRIMARY KEY,
	id_contact        integer NOT NULL,
	id_user           integer NOT NULL,
	prop_type         integer NOT NULL,
	prop_type_str     text    NOT NULL DEFAULT '',
	prop_value        text    NOT NULL DEFAULT '',
	prop_value_custom text    NOT NULL DEFAULT '',
	prop_frec         integer NOT NULL DEFAULT 0
);

CREATE INDEX id_user_rainloop_ab_properties_index ON rainloop_ab_properties (id_user);
CREATE INDEX id_user_id_contact_rainloop_ab_properties_index ON rainloop_ab_properties (id_user, id_contact);

SQLITEINITIAL;
				break;
		}

		$aResult = array();
		if (0 < \strlen($sInitial))
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

	public function SyncDatabase() : bool
	{
		static $mCache = null;
		if (null !== $mCache)
		{
			return $mCache;
		}

		$mCache = false;
		switch ($this->sDsnType)
		{
			case 'mysql':
				$mCache = $this->dataBaseUpgrade($this->sDsnType.'-ab-version', array(
					1 => $this->getInitialTablesArray($this->sDsnType),
					2 => array(
'ALTER TABLE rainloop_ab_properties ADD prop_value_lower varchar(255) NOT NULL DEFAULT \'\' AFTER prop_value_custom;'
					),
					3 => array(
'ALTER TABLE rainloop_ab_properties CHANGE prop_value prop_value TEXT NOT NULL;',
'ALTER TABLE rainloop_ab_properties CHANGE prop_value_custom prop_value_custom TEXT NOT NULL;',
'ALTER TABLE rainloop_ab_properties CHANGE prop_value_lower prop_value_lower TEXT NOT NULL;'
					)
				));
				break;
			case 'pgsql':
				$mCache = $this->dataBaseUpgrade($this->sDsnType.'-ab-version', array(
					1 => $this->getInitialTablesArray($this->sDsnType),
					2 => array(
'ALTER TABLE rainloop_ab_properties ADD prop_value_lower text NOT NULL DEFAULT \'\';'
					),
					3 => array()
				));
				break;
			case 'sqlite':
				$mCache = $this->dataBaseUpgrade($this->sDsnType.'-ab-version', array(
					1 => $this->getInitialTablesArray($this->sDsnType),
					2 => array(
'ALTER TABLE rainloop_ab_properties ADD prop_value_lower text NOT NULL DEFAULT \'\';'
					),
					3 => array()
				));
				break;
		}

		return $mCache;
	}

	private function getContactFreq(int $iUserID, int $iIdContact) : array
	{
		$aResult = array();

		$sSql = 'SELECT prop_value, prop_frec FROM rainloop_ab_properties WHERE id_user = :id_user AND id_contact = :id_contact AND prop_type = :type';
		$aParams = array(
			':id_user' => array($iUserID, \PDO::PARAM_INT),
			':id_contact' => array($iIdContact, \PDO::PARAM_INT),
			':type' => array(PropertyType::EMAIl, \PDO::PARAM_INT)
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

	private function specialConvertSearchValue(string $sSearch, string $sEscapeSign = '=') : string
	{
		return '%'.\str_replace(array($sEscapeSign, '_', '%'),
			array($sEscapeSign.$sEscapeSign, $sEscapeSign.'_', $sEscapeSign.'%'), $sSearch).'%';
	}

	private function specialConvertSearchValueLower(string $sSearch, string $sEscapeSign = '=') : string
	{
		if (!\MailSo\Base\Utils::FunctionExistsAndEnabled('mb_strtolower'))
		{
			return '';
		}

		return '%'.\str_replace(array($sEscapeSign, '_', '%'),
			array($sEscapeSign.$sEscapeSign, $sEscapeSign.'_', $sEscapeSign.'%'),
				(string) \mb_strtolower($sSearch, 'UTF-8')).'%';
	}

	private function specialConvertSearchValueCustomPhone(string $sSearch) : string
	{
		$sResult = '%'.\preg_replace('/[^\d]/', '', $sSearch).'%';
		return '%%' === $sResult ? '' : $sResult;
	}

	protected function getPdoAccessData() : array
	{
		return array($this->sDsnType, $this->sDsn, $this->sUser, $this->sPassword);
	}
}
