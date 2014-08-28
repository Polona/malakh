#!/usr/bin/python

import math, os, optparse, sys
from xml.dom import minidom
import re
import threading
import shutil
from PIL import Image
from my_seadragon_pdf import PyramidComposer

class OverlayPyramid(object):
    def __init__( self, composer, threads_semaphore, path_prefix, png_x, png_y, png_img ):
        self.composer = composer
        self.threads_semaphore = threads_semaphore
        self.path_prefix = path_prefix
        self.png_x = png_x
        self.png_y = png_y
        self.png_img = png_img
        self.png_w, self.png_h = png_img.size

    def startJoinThreads(self, threads):
        for thread in threads:
            self.threads_semaphore.acquire()
            thread.start()
        for thread in threads:
            thread.join()

    def getPngBoxAtLevel(self, level):
        png_x = int(self.png_x * self.composer.width / (2 ** (self.composer.levels - level)))
        png_y = int(self.png_y * self.composer.width / (2 ** (self.composer.levels - level)))
        png_w = int(self.png_w / (2 ** (self.composer.levels - level)))
        png_h = int(self.png_h / (2 ** (self.composer.levels - level)))
        return (png_x, png_y, png_w, png_h)

    def getPathToTile(self, level, col, row):
        return self.path_prefix + "_files/" + str(level) + "/" + str(col) + "_" + str(row) + "." + self.composer.format

    def ensureTileExists(self, level, col, row):
        tile_path = self.getPathToTile(level, col, row)
        if not os.path.exists(tile_path) and level > 1:
            level_anc = level - 1
            col_anc = col / 2
            row_anc = row / 2
            self.ensureTileExists(level_anc, col_anc, row_anc)
            tile_path_anc = self.getPathToTile(level_anc, col_anc, row_anc)
            if col % 2 == 0:
                tile_anc_x = 0
            else:
                tile_anc_x = 1
            if row % 2 == 0:
                tile_anc_y = 0
            else:
                tile_anc_y = 1
            tile_anc = Image.open(tile_path_anc)
            oldW, oldH = tile_anc.size
            tile_anc.save('/home/mgol/Documents/projects/labee/tile_anc.png')
            tile_anc_doubled = tile_anc.resize((2 * oldW, 2 * oldH), Image.ANTIALIAS)
            tile_anc_doubled.save('/home/mgol/Documents/projects/labee/tile_anc_doubled.png')
            tile_anc_cropped = tile_anc_doubled.crop((tile_anc_x * oldW, tile_anc_y * oldH, (1 + tile_anc_x) * oldW, (1 + tile_anc_y) * oldH),)
            tile_anc_cropped.save(tile_path)

    def overlayTile(self, level, tile_filename, png_x, png_y, png_w, png_h, png_img_resized):
        attrs = re.split('[^0-9]', tile_filename)
        col = int(attrs[0])
        row = int(attrs[1])
        tile_path = self.getPathToTile(level, col, row)

        self.ensureTileExists(level, col, row)
        if not os.path.exists(tile_path):
            print "Bugs in Seadragon generated tiles"
            sys.exit(1)

        tile_box = map(int, self.composer.getTileBox(level, col, row))

        crop_x = max(0, tile_box[0] - png_x)
        crop_y = max(0, tile_box[1] - png_y)

        if png_x + png_w > crop_x and png_y + png_h > crop_y:
            delta_x = png_x - tile_box[0]
            delta_y = png_y - tile_box[1]
            png_x = max(0, delta_x)
            png_y = max(0, delta_y)
            png_w += min(0, delta_x)
            png_h += min(0, delta_y)

            crop_w = min(tile_box[2] - png_x, png_w)
            crop_h = min(tile_box[3] - png_y, png_h)

            if crop_w > 0 and crop_h > 0:
                print level, tile_filename, crop_x, crop_y, crop_w, crop_h, tile_box, png_x, png_y, png_w, png_h
                png_img_resized = png_img_resized.crop((crop_x, crop_y, crop_x + crop_w, crop_y + crop_h),)
                tile = Image.open(tile_path)
                #tile.paste(png_img_resized, (png_x, png_y), png_img_resized) # needed only for transparency
                tile.paste(png_img_resized, (png_x, png_y))
                tile.save(tile_path)

        self.threads_semaphore.release()

    def getColsRows(self, level):
        cols, rows = self.composer.getLevelRowCol(level)
        png_x, png_y, png_w, png_h = self.getPngBoxAtLevel(level)

        overlap = self.composer.overlap
        tile_size = self.composer.tile_size

        col_min = (png_x - overlap) / tile_size
        row_min = (png_y - overlap) / tile_size
        col_max = (png_x + png_w + overlap) / tile_size
        row_max = (png_y + png_h + overlap) / tile_size

        col_min = min(cols - 1, max(0, col_min))
        row_min = min(rows - 1, max(0, row_min))
        col_max = min(cols - 1, max(0, col_max))
        row_max = min(rows - 1, max(0, row_max))

        return (int(col_min), int(col_max), int(row_min), int(row_max))

    def run(self):
        threads = []
        # we have to do it from the highest levels because we copy
        # ancestor tiles if current one doesn't exist and it would
        # interfere in this process
        for level_str in range(self.composer.levels, 0, -1):
            level = int(level_str)
            col_min, col_max, row_min, row_max = self.getColsRows(level)
            png_x, png_y, png_w, png_h = self.getPngBoxAtLevel(level)
            png_img_resized = self.png_img.resize((png_w, png_h), Image.ANTIALIAS)

            tile_filenames = []
            for col in range(col_min, col_max + 1):
                for row in range(row_min, row_max + 1):
                    tile_filenames.append(str(col) + "_" + str(row) + "." + self.composer.format)
            for tile_filename in tile_filenames:
                threads.append(threading.Thread(target = self.overlayTile, args = (level, tile_filename, png_x, png_y, png_w, png_h, png_img_resized)))
        thread_start_join = threading.Thread(target = self.startJoinThreads, args = (threads,))
        thread_start_join.start()
        thread_start_join.join()



