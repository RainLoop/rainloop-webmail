<?php

namespace MailSoTests;

class EmailCollectionTest extends \PHPUnit_Framework_TestCase
{
	public function testNewInstance()
	{
		$oMails = \MailSo\Mime\EmailCollection::NewInstance('admin@example.com');
		$this->assertEquals(1, $oMails->Count());
	}

	public function testNewInstance1()
	{
		$oMails = \MailSo\Mime\EmailCollection::NewInstance('User Name <username@domain.com>, User D\'Name <username@domain.com>, "User Name" <username@domain.com>');
		$this->assertEquals(3, $oMails->Count());
	}
}
