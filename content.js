// ==UserScript==
// @name Test
// @all-frames true
// @include https://www.facebook.com/*
// @include http://uploads.im/api*
// @include http://my-zenplayer.rhcloud.com/
// ==/UserScript==

/*! ZenMusic ext. | (c) 2016, Mykola Baraniuk | my-zenplayer.rhcloud.com */

if (window.location.href.indexOf('my-zenplayer.rhcloud.com/?act=auth') > -1) {
	var body = document.getElementsByTagName("body")[0];
	var obj = JSON.parse(body.children[0].innerHTML);

	if (obj) {
		kango.dispatchMessage('authDone', {token: obj.token, list: obj.list});
		window.close();
	}
}

if (window.location.href.indexOf('facebook') > -1) {

	var ss = document.createElement("link");
	ss.type = "text/css";
	ss.rel = "stylesheet";
	ss.href = kango.io.getResourceUrl('res/fb_partial_list.css');
	var head = document.getElementsByTagName("head")[0];
	head.appendChild(ss);

	var scrolled = 0;
	var inProcess = false;

	var maxScrolledPos = 0;

	String.prototype.count=function(s1) { 
	    return (this.length - this.replace(new RegExp(s1,"g"), '').length) / s1.length;
	};

	window.onscroll = function() {
		var s = window.pageYOffset || document.documentElement.scrollTop;
	  	if (s > maxScrolledPos && !inProcess && s-scrolled > 100) {
	  		scrolled = s;
	  		maxScrolledPos = Math.max(s, maxScrolledPos);
	  		doRoutine();
	  	}
	}

	if (!window['ext_arrow']) {
		window['ext_arrow'] = document.createElement('div');
		ext_arrow.className = 'ext_arrow';

		document.body.appendChild(ext_arrow);
	}
	
	//start fb parsing
	doRoutine();
}

	//functions implementation=======================

	function urldecode (str) {
	  return decodeURIComponent(str).replace(/%2C/g,",")
	  .replace(/%2F/g,"/")
	  .replace(/%2A/g,"*")
	  .replace(/%2D/g,"-")
	  .replace(/%5F/g,"_")
	  .replace(/%7C/g,"|")
	  .replace(/\+/g," ");
	}

	function doRoutine() {
		var links = document.links;

		var replace_pos = [];
		var list = [];
		var _double = 0;

		for (var i = 0; i < links.length; i++) {
			var url = urldecode(links[i].search);

			var start_pos = url.indexOf('list=');
			if (start_pos > -1) {
				_double++;

				if (_double === 2) {
					url = urldecode(url);
					var end_pos = url.indexOf('&');
					
					list.push(url.substring(start_pos+5, end_pos));	
					replace_pos.push(i);

					_double = 0;
				}
			}

		}


	function doReplace(list, positions) {
		var links = document.links;

		inProcess = true;

		for (var i = 0; i < list.length; i++) {

			var container = document.createElement('div');
			container.music_list = [];

			var sub_list = list[i].split(',');
			if (!sub_list) {
				doReplace();
				return;
			}
			for (var j = 0; j < sub_list.length; j++) {
				var item = sub_list[j].split('|');
				
				var div = document.createElement('div');
				div.innerHTML = '<b>'+ item[1] +'</b> - '+ item[2];
				div.className = 'song_item play';
					var sub_div = document.createElement('div');
					sub_div.className = 'duration';
					sub_div.innerHTML = formatTime(item[3]);
				div.appendChild(sub_div);
				container.appendChild(div);
				container.music_list.push(item[0]);
			}

			var div = document.createElement('div');
			div.className = 'm_list_description';
			div.innerHTML = 'Click to play in ZenMusic';
			container.appendChild(div);

			var parent = getParents(links[positions[i]], '._3x-2');
			if (parent !== null) {
				parent = parent[0];

				container.className = 'm_list_wrap';
				container.onclick = function(){

					if (ext_arrow.classList)
					  ext_arrow.classList.add('animate');
					else
					  ext_arrow.className += ' animate';
					
					setTimeout(function(){
						if (ext_arrow.classList)
						  ext_arrow.classList.remove('animate');
						else
						  ext_arrow.className =  ext_arrow.className.replace(/ animate/g,"");
					}, 1600);

					kango.dispatchMessage('playFromFb', this.music_list);
				};

				parent.parentNode.replaceChild(container, parent);
			}

		}

		inProcess = false;
	}

	function getParents(elem, selector) {
		if (!elem) return;

	    var parents = [];
	    var firstChar;
	    if ( selector ) {
	        firstChar = selector.charAt(0);
	    }

	    // Get matches
	    for ( ; elem && elem !== document; elem = elem.parentNode ) {
	        if ( selector ) {

	            // If selector is a class
	            if ( firstChar === '.' ) {
	                if ( elem.classList.contains( selector.substr(1) ) ) {
	                    parents.push( elem );
	                }
	            }

	            // If selector is an ID
	            if ( firstChar === '#' ) {
	                if ( elem.id === selector.substr(1) ) {
	                    parents.push( elem );
	                }
	            }

	            // If selector is a data attribute
	            if ( firstChar === '[' ) {
	                if ( elem.hasAttribute( selector.substr(1, selector.length - 1) ) ) {
	                    parents.push( elem );
	                }
	            }

	            // If selector is a tag
	            if ( elem.tagName.toLowerCase() === selector ) {
	                parents.push( elem );
	            }

	        } else {
	            parents.push( elem );
	        }
	    }

	    // Return parents if any exist
	    if ( parents.length === 0 ) {
	        return null;
	    } else {
	        return parents;
	    }

	}

	function formatTime (secs) {
		secs = parseInt(secs);

        var minutes = Math.floor(secs / 60) || 0;
        var seconds = (secs - minutes * 60) || 0;

        return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
    }
//}