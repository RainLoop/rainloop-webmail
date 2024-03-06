<?php

namespace TNEFDecoder;

require 'functions.php';
require 'constants.php';

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


class TNEFAttachment
{

	var $validateChecksum;
	var $mailinfo;
	var $files;
	var $files_nested;
	var $attachments;
	var $current_receiver;
	var $body;

	function __construct($validateChecksum = false)
	{
		$this->validateChecksum = $validateChecksum;
		$this->files = array();
		$this->attachments = array();
		$this->mailinfo = new TNEFMailinfo();
		$this->body = [];
	}

	/**
	* @return TNEFFileBase[]
	*/
	function &getFiles()
	{
		return $this->files;
	}

	/**
	* @return TNEFFileBase[]
	*/
	function &getFilesNested()
	{
		if (!$this->files_nested)
		{
			$this->files_nested = array();

			$num_attach = count($this->attachments);
			if ($num_attach > 0)
			{
				for ($cnt = 0; $cnt < $num_attach; $cnt++)
				{
					$this->addFiles($this->files_nested, $this->files);
					$this->addFiles($this->files_nested, $this->attachments[$cnt]->getFilesNested());
				}
			}
			else
				$this->addFiles($this->files_nested, $this->files);
		}

		return $this->files_nested;
	}

	function addFiles(&$add_to, &$add)
	{
		global $tnef_minimum_rtf_size_to_decode;
		$num_files = count($add);
		for ($cnt = 0; $cnt < $num_files; $cnt++)
			if ((strtolower(get_class($add[$cnt])) != "tneffilertf") || ($add[$cnt]->getSize() > $tnef_minimum_rtf_size_to_decode))
				$add_to[] = &$add[$cnt];
	}

	function addFilesCond(&$add_to, &$add)
	{
		global $tnef_minimum_rtf_size_to_decode;
		$num_files = count($add);
		for ($cnt = 0; $cnt < $num_files; $cnt++)
			if ((strtolower(get_class($add[$cnt])) == "tneffilertf") && ($add[$cnt]->getSize() > $tnef_minimum_rtf_size_to_decode))
				$add_to[] = &$add[$cnt];
	}

	function getAttachments()
	{
		return $this->attachments;
	}

	/**
	 * @return TNEFMailinfo
	 */
	function getMailinfo()
	{
		return $this->mailinfo;
	}

	function getBodyElements()
	{
		return $this->body;
	}

	function decodeTnef($data)
	{
		$buffer = new TNEFBuffer($data);

		$tnef_signature = tnef_geti32($buffer);
		if ($tnef_signature == TNEF_SIGNATURE) {
			$tnef_key = tnef_geti16($buffer);
			tnef_log(sprintf("Signature: 0x%08x\nKey: 0x%04x\n", $tnef_signature, $tnef_key));

			while ($buffer->getRemainingBytes() > 0) {
				$lvl_type = tnef_geti8($buffer);

				switch ($lvl_type) {
					case TNEF_LVL_MESSAGE:
						$this->tnef_decode_attribute($buffer);
						break;

					case TNEF_LVL_ATTACHMENT:
						$this->tnef_decode_attribute($buffer);
						break;

					default:
						$len = $buffer->getRemainingBytes();
						if ($len > 0)
						tnef_log("Invalid file format! Unknown Level $lvl_type. Rest=$len");
				}
				break;
			}
		}
		else
		{
			tnef_log("Invalid file format! Wrong signature.");
		}

		// propagate parent message's code page to child files if given
		//
		$code_page = $this->mailinfo->getCodePage();
		if (!empty($code_page))
			foreach ($this->files as $i => $file)
				$this->files[$i]->setMessageCodePage($code_page);
	}

	function tnef_decode_attribute(TNEFBuffer $buffer)
	{
		$attribute = tnef_geti32($buffer);     // attribute if
		$length = tnef_geti32($buffer);        // length
		$value = tnef_getx($length, $buffer);  // data
		$checksumAtt = tnef_geti16($buffer);   // checksum
		if ($value !== null && $this->validateChecksum) {
			$checksum = array_sum(unpack('C*', $value)) & 0xFFFF;
			if ($checksum !== $checksumAtt) {
				throw new \Exception('Checksums do not match');
			}
		}

		switch($attribute)
		{
			case TNEF_ARENDDATA:                   // marks start of new attachment
				tnef_log("Creating new File for Attachment");
				$this->current_receiver = new TNEFFile();
				$this->files[] = $this->current_receiver;
				break;

			case TNEF_AMAPIATTRS:
				tnef_log("mapi attrs");
				$this->extract_mapi_attrs(new TNEFBuffer($value));
				break;

			case TNEF_AMAPIPROPS:
				tnef_log("mapi props");
				$this->extract_mapi_attrs(new TNEFBuffer($value));
				break;

			case TNEF_AMCLASS:
				$value = substr($value, 0, $length - 1);
				if ($value == 'IPM.Contact')
				{
					tnef_log("Creating vCard Attachment");
					$this->current_receiver = new TNEFvCard();
					$this->files[] = $this->current_receiver;
				}
				break;

			default:
				$this->mailinfo->receiveTnefAttribute($attribute, $value, $length);
				if ($this->current_receiver)
					$this->current_receiver->receiveTnefAttribute($attribute, $value, $length);
				break;
		}
	}

