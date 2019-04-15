<?php

namespace Crew\Unsplash\Tests;

use \Crew\Unsplash as Unsplash;
use \VCR\VCR;

/**
 * Class CuratedBatchTest
 * @package Crew\Unsplash\Tests
 */
class CuratedBatchTest extends BaseTest
{

    public function testFindCuratedBatch()
    {
        VCR::insertCassette('curated_batches.yml');
        $curatedBatch = Unsplash\CuratedBatch::find(68);
        VCR::eject();

        $this->assertEquals('68', $curatedBatch->id);
    }

    /**
     * @expectedException \Crew\Unsplash\Exception
     * @expectedExceptionCode 404
     */
    public function testErrorOnNoCategory()
    {
        VCR::insertCassette('categories.yml');
        Unsplash\CuratedBatch::find(300);
        VCR::eject();
    }

    public function testFindAllCuratedBatches()
    {
        VCR::insertCassette('curated_batches.yml');
        $curatedBatches = Unsplash\CuratedBatch::all();
        VCR::eject();

        $this->assertEquals(10, $curatedBatches->count());
    }

    public function testFindCuratedBatchPhotos()
    {
        VCR::insertCassette('curated_batches.yml');
        $curatedBatch = Unsplash\CuratedBatch::find(68);
        $photos = $curatedBatch->photos();
        VCR::eject();

        $this->assertEquals(10, $photos->count());
    }
}
