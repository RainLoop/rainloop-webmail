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
	private $sDsnType;
	
	/**
	 * @var string
	 */
	private $sUser;

	/**
	 * @var string
	 */
	private $sPassword;

	/**
	 * @var bool
	 */
	private $bConsiderShare;

	public function __construct($sDsn, $sUser = '', $sPassword = '', $sDsnType = 'mysql')
	{
		$this->sDsn = $sDsn;
		$this->sUser = $sUser;
		$this->sPassword = $sPassword;
		$this->sDsnType = $sDsnType;

		$this->bConsiderShare = true;
		
		$this->bExplain = false;
	}

	/**
	 * @param bool $bConsiderShare
	 *
	 * @return \RainLoop\Providers\PersonalAddressBook\PdoPersonalAddressBook
	 */
	public function ConsiderShare($bConsiderShare = true)
	{
		$this->bConsiderShare = !!$bConsiderShare;

		return $this;
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
	 * @return bool
	 */
	public function IsConsiderShare()
	{
		return $this->bConsiderShare;
	}

	/**
	 * @return bool
	 */
	public function IsSharingAllowed()
	{
		return $this->IsConsiderShare() && $this->IsSupported();
	}

	/**
	 * @param string $sEmail
	 * @return mixed
	 */
	public function GetUserUidByEmail($sEmail)
	{
		$this->Sync();
		
		$iId = $this->getUserId($sEmail);
		return 0 < $iId ? (string) $iId : '';
	}

	/**
	 * @param string $sEmail
	 * @return string
	 */
	public function GetCtagByEmail($sEmail)
	{
		$this->Sync();
		
		$sResult = '0';
		$iUserID = $this->getUserId($sEmail);
		if (0 < $iUserID)
		{
			$oStmt = $this->prepareAndExecute('SELECT MAX(id_prop) as max_value FROM rainloop_pab_properties WHERE id_user = :id_user',
				array(':id_user' => array($iUserID, \PDO::PARAM_INT)));

			if ($oStmt)
			{
				$aFetch = $oStmt->fetchAll(\PDO::FETCH_ASSOC);
				if ($aFetch && !empty($aFetch[0]['max_value']))
				{
					$sResult = 'RL-CTAG-'.((string) $aFetch[0]['max_value']);
				}
			}
		}

		return $sResult;
	}

	/**
	 * @param string $sEmail
	 * @param bool $bCreate = false
	 *
	 * @return string
	 */
	public function GetUserHashByEmail($sEmail, $bCreate = false)
	{
		$this->Sync();

		$sHash = '';
		$iUserID = $this->getUserId($sEmail);
		if (0 < $iUserID)
		{
			$oStmt = $this->prepareAndExecute('SELECT pass_hash FROM rainloop_pab_users WHERE id_user = :id_user LIMIT 1',
				array(':id_user' => array($iUserID, \PDO::PARAM_INT)));

			if ($oStmt)
			{
				$aFetch = $oStmt->fetchAll(\PDO::FETCH_ASSOC);
				if ($aFetch && !empty($aFetch[0]['pass_hash']))
				{
					$sHash = \rtrim(\base_convert(\md5(\md5($sEmail.'-'.\trim($aFetch[0]['pass_hash']).'-rainloop')), 16, 32), '0');
				}
				else if ($bCreate)
				{
					$this->prepareAndExecute('INSERT INTO rainloop_pab_users (id_user, email, pass_hash) VALUES (:id_user, :email, :pass_hash);',
						array(
							':id_user' => array($iUserID, \PDO::PARAM_INT),
							':email' => array($sEmail, \PDO::PARAM_STR),
							':pass_hash' => array(\md5($sEmail.\microtime(true)), \PDO::PARAM_STR)
						)
					);

					$sHash = $this->GetUserHashByEmail($sEmail, false);
				}
			}
		}

		return $sHash;
	}

	/**
	 * @param string $sEmail
	 * @param \RainLoop\Providers\PersonalAddressBook\Classes\Contact $oContact
	 *
	 * @return bool
	 */
	public function ContactSave($sEmail, &$oContact)
	{
		$this->Sync();
		$iUserID = $this->getUserId($sEmail);
		
		$iIdContact = 0 < \strlen($oContact->IdContact) && \is_numeric($oContact->IdContact) ? (int) $oContact->IdContact : 0;

		$bUpdate = 0 < $iIdContact;

		if (!$this->bConsiderShare)
		{
			$oContact->ScopeType = \RainLoop\Providers\PersonalAddressBook\Enumerations\ScopeType::DEFAULT_;
		}

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

				$sSql = 'UPDATE rainloop_pab_contacts SET id_contact_str = :id_contact_str, display = :display, '.
					'scope_type = :scope_type, changed = :changed, '.
					'carddav_data = :carddav_data, carddav_hash = :carddav_hash, carddav_size = :carddav_size '.
					'WHERE id_user = :id_user AND id_contact = :id_contact';

				$this->prepareAndExecute($sSql,
					array(
						':id_user' => array($iUserID, \PDO::PARAM_INT),
						':id_contact' => array($iIdContact, \PDO::PARAM_INT),
						':id_contact_str' => array($oContact->IdContactStr, \PDO::PARAM_STR),
						':display' => array($oContact->Display, \PDO::PARAM_STR),
						':scope_type' => array($oContact->ScopeType, \PDO::PARAM_INT),
						':changed' => array($oContact->Changed, \PDO::PARAM_INT),

						':carddav_data' => array($oContact->CardDavData, \PDO::PARAM_STR),
						':carddav_hash' => array($oContact->CardDavHash, \PDO::PARAM_STR),
						':carddav_size' => array($oContact->CardDavSize, \PDO::PARAM_INT)
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
					'( id_user,  id_contact_str,  display,  scope_type,  changed,  carddav_data,  carddav_hash,  carddav_size) VALUES '.
					'(:id_user, :id_contact_str, :display, :scope_type, :changed, :carddav_data, :carddav_hash, :carddav_size)';

				$this->prepareAndExecute($sSql,
					array(
						':id_user' => array($iUserID, \PDO::PARAM_INT),
						':id_contact_str' => array($oContact->IdContactStr, \PDO::PARAM_STR),
						':display' => array($oContact->Display, \PDO::PARAM_STR),
						':scope_type' => array($oContact->ScopeType, \PDO::PARAM_INT),
						':changed' => array($oContact->Changed, \PDO::PARAM_INT),
						
						':carddav_data' => array($oContact->CardDavData, \PDO::PARAM_STR),
						':carddav_hash' => array($oContact->CardDavHash, \PDO::PARAM_STR),
						':carddav_size' => array($oContact->CardDavSize, \PDO::PARAM_INT)
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
						':prop_value_custom' => array($oProp->ValueCustom, \PDO::PARAM_STR),
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

		$this->prepareAndExecute('DELETE FROM rainloop_pab_tags_contacts WHERE id_contact IN ('.$sIDs.')');
		$this->prepareAndExecute('DELETE FROM rainloop_pab_properties WHERE id_user = :id_user AND id_contact IN ('.$sIDs.')', $aParams);
		$this->prepareAndExecute('DELETE FROM rainloop_pab_contacts WHERE id_user = :id_user AND id_contact IN ('.$sIDs.')', $aParams);

		return true;
	}

	/**
	 * @param string $sEmail
	 * @param array $aTagsIds
	 *
	 * @return bool
	 */
	public function DeleteTags($sEmail, $aTagsIds)
	{
		$this->Sync();
		$iUserID = $this->getUserId($sEmail);

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
			
			$sSql = 'SELECT id_user, id_prop, id_contact FROM rainloop_pab_properties '.
				'WHERE ('.
				'id_user = :id_user'.
				($this->bConsiderShare ? ' OR scope_type = :scope_type_share_all' : '').
				') AND (prop_value LIKE :search ESCAPE \'=\''.
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

			if ($this->bConsiderShare)
			{
				$aParams[':scope_type_share_all'] = array(\RainLoop\Providers\PersonalAddressBook\Enumerations\ScopeType::SHARE_ALL, \PDO::PARAM_INT);
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
			$sSql = 'SELECT COUNT(DISTINCT id_contact) as contact_count FROM rainloop_pab_properties '.
				'WHERE id_user = :id_user'.
				($this->bConsiderShare ? ' OR scope_type = :scope_type_share_all' : '')
			;
			
			$aParams = array(
				':id_user' => array($iUserID, \PDO::PARAM_INT)
			);

			if ($this->bConsiderShare)
			{
				$aParams[':scope_type_share_all'] = array(\RainLoop\Providers\PersonalAddressBook\Enumerations\ScopeType::SHARE_ALL, \PDO::PARAM_INT);
			}

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
			$sSql = 'SELECT * FROM rainloop_pab_contacts '.
				'WHERE (id_user = :id_user'.
				($this->bConsiderShare ? ' OR scope_type = :scope_type_share_all)' : ')')
			;
			
			$aParams = array(
				':id_user' => array($iUserID, \PDO::PARAM_INT)
			);

			if ($this->bConsiderShare)
			{
				$aParams[':scope_type_share_all'] = array(\RainLoop\Providers\PersonalAddressBook\Enumerations\ScopeType::SHARE_ALL, \PDO::PARAM_INT);
			}

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
							$oContact->IdContactStr = isset($aItem['id_contact_str']) ? (string) $aItem['id_contact_str'] : '';
							$oContact->Display = isset($aItem['display']) ? (string) $aItem['display'] : '';
							$oContact->ScopeType = isset($aItem['scope_type']) ? (int) $aItem['scope_type'] :
								\RainLoop\Providers\PersonalAddressBook\Enumerations\ScopeType::DEFAULT_;
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

					$sSql = 'SELECT * FROM rainloop_pab_properties WHERE id_contact IN ('.\implode(',', $aIdContacts).')';
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
										$oProperty = new \RainLoop\Providers\PersonalAddressBook\Classes\Property();
										$oProperty->IdProperty = (int) $aItem['id_prop'];
										$oProperty->ScopeType = isset($aItem['scope_type']) ? (int) $aItem['scope_type'] :
											\RainLoop\Providers\PersonalAddressBook\Enumerations\ScopeType::DEFAULT_;
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
	 * @param string $sID
	 * @param bool $bIsStrID = false
	 *
	 * @return \RainLoop\Providers\PersonalAddressBook\Classes\Contact|null
	 */
	public function GetContactByID($sEmail, $mID, $bIsStrID = false)
	{
		$this->Sync();

		$mID = \trim($mID);

		$iUserID = $this->getUserId($sEmail);

		$sSql = 'SELECT * FROM rainloop_pab_contacts '.
			'WHERE ('.
			'id_user = :id_user'.
			($this->bConsiderShare ? ' OR scope_type = :scope_type_share_all' : '').
			')'
		;

		$aParams = array(
			':id_user' => array($iUserID, \PDO::PARAM_INT)
		);

		if ($this->bConsiderShare)
		{
			$aParams[':scope_type_share_all'] = array(\RainLoop\Providers\PersonalAddressBook\Enumerations\ScopeType::SHARE_ALL, \PDO::PARAM_INT);
		}

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
						$oContact = new \RainLoop\Providers\PersonalAddressBook\Classes\Contact();

						$oContact->IdContact = (string) $iIdContact;
						$oContact->IdContactStr = isset($aItem['id_contact_str']) ? (string) $aItem['id_contact_str'] : '';
						$oContact->Display = isset($aItem['display']) ? (string) $aItem['display'] : '';
						$oContact->ScopeType = isset($aItem['scope_type']) ? (int) $aItem['scope_type'] :
							\RainLoop\Providers\PersonalAddressBook\Enumerations\ScopeType::DEFAULT_;
						$oContact->Changed = isset($aItem['changed']) ? (int) $aItem['changed'] : 0;
						$oContact->ReadOnly = $iUserID !== (isset($aItem['id_user']) ? (int) $aItem['id_user'] : 0);
						
						$oContact->CardDavData = empty($aItem['carddav_data']) ? '' : (string) $aItem['carddav_data'];
						$oContact->CardDavHash = empty($aItem['carddav_hash']) ? \md5($oContact->CardDavData) : (string) $aItem['carddav_hash'];
						$oContact->CardDavSize = empty($aItem['carddav_size']) ? \strlen($oContact->CardDavData) : (int) $aItem['carddav_size'];
					}
				}
			}

			unset($aFetch);

			if (0 < $iIdContact && $oContact)
			{
				$oStmt->closeCursor();

				$sSql = 'SELECT * FROM rainloop_pab_properties WHERE id_contact = '.$iIdContact;
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
									$oProperty = new \RainLoop\Providers\PersonalAddressBook\Classes\Property();
									$oProperty->IdProperty = (int) $aItem['id_prop'];
									$oProperty->ScopeType = isset($aItem['scope_type']) ? (int) $aItem['scope_type'] :
										\RainLoop\Providers\PersonalAddressBook\Enumerations\ScopeType::DEFAULT_;
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

		$sSql = 'SELECT id_contact, id_prop, prop_type, prop_value FROM rainloop_pab_properties '.
			'WHERE ('.
			'id_user = :id_user'.
			($this->bConsiderShare ? ' OR scope_type = :scope_type_share_all' : '').
			') AND prop_type IN ('.$sTypes.') AND prop_value LIKE :search ESCAPE \'=\'';
		
		$aParams = array(
			':id_user' => array($iUserID, \PDO::PARAM_INT),
			':limit' => array($iLimit, \PDO::PARAM_INT),
			':search' => array($this->specialConvertSearchValue($sSearch, '='), \PDO::PARAM_STR)
		);

		if ($this->bConsiderShare)
		{
			$aParams[':scope_type_share_all'] = array(\RainLoop\Providers\PersonalAddressBook\Enumerations\ScopeType::SHARE_ALL, \PDO::PARAM_INT);
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

				$sSql = 'SELECT id_prop, id_contact, prop_type, prop_value FROM rainloop_pab_properties '.
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

//						$this->writeLog($aNames);
//						$this->writeLog($aEmails);

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
			$oContact = new \RainLoop\Providers\PersonalAddressBook\Classes\Contact();
			foreach ($aEmailsToCreate as $oEmail)
			{
				$oContact->ScopeType = \RainLoop\Providers\PersonalAddressBook\Enumerations\ScopeType::DEFAULT_;

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
						$oPropName = new \RainLoop\Providers\PersonalAddressBook\Classes\Property();
						$oPropName->ScopeType = $oContact->ScopeType;
						$oPropName->Type = \RainLoop\Providers\PersonalAddressBook\Enumerations\PropertyType::FIRST_NAME;
						$oPropName->Value = \trim($sFirst);

						$oContact->Properties[] = $oPropName;
					}
					
					if (0 < \strlen($sLast))
					{
						$oPropName = new \RainLoop\Providers\PersonalAddressBook\Classes\Property();
						$oPropName->ScopeType = $oContact->ScopeType;
						$oPropName->Type = \RainLoop\Providers\PersonalAddressBook\Enumerations\PropertyType::LAST_NAME;
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
		$sResult = '';
		try
		{
			$this->Sync();
			if (0 >= $this->getVersion($this->sDsnType.'-pab-version'))
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
		$sInitial = '';
		$aResult = array();
		
		switch ($sDbType)
		{
			case 'mysql':
				$sInitial = <<<MYSQLINITIAL
CREATE TABLE IF NOT EXISTS rainloop_pab_contacts (

	id_contact		bigint UNSIGNED NOT NULL AUTO_INCREMENT,
	id_user			int UNSIGNED NOT NULL,
	scope_type		tinyint UNSIGNED NOT NULL DEFAULT 0,
	display_name	varchar(255) NOT NULL DEFAULT '',
	display_email	varchar(255) NOT NULL DEFAULT '',
	display			varchar(255) NOT NULL DEFAULT '',
	changed			int UNSIGNED NOT NULL DEFAULT 0,

	PRIMARY KEY(id_contact),
	INDEX id_user_scope_type_rainloop_pab_contacts_index (id_user, scope_type)

)/*!40000 ENGINE=INNODB *//*!40101 CHARACTER SET utf8 COLLATE utf8_general_ci */;

CREATE TABLE IF NOT EXISTS rainloop_pab_properties (

	id_prop			bigint UNSIGNED NOT NULL AUTO_INCREMENT,
	id_contact		bigint UNSIGNED NOT NULL,
	id_user			int UNSIGNED NOT NULL,
	scope_type		tinyint UNSIGNED NOT NULL DEFAULT 0,
	prop_type		tinyint UNSIGNED NOT NULL,
	prop_type_custom	varchar(50) /*!40101 CHARACTER SET ascii COLLATE ascii_general_ci */ NOT NULL DEFAULT '',
	prop_value			varchar(255) NOT NULL DEFAULT '',
	prop_value_custom	varchar(255) NOT NULL DEFAULT '',
	prop_frec			int UNSIGNED NOT NULL DEFAULT 0,

	PRIMARY KEY(id_prop),
	INDEX id_user_rainloop_pab_properties_index (id_user),
	INDEX id_user_id_contact_scope_type_rainloop_pab_properties_index (id_user, id_contact, scope_type)

)/*!40000 ENGINE=INNODB *//*!40101 CHARACTER SET utf8 COLLATE utf8_general_ci */;

CREATE TABLE IF NOT EXISTS rainloop_pab_tags (

	id_tag		int UNSIGNED NOT NULL AUTO_INCREMENT,
	id_user		int UNSIGNED NOT NULL,
	tag_name	varchar(255) NOT NULL,

	PRIMARY KEY(id_tag),
	INDEX id_user_rainloop_pab_tags_index (id_user),
	INDEX id_user_name_rainloop_pab_tags_index (id_user, tag_name)

)/*!40000 ENGINE=INNODB *//*!40101 CHARACTER SET utf8 COLLATE utf8_general_ci */;

CREATE TABLE IF NOT EXISTS rainloop_pab_tags_contacts (

	id_tag		int UNSIGNED NOT NULL,
	id_contact	bigint UNSIGNED NOT NULL,

	INDEX id_tag_rainloop_pab_tags_contacts_index (id_tag),
	INDEX id_contact_rainloop_pab_tags_contacts_index (id_contact)

)/*!40000 ENGINE=INNODB */;
MYSQLINITIAL;
				break;

			case 'pgsql':
				$sInitial = <<<POSTGRESINITIAL
CREATE SEQUENCE id_contact START WITH 1 INCREMENT BY 1 NO MAXVALUE NO MINVALUE CACHE 1;

CREATE TABLE rainloop_pab_contacts (
	id_contact		integer DEFAULT nextval('id_contact'::text) PRIMARY KEY,
	id_user			integer NOT NULL,
	scope_type		integer NOT NULL DEFAULT 0,
	display_name	varchar(128) NOT NULL DEFAULT '',
	display_email	varchar(128) NOT NULL DEFAULT '',
	display			varchar(128) NOT NULL DEFAULT '',
	changed			integer NOT NULL default 0
);

CREATE INDEX id_user_scope_type_rainloop_pab_contacts_index ON rainloop_pab_contacts (id_user, scope_type);

CREATE SEQUENCE id_prop START WITH 1 INCREMENT BY 1 NO MAXVALUE NO MINVALUE CACHE 1;

CREATE TABLE rainloop_pab_properties (
	id_prop			integer DEFAULT nextval('id_prop'::text) PRIMARY KEY,
	id_contact		integer NOT NULL,
	id_user			integer NOT NULL,
	scope_type		integer NOT NULL DEFAULT 0,
	prop_type		integer NOT NULL,
	prop_type_custom	varchar(50) NOT NULL DEFAULT '',
	prop_value			varchar(128) NOT NULL DEFAULT '',
	prop_value_custom	varchar(128) NOT NULL DEFAULT '',
	prop_frec			integer NOT NULL default 0
);

CREATE INDEX id_user_rainloop_pab_properties_index ON rainloop_pab_properties (id_user);
CREATE INDEX id_user_id_contact_scope_type_rainloop_pab_properties_index ON rainloop_pab_properties (id_user, id_contact, scope_type);

CREATE SEQUENCE id_tag START WITH 1 INCREMENT BY 1 NO MAXVALUE NO MINVALUE CACHE 1;

CREATE TABLE rainloop_pab_tags (
	id_tag		integer DEFAULT nextval('id_tag'::text) PRIMARY KEY,
	id_user		integer NOT NULL,
	tag_name	varchar(128) NOT NULL
);

CREATE INDEX id_user_rainloop_pab_tags_index ON rainloop_pab_tags (id_user);
CREATE INDEX id_user_name_rainloop_pab_tags_index ON rainloop_pab_tags (id_user, tag_name);

CREATE TABLE rainloop_pab_tags_contacts (
	id_tag		integer NOT NULL,
	id_contact	integer NOT NULL
);

CREATE INDEX id_tag_rainloop_pab_tags_index ON rainloop_pab_tags_contacts (id_tag);
CREATE INDEX id_contact_rainloop_pab_tags_index ON rainloop_pab_tags_contacts (id_contact);
POSTGRESINITIAL;
				break;

			case 'sqlite':
				$sInitial = <<<SQLITEINITIAL
CREATE TABLE rainloop_pab_contacts (
	id_contact		integer NOT NULL PRIMARY KEY,
	id_user			integer NOT NULL,
	scope_type		integer NOT NULL DEFAULT 0,
	display_name	text NOT NULL DEFAULT '',
	display_email	text NOT NULL DEFAULT '',
	display			text NOT NULL DEFAULT '',
	changed			integer NOT NULL DEFAULT 0
);

CREATE INDEX id_user_scope_type_rainloop_pab_contacts_index ON rainloop_pab_contacts (id_user, scope_type);

CREATE TABLE rainloop_pab_properties (
	id_prop			integer NOT NULL PRIMARY KEY,
	id_contact		integer NOT NULL,
	id_user			integer NOT NULL,
	scope_type		integer NOT NULL DEFAULT 0,
	prop_type		integer NOT NULL,
	prop_type_custom	text NOT NULL DEFAULT '',
	prop_value			text NOT NULL DEFAULT '',
	prop_value_custom	text NOT NULL DEFAULT '',
	prop_frec			integer NOT NULL DEFAULT 0
);

CREATE INDEX id_user_rainloop_pab_properties_index ON rainloop_pab_properties (id_user);
CREATE INDEX id_user_id_contact_scope_type_rainloop_pab_properties_index ON rainloop_pab_properties (id_user, id_contact, scope_type);

CREATE TABLE rainloop_pab_tags (
	id_tag		integer NOT NULL PRIMARY KEY,
	id_user		integer NOT NULL,
	tag_name	text NOT NULL
);

CREATE INDEX id_user_rainloop_pab_tags_index ON rainloop_pab_tags (id_user);
CREATE INDEX id_user_name_rainloop_pab_tags_index ON rainloop_pab_tags (id_user, tag_name);

CREATE TABLE rainloop_pab_tags_contacts (
	id_tag		integer NOT NULL,
	id_contact	integer NOT NULL
);

CREATE INDEX id_tag_rainloop_pab_tags_index ON rainloop_pab_tags_contacts (id_tag);
CREATE INDEX id_contact_rainloop_pab_tags_index ON rainloop_pab_tags_contacts (id_contact);

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
				return $this->dataBaseUpgrade($this->sDsnType.'-pab-version', array(
					1 => $this->getInitialTablesArray($this->sDsnType),
					2 => array(
'ALTER TABLE rainloop_pab_contacts ADD id_contact_str varchar(128) NOT NULL DEFAULT \'\' AFTER id_contact;',
'ALTER TABLE rainloop_pab_contacts ADD carddav_data MEDIUMTEXT;',
'ALTER TABLE rainloop_pab_contacts ADD carddav_hash varchar(128) NOT NULL DEFAULT \'\';',
'ALTER TABLE rainloop_pab_contacts ADD carddav_size int UNSIGNED NOT NULL DEFAULT 0;',
'CREATE TABLE IF NOT EXISTS rainloop_pab_users (
	id_user		int UNSIGNED	NOT NULL,
	email		varchar(128)	NOT NULL,
	pass_hash	varchar(128)	NOT NULL
)/*!40000 ENGINE=INNODB */;'
					)
				));
			case 'pgsql':
				return $this->dataBaseUpgrade($this->sDsnType.'-pab-version', array(
					1 => $this->getInitialTablesArray($this->sDsnType),
					2 => array(
'ALTER TABLE rainloop_pab_contacts ADD id_contact_str varchar(128) NOT NULL DEFAULT \'\';',
'ALTER TABLE rainloop_pab_contacts ADD carddav_data TEXT;',
'ALTER TABLE rainloop_pab_contacts ADD carddav_hash varchar(128) NOT NULL DEFAULT \'\';',
'ALTER TABLE rainloop_pab_contacts ADD carddav_size integer NOT NULL DEFAULT 0;',
'CREATE TABLE rainloop_pab_users (
	id_user		integer			NOT NULL,
	email		varchar(128)	NOT NULL,
	pass_hash	varchar(128)	NOT NULL
);'
					)
				));
			case 'sqlite':
				return $this->dataBaseUpgrade($this->sDsnType.'-pab-version', array(
					1 => $this->getInitialTablesArray($this->sDsnType),
					2 => array(
'ALTER TABLE rainloop_pab_contacts ADD id_contact_str text NOT NULL DEFAULT \'\';',
'ALTER TABLE rainloop_pab_contacts ADD carddav_data text;',
'ALTER TABLE rainloop_pab_contacts ADD carddav_hash text NOT NULL DEFAULT \'\';',
'ALTER TABLE rainloop_pab_contacts ADD carddav_size integer NOT NULL DEFAULT 0;',
'CREATE TABLE rainloop_pab_users (
	id_user		integer		NOT NULL,
	email		text		NOT NULL,
	pass_hash	text		NOT NULL
);'
					)
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