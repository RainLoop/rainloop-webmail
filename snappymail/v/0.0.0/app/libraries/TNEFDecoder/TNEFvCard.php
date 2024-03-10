<?php

namespace TNEFDecoder;

/**
  * SquirrelMail TNEF Decoder Plugin
  *
  * Copyright (c) 2010- Paul Lesniewski <paul@squirrelmail.org>
  * Copyright (c) 2003  Bernd Wiegmann <bernd@wib-software.de>
  * Copyright (c) 2002  Graham Norburys <gnorbury@bondcar.com>
  *
  * Licensed under the GNU GPL. For full terms see the file COPYING.
  *
  * @package plugins
  * @subpackage tnef_decoder
  *
  */

class TNEFvCard extends TNEFFileBase
{
	public string $type = 'text/x-vcard';

	public bool
		$surname_is_unicode = FALSE,
		$given_name_is_unicode = FALSE,
		$middle_name_is_unicode = FALSE,
		$nickname_is_unicode = FALSE,
		$company_is_unicode = FALSE;
	public string
		$surname,
		$given_name,
		$middle_name,
		$nickname,
		$company,
		$metafile;
	public array
		$homepages = [],
		$addresses = [],
		$emails = [],
		$telefones = [];

	private static
		$address_mapping = array (
			TNEF_MAPI_LOCALTY            => array ("Address", ADDRESS_CITY),
			TNEF_MAPI_COUNTRY            => array ("Address", ADDRESS_COUNTRY),
			TNEF_MAPI_POSTAL_CODE        => array ("Address", ADDRESS_ZIP),
			TNEF_MAPI_STATE_OR_PROVINCE  => array ("Address", ADDRESS_STATE),
			TNEF_MAPI_STREET_ADDRESS     => array ("Address", ADDRESS_STREET),
			TNEF_MAPI_POST_OFFICE_BOX    => array ("Address", ADDRESS_PO_BOX),
			TNEF_MAPI_HOME_ADDR_CITY     => array ("Home Address", ADDRESS_CITY),
			TNEF_MAPI_HOME_ADDR_COUNTRY  => array ("Home Address", ADDRESS_COUNTRY),
			TNEF_MAPI_HOME_ADDR_ZIP      => array ("Home Address", ADDRESS_ZIP),
			TNEF_MAPI_HOME_ADDR_STATE    => array ("Home Address", ADDRESS_STATE),
			TNEF_MAPI_HOME_ADDR_STREET   => array ("Home Address", ADDRESS_STREET),
			TNEF_MAPI_HOME_ADDR_PO_BOX   => array ("Home Address", ADDRESS_PO_BOX),
			TNEF_MAPI_OTHER_ADDR_CITY    => array ("Other Address", ADDRESS_CITY),
			TNEF_MAPI_OTHER_ADDR_COUNTRY => array ("Other Address", ADDRESS_COUNTRY),
			TNEF_MAPI_OTHER_ADDR_ZIP     => array ("Other Address", ADDRESS_ZIP),
			TNEF_MAPI_OTHER_ADDR_STATE   => array ("Other Address", ADDRESS_STATE),
			TNEF_MAPI_OTHER_ADDR_STREET  => array ("Other Address", ADDRESS_STREET),
			TNEF_MAPI_OTHER_ADDR_PO_BOX  => array ("Other Address", ADDRESS_PO_BOX),
		),
		$email_mapping = array (
			TNEF_MAPI_EMAIL1_DISPLAY     => array ("Email 1", EMAIL_DISPLAY),
			TNEF_MAPI_EMAIL1_TRANSPORT   => array ("Email 1", EMAIL_TRANSPORT),
			TNEF_MAPI_EMAIL1_EMAIL       => array ("Email 1", EMAIL_EMAIL),
			TNEF_MAPI_EMAIL1_EMAIL2      => array ("Email 1", EMAIL_EMAIL2),
			TNEF_MAPI_EMAIL2_DISPLAY     => array ("Email 2", EMAIL_DISPLAY),
			TNEF_MAPI_EMAIL2_TRANSPORT   => array ("Email 2", EMAIL_TRANSPORT),
			TNEF_MAPI_EMAIL2_EMAIL       => array ("Email 2", EMAIL_EMAIL),
			TNEF_MAPI_EMAIL2_EMAIL2      => array ("Email 2", EMAIL_EMAIL2),
			TNEF_MAPI_EMAIL3_DISPLAY     => array ("Email 3", EMAIL_DISPLAY),
			TNEF_MAPI_EMAIL3_TRANSPORT   => array ("Email 3", EMAIL_TRANSPORT),
			TNEF_MAPI_EMAIL3_EMAIL       => array ("Email 3", EMAIL_EMAIL),
			TNEF_MAPI_EMAIL3_EMAIL2      => array ("Email 3", EMAIL_EMAIL2),
		),
		$homepage_mapping = array (
			TNEF_MAPI_PERSONAL_HOME_PAGE => "Personal Homepage",
			TNEF_MAPI_BUSINESS_HOME_PAGE => "Business Homepage",
			TNEF_MAPI_OTHER_HOME_PAGE    => "Other Homepage",
		),
		$telefone_mapping = array (
			TNEF_MAPI_PRIMARY_TEL_NUMBER   => "Primary Telefone",
			TNEF_MAPI_HOME_TEL_NUMBER      => "Home Telefone",
			TNEF_MAPI_HOME2_TEL_NUMBER     => "Home2 Telefone",
			TNEF_MAPI_BUSINESS_TEL_NUMBER  => "Business Telefone",
			TNEF_MAPI_BUSINESS2_TEL_NUMBER => "Business2 Telefone",
			TNEF_MAPI_MOBILE_TEL_NUMBER    => "Mobile Telefone",
			TNEF_MAPI_RADIO_TEL_NUMBER     => "Radio Telefone",
			TNEF_MAPI_CAR_TEL_NUMBER       => "Car Telefone",
			TNEF_MAPI_OTHER_TEL_NUMBER     => "Other Telefone",
			TNEF_MAPI_PAGER_TEL_NUMBER     => "Pager Telefone",
			TNEF_MAPI_PRIMARY_FAX_NUMBER   => "Primary Fax",
			TNEF_MAPI_BUSINESS_FAX_NUMBER  => "Business Fax",
			TNEF_MAPI_HOME_FAX_NUMBER      => "Home Fax",
		);

