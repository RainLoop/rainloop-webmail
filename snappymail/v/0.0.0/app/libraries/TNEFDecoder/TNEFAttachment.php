<?php

namespace TNEFDecoder;

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

function tnef_log($string)
{
	echo $string . "\n";
//	\error_log($string . "\n", 3, '/tmp/squirrelmail_tnef_decoder.log');
//	\SnappyMail\Log::debug('TNEF', $string);
}

class TNEFAttachment
{

	public bool $debug;
	public bool $validateChecksum;
	public TNEFMailinfo $mailinfo;
	public array
		$files = [],
		$attachments = [],
		$body = [];
	public ?array $files_nested = null;
	public ?TNEFFile $current_receiver = null;

	public function __construct(bool $debug = false, bool $validateChecksum = false)
	{
		$this->debug = $debug;
		$this->validateChecksum = $validateChecksum;
		$this->mailinfo = new TNEFMailinfo();
	}

	/**
	 * @return TNEFFileBase[]
	 */
	public function &getFiles(): array
	{
		return $this->files;
	}

	/**
	 * @return TNEFFileBase[]
	 */
	public function &getFilesNested(): array
	{
		if (null === $this->files_nested) {
			$this->files_nested = array();
			$this->addFilesNested($this->files);
			foreach ($this->attachments as $attachment) {
				$this->addFilesNested($attachment->getFilesNested());
			}
		}
		return $this->files_nested;
	}

	private function addFilesNested(array &$add): void
	{
		foreach ($add as $file) {
			$this->files_nested[] = &$file;
		}
	}

	public function getAttachments(): array
	{
		return $this->attachments;
	}

	public function getMailinfo(): TNEFMailinfo
	{
		return $this->mailinfo;
	}

	public function getBodyElements(): array
	{
		return $this->body;
	}

	public function decodeTnef($data): void
	{
		$buffer = new TNEFBuffer($data);

		$tnef_signature = $buffer->geti32();
		if (TNEF_SIGNATURE == $tnef_signature) {
			$tnef_key = $buffer->geti16();
			$this->debug && tnef_log(\sprintf("Signature: 0x%08x\nKey: 0x%04x\n", $tnef_signature, $tnef_key));

			while ($buffer->getRemainingBytes() > 0) {
				$lvl_type = $buffer->geti8();

				switch ($lvl_type) {
					case TNEF_LVL_MESSAGE:
					case TNEF_LVL_ATTACHMENT:
						$this->tnef_decode_attribute($buffer);
						break;

					default:
						if ($this->debug) {
							$len = $buffer->getRemainingBytes();
							if ($len)
								tnef_log("Invalid file format! Unknown Level {$lvl_type}. Rest={$len}");
						}
						break;
				}
			}
		} else {
			throw new \RuntimeException("TNEF: Invalid file format! Wrong signature.");
		}

		// propagate parent message's code page to child files if given
		//
		$code_page = $this->mailinfo->getCodePage();
		if (!empty($code_page))
			foreach ($this->files as $i => $file)
				$this->files[$i]->setMessageCodePage($code_page);
	}

