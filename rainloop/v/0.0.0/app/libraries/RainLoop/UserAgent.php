<?php

namespace RainLoop;

class UserAgent
{
	protected static $mobileHeaders = array(
		'HTTP_ACCEPT'                  => array(
			'application/x-obml2d',
			'application/vnd.rim.html',
			'text/vnd.wap.wml',
			'application/vnd.wap.xhtml+xml'
		),
		'HTTP_X_WAP_PROFILE'           => null,
		'HTTP_X_WAP_CLIENTID'          => null,
		'HTTP_WAP_CONNECTION'          => null,
		'HTTP_PROFILE'                 => null,
		'HTTP_X_OPERAMINI_PHONE_UA'    => null,
		'HTTP_X_NOKIA_GATEWAY_ID'      => null,
		'HTTP_X_ORANGE_ID'             => null,
		'HTTP_X_VODAFONE_3GPDPCONTEXT' => null,
		'HTTP_X_HUAWEI_USERID'         => null,
		'HTTP_UA_OS'                   => null,
		'HTTP_X_MOBILE_GATEWAY'        => null,
		'HTTP_X_ATT_DEVICEID'          => null,
		'HTTP_UA_CPU'                  => array('ARM'),
	);

	protected static $tabletDevices = array(
		'iPad'        => 'ipad',
		'Nexus'       => 'android.*nexus[\s]+(7|9|10)',
		'Google'      => 'android.*pixel c',
		'Samsung'     => 'samsung.*tablet|galaxy.*tab|sc-01c|gt-p1000|gt-p1003|gt-p1010|gt-p3105|gt-p6210|gt-p6800|gt-p6810|gt-p7100|gt-p7300|gt-p7310|gt-p7500|gt-p7510|sch-i800|sch-i815|sch-i905|sgh-i957|sgh-i987|sgh-t849|sgh-t859|sgh-t869|sph-p100|gt-p3100|gt-p3108|gt-p3110|gt-p5100|gt-p5110|gt-p6200|gt-p7320|gt-p7511|gt-n8000|gt-p8510|sgh-i497|sph-p500|sgh-t779|sch-i705|sch-i915|gt-n8013|gt-p3113|gt-p5113|gt-p8110|gt-n8010|gt-n8005|gt-n8020|gt-p1013|gt-p6201|gt-p7501|gt-n5100|gt-n5105|gt-n5110|shv-e140k|shv-e140l|shv-e140s|shv-e150s|shv-e230k|shv-e230l|shv-e230s|shw-m180k|shw-m180L|SHW-M180S|SHW-M180W|SHW-M300W|SHW-M305W|SHW-M380K|SHW-M380S|SHW-M380W|SHW-M430W|SHW-M480K|SHW-M480S|SHW-M480W|SHW-M485W|SHW-M486W|SHW-M500W|GT-I9228|SCH-P739|SCH-I925|GT-I9200|GT-P5200|GT-P5210|GT-P5210X|SM-T311|SM-T310|SM-T310X|SM-T210|SM-T210R|SM-T211|SM-P600|SM-P601|SM-P605|SM-P900|SM-P901|SM-T217|SM-T217A|SM-T217S|SM-P6000|SM-T3100|SGH-I467|XE500|SM-T110|GT-P5220|GT-I9200X|GT-N5110X|GT-N5120|SM-P905|SM-T111|SM-T2105|SM-T315|SM-T320|SM-T320X|SM-T321|SM-T520|SM-T525|SM-T530NU|SM-T230NU|SM-T330NU|SM-T900|XE500T1C|SM-P605V|SM-P905V|SM-T337V|SM-T537V|SM-T707V|SM-T807V|SM-P600X|SM-P900X|SM-T210X|SM-T230|SM-T230X|SM-T325|GT-P7503|SM-T531|SM-T330|SM-T530|SM-T705|SM-T705C|SM-T535|SM-T331|SM-T800|SM-T700|SM-T537|SM-T807|SM-P907A|SM-T337A|SM-T537A|SM-T707A|SM-T807A|SM-T237|SM-T807P|SM-P607T|SM-T217T|SM-T337T|SM-T807T|SM-T116NQ|SM-T116BU|SM-P550|SM-T350|SM-T550|SM-T9000|SM-P9000|SM-T705Y|SM-T805|GT-P3113|SM-T710|SM-T810|SM-T815|SM-T360|SM-T533|SM-T113|SM-T335|SM-T715|SM-T560|SM-T670|SM-T677|SM-T377|SM-T567|SM-T357T|SM-T555|SM-T561|SM-T713|SM-T719|SM-T813|SM-T819|SM-T580|SM-T355Y?|SM-T280|SM-T817A|SM-T820|SM-W700|SM-P580|SM-T587|SM-P350|SM-P555M|SM-P355M|SM-T113NU|SM-T815Y|SM-T585|SM-T285|SM-T825|SM-W708|SM-T835|SM-T830|SM-T837V|SM-T720|SM-T510|SM-T387V', // SCH-P709|SCH-P729|SM-T2558|GT-I9205 - Samsung Mega - treat them like a regular phone.
		'Kindle'      => 'kindle|silk.*accelerated|android.*\b(kfot|kftt|kfjwi|kfjwa|kfote|kfsowi|kfthwi|kfthwa|kfapwi|kfapwa|wfjwae|kfsawa|kfsawi|kfaswi|kfarwi|kffowi|kfgiwi|kfmewi)\b|android.*silk/[0-9.]+ like chrome/[0-9.]+ (?!mobile)',
		'Surface'     => 'windows nt [0-9.]+; arm;.*(tablet|armbjs)',
		'HP'          => 'hp slate (7|8|10)|hp elitepad 900|hp-tablet|elitebook.*touch|hp 8|slate 21|hp slatebook 10',
		'Asus'        => '^.*padfone((?!mobile).)*$|transformer|tf101|tf101g|tf300t|tf300tg|tf300tl|tf700t|tf700kl|tf701t|tf810c|me171|me301t|me302c|me371mg|me370t|me372mg|me172v|me173x|me400c|slider sl101|\bk00f\b|\bk00c\b|\bk00e\b|\bk00l\b|tx201la|me176c|me102a|\bm80ta\b|me372cl|me560cg|me372cg|me302kl| k010 | k011 | k017 | k01e |me572c|me103k|me170c|me171c|\bme70c\b|me581c|me581cl|me8510c|me181c|p01y|po1ma|p01z|\bp027\b|\bp024\b|\bp00c\b',
		'BlackBerry'  => 'playbook|rim tablet',
		'HTC'         => 'htc_flyer_p512|htc flyer|htc jetstream|htc-p715a|htc evo view 4g|pg41200|pg09410',
		'Motorola'    => 'xoom|sholest|mz615|mz605|mz505|mz601|mz602|mz603|mz604|mz606|mz607|mz608|mz609|mz615|mz616|mz617',
		'Nook'        => 'android.*nook|nookcolor|nook browser|bnrv200|bnrv200a|bntv250|bntv250a|bntv400|bntv600|logicpd zoom2',
		'Acer'        => 'android.*; \b(a100|a101|a110|a200|a210|a211|a500|a501|a510|a511|a700|a701|w500|w500p|w501|w501p|w510|w511|w700|g100|g100w|b1-a71|b1-710|b1-711|a1-810|a1-811|a1-830)\b|w3-810|\ba3-a10\b|\ba3-a11\b|\ba3-a20\b|\ba3-a30',
		'Toshiba'     => 'android.*(at100|at105|at200|at205|at270|at275|at300|at305|at1s5|at500|at570|at700|at830)|toshiba.*folio',
		'LG'          => '\bl-06c|lg-v909|lg-v900|lg-v700|lg-v510|lg-v500|lg-v410|lg-v400|lg-vk810\b',
		'Fujitsu'     => 'android.*\b(f-01d|f-02f|f-05e|f-10d|m532|q572)\b',
		'Prestigio'   => 'pmp3170b|pmp3270b|pmp3470b|pmp7170b|pmp3370b|pmp3570c|pmp5870c|pmp3670b|pmp5570c|pmp5770d|pmp3970b|pmp3870c|pmp5580c|pmp5880d|pmp5780d|pmp5588c|pmp7280c|pmp7280c3g|pmp7280|pmp7880d|pmp5597d|pmp5597|pmp7100d|per3464|per3274|per3574|per3884|per5274|per5474|pmp5097cpro|pmp5097|pmp7380d|pmp5297c|pmp5297c_quad|pmp812e|pmp812e3g|pmp812f|pmp810e|pmp880td|pmt3017|pmt3037|pmt3047|pmt3057|pmt7008|pmt5887|pmt5001|pmt5002',
		'Lenovo'      => 'lenovo tab|idea(tab|pad)( a1|a10| k1|)|thinkpad([ ]+)?tablet|yt3-850m|yt3-x90l|yt3-x90f|yt3-x90x|lenovo.*(s2109|s2110|s5000|s6000|k3011|a3000|a3500|a1000|a2107|a2109|a1107|a5500|a7600|b6000|b8000|b8080)(-|)(fl|f|hv|h|)|tb-x103f|tb-x304x|tb-x304f|tb-x304l|tb-x505f|tb-x505l|tb-x505x|tb-x605f|tb-x605l|tb-8703f|tb-8703x|tb-8703n|tb-8704n|tb-8704f|tb-8704x|tb-8704v|tb-7304f|tb-7304i|tb-7304x|tab2a7-10f|tab2a7-20f|tb2-x30l|yt3-x50l|yt3-x50f|yt3-x50m|yt-x705f|yt-x703f|yt-x703l|yt-x705l|yt-x705x|tb2-x30f|tb2-x30l|tb2-x30m|a2107a-f|a2107a-h|tb3-730f|tb3-730m|tb3-730X|TB-7504F|TB-7504X',
		'Dell'        => 'venue 11|venue 8|venue 7|dell streak 10|dell streak 7',
		'Yarvik'      => 'android.*\b(tab210|tab211|tab224|tab250|tab260|tab264|tab310|tab360|tab364|tab410|tab411|tab420|tab424|tab450|tab460|tab461|tab464|tab465|tab467|tab468|tab07-100|tab07-101|tab07-150|tab07-151|tab07-152|tab07-200|tab07-201-3g|tab07-210|tab07-211|tab07-212|tab07-214|tab07-220|tab07-400|tab07-485|tab08-150|tab08-200|tab08-201-3g|tab08-201-30|tab09-100|tab09-211|tab09-410|tab10-150|tab10-201|tab10-211|tab10-400|tab10-410|tab13-201|tab274euk|tab275euk|tab374euk|tab462euk|tab474euk|tab9-200)\b',
		'Medion'      => 'android.*\boyo\b|life.*(p9212|p9514|p9516|s9512)|lifetab',
		'Arnova'      => '97g4|an10g2|an7bg3|an7fg3|an8g3|an8cg3|an7g3|an9g3|an7dg3|an7dg3st|an7dg3childpad|an10bg3|an10bg3dt|an9g2',
		'Intenso'     => 'inm8002kp|inm1010fp|inm805nd|intenso tab|tab1004',
		'IRU'         => 'm702pro',
		'Megafon'     => 'megafon v9|\bzte v9\b|android.*\bmt7a\b',
		'Eboda'       => 'e-boda (supreme|impresspeed|izzycomm|essential)',
		'AllView'     => 'allview.*(viva|alldro|city|speed|all tv|frenzy|quasar|shine|tx1|ax1|ax2)',
		'Archos'      => '\b(101g9|80g9|a101it)\b|qilive 97r|archos5|\barchos (70|79|80|90|97|101|familypad|)(b|c|)(g10| cobalt| titanium(hd|)| xenon| neon|xsk| 2| xs 2| platinum| carbon|gamepad)\b',
		'Ainol'       => 'novo7|novo8|novo10|novo7aurora|novo7basic|novo7paladin|novo9-spark',
		'NokiaLumia'  => 'lumia 2520',
		'Sony'        => 'sony.*tablet|xperia tablet|sony tablet s|so-03e|sgpt12|sgpt13|sgpt114|sgpt121|sgpt122|sgpt123|sgpt111|sgpt112|sgpt113|sgpt131|sgpt132|sgpt133|sgpt211|sgpt212|sgpt213|sgp311|sgp312|sgp321|ebrd1101|ebrd1102|ebrd1201|sgp351|sgp341|sgp511|sgp512|sgp521|sgp541|sgp551|sgp621|sgp641|sgp612|sot31|sgp771|sgp611|sgp612|sgp712',
		'Philips'     => '\b(pi2010|pi3000|pi3100|pi3105|pi3110|pi3205|pi3210|pi3900|pi4010|pi7000|pi7100)\b',
		'Cube'        => 'android.*(k8gt|u9gt|u10gt|u16gt|u17gt|u18gt|u19gt|u20gt|u23gt|u30gt)|cube u8gt',
		'Coby'        => 'mid1042|mid1045|mid1125|mid1126|mid7012|mid7014|mid7015|mid7034|mid7035|mid7036|mid7042|mid7048|mid7127|mid8042|mid8048|mid8127|mid9042|mid9740|mid9742|mid7022|mid7010',
		'MID'         => 'm9701|m9000|m9100|m806|m1052|m806|t703|mid701|mid713|mid710|mid727|mid760|mid830|mid728|mid933|mid125|mid810|mid732|mid120|mid930|mid800|mid731|mid900|mid100|mid820|mid735|mid980|mid130|mid833|mid737|mid960|mid135|mid860|mid736|mid140|mid930|mid835|mid733|mid4x10',
		'MSI'         => 'msi \b(primo 73k|primo 73l|primo 81l|primo 77|primo 93|primo 75|primo 76|primo 73|primo 81|primo 91|primo 90|enjoy 71|enjoy 7|enjoy 10)\b',
		'SMiT'        => 'android.*(\bmid\b|mid-560|mtv-t1200|mtv-pnd531|mtv-p1101|mtv-pnd530)',
		'RockChip'    => 'android.*(rk2818|rk2808a|rk2918|rk3066)|rk2738|rk2808a',
		'Fly'         => 'iq310|fly vision',
		'bq'          => 'android.*(bq)?.*\b(elcano|curie|edison|maxwell|kepler|pascal|tesla|hypatia|platon|newton|livingstone|cervantes|avant|aquaris ([e|m]10|m8))\b|maxwell.*lite|maxwell.*plus',
		'Huawei'      => 'mediapad|mediapad 7 youth|ideos s7|s7-201c|s7-202u|s7-101|s7-103|s7-104|s7-105|s7-106|s7-201|s7-slim|m2-a01l|bah-l09|bah-w09|ags-l09|cmr-al19',
		'Nec'         => '\bn-06d|\bn-08d',
		'Pantech'     => 'pantech.*p4100',
		'Broncho'     => 'broncho.*(n701|n708|n802|a710)',
		'Versus'      => 'touchpad.*[78910]|\btouchtab\b',
		'Zync'        => 'z1000|z99 2g|z930|z990|z909|z919|z900',
		'Positivo'    => 'tb07sta|tb10sta|tb07fta|tb10fta',
		'Nabi'        => 'android.*\bnabi',
		'Kobo'        => 'kobo touch|\bk080\b|\bvox\b build|\barc\b build',
		'Danew'       => 'dslide.*\b(700|701r|702|703r|704|802|970|971|972|973|974|1010|1012)\b',
		'Texet'       => 'navipad|tb-772a|tm-7045|tm-7055|tm-9750|tm-7016|tm-7024|tm-7026|tm-7041|tm-7043|tm-7047|tm-8041|tm-9741|tm-9747|tm-9748|tm-9751|tm-7022|tm-7021|tm-7020|tm-7011|tm-7010|tm-7023|tm-7025|tm-7037w|tm-7038w|tm-7027w|tm-9720|tm-9725|tm-9737w|tm-1020|tm-9738w|tm-9740|tm-9743w|tb-807a|tb-771a|tb-727a|tb-725a|tb-719a|tb-823a|tb-805a|tb-723a|tb-715a|tb-707a|tb-705a|tb-709a|tb-711a|tb-890hd|tb-880hd|tb-790hd|tb-780hd|tb-770hd|tb-721hd|tb-710hd|tb-434hd|tb-860hd|tb-840hd|tb-760hd|tb-750hd|tb-740hd|tb-730hd|tb-722hd|tb-720hd|tb-700hd|tb-500hd|tb-470hd|tb-431hd|tb-430hd|TB-506|TB-504|TB-446|TB-436|TB-416|TB-146SE|TB-126SE',
		'Playstation' => 'playstation.*(portable|vita)',
		'Trekstor'    => 'st10416-1|vt10416-1|st70408-1|st702xx-1|st702xx-2|st80208|st97216|st70104-2|vt10416-2|st10216-2a|surftab',
		'PyleAudio'   => '\b(ptbl10ceu|ptbl10c|ptbl72bc|ptbl72bceu|ptbl7ceu|ptbl7c|ptbl92bc|ptbl92bceu|ptbl9ceu|ptbl9cuk|ptbl9c)\b',
		'Advan'       => 'android.* \b(e3a|t3x|t5c|t5b|t3e|t3c|t3b|t1j|t1f|t2a|t1h|t1i|e1c|t1-e|t5-a|t4|e1-b|t2ci|t1-b|t1-d|o1-a|e1-a|t1-a|t3a|t4i)\b ',
		'DanyTech'    => 'genius tab g3|genius tab s2|genius tab q3|genius tab g4|genius tab q4|genius tab g-ii|genius tab gii|genius tab giii|genius tab s1',
		'Galapad'     => 'android.*\bg1\b(?!\))',
		'Micromax'    => 'funbook|micromax.*\b(p250|p560|p360|p362|p600|p300|p350|p500|p275)\b',
		'Karbonn'     => 'android.*\b(a39|a37|a34|st8|st10|st7|smart tab3|smart tab2)\b',
		'AllFine'     => 'fine7 genius|fine7 shine|fine7 air|fine8 style|fine9 more|fine10 joy|fine11 wide',
		'PROSCAN'     => '\b(pem63|plt1023g|plt1041|plt1044|plt1044g|plt1091|plt4311|plt4311pl|plt4315|plt7030|plt7033|plt7033d|plt7035|plt7035d|plt7044k|plt7045k|plt7045kb|plt7071kg|plt7072|plt7223g|plt7225g|plt7777g|plt7810k|plt7849g|plt7851g|plt7852g|plt8015|plt8031|plt8034|plt8036|plt8080k|plt8082|plt8088|plt8223g|plt8234g|plt8235g|plt8816k|plt9011|plt9045k|plt9233g|plt9735|plt9760g|plt9770g)\b',
		'YONES'       => 'bq1078|bc1003|bc1077|rk9702|bc9730|bc9001|it9001|bc7008|bc7010|bc708|bc728|bc7012|bc7030|bc7027|bc7026',
		'ChangJia'    => 'tpc7102|tpc7103|tpc7105|tpc7106|tpc7107|tpc7201|tpc7203|tpc7205|tpc7210|tpc7708|tpc7709|tpc7712|tpc7110|tpc8101|tpc8103|tpc8105|tpc8106|tpc8203|tpc8205|tpc8503|tpc9106|tpc9701|tpc97101|tpc97103|tpc97105|tpc97106|tpc97111|tpc97113|tpc97203|tpc97603|tpc97809|tpc97205|tpc10101|tpc10103|tpc10106|tpc10111|tpc10203|tpc10205|tpc10503',
		'GU'          => 'tx-a1301|tx-m9002|q702|kf026',
		'PointOfView' => 'tab-p506|tab-navi-7-3g-m|tab-p517|tab-p-527|tab-p701|tab-p703|tab-p721|tab-p731n|tab-p741|tab-p825|tab-p905|tab-p925|tab-pr945|tab-pl1015|tab-p1025|tab-pi1045|tab-p1325|tab-protab[0-9]+|tab-protab25|tab-protab26|tab-protab27|tab-protab26xl|tab-protab2-ips9|tab-protab30-ips9|tab-protab25xxl|tab-protab26-ips10|tab-protab30-ips10',
		'Overmax'     => 'ov-(steelcore|newbase|basecore|baseone|exellen|quattor|edutab|solution|action|basictab|teddytab|magictab|stream|tb-08|tb-09)|qualcore 1027',
		'HCL'         => 'hcl.*tablet|connect-3g-2.0|connect-2g-2.0|me tablet u1|me tablet u2|me tablet g1|me tablet x1|me tablet y2|me tablet sync',
		'DPS'         => 'dps dream 9|dps dual 7',
		'Visture'     => 'v97 hd|i75 3g|visture v4( hd)?|visture v5( hd)?|visture v10',
		'Cresta'      => 'ctp(-)?810|ctp(-)?818|ctp(-)?828|ctp(-)?838|ctp(-)?888|ctp(-)?978|ctp(-)?980|ctp(-)?987|ctp(-)?988|ctp(-)?989',
		'Mediatek'    => '\bmt8125|mt8389|mt8135|mt8377\b',
		'Concorde'    => 'concorde([ ]+)?tab|concorde readman',
		'GoClever'    => 'goclever tab|a7goclever|m1042|m7841|m742|r1042bk|r1041|tab a975|tab a7842|tab a741|tab a741l|tab m723g|tab m721|tab a1021|tab i921|tab r721|tab i720|tab t76|tab r70|tab r76.2|tab r106|tab r83.2|tab m813g|tab i721|gcta722|tab i70|tab i71|tab s73|tab r73|tab r74|tab r93|tab r75|tab r76.1|tab a73|tab a93|tab a93.2|tab t72|tab r83|tab r974|tab r973|tab a101|tab a103|tab a104|tab a104.2|r105bk|m713g|a972bk|tab a971|tab r974.2|tab r104|tab r83.3|tab a1042',
		'Modecom'     => 'freetab 9000|freetab 7.4|freetab 7004|freetab 7800|freetab 2096|freetab 7.5|freetab 1014|freetab 1001 |freetab 8001|freetab 9706|freetab 9702|freetab 7003|freetab 7002|freetab 1002|freetab 7801|freetab 1331|freetab 1004|freetab 8002|freetab 8014|freetab 9704|freetab 1003',
		'Vonino'      => '\b(argus[ _]?s|diamond[ _]?79hd|emerald[ _]?78e|luna[ _]?70c|onyx[ _]?s|onyx[ _]?z|orin[ _]?hd|orin[ _]?s|otis[ _]?s|speedstar[ _]?s|magnet[ _]?m9|primus[ _]?94[ _]?3g|primus[ _]?94hd|primus[ _]?qs|android.*\bq8\b|sirius[ _]?evo[ _]?qs|sirius[ _]?qs|spirit[ _]?s)\b',
		'ECS'         => 'v07ot2|tm105a|s10ot1|tr10cs1',
		'Storex'      => 'ezee[_\']?(tab|go)[0-9]+|tablc7|looney tunes tab',
		'Vodafone'    => 'smarttab([ ]+)?[0-9]+|smarttabii10|smarttabii7|vf-1497|vfd 1400',
		'EssentielB'  => 'smart[ \']?tab[ ]+?[0-9]+|family[ \']?tab2',
		'RossMoor'    => 'rm-790|rm-997|rmd-878g|rmd-974r|rmt-705a|rmt-701|rme-601|rmt-501|rmt-711',
		'iMobile'     => 'i-mobile i-note',
		'Tolino'      => 'tolino tab [0-9.]+|tolino shine',
		'AudioSonic'  => '\bc-22q|t7-qc|t-17b|t-17p\b',
		'AMPE'        => 'android.* a78 ',
		'Skk'         => 'android.* (skypad|phoenix|cyclops)',
		'Tecno'       => 'tecno p9|tecno dp8d',
		'JXD'         => 'android.* \b(f3000|a3300|jxd5000|jxd3000|jxd2000|jxd300b|jxd300|s5800|s7800|s602b|s5110b|s7300|s5300|s602|s603|s5100|s5110|s601|s7100a|p3000f|p3000s|p101|p200s|p1000m|p200m|p9100|p1000s|s6600b|s908|p1000|p300|s18|s6600|s9100)\b',
		'iJoy'        => 'tablet (spirit 7|essentia|galatea|fusion|onix 7|landa|titan|scooby|deox|stella|themis|argon|unique 7|sygnus|hexen|finity 7|cream|cream x2|jade|neon 7|neron 7|kandy|scape|saphyr 7|rebel|biox|rebel|rebel 8gb|myst|draco 7|myst|tab7-004|myst|tadeo jones|tablet boing|arrow|draco dual cam|aurix|mint|amity|revolution|finity 9|neon 9|t9w|amity 4gb dual cam|stone 4gb|stone 8gb|andromeda|silken|x2|andromeda ii|halley|flame|saphyr 9,7|touch 8|planet|triton|unique 10|hexen 10|memphis 4gb|memphis 8gb|onix 10)',
		'FX2'         => 'fx2 pad7|fx2 pad10',
		'Xoro'        => 'kidspad 701|pad[ ]?712|pad[ ]?714|pad[ ]?716|pad[ ]?717|pad[ ]?718|pad[ ]?720|pad[ ]?721|pad[ ]?722|pad[ ]?790|pad[ ]?792|pad[ ]?900|pad[ ]?9715d|pad[ ]?9716dr|pad[ ]?9718dr|pad[ ]?9719qr|pad[ ]?9720qr|telepad1030|telepad1032|telepad730|telepad731|telepad732|telepad735q|telepad830|telepad9730|telepad795|megapad 1331|megapad 1851|megapad 2151',
		'Viewsonic'   => 'viewpad 10pi|viewpad 10e|viewpad 10s|viewpad e72|viewpad7|viewpad e100|viewpad 7e|viewsonic vb733|vb100a',
		'Verizon'     => 'qtaqz3|qtair7|qtaqtz3|qtasun1|qtasun2|qtaxia1',
		'Odys'        => 'loox|xeno10|odys[ -](space|evo|xpress|noon)|\bxelio\b|xelio10pro|xelio7phonetab|xelio10extreme|xeliopt2|neo_quad10',
		'Captiva'     => 'captiva pad',
		'Iconbit'     => 'nettab|nt-3702|nt-3702s|nt-3702s|nt-3603p|nt-3603p|nt-0704s|nt-0704s|nt-3805c|nt-3805c|nt-0806c|nt-0806c|nt-0909t|nt-0909t|nt-0907s|nt-0907s|nt-0902s|nt-0902s',
		'Teclast'     => 't98 4g|\bp80\b|\bx90hd\b|x98 air|x98 air 3g|\bx89\b|p80 3g|\bx80h\b|p98 air|\bx89hd\b|p98 3g|\bp90hd\b|p89 3g|x98 3g|\bp70h\b|p79hd 3g|g18d 3g|\bp79hd\b|\bp89s\b|\ba88\b|\bp10hd\b|\bp19hd\b|g18 3g|\bp78hd\b|\ba78\b|\bp75\b|g17s 3g|g17h 3g|\bp85t\b|\bp90\b|\bp11\b|\bp98t\b|\bp98hd\b|\bg18d\b|\bp85s\b|\bp11hd\b|\bp88s\b|\ba80hd\b|\ba80se\b|\ba10h\b|\bp89\b|\bp78s\b|\bg18\b|\bp85\b|\ba70h\b|\ba70\b|\bg17\b|\bp18\b|\ba80s\b|\ba11s\b|\bp88hd\b|\ba80h\b|\bp76s\b|\bp76h\b|\bp98\b|\ba10hd\b|\bp78\b|\bp88\b|\ba11\b|\ba10t\b|\bp76a\b|\bp76t\b|\bp76e\b|\bp85hd\b|\bp85a\b|\bP86\b|\bP75HD\b|\bP76v\b|\bA12\b|\bP75a\b|\bA15\b|\bP76Ti\b|\bP81HD\b|\bA10\b|\bT760VE\b|\bT720HD\b|\bP76\b|\bP73\b|\bP71\b|\bP72\b|\bT720SE\b|\bC520Ti\b|\bT760\b|\bT720VE\b|T720-3GE|T720-WiFi',
		'Onda'        => '\b(v975i|vi30|vx530|v701|vi60|v701s|vi50|v801s|v719|vx610w|vx610w|v819i|vi10|vx580w|vi10|v711s|v813|v811|v820w|v820|vi20|v711|vi30w|v712|v891w|v972|v819w|v820w|vi60|v820w|v711|v813s|v801|v819|v975s|v801|v819|v819|v818|v811|v712|v975m|v101w|v961w|v812|v818|v971|v971s|v919|v989|v116w|v102w|v973|vi40)\b[\s]+|v10 \b4g\b',
		'Jaytech'     => 'tpc-pa762',
		'Blaupunkt'   => 'endeavour 800ng|endeavour 1010',
		'Digma'       => '\b(idx10|idx9|idx8|idx7|idxd7|idxd8|idsq8|idsq7|idsq8|idsd10|idnd7|3ts804h|idsq11|idj7|ids10)\b',
		'Evolio'      => 'aria_mini_wifi|aria[ _]mini|evolio x10|evolio x7|evolio x8|\bevotab\b|\bneura\b',
		'Lava'        => 'qpad e704|\bivorys\b|e-tab ivory|\be-tab\b',
		'Aoc'         => 'mw0811|mw0812|mw0922|mtk8382|mw1031|mw0831|mw0821|mw0931|mw0712',
		'Mpman'       => 'mp11 octa|mp10 octa|mpqc1114|mpqc1004|mpqc994|mpqc974|mpqc973|mpqc804|mpqc784|mpqc780|\bmpg7\b|mpdcg75|mpdcg71|mpdc1006|mp101dc|mpdc9000|mpdc905|mpdc706hd|mpdc706|mpdc705|mpdc110|mpdc100|mpdc99|mpdc97|mpdc88|mpdc8|mpdc77|mp709|mid701|mid711|mid170|mpdc703|mpqc1010',
		'Celkon'      => 'ct695|ct888|ct[\s]?910|ct7 tab|ct9 tab|ct3 tab|ct2 tab|ct1 tab|c820|c720|\bct-1\b',
		'Wolder'      => 'mitab \b(diamond|space|brooklyn|neo|fly|manhattan|funk|evolution|sky|gocar|iron|genius|pop|mint|epsilon|broadway|jump|hop|legend|new age|line|advance|feel|follow|like|link|live|think|freedom|chicago|cleveland|baltimore-gh|iowa|boston|seattle|phoenix|dallas|in 101|masterchef)\b',
		'Mediacom'    => 'm-mpi10c3g|m-sp10eg|m-sp10egp|m-sp10hxah|m-sp7hxah|m-sp10hxbh|m-sp8hxah|m-sp8mxa',
		'Mi'          => '\bmi pad\b|\bhm note 1w\b',
		'Nibiru'      => 'nibiru m1|nibiru jupiter one',
		'Nexo'        => 'nexo nova|nexo 10|nexo avio|nexo free|nexo go|nexo evo|nexo 3g|nexo smart|nexo kiddo|nexo mobi',
		'Leader'      => 'tblt10q|tblt10i|tbl-10wdkb|tbl-10wdkbo2013|tbl-w230v2|tbl-w450|tbl-w500|sv572|tblt7i|tba-ac7-8g|tblt79|tbl-8w16|tbl-10w32|tbl-10wkb|tbl-w100',
		'Ubislate'    => 'ubislate[\s]?7c',
		'PocketBook'  => 'pocketbook',
		'Kocaso'      => '\b(tb-1207)\b',
		'Hisense'     => '\b(f5281|e2371)\b',
		'Hudl'        => 'hudl ht7s3|hudl 2',
		'Telstra'     => 't-hub2',
		'Generic'     => 'android.*\b97d\b|tablet(?!.*pc)|bntv250a|mid-wcdma|logicpd zoom2|\ba7eb\b|catnova8|a1_07|ct704|ct1002|\bm721\b|rk30sdk|\bevotab\b|m758a|et904|alumium10|smartfren tab|endeavour 1010|tablet-pc-4|tagi tab|\bm6pro\b|ct1020w|arc 10hd|\btp750\b|\bqtaqz3\b|wvt101|tm1088|kt107'
	);

