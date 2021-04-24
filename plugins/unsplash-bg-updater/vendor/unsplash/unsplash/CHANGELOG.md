## 2.4.4 - 2019-02-5
### Added
- `rateLimitRemaining` method added to `Unsplash\ArrayObject` class to fetch the remaining rate limit (thanks @KevinBatdorf)

## 2.4.3 - 2018-03-30
### Added
- Relax dependency for guzzle to include 6.3.x (https://github.com/unsplash/unsplash-php/pull/88)
- Add `__isset` method to `Endpoint` (https://github.com/unsplash/unsplash-php/pull/89)

## 2.4.2 - 2018-02-28
### Added
- Added support for `orientation` and `collections` filters to photo search.

## 2.4.1 - 2017-12-18
### Updated
- Update dependecy version (>= 1.0.3) on oauth2-unsplash

## 2.4.0 - 2017-12-11
### Removed
- Remove deprecated `category` parameters

### Updated
- Support for tracking photo downloads as per updated API guidelines

## 2.3.4 - 2017-10-06
### Updated
- Update dependecy version on oauth2-client (>= 1.4.2)

## 2.3.3 - 2017-10-04
### Updated
- Update dependecy version on oauth2-unsplash

## 2.2.1 - 2016-09-04
### Fix
- The parameters order was breaking code using older version of the package

## 2.2.0 - 2016-08-21
### Added
- Curated photos endpoint (thanks @janhenckens #40)

## 2.1.0 - 2016-08-02
### Updated
- OAuth2-Client package
- Migrate CI to travis

## 2.0.0 - 2016-04-14
#### Added
- New enpoints for user's collection

## 1.2.0 - 2016-04-05
#### Added
- New enpoints for collection

## 1.1.2 - 2016-02-23
### Added
- New badge in README to keep track of dependencies

### Updated
- New version of OAuth2-Client package (thanks @zembrowski #26)

## 1.1.1 - 2016-02-22
### Added
- New method to retrieve the number of element in collection

## 1.1.0 - 2016-02-09
### Updated
- New major version of OAuth2-Client package (thanks @zembrowski #23)

## 1.0.4 - 2015-10-20
### Added
- New endpoint to retrieve photos a user liked
- New endpoints to like and unlike photos on the behalf of the current user

## 1.0.3 - 2015-09-22
### Added
- New endpoint to retrieve a random photo (thanks @DannyWeeks #18)

## 1.0.2 - 2015-09-03
- Improve phpDoc block (thanks @freezy-sk #15)
### Fixed
- Headers were wrongly parsed when requesting total pages (thanks @freezy-sk #13)

## 1.0.1 - 2015-08-26
### Added
- Include stats endpoints

## 1.0.0 - 2015-07-30
- Launch