	private function tnef_decode_attribute(TNEFBuffer $buffer)
	{
		$attribute = $buffer->geti32();      // attribute if
		$length = $buffer->geti32();         // length
		$value = $buffer->getBytes($length); // data
		$checksumAtt = $buffer->geti16();    // checksum
		if ($value !== null && $this->validateChecksum) {
			$checksum = \array_sum(\unpack('C*', $value)) & 0xFFFF;
			if ($checksum !== $checksumAtt) {
				throw new \Exception('Checksums do not match');
			}
		}

		switch ($attribute)
		{
			case TNEF_ARENDDATA: // marks start of new attachment
				$this->debug && tnef_log("Creating new File for Attachment");
				$this->current_receiver = new TNEFFile($this->debug);
				$this->files[] = $this->current_receiver;
				break;

			case TNEF_AMAPIATTRS:
				$this->debug && tnef_log("mapi attrs");
				$this->extract_mapi_attrs(new TNEFBuffer($value));
				break;

			case TNEF_AMAPIPROPS:
				$this->debug && tnef_log("mapi props");
				$this->extract_mapi_attrs(new TNEFBuffer($value));
				break;

			case TNEF_AMCLASS:
				$value = substr($value, 0, $length - 1);
				if ($value == 'IPM.Contact') {
					$this->debug && tnef_log("Creating vCard Attachment");
					$this->current_receiver = new TNEFvCard($this->debug);
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

	private function extract_mapi_attrs(TNEFBuffer $buffer): void
	{

		$number = $buffer->geti32(); // number of attributes
		$props = 0;
		$ended = 0;

		while (($buffer->getRemainingBytes() > 0) && ($props++ < $number) && !$ended) {
			$value = '';
			unset($named_id);
			$length = 0;
			$have_multivalue = false;
			$num_multivalues = 1;
			$attr_type = $buffer->geti16();
			$attr_name = $buffer->geti16();

			if (($attr_type & TNEF_MAPI_MV_FLAG) != 0) {
				$this->debug && tnef_log("Multivalue Attribute found.");
				$have_multivalue = true;
				$attr_type = $attr_type & ~TNEF_MAPI_MV_FLAG;
			}

			// Named Attribute
			if (($attr_name >= 0x8000) && ($attr_name < 0xFFFE)) {
				$guid = $buffer->getBytes(16);
				$named_type = $buffer->geti32();
				switch ($named_type)
				{
					case TNEF_MAPI_NAMED_TYPE_ID:
						$named_id = $buffer->geti32();
						$attr_name = $named_id;
						$this->debug && tnef_log(sprintf("Named Id='0x%04x'", $named_id));
						break;

					case TNEF_MAPI_NAMED_TYPE_STRING:
						$attr_name = 0x9999; // dummy to identify strings
						$idlen = $buffer->geti32();
						$this->debug && tnef_log("idlen={$idlen}");
						$buflen = $idlen + ((4 - ($idlen % 4)) % 4);  // pad to next 4 byte boundary
						$this->debug && tnef_log("buflen={$buflen}");
						$named_id = substr($buffer->getBytes($buflen), 0, $idlen );  // read and truncate to length
						$this->debug && tnef_log("Named Id='{$named_id}'");
						break;

					default:
						$this->debug && tnef_log(\sprintf("Unknown Named Type 0x%04x found", $named_type));
						break;
				}
			}

			if ($have_multivalue) {
				$num_multivalues = $buffer->geti32();
				$this->debug && tnef_log("Number of multivalues={$num_multivalues}");
			}

			switch ($attr_type)
			{
				case TNEF_MAPI_NULL:
					break;

				case TNEF_MAPI_SHORT:
					$value = $buffer->geti16();
					break;

				case TNEF_MAPI_INT:
				case TNEF_MAPI_BOOLEAN:
					for ($cnt = 0; $cnt < $num_multivalues; $cnt++)
						$value = $buffer->geti32();
					break;

				case TNEF_MAPI_FLOAT:
				case TNEF_MAPI_ERROR:
					$value = $buffer->getBytes(4);
					break;

				case TNEF_MAPI_DOUBLE:
				case TNEF_MAPI_APPTIME:
				case TNEF_MAPI_CURRENCY:
				case TNEF_MAPI_INT8BYTE:
				case TNEF_MAPI_SYSTIME:
					$value = $buffer->getBytes(8);
					break;

				case TNEF_MAPI_CLSID:
					$this->debug && tnef_log("What is a MAPI CLSID ????");
					break;

				case TNEF_MAPI_STRING:
				case TNEF_MAPI_UNICODE_STRING:
				case TNEF_MAPI_BINARY:
				case TNEF_MAPI_OBJECT:
					$num_vals = $have_multivalue ? $num_multivalues : $buffer->geti32();

					if ($num_vals > 20) {
						// A Sanity check.
						$ended = 1;
						$this->debug && tnef_log("Number of entries in String Attributes={$num_vals}. Aborting Mapi parsing.");
					} else {
						for ($cnt = 0; $cnt < $num_vals; ++$cnt) {
							$length = $buffer->geti32();
							$buflen = $length + ((4 - ($length % 4)) % 4); // pad to next 4 byte boundary
							if ($attr_type == TNEF_MAPI_STRING)
								$length -= 1;
							$value = \substr($buffer->getBytes($buflen), 0, $length); // read and truncate to length
						}
					}
					break;

				default:
					$this->debug && tnef_log("Unknown mapi attribute! {$attr_type}");
					break;
			}

			switch ($attr_name)
			{
				case TNEF_MAPI_ATTACH_DATA:
					$this->debug && tnef_log("MAPI Found nested attachment. Processing new one.");
					$value = substr($value, 16); // skip the next 16 bytes (unknown data)
					$att = new TNEFAttachment($this->debug, $this->validateChecksum);
					$att->decodeTnef($value);
					$this->attachments[] = $att;
					$this->debug && tnef_log("MAPI Finished nested attachment. Continuing old one.");
					break;

				case TNEF_MAPI_RTF_COMPRESSED:
					$this->debug && tnef_log("MAPI Found Compressed RTF Attachment.");
					$this->files[] = new TNEFFileRTF($this->debug, $value);
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
					$this->mailinfo->receiveMapiAttribute($attr_type, $attr_name, $value, $length);
					if ($this->current_receiver)
						$this->current_receiver->receiveMapiAttribute($attr_type, $attr_name, $value, $length);
					break;
			}
		}
		if ($this->debug && $ended) {
			$len = $buffer->getRemainingBytes();
			for ($cnt = 0; $cnt < $len; ++$cnt) {
				$ord = $buffer->geti8();
				$char = $ord ? \chr($ord) : '';
				tnef_log(\sprintf("Char Nr. %6d = 0x%02x = '%s'", $cnt, $ord, $char));
			}
		}
	}
}
