/* http://home.iprimus.com.au/kbwood/jquery/timeEntry.html
   German initialisation for the jQuery time entry extension
   Written by Keith Wood (kbwood@iprimus.com.au) June 2007.
   Under the Creative Commons Licence http://creativecommons.org/licenses/by/3.0/
   Share or Remix it but please Attribute the author. */
/* German initialisation by Eyk Schulz (eyk.schulz@gmx.net)  */
$(document).ready(function(){
	timeEntry.regional['de'] = {show24Hours: true, spinnerTexts: 
		['Jetzt', 'vorheriges Feld', 'n�chstes Feld', 'hoch', 'runter']};
	timeEntry.setDefaults(timeEntry.regional['de']);
});