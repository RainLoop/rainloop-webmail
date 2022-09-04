<?php

namespace Crew\Unsplash\Tests;

use Crew\Unsplash;

/**
 * Class ArrayObjectTest
 * @package Crew\Unsplash\Tests
 */
class ArrayObjectTest extends BaseTest
{
    public function setUp()
    {
        parent::setUp();
    }

    public function testConstructorAcceptHeaders()
    {
        $headers = ['X-Per-Page' => ['10'], 'X-Total' => ['100']];
        $arrayObject = new Unsplash\ArrayObject([], $headers);

        $this->assertInstanceOf('ArrayObject', $arrayObject);
    }

    public function testTotalPage()
    {
        $headers = ['X-Per-Page' => ['10'], 'X-Total' => ['100']];
        $arrayObject = new Unsplash\ArrayObject([], $headers);

        $this->assertEquals(10, $arrayObject->totalPages());
    }

    public function testTotalObjectInCollection()
    {
        $headers = ['X-Total' => ['100']];
        $arrayObject = new Unsplash\ArrayObject([], $headers);

        $this->assertEquals(100, $arrayObject->totalObjects());
    }

    public function testTotalObjectInCollectionWhenNoHeader()
    {
        $headers = [];
        $arrayObject = new Unsplash\ArrayObject([], $headers);

        $this->assertEquals(0, $arrayObject->totalObjects());
    }

    public function testObjectsPerPage()
    {
        $headers = ['X-Per-Page' => ['20']];
        $arrayObject = new Unsplash\ArrayObject([], $headers);

        $this->assertEquals(20, $arrayObject->objectsPerPage());
    }

    public function testObjectsPerPageWhenNoHeader()
    {
        $headers = [];
        $arrayObject = new Unsplash\ArrayObject([], $headers);

        $this->assertEquals(10, $arrayObject->objectsPerPage());
    }

    public function testNextPage()
    {
        $headers = ['Link' => [
            '<http://api.staging.unsplash.com/photos?page=266>; rel="last", 
            <http://api.staging.unsplash.com/photos?page=2>; rel="next"'
        ]];

        $arrayObject = new Unsplash\ArrayObject([], $headers);
        $pages = ['first' => null, 'next' => 2, 'prev' => null, 'last' => 266];

        $this->assertEquals($pages, $arrayObject->getPages());
    }

    public function testCurrentPageWhenFirstPage()
    {
        $headers = ['Link' => ['<http://api.staging.unsplash.com/photos?page=266>; rel="last",
        <http://api.staging.unsplash.com/photos?page=2>; rel="next"']];

        $arrayObject = new Unsplash\ArrayObject([], $headers);

        $this->assertEquals(1, $arrayObject->currentPage());
    }

    public function testCurrentPageWhenLastPage()
    {
        $headers = ['Link' => ['<http://api.staging.unsplash.com/photos?page=1>; rel="first",
        <http://api.staging.unsplash.com/photos?page=265>; rel="prev"']];

        $arrayObject = new Unsplash\ArrayObject([], $headers);

        $this->assertEquals(266, $arrayObject->currentPage());
    }

    public function testCurrentPageWhenMiddlePage()
    {
        $headers = ['Link' => ['<http://api.staging.unsplash.com/photos?page=1>; rel="first",
        <http://api.staging.unsplash.com/photos?page=264>; rel="prev",
        <http://api.staging.unsplash.com/photos?page=266>; rel="last",
        <http://api.staging.unsplash.com/photos?page=266>; rel="next"']];

        $arrayObject = new Unsplash\ArrayObject([], $headers);

        $this->assertEquals(265, $arrayObject->currentPage());
	}
	
    public function testRateLimitRemaining()
    {
        $headers = ['X-Ratelimit-Remaining' => ['10']];
        $arrayObject = new Unsplash\ArrayObject([], $headers);

        $this->assertEquals(10, $arrayObject->rateLimitRemaining());
    }
}