	public static function getHeader() : string
	{
		static $agent;
		if (null === $agent && isset($_SERVER['HTTP_USER_AGENT'])) {
			$agent = strtolower(substr($_SERVER['HTTP_USER_AGENT'], 0, 500));
		}
		return $agent;
	}

	public static function isMobile() : bool
	{
		if (isset($_SERVER['HTTP_CLOUDFRONT_IS_MOBILE_VIEWER']) && 'true' === $_SERVER['HTTP_CLOUDFRONT_IS_MOBILE_VIEWER']) {
			return true;
		}

		foreach (static::$mobileHeaders as $mobileHeader => $matchType) {
			if (isset($_SERVER[$mobileHeader])) {
				if ($matchType) {
					foreach ($matchType as $_match) {
						if (strpos($_SERVER[$mobileHeader], $_match) !== false) {
							return true;
						}
					}
				} else {
					return true;
				}
			}
		}

		return preg_match('/phone|mobile|android|bb10/', static::getHeader())
			|| static::isTablet();
	}

	public static function isTablet() : bool
	{
		if (isset($_SERVER['HTTP_CLOUDFRONT_IS_TABLET_VIEWER']) && 'true' === $_SERVER['HTTP_CLOUDFRONT_IS_TABLET_VIEWER']) {
			return true;
		}

		return preg_match('/ipad|tablet|playbook/', static::getHeader())
			|| preg_match(sprintf('#%s#is', implode('|', self::$tabletDevices)), static::getHeader());
	}

}
