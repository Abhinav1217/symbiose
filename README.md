[Symbiose 1.0 beta 4](http://symbiose.fr.cr/)
==============================================

This version (beta) is unstable. 

Key features
------------

* Apps:
 * Calculator (essential!)
 * Brackets code editor
 * Basic text editor ([gedit](https://en.wikipedia.org/wiki/Gedit))
 * File manager with copy-paste, drag'n'drop, file sharing, searching...
 * Google Docs to display and edit your documents
 * Basic multimedia player
 * Music player (based on [GNOME Music](https://wiki.gnome.org/Apps/Music))
 * Basic web browser
 * Terminal (with a basic interpreter)
 * Very basic word processor
 * Image viewer, archive manager, software centre...
* Customizable: themes, background and so on
* Multiple interfaces: GNOME Shell, GNOME Panel (GNOME 2), Windows 7-like, mobile, CLI
* Easy configuration with a _System settings_ app and simple config files
* FTP, Dropbox and Google Drive integration
* LDAP authentication support
* Firefox Marketplace apps integration
* Available in English, French, German, Italian and Spanish
* WebSocket support
* And more! 

Quick start
-----------

You can try Symbiose on our website : http://symbiose.fr.cr/ (username : _demo_, password : _demo_).

Clone the repo, `git clone git://github.com/symbiose/symbiose.git`, or [download the latest release](https://github.com/symbiose/symbiose/zipball/master).

You can explore the [wiki](https://github.com/symbiose/symbiose/wiki/) too.

Bug tracker
-----------

Have a bug ? Please create an issue here on GitHub : https://github.com/symbiose/symbiose/issues.

Installing
----------

To install Symbiose you just need to unzip files on your web server and chmod all of them to 0777. If a HTTP 500 error occurs, chmod */.htaccess*, */sbin/* and */index.php* to 0755.

For more information, please see the wiki : https://github.com/symbiose/symbiose/wiki/Installing.

Software requirements
---------------------

* Server: 
 * PHP >= 5.3
 * Database: optional (off by default)
* Client: a fast and modern web browser (e.g. the latest *Mozilla Firefox*). Tested on:
 * Firefox (latest version)
 * Chromium (latest version)
 * Internet Explorer 9+

Authors
-------

**$imon**
+ http://emersion.fr/
+ http://github.com/simonser

**Codel**
+ https://github.com/Codel

**Doppelganger**
+ https://github.com/Doppelganger-Symbiose

Copyright
---------

Contact: symbiose@emersion.fr  
Copyright (C) 2013 Simon Ser

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program. If not, see <http://www.gnu.org/licenses/>.
    
    THIS SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THIS SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THIS SOFTWARE.
