<?php

namespace MailSoTests;

class EmailTest extends \PHPUnit_Framework_TestCase
{
	public function testNewInstance()
	{
		$oMail = \MailSo\Mime\Email::NewInstance('admin@example.com', 'Administrator');
		$this->assertEquals('admin@example.com', $oMail->GetEmail());
		$this->assertEquals('Administrator', $oMail->GetDisplayName());
		$this->assertEquals('admin', $oMail->GetAccountName());
		$this->assertEquals('example.com', $oMail->GetDomain());
		$this->assertEquals('"Administrator" <admin@example.com>', $oMail->ToString());
		$this->assertEquals(array('Administrator', 'admin@example.com', 'none', ''), $oMail->ToArray());
	}

	public function testNewInstance1()
	{
		$oMail = \MailSo\Mime\Email::NewInstance('admin@example.com');
		$this->assertEquals('admin@example.com', $oMail->GetEmail());
		$this->assertEquals('', $oMail->GetDisplayName());
		$this->assertEquals('admin@example.com', $oMail->ToString());
		$this->assertEquals(array('', 'admin@example.com', 'none', ''), $oMail->ToArray());
	}

	public function testNewInstance2()
	{
		$oMail = \MailSo\Mime\Email::NewInstance('admin@example.com', 'Administrator');
		$this->assertEquals('admin@example.com', $oMail->GetEmail());
		$this->assertEquals('Administrator', $oMail->GetDisplayName());
		$this->assertEquals('"Administrator" <admin@example.com>', $oMail->ToString());
		$this->assertEquals(array('Administrator', 'admin@example.com', 'none', ''), $oMail->ToArray());
	}

	public function testNewInstance3()
	{
		$oMail = \MailSo\Mime\Email::NewInstance('admin@example.com', '');
		$this->assertEquals('admin@example.com', $oMail->GetEmail());
		$this->assertEquals('', $oMail->GetDisplayName());
		$this->assertEquals('admin@example.com', $oMail->ToString());
		$this->assertEquals(array('', 'admin@example.com', 'none', ''), $oMail->ToArray());
	}

	/**
	 * @expectedException \MailSo\Base\Exceptions\InvalidArgumentException
	 */
	public function testNewInstance4()
	{
		$oMail = \MailSo\Mime\Email::NewInstance('');
	}

	public function testParse1()
	{
		$oMail = \MailSo\Mime\Email::Parse('help@example.com');
		$this->assertEquals('help@example.com', $oMail->GetEmail());

		$oMail = \MailSo\Mime\Email::Parse('<help@example.com>');
		$this->assertEquals('help@example.com', $oMail->GetEmail());
	}

	public function testParse2()
	{
		$oMail = \MailSo\Mime\Email::Parse('"Тест" <help@example.com>');
		$this->assertEquals('"Тест" <help@example.com>', $oMail->ToString());
	}

	public static function providerForParse()
	{
		return array(
			array('test <help@example.com>',
				array('test', 'help@example.com')),
			array('test<help@example.com>',
				array('test', 'help@example.com')),
			array('test< help@example.com >',
				array('test', 'help@example.com')),
			array('"New \" Admin" <help@example.com>',
				array('New " Admin', 'help@example.com')),
			array('"Тест" <help@example.com>',
				array('Тест', 'help@example.com')),
			array('Microsoft Outlook<MicrosoftExchange329e71ec88ae4615bbc36ab6ce41109e@PPTH.PRIVATE>',
				array('Microsoft Outlook', 'MicrosoftExchange329e71ec88ae4615bbc36ab6ce41109e@ppth.private')),
		);
	}

	public static function providerForParse2()
	{
		return array(
			array('help@xn--d1abbgf6aiiy.xn--p1ai',
				array('', 'help@президент.рф')),
		);
	}

	/**
     * @dataProvider providerForParse
     */
	public function testParseWithProvider($sValue, $aResult)
	{
		$oMail = \MailSo\Mime\Email::Parse($sValue);
		$this->assertEquals($aResult, $oMail->ToArray(false, false));
	}

	/**
     * @dataProvider providerForParse2
     */
	public function testParseWithProvider2($sValue, $aResult)
	{
		$oMail = \MailSo\Mime\Email::Parse($sValue);
		$this->assertEquals($aResult, $oMail->ToArray(true, false));
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
}
