<?php namespace TNEFDecoder;

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

	var $metafile;

	function getMetafile()
	{
		return $this->metafile;
	}

	function receiveTnefAttribute($attribute, $value, $length)
	{
		switch ($attribute)
		{

			// filename
			//
			case TNEF_AFILENAME:
				// strip path
				//
				if (($pos = strrpos($value, '/')) !== FALSE)
					$this->name = substr($value, $pos + 1);
				else
					$this->name = $value;

				// Strip trailing null bytes if present
				$this->name = trim($this->name);
				break;
			// code page
			//
			case TNEF_AOEMCODEPAGE:
				$this->code_page = tnef_geti16(new TNEFBuffer($value));
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

	function receiveMapiAttribute($attr_type, $attr_name, $value, $length, $is_unicode=FALSE)
	{
		switch ($attr_name)
		{

			// used in preference to AFILENAME value
			//
			case TNEF_MAPI_ATTACH_LONG_FILENAME:
				// strip path
				//
				if (($pos = strrpos($value, '/')) !== FALSE)
					$this->name = substr($value, $pos + 1);
				else
					$this->name = $value;

				if ($is_unicode) $this->name_is_unicode = TRUE;
				break;

			// Is this ever set, and what is format?
			//
			case TNEF_MAPI_ATTACH_MIME_TAG:
				$type0 = $type1 = '';
				$mime_type = explode('/', $value, 2);
				if (!empty($mime_type[0]))
					$type0 = $mime_type[0];
				if (!empty($mime_type[1]))
					$type1 = $mime_type[1];
				$this->type = "$type0/$type1";
				if ($is_unicode) {
					$this->type = substr(mb_convert_encoding($this->type, "UTF-8" , "UTF-16LE"), 0, -1);
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



