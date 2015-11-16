node-svrdp
==========

SVDRP Client Library for Node.js

## Purpose

Provide an easy way to access your Linux VDR's functions over the SVDRP
protocol using Node.js.

## Status

Early alpha. Only a few of all the SVDRP functions have been implemented
and tested. Run `npm test` to see which functions already have been
implemented.

## Plans
I'm planning to support all the SVDRP functions that come with VDR and those
that come with the Epgsearch plug-in. Also, there will be a plug-in system,
so it will be possible to add support for other VDR plug-ins. I'm also 
planning to write a REST service with some kind of EPG caching that can
be used in web apps or with other languages than JavaScript, but that will
probably be a separate project.

## Why Node.js

Why not? I wanted to learn Node.js and didn't really have the opportunity
to use it in my job. So I've decided to use it in some of the projects
I wanted to work on in my spare time. It's one of my first projects
with Node.js, so show some mercy, because I probably won't follow all the 
best practices ;) Feel free to send me pull requests with your improvments!


