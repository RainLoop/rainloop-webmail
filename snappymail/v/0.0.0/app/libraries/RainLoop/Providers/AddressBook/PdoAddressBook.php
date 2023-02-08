<?php

namespace RainLoop\Providers\AddressBook;

use
	Sabre\VObject\Component\VCard,
	RainLoop\Providers\AddressBook\Classes\Contact,
	RainLoop\Providers\AddressBook\Enumerations\PropertyType
;

class PdoAddressBook
	extends \RainLoop\Common\PdoAbstract
	implements AddressBookInterface
{
	use CardDAV;

	private $iUserID = 0;

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

	private static $aSearchInFields = [
		PropertyType::EMAIl,
		PropertyType::FIRST_NAME,
		PropertyType::LAST_NAME,
		PropertyType::NICK_NAME
	];

	public function __construct()
	{
		$oConfig = \RainLoop\Api::Config();
		$sDsnType = static::validPdoType($oConfig->Get('contacts', 'type', 'sqlite'));
		if ('sqlite' === $sDsnType) {
			$sUser = $sPassword = '';
			$sDsn = 'sqlite:' . APP_PRIVATE_DATA . 'AddressBook.sqlite';
/*
			// TODO: use local db?
			$homedir = \RainLoop\Api::Actions()->StorageProvider()->GenerateFilePath(
				$oAccount,
				\RainLoop\Providers\Storage\Enumerations\StorageType::ROOT
			);
			$sDsn = 'sqlite:' . $homedir . '/AddressBook.sqlite';
*/
		} else {
			$sDsn = \trim($oConfig->Get('contacts', 'pdo_dsn', ''));
			$sUser = \trim($oConfig->Get('contacts', 'pdo_user', ''));
			$sPassword = (string)$oConfig->Get('contacts', 'pdo_password', '');
			$sDsn = $sDsnType . ':' . \preg_replace('/^[a-z]+:/', '', $sDsn);
		}

		$this->sDsn = $sDsn;
		$this->sUser = $sUser;
		$this->sPassword = $sPassword;
		$this->sDsnType = $sDsnType;

		$this->bExplain = false; // debug
	}

	public static function validPdoType(string $sType): string
	{
		$sType = \trim($sType);
		return \in_array($sType, static::getAvailableDrivers()) ? $sType : 'sqlite';
	}

	public function IsSupported() : bool
	{
		$aDrivers = static::getAvailableDrivers();
		return \is_array($aDrivers) && \in_array($this->sDsnType, $aDrivers);
	}

	public function SetEmail(string $sEmail) : bool
	{
		$this->iUserID = $this->getUserId($sEmail);
		return 0 < $this->iUserID;
	}

	private function flushDeletedContacts() : bool
	{
		return !!$this->prepareAndExecute('DELETE FROM rainloop_ab_contacts WHERE id_user = :id_user AND deleted = 1', array(
			':id_user' => array($this->iUserID, \PDO::PARAM_INT)
		));
	}

	private function prepareDatabaseSyncData() : array
	{
		$aResult = array();
		$oStmt = $this->prepareAndExecute('SELECT id_contact, id_contact_str, changed, deleted, etag FROM rainloop_ab_contacts WHERE id_user = :id_user', array(
			':id_user' => array($this->iUserID, \PDO::PARAM_INT)
		));

		if ($oStmt) {
			$aFetch = $oStmt->fetchAll(\PDO::FETCH_ASSOC);
			if (\is_array($aFetch) && \count($aFetch)) {
				foreach ($aFetch as $aItem) {
					if ($aItem && isset($aItem['id_contact'], $aItem['id_contact_str'], $aItem['changed'], $aItem['deleted'], $aItem['etag']) &&
						!empty($aItem['id_contact_str'])) {
						$sKeyID = $aItem['id_contact_str'];

						$aResult[$sKeyID] = array(
							'deleted' => !empty($aItem['deleted']),
							'id_contact' => $aItem['id_contact'],
							'uid' => $sKeyID,
							'etag' => $aItem['etag'],
							'changed' => (int) $aItem['changed']
						);
					}
				}
			}
		}

		return $aResult;
	}

	public function Sync() : bool
	{
		if (1 > $this->iUserID) {
			\SnappyMail\Log::warning('PdoAddressBook', 'Sync() invalid $iUserID');
			return false;
		}

		$oClient = $this->getDavClient();
		if (!$oClient) {
			\SnappyMail\Log::warning('PdoAddressBook', 'Sync() invalid DavClient');
			return false;
		}

		$sPath = $oClient->__UrlPath__;

		$time = \microtime(true);
		$aRemoteSyncData = $this->prepareDavSyncData($oClient, $sPath);
		if (false === $aRemoteSyncData) {
			\SnappyMail\Log::info('PdoAddressBook', 'Sync() no data to sync');
			return false;
		}
		$time = \microtime(true) - $time;
		\SnappyMail\HTTP\Stream::JSON(['messsage'=>"Received ".\count($aRemoteSyncData)." remote contacts in {$time} seconds"]);
		\SnappyMail\Log::info('PdoAddressBook', \count($aRemoteSyncData) . ' remote contacts');

		$aLocalSyncData = $this->prepareDatabaseSyncData();
		\SnappyMail\Log::info('PdoAddressBook', \count($aLocalSyncData) . ' local contacts');

//		$this->oLogger->WriteDump($aRemoteSyncData);
//		$this->oLogger->WriteDump($aLocalSyncData);

		$bReadWrite = $this->isDAVReadWrite();

		// Delete remote when Mode = read + write
		if ($bReadWrite) {
			\SnappyMail\Log::info('PdoAddressBook', 'Sync() is import and export');
			$iCount = 0;
			foreach ($aLocalSyncData as $sKey => $aData) {
				if ($aData['deleted']) {
					++$iCount;
					unset($aLocalSyncData[$sKey]);
					if (isset($aRemoteSyncData[$sKey], $aRemoteSyncData[$sKey]['vcf'])) {
						\SnappyMail\HTTP\Stream::JSON(['messsage'=>"Delete remote {$sKey}"]);
						$this->davClientRequest($oClient, 'DELETE', $sPath.$aRemoteSyncData[$sKey]['vcf']);
					}
				}
			}
			if ($iCount) {
				\SnappyMail\Log::info('PdoAddressBook', $iCount . ' remote contacts removed');
			}
		} else {
			\SnappyMail\Log::info('PdoAddressBook', 'Sync() is import only');
		}

		// Delete local
		$aIdsForDeletion = array();
		foreach ($aLocalSyncData as $sKey => $aData) {
			if (!empty($aData['etag']) && !isset($aRemoteSyncData[$sKey])) {
				$aIdsForDeletion[] = $aData['id_contact'];
			}
		}
		if (\count($aIdsForDeletion)) {
			\SnappyMail\HTTP\Stream::JSON(['messsage'=>'Delete local ' . \implode(', ', $aIdsForDeletion)]);
			$this->DeleteContacts($aIdsForDeletion);
			unset($aIdsForDeletion);
			\SnappyMail\Log::info('PdoAddressBook', \count($aIdsForDeletion) . ' local contacts removed');
		}

		$this->flushDeletedContacts();

		// local is new or newer
		if ($bReadWrite) {
			foreach ($aLocalSyncData as $sKey => $aData) {
				if ((empty($aData['etag']) && !isset($aRemoteSyncData[$sKey])) // new
				 // newer
				 || (!empty($aData['etag']) && isset($aRemoteSyncData[$sKey]) &&
						$aRemoteSyncData[$sKey]['etag'] !== $aData['etag'] &&
						$aRemoteSyncData[$sKey]['changed'] < $aData['changed']
					)
				) {
					\SnappyMail\HTTP\Stream::JSON(['messsage'=>"Update remote {$sKey}"]);
					$mID = $aData['id_contact'];
					$oContact = $this->GetContactByID($mID);
					if ($oContact) {
						$sRemoteID = isset($aRemoteSyncData[$sKey]['vcf']) && !empty($aData['etag'])
							? $aRemoteSyncData[$sKey]['vcf'] : '';
						\SnappyMail\Log::info('PdoAddressBook', "Update contact {$sKey} in DAV");
						$oResponse = $this->davClientRequest($oClient, 'PUT',
							$sPath . ($sRemoteID ?: $oContact->IdContactStr.'.vcf'),
							$oContact->vCard->serialize() . "\r\n\r\n");
						if ($oResponse) {
							$sEtag = \trim(\trim($oResponse->getHeader('etag')), '"\'');
							$sDate = \trim($oResponse->getHeader('date'));
							if (!empty($sEtag)) {
								$iChanged = empty($sDate) ? \time() : \MailSo\Base\DateTimeHelper::ParseRFC2822DateString($sDate);
								$this->prepareAndExecute('UPDATE rainloop_ab_contacts SET changed = :changed, etag = :etag '.
									'WHERE id_user = :id_user AND id_contact = :id_contact', array(
										':id_user' => array($this->iUserID, \PDO::PARAM_INT),
										':id_contact' => array($mID, \PDO::PARAM_INT),
										':changed' => array($iChanged, \PDO::PARAM_INT),
										':etag' => array($sEtag, \PDO::PARAM_STR)
									)
								);
							}
						} else {
							\SnappyMail\Log::warning('PdoAddressBook', "Update/create remote failed");
						}
					} else {
						\SnappyMail\Log::warning('PdoAddressBook', "Local contact {$sKey} not found");
					}
					unset($oContact);
				}
			}
		}

		// remote is new or newer
		foreach ($aRemoteSyncData as $sKey => $aData) {
			if (!isset($aLocalSyncData[$sKey]) // new
			 // newer
			 || ($aLocalSyncData[$sKey]['etag'] !== $aData['etag'] && $aLocalSyncData[$sKey]['changed'] < $aData['changed'])
			) {
				\SnappyMail\HTTP\Stream::JSON(['messsage'=>"Update local {$sKey}"]);

				$oVCard = null;

				$oResponse = $this->davClientRequest($oClient, 'GET', $sPath.$aData['vcf']);
				if ($oResponse) {
					$sBody = \trim($oResponse->body);

					// Remove UTF-8 BOM
					if ("\xef\xbb\xbf" === \substr($sBody, 0, 3)) {
						$sBody = \substr($sBody, 3);
					}

					if (!empty($sBody)) {
						try {
							$oVCard = \Sabre\VObject\Reader::read($sBody);
						} catch (\Throwable $oExc) {
							if ($this->oLogger) {
								$this->oLogger->WriteException($oExc);
								$this->oLogger->WriteDump($sBody);
							}
						}
					}
				}

				if ($oVCard instanceof VCard) {
					$oVCard->UID = $aData['uid'];

					$oContact = empty($aLocalSyncData[$sKey]['id_contact'])
						 ? null
						 : $this->GetContactByID($aLocalSyncData[$sKey]['id_contact']);
					if ($oContact) {
						\SnappyMail\Log::info('PdoAddressBook', "Update local contact {$sKey}");
					} else {
						\SnappyMail\Log::info('PdoAddressBook', "Create local contact {$sKey}");
						$oContact = new Contact();
					}

					$oContact->setVCard($oVCard);

					$sEtag = \trim($oResponse->getHeader('etag'), " \n\r\t\v\x00\"'");
					if (!empty($sEtag)) {
						$oContact->Etag = $sEtag;
					}

					$this->ContactSave($oContact);
					unset($oContact);
				} else {
					\SnappyMail\Log::error('PdoAddressBook', "Import remote contact {$sKey} failed");
				}
			}
		}

		return true;
	}

	public function Export(string $sType = 'vcf') : bool
	{
		if (1 > $this->iUserID) {
			return false;
		}

		$rCsv = 'csv' === $sType ? \fopen('php://output', 'w') : null;
		$bCsvHeader = true;

		$aDatabaseSyncData = $this->prepareDatabaseSyncData();
		if (\count($aDatabaseSyncData)) {
			foreach ($aDatabaseSyncData as $mData) {
				if ($mData && isset($mData['id_contact'], $mData['deleted']) && !$mData['deleted']) {
					$oContact = $this->GetContactByID($mData['id_contact']);
					if ($oContact) {
						if ($rCsv) {
							Utils::VCardToCsv($rCsv, $oContact, $bCsvHeader);
							$bCsvHeader = false;
						} else {
							echo $oContact->vCard->serialize();
						}
					}
				}
			}
		}

		return true;
	}

	public function ContactSave(Contact $oContact) : bool
	{
		if (1 > $this->iUserID) {
			return false;
		}

		$iIdContact = \strlen($oContact->id) && \is_numeric($oContact->id) ? (int) $oContact->id : 0;

		$bUpdate = 0 < $iIdContact;

		$oContact->Changed = \time();
//		$oContact->vCard->REV = \gmdate('Ymd\\THis\\Z', $oContact->Changed);
//		$oContact->REV = \time();

		try {
			$sFullName = (string) $oContact->vCard->FN;

			$aFreq = array();
			if ($bUpdate) {
				$aFreq = $this->getContactFreq($this->iUserID, $iIdContact);

				$this->prepareAndExecute('UPDATE rainloop_ab_contacts
					SET id_contact_str = :id_contact_str, display = :display, changed = :changed, etag = :etag
					WHERE id_user = :id_user AND id_contact = :id_contact',
					array(
						':id_user' => array($this->iUserID, \PDO::PARAM_INT),
						':id_contact' => array($iIdContact, \PDO::PARAM_INT),
						':id_contact_str' => array($oContact->IdContactStr, \PDO::PARAM_STR),
						':display' => array($sFullName, \PDO::PARAM_STR),
						':changed' => array($oContact->Changed, \PDO::PARAM_INT),
						':etag' => array($oContact->Etag, \PDO::PARAM_STR)
					)
				);

				// clear previous props
				$this->prepareAndExecute(
					'DELETE FROM rainloop_ab_properties WHERE id_user = :id_user AND id_contact = :id_contact',
					array(
						':id_user' => array($this->iUserID, \PDO::PARAM_INT),
						':id_contact' => array($iIdContact, \PDO::PARAM_INT)
					)
				);
			} else {
				$this->prepareAndExecute('INSERT INTO rainloop_ab_contacts
					( id_user,  id_contact_str,  display,  changed,  etag)
					VALUES
					(:id_user, :id_contact_str, :display, :changed, :etag)',
					array(
						':id_user' => array($this->iUserID, \PDO::PARAM_INT),
						':id_contact_str' => array($oContact->IdContactStr, \PDO::PARAM_STR),
						':display' => array($sFullName, \PDO::PARAM_STR),
						':changed' => array($oContact->Changed, \PDO::PARAM_INT),
						':etag' => array($oContact->Etag, \PDO::PARAM_STR)
					)
				);

				$sLast = $this->lastInsertId('rainloop_ab_contacts', 'id_contact');
				if (\is_numeric($sLast) && 0 < (int) $sLast) {
					$iIdContact = (int) $sLast;
					$oContact->id = (string) $iIdContact;
				}
			}

			if (0 < $iIdContact) {
				$aParams = array();
				foreach (Legacy::VCardToProperties($oContact->vCard) as /* @var $oProp Classes\Property */ $oProp) {
					$iFreq = $oProp->Frec;
					if (PropertyType::EMAIl === $oProp->Type && isset($aFreq[$oProp->Value])) {
						$iFreq = $aFreq[$oProp->Value];
					}
					$aParams[] = array(
						':id_contact' => array($iIdContact, \PDO::PARAM_INT),
						':id_user' => array($this->iUserID, \PDO::PARAM_INT),
						':prop_type' => array($oProp->Type, \PDO::PARAM_INT),
						':prop_type_str' => array($oProp->TypeStr, \PDO::PARAM_STR),
						':prop_value' => array($oProp->Value, \PDO::PARAM_STR),
						':prop_value_lower' => array(\mb_strtolower($oProp->Value, 'UTF-8'), \PDO::PARAM_STR),
						':prop_value_custom' => array('', \PDO::PARAM_STR),
						':prop_frec' => array($iFreq, \PDO::PARAM_INT),
					);
				}
				if ($aParams) {
					$this->prepareAndExecute('INSERT INTO rainloop_ab_properties '.
						'( id_contact,  id_user,  prop_type,  prop_type_str,  prop_value,  prop_value_lower, prop_value_custom,  prop_frec)'.
						' VALUES '.
						'(:id_contact, :id_user, :prop_type, :prop_type_str, :prop_value, :prop_value_lower, :prop_value_custom, :prop_frec)',
						$aParams,
						true
					);
				}
			}
		}
		catch (\Throwable $oException) {
			throw $oException;
		}

		return 0 < $iIdContact;
	}

	public function DeleteContacts(array $aContactIds) : bool
	{
		if (1 > $this->iUserID) {
			return false;
		}

		$aContactIds = \array_filter(\array_map('intval', $aContactIds));

		if (!\count($aContactIds)) {
			return false;
		}

		$sIDs = \implode(',', $aContactIds);
		$aParams = array(':id_user' => array($this->iUserID, \PDO::PARAM_INT));

		$this->prepareAndExecute('DELETE FROM rainloop_ab_properties WHERE id_user = :id_user AND id_contact IN ('.$sIDs.')', $aParams);

		$aParams = array(
			':id_user' => array($this->iUserID, \PDO::PARAM_INT),
			':changed' => array(\time(), \PDO::PARAM_INT)
		);

		$this->prepareAndExecute('UPDATE rainloop_ab_contacts SET deleted = 1, changed = :changed '.
			'WHERE id_user = :id_user AND id_contact IN ('.$sIDs.')', $aParams);

		return true;
	}

	public function DeleteAllContacts(string $sEmail) : bool
	{
		$iUserID = $this->getUserId($sEmail);

		$aParams = array(':id_user' => array($iUserID, \PDO::PARAM_INT));

		$this->prepareAndExecute('DELETE FROM rainloop_ab_properties WHERE id_user = :id_user', $aParams);
		$this->prepareAndExecute('DELETE FROM rainloop_ab_contacts WHERE id_user = :id_user', $aParams);

		return true;
	}

	protected function getContactsFromPDO(?\PDOStatement $oStmt) : array
	{
		if ($oStmt) {
			$aFetch = $oStmt->fetchAll(\PDO::FETCH_ASSOC);

			$aContacts = array();
			$aIdContacts = array();
			if (\is_array($aFetch) && \count($aFetch)) {
				foreach ($aFetch as $aItem) {
					$iIdContact = $aItem && isset($aItem['id_contact']) ? (int) $aItem['id_contact'] : 0;
					if (0 < $iIdContact) {
						$oContact = new Contact();
						$oContact->id = (string) $iIdContact;
						$oContact->IdContactStr = (string) $aItem['id_contact_str'];
//						$oContact->Display = (string) $aItem['display'];
						$oContact->Changed = (int) $aItem['changed'];
						$oContact->Etag = (int) $aItem['etag'];
						if (!empty($aItem['jcard'])) {
							$oContact->setVCard(
								\Sabre\VObject\Reader::readJson($aItem['jcard'])
							);
//							$oContact->vCard->FN = (string) $aItem['display'];
//							$oContact->vCard->REV = \gmdate('Ymd\\THis\\Z', $oContact->Changed);
						} else {
							$aIdContacts[] = $iIdContact;
						}
						$aContacts[$iIdContact] = $oContact;
					}
				}
			}

			unset($aFetch);

			// Build vCards using old RainLoop data (missing jCard)
			if (\count($aIdContacts)) {
				$oStmt->closeCursor();

				$oStmt = $this->prepareAndExecute('SELECT * FROM rainloop_ab_properties
				WHERE id_contact IN ('.\implode(',', $aIdContacts).')
				ORDER BY id_contact ASC');
				if ($oStmt) {
					$aFetch = $oStmt->fetchAll(\PDO::FETCH_ASSOC);
					if (\is_array($aFetch) && \count($aFetch)) {
						$aVCards = array();
						$sUid = $sFirstName = $sLastName = $sMiddleName = $sSuffix = $sPrefix = '';
						$iPrevId = 0;
						foreach ($aFetch as $aItem) {
							if ($aItem && isset($aItem['id_prop'], $aItem['id_contact'], $aItem['prop_type'], $aItem['prop_value'])) {
								$iId = (int) $aItem['id_contact'];
								if (0 < $iId) {
									if ($iPrevId != $iId) {
										if ($iPrevId) {
											$aVCards[$iPrevId]->UID = $sUid ?: \SnappyMail\UUID::generate();
											$aVCards[$iPrevId]->N = array($sLastName, $sFirstName, $sMiddleName, $sPrefix, $sSuffix);
										}
										$sUid = $sFirstName = $sLastName = $sMiddleName = $sSuffix = $sPrefix = '';
										$iPrevId = $iId;
									}
									if (isset($aVCards[$iId])) {
										$oVCard = $aVCards[$iId];
									} else {
										$oVCard = new VCard;
//										$oVCard = $oVCard->convert(VCard::VCARD40);
										$oVCard->VERSION = '4.0';
										$oVCard->PRODID = 'SnappyMail-'.APP_VERSION;
										$aVCards[$iId] = $oVCard;
									}
									$oVCard = $aVCards[$iId];
									$sPropValue = (string) $aItem['prop_value'];
									$aTypes = array();
									if (!empty($aItem['prop_type_str'])) {
										$aTypes = \explode(',', \preg_replace('/[\s]+/', '', $aItem['prop_type_str']));
									}
									switch ((int) $aItem['prop_type'])
									{
										case PropertyType::JCARD:
											break;

										case PropertyType::FULLNAME:
											$oVCard->FN = $sPropValue;
											break;
										case PropertyType::NICK_NAME:
											$oVCard->NICKNAME = $sPropValue;
											break;
										case PropertyType::NOTE:
											$oVCard->NOTE = $sPropValue;
											break;
										case PropertyType::UID:
											$sUid = $sPropValue;
											break;
										case PropertyType::FIRST_NAME:
											$sFirstName = $sPropValue;
											break;
										case PropertyType::LAST_NAME:
											$sLastName = $sPropValue;
											break;
										case PropertyType::MIDDLE_NAME:
											$sMiddleName = $sPropValue;
											break;
										case PropertyType::NAME_SUFFIX:
											$sSuffix = $sPropValue;
											break;
										case PropertyType::NAME_PREFIX:
											$sPrefix = $sPropValue;
											break;

										case PropertyType::EMAIl:
											$oVCard->add('EMAIL', $sPropValue, \is_array($aTypes) && \count($aTypes) ? array('TYPE' => $aTypes) : null);
											break;

										case PropertyType::WEB_PAGE:
											$oVCard->add('URL', $sPropValue, \is_array($aTypes) && \count($aTypes) ? array('TYPE' => $aTypes) : null);
											break;

										case PropertyType::PHONE:
											$oVCard->add('TEL', $sPropValue, \is_array($aTypes) && \count($aTypes) ? array('TYPE' => $aTypes) : null);
											break;
									}
								}
							}
						}
						if ($iPrevId) {
							$aVCards[$iPrevId]->UID = $sUid ?: \SnappyMail\UUID::generate();
							$aVCards[$iPrevId]->N = array($sLastName, $sFirstName, $sMiddleName, $sPrefix, $sSuffix);
						}

						foreach ($aVCards as $iId => $oVCard) {
							$oVCard->REV = \gmdate('Ymd\\THis\\Z', $aContacts[$iId]->Changed);
							$aContacts[$iId]->setVCard($oVCard);
						}
					}

					unset($aFetch);
				}
			}

			return \array_values($aContacts);
		}

		return [];
	}

	public function GetContacts(int $iOffset = 0, int $iLimit = 20, string $sSearch = '', int &$iResultCount = 0) : array
	{
		if (1 > $this->iUserID) {
			return [];
		}

		$aSearchIds = array();

		if (\strlen($sSearch)) {
			$sLowerSearch = $this->specialConvertSearchValueLower($sSearch, '=');

			$sSearchTypes = \implode(',', static::$aSearchInFields);
			// PropertyType::PHONE, PropertyType::WEB_PAGE

			$sSql = 'SELECT DISTINCT id_contact FROM rainloop_ab_properties '.
				'WHERE (id_user = :id_user) AND prop_type IN ('.$sSearchTypes.') AND ('.
				'prop_value LIKE :search ESCAPE \'=\''.
(\strlen($sLowerSearch) ? ' OR (prop_value_lower <> \'\' AND prop_value_lower LIKE :search_lower ESCAPE \'=\')' : '').
				')';

			$aParams = array(
				':id_user' => array($this->iUserID, \PDO::PARAM_INT),
				':search' => array($this->specialConvertSearchValue($sSearch, '='), \PDO::PARAM_STR)
			);

			if (\strlen($sLowerSearch)) {
				$aParams[':search_lower'] = array($sLowerSearch, \PDO::PARAM_STR);
			}

			$oStmt = $this->prepareAndExecute($sSql, $aParams, false, true);
			if ($oStmt) {
				while ($aItem = $oStmt->fetch(\PDO::FETCH_NUM)) {
					if (0 < $aItem[0]) {
						$aSearchIds[] = (int) $aItem[0];
					}
				}
				$iResultCount = \count($aSearchIds);
			}
		} else {
			$oStmt = $this->prepareAndExecute(
				'SELECT COUNT(*) FROM rainloop_ab_contacts WHERE id_user = :id_user',
				[':id_user' => array($this->iUserID, \PDO::PARAM_INT)]
			);
			if ($oStmt && $aItem = $oStmt->fetch(\PDO::FETCH_NUM)) {
				$iResultCount = (int) $aItem[0];
			}
		}

		if (0 < $iResultCount) {
			$sSql = 'SELECT
				c.id_contact,
				c.id_contact_str,
				c.display,
				c.changed,
				c.etag,
				p.prop_value as jcard
			FROM rainloop_ab_contacts AS c
			LEFT JOIN rainloop_ab_properties AS p ON (p.id_contact = c.id_contact AND p.prop_type = :prop_type)
			WHERE c.deleted = 0 AND c.id_user = :id_user';
			if (\count($aSearchIds)) {
				$sSql .= ' AND c.id_contact IN ('.\implode(',', $aSearchIds).')';
			}
			$sSql .= ' ORDER BY display ASC LIMIT :limit OFFSET :offset';

			$aParams = array(
				':id_user' => array($this->iUserID, \PDO::PARAM_INT),
				':prop_type' => array(PropertyType::JCARD, \PDO::PARAM_INT),
				':limit' => array($iLimit, \PDO::PARAM_INT),
				':offset' => array($iOffset, \PDO::PARAM_INT)
			);

			return $this->getContactsFromPDO(
				$this->prepareAndExecute($sSql, $aParams)
			);
		}

		return [];
	}

	/**
	 * @param mixed $mID
	 */
	public function GetContactByEmail(string $sEmail) : ?Contact
	{
		$sLowerSearch = $this->specialConvertSearchValueLower($sEmail);

		$sSql = 'SELECT
			DISTINCT id_contact
		FROM rainloop_ab_properties
		WHERE id_user = :id_user
		 AND prop_type = '.PropertyType::JCARD.'
		 AND ('.
			'prop_value LIKE :search ESCAPE \'=\''
				. (\strlen($sLowerSearch) ? ' OR (prop_value_lower <> \'\' AND prop_value_lower LIKE :search_lower ESCAPE \'=\')' : '').
			')';
		$aParams = array(
			':id_user' => array($this->iUserID, \PDO::PARAM_INT),
			':search' => array($this->specialConvertSearchValue($sEmail, '='), \PDO::PARAM_STR)
		);
		if (\strlen($sLowerSearch)) {
			$aParams[':search_lower'] = array($sLowerSearch, \PDO::PARAM_STR);
		}

		$oContact = null;
		$iIdContact = 0;

		$aContacts = $this->getContactsFromPDO(
			$this->prepareAndExecute($sSql, $aParams)
		);

		return $aContacts ? $aContacts[0] : null;
	}

	/**
	 * @param mixed $mID
	 */
	public function GetContactByID($mID, bool $bIsStrID = false) : ?Contact
	{
		$mID = \trim($mID);

		$sSql = 'SELECT
			c.id_contact,
			c.id_contact_str,
			c.display,
			c.changed,
			c.etag,
			p.prop_value as jcard
		FROM rainloop_ab_contacts AS c
		LEFT JOIN rainloop_ab_properties AS p ON (p.id_contact = c.id_contact AND p.prop_type = :prop_type)
		WHERE c.deleted = 0 AND c.id_user = :id_user';

		$aParams = array(
			':id_user' => array($this->iUserID, \PDO::PARAM_INT),
			':prop_type' => array(PropertyType::JCARD, \PDO::PARAM_INT)
		);

		if ($bIsStrID) {
			$sSql .= ' AND c.id_contact_str = :id_contact_str';
			$aParams[':id_contact_str'] = array($mID, \PDO::PARAM_STR);
		} else {
			$sSql .= ' AND c.id_contact = :id_contact';
			$aParams[':id_contact'] = array($mID, \PDO::PARAM_INT);
		}

		$sSql .= ' LIMIT 1';

		$oContact = null;
		$iIdContact = 0;

		$aContacts = $this->getContactsFromPDO(
			$this->prepareAndExecute($sSql, $aParams)
		);

		return $aContacts ? $aContacts[0] : null;
	}

	/**
	 * @throws \InvalidArgumentException
	 */
	public function GetSuggestions(string $sSearch, int $iLimit = 20) : array
	{
		if (1 > $this->iUserID) {
			return [];
		}

		$sSearch = \trim($sSearch);
		if (!\strlen($sSearch)) {
			throw new \InvalidArgumentException('Empty Search argument');
		}

		$sTypes = \implode(',', static::$aSearchInFields);

		$sLowerSearch = $this->specialConvertSearchValueLower($sSearch);

		$sSql = 'SELECT id_contact, id_prop, prop_type, prop_value FROM rainloop_ab_properties '.
			'WHERE (id_user = :id_user) AND prop_type IN ('.$sTypes.') AND ('.
			'prop_value LIKE :search ESCAPE \'=\''.
(\strlen($sLowerSearch) ? ' OR (prop_value_lower <> \'\' AND prop_value_lower LIKE :search_lower ESCAPE \'=\')' : '').
			')'
		;

		$aParams = array(
			':id_user' => array($this->iUserID, \PDO::PARAM_INT),
			':limit' => array($iLimit, \PDO::PARAM_INT),
			':search' => array($this->specialConvertSearchValue($sSearch, '='), \PDO::PARAM_STR)
		);

		if (\strlen($sLowerSearch)) {
			$aParams[':search_lower'] = array($sLowerSearch, \PDO::PARAM_STR);
		}

		$sSql .= ' ORDER BY prop_frec DESC';
		$sSql .= ' LIMIT :limit';

		$aResult = array();

		$oStmt = $this->prepareAndExecute($sSql, $aParams);
		if ($oStmt) {
			$aIdContacts = array();
			$aIdProps = array();
			$aContactAllAccess = array();

			$aFetch = $oStmt->fetchAll(\PDO::FETCH_ASSOC);
			if (\is_array($aFetch) && \count($aFetch)) {
				foreach ($aFetch as $aItem) {
					$iIdContact = $aItem && isset($aItem['id_contact']) ? (int) $aItem['id_contact'] : 0;
					$iIdProp = $aItem && isset($aItem['id_prop']) ? (int) $aItem['id_prop'] : 0;
					$iType = $aItem && isset($aItem['prop_type']) ? (int) $aItem['prop_type'] : 0;

					if (0 < $iIdContact && 0 < $iIdProp) {
						$aIdContacts[$iIdContact] = $iIdContact;
						$aIdProps[$iIdProp] = $iIdProp;

						if (\in_array($iType, array(PropertyType::LAST_NAME, PropertyType::FIRST_NAME, PropertyType::NICK_NAME))) {
							if (!isset($aContactAllAccess[$iIdContact])) {
								$aContactAllAccess[$iIdContact] = array();
							}

							$aContactAllAccess[$iIdContact][] = $iType;
						}
					}
				}
			}

			unset($aFetch);

			$aIdContacts = \array_values($aIdContacts);
			if (\count($aIdContacts)) {
				$oStmt->closeCursor();

				$sTypes = \implode(',', static::$aSearchInFields);

				$sSql = 'SELECT id_prop, id_contact, prop_type, prop_value FROM rainloop_ab_properties '.
					'WHERE prop_type IN ('.$sTypes.') AND id_contact IN ('.\implode(',', $aIdContacts).')';

				$oStmt = $this->prepareAndExecute($sSql);
				if ($oStmt) {
					$aFetch = $oStmt->fetchAll(\PDO::FETCH_ASSOC);
					if (\is_array($aFetch) && \count($aFetch)) {
						$aNames = array();
						$aEmails = array();

						foreach ($aFetch as $aItem) {
							if ($aItem && isset($aItem['id_prop'], $aItem['id_contact'], $aItem['prop_type'], $aItem['prop_value'])) {
								$iIdContact = (int) $aItem['id_contact'];
								$iIdProp = (int) $aItem['id_prop'];
								$iType = (int) $aItem['prop_type'];

								if (PropertyType::NICK_NAME === $iType) {
									$aNicks[$iIdContact] = $aItem['prop_value'];
								}
								else if (\in_array($iType, array(PropertyType::LAST_NAME, PropertyType::FIRST_NAME))) {
									if (!isset($aNames[$iIdContact])) {
										$aNames[$iIdContact] = array('', '');
									}

									$aNames[$iIdContact][PropertyType::FIRST_NAME === $iType ? 0 : 1] = $aItem['prop_value'];
								}
								else if ((isset($aIdProps[$iIdProp]) || isset($aContactAllAccess[$iIdContact])) &&
									PropertyType::EMAIl === $iType) {
									if (!isset($aEmails[$iIdContact])) {
										$aEmails[$iIdContact] = array();
									}

									$aEmails[$iIdContact][] = $aItem['prop_value'];
								}
							}
						}

						foreach ($aEmails as $iId => $aItems) {
							if (isset($aContactAllAccess[$iId])) {
								$bName = \in_array(PropertyType::FIRST_NAME, $aContactAllAccess[$iId]) || \in_array(PropertyType::LAST_NAME, $aContactAllAccess[$iId]);
								$bNick = \in_array(PropertyType::NICK_NAME, $aContactAllAccess[$iId]);

								$aNameItem = isset($aNames[$iId]) && \is_array($aNames[$iId]) ? $aNames[$iId] : array('', '');
								$sNameItem = \trim($aNameItem[0].' '.$aNameItem[1]);

								$sNickItem = isset($aNicks[$iId]) ? $aNicks[$iId] : '';

								foreach ($aItems as $sEmail) {
									if ($sEmail) {
										if ($bName) {
											$aResult[] = array($sEmail, $sNameItem);
										}
										else if ($bNick) {
											$aResult[] = array($sEmail, $sNickItem);
										}
										else {
											$aResult[] = array($sEmail, '');
										}
									}
								}
							}
							else {
								$aNameItem = isset($aNames[$iId]) && \is_array($aNames[$iId]) ? $aNames[$iId] : array('', '');
								$sNameItem = \trim($aNameItem[0].' '.$aNameItem[1]);
								if (0 === \strlen($sNameItem)) {
									$sNameItem = isset($aNicks[$iId]) ? $aNicks[$iId] : '';
								}

								foreach ($aItems as $sEmail) {
									$aResult[] = array($sEmail, $sNameItem);
								}
							}
						}
					}

					unset($aFetch);

					if ($iLimit < \count($aResult)) {
						$aResult = \array_slice($aResult, 0, $iLimit);
					}

					return $aResult;
				}
			}
		}

		return array();
	}

	public function IncFrec(array $aEmails, bool $bCreateAuto = true) : bool
	{
		if (1 > $this->iUserID) {
			return false;
		}

		$self = $this;
		$aEmailsObjects = \array_map(function ($mItem) {
			$oResult = null;
			try {
				$oResult = \MailSo\Mime\Email::Parse(\trim($mItem));
			}
			catch (\Throwable $oException) {
				unset($oException);
			}
			return $oResult;
		}, $aEmails);

		$aEmailsObjects = \array_filter($aEmailsObjects, function ($oItem) {
			return !!$oItem;
		});

		if (!\count($aEmailsObjects)) {
			throw new \InvalidArgumentException('Empty Emails argument');
		}

		$aExists = array();
		$aEmailsToCreate = array();
		$aEmailsToUpdate = array();

		if ($bCreateAuto) {
			$sSql = 'SELECT prop_value FROM rainloop_ab_properties WHERE id_user = :id_user AND prop_type = :prop_type';
			$oStmt = $this->prepareAndExecute($sSql, array(
				':id_user' => array($this->iUserID, \PDO::PARAM_INT),
				':prop_type' => array(PropertyType::EMAIl, \PDO::PARAM_INT)
			));

			if ($oStmt) {
				$aFetch = $oStmt->fetchAll(\PDO::FETCH_ASSOC);
				if (\is_array($aFetch) && \count($aFetch)) {
					foreach ($aFetch as $aItem) {
						if ($aItem && !empty($aItem['prop_value'])) {
							$aExists[] = \mb_strtolower(\trim($aItem['prop_value']));
						}
					}
				}
			}

			$aEmailsToCreate = \array_filter($aEmailsObjects, function ($oItem) use ($aExists, &$aEmailsToUpdate) {
				if ($oItem) {
					$sEmail = \trim($oItem->GetEmail(true));
					if (\strlen($sEmail)) {
						$aEmailsToUpdate[] = $sEmail;
						return !\in_array($sEmail, $aExists);
					}
				}
				return false;
			});
		} else {
			foreach ($aEmailsObjects as $oItem) {
				if ($oItem) {
					$sEmailUpdate = \trim($oItem->GetEmail(true));
					if (\strlen($sEmailUpdate)) {
						$aEmailsToUpdate[] = $sEmailUpdate;
					}
				}
			}
		}

		unset($aEmails, $aEmailsObjects);

		if (\count($aEmailsToCreate)) {
			foreach ($aEmailsToCreate as $oEmail) {
				$oVCard = new VCard;
				$bValid = false;
				if ('' !== \trim($oEmail->GetEmail())) {
					$oVCard->add('EMAIL', \trim($oEmail->GetEmail(true)));
					$bValid = true;
				}
				if ('' !== \trim($oEmail->GetDisplayName())) {
					$sFirst = $sLast = '';
					$sFullName = $oEmail->GetDisplayName();
					if (false !== \strpos($sFullName, ' ')) {
						$aNames = \explode(' ', $sFullName, 2);
						$sFirst = isset($aNames[0]) ? $aNames[0] : '';
						$sLast = isset($aNames[1]) ? $aNames[1] : '';
					} else {
						$sFirst = $sFullName;
					}
					if (\strlen($sFirst) || \strlen($sLast)) {
						$oVCard->N = array($sLast, $sFirst, '', '', '');
						$bValid = true;
					}
				}
				if ($bValid) {
					$oContact = new Contact();
					$oContact->setVCard($oVCard);
					$this->ContactSave($oContact);
				}
			}
		}

		$sSql = 'UPDATE rainloop_ab_properties SET prop_frec = prop_frec + 1 WHERE id_user = :id_user AND prop_type = :prop_type';

		$aEmailsQuoted = \array_map(function ($mItem) use ($self) {
			return $self->quoteValue($mItem);
		}, $aEmailsToUpdate);

		if (1 === \count($aEmailsQuoted)) {
			$sSql .= ' AND prop_value = '.$aEmailsQuoted[0];
		} else {
			$sSql .= ' AND prop_value IN ('.\implode(',', $aEmailsQuoted).')';
		}

		return !!$this->prepareAndExecute($sSql, array(
			':id_user' => array($this->iUserID, \PDO::PARAM_INT),
			':prop_type' => array(PropertyType::EMAIl, \PDO::PARAM_INT)
		));
	}

	public function Test() : string
	{
		$sResult = '';
		try {
			$this->SyncDatabase();
			if (0 >= $this->getVersion($this->sDsnType.'-ab-version')) {
				$sResult = 'Unknown database error';
			}
		}
		catch (\Throwable $oException) {
			$sResult = $oException->getMessage();
			if (!empty($sResult) && !\MailSo\Base\Utils::IsAscii($sResult) && !\MailSo\Base\Utils::IsUtf8($sResult)) {
				$sResult = \mb_convert_encoding($sResult, 'UTF-8', 'ISO-8859-1');
			}

			if (!\is_string($sResult) || empty($sResult)) {
				$sResult = 'Unknown database error';
			}
		}

		return $sResult;
	}

	private function getInitialTablesArray(string $sDbType) : array
	{
		switch ($sDbType) {
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
	prop_value        MEDIUMTEXT         NOT NULL,
	prop_value_custom MEDIUMTEXT         NOT NULL,
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
		if (\strlen($sInitial)) {
			$aList = \explode(';', \trim($sInitial));
			foreach ($aList as $sV) {
				$sV = \trim($sV);
				if (\strlen($sV)) {
					$aResult[] = $sV;
				}
			}
		}

		return $aResult;
	}

	private function SyncDatabase() : bool
	{
		static $mCache = null;
		if (null !== $mCache) {
			return $mCache;
		}

		$mCache = false;
		switch ($this->sDsnType) {
			case 'mysql':
				$mCache = $this->dataBaseUpgrade($this->sDsnType.'-ab-version', array(
					1 => $this->getInitialTablesArray($this->sDsnType),
					2 => array(
'ALTER TABLE rainloop_ab_properties ADD prop_value_lower MEDIUMTEXT NOT NULL AFTER prop_value_custom;'
					),
					3 => array(
'ALTER TABLE rainloop_ab_properties CHANGE prop_value prop_value MEDIUMTEXT NOT NULL;',
'ALTER TABLE rainloop_ab_properties CHANGE prop_value_custom prop_value_custom MEDIUMTEXT NOT NULL;',
'ALTER TABLE rainloop_ab_properties CHANGE prop_value_lower prop_value_lower MEDIUMTEXT NOT NULL;'
					),
					4 => array(
'ALTER TABLE rainloop_ab_properties CHANGE prop_value prop_value MEDIUMTEXT NOT NULL;',
'ALTER TABLE rainloop_ab_properties CHANGE prop_value_custom prop_value_custom MEDIUMTEXT NOT NULL;',
'ALTER TABLE rainloop_ab_properties CHANGE prop_value_lower prop_value_lower MEDIUMTEXT NOT NULL;'
					)
				));
				break;
			case 'pgsql':
				$mCache = $this->dataBaseUpgrade($this->sDsnType.'-ab-version', array(
					1 => $this->getInitialTablesArray($this->sDsnType),
					2 => array(
'ALTER TABLE rainloop_ab_properties ADD prop_value_lower text NOT NULL DEFAULT \'\';'
					),
					3 => array(),
					4 => array()
				));
				break;
			case 'sqlite':
				$mCache = $this->dataBaseUpgrade($this->sDsnType.'-ab-version', array(
					1 => $this->getInitialTablesArray($this->sDsnType),
					2 => array(
'ALTER TABLE rainloop_ab_properties ADD prop_value_lower text NOT NULL DEFAULT \'\';'
					),
					3 => array(),
					4 => array()
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
		if ($oStmt) {
			$aFetch = $oStmt->fetchAll(\PDO::FETCH_ASSOC);
			if (\is_array($aFetch)) {
				foreach ($aFetch as $aItem) {
					if ($aItem && !empty($aItem['prop_value']) && !empty($aItem['prop_frec'])) {
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
		return '%'.\str_replace(array($sEscapeSign, '_', '%'),
			array($sEscapeSign.$sEscapeSign, $sEscapeSign.'_', $sEscapeSign.'%'),
				(string) \mb_strtolower($sSearch)).'%';
	}

	protected function getPdoAccessData() : array
	{
		return array($this->sDsnType, $this->sDsn, $this->sUser, $this->sPassword);
	}

	protected function getUserId(string $sEmail, bool $bSkipInsert = false, bool $bCache = true) : int
	{
		static $aCache = array();

		$sEmail = \MailSo\Base\Utils::IdnToAscii(\trim($sEmail), true);
		if (empty($sEmail)) {
			throw new \InvalidArgumentException('Empty Email argument');
		}

		if ($bCache && isset($aCache[$sEmail])) {
			return $aCache[$sEmail];
		}

		$this->SyncDatabase();

		$oStmt = $this->prepareAndExecute('SELECT id_user FROM rainloop_users WHERE rl_email = :rl_email',
			array(
				':rl_email' => array($sEmail, \PDO::PARAM_STR)
			)
		);

		$mRow = $oStmt->fetch(\PDO::FETCH_ASSOC);
		if ($mRow && isset($mRow['id_user']) && \is_numeric($mRow['id_user'])) {
			$iResult = (int) $mRow['id_user'];
			if (0 >= $iResult) {
				throw new \Exception('id_user <= 0');
			}
			if ($bCache) {
				$aCache[$sEmail] = $iResult;
			}
			return $iResult;
		}

		if (!$bSkipInsert) {
			$oStmt->closeCursor();
			$oStmt = $this->prepareAndExecute('INSERT INTO rainloop_users (rl_email) VALUES (:rl_email)',
				array(':rl_email' => array($sEmail, \PDO::PARAM_STR))
			);
			return $this->getUserId($sEmail, true);
		}

		throw new \Exception('id_user = 0');
	}

}
