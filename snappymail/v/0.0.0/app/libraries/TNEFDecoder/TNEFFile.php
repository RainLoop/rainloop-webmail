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

class TNEFFile extends TNEFFileBase
{

	public string $metafile;

	public function getMetafile()
	{
		return $this->metafile;
	}

	public function receiveTnefAttribute(int $attribute, string $value, int $length): void
	{
		switch ($attribute)
		{

			// filename
			//
			case TNEF_AFILENAME:
				// strip path
				//
				if (($pos = \strrpos($value, '/')) !== FALSE)
					$this->name = \substr($value, $pos + 1);
				else
					$this->name = $value;

				// Strip trailing null bytes if present
				$this->name = \trim($this->name);
				break;
			// code page
			//
			case TNEF_AOEMCODEPAGE:
				$this->code_page = (new TNEFBuffer($value))->geti16();
				break;

			// the attachment itself
			//
			case TNEF_ATTACHDATA:
				$this->content = $value;
				break;

			// a metafile
			//
			case TNEF_ATTACHMETAFILE:
				$this->metafile = $value;
				break;

			case TNEF_AATTACHCREATEDATE:
				$this->created = new TNEFDate();
				$this->created->setTnefBuffer(new TNEFBuffer($value));

			case TNEF_AATTACHMODDATE:
				$this->modified = new TNEFDate();
				$this->modified->setTnefBuffer(new TNEFBuffer($value));
				break;
		}
	}

	public function receiveMapiAttribute(int $attr_type, int $attr_name, string $value, int $length): void
	{
		switch ($attr_name)
		{

			// used in preference to AFILENAME value
			//
			case TNEF_MAPI_ATTACH_LONG_FILENAME:
				// strip path
				//
				if (($pos = \strrpos($value, '/')) !== FALSE)
					$this->name = \substr($value, $pos + 1);
				else
					$this->name = $value;

				$this->name_is_unicode = TNEF_MAPI_UNICODE_STRING === $attr_type;
				break;

			// Is this ever set, and what is format?
			//
			case TNEF_MAPI_ATTACH_MIME_TAG:
				$type0 = $type1 = '';
				$mime_type = \explode('/', $value, 2);
				if (!empty($mime_type[0]))
					$type0 = $mime_type[0];
				if (!empty($mime_type[1]))
					$type1 = $mime_type[1];
				$this->type = "{$type0}/{$type1}";
				if (TNEF_MAPI_UNICODE_STRING === $attr_type) {
					$this->type = \substr(\mb_convert_encoding($this->type, "UTF-8" , "UTF-16LE"), 0, -1);
				}
				break;

			case TNEF_MAPI_ATTACH_EXTENSION:
				$type = \SnappyMail\File\MimeType::fromFilename($value);
				if ($type)
					$this->type = $type;
				break;
		}
	}

}



