<?php

namespace Crew\Unsplash;

/**
 * Class Collection
 * @package Crew\Unsplash
 * @property int $id
 */
class Collection extends Endpoint
{
    private $photos;

    /**
     * Retrieve all collections for a given page
     *
     * @param  integer $page     Page from which the collections need to be retrieved
     * @param  integer $per_page Number of elements on a page
     * @return ArrayObject of Collections
     */
    public static function all($page = 1, $per_page = 10)
    {
        $collections = self::get(
            "/collections",
            ['query' => ['page' => $page, 'per_page' => $per_page]]
        );

        $collectionsArray = self::getArray($collections->getBody(), get_called_class());

        return new ArrayObject($collectionsArray, $collections->getHeaders());
    }

    /**
     * Retrieve a specific collection
     *
     * @param  int $id Id of the collection
     * @return Collection
     */
    public static function find($id)
    {
        $collection = json_decode(self::get("/collections/{$id}")->getBody(), true);

        return new self($collection);
    }

    /**
     * Retrieve all the photos for a specific collection
     * Returns an ArrayObject that contains Photo objects.
     *
     * @return ArrayObject of Photo
     */
    public function photos($page = 1, $per_page = 10)
    {
        if (! isset($this->photos["{$page}-{$per_page}"])) {
            $photos = self::get(
                "/collections/{$this->id}/photos",
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


    /**
     * Delete user's collection
     * @return void
     */
    public function destroy()
    {
        self::delete("/collections/{$this->id}");
    }

    /**
     * Add a photo in user's collection
     * @param int $photo_id photo id from photo to add
     * @return array [photo, collection]
     */
    public function add($photo_id)
    {
        $photo_and_collection = json_decode(
            self::post(
                "/collections/{$this->id}/add",
                ['query' => ['photo_id' => $photo_id]]
            )->getBody(),
            true
        );

        # Reset
        $this->photos = [];
    }

    /**
     * Remove a photo from a collection
     * @param  int $photo_id photo id from photo to remove
     * @return void
     */
    public function remove($photo_id)
    {
        self::delete(
            "/collections/{$this->id}/remove",
            ['query' => ['photo_id' => $photo_id]]
        );
        
        # Reset
        $this->photos = [];
    }

    /**
     * Create a new collection. The user needs to connect
     * their account and authorize the write_collections permission scope.
     *
     * @param  string $title Collection's title
     * @param  string $description Collection's description
     * @param  boolean $private Whether to make this collection private
     * @return Photo
     */
    public static function create($title, $description = '', $private = false)
    {
        $collection = json_decode(
            self::post(
                "/collections", [
                    'query' => [
                        'title' => $title,
                        'description' => $description,
                        'private' => $private
                    ]
                ]
            )->getBody(),
            true
        );

        return new self($collection);
    }

    /**
     * Update specific parameters on a user's collection
     *
     * @param  array $parameters Array containing the parameters to update
     * @return void
     */
    public function update(array $parameters)
    {
        $collection = json_decode(
            self::put(
                "/collections/{$this->id}",
                ['query' => $parameters]
            )->getBody(),
            true
        );

        parent::update($parameters);
    }

    /**
     * Get a page of  featured collections
     * @param int $page - page to retrieve
     * @param int $per_page - num per page
     * @return ArrayObject
     */
    public static function featured($page = 1, $per_page = 10)
    {
        $collections = self::get("/collections/featured", ['query' => ['page' => $page, 'per_page' => $per_page]]);
        $collectionsArray = self::getArray($collections->getBody(), get_called_class());
        return new ArrayObject($collectionsArray, $collections->getHeaders());
    }

    /**
     * Get related collections to current collection
     * @return ArrayObject
     */
    public function related()
    {
        $collections = self::get("/collections/{$this->id}/related");
        $collectionsArray = self::getArray($collections->getBody(), get_called_class());
        return new ArrayObject($collectionsArray, $collections->getHeaders());
    }
}