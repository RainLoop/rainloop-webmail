<?php

namespace Crew\Unsplash\Tests;

use \Crew\Unsplash as Unsplash;
use \VCR\VCR;

/**
 * Class SearchTest
 * @package Crew\Unsplash\Tests
 */
class SearchTest extends BaseTest
{
    public function setUp()
    {
        parent::setUp();

        $connection = new Unsplash\Connection($this->provider, $this->accessToken);
        Unsplash\HttpClient::$connection = $connection;
    }

    public function testSearchPhotos()
    {
        VCR::insertCassette('search.yml');
        $photos = Unsplash\Search::photos("paris");
        VCR::eject();

        $photosArrayObject = $photos->getArrayObject();

        $this->assertInstanceOf(Unsplash\Photo::class, current($photosArrayObject));
        $this->assertEquals(10, $photosArrayObject->count());
        $this->assertEquals(10, count($photos->getResults()));
        $this->assertEquals(110, $photos->getTotal());
        $this->assertEquals(11, $photos->getTotalPages());
    }

    public function testSearchCollections()
    {
        VCR::insertCassette('search.yml');
        $collections = Unsplash\Search::collections("paris");
        VCR::eject();

        $collectionsArrayObject = $collections->getArrayObject();

        $this->assertInstanceOf(Unsplash\Collection::class, current($collectionsArrayObject));
        $this->assertEquals(10, $collectionsArrayObject->count());
        $this->assertEquals(33, $collections->getTotal());
        $this->assertEquals(10, count($collections->getResults()));
        $this->assertEquals(4, $collections->getTotalPages());
    }

    public function testSearchUsers()
    {
        VCR::insertCassette('search.yml');
        $users = Unsplash\Search::users("dechuck");
        VCR::eject();

        $usersArrayObject = $users->getArrayObject();

        $this->assertInstanceOf(Unsplash\User::class, current($usersArrayObject));
        $this->assertEquals(7, $usersArrayObject->count());
        $this->assertEquals(7, $users->getTotal());
        $this->assertEquals(7, count($users->getResults()));
        $this->assertEquals(1, $users->getTotalPages());
    }

    public function testSearchOffset()
    {
        VCR::insertCassette('search.yml');
        $users = Unsplash\Search::users("dechuck", 1, 1);
        $this->assertTrue(isset($users[0]));
        $this->assertFalse(isset($users[1]));
        $this->assertInternalType('array', $users[0]);
        $users[1] = [];
        $this->assertInternalType('array', $users[1]);
        $this->assertSame([], $users[1]);
        $this->assertTrue(isset($users[1]));
        unset($users[1]);
        $this->assertFalse(isset($users[1]));
        VCR::eject();
    }
}
