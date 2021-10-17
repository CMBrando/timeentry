Vanilla JS Time Entry Plugin
=================

This plugin sets an input field up to accept a time value using keyboard or mousewheel

* Set time format, including seconds and/or 24 hour time.
* Converted from Jquery Time Entry plugin at: https://github.com/kbwood/timeentry
* Spinner image support not implemented


Usage: 

    var time = new TimeEntry(DOMElement, options);
    
OR
    
    var time = new TimeEntry('{string of element id}', options);


Options and their defaults:

    {
      show24Hours: false, 
      showSeconds: false,
      unlimitedHours: false, 
      timeSteps: [1, 1, 1], // use to restrict to specific time increments (e.g. quarter hours)
      initialField: null, // initial time field to select on focus
      noSeparatorEntry: false,  // change to true to not require entry of separator to switch between fields
      tabToExit: false,  // switch to true to exit the field on tab instead of move to next field
      useMouseWheel: true, // enable/disable mousewheel support
      defaultTime: null, // default time to set when none is set. See original documentation for more detailed information on possible inputs
      minTime: null, // Max time allowed. See original documentation for more detailed information on possible inputs
      maxTime: null, // Min time allowed. Set when none is set. See original documentation for more detailed information on possible inputs
      beforeShow: null, // A function that accepts an input field and returns a settings object containing new settings for the time entry for this field.
      beforeSetTime: null, // A function that accepts the old and new times, and minimum and maximum times, and returns an updated time.
      separator: ':',
      ampmPrefix: '',
      ampmNames: ['AM', 'PM']
    }
    
See previous plugin's documention for more detailed information on options: http://keith-wood.name/timeEntryRef.html 
    
Methods:

  setOptions(options) // changes the options of the plugin
  
  destroy() // removes the plugin functionality from the element
  
  setTime(time) // pass Date or string representation for time.  
  
  getTime() // returns Date object on the time value
  
  getOffset() // get millisecond offset for the set time
  
  

