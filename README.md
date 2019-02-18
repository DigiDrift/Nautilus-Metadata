# Nautilus-Metadata

#### Nautilus-Metadata is a GNOME nautilus script written in javascript using the C Bindings of GJS. It's basically a GUI wrapper of the excellent command line exif extraction tool written by Phil Harvey, named ExifTool.

I wrote this little script to help me sort through my many photo's and wanting to check the metadata without having to open more heavy duty tools to inspect the metadata in the file. It works with just about every type of file and metadata, and I've include a WebView of an OpenStreetMap to view the GPS locations if the file has latitude and longitude metadata.

To use this piece of code, just download the metadata.js file and place it in your nautilus scripts folder. Rename the file to whatever you wish and then make it executable with chmod +x metadata.js (or whatever you named it) and you can then inspect file metadata with a conxtext/right click menu in nautilus.

Please make sure ExifTool is installed on your system before using this script as it's required for use. It's a popular utility and you can install it from any of the main Linux package managers or download it and complie from Phil Harveys ExifTool [website](https://www.sno.phy.queensu.ca/~phil/exiftool/).

Please let me know if you find any bugs, or have any feature requests.

![Screenshot](screenshot.jpg)