def expand(d):
    return os.path.abspath(os.path.expanduser(os.path.expandvars(d)))

def ensure(d):
    if not os.path.exists(d):
        os.mkdir(d)
    return d

def main():
    parser = optparse.OptionParser(usage = "usage: %prog [options] png_overlay_file dzi_file_prefix")
    parser.add_option('-x', '--left', dest = "png_x", type="float", default=0, help = 'Overlay distance from the left')
    parser.add_option('-y', '--top',  dest = "png_y", type="float", default=0, help = 'Overlay distance from the top')
    parser.add_option('-s', '--tile-size', dest = "size", type="int",
                      default=256, help = 'The tile height/width')
    parser.add_option('-f', '--format', dest="format",
                      default="png", help = 'Set the Image Format (jpg or png)')
    parser.add_option('-j', '--threads', dest = "threads", type = "int", default = 1, # broken when multi-threaded so far
                      help = 'Number of threads used (useful on a multicore system)')
    parser.add_option('-t', '--transform', dest="transform", default="antialias",
                      help = 'Type of Transform (bicubic, nearest, antialias, bilinear')

    (options, args) = parser.parse_args()
    if not args or len(args) != 2:
        parser.print_help()
        sys.exit(1)

    png_img = Image.open(expand(args[0]))
    path_prefix = expand(args[1])

    dzi_dom_size = minidom.parse(path_prefix + ".dzi").getElementsByTagName('Size')[0]
    dzi_width = int(dzi_dom_size.getAttribute('Width'))
    dzi_height = int(dzi_dom_size.getAttribute('Height'))

    threads_semaphore = threading.Semaphore(options.threads)
    composer = PyramidComposer(image_path=None, width=dzi_width, height=dzi_height, tile_size=options.size, format=options.format, filter=options.transform, threads=1)
    overlay = OverlayPyramid(composer, threads_semaphore, path_prefix, options.png_x, options.png_y, png_img)
    overlay.run()

if __name__ == '__main__':
    main()