	function extract_mapi_attrs(TNEFBuffer $buffer)
	{

		$number = tnef_geti32($buffer); // number of attributes
		$props = 0;
		$ended = 0;

		while (($buffer->getRemainingBytes() > 0) && ($props < $number) && (!$ended))
		{
			$props++;
			$value = '';
			unset($named_id);
			$length = 0;
			$have_multivalue = 0;
			$num_multivalues = 1;
			$attr_type = tnef_geti16($buffer);
			$attr_name = tnef_geti16($buffer);

			if (($attr_type & TNEF_MAPI_MV_FLAG) != 0)
			{
				tnef_log("Multivalue Attribute found.");
				$have_multivalue = 1;
				$attr_type = $attr_type & ~TNEF_MAPI_MV_FLAG;
			}

			if (($attr_name >= 0x8000) && ($attr_name < 0xFFFE))   // Named Attribute
			{
				$guid = tnef_getx(16, $buffer);
				$named_type = tnef_geti32($buffer);
				switch ($named_type)
				{
					case TNEF_MAPI_NAMED_TYPE_ID:
					$named_id = tnef_geti32($buffer);
					$attr_name = $named_id;
					tnef_log(sprintf("Named Id='0x%04x'", $named_id));
					break;

					case TNEF_MAPI_NAMED_TYPE_STRING:
					$attr_name = 0x9999;    // dummy to identify strings
					$idlen = tnef_geti32($buffer);
					tnef_log("idlen=$idlen");
					$buflen = $idlen + ((4 - ($idlen % 4)) % 4);  // pad to next 4 byte boundary
					tnef_log("buflen=$buflen");
					$named_id = substr(tnef_getx($buflen, $buffer), 0, $idlen );  // read and truncate to length
					tnef_log("Named Id='$named_id'");
					break;

					default:
					tnef_log(sprintf("Unknown Named Type 0x%04x found", $named_type));
					break;
				}
			}

			if ($have_multivalue)
			{
				$num_multivalues = tnef_geti32($buffer);
				tnef_log("Number of multivalues=$num_multivalues");
			}

			switch($attr_type)
			{
				case TNEF_MAPI_NULL:
					break;

				case TNEF_MAPI_SHORT:
					$value = tnef_geti16($buffer);
					break;

				case TNEF_MAPI_INT:
				case TNEF_MAPI_BOOLEAN:
					for ($cnt = 0; $cnt < $num_multivalues; $cnt++)
					$value = tnef_geti32($buffer);
					break;

				case TNEF_MAPI_FLOAT:
				case TNEF_MAPI_ERROR:
					$value = tnef_getx(4, $buffer);
					break;

				case TNEF_MAPI_DOUBLE:
				case TNEF_MAPI_APPTIME:
				case TNEF_MAPI_CURRENCY:
				case TNEF_MAPI_INT8BYTE:
				case TNEF_MAPI_SYSTIME:
					$value = tnef_getx(8, $buffer);
					break;

				case TNEF_MAPI_CLSID:
					tnef_log("What is a MAPI CLSID ????");
					break;

				case TNEF_MAPI_STRING:
				case TNEF_MAPI_UNICODE_STRING:
				case TNEF_MAPI_BINARY:
				case TNEF_MAPI_OBJECT:
					if ($have_multivalue)
					$num_vals = $num_multivalues;
					else
					$num_vals = tnef_geti32($buffer);

					if ($num_vals > 20)      // A Sanity check.
					{
					$ended = 1;
					tnef_log("Number of entries in String Attributes=$num_vals. Aborting Mapi parsing.");
					}
					else
					{
					for ($cnt = 0; $cnt < $num_vals; $cnt++)
					{
						$length = tnef_geti32($buffer);
						$buflen = $length + ((4 - ($length % 4)) % 4); // pad to next 4 byte boundary
						if ($attr_type == TNEF_MAPI_STRING)
						$length -= 1;
						$value = substr(tnef_getx($buflen, $buffer), 0, $length); // read and truncate to length
					}
					}
					break;

				default:
					tnef_log("Unknown mapi attribute! $attr_type");
					break;
			}

			switch ($attr_name)
			{
				case TNEF_MAPI_ATTACH_DATA:
					tnef_log("MAPI Found nested attachment. Processing new one.");
					$value = substr($value, 16); // skip the next 16 bytes (unknown data)
					$att = new TNEFAttachment($this->validateChecksum);
					$att->decodeTnef($value);
					$this->attachments[] = $att;
					tnef_log("MAPI Finished nested attachment. Continuing old one.");
					break;

				case TNEF_MAPI_RTF_COMPRESSED:
					tnef_log("MAPI Found Compressed RTF Attachment.");
					$this->files[] = new TNEFFileRTF($value);
					break;
				case TNEF_MAPI_BODY:
				case TNEF_MAPI_BODY_HTML:
					$result = [];
					$result['type'] = 'text';
					$result['subtype'] = $attr_name == TNEF_MAPI_BODY ? 'plain' : 'html';
					$result['name'] = ('Untitled') . ($attr_name == TNEF_MAPI_BODY ? '.txt' : '.html');
					$result['stream'] = $value;
					$result['size'] = strlen($value);
					$this->body[] = $result;
					break;
				default:
					$this->mailinfo->receiveMapiAttribute($attr_type, $attr_name, $value, $length, ($attr_type == TNEF_MAPI_UNICODE_STRING));
					if ($this->current_receiver)
						$this->current_receiver->receiveMapiAttribute($attr_type, $attr_name, $value, $length, ($attr_type == TNEF_MAPI_UNICODE_STRING));
					break;
			}
		}
		if ($ended)
		{
			$len = $buffer->getRemainingBytes();
			for ($cnt = 0; $cnt < $len; $cnt++)
			{
				$ord = tnef_geti8($buffer);
				if ($ord == 0)
					$char = "";
				else
					$char = chr($ord);
				tnef_log(sprintf("Char Nr. %6d = 0x%02x = '%s'", $cnt, $ord, $char));
			}
		}
	}
}
