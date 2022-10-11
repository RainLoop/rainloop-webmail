# Plugin Change-Password-Docker-Mailserver
Plugin that adds functionality to change the email account password (docker-mailserver).

## ▶️ [Plugin Configuration](#configuration)


| URL                       | Description                                                                                              |
|---------------------------|----------------------------------------------------------------------------------------------------------|
| `SSH Docker Host`         | Host running docker-mailserver docker container                                                          |
| `SSH Port`                | SSH Port  of host running docker-mailserver docker container                                             |
| `SSH User`                | For security reasons, you should use unprivileged user with sudoers access to docker-mailserver setup.sh |
| `SSH Password`            | SSH password                                                                                             |
| `setup.sh Location`       | Full path location of setup.sh from docker-mailserver                                                    |
| `Check execution success` | Enable or disable verification of setup.sh execution                                                     |
| `Allowed emails`          | Allowed emails, space as delimiter, wildcard supported                                                   |

## Authors
[VanVan](https://github.com/VanVan)