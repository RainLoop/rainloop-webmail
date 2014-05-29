<?php

namespace MailSoTests;

class EmailTest extends \PHPUnit_Framework_TestCase
{
	public function testNewInstance()
	{
		$oEmail = \MailSo\Mime\Email::NewInstance('admin@example.com', 'Administrator', 'Remark');
		$this->assertEquals('admin@example.com', $oEmail->GetEmail());
		$this->assertEquals('Administrator', $oEmail->GetDisplayName());
		$this->assertEquals('Remark', $oEmail->GetRemark());
		$this->assertEquals('admin', $oEmail->GetAccountName());
		$this->assertEquals('example.com', $oEmail->GetDomain());
		$this->assertEquals('"Administrator" <admin@example.com> (Remark)', $oEmail->ToString());
		$this->assertEquals(array('Administrator', 'admin@example.com', 'Remark'), $oEmail->ToArray());
	}

	public function testNewInstance1()
	{
		$oEmail = \MailSo\Mime\Email::NewInstance('admin@example.com');
		$this->assertEquals('admin@example.com', $oEmail->GetEmail());
		$this->assertEquals('', $oEmail->GetDisplayName());
		$this->assertEquals('', $oEmail->GetRemark());
		$this->assertEquals('admin@example.com', $oEmail->ToString());
		$this->assertEquals(array('', 'admin@example.com', ''), $oEmail->ToArray());
	}

	public function testNewInstance2()
	{
		$oEmail = \MailSo\Mime\Email::NewInstance('admin@example.com', 'Administrator');
		$this->assertEquals('admin@example.com', $oEmail->GetEmail());
		$this->assertEquals('Administrator', $oEmail->GetDisplayName());
		$this->assertEquals('', $oEmail->GetRemark());
		$this->assertEquals('"Administrator" <admin@example.com>', $oEmail->ToString());
		$this->assertEquals(array('Administrator', 'admin@example.com', ''), $oEmail->ToArray());
	}

	public function testNewInstance3()
	{
		$oEmail = \MailSo\Mime\Email::NewInstance('admin@example.com', '', 'Remark');
		$this->assertEquals('admin@example.com', $oEmail->GetEmail());
		$this->assertEquals('', $oEmail->GetDisplayName());
		$this->assertEquals('Remark', $oEmail->GetRemark());
		$this->assertEquals('<admin@example.com> (Remark)', $oEmail->ToString());
		$this->assertEquals(array('', 'admin@example.com', 'Remark'), $oEmail->ToArray());
	}

	/**
	 * @expectedException \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public function testNewInstance4()
	{
		\MailSo\Mime\Email::NewInstance('');
	}

	public function testParse1()
	{
		$oEmail = \MailSo\Mime\Email::Parse('help@example.com');
		$this->assertEquals('help@example.com', $oEmail->GetEmail());

		$oEmail = \MailSo\Mime\Email::Parse('<help@example.com>');
		$this->assertEquals('help@example.com', $oEmail->GetEmail());
	}

	public function testParse2()
	{
		$oEmail = \MailSo\Mime\Email::Parse('"Тест" <help@example.com> (Ремарка)');
		$this->assertEquals('"Тест" <help@example.com> (Ремарка)', $oEmail->ToString());
		$this->assertEquals('"=?utf-8?B?0KLQtdGB0YI=?=" <help@example.com> (=?utf-8?B?0KDQtdC80LDRgNC60LA=?=)', $oEmail->ToString(true));
	}

	/**
	 * @expectedException \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public function testParse5()
	{
		\MailSo\Mime\Email::Parse('');
	}

	/**
	 * @expectedException \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public function testParse6()
	{
		\MailSo\Mime\Email::Parse('example.com');
	}

	public function testParsePuny1()
	{
		$oMail = \MailSo\Mime\Email::Parse('help@xn--d1acufc.xn--p1ai');
		$this->assertEquals('help@xn--d1acufc.xn--p1ai', $oMail->ToString());
		$this->assertEquals('help@домен.рф', $oMail->ToString(false, true));
	}

	public function testParsePuny2()
	{
		$oMail = \MailSo\Mime\Email::Parse('help@домен.рф');
		$this->assertEquals('help@xn--d1acufc.xn--p1ai', $oMail->ToString());
		$this->assertEquals('help@домен.рф', $oMail->ToString(false, true));
	}
	
	public static function providerForParse()
	{
		return array(
			array('test <help@example.com>',
				array('test', 'help@example.com', '')),
			array('test<help@example.com>',
				array('test', 'help@example.com', '')),
			array('test< help@example.com >',
				array('test', 'help@example.com', '')),
			array('<help@example.com> (Remark)',
				array('', 'help@example.com', 'Remark')),
			array('"New \" Admin" <help@example.com> (Rem)',
				array('New " Admin', 'help@example.com', 'Rem')),
			array('"Тест" <help@example.com> (Ремарка)',
				array('Тест', 'help@example.com', 'Ремарка')),
			array('Microsoft Outlook<MicrosoftExchange329e71ec88ae4615bbc36ab6ce41109e@PPTH.PRIVATE>',
				array('Microsoft Outlook', 'microsoftexchange329e71ec88ae4615bbc36ab6ce41109e@ppth.private', '')),
		);
	}

	/**
     * @dataProvider providerForParse
     */
	public function testParseWithProvider($sValue, $aResult)
	{
		$oMail = \MailSo\Mime\Email::Parse($sValue);
		$this->assertEquals($aResult, $oMail->ToArray());
	}
}
