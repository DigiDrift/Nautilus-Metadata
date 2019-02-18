# Nautilus-Metadata

#### Nautilus-Metadata is a GNOME nautilus script written in javascript using the C Bindings of GJS. It's basically a GUI wrapper of the excellent command line exif extraction tool written by Phil Harvey, named ExifTool.

I wrote this little script to help me sorting through my many photo's and wanting to check the metadata without having to open more heavy duty tools to inspect the metadat in the file. It works with just about every type of file and metadata, and I've include a WebView of an OpenStreetMap to view the GPO locations if the file has GPS metadata.

To use this piece of code, just download the metadata.js file and place it in your nautilus scripts folder. Rename the file to whatever you wish and then make it executable with 'chmod +x metadata.js' and your good to go.

Please let me know if you find any bugs, or have any feature requests.

![Screenshot](screenshot.jpg)
