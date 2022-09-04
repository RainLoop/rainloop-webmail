<?php

namespace Crew\Unsplash\Tests;

use \Crew\Unsplash as Unsplash;
use \VCR\VCR;

/**
 * Class StatTest
 * @package Crew\Unsplash\Tests
 */
class StatTest extends BaseTest
{
    /**
     * @var array
     */
    protected $total = [];

    public function setUp()
    {
        parent::setUp();

        $connection = new Unsplash\Connection($this->provider, $this->accessToken);
        Unsplash\HttpClient::$connection = $connection;

        $this->total = [
            "photo_downloads" => 189,
            "batch_downloads" => 31
        ];
    }

    public function testFindTotalStats()
    {
        VCR::insertCassette('stats.yml');

        $totalStats = Unsplash\Stat::total();

        VCR::eject();

        $this->assertEquals($this->total['photo_downloads'], $totalStats->photo_downloads);
        $this->assertEquals($this->total['batch_downloads'], $totalStats->batch_downloads);
    }
}
