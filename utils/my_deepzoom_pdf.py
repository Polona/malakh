#!/usr/bin/python
## Copyright (c) 2008, Kapil Thangavelu <kapil.foss@gmail.com>
## All rights reserved.

## Redistribution and  use in  source and binary  forms, with  or without
## modification, are permitted provided that the following conditions are
## met:

## Redistributions of source code must retain the above copyright
## notice, this list of conditions and the following disclaimer.
## Redistributions in binary form must reproduce the above copyright
## notice, this list of conditions and the following disclaimer in the
## documentation and/or other materials provided with the
## distribution. The names of its authors/contributors may be used to
## endorse or promote products derived from this software without
## specific prior written permission.

## THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
## "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
## LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
## FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
## COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
## INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
## (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
## SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
## HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
## STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
## ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
## OF THE POSSIBILITY OF SUCH DAMAGE.

"""
Implements a Deep Zoom / Seadragon Composer in Python

For use with the seajax viewer

reversed from the excellent blog description at

 http://gashi.ch/blog/inside-deep-zoom-2
 from Daniel Gasienica

incidentally he's got an updated version of this script that supports collections
thats included in the openzoom project

http://code.google.com/p/open-zoom/source/browse/trunk/src/main/python/deepzoom/deepzoom.py

Author: Kapil Thangavelu
Date: 11/29/2008
License: BSD
"""

import math, os, optparse, sys
from PIL import Image
import subprocess
import threading
import shutil

xml_template = '''\
<?xml version="1.0" encoding="UTF-8"?>
<Image TileSize="%(tile_size)s" Overlap="%(overlap)s" Format="%(format)s"
       xmlns="http://schemas.microsoft.com/deepzoom/2008">
       <Size Width="%(width)s" Height="%(height)s"/>
</Image>
'''


filter_map = {
    'cubic' : Image.CUBIC,
    'bilinear' : Image.BILINEAR,
    'bicubic' : Image.BICUBIC,
    'nearest' : Image.NEAREST,
    'antialias' : Image.ANTIALIAS,
    }


