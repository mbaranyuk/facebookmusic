/*! ZenMusic ext. | (c) 2016, Mykola Baraniuk | my-zenplayer.rhcloud.com */

/**
 * Player class containing the state of our playlist and where we are in it.
 * Includes all methods for playing, skipping, updating the display, etc.
 * @param {Array} playlist Array of objects with playlist song details ({title, file, howl}).
 */

 (function (view) {
	"use strict";

	var Player = function(playlist) {
	  this.playlist = playlist;
	  this.index = 0;
	  this.playlistTitle = 'my';

	  this.loop = false; //loop
	  this.vol = 1; //volume
	  this.shuffle = false; //shuffle

	  this.broadcast = true;

	  this.current = playlist[0];
	  this.current.playlistName = this.playlistTitle;

	  this.haveOwnPlaylist = false;

	  this.selectMode = false;

	  this.last_request = undefined;
	};

	Player.prototype = {

	  /**
	   * Play a song in the playlist.
	   * @param  {Number} index Index of the song in the playlist (leave empty to play the first or current).
	   */
	  play: function(index) {
	    var self = this;

	    index = typeof index === 'number' ? index : self.index;

	    if (index > -1) {

	    }

	    if (!self.current.howl) {

	      self.current.howl = new Howl({
	        src: [self.current.url],
	        html5: true, // Force to HTML5 so that the audio can stream in (best for large files).

	        onplay: function() {
	          var s = self.current.howl;

	          if (s)
	            if (s.volume() !== self.vol)
	              s.volume(self.vol || 1);

	          kango.dispatchMessage('isPlaying');

	          kango.ui.browserButton.setIcon('res/pause.png');
	          kango.ui.browserButton.setTooltipText(self.current.artist+' - '+self.current.title);

	          if (self.broadcast)
	            kango.xhr.send({
	              method: 'POST',
	              url: 'http://my-zenplayer.rhcloud.com?act=set_status',
	              params: {'status': self.current.owner_id+'_'+self.current.id}
	            },
	            function(data){
	              if (data.status !== 200)
	                console.log('something went wrong. set status');
	            });
	        },
	        onload: function() {

	        },
	        onloaderror: function() {
	          //self.skip('right');
	          setTimeout(function(){
	            self.play();
	          }, 3000);
	        },
	        onend: function() {
	          if (self.current.playlistName !== self.playlistTitle) {
	            self.current.howl.stop();
	            kango.dispatchMessage('stopStep');
	            return;
	          }

	          if (self.loop)
	            self.skipTo(self.index);
	          else
	            self.skip('right');
	        },
	        onpause: function() {
	          //kango.dispatchMessage('stopStep');
	          kango.ui.browserButton.setIcon('res/play.png');

	          if (self.broadcast)
	            kango.xhr.send({
	              method: 'GET',
	              url: 'http://my-zenplayer.rhcloud.com?act=remove_status'
	            },
	            function(data){
	              if (data.status !== 200)
	                console.log('something went wrong. remove_status');
	            });
	        },
	        onstop: function() {
	          kango.ui.browserButton.setIcon('res/play.png');
	          kango.ui.browserButton.setTooltipText('ZenMusic Ext.');

	          kango.dispatchMessage('stopStep');
	        }
	      });

	    }

	    // Begin playing the sound.
	    self.current.howl.play();

	    if (index > -1)
	      self.index = index;

	  },

	  currIndex: function() {
	    var self = this;

	    if (self.playlist) {
	      var sound = self.playlist[self.index].howl;
	      if (sound) 
	        return self.index;
	    }

	  },

	  playing: function() {
	    var self = this;

	    if (self.playlist) {
	      var sound = self.current ? self.current.howl : self.playlist[self.index].howl;
	      if (sound) 
	        return sound.playing();
	    }
	  },

	  /**
	   * Pause the currently playing track.
	   */
	  pause: function() {
	    var self = this;

	    // Get the Howl we want to manipulate.
	    var sound = self.current.howl;

	    // Puase the sound.
	    if (sound)
	      sound.pause();

	  },

	  /**
	   * Skip to the next or previous track.
	   * @param  {String} direction 'next' or 'prev'.
	   */
	  skip: function(direction) {
	    var self = this;

	    if (self.playlist.indexOf(self.current) < 0) return;

	    // Get the next track based on the direction of the track.
	    var index = 0;
	    if (direction === 'prev') {
	      index = self.index - 1;
	      if (index < 0) {
	        index = self.playlist.length - 1;
	      }
	      self.skipTo(index);
	    } else {
	      index = self.index + 1;

	      if (index >= self.playlist.length) {
	        kango.dispatchMessage(self.last_request.name, {offset: self.playlist.length});
	        
	        setTimeout(function(){
	          if (index >= self.playlist.length)    
	            index = 0;

	          self.skipTo(index);
	        }, 1500);
	        
	      } else 
	        self.skipTo(index);
	    }
	    
	  },

	  /**
	   * Skip to a specific track based on its playlist index.
	   * @param  {Number} index Index in the playlist.
	   */
	  skipTo: function(index) {
	    var self = this;

	    // Stop the current track.
	    if (self.current.howl) {
	      self.current.howl.stop();
	      //self.current = undefined;
	    }

	    // Play the new track.
	    self.play(index);
	  },

	  /**
	   * Set the volume and update the volume slider display.
	   * @param  {Number} val Volume between 0 and 1.
	   */
	  volume: function(val) {
	    var self = this;
	    
	    if (val) {
	      self.vol = val/100;
	      // Get the Howl we want to manipulate.
	      if (self.current.howl) 
	        if (val === 2) 
	          self.current.howl.volume(0);
	        else
	          self.current.howl.volume(self.vol);

	    kango.storage.setItem('ext_vol',  val);

	    } else 
	      return self.vol;
	  },

	  doShuffle: function(val) {
	    var self = this;

	    self.shuffle = !self.shuffle;

	    if (self.shuffle) {
	      self.tmp_list = self.playlist.slice();

	      self._shuffleArray(self.playlist);
	    }
	    else {
	      self.playlist = self.tmp_list;

	      self.tmp_list = null;
	    }
	  },

	  /**
	   * Seek to a new position in the currently playing track.
	   * @param  {Number} per Percentage through the song to skip.
	   */
	  seek: function(per) {
	    var self = this;

	    // Get the Howl we want to manipulate.
	    var sound = self.current.howl;

	    if (!sound) return;

	    if (!per)
	        return sound.seek() || 0;
	      else
	        sound.seek(sound.duration() * per * 0.01);

	  },

	  /**
	   * Format the time from seconds to M:SS.
	   * @param  {Number} secs Seconds to format.
	   * @return {String}      Formatted time.
	   */
	   _shuffleArray: function( array ){
	    if (array.length < 3) return;

	     var count = array.length,
	         randomnumber,
	         temp;
	     while( count > 0 ){
	      randomnumber = Math.random() * count-- | 0;
	      temp = array[count];
	      array[count] = array[randomnumber];
	      array[randomnumber] = temp;
	     }
	  }

	};
})();