	public function getSurname(): string
	{
		return $this->surname;
	}

	public function getGivenName(): string
	{
		return $this->given_name;
	}

	public function getMiddleName(): string
	{
		return $this->middle_name;
	}

	public function getNickname(): string
	{
		return $this->nickname;
	}

	public function getCompany(): string
	{
		return $this->company;
	}

	public function getAddresses(): array
	{
		return $this->addresses;
	}

	public function getMetafile()
	{
		return $this->metafile;
	}

	public function getTelefones(): array
	{
		return $this->telefones;
	}

	public function getHomepages(): array
	{
		return $this->homepages;
	}

	public function getEmails(): array
	{
		return $this->emails;
	}

	public function receiveTnefAttribute(int $attribute, string $value, int $length): void
	{
		switch ($attribute)
		{
			// code page
			//
			case TNEF_AOEMCODEPAGE:
				$this->code_page = (new TNEFBuffer($value))->geti16();
				break;
		}
	}

	public function receiveMapiAttribute(int $attr_type, int $attr_name, string $value, int $length)
	{
		switch ($attr_name)
		{
			case TNEF_MAPI_DISPLAY_NAME:
				$this->name = $value;
				$this->name_is_unicode = TNEF_MAPI_UNICODE_STRING === $attr_type;
				break;

			case TNEF_MAPI_SURNAME:
				$this->surname = $value;
				$this->surname_is_unicode = TNEF_MAPI_UNICODE_STRING === $attr_type;
				break;

			case TNEF_MAPI_GIVEN_NAME:
				$this->given_name = $value;
				$this->given_name_is_unicode = TNEF_MAPI_UNICODE_STRING === $attr_type;
				break;

			case TNEF_MAPI_MIDDLE_NAME:
				$this->middle_name = $value;
				$this->middle_name_is_unicode = TNEF_MAPI_UNICODE_STRING === $attr_type;
				break;

			case TNEF_MAPI_NICKNAME:
				$this->nickname = $value;
				$this->nickname_is_unicode = TNEF_MAPI_UNICODE_STRING === $attr_type;
				break;

			case TNEF_MAPI_COMPANY_NAME:
				$this->company = $value;
				$this->company_is_unicode = TNEF_MAPI_UNICODE_STRING === $attr_type;
				break;

			default:
				$this->evaluateTelefoneAttribute($attr_type, $attr_name, $value, $length)
				|| $this->evaluateEmailAttribute($attr_type, $attr_name, $value, $length)
				|| $this->evaluateAddressAttribute($attr_type, $attr_name, $value, $length)
				|| $this->evaluateHomepageAttribute($attr_type, $attr_name, $value, $length);
				break;
		}
	}

	private function evaluateTelefoneAttribute(int $attr_type, int $attr_name, string $value, int $length): bool
	{
		if ($length && \array_key_exists($attr_name, static::$telefone_mapping)) {
			$telefone_key = static::$telefone_mapping[$attr_name];
			$this->telefones[$telefone_key] = $value;
			$this->debug && tnef_log("Setting telefone '{$telefone_key}' to value '{$value}'");
			return true;
		}
		return false;
	}

	private function evaluateEmailAttribute(int $attr_type, int $attr_name, string $value, int $length): bool
	{
		if ($length && \array_key_exists($attr_name, static::$email_mapping)) {
			$email_key = static::$email_mapping[$attr_name];
			if (!\array_key_exists($email_key[0], $this->emails))
				$this->emails[$email_key[0]] = array(EMAIL_DISPLAY => "", EMAIL_TRANSPORT => "", EMAIL_EMAIL => "", EMAIL_EMAIL2 => "");
			$this->emails[$email_key[0]][$email_key[1]] = $value;
			return true;
		}
		return false;
	}

	private function evaluateAddressAttribute(int $attr_type, int $attr_name, string $value, int $length): bool
	{
		if ($length && \array_key_exists($attr_name, static::$address_mapping)) {
			$address_key = static::$address_mapping[$attr_name];
			if (!\array_key_exists($address_key[0], $this->addresses))
				$this->addresses[$address_key[0]] = array();
			$this->addresses[$address_key[0]][$address_key[1]] = $value;
			return true;
		}
		return false;
	}

	private function evaluateHomepageAttribute(int $attr_type, int $attr_name, string $value, int $length): bool
	{
		if ($length && \array_key_exists($attr_name, static::$homepage_mapping)) {
			$homepage_key = static::$homepage_mapping[$attr_name];
			$this->homepages[$homepage_key] = $value;
			$this->debug && tnef_log("Setting homepage '{$homepage_key}' to value '{$value}'");
			return true;
		}
		return false;
	}

}