class PyramidComposer( object ):
    def __init__( self, image_path, width, height, tile_size, overlap, min_level, max_level, format, filter, threads, page, holes, copy_tiles ):
        self.image_path = image_path
        self.width = width
        self.height = height
        self.tile_size = tile_size
        self.overlap = overlap
        self.format = format
        self.min_level = min_level
        if max_level == 0:
            self._max_level = None
        else:
            self._max_level = max_level
        self.filter = filter
        self.page = page
        self.dont_create_lock = threading.Lock()
        self.threads_semaphore = threading.Semaphore(threads)
        self.holes = holes
        self.copy_tiles = copy_tiles

    @property
    def max_level( self ):
        """ max level in an image pyramid """
        if self._max_level is not None:
            return self._max_level
        self._max_level = int( math.ceil( math.log( max( (self.width, self.height) ), 2) ) )
        return self._max_level

    def getLevelDimensions( self, level ):
        assert level <= self.max_level and level >= 0, "Invalid Pyramid Level"
        scale = self.getLevelScale( level )
        return math.ceil( self.width * scale) , math.ceil( self.height * scale )

    def getLevelScale( self, level ):
        #print math.pow( 0.5, self.max_level - level )
        return 1.0 / (1 << ( self.max_level - level ) )

    def getLevelRowCol( self, level ):
        w, h = self.getLevelDimensions( level )
        return ( math.ceil( w / self.tile_size ),  math.ceil( h / self.tile_size )  )

    def getTileBox( self, level, column, row ):
        """ return a bounding box (x1,y1,x2,y2)"""
        # find start position for current tile

        # python's ternary operator doesn't like zero as true condition result
        # ie. True and 0 or 1 -> returns 1
        if not column:
            px = 0
        else:
            px = self.tile_size * column - self.overlap
        if not row:
            py = 0
        else:
            py = self.tile_size * row - self.overlap

        # scaled dimensions for this level
        dsw, dsh = self.getLevelDimensions( level )

        # find the dimension of the tile, adjust for no overlap data on top and left edges
        sx = self.tile_size + ( column == 0 and 1 or 2 ) * self.overlap
        sy = self.tile_size + ( row == 0 and 1 or 2 ) * self.overlap

        # adjust size for single-tile levels where the image size is smaller
        # than the regular tile size, and for tiles on the bottom and right
        # edges that would exceed the image bounds
        sx = min( sx, dsw-px )
        sy = min( sy, dsh-py )

        return px, py, px+sx, py+sy

    def iterTiles( self, level ):
        col, row = self.getLevelRowCol( level )
        for w in range( 0, int( col ) ):
            for h in range( 0, int( row ) ):
                yield (w,h), ( self.getTileBox( level, w, h ) )

    def __len__( self ):
        return self.max_level

    def pdftoppm( self, dir_path, scale_to_x, scale_to_y, level, col, row, box, dont_create ):
        bounds = map(int, box)

        level_dir = ensure(os.path.join(dir_path, str(level)))

        tile_prefix = os.path.join(level_dir, "%s_%s"%(col, row))
        str_tile_path_prefix = str(tile_prefix)
        str_tile_path = str_tile_path_prefix + '.' + self.format

        if not os.path.isfile(str_tile_path):
            command_array = ["pdftoppm",
                            "-f", str(self.page),
                            #"-l", str(self.page),
                            "-singlefile",
                            "-scale-to-x", str(scale_to_x),
                            "-scale-to-y", str(scale_to_y),
                            "-x", str(bounds[0]),
                            "-y", str(bounds[1]),
                            "-W", str(bounds[2] - bounds[0]),
                            "-H", str(bounds[3] - bounds[1]),
                            "-png",
                            "-q",
                            self.image_path,
                            str_tile_path_prefix]
            subprocess.call(command_array)

            if level < self.max_level:
                # does the image have >1 color?
                img = Image.open(str_tile_path)
                img_array = list(img.getdata())
                # a small one-color image doesn't mean all subimages are one-color
                if img.size[0] < self.tile_size or img.size[1] < self.tile_size:
                    identical = False
                else:
                    identical = True
                    for pixel in img_array:
                        if pixel != img_array[0]:
                            identical = False
                            break;

                if self.copy_tiles and identical:
                    for l in range( level + 1, self.max_level + 1 ):
                        multiplier = 2 ** (l - level)
                        for c in range( col * multiplier, (col + 1) * multiplier ):
                            for r in range( row * multiplier, (row + 1) * multiplier ):
                                new_level_dir = ensure(os.path.join(dir_path, str(l)))
                                str_new_tile_path = str(os.path.join(new_level_dir, "%s_%s.%s"%(c, r, self.format)))
                                if not os.path.isfile(str_new_tile_path):
                                    # There is lots of redundancy in
                                    # checking if file exists here but
                                    # it's low compared to other calculation
                                    # overhead.
                                    if self.holes:
                                        self.dont_create_lock.acquire()
                                        dont_create[l].add((c, r))
                                        self.dont_create_lock.release()
                                    else:
                                        shutil.copyfile(str_tile_path, str_new_tile_path)

        self.threads_semaphore.release()

    def startJoinThreads( self, threads ):
        for thread in threads:
            self.threads_semaphore.acquire()
            thread.start()
        for thread in threads:
            thread.join()

    def save( self, parent_directory, name ):
        dir_path = ensure( os.path.join( ensure( expand( parent_directory ) ), "%s%d_files" % (name, self.page) ) )

        # store images
        dont_create = [set() for n in range( self.max_level + 1 )]
        for n in range( self.min_level, self.max_level + 1 ):
            print 'level: ', n
            #level_scale = self.getLevelScale( n )
            [scale_to_x, scale_to_y] = map(int, self.getLevelDimensions ( n ))
            threads = []
            for (col, row), box in self.iterTiles( n ):
                if self.holes:
                    self.dont_create_lock.acquire()
                if (col, row) not in dont_create[n]:
                    threads.append(threading.Thread( target = self.pdftoppm, args = ( dir_path, scale_to_x, scale_to_y, n, col, row, box, dont_create )))
                if self.holes:
                    self.dont_create_lock.release()
            thread_start_join = threading.Thread( target = self.startJoinThreads, args = ( threads, ))
            thread_start_join.start()
            thread_start_join.join()

        # store dzi file
        fh = open( os.path.join( parent_directory, "%s%d.dzi" % (name, self.page)), 'w+' )
        fh.write( xml_template%( self.__dict__ ) )
        fh.close()

    def info( self ):
        for n in range( self.max_level +1 ):
            print "Level", n, self.getLevelDimensions( n ), self.getLevelScale( n ), self.getLevelRowCol( n )
            for (col, row ), box in self.iterTiles( n ):
                if n > self.max_level*.75  and n < self.max_level*.95:
                    print  "  ", "%s/%s_%s"%(n, col, row ), box

