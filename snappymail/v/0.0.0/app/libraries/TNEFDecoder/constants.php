<?php

namespace TNEFDecoder;

/**
  * SquirrelMail TNEF Decoder Plugin
  *
  * Copyright (c) 2010- Paul Lesniewski <paul@squirrelmail.org>
  * Copyright (c) 2003  Bernd Wiegmann <bernd@wib-software.de>
  * Copyright (c) 2002  Graham Norburys <gnorbury@bondcar.com>
  *
  * Licensed under the GNU GPL. For full terms see the file COPYING.
  *
  * @package plugins
  * @subpackage tnef_decoder
  *
  */

define("TNEF_SIGNATURE",      0x223e9f78);
define("TNEF_LVL_MESSAGE",    0x01);
define("TNEF_LVL_ATTACHMENT", 0x02);

define("TNEF_TRIPLES", 0x00000000);
define("TNEF_STRING",  0x00010000);
define("TNEF_TEXT",    0x00020000);
define("TNEF_DATE",    0x00030000);
define("TNEF_SHORT",   0x00040000);
define("TNEF_LONG",    0x00050000);
define("TNEF_BYTE",    0x00060000);
define("TNEF_WORD",    0x00070000);
define("TNEF_DWORD",   0x00080000);
define("TNEF_MAX",     0x00090000);

define("TNEF_AIDOWNER",          TNEF_LONG    | 0x0008);
define("TNEF_AREQUESTRES",       TNEF_SHORT   | 0x0009);
define("TNEF_AFROM",             TNEF_TRIPLES | 0x8000);
define("TNEF_ASUBJECT",          TNEF_STRING  | 0x8004);
define("TNEF_ADATESENT",         TNEF_DATE    | 0x8005);
define("TNEF_ADATERECEIVED",     TNEF_DATE    | 0x8006);
define("TNEF_ASTATUS",           TNEF_BYTE    | 0x8007);
define("TNEF_AMCLASS",           TNEF_WORD    | 0x8008);
define("TNEF_AMESSAGEID",        TNEF_STRING  | 0x8009);
define("TNEF_ABODYTEXT",         TNEF_TEXT    | 0x800c);
define("TNEF_APRIORITY",         TNEF_SHORT   | 0x800d);
define("TNEF_ATTACHDATA",        TNEF_BYTE    | 0x800f);
define("TNEF_AFILENAME",         TNEF_STRING  | 0x8010);
define("TNEF_ATTACHMETAFILE",    TNEF_BYTE    | 0x8011);
define("TNEF_AATTACHCREATEDATE", TNEF_DATE    | 0x8012);
define("TNEF_AATTACHMODDATE",    TNEF_DATE    | 0x8013);
define("TNEF_ADATEMODIFIED",     TNEF_DATE    | 0x8020);
define("TNEF_ARENDDATA",         TNEF_BYTE    | 0x9002);
define("TNEF_AMAPIPROPS",        TNEF_BYTE    | 0x9003);
define("TNEF_AMAPIATTRS",        TNEF_BYTE    | 0x9005);
define("TNEF_AVERSION",          TNEF_DWORD   | 0x9006);
define("TNEF_AOEMCODEPAGE",      TNEF_BYTE    | 0x9007);

define("TNEF_MAPI_NULL",           0x0001);
define("TNEF_MAPI_SHORT",          0x0002);
define("TNEF_MAPI_INT",            0x0003);
define("TNEF_MAPI_FLOAT",          0x0004);
define("TNEF_MAPI_DOUBLE",         0x0005);
define("TNEF_MAPI_CURRENCY",       0x0006);
define("TNEF_MAPI_APPTIME",        0x0007);
define("TNEF_MAPI_ERROR",          0x000a);
define("TNEF_MAPI_BOOLEAN",        0x000b);
define("TNEF_MAPI_OBJECT",         0x000d);
define("TNEF_MAPI_INT8BYTE",       0x0014);
define("TNEF_MAPI_STRING",         0x001e);
define("TNEF_MAPI_UNICODE_STRING", 0x001f);
define("TNEF_MAPI_SYSTIME", 0x0040);
define("TNEF_MAPI_CLSID", 0x0048);
define("TNEF_MAPI_BINARY", 0x0102);

define("TNEF_MAPI_MV_FLAG", 0x1000);
define("TNEF_MAPI_NAMED_TYPE_ID", 0x0000);
define("TNEF_MAPI_NAMED_TYPE_STRING", 0x0001);

