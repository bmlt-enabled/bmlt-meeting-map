=== BMLT Meeting Map ===  

Contributors: otrok7
Tags: na, meeting list, meeting finder, maps, recovery, addiction, webservant, bmlt
Requires at least: 5.1
Tested up to: 5.2
Requires PHP: 7.0
Stable tag: 1.0.3
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html


== Description ==

The BMLT Meeting Map provides a GoogleMaps UI allowing users to find meetings stored in a the Basic Meeting List Toolbox (BMLT) Server.
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

= 1.0.3 = 
* When searching for a location, use Geocoding to determine map zoom level.
* Remove dependencies on German language.
* Bug fixes

= 1.0.0 = Initial Release