def expand( d):
    return os.path.abspath( os.path.expanduser( os.path.expandvars( d ) ) )

def ensure( d ):
    if not os.path.exists( d ):
        os.mkdir( d )
    return d

def main( ):
    parser = optparse.OptionParser(usage = "usage: %prog [options] filename")
    parser.add_option('-W', '--width', dest="width", type="int", help="Image width")
    parser.add_option('-H', '--height', dest="height", type="int", help="Image height")
    parser.add_option('-P', '--page', dest="page", type="int", default=1, help="PDF page number")
    parser.add_option('-s', '--tile-size', dest = "size", type="int", default=256, help = 'The tile height/width')
    parser.add_option('--overlap', dest = "overlap", type="int", default=1, help = 'How much tiles are overlapping')
    parser.add_option('-q', '--quality', dest="quality", type="int", help = 'Set the quality level of the image')
    parser.add_option('--min-level', dest="min_level", type="int", default=0, help = 'Min level to generate')
    parser.add_option('-l', '--max-level', dest="max_level", type="int", default=0, help = 'Max level to generate')
    parser.add_option('-f', '--format', dest="format", default="png", help = 'Set the Image Format (jpg or png)')
    parser.add_option('--holes', dest="holes", type="int", default=0, help = 'Generating with holes is faster but 404 errors are generated')
    parser.add_option('--copy-tiles', dest="copy_tiles", type="int", default=0, help = 'Try to see if tile is one-color and copy it to it\'s "children" if so')
    parser.add_option('-n', '--name', dest="name", help = 'Set the name of the output directory/dzi')
    parser.add_option('-p', '--path', dest="path", help = 'Set the path of the output directory/dzi')
    parser.add_option('-t', '--transform', dest="transform", default="antialias", help = 'Type of Transform (bicubic, nearest, antialias, bilinear')
    parser.add_option('-j', '--threads', dest = "threads", type = "int", default = 2, help = 'Number of threads used (useful on a multicore system)')
    parser.add_option('-d', '--debug', dest="debug", action="store_true", default=False, help = 'Output debug information relating to box makeup')

    (options, args ) = parser.parse_args()

    if not args:
        parser.print_help()
        sys.exit(1)
    image_path = expand( args[0] )

#    if not os.path.exists( image_path ):
#        print  "Invalid File", image_path
#        sys.exit(1)

    if not options.width:
        print "Width not given"
        sys.exit(1)
    if not options.height:
        print "Height not given"
        sys.exit(1)
    if not options.name:
        options.name = os.path.splitext( os.path.basename( image_path ) )[0]
    if not options.path:
        options.path = os.path.dirname( image_path )
    if options.transform and options.transform in filter_map:
        options.transform = filter_map[ options.transform ]

    composer = PyramidComposer( image_path=image_path, width=options.width, height=options.height,
            tile_size=options.size, overlap=options.overlap,
            min_level=options.min_level, max_level=options.max_level,
            format=options.format, filter=options.transform, threads=options.threads,
            page=options.page, holes=options.holes, copy_tiles=options.copy_tiles )

    if options.debug:
        composer.info()
        sys.exit()

    composer.save( options.path, options.name )

if __name__ == '__main__':
    main()