define("TNEF_MAPI_SUBJECT_PREFIX", 0x003D);
define("TNEF_MAPI_SENT_REP_NAME", 0x0042);
define("TNEF_MAPI_ORIGINAL_AUTHOR", 0x004D);
define("TNEF_MAPI_SENT_REP_ADDRTYPE", 0x0064);
define("TNEF_MAPI_SENT_REP_EMAIL_ADDR", 0x0065);
define("TNEF_MAPI_CONVERSATION_TOPIC", 0x0070);
define("TNEF_MAPI_SENDER_NAME", 0x0c1A);
define("TNEF_MAPI_SENDER_ADDRTYPE", 0x0c1E);
define("TNEF_MAPI_SENDER_EMAIL_ADDRESS", 0x0c1F);
define("TNEF_MAPI_NORMALIZED_SUBJECT", 0x0E1D);
define("TNEF_MAPI_ATTACH_SIZE", 0x0E20);
define("TNEF_MAPI_ATTACH_NUM", 0x0E21);
define("TNEF_MAPI_ACCESS_LEVEL", 0x0FF7);
define("TNEF_MAPI_MAPPING_SIGNATURE", 0x0FF8);
define("TNEF_MAPI_RECORD_KEY", 0x0FF9);
define("TNEF_MAPI_STORE_RECORD_KEY", 0x0FFA);
define("TNEF_MAPI_STORE_ENTRY_ID", 0x0FFB);
define("TNEF_MAPI_OBJECT_TYPE", 0x0FFE);
define("TNEF_MAPI_BODY", 0x1000);
define("TNEF_MAPI_RTF_SYNC_BODY_TAG", 0x1008);
define("TNEF_MAPI_RTF_COMPRESSED", 0x1009);
define("TNEF_MAPI_BODY_HTML", 0x1013);
define("TNEF_MAPI_NATIVE_BODY", 0x1016);
define("TNEF_MAPI_DISPLAY_NAME", 0x3001);
define("TNEF_MAPI_CREATION_TIME", 0x3007);
define("TNEF_MAPI_MODIFICATION_TIME", 0x3008);
define("TNEF_MAPI_ATTACH_DATA", 0x3701);
define("TNEF_MAPI_ATTACH_ENCODING", 0x3702);
define("TNEF_MAPI_ATTACH_EXTENSION", 0x3703);
define("TNEF_MAPI_ATTACH_METHOD", 0x3705);
define("TNEF_MAPI_ATTACH_LONG_FILENAME", 0x3707);
define("TNEF_MAPI_RENDERING_POSITION", 0x370B);
define("TNEF_MAPI_ATTACH_MIME_TAG", 0x370E);
define("TNEF_MAPI_ACCOUNT", 0x3A00);
define("TNEF_MAPI_GENERATION", 0x3A05);
define("TNEF_MAPI_GIVEN_NAME", 0x3A06);
define("TNEF_MAPI_BUSINESS_TEL_NUMBER", 0x3A08);
define("TNEF_MAPI_HOME_TEL_NUMBER", 0x3A09);
define("TNEF_MAPI_INITIALS", 0x3A0A);
define("TNEF_MAPI_KEYWORDS", 0x3A0B);
define("TNEF_MAPI_LANGUAGE", 0x3A0C);
define("TNEF_MAPI_LOCATION", 0x3A0D);
define("TNEF_MAPI_SURNAME", 0x3A11);
define("TNEF_MAPI_POSTAL_ADDRESS", 0x3A15);
define("TNEF_MAPI_COMPANY_NAME", 0x3A16);
define("TNEF_MAPI_TITLE", 0x3A17);
define("TNEF_MAPI_DEPARTMENT_NAME", 0x3A18);
define("TNEF_MAPI_OFFICE_LOCATION", 0x3A19);
define("TNEF_MAPI_PRIMARY_TEL_NUMBER", 0x3A1A);
define("TNEF_MAPI_BUSINESS2_TEL_NUMBER", 0x3A1B);
define("TNEF_MAPI_MOBILE_TEL_NUMBER", 0x3A1C);
define("TNEF_MAPI_RADIO_TEL_NUMBER", 0x3A1D);
define("TNEF_MAPI_CAR_TEL_NUMBER", 0x3A1E);
define("TNEF_MAPI_OTHER_TEL_NUMBER",     0x3A1F);
define("TNEF_MAPI_PAGER_TEL_NUMBER",     0x3A21);
define("TNEF_MAPI_PRIMARY_FAX_NUMBER",   0x3A23);
define("TNEF_MAPI_BUSINESS_FAX_NUMBER",  0x3A24);
define("TNEF_MAPI_HOME_FAX_NUMBER",      0x3A25);
define("TNEF_MAPI_COUNTRY",              0x3A26);
define("TNEF_MAPI_LOCALTY",              0x3A27);
define("TNEF_MAPI_STATE_OR_PROVINCE",    0x3A28);
define("TNEF_MAPI_STREET_ADDRESS",       0x3A29);
define("TNEF_MAPI_POSTAL_CODE",          0x3A2A);
define("TNEF_MAPI_POST_OFFICE_BOX",      0x3A2B);
define("TNEF_MAPI_TELEX_NUMBER",         0x3A2C);
define("TNEF_MAPI_ISDN_NUMBER",          0x3A2D);
define("TNEF_MAPI_ASSISTANT_TEL_NUMBER", 0x3A2E);
define("TNEF_MAPI_HOME2_TEL_NUMBER",     0x3A2F);
define("TNEF_MAPI_ASSISTANT",            0x3A30);
define("TNEF_MAPI_MIDDLE_NAME",          0x3A44);
define("TNEF_MAPI_DISPLAYNAME_PREFIX",   0x3A45);
define("TNEF_MAPI_PROFESSION",           0x3A46);
define("TNEF_MAPI_SPOUSE_NAME",          0x3A48);
define("TNEF_MAPI_MANAGER_NAME",         0x3A4E);
define("TNEF_MAPI_NICKNAME",             0x3A4F);
define("TNEF_MAPI_PERSONAL_HOME_PAGE",   0x3A50);
define("TNEF_MAPI_BUSINESS_HOME_PAGE",   0x3A51);
define("TNEF_MAPI_CONTACT_EMAIL_ADDR",   0x3A56);
define("TNEF_MAPI_HOME_ADDR_CITY",       0x3A59);
define("TNEF_MAPI_HOME_ADDR_COUNTRY",    0x3A5A);
define("TNEF_MAPI_HOME_ADDR_ZIP",        0x3A5B);
define("TNEF_MAPI_HOME_ADDR_STATE",      0x3A5C);
define("TNEF_MAPI_HOME_ADDR_STREET",     0x3A5D);
define("TNEF_MAPI_HOME_ADDR_PO_BOX",     0x3A5E);
define("TNEF_MAPI_OTHER_ADDR_CITY",      0x3A5F);
define("TNEF_MAPI_OTHER_ADDR_COUNTRY",   0x3A60);
define("TNEF_MAPI_OTHER_ADDR_ZIP",       0x3A61);
define("TNEF_MAPI_OTHER_ADDR_STATE",     0x3A62);
define("TNEF_MAPI_OTHER_ADDR_STREET",    0x3A63);
define("TNEF_MAPI_OTHER_ADDR_PO_BOX",    0x3A64);

