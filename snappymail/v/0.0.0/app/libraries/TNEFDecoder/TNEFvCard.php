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

	public bool $name_is_unicode = FALSE;
	public string $name = 'Untitled';
	public string $code_page = '';
	public string $message_code_page = ''; // parent message's code page (the whole TNEF file)
	public string $type = 'text/x-vcard';
	public string $content = '';
	var $metafile;
	var $surname;
	var $surname_is_unicode = FALSE;
	var $given_name;
	var $given_name_is_unicode = FALSE;
	var $middle_name;
	var $middle_name_is_unicode = FALSE;
	var $nickname;
	var $nickname_is_unicode = FALSE;
	var $company;
	var $company_is_unicode = FALSE;
	var $homepages;
	var $addresses;
	var $emails;
	var $telefones;

	private static
		$address_mapping = array (
			TNEF_MAPI_LOCALTY                => array ("Address", ADDRESS_CITY),
			TNEF_MAPI_COUNTRY                => array ("Address", ADDRESS_COUNTRY),
			TNEF_MAPI_POSTAL_CODE            => array ("Address", ADDRESS_ZIP),
			TNEF_MAPI_STATE_OR_PROVINCE      => array ("Address", ADDRESS_STATE),
			TNEF_MAPI_STREET_ADDRESS         => array ("Address", ADDRESS_STREET),
			TNEF_MAPI_POST_OFFICE_BOX        => array ("Address", ADDRESS_PO_BOX),
			TNEF_MAPI_HOME_ADDR_CITY         => array ("Home Address", ADDRESS_CITY),
			TNEF_MAPI_HOME_ADDR_COUNTRY      => array ("Home Address", ADDRESS_COUNTRY),
			TNEF_MAPI_HOME_ADDR_ZIP          => array ("Home Address", ADDRESS_ZIP),
			TNEF_MAPI_HOME_ADDR_STATE        => array ("Home Address", ADDRESS_STATE),
			TNEF_MAPI_HOME_ADDR_STREET       => array ("Home Address", ADDRESS_STREET),
			TNEF_MAPI_HOME_ADDR_PO_BOX       => array ("Home Address", ADDRESS_PO_BOX),
			TNEF_MAPI_OTHER_ADDR_CITY        => array ("Other Address", ADDRESS_CITY),
			TNEF_MAPI_OTHER_ADDR_COUNTRY     => array ("Other Address", ADDRESS_COUNTRY),
			TNEF_MAPI_OTHER_ADDR_ZIP         => array ("Other Address", ADDRESS_ZIP),
			TNEF_MAPI_OTHER_ADDR_STATE       => array ("Other Address", ADDRESS_STATE),
			TNEF_MAPI_OTHER_ADDR_STREET      => array ("Other Address", ADDRESS_STREET),
			TNEF_MAPI_OTHER_ADDR_PO_BOX      => array ("Other Address", ADDRESS_PO_BOX),
		),
		$email_mapping = array (
			TNEF_MAPI_EMAIL1_DISPLAY           => array ("Email 1", EMAIL_DISPLAY),
			TNEF_MAPI_EMAIL1_TRANSPORT         => array ("Email 1", EMAIL_TRANSPORT),
			TNEF_MAPI_EMAIL1_EMAIL             => array ("Email 1", EMAIL_EMAIL),
			TNEF_MAPI_EMAIL1_EMAIL2            => array ("Email 1", EMAIL_EMAIL2),
			TNEF_MAPI_EMAIL2_DISPLAY           => array ("Email 2", EMAIL_DISPLAY),
			TNEF_MAPI_EMAIL2_TRANSPORT         => array ("Email 2", EMAIL_TRANSPORT),
			TNEF_MAPI_EMAIL2_EMAIL             => array ("Email 2", EMAIL_EMAIL),
			TNEF_MAPI_EMAIL2_EMAIL2            => array ("Email 2", EMAIL_EMAIL2),
			TNEF_MAPI_EMAIL3_DISPLAY           => array ("Email 3", EMAIL_DISPLAY),
			TNEF_MAPI_EMAIL3_TRANSPORT         => array ("Email 3", EMAIL_TRANSPORT),
			TNEF_MAPI_EMAIL3_EMAIL             => array ("Email 3", EMAIL_EMAIL),
			TNEF_MAPI_EMAIL3_EMAIL2            => array ("Email 3", EMAIL_EMAIL2),
		),
		$homepage_mapping = array (
			TNEF_MAPI_PERSONAL_HOME_PAGE    => "Personal Homepage",
			TNEF_MAPI_BUSINESS_HOME_PAGE    => "Business Homepage",
			TNEF_MAPI_OTHER_HOME_PAGE       => "Other Homepage",
		),
		$telefone_mapping = array (
			TNEF_MAPI_PRIMARY_TEL_NUMBER    => "Primary Telefone",
			TNEF_MAPI_HOME_TEL_NUMBER       => "Home Telefone",
			TNEF_MAPI_HOME2_TEL_NUMBER      => "Home2 Telefone",
			TNEF_MAPI_BUSINESS_TEL_NUMBER   => "Business Telefone",
			TNEF_MAPI_BUSINESS2_TEL_NUMBER  => "Business2 Telefone",
			TNEF_MAPI_MOBILE_TEL_NUMBER     => "Mobile Telefone",
			TNEF_MAPI_RADIO_TEL_NUMBER      => "Radio Telefone",
			TNEF_MAPI_CAR_TEL_NUMBER        => "Car Telefone",
			TNEF_MAPI_OTHER_TEL_NUMBER      => "Other Telefone",
			TNEF_MAPI_PAGER_TEL_NUMBER      => "Pager Telefone",
			TNEF_MAPI_PRIMARY_FAX_NUMBER    => "Primary Fax",
			TNEF_MAPI_BUSINESS_FAX_NUMBER   => "Business Fax",
			TNEF_MAPI_HOME_FAX_NUMBER       => "Home Fax",
		);

	function __construct()
	{
		$this->telefones = array();
		$this->homepages = array();
		$this->emails = array();
		$this->addresses = array();
	}

	function getSurname()
	{
		return $this->surname;
	}

	function getGivenName()
	{
		return $this->given_name;
	}

	function getMiddleName()
	{
		return $this->middle_name;
	}

	function getNickname()
	{
		return $this->nickname;
	}

	function getCompany()
	{
		return $this->company;
	}

	function getAddresses()
	{
		return $this->addresses;
	}

	function getMetafile()
	{
		return $this->metafile;
	}

	function getTelefones()
	{
		return $this->telefones;
	}

	function getHomepages()
	{
		return $this->homepages;
	}

	function getEmails()
	{
		return $this->emails;
	}

	function receiveTnefAttribute($attribute, $value, $length)
	{
		switch ($attribute)
		{

			// code page
			//
			case TNEF_AOEMCODEPAGE:
				$this->code_page = tnef_geti16(new TNEFBuffer($value));
				break;

		}
	}

	function receiveMapiAttribute($attr_type, $attr_name, $value, $length, $is_unicode=FALSE)
	{
		switch($attr_name)
		{
			case TNEF_MAPI_DISPLAY_NAME:
				$this->name = $value;

				if ($is_unicode) $this->name_is_unicode = TRUE;

				break;

			case TNEF_MAPI_SURNAME:
				$this->surname = $value;

				if ($is_unicode) $this->surname_is_unicode = TRUE;

				break;

			case TNEF_MAPI_GIVEN_NAME:
				$this->given_name = $value;

				if ($is_unicode) $this->given_name_is_unicode = TRUE;

				break;

			case TNEF_MAPI_MIDDLE_NAME:
				$this->middle_name = $value;

				if ($is_unicode) $this->middle_name_is_unicode = TRUE;

				break;

			case TNEF_MAPI_NICKNAME:
				$this->nickname = $value;

				if ($is_unicode) $this->nickname_is_unicode = TRUE;

				break;

			case TNEF_MAPI_COMPANY_NAME:
				$this->company = $value;

				if ($is_unicode) $this->company_is_unicode = TRUE;

				break;

			default:
				$rc = $this->evaluateTelefoneAttribute($attr_type, $attr_name, $value, $length);
				if (!$rc)
					$rc = $this->evaluateEmailAttribute($attr_type, $attr_name, $value, $length);
				if (!$rc)
					$rc = $this->evaluateAddressAttribute($attr_type, $attr_name, $value, $length);
				if (!$rc)
					$rc = $this->evaluateHomepageAttribute($attr_type, $attr_name, $value, $length);
				break;
		}
	}

	function evaluateTelefoneAttribute($attr_type, $attr_name, $value, $length)
	{
		$rc = 0;

		if ($length > 0)
		{
			if (array_key_exists($attr_name, static::$telefone_mapping))
			{
				$telefone_key = static::$telefone_mapping[$attr_name];
				$this->telefones[$telefone_key] = $value;
				$rc = 1;
				tnef_log("Setting telefone '$telefone_key' to value '$value'");
			}
		}

		return $rc;
	}

	function evaluateEmailAttribute($attr_type, $attr_name, $value, $length)
	{
		$rc = 0;

		if ($length > 0)
		{
			if (array_key_exists($attr_name, static::$email_mapping))
			{
				$email_key = static::$email_mapping[$attr_name];
				if (!array_key_exists($email_key[0], $this->emails))
					$this->emails[$email_key[0]] = array ( EMAIL_DISPLAY => "", EMAIL_TRANSPORT => "", EMAIL_EMAIL => "", EMAIL_EMAIL2 => "");
				$this->emails[$email_key[0]][$email_key[1]] = $value;
			}
		}

		return $rc;
	}

	function evaluateAddressAttribute($attr_type, $attr_name, $value, $length)
	{
		$rc = 0;

		if ($length > 0)
		{
			if (array_key_exists($attr_name, static::$address_mapping))
			{
				$address_key = static::$address_mapping[$attr_name];
				if (!array_key_exists($address_key[0], $this->addresses))
					$this->addresses[$address_key[0]] = array ( );
				$this->addresses[$address_key[0]][$address_key[1]] = $value;
			}
		}

		return $rc;
	}

	function evaluateHomepageAttribute($attr_type, $attr_name, $value, $length)
	{
		$rc = 0;

		if ($length > 0)
		{
			if (array_key_exists($attr_name, static::$homepage_mapping))
			{
				$homepage_key = static::$homepage_mapping[$attr_name];
				$this->homepages[$homepage_key] = $value;
				$rc = 1;
				tnef_log("Setting homepage '$homepage_key' to value '$value'");
			}
		}

		return $rc;
	}

}
