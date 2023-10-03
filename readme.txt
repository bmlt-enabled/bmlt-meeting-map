=== BMLT Meeting Map ===  

Contributors: otrok7, bmltenabled
Tags: na, meeting list, meeting finder, maps, recovery, addiction, webservant, bmlt
Requires PHP: 7.1
Requires at least: 5.1
Tested up to: 6.3.0
Stable tag: 2.6.0
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html


== Description ==

The BMLT Meeting Map provides a map so people can find NA meetings stored in a the Basic Meeting List Toolbox (BMLT) Server.
The map tiles can come from Open Street Maps, from Google Maps or from a local server or proxy,
depending on the privacy concerns or the users.
Simply put the shortcode [bmlt_meeting_map] into a WordPress page and a map will be generated where nearby meetings are marked.
Click on a meeting location, and the details of all the meetings will pop up.  The display is responsive, suitible for mobile and
computers.  Panning (or zooming) in the map displays meeting there, or you may search for a different location using geocoding.
The meetings displayed may be filtered by a variety of criteria, such as format or language.  Additionally a text output of all
meetings currently in the viewport can be generated.

This plugin is appropriate for small and medium sized regions.  The meetings tracked should not exceed 500.

== Installation ==

1. Place the 'bmlt-meeting-map' folder in your '/wp-content/plugins/' directory.

2. Activate bmlt-meeting-map.

3. Enter BMLT Root Server into Settings - BMLT Meeting Map

4. Enter shortcode into a new or existing WordPress page.


== Screenshots ==

1. Click on a marker to bring up details of all meetings at that location
2. Get a text list of all meetings currently showing, sortable by city or day
3. Filter the meetings by language, format, or weekday

== Changelog ==
= 2.6.0 =
* BMLT Meeting Search performed from browser not on server side.
* Integration with crouton

= 2.5.1 =
* Added sanitization for urls.

= 2.5 =
* Stability improvements

= 2.4 =
* Compatibility with PHP 8.1.
* Support BMLT Crumbs

= 2.3 =
* Fix for User-Agent issue that appears to be present on SiteGround hosted root servers.

= 2.2 =
* Exclude Online Meetings

= 2.0.1 =
* UI fixes

= 2.0.0 =
* Choose between OSM and Google Maps framework mapping data. It is also possible to host
your on map tiles.  This is important for (EU) countries with strict rules regarding
data privacy.  OSM framework (Leaflet) offers much better performance.
* UI stability improvements

= 1.0.6 =
* Added Italian Translation

= 1.0.3 = 
* When searching for a location, use Geocoding to determine map zoom level.
* Remove dependencies on German language.
* Bug fixes

= 1.0.0 = Initial Release