define("TNEF_MAPI_OTHER_HOME_PAGE",      0x804F);
define("TNEF_MAPI_EMAIL1_DISPLAY",       0x8080);
define("TNEF_MAPI_EMAIL1_TRANSPORT",     0x8082);
define("TNEF_MAPI_EMAIL1_EMAIL",         0x8083);
define("TNEF_MAPI_EMAIL1_EMAIL2",        0x8084);
define("TNEF_MAPI_EMAIL2_DISPLAY",       0x8090);
define("TNEF_MAPI_EMAIL2_TRANSPORT",     0x8092);
define("TNEF_MAPI_EMAIL2_EMAIL",         0x8093);
define("TNEF_MAPI_EMAIL2_EMAIL2",        0x8094);
define("TNEF_MAPI_EMAIL3_DISPLAY",       0x80A0);
define("TNEF_MAPI_EMAIL3_TRANSPORT",     0x80A2);
define("TNEF_MAPI_EMAIL3_EMAIL",         0x80A3);
define("TNEF_MAPI_EMAIL3_EMAIL2",        0x80A4);



// used in RTF
//
define("CRTF_UNCOMPRESSED",          0x414c454d);
define("CRTF_COMPRESSED",            0x75465a4c);


// used in VCARD
//
define ("EMAIL_DISPLAY",       1);
define ("EMAIL_TRANSPORT",     2);
define ("EMAIL_EMAIL",         3);
define ("EMAIL_EMAIL2",        4);

define ("ADDRESS_STREET",      "Street");
define ("ADDRESS_ZIP",         "Zip");
define ("ADDRESS_CITY",        "City");
define ("ADDRESS_COUNTRY",     "Country");
define ("ADDRESS_STATE",       "State");
define ("ADDRESS_PO_BOX",      "PO Box");
