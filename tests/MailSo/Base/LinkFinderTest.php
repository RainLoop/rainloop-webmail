<?php

namespace MailSoTests;

class LinkFinderTest extends \PHPUnit_Framework_TestCase
{
	/**
	 * @var \MailSo\Base\LinkFinder
	 */
	protected $object;

	protected function setUp()
	{
		$this->object = \MailSo\Base\LinkFinder::NewInstance();
	}

	protected function tearDown()
	{
		$this->object = null;
	}

	public function testNewInstance()
	{
		$this->assertTrue($this->object instanceof \MailSo\Base\LinkFinder);
	}

	public function testClear()
	{
		$this->object->Text('111');
		$this->assertEquals('111', $this->object->CompileText());
		$this->object->Clear();
		$this->assertEquals('', $this->object->CompileText());
	}

	public function testText()
	{
		$this->object->Text('222');
		$this->assertEquals('222', $this->object->CompileText());
	}

	public function testLinkWrapper()
	{
		$this->object
			->Text('333 http://domain.com 333')
			->LinkWrapper(function ($sLink) {
				return '!'.$sLink.'!';
			})
		;

		$this->assertEquals('333 !http://domain.com! 333', $this->object->CompileText());
	}

	public function testMailWrapper()
	{
		$this->object
			->Text('444 user@domain.com 444')
			->MailWrapper(function ($sMail) {
				return '!'.$sMail.'!';
			})
		;

		$this->assertEquals('444 !user@domain.com! 444', $this->object->CompileText());
	}

	public function testUseDefaultWrappers()
	{
		$this->object
			->Text('555 http://domain.com user@domain.com 555')
			->UseDefaultWrappers()
		;

		$this->assertEquals('555 <a href="http://domain.com">http://domain.com</a> <a href="mailto:user@domain.com">user@domain.com</a> 555',
			$this->object->CompileText());

		$this->object->UseDefaultWrappers(true);

		$this->assertEquals('555 <a target="_blank" href="http://domain.com">http://domain.com</a> <a target="_blank" href="mailto:user@domain.com">user@domain.com</a> 555',
			$this->object->CompileText());
	}

	public function testCompileText()
	{
		$this->object
			->Text('777 http://domain.com domain.com user@domain.com <> 777')
			->LinkWrapper(function ($sLink) {
				return '~'.$sLink.'~';
			})
			->MailWrapper(function ($sMail) {
				return '~'.$sMail.'~';
			})
		;

		$this->assertEquals('777 ~http://domain.com~ domain.com ~user@domain.com~ &lt;&gt; 777', $this->object->CompileText(true));
		$this->assertEquals('777 ~http://domain.com~ domain.com ~user@domain.com~ <> 777', $this->object->CompileText(false));
	}
}
