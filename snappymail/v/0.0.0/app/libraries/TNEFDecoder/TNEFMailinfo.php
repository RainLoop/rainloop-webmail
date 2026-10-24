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

class TNEFMailinfo
{

	public string
		$subject = '',
		$topic = '',
		$from = '',
		$from_name = '',
		$code_page = '';
	public ?TNEFDate $date_sent = null;
	public bool
		$topic_is_unicode = FALSE,
		$from_is_unicode = FALSE,
		$from_name_is_unicode = FALSE;

	public function getTopic(): string
	{
		return $this->topic;
	}

	public function getSubject(): string
	{
		return $this->subject;
	}

	public function getFrom(): string
	{
		return $this->from;
	}

	public function getCodePage(): string
	{
		return $this->code_page;
	}

	public function getFromName(): string
	{
		return $this->from_name;
	}

	public function getDateSent(): TNEFDate
	{
		return $this->date_sent;
	}

	public function receiveTnefAttribute(int $attribute, string $value, int $length): void
	{
		$value = new TNEFBuffer($value);

		switch ($attribute)
		{
			case TNEF_AOEMCODEPAGE:
				$this->code_page = $value->geti16();
				break;

			case TNEF_ASUBJECT:
				$this->subject = $value->getBytes($length - 1);
				break;

			case TNEF_ADATERECEIVED:
				if ($this->date_sent) {
					break;
				}
			case TNEF_ADATESENT:
				$this->date_sent = new TNEFDate();
				$this->date_sent->setTnefBuffer($value);
		}
	}

	public function receiveMapiAttribute(int $attr_type, int $attr_name, string $value, int $length): void
	{
		switch ($attr_name)
		{
			case TNEF_MAPI_CONVERSATION_TOPIC:
				$this->topic = $value;
				$this->topic_is_unicode = TNEF_MAPI_UNICODE_STRING === $attr_type;
				break;

			case TNEF_MAPI_SENT_REP_EMAIL_ADDR:
				$this->from = $value;
				$this->from_is_unicode = TNEF_MAPI_UNICODE_STRING === $attr_type;
				break;

			case TNEF_MAPI_SENT_REP_NAME:
				$this->from_name = $value;
				$this->from_name_is_unicode = TNEF_MAPI_UNICODE_STRING === $attr_type;
				break;
		}
	}

}
