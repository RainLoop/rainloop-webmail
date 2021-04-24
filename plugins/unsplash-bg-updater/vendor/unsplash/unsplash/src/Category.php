<?php

namespace Crew\Unsplash;

/**
 * Class Category
 * @package Crew\Unsplash
 * @property int $id
 * @deprecated
 * @see \Crew\Unsplash\Collection
 */
class Category extends Endpoint
{
    private $photos;

    /**
     * Retrieve the a Category object from the id specified
     *
     * @param integer $id Id of the category to find
     * @return Category
     * @deprecated
     * @see Collection::find()
     */
    public static function find($id)
    {
        $category = json_decode(self::get("/categories/{$id}")->getBody(), true);

        return new self($category);
    }

    /**
     * Retrieve all the categories on a specific page.
     * Returns an ArrayObject that contains Category objects.
     *
     * @param integer $page Page from which the categories need to be retrieved
     * @param integer $per_page Number of elements on a page
     * @return ArrayObject of Category objects.
     * @deprecated
     * @see Collection::all()
     */
    public static function all($page = 1, $per_page = 10)
    {
        $categories = self::get(
            "/categories",
            ['query' => ['page' => $page, 'per_page' => $per_page]]
        );

        $categoriesArray = self::getArray($categories->getBody(), get_called_class());

        return new ArrayObject($categoriesArray, $categories->getHeaders());
    }

    /**
     * Retrieve all the photos for a specific category on a specific page.
     * Returns an ArrayObject that contains Photo objects.
     *
     * @param integer $page Page from which the photos need to be retrieve
     * @param integer $per_page Number of element in a page
     * @return ArrayObject of Photo objects.
     * @deprecated
     * @see Collection::photos()
     */
    public function photos($page = 1, $per_page = 10)
    {
        if (! isset($this->photos["{$page}-{$per_page}"])) {
            $photos = self::get(
                "/categories/{$this->id}/photos",
                ['query' => ['page' => $page, 'per_page' => $per_page]]
            );

            $this->photos["{$page}-{$per_page}"] = [
                'body' => self::getArray($photos->getBody(), __NAMESPACE__.'\\Photo'),
                'headers' => $photos->getHeaders()
            ];
        }

        return new ArrayObject(
            $this->photos["{$page}-{$per_page}"]['body'],
            $this->photos["{$page}-{$per_page}"]['headers']
        );
    }
}